export enum Segment {
  NSE_FUT = 'NSE_FUT',
  NSE_OPT = 'NSE_OPT',
  MCX_FUT = 'MCX_FUT',
  MCX_OPT = 'MCX_OPT',
}

export enum MarketRegime {
  TREND = 'TREND',
  RANGE = 'RANGE',
  CHOP = 'CHOP',
  SHOCK = 'SHOCK',
}

export enum TradeSide {
  LONG = 'LONG',
  SHORT = 'SHORT',
}

export interface StatutoryRates {
  stt_ctt_sell: number;
  exchange_ipft: number;
  sebi_fee: number;
  stamp_duty_buy: number;
  gst_rate: number;
  flat_brokerage: number;
}

export interface InstrumentSpec {
  symbol: string;
  segment: Segment;
  lotSize: number;
  tickSize: number;
  slippageTicks: number;
  strikePrice?: number;
  expiryDate?: string;
}

export interface OptionGreeks {
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  rho: number;
  iv: number;
}

export interface RegimeDiagnostics {
  regime: MarketRegime;
  volRatio: number;
  efficiencyRatio: number;
  obiScore: number;
  basisZScore: number;
  garmanKlassVol: number;
}

export interface TripleBarrierSpec {
  id: string;
  symbol: string;
  side: TradeSide;
  regime: MarketRegime;
  entryPrice: number;
  profitTakeBarrier: number;
  stopLossBarrier: number;
  verticalTimeBarrier: number; // Unix timestamp ms
  lots: number;
  timestamp: number;
}

export interface TaxAuditResult {
  approved: boolean;
  rejectionReason: string | null;
  grossWinINR: number;
  grossLossINR: number;
  statutoryTotalINR: number;
  slippageINR: number;
  totalFrictionINR: number;
  rewardToFrictionRatio: number;
  netExpectancyINR: number;
  breakEvenProbability: number;
}

export interface TerminalAccountState {
  capitalAllocated: number | null;
  hardFloorINR: number;
  realizedPnL: number;
  unrealizedPnL: number;
  totalClosedTrades: number;
  consecutiveLosses: number;
  killSwitchEngaged: boolean;
  winRate: number | null;
}
