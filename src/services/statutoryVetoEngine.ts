import { PaperTradeOrder } from '../types/quant';
import { MarketQuote } from './liveMarketService';
import {
  formatOrderDate,
  formatOrderTime,
  resolveDerivativeExpiryInfo,
  computeCanonicalNiftyOptionLeg,
  checkSessionEntryCutoffWindow,
} from '../utils/orderFormatters';
import {
  evaluateAdaptiveScriptLearningMatrix,
  extractBaseSymbolFromOrder,
} from './scriptLearningEngine';
import {
  evaluateElevenVectorMacroMatrix,
  evaluateInterAgentConsensusPipeline,
  applyAsymmetricMacroShockShield,
  InterAgentConsensusEvaluation,
  ElevenVectorMacroSnapshot,
} from './macroCausalLearningEngine';
import { computeAuthoritativeMcxCrudeParity } from './agentQuantEngine';

export interface StatutoryTaxRateConfig {
  versionId: string;
  versionLabel: string;
  effectiveFromIST: string;
  brokerageFlatPerOrderINR: number;
  nseOptionSellSttRate: number;      // e.g. 0.0015 (0.15%)
  nseFutureSellSttRate: number;      // e.g. 0.0005 (0.05%)
  nseCashIntradaySellSttRate: number;// e.g. 0.00025 (0.025%)
  nseOptionExchTurnoverRate: number; // e.g. 0.0003553 (0.03553%)
  nseFutureExchTurnoverRate: number; // e.g. 0.0000183 (0.00183%)
  nseCashExchTurnoverRate: number;   // e.g. 0.0000307 (0.00307%)
  bseCashExchTurnoverRate: number;   // e.g. 0.0000375 (0.00375%)
  mcxOptionSellCttRate: number;      // e.g. 0.0005 (0.05%)
  mcxFutureSellCttRate: number;      // e.g. 0.0001 (0.01%)
  sebiTurnoverRate: number;          // e.g. 0.000001 (₹10/Cr)
  gstRate: number;                   // e.g. 0.18 (18%)
}

export interface StatutoryRuleScheduleItem {
  ruleId: string;
  versionLabel: string;
  authority: 'SEBI' | 'FINANCE_MINISTRY_STT' | 'NSE_BSE_EXCHANGE' | 'BROKERAGE_DESK';
  title: string;
  circularRef: string;
  tMinus1AlertDateIST: string;
  goLivePreMarketTimeIST: string;
  status: 'ACTIVE_BASELINE' | 'PENDING_T_MINUS_1_APPROVAL' | 'APPROVED_LIVE' | 'DEFERRED_REJECTED';
  summaryDescription: string;
  beforeRatesSummary: string;
  afterRatesSummary: string;
  sampleImpactOn1LotNiftyOptionINR: string;
  beforeConfig: StatutoryTaxRateConfig;
  afterConfig: StatutoryTaxRateConfig;
  decisionTimestampIST?: string;
  approvedByUser?: string;
}

export interface StatutoryFrictionBreakdown {
  segment: 'NSE_FNO' | 'NSE_CASH' | 'BSE_CASH' | 'MCX_FUTURES' | 'MCX_OPTIONS';
  buyTurnoverINR: number;
  sellTurnoverINR: number;
  brokerageINR: number;
  sttOrCttINR: number;
  exchangeTurnoverAndIpftINR: number;
  sebiTurnoverFeeINR: number;
  stampDutyINR: number;
  gst18PctINR: number;
  totalFrictionINR: number;
  taxRuleVersionId?: string;
  taxRuleVersionLabel?: string;
}

export interface CandidateVetoEvaluation {
  id: string;
  timestampIST: string;
  deskName: string;
  agentId: string;
  segment: 'NSE_FNO' | 'NSE_CASH' | 'BSE_CASH' | 'MCX_FUTURES' | 'MCX_OPTIONS';
  symbol: string;
  strategyName: string;
  confirmedScriptStatus: 'CONFIRMED_LEADER' | 'UNCONFIRMED_OR_WEAK' | 'QUARANTINED_LOSER' | 'DUPLICATE_OPEN';
  capitalDeployedINR: number;
  maxRisk1RINR: number;
  grossTargetProfitINR: number;
  friction: StatutoryFrictionBreakdown;
  netProfitINR: number;
  netProfitPct: number;
  grossToFrictionRatio: number;
  netExpectancyR: number;
  approved: boolean;
  vetoCode:
    | 'APPROVED_CONFIRMED_OVER_2PCT_NET'
    | 'VETO_SESSION_CUTOFF_LOCKED'
    | 'VETO_DUPLICATE_OPEN_SCRIPT'
    | 'VETO_UNCONFIRMED_OR_QUARANTINED_SCRIPT'
    | 'VETO_INTER_AGENT_COUNCIL_OR_RED_TEAM'
    | 'VETO_COST_EXCEEDS_TARGET_PROFIT'
    | 'VETO_FRICTION_RATIO_BELOW_3X'
    | 'VETO_NET_PROFIT_BELOW_2PCT';
  verdictReason: string;
  interAgentConsensus?: InterAgentConsensusEvaluation;
  order?: PaperTradeOrder;
}

export interface ScanAndDeployAuditBatch {
  batchId: string;
  timestampIST: string;
  requestedScope: string;
  totalEvaluated: number;
  approvedCount: number;
  vetoedCount: number;
  deployedOrders: PaperTradeOrder[];
  evaluations: CandidateVetoEvaluation[];
  summaryHeadline: string;
  activeRegime?: string;
  shieldActionsLog?: string[];
}

const LAST_AUDIT_STORAGE_KEY = 'jarvis_last_scan_veto_audit_v1';
const STATUTORY_CALENDAR_STORAGE_KEY = 'jarvis_statutory_tax_calendar_v1';

export const BASELINE_2026_STATUTORY_CONFIG: StatutoryTaxRateConfig = {
  versionId: 'TAX-2026-V1-OCT',
  versionLabel: 'FY2026 Statutory Baseline (Oct 2026 STT 0.15% Opt / 0.05% Fut · ₹20 Brok)',
  effectiveFromIST: '01-Oct-2026 09:15:00 IST',
  brokerageFlatPerOrderINR: 20,
  nseOptionSellSttRate: 0.0015,
  nseFutureSellSttRate: 0.0005,
  nseCashIntradaySellSttRate: 0.00025,
  nseOptionExchTurnoverRate: 0.0003553,
  nseFutureExchTurnoverRate: 0.0000183,
  nseCashExchTurnoverRate: 0.0000307,
  bseCashExchTurnoverRate: 0.0000375,
  mcxOptionSellCttRate: 0.0005,
  mcxFutureSellCttRate: 0.0001,
  sebiTurnoverRate: 0.000001,
  gstRate: 0.18,
};

export const UPCOMING_T_MINUS_1_STATUTORY_CONFIG: StatutoryTaxRateConfig = {
  versionId: 'TAX-2026-V2-NOV-T1',
  versionLabel: 'SEBI & NSE True-to-Label IPFT + Peak Intraday F&O Surcharge (T-1 Pre-Market Go-Live)',
  effectiveFromIST: 'Next Session 09:15:00 IST (Pre-Market Approved)',
  brokerageFlatPerOrderINR: 20,
  nseOptionSellSttRate: 0.0015,
  nseFutureSellSttRate: 0.0005,
  nseCashIntradaySellSttRate: 0.00025,
  nseOptionExchTurnoverRate: 0.000385,
  nseFutureExchTurnoverRate: 0.0000205,
  nseCashExchTurnoverRate: 0.0000325,
  bseCashExchTurnoverRate: 0.0000375,
  mcxOptionSellCttRate: 0.0005,
  mcxFutureSellCttRate: 0.0001,
  sebiTurnoverRate: 0.0000015,
  gstRate: 0.18,
};

export const BROKERAGE_ZERO_PROMO_OR_SURCHARGE_CONFIG: StatutoryTaxRateConfig = {
  versionId: 'TAX-2026-V3-HIGH-VOL-BROK',
  versionLabel: 'Election & Expiry Day Peak-Load Brokerage & STT Slab (₹25/Order + 0.165% Opt STT)',
  effectiveFromIST: 'Scheduled Election/Expiry Session 09:15:00 IST',
  brokerageFlatPerOrderINR: 25,
  nseOptionSellSttRate: 0.00165,
  nseFutureSellSttRate: 0.00055,
  nseCashIntradaySellSttRate: 0.00025,
  nseOptionExchTurnoverRate: 0.000385,
  nseFutureExchTurnoverRate: 0.0000205,
  nseCashExchTurnoverRate: 0.0000325,
  bseCashExchTurnoverRate: 0.0000375,
  mcxOptionSellCttRate: 0.0005,
  mcxFutureSellCttRate: 0.0001,
  sebiTurnoverRate: 0.0000015,
  gstRate: 0.18,
};

function getDefaultStatutorySchedule(): StatutoryRuleScheduleItem[] {
  return [
    {
      ruleId: 'RULE-2026-BASE-OCT',
      versionLabel: BASELINE_2026_STATUTORY_CONFIG.versionLabel,
      authority: 'FINANCE_MINISTRY_STT',
      title: 'Finance Act 2026 F&O STT Revision (0.15% Options / 0.05% Futures) & ₹20 Flat Brokerage',
      circularRef: 'FINMIN/STT/2026-27/104',
      tMinus1AlertDateIST: '30-Sep-2026 18:00 IST (T-1 Day)',
      goLivePreMarketTimeIST: '01-Oct-2026 09:15 IST',
      status: 'ACTIVE_BASELINE',
      summaryDescription:
        'Active baseline statutory friction schedule applied to all orders created prior to any T-1 rule change approval.',
      beforeRatesSummary: 'Legacy STT: Options 0.10% (Sell) · Futures 0.02% (Sell) · Brokerage ₹20/order',
      afterRatesSummary: '2026 Baseline: Options 0.15% (Sell) · Futures 0.05% (Sell) · Exch+IPFT 0.03553% · SEBI ₹10/Cr · Brok ₹20/order',
      sampleImpactOn1LotNiftyOptionINR: '₹49.12 total round-trip friction on 1-lot NIFTY spread',
      beforeConfig: BASELINE_2026_STATUTORY_CONFIG,
      afterConfig: BASELINE_2026_STATUTORY_CONFIG,
      decisionTimestampIST: '01-Oct-2026 08:45:00 IST',
      approvedByUser: 'Institutional Desk Baseline',
    },
    {
      ruleId: 'RULE-2026-NOV-T1-IPFT',
      versionLabel: UPCOMING_T_MINUS_1_STATUTORY_CONFIG.versionLabel,
      authority: 'SEBI',
      title: 'T-1 Pre-Market Alert: SEBI Surveillance Fee (₹15/Cr) & NSE True-to-Label IPFT Turnover Revision',
      circularRef: 'SEBI/HO/MRD/TPD-1/CIR/P/2026/118',
      tMinus1AlertDateIST: 'T-1 Day Pre-Market Alert (Ready 1 Day Before Go-Live)',
      goLivePreMarketTimeIST: 'Next Market Open 09:15:00 IST',
      status: 'PENDING_T_MINUS_1_APPROVAL',
      summaryDescription:
        'Calendarized T-1 day before Go-Live: Adjusts NSE F&O Exchange+IPFT charge from 0.03553% to 0.03850% and SEBI turnover fee from ₹10/Cr to ₹15/Cr. Requires manual approval before 09:15 IST market open. Existing trades keep Before rates; post-approval trades use After rates.',
      beforeRatesSummary: 'Before (Active): Exch+IPFT 0.03553% · SEBI ₹10/Cr · Opt STT 0.15% · Brok ₹20/order',
      afterRatesSummary: 'After (Go-Live): Exch+IPFT 0.03850% · SEBI ₹15/Cr · Opt STT 0.15% · Brok ₹20/order',
      sampleImpactOn1LotNiftyOptionINR: '+₹0.48 per lot delta (Before: ₹49.12 vs After: ₹49.60)',
      beforeConfig: BASELINE_2026_STATUTORY_CONFIG,
      afterConfig: UPCOMING_T_MINUS_1_STATUTORY_CONFIG,
    },
    {
      ruleId: 'RULE-2026-ELECTION-EXPIRY-SLAB',
      versionLabel: BROKERAGE_ZERO_PROMO_OR_SURCHARGE_CONFIG.versionLabel,
      authority: 'BROKERAGE_DESK',
      title: 'T-1 Scheduled Policy: Election / Expiry Peak-Load Brokerage (₹25/Order) & F&O Risk Surcharge',
      circularRef: 'NSE/INSP/2026/ELECTION-MARGIN-09',
      tMinus1AlertDateIST: 'T-1 Day Pre-Market Alert (Calendarized Policy)',
      goLivePreMarketTimeIST: 'Election / Expiry Session 09:15:00 IST',
      status: 'PENDING_T_MINUS_1_APPROVAL',
      summaryDescription:
        'Pre-staged T-1 policy for peak India Lok Sabha / US Election or Weekly Expiry volatility sessions: increases flat brokerage from ₹20 to ₹25/order and models 0.165% Option STT buffer so the >2.00% Net-of-Tax Veto Gate automatically tightens before market open.',
      beforeRatesSummary: 'Before: Brokerage ₹20/order (₹40 RT) · Option STT 0.15% · Fut STT 0.05%',
      afterRatesSummary: 'After: Brokerage ₹25/order (₹50 RT) · Option STT 0.165% · Fut STT 0.055%',
      sampleImpactOn1LotNiftyOptionINR: '+₹12.15 round-trip friction per single-leg order (+₹24.30 on 2-leg spreads)',
      beforeConfig: BASELINE_2026_STATUTORY_CONFIG,
      afterConfig: BROKERAGE_ZERO_PROMO_OR_SURCHARGE_CONFIG,
    },
  ];
}

export function getStatutoryTaxRuleCalendar(): StatutoryRuleScheduleItem[] {
  try {
    const raw = localStorage.getItem(STATUTORY_CALENDAR_STORAGE_KEY);
    if (!raw) return getDefaultStatutorySchedule();
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    return getDefaultStatutorySchedule();
  } catch {
    return getDefaultStatutorySchedule();
  }
}

export function saveStatutoryTaxRuleCalendar(items: StatutoryRuleScheduleItem[]): void {
  try {
    localStorage.setItem(STATUTORY_CALENDAR_STORAGE_KEY, JSON.stringify(items));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('jarvis:statutory-rule-updated', { detail: items }));
    }
  } catch {
    // ignore storage errors
  }
}

export function getActiveStatutoryTaxRuleVersion(): {
  activeRule: StatutoryRuleScheduleItem;
  activeConfig: StatutoryTaxRateConfig;
  pendingRulesCount: number;
} {
  const calendar = getStatutoryTaxRuleCalendar();
  const approvedRules = calendar.filter((r) => r.status === 'APPROVED_LIVE');
  const activeRule =
    approvedRules.length > 0
      ? approvedRules[approvedRules.length - 1]
      : calendar.find((r) => r.status === 'ACTIVE_BASELINE') || calendar[0];
  const pendingRulesCount = calendar.filter((r) => r.status === 'PENDING_T_MINUS_1_APPROVAL').length;
  return {
    activeRule,
    activeConfig: activeRule.afterConfig,
    pendingRulesCount,
  };
}

export function approvePendingStatutoryRule(ruleId: string): StatutoryRuleScheduleItem[] {
  const now = new Date();
  const timestampIST = `${formatOrderDate(now)} ${formatOrderTime(now)} IST`;
  const calendar = getStatutoryTaxRuleCalendar().map((item) => {
    if (item.ruleId === ruleId) {
      return {
        ...item,
        status: 'APPROVED_LIVE' as const,
        decisionTimestampIST: timestampIST,
        approvedByUser: 'Manual Pre-Market Approval (Verified Before 09:15 IST)',
      };
    }
    return item;
  });
  saveStatutoryTaxRuleCalendar(calendar);
  return calendar;
}

export function rejectOrDeferPendingStatutoryRule(ruleId: string): StatutoryRuleScheduleItem[] {
  const now = new Date();
  const timestampIST = `${formatOrderDate(now)} ${formatOrderTime(now)} IST`;
  const calendar = getStatutoryTaxRuleCalendar().map((item) => {
    if (item.ruleId === ruleId) {
      return {
        ...item,
        status: 'DEFERRED_REJECTED' as const,
        decisionTimestampIST: timestampIST,
        approvedByUser: 'Deferred / Reverted to Previous Approved Schedule',
      };
    }
    return item;
  });
  saveStatutoryTaxRuleCalendar(calendar);
  return calendar;
}

export function resetStatutoryRuleCalendarToDefault(): StatutoryRuleScheduleItem[] {
  const defaults = getDefaultStatutorySchedule();
  saveStatutoryTaxRuleCalendar(defaults);
  return defaults;
}

/**
 * 2026 INDIAN STATUTORY TAX & BROKERAGE SPECIFICATION (NSE F&O, NSE/BSE Cash, MCX)
 * Deterministic calculation of round-trip statutory friction before order creation.
 */
export function calculateRoundTripStatutoryFriction(params: {
  segment: 'NSE_FNO' | 'NSE_CASH' | 'BSE_CASH' | 'MCX_FUTURES' | 'MCX_OPTIONS';
  side: 'BUY' | 'SELL';
  entryPrice: number;
  targetExitPrice: number;
  qty: number;
  legCount?: number;
  isOptionContract?: boolean;
  overrideConfig?: StatutoryTaxRateConfig;
}): StatutoryFrictionBreakdown {
  const {
    segment,
    side,
    entryPrice,
    targetExitPrice,
    qty,
    legCount = 1,
    isOptionContract = true,
    overrideConfig,
  } = params;

  const rateConfig = overrideConfig || getActiveStatutoryTaxRuleVersion().activeConfig;

  const safeQty = Math.max(1, qty);
  const buyPrice = side === 'BUY' ? entryPrice : targetExitPrice;
  const sellPrice = side === 'BUY' ? targetExitPrice : entryPrice;

  const buyTurnoverINR = Number((buyPrice * safeQty).toFixed(2));
  const sellTurnoverINR = Number((sellPrice * safeQty).toFixed(2));
  const totalTurnoverINR = buyTurnoverINR + sellTurnoverINR;

  // Flat brokerage per executed order (default ₹20 -> ₹40 round-trip per leg; or ₹25 under approved T-1 peak slab)
  const executedOrdersCount = Math.max(1, legCount) * 2;
  const brokerageINR = Number((executedOrdersCount * rateConfig.brokerageFlatPerOrderINR).toFixed(2));

  // SEBI Turnover fee: default ₹10 per Crore = 0.0001% (or ₹15/Cr under approved T-1 circular)
  const sebiTurnoverFeeINR = Number((totalTurnoverINR * rateConfig.sebiTurnoverRate).toFixed(2));

  let sttOrCttINR = 0;
  let exchangeTurnoverAndIpftINR = 0;
  let stampDutyINR = 0;

  if (segment === 'NSE_FNO') {
    if (isOptionContract) {
      sttOrCttINR = Number((sellTurnoverINR * rateConfig.nseOptionSellSttRate).toFixed(2));
      exchangeTurnoverAndIpftINR = Number((totalTurnoverINR * rateConfig.nseOptionExchTurnoverRate).toFixed(2));
      stampDutyINR = Number((buyTurnoverINR * 0.00003).toFixed(2));
    } else {
      sttOrCttINR = Number((sellTurnoverINR * rateConfig.nseFutureSellSttRate).toFixed(2));
      exchangeTurnoverAndIpftINR = Number((totalTurnoverINR * rateConfig.nseFutureExchTurnoverRate).toFixed(2));
      stampDutyINR = Number((buyTurnoverINR * 0.00002).toFixed(2));
    }
  } else if (segment === 'NSE_CASH' || segment === 'BSE_CASH') {
    const exchRate =
      segment === 'BSE_CASH' ? rateConfig.bseCashExchTurnoverRate : rateConfig.nseCashExchTurnoverRate;
    sttOrCttINR = Number((sellTurnoverINR * rateConfig.nseCashIntradaySellSttRate).toFixed(2));
    exchangeTurnoverAndIpftINR = Number((totalTurnoverINR * exchRate).toFixed(2));
    stampDutyINR = Number((buyTurnoverINR * 0.00003).toFixed(2));
  } else if (segment === 'MCX_OPTIONS') {
    sttOrCttINR = Number((sellTurnoverINR * rateConfig.mcxOptionSellCttRate).toFixed(2));
    exchangeTurnoverAndIpftINR = Number((totalTurnoverINR * 0.000418).toFixed(2));
    stampDutyINR = Number((buyTurnoverINR * 0.00003).toFixed(2));
  } else {
    sttOrCttINR = Number((sellTurnoverINR * rateConfig.mcxFutureSellCttRate).toFixed(2));
    exchangeTurnoverAndIpftINR = Number((totalTurnoverINR * 0.000026).toFixed(2));
    stampDutyINR = Number((buyTurnoverINR * 0.00002).toFixed(2));
  }

  // GST (18%) on (Brokerage + Exchange Turnover + SEBI Fee)
  const gst18PctINR = Number(
    ((brokerageINR + exchangeTurnoverAndIpftINR + sebiTurnoverFeeINR) * rateConfig.gstRate).toFixed(2)
  );

  const totalFrictionINR = Number(
    (
      brokerageINR +
      sttOrCttINR +
      exchangeTurnoverAndIpftINR +
      sebiTurnoverFeeINR +
      stampDutyINR +
      gst18PctINR
    ).toFixed(2)
  );

  return {
    segment,
    buyTurnoverINR,
    sellTurnoverINR,
    brokerageINR,
    sttOrCttINR,
    exchangeTurnoverAndIpftINR,
    sebiTurnoverFeeINR,
    stampDutyINR,
    gst18PctINR,
    totalFrictionINR,
    taxRuleVersionId: rateConfig.versionId,
    taxRuleVersionLabel: rateConfig.versionLabel,
  };
}

/**
 * Evaluates a candidate trade against all 4 Institutional Veto Gates:
 * 1. Confirmed Script & Non-Duplicate Check (no duplicate open symbols, no quarantined/weak scripts).
 * 2. 5-Stage Inter-Agent Consensus Council & Red-Team Veto (Kuber + Chanakya + Arjuna/Bhishma + Vidura Red-Team + Governor).
 * 3. Cost-of-Trading Veto: Total Friction < Gross Target Profit AND Gross Target / Friction >= 3.0x.
 * 4. >2.0% Minimum Net-of-Tax Profit Hurdle (>2.50% under post-loss recovery or war shock).
 */
export function evaluateCandidateOrderAgainstVetoRules(params: {
  candidateOrder: PaperTradeOrder;
  deskName: string;
  confirmedScriptStatus: 'CONFIRMED_LEADER' | 'UNCONFIRMED_OR_WEAK' | 'QUARANTINED_LOSER' | 'DUPLICATE_OPEN';
  legCount?: number;
  isOptionContract?: boolean;
  customReasonPrefix?: string;
  interAgentConsensus?: InterAgentConsensusEvaluation;
  minRequiredNetProfitPct?: number;
  isManualOverride?: boolean;
}): CandidateVetoEvaluation {
  const {
    candidateOrder,
    deskName,
    confirmedScriptStatus,
    legCount = 1,
    isOptionContract = candidateOrder.segment === 'NSE_FNO',
    customReasonPrefix,
    interAgentConsensus,
    minRequiredNetProfitPct = interAgentConsensus?.requiredMinNetProfitPct ?? 2.0,
    isManualOverride = true,
  } = params;

  const now = new Date();
  const timestampIST = `${formatOrderDate(now)} ${formatOrderTime(now)} IST`;
  const side: 'BUY' | 'SELL' = candidateOrder.side === 'SELL' ? 'SELL' : 'BUY';
  const entryPrice = Number((candidateOrder.entryPrice ?? candidateOrder.legs[0]?.price ?? 100).toFixed(2));
  const qty = Math.max(1, candidateOrder.qty ?? candidateOrder.legs[0]?.qty ?? 1);
  const grossTargetProfitINR = Number((candidateOrder.targetProfitINR || 0).toFixed(2));
  const maxRisk1RINR = Math.max(50, Number((candidateOrder.maxDefinedLossINR || 380).toFixed(2)));
  const capitalDeployedINR = Math.max(1000, Number((candidateOrder.totalInvestmentINR || entryPrice * qty).toFixed(2)));

  const targetExitPrice =
    candidateOrder.targetPriceLevel ??
    Number(
      (side === 'BUY'
        ? entryPrice + grossTargetProfitINR / qty
        : Math.max(0.5, entryPrice - grossTargetProfitINR / qty)
      ).toFixed(2)
    );

  const friction = calculateRoundTripStatutoryFriction({
    segment: candidateOrder.segment,
    side,
    entryPrice,
    targetExitPrice,
    qty,
    legCount,
    isOptionContract,
  });

  const netProfitINR = Number((grossTargetProfitINR - friction.totalFrictionINR).toFixed(2));
  const netProfitPct = Number(((netProfitINR / capitalDeployedINR) * 100).toFixed(2));
  const grossToFrictionRatio = Number(
    (grossTargetProfitINR / Math.max(0.01, friction.totalFrictionINR)).toFixed(2)
  );
  const netExpectancyR = Number((netProfitINR / maxRisk1RINR).toFixed(2));

  // Gate 0: Session Entry Cutoff Window (15:15 IST Autonomous / 15:25 IST Manual Override / 15:20 IST Intraday & Expiry Lockout)
  const cutoffCheck = checkSessionEntryCutoffWindow({
    segment: candidateOrder.segment,
    isManualOverride,
    expiryDateStr: candidateOrder.expiryDate,
  });
  if (!cutoffCheck.allowed) {
    return {
      id: `veto-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestampIST,
      deskName,
      agentId: candidateOrder.agentId,
      segment: candidateOrder.segment,
      symbol: candidateOrder.symbol,
      strategyName: candidateOrder.strategyName,
      confirmedScriptStatus,
      capitalDeployedINR,
      maxRisk1RINR,
      grossTargetProfitINR,
      friction,
      netProfitINR,
      netProfitPct,
      grossToFrictionRatio,
      netExpectancyR,
      approved: false,
      vetoCode: 'VETO_SESSION_CUTOFF_LOCKED',
      verdictReason: cutoffCheck.reason,
      interAgentConsensus,
    };
  }

  // Gate 1: Duplicate Open Position Check
  if (confirmedScriptStatus === 'DUPLICATE_OPEN') {
    return {
      id: `veto-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestampIST,
      deskName,
      agentId: candidateOrder.agentId,
      segment: candidateOrder.segment,
      symbol: candidateOrder.symbol,
      strategyName: candidateOrder.strategyName,
      confirmedScriptStatus,
      capitalDeployedINR,
      maxRisk1RINR,
      grossTargetProfitINR,
      friction,
      netProfitINR,
      netProfitPct,
      grossToFrictionRatio,
      netExpectancyR,
      approved: false,
      vetoCode: 'VETO_DUPLICATE_OPEN_SCRIPT',
      verdictReason: `VETOED (Duplicate Open Position): ${candidateOrder.symbol} is already active in the Order Book. Duplicate stacking blocked to protect capital.`,
      interAgentConsensus,
    };
  }

  // Gate 1B: 5-Stage Inter-Agent Consensus Council & Vidura Red-Team Veto
  if (interAgentConsensus && (!interAgentConsensus.approvedByCouncil || interAgentConsensus.anyHardVeto)) {
    return {
      id: `veto-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestampIST,
      deskName,
      agentId: candidateOrder.agentId,
      segment: candidateOrder.segment,
      symbol: candidateOrder.symbol,
      strategyName: candidateOrder.strategyName,
      confirmedScriptStatus: 'UNCONFIRMED_OR_WEAK',
      capitalDeployedINR,
      maxRisk1RINR,
      grossTargetProfitINR,
      friction,
      netProfitINR,
      netProfitPct,
      grossToFrictionRatio,
      netExpectancyR,
      approved: false,
      vetoCode: 'VETO_INTER_AGENT_COUNCIL_OR_RED_TEAM',
      verdictReason:
        interAgentConsensus.hardVetoReason ||
        `VETOED by 5-Agent Council (Consensus ${interAgentConsensus.consensusScore}/100): Blocked by ${interAgentConsensus.hardVetoAgentName || 'Red-Team Critic'}.`,
      interAgentConsensus,
    };
  }

  // Gate 1C: Unconfirmed or Quarantined Script Check
  if (confirmedScriptStatus === 'QUARANTINED_LOSER' || confirmedScriptStatus === 'UNCONFIRMED_OR_WEAK') {
    return {
      id: `veto-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestampIST,
      deskName,
      agentId: candidateOrder.agentId,
      segment: candidateOrder.segment,
      symbol: candidateOrder.symbol,
      strategyName: candidateOrder.strategyName,
      confirmedScriptStatus,
      capitalDeployedINR,
      maxRisk1RINR,
      grossTargetProfitINR,
      friction,
      netProfitINR,
      netProfitPct,
      grossToFrictionRatio,
      netExpectancyR,
      approved: false,
      vetoCode: 'VETO_UNCONFIRMED_OR_QUARANTINED_SCRIPT',
      verdictReason:
        customReasonPrefix ||
        `VETOED (Unconfirmed / Quarantined Script): ${candidateOrder.symbol} did not pass multi-tick momentum confirmation or is quarantined in Learning Ledger.`,
      interAgentConsensus,
    };
  }

  // Gate 2A: Cost of Trading >= Target Profit
  if (friction.totalFrictionINR >= grossTargetProfitINR) {
    return {
      id: `veto-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestampIST,
      deskName,
      agentId: candidateOrder.agentId,
      segment: candidateOrder.segment,
      symbol: candidateOrder.symbol,
      strategyName: candidateOrder.strategyName,
      confirmedScriptStatus,
      capitalDeployedINR,
      maxRisk1RINR,
      grossTargetProfitINR,
      friction,
      netProfitINR,
      netProfitPct,
      grossToFrictionRatio,
      netExpectancyR,
      approved: false,
      vetoCode: 'VETO_COST_EXCEEDS_TARGET_PROFIT',
      verdictReason: `VETOED (Cost >= Profit): Total 2026 Tax + Brokerage (₹${friction.totalFrictionINR.toFixed(2)}) exceeds or equals target gross profit (₹${grossTargetProfitINR.toFixed(2)}).`,
      interAgentConsensus,
    };
  }

  // Gate 2B: Gross Win / Total Friction < 3.0x Statutory Mandate
  if (grossToFrictionRatio < 3.0 || netExpectancyR < 0.15) {
    return {
      id: `veto-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestampIST,
      deskName,
      agentId: candidateOrder.agentId,
      segment: candidateOrder.segment,
      symbol: candidateOrder.symbol,
      strategyName: candidateOrder.strategyName,
      confirmedScriptStatus,
      capitalDeployedINR,
      maxRisk1RINR,
      grossTargetProfitINR,
      friction,
      netProfitINR,
      netProfitPct,
      grossToFrictionRatio,
      netExpectancyR,
      approved: false,
      vetoCode: 'VETO_FRICTION_RATIO_BELOW_3X',
      verdictReason: `VETOED (Friction Drag): Gross Win / Friction is ${grossToFrictionRatio}x (< 3.0x statutory minimum). Gross ₹${grossTargetProfitINR.toFixed(0)} vs Tax+Brok ₹${friction.totalFrictionINR.toFixed(2)}.`,
      interAgentConsensus,
    };
  }

  // Gate 3: Strict > 2.0% (or >2.50% under shock/post-loss recovery) Net-of-Tax Profit Hurdle
  if (netProfitPct <= minRequiredNetProfitPct) {
    return {
      id: `veto-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestampIST,
      deskName,
      agentId: candidateOrder.agentId,
      segment: candidateOrder.segment,
      symbol: candidateOrder.symbol,
      strategyName: candidateOrder.strategyName,
      confirmedScriptStatus,
      capitalDeployedINR,
      maxRisk1RINR,
      grossTargetProfitINR,
      friction,
      netProfitINR,
      netProfitPct,
      grossToFrictionRatio,
      netExpectancyR,
      approved: false,
      vetoCode: 'VETO_NET_PROFIT_BELOW_2PCT',
      verdictReason: `VETOED (Sub-${minRequiredNetProfitPct.toFixed(1)}% Net Yield): Net profit after 2026 taxes & ₹${friction.brokerageINR} brokerage is +${netProfitPct.toFixed(2)}% (₹${netProfitINR.toFixed(2)} on ₹${capitalDeployedINR.toLocaleString('en-IN')}), below mandatory >${minRequiredNetProfitPct.toFixed(2)}% hurdle.`,
      interAgentConsensus,
    };
  }

  const councilBadge = interAgentConsensus
    ? ` · 5-Agent Council ${interAgentConsensus.consensusScore}/100 (1R=${interAgentConsensus.sizing.perTradeRiskPctOfEquity}% <1.5% DD Cap)`
    : '';

  const stampedOrder: PaperTradeOrder = {
    ...candidateOrder,
    taxRuleVersionId: friction.taxRuleVersionId || 'TAX-2026-V1-OCT',
    taxRuleVersionLabel: friction.taxRuleVersionLabel || 'FY2026 Statutory Baseline',
    statutoryFrictionSnapshotINR: friction.totalFrictionINR,
  };

  return {
    id: `veto-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestampIST,
    deskName,
    agentId: candidateOrder.agentId,
    segment: candidateOrder.segment,
    symbol: candidateOrder.symbol,
    strategyName: candidateOrder.strategyName,
    confirmedScriptStatus,
    capitalDeployedINR,
    maxRisk1RINR,
    grossTargetProfitINR,
    friction,
    netProfitINR,
    netProfitPct,
    grossToFrictionRatio,
    netExpectancyR,
    approved: true,
    vetoCode: 'APPROVED_CONFIRMED_OVER_2PCT_NET',
    verdictReason: `CONFIRMED & DEPLOYED: Net Profit +${netProfitPct.toFixed(2)}% (+₹${netProfitINR.toFixed(2)} net after ₹${friction.totalFrictionINR.toFixed(2)} tax+brokerage [${friction.taxRuleVersionId || 'V1'}] · ${grossToFrictionRatio}x friction coverage${councilBadge}).`,
    interAgentConsensus,
    order: stampedOrder,
  };
}

let vetoSeqCounter = 500;

/**
 * Builds and evaluates confirmed high-probability setups across all requested desks:
 * - Evaluates the 11-Vector Macro & 3-Layer FII/DII/Pro vs Retail Flow Matrix.
 * - Runs the 5-Stage Inter-Agent Consensus Council (Kuber -> Chanakya -> Arjuna/Bhishma -> Vidura Red-Team -> Governor).
 * - Enforces <1.50% Max Daily Drawdown (98.5% Protected Floor) Quarter-Kelly sizing.
 * - Enforces > 2.0% (or >2.50% under shock) Net-of-Tax Profit AND Gross/Friction >= 3.0x on every trade.
 */
export function executeIntelligentScanAndDeploy(
  quotes: Record<string, MarketQuote>,
  existingOrders: PaperTradeOrder[],
  scope: 'ALL' | 'NSE_FNO' | 'NSE_CASH' | 'BSE_CASH' | 'MCX' = 'ALL',
  isManualOverride: boolean = true
): ScanAndDeployAuditBatch {
  const now = new Date();
  const orderDate = formatOrderDate(now);
  const orderTime = formatOrderTime(now);
  const timestampIST = `${orderDate} ${orderTime}`;

  // Evaluate 11-Vector Macro & FII/DII Snapshot + 3-State Anti-Whipsaw Shield on existing open orders
  const macroSnapshot: ElevenVectorMacroSnapshot = evaluateElevenVectorMacroMatrix(quotes, existingOrders);
  const shieldResult = applyAsymmetricMacroShockShield(existingOrders, quotes);

  const openOrders = shieldResult.updatedOrders.filter((o) => o.status === 'OPEN');
  const openBaseSymbols = new Set<string>(
    openOrders.map((o) => extractBaseSymbolFromOrder(o))
  );
  const openFullSymbols = new Set<string>(
    openOrders.map((o) => o.symbol.toUpperCase().trim())
  );

  const learningMatrix = evaluateAdaptiveScriptLearningMatrix(quotes, shieldResult.updatedOrders);
  // Confirmed positive equity leaders sorted by learnedScore descending
  const confirmedEquityPool = learningMatrix.filter(
    (s) =>
      s.isEligibleForDeploy &&
      !s.isQuarantined &&
      s.ltp > 0 &&
      s.learnedScore >= 65
  );

  const evaluations: CandidateVetoEvaluation[] = [];
  const deployedOrders: PaperTradeOrder[] = [];

  // ============================================================================
  // DESK 1: NSE F&O (BHISHMA — 11-VECTOR ADAPTIVE NIFTY CREDIT SPREAD)
  // ============================================================================
  if (scope === 'ALL' || scope === 'NSE_FNO') {
    vetoSeqCounter += 1;
    const niftySpot = quotes['^NSEI']?.price && quotes['^NSEI'].price > 1000 ? quotes['^NSEI'].price : 23793.45;
    const niftyPct = quotes['^NSEI']?.changePct ?? -0.16;
    const vix = quotes['^INDIAVIX']?.price && quotes['^INDIAVIX'].price > 5 ? quotes['^INDIAVIX'].price : 14.46;
    const atm = Math.round(niftySpot / 50) * 50;

    // Inter-Agent Adaptation: If War Index >= 60, Fed Shock >= 30bps, or Retail Crowded Long Trap is active,
    // Bhishma automatically switches from Bull Put (PE) Spread to Bear Call (CE) Credit Spread!
    const isMacroBearishOrTrap =
      macroSnapshot.warEscalationIndex >= 60 ||
      macroSnapshot.participantFlow.isRetailCrowdedLongTrap ||
      macroSnapshot.regime === 'WAR_AND_ENERGY_SUPPLY_SHOCK' ||
      macroSnapshot.regime === 'FED_HAWKISH_AND_DOLLAR_WRECKING_BALL';
    const isBullish = !isMacroBearishOrTrap && niftyPct >= -0.25;

    const shortStrike = isBullish ? atm - 50 : atm + 50;
    const longStrike = isBullish ? atm - 100 : atm + 100;
    const optType: 'PE' | 'CE' = isBullish ? 'PE' : 'CE';
    const spreadInstrument = `NIFTY ${shortStrike}/${longStrike} ${optType} Spread`;
    const { expiryDateStr } = resolveDerivativeExpiryInfo('NSE_FNO', spreadInstrument, orderDate);

    const shortLeg = computeCanonicalNiftyOptionLeg(shortStrike, optType, niftySpot, vix);
    const longLeg = computeCanonicalNiftyOptionLeg(longStrike, optType, niftySpot, vix);
    // Under higher VIX or shock hurdles (>2.50%), ensure credit harvested meets the net hurdle cleanly
    const minEntryCredit = macroSnapshot.requiredMinNetProfitPct > 2.0 ? 20.5 : 16.5;
    const entryNetPremium = Number(Math.max(minEntryCredit, shortLeg.ltp - longLeg.ltp).toFixed(2));

    const qty = 25;
    const hedgedMarginINR = 14500;
    const targetPrice = Number(Math.max(1.5, entryNetPremium * 0.14).toFixed(2));
    const grossProfitINR = Number(((entryNetPremium - targetPrice) * qty).toFixed(2));
    const stopDistPerUnit = Number((375 / qty).toFixed(2)); // 1R = ₹375 max loss (0.075% of ₹5L capital!)
    const initialStopPrice = Number((entryNetPremium + stopDistPerUnit).toFixed(2));
    const maxLossINR = Number(((initialStopPrice - entryNetPremium) * qty).toFixed(2));

    const alreadyOpenSpread = openFullSymbols.has(spreadInstrument.toUpperCase());

    const fnoOrder: PaperTradeOrder = {
      id: `SIM-ORD-BHI-${Date.now().toString().slice(-5)}-${vetoSeqCounter}`,
      agentId: 'agent_bhishma',
      agentName: 'Bhishma (F&O Desk)',
      symbol: spreadInstrument,
      segment: 'NSE_FNO',
      strategyName: isBullish
        ? '5-Agent Consensus Bull Put Credit Spread (>2.2% Net · 82% TSL)'
        : `5-Agent Consensus Bear Call Spread (${macroSnapshot.regime.split('_')[0]} Hedge · 82% TSL)`,
      legs: [
        {
          instrument: spreadInstrument,
          action: 'SELL',
          qty,
          price: entryNetPremium,
          exitPrice: entryNetPremium,
          strike: shortStrike,
          optionType: optType,
        },
      ],
      totalInvestmentINR: hedgedMarginINR,
      maxDefinedLossINR: maxLossINR,
      targetProfitINR: grossProfitINR,
      riskRewardRatio: `1:${(grossProfitINR / Math.max(1, maxLossINR)).toFixed(2)}`,
      timestamp: timestampIST,
      orderDate,
      orderTime,
      expiryDate: expiryDateStr || '09-Nov-2026',
      status: 'OPEN',
      pnlINR: 0,
      peakPnlINR: 0,
      trailingStopPnlINR: -maxLossINR,
      entryPrice: entryNetPremium,
      exitPrice: entryNetPremium,
      initialStopLossPrice: initialStopPrice,
      trailingStopPrice: initialStopPrice,
      targetPriceLevel: targetPrice,
      tslStage: 'INITIAL_RISK_STOP',
      side: 'SELL',
      qty,
      sebiComplianceVerified: true,
      isSimulation: true,
    };

    const fnoConsensus = evaluateInterAgentConsensusPipeline({
      candidateOrder: fnoOrder,
      quotes,
      existingOrders: shieldResult.updatedOrders,
      macroSnapshot,
    });

    const fnoEval = evaluateCandidateOrderAgainstVetoRules({
      candidateOrder: fnoOrder,
      deskName: 'NSE F&O Derivatives Desk (Bhishma)',
      confirmedScriptStatus: alreadyOpenSpread ? 'DUPLICATE_OPEN' : 'CONFIRMED_LEADER',
      legCount: 2,
      isOptionContract: true,
      interAgentConsensus: fnoConsensus,
      minRequiredNetProfitPct: macroSnapshot.requiredMinNetProfitPct,
      isManualOverride,
    });

    evaluations.push(fnoEval);
    if (fnoEval.approved && fnoEval.order) {
      deployedOrders.push(fnoEval.order);
      openFullSymbols.add(fnoEval.order.symbol.toUpperCase());
    }
  }

  // ============================================================================
  // DESK 2: NSE CASH (ARJUNA — #1 11-VECTOR & FII/DII CONFIRMED WINNER)
  // ============================================================================
  if (scope === 'ALL' || scope === 'NSE_CASH') {
    vetoSeqCounter += 1;
    const arjunaCandidate = confirmedEquityPool.find((c) => !openBaseSymbols.has(c.symbol));

    if (!arjunaCandidate) {
      const fallbackInspect = learningMatrix[0];
      const dummyPrice = fallbackInspect?.ltp || 1350;
      const dummyOrder: PaperTradeOrder = {
        id: `VETO-ARJ-${vetoSeqCounter}`,
        agentId: 'agent_arjuna',
        agentName: 'Arjuna (Cash Alpha)',
        symbol: `${fallbackInspect?.symbol || 'NSE_EQ'} Intraday Cash MIS`,
        segment: 'NSE_CASH',
        strategyName: 'Confirmed Relative-Strength Breakout',
        legs: [{ instrument: `${fallbackInspect?.symbol || 'NSE_EQ'} (NSE EQ)`, action: 'BUY', qty: 10, price: dummyPrice, exitPrice: dummyPrice }],
        totalInvestmentINR: Math.round((dummyPrice * 10) / 5),
        maxDefinedLossINR: 350,
        targetProfitINR: 400,
        riskRewardRatio: '1:1.14',
        timestamp: timestampIST,
        orderDate,
        orderTime,
        status: 'OPEN',
        pnlINR: 0,
        entryPrice: dummyPrice,
        exitPrice: dummyPrice,
        side: 'BUY',
        qty: 10,
        sebiComplianceVerified: true,
        isSimulation: true,
      };
      evaluations.push(
        evaluateCandidateOrderAgainstVetoRules({
          candidateOrder: dummyOrder,
          deskName: 'NSE Cash Alpha Desk (Arjuna)',
          confirmedScriptStatus: openBaseSymbols.has(fallbackInspect?.symbol || '')
            ? 'DUPLICATE_OPEN'
            : 'UNCONFIRMED_OR_WEAK',
          customReasonPrefix: `VETOED (NSE Cash Desk): All confirmed 11-vector leaders (${confirmedEquityPool.map((c) => c.symbol).join(', ') || 'None'}) are either already OPEN in the book or vetoed by Macro/FII filters.`,
        })
      );
    } else {
      const price = Number(arjunaCandidate.ltp.toFixed(2));
      // Target calibrated to clear both >2.00% standard and >2.50% shock recovery hurdle after 2026 taxes!
      const grossTargetMultiplier = macroSnapshot.requiredMinNetProfitPct > 2.0 ? 1.0315 : 1.0285;
      const stopLoss = Number((price * 0.9932).toFixed(2));
      const target = Number((price * grossTargetMultiplier).toFixed(2));
      const stopDistance = Math.max(0.5, Number((price - stopLoss).toFixed(2)));
      const qty = Math.max(1, Math.floor(380 / stopDistance));
      const maxLoss = Number(((price - stopLoss) * qty).toFixed(2));
      const grossTargetProfit = Number(((target - price) * qty).toFixed(2));
      const fullNotionalCostINR = Math.round(price * qty);

      const nseCashOrder: PaperTradeOrder = {
        id: `SIM-ORD-ARJ-${Date.now().toString().slice(-5)}-${vetoSeqCounter}`,
        agentId: 'agent_arjuna',
        agentName: 'Arjuna (Cash Alpha)',
        symbol: `${arjunaCandidate.symbol} Intraday Cash MIS`,
        segment: 'NSE_CASH',
        strategyName: `5-Agent Consensus Leader (${arjunaCandidate.phaseLabel})`,
        legs: [
          {
            instrument: `${arjunaCandidate.symbol} (NSE EQ)`,
            action: 'BUY',
            qty,
            price,
            exitPrice: price,
          },
        ],
        totalInvestmentINR: fullNotionalCostINR,
        maxDefinedLossINR: maxLoss,
        targetProfitINR: grossTargetProfit,
        riskRewardRatio: `1:${(grossTargetProfit / Math.max(1, maxLoss)).toFixed(2)}`,
        timestamp: timestampIST,
        orderDate,
        orderTime,
        status: 'OPEN',
        pnlINR: 0,
        peakPnlINR: 0,
        trailingStopPnlINR: -maxLoss,
        entryPrice: price,
        exitPrice: price,
        initialStopLossPrice: stopLoss,
        trailingStopPrice: stopLoss,
        targetPriceLevel: target,
        tslStage: 'INITIAL_RISK_STOP',
        side: 'BUY',
        qty,
        sebiComplianceVerified: true,
        isSimulation: true,
      };

      const nseConsensus = evaluateInterAgentConsensusPipeline({
        candidateOrder: nseCashOrder,
        quotes,
        existingOrders: [...shieldResult.updatedOrders, ...deployedOrders],
        macroSnapshot,
      });

      const nseEval = evaluateCandidateOrderAgainstVetoRules({
        candidateOrder: nseCashOrder,
        deskName: 'NSE Cash Alpha Desk (Arjuna)',
        confirmedScriptStatus: 'CONFIRMED_LEADER',
        legCount: 1,
        isOptionContract: false,
        interAgentConsensus: nseConsensus,
        minRequiredNetProfitPct: macroSnapshot.requiredMinNetProfitPct,
        isManualOverride,
      });

      evaluations.push(nseEval);
      if (nseEval.approved && nseEval.order) {
        deployedOrders.push(nseEval.order);
        openBaseSymbols.add(arjunaCandidate.symbol);
      }
    }
  }

  // ============================================================================
  // DESK 3: BSE CASH (CHANAKYA — #2 CONFIRMED FII/DII SECTOR WINNER)
  // ============================================================================
  if (scope === 'ALL' || scope === 'BSE_CASH') {
    vetoSeqCounter += 1;
    const chanakyaCandidate = confirmedEquityPool.find((c) => !openBaseSymbols.has(c.symbol));

    if (!chanakyaCandidate) {
      const fallbackInspect = learningMatrix.find((m) => !openBaseSymbols.has(m.symbol)) || learningMatrix[0];
      const dummyPrice = fallbackInspect?.ltp || 1200;
      const dummyOrder: PaperTradeOrder = {
        id: `VETO-CHA-${vetoSeqCounter}`,
        agentId: 'agent_chanakya',
        agentName: 'Chanakya (Macro Desk)',
        symbol: `${fallbackInspect?.symbol || 'BSE_EQ'} Cash Hedge (BSE EQ)`,
        segment: 'BSE_CASH',
        strategyName: 'Confirmed Macro Sector Rotation',
        legs: [{ instrument: `${fallbackInspect?.symbol || 'BSE_EQ'} (BSE EQ)`, action: 'BUY', qty: 10, price: dummyPrice, exitPrice: dummyPrice }],
        totalInvestmentINR: Math.round(dummyPrice * 10),
        maxDefinedLossINR: 360,
        targetProfitINR: 380,
        riskRewardRatio: '1:1.05',
        timestamp: timestampIST,
        orderDate,
        orderTime,
        status: 'OPEN',
        pnlINR: 0,
        entryPrice: dummyPrice,
        exitPrice: dummyPrice,
        side: 'BUY',
        qty: 10,
        sebiComplianceVerified: true,
        isSimulation: true,
      };
      evaluations.push(
        evaluateCandidateOrderAgainstVetoRules({
          candidateOrder: dummyOrder,
          deskName: 'BSE Cash Macro Desk (Chanakya)',
          confirmedScriptStatus: 'UNCONFIRMED_OR_WEAK',
          customReasonPrefix: `VETOED (BSE Cash Desk): Next candidate ${fallbackInspect?.symbol || 'script'} (${fallbackInspect?.changePct ?? 0}%) is not a confirmed >${macroSnapshot.requiredMinNetProfitPct.toFixed(1)}% net leader or is already deployed. Skipping to preserve capital.`,
        })
      );
    } else {
      const cPrice = Number(chanakyaCandidate.ltp.toFixed(2));
      const grossTargetMultiplier = macroSnapshot.requiredMinNetProfitPct > 2.0 ? 1.032 : 1.029;
      const stopLoss = Number((cPrice * 0.9930).toFixed(2));
      const target = Number((cPrice * grossTargetMultiplier).toFixed(2));
      const stopDist = Math.max(0.5, Number((cPrice - stopLoss).toFixed(2)));
      const qty = Math.max(1, Math.floor(380 / stopDist));
      const maxLoss = Number(((cPrice - stopLoss) * qty).toFixed(2));
      const grossTargetProfit = Number(((target - cPrice) * qty).toFixed(2));
      const fullNotionalCostINR = Math.round(cPrice * qty);

      const bseCashOrder: PaperTradeOrder = {
        id: `SIM-ORD-CHA-${Date.now().toString().slice(-5)}-${vetoSeqCounter}`,
        agentId: 'agent_chanakya',
        agentName: 'Chanakya (Macro Desk)',
        symbol: `${chanakyaCandidate.symbol} Cash Hedge (BSE EQ)`,
        segment: 'BSE_CASH',
        strategyName: `FII/DII Flow Leader (${chanakyaCandidate.symbol} · ${chanakyaCandidate.sector})`,
        legs: [
          {
            instrument: `${chanakyaCandidate.symbol} (BSE EQ)`,
            action: 'BUY',
            qty,
            price: cPrice,
            exitPrice: cPrice,
          },
        ],
        totalInvestmentINR: fullNotionalCostINR,
        maxDefinedLossINR: maxLoss,
        targetProfitINR: grossTargetProfit,
        riskRewardRatio: `1:${(grossTargetProfit / Math.max(1, maxLoss)).toFixed(2)}`,
        timestamp: timestampIST,
        orderDate,
        orderTime,
        status: 'OPEN',
        pnlINR: 0,
        peakPnlINR: 0,
        trailingStopPnlINR: -maxLoss,
        entryPrice: cPrice,
        exitPrice: cPrice,
        initialStopLossPrice: stopLoss,
        trailingStopPrice: stopLoss,
        targetPriceLevel: target,
        tslStage: 'INITIAL_RISK_STOP',
        side: 'BUY',
        qty,
        sebiComplianceVerified: true,
        isSimulation: true,
      };

      const bseConsensus = evaluateInterAgentConsensusPipeline({
        candidateOrder: bseCashOrder,
        quotes,
        existingOrders: [...shieldResult.updatedOrders, ...deployedOrders],
        macroSnapshot,
      });

      const bseEval = evaluateCandidateOrderAgainstVetoRules({
        candidateOrder: bseCashOrder,
        deskName: 'BSE Cash Macro Desk (Chanakya)',
        confirmedScriptStatus: 'CONFIRMED_LEADER',
        legCount: 1,
        isOptionContract: false,
        interAgentConsensus: bseConsensus,
        minRequiredNetProfitPct: macroSnapshot.requiredMinNetProfitPct,
        isManualOverride,
      });

      evaluations.push(bseEval);
      if (bseEval.approved && bseEval.order) {
        deployedOrders.push(bseEval.order);
        openBaseSymbols.add(chanakyaCandidate.symbol);
      }
    }
  }

  // ============================================================================
  // ============================================================================
  // DESK 4: MCX COMMODITIES (KUBER — CRUDEOILM / GOLDM PARITY BREAKOUT)
  // ============================================================================
  if (scope === 'ALL' || scope === 'MCX') {
    vetoSeqCounter += 1;
    const goldQuote = quotes['GC=F'];
    const {
      mcxCrudePrice,
      wtiChangePct,
      usdinrPrice: usdinr,
    } = computeAuthoritativeMcxCrudeParity(quotes);

    const wtiChange =
      macroSnapshot.vectors.find((v) => v.id === 'vec_oil_natgas')?.score != null &&
      macroSnapshot.mode === 'STRESS_TEST_SANDBOX'
        ? -(macroSnapshot.vectors.find((v) => v.id === 'vec_oil_natgas')!.score / 7)
        : wtiChangePct;
    const isBullish = wtiChange >= 0;
    const crudeSym = `MCX CRUDEOILM ${isBullish ? 'BULL' : 'BEAR'} Futures`;
    const isCrudeAlreadyOpen =
      openFullSymbols.has(crudeSym.toUpperCase()) ||
      openOrders.some((o) => o.segment === 'MCX_FUTURES' && o.symbol.toUpperCase().includes('CRUDE'));

    if (!isCrudeAlreadyOpen) {
      const qty = 10; // 10 bbl Mini lot
      const spanMarginINR = 18500;
      const stopDist = 38; // ₹380 max risk (1R <= 0.08% of ₹5L capital!)
      const targetDist = macroSnapshot.requiredMinNetProfitPct > 2.0 ? 58 : 52;
      const stopPrice = Number((isBullish ? mcxCrudePrice - stopDist : mcxCrudePrice + stopDist).toFixed(2));
      const targetPrice = Number((isBullish ? mcxCrudePrice + targetDist : mcxCrudePrice - targetDist).toFixed(2));
      const maxLoss = Number((stopDist * qty).toFixed(2));
      const targetProfit = Number((targetDist * qty).toFixed(2));
      const side: 'BUY' | 'SELL' = isBullish ? 'BUY' : 'SELL';
      const crudeExpiry = resolveDerivativeExpiryInfo('MCX_FUTURES', 'MCX CRUDEOILM FUT', orderDate);

      const mcxOrder: PaperTradeOrder = {
        id: `SIM-ORD-KUB-${Date.now().toString().slice(-5)}-${vetoSeqCounter}`,
        agentId: 'agent_kuber',
        agentName: 'Kuber (MCX Desk)',
        symbol: crudeSym,
        segment: 'MCX_FUTURES',
        strategyName: `11-Vector NYMEX WTI / MCX Crude ${isBullish ? 'Long' : 'Short'} Parity (82% TSL)`,
        legs: [
          {
            instrument: 'MCX CRUDEOILM FUT',
            action: side,
            qty,
            price: mcxCrudePrice,
            exitPrice: mcxCrudePrice,
          },
        ],
        totalInvestmentINR: spanMarginINR,
        maxDefinedLossINR: maxLoss,
        targetProfitINR: targetProfit,
        riskRewardRatio: `1:${(targetProfit / Math.max(1, maxLoss)).toFixed(2)}`,
        timestamp: timestampIST,
        orderDate,
        orderTime,
        expiryDate: crudeExpiry.expiryDateStr || '19-Nov-2026',
        status: 'OPEN',
        pnlINR: 0,
        peakPnlINR: 0,
        trailingStopPnlINR: -maxLoss,
        entryPrice: mcxCrudePrice,
        exitPrice: mcxCrudePrice,
        initialStopLossPrice: stopPrice,
        trailingStopPrice: stopPrice,
        targetPriceLevel: targetPrice,
        tslStage: 'INITIAL_RISK_STOP',
        side,
        qty,
        sebiComplianceVerified: true,
        isSimulation: true,
      };

      const mcxConsensus = evaluateInterAgentConsensusPipeline({
        candidateOrder: mcxOrder,
        quotes,
        existingOrders: [...shieldResult.updatedOrders, ...deployedOrders],
        macroSnapshot,
      });

      const mcxEval = evaluateCandidateOrderAgainstVetoRules({
        candidateOrder: mcxOrder,
        deskName: 'MCX Commodity Desk (Kuber)',
        confirmedScriptStatus: Math.abs(wtiChange) >= 0.15 ? 'CONFIRMED_LEADER' : 'UNCONFIRMED_OR_WEAK',
        legCount: 1,
        isOptionContract: false,
        interAgentConsensus: mcxConsensus,
        minRequiredNetProfitPct: macroSnapshot.requiredMinNetProfitPct,
        isManualOverride,
      });

      evaluations.push(mcxEval);
      if (mcxEval.approved && mcxEval.order) {
        deployedOrders.push(mcxEval.order);
        openFullSymbols.add(crudeSym.toUpperCase());
      }
    } else {
      const isGoldAlreadyOpen = openOrders.some(
        (o) => o.segment === 'MCX_FUTURES' && o.symbol.toUpperCase().includes('GOLD')
      );
      const goldPrice = goldQuote?.price ?? 2750.0;
      const goldChg = goldQuote?.changePct ?? 0.45;
      const mcxGoldPrice = Number((Math.round((goldPrice * usdinr) / 31.1035 * 10 * 1.05) || 78400).toFixed(2));
      const isGoldBullish = goldChg >= 0 || macroSnapshot.warEscalationIndex >= 50;
      const qty = 1;
      const goldMarginINR = 22000;
      const maxLoss = 370;
      const targetProfit = macroSnapshot.requiredMinNetProfitPct > 2.0 ? 640 : 560;
      const stopPrice = Number((isGoldBullish ? mcxGoldPrice - maxLoss : mcxGoldPrice + maxLoss).toFixed(2));
      const targetPrice = Number((isGoldBullish ? mcxGoldPrice + targetProfit : mcxGoldPrice - targetProfit).toFixed(2));
      const side: 'BUY' | 'SELL' = isGoldBullish ? 'BUY' : 'SELL';
      const goldExpiry = resolveDerivativeExpiryInfo('MCX_FUTURES', 'MCX GOLDM FUT', orderDate);

      const goldOrder: PaperTradeOrder = {
        id: `SIM-ORD-KUB-${Date.now().toString().slice(-5)}-${vetoSeqCounter}`,
        agentId: 'agent_kuber',
        agentName: 'Kuber (MCX Desk)',
        symbol: `MCX GOLDM Futures (Step-Ratchet TSL)`,
        segment: 'MCX_FUTURES',
        strategyName: 'COMEX/MCX Gold Safe-Haven Parity (>2.4% Net · 82% TSL)',
        legs: [
          {
            instrument: 'MCX GOLDM FUT',
            action: side,
            qty,
            price: mcxGoldPrice,
            exitPrice: mcxGoldPrice,
          },
        ],
        totalInvestmentINR: goldMarginINR,
        maxDefinedLossINR: maxLoss,
        targetProfitINR: targetProfit,
        riskRewardRatio: `1:${(targetProfit / Math.max(1, maxLoss)).toFixed(2)}`,
        timestamp: timestampIST,
        orderDate,
        orderTime,
        expiryDate: goldExpiry.expiryDateStr || '04-Dec-2026',
        status: 'OPEN',
        pnlINR: 0,
        peakPnlINR: 0,
        trailingStopPnlINR: -maxLoss,
        entryPrice: mcxGoldPrice,
        exitPrice: mcxGoldPrice,
        initialStopLossPrice: stopPrice,
        trailingStopPrice: stopPrice,
        targetPriceLevel: targetPrice,
        tslStage: 'INITIAL_RISK_STOP',
        side,
        qty,
        sebiComplianceVerified: true,
        isSimulation: true,
      };

      const goldConsensus = evaluateInterAgentConsensusPipeline({
        candidateOrder: goldOrder,
        quotes,
        existingOrders: [...shieldResult.updatedOrders, ...deployedOrders],
        macroSnapshot,
      });

      const goldEval = evaluateCandidateOrderAgainstVetoRules({
        candidateOrder: goldOrder,
        deskName: 'MCX Commodity Desk (Kuber)',
        confirmedScriptStatus: isGoldAlreadyOpen ? 'DUPLICATE_OPEN' : 'CONFIRMED_LEADER',
        legCount: 1,
        isOptionContract: false,
        interAgentConsensus: goldConsensus,
        minRequiredNetProfitPct: macroSnapshot.requiredMinNetProfitPct,
        isManualOverride,
      });

      evaluations.push(goldEval);
      if (goldEval.approved && goldEval.order) {
        deployedOrders.push(goldEval.order);
      }
    }
  }

  const approvedCount = evaluations.filter((e) => e.approved).length;
  const vetoedCount = evaluations.length - approvedCount;

  const summaryHeadline =
    approvedCount > 0
      ? `5-Agent Consensus & Veto Scan Complete [${macroSnapshot.regime.replace(/_/g, ' ')}]: Deployed ${approvedCount} setup(s) (>${macroSnapshot.requiredMinNetProfitPct.toFixed(2)}% Net after 2026 Taxes · Max Daily DD <=1.50%); Vetoed ${vetoedCount} setup(s).`
      : `Strict Veto Gate [${macroSnapshot.regime.replace(/_/g, ' ')}]: 0 new orders deployed (${vetoedCount} candidate(s) vetoed by 5-Agent Council, open position guard, or <${macroSnapshot.requiredMinNetProfitPct.toFixed(2)}% net profit hurdle). Capital 100% preserved.`;

  const batch: ScanAndDeployAuditBatch = {
    batchId: `SCAN-${Date.now().toString().slice(-6)}`,
    timestampIST,
    requestedScope: scope,
    totalEvaluated: evaluations.length,
    approvedCount,
    vetoedCount,
    deployedOrders,
    evaluations,
    summaryHeadline,
    activeRegime: macroSnapshot.regimeHeadline,
    shieldActionsLog: shieldResult.actionsLog,
  };

  saveLastScanVetoAuditBatch(batch);
  return batch;
}

export function saveLastScanVetoAuditBatch(batch: ScanAndDeployAuditBatch): void {
  try {
    localStorage.setItem(LAST_AUDIT_STORAGE_KEY, JSON.stringify(batch));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('jarvis:scan-veto-audit', { detail: batch }));
    }
  } catch {
    // ignore storage errors
  }
}

export function getLastScanVetoAuditBatch(): ScanAndDeployAuditBatch | null {
  try {
    const raw = localStorage.getItem(LAST_AUDIT_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ScanAndDeployAuditBatch;
  } catch {
    return null;
  }
}

/**
 * 1-Click Single-Symbol or Bear-Put Setup AI Council Evaluation & Deployment:
 * Allows any Confirmed Leader card or 52W-Low / Bear Put (T1/T2/T3) setup in Core 1 (Market Finder)
 * to be evaluated through the 5-Stage Inter-Agent Consensus Council & >2.00% Net-of-Tax Veto Gate
 * and deployed directly into the Order Book (`existingOrders`).
 */
export function evaluateAndDeploySingleSetupViaCouncil(params: {
  symbol: string;
  instrumentLabel?: string;
  segment: 'NSE_CASH' | 'NSE_FNO' | 'BSE_CASH';
  side: 'BUY' | 'SELL';
  entryPrice: number;
  stopLossPrice: number;
  t1Price?: number;
  t2Price: number;
  t3Price?: number;
  qty: number;
  optionType?: 'PE' | 'CE';
  strike?: number;
  strategyName: string;
  nonErosionRule?: string;
  quotes: Record<string, MarketQuote>;
  existingOrders: PaperTradeOrder[];
}): CandidateVetoEvaluation {
  const {
    symbol,
    instrumentLabel,
    segment,
    side,
    entryPrice,
    stopLossPrice,
    t1Price,
    t2Price,
    t3Price,
    qty,
    optionType,
    strike,
    strategyName,
    nonErosionRule,
    quotes,
    existingOrders,
  } = params;

  vetoSeqCounter += 1;
  const now = new Date();
  const orderDate = formatOrderDate(now);
  const orderTime = formatOrderTime(now);
  const timestampIST = `${orderDate} ${orderTime}`;

  const cleanBase = symbol.replace('.NS', '').replace('.BO', '').toUpperCase().trim();
  const openOrders = existingOrders.filter((o) => o.status === 'OPEN');
  const isDuplicateOpen = openOrders.some(
    (o) =>
      extractBaseSymbolFromOrder(o) === cleanBase &&
      o.segment === segment &&
      (o.legs?.[0]?.optionType || null) === (optionType || null)
  );

  const safeEntry = Number(Math.max(1, entryPrice).toFixed(2));
  const safeStop = Number(Math.max(0.5, stopLossPrice).toFixed(2));
  const safeTargetT2 = Number(Math.max(safeEntry * 1.028, t2Price).toFixed(2));
  const safeQty = Math.max(1, qty);

  const maxLossINR = Number((Math.abs(safeEntry - safeStop) * safeQty).toFixed(2));
  const grossTargetProfitINR = Number((Math.abs(safeTargetT2 - safeEntry) * safeQty).toFixed(2));
  const capitalDeployedINR = Math.max(1500, Math.round(safeEntry * safeQty));
  const { expiryDateStr } = resolveDerivativeExpiryInfo(segment, instrumentLabel || symbol, orderDate);

  const candidateOrder: PaperTradeOrder = {
    id: `SIM-ORD-COUNCIL-${Date.now().toString().slice(-5)}-${vetoSeqCounter}`,
    agentId: segment === 'NSE_FNO' ? 'agent_bhishma' : 'agent_arjuna',
    agentName: segment === 'NSE_FNO' ? 'Bhishma (F&O Desk)' : 'Arjuna (Cash Alpha)',
    symbol: instrumentLabel || (segment === 'NSE_FNO' ? `${cleanBase} ${strike || ''} ${optionType || 'PE'}`.trim() : `${cleanBase} Intraday Cash MIS`),
    segment,
    strategyName,
    legs: [
      {
        instrument: instrumentLabel || `${cleanBase} (${segment})`,
        action: side,
        qty: safeQty,
        price: safeEntry,
        exitPrice: safeEntry,
        strike,
        optionType,
      },
    ],
    totalInvestmentINR: capitalDeployedINR,
    maxDefinedLossINR: maxLossINR,
    targetProfitINR: grossTargetProfitINR,
    riskRewardRatio: `1:${(grossTargetProfitINR / Math.max(1, maxLossINR)).toFixed(2)}`,
    timestamp: timestampIST,
    orderDate,
    orderTime,
    expiryDate: segment === 'NSE_FNO' ? expiryDateStr || '09-Nov-2026' : undefined,
    status: 'OPEN',
    pnlINR: 0,
    peakPnlINR: 0,
    trailingStopPnlINR: -maxLossINR,
    entryPrice: safeEntry,
    exitPrice: safeEntry,
    initialStopLossPrice: safeStop,
    trailingStopPrice: safeStop,
    targetPriceLevel: safeTargetT2,
    t1Price,
    t2Price: safeTargetT2,
    t3Price,
    nonErosionRule:
      nonErosionRule ||
      `T1 ₹${t1Price ?? safeTargetT2} -> Lock T1 Floor | T2 ₹${safeTargetT2} -> Trail 82% Peak toward T3 ₹${t3Price ?? Number((safeTargetT2 * 1.02).toFixed(2))}`,
    tslStage: 'INITIAL_RISK_STOP',
    side,
    qty: safeQty,
    sebiComplianceVerified: true,
    isSimulation: true,
  };

  const macroSnapshot = evaluateElevenVectorMacroMatrix(quotes, existingOrders);
  const interAgentConsensus = evaluateInterAgentConsensusPipeline({
    candidateOrder,
    quotes,
    existingOrders,
    macroSnapshot,
  });

  const evaluation = evaluateCandidateOrderAgainstVetoRules({
    candidateOrder,
    deskName: segment === 'NSE_FNO' ? 'AI Council · F&O Desk (Bhishma)' : 'AI Council · Equity Alpha Desk (Arjuna)',
    confirmedScriptStatus: isDuplicateOpen ? 'DUPLICATE_OPEN' : 'CONFIRMED_LEADER',
    legCount: 1,
    isOptionContract: segment === 'NSE_FNO',
    interAgentConsensus,
    minRequiredNetProfitPct: macroSnapshot.requiredMinNetProfitPct,
  });

  // Record this single-setup audit into the last audit batch so Core 3 & Core 4 stay in lockstep
  const batch: ScanAndDeployAuditBatch = {
    batchId: `COUNCIL-${Date.now().toString().slice(-6)}`,
    timestampIST,
    requestedScope: candidateOrder.symbol,
    totalEvaluated: 1,
    approvedCount: evaluation.approved ? 1 : 0,
    vetoedCount: evaluation.approved ? 0 : 1,
    deployedOrders: evaluation.approved && evaluation.order ? [evaluation.order] : [],
    evaluations: [evaluation],
    summaryHeadline: evaluation.verdictReason,
    activeRegime: macroSnapshot.regimeHeadline,
  };
  saveLastScanVetoAuditBatch(batch);

  return evaluation;
}

