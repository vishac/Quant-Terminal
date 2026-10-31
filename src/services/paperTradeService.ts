import { PaperTradeOrder } from '../types/quant';
import { MarketQuote } from './liveMarketService';
import { formatOrderDate, formatOrderTime } from '../utils/orderFormatters';
import { generateLiveMarketOrder } from './agentQuantEngine';

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
  isOpen: boolean;
  pnl: number;
  dateStr: string; // Strictly dd-mmm-yyyy
  timeStr: string; // Strictly [hh]:mm:ss
  segment: 'NSE_FNO' | 'NSE_CASH' | 'BSE_CASH' | 'MCX_FUTURES' | 'MCX_OPTIONS';
  status: 'OPEN' | 'SQUARED_OFF' | 'TARGET_HIT' | 'STOP_HIT';
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
 * Retrieve paper trade orders from localStorage.
 * Starts clean with 0 static seed rows — only stores trades actually executed by the 5 agents.
 */
export function getStoredPaperTrades(): PaperTradeOrder[] {
  try {
    const raw = localStorage.getItem(ORDERS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Filter out any legacy static seed trades from previous versions
    const cleaned = parsed.filter((o: PaperTradeOrder) => o && o.id && !LEGACY_STATIC_IDS.has(o.id));
    if (cleaned.length !== parsed.length) {
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
    localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(trades));
    window.dispatchEvent(new CustomEvent('jarvis:orders-updated', { detail: trades }));
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
    return null;
  }

  autoExecutionTriggeredThisSession = true;

  // All 5 agents evaluate current quotes and deploy defined-risk paper trades
  const fnoOrder = generateLiveMarketOrder(quotes, 'agent_bhishma');     // NSE F&O
  const nseCashOrder = generateLiveMarketOrder(quotes, 'agent_arjuna');  // NSE Cash
  const bseCashOrder = generateLiveMarketOrder(quotes, 'agent_chanakya');// BSE Cash
  const mcxOrder = generateLiveMarketOrder(quotes, 'agent_kuber');       // MCX Commodity
  const defOrder = generateLiveMarketOrder(quotes, 'agent_vidura');      // Defensive Cash

  const executedBatch = [fnoOrder, nseCashOrder, bseCashOrder, mcxOrder, defOrder];
  persistPaperTrades(executedBatch);
  return executedBatch;
}

/**
 * Flatten orders and their executed legs into uniform trade records
 * formatted for the dedicated table view.
 */
export function flattenOrdersToTrades(
  orders: PaperTradeOrder[],
  quotes: Record<string, MarketQuote> = {}
): ExecutedTradeRecord[] {
  const records: ExecutedTradeRecord[] = [];

  for (const order of orders) {
    const dateStr = order.orderDate || formatOrderDate(order.timestamp);
    const timeStr = order.orderTime || formatOrderTime(order.timestamp);
    const isOpen = order.status === 'OPEN';

    if (order.legs && order.legs.length > 0) {
      // If order has multiple legs, generate a trade record per leg
      order.legs.forEach((leg, idx) => {
        const legQty = leg.qty || order.qty || 1;
        const entryPrice = leg.price || order.entryPrice || 100;
        
        let exitPrice = leg.exitPrice ?? order.exitPrice;
        let legPnl = 0;

        if (isOpen) {
          // For open trades, derive live exit price from quotes or current order MTM
          const firstToken = order.symbol.split(' ')[0];
          const quoteKey = Object.keys(quotes).find(k => k.replace('.NS', '') === firstToken);
          const livePrice = quoteKey && quotes[quoteKey]?.price ? quotes[quoteKey].price! : entryPrice;
          exitPrice = livePrice;
          if (order.pnlINR !== 0 && order.legs.length === 1) {
            legPnl = order.pnlINR;
            const pnlPerUnit = legPnl / Math.max(1, legQty);
            exitPrice = leg.action === 'BUY' ? entryPrice + pnlPerUnit : entryPrice - pnlPerUnit;
          } else {
            legPnl = leg.action === 'BUY' 
              ? (livePrice - entryPrice) * legQty 
              : (entryPrice - livePrice) * legQty;
          }
        } else {
          if (exitPrice == null) {
            const pnlPerUnit = order.pnlINR / Math.max(1, legQty);
            exitPrice = leg.action === 'BUY' ? entryPrice + pnlPerUnit : entryPrice - pnlPerUnit;
          }
          legPnl = order.legs.length === 1 
            ? order.pnlINR 
            : Math.round(order.pnlINR / order.legs.length);
        }

        records.push({
          id: `${order.id}-leg-${idx}`,
          orderId: order.id,
          agentId: order.agentId,
          agentName: order.agentName,
          instrument: leg.instrument || order.symbol,
          side: leg.action || order.side || 'BUY',
          qty: legQty,
          entryPrice: Number(entryPrice.toFixed(2)),
          exitPrice: Number(Number(exitPrice).toFixed(2)),
          isOpen,
          pnl: Number(legPnl.toFixed(2)),
          dateStr,
          timeStr,
          segment: order.segment,
          status: order.status,
          strategyName: order.strategyName
        });
      });
    } else {
      // Single top-level order without legs
      const qty = order.qty || 1;
      const entryPrice = order.entryPrice || 100;
      let exitPrice = order.exitPrice;

      if (isOpen) {
        exitPrice = entryPrice;
      } else if (exitPrice == null) {
        const pnlPerUnit = order.pnlINR / Math.max(1, qty);
        exitPrice = (order.side || 'BUY') === 'BUY' ? entryPrice + pnlPerUnit : entryPrice - pnlPerUnit;
      }

      records.push({
        id: order.id,
        orderId: order.id,
        agentId: order.agentId,
        agentName: order.agentName,
        instrument: order.symbol,
        side: order.side || 'BUY',
        qty,
        entryPrice: Number(entryPrice.toFixed(2)),
        exitPrice: Number(Number(exitPrice).toFixed(2)),
        isOpen,
        pnl: Number(order.pnlINR.toFixed(2)),
        dateStr,
        timeStr,
        segment: order.segment,
        status: order.status,
        strategyName: order.strategyName
      });
    }
  }

  return records;
}

/**
 * Export table records as CSV adhering strictly to the requested column headers.
 */
export function exportTradesToCSV(records: ExecutedTradeRecord[]): void {
  const headers = [
    'Instrument',
    'Side',
    'Qty',
    'Entry Price',
    'Exit Price',
    'P&L',
    'Date (dd-mmm-yyyy)',
    'Time ([hh]:mm:ss)',
    'Segment',
    'Status'
  ];

  const rows = records.map(r => [
    `"${r.instrument.replace(/"/g, '""')}"`,
    `"${r.side}"`,
    r.qty,
    `"₹${r.entryPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}"`,
    r.isOpen ? `"Open (LTP ₹${r.exitPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })})"` : `"₹${r.exitPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}"`,
    `"${r.pnl >= 0 ? '+' : ''}₹${r.pnl.toLocaleString('en-IN', { minimumFractionDigits: 2 })}"`,
    `"${r.dateStr}"`,
    `"${r.timeStr}"`,
    `"${r.segment}"`,
    `"${r.status}"`
  ]);

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
