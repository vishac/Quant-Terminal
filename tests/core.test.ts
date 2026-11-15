import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Candle } from '../src/types';
import { entryCost, exitCost, DELIVERY_COSTS_DEFAULT } from '../src/costs';
import { sizeLong } from '../src/sizing';
import { sma, rollingLow } from '../src/indicators';
import { computeFeatures, isSignal, DEFAULT_PARAMS, type Params52W } from '../src/strategy52w';
import { runBacktest, type BtConfig } from '../src/portfolio';
import { summarize, bootstrapMean } from '../src/stats';
import { parseUpstoxCandles, flagSuspectJumps } from '../src/upstox';
import { walkForward } from '../src/walkforward';

const P: Params52W = { ...DEFAULT_PARAMS, lookback: 60, minAvgTurnoverInr: 0, minPrice: 0 };
const CFG: BtConfig = {
  startingCapital: 1_000_000,
  riskPerTradePct: 0.5,
  maxPositions: 5,
  maxPositionPct: 20,
  slippageBps: 10,
  haltDrawdownPct: 50,
  costs: DELIVERY_COSTS_DEFAULT,
  params: P,
};

function dateAt(i: number, start = '2018-01-01') {
  const d = new Date(start + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + i);
  return d.toISOString().slice(0, 10);
}

/** closes -> candles with open = previous close, +/-1 wicks. */
function build(closes: number[], startOffset = 0): Candle[] {
  return closes.map((c, i) => {
    const o = i === 0 ? c : closes[i - 1];
    return { date: dateAt(i + startOffset), open: o, high: Math.max(o, c) + 1, low: Math.min(o, c) - 1, close: c, volume: 1e6 };
  });
}

/** 140 bars: flat, slide to a low, base, recover. Then 20 bars after a gap-down is added by the caller. */
function cyclePath(): number[] {
  const p: number[] = [];
  for (let i = 0; i < 60; i++) p.push(100);
  for (let i = 1; i <= 30; i++) p.push(100 - (20 * i) / 30); // 60..89 -> 80
  for (let i = 0; i < 10; i++) p.push(80); // 90..99
  for (let i = 1; i <= 20; i++) p.push(80 + (8 * i) / 20); // 100..119 -> 88
  for (let i = 1; i <= 20; i++) p.push(88 + (12 * i) / 20); // 120..139 -> 100
  return p;
}

function scenario(): Candle[] {
  const closes = [...cyclePath(), ...new Array(30).fill(70)];
  const c = build(closes);
  c[140] = { ...c[140], open: 72, high: 73, low: 69, close: 70 }; // gap through any stop
  return c;
}

test('costs match hand calculation', () => {
  const e = entryCost(100000, DELIVERY_COSTS_DEFAULT);
  const x = exitCost(100000, DELIVERY_COSTS_DEFAULT);
  assert.ok(Math.abs(e.total - 142.2226) < 1e-4, `entry ${e.total}`);
  assert.ok(Math.abs(x.total - 143.1526) < 1e-4, `exit ${x.total}`);
});

test('sizing never forces a minimum position', () => {
  const fn = (v: number) => entryCost(v, DELIVERY_COSTS_DEFAULT).total;
  const tooBig = sizeLong({ equity: 100000, cash: 100000, fill: 1000, stopDist: 600, riskPct: 0.5, maxPositionPct: 20, entryCostFn: fn });
  assert.equal(tooBig.qty, 0);
  assert.equal(tooBig.reason, 'risk_budget_below_one_share');
  const ok = sizeLong({ equity: 1e6, cash: 1e6, fill: 100, stopDist: 5, riskPct: 0.5, maxPositionPct: 20, entryCostFn: fn });
  assert.equal(ok.qty, 1000);
  const cashLimited = sizeLong({ equity: 1e6, cash: 50_000, fill: 100, stopDist: 5, riskPct: 0.5, maxPositionPct: 20, entryCostFn: fn });
  assert.ok(cashLimited.qty * 100 + fn(cashLimited.qty * 100) <= 50_000);
});

test('indicators', () => {
  const s = sma([1, 2, 3, 4], 2);
  assert.ok(Number.isNaN(s[0]));
  assert.deepEqual(s.slice(1), [1.5, 2.5, 3.5]);
  const c = build([10, 9, 8, 8, 8, 9]);
  const r = rollingLow(c, 5);
  assert.equal(r.low[4], 7); // min(low) where low = min(o,c)-1 => 7 at bar 2
  assert.equal(r.barsSince[4], 2); // earliest bar at the low, 2 bars before i=4
});

test('no lookahead: every entry is preceded by a signal on the prior bar', () => {
  const data = { AAA: scenario() };
  const res = runBacktest(data, CFG);
  assert.ok(res.trades.length >= 1, 'scenario should produce a trade');
  const f = computeFeatures(data.AAA, P);
  for (const t of res.trades) {
    const idx = data.AAA.findIndex((c) => c.date === t.entryDate);
    assert.ok(idx > 0);
    assert.ok(isSignal(data.AAA, f, idx - 1, P).ok, `no signal before entry on ${t.entryDate}`);
    assert.ok(Math.abs(t.entryFill - data.AAA[idx].open * 1.001) < 1e-9, 'entry must fill at next open + slippage');
  }
});

test('gap through stop fills at the open, not the stop', () => {
  const data = { AAA: scenario() };
  const res = runBacktest(data, CFG);
  const g = res.trades.find((t) => t.exitReason === 'stop_gap');
  assert.ok(g, 'expected a gap-stop exit');
  assert.ok(Math.abs(g!.exitFill - 72 * 0.999) < 1e-9);
  assert.ok(g!.netPnl < 0);
});

test('P&L reconciles: end equity = start + sum of net P&L when flat', () => {
  const res = runBacktest({ AAA: scenario() }, CFG);
  assert.equal(res.openPositions.length, 0);
  const end = res.equity[res.equity.length - 1].equity;
  const sum = res.trades.reduce((a, t) => a + t.netPnl, 0);
  assert.ok(Math.abs(end - (CFG.startingCapital + sum)) < 1e-6, `${end} vs ${CFG.startingCapital + sum}`);
  for (const t of res.trades) assert.ok(Math.abs(t.grossPnl - t.costs - t.netPnl) < 1e-9);
});

test('open positions are reported separately, not counted as closed trades', () => {
  const data = { AAA: scenario() };
  const res = runBacktest(data, { ...CFG, endDate: data.AAA[130].date });
  assert.equal(res.trades.length, 0);
  assert.equal(res.openPositions.length, 1);
  const s = summarize(res, 0.065);
  assert.equal(s.closedTrades, 0);
  assert.equal(s.openTrades, 1);
});

test('bootstrap is reproducible and sensible', () => {
  const v = [1, 2, -1, 0.5, 1.5, -0.5, 2, 1];
  assert.deepEqual(bootstrapMean(v, 2000, 7), bootstrapMean(v, 2000, 7));
  const b = bootstrapMean(v, 2000, 7);
  assert.ok(b.lower < b.upper);
  assert.ok(b.pLE0 < 0.1);
});

test('Upstox parsing: newest-first input becomes ascending, bad rows dropped, jumps flagged', () => {
  const j = {
    data: {
      candles: [
        ['2025-01-03T00:00:00+05:30', 100, 105, 99, 50, 10, 0],
        ['2025-01-02T00:00:00+05:30', 98, 101, 97, 100, 10, 0],
        ['2025-01-01T00:00:00+05:30', 0, 0, 0, 0, 0, 0],
      ],
    },
  };
  const c = parseUpstoxCandles(j);
  assert.deepEqual(c.map((x) => x.date), ['2025-01-02', '2025-01-03']);
  assert.deepEqual(flagSuspectJumps(c), ['2025-01-03']);
});

test('walk-forward: test trades fall inside test windows and params come from the grid', () => {
  // ~7 years of repeating cycles on two symbols
  const cycle = [...cyclePath(), ...new Array(30).fill(70)];
  const closes: number[] = [];
  while (closes.length < 2600) {
    // rescale each cycle back to ~100 so signals recur
    cycle.forEach((c) => closes.push(c));
  }
  const data = { AAA: build(closes), BBB: build(closes.map((x) => x * 1.01)) };
  const grid = [{ maxDistPct: 8 }, { maxDistPct: 12 }];
  const wf = walkForward(data, { base: CFG, grid, trainYears: 3, testYears: 1, minTrainTrades: 1, riskFreeAnnual: 0.065 });
  assert.ok(wf.windows.length >= 2);
  for (const w of wf.windows) {
    assert.ok(w.testStart > w.trainStart);
    assert.ok(grid.some((g) => g.maxDistPct === w.chosen.maxDistPct));
    for (const t of w.testTrades) assert.ok(t.entryDate >= w.testStart && t.entryDate <= w.testEnd);
  }
});
