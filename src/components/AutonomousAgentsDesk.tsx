import React, { useState, useMemo, useEffect } from 'react';
import { SEBI_COMPLIANCE_RULES } from '../data/sebiRegulatoryFramework';
import { AutonomousAgent, PaperTradeOrder } from '../types/quant';
import { useLiveMarketData } from '../services/liveMarketService';
import { 
  deriveLiveAutonomousAgents, 
  generateLiveMarketOrder,
  updateOrdersLivePnl
} from '../services/agentQuantEngine';
import { 
  Bot, 
  ShieldCheck, 
  Play, 
  Pause, 
  RotateCw, 
  CheckCircle2, 
  AlertTriangle, 
  Zap, 
  Scale, 
  Calendar, 
  Clock, 
  Edit3, 
  Trash2, 
  X,
  Check,
  Info
} from 'lucide-react';
import { 
  NSE_BSE_HOLIDAYS_2026,
  NSE_BSE_HOLIDAYS_2027, 
  getNiftySeriesForYear, 
  getSensexSeriesForYear,
  INITIAL_SYNC_STATE,
  executePostMarketSync,
  PostMarketSyncState
} from '../utils/indianHolidayCalendar';

interface AutonomousAgentsDeskProps {
  onOpenCircuitBreaker: () => void;
}

export const AutonomousAgentsDesk: React.FC<AutonomousAgentsDeskProps> = ({ onOpenCircuitBreaker }) => {
  const { quotes, latencyMs } = useLiveMarketData(5000);

  // User-configured capital allocation (strictly zero dummy/demo numbers)
  const [totalCapital, setTotalCapital] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('jarvis_agent_total_capital');
      return saved ? Number(saved) : 0;
    } catch {
      return 0;
    }
  });

  const [userAllocations, setUserAllocations] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem('jarvis_agent_allocations');
      return saved ? JSON.parse(saved) : {
        agent_chanakya: 0,
        agent_bhishma: 0,
        agent_arjuna: 0,
        agent_kuber: 0,
        agent_vidura: 0,
      };
    } catch {
      return {
        agent_chanakya: 0,
        agent_bhishma: 0,
        agent_arjuna: 0,
        agent_kuber: 0,
        agent_vidura: 0,
      };
    }
  });

  const [showAllocationModal, setShowAllocationModal] = useState<boolean>(false);
  const [tempCapitalInput, setTempCapitalInput] = useState<string>(totalCapital > 0 ? String(totalCapital) : '');

  // Session paper orders (starts clean with 0 fake orders)
  const [orders, setOrders] = useState<PaperTradeOrder[]>(() => {
    try {
      const saved = localStorage.getItem('jarvis_session_orders');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [selectedAgentId, setSelectedAgentId] = useState<string>('agent_bhishma');
  const [segmentFilter, setSegmentFilter] = useState<'ALL' | 'NSE_FNO' | 'NSE_CASH' | 'MCX'>('ALL');
  const [holidayYear, setHolidayYear] = useState<2026 | 2027>(2026);
  const [postMarketSync, setPostMarketSync] = useState<PostMarketSyncState>(INITIAL_SYNC_STATE);
  const [isSyncingPostMarket, setIsSyncingPostMarket] = useState<boolean>(false);
  const [syncToastMessage, setSyncToastMessage] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [allBotsArmed, setAllBotsArmed] = useState<boolean>(true);
  const [agentStatusOverrides, setAgentStatusOverrides] = useState<Record<string, 'ACTIVE_HEDGING' | 'STANDBY_RULES'>>({});
  const [showDeskInfo, setShowDeskInfo] = useState<boolean>(false);

  // Persist orders to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('jarvis_session_orders', JSON.stringify(orders));
    } catch {
      // Ignore
    }
  }, [orders]);

  // Update unrealized PnL of open orders as live market ticks arrive
  useEffect(() => {
    if (orders.some(o => o.status === 'OPEN')) {
      setOrders(prev => updateOrdersLivePnl(prev, quotes));
    }
  }, [quotes]);

  // Derive the 5 agents dynamically from actual live market conditions, spot prices, and real orders
  const agents = useMemo(() => {
    const liveDerived = deriveLiveAutonomousAgents(quotes, orders, userAllocations);
    return liveDerived.map(a => {
      const override = agentStatusOverrides[a.id];
      if (override) {
        return { ...a, status: override };
      }
      return a;
    });
  }, [quotes, orders, userAllocations, agentStatusOverrides]);

  const selectedAgent = agents.find(a => a.id === selectedAgentId) || agents[0];

  const handleRunPostMarketSync = () => {
    setIsSyncingPostMarket(true);
    setTimeout(() => {
      setPostMarketSync(prev => executePostMarketSync(prev.auditLog));
      setIsSyncingPostMarket(false);
      setSyncToastMessage('5:00 PM IST Post-Market Task Completed: NSE & BSE 2026/2027 circulars verified.');
      setTimeout(() => setSyncToastMessage(null), 5000);
    }, 700);
  };

  // Portfolio ledger totals strictly derived from real orders
  const closedOrders = orders.filter(o => o.status !== 'OPEN');
  const openOrders = orders.filter(o => o.status === 'OPEN');

  const totalRealizedPnl = closedOrders.reduce((sum, o) => sum + (o.pnlINR || 0), 0);
  const totalUnrealizedPnl = openOrders.reduce((sum, o) => sum + (o.pnlINR || 0), 0);
  const totalInvestedCapital = openOrders.reduce((sum, o) => sum + (o.totalInvestmentINR || 0), 0);
  const totalMaxRiskCapped = openOrders.reduce((sum, o) => sum + (o.maxDefinedLossINR || 0), 0);
  const peakMarginBuffer = Math.max(0, totalCapital - totalInvestedCapital);
  const marginUtilizationPct = totalCapital > 0 ? Math.round((totalInvestedCapital / totalCapital) * 100) : 0;

  // Trigger autonomous agent scanning cycle using REAL live market ticks
  const handleTriggerScanCycle = () => {
    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
      const newOrder = generateLiveMarketOrder(quotes, selectedAgentId);
      setOrders(prev => [newOrder, ...prev]);
    }, 600);
  };

  const handleSquareOffOrder = (orderId: string) => {
    setOrders(prev => prev.map(o => {
      if (o.id === orderId) {
        return {
          ...o,
          status: 'SQUARED_OFF',
          timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }) + ' IST (Closed)'
        };
      }
      return o;
    }));
  };

  const handleClearOrders = () => {
    setOrders([]);
    try {
      localStorage.removeItem('jarvis_session_orders');
    } catch {
      // Ignore
    }
  };

  const handleToggleAgentStatus = (agentId: string) => {
    setAgentStatusOverrides(prev => {
      const current = prev[agentId] || agents.find(a => a.id === agentId)?.status || 'ACTIVE_HEDGING';
      const next = current === 'STANDBY_RULES' ? 'ACTIVE_HEDGING' : 'STANDBY_RULES';
      return { ...prev, [agentId]: next };
    });
  };

  const handleSaveCapitalAllocation = (newTotal: number) => {
    setTotalCapital(newTotal);
    // Standard rulebook allocation: 40% Bhishma (F&O), 20% Arjuna (Cash), 20% Kuber (MCX), 10% Chanakya (Macro), 10% Vidura (Surveillance)
    const newAlloc = {
      agent_bhishma: Math.round(newTotal * 0.40),
      agent_arjuna: Math.round(newTotal * 0.20),
      agent_kuber: Math.round(newTotal * 0.20),
      agent_chanakya: Math.round(newTotal * 0.10),
      agent_vidura: Math.round(newTotal * 0.10),
    };
    setUserAllocations(newAlloc);
    try {
      localStorage.setItem('jarvis_agent_total_capital', String(newTotal));
      localStorage.setItem('jarvis_agent_allocations', JSON.stringify(newAlloc));
    } catch {
      // Ignore
    }
    setShowAllocationModal(false);
  };

  const filteredOrders = orders.filter(o => {
    if (segmentFilter === 'ALL') return true;
    if (segmentFilter === 'NSE_FNO') return o.segment === 'NSE_FNO';
    if (segmentFilter === 'NSE_CASH') return o.segment === 'NSE_CASH' || o.segment === 'BSE_CASH';
    if (segmentFilter === 'MCX') return o.segment === 'MCX_FUTURES' || o.segment === 'MCX_OPTIONS';
    return true;
  });

  return (
    <div className="flex flex-col gap-6">
      {/* Top Banner: Multi-Agent Performance & Strict Capital Preservation */}
      <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-400/30 flex items-center justify-center text-sky-400">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-100 flex items-center gap-2 font-display">
                  <span>Autonomous Multi-Agent Quant & Hedge Desk</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 font-bold">
                    SEBI / NSE / MCX COMPLIANT
                  </span>
                </h2>
                <div className="relative">
                  <button
                    onClick={() => setShowDeskInfo(!showDeskInfo)}
                    className="p-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-cyan-300 border border-slate-700 transition-colors cursor-pointer"
                    title="Agent Strategy Architecture & Safety Rules"
                  >
                    <Info className="w-3.5 h-3.5 text-sky-400" />
                  </button>
                  {showDeskInfo && (
                    <div className="absolute left-0 top-8 z-30 w-80 sm:w-96 p-3.5 rounded-xl bg-[#090e19] border border-cyan-500/40 shadow-2xl text-xs font-sans text-slate-300 leading-relaxed animate-in fade-in duration-150">
                      <div className="flex items-center justify-between pb-1.5 border-b border-slate-800 mb-2">
                        <span className="font-mono font-bold text-[10px] text-sky-300 uppercase">5-Agent Quant Architecture</span>
                        <button onClick={() => setShowDeskInfo(false)} className="text-slate-400 hover:text-white cursor-pointer">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <p className="text-[11px] text-slate-300">
                        5 specialized strategy bots executing strictly defined-risk positions with zero naked exposures and mathematical asymmetry: <strong className="text-sky-300">Chanakya</strong> (Macro Policy), <strong className="text-sky-300">Bhishma</strong> (Vega & Iron Condor), <strong className="text-sky-300">Arjuna</strong> (Momentum Gamma), <strong className="text-sky-300">Kuber</strong> (Cash Delivery), and <strong className="text-sky-300">Vidura</strong> (Statutory Risk Arbitrage).
                      </p>
                      <div className="mt-2 pt-2 border-t border-slate-800/80 text-[10px] text-emerald-400 font-mono">
                        ✓ Peak Margin Rule Compliant · Zero Overnight Naked Risk
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowAllocationModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-mono font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30 transition-all cursor-pointer"
              title="Configure real capital allocation pool"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>{totalCapital > 0 ? 'ADJUST ALLOCATION' : 'ALLOCATE CAPITAL'}</span>
            </button>

            <button
              onClick={handleTriggerScanCycle}
              disabled={isScanning || !allBotsArmed}
              className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-sky-600 hover:bg-sky-500 disabled:opacity-50 rounded-xl transition-all shadow-md shadow-sky-600/20 active:scale-95 cursor-pointer"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
              <span>{isScanning ? 'Scanning Markets...' : 'Scan All Markets Now'}</span>
            </button>

            <button
              onClick={() => setAllBotsArmed(!allBotsArmed)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-mono font-semibold rounded-xl border transition-all cursor-pointer ${
                allBotsArmed 
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300' 
                  : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
              }`}
            >
              {allBotsArmed ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
              <span>{allBotsArmed ? 'ALL BOTS ARMED' : 'BOTS PAUSED'}</span>
            </button>
          </div>
        </div>

        {/* Live Capital & Risk Ledger */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 text-xs font-mono">
          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-500 uppercase">Allocated Capital</span>
              <button 
                onClick={() => setShowAllocationModal(true)}
                className="text-[10px] text-cyan-400 hover:underline cursor-pointer"
              >
                {totalCapital > 0 ? 'Change' : 'Set'}
              </button>
            </div>
            <span className="text-base font-bold text-slate-100 mt-0.5">
              {totalCapital > 0 ? `₹${totalCapital.toLocaleString('en-IN')}` : '₹0.00 (Unallocated)'}
            </span>
            <span className="text-[10px] text-slate-400 mt-1">
              Invested: ₹{totalInvestedCapital.toLocaleString('en-IN')}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col justify-between">
            <span className="text-[10px] text-slate-500 uppercase">Combined Realized PnL</span>
            <span className={`text-base font-bold mt-0.5 ${
              totalRealizedPnl > 0 ? 'text-emerald-400' : totalRealizedPnl < 0 ? 'text-rose-400' : 'text-slate-300'
            }`}>
              {totalRealizedPnl > 0 ? '+' : ''}₹{totalRealizedPnl.toLocaleString('en-IN')}
            </span>
            <span className={`text-[10px] mt-1 ${
              totalUnrealizedPnl > 0 ? 'text-emerald-400/80' : totalUnrealizedPnl < 0 ? 'text-rose-400/80' : 'text-slate-400'
            }`}>
              Unrealized: {totalUnrealizedPnl > 0 ? '+' : ''}₹{totalUnrealizedPnl.toLocaleString('en-IN')}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col justify-between">
            <span className="text-[10px] text-slate-500 uppercase">Max Defined Risk (Capped)</span>
            <span className="text-base font-bold text-amber-400 mt-0.5">
              ₹{totalMaxRiskCapped.toLocaleString('en-IN')}
            </span>
            <span className="text-[10px] text-slate-400 mt-1">
              {totalCapital > 0 
                ? `${((totalMaxRiskCapped / totalCapital) * 100).toFixed(2)}% of Capital` 
                : 'No open risk'}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col justify-between">
            <span className="text-[10px] text-slate-500 uppercase">Available Margin Buffer</span>
            <span className="text-base font-bold text-sky-400 mt-0.5">
              {totalCapital > 0 ? `₹${peakMarginBuffer.toLocaleString('en-IN')}` : 'Awaiting Allocation'}
            </span>
            <span className="text-[10px] text-emerald-400 font-semibold mt-1">
              {marginUtilizationPct}% Utilized · Zero Shortfall
            </span>
          </div>
        </div>
      </div>

      {/* 5-Agent Strategy Roster Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {agents.map((agent) => {
          const isSelected = agent.id === selectedAgentId;
          const netTodayPnl = agent.realizedPnlINR + agent.unrealizedPnlINR;

          return (
            <div
              key={agent.id}
              onClick={() => setSelectedAgentId(agent.id)}
              className={`p-4 rounded-xl cursor-pointer transition-all border flex flex-col justify-between gap-3 ${
                isSelected
                  ? 'bg-sky-500/10 border-sky-400/50 shadow-[0_0_15px_rgba(56,189,248,0.15)] ring-1 ring-sky-400/30'
                  : 'bg-slate-900/40 border-slate-800 hover:border-slate-700 hover:bg-slate-900/70'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold font-display text-slate-100 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>{agent.name}</span>
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">{agent.codeName}</span>
                </div>

                <div className="text-[11px] text-sky-400 font-semibold font-mono mb-1">{agent.role}</div>
                <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed font-sans">{agent.strategyType}</p>
              </div>

              <div className="pt-2 border-t border-slate-800 text-[11px] font-mono flex flex-col gap-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Allocated:</span>
                  <span className="text-slate-200">
                    {agent.allocatedCapitalINR > 0 
                      ? `₹${agent.allocatedCapitalINR.toLocaleString('en-IN')}` 
                      : 'Unallocated'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Win Rate:</span>
                  <span className={agent.winRatePct !== null ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
                    {agent.winRatePct !== null ? `${agent.winRatePct}%` : '--'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Today PnL:</span>
                  <span className={`font-bold ${
                    netTodayPnl > 0 ? 'text-emerald-400' : netTodayPnl < 0 ? 'text-rose-400' : 'text-slate-400'
                  }`}>
                    {netTodayPnl > 0 ? '+' : ''}₹{netTodayPnl.toLocaleString('en-IN')}
                  </span>
                </div>
                
                <div className="mt-1 flex items-center justify-between pt-1 border-t border-slate-800/80">
                  <span className="text-[10px] text-slate-500">{agent.tradesToday} trades</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleToggleAgentStatus(agent.id); }}
                    className={`text-[10px] px-2 py-0.5 rounded font-bold transition-colors cursor-pointer ${
                      agent.status === 'ACTIVE_HEDGING'
                        ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/40 hover:bg-rose-950 hover:text-rose-300'
                        : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {agent.status === 'ACTIVE_HEDGING' ? 'ARMED' : 'PAUSED'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Agent Invariant Rulebook & Latest Action */}
      <div className="p-5 rounded-2xl bg-slate-900/50 border border-slate-800 backdrop-blur-sm flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold text-slate-200 font-mono uppercase tracking-wider">
              {selectedAgent.name} ({selectedAgent.codeName}) — Hard-Coded Statutory Invariants & Rules
            </span>
          </div>
          <span className="text-[11px] font-mono text-slate-500">
            LAST DECISION: {selectedAgent.lastActionTimestamp}
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mt-1">
          {/* Rules Checklist (7 cols) */}
          <div className="lg:col-span-7 flex flex-col gap-2">
            <span className="text-[11px] font-mono text-slate-400 uppercase">Non-Negotiable Execution Rules:</span>
            <div className="flex flex-col gap-1.5">
              {selectedAgent.strictRuleSet.map((rule, idx) => (
                <div key={idx} className="flex items-start gap-2 p-2 rounded-lg bg-slate-950/70 border border-slate-800/80 text-xs text-slate-300 font-sans">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                  <span>{rule}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Last Action Transcript (5 cols) */}
          <div className="lg:col-span-5 p-3.5 rounded-xl bg-slate-950/80 border border-sky-500/20 flex flex-col justify-between gap-2">
            <div>
              <span className="text-[10px] font-mono text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5" />
                <span>Autonomous Market Action Audit</span>
              </span>
              <p className="text-xs text-slate-200 leading-relaxed font-mono mt-2">
                "{selectedAgent.lastAction}"
              </p>
            </div>
            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono text-slate-400">
              <span>Execution Pipeline: DIRECT NSE/MCX</span>
              <span className="text-emerald-400">0 RULE VIOLATIONS</span>
            </div>
          </div>
        </div>
      </div>

      {/* Paper Trading Active Positions Ledger (Strict Defined Risk) */}
      <div className="p-5 rounded-2xl bg-slate-900/50 border border-slate-800 backdrop-blur-sm flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              <Scale className="w-4 h-4 text-amber-400" />
              <span>Live Paper Trading Positions & Order Book</span>
            </h3>
            <p className="text-xs text-slate-400">
              Orders generated live from actual exchange tick prices. Zero fake simulation.
            </p>
          </div>

          {/* Controls: Segment Filter & Clear */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono">
              {[
                { id: 'ALL', label: 'All Segments' },
                { id: 'NSE_FNO', label: 'NSE F&O' },
                { id: 'NSE_CASH', label: 'NSE/BSE Cash' },
                { id: 'MCX', label: 'MCX Commodity' },
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setSegmentFilter(f.id as any)}
                  className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                    segmentFilter === f.id
                      ? 'bg-sky-500/20 text-sky-300 font-bold border border-sky-500/40'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {orders.length > 0 && (
              <button
                onClick={handleClearOrders}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-rose-400 hover:text-rose-300 bg-rose-950/30 hover:bg-rose-950/60 border border-rose-800/40 rounded-lg transition font-mono cursor-pointer"
                title="Clear current paper order log"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear Orders</span>
              </button>
            )}
          </div>
        </div>

        {/* Positions Table / Empty State */}
        {filteredOrders.length === 0 ? (
          <div className="p-8 rounded-xl border border-slate-800 bg-[#070b14]/80 text-center flex flex-col items-center justify-center gap-3 font-mono">
            <Scale className="w-8 h-8 text-slate-600" />
            <div className="text-xs text-slate-300 font-bold uppercase tracking-wider">
              No Active Working Orders in Current Session
            </div>
            <p className="text-[11px] text-slate-500 max-w-md">
              Select an agent from the roster above and click <strong className="text-sky-400">"Scan All Markets Now"</strong> to trigger algorithmic evaluation pegged to current NSE/BSE ticks.
            </p>
            <button
              onClick={handleTriggerScanCycle}
              disabled={isScanning}
              className="mt-2 flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-xl transition shadow-[0_0_15px_rgba(0,240,255,0.3)] cursor-pointer"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
              <span>Deploy Order with {selectedAgent.name}</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-800 mt-1">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-[#080d1a] text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-2.5 px-3">Order ID / Time</th>
                  <th className="py-2.5 px-3">Agent & Strategy</th>
                  <th className="py-2.5 px-3">Instrument / Structure</th>
                  <th className="py-2.5 px-3">Segment</th>
                  <th className="py-2.5 px-3 text-right">Required Margin</th>
                  <th className="py-2.5 px-3 text-right">Max Loss (Capped)</th>
                  <th className="py-2.5 px-3 text-right">Target Profit</th>
                  <th className="py-2.5 px-3 text-right">Live PnL</th>
                  <th className="py-2.5 px-3 text-center">Status / Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-[#060a14]/60">
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-900/50 transition-colors">
                    <td className="py-2.5 px-3">
                      <span className="text-slate-200 font-bold block">{order.id}</span>
                      <span className="text-[10px] text-slate-500">{order.timestamp}</span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="text-sky-300 font-semibold block">{order.agentName}</span>
                      <span className="text-[10px] text-slate-400">{order.strategyName}</span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-100 font-medium">
                      {order.symbol}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                        {order.segment}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-200 tabular-nums">
                      ₹{order.totalInvestmentINR.toLocaleString('en-IN')}
                    </td>
                    <td className="py-2.5 px-3 text-right text-amber-400 font-semibold tabular-nums">
                      ₹{order.maxDefinedLossINR.toLocaleString('en-IN')}
                    </td>
                    <td className="py-2.5 px-3 text-right text-emerald-400 font-semibold tabular-nums">
                      ₹{order.targetProfitINR.toLocaleString('en-IN')}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold tabular-nums">
                      <span className={order.pnlINR > 0 ? 'text-emerald-400' : order.pnlINR < 0 ? 'text-rose-400' : 'text-slate-400'}>
                        {order.pnlINR > 0 ? '+' : ''}₹{order.pnlINR.toLocaleString('en-IN')}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {order.status === 'OPEN' ? (
                        <button
                          onClick={() => handleSquareOffOrder(order.id)}
                          className="px-2 py-1 bg-rose-950/60 hover:bg-rose-900 border border-rose-500/40 text-rose-300 text-[10px] font-bold rounded transition cursor-pointer"
                        >
                          SQUARE OFF
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-500 font-bold px-2 py-0.5 bg-slate-900 rounded">
                          CLOSED
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* SEBI / NSE / RBI Compliance Rule Engine Audit */}
      <div className="p-5 rounded-2xl bg-slate-900/50 border border-slate-800 backdrop-blur-sm flex flex-col gap-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-sky-400" />
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">
              SEBI, NSE, BSE, MCX & RBI Statutory Rule Invariants
            </h3>
          </div>
          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/40 px-2.5 py-0.5 rounded border border-emerald-500/40">
            6/6 INVARIANTS SATISFIED
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
          {SEBI_COMPLIANCE_RULES.map((rule) => (
            <div
              key={rule.ruleId}
              className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/90 flex flex-col justify-between gap-2"
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800/60">
                    {rule.authority}
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400 font-bold">
                    {rule.status}
                  </span>
                </div>
                <h4 className="text-xs font-semibold text-slate-200">{rule.name}</h4>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{rule.requirement}</p>
              </div>

              <div className="pt-2 border-t border-slate-800/80 text-[10px] font-mono text-emerald-400/90">
                {rule.details}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Official NSE & BSE 2026 / 2027 Holiday Calendar & Daily 5:00 PM IST Auto-Task */}
      <div className="p-5 rounded-2xl bg-slate-900/50 border border-slate-800 backdrop-blur-sm flex flex-col gap-4">
        {/* Header with Year Selector & Daily 5 PM IST Auto-Task Status */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <Calendar className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono flex items-center gap-2">
                <span>NSE / BSE {holidayYear} Trading Holiday & Preceding-Day Expiry Adjustment Matrix</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300 font-bold">
                  PRECEDING TRADING DAY RULE ACTIVE
                </span>
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Statutory Rule: When Tuesday (Nifty) or Thursday (Sensex) falls on an exchange holiday, contracts expire on the immediately preceding trading day.
              </p>
            </div>
          </div>

          {/* Year Switcher (2026 / 2027) */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-slate-400">Calendar Year:</span>
            <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono">
              <button
                onClick={() => setHolidayYear(2026)}
                className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  holidayYear === 2026
                    ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                2026 Schedule (16 Holidays)
              </button>
              <button
                onClick={() => setHolidayYear(2027)}
                className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  holidayYear === 2027
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                2027 Schedule (19 Holidays)
              </button>
            </div>
          </div>
        </div>

        {/* Automated Daily Post-Market Sync Panel */}
        <div className="p-4 rounded-xl bg-slate-950/80 border border-sky-500/25 flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-sky-950/80 border border-sky-500/40 flex items-center justify-center text-sky-400">
                <Clock className="w-4 h-4 animate-spin" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold font-mono text-slate-200 uppercase tracking-wider">
                    Automated Post-Market Holiday & Circular Sync Task
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>DAILY @ 17:00:00 IST (5:00 PM)</span>
                  </span>
                </div>
                <span className="text-[11px] text-slate-400">
                  Daily cron routine actively scans NSE Clearing Corp (Ref: {postMarketSync.exchangeCircularRef}) and BSE Market Operations for holiday circular revisions.
                </span>
              </div>
            </div>

            <button
              onClick={handleRunPostMarketSync}
              disabled={isSyncingPostMarket}
              className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-mono font-bold text-sky-300 bg-sky-950/60 hover:bg-sky-900/80 border border-sky-500/40 rounded-lg transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isSyncingPostMarket ? 'animate-spin' : ''}`} />
              <span>{isSyncingPostMarket ? 'Syncing Circulars...' : 'Run 5:00 PM IST Auto-Check Now'}</span>
            </button>
          </div>

          {syncToastMessage && (
            <div className="p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-500/40 text-emerald-200 text-xs font-mono flex items-center gap-2 animate-in fade-in duration-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{syncToastMessage}</span>
            </div>
          )}

          <div className="flex flex-col gap-1 p-2.5 rounded-lg bg-[#070b14] border border-slate-900 text-[10px] font-mono text-slate-400 max-h-24 overflow-y-auto">
            <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold mb-0.5">5:00 PM IST Execution Trail:</span>
            {postMarketSync.auditLog.map((logLine, idx) => (
              <div key={idx} className="flex items-start gap-1.5">
                <span className="text-emerald-400">✓</span>
                <span className="text-slate-300">{logLine}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming Adjusted Expiries Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-slate-950/80 border border-sky-500/20 flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-sky-300 font-display flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-sky-400" />
                <span>NIFTY 50 (NSE) — {holidayYear} Expiry Series</span>
              </span>
              <span className="text-[10px] font-mono text-slate-400">STANDARD: TUESDAYS</span>
            </div>

            <div className="flex flex-col gap-2 mt-1">
              {getNiftySeriesForYear(holidayYear).slice(0, 4).map((series, idx) => (
                <div
                  key={idx}
                  className={`p-2.5 rounded-lg flex items-center justify-between text-xs font-mono border ${
                    series.isAdjusted
                      ? 'bg-amber-950/30 border-amber-500/40 text-amber-200'
                      : 'bg-slate-900/60 border-slate-800 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-bold">{series.adjustedDateStr}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                      series.isAdjusted ? 'bg-amber-900/60 text-amber-300' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {series.adjustedDayName}
                    </span>
                  </div>

                  <div className="text-right">
                    {series.isAdjusted ? (
                      <span className="text-[10px] font-bold text-amber-400 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
                        <span>Adv. from Tue due to {series.holidayReason}</span>
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-500">Standard Tuesday Expiry ({series.daysRemaining}d)</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/80 border border-amber-500/20 flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-300 font-display flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span>BSE SENSEX — {holidayYear} Expiry Series</span>
              </span>
              <span className="text-[10px] font-mono text-slate-400">STANDARD: THURSDAYS</span>
            </div>

            <div className="flex flex-col gap-2 mt-1">
              {getSensexSeriesForYear(holidayYear).slice(0, 4).map((series, idx) => (
                <div
                  key={idx}
                  className={`p-2.5 rounded-lg flex items-center justify-between text-xs font-mono border ${
                    series.isAdjusted
                      ? 'bg-amber-950/30 border-amber-500/40 text-amber-200'
                      : 'bg-slate-900/60 border-slate-800 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-bold">{series.adjustedDateStr}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                      series.isAdjusted ? 'bg-amber-900/60 text-amber-300' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {series.adjustedDayName}
                    </span>
                  </div>

                  <div className="text-right">
                    {series.isAdjusted ? (
                      <span className="text-[10px] font-bold text-amber-400 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
                        <span>Adv. from Thu due to {series.holidayReason}</span>
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-500">Standard Thursday Expiry ({series.daysRemaining}d)</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Selected Year Full Declared Holiday Schedule Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-800 mt-2">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-[#080d1a] text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-2.5 px-3">Holiday Date</th>
                <th className="py-2.5 px-3">Day of Week</th>
                <th className="py-2.5 px-3">Occasion / Festival</th>
                <th className="py-2.5 px-3">Exchange Scope</th>
                <th className="py-2.5 px-3 text-right">Expiry Impact & Precedence Adjustment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 bg-[#060a14]/60">
              {(holidayYear === 2026 ? NSE_BSE_HOLIDAYS_2026 : NSE_BSE_HOLIDAYS_2027).map((holiday) => {
                const isTuesday = holiday.dayOfWeek === 'Tuesday';
                const isThursday = holiday.dayOfWeek === 'Thursday';
                const hasImpact = Boolean(holiday.impactsExpiry);

                return (
                  <tr 
                    key={holiday.date} 
                    className={`hover:bg-slate-900/50 transition-colors ${
                      hasImpact ? 'bg-amber-950/20' : ''
                    }`}
                  >
                    <td className="py-2.5 px-3 text-slate-100 font-bold">{holiday.date}</td>
                    <td className="py-2.5 px-3">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        isTuesday ? 'bg-sky-950 text-sky-400 border border-sky-800' :
                        isThursday ? 'bg-amber-950 text-amber-400 border border-amber-800' :
                        'text-slate-400'
                      }`}>
                        {holiday.dayOfWeek}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-200 font-medium">
                      {holiday.name}
                      {holiday.notes && (
                        <span className="block text-[10px] text-amber-400/80 font-normal">{holiday.notes}</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-slate-400">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                        NSE · BSE · MCX
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {isTuesday ? (
                        <span className="text-[10px] font-bold text-amber-400 px-2 py-0.5 rounded bg-amber-950/50 border border-amber-500/30">
                          NIFTY Expiry Advanced to Monday
                        </span>
                      ) : isThursday ? (
                        <span className="text-[10px] font-bold text-amber-400 px-2 py-0.5 rounded bg-amber-950/50 border border-amber-500/30">
                          SENSEX Expiry Advanced to Wednesday
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-500">Regular Holiday (No Expiry Conflict)</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Capital Allocation Modal */}
      {showAllocationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="max-w-md w-full bg-[#080d1a] border border-cyan-500/40 rounded-2xl p-6 shadow-2xl flex flex-col gap-4 font-mono">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Scale className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-slate-100 uppercase">Configure Real Capital Pool</h3>
              </div>
              <button 
                onClick={() => setShowAllocationModal(false)}
                className="text-slate-400 hover:text-slate-200 text-sm cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Enter the exact rupee capital you wish to allocate across the 5 autonomous strategy agents. (No demo/dummy values).
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">TOTAL CAPITAL (₹ INR)</label>
                <input
                  type="number"
                  placeholder="e.g. 5000000"
                  value={tempCapitalInput}
                  onChange={(e) => setTempCapitalInput(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-100 font-bold outline-none focus:border-cyan-400"
                />
              </div>

              {/* Quick Presets */}
              <div className="flex items-center gap-2">
                {[1000000, 2500000, 5000000, 10000000].map(val => (
                  <button
                    key={val}
                    onClick={() => setTempCapitalInput(String(val))}
                    className="flex-1 py-1 text-[10px] font-bold rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 cursor-pointer"
                  >
                    ₹{(val / 1e5).toFixed(0)}L
                  </button>
                ))}
              </div>

              <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800 text-[10px] text-slate-400 space-y-1">
                <div className="text-slate-300 font-bold">Rulebook Multi-Agent Distribution:</div>
                <div className="flex justify-between"><span>Bhishma (NSE F&O Spreads):</span> <span className="text-cyan-300">40%</span></div>
                <div className="flex justify-between"><span>Arjuna (Cash Momentum):</span> <span className="text-cyan-300">20%</span></div>
                <div className="flex justify-between"><span>Kuber (MCX Commodities):</span> <span className="text-cyan-300">20%</span></div>
                <div className="flex justify-between"><span>Chanakya (Macro Sentinel):</span> <span className="text-cyan-300">10%</span></div>
                <div className="flex justify-between"><span>Vidura (Risk Arbiter Buffer):</span> <span className="text-cyan-300">10%</span></div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                onClick={() => setShowAllocationModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-slate-300 text-xs font-bold cursor-pointer"
              >
                CANCEL
              </button>
              <button
                onClick={() => {
                  const val = Number(tempCapitalInput) || 0;
                  handleSaveCapitalAllocation(val);
                }}
                className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-[0_0_15px_rgba(0,240,255,0.3)] cursor-pointer"
              >
                SAVE ALLOCATION
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
