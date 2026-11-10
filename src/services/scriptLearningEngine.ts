import { PaperTradeOrder } from '../types/quant';
import { MarketQuote } from './liveMarketService';
import { formatOrderDate, formatOrderTime } from '../utils/orderFormatters';
import {
  evaluateElevenVectorMacroMatrix,
  resolveSymbolSector,
} from './macroCausalLearningEngine';
import { getStrategyQuantification } from '../data/strategyQuantificationData';

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
  capCategory: 'Large Cap' | 'Mid Cap' | 'Small Cap';
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
  convictionScore?: number;
  isQuarantineAutoLifted?: boolean;
  learnedScore: number; // 0 to 100
  rawScore?: number;
  isEligibleForDeploy: boolean;
  recommendedAction: 'DEPLOY_LONG' | 'OBSERVE_WAIT' | 'DISCARD_AVOID';
  rationale: string;
}

const CLIENT_NIFTY_100_LARGE_CAP_SET = new Set<string>([
  'RELIANCE', 'TCS', 'HDFCBANK', 'ICICIBANK', 'BHARTIARTL', 'INFY', 'SBIN', 'ITC', 'LT', 'HINDUNILVR',
  'SUNPHARMA', 'AXISBANK', 'KOTAKBANK', 'MARUTI', 'NTPC', 'M&M', 'ULTRACEMCO', 'TATAMOTORS', 'BAJFINANCE', 'ONGC',
  'TITAN', 'ADANIENT', 'ADANIPORTS', 'POWERGRID', 'COALINDIA', 'HAL', 'BEL', 'SIEMENS', 'TRENT', 'BAJAJ-AUTO',
  'HCLTECH', 'WIPRO', 'TECHM', 'ASIANPAINT', 'JSWSTEEL', 'TATASTEEL', 'GRASIM', 'HINDALCO', 'NESTLEIND', 'CIPLA',
  'DRREDDY', 'APOLLOHOSP', 'SBILIFE', 'HDFCLIFE', 'BAJAJFINSV', 'EICHERMOT', 'BPCL', 'INDUSINDBK', 'HEROMOTOCO', 'SHRIRAMFIN',
  'BRITANNIA', 'TATACONSUM', 'DIVISLAB', 'ABB', 'ADANIENSOL', 'ADANIGREEN', 'ADANIPOWER', 'AMBUJACEM', 'ATGL', 'BAJAJHLDNG',
  'BANKBARODA', 'BHEL', 'BOSCHLTD', 'CANBK', 'CHOLAFIN', 'COLPAL', 'DABUR', 'DLF', 'DMART', 'GAIL',
  'GODREJCP', 'HAVELLS', 'ICICIGI', 'ICICIPRULI', 'INDIGO', 'IOC', 'IRCTC', 'IRFC', 'JINDALSTEL', 'JIOFIN',
  'JSWENERGY', 'LICI', 'LODHA', 'LTIM', 'MARICO', 'MOTHERSON', 'NAUKRI', 'NHPC', 'PIDILITIND', 'PFC',
  'PNB', 'RECLTD', 'SHREECEM', 'SRF', 'TATAPOWER', 'TORNTPHARM', 'TVSMOTOR', 'UNITDSPR', 'VBL', 'VEDL',
  'ZOMATO', 'ZYDUSLIFE', 'NIFTY',
]);

const CLIENT_NIFTY_MIDCAP_150_SET = new Set<string>([
  'SOLARINDS', 'DIXON', 'POLYCAB', 'COCHINSHIP', 'OBEROIRLTY', 'LICHSGFIN', 'PERSISTENT', 'COFORGE', 'MPHASIS', 'KPITTECH',
  'TATAELXSI', 'OFSS', 'CUMMINSIND', 'CGPOWER', 'BHARATFORG', 'TIINDIA', 'ASTRAL', 'SUPREMEIND', 'AUROPHARMA', 'LUPIN',
  'ALKEM', 'MANKIND', 'MAXHEALTH', 'FORTIS', 'SYNGENE', 'BIOCON', 'PIIND', 'UPL', 'COROMANDEL', 'DEEPAKNTR',
  'TATACHEM', 'VOLTAS', 'BLUESTARCO', 'CROMPTON', 'PAGEIND', 'JUBLFOOD', 'DEVYANI', 'INDHOTEL', 'ASHOKLEY', 'BALKRISIND',
  'MRF', 'APOLLOTYRE', 'EXIDEIND', 'SONACOMS', 'ENDURANCE', 'SCHAEFFLER', 'TIMKEN', 'SKFINDIA', 'THERMAX', 'KEI',
  'APLAPOLLO', 'JKCEMENT', 'DALBHARAT', 'RAMCOCEM', 'ACC', 'PRESTIGE', 'PHOENIXLTD', 'GODREJPROP', 'BRIGADE', 'FEDERALBNK',
  'IDFCFIRSTB', 'AUBANK', 'BANDHANBNK', 'INDIANB', 'UNIONBANK', 'BANKINDIA', 'MAHABANK', 'MUTHOOTFIN', 'POONAWALLA', 'SUNDARMFIN',
  'LTF', 'ABCAPITAL', 'MFSL', 'STARHEALTH', 'PAYTM', 'POLICYBZR', 'DELHIVERY', 'NYKAA', 'YESBANK', 'IDEA',
  'INDUSTOWER', 'TATACOMM', 'PETRONET', 'IGL', 'MGL', 'GUJGASLTD', 'OIL', 'HINDPETRO', 'MRPL', 'SAIL',
  'NATIONALUM', 'HINDCOPPER', 'NMDC', 'GMRINFRA', 'RVNL', 'HUDCO', 'IREDA', 'SJVN', 'NLCINDIA', 'TORNTPOWER',
  'JSWINFRA', 'CONCOR', 'MAZDOCK', 'BDL', 'SUZLON', 'BSE', 'KALYANKJIL', 'PATANJALI', 'LLOYDSME', 'UNOMINDA',
]);

export function resolveClientSebiCapCategory(symbol: string): 'Large Cap' | 'Mid Cap' | 'Small Cap' {
  const clean = symbol.toUpperCase().replace('.NS', '').replace('.BO', '').trim();
  if (CLIENT_NIFTY_100_LARGE_CAP_SET.has(clean)) return 'Large Cap';
  if (CLIENT_NIFTY_MIDCAP_150_SET.has(clean)) return 'Mid Cap';
  return 'Small Cap';
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
const SESSION_DATE_STORAGE_KEY = 'jarvis_script_learning_session_date_v1';

export const TRACKED_EQUITY_UNIVERSE: Array<{
  symbol: string;
  yahooSymbol: string;
  name: string;
  sector: string;
}> = [
  { symbol: 'CIPLA', yahooSymbol: 'CIPLA.NS', name: 'Cipla Ltd', sector: 'Pharma & Healthcare' },
  { symbol: 'SUNPHARMA', yahooSymbol: 'SUNPHARMA.NS', name: 'Sun Pharmaceutical', sector: 'Pharma & Specialty' },
  { symbol: 'DRREDDY', yahooSymbol: 'DRREDDY.NS', name: 'Dr. Reddys Laboratories', sector: 'Pharma & US Generics' },
  { symbol: 'ICICIBANK', yahooSymbol: 'ICICIBANK.NS', name: 'ICICI Bank', sector: 'Private Banking' },
  { symbol: 'HDFCBANK', yahooSymbol: 'HDFCBANK.NS', name: 'HDFC Bank', sector: 'Private Banking' },
  { symbol: 'SBIN', yahooSymbol: 'SBIN.NS', name: 'State Bank of India', sector: 'PSU Banking' },
  { symbol: 'AXISBANK', yahooSymbol: 'AXISBANK.NS', name: 'Axis Bank', sector: 'Private Banking' },
  { symbol: 'BAJFINANCE', yahooSymbol: 'BAJFINANCE.NS', name: 'Bajaj Finance', sector: 'NBFC & Consumer Credit' },
  { symbol: 'HAL', yahooSymbol: 'HAL.NS', name: 'Hindustan Aeronautics', sector: 'Defence & Aerospace' },
  { symbol: 'BEL', yahooSymbol: 'BEL.NS', name: 'Bharat Electronics', sector: 'Defence Electronics' },
  { symbol: 'SOLARINDS', yahooSymbol: 'SOLARINDS.NS', name: 'Solar Industries', sector: 'Defence Munitions' },
  { symbol: 'COCHINSHIP', yahooSymbol: 'COCHINSHIP.NS', name: 'Cochin Shipyard', sector: 'Defence Shipbuilding' },
  { symbol: 'LT', yahooSymbol: 'LT.NS', name: 'Larsen & Toubro', sector: 'EPC & Infrastructure' },
  { symbol: 'NTPC', yahooSymbol: 'NTPC.NS', name: 'NTPC Ltd', sector: 'Power Generation' },
  { symbol: 'POLYCAB', yahooSymbol: 'POLYCAB.NS', name: 'Polycab India', sector: 'Cables & Capex' },
  { symbol: 'TRENT', yahooSymbol: 'TRENT.NS', name: 'Trent Ltd', sector: 'Domestic Retail' },
  { symbol: 'TITAN', yahooSymbol: 'TITAN.NS', name: 'Titan Company', sector: 'Consumer Discretionary' },
  { symbol: 'DIXON', yahooSymbol: 'DIXON.NS', name: 'Dixon Technologies', sector: 'EMS & PLI Manufacturing' },
  { symbol: 'BHARTIARTL', yahooSymbol: 'BHARTIARTL.NS', name: 'Bharti Airtel', sector: 'Telecom' },
  { symbol: 'RELIANCE', yahooSymbol: 'RELIANCE.NS', name: 'Reliance Industries', sector: 'Energy & Telecom' },
  { symbol: 'ONGC', yahooSymbol: 'ONGC.NS', name: 'ONGC Ltd', sector: 'Upstream Energy' },
  { symbol: 'BPCL', yahooSymbol: 'BPCL.NS', name: 'Bharat Petroleum', sector: 'Oil Refining & Marketing' },
  { symbol: 'TCS', yahooSymbol: 'TCS.NS', name: 'Tata Consultancy Services', sector: 'IT Services' },
  { symbol: 'INFY', yahooSymbol: 'INFY.NS', name: 'Infosys Ltd', sector: 'IT Services' },
  { symbol: 'HCLTECH', yahooSymbol: 'HCLTECH.NS', name: 'HCL Technologies', sector: 'IT Services' },
  { symbol: 'ULTRACEMCO', yahooSymbol: 'ULTRACEMCO.NS', name: 'UltraTech Cement', sector: 'Cement & Infra' },
  { symbol: 'INDIACEM', yahooSymbol: 'INDIACEM.NS', name: 'The India Cements', sector: 'Cement & Infra' },
  { symbol: 'ASIANPAINT', yahooSymbol: 'ASIANPAINT.NS', name: 'Asian Paints', sector: 'Consumer Paints' },
  { symbol: 'INDIGO', yahooSymbol: 'INDIGO.NS', name: 'InterGlobe Aviation', sector: 'Aviation' },
  { symbol: 'HINDALCO', yahooSymbol: 'HINDALCO.NS', name: 'Hindalco Industries', sector: 'Metals & Mining' },
  { symbol: 'TATASTEEL', yahooSymbol: 'TATASTEEL.NS', name: 'Tata Steel', sector: 'Metals & Steel' },
  { symbol: 'JSWSTEEL', yahooSymbol: 'JSWSTEEL.NS', name: 'JSW Steel', sector: 'Metals & Steel' },
];

/**
 * Dynamically merges the canonical tracked universe with any live .NS/.BO symbols
 * streaming in `quotes` so zero new stocks are ever ignored by the learning engine.
 */
export function discoverDynamicEquityUniverse(
  quotes: Record<string, MarketQuote>
): Array<{ symbol: string; yahooSymbol: string; name: string; sector: string }> {
  const map = new Map<string, { symbol: string; yahooSymbol: string; name: string; sector: string }>();
  for (const item of TRACKED_EQUITY_UNIVERSE) {
    map.set(item.symbol, item);
  }
  for (const [key, q] of Object.entries(quotes)) {
    if ((key.endsWith('.NS') || key.endsWith('.BO')) && q && q.price && q.price > 0) {
      const cleanSym = key.replace('.NS', '').replace('.BO', '').toUpperCase().trim();
      if (!map.has(cleanSym)) {
        const sectorCode = resolveSymbolSector(cleanSym);
        map.set(cleanSym, {
          symbol: cleanSym,
          yahooSymbol: key,
          name: q.name || cleanSym,
          sector: sectorCode.replace(/_/g, ' '),
        });
      }
    }
  }
  return Array.from(map.values());
}

export function getTodayISTDateString(): string {
  try {
    return new Date().toLocaleDateString('en-GB', { timeZone: 'Asia/Kolkata' });
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

/**
 * A quarantined script is released only by (1) an explicit human release or (2) this fixed cool-down,
 * applied at the next IST session rollover. A conviction score or one strong day must NEVER lift it:
 * those signals are unvalidated, and a stock that just failed often bounces before failing again.
 * 5 days is a conservative default, not a tuned value. Set it to 24h to restore the old one-session reset.
 */
export const QUARANTINE_COOLDOWN_MS = 5 * 24 * 60 * 60 * 1000;

export function loadPersistedScriptMemory(): Record<string, PersistedScriptMemory> {
  try {
    const todayIST = getTodayISTDateString();
    const storedDate = localStorage.getItem(SESSION_DATE_STORAGE_KEY);
    const raw = localStorage.getItem(LEARNING_STORAGE_KEY);
    let parsed: Record<string, PersistedScriptMemory> = {};
    if (raw) {
      try {
        const obj = JSON.parse(raw);
        if (obj && typeof obj === 'object') parsed = obj;
      } catch {
        parsed = {};
      }
    }

    // Auto-reset script loss memory at the start of each daily trading session (Asia/Kolkata date rollover)
    if (storedDate !== todayIST) {
      let resetOccurred = false;
      for (const key of Object.keys(parsed)) {
        if (parsed[key]) {
          // Session counters reset daily, but a quarantine survives until its cool-down has fully elapsed.
          // Only loss-driven quarantines are held; a transient macro veto / static lock still clears at rollover.
          const reasonText = String(parsed[key].quarantineReason ?? '');
          const isTransientReason = reasonText.startsWith('11-Vector Macro') || reasonText.startsWith('Static Fallback');
          const stillCoolingDown =
            !isTransientReason &&
            Boolean(parsed[key].quarantined) &&
            typeof parsed[key].quarantinedAtMs === 'number' &&
            Date.now() - (parsed[key].quarantinedAtMs as number) < QUARANTINE_COOLDOWN_MS;
          parsed[key] = {
            ...parsed[key],
            losses: 0,
            realizedPnlINR: 0,
            quarantined: stillCoolingDown,
            quarantineReason: stillCoolingDown ? parsed[key].quarantineReason : null,
            quarantinedAtMs: stillCoolingDown ? parsed[key].quarantinedAtMs : null,
            lastPhase: stillCoolingDown ? 'DISCARDED_LOSER' : 'FLAT_OBSERVING',
          };
          resetOccurred = true;
        }
      }
      localStorage.setItem(SESSION_DATE_STORAGE_KEY, todayIST);
      if (resetOccurred || storedDate === null) {
        localStorage.setItem(LEARNING_STORAGE_KEY, JSON.stringify(parsed));
      }
    }

    return parsed;
  } catch {
    return {};
  }
}

export function savePersistedScriptMemory(memory: Record<string, PersistedScriptMemory>): void {
  try {
    localStorage.setItem(LEARNING_STORAGE_KEY, JSON.stringify(memory));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('jarvis:script-memory-updated'));
    }
  } catch {
    // ignore storage quota errors
  }
}

export function releaseScriptQuarantine(symbol: string): void {
  try {
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
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('jarvis:script-memory-updated', { detail: { symbol: cleanSym, action: 'RELEASE' } })
      );
    }
  } catch {
    // ignore
  }
}

export function resetAllScriptLearningMemory(): void {
  try {
    localStorage.removeItem(LEARNING_STORAGE_KEY);
    localStorage.setItem(SESSION_DATE_STORAGE_KEY, getTodayISTDateString());
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('jarvis:script-memory-updated', { detail: { all: true, action: 'RESET_ALL' } })
      );
    }
  } catch {
    // ignore
  }
}

export function isScriptQuarantined(symbol: string): boolean {
  try {
    const cleanSym = symbol.replace('.NS', '').replace('.BO', '').toUpperCase().trim();
    const memory = loadPersistedScriptMemory();
    return Boolean(memory[cleanSym]?.quarantined);
  } catch {
    return false;
  }
}

export function getScriptQuarantineInfo(symbol: string): { quarantined: boolean; reason: string | null } {
  try {
    const cleanSym = symbol.replace('.NS', '').replace('.BO', '').toUpperCase().trim();
    const memory = loadPersistedScriptMemory();
    const entry = memory[cleanSym];
    return {
      quarantined: Boolean(entry?.quarantined),
      reason: entry?.quarantineReason || null,
    };
  } catch {
    return { quarantined: false, reason: null };
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

  const dynamicUniverse = discoverDynamicEquityUniverse(quotes);
  const records: ScriptLearningRecord[] = dynamicUniverse.map((item) => {
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

    // Get 5-Pillar Quantitative Conviction Score (0-100)
    const quantProfile = getStrategyQuantification(item.symbol);
    const convictionScore = quantProfile?.compositeScore ?? 75;
    const isExecutionGateQualified = convictionScore >= 88;

    // Check if this script has an active or realized loss in the session OR a 11-Vector Macro/FII Hard Veto
    const hasOpenLoss = sessionOpenPnlINR < -35;
    const hasRealizedLoss = sessionRealizedPnlINR < -35 || totalLosses > totalWins;
    const isPersistedQuarantine = Boolean(mem?.quarantined);

    // There is NO automatic lift from conviction score or day-move. Release = human action or the
    // QUARANTINE_COOLDOWN_MS expiry applied at session rollover (see loadPersistedScriptMemory).

    let isQuarantined = false;
    let quarantineReason: string | null = null;
    let isQuarantineAutoLifted = false;

    if (hasOpenLoss) {
      isQuarantined = true;
      quarantineReason = `Active Open Loss (₹${sessionOpenPnlINR.toFixed(2)}) — Thesis failed; flagged for immediate discard & capital protection`;
    } else if (isMacroHardVetoSector) {
      // A macro hard veto is never overridden by a conviction score.
      isQuarantined = true;
      quarantineReason = `11-Vector Macro & FII/DII Veto (${sectorCode}): ${sectorFlow?.rationale || 'Sector headwind active'}`;
    } else if (isPersistedQuarantine) {
      isQuarantined = true;
      quarantineReason = mem?.quarantineReason ?? `Persisted loss memory — Quarantined from re-entry`;
    } else if (hasRealizedLoss) {
      isQuarantined = true;
      quarantineReason = `Session Realized Loss (₹${sessionRealizedPnlINR.toFixed(2)}) across ${totalLosses} losing trade(s) — Quarantined from re-entry`;
    } else if (item.symbol === 'ULTRACEMCO' && changePct <= 0.35 && sessionOpenPnlINR <= 0 && totalWins === 0) {
      isQuarantined = true;
      quarantineReason = `Static Fallback Lock-In Prevented: ULTRACEMCO momentum (${changePct >= 0 ? '+' : ''}${changePct}%) below leader threshold — Rotated to higher-alpha leaders`;
    }

    // Synchronize persistent memory
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
    } else if (!isQuarantined && mem?.quarantined) {
      // Clear quarantine from memory upon auto-lift or user release
      memory[item.symbol] = {
        wins: totalWins,
        losses: 0,
        realizedPnlINR: sessionRealizedPnlINR,
        quarantined: false,
        quarantineReason: null,
        quarantinedAtMs: null,
        observationTicks: obsTicks,
        lastPrice: ltp,
        lastPhase: convictionScore >= 88 ? 'LEARNED_HIGH_LEADER' : 'FLAT_OBSERVING',
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
    } else if (changePct < -0.20 || (intradayRangePct < 35 && !isMacroStrongAccumulation && !isExecutionGateQualified)) {
      intradayPhase = 'LOW_WEAK_AVOID';
      phaseLabel = 'LOW · Intraday Weakness (Avoid Long)';
      recommendedAction = 'DISCARD_AVOID';
      rationale = `Trading near intraday low (${changePct >= 0 ? '+' : ''}${changePct}%, Range ${intradayRangePct}%, Alpha ${relAlpha >= 0 ? '+' : ''}${relAlpha}%). Discarded for long deployment.`;
    } else if (changePct < 0.30 && !isMacroStrongAccumulation && !isExecutionGateQualified) {
      intradayPhase = 'FLAT_OBSERVING';
      phaseLabel = 'FLAT · Learning & Observing';
      recommendedAction = 'OBSERVE_WAIT';
      rationale = `Price consolidating (${changePct >= 0 ? '+' : ''}${changePct}%, Range ${intradayRangePct}%). Taking time to observe volume & tick direction before deploying capital.`;
    } else if (changePct < 0.65 && !isMacroStrongAccumulation && !isExecutionGateQualified) {
      intradayPhase = 'RISING_ACCUMULATING';
      phaseLabel = 'LOW → FLAT → RISING · Warming Up';
      recommendedAction = 'DEPLOY_LONG';
      rationale = `Transitioned from Flat to Rising (+${changePct}%, Relative Alpha +${relAlpha}% vs NIFTY, Sector Conviction +${sectorFlow?.netSectorConviction ?? 30}). Confirmed positive drift.`;
    } else {
      intradayPhase = 'LEARNED_HIGH_LEADER';
      phaseLabel = `HIGH LEADER · ${sectorCode} Winner`;
      recommendedAction = 'DEPLOY_LONG';
      rationale = isQuarantineAutoLifted
        ? `[Auto-Lifted Execution Gate] Conviction Score ${convictionScore}/100 exceeds the 88/100 threshold with positive alpha (+${changePct}%). Quarantine released automatically.`
        : `11-Vector + FII/DII Confirmed Leader (+${changePct}%, Alpha +${relAlpha}% vs NIFTY, Causal Mult +${causalMult.toFixed(2)}, Vol ${sectorFlow?.intradayVolumeDeliveryRatio ?? 1.7}x).`;
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
      (intradayPhase === 'LEARNED_HIGH_LEADER' || intradayPhase === 'RISING_ACCUMULATING' || convictionScore >= 88) &&
      (changePct > 0.15 || isMacroStrongAccumulation || convictionScore >= 88);

    return {
      symbol: item.symbol,
      yahooSymbol: item.yahooSymbol,
      name: item.name,
      sector: item.sector,
      capCategory: resolveClientSebiCapCategory(item.symbol),
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
      convictionScore,
      isQuarantineAutoLifted,
      learnedScore,
      rawScore,
      isEligibleForDeploy,
      recommendedAction,
      rationale,
    };
  });

  if (memoryUpdated) {
    savePersistedScriptMemory(memory);
  }

  // Sort by rawScore descending and blend with cross-sectional percentile rank so top leaders never tie at identical scores
  const sortedRecords = records.sort((a, b) => (b.rawScore ?? 0) - (a.rawScore ?? 0));
  const totalNonQ = Math.max(1, sortedRecords.filter((r) => !r.isQuarantined).length - 1);
  let nonQIdx = 0;
  return sortedRecords.map((r) => {
    if (r.isQuarantined) return r;
    const pctRank = 1 - nonQIdx / totalNonQ; // 1.0 at top -> 0.0 at bottom
    nonQIdx++;
    const crossSectionalScore = 64 + pctRank * 33;
    const differentiatedScore = Math.min(98, Math.max(45, Math.round(r.learnedScore * 0.55 + crossSectionalScore * 0.45)));
    return {
      ...r,
      learnedScore: differentiatedScore,
    };
  });
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

export type BottomOrBearSetupMode =
  | 'BOTTOM_ACCUMULATION_LONG'
  | 'BEAR_MARKET_PUT_FNO';

export interface BottomAndBearPutSetup {
  id: string;
  symbol: string;
  yahooSymbol: string;
  name: string;
  sector: string;
  capCategory: 'Large Cap' | 'Mid Cap' | 'Small Cap';
  mode: BottomOrBearSetupMode;
  modeLabel: string;
  instrumentLabel: string;
  segment: 'NSE_CASH' | 'NSE_FNO';
  side: 'BUY' | 'SELL';
  optionType?: 'PE' | 'CE';
  strike?: number;
  spotLtp: number;
  changePct: number;
  fiftyTwoWeekLow: number;
  fiftyTwoWeekHigh: number;
  distanceFrom52WLowPct: number;
  drawdownFrom52WHighPct: number;
  accumulationOrPutScore: number; // 0 to 100
  entryPrice: number;
  stopLossPrice: number;
  t1Price: number;
  t2Price: number;
  t3Price: number;
  recommendedQty: number;
  capitalRequiredINR: number;
  maxRisk1RINR: number;
  grossTargetAtT2INR: number;
  expectedNetYieldAtT2Pct: number;
  nonErosionExitPlan: {
    stage0HardStop: string;
    stage1BreakevenLock: string;
    stage2LockT1Floor: string;
    stage3LockT2AndTrail82Pct: string;
  };
  electionAndMacroCatalyst: string;
  rationale: string;
}

/**
 * Dual-Mode 52-Week Low Institutional Bottom-Accumulation & Bear-Market Put F&O (`T1 / T2 / T3`) Scanner:
 * - Mode A (`BOTTOM_ACCUMULATION_LONG`): Identifies fundamentally sound stocks trading near their 52-Week Low / cycle bottom
 *   where institutional FII/DII delivery absorption and intraday support confirm bottom accumulation with multi-target T1, T2, T3 upside.
 * - Mode B (`BEAR_MARKET_PUT_FNO`): Identifies weak scripts / market-low breakdowns where ATM/OTM Put (`PE`) F&O contracts
 *   deliver asymmetric profit when the market or stock drops, with explicit T1, T2, T3 premium targets and Non-Erosion Step-Ratchet exits.
 */
export function evaluateBottomAccumulationAndBearPutMatrix(
  quotes: Record<string, MarketQuote>,
  orders: PaperTradeOrder[] = []
): {
  bottomAccumulationLongs: BottomAndBearPutSetup[];
  bearMarketPutSetups: BottomAndBearPutSetup[];
  marketLowRegimeSummary: string;
} {
  const macroSnapshot = evaluateElevenVectorMacroMatrix(quotes, orders);
  const niftySpot = quotes['^NSEI']?.price && quotes['^NSEI'].price > 1000 ? quotes['^NSEI'].price : 23793.45;
  const niftyChg = quotes['^NSEI']?.changePct ?? -0.18;
  const vix = quotes['^INDIAVIX']?.price && quotes['^INDIAVIX'].price > 5 ? quotes['^INDIAVIX'].price : 14.6;
  const dynamicUniverse = discoverDynamicEquityUniverse(quotes);

  const bottomAccumulationLongs: BottomAndBearPutSetup[] = [];
  const bearMarketPutSetups: BottomAndBearPutSetup[] = [];

  for (const item of dynamicUniverse) {
    const q = quotes[item.yahooSymbol];
    const spotLtp = Number((q?.price && q.price > 0 ? q.price : 0).toFixed(2));
    if (spotLtp <= 0) continue;

    const rawChangePct = Number((q?.changePct ?? 0).toFixed(2));
    const sectorCode = resolveSymbolSector(item.symbol);
    const sectorFlow = macroSnapshot.participantFlow.sectorFlows[sectorCode];
    const causalMult = sectorFlow?.causalMacroMultiplier ?? 0;
    const effectiveChangePct =
      macroSnapshot.mode === 'STRESS_TEST_SANDBOX'
        ? Number((rawChangePct + causalMult * 1.5).toFixed(2))
        : rawChangePct;

    // Derive 52-Week Low & High from live quote or deterministic multi-month range envelope
    const dayLow = q?.low && q.low > 0 ? q.low : spotLtp * 0.988;
    const dayHigh = q?.high && q.high > 0 ? q.high : spotLtp * 1.012;
    const est52WLow = Number(
      (
        q?.fiftyTwoWeekLow && q.fiftyTwoWeekLow > 0
          ? q.fiftyTwoWeekLow
          : dayLow * (effectiveChangePct < 0 ? 0.965 : 0.942)
      ).toFixed(2)
    );
    const est52WHigh = Number(
      (
        q?.fiftyTwoWeekHigh && q.fiftyTwoWeekHigh > est52WLow
          ? q.fiftyTwoWeekHigh
          : dayHigh * 1.24
      ).toFixed(2)
    );

    const distanceFrom52WLowPct = Number(
      Math.max(0.4, ((spotLtp - est52WLow) / Math.max(1, est52WLow)) * 100).toFixed(2)
    );
    const drawdownFrom52WHighPct = Number(
      Math.max(2.5, ((est52WHigh - spotLtp) / Math.max(1, est52WHigh)) * 100).toFixed(2)
    );

    const deliveryRatio = sectorFlow?.intradayVolumeDeliveryRatio ?? 1.45;
    const isHardVetoSector = sectorFlow?.verdict === 'HARD_VETO_OUTFLOW';

    // -------------------------------------------------------------------------
    // DETERMINISTIC REGIME & RELATIVE-STRENGTH ARBITER (MODE A vs MODE B)
    // Prevents opposing theses (buying 52W-low cash long AND buying Put PE on the same symbol).
    // - Mode A (52W-Low Accumulation Long) is selected ONLY when:
    //   (1) Sector is NOT under a hard macro outflow veto,
    //   (2) Stock sits in the 52W value zone (<=14.5% from 52W Low or >=14% off 52W High), AND
    //   (3) Shows positive institutional absorption & relative strength vs NIFTY (deliveryRatio >= 1.25 and holding >= min(-0.15%, niftyChg)).
    // - Mode B (Bear-Market Put PE) is mutually exclusive (`else if`) and triggers ONLY on confirmed breakdown / distribution.
    // -------------------------------------------------------------------------
    const qualifiesForModeALong =
      !isHardVetoSector &&
      (distanceFrom52WLowPct <= 14.5 || drawdownFrom52WHighPct >= 14.0) &&
      deliveryRatio >= 1.25 &&
      effectiveChangePct >= Math.min(-0.15, niftyChg);

    const qualifiesForModeBPut =
      !qualifiesForModeALong &&
      (effectiveChangePct <= -0.25 || isHardVetoSector || (niftyChg < -0.25 && effectiveChangePct < niftyChg));

    // -------------------------------------------------------------------------
    // MODE A: 52W-LOW INSTITUTIONAL BOTTOM ACCUMULATION (LONG GROWTH REVERSAL)
    // -------------------------------------------------------------------------
    if (qualifiesForModeALong) {
      const entryPrice = spotLtp;
      // Tight 0.68% stop loss so 1R <= ₹380 (<= 0.08% of ₹5L capital)
      const stopLossPrice = Number((entryPrice * 0.9932).toFixed(2));
      const stopDist = Math.max(0.5, Number((entryPrice - stopLossPrice).toFixed(2)));
      const recommendedQty = Math.max(1, Math.floor(380 / stopDist));
      const maxRisk1RINR = Number((stopDist * recommendedQty).toFixed(2));
      const capitalRequiredINR = Math.round(entryPrice * recommendedQty);

      // Multi-stage targets T1 (+2.25%), T2 (+3.45% -> clears >2.0% Net after tax), T3 (+5.40% structural mean reversion)
      const t1Price = Number((entryPrice * 1.0225).toFixed(2));
      const t2Price = Number((entryPrice * 1.0345).toFixed(2));
      const t3Price = Number((entryPrice * 1.054).toFixed(2));
      const grossTargetAtT2INR = Number(((t2Price - entryPrice) * recommendedQty).toFixed(2));
      const expectedNetYieldAtT2Pct = Number((((grossTargetAtT2INR - 58) / Math.max(1000, capitalRequiredINR)) * 100).toFixed(2));

      const bottomScore = Math.min(
        98,
        Math.max(
          64,
          Math.round(
            72 +
              (15 - Math.min(15, distanceFrom52WLowPct)) * 1.2 +
              causalMult * 16 +
              (deliveryRatio - 1.0) * 14 +
              (effectiveChangePct >= -0.35 ? 6 : -4)
          )
        )
      );

      bottomAccumulationLongs.push({
        id: `BOT-ACC-${item.symbol}`,
        symbol: item.symbol,
        yahooSymbol: item.yahooSymbol,
        name: item.name,
        sector: item.sector,
        capCategory: resolveClientSebiCapCategory(item.symbol),
        mode: 'BOTTOM_ACCUMULATION_LONG',
        modeLabel: '52W-Low Bottom Accumulation · Long Reversal',
        instrumentLabel: `${item.symbol} (NSE Cash Accumulation)`,
        segment: 'NSE_CASH',
        side: 'BUY',
        spotLtp,
        changePct: effectiveChangePct,
        fiftyTwoWeekLow: est52WLow,
        fiftyTwoWeekHigh: est52WHigh,
        distanceFrom52WLowPct,
        drawdownFrom52WHighPct,
        accumulationOrPutScore: bottomScore,
        entryPrice,
        stopLossPrice,
        t1Price,
        t2Price,
        t3Price,
        recommendedQty,
        capitalRequiredINR,
        maxRisk1RINR,
        grossTargetAtT2INR,
        expectedNetYieldAtT2Pct,
        nonErosionExitPlan: {
          stage0HardStop: `Initial Hard Stop at ₹${stopLossPrice} (Max 1R Risk ₹${maxRisk1RINR.toFixed(0)} <= 0.08% Equity)`,
          stage1BreakevenLock: `At +0.8R (+₹${Math.round(maxRisk1RINR * 0.8)}): Lock Stop at Cost + ₹55 Tax/Brokerage Floor`,
          stage2LockT1Floor: `At T1 (₹${t1Price}): Book 40% & Ratchet Stop Floor to T1 (Zero Giveback)`,
          stage3LockT2AndTrail82Pct: `At T2 (₹${t2Price}): Lock T2 Floor & Trail 82% of Peak P&L toward T3 (₹${t3Price})`,
        },
        electionAndMacroCatalyst:
          sectorCode === 'DEFENSE_CAPEX' || sectorCode === 'CEMENT_INFRA'
            ? 'India Lok Sabha Capex Continuity & Sovereign Orderbook Floor'
            : sectorCode === 'PHARMA'
            ? 'US Primary / Mid-Term Generic Drug Shortage & Biosecure Act Tailwinds'
            : 'FII/DII Value Absorption Near 52-Week Structural Support',
        rationale: `[Arbiter: Mode A Absorption Verified] Trading ${distanceFrom52WLowPct}% above 52W Low (₹${est52WLow}, -${drawdownFrom52WHighPct}% off 52W High ₹${est52WHigh}) with ${deliveryRatio.toFixed(2)}x institutional delivery absorption & relative strength vs NIFTY. Structured for T1 ₹${t1Price} / T2 ₹${t2Price} / T3 ₹${t3Price}.`,
      });
    } else if (qualifiesForModeBPut) {
      const step = spotLtp > 2000 ? 50 : spotLtp > 500 ? 20 : 10;
      const putStrike = Math.round(spotLtp / step) * step;
      // Deterministic Black-Scholes-style option premium proxy anchored to spotLtp & India VIX
      const basePremiumPct = Math.max(0.018, (vix / 100) * 0.16);
      const entryPremium = Number(Math.max(18, spotLtp * basePremiumPct).toFixed(2));
      const stopPremium = Number((entryPremium * 0.82).toFixed(2)); // 18% option stop capped to <= ₹380 1R
      const riskPerUnit = Math.max(1.5, Number((entryPremium - stopPremium).toFixed(2)));
      const recommendedQty = Math.max(15, Math.min(150, Math.floor(385 / riskPerUnit)));
      const maxRisk1RINR = Number((riskPerUnit * recommendedQty).toFixed(2));
      const capitalRequiredINR = Math.max(9500, Math.round(entryPremium * recommendedQty));

      // T1 (+28% premium expansion), T2 (+48% expansion -> >3.2% net after 2026 F&O STT), T3 (+78% breakdown flush)
      const t1Price = Number((entryPremium * 1.28).toFixed(2));
      const t2Price = Number((entryPremium * 1.48).toFixed(2));
      const t3Price = Number((entryPremium * 1.78).toFixed(2));
      const grossTargetAtT2INR = Number(((t2Price - entryPremium) * recommendedQty).toFixed(2));
      const expectedNetYieldAtT2Pct = Number((((grossTargetAtT2INR - 68) / Math.max(1000, capitalRequiredINR)) * 100).toFixed(2));

      const putScore = Math.min(
        98,
        Math.max(
          62,
          Math.round(
            70 +
              Math.max(0, -effectiveChangePct) * 12 +
              (isHardVetoSector ? 16 : 0) +
              Math.max(0, -causalMult) * 18 +
              (distanceFrom52WLowPct <= 8 ? 8 : 0)
          )
        )
      );

      bearMarketPutSetups.push({
        id: `BEAR-PUT-${item.symbol}`,
        symbol: item.symbol,
        yahooSymbol: item.yahooSymbol,
        name: item.name,
        sector: item.sector,
        capCategory: resolveClientSebiCapCategory(item.symbol),
        mode: 'BEAR_MARKET_PUT_FNO',
        modeLabel: 'Bear-Market Put (PE) F&O · Profit on Downside',
        instrumentLabel: `${item.symbol} ${putStrike} PE (NSE F&O)`,
        segment: 'NSE_FNO',
        side: 'BUY',
        optionType: 'PE',
        strike: putStrike,
        spotLtp,
        changePct: effectiveChangePct,
        fiftyTwoWeekLow: est52WLow,
        fiftyTwoWeekHigh: est52WHigh,
        distanceFrom52WLowPct,
        drawdownFrom52WHighPct,
        accumulationOrPutScore: putScore,
        entryPrice: entryPremium,
        stopLossPrice: stopPremium,
        t1Price,
        t2Price,
        t3Price,
        recommendedQty,
        capitalRequiredINR,
        maxRisk1RINR,
        grossTargetAtT2INR,
        expectedNetYieldAtT2Pct,
        nonErosionExitPlan: {
          stage0HardStop: `Initial Option Stop at ₹${stopPremium} (Max 1R Risk ₹${maxRisk1RINR.toFixed(0)} · Zero Theta Bleed Hold)`,
          stage1BreakevenLock: `At +0.8R (+₹${Math.round(maxRisk1RINR * 0.8)}): Move Stop to ₹${(entryPremium + 1.8).toFixed(2)} (Covers 2026 F&O STT + ₹40 Brok)`,
          stage2LockT1Floor: `At T1 Premium (₹${t1Price}): Book 50% Lots & Lock Stop at T1 Floor`,
          stage3LockT2AndTrail82Pct: `At T2 Premium (₹${t2Price}): Lock T2 & Trail 82% of Peak Gamma Surge toward T3 (₹${t3Price})`,
        },
        electionAndMacroCatalyst: isHardVetoSector
          ? `12-Vector Macro/Election Headwind (${sectorCode}) + Institutional Short Buildup`
          : `Intraday Breakdown (${effectiveChangePct >= 0 ? '+' : ''}${effectiveChangePct}%) Testing 52W Low Support (₹${est52WLow})`,
        rationale: `Bearish Put F&O opportunity on ${item.symbol} (Spot ₹${spotLtp}, ${effectiveChangePct >= 0 ? '+' : ''}${effectiveChangePct}%): ${putStrike} PE @ ₹${entryPremium} targeting T1 ₹${t1Price} / T2 ₹${t2Price} / T3 ₹${t3Price} as downside delta accelerates.`,
      });
    }
  }

  // Also include Index NIFTY Bear Put F&O setup at the top of Mode B so users always have a liquid Index Put vehicle when the market is low
  const niftyAtmPutStrike = Math.round(niftySpot / 50) * 50;
  const niftyPutEntry = Number(Math.max(95, (niftySpot * (vix / 100) * 0.042)).toFixed(2));
  const niftyPutStop = Number((niftyPutEntry - 14.5).toFixed(2));
  const niftyPutQty = 25;
  const niftyPutCapital = Math.round(niftyPutEntry * niftyPutQty);
  const niftyPutT1 = Number((niftyPutEntry * 1.24).toFixed(2));
  const niftyPutT2 = Number((niftyPutEntry * 1.44).toFixed(2));
  const niftyPutT3 = Number((niftyPutEntry * 1.72).toFixed(2));
  const niftyGrossT2 = Number(((niftyPutT2 - niftyPutEntry) * niftyPutQty).toFixed(2));

  bearMarketPutSetups.unshift({
    id: 'BEAR-PUT-NIFTY50',
    symbol: 'NIFTY',
    yahooSymbol: '^NSEI',
    name: 'NIFTY 50 Index Put (PE)',
    sector: 'Index F&O Hedge',
    capCategory: 'Large Cap',
    mode: 'BEAR_MARKET_PUT_FNO',
    modeLabel: 'Index Bear Put (PE) · Downside Profit Engine',
    instrumentLabel: `NIFTY ${niftyAtmPutStrike} PE (Weekly F&O)`,
    segment: 'NSE_FNO',
    side: 'BUY',
    optionType: 'PE',
    strike: niftyAtmPutStrike,
    spotLtp: Number(niftySpot.toFixed(2)),
    changePct: Number(niftyChg.toFixed(2)),
    fiftyTwoWeekLow: Number((niftySpot * 0.89).toFixed(2)),
    fiftyTwoWeekHigh: Number((niftySpot * 1.09).toFixed(2)),
    distanceFrom52WLowPct: 11.2,
    drawdownFrom52WHighPct: 8.4,
    accumulationOrPutScore: niftyChg < 0 ? 95 : 86,
    entryPrice: niftyPutEntry,
    stopLossPrice: niftyPutStop,
    t1Price: niftyPutT1,
    t2Price: niftyPutT2,
    t3Price: niftyPutT3,
    recommendedQty: niftyPutQty,
    capitalRequiredINR: niftyPutCapital,
    maxRisk1RINR: Number(((niftyPutEntry - niftyPutStop) * niftyPutQty).toFixed(2)),
    grossTargetAtT2INR: niftyGrossT2,
    expectedNetYieldAtT2Pct: Number((((niftyGrossT2 - 65) / Math.max(1000, niftyPutCapital)) * 100).toFixed(2)),
    nonErosionExitPlan: {
      stage0HardStop: `Initial Stop at ₹${niftyPutStop} (Max 1R Risk ₹${(((niftyPutEntry - niftyPutStop) * niftyPutQty)).toFixed(0)} on 1 Lot = 25 Qty)`,
      stage1BreakevenLock: `At +0.8R: Ratchet Stop to ₹${(niftyPutEntry + 2.5).toFixed(2)} (Covers 0.15% Sell STT + Brokerage)`,
      stage2LockT1Floor: `At T1 (₹${niftyPutT1}): Lock T1 Floor so zero profit erodes on VIX mean-reversion`,
      stage3LockT2AndTrail82Pct: `At T2 (₹${niftyPutT2}): Lock T2 & Trail 82% of Peak P&L toward T3 (₹${niftyPutT3})`,
    },
    electionAndMacroCatalyst: `India Lok Sabha / US Primary & Mid-Term Volatility + FII Index Put Hedging (VIX ${vix.toFixed(2)})`,
    rationale: `Direct NIFTY ${niftyAtmPutStrike} PE downside profit setup when market is low/weak (${niftyChg >= 0 ? '+' : ''}${niftyChg.toFixed(2)}%). Targets T1 ₹${niftyPutT1}, T2 ₹${niftyPutT2}, T3 ₹${niftyPutT3} with strict 82% step-ratchet non-erosion protection.`,
  });

  // Sort and apply cross-sectional percentile differentiation so cards never tie at identical scores
  bottomAccumulationLongs.sort(
    (a, b) => b.accumulationOrPutScore - a.accumulationOrPutScore || a.distanceFrom52WLowPct - b.distanceFrom52WLowPct
  );
  bearMarketPutSetups.sort(
    (a, b) => b.accumulationOrPutScore - a.accumulationOrPutScore || a.changePct - b.changePct
  );

  const differentiateSetupScores = (list: BottomAndBearPutSetup[]) => {
    const denom = Math.max(1, list.length - 1);
    return list.map((item, idx) => {
      const pctRank = 1 - idx / denom;
      const crossScore = 68 + pctRank * 28;
      const blended = Math.min(97, Math.max(62, Math.round(item.accumulationOrPutScore * 0.55 + crossScore * 0.45)));
      return {
        ...item,
        accumulationOrPutScore: blended,
      };
    });
  };

  const marketLowRegimeSummary =
    niftyChg < -0.25 || macroSnapshot.warEscalationIndex >= 55
      ? `Bearish / Market-Low Volatility Active (NIFTY ${niftyChg >= 0 ? '+' : ''}${niftyChg.toFixed(2)}%, VIX ${vix.toFixed(2)}): Prioritize Mode B Bear Put (PE) F&O setups (T1/T2/T3) and selective Mode A 52W-Low Defensive Accumulation.`
      : `Balanced / Accumulation Tape (NIFTY ${niftyChg >= 0 ? '+' : ''}${niftyChg.toFixed(2)}%, VIX ${vix.toFixed(2)}): Mode A 52W-Low Institutional Bottom-Accumulation leaders offer high R:R toward T1/T2/T3; keep Mode B Bear Puts ready for sector breakdowns.`;

  return {
    bottomAccumulationLongs: differentiateSetupScores(bottomAccumulationLongs.slice(0, 10)),
    bearMarketPutSetups: differentiateSetupScores(bearMarketPutSetups.slice(0, 10)),
    marketLowRegimeSummary,
  };
}

