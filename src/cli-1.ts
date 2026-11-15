import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fetchDaily, flagSuspectJumps } from './upstox';
import { DELIVERY_COSTS_DEFAULT } from './costs';
import { DEFAULT_PARAMS } from './strategy52w';
import { runBacktest, type BtConfig } from './portfolio';
import { summarize } from './stats';
import { walkForward } from './walkforward';
import { FileStore, Ledger } from './ledger';
import { runPaper } from './paper';
import { makeView } from './engine';
import { scan, accountFromLedger, freshAccount } from './finder';
import { fetchQuotes, liveCheckAll, type Quote } from './livecheck';
import type { Universe } from './types';

// universe.json: { "symbols": { "RELIANCE": "NSE_EQ|<ISIN>", ... } }  (fill instrument keys yourself)
const arg = (n: string, d?: string) => {
  const i = process.argv.indexOf('--' + n);
  return i > -1 ? process.argv[i + 1] : d;
};
const cmd = process.argv[2];
const DATA = 'data';

const baseCfg: BtConfig = {
  startingCapital: Number(arg('capital', '1000000')),
  riskPerTradePct: Number(arg('risk', '0.5')),
  maxPositions: 5,
  maxPositionPct: 20,
  slippageBps: Number(arg('slip', '10')),
  haltDrawdownPct: 8,
  costs: DELIVERY_COSTS_DEFAULT,
  params: DEFAULT_PARAMS,
};

function load(): Universe {
  const u: Universe = {};
  const syms = Object.keys(JSON.parse(readFileSync('universe.json', 'utf8')).symbols);
  for (const s of syms) if (existsSync(`${DATA}/${s}.json`)) u[s] = JSON.parse(readFileSync(`${DATA}/${s}.json`, 'utf8'));
  if (!Object.keys(u).length) throw new Error('No data found. Run: fetch');
  return u;
}

async function main() {
  if (cmd === 'fetch') {
    const token = process.env.UPSTOX_ANALYTICS_TOKEN;
    if (!token) throw new Error('Set UPSTOX_ANALYTICS_TOKEN in your environment (never commit it).');
    const from = arg('from', '2015-01-01')!;
    const to = arg('to', new Date().toISOString().slice(0, 10))!;
    mkdirSync(DATA, { recursive: true });
    const { symbols } = JSON.parse(readFileSync('universe.json', 'utf8'));
    for (const [sym, key] of Object.entries<string>(symbols)) {
      const c = await fetchDaily(key, from, to, token);
      writeFileSync(`${DATA}/${sym}.json`, JSON.stringify(c));
      const j = flagSuspectJumps(c);
      console.log(`${sym}: ${c.length} bars ${c[0]?.date}..${c[c.length - 1]?.date}` + (j.length ? `  CHECK adjustment, jumps on ${j.join(',')}` : ''));
      await new Promise((r) => setTimeout(r, 300));
    }
  } else if (cmd === 'backtest') {
    const r = runBacktest(load(), { ...baseCfg, startDate: arg('start'), endDate: arg('end') });
    console.log(JSON.stringify({ summary: summarize(r, Number(arg('rf', '0.065'))), open: r.openPositions }, null, 2));
  } else if (cmd === 'walkforward') {
    const grid = [8, 12, 15].flatMap((maxDistPct) => [2, 3].map((stopAtr) => ({ maxDistPct, stopAtr })));
    const w = walkForward(load(), { base: baseCfg, grid, trainYears: 3, testYears: 1, minTrainTrades: 20, riskFreeAnnual: Number(arg('rf', '0.065')) });
    console.log(JSON.stringify({ note: w.note, windows: w.windows.map((x) => ({ test: `${x.testStart}..${x.testEnd}`, chosen: x.chosen, trainExpR: x.trainExpectancyR, testTrades: x.test.closedTrades, testReturnPct: x.test.totalReturnPct, testExpR: x.test.expectancyR })), oosTrades: w.oosTrades.length }, null, 2));
  } else if (cmd === 'paper-run' || cmd === 'paper-status') {
    const ledger = new Ledger(new FileStore(arg('ledger', `${DATA}/ledger.jsonl`)!));
    const u = load();
    let note: string[] = [];
    if (cmd === 'paper-run') {
      const r = runPaper(ledger, u, baseCfg);
      const age = (Date.now() - Date.parse(r.latestBarDate)) / 864e5;
      if (age > 4) note.push(`STALE DATA: latest bar is ${r.latestBarDate}. Run fetch first.`);
      note.push(`Processed ${r.processed.length} day(s): ${r.processed.map((d) => d.date).join(', ') || 'none (already up to date)'}`);
    }
    if (ledger.droppedTrailingLines) note.push(`Repaired ${ledger.droppedTrailingLines} truncated ledger line(s).`);
    const s = ledger.state;
    const view = makeView(u, baseCfg.params);
    const last = s.lastClosedDate;
    console.log(
      JSON.stringify(
        {
          notes: note,
          asOf: last,
          equity: Math.round(s.equity),
          cash: Math.round(s.cash),
          killSwitch: s.killSwitch,
          openPositions: [...s.pos.values()].map((p) => ({
            symbol: p.symbol, qty: p.qty, entryFill: p.entryFill, stop: p.stop, mark: view.lastClose(p.symbol, last), barsHeld: p.barsHeld, exitAtNextOpen: p.exitAtNextOpen,
          })),
          plannedForNextOpen: s.pending.map((c) => ({ symbol: c.symbol, distFrom52wLowPct: +c.dist.toFixed(2), indicativeStopDistance: +(baseCfg.params.stopAtr * c.atr).toFixed(2) })),
          recentTrades: s.trades.slice(-10),
          skippedCounts: s.skipped,
        },
        null,
        2,
      ),
    );
  } else if (cmd === 'scan') {
    // Read-only: never writes the ledger and never places anything.
    const u = load();
    const lp = arg('ledger', `${DATA}/ledger.jsonl`)!;
    const account = existsSync(lp) ? accountFromLedger(new Ledger(new FileStore(lp)).state) : freshAccount(baseCfg.startingCapital);
    const res = scan(u, baseCfg, account, arg('asof'));
    let live: unknown = undefined;
    if (process.argv.includes('--live')) {
      const token = process.env.UPSTOX_ANALYTICS_TOKEN;
      if (!token) throw new Error('Set UPSTOX_ANALYTICS_TOKEN for --live.');
      const map: Record<string, string> = JSON.parse(readFileSync('universe.json', 'utf8')).symbols;
      const keyToSym = new Map(Object.entries(map).map(([s, k]) => [k, s]));
      const quotes = await fetchQuotes(res.candidates.map((c) => map[c.symbol]).filter(Boolean), token);
      const bySym = new Map<string, Quote>();
      for (const q of quotes) {
        const s = q.instrumentKey ? keyToSym.get(q.instrumentKey) : undefined;
        if (s) bySym.set(s, q);
      }
      live = liveCheckAll(res.candidates, bySym, baseCfg, account);
    }
    console.log(JSON.stringify({ ...res, live }, null, 2));
  } else if (cmd === 'kill') {
    const ledger = new Ledger(new FileStore(arg('ledger', `${DATA}/ledger.jsonl`)!));
    if (!ledger.state.initialized) throw new Error('No ledger yet. Run paper-run first.');
    const on = process.argv[3] === 'on';
    if (!on && process.argv[3] !== 'off') throw new Error('Usage: kill on|off [--reason text]');
    ledger.emit({ type: 'KILL_SWITCH', active: on, reason: arg('reason', 'manual')! });
    console.log(`Kill switch ${on ? 'ON: no new entries (exits still run)' : 'OFF'}`);
  } else {
    console.log('Usage: tsx src/cli.ts fetch|backtest|walkforward|paper-run|paper-status|scan [--live]|kill on|off [options]');
  }
}
main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
