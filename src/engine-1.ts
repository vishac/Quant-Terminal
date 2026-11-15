import type { Candle, Universe } from './types';
import { computeFeatures, isSignal, type Features, type Params52W } from './strategy52w';
import { exitCost, type EquityCostConfig } from './costs';
import { planEntry } from './plan';
import { evaluateEntry, GATE_DEFAULTS, type GateConfig } from './riskgate';
import type { ExitReason, Ledger, Planned, PosState, Trade } from './ledger';

export interface EngineConfig {
  startingCapital: number;
  riskPerTradePct: number; // sizing target
  maxPositions: number;
  maxPositionPct: number;
  slippageBps: number; // applied against you on every fill
  haltDrawdownPct: number;
  maxRiskPct?: number; // gate hard cap (default 1.0); must be >= riskPerTradePct
  maxDailyLossPct?: number; // gate cooldown threshold (default 1.5)
  costs: EquityCostConfig;
  params: Params52W;
}

export function gateConfigFrom(cfg: EngineConfig): GateConfig {
  return {
    maxPositions: cfg.maxPositions,
    maxPositionPct: cfg.maxPositionPct,
    maxRiskPct: cfg.maxRiskPct ?? GATE_DEFAULTS.maxRiskPct,
    maxDailyLossPct: cfg.maxDailyLossPct ?? GATE_DEFAULTS.maxDailyLossPct,
    haltDrawdownPct: cfg.haltDrawdownPct,
  };
}

export interface MarketView {
  symbols: string[];
  dates(): string[];
  bar(symbol: string, date: string): Candle | undefined;
  atr(symbol: string, date: string): number;
  signal(symbol: string, date: string): { ok: boolean; dist: number };
  lastClose(symbol: string, date: string): number | undefined; // last close on or before date
}

/** Computes features once; every lookup uses data on or before the requested date only. */
export function makeView(data: Universe, params: Params52W): MarketView {
  const symbols = Object.keys(data).sort();
  const feats: Record<string, Features> = {};
  const idx: Record<string, Map<string, number>> = {};
  const all = new Set<string>();
  for (const s of symbols) {
    feats[s] = computeFeatures(data[s], params);
    const m = new Map<string, number>();
    data[s].forEach((c, i) => {
      m.set(c.date, i);
      all.add(c.date);
    });
    idx[s] = m;
  }
  const sorted = [...all].sort();
  return {
    symbols,
    dates: () => sorted,
    bar: (s, d) => {
      const i = idx[s].get(d);
      return i === undefined ? undefined : data[s][i];
    },
    atr: (s, d) => {
      const i = idx[s].get(d);
      return i === undefined ? NaN : feats[s].atr[i];
    },
    signal: (s, d) => {
      const i = idx[s].get(d);
      return i === undefined ? { ok: false, dist: NaN } : isSignal(data[s], feats[s], i, params);
    },
    lastClose: (s, d) => {
      const arr = data[s];
      let lo = 0;
      let hi = arr.length - 1;
      let ans = -1;
      while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        if (arr[mid].date <= d) {
          ans = mid;
          lo = mid + 1;
        } else hi = mid - 1;
      }
      return ans >= 0 ? arr[ans].close : undefined;
    },
  };
}

export interface DayReport {
  date: string;
  equity: number;
  exposurePct: number;
  entries: number;
  exits: number;
}

/**
 * One engine drives BOTH the backtest and the paper trader, so they cannot disagree.
 * Order of work for a date d: (1) fill entries planned on earlier dates at d's open, (2) manage
 * positions against d's bar, (3) mark to market, (4) plan tomorrow's entries from d's close.
 * Reprocessing a date is a no-op, and a crash mid-day is repaired by rerunning that date.
 */
export class Engine {
  constructor(
    private cfg: EngineConfig,
    private ledger: Ledger,
  ) {
    const s = ledger.state;
    if (!s.initialized) ledger.emit({ type: 'INIT', capital: cfg.startingCapital });
    else if (s.capital !== cfg.startingCapital) {
      throw new Error(`Ledger was started with capital ${s.capital}, config says ${cfg.startingCapital}. Refusing to mix.`);
    }
  }

  processDay(date: string, view: MarketView): DayReport | null {
    const L = this.ledger;
    const s = L.state;
    if (s.lastClosedDate >= date) return null; // already processed
    const slip = this.cfg.slippageBps / 1e4;
    const gate = gateConfigFrom(this.cfg);
    let entries = 0;
    let exits = 0;

    // 1) Entries planned on an earlier date fill at today's open.
    for (const cand of s.pending.filter((c) => c.signalDate < date)) {
      const skip = (reason: string) => L.emit({ type: 'ENTRY_SKIPPED', date, symbol: cand.symbol, reason });
      if (s.pos.has(cand.symbol)) continue;
      const bar = view.bar(cand.symbol, date);
      if (!bar) {
        skip('no_bar_next_day');
        continue;
      }
      const plan = planEntry(bar.open, cand.atr, s.equity, s.cash, this.cfg);
      if (!plan.ok) {
        skip(plan.reason);
        continue;
      }
      const g = evaluateEntry(
        {
          symbol: cand.symbol,
          qty: plan.qty,
          fill: plan.fill,
          stop: plan.stop,
          entryCost: plan.entryCost,
          equity: s.equity,
          cash: s.cash,
          peak: s.peak,
          openCount: s.pos.size,
          hasPosition: s.pos.has(cand.symbol),
          lastDayReturnPct: s.lastDayReturnPct,
          killSwitch: s.killSwitch.active,
        },
        gate,
      );
      if (!g.allowed) {
        skip(g.codes[0]);
        continue;
      }
      L.emit({
        type: 'ENTRY_FILLED',
        date,
        symbol: cand.symbol,
        qty: plan.qty,
        fill: plan.fill,
        entryCost: plan.entryCost,
        stop: plan.stop,
        stopDist: plan.stopDist,
      });
      entries++;
    }

    // 2) Manage positions. Stops use the intraday LOW; a gap through the stop fills at the open.
    for (const p of [...s.pos.values()]) {
      if (p.managedThrough >= date) continue;
      const bar = view.bar(p.symbol, date);
      if (!bar) continue;
      const close = (fill: number, reason: ExitReason) => {
        this.close(p, date, fill, reason);
        exits++;
      };
      if (p.exitAtNextOpen) close(bar.open * (1 - slip), 'time');
      else if (bar.open <= p.stop) close(bar.open * (1 - slip), 'stop_gap');
      else if (bar.low <= p.stop) close(p.stop * (1 - slip), 'stop');
      else {
        const barsHeld = p.barsHeld + 1;
        const highestClose = Math.max(p.highestClose, bar.close);
        const a = view.atr(p.symbol, date);
        const stop = Number.isFinite(a) ? Math.max(p.stop, highestClose - this.cfg.params.trailAtr * a) : p.stop;
        L.emit({
          type: 'POSITION_UPDATED',
          date,
          symbol: p.symbol,
          stop,
          highestClose,
          barsHeld,
          exitAtNextOpen: barsHeld >= this.cfg.params.maxHoldBars,
        });
      }
    }

    // 3) Mark to market at today's close (last known close if a symbol did not trade today).
    let mv = 0;
    for (const p of s.pos.values()) mv += p.qty * (view.lastClose(p.symbol, date) ?? p.entryFill);
    const equity = s.cash + mv;
    const exposurePct = equity > 0 ? (mv / equity) * 100 : 0;

    // 4) Plan tomorrow's entries from today's close, closest to the 52W low first.
    const items: Planned[] = [];
    for (const sym of view.symbols) {
      if (s.pos.has(sym)) continue;
      const sig = view.signal(sym, date);
      if (sig.ok) items.push({ symbol: sym, atr: view.atr(sym, date), dist: sig.dist, signalDate: date });
    }
    items.sort((a, b) => a.dist - b.dist || a.symbol.localeCompare(b.symbol));
    L.emit({ type: 'SIGNALS', date, items });
    L.emit({ type: 'DAY_CLOSED', date, equity, exposurePct });
    return { date, equity, exposurePct, entries, exits };
  }

  private close(p: PosState, date: string, fill: number, reason: ExitReason) {
    const proceeds = p.qty * fill;
    const xc = exitCost(proceeds, this.cfg.costs).total;
    const gross = p.qty * (fill - p.entryFill);
    const costs = p.entryCost + xc;
    const net = gross - costs;
    const trade: Trade = {
      symbol: p.symbol,
      entryDate: p.entryDate,
      exitDate: date,
      entryFill: p.entryFill,
      exitFill: fill,
      qty: p.qty,
      grossPnl: gross,
      costs,
      netPnl: net,
      netReturnPct: (net / (p.qty * p.entryFill)) * 100,
      rMultiple: net / (p.qty * p.stopDist),
      bars: p.barsHeld,
      exitReason: reason,
    };
    this.ledger.emit({ type: 'POSITION_CLOSED', date, trade, exitCost: xc });
  }
}
