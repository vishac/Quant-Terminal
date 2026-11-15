import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { evaluateEntry, type GateConfig, type GateInput } from '../src/riskgate';
import { Engine, makeView } from '../src/engine';
import { FileStore, Ledger, MemoryStore } from '../src/ledger';
import { runBacktest } from '../src/portfolio';
import { runPaper } from '../src/paper';
import { CFG, scenario, snap } from './helpers';

const GC: GateConfig = { maxPositions: 5, maxPositionPct: 20, maxRiskPct: 1, maxDailyLossPct: 1.5, haltDrawdownPct: 8 };
const OK: GateInput = {
  symbol: 'A', qty: 100, fill: 100, stop: 95, entryCost: 50, equity: 1e6, cash: 1e6, peak: 1e6,
  openCount: 0, hasPosition: false, lastDayReturnPct: 0, killSwitch: false,
};
const clock = () => 't';

function setup() {
  const data = { AAA: scenario() };
  const view = makeView(data, CFG.params);
  return { data, view, dates: view.dates() };
}

test('risk gate: valid order passes and each rule fires with its own code', () => {
  assert.equal(evaluateEntry(OK, GC).allowed, true);
  const code = (patch: Partial<GateInput>) => evaluateEntry({ ...OK, ...patch }, GC).codes;
  assert.equal(code({ killSwitch: true })[0], 'kill_switch');
  assert.ok(code({ stop: 100 }).includes('bad_order'));
  assert.ok(code({ qty: 1.5 }).includes('bad_order'));
  assert.ok(code({ qty: 2500 }).includes('risk_cap'));
  assert.ok(code({ qty: 2500 }).includes('position_cap'));
  assert.ok(code({ cash: 5000 }).includes('cash'));
  assert.ok(code({ openCount: 5 }).includes('max_positions'));
  assert.ok(code({ hasPosition: true }).includes('duplicate_position'));
  assert.ok(code({ lastDayReturnPct: -1.5 }).includes('daily_loss_cooldown'));
  assert.equal(code({ lastDayReturnPct: -1.49 }).length, 0);
  assert.ok(code({ peak: 1.1e6 }).includes('drawdown_halt'));
});

test('gate is an independent backstop: sizing above the hard cap is rejected', () => {
  const { data } = setup();
  const r = runBacktest(data, { ...CFG, riskPerTradePct: 2, maxRiskPct: 1 });
  assert.equal(r.trades.length, 0);
  assert.ok((r.skipped['risk_cap'] ?? 0) > 0);
});

test('replaying the ledger reproduces the live state exactly', () => {
  const { view, dates } = setup();
  const store = new MemoryStore();
  const live = new Ledger(store, clock);
  const eng = new Engine(CFG, live);
  for (const d of dates) eng.processDay(d, view);
  assert.ok(live.state.trades.length >= 1);
  const replayed = new Ledger(new MemoryStore(store.lines), clock);
  assert.deepEqual(snap(replayed.state), snap(live.state));
});

test('reprocessing a date is a no-op', () => {
  const { view, dates } = setup();
  const store = new MemoryStore();
  const eng = new Engine(CFG, new Ledger(store, clock));
  for (const d of dates) eng.processDay(d, view);
  const n = store.lines.length;
  assert.equal(eng.processDay(dates[dates.length - 1], view), null);
  assert.equal(eng.processDay(dates[10], view), null);
  assert.equal(store.lines.length, n);
});

test('stop and restart on a real file gives the same result as one uninterrupted backtest', () => {
  const { data, view, dates } = setup();
  const path = join(mkdtempSync(join(tmpdir(), 'qt-')), 'ledger.jsonl');
  const k = 110; // restart while a position is open
  const a = new Engine(CFG, new Ledger(new FileStore(path), clock));
  dates.slice(0, k).forEach((d) => a.processDay(d, view));
  const ledgerB = new Ledger(new FileStore(path), clock); // fresh process
  assert.equal(ledgerB.state.pos.size, 1);
  const b = new Engine(CFG, ledgerB);
  dates.slice(k).forEach((d) => b.processDay(d, view));
  const bt = runBacktest(data, CFG);
  assert.deepEqual(ledgerB.state.trades, bt.trades);
  assert.deepEqual(ledgerB.state.curve, bt.equity);
});

test('crash recovery: dropping the last 1 or 2 events of a day and rerunning it changes nothing', () => {
  const { view, dates } = setup();
  const probe = new MemoryStore();
  const pe = new Engine(CFG, new Ledger(probe, clock));
  for (const d of dates) pe.processDay(d, view);
  const fillDate = JSON.parse(probe.lines.find((l) => l.includes('"ENTRY_FILLED"'))!).date as string;
  const m = dates.indexOf(fillDate);

  for (const drop of [1, 2]) {
    const store = new MemoryStore();
    const e = new Engine(CFG, new Ledger(store, clock));
    dates.slice(0, m + 1).forEach((d) => e.processDay(d, view));
    const expected = snap(new Ledger(new MemoryStore(store.lines), clock).state);
    store.lines.splice(store.lines.length - drop, drop); // simulate crash before those events were written
    const recovered = new Ledger(store, clock);
    new Engine(CFG, recovered).processDay(fillDate, view);
    assert.deepEqual(snap(recovered.state), expected, `drop=${drop}`);
    assert.equal(recovered.state.pos.size, 1, 'no double fill');
  }
});

test('ledger integrity: truncated tail is repaired, mid-file corruption and unknown events are refused', () => {
  const { view, dates } = setup();
  const store = new MemoryStore();
  const e = new Engine(CFG, new Ledger(store, clock));
  dates.slice(0, 5).forEach((d) => e.processDay(d, view));
  const good = [...store.lines];

  const trunc = new MemoryStore([...good, '{"ts":"t","type":"DAY_CL']);
  const l = new Ledger(trunc, clock);
  assert.equal(l.droppedTrailingLines, 1);
  assert.equal(trunc.lines.length, good.length, 'bad tail removed from the store');

  const mid = [...good];
  mid.splice(3, 0, 'not json');
  assert.throws(() => new Ledger(new MemoryStore(mid), clock), /corrupt/);

  assert.throws(() => new Ledger(new MemoryStore([...good, JSON.stringify({ ts: 't', type: 'NOPE' })]), clock), /Unknown ledger event/);
  assert.throws(() => new Engine({ ...CFG, startingCapital: 5 }, new Ledger(new MemoryStore(good), clock)), /Refusing to mix/);
});

test('file store survives a truncated final line on disk', () => {
  const { view, dates } = setup();
  const path = join(mkdtempSync(join(tmpdir(), 'qt-')), 'ledger.jsonl');
  const e = new Engine(CFG, new Ledger(new FileStore(path), clock));
  dates.slice(0, 5).forEach((d) => e.processDay(d, view));
  writeFileSync(path, readFileSync(path, 'utf8') + '{"ts":"t","type":"DAY_CL');
  const l = new Ledger(new FileStore(path), clock);
  assert.equal(l.droppedTrailingLines, 1);
  const again = new Ledger(new FileStore(path), clock); // file was repaired, loads clean
  assert.equal(again.droppedTrailingLines, 0);
  assert.deepEqual(snap(again.state), snap(l.state));
});

test('kill switch blocks new entries but never blocks exits', () => {
  const { view, dates } = setup();
  const blocked = new Ledger(null, clock);
  const e1 = new Engine(CFG, blocked);
  dates.slice(0, 99).forEach((d) => e1.processDay(d, view)); // signal forms on bar 98, entry would fill on bar 99
  assert.equal(blocked.state.pending.length, 1);
  blocked.emit({ type: 'KILL_SWITCH', active: true, reason: 'test' });
  e1.processDay(dates[99], view);
  assert.equal(blocked.state.pos.size, 0);
  assert.equal(blocked.state.skipped['kill_switch'], 1);

  const holding = new Ledger(null, clock);
  const e2 = new Engine(CFG, holding);
  dates.slice(0, 131).forEach((d) => e2.processDay(d, view));
  assert.equal(holding.state.pos.size, 1);
  holding.emit({ type: 'KILL_SWITCH', active: true, reason: 'test' });
  dates.slice(131).forEach((d) => e2.processDay(d, view));
  assert.equal(holding.state.pos.size, 0);
  assert.equal(holding.state.trades[0].exitReason, 'stop_gap');
});

test('paper runner: fresh ledger starts at the latest bar; later runs catch up missing dates in order', () => {
  const { data, dates } = setup();
  const store = new MemoryStore();
  const first = runPaper(new Ledger(store, clock), { AAA: data.AAA.slice(0, 105) }, CFG);
  assert.equal(first.processed.length, 1);
  assert.equal(first.processed[0].date, dates[104]);
  const second = runPaper(new Ledger(store, clock), data, CFG);
  assert.equal(second.processed[0].date, dates[105]);
  assert.equal(second.processed.length, dates.length - 105);
  assert.equal(runPaper(new Ledger(store, clock), data, CFG).processed.length, 0);
});
