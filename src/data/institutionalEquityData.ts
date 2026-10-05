import {
  StrategyFactorScore,
  StrategyQuantification,
  QualificationRule,
  QUANTITATIVE_STRATEGY_FRAMEWORK_WEIGHTS,
  getStrategyQuantification,
} from './strategyQuantificationData';

export type {
  StrategyFactorScore,
  StrategyQuantification,
  QualificationRule,
};

export {
  QUANTITATIVE_STRATEGY_FRAMEWORK_WEIGHTS,
  getStrategyQuantification,
};

export interface InstitutionalStockPick {
  id: string;
  ticker: string;
  symbol: string;
  name: string;
  sector: 'CONSUMER' | 'DEFENSE' | 'INFRASTRUCTURE' | 'ELECTRONICS_EMS' | 'TELECOM' | 'BANKING_FINANCE' | 'CAPITAL_GOODS' | 'POWER_ENERGY' | 'IT_TECH' | 'DYNAMIC_MOMENTUM' | string;
  marketCapINR: string;
  horizon: 'SHORT_TERM' | 'LONG_TERM' | 'BOTH';
  ltp?: number;
  changePct?: number;
  volume?: number;
  capCategory?: string;
  sourceEvidence?: {
    exchange?: string;
    gateway: string;
    apiEndpoint: string;
    scanCondition: string;
    tickTimestamp: string;
    rawClose: number;
    rawChangePct: number;
    rawVolume: number;
    horizonLogic?: string;
  };
  strategyQuantification: StrategyQuantification;
  institutionalStrategy: {
    modelName: string;
    framework: string;
    thesis: string;
    invalidationCondition: string;
  };
  tacticalLevels: {
    entryMin: number;
    entryMax: number;
    stopLoss: number;
    riskPct: number;
    support1: number;
    support2: number;
    resistance1: number;
    resistance2: number;
    target1: { price: number; upsidePct: number; label: string };
    target2: { price: number; upsidePct: number; label: string };
    target3: { price: number; upsidePct: number; label: string };
    riskRewardRatio: string;
    confidenceScore: number;
    institutionalRating: 'STRONG_CONVICTION_BUY' | 'ACCUMULATE' | string;
  };
  volumeAnalysis: {
    avgVolume20D: string;
    deliveryPct: number;
    deliveryAvg30D: number;
    volumeSurge: string;
    blockDealsSummary: string;
    institutionalFootprint: string;
  };
  companyAnalysis1Year: {
    revenueGrowthYoY: string;
    patGrowthYoY: string;
    ebitdaMargin: string;
    roce: string;
    roe: string;
    debtToEquity: string;
    fiiHoldingChange: string;
    diiHoldingChange: string;
    promoterHolding: string;
    operationalHighlight: string;
  };
  valuation: {
    trailingPE: number;
    median5YPE: number;
    priceToBook: number;
    evToEbitda: number;
  };
}

// All static picks permanently removed per trading safety policy.
// Radar universe strictly consumes live dynamic breakout scans from the backend Chartink API.
export const INSTITUTIONAL_STOCK_PICKS: InstitutionalStockPick[] = [];
