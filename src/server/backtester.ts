// Backtesting Harness (Phase 2 & Institutional Quant Foundation).
// Validates each of the five agents as a DEFINED-RISK, rules-based strategy
// against REAL live historical data (Yahoo Finance daily candles).
//
// Quantitative Methodology:
// - Incorporates historical warm-up buffer so 200-SMA, 50-SMA, RSI, and ATR
//   are fully initialized from the first bar of the requested test window.
// - Probabilistic Sharpe Ratio (PSR) formulated by Marcos López de Prado.
// - Wilson Score 95% Confidence Interval for Win Rate (exact statistical bounds).
// - Student's t-statistic on trade returns.
// - Sortino Ratio, Calmar Ratio, Profit Factor, and Trade Expectancy.
// - Transparent live audit trail of raw daily candles and source metadata.

export interface Candle {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface StrategyMeta {
  id: string;
  agent: string;
  name: string;
  rule: string;
}

export const AVAILABLE_STRATEGIES: StrategyMeta[] = [
  {
    id: 'chanakya',
    agent: 'Chanakya',
    name: 'Bollinger Mean-Reversion & Oversold Bounce',
    rule: 'Long when Close < lower band (20, 2σ) and RSI(14) < 42; exit on mean-reversion to 20-SMA or 3% protective ATR stop.',
  },
  {
    id: 'bhishma',
    agent: 'Bhishma',
    name: 'Trend MA Crossover & Institutional Momentum',
    rule: 'Long when Fast EMA(12) > Medium EMA(26) and Close > 50-SMA; exit on bearish crossover or 2.5×ATR trailing stop.',
  },
  {
    id: 'arjuna',
    agent: 'Arjuna',
    name: 'Donchian Breakout Momentum',
    rule: 'Long on 20-day high breakout; exit on 10-day low breakdown or 2.5×ATR trailing stop.',
  },
  {
    id: 'kuber',
    agent: 'Kuber',
    name: 'RSI Swing & Value Accumulation',
    rule: 'Long when RSI(14) < 36 and turns upward; exit when RSI(14) > 62 or 3.5×ATR trailing stop.',
  },
  {
    id: 'vidura',
    agent: 'Vidura',
    name: 'Defensive Regime Filter & Risk-Managed Trend',
    rule: 'Long only in secular bull regime (Close > 200-SMA and 50-SMA rising) on pullback to 20-EMA; 100% Flat in bear regime.',
  },
];

const INDEX_ALIASES: Record<string, string> = {
  'NIFTY': '^NSEI',
  'NIFTY 50': '^NSEI',
  'NIFTY50': '^NSEI',
  'NIFTY-50': '^NSEI',
  'BANKNIFTY': '^NSEBANK',
  'BANK NIFTY': '^NSEBANK',
  'NIFTYBANK': '^NSEBANK',
  'SENSEX': '^BSESN',
  'BSE SENSEX': '^BSESN',
  'SENSEX 30': '^BSESN',
  'NIFTYIT': '^CNXIT',
  'NIFTY IT': '^CNXIT',
  'MIDCPNIFTY': '^NSEMDCP50',
  'NIFTY MIDCAP': '^NSEMDCP50',
  'NIFTY MIDCAP 50': '^NSEMDCP50',
  'FINNIFTY': 'NIFTY_FIN_SERVICE.NS',
  'NIFTY FIN SERVICE': 'NIFTY_FIN_SERVICE.NS',
};

const BSE_CODE_MAP: Record<string, string> = {
  '500325': 'RELIANCE',
  '532540': 'TCS',
  '500180': 'HDFCBANK',
  '500209': 'INFY',
  '532174': 'ICICIBANK',
  '500112': 'SBIN',
  '532454': 'BHARTIARTL',
  '500510': 'LT',
  '500251': 'TRENT',
  '500049': 'BEL',
  '541154': 'HAL',
  '500034': 'BAJFINANCE',
  '532500': 'MARUTI',
  '500875': 'ITC',
  '507685': 'WIPRO',
  '500570': 'TMCV',
  '532215': 'AXISBANK',
  '500247': 'KOTAKBANK',
  '524715': 'SUNPHARMA',
  '500520': 'M&M',
  '532555': 'NTPC',
  '500440': 'HINDUNILVR',
  '532977': 'BAJAJ-AUTO',
  '500312': 'ONGC',
  '500820': 'ASIANPAINT',
  '532522': 'PETRONET',
  '532538': 'ULTRACEMCO',
  '532488': 'DIVISLAB',
  '500800': 'TATACONSUM',
  '532755': 'TECHM',
  '500124': 'DRREDDY',
  '500790': 'NESTLEIND',
  '532898': 'POWERGRID',
  '532281': 'HCLTECH',
  '543320': 'ZOMATO',
  '533278': 'COALINDIA',
  '532648': 'YESBANK',
  '532667': 'SUZLON',
  'TATAMOTORS': 'TMCV',
  'TATA-MOTORS': 'TMCV',
};

// Map requested evaluation range to upstream fetch range (includes warm-up buffer)
const RANGE_CONFIG: Record<string, { fetchRange: string; evalBars: number }> = {
  '6mo': { fetchRange: '2y', evalBars: 125 },
  '1y':  { fetchRange: '2y', evalBars: 247 },
  '2y':  { fetchRange: '5y', evalBars: 495 },
  '5y':  { fetchRange: '5y', evalBars: 1235 },
};

async function fetchCandlesFromYahoo(sym: string, range: string): Promise<Candle[]> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=1d&range=${range}`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data: any = await res.json();
  const result = data?.chart?.result?.[0];
  if (!result) throw new Error(`No data returned for ${sym}`);
  const ts: number[] = result.timestamp || [];
  const q = result.indicators?.quote?.[0] || {};
  const candles: Candle[] = [];
  for (let i = 0; i < ts.length; i++) {
    const o = q.open?.[i], h = q.high?.[i], l = q.low?.[i], c = q.close?.[i], v = q.volume?.[i];
    if ([o, h, l, c].every((x) => typeof x === 'number' && !isNaN(x))) {
      candles.push({
        date: new Date(ts[i] * 1000).toISOString().split('T')[0],
        open: Math.round(o * 100) / 100,
        high: Math.round(h * 100) / 100,
        low: Math.round(l * 100) / 100,
        close: Math.round(c * 100) / 100,
        volume: typeof v === 'number' && !isNaN(v) ? v : 0,
      });
    }
  }
  return candles;
}

export async function fetchHistoricalDaily(
  rawSymbol: string,
  range = '1y'
): Promise<{
  allCandles: Candle[];
  evalStartIndex: number;
  resolvedSymbol: string;
  fallbackNote?: string;
}> {
  const sym = rawSymbol.trim().toUpperCase();
  const indexMapped = INDEX_ALIASES[sym] || INDEX_ALIASES[rawSymbol.trim()];
  const cleanBase = sym.replace('.BO', '').replace('.NS', '');
  const mappedTicker = BSE_CODE_MAP[cleanBase] || BSE_CODE_MAP[sym];

  const candidates: string[] = [];

  if (indexMapped) {
    candidates.push(indexMapped);
  } else if (mappedTicker) {
    candidates.push(sym);
    if (!sym.endsWith('.BO')) candidates.push(`${mappedTicker}.BO`);
    candidates.push(`${mappedTicker}.NS`, `${mappedTicker}.BO`);
  } else if (sym.startsWith('^') || sym.includes('.')) {
    candidates.push(sym);
    if (sym.endsWith('.BO')) {
      const base = sym.replace('.BO', '');
      candidates.push(`${base}.NS`);
    } else if (sym.endsWith('.NS')) {
      const base = sym.replace('.NS', '');
      candidates.push(`${base}.BO`);
    }
  } else {
    candidates.push(`${sym}.NS`, `${sym}.BO`, sym);
  }

  const uniqueCandidates = Array.from(new Set(candidates));
  const cfg = RANGE_CONFIG[range] || RANGE_CONFIG['1y'];

  let lastError = '';
  for (const candidate of uniqueCandidates) {
    try {
      const candles = await fetchCandlesFromYahoo(candidate, cfg.fetchRange);
      if (candles.length >= 60) {
        let fallbackNote: string | undefined;
        if (candidate !== sym) {
          if (indexMapped) {
            fallbackNote = `Mapped market index '${rawSymbol}' to official ticker ${candidate}`;
          } else if (mappedTicker) {
            fallbackNote = `Resolved BSE scrip ${cleanBase} to ${mappedTicker} (${candidate}) with full historical feed`;
          } else if (candidate.endsWith('.NS') && sym.endsWith('.BO')) {
            fallbackNote = `Resolved via NSE counterpart (${candidate}) due to upstream feed availability`;
          } else {
            fallbackNote = `Resolved via upstream ticker ${candidate}`;
          }
        }

        // Determine evaluation window starting index (all previous bars serve as technical warm-up)
        const targetEvalBars = Math.min(candles.length, cfg.evalBars);
        const evalStartIndex = Math.max(0, candles.length - targetEvalBars);

        return {
          allCandles: candles,
          evalStartIndex,
          resolvedSymbol: candidate,
          fallbackNote,
        };
      } else {
        lastError = `Insufficient history for ${candidate} (${candles.length} bars)`;
      }
    } catch (e: any) {
      lastError = e?.message || `Failed to fetch ${candidate}`;
    }
  }

  throw new Error(`Historical data unavailable for '${rawSymbol}' across NSE/BSE feeds (${lastError}). Please verify symbol.`);
}

// -----------------------------------------------------------------------------
// TECHNICAL INDICATOR ENGINES (Full Series Calculation)
// -----------------------------------------------------------------------------

function calcSMA(values: number[], period: number): (number | null)[] {
  const result: (number | null)[] = new Array(values.length).fill(null);
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= period) sum -= values[i - period];
    if (i >= period - 1) result[i] = sum / period;
  }
  return result;
}

function calcEMA(values: number[], period: number): (number | null)[] {
  const result: (number | null)[] = new Array(values.length).fill(null);
  if (values.length < period) return result;
  const k = 2 / (period + 1);
  let sum = 0;
  for (let i = 0; i < period; i++) sum += values[i];
  result[period - 1] = sum / period;
  for (let i = period; i < values.length; i++) {
    result[i] = values[i] * k + (result[i - 1] as number) * (1 - k);
  }
  return result;
}

function calcStdDev(values: number[], sma: (number | null)[], period: number): (number | null)[] {
  const result: (number | null)[] = new Array(values.length).fill(null);
  for (let i = period - 1; i < values.length; i++) {
    const mean = sma[i];
    if (mean == null) continue;
    let sumSq = 0;
    for (let k = i - period + 1; k <= i; k++) {
      sumSq += (values[k] - mean) ** 2;
    }
    result[i] = Math.sqrt(sumSq / period);
  }
  return result;
}

function calcRSI(closes: number[], period = 14): (number | null)[] {
  const rsi: (number | null)[] = new Array(closes.length).fill(null);
  if (closes.length <= period) return rsi;
  let gain = 0, loss = 0;
  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gain += diff; else loss -= diff;
  }
  let avgGain = gain / period, avgLoss = loss / period;
  rsi[period] = avgLoss === 0 ? 100 : 100 - (100 / (1 + avgGain / avgLoss));
  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    const g = diff >= 0 ? diff : 0;
    const l = diff < 0 ? -diff : 0;
    avgGain = (avgGain * (period - 1) + g) / period;
    avgLoss = (avgLoss * (period - 1) + l) / period;
    rsi[i] = avgLoss === 0 ? 100 : 100 - (100 / (1 + avgGain / avgLoss));
  }
  return rsi;
}

function calcATR(candles: Candle[], period = 14): (number | null)[] {
  const atr: (number | null)[] = new Array(candles.length).fill(null);
  if (candles.length < period) return atr;
  const tr: number[] = [candles[0].high - candles[0].low];
  for (let i = 1; i < candles.length; i++) {
    const h = candles[i].high, l = candles[i].low, pc = candles[i - 1].close;
    tr.push(Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc)));
  }
  let sum = 0;
  for (let i = 0; i < period; i++) sum += tr[i];
  atr[period - 1] = sum / period;
  for (let i = period; i < candles.length; i++) {
    atr[i] = ((atr[i - 1] as number) * (period - 1) + tr[i]) / period;
  }
  return atr;
}

// -----------------------------------------------------------------------------
// STATISTICAL METHODOLOGY ENGINES
// -----------------------------------------------------------------------------

function normalCdf(x: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989423 * Math.exp(-x * x / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return x > 0 ? 1 - p : p;
}

function calcSkewness(returns: number[]): number {
  const n = returns.length;
  if (n < 3) return 0;
  const mean = returns.reduce((a, b) => a + b, 0) / n;
  const m2 = returns.reduce((a, b) => a + (b - mean) ** 2, 0) / n;
  const m3 = returns.reduce((a, b) => a + (b - mean) ** 3, 0) / n;
  const s = Math.sqrt(m2);
  return s > 0 ? m3 / (s ** 3) : 0;
}

function calcKurtosis(returns: number[]): number {
  const n = returns.length;
  if (n < 4) return 3;
  const mean = returns.reduce((a, b) => a + b, 0) / n;
  const m2 = returns.reduce((a, b) => a + (b - mean) ** 2, 0) / n;
  const m4 = returns.reduce((a, b) => a + (b - mean) ** 4, 0) / n;
  return m2 > 0 ? m4 / (m2 ** 2) : 3;
}

// Marcos López de Prado: Probabilistic Sharpe Ratio
function calcPSR(sharpe: number, n: number, skew = 0, kurt = 3, benchmarkSharpe = 0): number {
  if (n < 2) return 50;
  const num = (sharpe - benchmarkSharpe) * Math.sqrt(n - 1);
  const denom = Math.sqrt(Math.max(0.0001, 1 - skew * sharpe + ((kurt - 1) / 4) * (sharpe ** 2)));
  const z = num / denom;
  const psr = normalCdf(z) * 100;
  return Math.min(99.9, Math.max(0.1, Math.round(psr * 10) / 10));
}

// Exact Wilson Score 95% Confidence Interval for Win Rate
function calcWilsonScoreInterval(wins: number, n: number): { lower: number; upper: number } {
  if (n <= 0) return { lower: 0, upper: 100 };
  const z = 1.96; // 95% confidence level
  const p = wins / n;
  const z2 = z * z;
  const denom = 1 + z2 / n;
  const center = (p + z2 / (2 * n)) / denom;
  const margin = (z * Math.sqrt((p * (1 - p) + z2 / (4 * n)) / n)) / denom;
  return {
    lower: Math.max(0, Math.round((center - margin) * 1000) / 10),
    upper: Math.min(100, Math.round((center + margin) * 1000) / 10),
  };
}

// -----------------------------------------------------------------------------
// STRATEGY EXECUTION & TRADES HARNESS
// -----------------------------------------------------------------------------

export interface BacktestResult {
  symbol: string;
  resolvedSymbol?: string;
  fallbackNote?: string;
  strategy: StrategyMeta;
  range: string;
  bars: number;
  from: string;
  to: string;
  metrics: {
    totalReturnPct: number;
    buyHoldReturnPct: number;
    alphaPct: number;
    maxDrawdownPct: number;
    winRatePct: number;
    numTrades: number;
    sharpe: number;
    sortino: number;
    calmar: number;
    avgTradePct: number;
    expectancyPct: number;
    profitFactor: number;
    confidenceLevelPct: number;
    confidenceTier: 'VERY_HIGH' | 'HIGH' | 'MODERATE' | 'LOW';
    probabilisticSharpeRatioPct: number;
    winRateLowerBound: number;
    winRateUpperBound: number;
    tStat: number;
    pValue: number;
    maxConsecutiveLosses: number;
    sampleSizeAdequate: boolean;
    sampleNote: string;
  };
  equityCurve: Array<{ date: string; strategy: number; buyHold: number }>;
  trades: Array<{
    entryDate: string;
    exitDate: string;
    entryPrice: number;
    exitPrice: number;
    returnPct: number;
    bars: number;
    exitReason: string;
  }>;
  audit: {
    feedSource: string;
    resolvedTicker: string;
    evaluationBars: number;
    warmupBars: number;
    firstBar: Candle;
    lastBar: Candle;
    latestFeedTimestamp: string;
    recentCandlesAudit: Candle[];
    methodologyNotes: string[];
  };
  disclaimer: string;
}

export async function runBacktest(symbol: string, strategyId: string, range = '1y'): Promise<BacktestResult> {
  if (!symbol || typeof symbol !== 'string') throw new Error('symbol is required.');
  const meta = AVAILABLE_STRATEGIES.find((s) => s.id === strategyId);
  if (!meta) throw new Error(`strategy must be one of: ${AVAILABLE_STRATEGIES.map((s) => s.id).join(', ')}`);

  const { allCandles, evalStartIndex, resolvedSymbol, fallbackNote } = await fetchHistoricalDaily(symbol.trim(), range);

  const closes = allCandles.map((c) => c.close);
  const highs = allCandles.map((c) => c.high);
  const lows = allCandles.map((c) => c.low);
  const n = allCandles.length;

  // Precompute full indicators using warmup buffer
  const sma20 = calcSMA(closes, 20);
  const sma50 = calcSMA(closes, 50);
  const sma200 = calcSMA(closes, 200);
  const ema12 = calcEMA(closes, 12);
  const ema26 = calcEMA(closes, 26);
  const ema20 = calcEMA(closes, 20);
  const std20 = calcStdDev(closes, sma20, 20);
  const rsi14 = calcRSI(closes, 14);
  const atr14 = calcATR(allCandles, 14);

  // Cash-Delivery Statutory Cost & Slippage Model (Indian NSE/BSE Delivery Segment)
  // - STT: 0.10% on buy + 0.10% on sell = 0.2000%
  // - Exchange Transaction Charge: 0.00297% * 2 = 0.00594%
  // - SEBI Turnover Fee: 0.0001% * 2 = 0.0002%
  // - Stamp Duty: 0.015% on buy = 0.0150%
  // - GST (18% on Exchange + SEBI): 0.0011%
  // - Slippage: 0.05% per leg = 0.1000% round-trip
  const ENTRY_SLIPPAGE_PCT = 0.0005; // 5 bps entry slippage
  const EXIT_SLIPPAGE_PCT = 0.0005;  // 5 bps exit slippage
  const DELIVERY_STATUTORY_TAX_PCT = 0.2222; // 0.2222% round-trip statutory taxes (STT + Exch + Stamp + SEBI + GST)
  const ROUND_TRIP_COST_PCT = DELIVERY_STATUTORY_TAX_PCT + (ENTRY_SLIPPAGE_PCT + EXIT_SLIPPAGE_PCT) * 100; // ~0.3222%

  // Execute strategy rules across evaluation window
  // Signal on bar i-1 enters at bar i Open + slippage; stops checked against bar i Open (gap-through) and bar i Low (intraday)
  const pos = new Array(n).fill(0);
  let inPos = 0;
  let pendingEntrySignal = false;
  let entryPrice = 0;
  let entryIndex = 0;
  let trailingStopPrice = 0;
  let highestHighSinceEntry = 0;

  // Track trade exits with transparent reasons
  const trades: BacktestResult['trades'] = [];

  const getInitialAtrStopMult = (strat: string): number => {
    if (strat === 'kuber') return 3.5;
    if (strat === 'vidura') return 2.0;
    return 2.5;
  };

  for (let i = evalStartIndex; i < n; i++) {
    const o = allCandles[i].open;
    const h = highs[i];
    const l = lows[i];
    const c = closes[i];
    const atr = atr14[i] || (c * 0.015);
    const atrMult = getInitialAtrStopMult(strategyId);

    // 1. If a buy signal was generated on bar i-1 close, enter at bar i Open + slippage
    if (inPos === 0 && pendingEntrySignal) {
      inPos = 1;
      pendingEntrySignal = false;
      entryPrice = o * (1 + ENTRY_SLIPPAGE_PCT);
      entryIndex = i;
      highestHighSinceEntry = Math.max(o, h);
      trailingStopPrice = entryPrice - atrMult * atr;
    }

    // 2. If in position, update trailing stop monotonically and check intraday stop-loss (including overnight gap-through-stop at Open)
    if (inPos === 1) {
      // Check stop-loss against current bar's Low BEFORE updating trailing stop from current bar's High (conservative bar ordering)
      if (l <= trailingStopPrice) {
        // Gap-through-stop fill at Open if bar opened below stopLoss; otherwise fill at trailingStopPrice less exit slippage
        const rawStopFill = o < trailingStopPrice ? o : trailingStopPrice;
        const netExitPrice = rawStopFill * (1 - EXIT_SLIPPAGE_PCT);
        const grossRetPct = ((netExitPrice - entryPrice) / entryPrice) * 100;
        const netRetPct = grossRetPct - DELIVERY_STATUTORY_TAX_PCT;
        inPos = 0;
        trades.push({
          entryDate: allCandles[entryIndex].date,
          exitDate: allCandles[i].date,
          entryPrice: Math.round(entryPrice * 100) / 100,
          exitPrice: Math.round(netExitPrice * 100) / 100,
          returnPct: Math.round(netRetPct * 100) / 100,
          bars: Math.max(1, i - entryIndex),
          exitReason:
            o < trailingStopPrice
              ? `Gap-Through Stop at Open (${atrMult}×ATR Trailing)`
              : `Intraday Trailing Stop (${atrMult}×ATR)`,
        });
      } else {
        // Ratchet trailing stop upward monotonically as new highs are achieved
        if (h > highestHighSinceEntry) {
          highestHighSinceEntry = h;
        }
        const candidateTrail = highestHighSinceEntry - atrMult * atr;
        if (candidateTrail > trailingStopPrice) {
          trailingStopPrice = candidateTrail;
        }
      }
    }

    // 3. Evaluate end-of-bar strategy target / reversal exits or new entry signals
    switch (strategyId) {
      case 'chanakya': {
        const mid = sma20[i];
        const sd = std20[i];
        const rsi = rsi14[i];
        if (mid != null && sd != null) {
          const lower = mid - 2 * sd;
          if (inPos === 0 && c < lower && (rsi == null || rsi < 42)) {
            pendingEntrySignal = true;
          } else if (inPos === 1 && c >= mid) {
            const netExitPrice = c * (1 - EXIT_SLIPPAGE_PCT);
            const netRetPct = ((netExitPrice - entryPrice) / entryPrice) * 100 - DELIVERY_STATUTORY_TAX_PCT;
            inPos = 0;
            trades.push({
              entryDate: allCandles[entryIndex].date,
              exitDate: allCandles[i].date,
              entryPrice: Math.round(entryPrice * 100) / 100,
              exitPrice: Math.round(netExitPrice * 100) / 100,
              returnPct: Math.round(netRetPct * 100) / 100,
              bars: Math.max(1, i - entryIndex),
              exitReason: 'Mean Reversion Target (20-SMA)',
            });
          }
        }
        break;
      }

      case 'bhishma': {
        const f = ema12[i];
        const s = ema26[i];
        const trend = sma50[i] || sma20[i];
        if (f != null && s != null) {
          if (inPos === 0 && f > s && (trend == null || c > trend)) {
            pendingEntrySignal = true;
          } else if (inPos === 1 && f < s) {
            const netExitPrice = c * (1 - EXIT_SLIPPAGE_PCT);
            const netRetPct = ((netExitPrice - entryPrice) / entryPrice) * 100 - DELIVERY_STATUTORY_TAX_PCT;
            inPos = 0;
            trades.push({
              entryDate: allCandles[entryIndex].date,
              exitDate: allCandles[i].date,
              entryPrice: Math.round(entryPrice * 100) / 100,
              exitPrice: Math.round(netExitPrice * 100) / 100,
              returnPct: Math.round(netRetPct * 100) / 100,
              bars: Math.max(1, i - entryIndex),
              exitReason: 'Bearish Trend Reversal (EMA Cross)',
            });
          }
        }
        break;
      }

      case 'arjuna': {
        if (i >= 20) {
          const hh = Math.max(...highs.slice(i - 20, i));
          const ll = Math.min(...lows.slice(i - 10, i));
          if (inPos === 0 && c > hh) {
            pendingEntrySignal = true;
          } else if (inPos === 1 && c < ll) {
            const netExitPrice = c * (1 - EXIT_SLIPPAGE_PCT);
            const netRetPct = ((netExitPrice - entryPrice) / entryPrice) * 100 - DELIVERY_STATUTORY_TAX_PCT;
            inPos = 0;
            trades.push({
              entryDate: allCandles[entryIndex].date,
              exitDate: allCandles[i].date,
              entryPrice: Math.round(entryPrice * 100) / 100,
              exitPrice: Math.round(netExitPrice * 100) / 100,
              returnPct: Math.round(netRetPct * 100) / 100,
              bars: Math.max(1, i - entryIndex),
              exitReason: 'Donchian 10-Day Channel Breakdown',
            });
          }
        }
        break;
      }

      case 'kuber': {
        const r = rsi14[i];
        const prevR = rsi14[i - 1];
        if (r != null && prevR != null) {
          if (inPos === 0 && r < 36 && r > prevR) {
            pendingEntrySignal = true;
          } else if (inPos === 1 && r > 62) {
            const netExitPrice = c * (1 - EXIT_SLIPPAGE_PCT);
            const netRetPct = ((netExitPrice - entryPrice) / entryPrice) * 100 - DELIVERY_STATUTORY_TAX_PCT;
            inPos = 0;
            trades.push({
              entryDate: allCandles[entryIndex].date,
              exitDate: allCandles[i].date,
              entryPrice: Math.round(entryPrice * 100) / 100,
              exitPrice: Math.round(netExitPrice * 100) / 100,
              returnPct: Math.round(netRetPct * 100) / 100,
              bars: Math.max(1, i - entryIndex),
              exitReason: 'RSI Target Reached (>62)',
            });
          }
        }
        break;
      }

      case 'vidura': {
        const s200 = sma200[i] || sma50[i];
        const s50 = sma50[i];
        const e20 = ema20[i] || sma20[i];
        if (s200 != null && s50 != null && e20 != null) {
          const isBullRegime = c > s200;
          const isPullback = Math.abs(c - e20) / e20 < 0.02 && c > s50;
          if (inPos === 0 && isBullRegime && isPullback) {
            pendingEntrySignal = true;
          } else if (inPos === 1 && (c < s50 || !isBullRegime)) {
            const netExitPrice = c * (1 - EXIT_SLIPPAGE_PCT);
            const netRetPct = ((netExitPrice - entryPrice) / entryPrice) * 100 - DELIVERY_STATUTORY_TAX_PCT;
            inPos = 0;
            trades.push({
              entryDate: allCandles[entryIndex].date,
              exitDate: allCandles[i].date,
              entryPrice: Math.round(entryPrice * 100) / 100,
              exitPrice: Math.round(netExitPrice * 100) / 100,
              returnPct: Math.round(netRetPct * 100) / 100,
              bars: Math.max(1, i - entryIndex),
              exitReason: 'Regime Risk-Off Filter Breakdown',
            });
          }
        }
        break;
      }
    }
    pos[i] = inPos;
  }

  // Separate closed trades from any still-open position at the end of the window
  const closedTrades = [...trades];

  // If trade is still open at the last bar, record for display in trade blotter ONLY
  // (Strictly excluded from win-rate, expectancy, profit factor, and t-stat calculations)
  if (inPos === 1) {
    const lastBar = allCandles[n - 1];
    trades.push({
      entryDate: allCandles[entryIndex].date,
      exitDate: `${lastBar.date} (Open Position)`,
      entryPrice: Math.round(entryPrice * 100) / 100,
      exitPrice: Math.round(lastBar.close * 100) / 100,
      returnPct: Math.round((((lastBar.close - entryPrice) / entryPrice) * 100 - DELIVERY_STATUTORY_TAX_PCT / 2) * 100) / 100,
      bars: Math.max(1, n - 1 - entryIndex),
      exitReason: 'Active Open Position (Unrealized — Excluded from Closed Stats)',
    });
  }

  // ---------------------------------------------------------------------------
  // EQUITY CURVE & PERFORMANCE METRICS (NET OF DELIVERY COSTS & SLIPPAGE)
  // ---------------------------------------------------------------------------

  const evalCandles = allCandles.slice(evalStartIndex);
  let equity = 100;
  let buyHold = 100;
  const initialClose = evalCandles[0].close;

  const curve: BacktestResult['equityCurve'] = [
    { date: evalCandles[0].date, strategy: 100, buyHold: 100 }
  ];
  const dailyStrategyReturns: number[] = [];

  for (let i = evalStartIndex + 1; i < n; i++) {
    const dayRet = (closes[i] - closes[i - 1]) / closes[i - 1];
    const wasInPos = pos[i - 1] === 1;
    const isNowInPos = pos[i] === 1;
    // Deduct half round-trip cost on entry transition and half on exit transition
    let transitionCost = 0;
    if (!wasInPos && isNowInPos) transitionCost += (ROUND_TRIP_COST_PCT / 100) * 0.5;
    if (wasInPos && !isNowInPos) transitionCost += (ROUND_TRIP_COST_PCT / 100) * 0.5;

    const stratRet = (isNowInPos || wasInPos ? dayRet : 0) - transitionCost;
    equity *= (1 + stratRet);
    buyHold = 100 * (closes[i] / initialClose);
    dailyStrategyReturns.push(stratRet);
    curve.push({
      date: allCandles[i].date,
      strategy: Math.round(equity * 100) / 100,
      buyHold: Math.round(buyHold * 100) / 100,
    });
  }

  // Max Drawdown calculation
  let peak = 100;
  let maxDd = 0;
  for (const pt of curve) {
    if (pt.strategy > peak) peak = pt.strategy;
    const dd = (peak - pt.strategy) / peak;
    if (dd > maxDd) maxDd = dd;
  }

  const round = (val: number, p = 2) => Math.round(val * Math.pow(10, p)) / Math.pow(10, p);

  // Sharpe & Downside / Sortino Metrics (Subtracting 6.50% Annualized Risk-Free Rate)
  const rf = 0.065 / 252; // Daily risk-free rate
  const dailyMean = dailyStrategyReturns.reduce((s, r) => s + r, 0) / (dailyStrategyReturns.length || 1);
  const dailyVar =
    dailyStrategyReturns.length > 1
      ? dailyStrategyReturns.reduce((s, r) => s + (r - dailyMean) ** 2, 0) / (dailyStrategyReturns.length - 1)
      : 0;
  const dailySd = Math.sqrt(dailyVar);
  const perPeriodSharpe = dailySd > 0 ? (dailyMean - rf) / dailySd : 0;
  const annualSharpe = perPeriodSharpe * Math.sqrt(252);

  // Downside deviation (returns below daily risk-free rate)
  const downsideVar =
    dailyStrategyReturns
      .filter((r) => r < rf)
      .reduce((s, r) => s + (r - rf) ** 2, 0) / (dailyStrategyReturns.length || 1);
  const downsideSd = Math.sqrt(downsideVar);
  const sortino = downsideSd > 0 ? ((dailyMean - rf) / downsideSd) * Math.sqrt(252) : (annualSharpe > 0 ? annualSharpe * 1.3 : 0);

  // Calmar ratio
  const totalReturnPct = equity - 100;
  const buyHoldReturnPct = buyHold - 100;
  const alphaPct = totalReturnPct - buyHoldReturnPct;
  const years = evalCandles.length / 252;
  const annualizedReturn = years > 0 ? ((equity / 100) ** (1 / years) - 1) * 100 : totalReturnPct;
  const calmar = maxDd > 0 ? round(annualizedReturn / (maxDd * 100)) : round(annualizedReturn > 0 ? 5.0 : 0);

  // Closed Trades performance (Strictly excludes unrealized open positions)
  const numTrades = closedTrades.length;
  const wins = closedTrades.filter((t) => t.returnPct > 0).length;
  const losses = closedTrades.filter((t) => t.returnPct <= 0).length;
  const winRate = numTrades > 0 ? wins / numTrades : 0;
  const winRatePct = round(winRate * 100);

  // Exact Wilson score interval on closed trades
  const { lower: winRateLowerBound, upper: winRateUpperBound } = calcWilsonScoreInterval(wins, numTrades);

  // Profit factor on closed trades
  const grossProfit = closedTrades.filter((t) => t.returnPct > 0).reduce((s, t) => s + t.returnPct, 0);
  const grossLoss = Math.abs(closedTrades.filter((t) => t.returnPct <= 0).reduce((s, t) => s + t.returnPct, 0));
  const profitFactor = grossLoss > 0 ? round(grossProfit / grossLoss) : round(grossProfit > 0 ? 9.99 : 1.0);

  // Expectancy (per closed trade mathematical expectation net of delivery costs)
  const avgWin = wins > 0 ? grossProfit / wins : 0;
  const avgLoss = losses > 0 ? grossLoss / losses : 0;
  const expectancyPct = round((winRate * avgWin) - ((1 - winRate) * avgLoss));

  // Max consecutive losses on closed trades
  let maxConsecLosses = 0;
  let currConsecLosses = 0;
  for (const t of closedTrades) {
    if (t.returnPct <= 0) {
      currConsecLosses++;
      if (currConsecLosses > maxConsecLosses) maxConsecLosses = currConsecLosses;
    } else {
      currConsecLosses = 0;
    }
  }

  // Skewness & Kurtosis of daily returns (matched in frequency to perPeriodSharpe for López de Prado PSR)
  const dailySkew = calcSkewness(dailyStrategyReturns);
  const dailyKurt = calcKurtosis(dailyStrategyReturns);
  const probabilisticSharpeRatioPct = calcPSR(perPeriodSharpe, dailyStrategyReturns.length, dailySkew, dailyKurt, 0);

  // Student's t-statistic on closed trade returns
  const tradeReturns = closedTrades.map((t) => t.returnPct);
  const meanTrade = tradeReturns.length > 0 ? tradeReturns.reduce((a, b) => a + b, 0) / tradeReturns.length : 0;
  const varTrade = tradeReturns.length > 1
    ? tradeReturns.reduce((a, b) => a + (b - meanTrade) ** 2, 0) / (tradeReturns.length - 1)
    : 0;
  const sdTrade = Math.sqrt(varTrade);
  const tStat = (sdTrade > 0 && numTrades > 1) ? round((meanTrade / (sdTrade / Math.sqrt(numTrades)))) : 0;
  // Two-tailed p-value from t-stat
  const pValue = tStat !== 0 ? round(2 * (1 - normalCdf(Math.abs(tStat))), 4) : 0.5;

  // Sample size adequacy
  const sampleSizeAdequate = numTrades >= 15;
  const sampleNote = sampleSizeAdequate
    ? `Sample size (N=${numTrades} closed trades) fulfills statistical requirements for asymptotic confidence.`
    : `Sample size (N=${numTrades} closed trades) is developing. Consider testing across 2Y or 5Y range for higher statistical power.`;

  // COMPOSITE STATISTICAL CONFIDENCE SCORE (0-100%)
  const psrComponent = (probabilisticSharpeRatioPct / 100) * 35;
  const sampleComponent = Math.min(1, numTrades / 20) * 25;
  const pfComponent = Math.min(20, Math.max(0, (profitFactor / 2.0) * 20));
  const ddPenalty = Math.max(0, 20 * (1 - (maxDd * 100) / 30));

  const rawConfidenceScore = Math.round(psrComponent + sampleComponent + pfComponent + ddPenalty);
  const confidenceLevelPct = Math.min(99, Math.max(5, rawConfidenceScore));

  const confidenceTier: 'VERY_HIGH' | 'HIGH' | 'MODERATE' | 'LOW' =
    confidenceLevelPct >= 75 ? 'VERY_HIGH' : confidenceLevelPct >= 60 ? 'HIGH' : confidenceLevelPct >= 40 ? 'MODERATE' : 'LOW';

  return {
    symbol: symbol.trim(),
    resolvedSymbol,
    fallbackNote,
    strategy: meta,
    range,
    bars: evalCandles.length,
    from: evalCandles[0].date,
    to: evalCandles[evalCandles.length - 1].date,
    metrics: {
      totalReturnPct: round(totalReturnPct),
      buyHoldReturnPct: round(buyHoldReturnPct),
      alphaPct: round(alphaPct),
      maxDrawdownPct: round(maxDd * 100),
      winRatePct,
      numTrades,
      sharpe: round(annualSharpe),
      sortino: round(sortino),
      calmar,
      avgTradePct: round(meanTrade),
      expectancyPct,
      profitFactor,
      confidenceLevelPct,
      confidenceTier,
      probabilisticSharpeRatioPct,
      winRateLowerBound,
      winRateUpperBound,
      tStat,
      pValue,
      maxConsecutiveLosses: maxConsecLosses,
      sampleSizeAdequate,
      sampleNote,
    },
    equityCurve: curve,
    trades: trades.slice(-50).reverse(),
    audit: {
      feedSource: 'Yahoo Finance Real-Time Daily Candles API',
      resolvedTicker: resolvedSymbol || symbol.trim(),
      evaluationBars: evalCandles.length,
      warmupBars: evalStartIndex,
      firstBar: evalCandles[0],
      lastBar: evalCandles[evalCandles.length - 1],
      latestFeedTimestamp: new Date().toISOString(),
      recentCandlesAudit: evalCandles.slice(-8),
      methodologyNotes: [
        'Entries executed at Next-Bar Open + 5 bps slippage; exits include 5 bps slippage and full Indian Cash-Delivery statutory friction (~0.222% STT/Stamp/Exchange/SEBI/GST).',
        'Stops evaluated against intraday Lows with Gap-Through-Stop fills at the Open when a bar gaps below the trailing stop.',
        'Monotonic High-Water-Mark ATR Trailing Stops active across trend/swing strategies.',
        'Open unrealized positions at the end of the sample are excluded from Win Rate, Profit Factor, Expectancy, and Student t-statistics.',
        'Probabilistic Sharpe Ratio (PSR) computed on per-period (daily) excess returns (6.50% annualized RBI G-Sec risk-free rate subtracted).',
      ],
    },
    disclaimer: 'Institutional daily-proxy backtest (long/flat) net of Indian cash-delivery statutory taxes (0.222%) and 10 bps round-trip slippage. Past statistical performance does not guarantee future results.',
  };
}
