// =============================================================================
// Market Data Provider abstraction + configuration boundary.
// Phase-1/2 remediation: a single seam through which ALL quote data flows, so
// the app can be pointed at an officially licensed NSE/BSE feed or an authorized
// vendor WITHOUT any code changes elsewhere — and so that when no real provider
// is configured we return an EXPLICIT state (PROVIDER_NOT_CONFIGURED /
// DATA_UNAVAILABLE) instead of fabricating prices.
//
// IMPORTANT: The only implemented live source today is the UNOFFICIAL, DELAYED
// Yahoo Finance chart endpoint (daily candles). It is a clearly-labelled stopgap.
// Official providers (NSE real-time, BSE Self Data Feed, authorized vendors) are
// defined as stubs that return PROVIDER_NOT_CONFIGURED until credentials + a
// signed data agreement are supplied via env — they NEVER invent data.
// =============================================================================

export type DataMode = 'REALTIME' | 'DELAYED' | 'EOD' | 'HISTORICAL' | 'CACHED' | 'CALCULATED' | 'UNAVAILABLE';
export type ProviderStatus = 'OK' | 'PROVIDER_NOT_CONFIGURED' | 'DATA_UNAVAILABLE';
export type FreshnessStatus = 'FRESH' | 'STALE' | 'UNAVAILABLE';

export interface ProviderInfo {
  id: string;
  name: string;
  dataMode: DataMode;
  isOfficial: boolean;
  isDelayed: boolean;
  transport: 'REST' | 'WEBSOCKET' | 'FILE' | 'NONE';
  disclaimer: string;
  freshnessThresholdSec: number;
}

export interface NormalizedQuote {
  symbol: string;
  name: string;
  exchange: 'NSE' | 'BSE' | 'INDEX' | 'UNKNOWN';
  price: number | null;
  change: number | null;
  changePct: number | null;
  high: number | null;
  low: number | null;
  prevClose: number | null;
  fiftyTwoWeekHigh: number | null;
  fiftyTwoWeekLow: number | null;
  volume: number | null;
  exchangeTimestamp: string | null; // when the exchange stamped the data (if known)
  receivedTimestamp: string;        // when we received/computed it (IST)
  dataMode: DataMode;
  source: string;
}

export interface ProviderQuoteResult {
  status: ProviderStatus;
  quote?: NormalizedQuote;
  error?: string;
}

const OUTBOUND_TIMEOUT_MS = 8000;

async function fetchWithTimeout(url: string, init: RequestInit = {}, timeoutMs = OUTBOUND_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(t);
  }
}

function nowIst(): string {
  return new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' }) + ' IST';
}

function exchangeOf(symbol: string): NormalizedQuote['exchange'] {
  if (symbol.startsWith('^')) return 'INDEX';
  if (symbol.endsWith('.NS')) return 'NSE';
  if (symbol.endsWith('.BO')) return 'BSE';
  return 'UNKNOWN';
}

export interface MarketDataProvider {
  info: ProviderInfo;
  getQuote(symbol: string, name?: string): Promise<ProviderQuoteResult>;
}

// ---- Yahoo DELAYED/UNOFFICIAL (stopgap, the only implemented live source) ----
class YahooDelayedProvider implements MarketDataProvider {
  info: ProviderInfo = {
    id: 'YAHOO_DELAYED_UNOFFICIAL',
    name: 'Yahoo Finance (delayed, unofficial)',
    dataMode: 'DELAYED',
    isOfficial: false,
    isDelayed: true,
    transport: 'REST',
    disclaimer: 'Delayed, unofficial market data (Yahoo Finance daily candles). Not a licensed real-time exchange feed. For information only.',
    freshnessThresholdSec: 24 * 60 * 60, // daily candles; stale after a day
  };

  async getQuote(symbol: string, name = symbol): Promise<ProviderQuoteResult> {
    try {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=2d`;
      const res = await fetchWithTimeout(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': 'application/json',
        },
      });
      if (!res.ok) return { status: 'DATA_UNAVAILABLE', error: `HTTP ${res.status}` };
      const data: any = await res.json();
      const result = data?.chart?.result?.[0];
      if (!result) return { status: 'DATA_UNAVAILABLE', error: 'empty result' };

      const meta = result.meta || {};
      const closes: (number | null)[] = result.indicators?.quote?.[0]?.close || [];
      const valid = closes.filter((c): c is number => typeof c === 'number' && !isNaN(c) && c > 0);

      let price: number | null = null;
      let prevClose: number | null = null;
      if (valid.length >= 2) { prevClose = valid[valid.length - 2]; price = valid[valid.length - 1]; }
      else if (valid.length === 1) { price = valid[0]; prevClose = typeof meta.chartPreviousClose === 'number' && meta.chartPreviousClose > 0 ? meta.chartPreviousClose : null; }
      else if (typeof meta.regularMarketPrice === 'number' && meta.regularMarketPrice > 0) { price = meta.regularMarketPrice; prevClose = typeof meta.chartPreviousClose === 'number' && meta.chartPreviousClose > 0 ? meta.chartPreviousClose : null; }

      if (price === null || prevClose === null || prevClose <= 0) return { status: 'DATA_UNAVAILABLE', error: 'no valid close' };

      const r2 = (n: number | null | undefined) => (typeof n === 'number' && !isNaN(n) ? Math.round(n * 100) / 100 : null);
      const change = price - prevClose;
      const exchTs = typeof meta.regularMarketTime === 'number'
        ? new Date(meta.regularMarketTime * 1000).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) + ' IST'
        : null;

      return {
        status: 'OK',
        quote: {
          symbol, name, exchange: exchangeOf(symbol),
          price: r2(price), prevClose: r2(prevClose), change: r2(change), changePct: r2((change / prevClose) * 100),
          high: r2(meta.regularMarketDayHigh ?? meta.dayHigh), low: r2(meta.regularMarketDayLow ?? meta.dayLow),
          fiftyTwoWeekHigh: r2(meta.fiftyTwoWeekHigh), fiftyTwoWeekLow: r2(meta.fiftyTwoWeekLow),
          volume: typeof meta.regularMarketVolume === 'number' ? meta.regularMarketVolume : null,
          exchangeTimestamp: exchTs, receivedTimestamp: nowIst(),
          dataMode: 'DELAYED', source: this.info.id,
        },
      };
    } catch (e: any) {
      return { status: 'DATA_UNAVAILABLE', error: e?.name === 'AbortError' ? 'timeout' : String(e?.message || e) };
    }
  }
}

// ---- Official / vendor providers: configuration boundary, NO fabrication ----
class UnconfiguredProvider implements MarketDataProvider {
  info: ProviderInfo;
  constructor(id: string, name: string, isOfficial: boolean, dataMode: DataMode, transport: ProviderInfo['transport']) {
    this.info = {
      id, name, dataMode, isOfficial, isDelayed: dataMode === 'DELAYED', transport,
      disclaimer: `${name} is not configured. Supply credentials and a signed data agreement via environment before enabling. No data is fabricated.`,
      freshnessThresholdSec: dataMode === 'REALTIME' ? 10 : 24 * 60 * 60,
    };
  }
  async getQuote(): Promise<ProviderQuoteResult> {
    return { status: 'PROVIDER_NOT_CONFIGURED', error: `${this.info.name} requires credentials + data agreement.` };
  }
}

const PROVIDERS: Record<string, () => MarketDataProvider> = {
  yahoo_delayed: () => new YahooDelayedProvider(),
  nse_official: () => new UnconfiguredProvider('NSE_REALTIME_OFFICIAL', 'NSE Data & Analytics (real-time)', true, 'REALTIME', 'WEBSOCKET'),
  bse_official: () => new UnconfiguredProvider('BSE_SELF_DATA_FEED', 'BSE Self Data Feed', true, 'REALTIME', 'WEBSOCKET'),
  vendor: () => new UnconfiguredProvider('AUTHORIZED_VENDOR', 'Exchange-authorized data vendor', false, 'REALTIME', 'WEBSOCKET'),
};

let activeProvider: MarketDataProvider | null = null;

export function getActiveProvider(): MarketDataProvider {
  if (activeProvider) return activeProvider;
  const key = (process.env.MARKET_DATA_PROVIDER || 'yahoo_delayed').trim().toLowerCase();
  const factory = PROVIDERS[key] || PROVIDERS.yahoo_delayed;
  activeProvider = factory();
  if (!PROVIDERS[key]) {
    console.warn(`[MarketData] Unknown MARKET_DATA_PROVIDER='${key}', defaulting to yahoo_delayed.`);
  }
  console.log(`[MarketData] Active provider: ${activeProvider.info.id} (${activeProvider.info.dataMode}, official=${activeProvider.info.isOfficial})`);
  return activeProvider;
}

// Freshness: compares an ISO/epoch received time against the provider threshold.
export function computeFreshness(receivedEpochMs: number | null, thresholdSec: number): FreshnessStatus {
  if (!receivedEpochMs) return 'UNAVAILABLE';
  const ageSec = (Date.now() - receivedEpochMs) / 1000;
  return ageSec <= thresholdSec ? 'FRESH' : 'STALE';
}
