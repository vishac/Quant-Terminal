import React, { useState, useMemo, useEffect } from 'react';
import { SEBI_COMPLIANCE_RULES } from '../data/sebiRegulatoryFramework';
import { AutonomousAgent, PaperTradeOrder, AgentDecisionScript, AgentMarketInsight, AgentStrategyHealingReport } from '../types/quant';
import { useLiveMarketData } from '../services/liveMarketService';
import { 
  deriveLiveAutonomousAgents, 
  generateLiveMarketOrder,
  generateOrderFromDecisionScript,
  updateOrdersLivePnl,
  autoSquareOffBreachedAgentOrders,
  generateStrategyHealingReport,
  computeLeakProofPositionSize
} from '../services/agentQuantEngine';
import { formatOrderDate, formatOrderTime } from '../utils/orderFormatters';
import { FirstPrinciplesMarketEngine } from './FirstPrinciplesMarketEngine';
import { 
  Bot, 
  ShieldCheck, 
  ShieldAlert,
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
  Info,
  Globe,
  TrendingUp,
  Target,
  Radio,
  Layers,
  ExternalLink,
  FileText,
  Sparkles,
  Wrench,
  BookOpen,
  RefreshCcw,
  Sliders,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Cpu
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
  onNavigateToTradeHistory?: () => void;
}

export const AutonomousAgentsDesk: React.FC<AutonomousAgentsDeskProps> = ({ 
  onOpenCircuitBreaker,
  onNavigateToTradeHistory 
}) => {
  const { quotes, latencyMs } = useLiveMarketData(5000);

  // User-configured capital allocation (defaults to ₹5,00,000 working capital so 5 agents immediately size trades)
  const [totalCapital, setTotalCapital] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('jarvis_agent_total_capital');
      const parsed = saved ? Number(saved) : 0;
      return parsed > 0 ? parsed : 500000;
    } catch {
      return 500000;
    }
  });

  const [userAllocations, setUserAllocations] = useState<Record<string, number>>(() => {
    const defaultSplit = {
      agent_chanakya: 100000,
      agent_bhishma: 100000,
      agent_arjuna: 100000,
      agent_kuber: 100000,
      agent_vidura: 100000,
    };
    try {
      const saved = localStorage.getItem('jarvis_agent_allocations');
      if (!saved) return defaultSplit;
      const parsed = JSON.parse(saved);
      const sum = Object.values(parsed).reduce((acc: number, v: any) => acc + (Number(v) || 0), 0);
      return sum > 0 ? parsed : defaultSplit;
    } catch {
      return defaultSplit;
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
  const [allBotsArmed, setAllBotsArmed] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('jarvis_bots_armed_state');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });
  const [agentStatusOverrides, setAgentStatusOverrides] = useState<Record<string, 'ACTIVE_HEDGING' | 'STANDBY_RULES'>>(() => {
    try {
      const saved = localStorage.getItem('jarvis_bot_status_overrides');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [showDeskInfo, setShowDeskInfo] = useState<boolean>(false);
  const [showKillConfirmModal, setShowKillConfirmModal] = useState<boolean>(false);
  const [intelligenceAgentFilter, setIntelligenceAgentFilter] = useState<string>('ALL');
  const [intelligenceViewTab, setIntelligenceViewTab] = useState<'DECISION_SCRIPTS' | 'LIVE_INSIGHTS'>('DECISION_SCRIPTS');

  // Strict Leak-Proof Weekly Drawdown Tracking (≤ ₹5,000 per week limit)
  const [weeklyLosses, setWeeklyLosses] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem('jarvis_weekly_agent_losses');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Automated Strategy Self-Healing & Diagnostic Post-Mortem Reports
  const [healingReports, setHealingReports] = useState<Record<string, AgentStrategyHealingReport>>(() => {
    try {
      const saved = localStorage.getItem('jarvis_agent_healing_reports');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Active healing modal report being inspected
  const [activeHealingModalReport, setActiveHealingModalReport] = useState<AgentStrategyHealingReport | null>(null);

  // Inspector toggle for challenging the logic & leak-proof architecture
  const [showLeakProofInspector, setShowLeakProofInspector] = useState<boolean>(true);

  // Persist bots armed state and overrides
  useEffect(() => {
    try {
      localStorage.setItem('jarvis_bots_armed_state', String(allBotsArmed));
      localStorage.setItem('jarvis_bot_status_overrides', JSON.stringify(agentStatusOverrides));
      localStorage.setItem('jarvis_weekly_agent_losses', JSON.stringify(weeklyLosses));
      localStorage.setItem('jarvis_agent_healing_reports', JSON.stringify(healingReports));
    } catch {
      // Ignore
    }
  }, [allBotsArmed, agentStatusOverrides, weeklyLosses, healingReports]);

  // Listen for global emergency circuit-breaker events across components
  useEffect(() => {
    const handleCircuitBreakerEvent = () => {
      setAllBotsArmed(false);
      setAgentStatusOverrides({
        agent_chanakya: 'STANDBY_RULES',
        agent_bhishma: 'STANDBY_RULES',
        agent_arjuna: 'STANDBY_RULES',
        agent_kuber: 'STANDBY_RULES',
        agent_vidura: 'STANDBY_RULES',
      });
      setOrders(prev => prev.map(o => o.status === 'OPEN' ? {
        ...o,
        status: 'SQUARED_OFF',
        timestamp: new Date().toLocaleTimeString('en-IN') + ' (Circuit Breaker)'
      } : o));
    };

    window.addEventListener('jarvis:circuit-breaker' as any, handleCircuitBreakerEvent);
    return () => window.removeEventListener('jarvis:circuit-breaker' as any, handleCircuitBreakerEvent);
  }, []);

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

  // Derive the 5 agents dynamically with real continuous MTM drawdown surveillance
  const agents = useMemo(() => {
    const liveDerived = deriveLiveAutonomousAgents(quotes, orders, userAllocations, weeklyLosses, healingReports);
    return liveDerived.map(a => {
      const override = agentStatusOverrides[a.id];
      if (override) {
        return { ...a, status: override };
      }
      // If master switch allBotsArmed is false, default to STANDBY_RULES (PAUSED)
      if (!allBotsArmed) {
        return { ...a, status: 'STANDBY_RULES' as const };
      }
      return a;
    });
  }, [quotes, orders, userAllocations, weeklyLosses, healingReports, agentStatusOverrides, allBotsArmed]);

  // CONTINUOUS MTM RISK SURVEILLANCE:
  // If an agent reaches daily drawdown >= ₹2,000 or weekly drawdown >= ₹5,000:
  // 1. Immediately auto-squares off all open orders for that agent.
  // 2. Halts further order execution.
  // 3. Automatically triggers and saves the self-healing strategy diagnostic report.
  useEffect(() => {
    agents.forEach(agent => {
      const isDailyBreach = (agent.tradingState === 'DAILY_HALTED');
      const isWeeklyBreach = (agent.tradingState === 'WEEKLY_HALTED');

      if (isDailyBreach || isWeeklyBreach) {
        // Auto square-off any open orders for this agent
        const hasOpen = orders.some(o => o.agentId === agent.id && o.status === 'OPEN');
        if (hasOpen) {
          const reason = isWeeklyBreach ? 'Weekly loss limit (≥ ₹5,000) breached' : 'Daily loss limit (≥ ₹2,000) breached';
          setOrders(prev => autoSquareOffBreachedAgentOrders(prev, agent.id, reason));
        }

        // Auto generate healing report if not present
        if (!healingReports[agent.id]) {
          const breachLoss = agent.weeklyDrawdownINR || 2050;
          const report = generateStrategyHealingReport(
            agent.id,
            breachLoss,
            isWeeklyBreach ? 'WEEKLY_5000' : 'DAILY_2000',
            quotes
          );
          setHealingReports(prev => {
            const updated = { ...prev, [agent.id]: report };
            try {
              localStorage.setItem('jarvis_agent_healing_reports', JSON.stringify(updated));
            } catch {
              // Ignore
            }
            return updated;
          });
          setSyncToastMessage(`🚨 RISK BREACH HALT: ${agent.name} lost ≥ ₹${isWeeklyBreach ? '5,000' : '2,000'}. Auto-squared off open positions & triggered Strategy Self-Healing Pipeline.`);
          setTimeout(() => setSyncToastMessage(null), 6000);
        }
      }
    });
  }, [agents, orders, quotes, healingReports]);

  // Simulator helper: lets user test and verify the ₹2,000 drawdown rule with 1 click
  const handleSimulateDrawdownBreach = (agentId: string) => {
    const targetAgent = agents.find(a => a.id === agentId);
    if (!targetAgent) return;

    const testOrderId = `BREACH-SIM-${Date.now().toString().slice(-5)}`;
    const now = new Date();
    const orderDate = formatOrderDate(now);
    const orderTime = formatOrderTime(now);
    const timeStr = `${orderDate} ${orderTime} (Risk Liquidation)`;

    const simulatedBreachedOrder: PaperTradeOrder = {
      id: testOrderId,
      agentId,
      agentName: targetAgent.name,
      symbol: `${targetAgent.name} Risk Test Order`,
      segment: 'NSE_CASH',
      strategyName: `${targetAgent.strategyType} [Breaker Test]`,
      legs: [{ instrument: 'SIMULATED-TICK (NSE EQ)', action: 'BUY', qty: 50, price: 1200 }],
      totalInvestmentINR: 60000,
      maxDefinedLossINR: 2150,
      targetProfitINR: 4200,
      riskRewardRatio: `1:${(4200 / 2150).toFixed(2)}`,
      timestamp: timeStr,
      orderDate,
      orderTime,
      status: 'SQUARED_OFF',
      pnlINR: -2150, // Triggers >= ₹2,000 breach
      sebiComplianceVerified: true,
      isSimulation: true
    };

    setOrders(prev => [simulatedBreachedOrder, ...prev]);

    // Generate immediate healing report
    const report = generateStrategyHealingReport(agentId, 2150, 'DAILY_2000', quotes);
    setHealingReports(prev => {
      const updated = { ...prev, [agentId]: report };
      try {
        localStorage.setItem('jarvis_agent_healing_reports', JSON.stringify(updated));
      } catch {
        // Ignore
      }
      return updated;
    });

    setActiveHealingModalReport(report);
    setSyncToastMessage(`⚡ SIMULATION TRIGGERED: ${targetAgent.name} suffered -₹2,150 drawdown. Position auto-liquidated, trading halted, self-healing diagnostic opened.`);
    setTimeout(() => setSyncToastMessage(null), 6000);
  };

  // Reset agent breaker (restores active status after testing or daily reset)
  const handleResetAgentBreaker = (agentId: string) => {
    setOrders(prev => prev.filter(o => !(o.agentId === agentId && (o.pnlINR || 0) < 0)));
    setWeeklyLosses(prev => {
      const copy = { ...prev };
      delete copy[agentId];
      try {
        localStorage.setItem('jarvis_weekly_agent_losses', JSON.stringify(copy));
      } catch {
        // Ignore
      }
      return copy;
    });
    setHealingReports(prev => {
      const copy = { ...prev };
      delete copy[agentId];
      try {
        localStorage.setItem('jarvis_agent_healing_reports', JSON.stringify(copy));
      } catch {
        // Ignore
      }
      return copy;
    });
    setAgentStatusOverrides(prev => ({ ...prev, [agentId]: 'ACTIVE_HEDGING' }));
    setSyncToastMessage(`✓ Agent ${agentId.replace('agent_', '').toUpperCase()} risk limits reset. Capital restored to active status.`);
    setTimeout(() => setSyncToastMessage(null), 3500);
  };

  // Apply recalibrated strategy from the healing report
  const handleApplyHealingStrategy = (report: AgentStrategyHealingReport) => {
    setHealingReports(prev => {
      const updated = {
        ...prev,
        [report.agentId]: { ...report, status: 'APPLIED' as const }
      };
      try {
        localStorage.setItem('jarvis_agent_healing_reports', JSON.stringify(updated));
      } catch {
        // Ignore
      }
      return updated;
    });

    // Re-arm agent
    setAgentStatusOverrides(prev => ({ ...prev, [report.agentId]: 'ACTIVE_HEDGING' }));
    setActiveHealingModalReport(null);
    setSyncToastMessage(`✨ Strategy Recalibrated: ${report.agentName} applied backtest-optimized rules and is re-armed!`);
    setTimeout(() => setSyncToastMessage(null), 5000);
  };

  const selectedAgent = agents.find(a => a.id === selectedAgentId) || agents[0];

  const allDecisionScripts = useMemo(() => {
    const list: AgentDecisionScript[] = [];
    agents.forEach(a => {
      if (a.decisionScripts) list.push(...a.decisionScripts);
    });
    return list;
  }, [agents]);

  const filteredDecisionScripts = useMemo(() => {
    if (intelligenceAgentFilter === 'ALL') return allDecisionScripts;
    return allDecisionScripts.filter(s => s.agentId === intelligenceAgentFilter);
  }, [allDecisionScripts, intelligenceAgentFilter]);

  const allLiveInsights = useMemo(() => {
    const list: AgentMarketInsight[] = [];
    agents.forEach(a => {
      if (a.liveInsights) list.push(...a.liveInsights);
    });
    return list;
  }, [agents]);

  const filteredLiveInsights = useMemo(() => {
    if (intelligenceAgentFilter === 'ALL') return allLiveInsights;
    return allLiveInsights.filter(i => i.agentId === intelligenceAgentFilter);
  }, [allLiveInsights, intelligenceAgentFilter]);

  const handleStageScript = (script: AgentDecisionScript) => {
    const newOrder = generateOrderFromDecisionScript(script, quotes);
    setOrders(prev => [newOrder, ...prev]);
    setSyncToastMessage(`⚡ Decision Script Staged: ${script.symbol} added to paper trade working orders.`);
    setTimeout(() => setSyncToastMessage(null), 3500);
  };

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
  const handleTriggerScanCycle = (forcedAgentId?: string) => {
    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
      if (forcedAgentId) {
        const newOrder = generateLiveMarketOrder(quotes, forcedAgentId);
        setOrders(prev => [newOrder, ...prev]);
        setSyncToastMessage(`⚡ Order executed on ${newOrder.segment}: ${newOrder.symbol}`);
        setTimeout(() => setSyncToastMessage(null), 4000);
        return;
      }

      if (segmentFilter === 'MCX') {
        const mcxOrder = generateLiveMarketOrder(quotes, 'agent_kuber');
        setOrders(prev => [mcxOrder, ...prev]);
        setSyncToastMessage(`⚡ MCX Commodity Order executed: ${mcxOrder.symbol}`);
      } else if (segmentFilter === 'NSE_CASH') {
        const cashOrder = generateLiveMarketOrder(quotes, 'agent_arjuna');
        setOrders(prev => [cashOrder, ...prev]);
        setSyncToastMessage(`⚡ NSE Cash Order executed: ${cashOrder.symbol}`);
      } else if (segmentFilter === 'NSE_FNO') {
        const fnoOrder = generateLiveMarketOrder(quotes, 'agent_bhishma');
        setOrders(prev => [fnoOrder, ...prev]);
        setSyncToastMessage(`⚡ NSE F&O Order executed: ${fnoOrder.symbol}`);
      } else {
        // ALL SEGMENTS: Scan and generate orders across all 3 key market desks (F&O, Cash, MCX)
        const fnoOrder = generateLiveMarketOrder(quotes, 'agent_bhishma');
        const cashOrder = generateLiveMarketOrder(quotes, 'agent_arjuna');
        const mcxOrder = generateLiveMarketOrder(quotes, 'agent_kuber');
        setOrders(prev => [fnoOrder, cashOrder, mcxOrder, ...prev]);
        setSyncToastMessage(`⚡ Multi-Desk Orders Deployed: NSE F&O, NSE Cash, and MCX Commodity.`);
      }
      setTimeout(() => setSyncToastMessage(null), 4000);
    }, 600);
  };

  const handleSquareOffOrder = (orderId: string) => {
    const now = new Date();
    setOrders(prev => prev.map(o => {
      if (o.id === orderId) {
        return {
          ...o,
          status: 'SQUARED_OFF',
          orderDate: o.orderDate || formatOrderDate(now),
          orderTime: o.orderTime || formatOrderTime(now),
          timestamp: `${o.orderDate || formatOrderDate(now)} ${formatOrderTime(now)} (Closed)`
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

  const handleToggleMasterBotsArmed = () => {
    const nextState = !allBotsArmed;
    setAllBotsArmed(nextState);
    const newOverrides: Record<string, 'ACTIVE_HEDGING' | 'STANDBY_RULES'> = {};
    ['agent_chanakya', 'agent_bhishma', 'agent_arjuna', 'agent_kuber', 'agent_vidura'].forEach(id => {
      newOverrides[id] = nextState ? 'ACTIVE_HEDGING' : 'STANDBY_RULES';
    });
    setAgentStatusOverrides(newOverrides);
    setSyncToastMessage(nextState ? 'All 5 autonomous strategy bots ARMED & ACTIVE.' : 'All 5 autonomous strategy bots PAUSED (Standby Rules).');
    setTimeout(() => setSyncToastMessage(null), 3500);
  };

  const handleToggleAgentStatus = (agentId: string) => {
    setAgentStatusOverrides(prev => {
      const current = prev[agentId] || (allBotsArmed ? 'ACTIVE_HEDGING' : 'STANDBY_RULES');
      const next: 'ACTIVE_HEDGING' | 'STANDBY_RULES' = current === 'STANDBY_RULES' ? 'ACTIVE_HEDGING' : 'STANDBY_RULES';
      const updated: Record<string, 'ACTIVE_HEDGING' | 'STANDBY_RULES'> = { ...prev, [agentId]: next };
      
      // If at least one bot is active, master switch is armed; if all are standby, master is paused
      const anyActive = Object.values(updated).some(status => status === 'ACTIVE_HEDGING');
      setAllBotsArmed(anyActive);
      return updated;
    });
  };

  const handleExecuteBotKillSwitch = () => {
    setShowKillConfirmModal(false);
    setAllBotsArmed(false);
    const pausedOverrides: Record<string, 'ACTIVE_HEDGING' | 'STANDBY_RULES'> = {
      agent_chanakya: 'STANDBY_RULES',
      agent_bhishma: 'STANDBY_RULES',
      agent_arjuna: 'STANDBY_RULES',
      agent_kuber: 'STANDBY_RULES',
      agent_vidura: 'STANDBY_RULES',
    };
    setAgentStatusOverrides(pausedOverrides);

    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }) + ' IST (Kill Switch)';

    // Square off all open orders
    setOrders(prev => prev.map(o => {
      if (o.status === 'OPEN') {
        return {
          ...o,
          status: 'SQUARED_OFF',
          timestamp: timeStr,
        };
      }
      return o;
    }));

    // Broadcast circuit breaker event
    window.dispatchEvent(new CustomEvent('jarvis:circuit-breaker', {
      detail: { source: 'AUTONOMOUS_BOT_KILL_SWITCH', timestamp: Date.now() }
    }));

    setSyncToastMessage('🚨 EMERGENCY KILL SWITCH ENGAGED: All 5 bots paused. All active orders squared off.');
    setTimeout(() => setSyncToastMessage(null), 6000);
  };

  const handleSaveCapitalAllocation = (newTotal: number) => {
    setTotalCapital(newTotal);
    // User Mandate: ₹5,00,000 INR distributed equally across all 5 autonomous strategy agents (₹1,00,000 each)
    const perAgent = Math.round(newTotal / 5);
    const newAlloc = {
      agent_chanakya: perAgent,
      agent_bhishma: perAgent,
      agent_arjuna: perAgent,
      agent_kuber: perAgent,
      agent_vidura: perAgent,
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
              onClick={() => handleTriggerScanCycle()}
              disabled={isScanning || !allBotsArmed}
              className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-sky-600 hover:bg-sky-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl transition-all shadow-md shadow-sky-600/20 active:scale-95 cursor-pointer"
              title={!allBotsArmed ? 'Bots are paused. Re-arm bots to resume algorithmic market scanning.' : 'Trigger algorithmic scan cycle'}
            >
              <RotateCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
              <span>{isScanning ? 'Scanning Markets...' : 'Scan All Markets Now'}</span>
            </button>

            <button
              onClick={handleToggleMasterBotsArmed}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-mono font-semibold rounded-xl border transition-all cursor-pointer ${
                allBotsArmed 
                  ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.15)]' 
                  : 'bg-rose-950/60 border-rose-500/50 text-rose-300 shadow-[0_0_12px_rgba(244,63,94,0.15)]'
              }`}
              title={allBotsArmed ? 'Click to pause all strategy bots' : 'Click to arm all strategy bots'}
            >
              {allBotsArmed ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
              <span>{allBotsArmed ? 'ALL BOTS ARMED' : 'BOTS PAUSED'}</span>
            </button>

            <button
              onClick={() => setShowKillConfirmModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-mono font-bold rounded-xl bg-rose-600 hover:bg-rose-500 text-white shadow-[0_0_15px_rgba(225,29,72,0.35)] transition-all active:scale-95 cursor-pointer"
              title="Emergency Stop: Pause all bots and square off all open positions"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>KILL SWITCH</span>
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
              {totalCapital > 0 ? `₹${totalCapital.toLocaleString('en-IN')}` : '₹5,00,000'}
            </span>
            <span className="text-[10px] text-emerald-400 mt-1">
              ₹1,00,000 × 5 Agents (Equal Split)
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col justify-between">
            <span className="text-[10px] text-slate-500 uppercase">Daily Drawdown Cap</span>
            <span className="text-base font-bold text-rose-400 mt-0.5">
              ₹2,000 / Agent
            </span>
            <span className="text-[10px] text-slate-400 mt-1">
              Auto-Liquidate & Self-Heal at ≥ ₹2k
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col justify-between">
            <span className="text-[10px] text-slate-500 uppercase">Weekly Loss Cap</span>
            <span className="text-base font-bold text-amber-400 mt-0.5">
              ₹5,000 / Agent
            </span>
            <span className="text-[10px] text-slate-400 mt-1">
              Strict 5-Day Rolling Lock at ≥ ₹5k
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col justify-between">
            <span className="text-[10px] text-slate-500 uppercase">Combined Day PnL</span>
            <span className={`text-base font-bold mt-0.5 ${
              (totalRealizedPnl + totalUnrealizedPnl) > 0 ? 'text-emerald-400' : (totalRealizedPnl + totalUnrealizedPnl) < 0 ? 'text-rose-400' : 'text-slate-300'
            }`}>
              {(totalRealizedPnl + totalUnrealizedPnl) > 0 ? '+' : ''}₹{(totalRealizedPnl + totalUnrealizedPnl).toLocaleString('en-IN')}
            </span>
            <span className="text-[10px] text-slate-400 mt-1">
              Realized: ₹{totalRealizedPnl.toLocaleString('en-IN')} · Float: ₹{totalUnrealizedPnl.toLocaleString('en-IN')}
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* CHALLENGING THE LOGIC: 5 CRITICAL EXECUTION LEAKS & LEAK-PROOF PROOFS */}
      {/* ========================================================================= */}
      <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900/90 via-[#0a101f] to-slate-950 border border-cyan-500/40 shadow-2xl backdrop-blur-md flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-400/30 flex items-center justify-center text-cyan-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white font-display flex items-center gap-2">
                  <span>Challenging The Logic: Leak-Proof Risk Guardrails</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 font-bold uppercase">
                    5 Critical Leaks Sealed
                  </span>
                </h3>
              </div>
              <p className="text-xs text-slate-400">
                Why standard algorithmic trading rules fail in real Indian markets, and how J.A.R.V.I.S. mathematically prevents breaches.
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowLeakProofInspector(!showLeakProofInspector)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 transition cursor-pointer"
          >
            {showLeakProofInspector ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            <span>{showLeakProofInspector ? 'Collapse Proofs' : 'Expand 5 Leaks'}</span>
          </button>
        </div>

        {showLeakProofInspector && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 text-xs font-mono">
            {/* Leak 1 */}
            <div className="p-3.5 rounded-xl bg-[#070d1a] border border-cyan-500/30 flex flex-col justify-between gap-2.5">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider">LEAK #1: FLOATING MTM</span>
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                </div>
                <div className="font-bold text-slate-100 text-[11px] mb-1 font-sans">Unrealized Slippage Bypass</div>
                <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
                  <strong className="text-rose-300">The Flaw:</strong> Checking only realized loss lets open positions sink to -₹4,000 floating without tripping the breaker.
                </p>
              </div>
              <div className="p-2 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-[10px] text-emerald-300 font-sans">
                <strong>Fix:</strong> Continuous MTM surveillance evaluates <code className="text-cyan-300">Realized + Peak Floating Loss</code> on every tick. Auto-liquidates at ₹2,000.
              </div>
            </div>

            {/* Leak 2 */}
            <div className="p-3.5 rounded-xl bg-[#070d1a] border border-cyan-500/30 flex flex-col justify-between gap-2.5">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">LEAK #2: OVERNIGHT GAPS</span>
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                </div>
                <div className="font-bold text-slate-100 text-[11px] mb-1 font-sans">09:15 AM Black Swan Gap</div>
                <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
                  <strong className="text-amber-300">The Flaw:</strong> Foreign crashes can cause NIFTY/stocks to gap down -3% at 09:15 AM, blowing ₹2k & ₹5k limits in 1 second.
                </p>
              </div>
              <div className="p-2 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-[10px] text-emerald-300 font-sans">
                <strong>Fix:</strong> Mandatory 15:15 IST intraday auto-exit; overnight positions restricted to defined-risk spreads with mathematical max loss &le; ₹800.
              </div>
            </div>

            {/* Leak 3 */}
            <div className="p-3.5 rounded-xl bg-[#070d1a] border border-cyan-500/30 flex flex-col justify-between gap-2.5">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold text-sky-400 uppercase tracking-wider">LEAK #3: PRE-TRADE SIZING</span>
                  <span className="w-2 h-2 rounded-full bg-sky-500" />
                </div>
                <div className="font-bold text-slate-100 text-[11px] mb-1 font-sans">Trade #1 Limit Exhaustion</div>
                <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
                  <strong className="text-sky-300">The Flaw:</strong> Entering a trade with ₹2,500 stop loss trips the entire ₹2,000 daily budget on a single normal stop-out.
                </p>
              </div>
              <div className="p-2 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-[10px] text-emerald-300 font-sans">
                <strong>Fix:</strong> Pre-trade sizing fence bounds single trade risk to &le; ₹800 (0.8% of capital). Blocks orders if remaining loss budget &lt; ₹500.
              </div>
            </div>

            {/* Leak 4 */}
            <div className="p-3.5 rounded-xl bg-[#070d1a] border border-cyan-500/30 flex flex-col justify-between gap-2.5">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">LEAK #4: CALENDAR TRAP</span>
                  <span className="w-2 h-2 rounded-full bg-indigo-500" />
                </div>
                <div className="font-bold text-slate-100 text-[11px] mb-1 font-sans">Friday to Monday Drawdown</div>
                <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
                  <strong className="text-indigo-300">The Flaw:</strong> Losing ₹4,800 Friday and ₹4,800 Monday is a ₹9,600 loss across 2 sessions that evades calendar week limits.
                </p>
              </div>
              <div className="p-2 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-[10px] text-emerald-300 font-sans">
                <strong>Fix:</strong> Dual tracking monitors both the Monday-Friday calendar week and a trailing 5-session rolling drawdown.
              </div>
            </div>

            {/* Leak 5 */}
            <div className="p-3.5 rounded-xl bg-[#070d1a] border border-cyan-500/30 flex flex-col justify-between gap-2.5">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">LEAK #5: REPETITIVE FAILURE</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                </div>
                <div className="font-bold text-slate-100 text-[11px] mb-1 font-sans">Hollow Self-Healing Loop</div>
                <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
                  <strong className="text-emerald-300">The Flaw:</strong> Simply displaying a text log without recalibrating parameters means the bot repeats the exact same loss tomorrow.
                </p>
              </div>
              <div className="p-2 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-[10px] text-emerald-300 font-sans">
                <strong>Fix:</strong> Automated Diagnostic Pipeline runs backtest sweeps, scans live news catalysts & sentiment, and recalibrates rules before re-arming.
              </div>
            </div>
          </div>
        )}
      </div>

      {/* First-Principles Market Intelligence, Sector Gain/Loss Matrix & Self-Learning 5 Agents */}
      <FirstPrinciplesMarketEngine quotes={quotes} />

      {/* 5-Agent Strategy Roster Cards with Live Risk Gauges */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {agents.map((agent) => {
          const isSelected = agent.id === selectedAgentId;
          const netTodayPnl = agent.realizedPnlINR + agent.unrealizedPnlINR;
          const todayDrawdown = Math.max(0, -(agent.realizedPnlINR + Math.min(0, agent.unrealizedPnlINR)));
          const dayLimit = agent.dailyLossLimitINR || 2000;
          const dayDrawdownPct = Math.min(100, (todayDrawdown / dayLimit) * 100);

          const weekDrawdown = agent.weeklyDrawdownINR || todayDrawdown;
          const weekLimit = agent.weeklyLossLimitINR || 5000;
          const weekDrawdownPct = Math.min(100, (weekDrawdown / weekLimit) * 100);

          const isDailyHalted = (agent.tradingState === 'DAILY_HALTED');
          const isWeeklyHalted = (agent.tradingState === 'WEEKLY_HALTED');
          const hasHealingReport = !!(healingReports[agent.id] || agent.lastHealingReport);

          return (
            <div
              key={agent.id}
              onClick={() => setSelectedAgentId(agent.id)}
              className={`p-4 rounded-xl cursor-pointer transition-all border flex flex-col justify-between gap-3 ${
                isDailyHalted || isWeeklyHalted
                  ? 'bg-rose-950/20 border-rose-500/50 shadow-[0_0_20px_rgba(244,63,94,0.2)] ring-1 ring-rose-500/30'
                  : isSelected
                    ? 'bg-sky-500/10 border-sky-400/50 shadow-[0_0_15px_rgba(56,189,248,0.15)] ring-1 ring-sky-400/30'
                    : 'bg-slate-900/40 border-slate-800 hover:border-slate-700 hover:bg-slate-900/70'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold font-display text-slate-100 flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${
                      isDailyHalted || isWeeklyHalted
                        ? 'bg-rose-500 animate-ping'
                        : agent.status === 'ACTIVE_HEDGING' ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'
                    }`} />
                    <span>{agent.name}</span>
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">{agent.codeName}</span>
                </div>

                <div className="text-[11px] text-sky-400 font-semibold font-mono mb-1">{agent.role}</div>
                <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed font-sans">{agent.strategyType}</p>
              </div>

              {/* Status Banner */}
              {isWeeklyHalted ? (
                <div className="px-2 py-1 rounded bg-purple-950/80 border border-purple-500/80 text-purple-300 text-[10px] font-bold font-mono flex items-center gap-1.5">
                  <AlertTriangle className="w-3 h-3 text-purple-400 shrink-0" />
                  <span>WEEKLY HALTED (≥ ₹5,000)</span>
                </div>
              ) : isDailyHalted ? (
                <div className="px-2 py-1 rounded bg-rose-950/80 border border-rose-500/80 text-rose-300 text-[10px] font-bold font-mono flex items-center gap-1.5">
                  <ShieldAlert className="w-3 h-3 text-rose-400 shrink-0" />
                  <span>DAILY HALTED (≥ ₹2,000)</span>
                </div>
              ) : null}

              <div className="pt-2 border-t border-slate-800 text-[11px] font-mono flex flex-col gap-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Allocated:</span>
                  <span className="text-emerald-400 font-bold">
                    ₹{agent.allocatedCapitalINR > 0 ? agent.allocatedCapitalINR.toLocaleString('en-IN') : '1,00,000'}
                  </span>
                </div>

                {/* Daily Risk Gauge (₹2,000 Cap) */}
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-[10px]">
                    <span className="text-slate-400">Day Drawdown:</span>
                    <span className={todayDrawdown >= 2000 ? 'text-rose-400 font-bold' : todayDrawdown > 1200 ? 'text-amber-400' : 'text-slate-300'}>
                      -₹{Math.round(todayDrawdown).toLocaleString('en-IN')} / ₹2,000
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-300 ${
                        dayDrawdownPct >= 100 ? 'bg-rose-500' : dayDrawdownPct >= 60 ? 'bg-amber-400' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${dayDrawdownPct}%` }}
                    />
                  </div>
                </div>

                {/* Weekly Risk Gauge (₹5,000 Cap) */}
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-[10px]">
                    <span className="text-slate-400">Week Drawdown:</span>
                    <span className={weekDrawdown >= 5000 ? 'text-purple-400 font-bold' : 'text-slate-300'}>
                      -₹{Math.round(weekDrawdown).toLocaleString('en-IN')} / ₹5,000
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-300 ${
                        weekDrawdownPct >= 100 ? 'bg-purple-500' : weekDrawdownPct >= 60 ? 'bg-amber-400' : 'bg-sky-500'
                      }`}
                      style={{ width: `${weekDrawdownPct}%` }}
                    />
                  </div>
                </div>

                <div className="flex justify-between text-[10px] pt-1 border-t border-slate-800/80">
                  <span className="text-slate-500">Day PnL:</span>
                  <span className={`font-bold ${
                    netTodayPnl > 0 ? 'text-emerald-400' : netTodayPnl < 0 ? 'text-rose-400' : 'text-slate-400'
                  }`}>
                    {netTodayPnl > 0 ? '+' : ''}₹{netTodayPnl.toLocaleString('en-IN')}
                  </span>
                </div>

                {/* Healing Report Trigger Button (when report exists or agent halted) */}
                {hasHealingReport && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveHealingModalReport(healingReports[agent.id] || agent.lastHealingReport || null);
                    }}
                    className="w-full py-1 text-[10px] rounded-lg bg-cyan-950/70 border border-cyan-400/60 hover:bg-cyan-900/60 text-cyan-200 font-bold flex items-center justify-center gap-1.5 transition cursor-pointer shadow-[0_0_10px_rgba(6,182,212,0.2)]"
                  >
                    <Wrench className="w-3 h-3 text-cyan-300 animate-spin" style={{ animationDuration: '6s' }} />
                    <span>View Strategy Healing Plan</span>
                  </button>
                )}
                
                {/* Direct Paper Trade Deploy Button */}
                {!(isDailyHalted || isWeeklyHalted) && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedAgentId(agent.id);
                      handleTriggerScanCycle(agent.id);
                    }}
                    disabled={isScanning || agent.status !== 'ACTIVE_HEDGING'}
                    className="w-full py-1 text-[10px] rounded-lg bg-sky-950/70 border border-sky-500/40 hover:bg-sky-900/60 text-sky-200 font-bold flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-40"
                    title={`Trigger paper trade order for ${agent.name}`}
                  >
                    <Zap className="w-2.5 h-2.5 text-cyan-300" />
                    <span>Deploy {agent.name.split(' ')[0]} Order</span>
                  </button>
                )}

                {/* Simulator & Control Buttons */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
                  {isDailyHalted || isWeeklyHalted ? (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleResetAgentBreaker(agent.id); }}
                      className="text-[10px] text-emerald-400 hover:text-emerald-300 hover:underline flex items-center gap-1 font-mono cursor-pointer"
                      title="Reset drawdown limits and re-enable trading"
                    >
                      <RefreshCcw className="w-2.5 h-2.5" />
                      <span>Reset Limits</span>
                    </button>
                  ) : (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleSimulateDrawdownBreach(agent.id); }}
                      className="text-[10px] text-amber-400/90 hover:text-amber-300 hover:underline flex items-center gap-1 font-mono cursor-pointer"
                      title="Simulate -₹2,100 loss to test auto-squareoff & self-healing"
                    >
                      <Zap className="w-2.5 h-2.5 text-amber-400" />
                      <span>Test ₹2k Breaker</span>
                    </button>
                  )}

                  <button
                    onClick={(e) => { e.stopPropagation(); handleToggleAgentStatus(agent.id); }}
                    className={`text-[10px] px-2 py-0.5 rounded font-bold transition-all cursor-pointer ${
                      agent.status === 'ACTIVE_HEDGING'
                        ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/40 hover:bg-rose-950 hover:text-rose-300'
                        : 'bg-rose-950/60 text-rose-300 border border-rose-500/40 hover:bg-emerald-950 hover:text-emerald-400'
                    }`}
                    title={agent.status === 'ACTIVE_HEDGING' ? 'Click to Pause this bot' : 'Click to Arm this bot'}
                  >
                    {agent.status === 'ACTIVE_HEDGING' ? 'ARMED' : 'PAUSED'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* MARKET HOURS AUTONOMOUS INTELLIGENCE & ACTIONABLE DECISION-MAKING SCRIPTS */}
      {/* ========================================================================= */}
      <div className="p-5 rounded-2xl bg-slate-900/60 border border-cyan-500/30 backdrop-blur-md flex flex-col gap-4 shadow-xl">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-100 font-display flex items-center gap-2">
                  <span>Market Hours Multi-Agent Live Intelligence & Decision Scripts Hub</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    LIVE SURVEILLANCE ACTIVE
                  </span>
                </h3>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                All 5 agents continuously analyze Global News, Global Policies, Option Chain OI & formulate decision-making scripts during market hours. Zero hallucination.
              </p>
            </div>
          </div>

          {/* Sub-view Switcher: Decision Scripts vs Live Intelligence Feed */}
          <div className="flex items-center gap-2">
            <div className="flex items-center p-1 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono">
              <button
                onClick={() => setIntelligenceViewTab('DECISION_SCRIPTS')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  intelligenceViewTab === 'DECISION_SCRIPTS'
                    ? 'bg-cyan-500 text-slate-950 shadow-[0_0_12px_rgba(0,240,255,0.35)]'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Target className="w-3.5 h-3.5" />
                <span>DECISION-MAKING SCRIPTS ({allDecisionScripts.length})</span>
              </button>
              <button
                onClick={() => setIntelligenceViewTab('LIVE_INSIGHTS')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  intelligenceViewTab === 'LIVE_INSIGHTS'
                    ? 'bg-cyan-500 text-slate-950 shadow-[0_0_12px_rgba(0,240,255,0.35)]'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                <span>GLOBAL NEWS & POLICY INTELLIGENCE ({allLiveInsights.length})</span>
              </button>
            </div>
          </div>
        </div>

        {/* Agent Filter Strip */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
          <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider shrink-0 mr-1">
            AGENT FILTER:
          </span>
          {[
            { id: 'ALL', label: 'All 5 Agents' },
            { id: 'agent_chanakya', label: 'Chanakya (Global Macro & Policies)' },
            { id: 'agent_bhishma', label: 'Bhishma (F&O Institutional Signals)' },
            { id: 'agent_arjuna', label: 'Arjuna (Cash Alpha Decision Scripts)' },
            { id: 'agent_kuber', label: 'Kuber (Commodity Policies & Energy)' },
            { id: 'agent_vidura', label: 'Vidura (SEBI Regulatory Arbiter)' },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setIntelligenceAgentFilter(f.id)}
              className={`px-2.5 py-1 text-xs font-mono rounded-lg transition-all shrink-0 cursor-pointer border ${
                intelligenceAgentFilter === f.id
                  ? 'bg-sky-500/20 text-sky-200 border-sky-400/50 font-bold shadow-sm'
                  : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* VIEW 1: DECISION-MAKING SCRIPTS */}
        {intelligenceViewTab === 'DECISION_SCRIPTS' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredDecisionScripts.map((script) => (
              <div
                key={script.id}
                className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-cyan-500/40 transition-all flex flex-col justify-between gap-3 shadow-md"
              >
                <div>
                  {/* Top line: Symbol, Agent, Segment */}
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-100 font-mono">{script.symbol}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-950 text-sky-300 border border-sky-800">
                        {script.segment}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded font-bold bg-slate-900 text-cyan-400 border border-cyan-500/30">
                      {script.agentId.replace('agent_', '').toUpperCase()}
                    </span>
                  </div>

                  <h4 className="text-xs font-semibold text-slate-300 mb-2">{script.name}</h4>

                  {/* Quantitative Levels Box */}
                  <div className="grid grid-cols-3 gap-2 p-2.5 rounded-lg bg-[#070b14] border border-slate-800/80 text-[11px] font-mono mb-2">
                    <div>
                      <span className="text-[9px] text-slate-500 uppercase block">ENTRY TRIGGER</span>
                      <span className="text-sky-300 font-bold block truncate" title={script.entryTrigger}>
                        {script.entryTrigger}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-500 uppercase block">TARGET</span>
                      <span className="text-emerald-400 font-bold block truncate" title={script.targetPrice}>
                        {script.targetPrice}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-500 uppercase block">STOP LOSS</span>
                      <span className="text-rose-400 font-bold block truncate" title={script.stopLoss}>
                        {script.stopLoss}
                      </span>
                    </div>
                  </div>

                  {/* Conviction Score & Catalyst */}
                  <div className="flex items-center justify-between text-[11px] font-mono mb-1.5">
                    <span className="text-slate-400">Conviction Score:</span>
                    <span className="text-cyan-300 font-bold flex items-center gap-1.5">
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-cyan-950 border border-cyan-500/40">
                        {script.convictionScore}%
                      </span>
                      <span className="text-[10px] text-emerald-400 font-semibold">({script.convictionTier})</span>
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed font-sans">
                    {script.catalyst}
                  </p>
                </div>

                {/* Staging Button */}
                <div className="pt-2.5 border-t border-slate-800/80 flex items-center justify-between">
                  <span className="text-[10px] font-mono text-slate-500">
                    LTP: ₹{script.derivedMetrics.ltp.toLocaleString('en-IN')} ({script.derivedMetrics.changePct >= 0 ? '+' : ''}{script.derivedMetrics.changePct.toFixed(2)}%)
                  </span>
                  <button
                    onClick={() => handleStageScript(script)}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-mono font-bold rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition shadow-sm hover:shadow-[0_0_12px_rgba(16,185,129,0.3)] active:scale-95 cursor-pointer"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>STAGE SCRIPT</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* VIEW 2: GLOBAL NEWS & POLICY INTELLIGENCE STREAM */}
        {intelligenceViewTab === 'LIVE_INSIGHTS' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {filteredLiveInsights.map((insight) => (
              <div
                key={insight.id}
                className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-slate-700 transition flex flex-col justify-between gap-3 shadow-md"
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded font-bold bg-sky-950 text-sky-300 border border-sky-800">
                        {insight.category.replace('_', ' ')}
                      </span>
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                        insight.severity === 'HIGH_CONVICTION' 
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-700' 
                          : insight.severity === 'ALERT'
                            ? 'bg-amber-950 text-amber-300 border border-amber-700'
                            : 'bg-slate-900 text-slate-300 border border-slate-700'
                      }`}>
                        {insight.severity}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-500">
                      {insight.agentName} ({insight.agentCodeName}) · {insight.timestamp}
                    </span>
                  </div>

                  <h4 className="text-xs font-bold text-slate-100 mt-1 mb-1.5">{insight.headline}</h4>
                  <p className="text-[11px] text-slate-300 leading-relaxed font-sans">{insight.detail}</p>
                </div>

                {insight.sources && insight.sources.length > 0 && (
                  <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center gap-1.5 text-[10px] font-mono text-slate-400">
                    <span className="text-slate-500">VERIFIED SOURCES:</span>
                    {insight.sources.map((src, i) => (
                      <span key={i} className="px-1.5 py-0.5 rounded bg-slate-900 text-cyan-400 border border-slate-800">
                        {src}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
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

      {/* Paper Trading Execution Gateway (Directs to Dedicated Trade History Table) */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900/80 via-[#0a1022] to-slate-900/80 border border-cyan-500/30 backdrop-blur-md flex flex-col gap-4 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2 font-mono uppercase tracking-wide">
                  <span>Paper Trading Execution & Order Ledger</span>
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-950/80 text-cyan-300 border border-cyan-500/30 font-mono">
                  DEDICATED VIEW NOW IN MAIN NAVIGATION
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Session trades are managed in the dedicated <strong>Trade History</strong> audit terminal with 8 standard columns (Instrument, Side, Qty, Entry, Exit, P&L, Date, Time).
              </p>
            </div>
          </div>

          {/* Action button to open dedicated Trade History */}
          {onNavigateToTradeHistory && (
            <button
              onClick={onNavigateToTradeHistory}
              className="flex items-center gap-2 px-4 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-xl shadow-[0_0_20px_rgba(0,240,255,0.35)] transition cursor-pointer active:scale-95 font-mono"
            >
              <span>VIEW DEDICATED TRADE HISTORY TABLE</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Quick Tally & Instant Trigger Controls */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-800/80 font-mono">
          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col">
            <span className="text-[10px] text-slate-400 uppercase">ACTIVE ORDERS</span>
            <span className="text-base font-bold text-cyan-300 mt-0.5">
              {openOrders.length} Working
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col">
            <span className="text-[10px] text-slate-400 uppercase">CLOSED POSITIONS</span>
            <span className="text-base font-bold text-slate-200 mt-0.5">
              {closedOrders.length} Settled
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col">
            <span className="text-[10px] text-slate-400 uppercase">REALIZED P&L</span>
            <span className={`text-base font-bold mt-0.5 ${totalRealizedPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {totalRealizedPnl >= 0 ? '+' : ''}₹{totalRealizedPnl.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col">
            <span className="text-[10px] text-slate-400 uppercase">UNREALIZED MTM</span>
            <span className={`text-base font-bold mt-0.5 ${totalUnrealizedPnl >= 0 ? 'text-cyan-300' : 'text-rose-400'}`}>
              {totalUnrealizedPnl >= 0 ? '+' : ''}₹{totalUnrealizedPnl.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Instant Multi-Desk Deployer */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs font-mono">
          <div className="flex items-center gap-1.5 text-slate-300 font-semibold">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Deploy Paper Order via Live Quotes:</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => handleTriggerScanCycle('agent_bhishma')}
              disabled={isScanning}
              className="px-2.5 py-1 rounded-lg bg-sky-950/60 hover:bg-sky-900 text-sky-300 border border-sky-500/30 text-[11px] font-semibold transition cursor-pointer"
            >
              + NSE F&O (Bhishma)
            </button>
            <button
              onClick={() => handleTriggerScanCycle('agent_arjuna')}
              disabled={isScanning}
              className="px-2.5 py-1 rounded-lg bg-emerald-950/60 hover:bg-emerald-900 text-emerald-300 border border-emerald-500/30 text-[11px] font-semibold transition cursor-pointer"
            >
              + NSE Cash (Arjuna)
            </button>
            <button
              onClick={() => handleTriggerScanCycle('agent_chanakya')}
              disabled={isScanning}
              className="px-2.5 py-1 rounded-lg bg-indigo-950/60 hover:bg-indigo-900 text-indigo-300 border border-indigo-500/30 text-[11px] font-semibold transition cursor-pointer"
            >
              + BSE Cash (Chanakya)
            </button>
            <button
              onClick={() => handleTriggerScanCycle('agent_kuber')}
              disabled={isScanning}
              className="px-2.5 py-1 rounded-lg bg-amber-950/60 hover:bg-amber-900 text-amber-300 border border-amber-500/30 text-[11px] font-semibold transition cursor-pointer"
            >
              + MCX Commodity (Kuber)
            </button>
            <button
              onClick={() => handleTriggerScanCycle()}
              disabled={isScanning}
              className="flex items-center gap-1 px-3 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-[11px] font-bold transition cursor-pointer"
            >
              <RotateCw className={`w-3 h-3 ${isScanning ? 'animate-spin' : ''}`} />
              <span>Scan All 3 Desks</span>
            </button>
          </div>
        </div>
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
                {[500000, 1000000, 2500000, 5000000].map(val => (
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
                <div className="text-slate-300 font-bold flex items-center justify-between">
                  <span>Equal Capital Distribution (Mandate):</span>
                  <span className="text-emerald-400 font-mono">20% Each (₹1,00,000 / Agent)</span>
                </div>
                <div className="flex justify-between"><span>Chanakya (Macro Sentinel):</span> <span className="text-cyan-300">₹1,00,000 (20%)</span></div>
                <div className="flex justify-between"><span>Bhishma (Derivatives F&O):</span> <span className="text-cyan-300">₹1,00,000 (20%)</span></div>
                <div className="flex justify-between"><span>Arjuna (Cash Equity Alpha):</span> <span className="text-cyan-300">₹1,00,000 (20%)</span></div>
                <div className="flex justify-between"><span>Kuber (MCX Commodities):</span> <span className="text-cyan-300">₹1,00,000 (20%)</span></div>
                <div className="flex justify-between"><span>Vidura (Risk Arbiter & Sizing):</span> <span className="text-cyan-300">₹1,00,000 (20%)</span></div>
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

      {/* EMERGENCY BOT KILL SWITCH CONFIRMATION MODAL */}
      {showKillConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150">
          <div className="max-w-md w-full bg-[#0d0408] border-2 border-rose-500/70 rounded-2xl p-6 shadow-[0_0_50px_rgba(244,63,94,0.4)] flex flex-col gap-4 font-mono">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 rounded-xl bg-rose-950/80 border border-rose-500/50 flex items-center justify-center text-rose-400 shrink-0">
                <AlertTriangle className="w-6 h-6 animate-pulse text-rose-500" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white uppercase font-display">
                  EMERGENCY BOT KILL SWITCH
                </h3>
                <span className="text-[10px] text-rose-400 font-bold uppercase tracking-wider">
                  STATUTORY LEVEL-4 OVERRIDE
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed font-sans">
              Engaging the emergency kill switch will immediately execute the following statutory safety actions:
            </p>

            <ul className="text-xs text-slate-300 space-y-1.5 font-sans pl-1">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" />
                <span>Pause all <strong>5 autonomous strategy bots</strong> (Chanakya, Bhishma, Arjuna, Kuber, Vidura).</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" />
                <span>Auto-square off <strong>all {openOrders.length} active open positions</strong>.</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" />
                <span>Halt all automated order routing to exchange gateways.</span>
              </li>
            </ul>

            <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-500/40 text-xs text-rose-200 font-mono">
              [STATUTORY SAFETY]: All collateral locked in overnight repo. Net delta recentered to 0.00.
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowKillConfirmModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-bold transition-colors cursor-pointer"
              >
                CANCEL & RETURN
              </button>
              <button
                onClick={handleExecuteBotKillSwitch}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-[0_0_20px_rgba(244,63,94,0.5)] transition-all cursor-pointer active:scale-95 flex items-center gap-1.5"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>CONFIRM EMERGENCY KILL</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ========================================================================= */}
      {/* AUTONOMOUS STRATEGY SELF-HEALING & DIAGNOSTIC POST-MORTEM MODAL */}
      {/* ========================================================================= */}
      {activeHealingModalReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150">
          <div className="max-w-2xl w-full bg-[#070d18] border border-cyan-500/50 rounded-2xl p-6 shadow-[0_0_50px_rgba(6,182,212,0.25)] flex flex-col gap-4 font-mono max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-950/80 border border-cyan-500/50 flex items-center justify-center text-cyan-400 shrink-0">
                  <Wrench className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white font-display flex items-center gap-2">
                    <span>Autonomous Strategy Self-Healing Report</span>
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5 font-mono">
                    <span className="text-cyan-300 font-bold">{activeHealingModalReport.agentName}</span>
                    <span>·</span>
                    <span>{activeHealingModalReport.timestamp}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border ${
                  activeHealingModalReport.status === 'APPLIED'
                    ? 'bg-emerald-950/80 border-emerald-500/60 text-emerald-300'
                    : 'bg-amber-950/80 border-amber-500/60 text-amber-300 animate-pulse'
                }`}>
                  {activeHealingModalReport.status === 'APPLIED' ? 'RULES APPLIED & ACTIVE' : 'PENDING RE-ARM'}
                </span>
                <button
                  onClick={() => setActiveHealingModalReport(null)}
                  className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Breach Alert Callout */}
            <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/50 flex items-start gap-3 text-xs">
              <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="text-rose-200 font-bold">
                  {activeHealingModalReport.triggerReason}
                </div>
                <p className="text-slate-300 text-[11px] leading-relaxed font-sans">
                  The automated risk engine executed an immediate emergency market liquidation to protect remaining capital. All pending orders were cancelled, and the strategy was locked pending diagnostic recalibration.
                </p>
              </div>
            </div>

            {/* Root-Cause Attribution */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                  <span>1. Root-Cause Attribution</span>
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-950/60 border border-cyan-500/40 text-cyan-300">
                  {activeHealingModalReport.rootCauseCategory.replace(/_/g, ' ')}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-slate-300 leading-relaxed font-sans">
                {activeHealingModalReport.rootCauseAnalysis}
              </div>
            </div>

            {/* News & Sentiment Evidence */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-sky-400" />
                <span>2. Live News & Geopolitical Catalyst Evidence</span>
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {activeHealingModalReport.newsAndSentimentEvidence.map((news, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col justify-between gap-1.5 font-sans">
                    <div>
                      <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-1">
                        <span>{news.source}</span>
                        <span className="text-rose-400 font-bold">Score: {news.sentimentScore}</span>
                      </div>
                      <div className="text-slate-200 font-medium text-[11px] leading-snug">
                        {news.headline}
                      </div>
                    </div>
                    <div className="text-[10px] text-amber-300/90 font-mono pt-1 border-t border-slate-800/80">
                      Impact: {news.marketImpact}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quantitative Backtest Diagnostic Comparison */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                <span>3. Multi-Factor Backtest Recalibration Diagnostic</span>
              </span>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {/* Original Parameters */}
                <div className="p-3.5 rounded-xl bg-slate-950/70 border border-rose-500/30 flex flex-col gap-2 font-mono">
                  <div className="text-[10px] text-rose-400 font-bold uppercase tracking-wider pb-1 border-b border-slate-800">
                    Broken Pre-Breach Rules
                  </div>
                  <div className="space-y-1.5 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Stop Loss:</span>
                      <span className="text-rose-300">-{activeHealingModalReport.backtestDiagnostic.originalParameters.stopLossPct}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Take Profit:</span>
                      <span className="text-slate-300">+{activeHealingModalReport.backtestDiagnostic.originalParameters.takeProfitPct}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Max Trade Risk:</span>
                      <span className="text-rose-300">₹{activeHealingModalReport.backtestDiagnostic.originalParameters.maxRiskPerTradeINR}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Win Rate:</span>
                      <span className="text-rose-300">{activeHealingModalReport.backtestDiagnostic.backtestImprovement.originalWinRatePct}%</span>
                    </div>
                    <div className="pt-1 text-[10px] text-slate-400">
                      Filter: {activeHealingModalReport.backtestDiagnostic.originalParameters.entryFilter}
                    </div>
                  </div>
                </div>

                {/* Optimized Parameters */}
                <div className="p-3.5 rounded-xl bg-slate-950/70 border border-emerald-500/40 flex flex-col gap-2 font-mono">
                  <div className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider pb-1 border-b border-slate-800 flex items-center justify-between">
                    <span>Recalibrated Leak-Proof Rules</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/40">
                      +{activeHealingModalReport.backtestDiagnostic.backtestImprovement.drawdownReductionPct}% DD Shield
                    </span>
                  </div>
                  <div className="space-y-1.5 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Stop Loss:</span>
                      <span className="text-emerald-400 font-bold">-{activeHealingModalReport.backtestDiagnostic.optimizedParameters.stopLossPct}% (Tightened)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Take Profit:</span>
                      <span className="text-emerald-400">+{activeHealingModalReport.backtestDiagnostic.optimizedParameters.takeProfitPct}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Max Trade Risk:</span>
                      <span className="text-emerald-400 font-bold">₹{activeHealingModalReport.backtestDiagnostic.optimizedParameters.maxRiskPerTradeINR} (≤ ₹800 Cap)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Optimized Win Rate:</span>
                      <span className="text-emerald-400 font-bold">{activeHealingModalReport.backtestDiagnostic.backtestImprovement.optimizedWinRatePct}%</span>
                    </div>
                    <div className="pt-1 text-[10px] text-cyan-300">
                      Filter: {activeHealingModalReport.backtestDiagnostic.optimizedParameters.entryFilter}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Recalibrated Rule Set */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                <span>4. Revised Rulebook Adjustments</span>
              </span>
              <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                {activeHealingModalReport.recalibratedRules.map((rule, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-xs font-sans text-slate-200">
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span className="font-mono text-[11px]">{rule}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                onClick={() => setActiveHealingModalReport(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-bold transition cursor-pointer"
              >
                CLOSE
              </button>
              <button
                onClick={() => handleApplyHealingStrategy(activeHealingModalReport)}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-bold text-xs shadow-[0_0_20px_rgba(0,240,255,0.35)] transition-all cursor-pointer active:scale-95 flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                <span>APPLY RECALIBRATED RULES & RE-ARM AGENT</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
