export interface SizeInput {
  equity: number;
  cash: number;
  fill: number; // expected entry fill price
  stopDist: number; // fill - stop, must be > 0
  riskPct: number; // % of equity risked if stop is hit
  maxPositionPct: number; // concentration cap, % of equity
  entryCostFn: (value: number) => number;
}

export interface SizeResult {
  qty: number;
  reason: 'ok' | 'bad_input' | 'risk_budget_below_one_share' | 'cash';
}

/**
 * Fixed-fractional sizing for a long delivery position.
 * Never forces a minimum of one unit: if the risk budget cannot afford one share
 * at this stop distance, the trade is skipped (the old positionSizer forced min 1 lot).
 */
export function sizeLong(i: SizeInput): SizeResult {
  if (!(i.equity > 0) || !(i.fill > 0) || !(i.stopDist > 0) || !(i.riskPct > 0)) {
    return { qty: 0, reason: 'bad_input' };
  }
  const byRisk = Math.floor((i.equity * (i.riskPct / 100)) / i.stopDist);
  if (byRisk < 1) return { qty: 0, reason: 'risk_budget_below_one_share' };
  const byCap = Math.floor((i.equity * (i.maxPositionPct / 100)) / i.fill);
  let qty = Math.min(byRisk, byCap, Math.floor(i.cash / i.fill));
  while (qty > 0 && qty * i.fill + i.entryCostFn(qty * i.fill) > i.cash) qty--;
  if (qty < 1) return { qty: 0, reason: byCap < 1 ? 'risk_budget_below_one_share' : 'cash' };
  return { qty, reason: 'ok' };
}
