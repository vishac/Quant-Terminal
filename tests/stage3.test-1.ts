import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Engine, makeView } from '../src/engine';
import { Ledger, MemoryStore } from '../src/ledger';
import { checkSignal, computeFeatures } from '../src/strategy52w';
import { accountFromLedger, freshAccount, scan } from '../src/finder';
import { fetchQuotes, liveCheckAll, parseQuotes, type Quote } from '../src/livecheck';
import { CFG, P, scenario } from './helpers';

const SIG = 98; // signal bar in scenario(); entry fills on bar 99
const three = () => ({ AAA: scenario(), BBB: scenario(), CCC: scenario() });

test('scan matches what the engine does next open (parity incl. slot limit)', () => {
  const cfg = { ...CFG, maxPositions: 2 };
  const data = three();
  const view = makeView(data, cfg.params);
  const dates = view.dates();
  const L = new Ledger(new MemoryStore(), () => 't');
  const eng = new Engine(cfg, L);
  for (const d of dates.slice(0, SIG + 1)) eng.processDay(d, view);
  const r = scan(data, cfg, accountFromLedger(L.state), dates[SIG]);
  assert.deepEqual(r.candidates.map((c) => c.symbol), ['AAA', 'BBB', 'CCC']);
  assert.deepEqual(r.candidates.filter((c) => c.wouldEnter).map((c) => c.symbol), ['AAA', 'BBB']);
  assert.ok(r.candidates[2].gate.codes.includes('max_positions'));
  eng.processDay(dates[SIG + 1], view);
  assert.deepEqual([...L.state.pos.keys()].sort(), ['AAA', 'BBB']);
  assert.equal(L.state.skipped['max_positions'], 1);
});

test('scan reports stale and insufficient-history symbols, excludes held', () => {
  const data = { ...three(), OLD: scenario().slice(0, 50), NEW: scenario().slice(80, 90) };
  const view = makeView(data, CFG.params);
  const asOf = view.dates()[SIG];
  const acct = { ...freshAccount(CFG.startingCapital), openSymbols: ['BBB'] };
  const r = scan(data, CFG, acct, asOf);
  assert.ok(r.staleSymbols.some((s) => s.symbol === 'OLD'));
  assert.ok(!r.candidates.some((c) => c.symbol === 'BBB'));
  assert.deepEqual(r.held, ['BBB']);
});

test('kill switch makes every candidate not-wouldEnter', () => {
  const data = three();
  const r = scan(data, CFG, { ...freshAccount(CFG.startingCapital), killSwitch: true }, makeView(data, CFG.params).dates()[SIG]);
  assert.ok(r.candidates.length > 0);
  assert.equal(r.counts.wouldEnter, 0);
  assert.ok(r.candidates.every((c) => c.gate.codes.includes('kill_switch')));
});

test('checkSignal isolates a single failing rule', () => {
  const c = scenario();
  const strict = { ...P, minAvgTurnoverInr: 1e12 };
  const chk = checkSignal(c, computeFeatures(c, strict), SIG, strict);
  assert.equal(chk.ok, false);
  assert.deepEqual(Object.entries(chk.checks).filter(([, v]) => !v).map(([k]) => k), ['liquidity']);
});

const fx = {
  data: {
    'NSE:AAA': {
      instrument_token: 'NSE_EQ|INE000A', symbol: 'AAA', last_price: 100.5, prev_close_price: 100,
      lower_circuit_limit: 90, upper_circuit_limit: 110, volume: 1000, timestamp: 't',
      depth: { buy: [{ price: 100.4, quantity: 5 }, { price: 0, quantity: 0 }, { price: 100.3, quantity: 9 }], sell: [{ price: 100.7, quantity: 0 }, { price: 100.6, quantity: 4 }, { price: 100.8, quantity: 3 }] },
    },
  },
};

test('parseQuotes: matches token, ignores zero-padded depth, best bid=max ask=min', () => {
  const [q] = parseQuotes(fx);
  assert.equal(q.instrumentKey, 'NSE_EQ|INE000A');
  assert.equal(q.bestBid, 100.4);
  assert.equal(q.bestAsk, 100.6);
  assert.throws(() => parseQuotes({}));
});

test('fetchQuotes: auth header, encoded keys, chunks at 500', async () => {
  const calls: { url: string; auth: string }[] = [];
  const fake = (async (url: any, init: any) => {
    calls.push({ url: String(url), auth: init.headers.Authorization });
    return { ok: true, json: async () => fx } as any;
  }) as unknown as typeof fetch;
  const keys = Array.from({ length: 501 }, (_, i) => `NSE_EQ|K${i}`);
  const out = await fetchQuotes(keys, 'TOK', fake);
  assert.equal(calls.length, 2);
  assert.equal(calls[0].auth, 'Bearer TOK');
  assert.ok(calls[0].url.includes('NSE_EQ%7CK0,NSE_EQ%7CK1'));
  assert.equal(calls[0].url.split(',').length, 500);
  assert.equal(out.length, 2);
  await assert.rejects(fetchQuotes(['x'], 't', (async () => ({ ok: false, status: 401 })) as any), /401/);
});

test('liveCheck: GO, gap-up, below stop, wide spread, no quote, gate fail, prev-close mismatch', () => {
  const data = { AAA: scenario() };
  const dates = makeView(data, CFG.params).dates();
  const acct = freshAccount(CFG.startingCapital);
  const [cand] = scan(data, CFG, acct, dates[SIG]).candidates;
  const base: Quote = { lastPrice: cand.close, prevClose: cand.close, bestBid: cand.close - 0.01, bestAsk: cand.close + 0.01, lowerCircuit: 0, upperCircuit: 0, volume: 1, timestamp: '' };
  const run = (q: Partial<Quote> | null, a = acct) => liveCheckAll([cand], new Map(q ? [['AAA', { ...base, ...q }]] : []), CFG, a)[0];
  assert.equal(run({}).status, 'GO');
  assert.ok(run({ lastPrice: cand.close + 2 * cand.atr }).flags.some((f) => f.startsWith('gap_up')));
  assert.equal(run({ lastPrice: cand.close + 2 * cand.atr }).status, 'CAUTION');
  assert.ok(run({ lastPrice: cand.plan!.refStop - 1 }).flags.includes('below_planned_stop_level'));
  assert.ok(run({ bestBid: cand.close * 0.98, bestAsk: cand.close * 1.02 }).flags.some((f) => f.startsWith('wide_spread')));
  assert.ok(run({ bestBid: 0, bestAsk: 0 }).flags.includes('no_depth'));
  assert.ok(run({ prevClose: cand.close * 1.05 }).flags.some((f) => f.startsWith('prev_close_mismatch')));
  assert.equal(run(null).status, 'NO_QUOTE');
  const skip = run({}, { ...acct, killSwitch: true });
  assert.equal(skip.status, 'SKIP');
  assert.ok(skip.gateCodes.includes('kill_switch'));
});
