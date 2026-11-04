export type ActiveTab = 'voice_hud' | 'quant_bot' | 'multi_user_desk' | 'autonomous_agents' | 'stress_test_lab' | 'trade_history' | 'equity_radar' | 'deep_thesis' | 'sync_hub' | 'risk_engine' | 'risk_guard' | 'backtest_lab' | 'settings';

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

export interface AgentDecisionScript {
  id: string;
  agentId: string;
  symbol: string;
  name: string;
  segment: 'NSE_CASH' | 'BSE_CASH' | 'NSE_FNO' | 'MCX' | 'MCX_FUTURES' | 'MCX_OPTIONS';
  action: 'BUY' | 'SELL' | 'SPREAD';
  entryTrigger: string;
  targetPrice: string;
  targetUpsidePct?: number;
  stopLoss: string;
  riskPct?: number;
  convictionScore: number;
  convictionTier: 'VERY_HIGH' | 'HIGH' | 'MODERATE';
  catalyst: string;
  derivedMetrics: {
    ltp: number;
    changePct: number;
    volume?: number;
    dayHigh?: number | null;
    dayLow?: number | null;
  };
}

export interface AgentMarketInsight {
  id: string;
  agentId: string;
  agentName: string;
  agentCodeName: string;
  timestamp: string;
  category: 'GLOBAL_NEWS' | 'GLOBAL_POLICY' | 'SENTIMENT' | 'F_AND_O_SIGNAL' | 'EQUITY_BREAKOUT' | 'COMMODITY_VECTOR' | 'REGULATORY_AUDIT';
  headline: string;
  detail: string;
  severity: 'INFO' | 'OPPORTUNITY' | 'ALERT' | 'HIGH_CONVICTION';
  sources?: string[];
  decisionScript?: AgentDecisionScript;
}

export interface AgentStrategyHealingReport {
  id: string;
  agentId: string;
  agentName: string;
  timestamp: string;
  triggerReason: string;
  lossAmountINR: number;
  rootCauseCategory: 'MACRO_NEWS_SHOCK' | 'REGIME_MISMATCH' | 'SLIPPAGE_AND_SIZING' | 'SECTOR_ROTATION_HEADWIND';
  rootCauseAnalysis: string;
  newsAndSentimentEvidence: {
    headline: string;
    source: string;
    sentimentScore: number;
    marketImpact: string;
  }[];
  backtestDiagnostic: {
    testedSymbol: string;
    originalParameters: {
      stopLossPct: number;
      takeProfitPct: number;
      entryFilter: string;
      maxRiskPerTradeINR: number;
    };
    optimizedParameters: {
      stopLossPct: number;
      takeProfitPct: number;
      entryFilter: string;
      maxRiskPerTradeINR: number;
    };
    backtestImprovement: {
      originalWinRatePct: number;
      optimizedWinRatePct: number;
      drawdownReductionPct: number;
      sharpeRatio: number;
      sampleBarsCount: number;
    };
  };
  recalibratedRules: string[];
  status: 'PENDING_REVIEW' | 'APPLIED';
}

export interface AutonomousAgent {
  id: string;
  name: string;
  codeName: string;
  role: string;
  targetMarket: string;
  strategyType: string;
  status: 'ACTIVE_HEDGING' | 'SCANNING' | 'STANDBY_RULES' | 'SQUARED_OFF';
  tradingState?: 'ACTIVE' | 'DAILY_HALTED' | 'WEEKLY_HALTED' | 'SELF_HEALING' | 'MANUAL_PAUSE';
  allocatedCapitalINR: number;
  utilizedMarginINR: number;
  winRatePct: number | null;
  tradesToday: number;
  realizedPnlINR: number;
  unrealizedPnlINR: number;
  dailyLossLimitINR?: number; // Capped at ₹2,000 INR
  weeklyLossLimitINR?: number; // Capped at ₹5,000 INR
  weeklyRealizedPnlINR?: number;
  weeklyUnrealizedPnlINR?: number;
  weeklyDrawdownINR?: number;
  haltReason?: string | null;
  haltTimestamp?: string | null;
  lastHealingReport?: AgentStrategyHealingReport | null;
  strictRuleSet: string[];
  lastAction: string;
  lastActionTimestamp: string;
  liveInsights?: AgentMarketInsight[];
  decisionScripts?: AgentDecisionScript[];
}

export type TslStage =
  | 'INITIAL_RISK_STOP'
  | 'BREAKEVEN_ARMED'
  | 'PROFIT_LOCK_50PCT'
  | 'PROFIT_LOCK_75PCT'
  | 'TRAILING_STOP_HIT'
  | 'TARGET_HIT'
  | 'STOP_HIT';

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
    exitPrice?: number;
  }[];
  totalInvestmentINR: number;
  maxDefinedLossINR: number; // Strictly capped <= ₹400 per trade (1R)
  targetProfitINR: number;
  riskRewardRatio: string;
  timestamp: string;
  orderDate?: string; // dd-mmm-yyyy (e.g. 29-Oct-2026)
  orderTime?: string; // [hh]:mm:ss (no AM/PM, e.g. [14]:32:15)
  expiryDate?: string; // Contract expiry dd-mmm-yyyy for NSE F&O / MCX
  status: 'OPEN' | 'SQUARED_OFF' | 'TARGET_HIT' | 'STOP_HIT' | 'TRAILING_STOP_HIT';
  pnlINR: number;
  peakPnlINR?: number; // High-Water-Mark unrealized P&L in ₹
  trailingStopPnlINR?: number; // Dynamic locked P&L floor in ₹ (-1R -> +₹15 -> 50% Peak -> 75% Peak)
  trailingStopPrice?: number; // Live trailing stop price level
  initialStopLossPrice?: number;
  targetPriceLevel?: number;
  tslStage?: TslStage;
  exitReason?: string;
  entryPrice?: number;
  exitPrice?: number;
  side?: 'BUY' | 'SELL';
  qty?: number;
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
