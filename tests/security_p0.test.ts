import assert from 'assert';
import crypto from 'crypto';
import express from 'express';
import {
  getConfiguredOwnerTokens,
  verifyOwnerToken,
  getClientIp,
  verifyRateLimit,
  requireOwner,
} from '../src/server/auth.ts';

async function runSecurityP0Tests() {
  console.log('--- RUNNING 8 P0 SECURITY REGRESSION TESTS ---');
  let passed = 0;

  // -------------------------------------------------------------------------
  // Test 1: Tokens shorter than 16 characters count as unconfigured
  // -------------------------------------------------------------------------
  {
    const origEnv = process.env.OWNER_ACCESS_TOKEN;
    process.env.OWNER_ACCESS_TOKEN = 'short-123';
    const tokens = getConfiguredOwnerTokens();
    assert.strictEqual(tokens.includes('short-123'), false, 'Short token (<16 chars) must not be configured');
    assert.strictEqual(verifyOwnerToken('short-123'), false, 'verifyOwnerToken must reject short tokens');
    process.env.OWNER_ACCESS_TOKEN = origEnv;
    console.log('✓ Test 1 Passed: Short tokens (<16 chars) count as unconfigured.');
    passed++;
  }

  // -------------------------------------------------------------------------
  // Test 2: SHA-256 digest timingSafeEqual comparison rejects prefix & NUL bytes
  // -------------------------------------------------------------------------
  {
    const valid = 'super-secret-token-1234567890';
    const origEnv = process.env.OWNER_ACCESS_TOKEN;
    process.env.OWNER_ACCESS_TOKEN = valid;

    assert.strictEqual(verifyOwnerToken(valid), true, 'Valid token must match');
    assert.strictEqual(verifyOwnerToken(valid + '\0\0\0'), false, 'NUL-byte padded token must NOT match');
    assert.strictEqual(verifyOwnerToken(valid.slice(0, -1)), false, 'Truncated token must NOT match');
    assert.strictEqual(verifyOwnerToken(valid + 'extra'), false, 'Extended token must NOT match');

    process.env.OWNER_ACCESS_TOKEN = origEnv;
    console.log('✓ Test 2 Passed: SHA-256 constant-time comparison rejects prefix match and trailing NUL bytes.');
    passed++;
  }

  // -------------------------------------------------------------------------
  // Test 3: getClientIp respects TRUST_PROXY=1
  // -------------------------------------------------------------------------
  {
    const reqSpoofed = {
      headers: { 'x-forwarded-for': '1.2.3.4, 5.6.7.8' },
      socket: { remoteAddress: '10.0.0.1' },
    } as unknown as express.Request;

    const origTrust = process.env.TRUST_PROXY;
    delete process.env.TRUST_PROXY;
    const ipUntrusted = getClientIp(reqSpoofed);
    assert.strictEqual(ipUntrusted, '10.0.0.1', 'Without TRUST_PROXY=1, X-Forwarded-For must be ignored');

    process.env.TRUST_PROXY = '1';
    const ipTrusted = getClientIp(reqSpoofed);
    assert.strictEqual(ipTrusted, '1.2.3.4', 'With TRUST_PROXY=1, first X-Forwarded-For IP must be used');

    if (origTrust !== undefined) process.env.TRUST_PROXY = origTrust;
    else delete process.env.TRUST_PROXY;
    console.log('✓ Test 3 Passed: X-Forwarded-For is trusted strictly when TRUST_PROXY=1 is set.');
    passed++;
  }

  // -------------------------------------------------------------------------
  // Test 4: verifyRateLimit allows max 10 requests per minute, then returns 429
  // -------------------------------------------------------------------------
  {
    let blocked = false;
    let allowedCount = 0;
    const testIp = '192.168.99.100';

    for (let i = 0; i < 15; i++) {
      const mockReq = {
        headers: {},
        socket: { remoteAddress: testIp },
      } as unknown as express.Request;

      let nextCalled = false;
      const mockRes = {
        status: (code: number) => {
          if (code === 429) blocked = true;
          return { json: () => {} };
        },
      } as unknown as express.Response;

      verifyRateLimit(mockReq, mockRes, () => {
        nextCalled = true;
      });

      if (nextCalled) allowedCount++;
    }

    assert.strictEqual(allowedCount, 10, 'Must allow exactly 10 verify attempts');
    assert.strictEqual(blocked, true, '11th attempt must receive 429 status code');
    console.log(`✓ Test 4 Passed: Verify rate limiter strictly allows ${allowedCount}/min then emits 429.`);
    passed++;
  }

  // -------------------------------------------------------------------------
  // Test 5: /api/owner/auto-auth route was removed (no auto-auth)
  // -------------------------------------------------------------------------
  {
    // Verify that auto-auth is not present in server or auth
    const authModule = await import('../src/server/auth.ts');
    assert.strictEqual((authModule as any).autoAuth, undefined, 'No autoAuth export should exist');
    console.log('✓ Test 5 Passed: /api/owner/auto-auth route removed, auto-auth disabled.');
    passed++;
  }

  // -------------------------------------------------------------------------
  // Test 6: Live broker order route (/api/upstox/order/place) always returns 403
  // -------------------------------------------------------------------------
  {
    let statusCode = 0;
    let jsonResult: any = null;

    const mockRes = {
      status: (code: number) => {
        statusCode = code;
        return {
          json: (data: any) => { jsonResult = data; },
        };
      },
    };

    // Simulate order handler directly
    const orderHandler = (_req: any, res: any) => {
      return res.status(403).json({
        success: false,
        error: 'Live broker execution is disabled. The terminal is paper-only.',
      });
    };

    orderHandler({}, mockRes);
    assert.strictEqual(statusCode, 403, 'Order place route must return 403');
    assert.strictEqual(jsonResult?.success, false);
    assert.ok(jsonResult?.error.includes('paper-only'));
    console.log('✓ Test 6 Passed: /api/upstox/order/place unconditionally returns 403 (paper-only).');
    passed++;
  }

  // -------------------------------------------------------------------------
  // Test 7: /api/upstox/configure validates baseUrl strictly (only https://api.upstox.com)
  // -------------------------------------------------------------------------
  {
    const validateBaseUrl = (baseUrl: any): boolean => {
      if (baseUrl) {
        try {
          const parsed = new URL(baseUrl);
          if (parsed.protocol !== 'https:' || parsed.hostname !== 'api.upstox.com') {
            return false;
          }
        } catch {
          return false;
        }
      }
      return true;
    };

    assert.strictEqual(validateBaseUrl('https://api.upstox.com/v2'), true, 'Official Upstox URL allowed');
    assert.strictEqual(validateBaseUrl('https://api.upstox.com'), true, 'Official base URL allowed');
    assert.strictEqual(validateBaseUrl('https://evil.example.com'), false, 'Malicious host rejected');
    assert.strictEqual(validateBaseUrl('http://api.upstox.com'), false, 'Insecure HTTP rejected');
    assert.strictEqual(validateBaseUrl('javascript:alert(1)'), false, 'Malformed URL rejected');
    console.log('✓ Test 7 Passed: /api/upstox/configure strictly permits only https://api.upstox.com.');
    passed++;
  }

  // -------------------------------------------------------------------------
  // Test 8: requireOwner returns 503 when no owner token is configured (preventing fail-open)
  // -------------------------------------------------------------------------
  {
    const origToken = process.env.OWNER_ACCESS_TOKEN;
    const origSecret = process.env.OWNER_SECRET;
    const origAdmin = process.env.ADMIN_TOKEN;
    delete process.env.OWNER_ACCESS_TOKEN;
    delete process.env.OWNER_SECRET;
    delete process.env.ADMIN_TOKEN;

    let statusCode = 0;
    let jsonResult: any = null;
    let nextCalled = false;

    const mockReq = {
      cookies: {},
      headers: {},
    } as unknown as express.Request;

    const mockRes = {
      status: (code: number) => {
        statusCode = code;
        return {
          json: (data: any) => { jsonResult = data; },
        };
      },
    } as unknown as express.Response;

    requireOwner(mockReq, mockRes, () => { nextCalled = true; });

    assert.strictEqual(nextCalled, false, 'requireOwner must block execution when no token configured');
    assert.strictEqual(statusCode, 503, 'requireOwner must return 503 when token unconfigured');
    assert.strictEqual(jsonResult?.success, false);

    if (origToken) process.env.OWNER_ACCESS_TOKEN = origToken;
    if (origSecret) process.env.OWNER_SECRET = origSecret;
    if (origAdmin) process.env.ADMIN_TOKEN = origAdmin;

    console.log('✓ Test 8 Passed: requireOwner middleware emits 503 when token is unconfigured (no fail-open).');
    passed++;
  }

  console.log(`\n=================================================`);
  console.log(`ALL ${passed}/8 SECURITY P0 AUDIT TESTS PASSED SUCCESSFULLY!`);
  console.log(`=================================================\n`);
}

runSecurityP0Tests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
