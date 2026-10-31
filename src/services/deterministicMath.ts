import {
  Segment,
  MarketRegime,
  TradeSide,
  StatutoryRates,
  InstrumentSpec,
  OptionGreeks,
  RegimeDiagnostics,
  TripleBarrierSpec,
  TaxAuditResult,
  TerminalAccountState
} from '../types/quant_engine';

export const STATUTORY_CONFIG_2026: Record<Segment, StatutoryRates> = {
  [Segment.NSE_FUT]: {
    stt_ctt_sell: 0.0005,
    exchange_ipft: 0.0000183,
    sebi_fee: 0.000001,
    stamp_duty_buy: 0.00002,
    gst_rate: 0.18,
    flat_brokerage: 20.0,
  },
  [Segment.NSE_OPT]: {
    stt_ctt_sell: 0.0015,
    exchange_ipft: 0.0003553,
    sebi_fee: 0.000001,
    stamp_duty_buy: 0.00003,
    gst_rate: 0.18,
    flat_brokerage: 20.0,
  },
  [Segment.MCX_FUT]: {
    stt_ctt_sell: 0.0001,
    exchange_ipft: 0.000026,
    sebi_fee: 0.000001,
    stamp_duty_buy: 0.00002,
    gst_rate: 0.18,
    flat_brokerage: 20.0,
  },
  [Segment.MCX_OPT]: {
    stt_ctt_sell: 0.0005,
    exchange_ipft: 0.000418,
    sebi_fee: 0.000001,
    stamp_duty_buy: 0.00003,
    gst_rate: 0.18,
    flat_brokerage: 20.0,
  },
};

export class DeterministicQuantEngine {
  /**
   * Garman-Klass Volatility: 7.4x more efficient than close-to-close std dev.
   */
  public static calculateGarmanKlass(
    opens: number[],
    highs: number[],
    lows: number[],
    closes: number[]
  ): number {
    const n = closes.length;
    if (n === 0) return 0.0;

    let sumVar = 0.0;
    for (let i = 0; i < n; i++) {
      const logHL = Math.log(Math.max(highs[i], 1e-6) / Math.max(lows[i], 1e-6));
      const logCO = Math.log(Math.max(closes[i], 1e-6) / Math.max(opens[i], 1e-6));
      const variance = 0.5 * Math.pow(logHL, 2) - (2.0 * Math.LN2 - 1.0) * Math.pow(logCO, 2);
      sumVar += Math.max(variance, 0.0);
    }
    return Math.sqrt(sumVar / n);
  }

  /**
   * Kaufman Efficiency Ratio (ER): Speed of displacement / Noise
   */
  public static calculateEfficiencyRatio(closes: number[]): number {
    if (closes.length < 2) return 0.0;
    const netChange = Math.abs(closes[closes.length - 1] - closes[0]);
    let pathLength = 0.0;
    for (let i = 1; i < closes.length; i++) {
      pathLength += Math.abs(closes[i] - closes[i - 1]);
    }
    return pathLength > 1e-8 ? netChange / pathLength : 0.0;
  }

  /**
   * 4-State Regime Classifier: Evaluates volatility ratio, ER, and basis divergence.
   */
  public static classifyRegime(
    gkFast: number,
    gkSlow: number,
    ivCurrent: number,
    ivBaseline: number,
    er: number,
    obi: number,
    basisZ: number,
    macroOverride: boolean
  ): RegimeDiagnostics {
    const ivExpansion = Math.max(0.0, (ivCurrent - ivBaseline) / Math.max(ivBaseline, 1e-4));
    const volRatio = (gkFast / Math.max(gkSlow, 1e-8)) * (1.0 + ivExpansion);

    let regime: MarketRegime;
    if (macroOverride || volRatio >= 1.85 || Math.abs(basisZ) >= 2.5) {
      regime = MarketRegime.SHOCK;
    } else if (volRatio < 0.75) {
      regime = MarketRegime.CHOP;
    } else if (er >= 0.42 && Math.abs(obi) >= 0.25) {
      regime = MarketRegime.TREND;
    } else if (volRatio <= 1.15 && er <= 0.25 && Math.abs(obi) <= 0.15) {
      regime = MarketRegime.RANGE;
    } else {
      regime = MarketRegime.CHOP;
    }

    return {
      regime,
      volRatio: Number(volRatio.toFixed(4)),
      efficiencyRatio: Number(er.toFixed(4)),
      obiScore: Number(obi.toFixed(4)),
      basisZScore: Number(basisZ.toFixed(4)),
      garmanKlassVol: Number(gkFast.toFixed(6)),
    };
  }

  /**
   * Calculates round-trip statutory costs based on 2026 Indian tax laws.
   */
  public static calculateFriction(
    spec: InstrumentSpec,
    buyPrice: number,
    sellPrice: number,
    lots: number
  ): { statutoryINR: number; slippageINR: number; totalINR: number } {
    const rates = STATUTORY_CONFIG_2026[spec.segment];
    const qty = lots * spec.lotSize;
    const buyTurnover = qty * buyPrice;
    const sellTurnover = qty * sellPrice;
    const totalTurnover = buyTurnover + sellTurnover;

    const brokerage = rates.flat_brokerage * 2; // Flat ₹20 buy + ₹20 sell
    const stt = sellTurnover * rates.stt_ctt_sell;
    const exch = totalTurnover * rates.exchange_ipft;
    const sebi = totalTurnover * rates.sebi_fee;
    const stamp = buyTurnover * rates.stamp_duty_buy;
    const gst = rates.gst_rate * (brokerage + exch + sebi);

    const statutoryINR = brokerage + stt + exch + sebi + stamp + gst;
    const slippageINR = qty * spec.slippageTicks * spec.tickSize;

    return {
      statutoryINR: Number(statutoryINR.toFixed(2)),
      slippageINR: Number(slippageINR.toFixed(2)),
      totalINR: Number((statutoryINR + slippageINR).toFixed(2)),
    };
  }

  /**
   * Net-of-Tax Expectancy Gatekeeper: Vetoes trades failing statutory edge bounds.
   */
  public static auditTradeExpectancy(
    account: TerminalAccountState,
    spec: InstrumentSpec,
    order: TripleBarrierSpec,
    calibratedWinProb: number
  ): TaxAuditResult {
    if (account.killSwitchEngaged) {
      return {
        approved: false,
        rejectionReason: 'KILL_SWITCH_ACTIVE: Circuit breaker engaged. Trading locked.',
        grossWinINR: 0,
        grossLossINR: 0,
        statutoryTotalINR: 0,
        slippageINR: 0,
        totalFrictionINR: 0,
        rewardToFrictionRatio: 0,
        netExpectancyINR: 0,
        breakEvenProbability: 1.0,
      };
    }

    const qty = order.lots * spec.lotSize;
    const grossWinINR = qty * Math.abs(order.profitTakeBarrier - order.entryPrice);
    const grossLossINR = qty * Math.abs(order.entryPrice - order.stopLossBarrier);

    // Exact outcome-specific pricing for conservative statutory friction auditing
    const buyP_win = order.side === TradeSide.LONG ? order.entryPrice : order.profitTakeBarrier;
    const sellP_win = order.side === TradeSide.LONG ? order.profitTakeBarrier : order.entryPrice;
    const frictionWin = this.calculateFriction(spec, buyP_win, sellP_win, order.lots);

    const buyP_loss = order.side === TradeSide.LONG ? order.entryPrice : order.stopLossBarrier;
    const sellP_loss = order.side === TradeSide.LONG ? order.stopLossBarrier : order.entryPrice;
    const frictionLoss = this.calculateFriction(spec, buyP_loss, sellP_loss, order.lots);

    const totalFrictionINR = Math.max(frictionWin.totalINR, frictionLoss.totalINR);
    const statutoryTotalINR = Math.max(frictionWin.statutoryINR, frictionLoss.statutoryINR);
    const slippageINR = Math.max(frictionWin.slippageINR, frictionLoss.slippageINR);

    const rewardToFriction = grossWinINR / Math.max(totalFrictionINR, 1e-4);

    const netExpectancy =
      calibratedWinProb * (grossWinINR - frictionWin.totalINR) -
      (1.0 - calibratedWinProb) * (grossLossINR + frictionLoss.totalINR);

    const breakEvenProb =
      (grossLossINR + frictionLoss.totalINR) /
      Math.max((grossWinINR - frictionWin.totalINR) + (grossLossINR + frictionLoss.totalINR), 1e-4);

    if (rewardToFriction < 3.0) {
      return {
        approved: false,
        rejectionReason: `FRICTION_VETO: Win/Friction ratio (${rewardToFriction.toFixed(2)}) < 3.0x threshold.`,
        grossWinINR: Number(grossWinINR.toFixed(2)),
        grossLossINR: Number(grossLossINR.toFixed(2)),
        statutoryTotalINR: Number(statutoryTotalINR.toFixed(2)),
        slippageINR: Number(slippageINR.toFixed(2)),
        totalFrictionINR: Number(totalFrictionINR.toFixed(2)),
        rewardToFrictionRatio: Number(rewardToFriction.toFixed(2)),
        netExpectancyINR: Number(netExpectancy.toFixed(2)),
        breakEvenProbability: Number(breakEvenProb.toFixed(4)),
      };
    }

    if (netExpectancy < 0.15 * grossLossINR) {
      return {
        approved: false,
        rejectionReason: `EXPECTANCY_VETO: Net expectancy (${netExpectancy.toFixed(2)} INR) < +0.15R floor.`,
        grossWinINR: Number(grossWinINR.toFixed(2)),
        grossLossINR: Number(grossLossINR.toFixed(2)),
        statutoryTotalINR: Number(statutoryTotalINR.toFixed(2)),
        slippageINR: Number(slippageINR.toFixed(2)),
        totalFrictionINR: Number(totalFrictionINR.toFixed(2)),
        rewardToFrictionRatio: Number(rewardToFriction.toFixed(2)),
        netExpectancyINR: Number(netExpectancy.toFixed(2)),
        breakEvenProbability: Number(breakEvenProb.toFixed(4)),
      };
    }

    return {
      approved: true,
      rejectionReason: null,
      grossWinINR: Number(grossWinINR.toFixed(2)),
      grossLossINR: Number(grossLossINR.toFixed(2)),
      statutoryTotalINR: Number(statutoryTotalINR.toFixed(2)),
      slippageINR: Number(slippageINR.toFixed(2)),
      totalFrictionINR: Number(totalFrictionINR.toFixed(2)),
      rewardToFrictionRatio: Number(rewardToFriction.toFixed(2)),
      netExpectancyINR: Number(netExpectancy.toFixed(2)),
      breakEvenProbability: Number(breakEvenProb.toFixed(4)),
    };
  }

  /**
   * CPPI + Quarter-Kelly Position Sizer: Locks hard floor to preserve capital.
   * Mandate: Evaluates continuous Mark-To-Market equity including floating drawdowns.
   */
  public static calculateSafeLots(
    account: TerminalAccountState,
    winProb: number,
    netWinPerLot: number,
    netLossPerLot: number
  ): number {
    if (account.killSwitchEngaged) return 0;
    if (account.capitalAllocated === null || account.capitalAllocated <= 0) return 0;

    // True Net Liquidation Equity: Floating drawdowns actively erode the cushion
    const currentEquity = account.capitalAllocated + account.realizedPnL + Math.min(0, account.unrealizedPnL);
    const cushion = currentEquity - account.hardFloorINR;
    if (cushion <= 0 || netLossPerLot <= 0 || netWinPerLot <= 0) return 0;

    const b = netWinPerLot / netLossPerLot;
    const fullKelly = winProb - (1.0 - winProb) / b;
    if (fullKelly <= 0) return 0;

    const safeRiskBudget = cushion * (fullKelly * 0.25); // Quarter-Kelly on remaining cushion
    return Math.max(0, Math.floor(safeRiskBudget / netLossPerLot));
  }
}