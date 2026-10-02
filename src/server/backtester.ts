// Backtesting Harness (Phase 2 foundation).
// Validates each of the five agents as a DEFINED-RISK, rules-based strategy
// against REAL historical data (free Yahoo daily candles).
//
// HONEST SCOPE: this backtests the UNDERLYING daily candles (an equity/index
// proxy), long/flat, NOT option-level P&L. It exists to prove or reject an edge
// before any capital is risked. Intraday + option-level backtesting needs a
// licensed historical feed (Phase 2 data item).

export interface Candle { date: string; open: number; high: number; low: number; close: number; }

export interface StrategyMeta { id: string; agent: string; name: string; rule: string; }

export const AVAILABLE_STRATEGIES: StrategyMeta[] = [
  { id: 'chanakya', agent: 'Chanakya', name: 'Bollinger Mean-Reversion', rule: 'Long when close < lower band (20, 2σ); exit when close ≥ 20-SMA.' },
  { id: 'bhishma', agent: 'Bhishma', name: 'Trend MA Crossover', rule: 'Long when 20-SMA > 50-SMA; flat otherwise.' },
  { id: 'arjuna', agent: 'Arjuna', name: 'Donchian Breakout Momentum', rule: 'Long on 20-day high breakout; exit on 10-day low.' },
  { id: 'kuber', agent: 'Kuber', name: 'RSI Swing', rule: 'Long when RSI(14) < 35; exit when RSI(14) > 65.' },
  { id: 'vidura', agent: 'Vidura', name: 'Defensive Regime Filter', rule: 'Long only when close > 200-SMA AND 20-SMA > 50-SMA; flat in risk-off.' },
];

const RANGE_MAP: Record<string, string> = { '6mo': '6mo', '1y': '1y', '2y': '2y', '5y': '5y' };

export async function fetchHistoricalDaily(symbol: string, range = '1y'): Promise<Candle[]> {
  const r = RANGE_MAP[range] || '1y';
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=${r}`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' },
  });
  if (!res.ok) throw new Error(`Historical data unavailable for ${symbol} (HTTP ${res.status}).`);
  const data: any = await res.json();
  const result = data?.chart?.result?.[0];
  if (!result) throw new Error(`No historical data returned for ${symbol}.`);
  const ts: number[] = result.timestamp || [];
  const q = result.indicators?.quote?.[0] || {};
  const candles: Candle[] = [];
  for (let i = 0; i < ts.length; i++) {
    const o = q.open?.[i], h = q.high?.[i], l = q.low?.[i], c = q.close?.[i];
    if ([o, h, l, c].every((x) => typeof x === 'number' && !isNaN(x))) {
      candles.push({ date: new Date(ts[i] * 1000).toISOString().split('T')[0], open: o, high: h, low: l, close: c });
    }
  }
  if (candles.length < 60) throw new Error(`Insufficient history for ${symbol} (${candles.length} bars).`);
  return candles;
}

function sma(values: number[], period: number, i: number): number | null {
  if (i < period - 1) return null;
  let s = 0;
  for (let k = i - period + 1; k <= i; k++) s += values[k];
  return s / period;
}

function stddev(values: number[], period: number, i: number, mean: number): number | null {
  if (i < period - 1) return null;
  let s = 0;
  for (let k = i - period + 1; k <= i; k++) s += (values[k] - mean) ** 2;
  return Math.sqrt(s / period);
}

function rsi(closes: number[], period: number, i: number): number | null {
  if (i < period) return null;
  let gain = 0, loss = 0;
  for (let k = i - period + 1; k <= i; k++) {
    const diff = closes[k] - closes[k - 1];
    if (diff >= 0) gain += diff; else loss -= diff;
  }
  const avgGain = gain / period, avgLoss = loss / period;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

// Returns a long/flat position array (1 or 0) for each bar.
function buildPositions(strategy: string, candles: Candle[]): number[] {
  const closes = candles.map((c) => c.close);
  const highs = candles.map((c) => c.high);
  const lows = candles.map((c) => c.low);
  const n = candles.length;
  const pos = new Array(n).fill(0);
  let inPos = 0;

  for (let i = 0; i < n; i++) {
    switch (strategy) {
      case 'chanakya': {
        const mid = sma(closes, 20, i);
        if (mid != null) {
          const sd = stddev(closes, 20, i, mid)!;
          const lower = mid - 2 * sd;
          if (inPos === 0 && closes[i] < lower) inPos = 1;
          else if (inPos === 1 && closes[i] >= mid) inPos = 0;
        }
        break;
      }
      case 'bhishma': {
        const f = sma(closes, 20, i), s = sma(closes, 50, i);
        if (f != null && s != null) inPos = f > s ? 1 : 0;
        break;
      }
      case 'arjuna': {
        if (i >= 20) {
          const hh = Math.max(...highs.slice(i - 20, i));
          const ll = Math.min(...lows.slice(i - 10, i));
          if (inPos === 0 && closes[i] > hh) inPos = 1;
          else if (inPos === 1 && closes[i] < ll) inPos = 0;
        }
        break;
      }
      case 'kuber': {
        const r = rsi(closes, 14, i);
        if (r != null) {
          if (inPos === 0 && r < 35) inPos = 1;
          else if (inPos === 1 && r > 65) inPos = 0;
        }
        break;
      }
      case 'vidura': {
        const s200 = sma(closes, 200, i), f = sma(closes, 20, i), s = sma(closes, 50, i);
        if (s200 != null && f != null && s != null) inPos = (closes[i] > s200 && f > s) ? 1 : 0;
        break;
      }
      default:
        throw new Error(`Unknown strategy '${strategy}'.`);
    }
    pos[i] = inPos;
  }
  return pos;
}

export interface BacktestResult {
  symbol: string;
  strategy: StrategyMeta;
  range: string;
  bars: number;
  from: string;
  to: string;
  metrics: {
    totalReturnPct: number;
    buyHoldReturnPct: number;
    maxDrawdownPct: number;
    winRatePct: number;
    numTrades: number;
    sharpe: number;
    avgTradePct: number;
  };
  equityCurve: Array<{ date: string; strategy: number; buyHold: number }>;
  trades: Array<{ entryDate: string; exitDate: string; entryPrice: number; exitPrice: number; returnPct: number; bars: number }>;
  disclaimer: string;
}

export async function runBacktest(symbol: string, strategyId: string, range = '1y'): Promise<BacktestResult> {
  if (!symbol || typeof symbol !== 'string') throw new Error('symbol is required.');
  const meta = AVAILABLE_STRATEGIES.find((s) => s.id === strategyId);
  if (!meta) throw new Error(`strategy must be one of: ${AVAILABLE_STRATEGIES.map((s) => s.id).join(', ')}`);

  const candles = await fetchHistoricalDaily(symbol.trim(), range);
  const pos = buildPositions(strategyId, candles);
  const closes = candles.map((c) => c.close);

  let equity = 100, buyHold = 100;
  const curve: BacktestResult['equityCurve'] = [];
  const dailyReturns: number[] = [];
  const bh0 = closes[0];

  for (let i = 1; i < candles.length; i++) {
    const dayRet = (closes[i] - closes[i - 1]) / closes[i - 1];
    const stratRet = pos[i - 1] === 1 ? dayRet : 0; // enter next bar after signal
    equity *= 1 + stratRet;
    buyHold = 100 * (closes[i] / bh0);
    dailyReturns.push(stratRet);
    curve.push({ date: candles[i].date, strategy: Math.round(equity * 100) / 100, buyHold: Math.round(buyHold * 100) / 100 });
  }

  // Extract trades from position transitions
  const trades: BacktestResult['trades'] = [];
  let entryIdx: number | null = null;
  for (let i = 1; i < pos.length; i++) {
    if (pos[i - 1] === 0 && pos[i] === 1) entryIdx = i;
    if (pos[i - 1] === 1 && pos[i] === 0 && entryIdx != null) {
      const ep = closes[entryIdx], xp = closes[i];
      trades.push({ entryDate: candles[entryIdx].date, exitDate: candles[i].date, entryPrice: Math.round(ep * 100) / 100, exitPrice: Math.round(xp * 100) / 100, returnPct: Math.round(((xp - ep) / ep) * 10000) / 100, bars: i - entryIdx });
      entryIdx = null;
    }
  }
  if (entryIdx != null) {
    const ep = closes[entryIdx], xp = closes[closes.length - 1];
    trades.push({ entryDate: candles[entryIdx].date, exitDate: candles[candles.length - 1].date + ' (open)', entryPrice: Math.round(ep * 100) / 100, exitPrice: Math.round(xp * 100) / 100, returnPct: Math.round(((xp - ep) / ep) * 10000) / 100, bars: closes.length - 1 - entryIdx });
  }

  // Metrics
  let peak = 100, maxDd = 0;
  for (const pt of curve) { if (pt.strategy > peak) peak = pt.strategy; const dd = (peak - pt.strategy) / peak; if (dd > maxDd) maxDd = dd; }
  const wins = trades.filter((t) => t.returnPct > 0).length;
  const mean = dailyReturns.reduce((s, r) => s + r, 0) / (dailyReturns.length || 1);
  const variance = dailyReturns.reduce((s, r) => s + (r - mean) ** 2, 0) / (dailyReturns.length || 1);
  const sd = Math.sqrt(variance);
  const sharpe = sd > 0 ? (mean / sd) * Math.sqrt(252) : 0;

  const round = (n: number, p = 2) => Math.round(n * Math.pow(10, p)) / Math.pow(10, p);

  return {
    symbol: symbol.trim(),
    strategy: meta,
    range,
    bars: candles.length,
    from: candles[0].date,
    to: candles[candles.length - 1].date,
    metrics: {
      totalReturnPct: round(equity - 100),
      buyHoldReturnPct: round(buyHold - 100),
      maxDrawdownPct: round(maxDd * 100),
      winRatePct: trades.length ? round((wins / trades.length) * 100) : 0,
      numTrades: trades.length,
      sharpe: round(sharpe),
      avgTradePct: trades.length ? round(trades.reduce((s, t) => s + t.returnPct, 0) / trades.length) : 0,
    },
    equityCurve: curve,
    trades: trades.slice(-30).reverse(),
    disclaimer: 'Underlying daily-candle proxy backtest (long/flat), not option-level P&L. No costs/slippage/taxes modelled. Past performance does not guarantee future results.',
  };
}
