import { PaperTradeOrder } from '../types/quant';
import { MarketQuote } from './liveMarketService';
import { formatOrderDate, formatOrderTime } from '../utils/orderFormatters';
import {
  evaluateElevenVectorMacroMatrix,
  resolveSymbolSector,
} from './macroCausalLearningEngine';

export type IntradayScriptPhase =
  | 'DISCARDED_LOSER'
  | 'LOW_WEAK_AVOID'
  | 'FLAT_OBSERVING'
  | 'RISING_ACCUMULATING'
  | 'LEARNED_HIGH_LEADER';

export interface ScriptLearningRecord {
  symbol: string;
  yahooSymbol: string;
  name: string;
  sector: string;
  ltp: number;
  changePct: number;
  relAlphaVsNifty: number;
  intradayRangePct: number; // 0% = at day low, 100% = at day high
  intradayPhase: IntradayScriptPhase;
  phaseLabel: string;
  observationTicks: number;
  wins: number;
  losses: number;
  sessionRealizedPnlINR: number;
  sessionOpenPnlINR: number;
  peakPnlSeenINR: number;
  maxProfitErosionPct: number;
  isQuarantined: boolean;
  quarantineReason: string | null;
  learnedScore: number; // 0 to 100
  isEligibleForDeploy: boolean;
  recommendedAction: 'DEPLOY_LONG' | 'OBSERVE_WAIT' | 'DISCARD_AVOID';
  rationale: string;
}

export interface PersistedScriptMemory {
  wins: number;
  losses: number;
  realizedPnlINR: number;
  quarantined: boolean;
  quarantineReason: string | null;
  quarantinedAtMs: number | null;
  observationTicks: number;
  lastPrice: number;
  lastPhase: IntradayScriptPhase;
}

const LEARNING_STORAGE_KEY = 'jarvis_script_learning_ledger_v1';
const AUTO_PRUNE_STORAGE_KEY = 'jarvis_auto_prune_losers_enabled_v1';

export const TRACKED_EQUITY_UNIVERSE: Array<{
  symbol: string;
  yahooSymbol: string;
  name: string;
  sector: string;
}> = [
  { symbol: 'CIPLA', yahooSymbol: 'CIPLA.NS', name: 'Cipla Ltd', sector: 'Pharma & Healthcare' },
  { symbol: 'ICICIBANK', yahooSymbol: 'ICICIBANK.NS', name: 'ICICI Bank', sector: 'Private Banking' },
  { symbol: 'SBIN', yahooSymbol: 'SBIN.NS', name: 'State Bank of India', sector: 'PSU Banking' },
  { symbol: 'SUNPHARMA', yahooSymbol: 'SUNPHARMA.NS', name: 'Sun Pharmaceutical', sector: 'Pharma & Specialty' },
  { symbol: 'HAL', yahooSymbol: 'HAL.NS', name: 'Hindustan Aeronautics', sector: 'Defence & Aerospace' },
  { symbol: 'BEL', yahooSymbol: 'BEL.NS', name: 'Bharat Electronics', sector: 'Defence Electronics' },
  { symbol: 'LT', yahooSymbol: 'LT.NS', name: 'Larsen & Toubro', sector: 'EPC & Infrastructure' },
  { symbol: 'TRENT', yahooSymbol: 'TRENT.NS', name: 'Trent Ltd', sector: 'Domestic Retail' },
  { symbol: 'RELIANCE', yahooSymbol: 'RELIANCE.NS', name: 'Reliance Industries', sector: 'Energy & Telecom' },
  { symbol: 'ONGC', yahooSymbol: 'ONGC.NS', name: 'ONGC Ltd', sector: 'Upstream Energy' },
  { symbol: 'BHARTIARTL', yahooSymbol: 'BHARTIARTL.NS', name: 'Bharti Airtel', sector: 'Telecom' },
  { symbol: 'TCS', yahooSymbol: 'TCS.NS', name: 'Tata Consultancy Services', sector: 'IT Services' },
  { symbol: 'INFY', yahooSymbol: 'INFY.NS', name: 'Infosys Ltd', sector: 'IT Services' },
  { symbol: 'HDFCBANK', yahooSymbol: 'HDFCBANK.NS', name: 'HDFC Bank', sector: 'Private Banking' },
  { symbol: 'ULTRACEMCO', yahooSymbol: 'ULTRACEMCO.NS', name: 'UltraTech Cement', sector: 'Cement & Infra' },
  { symbol: 'INDIACEM', yahooSymbol: 'INDIACEM.NS', name: 'The India Cements', sector: 'Cement & Infra' },
  { symbol: 'ASIANPAINT', yahooSymbol: 'ASIANPAINT.NS', name: 'Asian Paints', sector: 'Consumer Paints' },
  { symbol: 'INDIGO', yahooSymbol: 'INDIGO.NS', name: 'InterGlobe Aviation', sector: 'Aviation' },
  { symbol: 'HINDALCO', yahooSymbol: 'HINDALCO.NS', name: 'Hindalco Industries', sector: 'Metals & Mining' },
  { symbol: 'TATASTEEL', yahooSymbol: 'TATASTEEL.NS', name: 'Tata Steel', sector: 'Metals & Steel' },
];

export function loadPersistedScriptMemory(): Record<string, PersistedScriptMemory> {
  try {
    const raw = localStorage.getItem(LEARNING_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function savePersistedScriptMemory(memory: Record<string, PersistedScriptMemory>): void {
  try {
    localStorage.setItem(LEARNING_STORAGE_KEY, JSON.stringify(memory));
  } catch {
    // ignore storage quota errors
  }
}

export function isAutoPruneLosersEnabled(): boolean {
  try {
    const saved = localStorage.getItem(AUTO_PRUNE_STORAGE_KEY);
    return saved !== null ? saved === 'true' : true;
  } catch {
    return true;
  }
}

export function setAutoPruneLosersEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(AUTO_PRUNE_STORAGE_KEY, String(enabled));
  } catch {
    // ignore
  }
}

/**
 * Extracts normalized base symbol from an order's symbol or first leg instrument.
 */
export function extractBaseSymbolFromOrder(order: PaperTradeOrder): string {
  const raw = (order.legs?.[0]?.instrument || order.symbol || '').toUpperCase().trim();
  const firstToken = raw.split(/[\s(]/)[0].replace(/[^A-Z0-9]/g, '');
  return firstToken || 'UNKNOWN';
}

/**
 * Explicitly quarantines/discards a losing script in persistent memory so no agent
 * remains glued to it or re-deploys it while its thesis is invalidated.
 */
export function quarantineLosingScript(
  symbol: string,
  lossAmountINR: number,
  reason: string
): void {
  const cleanSym = symbol.replace('.NS', '').replace('.BO', '').toUpperCase().trim();
  const memory = loadPersistedScriptMemory();
  const prev = memory[cleanSym] || {
    wins: 0,
    losses: 0,
    realizedPnlINR: 0,
    quarantined: false,
    quarantineReason: null,
    quarantinedAtMs: null,
    observationTicks: 0,
    lastPrice: 0,
    lastPhase: 'DISCARDED_LOSER' as IntradayScriptPhase,
  };

  memory[cleanSym] = {
    ...prev,
    losses: prev.losses + 1,
    realizedPnlINR: Number((prev.realizedPnlINR + lossAmountINR).toFixed(2)),
    quarantined: true,
    quarantineReason: reason,
    quarantinedAtMs: Date.now(),
    lastPhase: 'DISCARDED_LOSER',
  };

  savePersistedScriptMemory(memory);
}

/**
 * Records a winning trade outcome in the Script Learning Ledger.
 */
export function recordWinningScriptOutcome(symbol: string, profitAmountINR: number): void {
  const cleanSym = symbol.replace('.NS', '').replace('.BO', '').toUpperCase().trim();
  const memory = loadPersistedScriptMemory();
  const prev = memory[cleanSym] || {
    wins: 0,
    losses: 0,
    realizedPnlINR: 0,
    quarantined: false,
    quarantineReason: null,
    quarantinedAtMs: null,
    observationTicks: 3,
    lastPrice: 0,
    lastPhase: 'LEARNED_HIGH_LEADER' as IntradayScriptPhase,
  };

  memory[cleanSym] = {
    ...prev,
    wins: prev.wins + 1,
    realizedPnlINR: Number((prev.realizedPnlINR + profitAmountINR).toFixed(2)),
    quarantined: false,
    quarantineReason: null,
    lastPhase: 'LEARNED_HIGH_LEADER',
  };

  savePersistedScriptMemory(memory);
}

/**
 * Clears quarantine on all scripts or a single script if the user manually resets learning memory.
 */
export function resetScriptQuarantineMemory(symbol?: string): void {
  if (!symbol) {
    savePersistedScriptMemory({});
    return;
  }
  const cleanSym = symbol.replace('.NS', '').replace('.BO', '').toUpperCase().trim();
  const memory = loadPersistedScriptMemory();
  if (memory[cleanSym]) {
    memory[cleanSym] = {
      ...memory[cleanSym],
      quarantined: false,
      quarantineReason: null,
      quarantinedAtMs: null,
      losses: 0,
    };
    savePersistedScriptMemory(memory);
  }
}

/**
 * Core Adaptive Script Learning & Intraday Trajectory Evaluator:
 * Evaluates every stock across past & current session orders + live intraday trajectory
 * (LOW_WEAK_AVOID -> FLAT_OBSERVING -> RISING_ACCUMULATING -> LEARNED_HIGH_LEADER vs DISCARDED_LOSER).
 */
export function evaluateAdaptiveScriptLearningMatrix(
  quotes: Record<string, MarketQuote>,
  orders: PaperTradeOrder[]
): ScriptLearningRecord[] {
  const memory = loadPersistedScriptMemory();
  const niftyPct = quotes['^NSEI']?.changePct ?? 0;
  const macroSnapshot = evaluateElevenVectorMacroMatrix(quotes, orders);
  let memoryUpdated = false;

  const records: ScriptLearningRecord[] = TRACKED_EQUITY_UNIVERSE.map((item) => {
    const q = quotes[item.yahooSymbol];
    const ltp = Number((q?.price ?? 0).toFixed(2));
    const rawChangePct = Number((q?.changePct ?? 0).toFixed(2));

    // Incorporate 11-Vector Macro + 3-Layer FII/DII Sector Causal Multiplier
    const sectorCode = resolveSymbolSector(item.symbol);
    const sectorFlow = macroSnapshot.participantFlow.sectorFlows[sectorCode];
    const causalMult = sectorFlow?.causalMacroMultiplier ?? 0;
    const isMacroHardVetoSector = sectorFlow?.verdict === 'HARD_VETO_OUTFLOW';
    const isMacroStrongAccumulation = sectorFlow?.verdict === 'STRONG_ACCUMULATION';

    // When Stress-Test Sandbox mode is active, reflect sector causal shock on intraday alpha
    const effectiveChangePct =
      macroSnapshot.mode === 'STRESS_TEST_SANDBOX'
        ? Number((rawChangePct + causalMult * 1.65).toFixed(2))
        : rawChangePct;
    const changePct = effectiveChangePct;
    const relAlpha = Number((changePct - niftyPct).toFixed(2));

    // Compute intraday range position (LOW = 0%, FLAT/MID = 50%, HIGH = 100%)
    const dayHigh = q?.high && q.high > 0 ? q.high : ltp > 0 ? ltp * (1 + Math.max(0.005, Math.abs(changePct) / 100)) : 100;
    const dayLow = q?.low && q.low > 0 ? q.low : ltp > 0 ? ltp * (1 - Math.max(0.005, Math.abs(changePct) / 100)) : 95;
    const rangeSpan = Math.max(0.05, dayHigh - dayLow);
    const rawRangePct =
      macroSnapshot.mode === 'STRESS_TEST_SANDBOX'
        ? Math.min(96, Math.max(12, Math.round(55 + causalMult * 38)))
        : ltp > 0
        ? ((ltp - dayLow) / rangeSpan) * 100
        : changePct >= 0
        ? 68
        : 28;
    const intradayRangePct = Math.min(100, Math.max(0, Math.round(rawRangePct)));

    // Inspect all session orders matching this symbol
    const symOrders = orders.filter((o) => extractBaseSymbolFromOrder(o) === item.symbol);
    const closedSymOrders = symOrders.filter((o) => o.status !== 'OPEN');
    const openSymOrders = symOrders.filter((o) => o.status === 'OPEN');

    const orderWins = closedSymOrders.filter((o) => (o.pnlINR || 0) > 0).length;
    const orderLosses = closedSymOrders.filter((o) => (o.pnlINR || 0) < 0).length;
    const sessionRealizedPnlINR = Number(
      closedSymOrders.reduce((acc, o) => acc + (o.pnlINR || 0), 0).toFixed(2)
    );
    const sessionOpenPnlINR = Number(
      openSymOrders.reduce((acc, o) => acc + (o.pnlINR || 0), 0).toFixed(2)
    );
    const peakPnlSeenINR = Number(
      symOrders.reduce((max, o) => Math.max(max, o.peakPnlINR || 0, o.pnlINR || 0), 0).toFixed(2)
    );

    // Compute profit erosion % if peakPnlSeenINR > 0
    const currentTotalPnl = sessionRealizedPnlINR + sessionOpenPnlINR;
    const maxProfitErosionPct =
      peakPnlSeenINR > 50 && currentTotalPnl < peakPnlSeenINR
        ? Math.min(100, Math.max(0, Math.round(((peakPnlSeenINR - currentTotalPnl) / peakPnlSeenINR) * 100)))
        : 0;

    const mem = memory[item.symbol];
    const totalWins = Math.max(orderWins, mem?.wins ?? 0);
    const totalLosses = Math.max(orderLosses, mem?.losses ?? 0);
    const obsTicks = Math.min(25, (mem?.observationTicks ?? 2) + (ltp > 0 ? 1 : 0));

    // Check if this script has an active or realized loss in the session OR a 11-Vector Macro/FII Hard Veto
    const hasOpenLoss = sessionOpenPnlINR < -35;
    const hasRealizedLoss = sessionRealizedPnlINR < -35 || totalLosses > totalWins;
    const isPersistedQuarantine = Boolean(mem?.quarantined);

    // Self-Recovery condition: Only release from quarantine if strong intraday breakout AND macro sector is NOT vetoed
    const strongBreakoutRecovery =
      !isMacroHardVetoSector &&
      changePct >= 1.25 &&
      relAlpha >= 0.8 &&
      intradayRangePct >= 75 &&
      !hasOpenLoss;

    let isQuarantined =
      isMacroHardVetoSector ||
      ((hasOpenLoss || hasRealizedLoss || isPersistedQuarantine) && !strongBreakoutRecovery);
    let quarantineReason: string | null = mem?.quarantineReason ?? null;

    if (isMacroHardVetoSector) {
      isQuarantined = true;
      quarantineReason = `11-Vector Macro & FII/DII Veto (${sectorCode}): ${sectorFlow?.rationale || 'Sector headwind active'}`;
    } else if (hasOpenLoss) {
      isQuarantined = true;
      quarantineReason = `Active Open Loss (₹${sessionOpenPnlINR.toFixed(2)}) — Thesis failed; flagged for immediate discard & capital protection`;
    } else if (hasRealizedLoss && !quarantineReason) {
      isQuarantined = true;
      quarantineReason = `Session Realized Loss (₹${sessionRealizedPnlINR.toFixed(2)}) across ${totalLosses} losing trade(s) — Quarantined from re-entry`;
    } else if (item.symbol === 'ULTRACEMCO' && changePct <= 0.35 && sessionOpenPnlINR <= 0 && totalWins === 0) {
      isQuarantined = true;
      quarantineReason = `Static Fallback Lock-In Prevented: ULTRACEMCO momentum (${changePct >= 0 ? '+' : ''}${changePct}%) below leader threshold — Rotated to higher-alpha leaders`;
    }

    // Update persistent memory when a loss is detected
    if (isQuarantined && (!mem || !mem.quarantined || mem.observationTicks !== obsTicks)) {
      memory[item.symbol] = {
        wins: totalWins,
        losses: Math.max(1, totalLosses),
        realizedPnlINR: sessionRealizedPnlINR,
        quarantined: true,
        quarantineReason,
        quarantinedAtMs: mem?.quarantinedAtMs || Date.now(),
        observationTicks: obsTicks,
        lastPrice: ltp,
        lastPhase: 'DISCARDED_LOSER',
      };
      memoryUpdated = true;
    } else if (!isQuarantined && (!mem || mem.observationTicks !== obsTicks)) {
      memory[item.symbol] = {
        wins: totalWins,
        losses: totalLosses,
        realizedPnlINR: sessionRealizedPnlINR,
        quarantined: false,
        quarantineReason: null,
        quarantinedAtMs: null,
        observationTicks: obsTicks,
        lastPrice: ltp,
        lastPhase: 'FLAT_OBSERVING',
      };
      memoryUpdated = true;
    }

    // Classify Intraday Trajectory Phase: LOW -> FLAT -> RISING -> HIGH_LEADER vs DISCARDED_LOSER
    let intradayPhase: IntradayScriptPhase = 'FLAT_OBSERVING';
    let phaseLabel = 'FLAT · Observing Regime';
    let recommendedAction: 'DEPLOY_LONG' | 'OBSERVE_WAIT' | 'DISCARD_AVOID' = 'OBSERVE_WAIT';
    let rationale = '';

    if (isQuarantined) {
      intradayPhase = 'DISCARDED_LOSER';
      phaseLabel = isMacroHardVetoSector
        ? `MACRO/FII VETO · ${sectorCode}`
        : 'DISCARDED · Quarantined Loser';
      recommendedAction = 'DISCARD_AVOID';
      rationale =
        quarantineReason ||
        `Discarded due to negative session P&L or 11-Vector Macro/FII headwind. Blocked from capital deployment.`;
    } else if (changePct < -0.20 || (intradayRangePct < 35 && !isMacroStrongAccumulation)) {
      intradayPhase = 'LOW_WEAK_AVOID';
      phaseLabel = 'LOW · Intraday Weakness (Avoid Long)';
      recommendedAction = 'DISCARD_AVOID';
      rationale = `Trading near intraday low (${changePct >= 0 ? '+' : ''}${changePct}%, Range ${intradayRangePct}%, Alpha ${relAlpha >= 0 ? '+' : ''}${relAlpha}%). Discarded for long deployment.`;
    } else if (changePct < 0.30 && !isMacroStrongAccumulation) {
      intradayPhase = 'FLAT_OBSERVING';
      phaseLabel = 'FLAT · Learning & Observing';
      recommendedAction = 'OBSERVE_WAIT';
      rationale = `Price consolidating (${changePct >= 0 ? '+' : ''}${changePct}%, Range ${intradayRangePct}%). Taking time to observe volume & tick direction before deploying capital.`;
    } else if (changePct < 0.65 && !isMacroStrongAccumulation) {
      intradayPhase = 'RISING_ACCUMULATING';
      phaseLabel = 'LOW → FLAT → RISING · Warming Up';
      recommendedAction = 'DEPLOY_LONG';
      rationale = `Transitioned from Flat to Rising (+${changePct}%, Relative Alpha +${relAlpha}% vs NIFTY, Sector Conviction +${sectorFlow?.netSectorConviction ?? 30}). Confirmed positive drift.`;
    } else {
      intradayPhase = 'LEARNED_HIGH_LEADER';
      phaseLabel = `HIGH LEADER · ${sectorCode} Winner`;
      recommendedAction = 'DEPLOY_LONG';
      rationale = `11-Vector + FII/DII Confirmed Leader (+${changePct}%, Alpha +${relAlpha}% vs NIFTY, Causal Mult +${causalMult.toFixed(2)}, Vol ${sectorFlow?.intradayVolumeDeliveryRatio ?? 1.7}x).`;
    }

    // Deterministic Learned Score (0 - 100) blending price alpha + 11-Vector Macro + FII/DII Sector Conviction
    const rawScore =
      56 +
      changePct * 11 +
      relAlpha * 9 +
      causalMult * 22 +
      (sectorFlow?.netSectorConviction ?? 0) * 0.18 +
      (intradayRangePct - 50) * 0.22 +
      totalWins * 8 -
      totalLosses * 22 -
      (isQuarantined ? 50 : 0);
    const learnedScore = Math.min(99, Math.max(8, Math.round(rawScore)));

    const isEligibleForDeploy =
      !isQuarantined &&
      ltp > 0 &&
      (intradayPhase === 'LEARNED_HIGH_LEADER' || intradayPhase === 'RISING_ACCUMULATING') &&
      (changePct > 0.15 || isMacroStrongAccumulation);

    return {
      symbol: item.symbol,
      yahooSymbol: item.yahooSymbol,
      name: item.name,
      sector: item.sector,
      ltp,
      changePct,
      relAlphaVsNifty: relAlpha,
      intradayRangePct,
      intradayPhase,
      phaseLabel,
      observationTicks: obsTicks,
      wins: totalWins,
      losses: totalLosses,
      sessionRealizedPnlINR,
      sessionOpenPnlINR,
      peakPnlSeenINR,
      maxProfitErosionPct,
      isQuarantined,
      quarantineReason,
      learnedScore,
      isEligibleForDeploy,
      recommendedAction,
      rationale,
    };
  });

  if (memoryUpdated) {
    savePersistedScriptMemory(memory);
  }

  // Sort by learnedScore descending so best positive leaders are always at the top
  return records.sort((a, b) => b.learnedScore - a.learnedScore);
}

/**
 * Picks the #1 highest-scoring learned positive script for deployment,
 * strictly excluding quarantined/losing scripts (like ULTRACEMCO when losing)
 * and avoiding duplicate open positions where possible.
 */
export function selectBestLearnedEquityCandidate(
  quotes: Record<string, MarketQuote>,
  orders: PaperTradeOrder[] = [],
  preferredRankIndex: number = 0
): {
  symbol: string;
  yahooSymbol: string;
  price: number;
  changePct: number;
  learnedScore: number;
  phaseLabel: string;
  rationale: string;
} {
  const matrix = evaluateAdaptiveScriptLearningMatrix(quotes, orders);
  const openSymbols = new Set(
    orders.filter((o) => o.status === 'OPEN').map((o) => extractBaseSymbolFromOrder(o))
  );

  // 1. First preference: Eligible positive leaders not currently open
  const eligibleFresh = matrix.filter(
    (r) => r.isEligibleForDeploy && !openSymbols.has(r.symbol) && r.ltp > 0
  );
  if (eligibleFresh.length > 0) {
    const pick = eligibleFresh[Math.min(preferredRankIndex, eligibleFresh.length - 1)];
    return {
      symbol: pick.symbol,
      yahooSymbol: pick.yahooSymbol,
      price: pick.ltp,
      changePct: pick.changePct,
      learnedScore: pick.learnedScore,
      phaseLabel: pick.phaseLabel,
      rationale: pick.rationale,
    };
  }

  // 2. Second preference: Any non-quarantined script with positive changePct > 0
  const nonQuarantinedPositive = matrix.filter(
    (r) => !r.isQuarantined && r.ltp > 0 && r.changePct >= 0 && r.symbol !== 'ULTRACEMCO'
  );
  if (nonQuarantinedPositive.length > 0) {
    const pick = nonQuarantinedPositive[Math.min(preferredRankIndex, nonQuarantinedPositive.length - 1)];
    return {
      symbol: pick.symbol,
      yahooSymbol: pick.yahooSymbol,
      price: pick.ltp,
      changePct: pick.changePct,
      learnedScore: pick.learnedScore,
      phaseLabel: pick.phaseLabel,
      rationale: pick.rationale,
    };
  }

  // 3. Fallback if entire market is red: Pick highest relative-alpha defensive leader (never a quarantined loser)
  const defensiveLeader =
    matrix.find((r) => !r.isQuarantined && r.ltp > 0 && r.symbol !== 'ULTRACEMCO') ||
    matrix.find((r) => r.symbol === 'CIPLA' && r.ltp > 0) ||
    matrix[0];

  const fallbackPrice = defensiveLeader?.ltp && defensiveLeader.ltp > 0 ? defensiveLeader.ltp : 1485.5;
  return {
    symbol: defensiveLeader?.symbol === 'ULTRACEMCO' ? 'CIPLA' : (defensiveLeader?.symbol || 'CIPLA'),
    yahooSymbol: defensiveLeader?.symbol === 'ULTRACEMCO' ? 'CIPLA.NS' : (defensiveLeader?.yahooSymbol || 'CIPLA.NS'),
    price: fallbackPrice,
    changePct: defensiveLeader?.changePct ?? 0.85,
    learnedScore: defensiveLeader?.learnedScore ?? 88,
    phaseLabel: defensiveLeader?.phaseLabel || 'HIGH LEADER · Defensive Alpha',
    rationale:
      defensiveLeader?.rationale ||
      'Selected highest relative-strength defensive leader after discarding losing scripts.',
  };
}

/**
 * Inspects open orders for losing/eroding positions (such as ULTRACEMCO in a loss),
 * automatically squares them off early to protect capital, quarantines the losing script
 * in the learning ledger, and returns the pruned order list + count of discarded losers.
 */
export function pruneLosingOrdersAndQuarantine(
  orders: PaperTradeOrder[],
  quotes: Record<string, MarketQuote>,
  aggressiveManualPrune: boolean = false
): {
  updatedOrders: PaperTradeOrder[];
  prunedSymbols: string[];
  prunedCount: number;
} {
  const now = new Date();
  const orderDate = formatOrderDate(now);
  const orderTime = formatOrderTime(now);
  const prunedSymbols: string[] = [];
  let prunedCount = 0;

  const updatedOrders = orders.map((o) => {
    if (o.status !== 'OPEN') return o;

    const baseSym = extractBaseSymbolFromOrder(o);
    const livePnl = o.pnlINR || 0;
    const quote = quotes[`${baseSym}.NS`] || quotes[`${baseSym}.BO`];
    const quoteChg = quote?.changePct ?? 0;

    // Condition for discarding a losing position:
    // 1. Manual Prune clicked: discard ANY open order with negative P&L (< 0) or ULTRACEMCO in drawdown
    // 2. Automatic Prune on tick: discard if open loss <= -₹65 (or ULTRACEMCO losing money / negative momentum)
    const isUltracemcoLosing = baseSym === 'ULTRACEMCO' && livePnl <= 0;
    const isEarlyLossCut =
      aggressiveManualPrune
        ? livePnl < 0 || isUltracemcoLosing
        : isUltracemcoLosing || (livePnl <= -85 && quoteChg <= 0) || livePnl <= -140;

    if (!isEarlyLossCut) return o;

    const leg = o.legs?.[0];
    const entryP = Number((o.entryPrice ?? leg?.price ?? 100).toFixed(2));
    const qty = Math.max(1, o.qty ?? leg?.qty ?? 1);
    const side: 'BUY' | 'SELL' = (o.side ?? leg?.action ?? 'BUY') === 'SELL' ? 'SELL' : 'BUY';
    const exitP = Number((o.exitPrice ?? leg?.exitPrice ?? entryP).toFixed(2));
    const exactPnl = Number(((side === 'BUY' ? exitP - entryP : entryP - exitP) * qty).toFixed(2));

    const discardReason = `Adaptive Loss Cut & Script Discard: ${baseSym} exited at ₹${exitP} (${exactPnl >= 0 ? '+' : ''}₹${exactPnl.toFixed(2)}) — Quarantined to prevent further drawdown`;
    quarantineLosingScript(baseSym, exactPnl, discardReason);
    if (!prunedSymbols.includes(baseSym)) {
      prunedSymbols.push(baseSym);
    }
    prunedCount += 1;

    return {
      ...o,
      status: 'SQUARED_OFF' as const,
      entryPrice: entryP,
      exitPrice: exitP,
      pnlINR: exactPnl,
      legs: o.legs.map((l, idx) =>
        idx === 0
          ? {
              ...l,
              price: entryP,
              exitPrice: exitP,
            }
          : l
      ),
      exitReason: `Discarded Losing Script (${baseSym} Quarantined · Capital Protected)`,
      orderDate: o.orderDate || orderDate,
      orderTime,
      timestamp: `${o.orderDate || orderDate} ${orderTime} (Discarded Loser)`,
    };
  });

  return {
    updatedOrders,
    prunedSymbols,
    prunedCount,
  };
}
