import type { Universe } from './types';
import { Engine, makeView, type DayReport, type EngineConfig } from './engine';
import type { Ledger } from './ledger';

/**
 * Paper-trade runner. Run it after the market close once fresh daily candles are fetched.
 * - Fresh ledger: starts from the latest bar only (no history is back-filled as trades).
 * - Existing ledger: catches up every missing bar date in order, so skipped days still get stop checks.
 * Paper fills use the NEXT day's open, so entries planned today fill when the next bar appears.
 */
export function runPaper(ledger: Ledger, data: Universe, cfg: EngineConfig, targetDate?: string) {
  const view = makeView(data, cfg.params);
  const all = view.dates();
  if (!all.length) throw new Error('No market data loaded.');
  const latest = targetDate ?? all[all.length - 1];
  const engine = new Engine(cfg, ledger);
  const from = ledger.state.lastClosedDate;
  const dates = from ? all.filter((d) => d > from && d <= latest) : [latest];
  const processed: DayReport[] = [];
  for (const d of dates) {
    const r = engine.processDay(d, view);
    if (r) processed.push(r);
  }
  return { processed, latestBarDate: all[all.length - 1], view };
}
