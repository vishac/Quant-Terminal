/**
 * Equity DELIVERY cost model (cash segment). All *Pct fields are fractions (0.001 = 0.1%).
 *
 * Only sttDeliveryPct is source-verified (Upstox, 2026: delivery 0.1%, unchanged by Budget 2026).
 * Every field marked UNVERIFIED is a best-known default and is broker/exchange specific:
 * overwrite it from your own broker contract note before trusting any net result.
 */
export interface EquityCostConfig {
  sttDeliveryPct: number;
  exchangeTxnPct: number;
  sebiPct: number;
  stampBuyPct: number;
  gstPct: number;
  brokerageFlat: number;
  brokeragePctCap: number;
  dpChargeSell: number;
}

export const DELIVERY_COSTS_DEFAULT: EquityCostConfig = {
  sttDeliveryPct: 0.001, // VERIFIED: 0.1% on buy and sell value
  exchangeTxnPct: 0.0000297, // UNVERIFIED
  sebiPct: 0.000001, // UNVERIFIED (Rs 10 per crore)
  stampBuyPct: 0.00015, // UNVERIFIED (buy side only)
  gstPct: 0.18, // UNVERIFIED (on brokerage + exchange + SEBI + DP)
  brokerageFlat: 20, // UNVERIFIED broker-specific, per order
  brokeragePctCap: 0.025, // UNVERIFIED broker-specific: min(flat, pct * value)
  dpChargeSell: 13.5, // UNVERIFIED broker-specific, per sell, before GST
};

export interface CostBreakdown {
  brokerage: number;
  stt: number;
  exchange: number;
  sebi: number;
  stamp: number;
  dp: number;
  gst: number;
  total: number;
}

const brokerage = (value: number, c: EquityCostConfig) =>
  Math.min(c.brokerageFlat, c.brokeragePctCap * value);

export function entryCost(value: number, c: EquityCostConfig): CostBreakdown {
  const b = brokerage(value, c);
  const stt = value * c.sttDeliveryPct;
  const exchange = value * c.exchangeTxnPct;
  const sebi = value * c.sebiPct;
  const stamp = value * c.stampBuyPct;
  const gst = c.gstPct * (b + exchange + sebi);
  return { brokerage: b, stt, exchange, sebi, stamp, dp: 0, gst, total: b + stt + exchange + sebi + stamp + gst };
}

export function exitCost(value: number, c: EquityCostConfig): CostBreakdown {
  const b = brokerage(value, c);
  const stt = value * c.sttDeliveryPct;
  const exchange = value * c.exchangeTxnPct;
  const sebi = value * c.sebiPct;
  const dp = c.dpChargeSell;
  const gst = c.gstPct * (b + exchange + sebi + dp);
  return { brokerage: b, stt, exchange, sebi, stamp: 0, dp, gst, total: b + stt + exchange + sebi + dp + gst };
}
