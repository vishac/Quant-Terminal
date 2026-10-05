import dotenv from 'dotenv';
import express from 'express';
import { createServer as createHttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';

dotenv.config({ path: '.env.local' });
dotenv.config();
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import { DEFAULT_DEV_OWNER_TOKEN, isDevOwnerFallback, resolveOwnerAccessToken } from './src/server/auth';
import { computeGreeks } from './src/server/greeks';
import {
  getRiskConfig, setRiskConfig, getRiskState, setKillSwitch, setDayPnl,
  evaluateOrder, placeSandboxOrder, getSandboxOrders, resetSandbox,
} from './src/server/riskEngine';
import { runBacktest, AVAILABLE_STRATEGIES } from './src/server/backtester';
import { getActiveProvider, computeFreshness, ProviderStatus } from './src/server/marketDataProvider';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '32kb' }));

// Initialize server-side Gemini AI client
const geminiApiKey = process.env.GEMINI_API_KEY || '';
let genAI: GoogleGenAI | null = null;
if (geminiApiKey && geminiApiKey.trim().length > 10) {
  try {
    genAI = new GoogleGenAI({
      apiKey: geminiApiKey,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
    });
    console.log('[Server GenAI] Initialized with GEMINI_API_KEY');
  } catch (err) {
    console.warn('[Server GenAI] Initialization error:', err);
  }
}

// =============================================================================
// SECURITY: Owner access gate (single-operator shared secret) + rate limiting
// Protects the AI-backed endpoints so outsiders cannot run up the Gemini bill
// or overload the service. Fails CLOSED if OWNER_ACCESS_TOKEN is not configured.
// NOTE: This is a Phase-1 stopgap. Phase 3 should move to a real auth provider.
// =============================================================================
const OWNER_ACCESS_TOKEN = resolveOwnerAccessToken();

function timingSafeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

function extractToken(req: express.Request): string {
  const header = (req.headers['x-owner-token'] as string) || '';
  if (header) return header.trim();
  const auth = (req.headers['authorization'] as string) || '';
  if (auth.toLowerCase().startsWith('bearer ')) return auth.slice(7).trim();
  return '';
}

function requireOwner(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (!OWNER_ACCESS_TOKEN) {
    return res.status(503).json({
      success: false,
      error: 'OWNER_ACCESS_TOKEN is not configured on the server. AI endpoints are disabled until an owner token is set.',
      devFallback: false,
      fallbackToken: null,
    });
  }
  const token = extractToken(req);
  if (!token || !timingSafeEqual(token, OWNER_ACCESS_TOKEN)) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: valid owner token required.',
      devFallback: isDevOwnerFallback(),
      fallbackToken: isDevOwnerFallback() ? OWNER_ACCESS_TOKEN : null,
    });
  }
  next();
}

// Simple in-memory per-IP rate limiter for the (costly) AI endpoints.
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 20;
const rateBuckets = new Map<string, { count: number; windowStart: number }>();

function rateLimit(req: express.Request, res: express.Response, next: express.NextFunction) {
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const bucket = rateBuckets.get(ip);
  if (!bucket || now - bucket.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateBuckets.set(ip, { count: 1, windowStart: now });
    return next();
  }
  bucket.count += 1;
  if (bucket.count > RATE_LIMIT_MAX) {
    return res.status(429).json({ success: false, error: 'Rate limit exceeded. Try again shortly.' });
  }
  next();
}

// Lightweight endpoint the frontend login gate uses to validate the owner token.
app.post('/api/owner/verify', requireOwner, (_req, res) => {
  res.json({ success: true, authorized: true });
});

export interface MarketQuote {
  symbol: string;
  name: string;
  price: number | null;
  change: number | null;
  changePct: number | null;
  high?: number | null;
  low?: number | null;
  prevClose?: number | null;
  fiftyTwoWeekHigh?: number | null;
  fiftyTwoWeekLow?: number | null;
  volume?: number | null;
  timestamp: string;
  source: string;
}

// Honest source label: this is DELAYED, UNOFFICIAL Yahoo data (daily candles), not an exchange tick feed.
const DATA_SOURCE = 'YAHOO_DELAYED_UNOFFICIAL';
const DATA_DISCLAIMER = 'Delayed, unofficial market data (Yahoo Finance daily candles). Not a licensed real-time exchange feed. For information only.';

const TRACKED_SYMBOLS: { symbol: string; name: string }[] = [
  { symbol: '^NSEI', name: 'NIFTY 50' },
  { symbol: '^BSESN', name: 'BSE SENSEX' },
  { symbol: '^NSEBANK', name: 'BANK NIFTY' },
  { symbol: '^INDIAVIX', name: 'INDIA VIX' },
  { symbol: 'RELIANCE.NS', name: 'Reliance Industries' },
  { symbol: 'TCS.NS', name: 'Tata Consultancy Services' },
  { symbol: 'HDFCBANK.NS', name: 'HDFC Bank Ltd' },
  { symbol: 'INFY.NS', name: 'Infosys Limited' },
  { symbol: 'ICICIBANK.NS', name: 'ICICI Bank Ltd' },
  { symbol: 'SBIN.NS', name: 'State Bank of India' },
  { symbol: 'BHARTIARTL.NS', name: 'Bharti Airtel' },
  { symbol: 'LT.NS', name: 'Larsen & Toubro' },
  { symbol: 'TRENT.NS', name: 'Trent Ltd' },
  { symbol: 'BEL.NS', name: 'Bharat Electronics' },
  { symbol: 'HAL.NS', name: 'Hindustan Aeronautics' },
  { symbol: 'DIXON.NS', name: 'Dixon Technologies' },
  { symbol: 'POLYCAB.NS', name: 'Polycab India' },
  { symbol: 'SOLARINDS.NS', name: 'Solar Industries' },
  { symbol: 'COCHINSHIP.NS', name: 'Cochin Shipyard' },
  { symbol: 'NTPC.NS', name: 'NTPC Limited' },
];

// In-memory cache. Initialized with null values (never fake demo data).
const marketProvider = getActiveProvider();
const quoteReceivedEpoch: Record<string, number> = {};
let lastProviderStatus: ProviderStatus = 'OK';
let quotesCache: Record<string, MarketQuote> = {};
TRACKED_SYMBOLS.forEach(({ symbol, name }) => {
  quotesCache[symbol] = {
    symbol, name, price: null, change: null, changePct: null,
    high: null, low: null, prevClose: null,
    fiftyTwoWeekHigh: null, fiftyTwoWeekLow: null, volume: null,
    timestamp: 'INITIALIZING', source: DATA_SOURCE,
  };
});

let lastFetchTime = 0;
const FETCH_COOLDOWN_MS = 2500;

/**
 * Delegates to the configured MarketDataProvider (configuration boundary).
 * Records the provider status and returns null on any non-OK state — it NEVER
 * invents numbers. If an official provider is selected but not configured, the
 * status becomes PROVIDER_NOT_CONFIGURED and quotes stay null (DATA_UNAVAILABLE).
 */
async function fetchDelayedYahooQuote(symbol: string): Promise<Partial<MarketQuote> | null> {
  const r = await marketProvider.getQuote(symbol);
  lastProviderStatus = r.status;
  if (r.status !== 'OK' || !r.quote || typeof r.quote.price !== 'number') return null;
  const q = r.quote;
  return {
    price: q.price, prevClose: q.prevClose, change: q.change, changePct: q.changePct,
    high: q.high, low: q.low, fiftyTwoWeekHigh: q.fiftyTwoWeekHigh, fiftyTwoWeekLow: q.fiftyTwoWeekLow,
    volume: q.volume,
    timestamp: q.receivedTimestamp,
    source: q.source,
  };
}

async function syncMarketQuotes() {
  const now = Date.now();
  if (now - lastFetchTime < FETCH_COOLDOWN_MS) return quotesCache;
  lastFetchTime = now;

  const symbols = Object.keys(quotesCache);
  await Promise.allSettled(
    symbols.map(async (sym) => {
      const updated = await fetchDelayedYahooQuote(sym);
      if (updated && typeof updated.price === 'number') {
        quotesCache[sym] = { ...quotesCache[sym], ...updated } as MarketQuote;
        quoteReceivedEpoch[sym] = Date.now();
      }
    })
  );
  return quotesCache;
}

function checkIsMarketHours() {
  const istFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, weekday: 'short',
  });
  const parts = istFormatter.formatToParts(new Date());
  const getPart = (type: string) => parts.find(p => p.type === type)?.value || '00';
  const hours = parseInt(getPart('hour'), 10);
  const minutes = parseInt(getPart('minute'), 10);
  const weekdayStr = parts.find(p => p.type === 'weekday')?.value || 'Mon';
  const weekdayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const dayOfWeek = weekdayMap[weekdayStr] ?? 1;
  const totalMinutes = hours * 60 + minutes;
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  const isOpen = !isWeekend && totalMinutes >= (9 * 60 + 15) && totalMinutes < (15 * 60 + 30);
  const isPreMarket = !isWeekend && totalMinutes >= (9 * 60) && totalMinutes < (9 * 60 + 15);

  let phase = 'CLOSED_OVERNIGHT';
  let phaseLabel = 'POST-MARKET EOD STANDBY';
  let statusBadge = 'MARKET CLOSED · DELAYED DATA';
  let nextSessionText = isWeekend
    ? (dayOfWeek === 6 ? 'Monday @ 09:15 IST' : 'Tomorrow (Monday) @ 09:15 IST')
    : (dayOfWeek === 5 && totalMinutes >= 15 * 60 + 30 ? 'Monday @ 09:15 IST' : 'Tomorrow @ 09:15 IST');

  if (isWeekend) {
    phase = 'WEEKEND'; phaseLabel = 'WEEKEND (MARKET CLOSED)'; statusBadge = 'WEEKEND · STANDBY';
  } else if (isOpen) {
    phase = 'LIVE_OPEN'; phaseLabel = 'SESSION OPEN (09:15 - 15:30 IST)'; statusBadge = 'MARKET OPEN · DELAYED DATA';
    nextSessionText = 'Trading in progress (Closes 15:30 IST)';
  } else if (isPreMarket) {
    phase = 'PRE_MARKET'; phaseLabel = 'PRE-OPEN DISCOVERY (09:00 - 09:15 IST)'; statusBadge = 'PRE-OPEN DISCOVERY';
    nextSessionText = 'Regular Trading Opens @ 09:15 IST';
  } else if (totalMinutes < 9 * 60) {
    phase = 'CLOSED_OVERNIGHT'; phaseLabel = 'PRE-MARKET OVERNIGHT STANDBY'; nextSessionText = 'Today @ 09:15 IST';
  }

  return {
    isOpen, isPreMarket, phase, phaseLabel, statusBadge, nextSessionText,
    openTimeIST: '09:15 IST', closeTimeIST: '15:30 IST',
    istTimeString: `${getPart('hour')}:${getPart('minute')}:${getPart('second')} IST`,
  };
}

let packetsSavedServerCount = 0;

syncMarketQuotes();

setInterval(() => {
  const session = checkIsMarketHours();
  if (session.isOpen) {
    syncMarketQuotes().catch(() => {});
  } else {
    packetsSavedServerCount += 1;
  }
}, 3000);

// REST endpoint for the frontend market polling (no Gemini credits used).
app.get('/api/market-data', async (req, res) => {
  const force = req.query.force === 'true';
  const session = checkIsMarketHours();
  try {
    const needsInitialWarmup = Object.values(quotesCache).some(q => q.price === null);
    if (session.isOpen || force || needsInitialWarmup) {
      await syncMarketQuotes();
    }
  } catch { /* serve cache */ }

  const threshold = marketProvider.info.freshnessThresholdSec;
  const enrichedQuotes: Record<string, any> = {};
  for (const [sym, q] of Object.entries(quotesCache)) {
    enrichedQuotes[sym] = {
      ...q,
      dataMode: q.price != null ? marketProvider.info.dataMode : 'UNAVAILABLE',
      freshness: computeFreshness(quoteReceivedEpoch[sym] || null, threshold),
    };
  }

  res.json({
    success: true,
    provider: marketProvider.info.id,
    providerName: marketProvider.info.name,
    providerStatus: lastProviderStatus,
    dataMode: marketProvider.info.dataMode,
    isDelayed: marketProvider.info.isDelayed,
    isOfficial: marketProvider.info.isOfficial,
    freshnessThresholdSec: threshold,
    dataDisclaimer: marketProvider.info.disclaimer,
    timestamp: new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' }) + ' IST',
    marketSession: session,
    packetSaverActive: !session.isOpen && !force,
    packetsSavedToday: packetsSavedServerCount,
    quotes: enrichedQuotes,
  });
});

app.get('/api/market-data/:symbol', async (req, res) => {
  const sym = req.params.symbol;
  if (quotesCache[sym] && quotesCache[sym].price !== null) {
    return res.json({ success: true, isDelayed: true, isOfficial: false, dataDisclaimer: DATA_DISCLAIMER, quote: quotesCache[sym] });
  }
  const fresh = await fetchDelayedYahooQuote(sym);
  if (fresh && fresh.price) {
    const q: MarketQuote = {
      symbol: sym, name: sym,
      price: fresh.price, change: fresh.change ?? null, changePct: fresh.changePct ?? null,
      high: fresh.high ?? null, low: fresh.low ?? null, prevClose: fresh.prevClose ?? null,
      fiftyTwoWeekHigh: fresh.fiftyTwoWeekHigh ?? null, fiftyTwoWeekLow: fresh.fiftyTwoWeekLow ?? null,
      volume: fresh.volume ?? null,
      timestamp: new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' }) + ' IST',
      source: DATA_SOURCE,
    };
    quotesCache[sym] = q;
    return res.json({ success: true, isDelayed: true, isOfficial: false, dataDisclaimer: DATA_DISCLAIMER, quote: q });
  }
  res.status(404).json({ success: false, error: 'Quote unavailable from the delayed data source.' });
});

// Broker status — HONEST: no broker is connected in this build.
app.post('/api/broker/test-ping', (req, res) => {
  const { brokerId } = req.body || {};
  res.json({
    success: true,
    brokerId: typeof brokerId === 'string' ? brokerId : null,
    connected: false,
    status: 'NOT_CONNECTED',
    latency: null,
    node: null,
    message: 'No broker integration is configured in this build. Order execution is disabled (Phase 2+).',
    timestamp: new Date().toISOString(),
  });
});

// J.A.R.V.I.S. AI assessment — owner-gated, rate-limited, validated.
app.post('/api/jarvis/analyze', rateLimit, requireOwner, async (req, res) => {
  const { prompt } = req.body || {};
  if (prompt !== undefined && typeof prompt !== 'string') {
    return res.status(400).json({ success: false, error: 'prompt must be a string.' });
  }
  const query = (typeof prompt === 'string' ? prompt.trim() : '').slice(0, 2000) || 'Market summary and risk report';

  const currentNifty = quotesCache['^NSEI']?.price;
  const currentBankNifty = quotesCache['^NSEBANK']?.price;
  const currentVix = quotesCache['^INDIAVIX']?.price;

  if (genAI) {
    try {
      const systemInstruction = `You are J.A.R.V.I.S., a quantitative market assistant for Indian markets (NSE, BSE, MCX) under SEBI/NSE/RBI rules.
Only use the figures explicitly provided in the context. Do NOT invent prices, PCR, VIX, option premiums, greeks, order-book sizes, account balances, or P&L. If a figure is not provided, say it is unavailable. Market data here is DELAYED and UNOFFICIAL.`;

      const response = await genAI.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: [{
          role: 'user',
          parts: [{
            text: `Context (DELAYED/UNOFFICIAL): NIFTY ${currentNifty ? currentNifty.toFixed(2) : 'unavailable'}, BANKNIFTY ${currentBankNifty ? currentBankNifty.toFixed(2) : 'unavailable'}, INDIA VIX ${currentVix ? currentVix.toFixed(2) : 'unavailable'}.
Operator question: "${query}"
Give a concise assessment. Only reference figures from the context; mark anything else as unavailable. Address the operator as "Sir".`,
          }],
        }],
        config: { systemInstruction, temperature: 0.3 },
      });

      const reply = response.text || '';
      if (reply && reply.trim().length > 0) {
        return res.json({
          success: true,
          available: true,
          provider: 'GEMINI_SERVER_API',
          model: 'gemini-3.8-flash',
          answer: reply,
          recommendation: 'General reminder: use defined-risk structures and respect SEBI margin limits. This is not investment advice.',
          confidenceScore: null,
          keyGreeksImpact: null,
          dataDisclaimer: DATA_DISCLAIMER,
        });
      }
    } catch (apiError) {
      console.warn('[Gemini Server API] Call failed:', (apiError as any)?.message || apiError);
    }
  }

  // Honest unavailable path — NO fabricated figures.
  return res.json({
    success: true,
    available: false,
    provider: 'UNAVAILABLE',
    answer: 'Sir, the J.A.R.V.I.S. AI assistant is currently unavailable (model not configured or rate-limited). I cannot verify any market figures right now, so I will not state any. Please try again shortly.',
    recommendation: 'General reminder: use defined-risk structures and respect SEBI margin limits. This is not investment advice.',
    confidenceScore: null,
    keyGreeksImpact: null,
    dataDisclaimer: DATA_DISCLAIMER,
  });
});

// Macro intelligence — owner-gated, rate-limited. Grounded AI only; NO fabricated baseline.
let macroIntelligenceCache: { data: any; timestamp: number } | null = null;
const MACRO_CACHE_TTL_MS = 15 * 60 * 1000;
let macroApiCooldownUntil = 0;

function macroUnavailable(reason: string) {
  return {
    dataUnavailable: true,
    isGrounded: false,
    notice: reason,
    threatScore: null,
    threatRegime: null,
    threatHeadline: '',
    threatSummary: '',
    lastUpdated: new Date().toISOString(),
    macroVectors: [],
    verifiedNews: [],
    twoSidedScenarios: [],
    groundedSources: [],
    searchQueries: [],
  };
}

app.get('/api/macro/intelligence', rateLimit, requireOwner, async (req, res) => {
  const forceRefresh = req.query.refresh === 'true';
  const now = Date.now();
  const isCooldownActive = now < macroApiCooldownUntil;

  if (!forceRefresh && macroIntelligenceCache && (now - macroIntelligenceCache.timestamp < MACRO_CACHE_TTL_MS)) {
    return res.json({ success: true, cached: true, data: macroIntelligenceCache.data, cacheAgeSeconds: Math.round((now - macroIntelligenceCache.timestamp) / 1000) });
  }

  const currentDateStr = new Date().toISOString().split('T')[0];
  const currentNifty = quotesCache['^NSEI']?.price;
  const currentVix = quotesCache['^INDIAVIX']?.price;

  if (!genAI || isCooldownActive) {
    return res.json({ success: true, cached: false, data: macroUnavailable(isCooldownActive ? 'Upstream AI rate-limited; grounded macro intelligence temporarily unavailable.' : 'AI model not configured; grounded macro intelligence unavailable.') });
  }

  const prompt = `You are a Chief Risk Officer for Indian and global markets. Today is ${currentDateStr}.
${currentNifty ? `NIFTY (delayed) ~ ${currentNifty}.` : 'NIFTY level unavailable.'} ${currentVix ? `India VIX (delayed) ~ ${currentVix}.` : 'India VIX unavailable.'}
Perform a FACTUAL, Google-search-grounded macro risk assessment for Indian equities covering: Brent crude, US 10Y yield, DXY, Fed/RBI stance, FII/DII flows, and top geopolitical/macro headlines.
RULES: cite only real, verifiable figures from search; no hype, no made-up headlines or numbers; if you cannot verify something, omit it. Output VALID JSON ONLY (no markdown), with this exact shape:
{"threatScore":number 15-85,"threatRegime":"LOW_VOLATILITY"|"MODERATE_ELEVATED"|"HIGH_STRESS","threatHeadline":string,"threatSummary":string,"macroVectors":[{"name":string,"value":string,"direction":"RISING"|"FALLING"|"NEUTRAL"|"HAWKISH"|"DOVISH"|"BUYING"|"SELLING","impact":"BULLISH"|"BEARISH"|"NEUTRAL","factDetail":string}],"verifiedNews":[{"id":string,"headline":string,"publisher":string,"sourceUrl":string,"category":"ENERGY"|"RATES"|"CURRENCY"|"GEOPOLITICAL"|"POLICY","impactScore":number -100..100,"affectedSector":string,"factTakeaway":string}],"twoSidedScenarios":[{"regime":"BASE_CASE"|"BULL_CASE"|"STRESS_CASE","title":string,"probabilityPct":number,"niftyRange":string,"catalysts":string,"hedgingAction":string}]}`;

  try {
    const response = await genAI.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: { tools: [{ googleSearch: {} }] },
    });

    const text = response.text || '';
    const groundingChunks = (response.candidates?.[0] as any)?.groundingMetadata?.groundingChunks || [];
    const webSearchQueries = (response.candidates?.[0] as any)?.groundingMetadata?.webSearchQueries || [];

    const cleanJson = text.replace(/```json/gi, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanJson);

    parsed.groundedSources = groundingChunks.filter((c: any) => c.web?.uri).map((c: any) => ({ title: c.web?.title || 'Source', url: c.web?.uri })).slice(0, 6);
    parsed.searchQueries = webSearchQueries;
    parsed.generatedAt = new Date().toISOString();
    parsed.isGrounded = true;
    parsed.dataUnavailable = false;

    macroIntelligenceCache = { data: parsed, timestamp: now };
    return res.json({ success: true, cached: false, data: parsed });
  } catch (err: any) {
    if (err?.status === 429 || err?.message?.includes('429') || err?.message?.includes('quota') || err?.message?.includes('RESOURCE_EXHAUSTED')) {
      macroApiCooldownUntil = now + 15 * 60 * 1000;
    }
    console.warn('[Macro Intelligence] unavailable:', err?.message || err);
    // HONEST unavailable state — never fabricate news or levels.
    return res.json({ success: true, cached: false, data: macroUnavailable('Grounded macro intelligence could not be retrieved or parsed. Showing no data rather than fabricated figures.') });
  }
});

// =============================================================================
// PHASE 2/3 — Guarded Risk Engine, Sandbox Broker, Greeks & Backtester
// All order placement is SANDBOX ONLY (no real capital). The risk engine is the
// guard that must pass before any Phase-3 go-live.
// =============================================================================

app.get('/api/risk/config', requireOwner, (_req, res) => res.json({ success: true, config: getRiskConfig() }));
app.post('/api/risk/config', requireOwner, (req, res) => {
  try { res.json({ success: true, config: setRiskConfig(req.body || {}) }); }
  catch (e: any) { res.status(400).json({ success: false, error: String(e?.message || e) }); }
});
app.get('/api/risk/state', requireOwner, (_req, res) => res.json({ success: true, state: getRiskState(), config: getRiskConfig() }));
app.post('/api/risk/kill-switch', requireOwner, (req, res) => {
  const { active, reason } = req.body || {};
  res.json({ success: true, state: setKillSwitch(!!active, reason || null) });
});
app.post('/api/risk/day-pnl', requireOwner, (req, res) => {
  res.json({ success: true, state: setDayPnl(Number(req.body?.pnl) || 0) });
});
app.post('/api/risk/evaluate', requireOwner, (req, res) => {
  try { res.json({ success: true, ...evaluateOrder(req.body || {}) }); }
  catch (e: any) { res.status(400).json({ success: false, error: String(e?.message || e) }); }
});

app.post('/api/broker/sandbox/order', requireOwner, (req, res) => {
  try {
    const r = placeSandboxOrder(req.body || {});
    res.status(r.allowed ? 200 : 422).json({ success: r.allowed, simulation: true, ...r });
  } catch (e: any) { res.status(400).json({ success: false, error: String(e?.message || e) }); }
});
app.get('/api/broker/sandbox/orders', requireOwner, (_req, res) => res.json({ success: true, simulation: true, ...getSandboxOrders() }));
app.post('/api/broker/sandbox/reset', requireOwner, (_req, res) => { resetSandbox(); res.json({ success: true, state: getRiskState() }); });

app.post('/api/greeks/compute', requireOwner, (req, res) => {
  try { res.json({ success: true, ...computeGreeks(req.body || {}) }); }
  catch (e: any) { res.status(400).json({ success: false, error: String(e?.message || e) }); }
});

app.get('/api/backtest/strategies', requireOwner, (_req, res) => res.json({ success: true, strategies: AVAILABLE_STRATEGIES }));
app.post('/api/backtest/run', rateLimit, requireOwner, async (req, res) => {
  try {
    const { symbol, strategy, range } = req.body || {};
    const result = await runBacktest(symbol, strategy, range || '1y');
    res.json({ success: true, result });
  } catch (e: any) { res.status(400).json({ success: false, error: String(e?.message || e) }); }
});

app.get('/manifest.json', (_req, res) => {
  res.sendFile(path.resolve(__dirname, 'public', 'manifest.json'));
});

// Downloadable iOS WebClip profile. Host from APP_URL env or request headers — no hardcoded host.
app.get(['/api/download/ios-profile', '/jarvis-quant-ios.mobileconfig'], (req, res) => {
  let appUrl = (process.env.APP_URL || '').trim();
  if (!appUrl) {
    const protocol = (req.headers['x-forwarded-proto'] as string) || req.protocol || 'https';
    const host = (req.headers['x-forwarded-host'] as string) || req.get('host');
    if (!host) {
      return res.status(500).json({ success: false, error: 'APP_URL is not configured and host could not be derived.' });
    }
    appUrl = `${protocol}://${host}`;
  }

  let iconBase64 = '';
  try {
    const iconPath = path.resolve(__dirname, 'public', 'apple-touch-icon.png');
    if (fs.existsSync(iconPath)) iconBase64 = fs.readFileSync(iconPath).toString('base64');
  } catch (e) {
    console.error('Failed to read icon for mobileconfig', e);
  }

  const mobileconfigXml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>PayloadContent</key>
    <array>
        <dict>
            <key>FullScreen</key>
            <true/>
            ${iconBase64 ? `<key>Icon</key>\n            <data>${iconBase64}</data>` : ''}
            <key>IsRemovable</key>
            <true/>
            <key>Label</key>
            <string>JARVIS Quant</string>
            <key>PayloadDescription</key>
            <string>Configures Standalone App Web Clip for J.A.R.V.I.S. Institutional Quant Terminal</string>
            <key>PayloadDisplayName</key>
            <string>JARVIS Quant Terminal WebClip</string>
            <key>PayloadIdentifier</key>
            <string>com.jarvis.quant.webclip</string>
            <key>PayloadType</key>
            <string>com.apple.webClip.managed</string>
            <key>PayloadUUID</key>
            <string>B6C3A401-D181-45F6-6F9F-005155244201</string>
            <key>PayloadVersion</key>
            <integer>1</integer>
            <key>Precomposed</key>
            <true/>
            <key>URL</key>
            <string>${appUrl}</string>
        </dict>
    </array>
    <key>PayloadDisplayName</key>
    <string>J.A.R.V.I.S. Quant Terminal</string>
    <key>PayloadIdentifier</key>
    <string>com.jarvis.quant.profile</string>
    <key>PayloadOrganization</key>
    <string>J.A.R.V.I.S. Quantitative Systems</string>
    <key>PayloadRemovalDisallowed</key>
    <false/>
    <key>PayloadType</key>
    <string>Configuration</string>
    <key>PayloadUUID</key>
    <string>B6C3A402-D181-45F6-6F9F-005155244202</string>
    <key>PayloadVersion</key>
    <integer>1</integer>
</dict>
</plist>`;

  res.setHeader('Content-Type', 'application/x-apple-aspen-config');
  res.setHeader('Content-Disposition', 'attachment; filename="JARVIS-Quant.mobileconfig"');
  res.send(mobileconfigXml);
});

app.get(['/manifest.json', '/manifest.webmanifest'], (_req, res) => {
  res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.sendFile(path.resolve(__dirname, 'public', 'manifest.json'));
});

app.get(['/sw.js', '/registerSW.js'], (_req, res) => {
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.setHeader('Service-Worker-Allowed', '/');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.sendFile(path.resolve(__dirname, 'public', 'sw.js'));
});

async function startServer() {
  const server = createHttpServer(app);
  const wss = new WebSocketServer({ server, path: '/ws/market' });

  wss.on('connection', (ws: WebSocket, req) => {
    const clientIp = req.socket.remoteAddress || 'unknown';
    console.log(`[WS Market] Client connected from ${clientIp}. Active: ${wss.clients.size}`);
    ws.send(JSON.stringify({
      type: 'SNAPSHOT', provider: DATA_SOURCE, isDelayed: true, quotes: quotesCache,
      timestamp: Date.now(), serverTime: new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' }) + ' IST',
    }));
    ws.on('message', (msg: any) => {
      try {
        const parsed = JSON.parse(msg.toString());
        if (parsed.action === 'PING') ws.send(JSON.stringify({ type: 'PONG', timestamp: Date.now() }));
      } catch { /* ignore */ }
    });
    ws.on('error', (err) => console.warn('[WS Market] Client error:', err.message));
    ws.on('close', () => console.log(`[WS Market] Client disconnected. Active: ${wss.clients.size}`));
  });

  setInterval(async () => {
    if (wss.clients.size === 0) return;
    try {
      await syncMarketQuotes();
      const payload = JSON.stringify({
        type: 'TICK', provider: DATA_SOURCE, isDelayed: true, quotes: quotesCache,
        timestamp: Date.now(), serverTime: new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' }) + ' IST',
      });
      for (const client of wss.clients) {
        if (client.readyState === WebSocket.OPEN) client.send(payload);
      }
    } catch (err) {
      console.warn('[WS Market] Broadcast error:', err);
    }
  }, 2500);

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({ server: { middlewareMode: true, hmr: false }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => res.sendFile(path.resolve(__dirname, 'dist', 'index.html')));
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[JARVIS Terminal Server] Online on port ${PORT} with WebSocket on /ws/market`);
    if (!process.env.OWNER_ACCESS_TOKEN && process.env.NODE_ENV !== 'production') {
      console.warn(`[SECURITY] OWNER_ACCESS_TOKEN is not set. Using development fallback token: ${DEFAULT_DEV_OWNER_TOKEN}`);
    } else if (!OWNER_ACCESS_TOKEN) {
      console.warn('[SECURITY] OWNER_ACCESS_TOKEN is not set — AI endpoints are disabled until it is configured.');
    }
  });
}

startServer();
