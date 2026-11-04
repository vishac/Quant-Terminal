// ============================================================================
// DETERMINISTIC INSTITUTIONAL TRADE SETUP & 2026 STATUTORY TAX BLUEPRINT ENGINE
// Pure browser- and server-safe module (zero Node fs/path dependencies)
// ============================================================================

export type SetupInstrumentMode = 'CASH_CNC' | 'INTRADAY_MIS' | 'NSE_FUTURES' | 'NSE_OPTION';

export interface StatutoryTaxBreakdown2026 {
  brokerage: number;
  stt: number;
  exchangeAndIpft: number;
  sebiFee: number;
  stampDuty: number;
  gst18: number;
  totalFriction: number;
  grossWinAtTarget2: number;
  netWinAfterTax: number;
  grossRiskAtStop: number;
  netLossAtStopAfterTax: number;
  grossWinToFrictionRatio: number;
  netExpectancyR: number;
  isVetoed: boolean;
  vetoReason: string | null;
}

export interface InstitutionalStockSetupBlueprint {
  symbol: string;
  baseTicker: string;
  name: string;
  sector: string;
  direction: 'RISE' | 'FALL';
  instrumentMode: SetupInstrumentMode;
  instrumentLabel: string;
  contractSymbol: string;
  side: 'BUY' | 'SELL';
  lotSize: number;
  lotsCount: number;
  quantity: number;
  spotEntryPrice: number;
  instrumentEntryPrice: number;
  target1Price: number;
  target2Price: number;
  stopLossPrice: number;
  instrumentTarget1: number;
  instrumentTarget2: number;
  instrumentStopLoss: number;
  rewardToRiskRatio: number;
  capitalBase: number;
  cppiFloor92: number;
  cppiRiskCushion8: number;
  onePctRiskRupees: number;
  quarterKellyFractionPct: number;
  quarterKellyRiskRupees: number;
  marginRequired: number;
  taxAudit: StatutoryTaxBreakdown2026;
}

const NSE_FNO_LOT_SIZES: Record<string, number> = {
  ULTRACEMCO: 50,
  LT: 150,
  INDIACEM: 1900,
  ADANIPORTS: 400,
  CIPLA: 650,
  SUNPHARMA: 350,
  DRREDDY: 625,
  APOLLOHOSP: 125,
  ICICIBANK: 700,
  SBIN: 750,
  AXISBANK: 625,
  KOTAKBANK: 400,
  HDFCBANK: 550,
  NTPC: 1500,
  POWERGRID: 1800,
  ONGC: 1925,
  RELIANCE: 500,
  ITC: 1600,
  HINDUNILVR: 300,
  TITAN: 175,
  'M&M': 175,
  MARUTI: 50,
  TATAMOTORS: 550,
  TATASTEEL: 5500,
  HINDALCO: 1400,
  JSWSTEEL: 675,
  INFY: 400,
  TCS: 175,
  WIPRO: 1500,
  ASIANPAINT: 200,
  INDIGO: 150,
  BPCL: 1800,
};

export function computeInstitutionalStockSetupBlueprint(params: {
  symbol: string;
  name: string;
  sector: string;
  direction: 'RISE' | 'FALL';
  livePrice: number;
  targetPrice: number;
  stopLossPrice: number;
  capitalBase: number;
  instrumentMode: SetupInstrumentMode;
  sizingMethod: 'ONE_PCT_RISK' | 'QUARTER_KELLY';
}): InstitutionalStockSetupBlueprint {
  const {
    symbol,
    name,
    sector,
    direction,
    livePrice,
    targetPrice,
    stopLossPrice,
    capitalBase,
    instrumentMode,
    sizingMethod,
  } = params;

  const baseTicker = symbol.replace('.NS', '');
  const spotEntry = Number(Math.max(1, livePrice).toFixed(2));
  const rawStopDist = Math.max(spotEntry * 0.008, Math.abs(spotEntry - stopLossPrice));
  const rawTargetDist = Math.max(rawStopDist * 1.6, Math.abs(targetPrice - spotEntry));

  const spotStopLoss = Number(
    (direction === 'RISE' ? spotEntry - rawStopDist : spotEntry + rawStopDist).toFixed(2),
  );
  const spotTarget1 = Number(
    (direction === 'RISE' ? spotEntry + rawStopDist * 1.5 : spotEntry - rawStopDist * 1.5).toFixed(2),
  );
  const spotTarget2 = Number(
    (direction === 'RISE' ? spotEntry + rawTargetDist : spotEntry - rawTargetDist).toFixed(2),
  );

  const rewardToRiskRatio = Number((rawTargetDist / rawStopDist).toFixed(2));

  // CPPI (92% Floor, 8% Cushion) + Quarter-Kelly
  const cppiFloor92 = Math.round(capitalBase * 0.92);
  const cppiRiskCushion8 = Math.max(0, capitalBase - cppiFloor92);
  const onePctRiskRupees = Math.round(capitalBase * 0.01);

  const winProb = 0.58;
  const lossProb = 1 - winProb;
  const fullKelly = Math.max(0.04, (rewardToRiskRatio * winProb - lossProb) / Math.max(0.5, rewardToRiskRatio));
  const quarterKelly = Number((0.25 * fullKelly).toFixed(4));
  const quarterKellyRiskRupees = Math.max(250, Math.round(cppiRiskCushion8 * quarterKelly));

  const activeRiskBudget = sizingMethod === 'QUARTER_KELLY' ? quarterKellyRiskRupees : onePctRiskRupees;

  const standardLot = NSE_FNO_LOT_SIZES[baseTicker] || Math.max(50, Math.round(500000 / spotEntry / 25) * 25);

  let lotSize = 1;
  let lotsCount = 1;
  let quantity = 1;
  let instrumentEntryPrice = spotEntry;
  let instrumentTarget1 = spotTarget1;
  let instrumentTarget2 = spotTarget2;
  let instrumentStopLoss = spotStopLoss;
  let marginRequired = 0;
  let contractSymbol = baseTicker;
  let instrumentLabel = 'NSE Cash Delivery (CNC)';
  let side: 'BUY' | 'SELL' = direction === 'RISE' ? 'BUY' : 'SELL';

  if (instrumentMode === 'CASH_CNC') {
    lotSize = 1;
    quantity = Math.max(1, Math.floor(activeRiskBudget / rawStopDist));
    // Cap total delivery outlay at 40% of capitalBase so single position doesn't exceed cash
    const maxCashQty = Math.max(1, Math.floor((capitalBase * 0.4) / spotEntry));
    quantity = Math.min(quantity, maxCashQty);
    lotsCount = quantity;
    marginRequired = Math.round(quantity * spotEntry);
    contractSymbol = `${baseTicker} (CNC)`;
    instrumentLabel = direction === 'RISE' ? 'NSE Cash Delivery (CNC 1x)' : 'NSE Cash Exit / Intraday Short';
  } else if (instrumentMode === 'INTRADAY_MIS') {
    lotSize = 1;
    quantity = Math.max(1, Math.floor(activeRiskBudget / rawStopDist));
    const maxMisQty = Math.max(1, Math.floor((capitalBase * 1.5) / spotEntry));
    quantity = Math.min(quantity, maxMisQty);
    lotsCount = quantity;
    marginRequired = Math.round((quantity * spotEntry) / 5); // 5x MIS leverage (20% margin)
    contractSymbol = `${baseTicker} (MIS 5x)`;
    instrumentLabel = 'NSE Intraday Margin (MIS 20% Margin)';
  } else if (instrumentMode === 'NSE_FUTURES') {
    lotSize = standardLot;
    const idealQty = Math.max(lotSize, Math.floor(activeRiskBudget / rawStopDist));
    lotsCount = Math.max(1, Math.round(idealQty / lotSize));
    quantity = lotsCount * lotSize;
    marginRequired = Math.round(quantity * spotEntry * 0.22); // ~22% SPAN + Exposure
    contractSymbol = `${baseTicker} FUT`;
    instrumentLabel = `NSE Equity Futures (Lot: ${lotSize})`;
  } else {
    // NSE_OPTION (ATM Call for RISE, ATM Put for FALL — always BUY defined-risk option)
    lotSize = standardLot;
    side = 'BUY';
    const step = spotEntry > 2500 ? 50 : spotEntry > 1000 ? 20 : spotEntry > 400 ? 10 : 5;
    const atmStrike = Math.round(spotEntry / step) * step;
    const optType = direction === 'RISE' ? 'CE' : 'PE';
    const approxAtmPremium = Number(Math.max(4, spotEntry * 0.024).toFixed(2));
    const delta = 0.52;
    const optStopDist = Number(Math.max(1.5, rawStopDist * delta).toFixed(2));
    const optTarget1Dist = Number((rawStopDist * 1.5 * delta).toFixed(2));
    const optTarget2Dist = Number((rawTargetDist * delta).toFixed(2));

    instrumentEntryPrice = approxAtmPremium;
    instrumentStopLoss = Number(Math.max(0.5, approxAtmPremium - optStopDist).toFixed(2));
    instrumentTarget1 = Number((approxAtmPremium + optTarget1Dist).toFixed(2));
    instrumentTarget2 = Number((approxAtmPremium + optTarget2Dist).toFixed(2));

    const riskPerLot = optStopDist * lotSize;
    lotsCount = Math.max(1, Math.floor(activeRiskBudget / Math.max(1, riskPerLot)));
    quantity = lotsCount * lotSize;
    marginRequired = Math.round(quantity * instrumentEntryPrice);
    contractSymbol = `${baseTicker} ${atmStrike} ${optType}`;
    instrumentLabel = `NSE ATM ${optType} Option (Lot: ${lotSize})`;
  }

  // 2026 Indian Statutory Tax & Brokerage Calculation
  const buyPrice = side === 'BUY' ? instrumentEntryPrice : instrumentTarget2;
  const sellPrice = side === 'BUY' ? instrumentTarget2 : instrumentEntryPrice;
  const buyTurnover = buyPrice * quantity;
  const sellTurnover = sellPrice * quantity;
  const totalTurnover = buyTurnover + sellTurnover;

  const brokerage = 40; // ₹20 flat per executed order * 2 legs
  let stt = 0;
  let exchangeAndIpft = 0;
  let stampDuty = 0;

  if (instrumentMode === 'CASH_CNC') {
    stt = totalTurnover * 0.001; // 0.1% on both buy and sell for delivery
    exchangeAndIpft = totalTurnover * 0.0000322;
    stampDuty = buyTurnover * 0.00015; // 0.015% on delivery buy
  } else if (instrumentMode === 'INTRADAY_MIS') {
    stt = sellTurnover * 0.00025; // 0.025% on sell leg
    exchangeAndIpft = totalTurnover * 0.0000322;
    stampDuty = buyTurnover * 0.00003; // 0.003% on intraday buy
  } else if (instrumentMode === 'NSE_FUTURES') {
    stt = sellTurnover * 0.0005; // 2026 NSE Equity Futures STT: 0.05% on sell
    exchangeAndIpft = totalTurnover * 0.0000183; // 0.00183%
    stampDuty = buyTurnover * 0.00002; // 0.002% on buy
  } else {
    // NSE Equity Options (on premium turnover)
    stt = sellTurnover * 0.0015; // 2026 NSE Equity Options STT: 0.15% on sell premium
    exchangeAndIpft = totalTurnover * 0.0003553; // 0.03553%
    stampDuty = buyTurnover * 0.00003; // 0.003% on buy premium
  }

  const sebiFee = totalTurnover * 0.000001; // ₹10 per Crore
  const gst18 = 0.18 * (brokerage + exchangeAndIpft + sebiFee);
  const totalFriction = Number((brokerage + stt + exchangeAndIpft + sebiFee + stampDuty + gst18).toFixed(2));

  const perUnitWin = Math.abs(instrumentTarget2 - instrumentEntryPrice);
  const perUnitRisk = Math.max(0.05, Math.abs(instrumentEntryPrice - instrumentStopLoss));
  const grossWinAtTarget2 = Number((perUnitWin * quantity).toFixed(2));
  const grossRiskAtStop = Number((perUnitRisk * quantity).toFixed(2));
  const netWinAfterTax = Number((grossWinAtTarget2 - totalFriction).toFixed(2));
  const netLossAtStopAfterTax = Number((grossRiskAtStop + totalFriction).toFixed(2));

  const grossWinToFrictionRatio = Number(
    (grossWinAtTarget2 / Math.max(1, totalFriction)).toFixed(2),
  );

  // Net Expectancy in R: (p * netWin - q * netLoss) / grossRisk
  const expectedNetRupees = winProb * netWinAfterTax - lossProb * netLossAtStopAfterTax;
  const netExpectancyR = Number((expectedNetRupees / Math.max(1, grossRiskAtStop)).toFixed(2));

  const isVetoed = grossWinToFrictionRatio < 3.0 || netExpectancyR < 0.15;
  const vetoReason = isVetoed
    ? grossWinToFrictionRatio < 3.0
      ? `Statutory Friction Veto: Gross Win / Friction is ${grossWinToFrictionRatio}x (Minimum required: 3.0x). Increase capital/quantity or switch instrument.`
      : `Expectancy Veto: Net-of-Tax Expectancy is ${netExpectancyR}R (Minimum required: +0.15R).`
    : null;

  return {
    symbol,
    baseTicker,
    name,
    sector,
    direction,
    instrumentMode,
    instrumentLabel,
    contractSymbol,
    side,
    lotSize,
    lotsCount,
    quantity,
    spotEntryPrice: spotEntry,
    instrumentEntryPrice,
    target1Price: spotTarget1,
    target2Price: spotTarget2,
    stopLossPrice: spotStopLoss,
    instrumentTarget1,
    instrumentTarget2,
    instrumentStopLoss,
    rewardToRiskRatio,
    capitalBase,
    cppiFloor92,
    cppiRiskCushion8,
    onePctRiskRupees,
    quarterKellyFractionPct: Number((quarterKelly * 100).toFixed(2)),
    quarterKellyRiskRupees,
    marginRequired,
    taxAudit: {
      brokerage: Number(brokerage.toFixed(2)),
      stt: Number(stt.toFixed(2)),
      exchangeAndIpft: Number(exchangeAndIpft.toFixed(2)),
      sebiFee: Number(sebiFee.toFixed(2)),
      stampDuty: Number(stampDuty.toFixed(2)),
      gst18: Number(gst18.toFixed(2)),
      totalFriction,
      grossWinAtTarget2,
      netWinAfterTax,
      grossRiskAtStop,
      netLossAtStopAfterTax,
      grossWinToFrictionRatio,
      netExpectancyR,
      isVetoed,
      vetoReason,
    },
  };
}
