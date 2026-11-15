import type { Candle } from './types';
import { atr, rollingLow, sma } from './indicators';

/**
 * 52-week-low accumulation, LONG-ONLY, cash delivery.
 * Every default below is an UNVALIDATED starting hypothesis, not a finding.
 * Validate with walk-forward (walkforward.ts) before trusting any number.
 */
export interface Params52W {
  lookback: number; // bars in the "52-week" window
  maxDistPct: number; // close must be within this % above the window low
  minBarsSinceLow: number; // the low must be at least this many bars old (not still falling)
  confirmSmaLen: number; // close must be above this SMA (reversal confirmation)
  atrLen: number;
  stopAtr: number; // initial stop = fill - stopAtr * ATR(signal bar)
  trailAtr: number; // chandelier: highest close - trailAtr * ATR(current bar); only moves up
  maxHoldBars: number; // time stop, exit at next open
  minPrice: number;
  minAvgTurnoverInr: number; // 20-bar mean of close*volume
}

export const DEFAULT_PARAMS: Params52W = {
  lookback: 252,
  maxDistPct: 12,
  minBarsSinceLow: 5,
  confirmSmaLen: 10,
  atrLen: 14,
  stopAtr: 2,
  trailAtr: 3,
  maxHoldBars: 60,
  minPrice: 50,
  minAvgTurnoverInr: 50_000_000,
};

export interface Features {
  low52: number[];
  barsSinceLow: number[];
  confirmSma: number[];
  atr: number[];
  avgTurnover: number[];
}

export function computeFeatures(c: Candle[], p: Params52W): Features {
  const { low, barsSince } = rollingLow(c, p.lookback);
  return {
    low52: low,
    barsSinceLow: barsSince,
    confirmSma: sma(c.map((x) => x.close), p.confirmSmaLen),
    atr: atr(c, p.atrLen),
    avgTurnover: sma(c.map((x) => x.close * x.volume), 20),
  };
}

export interface SignalCheck {
  dataOk: boolean; // false while any indicator still lacks history
  dist: number; // % above the window low
  checks: { dist: boolean; barsSinceLow: boolean; confirm: boolean; minPrice: boolean; liquidity: boolean };
  ok: boolean;
}

/** Per-rule result at the CLOSE of bar i using data <= i only. Execution happens at the next open. */
export function checkSignal(c: Candle[], f: Features, i: number, p: Params52W): SignalCheck {
  const close = c[i].close;
  const low = f.low52[i];
  const none = { dist: false, barsSinceLow: false, confirm: false, minPrice: false, liquidity: false };
  if (![low, f.atr[i], f.confirmSma[i], f.avgTurnover[i]].every(Number.isFinite)) {
    return { dataOk: false, dist: NaN, checks: none, ok: false };
  }
  const dist = ((close - low) / low) * 100;
  const checks = {
    dist: dist <= p.maxDistPct,
    barsSinceLow: f.barsSinceLow[i] >= p.minBarsSinceLow,
    confirm: close > f.confirmSma[i],
    minPrice: close >= p.minPrice,
    liquidity: f.avgTurnover[i] >= p.minAvgTurnoverInr,
  };
  return { dataOk: true, dist, checks, ok: Object.values(checks).every(Boolean) };
}

export function isSignal(c: Candle[], f: Features, i: number, p: Params52W): { ok: boolean; dist: number } {
  const r = checkSignal(c, f, i, p);
  return { ok: r.ok, dist: r.dist };
}
