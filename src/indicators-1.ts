import type { Candle } from './types';

/** Simple moving average; NaN until the window is full. Uses only bars <= i. */
export function sma(v: number[], n: number): number[] {
  const out = new Array<number>(v.length).fill(NaN);
  let s = 0;
  for (let i = 0; i < v.length; i++) {
    s += v[i];
    if (i >= n) s -= v[i - n];
    if (i >= n - 1) out[i] = s / n;
  }
  return out;
}

/** Wilder ATR; NaN until n bars of true range exist. Uses only bars <= i. */
export function atr(c: Candle[], n: number): number[] {
  const out = new Array<number>(c.length).fill(NaN);
  if (c.length < n) return out;
  const tr: number[] = [c[0].high - c[0].low];
  for (let i = 1; i < c.length; i++) {
    const pc = c[i - 1].close;
    tr.push(Math.max(c[i].high - c[i].low, Math.abs(c[i].high - pc), Math.abs(c[i].low - pc)));
  }
  let s = 0;
  for (let i = 0; i < n; i++) s += tr[i];
  out[n - 1] = s / n;
  for (let i = n; i < c.length; i++) out[i] = (out[i - 1] * (n - 1) + tr[i]) / n;
  return out;
}

/**
 * Rolling n-bar low (window ends at i, inclusive) and how many bars ago the
 * EARLIEST bar at that low occurred. NaN until the window is full.
 */
export function rollingLow(c: Candle[], n: number): { low: number[]; barsSince: number[] } {
  const low = new Array<number>(c.length).fill(NaN);
  const barsSince = new Array<number>(c.length).fill(NaN);
  for (let i = n - 1; i < c.length; i++) {
    let m = Infinity;
    let at = i;
    for (let k = i - n + 1; k <= i; k++) {
      if (c[k].low < m) {
        m = c[k].low;
        at = k;
      }
    }
    low[i] = m;
    barsSince[i] = i - at;
  }
  return { low, barsSince };
}
