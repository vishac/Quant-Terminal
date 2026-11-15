import { entryCost, type EquityCostConfig } from './costs';
import { sizeLong } from './sizing';

export interface PlanCfg {
  slippageBps: number;
  riskPerTradePct: number;
  maxPositionPct: number;
  costs: EquityCostConfig;
  params: { stopAtr: number };
}

export type Plan =
  | { ok: true; fill: number; stopDist: number; stop: number; qty: number; notional: number; entryCost: number; riskInr: number }
  | { ok: false; reason: string };

/**
 * The ONE place an entry is priced and sized. The engine (at the next open), the scanner (at the signal
 * close) and the live check (at the live price) all call this, so their plans cannot drift apart.
 */
export function planEntry(ref: number, atr: number, equity: number, cash: number, cfg: PlanCfg): Plan {
  const fill = ref * (1 + cfg.slippageBps / 1e4);
  const stopDist = cfg.params.stopAtr * atr;
  if (!(stopDist > 0) || fill - stopDist <= 0) return { ok: false, reason: 'bad_stop' };
  const sz = sizeLong({
    equity,
    cash,
    fill,
    stopDist,
    riskPct: cfg.riskPerTradePct,
    maxPositionPct: cfg.maxPositionPct,
    entryCostFn: (v) => entryCost(v, cfg.costs).total,
  });
  if (sz.qty < 1) return { ok: false, reason: sz.reason };
  const notional = sz.qty * fill;
  return {
    ok: true,
    fill,
    stopDist,
    stop: fill - stopDist,
    qty: sz.qty,
    notional,
    entryCost: entryCost(notional, cfg.costs).total,
    riskInr: sz.qty * stopDist,
  };
}
