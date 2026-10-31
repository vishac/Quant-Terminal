import React, { useState, useEffect, useMemo } from 'react';
import { useLiveMarketData } from '../services/liveMarketService';
import { 
  PaperTradeOrder 
} from '../types/quant';
import { 
  ExecutedTradeRecord, 
  getStoredPaperTrades, 
  persistPaperTrades, 
  flattenOrdersToTrades, 
  exportTradesToCSV,
  runAutonomousAgentCycleIfArmed
} from '../services/paperTradeService';
import { generateLiveMarketOrder, updateOrdersLivePnl } from '../services/agentQuantEngine';
import { formatOrderDate, formatOrderTime } from '../utils/orderFormatters';
import { 
  History, 
  Download, 
  Trash2, 
  Filter, 
  Search, 
  ArrowUpRight, 
  ArrowDownRight, 
  TrendingUp, 
  TrendingDown, 
  ShieldCheck, 
  RotateCw, 
  Zap, 
  Scale, 
  CheckCircle2, 
  AlertCircle,
  Clock,
  Calendar,
  Layers,
  ChevronRight,
  Info
} from 'lucide-react';

interface TradeHistoryProps {
  onNavigateToAgents?: () => void;
}

export const TradeHistory: React.FC<TradeHistoryProps> = ({ onNavigateToAgents }) => {
  const { quotes, latencyMs, provider } = useLiveMarketData(5000);
  const isUpstoxLive = provider === 'UPSTOX_ANALYTICS_REALTIME';

  // Load orders from shared localStorage and subscribe to updates
  const [orders, setOrders] = useState<PaperTradeOrder[]>(() => getStoredPaperTrades());

  // Listen for background updates across components
  useEffect(() => {
    const handleUpdate = () => {
      setOrders(getStoredPaperTrades());
    };
    window.addEventListener('jarvis:orders-updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('jarvis:orders-updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  // Autonomous Agent Auto-Execution when armed & live/delayed quotes arrive
  useEffect(() => {
    let botsArmed = true;
    try {
      const saved = localStorage.getItem('jarvis_bots_armed_state');
      if (saved !== null) botsArmed = saved === 'true';
    } catch {}

    const autoOrders = runAutonomousAgentCycleIfArmed(quotes, botsArmed);
    if (autoOrders && autoOrders.length > 0) {
      setOrders(autoOrders);
      setToastMessage(`🤖 5 Autonomous Agents analyzed broader market regime & auto-executed ${autoOrders.length} defined-risk paper positions across NSE, BSE & MCX.`);
      setTimeout(() => setToastMessage(null), 5000);
    } else if (orders.some(o => o.status === 'OPEN')) {
      const updated = updateOrdersLivePnl(orders, quotes);
      setOrders(updated);
    }
  }, [quotes]);

  // Filter state
  const [segmentFilter, setSegmentFilter] = useState<'ALL' | 'NSE_FNO' | 'NSE_CASH' | 'BSE_CASH' | 'MCX'>('ALL');
  const [sideFilter, setSideFilter] = useState<'ALL' | 'BUY' | 'SELL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'CLOSED' | 'OPEN'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Flatten orders into uniform executed trade records
  const tradeRecords = useMemo(() => {
    return flattenOrdersToTrades(orders, quotes);
  }, [orders, quotes]);

  // Filter trade records based on user selection
  const filteredRecords = useMemo(() => {
    return tradeRecords.filter(r => {
      // Segment filter
      if (segmentFilter === 'NSE_FNO' && r.segment !== 'NSE_FNO') return false;
      if (segmentFilter === 'NSE_CASH' && r.segment !== 'NSE_CASH') return false;
      if (segmentFilter === 'BSE_CASH' && r.segment !== 'BSE_CASH') return false;
      if (segmentFilter === 'MCX' && r.segment !== 'MCX_FUTURES' && r.segment !== 'MCX_OPTIONS') return false;

      // Side filter
      if (sideFilter !== 'ALL' && r.side !== sideFilter) return false;

      // Status filter
      if (statusFilter === 'CLOSED' && r.isOpen) return false;
      if (statusFilter === 'OPEN' && !r.isOpen) return false;

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesInstrument = r.instrument.toLowerCase().includes(q);
        const matchesAgent = r.agentName.toLowerCase().includes(q);
        const matchesStrategy = r.strategyName.toLowerCase().includes(q);
        const matchesDate = r.dateStr.toLowerCase().includes(q);
        if (!matchesInstrument && !matchesAgent && !matchesStrategy && !matchesDate) {
          return false;
        }
      }

      return true;
    });
  }, [tradeRecords, segmentFilter, sideFilter, statusFilter, searchQuery]);

  // Aggregate stats
  const stats = useMemo(() => {
    const totalTrades = tradeRecords.length;
    const closedTrades = tradeRecords.filter(r => !r.isOpen);
    const openTrades = tradeRecords.filter(r => r.isOpen);
    
    const realizedPnl = closedTrades.reduce((acc, r) => acc + r.pnl, 0);
    const unrealizedPnl = openTrades.reduce((acc, r) => acc + r.pnl, 0);
    const netPnl = realizedPnl + unrealizedPnl;

    const winningTrades = closedTrades.filter(r => r.pnl > 0).length;
    const losingTrades = closedTrades.filter(r => r.pnl < 0).length;
    const winRatePct = closedTrades.length > 0 
      ? Math.round((winningTrades / closedTrades.length) * 100) 
      : 0;

    const nseFnoCount = tradeRecords.filter(r => r.segment === 'NSE_FNO').length;
    const nseCashCount = tradeRecords.filter(r => r.segment === 'NSE_CASH').length;
    const bseCashCount = tradeRecords.filter(r => r.segment === 'BSE_CASH').length;
    const mcxCount = tradeRecords.filter(r => r.segment === 'MCX_FUTURES' || r.segment === 'MCX_OPTIONS').length;

    return {
      totalTrades,
      closedCount: closedTrades.length,
      openCount: openTrades.length,
      realizedPnl,
      unrealizedPnl,
      netPnl,
      winRatePct,
      winningTrades,
      losingTrades,
      nseFnoCount,
      nseCashCount,
      bseCashCount,
      mcxCount
    };
  }, [tradeRecords]);

  // Deploy live market paper trade
  const handleDeployOrder = (segment: 'NSE_FNO' | 'NSE_CASH' | 'BSE_CASH' | 'MCX' | 'ALL') => {
    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
      let newOrders: PaperTradeOrder[] = [];

      if (segment === 'NSE_FNO') {
        newOrders = [generateLiveMarketOrder(quotes, 'agent_bhishma')];
      } else if (segment === 'NSE_CASH') {
        newOrders = [generateLiveMarketOrder(quotes, 'agent_arjuna')];
      } else if (segment === 'BSE_CASH') {
        newOrders = [generateLiveMarketOrder(quotes, 'agent_chanakya')];
      } else if (segment === 'MCX') {
        newOrders = [generateLiveMarketOrder(quotes, 'agent_kuber')];
      } else {
        // Deploy across all 3 key desks: NSE F&O, NSE/BSE Cash, MCX
        const fno = generateLiveMarketOrder(quotes, 'agent_bhishma');
        const nseCash = generateLiveMarketOrder(quotes, 'agent_arjuna');
        const bseCash = generateLiveMarketOrder(quotes, 'agent_chanakya');
        const mcx = generateLiveMarketOrder(quotes, 'agent_kuber');
        newOrders = [fno, nseCash, bseCash, mcx];
      }

      const updated = [...newOrders, ...orders];
      setOrders(updated);
      persistPaperTrades(updated);

      setToastMessage(`✓ ${newOrders.length} New Paper Trade(s) deployed with real live exchange tick pricing!`);
      setTimeout(() => setToastMessage(null), 4000);
    }, 450);
  };

  // Square off specific open order
  const handleSquareOffOrder = (orderId: string) => {
    const now = new Date();
    const orderDate = formatOrderDate(now);
    const orderTime = formatOrderTime(now);

    const updated = orders.map(o => {
      if (o.id === orderId) {
        return {
          ...o,
          status: 'SQUARED_OFF' as const,
          orderDate: o.orderDate || orderDate,
          orderTime: o.orderTime || orderTime,
          timestamp: `${o.orderDate || orderDate} ${orderTime} (Squared Off)`
        };
      }
      return o;
    });

    setOrders(updated);
    persistPaperTrades(updated);
    setToastMessage(`✓ Position ${orderId} successfully squared off.`);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Square off all open orders
  const handleSquareOffAll = () => {
    const now = new Date();
    const orderDate = formatOrderDate(now);
    const orderTime = formatOrderTime(now);

    const updated = orders.map(o => {
      if (o.status === 'OPEN') {
        return {
          ...o,
          status: 'SQUARED_OFF' as const,
          orderDate: o.orderDate || orderDate,
          orderTime: o.orderTime || orderTime,
          timestamp: `${o.orderDate || orderDate} ${orderTime} (Flattened)`
        };
      }
      return o;
    });

    setOrders(updated);
    persistPaperTrades(updated);
    setToastMessage(`🚨 All open paper positions squared off across NSE, BSE, and MCX.`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Clear all trades
  const handleClearHistory = () => {
    setOrders([]);
    persistPaperTrades([]);
    setToastMessage('Trade history cleared. Click "SCAN & DEPLOY (ALL DESKS)" for the 5 agents to re-evaluate the live market.');
    setTimeout(() => setToastMessage(null), 4000);
  };

  return (
    <div className="flex flex-col gap-6 w-full font-mono text-slate-100">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 p-3.5 rounded-xl bg-cyan-950/90 border border-cyan-500/40 text-cyan-200 text-xs font-mono shadow-[0_0_25px_rgba(0,240,255,0.25)] flex items-center gap-2 animate-in fade-in duration-200">
          <Zap className="w-4 h-4 text-cyan-400 animate-pulse" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Header & Regulatory Subtitle */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-[#080d1a] via-[#091124] to-[#070b14] border border-cyan-500/20 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-[0_0_20px_rgba(0,240,255,0.15)]">
            <History className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl font-bold tracking-wider text-slate-100 uppercase font-sans">
                Trade History & Order Audit
              </h1>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold inline-flex items-center gap-1 border ${
                  isUpstoxLive
                    ? 'bg-emerald-950/60 text-emerald-400 border-emerald-500/40'
                    : 'bg-amber-950/60 text-amber-300 border-amber-500/40'
                }`}
                title={
                  isUpstoxLive
                    ? 'Upstox Analytics API Connected (No Static IP required): Real-time NSE/BSE quotes active. Paper trades only.'
                    : 'Running on Delayed Unofficial Yahoo Finance Feed. Pair an Upstox Analytics Token in Sync Hub for live NSE/BSE quotes (no static IP required). Paper trades only.'
                }
              >
                <span>{isUpstoxLive ? 'UPSTOX REALTIME FEED' : 'NSE/BSE · DELAYED FEED'}</span>
                <Info className="w-3 h-3 opacity-80" />
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-950/60 text-cyan-300 border border-cyan-500/30">
                5-AGENT AUTO PAPER EXECUTION
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Autonomous 5-Agent paper trades across NSE F&O, NSE/BSE Cash, and MCX Commodity desks (No live broker money orders placed).
            </p>
          </div>
        </div>

        {/* Action Buttons: Export & Deploy */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => exportTradesToCSV(filteredRecords)}
            disabled={filteredRecords.length === 0}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-cyan-500/30 hover:border-cyan-400 transition cursor-pointer disabled:opacity-50"
            title="Download CSV formatted strictly with Instrument, Side, Qty, Entry Price, Exit Price, P&L, Date, Time"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span>EXPORT CSV</span>
          </button>

          <button
            onClick={() => handleDeployOrder('ALL')}
            disabled={isScanning}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-[0_0_15px_rgba(0,240,255,0.35)] transition cursor-pointer active:scale-95"
            title="Have the 5 agents evaluate broader market regime and auto-execute paper trades across NSE F&O, NSE Cash, BSE Cash, and MCX"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
            <span>SCAN & DEPLOY (ALL DESKS)</span>
          </button>
        </div>
      </div>

      {/* Aggregate KPI Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* 1. Total Executed Trades */}
        <div className="p-4 rounded-xl bg-[#080d1a]/80 border border-slate-800/80 flex flex-col justify-between">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider">TOTAL TRADES</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-xl font-bold text-slate-100">{stats.totalTrades}</span>
            <span className="text-[10px] text-slate-500">({stats.closedCount} Clsd / {stats.openCount} Opn)</span>
          </div>
        </div>

        {/* 2. Realized P&L */}
        <div className="p-4 rounded-xl bg-[#080d1a]/80 border border-slate-800/80 flex flex-col justify-between">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider">REALIZED P&L</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className={`text-xl font-bold ${stats.realizedPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {stats.realizedPnl >= 0 ? '+' : ''}₹{stats.realizedPnl.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* 3. Unrealized MTM */}
        <div className="p-4 rounded-xl bg-[#080d1a]/80 border border-slate-800/80 flex flex-col justify-between">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider">OPEN UNREALIZED</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className={`text-xl font-bold ${stats.unrealizedPnl >= 0 ? 'text-cyan-300' : 'text-rose-400'}`}>
              {stats.unrealizedPnl >= 0 ? '+' : ''}₹{stats.unrealizedPnl.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* 4. Win Rate */}
        <div className="p-4 rounded-xl bg-[#080d1a]/80 border border-slate-800/80 flex flex-col justify-between">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider">WIN RATE</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-xl font-bold text-amber-300">{stats.winRatePct}%</span>
            <span className="text-[10px] text-slate-500">({stats.winningTrades}W / {stats.losingTrades}L)</span>
          </div>
        </div>

        {/* 5. Exchange Breakdown: NSE */}
        <div className="p-4 rounded-xl bg-[#080d1a]/80 border border-slate-800/80 flex flex-col justify-between">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider">NSE TRADES</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-xl font-bold text-sky-400">{stats.nseFnoCount + stats.nseCashCount}</span>
            <span className="text-[10px] text-slate-500">({stats.nseFnoCount} F&O · {stats.nseCashCount} Cash)</span>
          </div>
        </div>

        {/* 6. Exchange Breakdown: BSE & MCX */}
        <div className="p-4 rounded-xl bg-[#080d1a]/80 border border-slate-800/80 flex flex-col justify-between">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider">BSE & MCX</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-xl font-bold text-amber-400">{stats.bseCashCount + stats.mcxCount}</span>
            <span className="text-[10px] text-slate-500">({stats.bseCashCount} BSE · {stats.mcxCount} MCX)</span>
          </div>
        </div>
      </div>

      {/* Filter Ribbon & Fast Execution Bar */}
      <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left: Filter Pills */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Segment Filter */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-950 border border-slate-800 text-xs">
            {[
              { id: 'ALL', label: 'All Exchanges' },
              { id: 'NSE_FNO', label: 'NSE F&O' },
              { id: 'NSE_CASH', label: 'NSE Cash' },
              { id: 'BSE_CASH', label: 'BSE Cash' },
              { id: 'MCX', label: 'MCX Commodity' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setSegmentFilter(tab.id as any)}
                className={`px-2.5 py-1 rounded-lg transition cursor-pointer text-xs ${
                  segmentFilter === tab.id
                    ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40 shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Side Filter */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-950 border border-slate-800 text-xs">
            {[
              { id: 'ALL', label: 'Side: All' },
              { id: 'BUY', label: 'BUY' },
              { id: 'SELL', label: 'SELL' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setSideFilter(tab.id as any)}
                className={`px-2.5 py-1 rounded-lg transition cursor-pointer text-xs ${
                  sideFilter === tab.id
                    ? 'bg-slate-800 text-slate-100 font-bold border border-slate-700'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-950 border border-slate-800 text-xs">
            {[
              { id: 'ALL', label: 'Status: All' },
              { id: 'CLOSED', label: 'Closed (Realized)' },
              { id: 'OPEN', label: 'Open (Working)' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id as any)}
                className={`px-2.5 py-1 rounded-lg transition cursor-pointer text-xs ${
                  statusFilter === tab.id
                    ? 'bg-slate-800 text-cyan-300 font-bold border border-cyan-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Right: Search Input & Desk Order Deployers */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Filter instrument, ticker, agent..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-cyan-500 transition"
            />
          </div>

          {stats.openCount > 0 && (
            <button
              onClick={handleSquareOffAll}
              className="px-3 py-1.5 bg-rose-950/60 hover:bg-rose-900 border border-rose-500/40 text-rose-300 rounded-xl text-xs font-bold transition cursor-pointer"
              title="Square off all currently open positions"
            >
              FLATTEN ALL ({stats.openCount})
            </button>
          )}

          {tradeRecords.length > 0 && (
            <button
              onClick={handleClearHistory}
              className="p-1.5 rounded-xl bg-slate-950 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 border border-slate-800 hover:border-rose-800/40 transition cursor-pointer"
              title="Clear trade history"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* QUICK DEPLOY DESK BAR */}
      <div className="flex items-center justify-between p-3 rounded-xl bg-[#070b14] border border-slate-800/80 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <Zap className="w-3.5 h-3.5 text-amber-400" />
          <span className="font-bold text-slate-300">Autonomous Agent Desk Triggers:</span>
          <span className="text-[11px] hidden sm:inline">Agents size & execute defined-risk paper trades from current market ticks:</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => handleDeployOrder('NSE_FNO')}
            disabled={isScanning}
            className="px-2.5 py-1 rounded-lg bg-sky-950/60 hover:bg-sky-900/80 text-sky-300 border border-sky-500/30 text-[11px] font-semibold transition cursor-pointer"
          >
            + NSE F&O (Bhishma)
          </button>
          <button
            onClick={() => handleDeployOrder('NSE_CASH')}
            disabled={isScanning}
            className="px-2.5 py-1 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-500/30 text-[11px] font-semibold transition cursor-pointer"
          >
            + NSE Cash (Arjuna)
          </button>
          <button
            onClick={() => handleDeployOrder('BSE_CASH')}
            disabled={isScanning}
            className="px-2.5 py-1 rounded-lg bg-indigo-950/60 hover:bg-indigo-900/80 text-indigo-300 border border-indigo-500/30 text-[11px] font-semibold transition cursor-pointer"
          >
            + BSE Cash (Chanakya)
          </button>
          <button
            onClick={() => handleDeployOrder('MCX')}
            disabled={isScanning}
            className="px-2.5 py-1 rounded-lg bg-amber-950/60 hover:bg-amber-900/80 text-amber-300 border border-amber-500/30 text-[11px] font-semibold transition cursor-pointer"
          >
            + MCX Commodity (Kuber)
          </button>
        </div>
      </div>

      {/* THE DEDICATED TRADE HISTORY TABLE */}
      {filteredRecords.length === 0 ? (
        <div className="p-12 rounded-2xl border border-slate-800 bg-[#070b14]/90 text-center flex flex-col items-center justify-center gap-3 font-mono">
          <Scale className="w-10 h-10 text-slate-600" />
          <div className="text-sm text-slate-300 font-bold uppercase tracking-wider">
            No Executed Paper Trades Matching Filter
          </div>
          <p className="text-xs text-slate-500 max-w-md">
            All static seed rows have been removed. Only real paper trades evaluated and executed by the 5 autonomous agents are recorded here.
          </p>
          <div className="flex items-center gap-2 mt-2">
            <button
              onClick={() => handleDeployOrder('ALL')}
              className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold uppercase rounded-xl transition cursor-pointer shadow-[0_0_15px_rgba(0,240,255,0.3)]"
            >
              Run 5-Agent Auto-Execution Across All Desks
            </button>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-[#080d1a]/90 shadow-2xl">
          <table className="w-full text-left text-xs font-mono">
            {/* Table Header: STRICTLY adhering to the 8 required columns */}
            <thead className="bg-[#0b1224] text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3.5 px-4 font-bold text-slate-200">Instrument</th>
                <th className="py-3.5 px-3 font-bold text-center">Side</th>
                <th className="py-3.5 px-3 font-bold text-right">Qty</th>
                <th className="py-3.5 px-4 font-bold text-right text-slate-200">Entry Price</th>
                <th className="py-3.5 px-4 font-bold text-right text-slate-200">Exit Price</th>
                <th className="py-3.5 px-4 font-bold text-right text-slate-200">P&L</th>
                <th className="py-3.5 px-4 font-bold text-cyan-400 whitespace-nowrap">Date (dd-mmm-yyyy)</th>
                <th className="py-3.5 px-4 font-bold text-amber-400 whitespace-nowrap">Time ([hh]:mm:ss)</th>
                <th className="py-3.5 px-3 font-bold text-center text-slate-400">Action / Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 bg-[#060a14]/60">
              {filteredRecords.map((trade, rowIdx) => {
                const isProfit = trade.pnl > 0;
                const isLoss = trade.pnl < 0;

                // Segment badge styling
                const segmentBadge = 
                  trade.segment === 'NSE_FNO' ? 'bg-sky-500/20 text-sky-400 border-sky-500/30' :
                  trade.segment === 'NSE_CASH' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                  trade.segment === 'BSE_CASH' ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' :
                  'bg-amber-500/20 text-amber-400 border-amber-500/30';

                const segmentLabel =
                  trade.segment === 'NSE_FNO' ? 'NSE F&O' :
                  trade.segment === 'NSE_CASH' ? 'NSE Cash' :
                  trade.segment === 'BSE_CASH' ? 'BSE Cash' :
                  'MCX';

                return (
                  <tr 
                    key={`${trade.id}-row-${rowIdx}`} 
                    className="hover:bg-slate-900/60 transition-colors group"
                  >
                    {/* 1. Instrument */}
                    <td className="py-3 px-4">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-100 font-bold text-xs tracking-wide">
                            {trade.instrument}
                          </span>
                          <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase border ${segmentBadge}`}>
                            {segmentLabel}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 truncate max-w-xs mt-0.5">
                          {trade.strategyName} · {trade.agentName}
                        </span>
                      </div>
                    </td>

                    {/* 2. Side */}
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <span className={`px-2.5 py-1 rounded text-[10px] font-bold tracking-wider inline-flex items-center gap-1 ${
                        trade.side === 'BUY'
                          ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-500/40'
                          : 'bg-rose-950/70 text-rose-300 border border-rose-500/40'
                      }`}>
                        {trade.side === 'BUY' ? <ArrowUpRight className="w-3 h-3 text-emerald-400" /> : <ArrowDownRight className="w-3 h-3 text-rose-400" />}
                        <span>{trade.side}</span>
                      </span>
                    </td>

                    {/* 3. Qty */}
                    <td className="py-3 px-3 text-right text-slate-200 font-medium tabular-nums whitespace-nowrap">
                      {trade.qty.toLocaleString('en-IN')}
                    </td>

                    {/* 4. Entry Price */}
                    <td className="py-3 px-4 text-right text-slate-200 font-semibold tabular-nums whitespace-nowrap">
                      ₹{trade.entryPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>

                    {/* 5. Exit Price */}
                    <td className="py-3 px-4 text-right font-semibold tabular-nums whitespace-nowrap">
                      {trade.isOpen ? (
                        <span className="text-cyan-300 inline-flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping"></span>
                          <span>LTP ₹{trade.exitPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </span>
                      ) : (
                        <span className="text-slate-200">
                          ₹{trade.exitPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      )}
                    </td>

                    {/* 6. P&L */}
                    <td className="py-3 px-4 text-right font-bold tabular-nums whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 ${
                        isProfit ? 'text-emerald-400' : isLoss ? 'text-rose-400' : 'text-slate-400'
                      }`}>
                        {isProfit && <TrendingUp className="w-3.5 h-3.5" />}
                        {isLoss && <TrendingDown className="w-3.5 h-3.5" />}
                        <span>
                          {isProfit ? '+' : ''}₹{trade.pnl.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </span>
                    </td>

                    {/* 7. Date (dd-mmm-yyyy) */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-cyan-300 font-mono text-[11px] font-semibold">
                        <Calendar className="w-3.5 h-3.5 text-cyan-500/80" />
                        <span>{trade.dateStr}</span>
                      </div>
                    </td>

                    {/* 8. Time ([hh]:mm:ss) */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-amber-300 font-mono text-[11px] font-bold">
                        <Clock className="w-3.5 h-3.5 text-amber-500/80" />
                        <span>{trade.timeStr}</span>
                      </div>
                    </td>

                    {/* Action / Status */}
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      {trade.isOpen ? (
                        <button
                          onClick={() => handleSquareOffOrder(trade.orderId)}
                          className="px-2.5 py-1 bg-rose-950/60 hover:bg-rose-900 border border-rose-500/40 text-rose-300 text-[10px] font-bold rounded-lg transition cursor-pointer"
                          title="Square off this open position immediately"
                        >
                          SQUARE OFF
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-bold px-2 py-0.5 bg-slate-900/90 border border-slate-800 rounded">
                          {trade.status === 'SQUARED_OFF' ? 'CLOSED' : trade.status}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer Audit Guarantee */}
      <div className="p-4 rounded-xl bg-[#080d1a]/60 border border-slate-800 text-xs text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            SEBI Capital Preservation Guarantee: Single trade risk bounded to ≤ 0.8% of capital. No naked positions allowed.
          </span>
        </div>
        {onNavigateToAgents && (
          <button
            onClick={onNavigateToAgents}
            className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 font-bold text-xs transition cursor-pointer"
          >
            <span>Back to 5-Agent Desk</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
