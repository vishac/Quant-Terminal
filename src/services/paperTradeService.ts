import { PaperTradeOrder } from '../types/quant';
import { MarketQuote } from './liveMarketService';
import { formatOrderDate, formatOrderTime } from '../utils/orderFormatters';

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

/**
 * 11 Institutional Seed Paper Trades across NSE F&O, NSE Cash, BSE Cash, and MCX Commodity.
 * Strictly formatted with dd-mmm-yyyy and [hh]:mm:ss.
 */
export const INITIAL_INSTITUTIONAL_PAPER_TRADES: PaperTradeOrder[] = [
  // 1. NSE F&O: NIFTY Weekly Long Call
  {
    id: 'ORD-NSE-FNO-101',
    agentId: 'agent_bhishma',
    agentName: 'Bhishma (F&O Desk)',
    symbol: 'NIFTY 24,500 CE (Weekly)',
    segment: 'NSE_FNO',
    strategyName: 'Gamma Momentum Long Strike Breakout',
    entryPrice: 142.50,
    exitPrice: 186.20,
    side: 'BUY',
    qty: 75,
    legs: [
      { instrument: 'NIFTY 24,500 CE', action: 'BUY', qty: 75, price: 142.50, exitPrice: 186.20 }
    ],
    totalInvestmentINR: 10688,
    maxDefinedLossINR: 10688,
    targetProfitINR: 3278,
    riskRewardRatio: '1:2.35',
    timestamp: '29-Oct-2026 [09]:32:15',
    orderDate: '29-Oct-2026',
    orderTime: '[09]:32:15',
    status: 'SQUARED_OFF',
    pnlINR: 3277.50,
    sebiComplianceVerified: true,
    isSimulation: false,
  },
  // 2. NSE F&O: BANK NIFTY Short Put (Option Credit)
  {
    id: 'ORD-NSE-FNO-102',
    agentId: 'agent_bhishma',
    agentName: 'Bhishma (F&O Desk)',
    symbol: 'BANKNIFTY 52,000 PE (Weekly)',
    segment: 'NSE_FNO',
    strategyName: 'Volatility Skew Short Premium Decay',
    entryPrice: 280.00,
    exitPrice: 195.40,
    side: 'SELL',
    qty: 30,
    legs: [
      { instrument: 'BANKNIFTY 52,000 PE', action: 'SELL', qty: 30, price: 280.00, exitPrice: 195.40 }
    ],
    totalInvestmentINR: 42000,
    maxDefinedLossINR: 5200,
    targetProfitINR: 2538,
    riskRewardRatio: '1:1.95',
    timestamp: '29-Oct-2026 [10]:14:48',
    orderDate: '29-Oct-2026',
    orderTime: '[10]:14:48',
    status: 'SQUARED_OFF',
    pnlINR: 2538.00,
    sebiComplianceVerified: true,
    isSimulation: false,
  },
  // 3. NSE F&O: L&T Current Month Futures
  {
    id: 'ORD-NSE-FNO-103',
    agentId: 'agent_bhishma',
    agentName: 'Bhishma (F&O Desk)',
    symbol: 'L&T 3,620 FUT (Current Month)',
    segment: 'NSE_FNO',
    strategyName: 'Capex Heavyweight Momentum Breakout',
    entryPrice: 3620.00,
    exitPrice: 3668.50,
    side: 'BUY',
    qty: 175,
    legs: [
      { instrument: 'L&T FUT (NSE)', action: 'BUY', qty: 175, price: 3620.00, exitPrice: 3668.50 }
    ],
    totalInvestmentINR: 95000,
    maxDefinedLossINR: 7500,
    targetProfitINR: 8488,
    riskRewardRatio: '1:2.40',
    timestamp: '29-Oct-2026 [11]:05:22',
    orderDate: '29-Oct-2026',
    orderTime: '[11]:05:22',
    status: 'SQUARED_OFF',
    pnlINR: 8487.50,
    sebiComplianceVerified: true,
    isSimulation: false,
  },
  // 4. NSE Cash: CIPLA Cash Equity MIS
  {
    id: 'ORD-NSE-CSH-201',
    agentId: 'agent_arjuna',
    agentName: 'Arjuna (Cash Alpha)',
    symbol: 'CIPLA (NSE EQ)',
    segment: 'NSE_CASH',
    strategyName: 'Pharma Sector Relative Strength Breakout',
    entryPrice: 1330.00,
    exitPrice: 1364.50,
    side: 'BUY',
    qty: 25,
    legs: [
      { instrument: 'CIPLA (NSE EQ)', action: 'BUY', qty: 25, price: 1330.00, exitPrice: 1364.50 }
    ],
    totalInvestmentINR: 6650,
    maxDefinedLossINR: 400,
    targetProfitINR: 863,
    riskRewardRatio: '1:2.16',
    timestamp: '29-Oct-2026 [11]:45:10',
    orderDate: '29-Oct-2026',
    orderTime: '[11]:45:10',
    status: 'SQUARED_OFF',
    pnlINR: 862.50,
    sebiComplianceVerified: true,
    isSimulation: false,
  },
  // 5. NSE Cash: RELIANCE Cash Equity
  {
    id: 'ORD-NSE-CSH-202',
    agentId: 'agent_arjuna',
    agentName: 'Arjuna (Cash Alpha)',
    symbol: 'RELIANCE (NSE EQ)',
    segment: 'NSE_CASH',
    strategyName: 'Conglomerate VWAP Pullback Accumulation',
    entryPrice: 2940.00,
    exitPrice: 2978.00,
    side: 'BUY',
    qty: 15,
    legs: [
      { instrument: 'RELIANCE (NSE EQ)', action: 'BUY', qty: 15, price: 2940.00, exitPrice: 2978.00 }
    ],
    totalInvestmentINR: 8820,
    maxDefinedLossINR: 350,
    targetProfitINR: 570,
    riskRewardRatio: '1:1.90',
    timestamp: '29-Oct-2026 [12]:18:33',
    orderDate: '29-Oct-2026',
    orderTime: '[12]:18:33',
    status: 'SQUARED_OFF',
    pnlINR: 570.00,
    sebiComplianceVerified: true,
    isSimulation: false,
  },
  // 6. NSE Cash: ULTRACEMCO Cash Equity
  {
    id: 'ORD-NSE-CSH-203',
    agentId: 'agent_vidura',
    agentName: 'Vidura (Risk Arbiter)',
    symbol: 'ULTRACEMCO (NSE EQ)',
    segment: 'NSE_CASH',
    strategyName: '1% Rupee Capital Protection Bracket',
    entryPrice: 10958.00,
    exitPrice: 10880.00,
    side: 'BUY',
    qty: 5,
    legs: [
      { instrument: 'ULTRACEMCO (NSE EQ)', action: 'BUY', qty: 5, price: 10958.00, exitPrice: 10880.00 }
    ],
    totalInvestmentINR: 10958,
    maxDefinedLossINR: 420,
    targetProfitINR: 950,
    riskRewardRatio: '1:2.26',
    timestamp: '29-Oct-2026 [13]:02:45',
    orderDate: '29-Oct-2026',
    orderTime: '[13]:02:45',
    status: 'SQUARED_OFF',
    pnlINR: -390.00,
    sebiComplianceVerified: true,
    isSimulation: false,
  },
  // 7. BSE Cash: TCS Cash Equity (BSE Delivery)
  {
    id: 'ORD-BSE-CSH-301',
    agentId: 'agent_chanakya',
    agentName: 'Chanakya (Macro Desk)',
    symbol: 'TCS (BSE EQ)',
    segment: 'BSE_CASH',
    strategyName: 'Global NASDAQ Transmission Defensive Allocation',
    entryPrice: 3850.00,
    exitPrice: 3912.00,
    side: 'BUY',
    qty: 10,
    legs: [
      { instrument: 'TCS (BSE EQ)', action: 'BUY', qty: 10, price: 3850.00, exitPrice: 3912.00 }
    ],
    totalInvestmentINR: 38500,
    maxDefinedLossINR: 400,
    targetProfitINR: 620,
    riskRewardRatio: '1:1.85',
    timestamp: '29-Oct-2026 [13]:25:19',
    orderDate: '29-Oct-2026',
    orderTime: '[13]:25:19',
    status: 'SQUARED_OFF',
    pnlINR: 620.00,
    sebiComplianceVerified: true,
    isSimulation: false,
  },
  // 8. BSE Cash: INFY Cash Equity (BSE Delivery)
  {
    id: 'ORD-BSE-CSH-302',
    agentId: 'agent_chanakya',
    agentName: 'Chanakya (Macro Desk)',
    symbol: 'INFY (BSE EQ)',
    segment: 'BSE_CASH',
    strategyName: 'IT Tier-1 Institutional Rebound Allocation',
    entryPrice: 1820.00,
    exitPrice: 1844.50,
    side: 'BUY',
    qty: 20,
    legs: [
      { instrument: 'INFY (BSE EQ)', action: 'BUY', qty: 20, price: 1820.00, exitPrice: 1844.50 }
    ],
    totalInvestmentINR: 36400,
    maxDefinedLossINR: 300,
    targetProfitINR: 490,
    riskRewardRatio: '1:1.75',
    timestamp: '29-Oct-2026 [13]:40:02',
    orderDate: '29-Oct-2026',
    orderTime: '[13]:40:02',
    status: 'SQUARED_OFF',
    pnlINR: 490.00,
    sebiComplianceVerified: true,
    isSimulation: false,
  },
  // 9. MCX Commodity: CRUDEOIL Futures
  {
    id: 'ORD-MCX-FUT-401',
    agentId: 'agent_kuber',
    agentName: 'Kuber (MCX Desk)',
    symbol: 'MCX CRUDEOIL FUT',
    segment: 'MCX_FUTURES',
    strategyName: 'ICE Brent / MCX Parity Momentum Bracket',
    entryPrice: 7650.00,
    exitPrice: 7732.00,
    side: 'BUY',
    qty: 1, // 1 Lot = 100 bbl
    legs: [
      { instrument: 'MCX CRUDEOIL FUT', action: 'BUY', qty: 1, price: 7650.00, exitPrice: 7732.00 }
    ],
    totalInvestmentINR: 24500,
    maxDefinedLossINR: 760,
    targetProfitINR: 8200,
    riskRewardRatio: '1:2.60',
    timestamp: '29-Oct-2026 [14]:10:30',
    orderDate: '29-Oct-2026',
    orderTime: '[14]:10:30',
    status: 'SQUARED_OFF',
    pnlINR: 8200.00,
    sebiComplianceVerified: true,
    isSimulation: false,
  },
  // 10. MCX Commodity: GOLD MINI Futures
  {
    id: 'ORD-MCX-FUT-402',
    agentId: 'agent_kuber',
    agentName: 'Kuber (MCX Desk)',
    symbol: 'MCX GOLD MINI FUT',
    segment: 'MCX_FUTURES',
    strategyName: 'COMEX/MCX Gold Parity Safe Haven Hedge',
    entryPrice: 78500.00,
    exitPrice: 78820.00,
    side: 'BUY',
    qty: 1, // 1 Lot = 100 grams
    legs: [
      { instrument: 'MCX GOLDM FUT', action: 'BUY', qty: 1, price: 78500.00, exitPrice: 78820.00 }
    ],
    totalInvestmentINR: 28000,
    maxDefinedLossINR: 740,
    targetProfitINR: 3200,
    riskRewardRatio: '1:2.45',
    timestamp: '29-Oct-2026 [14]:35:12',
    orderDate: '29-Oct-2026',
    orderTime: '[14]:35:12',
    status: 'SQUARED_OFF',
    pnlINR: 3200.00,
    sebiComplianceVerified: true,
    isSimulation: false,
  },
  // 11. MCX Commodity: NATURALGAS Futures
  {
    id: 'ORD-MCX-FUT-403',
    agentId: 'agent_kuber',
    agentName: 'Kuber (MCX Desk)',
    symbol: 'MCX NATURALGAS FUT',
    segment: 'MCX_FUTURES',
    strategyName: 'NYMEX Henry Hub Trend Continuation Breakdown',
    entryPrice: 245.50,
    exitPrice: 241.20,
    side: 'SELL',
    qty: 1, // 1 Lot = 1250 mmBtu
    legs: [
      { instrument: 'MCX NATURALGAS FUT', action: 'SELL', qty: 1, price: 245.50, exitPrice: 241.20 }
    ],
    totalInvestmentINR: 18500,
    maxDefinedLossINR: 780,
    targetProfitINR: 5375,
    riskRewardRatio: '1:2.75',
    timestamp: '29-Oct-2026 [15]:02:50',
    orderDate: '29-Oct-2026',
    orderTime: '[15]:02:50',
    status: 'SQUARED_OFF',
    pnlINR: 5375.00,
    sebiComplianceVerified: true,
    isSimulation: false,
  }
];

const ORDERS_STORAGE_KEY = 'jarvis_session_orders';

/**
 * Retrieve paper trade orders from localStorage.
 * Automatically initializes with institutional default seed if empty.
 */
export function getStoredPaperTrades(): PaperTradeOrder[] {
  try {
    const raw = localStorage.getItem(ORDERS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(INITIAL_INSTITUTIONAL_PAPER_TRADES));
      return INITIAL_INSTITUTIONAL_PAPER_TRADES;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(INITIAL_INSTITUTIONAL_PAPER_TRADES));
      return INITIAL_INSTITUTIONAL_PAPER_TRADES;
    }
    return parsed;
  } catch {
    return INITIAL_INSTITUTIONAL_PAPER_TRADES;
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
          // For open trades, derive live exit price from quotes or simulated spread
          const quoteKey = Object.keys(quotes).find(k => k.includes(order.symbol.split(' ')[0]));
          const livePrice = quoteKey && quotes[quoteKey]?.price ? quotes[quoteKey].price! : entryPrice;
          exitPrice = livePrice;
          legPnl = leg.action === 'BUY' 
            ? (livePrice - entryPrice) * legQty 
            : (entryPrice - livePrice) * legQty;
        } else {
          if (exitPrice == null) {
            // Compute exitPrice from order PnL
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
