export type ActiveTab = 'voice_hud' | 'quant_bot' | 'multi_user_desk' | 'autonomous_agents' | 'equity_radar' | 'deep_thesis' | 'sync_hub' | 'risk_engine' | 'risk_guard' | 'backtest_lab' | 'settings';

export type UserDeskRole = 'admin' | 'risk_officer' | 'quant_trader' | 'analyst';

export interface DeskTraderSeat {
  seatNumber: number; // 1 to 20
  id: string; // user uid or seat id
  name: string;
  email: string;
  role: UserDeskRole;
  desk: string;
  avatarSeed?: string;
  status: 'active' | 'suspended' | 'offline';
  allocatedCapitalINR: number;
  marginUsedINR: number;
  dayPnlINR: number;
  activePositionsCount: number;
  killSwitchActive: boolean;
  killSwitchReason?: string | null;
  lastActive: string;
}

export interface OptionContract {
  strike: number;
  maturityDays: number;
  maturityLabel: string;
  iv: number; // Implied volatility percentage
  delta: number;
  gamma: number;
  vega: number;
  theta: number;
  bid: number;
  ask: number;
  volume: number;
  openInterest: number;
  lotSize: number;
}

export interface AssetVolProfile {
  ticker: string;
  name: string;
  exchange: 'NSE' | 'BSE' | 'MCX';
  segment: 'INDEX_FNO' | 'STOCK_FNO' | 'COMMODITY_MCX' | 'CASH_EQUITY';
  spotPrice: number;
  change24h: number;
  atmIv: number;
  skew25d: number; // 25d put-call skew
  termStructureSlope: number;
  historicalVol30d: number;
  lotSize: number;
  contracts: OptionContract[];
}

export interface GlobalMarketIndicator {
  symbol: string;
  name: string;
  region: 'US' | 'ASIA' | 'COMMODITY' | 'CURRENCY' | 'RATES';
  price: number;
  changePct: number;
  sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  impactOnIndia: string;
  correlationWeight: number; // -1.0 to +1.0
}

export interface AutonomousAgent {
  id: string;
  name: string;
  codeName: string;
  role: string;
  targetMarket: string;
  strategyType: string;
  status: 'ACTIVE_HEDGING' | 'SCANNING' | 'STANDBY_RULES' | 'SQUARED_OFF';
  allocatedCapitalINR: number;
  utilizedMarginINR: number;
  winRatePct: number | null;
  tradesToday: number;
  realizedPnlINR: number;
  unrealizedPnlINR: number;
  strictRuleSet: string[];
  lastAction: string;
  lastActionTimestamp: string;
}

export interface PaperTradeOrder {
  id: string;
  agentId: string;
  agentName: string;
  symbol: string;
  segment: 'NSE_FNO' | 'NSE_CASH' | 'BSE_CASH' | 'MCX_FUTURES' | 'MCX_OPTIONS';
  strategyName: string;
  legs: {
    instrument: string;
    action: 'BUY' | 'SELL';
    qty: number;
    price: number;
    strike?: number;
    optionType?: 'CE' | 'PE';
  }[];
  totalInvestmentINR: number;
  maxDefinedLossINR: number; // Strictly capped
  targetProfitINR: number;
  riskRewardRatio: string;
  timestamp: string;
  status: 'OPEN' | 'SQUARED_OFF' | 'TARGET_HIT' | 'STOP_HIT';
  pnlINR: number;
  sebiComplianceVerified: boolean;
  isSimulation?: boolean;
}

export interface SebiComplianceRule {
  ruleId: string;
  authority: 'SEBI' | 'NSE' | 'RBI' | 'MCX';
  name: string;
  requirement: string;
  status: 'COMPLIANT' | 'WARNING' | 'BREACH';
  details: string;
}

export interface IndianRiskMetrics {
  totalAumINR: number; // e.g. 2,50,00,000 (2.5 Cr)
  dailyPnlINR: number;
  dailyPnlPct: number;
  peakMarginRequiredINR: number;
  availableMarginINR: number;
  marginUtilizationPct: number;
  portfolioDeltaNifty: number;
  portfolioGamma: number;
  portfolioVegaINR: number;
  portfolioThetaINR: number;
  dailyDrawdownLimitINR: number; // Capped at 2%
  maxRiskCapExceeded: boolean;
}

export interface BrokerVenue {
  id: string;
  name: string;
  exchange: 'NSE' | 'BSE' | 'MCX' | 'GIFT_CITY';
  protocol: string;
  feedType: string;
  status: 'ACTIVE' | 'DEGRADED' | 'STANDBY';
  latencyMs: number;
  messagesPerSec: number;
  fillRatePct: number;
  rejectedOrders: number;
  darkPoolAccess: boolean;
}

export interface StressScenario {
  id: string;
  name: string;
  description: string;
  historicalReference: string;
  niftyShockPct: number;
  bankNiftyShockPct: number;
  crudeShockPct: number;
  inrUsdImpactPct: number;
  estimatedLossINR: number;
  lossPctAum: number;
  recommendedHedge: string;
}

// ---------------------------------------------------------------------------
// Market data — single canonical definition shared by server and frontend.
// ---------------------------------------------------------------------------

export interface MarketQuote {
  symbol: string;
  name: string;
  price: number | null;
  change: number | null;
  changePct: number | null;
  high?: number | null;
  low?: number | null;
  prevClose?: number | null;
  fiftyTwoWeekHigh?: number | null;
  fiftyTwoWeekLow?: number | null;
  volume?: number | null;
  timestamp: string;
  source: string;
}

// ---------------------------------------------------------------------------
// Desk order records — single definition shared by firebase.ts and context.
// ---------------------------------------------------------------------------

export interface DeskOrderRecord {
  id: string;
  userId: string;
  seatNumber: number;
  traderName: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  productType: string;
  qty: number;
  price: number;
  status: 'FILLED' | 'REJECTED' | 'CANCELLED';
  riskCheckPassed: boolean;
  rejectReason?: string | null;
  timestamp: string;
}
