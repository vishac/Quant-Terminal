import type { BtResult } from './portfolio';

const mean = (v: number[]) => (v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0);
const sd = (v: number[]) => {
  if (v.length < 2) return 0;
  const m = mean(v);
  return Math.sqrt(v.reduce((a, b) => a + (b - m) ** 2, 0) / (v.length - 1));
};

/** Deterministic PRNG so bootstrap results are reproducible. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function wilson95(wins: number, n: number): { lower: number; upper: number } {
  if (n <= 0) return { lower: 0, upper: 100 };
  const z = 1.96;
  const p = wins / n;
  const den = 1 + (z * z) / n;
  const centre = (p + (z * z) / (2 * n)) / den;
  const half = (z * Math.sqrt((p * (1 - p) + (z * z) / (4 * n)) / n)) / den;
  return { lower: Math.max(0, (centre - half) * 100), upper: Math.min(100, (centre + half) * 100) };
}

/** Bootstrap the mean of per-trade R. pLE0 = share of resamples with mean <= 0 (one-sided). */
export function bootstrapMean(values: number[], iters = 5000, seed = 42) {
  if (values.length < 2) return { lower: NaN, upper: NaN, pLE0: NaN };
  const rnd = mulberry32(seed);
  const n = values.length;
  const means: number[] = [];
  let le0 = 0;
  for (let b = 0; b < iters; b++) {
    let s = 0;
    for (let k = 0; k < n; k++) s += values[Math.floor(rnd() * n)];
    const m = s / n;
    means.push(m);
    if (m <= 0) le0++;
  }
  means.sort((x, y) => x - y);
  return { lower: means[Math.floor(iters * 0.025)], upper: means[Math.floor(iters * 0.975)], pLE0: le0 / iters };
}

export interface Summary {
  startEquity: number;
  endEquity: number;
  totalReturnPct: number;
  cagrPct: number;
  annVolPct: number;
  sharpe: number; // excess over riskFreeAnnual, annualised from daily equity returns
  maxDrawdownPct: number;
  avgExposurePct: number;
  closedTrades: number;
  openTrades: number;
  winRatePct: number;
  winRateCI95: { lower: number; upper: number };
  profitFactor: number;
  avgNetReturnPct: number;
  expectancyR: number;
  expectancyRCI95: { lower: number; upper: number };
  pExpectancyLE0: number;
  totalCostsInr: number;
  skipped: Record<string, number>;
  caveats: string[];
}

/**
 * Closed trades only drive trade statistics; open positions are reported separately
 * (the old backtester counted unrealised positions as trades).
 * riskFreeAnnual is an ASSUMPTION you set; there is no built-in benchmark rate.
 */
export function summarize(res: BtResult, riskFreeAnnual: number, seed = 42): Summary {
  const eq = res.equity.map((e) => e.equity);
  const startEquity = eq[0] ?? 0;
  const endEquity = eq[eq.length - 1] ?? 0;
  const rets: number[] = [];
  for (let i = 1; i < eq.length; i++) rets.push(eq[i] / eq[i - 1] - 1);
  const years = rets.length / 252;
  const rfDaily = (1 + riskFreeAnnual) ** (1 / 252) - 1;
  const excess = rets.map((r) => r - rfDaily);
  const vol = sd(rets);
  let peak = -Infinity;
  let maxDd = 0;
  for (const e of eq) {
    peak = Math.max(peak, e);
    maxDd = Math.max(maxDd, (peak - e) / peak);
  }
  const t = res.trades;
  const wins = t.filter((x) => x.netPnl > 0);
  const losses = t.filter((x) => x.netPnl < 0);
  const gp = wins.reduce((a, x) => a + x.netPnl, 0);
  const gl = Math.abs(losses.reduce((a, x) => a + x.netPnl, 0));
  const rs = t.map((x) => x.rMultiple);
  const boot = bootstrapMean(rs, 5000, seed);
  const caveats: string[] = [];
  if (t.length < 30) caveats.push(`Only ${t.length} closed trades: statistics are not reliable.`);
  if (years < 3) caveats.push(`Only ${years.toFixed(1)} years of data: covers few market regimes.`);
  caveats.push('In-sample unless produced by walkforward.ts. Universe selection and data adjustment are not verified here.');
  return {
    startEquity,
    endEquity,
    totalReturnPct: startEquity ? (endEquity / startEquity - 1) * 100 : 0,
    cagrPct: years > 0 && startEquity ? ((endEquity / startEquity) ** (1 / years) - 1) * 100 : 0,
    annVolPct: vol * Math.sqrt(252) * 100,
    sharpe: vol > 0 ? (mean(excess) / vol) * Math.sqrt(252) : 0,
    maxDrawdownPct: maxDd * 100,
    avgExposurePct: mean(res.equity.map((e) => e.exposurePct)),
    closedTrades: t.length,
    openTrades: res.openPositions.length,
    winRatePct: t.length ? (wins.length / t.length) * 100 : 0,
    winRateCI95: wilson95(wins.length, t.length),
    profitFactor: gl > 0 ? gp / gl : gp > 0 ? Infinity : 0,
    avgNetReturnPct: mean(t.map((x) => x.netReturnPct)),
    expectancyR: mean(rs),
    expectancyRCI95: { lower: boot.lower, upper: boot.upper },
    pExpectancyLE0: boot.pLE0,
    totalCostsInr: t.reduce((a, x) => a + x.costs, 0),
    skipped: res.skipped,
    caveats,
  };
}
