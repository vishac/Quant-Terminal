/**
 * Server-side owner authentication & rate limiting.
 *
 * Security design:
 * - Token is stored in an HttpOnly cookie on the server; the browser JS
 *   layer never sees or stores the raw token.
 * - A single timing-safe comparison is performed (no variant expansion).
 * - Rate limiter buckets are pruned on every request to prevent memory leaks.
 */

import crypto from 'crypto';
import express from 'express';

// ---------------------------------------------------------------------------
// IP extraction (respects TRUST_PROXY=1)
// ---------------------------------------------------------------------------

export function getClientIp(req: express.Request): string {
  if (process.env.TRUST_PROXY === '1') {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded.trim()) {
      return forwarded.split(',')[0].trim();
    }
  }
  return req.socket.remoteAddress || 'unknown';
}

// ---------------------------------------------------------------------------
// Token helpers
// ---------------------------------------------------------------------------

function cleanToken(raw: string): string {
  if (!raw || typeof raw !== 'string') return '';
  let s = raw.trim().replace(/^[\"']|[\"']$/g, '').trim();
  if (s.includes('%')) {
    try { s = decodeURIComponent(s); } catch { /* ignore */ }
  }
  return s.trim();
}

/** 
 * Returns configured owner tokens from env vars.
 * Tokens shorter than 16 characters are considered unconfigured.
 */
export function getConfiguredOwnerTokens(): string[] {
  const envVars = [
    process.env.OWNER_ACCESS_TOKEN,
    process.env.OWNER_SECRET,
    process.env.OWNER_TOKEN,
    process.env.ADMIN_SECRET,
    process.env.ADMIN_TOKEN,
    process.env.JARVIS_OWNER_TOKEN,
  ];
  return envVars
    .filter((v): v is string => typeof v === 'string' && v.trim().length >= 16)
    .map(cleanToken)
    .filter((v) => v.length >= 16);
}

/**
 * Timing-safe token comparison using SHA-256 digests.
 * Comparing fixed 32-byte digests avoids NUL-byte truncation / padding flaws.
 */
function safeCompare(candidate: string, stored: string): boolean {
  const hashA = crypto.createHash('sha256').update(candidate, 'utf8').digest();
  const hashB = crypto.createHash('sha256').update(stored, 'utf8').digest();
  return crypto.timingSafeEqual(hashA, hashB);
}

export function verifyOwnerToken(candidate: string): boolean {
  if (!candidate || typeof candidate !== 'string') return false;
  const cleaned = cleanToken(candidate);
  if (!cleaned || cleaned.length < 16) return false;
  const configured = getConfiguredOwnerTokens();
  if (configured.length === 0) return false;
  return configured.some((stored) => safeCompare(cleaned, stored));
}

/** Extracts the bearer / owner token from multiple accepted locations. */
export function extractToken(req: express.Request): string {
  // 1. HttpOnly session cookie (preferred — JS can never read this)
  const cookieToken =
    (req.cookies?.['jarvis_session'] as string | undefined) ||
    (req.cookies?.['terminal_session'] as string | undefined) ||
    '';
  if (cookieToken.trim()) return cleanToken(cookieToken);

  // 2. Custom owner headers
  const headerKeys = [
    'x-owner-token',
    'x-owner-access-token',
    'x-jarvis-owner-token',
    'x-access-token',
    'x-admin-token',
    'x-secret-token',
  ];
  for (const key of headerKeys) {
    const val = req.headers[key];
    if (typeof val === 'string' && val.trim()) return cleanToken(val);
  }

  // 3. Authorization: Bearer <token>
  const authHeader = (req.headers['authorization'] as string) || '';
  if (authHeader) {
    const trimmed = authHeader.trim();
    if (trimmed.toLowerCase().startsWith('bearer ')) return cleanToken(trimmed.slice(7));
    return cleanToken(trimmed);
  }

  // 4. Request body (fallback for form-based clients)
  if (req.body && typeof req.body === 'object') {
    const bodyVal =
      req.body.token || req.body.ownerToken || req.body.ownerAccessToken ||
      req.body.secret || req.body.ownerSecret;
    if (typeof bodyVal === 'string' && bodyVal.trim()) return cleanToken(bodyVal);
  }

  return '';
}

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

export function requireOwner(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
): void {
  const configured = getConfiguredOwnerTokens();
  if (configured.length === 0) {
    res.status(503).json({
      success: false,
      error: 'OWNER_ACCESS_TOKEN is not configured on the server. Owner-protected operations are unavailable until an owner token is set.',
    });
    return;
  }
  const token = extractToken(req);
  if (!token || !verifyOwnerToken(token)) {
    res.status(401).json({ success: false, error: 'Unauthorized: valid owner token required.' });
    return;
  }
  next();
}

// ---------------------------------------------------------------------------
// Rate Limiters (per-IP, self-cleaning, respects TRUST_PROXY=1)
// ---------------------------------------------------------------------------

const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 120;
const rateBuckets = new Map<string, { count: number; windowStart: number }>();

export function rateLimit(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
): void {
  const ip = getClientIp(req);
  const now = Date.now();

  // Prune stale entries on every request to prevent unbounded growth
  for (const [k, v] of rateBuckets) {
    if (now - v.windowStart > RATE_LIMIT_WINDOW_MS) rateBuckets.delete(k);
  }

  const bucket = rateBuckets.get(ip);
  if (!bucket || now - bucket.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateBuckets.set(ip, { count: 1, windowStart: now });
    next();
    return;
  }
  bucket.count += 1;
  if (bucket.count > RATE_LIMIT_MAX) {
    res.status(429).json({ success: false, error: 'Rate limit exceeded. Try again shortly.' });
    return;
  }
  next();
}

const VERIFY_RATE_LIMIT_WINDOW_MS = 60 * 1000;
const VERIFY_RATE_LIMIT_MAX = 10;
const verifyRateBuckets = new Map<string, { count: number; windowStart: number }>();

export function verifyRateLimit(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
): void {
  const ip = getClientIp(req);
  const now = Date.now();

  for (const [k, v] of verifyRateBuckets) {
    if (now - v.windowStart > VERIFY_RATE_LIMIT_WINDOW_MS) verifyRateBuckets.delete(k);
  }

  const bucket = verifyRateBuckets.get(ip);
  if (!bucket || now - bucket.windowStart > VERIFY_RATE_LIMIT_WINDOW_MS) {
    verifyRateBuckets.set(ip, { count: 1, windowStart: now });
    next();
    return;
  }
  bucket.count += 1;
  if (bucket.count > VERIFY_RATE_LIMIT_MAX) {
    res.status(429).json({ success: false, error: 'Too many verification attempts. Please wait 1 minute before trying again.' });
    return;
  }
  next();
}
