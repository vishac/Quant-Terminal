import type { Universe } from './types';
import { runBacktest, type BtConfig, type Trade } from './portfolio';
import { summarize, type Summary } from './stats';
import type { Params52W } from './strategy52w';

export interface WfConfig {
  base: BtConfig;
  grid: Partial<Params52W>[]; // every combination you are willing to try; its size is reported
  trainYears: number;
  testYears: number;
  minTrainTrades: number;
  riskFreeAnnual: number;
}

export interface WfWindow {
  trainStart: string;
  testStart: string;
  testEnd: string;
  chosen: Partial<Params52W>;
  trainExpectancyR: number;
  trainTrades: number;
  test: Summary;
  testTrades: Trade[];
}

const addYears = (d: string, y: number) => {
  const dt = new Date(d + 'T00:00:00Z');
  dt.setUTCFullYear(dt.getUTCFullYear() + y);
  return dt.toISOString().slice(0, 10);
};

/**
 * Rolling walk-forward: choose parameters on the train window only, then trade the NEXT window
 * with them untouched. Only the test windows are out-of-sample. Each window restarts at starting
 * capital, so windows are independent samples, not one compounded curve.
 */
export function walkForward(data: Universe, cfg: WfConfig) {
  const all = [...new Set(Object.values(data).flatMap((c) => c.map((x) => x.date)))].sort();
  const first = all[0];
  const last = all[all.length - 1];
  const windows: WfWindow[] = [];
  // The first usable train start needs lookback history; callers should supply enough prior bars.
  for (let ts = first; ; ts = addYears(ts, cfg.testYears)) {
    const testStart = addYears(ts, cfg.trainYears);
    const testEnd = addYears(testStart, cfg.testYears);
    if (testStart > last) break;
    const trainEnd = testStart;
    let best: { p: Partial<Params52W>; score: number; n: number } | null = null;
    for (const g of cfg.grid) {
      const conf: BtConfig = { ...cfg.base, params: { ...cfg.base.params, ...g }, startDate: ts, endDate: trainEnd };
      const r = runBacktest(data, conf);
      const n = r.trades.length;
      const score = n >= cfg.minTrainTrades ? summarize(r, cfg.riskFreeAnnual).expectancyR : -Infinity;
      if (!best || score > best.score) best = { p: g, score, n };
    }
    if (!best || best.score === -Infinity) continue; // not enough train evidence: do not trade this window
    const conf: BtConfig = { ...cfg.base, params: { ...cfg.base.params, ...best.p }, startDate: testStart, endDate: testEnd };
    const r = runBacktest(data, conf);
    windows.push({
      trainStart: ts,
      testStart,
      testEnd,
      chosen: best.p,
      trainExpectancyR: best.score,
      trainTrades: best.n,
      test: summarize(r, cfg.riskFreeAnnual),
      testTrades: r.trades,
    });
  }
  const oosTrades = windows.flatMap((w) => w.testTrades);
  return {
    windows,
    oosTrades,
    configsTried: cfg.grid.length,
    note: `Selected from ${cfg.grid.length} configs per window; more configs means more selection bias, so keep the grid small.`,
  };
}
