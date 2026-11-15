import type { Candle } from '../src/types';
import { DELIVERY_COSTS_DEFAULT } from '../src/costs';
import { DEFAULT_PARAMS, type Params52W } from '../src/strategy52w';
import type { BtConfig } from '../src/portfolio';
import type { LedgerState } from '../src/ledger';

export const P: Params52W = { ...DEFAULT_PARAMS, lookback: 60, minAvgTurnoverInr: 0, minPrice: 0 };
export const CFG: BtConfig = {
  startingCapital: 1_000_000,
  riskPerTradePct: 0.5,
  maxPositions: 5,
  maxPositionPct: 20,
  slippageBps: 10,
  haltDrawdownPct: 50,
  costs: DELIVERY_COSTS_DEFAULT,
  params: P,
};

export function dateAt(i: number, start = '2018-01-01') {
  const d = new Date(start + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + i);
  return d.toISOString().slice(0, 10);
}

export function build(closes: number[]): Candle[] {
  return closes.map((c, i) => {
    const o = i === 0 ? c : closes[i - 1];
    return { date: dateAt(i), open: o, high: Math.max(o, c) + 1, low: Math.min(o, c) - 1, close: c, volume: 1e6 };
  });
}

export function cyclePath(): number[] {
  const p: number[] = [];
  for (let i = 0; i < 60; i++) p.push(100);
  for (let i = 1; i <= 30; i++) p.push(100 - (20 * i) / 30);
  for (let i = 0; i < 10; i++) p.push(80);
  for (let i = 1; i <= 20; i++) p.push(80 + (8 * i) / 20);
  for (let i = 1; i <= 20; i++) p.push(88 + (12 * i) / 20);
  return p;
}

/** Entry on bar 101, gap-down through the stop on bar 140. */
export function scenario(): Candle[] {
  const c = build([...cyclePath(), ...new Array(30).fill(70)]);
  c[140] = { ...c[140], open: 72, high: 73, low: 69, close: 70 };
  return c;
}

export function snap(s: LedgerState) {
  return JSON.parse(
    JSON.stringify({
      cash: s.cash,
      equity: s.equity,
      peak: s.peak,
      lastClosedDate: s.lastClosedDate,
      lastDayReturnPct: s.lastDayReturnPct,
      pos: [...s.pos.entries()],
      pending: s.pending,
      trades: s.trades,
      curve: s.curve,
      skipped: s.skipped,
      killSwitch: s.killSwitch,
    }),
  );
}
