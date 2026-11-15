import type { Universe } from './types';
import { Engine, makeView, type EngineConfig } from './engine';
import { Ledger } from './ledger';

export type { Trade, ExitReason } from './ledger';
import type { Trade } from './ledger';

export interface BtConfig extends EngineConfig {
  startDate?: string; // trading window; indicators still use earlier history
  endDate?: string;
}

export interface OpenPosition {
  symbol: string;
  qty: number;
  entryFill: number;
  markPrice: number;
  unrealizedPnl: number;
}

export interface BtResult {
  trades: Trade[];
  openPositions: OpenPosition[];
  equity: { date: string; equity: number; exposurePct: number }[];
  skipped: Record<string, number>;
}

/** Backtest = the same Engine the paper trader uses, run over history with an in-memory ledger. */
export function runBacktest(data: Universe, cfg: BtConfig): BtResult {
  const view = makeView(data, cfg.params);
  const ledger = new Ledger(null, () => 'backtest');
  const engine = new Engine(cfg, ledger);
  const dates = view.dates().filter((d) => (!cfg.startDate || d >= cfg.startDate) && (!cfg.endDate || d <= cfg.endDate));
  for (const d of dates) engine.processDay(d, view);
  const s = ledger.state;
  const last = dates[dates.length - 1];
  const openPositions: OpenPosition[] = [...s.pos.values()].map((p) => {
    const mark = (last && view.lastClose(p.symbol, last)) || p.entryFill;
    return { symbol: p.symbol, qty: p.qty, entryFill: p.entryFill, markPrice: mark, unrealizedPnl: p.qty * (mark - p.entryFill) };
  });
  return { trades: s.trades, openPositions, equity: s.curve, skipped: s.skipped };
}
