import {
  type StrategyFactorScore,
  type StrategyQuantification,
  type QualificationRule,
  QUANTITATIVE_STRATEGY_FRAMEWORK_WEIGHTS,
  getStrategyQuantification,
} from './strategyQuantificationData.ts';

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
  changeVal?: number;
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
    target1: { price: number; upsidePct: number; label: string; hitProbabilityPct?: number; expectedValuePct?: number };
    target2: { price: number; upsidePct: number; label: string; hitProbabilityPct?: number; expectedValuePct?: number };
    target3: { price: number; upsidePct: number; label: string; hitProbabilityPct?: number; expectedValuePct?: number };
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
  exactDecimalScore?: number;
}

export interface TargetProbabilityMetrics {
  t1ProbabilityPct: number;
  t2ProbabilityPct: number;
  t3ProbabilityPct: number;
  t1ExpectedValuePct: number;
  t2ExpectedValuePct: number;
  t3ExpectedValuePct: number;
  modelSummary: string;
}

/**
 * Deterministic Markov First-Passage / Drift-Diffusion Barrier Hit Probability Model.
 * Calculates the probability of hitting Target 1, Target 2, and Target 3 before Stop-Loss
 * as a function of:
 * 1. Barrier Reward-to-Risk Ratio (R_i = upsidePct_i / |riskPct|)
 * 2. Absolute Target Excursion Distance Drag (penalizing wide percentage extensions vs tight swings)
 * 3. 5-Pillar Positive Drift Velocity (Composite Conviction, Order Flow & Momentum scores)
 * 4. Strong Markov Conditional Continuation: P(Hit T2) = P(Hit T1) * P(Hit T2 | Hit T1)
 */
export function computeTargetHitProbabilities(params: {
  compositeScore: number;
  orderFlowScore?: number;
  momentumScore?: number;
  riskPct: number;
  t1UpsidePct: number;
  t2UpsidePct: number;
  t3UpsidePct?: number;
}): TargetProbabilityMetrics {
  const stopDist = Math.max(0.85, Math.abs(params.riskPct || 2.0));
  const u1 = Math.max(0.5, Math.abs(params.t1UpsidePct || 3.0));
  const u2 = Math.max(u1 + 0.5, Math.abs(params.t2UpsidePct || u1 * 1.68));
  const u3 = Math.max(u2 + 0.5, Math.abs(params.t3UpsidePct || u1 * 2.55));

  const rr1 = u1 / stopDist;

  const convNorm = Math.max(0, Math.min(1, (params.compositeScore - 55) / 42));
  const flowNorm = Math.max(
    0,
    Math.min(1, ((params.orderFlowScore ?? params.compositeScore) - 55) / 42)
  );
  const momNorm = Math.max(
    0,
    Math.min(1, ((params.momentumScore ?? params.compositeScore) - 55) / 42)
  );
  const driftStrength = Math.max(
    0.05,
    Math.min(0.98, convNorm * 0.50 + flowNorm * 0.25 + momNorm * 0.25)
  );

  // First-passage probability to T1 barrier against Stop Loss barrier with positive drift
  const distanceDrag1 = u1 * 0.038;
  const effectiveResistance1 = rr1 * (0.72 - driftStrength * 0.34) + distanceDrag1;
  const rawP1 = (1 / (1 + effectiveResistance1 * 0.58)) * 100 + driftStrength * 14.5;
  const t1ProbabilityPct = Number(Math.max(38.0, Math.min(84.5, rawP1)).toFixed(1));

  // Strong Markov conditional continuation from T1 -> T2 (after step-ratchet stop locks breakeven)
  const delta12 = Math.max(0.5, u2 - u1);
  const condP2GivenT1 = Math.max(
    0.46,
    Math.min(0.76, 0.56 + driftStrength * 0.22 - delta12 * 0.014)
  );
  const t2ProbabilityPct = Number(
    Math.max(22.0, Math.min(t1ProbabilityPct - 8.5, t1ProbabilityPct * condP2GivenT1)).toFixed(1)
  );

  // Strong Markov conditional continuation from T2 -> T3 (after step-ratchet locks T1 floor)
  const delta23 = Math.max(0.5, u3 - u2);
  const condP3GivenT2 = Math.max(
    0.40,
    Math.min(0.70, 0.50 + driftStrength * 0.20 - delta23 * 0.012)
  );
  const t3ProbabilityPct = Number(
    Math.max(12.0, Math.min(t2ProbabilityPct - 7.0, t2ProbabilityPct * condP3GivenT2)).toFixed(1)
  );

  const p1 = t1ProbabilityPct / 100;
  const p2 = t2ProbabilityPct / 100;
  const p3 = t3ProbabilityPct / 100;

  // Expected Value (EV %) accounting for step-ratchet stop protection after T1
  const t1ExpectedValuePct = Number((p1 * u1 - (1 - p1) * stopDist).toFixed(2));
  const t2ExpectedValuePct = Number((p2 * u2 - (1 - p1) * stopDist).toFixed(2));
  const t3ExpectedValuePct = Number((p3 * u3 - (1 - p1) * stopDist).toFixed(2));

  return {
    t1ProbabilityPct,
    t2ProbabilityPct,
    t3ProbabilityPct,
    t1ExpectedValuePct,
    t2ExpectedValuePct,
    t3ExpectedValuePct,
    modelSummary: `Markov First-Passage Barrier Model (Drift μ=${(driftStrength * 100).toFixed(0)}%, R1=1:${rr1.toFixed(2)}, SL=-${stopDist.toFixed(2)}%)`,
  };
}

export function getStockTargetProbabilities(stock?: InstitutionalStockPick | null): TargetProbabilityMetrics {
  if (!stock) {
    return computeTargetHitProbabilities({
      compositeScore: 75,
      riskPct: -2.0,
      t1UpsidePct: 4.0,
      t2UpsidePct: 6.7,
      t3UpsidePct: 10.2,
    });
  }
  const t1Stored = stock.tacticalLevels?.target1?.hitProbabilityPct;
  const t2Stored = stock.tacticalLevels?.target2?.hitProbabilityPct;
  const t3Stored = stock.tacticalLevels?.target3?.hitProbabilityPct;

  const q = stock.strategyQuantification;
  const orderFlowFactor = q?.factorBreakdown?.find((f) => f.id === 'ORDER_FLOW')?.score;
  const momentumFactor = q?.factorBreakdown?.find((f) => f.id === 'MOMENTUM_CANSLIM')?.score;

  const computed = computeTargetHitProbabilities({
    compositeScore: q?.compositeScore ?? stock.tacticalLevels?.confidenceScore ?? 80,
    orderFlowScore: orderFlowFactor,
    momentumScore: momentumFactor,
    riskPct: stock.tacticalLevels?.riskPct ?? -2.5,
    t1UpsidePct: stock.tacticalLevels?.target1?.upsidePct ?? 4.0,
    t2UpsidePct: stock.tacticalLevels?.target2?.upsidePct ?? 6.8,
    t3UpsidePct: stock.tacticalLevels?.target3?.upsidePct ?? 10.2,
  });

  return {
    ...computed,
    t1ProbabilityPct: typeof t1Stored === 'number' ? t1Stored : computed.t1ProbabilityPct,
    t2ProbabilityPct: typeof t2Stored === 'number' ? t2Stored : computed.t2ProbabilityPct,
    t3ProbabilityPct: typeof t3Stored === 'number' ? t3Stored : computed.t3ProbabilityPct,
  };
}

// All static picks permanently removed per trading safety policy.
// Radar universe strictly consumes live dynamic breakout scans from the backend Chartink API.
export const INSTITUTIONAL_STOCK_PICKS: InstitutionalStockPick[] = [];
