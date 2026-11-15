import type { Universe } from './types';
import { checkSignal, computeFeatures } from './strategy52w';
import { entryCost, exitCost } from './costs';
import { planEntry } from './plan';
import { evaluateEntry } from './riskgate';
import { gateConfigFrom, type EngineConfig } from './engine';
import type { LedgerState } from './ledger';

export interface AccountView {
  equity: number;
  cash: number;
  peak: number;
  openSymbols: string[];
  lastDayReturnPct: number;
  killSwitch: boolean;
}

export const freshAccount = (capital: number): AccountView => ({
  equity: capital, cash: capital, peak: capital, openSymbols: [], lastDayReturnPct: 0, killSwitch: false,
});

export const accountFromLedger = (s: LedgerState): AccountView => ({
  equity: s.equity,
  cash: s.cash,
  peak: s.peak,
  openSymbols: [...s.pos.keys()],
  lastDayReturnPct: s.lastDayReturnPct,
  killSwitch: s.killSwitch.active,
});

export interface Candidate {
  rank: number;
  symbol: string;
  signalDate: string;
  close: number;
  low52: number;
  distPct: number;
  barsSinceLow: number;
  atr: number;
  plan: null | {
    refEntry: number; // the signal close; the real fill is the NEXT open plus slippage
    stopDist: number;
    refStop: number;
    qty: number;
    notional: number;
    pctOfEquity: number;
    riskInr: number;
    riskPctOfEquity: number;
    roundTripCostInr: number; // entry + exit-at-stop costs
    costPctOfRisk: number; // how much of 1R costs eat if the stop is hit
  };
  gate: { allowed: boolean; codes: string[]; messages: string[] };
  wouldEnter: boolean; // same sequential slot/cash logic the engine applies at the next open
  warnings: string[];
}

export interface NearMiss {
  symbol: string;
  distPct: number;
  failed: string[];
}

export interface ScanResult {
  asOf: string;
  counts: { universe: number; evaluated: number; signals: number; wouldEnter: number };
  candidates: Candidate[];
  nearMisses: NearMiss[];
  held: string[];
  staleSymbols: { symbol: string; lastBar: string }[];
  insufficientHistory: string[];
  account: AccountView;
  caveats: string[];
}

export interface ScanOptions {
  maxAdvPct?: number; // warn when notional exceeds this % of 20-bar average turnover (hypothesis, scan-only)
  nearMissDistFactor?: number; // near miss = within maxDistPct * factor of the low
  nearMissLimit?: number;
}

/**
 * Daily scan at the close of `asOf`. Uses the same checkSignal / planEntry / evaluateEntry as the engine,
 * so a candidate here is exactly a candidate the engine would plan. Held symbols are excluded.
 */
export function scan(data: Universe, cfg: EngineConfig, account: AccountView, asOf?: string, opts: ScanOptions = {}): ScanResult {
  const maxAdv = opts.maxAdvPct ?? 1;
  const syms = Object.keys(data).sort();
  const all = new Set<string>();
  for (const s of syms) for (const c of data[s]) all.add(c.date);
  const date = asOf ?? [...all].sort().pop() ?? '';
  const stale: ScanResult['staleSymbols'] = [];
  const insufficient: string[] = [];
  const held: string[] = [];
  const near: NearMiss[] = [];
  const raw: { s: string; idx: number; dist: number; f: ReturnType<typeof computeFeatures> }[] = [];
  let evaluated = 0;

  for (const s of syms) {
    const c = data[s];
    const idx = c.findIndex((x) => x.date === date);
    if (idx < 0) {
      stale.push({ symbol: s, lastBar: c[c.length - 1]?.date ?? 'none' });
      continue;
    }
    const f = computeFeatures(c, cfg.params);
    const chk = checkSignal(c, f, idx, cfg.params);
    if (!chk.dataOk) {
      insufficient.push(s);
      continue;
    }
    evaluated++;
    if (account.openSymbols.includes(s)) {
      held.push(s);
      continue;
    }
    if (chk.ok) raw.push({ s, idx, dist: chk.dist, f });
    else if (chk.dist <= cfg.params.maxDistPct * (opts.nearMissDistFactor ?? 1.5)) {
      near.push({ symbol: s, distPct: +chk.dist.toFixed(2), failed: Object.entries(chk.checks).filter(([, v]) => !v).map(([k]) => k) });
    }
  }
  raw.sort((a, b) => a.dist - b.dist || a.s.localeCompare(b.s));
  near.sort((a, b) => a.distPct - b.distPct || a.symbol.localeCompare(b.symbol));

  const gateCfg = gateConfigFrom(cfg);
  let cashLeft = account.cash;
  let openCount = account.openSymbols.length;
  const candidates: Candidate[] = raw.map((r, k) => {
    const bar = data[r.s][r.idx];
    const atr = r.f.atr[r.idx];
    const plan = planEntry(bar.close, atr, account.equity, cashLeft, cfg);
    const base = {
      rank: k + 1, symbol: r.s, signalDate: date, close: bar.close, low52: r.f.low52[r.idx], distPct: +r.dist.toFixed(2),
      barsSinceLow: r.f.barsSinceLow[r.idx], atr: +atr.toFixed(4),
    };
    if (!plan.ok) {
      return { ...base, plan: null, gate: { allowed: false, codes: [`sizing:${plan.reason}`], messages: [`Cannot size: ${plan.reason}`] }, wouldEnter: false, warnings: [] };
    }
    const g = evaluateEntry(
      {
        symbol: r.s, qty: plan.qty, fill: plan.fill, stop: plan.stop, entryCost: plan.entryCost, equity: account.equity,
        cash: cashLeft, peak: account.peak, openCount, hasPosition: false, lastDayReturnPct: account.lastDayReturnPct, killSwitch: account.killSwitch,
      },
      gateCfg,
    );
    if (g.allowed) {
      cashLeft -= plan.notional + plan.entryCost;
      openCount++;
    }
    const exitValue = plan.qty * plan.stop * (1 - cfg.slippageBps / 1e4);
    const rt = plan.entryCost + exitCost(exitValue, cfg.costs).total;
    const warnings: string[] = [];
    const advPct = (plan.notional / r.f.avgTurnover[r.idx]) * 100;
    if (advPct > maxAdv) warnings.push(`Position is ${advPct.toFixed(2)}% of 20-bar average turnover (scan warning > ${maxAdv}%).`);
    return {
      ...base,
      plan: {
        refEntry: bar.close, stopDist: +plan.stopDist.toFixed(4), refStop: +(bar.close - plan.stopDist).toFixed(2), qty: plan.qty,
        notional: Math.round(plan.notional), pctOfEquity: +((plan.notional / account.equity) * 100).toFixed(2), riskInr: Math.round(plan.riskInr),
        riskPctOfEquity: +((plan.riskInr / account.equity) * 100).toFixed(3), roundTripCostInr: Math.round(rt),
        costPctOfRisk: +((rt / plan.riskInr) * 100).toFixed(1),
      },
      gate: { allowed: g.allowed, codes: g.codes, messages: g.messages },
      wouldEnter: g.allowed,
      warnings,
    };
  });

  return {
    asOf: date,
    counts: { universe: syms.length, evaluated, signals: candidates.length, wouldEnter: candidates.filter((c) => c.wouldEnter).length },
    candidates,
    nearMisses: near.slice(0, opts.nearMissLimit ?? 10),
    held,
    staleSymbols: stale,
    insufficientHistory: insufficient,
    account,
    caveats: [
      'Reference entry is the signal close; the real fill is the next open plus slippage, so qty and stop shift slightly.',
      'A scan match is a rule match, not evidence of edge. Judge the rule by walk-forward results, not by this list.',
    ],
  };
}
