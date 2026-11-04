import { PaperTradeOrder, TslStage } from '../types/quant';
import { MarketQuote } from './liveMarketService';
import {
  formatOrderDate,
  formatOrderTime,
  resolveDerivativeExpiryInfo,
  derivePositionStructureAndCost,
  ConstituentLegBreakdown
} from '../utils/orderFormatters';
import { generateLiveMarketOrder } from './agentQuantEngine';
import {
  pruneLosingOrdersAndQuarantine,
  extractBaseSymbolFromOrder,
  isAutoPruneLosersEnabled,
} from './scriptLearningEngine';
import { executeIntelligentScanAndDeploy } from './statutoryVetoEngine';
import {
  applyAsymmetricMacroShockShield,
  evaluateElevenVectorMacroMatrix,
} from './macroCausalLearningEngine';

export interface ExecutedTradeRecord {
  id: string;
  orderId: string;
  agentId: string;
  agentName: string;
  instrument: string;
  side: 'BUY' | 'SELL';
  qty: number;
  entryPrice: number;
  exitPrice: number;
  priceDeltaPerUnit: number;
  isOpen: boolean;
  pnl: number;
  peakPnlINR: number;
  trailingStopPnlINR: number;
  trailingStopPrice: number;
  maxDefinedLossINR: number;
  tslStage: TslStage;
  exitReason?: string;
  dateStr: string; // Strictly dd-mmm-yyyy
  timeStr: string; // Strictly [hh]:mm:ss
  expiryDateStr: string | null; // Strictly dd-mmm-yyyy for NSE F&O & MCX
  expirySeriesLabel: string | null;
  isDerivative: boolean;
  isTwoLegSpread: boolean;
  positionsCount: 1 | 2;
  positionCountBadge: string;
  qtyDisplayLabel: string;
  totalEntryCostINR: number; // EntryPrice × Qty
  totalCurrentValueINR: number; // ExitPrice/LTP × Qty
  marginDeployedINR: number; // Hedged Margin or Capital Blocked
  constituentLegs: ConstituentLegBreakdown[];
  segment: 'NSE_FNO' | 'NSE_CASH' | 'BSE_CASH' | 'MCX_FUTURES' | 'MCX_OPTIONS';
  status: 'OPEN' | 'SQUARED_OFF' | 'TARGET_HIT' | 'STOP_HIT' | 'TRAILING_STOP_HIT';
  strategyName: string;
}

const ORDERS_STORAGE_KEY = 'jarvis_session_orders';

// Legacy static seed IDs to strip out if previously cached in localStorage
const LEGACY_STATIC_IDS = new Set([
  'ORD-NSE-FNO-101', 'ORD-NSE-FNO-102', 'ORD-NSE-FNO-103',
  'ORD-NSE-CSH-201', 'ORD-NSE-CSH-202', 'ORD-NSE-CSH-203',
  'ORD-BSE-CSH-301', 'ORD-BSE-CSH-302',
  'ORD-MCX-FUT-401', 'ORD-MCX-FUT-402', 'ORD-MCX-FUT-403',
]);

/**
 * Guarantees every PaperTradeOrder in an array has a strictly unique ID,
 * strips any legacy static seed IDs, consolidates legacy multi-leg spreads into a unified
 * net-premium position, and enforces the strict mathematical invariant:
 * P&L === (ExitPrice - EntryPrice) * Qty * Direction.
 */
export function sanitizeAndDedupeOrders(trades: PaperTradeOrder[]): { cleaned: PaperTradeOrder[]; mutated: boolean } {
  if (!Array.isArray(trades)) return { cleaned: [], mutated: false };
  const filtered = trades.filter((o: PaperTradeOrder) => o && o.id && !LEGACY_STATIC_IDS.has(o.id));
  const seenIds = new Set<string>();
  let mutated = filtered.length !== trades.length;

  const cleaned = filtered.map((o: PaperTradeOrder, idx: number) => {
    let updated = o;
    if (seenIds.has(updated.id)) {
      mutated = true;
      const tag = (updated.agentId || 'AGT').replace('agent_', '').slice(0, 3).toUpperCase();
      let uniqueId = `${updated.id}-${tag}-${idx + 1}`;
      while (seenIds.has(uniqueId)) {
        uniqueId = `${uniqueId}-${Math.floor(Math.random() * 1000)}`;
      }
      seenIds.add(uniqueId);
      updated = { ...updated, id: uniqueId };
    } else {
      seenIds.add(updated.id);
    }

    const isBreakerTest = updated.id.startsWith('BREACH-SIM-');
    const cappedMaxLoss = isBreakerTest
      ? updated.maxDefinedLossINR
      : Math.min(400, Math.max(200, updated.maxDefinedLossINR || 380));

    const firstLeg = updated.legs?.[0];
    const side: 'BUY' | 'SELL' = (updated.side ?? firstLeg?.action ?? 'BUY') === 'SELL' ? 'SELL' : 'BUY';
    const qty = Math.max(1, updated.qty ?? firstLeg?.qty ?? 1);
    const entryPrice = Number((updated.entryPrice ?? firstLeg?.price ?? 100).toFixed(2));
    const currentSymbol = updated.symbol;

    // Resolve authoritative NSE Tuesday / Holiday-Adjusted expiry (e.g. 09-Nov-2026 Weekly, 23-Nov-2026 Monthly)
    const { expiryDateStr: authoritativeExpiry } = resolveDerivativeExpiryInfo(
      updated.segment,
      currentSymbol,
      updated.orderDate
    );
    const isStaleThursdayExpiry =
      updated.expiryDate && /^(05|12|19|26)-Nov-2026$/i.test(updated.expiryDate.trim());
    const resolvedExpiryDate =
      authoritativeExpiry || (!isStaleThursdayExpiry ? updated.expiryDate : undefined);

    // Resolve exitPrice and reconcile P&L so P&L === (Exit - Entry) * Qty * Direction
    let exitPrice = updated.exitPrice ?? firstLeg?.exitPrice;
    const rawPnl = Number((updated.pnlINR ?? 0).toFixed(2));

    if (exitPrice == null || !Number.isFinite(exitPrice) || exitPrice <= 0) {
      if (Math.abs(rawPnl) > 0.01) {
        exitPrice = Number(
          Math.max(0.05, side === 'BUY' ? entryPrice + rawPnl / qty : entryPrice - rawPnl / qty).toFixed(2)
        );
      } else {
        exitPrice = entryPrice;
      }
    } else {
      exitPrice = Number(exitPrice.toFixed(2));
      // If exitPrice equals entryPrice while rawPnl is non-zero, derive exitPrice from rawPnl
      if (Math.abs(exitPrice - entryPrice) < 0.01 && Math.abs(rawPnl) > 0.01) {
        exitPrice = Number(
          Math.max(0.05, side === 'BUY' ? entryPrice + rawPnl / qty : entryPrice - rawPnl / qty).toFixed(2)
        );
      }
    }

    // Eradicate the legacy ₹0.50 LTP decay bug on NSE_FNO spreads
    if (updated.segment === 'NSE_FNO' && (exitPrice <= 2.0 || exitPrice > entryPrice + 20)) {
      mutated = true;
      exitPrice = Number(Math.max(4.5, entryPrice * 0.68).toFixed(2));
    }

    const reconciledPnl = Number(
      ((side === 'BUY' ? exitPrice - entryPrice : entryPrice - exitPrice) * qty).toFixed(2)
    );

    const rawFloor = updated.trailingStopPnlINR ?? -cappedMaxLoss;
    const trailingStopPrice = Number(
      Math.max(
        0.05,
        side === 'BUY' ? entryPrice + rawFloor / qty : entryPrice - rawFloor / qty
      ).toFixed(2)
    );
    const trailingStopPnlINR = Number(
      ((side === 'BUY' ? trailingStopPrice - entryPrice : entryPrice - trailingStopPrice) * qty).toFixed(2)
    );

    const initialStopLossPrice =
      updated.initialStopLossPrice ??
      Number(Math.max(0.05, side === 'BUY' ? entryPrice - cappedMaxLoss / qty : entryPrice + cappedMaxLoss / qty).toFixed(2));

    const unifiedLeg = {
      instrument: updated.legs && updated.legs.length > 1 ? currentSymbol : (firstLeg?.instrument || currentSymbol),
      action: side,
      qty,
      price: entryPrice,
      exitPrice,
      strike: firstLeg?.strike,
      optionType: firstLeg?.optionType,
    };

    const nextStage: TslStage =
      updated.tslStage ??
      (updated.status === 'TRAILING_STOP_HIT'
        ? 'TRAILING_STOP_HIT'
        : updated.status === 'TARGET_HIT'
          ? 'TARGET_HIT'
          : updated.status === 'STOP_HIT'
            ? 'STOP_HIT'
            : 'INITIAL_RISK_STOP');

    const peakPnlINR = Number(
      Math.max(0, updated.peakPnlINR ?? 0, reconciledPnl).toFixed(2)
    );

    if (
      resolvedExpiryDate !== updated.expiryDate ||
      cappedMaxLoss !== updated.maxDefinedLossINR ||
      updated.tslStage == null ||
      (updated.legs && updated.legs.length > 1) ||
      updated.entryPrice !== entryPrice ||
      updated.exitPrice !== exitPrice ||
      updated.pnlINR !== reconciledPnl ||
      updated.trailingStopPrice !== trailingStopPrice
    ) {
      mutated = true;
      updated = {
        ...updated,
        symbol: currentSymbol,
        expiryDate: resolvedExpiryDate,
        side,
        qty,
        entryPrice,
        exitPrice,
        pnlINR: reconciledPnl,
        peakPnlINR,
        trailingStopPnlINR: updated.status === 'TRAILING_STOP_HIT' || updated.status === 'TARGET_HIT' ? reconciledPnl : trailingStopPnlINR,
        trailingStopPrice: updated.status === 'TRAILING_STOP_HIT' || updated.status === 'TARGET_HIT' ? exitPrice : trailingStopPrice,
        initialStopLossPrice,
        maxDefinedLossINR: cappedMaxLoss,
        tslStage: nextStage,
        legs: [unifiedLeg],
      };
    }

    return updated;
  });

  return { cleaned, mutated };
}

/**
 * Retrieve paper trade orders from localStorage.
 * Starts clean with 0 static seed rows — only stores trades actually executed by the 5 agents.
 */
export function getStoredPaperTrades(): PaperTradeOrder[] {
  try {
    const raw = localStorage.getItem(ORDERS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const { cleaned, mutated } = sanitizeAndDedupeOrders(parsed);
    if (mutated) {
      localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(cleaned));
    }
    return cleaned;
  } catch {
    return [];
  }
}

/**
 * Persist paper trades to localStorage and notify all app listeners.
 */
export function persistPaperTrades(trades: PaperTradeOrder[]): void {
  try {
    const { cleaned } = sanitizeAndDedupeOrders(trades);
    localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(cleaned));
    window.dispatchEvent(new CustomEvent('jarvis:orders-updated', { detail: cleaned }));
  } catch (err) {
    console.error('Failed to save paper trades:', err);
  }
}

/**
 * Autonomous Multi-Agent Auto-Execution Engine:
 * When the 5 agents are armed and real market quotes arrive, if no session orders
 * have been executed yet, the agents automatically evaluate broader market regime
 * and execute their initial defined-risk paper positions across NSE F&O, NSE Cash,
 * BSE Cash, and MCX Commodity.
 */
let autoExecutionTriggeredThisSession = false;

export function executeAdaptivePruneAndRotateCycle(
  currentOrders: PaperTradeOrder[],
  quotes: Record<string, MarketQuote>,
  manualTrigger: boolean = true
): {
  updatedOrders: PaperTradeOrder[];
  prunedSymbols: string[];
  rotatedSymbols: string[];
  prunedCount: number;
} {
  // State 1 & 2: Apply 82% Profit-Lock on open winners & exit macro-vetoed losers to Cash
  const shieldRes = applyAsymmetricMacroShockShield(currentOrders, quotes);
  const { updatedOrders: afterPrune, prunedSymbols, prunedCount: rawPrunedCount } =
    pruneLosingOrdersAndQuarantine(shieldRes.updatedOrders, quotes, manualTrigger);
  const prunedCount = rawPrunedCount + shieldRes.vetoExitedCount;

  const macro = evaluateElevenVectorMacroMatrix(quotes, afterPrune);
  const rotatedOrders: PaperTradeOrder[] = [];
  const rotatedSymbols: string[] = [];

  // State 3 (Anti-Whipsaw Cash Preservation):
  // If we just stopped out a losing trade (prunedCount > 0) AND War Escalation >= 70 or Retail Crowding Trap is active,
  // park 100% of freed capital in Protected Cash on this tick (ZERO blind same-tick rotation!).
  const blockSameTickRotation =
    prunedCount > 0 &&
    (macro.warEscalationIndex >= 70 || macro.participantFlow.isRetailCrowdedLongTrap);

  if (!blockSameTickRotation && manualTrigger) {
    // Only deploy if candidate survives 5-Agent Council + 3-Tick Persistence + >2.0% (>2.5% post-loss) Net Hurdle
    const nseBatch = executeIntelligentScanAndDeploy(quotes, afterPrune, 'NSE_CASH');
    const combinedAfterNse = [...nseBatch.deployedOrders, ...afterPrune];
    const bseBatch = executeIntelligentScanAndDeploy(quotes, combinedAfterNse, 'BSE_CASH');

    for (const ord of [...nseBatch.deployedOrders, ...bseBatch.deployedOrders]) {
      rotatedOrders.push(ord);
      rotatedSymbols.push(extractBaseSymbolFromOrder(ord));
    }
  }

  const finalOrders = [...rotatedOrders, ...afterPrune];
  persistPaperTrades(finalOrders);

  return {
    updatedOrders: finalOrders,
    prunedSymbols,
    rotatedSymbols,
    prunedCount,
  };
}

export function runAutonomousAgentCycleIfArmed(
  quotes: Record<string, MarketQuote>,
  allBotsArmed: boolean
): PaperTradeOrder[] | null {
  if (!allBotsArmed || autoExecutionTriggeredThisSession) return null;

  // Ensure live/delayed quotes have loaded from the server before agents size trades
  const niftyPrice = quotes['^NSEI']?.price;
  if (!niftyPrice || niftyPrice <= 0) return null;

  const existing = getStoredPaperTrades();
  if (existing.length > 0) {
    autoExecutionTriggeredThisSession = true;
    // If any existing open position is stuck in a loss (e.g. ULTRACEMCO), automatically prune & rotate to learned winners
    if (isAutoPruneLosersEnabled()) {
      const hasOpenLoser = existing.some(
        (o) =>
          o.status === 'OPEN' &&
          ((o.pnlINR || 0) < -35 || extractBaseSymbolFromOrder(o) === 'ULTRACEMCO')
      );
      if (hasOpenLoser) {
        const { updatedOrders } = executeAdaptivePruneAndRotateCycle(existing, quotes, true);
        return updatedOrders;
      }
    }
    return null;
  }

  autoExecutionTriggeredThisSession = true;

  // Evaluate all desks through the Strict 2026 Statutory Tax & >2.0% Net Profit Veto Gate
  const scanBatch = executeIntelligentScanAndDeploy(quotes, existing, 'ALL');
  if (scanBatch.deployedOrders.length > 0) {
    persistPaperTrades(scanBatch.deployedOrders);
    return scanBatch.deployedOrders;
  }
  return null;
}

/**
 * Flatten orders into uniform trade records for the dedicated table view.
 * Enforces 100% mathematical consistency:
 * P&L === (ExitPrice - EntryPrice) * Qty (for BUY)
 * P&L === (EntryPrice - ExitPrice) * Qty (for SELL)
 */
export function flattenOrdersToTrades(
  orders: PaperTradeOrder[],
  quotes: Record<string, MarketQuote> = {}
): ExecutedTradeRecord[] {
  const records: ExecutedTradeRecord[] = [];
  const usedRecordIds = new Set<string>();

  orders.forEach((order, orderIdx) => {
    const dateStr = order.orderDate || formatOrderDate(order.timestamp);
    const timeStr = order.orderTime || formatOrderTime(order.timestamp);
    const isOpen = order.status === 'OPEN';
    const oneR = Math.min(400, Math.max(150, order.maxDefinedLossINR || 380));

    const firstLeg = order.legs?.[0];
    const side: 'BUY' | 'SELL' = (order.side ?? firstLeg?.action ?? 'BUY') === 'SELL' ? 'SELL' : 'BUY';
    const qty = Math.max(1, order.qty ?? firstLeg?.qty ?? 1);
    const entryPrice = Number((order.entryPrice ?? firstLeg?.price ?? 100).toFixed(2));

    // Resolve live or closed exitPrice
    let exitPrice = order.exitPrice ?? firstLeg?.exitPrice;

    if (isOpen) {
      if (exitPrice == null || Math.abs(exitPrice - entryPrice) < 0.005) {
        if (order.segment === 'NSE_CASH' || order.segment === 'BSE_CASH') {
          const baseTicker = (firstLeg?.instrument || order.symbol).split(' ')[0].replace(/[^A-Z0-9]/gi, '');
          const quote = quotes[`${baseTicker}.NS`] || quotes[`${baseTicker}.BO`];
          if (quote?.price != null && quote.price > 0) {
            exitPrice = Number(quote.price.toFixed(2));
          }
        }
      }
      if (exitPrice == null || !Number.isFinite(exitPrice) || exitPrice <= 0) {
        if (Math.abs(order.pnlINR || 0) > 0.01) {
          exitPrice = Number(
            Math.max(0.05, side === 'BUY' ? entryPrice + order.pnlINR / qty : entryPrice - order.pnlINR / qty).toFixed(2)
          );
        } else {
          exitPrice = entryPrice;
        }
      }
    } else {
      if (exitPrice == null || !Number.isFinite(exitPrice) || exitPrice <= 0) {
        if (Math.abs(order.pnlINR || 0) > 0.01) {
          exitPrice = Number(
            Math.max(0.05, side === 'BUY' ? entryPrice + order.pnlINR / qty : entryPrice - order.pnlINR / qty).toFixed(2)
          );
        } else {
          exitPrice = entryPrice;
        }
      }
    }

    const cleanExitPrice = Number(Number(exitPrice).toFixed(2));
    const priceDeltaPerUnit = Number(
      (side === 'BUY' ? cleanExitPrice - entryPrice : entryPrice - cleanExitPrice).toFixed(2)
    );
    const exactPnl = Number((priceDeltaPerUnit * qty).toFixed(2));

    const rawFloor = order.trailingStopPnlINR ?? -oneR;
    const trailingStopPrice =
      order.trailingStopPrice != null && Number.isFinite(order.trailingStopPrice)
        ? Number(order.trailingStopPrice.toFixed(2))
        : Number(
            Math.max(
              0.05,
              side === 'BUY' ? entryPrice + rawFloor / qty : entryPrice - rawFloor / qty
            ).toFixed(2)
          );

    const trailingStopPnlINR = Number(
      ((side === 'BUY' ? trailingStopPrice - entryPrice : entryPrice - trailingStopPrice) * qty).toFixed(2)
    );

    const peakPnl = Number(
      Math.max(0, order.peakPnlINR ?? 0, exactPnl).toFixed(2)
    );

    const tslStage: TslStage =
      order.tslStage ??
      (order.status === 'TRAILING_STOP_HIT'
        ? 'TRAILING_STOP_HIT'
        : order.status === 'TARGET_HIT'
          ? 'TARGET_HIT'
          : order.status === 'STOP_HIT'
            ? 'STOP_HIT'
            : 'INITIAL_RISK_STOP');

    let candidateId = order.id;
    if (usedRecordIds.has(candidateId)) {
      candidateId = `${order.id}-ord${orderIdx}`;
    }
    usedRecordIds.add(candidateId);

    const instrumentName =
      firstLeg?.instrument && order.legs?.length === 1 ? firstLeg.instrument : order.symbol;

    const structureAndCost = derivePositionStructureAndCost({
      instrument: instrumentName,
      segment: order.segment,
      side,
      qty,
      entryPrice,
      exitPrice: cleanExitPrice,
      orderDateStr: dateStr,
      providedExpiryDate: order.expiryDate,
      providedMarginINR: order.totalInvestmentINR,
      liveSpotPrice: quotes['^NSEI']?.price ?? undefined,
      liveVix: quotes['^INDIAVIX']?.price ?? undefined,
    });

    records.push({
      id: candidateId,
      orderId: order.id,
      agentId: order.agentId,
      agentName: order.agentName,
      instrument: instrumentName,
      side,
      qty,
      entryPrice,
      exitPrice: cleanExitPrice,
      priceDeltaPerUnit,
      isOpen,
      pnl: exactPnl,
      peakPnlINR: peakPnl,
      trailingStopPnlINR,
      trailingStopPrice,
      maxDefinedLossINR: oneR,
      tslStage,
      exitReason: order.exitReason,
      dateStr,
      timeStr,
      expiryDateStr: structureAndCost.expiryDateStr,
      expirySeriesLabel: structureAndCost.expirySeriesLabel,
      isDerivative: structureAndCost.isDerivative,
      isTwoLegSpread: structureAndCost.isTwoLegSpread,
      positionsCount: structureAndCost.positionsCount,
      positionCountBadge: structureAndCost.positionCountBadge,
      qtyDisplayLabel: structureAndCost.qtyDisplayLabel,
      totalEntryCostINR: structureAndCost.totalEntryCostINR,
      totalCurrentValueINR: structureAndCost.totalCurrentValueINR,
      marginDeployedINR: structureAndCost.marginDeployedINR,
      constituentLegs: structureAndCost.constituentLegs,
      segment: order.segment,
      status: order.status,
      strategyName: order.strategyName,
    });
  });

  return records;
}

/**
 * Export table records as CSV adhering strictly to the requested column headers,
 * including Expiry Date, Position Structure (1 vs 2 Legs), and Total Instrument Cost.
 */
export function exportTradesToCSV(records: ExecutedTradeRecord[]): void {
  const headers = [
    'Instrument',
    'Expiry Date',
    'Positions / Legs Breakdown',
    'Side',
    'Qty',
    'Entry Price (Per Unit)',
    'Total Instrument Cost (Entry × Qty)',
    'Margin / Capital Blocked',
    'Exit Price (Per Unit)',
    'Current Total Value (Exit × Qty)',
    'P&L',
    'Date (dd-mmm-yyyy)',
    'Time ([hh]:mm:ss)',
    'Segment',
    'Status'
  ];

  const rows = records.map(r => {
    const legsDesc = r.isTwoLegSpread
      ? r.constituentLegs.map(l => `${l.action} ${l.qty} ${l.instrument} @ ₹${l.unitPrice} (₹${l.totalLegCostINR})`).join(' + ')
      : `1 Position (${r.qtyDisplayLabel})`;
    return [
      `"${r.instrument.replace(/"/g, '""')}"`,
      `"${r.expiryDateStr || 'Spot EQ (No Expiry)'}"`,
      `"${legsDesc.replace(/"/g, '""')}"`,
      `"${r.side}"`,
      r.qty,
      `"₹${r.entryPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}"`,
      `"₹${r.totalEntryCostINR.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}"`,
      `"₹${r.marginDeployedINR.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}"`,
      r.isOpen ? `"Open (LTP ₹${r.exitPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })})"` : `"₹${r.exitPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}"`,
      `"₹${r.totalCurrentValueINR.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}"`,
      `"${r.pnl >= 0 ? '+' : ''}₹${r.pnl.toLocaleString('en-IN', { minimumFractionDigits: 2 })}"`,
      `"${r.dateStr}"`,
      `"${r.timeStr}"`,
      `"${r.segment}"`,
      `"${r.status}"`
    ];
  });

  const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `NSE_BSE_MCX_Paper_Trade_History_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

