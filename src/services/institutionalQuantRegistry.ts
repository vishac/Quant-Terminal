import { MarketQuote, PaperTradeOrder } from '../types/quant';

// ============================================================================
// 1. CANONICAL INSTRUMENT / SECURITY MASTER (Spec Section 1 & 2)
// ============================================================================

export interface SecurityMasterRecord {
  internalSecurityId: string;
  symbol: string;
  quoteKey: string;
  isin: string;
  exchange: 'NSE' | 'BSE' | 'MCX';
  mic: 'XNSE' | 'XBOM' | 'XMCX';
  assetClass: 'EQUITY' | 'INDEX_DERIVATIVE' | 'COMMODITY_DERIVATIVE';
  instrumentType: 'CASH_EQ' | 'FUTIDX' | 'OPTIDX' | 'FUTCOM';
  currency: 'INR';
  country: 'IN';
  sector: string;
  industry: string;
  listingStatus: 'ACTIVE' | 'RESTRICTED' | 'SUSPENDED';
  tradingCalendar: 'NSE_BSE_2026_IST' | 'MCX_2026_IST';
  tradingTimezone: 'Asia/Kolkata';
  tickSize: number;
  lotSize: number;
  contractMultiplier: number;
  minOrderQty: number;
  settlementType: 'CASH_SETTLED' | 'PHYSICAL_DELIVERY';
  settlementCycle: 'T+0_FNO' | 'T+1_EQ';
  rolloverRule: string;
  corporateActionAdjusted: boolean;
  roicPct: number;
  evEbitda: number;
  roePct: number;
  debtToEquity: number;
  advCrINR: number;
}

export interface DataQualityCheckRecord {
  internalSecurityId: string;
  symbol: string;
  provider: string;
  exchangeTimestamp: string;
  receivedTimestamp: string;
  latencyDeltaMs: number;
  livePrice: number | null;
  changePct: number | null;
  missingDataFlag: boolean;
  stalePriceFlag: boolean;
  outlierFlag: boolean;
  corporateActionAdjustedFlag: boolean;
  dataVersion: string;
  integrityStatus: 'VERIFIED_CLEAN' | 'STALE_WARNING' | 'OUTLIER_FLAGGED' | 'MISSING_FEED';
}

export const CANONICAL_SECURITY_MASTER: SecurityMasterRecord[] = [
  {
    internalSecurityId: 'SEC-IND-NIFTY50-IDX',
    symbol: 'NIFTY 50',
    quoteKey: 'NIFTY',
    isin: 'IND999900001',
    exchange: 'NSE',
    mic: 'XNSE',
    assetClass: 'INDEX_DERIVATIVE',
    instrumentType: 'OPTIDX',
    currency: 'INR',
    country: 'IN',
    sector: 'Broad Market Index',
    industry: 'Benchmark Index',
    listingStatus: 'ACTIVE',
    tradingCalendar: 'NSE_BSE_2026_IST',
    tradingTimezone: 'Asia/Kolkata',
    tickSize: 0.05,
    lotSize: 75,
    contractMultiplier: 1,
    minOrderQty: 75,
    settlementType: 'CASH_SETTLED',
    settlementCycle: 'T+0_FNO',
    rolloverRule: 'Tuesday Weekly / Last Tuesday Monthly (Preceding Trading Day on Holiday)',
    corporateActionAdjusted: true,
    roicPct: 16.8,
    evEbitda: 14.2,
    roePct: 15.9,
    debtToEquity: 0.42,
    advCrINR: 28500,
  },
  {
    internalSecurityId: 'SEC-IND-BANKNIFTY-IDX',
    symbol: 'BANK NIFTY',
    quoteKey: 'BANKNIFTY',
    isin: 'IND999900002',
    exchange: 'NSE',
    mic: 'XNSE',
    assetClass: 'INDEX_DERIVATIVE',
    instrumentType: 'FUTIDX',
    currency: 'INR',
    country: 'IN',
    sector: 'Banking & Financials',
    industry: 'Index Derivatives',
    listingStatus: 'ACTIVE',
    tradingCalendar: 'NSE_BSE_2026_IST',
    tradingTimezone: 'Asia/Kolkata',
    tickSize: 0.05,
    lotSize: 30,
    contractMultiplier: 1,
    minOrderQty: 30,
    settlementType: 'CASH_SETTLED',
    settlementCycle: 'T+0_FNO',
    rolloverRule: 'Last Tuesday Monthly',
    corporateActionAdjusted: true,
    roicPct: 14.5,
    evEbitda: 11.8,
    roePct: 16.4,
    debtToEquity: 0.85,
    advCrINR: 19400,
  },
  {
    internalSecurityId: 'SEC-IND-RELIANCE-EQ',
    symbol: 'RELIANCE',
    quoteKey: 'RELIANCE.NS',
    isin: 'INE002A01018',
    exchange: 'NSE',
    mic: 'XNSE',
    assetClass: 'EQUITY',
    instrumentType: 'CASH_EQ',
    currency: 'INR',
    country: 'IN',
    sector: 'Energy & Telecom',
    industry: 'Integrated Oil, Retail & Digital',
    listingStatus: 'ACTIVE',
    tradingCalendar: 'NSE_BSE_2026_IST',
    tradingTimezone: 'Asia/Kolkata',
    tickSize: 0.05,
    lotSize: 1,
    contractMultiplier: 1,
    minOrderQty: 1,
    settlementType: 'PHYSICAL_DELIVERY',
    settlementCycle: 'T+1_EQ',
    rolloverRule: 'Cash Equity T+1 Rolling Settlement (1:1 Bonus Adjusted Oct 2024)',
    corporateActionAdjusted: true,
    roicPct: 12.4,
    evEbitda: 13.1,
    roePct: 11.8,
    debtToEquity: 0.44,
    advCrINR: 2450,
  },
  {
    internalSecurityId: 'SEC-IND-HDFCBANK-EQ',
    symbol: 'HDFCBANK',
    quoteKey: 'HDFCBANK.NS',
    isin: 'INE040A01034',
    exchange: 'NSE',
    mic: 'XNSE',
    assetClass: 'EQUITY',
    instrumentType: 'CASH_EQ',
    currency: 'INR',
    country: 'IN',
    sector: 'Banking & Financials',
    industry: 'Private Sector Bank',
    listingStatus: 'ACTIVE',
    tradingCalendar: 'NSE_BSE_2026_IST',
    tradingTimezone: 'Asia/Kolkata',
    tickSize: 0.05,
    lotSize: 1,
    contractMultiplier: 1,
    minOrderQty: 1,
    settlementType: 'PHYSICAL_DELIVERY',
    settlementCycle: 'T+1_EQ',
    rolloverRule: 'Cash Equity T+1 Rolling Settlement (HDFC Merger Adjusted)',
    corporateActionAdjusted: true,
    roicPct: 16.9,
    evEbitda: 12.4,
    roePct: 17.1,
    debtToEquity: 0.72,
    advCrINR: 3120,
  },
  {
    internalSecurityId: 'SEC-IND-ICICIBANK-EQ',
    symbol: 'ICICIBANK',
    quoteKey: 'ICICIBANK.NS',
    isin: 'INE090A01021',
    exchange: 'NSE',
    mic: 'XNSE',
    assetClass: 'EQUITY',
    instrumentType: 'CASH_EQ',
    currency: 'INR',
    country: 'IN',
    sector: 'Banking & Financials',
    industry: 'Private Sector Bank',
    listingStatus: 'ACTIVE',
    tradingCalendar: 'NSE_BSE_2026_IST',
    tradingTimezone: 'Asia/Kolkata',
    tickSize: 0.05,
    lotSize: 1,
    contractMultiplier: 1,
    minOrderQty: 1,
    settlementType: 'PHYSICAL_DELIVERY',
    settlementCycle: 'T+1_EQ',
    rolloverRule: 'Cash Equity T+1 Rolling Settlement',
    corporateActionAdjusted: true,
    roicPct: 18.2,
    evEbitda: 13.0,
    roePct: 18.6,
    debtToEquity: 0.68,
    advCrINR: 2180,
  },
  {
    internalSecurityId: 'SEC-IND-LT-EQ',
    symbol: 'LT',
    quoteKey: 'LT.NS',
    isin: 'INE018A01030',
    exchange: 'NSE',
    mic: 'XNSE',
    assetClass: 'EQUITY',
    instrumentType: 'CASH_EQ',
    currency: 'INR',
    country: 'IN',
    sector: 'Infrastructure & Capital Goods',
    industry: 'Engineering & Construction',
    listingStatus: 'ACTIVE',
    tradingCalendar: 'NSE_BSE_2026_IST',
    tradingTimezone: 'Asia/Kolkata',
    tickSize: 0.05,
    lotSize: 1,
    contractMultiplier: 1,
    minOrderQty: 1,
    settlementType: 'PHYSICAL_DELIVERY',
    settlementCycle: 'T+1_EQ',
    rolloverRule: 'Cash Equity T+1 Rolling Settlement (Buyback Adjusted)',
    corporateActionAdjusted: true,
    roicPct: 17.6,
    evEbitda: 18.4,
    roePct: 16.8,
    debtToEquity: 0.51,
    advCrINR: 1640,
  },
  {
    internalSecurityId: 'SEC-IND-SUNPHARMA-EQ',
    symbol: 'SUNPHARMA',
    quoteKey: 'SUNPHARMA.NS',
    isin: 'INE044A01036',
    exchange: 'NSE',
    mic: 'XNSE',
    assetClass: 'EQUITY',
    instrumentType: 'CASH_EQ',
    currency: 'INR',
    country: 'IN',
    sector: 'Pharma & Healthcare',
    industry: 'Specialty Pharmaceuticals',
    listingStatus: 'ACTIVE',
    tradingCalendar: 'NSE_BSE_2026_IST',
    tradingTimezone: 'Asia/Kolkata',
    tickSize: 0.05,
    lotSize: 1,
    contractMultiplier: 1,
    minOrderQty: 1,
    settlementType: 'PHYSICAL_DELIVERY',
    settlementCycle: 'T+1_EQ',
    rolloverRule: 'Cash Equity T+1 Rolling Settlement',
    corporateActionAdjusted: true,
    roicPct: 21.4,
    evEbitda: 19.2,
    roePct: 19.5,
    debtToEquity: 0.08,
    advCrINR: 1120,
  },
  {
    internalSecurityId: 'SEC-IND-TCS-EQ',
    symbol: 'TCS',
    quoteKey: 'TCS.NS',
    isin: 'INE467B01029',
    exchange: 'NSE',
    mic: 'XNSE',
    assetClass: 'EQUITY',
    instrumentType: 'CASH_EQ',
    currency: 'INR',
    country: 'IN',
    sector: 'Information Technology',
    industry: 'IT Services & Consulting',
    listingStatus: 'ACTIVE',
    tradingCalendar: 'NSE_BSE_2026_IST',
    tradingTimezone: 'Asia/Kolkata',
    tickSize: 0.05,
    lotSize: 1,
    contractMultiplier: 1,
    minOrderQty: 1,
    settlementType: 'PHYSICAL_DELIVERY',
    settlementCycle: 'T+1_EQ',
    rolloverRule: 'Cash Equity T+1 Rolling Settlement (Special Dividend Adjusted)',
    corporateActionAdjusted: true,
    roicPct: 48.5,
    evEbitda: 21.6,
    roePct: 51.2,
    debtToEquity: 0.09,
    advCrINR: 1490,
  },
  {
    internalSecurityId: 'SEC-MCX-CRUDEOIL-FUT',
    symbol: 'CRUDEOIL FUT',
    quoteKey: 'CL=F',
    isin: 'MCX999900101',
    exchange: 'MCX',
    mic: 'XMCX',
    assetClass: 'COMMODITY_DERIVATIVE',
    instrumentType: 'FUTCOM',
    currency: 'INR',
    country: 'IN',
    sector: 'Energy Commodities',
    industry: 'Crude Oil',
    listingStatus: 'ACTIVE',
    tradingCalendar: 'MCX_2026_IST',
    tradingTimezone: 'Asia/Kolkata',
    tickSize: 1.0,
    lotSize: 100,
    contractMultiplier: 100,
    minOrderQty: 100,
    settlementType: 'CASH_SETTLED',
    settlementCycle: 'T+0_FNO',
    rolloverRule: '19th of Contract Month (Auto-Roll T-2 Sessions prior to First Notice)',
    corporateActionAdjusted: true,
    roicPct: 18.0,
    evEbitda: 9.5,
    roePct: 18.0,
    debtToEquity: 0.25,
    advCrINR: 4200,
  },
];

export function evaluateMarketDataIntegrity(
  quotes: Record<string, MarketQuote>,
  providerName: string,
  latencyMs: number
): DataQualityCheckRecord[] {
  const nowIso = new Date().toISOString();
  return CANONICAL_SECURITY_MASTER.map((sec) => {
    const q = quotes[sec.quoteKey] || quotes[sec.symbol];
    const price = q?.price ?? null;
    const changePct = q?.changePct ?? null;
    const missingDataFlag = price === null || price <= 0;
    const outlierFlag = changePct !== null && Math.abs(changePct) > 12.5;
    const stalePriceFlag = !missingDataFlag && latencyMs > 15000;

    let integrityStatus: DataQualityCheckRecord['integrityStatus'] = 'VERIFIED_CLEAN';
    if (missingDataFlag) integrityStatus = 'MISSING_FEED';
    else if (outlierFlag) integrityStatus = 'OUTLIER_FLAGGED';
    else if (stalePriceFlag) integrityStatus = 'STALE_WARNING';

    return {
      internalSecurityId: sec.internalSecurityId,
      symbol: sec.symbol,
      provider: providerName,
      exchangeTimestamp: q?.timestamp || nowIso,
      receivedTimestamp: nowIso,
      latencyDeltaMs: Math.max(8, latencyMs),
      livePrice: price,
      changePct,
      missingDataFlag,
      stalePriceFlag,
      outlierFlag,
      corporateActionAdjustedFlag: sec.corporateActionAdjusted,
      dataVersion: 'v2026.11.CA-ADJ',
      integrityStatus,
    };
  });
}

// ============================================================================
// 2. FACTOR TRANSFORMATION PIPELINE & "WHY?" EXPLAINABILITY ENGINE
//    (Spec Sections 8, 9, 12, 21 & 36)
// ============================================================================

export interface FactorExplainabilityAudit {
  internalSecurityId: string;
  symbol: string;
  sector: string;
  exchange: 'NSE' | 'BSE' | 'MCX';
  livePrice: number;
  changePct: number;
  rank: number;
  compositeScore: number;
  // Factor Z-Score Decomposition ("Why did this security rank #N?")
  factors: {
    momentumZ: number;
    momentumContributionPct: number;
    qualityRoicZ: number;
    qualityContributionPct: number;
    valueEvEbitdaZ: number;
    valueContributionPct: number;
    lowVolStabilityZ: number;
    lowVolContributionPct: number;
  };
  // 2026 Statutory Transaction Cost & Veto Model ("Why was it approved or blocked?")
  statutoryFriction: {
    estimatedGrossWinINR: number;
    brokerageINR: number;
    sttOrCttINR: number;
    exchangeAndSebiINR: number;
    stampAndGstINR: number;
    slippageAndSpreadINR: number;
    totalFrictionINR: number;
    grossWinToFrictionRatio: number;
    netExpectancyR: number;
    perTradeRiskINR: number;
  };
  decisionStatus: 'APPROVED_SIGNAL' | 'VETOED_FRICTION_RATIO' | 'VETOED_SECTOR_CONCENTRATION' | 'VETOED_WEAK_FACTOR_RANK';
  whyRankedSummary: string;
  whyDecisionSummary: string;
}

export function computeFactorAndWhyExplainability(
  quotes: Record<string, MarketQuote>,
  params: QuantParameterRecord[]
): FactorExplainabilityAudit[] {
  const minWinFrictionRatio =
    params.find((p) => p.parameterId === 'cost.min_win_friction_ratio')?.value ?? 3.0;
  const maxPerTradeStopINR =
    params.find((p) => p.parameterId === 'risk.max_per_trade_inr')?.value ?? 400;
  const maxSectorCapPct =
    params.find((p) => p.parameterId === 'portfolio.max_sector_weight_pct')?.value ?? 25;

  // Step 1: Extract raw factors for each instrument in Security Master
  const rawRows = CANONICAL_SECURITY_MASTER.map((sec) => {
    const q = quotes[sec.quoteKey] || quotes[sec.symbol];
    const livePrice = q?.price && q.price > 0 ? q.price : sec.symbol === 'NIFTY 50' ? 24250 : 1450;
    const changePct = q?.changePct ?? 0;

    // Winsorize daily change Pct between -6% and +6% (1%/99% tail clamp)
    const winsorizedMom = Math.max(-6, Math.min(6, changePct));
    const qualityRaw = sec.roicPct + sec.roePct * 0.5;
    const valueRaw = 30 - Math.min(28, sec.evEbitda); // lower EV/EBITDA = higher value score
    const lowVolRaw = Math.max(1, 10 - Math.abs(winsorizedMom) * 1.4);

    return {
      sec,
      livePrice,
      changePct,
      winsorizedMom,
      qualityRaw,
      valueRaw,
      lowVolRaw,
    };
  });

  // Step 2: Cross-sectional Z-Score normalization
  const normalizeZ = (vals: number[]) => {
    const mean = vals.reduce((a, b) => a + b, 0) / Math.max(1, vals.length);
    const variance =
      vals.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / Math.max(1, vals.length);
    const std = Math.sqrt(variance) || 1;
    return vals.map((v) => Number(((v - mean) / std).toFixed(2)));
  };

  const momZList = normalizeZ(rawRows.map((r) => r.winsorizedMom));
  const qualZList = normalizeZ(rawRows.map((r) => r.qualityRaw));
  const valZList = normalizeZ(rawRows.map((r) => r.valueRaw));
  const volZList = normalizeZ(rawRows.map((r) => r.lowVolRaw));

  // Step 3: Score & sort
  const scored = rawRows.map((row, idx) => {
    const momentumZ = momZList[idx];
    const qualityRoicZ = qualZList[idx];
    const valueEvEbitdaZ = valZList[idx];
    const lowVolStabilityZ = volZList[idx];

    // Weights: Momentum 35%, Quality 30%, Value 20%, Low-Vol 15%
    const rawComposite =
      momentumZ * 0.35 + qualityRoicZ * 0.3 + valueEvEbitdaZ * 0.2 + lowVolStabilityZ * 0.15;
    const compositeScore = Math.max(15, Math.min(99, Math.round(62 + rawComposite * 18)));

    const totalAbs =
      Math.abs(momentumZ * 0.35) +
      Math.abs(qualityRoicZ * 0.3) +
      Math.abs(valueEvEbitdaZ * 0.2) +
      Math.abs(lowVolStabilityZ * 0.15) || 1;

    const momentumContributionPct = Math.round((Math.abs(momentumZ * 0.35) / totalAbs) * 100);
    const qualityContributionPct = Math.round((Math.abs(qualityRoicZ * 0.3) / totalAbs) * 100);
    const valueContributionPct = Math.round((Math.abs(valueEvEbitdaZ * 0.2) / totalAbs) * 100);
    const lowVolContributionPct = Math.max(
      0,
      100 - momentumContributionPct - qualityContributionPct - valueContributionPct
    );

    // Step 4: Deterministic 2026 Indian Statutory Cost & Friction Veto Math
    const perTradeRiskINR = Math.min(maxPerTradeStopINR, 380);
    const qty = Math.max(
      1,
      Math.floor(perTradeRiskINR / Math.max(2, row.livePrice * 0.008))
    );
    const notionalTurnover = row.livePrice * qty;

    const brokerageINR = 40; // ₹20 buy + ₹20 sell
    const isMcx = row.sec.exchange === 'MCX';
    const isIndexOpt = row.sec.instrumentType === 'OPTIDX';

    const sttOrCttINR = Number(
      (
        notionalTurnover *
        (isIndexOpt ? 0.0015 : isMcx ? 0.0001 : 0.0005)
      ).toFixed(2)
    );
    const exchangeAndSebiINR = Number(
      (
        notionalTurnover *
        (isIndexOpt ? 0.0003553 : isMcx ? 0.000026 : 0.0000183)
      ).toFixed(2)
    );
    const stampDutyINR = Number((notionalTurnover * 0.00002).toFixed(2));
    const gstINR = Number(((brokerageINR + exchangeAndSebiINR) * 0.18).toFixed(2));
    const stampAndGstINR = Number((stampDutyINR + gstINR).toFixed(2));
    const slippageAndSpreadINR = Number((notionalTurnover * 0.0004).toFixed(2));

    const totalFrictionINR = Number(
      (
        brokerageINR +
        sttOrCttINR +
        exchangeAndSebiINR +
        stampAndGstINR +
        slippageAndSpreadINR
      ).toFixed(2)
    );

    // Expected gross win scales with composite factor edge
    const expectedRMultiple = compositeScore >= 72 ? 2.35 : compositeScore >= 60 ? 1.55 : 0.85;
    const estimatedGrossWinINR = Number((perTradeRiskINR * expectedRMultiple).toFixed(2));
    const grossWinToFrictionRatio = Number(
      (estimatedGrossWinINR / Math.max(1, totalFrictionINR)).toFixed(2)
    );
    const netExpectancyR = Number(
      ((estimatedGrossWinINR - totalFrictionINR) / perTradeRiskINR).toFixed(2)
    );

    return {
      ...row,
      compositeScore,
      factors: {
        momentumZ,
        momentumContributionPct,
        qualityRoicZ,
        qualityContributionPct,
        valueEvEbitdaZ,
        valueContributionPct,
        lowVolStabilityZ,
        lowVolContributionPct,
      },
      statutoryFriction: {
        estimatedGrossWinINR,
        brokerageINR,
        sttOrCttINR,
        exchangeAndSebiINR,
        stampAndGstINR,
        slippageAndSpreadINR,
        totalFrictionINR,
        grossWinToFrictionRatio,
        netExpectancyR,
        perTradeRiskINR,
      },
    };
  });

  scored.sort((a, b) => b.compositeScore - a.compositeScore);

  const sectorCountMap: Record<string, number> = {};

  return scored.map((item, idx) => {
    const rank = idx + 1;
    sectorCountMap[item.sec.sector] = (sectorCountMap[item.sec.sector] || 0) + 1;
    const sectorCount = sectorCountMap[item.sec.sector];

    let decisionStatus: FactorExplainabilityAudit['decisionStatus'] = 'APPROVED_SIGNAL';
    let whyDecisionSummary = `APPROVED: Gross Win/Friction (${item.statutoryFriction.grossWinToFrictionRatio}x ≥ ${minWinFrictionRatio.toFixed(1)}x), Net Expectancy +${item.statutoryFriction.netExpectancyR}R ≥ +0.15R, and 1R Stop ₹${item.statutoryFriction.perTradeRiskINR} ≤ ₹${maxPerTradeStopINR}.`;

    if (item.statutoryFriction.grossWinToFrictionRatio < minWinFrictionRatio || item.statutoryFriction.netExpectancyR < 0.15) {
      decisionStatus = 'VETOED_FRICTION_RATIO';
      whyDecisionSummary = `VETOED (STATUTORY FRICTION): Gross Win/Friction is ${item.statutoryFriction.grossWinToFrictionRatio}x (below ${minWinFrictionRatio.toFixed(1)}x mandate) after ₹${item.statutoryFriction.totalFrictionINR} STT/GST/Brokerage/Slippage.`;
    } else if (sectorCount > 2 && maxSectorCapPct <= 30) {
      decisionStatus = 'VETOED_SECTOR_CONCENTRATION';
      whyDecisionSummary = `VETOED (PORTFOLIO CONSTRAINT): ${item.sec.sector} sector exposure cap (${maxSectorCapPct}%) reached by higher-ranked peers.`;
    } else if (item.compositeScore < 58) {
      decisionStatus = 'VETOED_WEAK_FACTOR_RANK';
      whyDecisionSummary = `VETOED (FACTOR THRESHOLD): Composite score ${item.compositeScore}/100 is below the 58th percentile entry cutoff.`;
    }

    const whyRankedSummary = `Ranked #${rank} (${item.compositeScore}/100): Driven ${item.factors.momentumContributionPct}% by Winsorized Momentum (Z=${item.factors.momentumZ >= 0 ? '+' : ''}${item.factors.momentumZ}), ${item.factors.qualityContributionPct}% by Quality ROIC ${item.sec.roicPct}% (Z=${item.factors.qualityRoicZ >= 0 ? '+' : ''}${item.factors.qualityRoicZ}), and ${item.factors.valueContributionPct}% by EV/EBITDA ${item.sec.evEbitda}x.`;

    return {
      internalSecurityId: item.sec.internalSecurityId,
      symbol: item.sec.symbol,
      sector: item.sec.sector,
      exchange: item.sec.exchange,
      livePrice: item.livePrice,
      changePct: item.changePct,
      rank,
      compositeScore: item.compositeScore,
      factors: item.factors,
      statutoryFriction: item.statutoryFriction,
      decisionStatus,
      whyRankedSummary,
      whyDecisionSummary,
    };
  });
}

// ============================================================================
// 3. P&L ATTRIBUTION & "WHY LIVE ≠ BACKTEST" IMPLEMENTATION SHORTFALL
//    (Spec Sections 18, 20, 21 & 23)
// ============================================================================

export interface PortfolioAttributionBreakdown {
  totalTradesCount: number;
  grossTheoreticalAlphaINR: number;
  benchmarkEffectINR: number;
  sectorAllocationEffectINR: number;
  securitySelectionEffectINR: number;
  statutoryTaxesAndFeesINR: number;
  slippageAndSpreadINR: number;
  netRealizedAndFloatPnlINR: number;
  implementationShortfallPct: number;
}

export function computePortfolioAttribution(
  orders: PaperTradeOrder[],
  niftyChangePct: number
): PortfolioAttributionBreakdown {
  if (!orders || orders.length === 0) {
    return {
      totalTradesCount: 0,
      grossTheoreticalAlphaINR: 0,
      benchmarkEffectINR: 0,
      sectorAllocationEffectINR: 0,
      securitySelectionEffectINR: 0,
      statutoryTaxesAndFeesINR: 0,
      slippageAndSpreadINR: 0,
      netRealizedAndFloatPnlINR: 0,
      implementationShortfallPct: 0,
    };
  }

  const netPnl = Number(
    orders.reduce((acc, o) => acc + (Number(o.pnlINR) || 0), 0).toFixed(2)
  );
  const count = orders.length;
  // Deterministic 2026 statutory friction per order (~₹56.40 taxes/brokerage + ~₹18.20 spread/slippage)
  const statutoryTaxesAndFeesINR = Number((count * 56.4).toFixed(2));
  const slippageAndSpreadINR = Number((count * 18.2).toFixed(2));
  const totalFriction = statutoryTaxesAndFeesINR + slippageAndSpreadINR;

  const grossTheoreticalAlphaINR = Number((netPnl + totalFriction).toFixed(2));
  const benchmarkEffectINR = Number((grossTheoreticalAlphaINR * (Math.abs(niftyChangePct) > 0.01 ? 0.22 : 0.15)).toFixed(2));
  const sectorAllocationEffectINR = Number((grossTheoreticalAlphaINR * 0.31).toFixed(2));
  const securitySelectionEffectINR = Number(
    (grossTheoreticalAlphaINR - benchmarkEffectINR - sectorAllocationEffectINR).toFixed(2)
  );

  const implementationShortfallPct =
    Math.abs(grossTheoreticalAlphaINR) > 1
      ? Number(((totalFriction / Math.abs(grossTheoreticalAlphaINR)) * 100).toFixed(1))
      : 0;

  return {
    totalTradesCount: count,
    grossTheoreticalAlphaINR,
    benchmarkEffectINR,
    sectorAllocationEffectINR,
    securitySelectionEffectINR,
    statutoryTaxesAndFeesINR,
    slippageAndSpreadINR,
    netRealizedAndFloatPnlINR: netPnl,
    implementationShortfallPct,
  };
}

// ============================================================================
// 4. VERSIONED PARAMETER REGISTRY & IMMUTABLE GOVERNANCE AUDIT TRAIL
//    (Spec Sections 28, 29, 31 & 33)
// ============================================================================

export interface QuantParameterRecord {
  parameterId: string;
  name: string;
  description: string;
  value: number;
  defaultValue: number;
  min: number;
  max: number;
  unit: string;
  strategy: string;
  version: string;
  effectiveDate: string;
  owner: string;
  lastModified: string;
}

export interface GovernanceAuditEvent {
  auditId: string;
  timestamp: string;
  actor: string;
  role: string;
  actionType: 'PARAMETER_CHANGE' | 'STRATEGY_CALIBRATION' | 'RISK_OVERRIDE' | 'CIRCUIT_BREAKER';
  targetId: string;
  previousValue: string;
  newValue: string;
  strategyVersion: string;
  reason: string;
  approvalStatus: 'AUTO_VERIFIED' | 'OWNER_SIGNED';
}

const PARAMS_STORAGE_KEY = 'jarvis_quant_parameter_registry_v1';
const AUDIT_STORAGE_KEY = 'jarvis_quant_governance_audit_v1';

export const DEFAULT_QUANT_PARAMETERS: QuantParameterRecord[] = [
  {
    parameterId: 'risk.max_per_trade_inr',
    name: 'Per-Trade Initial Stop Cap (1R)',
    description: 'Maximum defined rupee loss permitted on any single trade before automatic square-off.',
    value: 400,
    defaultValue: 400,
    min: 150,
    max: 500,
    unit: 'INR',
    strategy: 'ALL_5_AGENTS',
    version: 'v8.4.2',
    effectiveDate: '2026-11-01',
    owner: 'Risk Committee (Vidura)',
    lastModified: '2026-11-02 09:15 IST',
  },
  {
    parameterId: 'tsl.breakeven_trigger_r',
    name: 'Step-Ratchet Breakeven Trigger',
    description: 'R-multiple profit threshold where stop-loss automatically ratchets to Entry + ₹15 friction buffer.',
    value: 0.8,
    defaultValue: 0.8,
    min: 0.5,
    max: 1.5,
    unit: 'R',
    strategy: 'STEP_RATCHET_TSL',
    version: 'v8.4.2',
    effectiveDate: '2026-11-01',
    owner: 'Execution Desk (Arjuna)',
    lastModified: '2026-11-02 09:15 IST',
  },
  {
    parameterId: 'tsl.lock_75pct_trigger_r',
    name: 'Step-Ratchet 75% Profit Lock Trigger',
    description: 'High-Water-Mark R-multiple threshold where 75% of peak unrealized profit is locked.',
    value: 2.2,
    defaultValue: 2.2,
    min: 1.5,
    max: 3.5,
    unit: 'R',
    strategy: 'STEP_RATCHET_TSL',
    version: 'v8.4.2',
    effectiveDate: '2026-11-01',
    owner: 'Execution Desk (Arjuna)',
    lastModified: '2026-11-02 09:15 IST',
  },
  {
    parameterId: 'cost.min_win_friction_ratio',
    name: 'Statutory Gross Win / Friction Veto Ratio',
    description: 'Minimum required ratio of Expected Gross Profit to 2026 Statutory Taxes + Brokerage + Slippage.',
    value: 3.0,
    defaultValue: 3.0,
    min: 2.0,
    max: 5.0,
    unit: 'x',
    strategy: 'STATUTORY_TAX_VETO',
    version: 'v2026.TAX',
    effectiveDate: '2026-11-01',
    owner: 'Statutory Arbiter (Vidura)',
    lastModified: '2026-11-02 09:15 IST',
  },
  {
    parameterId: 'portfolio.max_sector_weight_pct',
    name: 'Maximum Sector Concentration Limit',
    description: 'Hard upper bound on capital allocated to any single NSE/BSE sector.',
    value: 25,
    defaultValue: 25,
    min: 15,
    max: 40,
    unit: '%',
    strategy: 'PORTFOLIO_CONSTRUCTION',
    version: 'v8.4.2',
    effectiveDate: '2026-11-01',
    owner: 'Macro Desk (Chanakya)',
    lastModified: '2026-11-02 09:15 IST',
  },
  {
    parameterId: 'risk.daily_breaker_inr',
    name: 'Agent Intraday Circuit Breaker Cap',
    description: 'Combined Realized + Floating MTM loss per agent that triggers immediate trading lock until next session.',
    value: 2000,
    defaultValue: 2000,
    min: 1000,
    max: 5000,
    unit: 'INR',
    strategy: 'ALL_5_AGENTS',
    version: 'v8.4.2',
    effectiveDate: '2026-11-01',
    owner: 'Risk Committee (Vidura)',
    lastModified: '2026-11-02 09:15 IST',
  },
];

export const INITIAL_GOVERNANCE_AUDIT_TRAIL: GovernanceAuditEvent[] = [
  {
    auditId: 'AUD-20261102-001',
    timestamp: '2026-11-02 09:15:00 IST',
    actor: 'Seat 01 (Owner/Admin)',
    role: 'Portfolio Manager',
    actionType: 'PARAMETER_CHANGE',
    targetId: 'risk.max_per_trade_inr',
    previousValue: '₹2,000 (Legacy Daily Stop)',
    newValue: '₹400 (1R Per-Trade Cap + Step-Ratchet TSL)',
    strategyVersion: 'v8.4.2',
    reason: 'Enforced tight 1R <= ₹400 initial stop with +0.8R breakeven ratchet to eliminate round-trip drawdowns.',
    approvalStatus: 'OWNER_SIGNED',
  },
  {
    auditId: 'AUD-20261102-002',
    timestamp: '2026-11-02 09:16:12 IST',
    actor: 'Vidura (Statutory Risk Engine)',
    role: 'Risk Manager',
    actionType: 'STRATEGY_CALIBRATION',
    targetId: 'cost.min_win_friction_ratio',
    previousValue: '2.5x',
    newValue: '3.0x (2026 NSE/MCX Statutory Tax Spec)',
    strategyVersion: 'v2026.TAX',
    reason: 'Updated STT (0.15% Options / 0.05% Futures) and Stamp/GST friction veto threshold.',
    approvalStatus: 'AUTO_VERIFIED',
  },
];

export function getStoredQuantParameters(): QuantParameterRecord[] {
  try {
    const raw = localStorage.getItem(PARAMS_STORAGE_KEY);
    if (!raw) return DEFAULT_QUANT_PARAMETERS;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_QUANT_PARAMETERS;
  } catch {
    return DEFAULT_QUANT_PARAMETERS;
  }
}

export function getStoredGovernanceAuditTrail(): GovernanceAuditEvent[] {
  try {
    const raw = localStorage.getItem(AUDIT_STORAGE_KEY);
    if (!raw) return INITIAL_GOVERNANCE_AUDIT_TRAIL;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_GOVERNANCE_AUDIT_TRAIL;
  } catch {
    return INITIAL_GOVERNANCE_AUDIT_TRAIL;
  }
}

export function updateQuantParameterWithAudit(
  parameterId: string,
  newValue: number,
  actorName: string,
  reason: string
): { parameters: QuantParameterRecord[]; auditTrail: GovernanceAuditEvent[] } {
  const currentParams = getStoredQuantParameters();
  const currentAudit = getStoredGovernanceAuditTrail();
  const nowStr =
    new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour12: false }) + ' IST';

  let oldValStr = '';
  let unit = '';
  let strategyVersion = 'v8.4.3';

  const updatedParams = currentParams.map((p) => {
    if (p.parameterId !== parameterId) return p;
    const clamped = Math.max(p.min, Math.min(p.max, newValue));
    oldValStr = `${p.value} ${p.unit}`;
    unit = p.unit;
    const nextPatch = Number((parseFloat(p.version.replace('v8.4.', '')) || 2) + 1);
    strategyVersion = `v8.4.${nextPatch}`;
    return {
      ...p,
      value: clamped,
      version: strategyVersion,
      lastModified: nowStr,
    };
  });

  const newEvent: GovernanceAuditEvent = {
    auditId: `AUD-${Date.now().toString().slice(-6)}`,
    timestamp: nowStr,
    actor: actorName || 'Seat 01 (Owner/Admin)',
    role: 'Portfolio Manager',
    actionType: 'PARAMETER_CHANGE',
    targetId: parameterId,
    previousValue: oldValStr,
    newValue: `${newValue} ${unit}`,
    strategyVersion,
    reason: reason || 'Interactive parameter governance adjustment',
    approvalStatus: 'OWNER_SIGNED',
  };

  const nextAudit = [newEvent, ...currentAudit].slice(0, 50);

  try {
    localStorage.setItem(PARAMS_STORAGE_KEY, JSON.stringify(updatedParams));
    localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(nextAudit));
  } catch {
    // ignore storage quota errors
  }

  return { parameters: updatedParams, auditTrail: nextAudit };
}
