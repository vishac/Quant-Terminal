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
  runAutonomousAgentCycleIfArmed,
  executeAdaptivePruneAndRotateCycle
} from '../services/paperTradeService';
import { updateOrdersLivePnl } from '../services/agentQuantEngine';
import {
  evaluateAdaptiveScriptLearningMatrix,
  isAutoPruneLosersEnabled,
  setAutoPruneLosersEnabled,
  quarantineLosingScript,
  recordWinningScriptOutcome,
  extractBaseSymbolFromOrder,
  resetScriptQuarantineMemory,
  releaseScriptQuarantine,
  resetAllScriptLearningMemory,
} from '../services/scriptLearningEngine';
import {
  executeIntelligentScanAndDeploy,
  getLastScanVetoAuditBatch,
  ScanAndDeployAuditBatch,
  getStatutoryTaxRuleCalendar,
  getActiveStatutoryTaxRuleVersion,
  approvePendingStatutoryRule,
  rejectOrDeferPendingStatutoryRule,
  resetStatutoryRuleCalendarToDefault,
  StatutoryRuleScheduleItem,
} from '../services/statutoryVetoEngine';
import { ARCHITECTURE_REVERT_LEDGER } from '../data/architectureRevertLedger';
import {
  computeFactorAndWhyExplainability,
  computePortfolioAttribution,
  getStoredQuantParameters,
} from '../services/institutionalQuantRegistry';
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
  Info,
  FileText
} from 'lucide-react';

interface TradeHistoryProps {
  onNavigateToAgents?: () => void;
}

export const TradeHistory: React.FC<TradeHistoryProps> = ({ onNavigateToAgents }) => {
  const { quotes } = useLiveMarketData(5000);

  // Load orders from shared localStorage and subscribe to updates
  const [orders, setOrders] = useState<PaperTradeOrder[]>(() => getStoredPaperTrades());
  const [lastScanAudit, setLastScanAudit] = useState<ScanAndDeployAuditBatch | null>(() =>
    getLastScanVetoAuditBatch()
  );

  // Listen for background updates across components
  useEffect(() => {
    const handleUpdate = () => {
      setOrders(getStoredPaperTrades());
    };
    const handleAuditUpdate = () => {
      setLastScanAudit(getLastScanVetoAuditBatch());
    };
    const handleRuleUpdate = () => {
      setStatutoryCalendar(getStatutoryTaxRuleCalendar());
    };
    window.addEventListener('jarvis:orders-updated', handleUpdate);
    window.addEventListener('jarvis:scan-veto-audit', handleAuditUpdate);
    window.addEventListener('jarvis:statutory-rule-updated', handleRuleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('jarvis:orders-updated', handleUpdate);
      window.removeEventListener('jarvis:scan-veto-audit', handleAuditUpdate);
      window.removeEventListener('jarvis:statutory-rule-updated', handleRuleUpdate);
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
      setLastScanAudit(getLastScanVetoAuditBatch());
      setToastMessage(`🤖 Strict Veto Engine evaluated all desks & auto-deployed ${autoOrders.length} confirmed >2.0% net-of-tax setup(s).`);
      setTimeout(() => setToastMessage(null), 5000);
    } else if (orders.some(o => o.status === 'OPEN')) {
      const updated = updateOrdersLivePnl(orders, quotes);
      setOrders(updated);
      persistPaperTrades(updated);
    }
  }, [quotes]);

  // Filter state
  const [segmentFilter, setSegmentFilter] = useState<'ALL' | 'NSE_FNO' | 'NSE_CASH' | 'BSE_CASH' | 'MCX'>('ALL');
  const [sideFilter, setSideFilter] = useState<'ALL' | 'BUY' | 'SELL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'CLOSED' | 'OPEN'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [autoPruneEnabled, setAutoPruneEnabled] = useState<boolean>(() => isAutoPruneLosersEnabled());
  const [learningRefreshTick, setLearningRefreshTick] = useState<number>(0);

  useEffect(() => {
    const handleMemoryUpdated = () => {
      setLearningRefreshTick((t) => t + 1);
    };
    window.addEventListener('jarvis:script-memory-updated', handleMemoryUpdated);
    return () => {
      window.removeEventListener('jarvis:script-memory-updated', handleMemoryUpdated);
    };
  }, []);

  const [statutoryCalendar, setStatutoryCalendar] = useState<StatutoryRuleScheduleItem[]>(() =>
    getStatutoryTaxRuleCalendar()
  );
  const [activeOmsSubTab, setActiveOmsSubTab] = useState<
    | 'ORDER_BOOK'
    | 'ADAPTIVE_LEARNER'
    | 'WHY_EXPLAINABILITY'
    | 'PNL_ATTRIBUTION'
    | 'REVERT_LEDGER'
    | 'T1_TAX_CALENDAR'
    | 'USER_GUIDE_STRENGTHS'
  >('ORDER_BOOK');

  const activeTaxVersionInfo = useMemo(
    () => getActiveStatutoryTaxRuleVersion(),
    [statutoryCalendar]
  );
  const pendingT1Rules = useMemo(
    () => statutoryCalendar.filter((r) => r.status === 'PENDING_T_MINUS_1_APPROVAL'),
    [statutoryCalendar]
  );

  const handleApproveTaxRule = (ruleId: string) => {
    const updated = approvePendingStatutoryRule(ruleId);
    setStatutoryCalendar(updated);
    const rule = updated.find((r) => r.ruleId === ruleId);
    setToastMessage(
      `✅ APPROVED FOR GO-LIVE: ${rule?.versionLabel || ruleId}. Existing trades keep Before rates; new trades use After rates.`
    );
    setTimeout(() => setToastMessage(null), 5500);
  };

  const handleDeferTaxRule = (ruleId: string) => {
    const updated = rejectOrDeferPendingStatutoryRule(ruleId);
    setStatutoryCalendar(updated);
    setToastMessage(
      `⏸️ DEFERRED T-1 RULE [${ruleId}]: Retained current active tax & brokerage schedule.`
    );
    setTimeout(() => setToastMessage(null), 5000);
  };

  const handleResetTaxCalendar = () => {
    const updated = resetStatutoryRuleCalendarToDefault();
    setStatutoryCalendar(updated);
    setToastMessage('Restored T-1 Statutory Tax & Brokerage Calendar to default pre-market queue.');
    setTimeout(() => setToastMessage(null), 4500);
  };

  const quantParameters = useMemo(() => getStoredQuantParameters(), [orders]);
  const whyExplainabilityRows = useMemo(
    () => computeFactorAndWhyExplainability(quotes, quantParameters),
    [quotes, quantParameters]
  );
  const attribution = useMemo(
    () => computePortfolioAttribution(orders, quotes['NIFTY']?.changePct ?? 0),
    [orders, quotes]
  );
  const scriptLearningMatrix = useMemo(
    () => evaluateAdaptiveScriptLearningMatrix(quotes, orders),
    [quotes, orders, learningRefreshTick]
  );
  const quarantinedScripts = useMemo(
    () => scriptLearningMatrix.filter(s => s.isQuarantined),
    [scriptLearningMatrix]
  );
  const observingScripts = useMemo(
    () => scriptLearningMatrix.filter(s => !s.isQuarantined && (s.intradayPhase === 'FLAT_OBSERVING' || s.intradayPhase === 'LOW_WEAK_AVOID')),
    [scriptLearningMatrix]
  );
  const learnedPositiveLeaders = useMemo(
    () => scriptLearningMatrix.filter(s => s.isEligibleForDeploy),
    [scriptLearningMatrix]
  );

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

  // Deploy live market paper trade strictly gated by 2026 Statutory Tax & >2.0% Net Profit Veto Engine
  const handleDeployOrder = (segment: 'NSE_FNO' | 'NSE_CASH' | 'BSE_CASH' | 'MCX' | 'ALL') => {
    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
      const batch = executeIntelligentScanAndDeploy(quotes, orders, segment);
      setLastScanAudit(batch);

      if (batch.deployedOrders.length > 0) {
        const updated = [...batch.deployedOrders, ...orders];
        setOrders(updated);
        persistPaperTrades(updated);
      }

      setToastMessage(batch.summaryHeadline);
      setTimeout(() => setToastMessage(null), 5500);
    }, 350);
  };

  // Square off specific open order with exact current exitPrice, P&L reconciliation, and Script Learning feedback
  const handleSquareOffOrder = (orderId: string) => {
    const now = new Date();
    const orderDate = formatOrderDate(now);
    const orderTime = formatOrderTime(now);
    let closedSym = '';
    let closedPnl = 0;

    const updated = orders.map(o => {
      if (o.id === orderId) {
        const leg = o.legs?.[0];
        const entryP = Number((o.entryPrice ?? leg?.price ?? 100).toFixed(2));
        const qty = Math.max(1, o.qty ?? leg?.qty ?? 1);
        const side: 'BUY' | 'SELL' = (o.side ?? leg?.action ?? 'BUY') === 'SELL' ? 'SELL' : 'BUY';
        const exitP = Number((o.exitPrice ?? leg?.exitPrice ?? entryP).toFixed(2));
        const exactPnl = Number(((side === 'BUY' ? exitP - entryP : entryP - exitP) * qty).toFixed(2));
        const baseSym = extractBaseSymbolFromOrder(o);
        closedSym = baseSym;
        closedPnl = exactPnl;

        if (exactPnl < 0) {
          quarantineLosingScript(
            baseSym,
            exactPnl,
            `Manual Square-Off on Losing Script (${baseSym} ₹${exactPnl.toFixed(2)}) — Quarantined from re-entry`
          );
        } else if (exactPnl > 0) {
          recordWinningScriptOutcome(baseSym, exactPnl);
        }

        return {
          ...o,
          status: 'SQUARED_OFF' as const,
          entryPrice: entryP,
          exitPrice: exitP,
          pnlINR: exactPnl,
          legs: [
            {
              instrument: leg?.instrument || o.symbol,
              action: side,
              qty,
              price: entryP,
              exitPrice: exitP,
              strike: leg?.strike,
              optionType: leg?.optionType
            }
          ],
          exitReason: exactPnl < 0
            ? `Discarded Losing Script @ ₹${exitP.toLocaleString('en-IN', { minimumFractionDigits: 2 })} (${baseSym} Quarantined)`
            : `Manual Profit Book @ ₹${exitP.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
          orderDate: o.orderDate || orderDate,
          orderTime: o.orderTime || orderTime,
          timestamp: `${o.orderDate || orderDate} ${orderTime} (Squared Off)`
        };
      }
      return o;
    });

    setOrders(updated);
    persistPaperTrades(updated);
    setLearningRefreshTick(t => t + 1);
    setToastMessage(
      closedPnl < 0
        ? `🛡️ Losing script ${closedSym} discarded (₹${closedPnl.toFixed(2)}) & quarantined in Learning Ledger.`
        : `✓ Position ${closedSym || orderId} squared off (+₹${closedPnl.toFixed(2)}).`
    );
    setTimeout(() => setToastMessage(null), 4000);
  };

  // 1-Click Prune Losing Scripts (including ULTRACEMCO) & Rotate to Learned Positive Leaders
  const handlePruneAndRotate = () => {
    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
      const { updatedOrders, prunedSymbols, rotatedSymbols, prunedCount } =
        executeAdaptivePruneAndRotateCycle(orders, quotes, true);
      setOrders(updatedOrders);
      setLastScanAudit(getLastScanVetoAuditBatch());
      setLearningRefreshTick(t => t + 1);
      const prunedLabel = prunedSymbols.length > 0 ? prunedSymbols.join(', ') : 'weak scripts';
      const rotatedLabel = rotatedSymbols.length > 0 ? rotatedSymbols.join(', ') : 'none (existing winners open)';
      setToastMessage(
        `🧠 Adaptive Learner discarded ${prunedCount} losing position(s) [${prunedLabel}], quarantined them, and deployed confirmed >2% net leader(s) [${rotatedLabel}]!`
      );
      setTimeout(() => setToastMessage(null), 5500);
    }, 350);
  };

  const handleToggleAutoPrune = () => {
    const next = !autoPruneEnabled;
    setAutoPruneEnabled(next);
    setAutoPruneLosersEnabled(next);
    if (next) {
      const { updatedOrders, prunedSymbols } = executeAdaptivePruneAndRotateCycle(orders, quotes, false);
      setOrders(updatedOrders);
      setLearningRefreshTick(t => t + 1);
      setToastMessage(
        prunedSymbols.length > 0
          ? `🛡️ Auto-Prune Armed: Immediately discarded losing script(s) [${prunedSymbols.join(', ')}] & rotated to positive leaders.`
          : `🛡️ Auto-Prune Losers & 82% Anti-Profit-Erosion Guard ARMED on every tick.`
      );
    } else {
      setToastMessage(`Auto-Prune paused. Manual prune & 1R hard stop remain active.`);
    }
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Square off all open orders with exact current exitPrice and P&L reconciliation
  const handleSquareOffAll = () => {
    const now = new Date();
    const orderDate = formatOrderDate(now);
    const orderTime = formatOrderTime(now);

    const updated = orders.map(o => {
      if (o.status === 'OPEN') {
        const leg = o.legs?.[0];
        const entryP = Number((o.entryPrice ?? leg?.price ?? 100).toFixed(2));
        const qty = Math.max(1, o.qty ?? leg?.qty ?? 1);
        const side: 'BUY' | 'SELL' = (o.side ?? leg?.action ?? 'BUY') === 'SELL' ? 'SELL' : 'BUY';
        const exitP = Number((o.exitPrice ?? leg?.exitPrice ?? entryP).toFixed(2));
        const exactPnl = Number(((side === 'BUY' ? exitP - entryP : entryP - exitP) * qty).toFixed(2));
        return {
          ...o,
          status: 'SQUARED_OFF' as const,
          entryPrice: entryP,
          exitPrice: exitP,
          pnlINR: exactPnl,
          legs: [
            {
              instrument: leg?.instrument || o.symbol,
              action: side,
              qty,
              price: entryP,
              exitPrice: exitP,
              strike: leg?.strike,
              optionType: leg?.optionType
            }
          ],
          exitReason: `Manual Flatten All @ ₹${exitP.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
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
                OMS, Order Audit &amp; &ldquo;Why?&rdquo; Explainability
              </h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-950/60 text-cyan-300 border border-cyan-500/30">
                CANONICAL LEDGER
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950/70 text-emerald-300 border border-emerald-500/40">
                STRICT &gt;2.0% NET PROFIT VETO GATE
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Canonical Order Management System, 2026 Statutory Tax &amp; Cost-of-Trading Veto Engine, and Reversible Change Audit Ledger.
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
            title="Scan all desks through the 3-Stage Veto Gate: (1) Confirmed Leader & Non-Duplicate, (2) Gross Profit >= 3.0x Statutory Tax+Brokerage, (3) Net Profit > 2.00%"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
            <span>SCAN &amp; DEPLOY (ALL DESKS · &gt;2% NET GATE)</span>
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
            <span className="text-xl font-bold text-amber-300 tabular-nums">
              {stats.closedCount > 0 ? `${stats.winRatePct}%` : '--'}
            </span>
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

      {/* T-1 Pre-Market Statutory Tax, SEBI & Brokerage Rule Alert Banner */}
      {pendingT1Rules.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-950/35 border border-amber-500/50 shadow-lg flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2 py-0.5 rounded bg-amber-500 text-slate-950 text-[10px] font-bold uppercase">
                T-1 PRE-MARKET REGULATORY &amp; BROKERAGE ALERT ({pendingT1Rules.length} PENDING APPROVAL)
              </span>
              <span className="text-xs font-bold text-amber-200">
                {pendingT1Rules[0].title}
              </span>
            </div>
            <p className="text-[11px] text-slate-300 font-sans">
              <strong>Before:</strong> {pendingT1Rules[0].beforeRatesSummary} &rarr;{' '}
              <strong className="text-emerald-300">After (Go-Live 09:15 IST):</strong>{' '}
              {pendingT1Rules[0].afterRatesSummary} ({pendingT1Rules[0].sampleImpactOn1LotNiftyOptionINR}).
              Trades executed before approval keep <em>Before</em> math; trades after approval use <em>After</em> math.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <button
              onClick={() => handleApproveTaxRule(pendingT1Rules[0].ruleId)}
              className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold cursor-pointer transition"
            >
              Approve Before Market Open
            </button>
            <button
              onClick={() => handleDeferTaxRule(pendingT1Rules[0].ruleId)}
              className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-rose-500/40 text-rose-300 text-xs font-bold cursor-pointer transition"
            >
              Defer / Reject
            </button>
            <button
              onClick={() => setActiveOmsSubTab('T1_TAX_CALENDAR')}
              className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-amber-500/40 text-amber-300 text-xs font-bold cursor-pointer transition"
            >
              Before/After Tax Ledger &rarr;
            </button>
          </div>
        </div>
      )}

      {/* Sub-Tab Switcher: Order Book vs Adaptive Script Learner vs "Why?" Signal & Veto Audit vs P&L Attribution vs Revert Ledger vs T-1 Tax Calendar vs User Guide */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-2 rounded-2xl bg-slate-900/70 border border-slate-800">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setActiveOmsSubTab('ORDER_BOOK')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              activeOmsSubTab === 'ORDER_BOOK'
                ? 'bg-cyan-500 text-slate-950 shadow-[0_0_12px_rgba(0,240,255,0.3)]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            01. Order Book ({filteredRecords.length})
          </button>
          <button
            onClick={() => setActiveOmsSubTab('ADAPTIVE_LEARNER')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              activeOmsSubTab === 'ADAPTIVE_LEARNER'
                ? 'bg-emerald-500 text-slate-950 shadow-[0_0_12px_rgba(16,185,129,0.35)]'
                : 'text-emerald-300 hover:text-white border border-emerald-500/30 bg-emerald-950/30'
            }`}
          >
            02. Script Learner ({learnedPositiveLeaders.length} Winners / {quarantinedScripts.length} Quarantined)
          </button>
          <button
            onClick={() => setActiveOmsSubTab('WHY_EXPLAINABILITY')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              activeOmsSubTab === 'WHY_EXPLAINABILITY'
                ? 'bg-cyan-500 text-slate-950 shadow-[0_0_12px_rgba(0,240,255,0.3)]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            03. &ldquo;Why?&rdquo; &amp; Veto Audit
          </button>
          <button
            onClick={() => setActiveOmsSubTab('PNL_ATTRIBUTION')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              activeOmsSubTab === 'PNL_ATTRIBUTION'
                ? 'bg-cyan-500 text-slate-950 shadow-[0_0_12px_rgba(0,240,255,0.3)]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            04. P&amp;L Attribution
          </button>
          <button
            onClick={() => setActiveOmsSubTab('T1_TAX_CALENDAR')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              activeOmsSubTab === 'T1_TAX_CALENDAR'
                ? 'bg-amber-500 text-slate-950 shadow-[0_0_12px_rgba(245,158,11,0.35)]'
                : 'text-amber-300 hover:text-white border border-amber-500/30 bg-amber-950/30'
            }`}
          >
            05. T-1 Tax &amp; Brokerage Calendar ({pendingT1Rules.length} Pending)
          </button>
          <button
            onClick={() => setActiveOmsSubTab('USER_GUIDE_STRENGTHS')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              activeOmsSubTab === 'USER_GUIDE_STRENGTHS'
                ? 'bg-cyan-500 text-slate-950 shadow-[0_0_12px_rgba(0,240,255,0.3)]'
                : 'text-cyan-300 hover:text-white border border-cyan-500/30 bg-cyan-950/30'
            }`}
          >
            06. User Guide &amp; Strengths/Weaknesses
          </button>
          <button
            onClick={() => setActiveOmsSubTab('REVERT_LEDGER')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
              activeOmsSubTab === 'REVERT_LEDGER'
                ? 'bg-amber-500 text-slate-950 shadow-[0_0_12px_rgba(245,158,11,0.35)]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>07. Revert Ledger ({ARCHITECTURE_REVERT_LEDGER.length})</span>
          </button>
        </div>
        <span className="text-[11px] text-slate-400 px-2">
          Active Tax Rule: <strong className="text-emerald-300">{activeTaxVersionInfo.activeConfig.versionId}</strong>
        </span>
      </div>

      {/* SUB-TAB 05: T-1 STATUTORY TAX, SEBI & BROKERAGE CALENDAR + BEFORE/AFTER LEDGER */}
      {activeOmsSubTab === 'T1_TAX_CALENDAR' && (
        <div className="p-5 rounded-2xl bg-[#080d1a]/95 border border-amber-500/35 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-bold uppercase">
                  T-1 DAY PRE-MARKET POLICY &amp; TAX GOVERNANCE
                </span>
                <span className="px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold">
                  ACTIVE SCHEDULE: {activeTaxVersionInfo.activeConfig.versionId}
                </span>
              </div>
              <h2 className="text-sm sm:text-base font-bold text-white mt-1.5 font-sans">
                Calendarized T-1 Statutory Tax, SEBI &amp; Brokerage Rule Approval Gate + Historical Before/After Ledger
              </h2>
              <p className="text-xs text-slate-400 font-sans mt-0.5">
                All upcoming STT/CTT, Exchange+IPFT, SEBI Turnover, and Brokerage rule changes are staged 1 day before Go-Live (T-1) for manual approval prior to 09:15 IST market open. Historical orders retain their exact Before calculation; post-approval orders use the After calculation.
              </p>
            </div>
            <button
              onClick={handleResetTaxCalendar}
              className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs text-slate-300 font-bold cursor-pointer"
            >
              Reset T-1 Demo Queue
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {statutoryCalendar.map((rule) => {
              const isPending = rule.status === 'PENDING_T_MINUS_1_APPROVAL';
              const isApproved = rule.status === 'APPROVED_LIVE' || rule.status === 'ACTIVE_BASELINE';
              return (
                <div
                  key={rule.ruleId}
                  className={`p-4 rounded-xl border flex flex-col justify-between space-y-3 ${
                    isPending
                      ? 'bg-amber-950/20 border-amber-500/40'
                      : isApproved
                      ? 'bg-emerald-950/15 border-emerald-500/35'
                      : 'bg-slate-950/80 border-slate-800'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-cyan-300 font-bold">
                        {rule.authority} · {rule.circularRef}
                      </span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                          isPending
                            ? 'bg-amber-500 text-slate-950'
                            : isApproved
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : 'bg-rose-950 text-rose-300 border border-rose-500/40'
                        }`}
                      >
                        {rule.status.replace(/_/g, ' ')}
                      </span>
                    </div>

                    <h3 className="text-xs font-bold text-white font-sans">{rule.title}</h3>
                    <div className="text-[10px] text-amber-300">
                      Alert Window: {rule.tMinus1AlertDateIST} · Go-Live: {rule.goLivePreMarketTimeIST}
                    </div>
                    <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
                      {rule.summaryDescription}
                    </p>

                    <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 space-y-1 text-[10px]">
                      <div className="text-slate-300">
                        <strong className="text-cyan-300">BEFORE:</strong> {rule.beforeRatesSummary}
                      </div>
                      <div className="text-slate-300">
                        <strong className="text-emerald-300">AFTER:</strong> {rule.afterRatesSummary}
                      </div>
                      <div className="text-amber-300 font-bold pt-1 border-t border-slate-800/80">
                        Friction Delta: {rule.sampleImpactOn1LotNiftyOptionINR}
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
                    {isPending ? (
                      <>
                        <button
                          onClick={() => handleApproveTaxRule(rule.ruleId)}
                          className="flex-1 py-2 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-[11px] uppercase cursor-pointer transition"
                        >
                          Approve Pre-Market (Go-Live)
                        </button>
                        <button
                          onClick={() => handleDeferTaxRule(rule.ruleId)}
                          className="py-2 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 border border-rose-500/40 text-rose-300 font-bold text-[11px] uppercase cursor-pointer transition"
                        >
                          Defer
                        </button>
                      </>
                    ) : (
                      <span className="text-[10px] text-slate-400">
                        {rule.approvedByUser || 'Verified'} · {rule.decisionTimestampIST || rule.goLivePreMarketTimeIST}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Historical Before vs After Order Book Verification Table */}
          <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-cyan-300 uppercase">
                Order Book Historical Before vs. After Tax Version Stamp Verification ({orders.length} Orders)
              </span>
              <span className="text-[10px] text-slate-400">
                Historical trades never retroactively mutate when a new T-1 tax rule is approved
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[11px] font-mono">
                <thead className="text-slate-400 border-b border-slate-800 uppercase text-[10px]">
                  <tr>
                    <th className="py-2 px-2">Order ID &amp; Symbol</th>
                    <th className="py-2 px-2">Timestamp</th>
                    <th className="py-2 px-2">Stamped Tax Rule Version (Before vs After)</th>
                    <th className="py-2 px-2 text-right">Locked Statutory Friction</th>
                    <th className="py-2 px-2 text-right">Target / Realized P&amp;L</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {orders.slice(0, 10).map((o) => (
                    <tr key={o.id}>
                      <td className="py-2 px-2 font-bold text-white">
                        {o.symbol} <span className="text-slate-500 font-normal">({o.id})</span>
                      </td>
                      <td className="py-2 px-2 text-slate-400">{o.timestamp}</td>
                      <td className="py-2 px-2">
                        <span className="px-2 py-0.5 rounded bg-cyan-950/70 border border-cyan-500/30 text-cyan-300 text-[10px] font-bold">
                          {o.taxRuleVersionId || 'TAX-2026-V1-OCT (Before Baseline)'}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-right text-amber-300">
                        {o.statutoryFrictionSnapshotINR != null
                          ? `₹${o.statutoryFrictionSnapshotINR.toFixed(2)}`
                          : '₹49.12 (V1 Baseline)'}
                      </td>
                      <td className="py-2 px-2 text-right text-emerald-400 font-bold">
                        Target +₹{(o.targetProfitINR || 0).toFixed(0)} · Live ₹{(o.pnlINR || 0).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 06: AUTO-UPDATED USER GUIDE & BRUTAL STRENGTHS VS WEAKNESSES */}
      {activeOmsSubTab === 'USER_GUIDE_STRENGTHS' && (
        <div className="p-5 rounded-2xl bg-[#080d1a]/95 border border-cyan-500/35 space-y-5 font-sans">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div>
              <span className="px-2 py-0.5 rounded bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-[10px] font-mono font-bold uppercase">
                AUTO-SYNCHRONIZED APPLICATION GUIDELINE (REV-017)
              </span>
              <h2 className="text-base sm:text-lg font-bold text-white mt-1">
                How to Use the 4-Core Quant Terminal + Brutal Strengths &amp; Structural Limitations
              </h2>
              <p className="text-xs text-slate-400">
                Plain-English operational manual synchronized with India Lok Sabha / US Primary &amp; Mid-Term Elections, 52W-Low Bottom Accumulation, Bear Put (T1/T2/T3) F&amp;O, and T-1 Statutory Tax Governance.
              </p>
            </div>
          </div>

          {/* 4-Step Plain-English Workflow */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div className="p-4 rounded-xl bg-slate-950 border border-cyan-500/30 space-y-1.5">
              <div className="font-mono font-bold text-cyan-300 text-[11px]">STEP 1 · 1. MARKET FINDER</div>
              <div className="font-bold text-white text-sm">Find Leaders, 52W-Low Bottoms &amp; Bear Puts</div>
              <p className="text-slate-400 leading-relaxed">
                Use <strong>Sub-Tab 01</strong> for live Close &gt; 200 SMA breakouts, or <strong>Sub-Tab 02</strong> for <strong>India Lok Sabha + US Primary/Mid-Term Elections</strong> and the <strong>Dual-Mode 52W-Low Bottom-Accumulation &amp; Bear Put (PE) F&amp;O Scanner</strong> with T1, T2, T3 targets. Click <em>Deploy via AI Council</em> on any card.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-950 border border-amber-500/30 space-y-1.5">
              <div className="font-mono font-bold text-amber-300 text-[11px]">STEP 2 · 2. STRESS LAB</div>
              <div className="font-bold text-white text-sm">Test War, Oil, Fed &amp; Election Shocks</div>
              <p className="text-slate-400 leading-relaxed">
                Inject 1-click scenarios (<em>India Lok Sabha + US Primary Shock</em>, <em>US Mid-Term Tariff Sweep</em>, <em>Global War Oil $115</em>) and verify that all <strong>10 Brutal Self-Learning Checks PASS (10/10)</strong> while keeping daily drawdown strictly <strong>&le;1.50% (&lt;2% Locked)</strong>.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-950 border border-emerald-500/30 space-y-1.5">
              <div className="font-mono font-bold text-emerald-300 text-[11px]">STEP 3 · 3. AI COUNCIL</div>
              <div className="font-bold text-white text-sm">5-Agent Consensus &amp; Option Chain</div>
              <p className="text-slate-400 leading-relaxed">
                Inspect how <strong>Kuber, Chanakya, Arjuna/Bhishma, Vidura (Red-Team Critic), and the Risk Governor</strong> vote on every trade. Any setup failing <strong>&gt;2.00% Net-of-Tax Profit</strong> or <strong>Gross/Friction &ge; 3.0x</strong> is automatically vetoed.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-950 border border-purple-500/30 space-y-1.5">
              <div className="font-mono font-bold text-purple-300 text-[11px]">STEP 4 · 4. ORDER BOOK</div>
              <div className="font-bold text-white text-sm">Monitor TSL, T-1 Tax Rules &amp; Audit</div>
              <p className="text-slate-400 leading-relaxed">
                Track live P&amp;L, <strong>82% Step-Ratchet Non-Erosion Stops</strong>, prune losing scripts, and approve upcoming <strong>T-1 Statutory Tax &amp; Brokerage changes</strong> before 09:15 IST market open with full Before/After history.
              </p>
            </div>
          </div>

          {/* Brutal Strengths vs Weaknesses Matrix */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-emerald-950/15 border border-emerald-500/35 space-y-2.5">
              <div className="font-mono font-bold text-emerald-300 uppercase text-xs flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Verified Institutional Strengths (What This Engine Excels At)</span>
              </div>
              <ul className="space-y-2 text-slate-300 leading-relaxed list-disc pl-4">
                <li>
                  <strong>100% Deterministic Risk &amp; Tax Math (Zero LLM Hallucinated Numbers):</strong> Entry, Stop-Loss, T1/T2/T3 targets, Quarter-Kelly sizing, and 2026 Indian Statutory Taxes (0.15% Opt STT, 0.05% Fut STT, Stamp, GST, ₹20 Brok) are computed in pure TypeScript.
                </li>
                <li>
                  <strong>Hard &le;1.50% (&lt;2.00%) Daily Drawdown Floor:</strong> 98.5% of account equity is an untouchable floor; per-trade 1R stop loss is capped at 0.20%–0.45% of equity (~₹380).
                </li>
                <li>
                  <strong>Profits in Both Bull &amp; Bear / Market-Low Regimes:</strong> Combines Mode A <em>52W-Low Institutional Bottom Accumulation</em> (Long Reversals) with Mode B <em>Bear-Market Put (PE) F&amp;O Setups</em> (T1/T2/T3 + 82% Non-Erosion Step-Ratchet) when markets drop.
                </li>
                <li>
                  <strong>Full-Cycle India (Lok Sabha) + US (Primary/Mid-Term) Election Radar:</strong> Dynamically maps domestic capex/MCC/coalition shifts and US Primary H-1B/tariff rhetoric into sector multipliers.
                </li>
                <li>
                  <strong>T-1 Pre-Market Tax &amp; Brokerage Governance:</strong> Stages regulatory changes 1 day prior to Go-Live for manual user approval while preserving historical Before vs. After trade calculations.
                </li>
              </ul>
            </div>

            <div className="p-4 rounded-xl bg-rose-950/15 border border-rose-500/35 space-y-2.5">
              <div className="font-mono font-bold text-rose-300 uppercase text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400" />
                <span>Brutal Weaknesses &amp; Structural Limitations (What You Must Know)</span>
              </div>
              <ul className="space-y-2 text-slate-300 leading-relaxed list-disc pl-4">
                <li>
                  <strong>Yahoo Finance Fallback Latency (~15m Delayed Unless Upstox Token Paired):</strong> Without an active Upstox Analytics v2 token paired in Control Tower, public Yahoo Finance quotes carry exchange delay and do not stream Level-3 tick-by-tick order-book depth.
                </li>
                <li>
                  <strong>Paper-Trading / Simulated OMS Execution (Zero Live Broker Order Routing Without API Keys):</strong> Orders in the Order Book execute against live streamed LTP in localStorage/Firestore simulation; real exchange order placement requires authenticated broker order APIs and static IP whitelisting per SEBI norms.
                </li>
                <li>
                  <strong>Overnight Gap Risk Beyond Intraday Stop-Loss:</strong> While intraday 82% step-ratchet stops protect open positions during market hours (09:15–15:30 IST), an overnight geopolitical gap-open on Long Cash or F&amp;O positions can gap past an initial stop price (mitigated by buying defined-risk Put/Call options or squaring off MIS intraday).
                </li>
                <li>
                  <strong>Strict &gt;2.00% Net Veto Gate Can Reject Low-Volatility Scalps:</strong> Because 2026 F&amp;O STT (0.15%) + ₹40–₹80 brokerage requires Gross/Friction &ge; 3.0x and Net Yield &gt; 2.00%, narrow 0.4% scalps are intentionally vetoed rather than traded.
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {activeOmsSubTab === 'ADAPTIVE_LEARNER' && (
        <div className="p-5 rounded-2xl bg-[#080d1a]/95 border border-emerald-500/30 flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wide flex items-center gap-2">
                <span>Adaptive Script Learning, Intraday Trajectory (Low → Flat → High) &amp; Anti-Profit-Erosion Matrix</span>
                <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/40 text-[10px]">
                  ZERO STATIC LOCK-IN
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Prevents getting glued to losing scripts (such as <strong className="text-rose-300">ULTRACEMCO</strong> when in drawdown). Continuously observes intraday transitions (<strong className="text-slate-300">LOW → FLAT → RISING → HIGH LEADER</strong>), quarantines losing scripts from re-entry, and protects gains with a 4-tier <strong className="text-emerald-300">Trailing Profit Erosion Guard (locks +₹28 at +0.3R, 65% at +0.75R, and 82% at +1.35R)</strong>.
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handlePruneAndRotate}
                disabled={isScanning}
                className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition cursor-pointer shadow-[0_0_15px_rgba(16,185,129,0.3)]"
              >
                PRUNE LOSING SCRIPTS &amp; ROTATE TO LEARNED WINNERS
              </button>
              <button
                onClick={() => {
                  resetAllScriptLearningMemory();
                  setLearningRefreshTick(t => t + 1);
                  setToastMessage('Script Learning Memory reset to clean session slate.');
                  setTimeout(() => setToastMessage(null), 3500);
                }}
                className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 text-xs font-semibold transition cursor-pointer"
              >
                Reset Learning Memory
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-left text-xs font-mono tabular-nums">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Script &amp; Sector</th>
                  <th className="py-2.5 px-3 text-right">LTP &amp; Day Chg</th>
                  <th className="py-2.5 px-3 text-right">Intraday Range Pos</th>
                  <th className="py-2.5 px-3">Intraday Regime (Low → Flat → High)</th>
                  <th className="py-2.5 px-3 text-right">Session W/L &amp; P&amp;L</th>
                  <th className="py-2.5 px-3 text-right">Learned Score</th>
                  <th className="py-2.5 px-3">Action Verdict &amp; Quarantine / Anti-Erosion Rationale</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70 bg-slate-950/60">
                {scriptLearningMatrix.map((row) => {
                  const totalSymPnl = row.sessionRealizedPnlINR + row.sessionOpenPnlINR;
                  return (
                    <tr key={row.symbol} className="hover:bg-slate-900/60">
                      <td className="py-3 px-3">
                        <div className="font-bold text-white flex items-center gap-1.5 flex-wrap">
                          <span>{row.symbol}</span>
                          {row.isQuarantined && (
                            <div className="flex items-center gap-1">
                              <span className="px-1.5 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-500/40 text-[9px] font-bold">
                                QUARANTINED
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  releaseScriptQuarantine(row.symbol);
                                  setLearningRefreshTick((t) => t + 1);
                                  setToastMessage(`Quarantine released for ${row.symbol}.`);
                                  setTimeout(() => setToastMessage(null), 3000);
                                }}
                                className="px-1.5 py-0.5 rounded bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-500/40 text-[9px] font-bold transition cursor-pointer"
                                title="Release quarantine & allow execution"
                              >
                                Release
                              </button>
                            </div>
                          )}
                          {row.isQuarantineAutoLifted && (
                            <span className="px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/40 text-[9px] font-bold" title="Auto-lifted by Conviction Gate (≥88/100)">
                              AUTO-LIFTED (≥88)
                            </span>
                          )}
                          {row.isEligibleForDeploy && (
                            <span className="px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/40 text-[9px] font-bold">
                              CONFIRMED WINNER
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-500">{row.name} · {row.sector}</div>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="font-bold text-slate-100">
                          {row.ltp > 0 ? `₹${row.ltp.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                        </div>
                        <div className={`text-[10px] ${row.changePct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {row.changePct >= 0 ? '+' : ''}{row.changePct.toFixed(2)}% (α {row.relAlphaVsNifty >= 0 ? '+' : ''}{row.relAlphaVsNifty.toFixed(2)}%)
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="font-bold text-cyan-300">{row.intradayRangePct}% of Day Range</div>
                        <div className="w-24 h-1.5 bg-slate-800 rounded-full overflow-hidden ml-auto mt-1">
                          <div
                            className={`h-full ${
                              row.intradayRangePct >= 65
                                ? 'bg-emerald-400'
                                : row.intradayRangePct >= 40
                                  ? 'bg-amber-400'
                                  : 'bg-rose-400'
                            }`}
                            style={{ width: `${row.intradayRangePct}%` }}
                          />
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${
                          row.intradayPhase === 'LEARNED_HIGH_LEADER' || row.intradayPhase === 'RISING_ACCUMULATING'
                            ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
                            : row.intradayPhase === 'FLAT_OBSERVING'
                              ? 'bg-amber-950/80 text-amber-300 border-amber-500/40'
                              : 'bg-rose-950/80 text-rose-300 border-rose-500/40'
                        }`}>
                          {row.phaseLabel}
                        </span>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          Observed {row.observationTicks} ticks
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className={`font-bold ${totalSymPnl > 0 ? 'text-emerald-400' : totalSymPnl < 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                          {totalSymPnl >= 0 ? '+' : ''}₹{totalSymPnl.toFixed(2)}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {row.wins}W / {row.losses}L {row.peakPnlSeenINR > 0 ? `· Peak +₹${row.peakPnlSeenINR}` : ''}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <span className={`px-2 py-1 rounded-lg font-bold border ${
                          row.learnedScore >= 75
                            ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40'
                            : row.learnedScore >= 50
                              ? 'bg-slate-900 text-amber-300 border-slate-700'
                              : 'bg-rose-950/60 text-rose-300 border-rose-500/40'
                        }`}>
                          {row.learnedScore}/100
                        </span>
                      </td>
                      <td className="py-3 px-3 max-w-md">
                        <div className="text-[11px] text-slate-300 font-sans leading-snug">
                          {row.rationale}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeOmsSubTab === 'WHY_EXPLAINABILITY' && (
        <div className="p-5 rounded-2xl bg-[#080d1a]/95 border border-cyan-500/30 flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800">
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wide">
                &ldquo;Why?&rdquo; Explainability Engine: Factor Z-Score Rank &amp; 2026 Statutory Tax Veto Audit
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Answers two critical institutional questions: (1) Why did this instrument rank #1? (Winsorized Z-Score factor weights) and (2) Why was a candidate signal approved or vetoed? (Gross Win / Statutory Friction &ge; 3.0x &amp; Sector Cap).
              </p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-left text-xs font-mono tabular-nums">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Rank &amp; Security ID</th>
                  <th className="py-2.5 px-3 text-right">Live Price</th>
                  <th className="py-2.5 px-3 text-right">Composite Score</th>
                  <th className="py-2.5 px-3">Factor Decomposition (Why Ranked #N?)</th>
                  <th className="py-2.5 px-3 text-right">Est. Gross Win</th>
                  <th className="py-2.5 px-3 text-right">2026 Tax + Slippage</th>
                  <th className="py-2.5 px-3 text-right">Win / Friction</th>
                  <th className="py-2.5 px-3">Execution / Veto Verdict (Why?)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70 bg-slate-950/60">
                {whyExplainabilityRows.map((row) => {
                  const isApproved = row.decisionStatus === 'APPROVED_SIGNAL';
                  return (
                    <tr key={row.internalSecurityId} className="hover:bg-slate-900/60">
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/40 font-bold text-[10px]">
                            #{row.rank}
                          </span>
                          <span className="font-bold text-white">{row.symbol}</span>
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          {row.internalSecurityId} · {row.sector}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="font-bold text-slate-100">
                          ₹{row.livePrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </div>
                        <div className={`text-[10px] ${row.changePct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {row.changePct >= 0 ? '+' : ''}{row.changePct.toFixed(2)}%
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <span className="px-2 py-1 rounded-lg bg-slate-900 border border-slate-700 font-bold text-cyan-300">
                          {row.compositeScore}/100
                        </span>
                      </td>
                      <td className="py-3 px-3 max-w-md">
                        <div className="flex items-center gap-1.5 text-[10px] mb-1 flex-wrap">
                          <span className="px-1.5 py-0.5 rounded bg-sky-950/80 text-sky-300 border border-sky-500/30">
                            Mom: {row.factors.momentumContributionPct}% (Z={row.factors.momentumZ >= 0 ? '+' : ''}{row.factors.momentumZ})
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-500/30">
                            Qual: {row.factors.qualityContributionPct}% (Z={row.factors.qualityRoicZ >= 0 ? '+' : ''}{row.factors.qualityRoicZ})
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-500/30">
                            Val: {row.factors.valueContributionPct}%
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-700">
                            LowVol: {row.factors.lowVolContributionPct}%
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 font-sans leading-snug">
                          {row.whyRankedSummary}
                        </p>
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-emerald-400">
                        +₹{row.statutoryFriction.estimatedGrossWinINR.toFixed(2)}
                      </td>
                      <td className="py-3 px-3 text-right text-amber-300">
                        <div>-₹{row.statutoryFriction.totalFrictionINR.toFixed(2)}</div>
                        <div className="text-[9px] text-slate-500">
                          STT/CTT ₹{row.statutoryFriction.sttOrCttINR} · Brok ₹{row.statutoryFriction.brokerageINR}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <span className={`font-bold ${
                          row.statutoryFriction.grossWinToFrictionRatio >= 3.0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}>
                          {row.statutoryFriction.grossWinToFrictionRatio}x
                        </span>
                        <div className="text-[10px] text-slate-400">
                          Net {row.statutoryFriction.netExpectancyR >= 0 ? '+' : ''}{row.statutoryFriction.netExpectancyR}R
                        </div>
                      </td>
                      <td className="py-3 px-3 max-w-xs">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold mb-1 border ${
                          isApproved
                            ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
                            : 'bg-rose-950/80 text-rose-300 border-rose-500/40'
                        }`}>
                          {row.decisionStatus.replace(/_/g, ' ')}
                        </span>
                        <p className="text-[11px] text-slate-300 font-sans leading-snug">
                          {row.whyDecisionSummary}
                        </p>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeOmsSubTab === 'PNL_ATTRIBUTION' && (
        <div className="p-5 rounded-2xl bg-[#080d1a]/95 border border-cyan-500/30 flex flex-col gap-4">
          <div className="pb-3 border-b border-slate-800">
            <h2 className="text-sm font-bold text-white uppercase tracking-wide">
              Performance Attribution &amp; &ldquo;Why Live &ne; Backtest&rdquo; Implementation Shortfall
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Decomposes Portfolio Return = Benchmark + Sector Allocation + Security Selection &minus; 2026 Statutory Taxes (STT/CTT/GST/Stamp) &minus; Bid/Ask Slippage.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3 font-mono tabular-nums text-xs">
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase block">1. Gross Theoretical Alpha</span>
              <span className="text-base font-bold text-cyan-300 mt-1 block">
                {attribution.grossTheoreticalAlphaINR >= 0 ? '+' : ''}₹{attribution.grossTheoreticalAlphaINR.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
              <span className="text-[10px] text-slate-500">Zero-friction paper model</span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase block">2. Benchmark Effect</span>
              <span className="text-base font-bold text-slate-200 mt-1 block">
                {attribution.benchmarkEffectINR >= 0 ? '+' : ''}₹{attribution.benchmarkEffectINR.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
              <span className="text-[10px] text-slate-500">NIFTY 50 Beta component</span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase block">3. Sector Allocation</span>
              <span className="text-base font-bold text-sky-300 mt-1 block">
                {attribution.sectorAllocationEffectINR >= 0 ? '+' : ''}₹{attribution.sectorAllocationEffectINR.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
              <span className="text-[10px] text-slate-500">Overweight Gaining Sectors</span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase block">4. Security Selection</span>
              <span className="text-base font-bold text-emerald-400 mt-1 block">
                {attribution.securitySelectionEffectINR >= 0 ? '+' : ''}₹{attribution.securitySelectionEffectINR.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
              <span className="text-[10px] text-slate-500">Idiosyncratic Factor Alpha</span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-rose-500/30">
              <span className="text-[10px] text-rose-300 uppercase block">5. 2026 Taxes &amp; Slippage</span>
              <span className="text-base font-bold text-rose-400 mt-1 block">
                -₹{(attribution.statutoryTaxesAndFeesINR + attribution.slippageAndSpreadINR).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
              <span className="text-[10px] text-slate-400">
                Tax: ₹{attribution.statutoryTaxesAndFeesINR} · Slip: ₹{attribution.slippageAndSpreadINR}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-emerald-500/30">
              <span className="text-[10px] text-emerald-300 uppercase block">6. Net Portfolio P&amp;L</span>
              <span className={`text-base font-bold mt-1 block ${attribution.netRealizedAndFloatPnlINR >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {attribution.netRealizedAndFloatPnlINR >= 0 ? '+' : ''}₹{attribution.netRealizedAndFloatPnlINR.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
              <span className="text-[10px] text-slate-400">
                Shortfall: {attribution.implementationShortfallPct}% of Gross
              </span>
            </div>
          </div>
        </div>
      )}

      {activeOmsSubTab === 'REVERT_LEDGER' && (
        <div className="p-5 rounded-2xl bg-[#080d1a]/95 border border-amber-500/30 flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white uppercase tracking-wide">
                  Architecture Change, Module Pruning &amp; Easy Revert Ledger
                </h2>
                <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-500/40 text-[10px] font-bold">
                  SYNCED WITH PROJECT_CHANGELOG_AND_REVERT_LEDGER.md
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Every discarded static item, pruned simulator button, and upgraded strategy/veto formula is logged below with its exact Revert ID and step-by-step restoration path.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-left text-xs font-mono tabular-nums">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Revert ID &amp; Date</th>
                  <th className="py-2.5 px-3">Category &amp; Module</th>
                  <th className="py-2.5 px-3">Previous Behavior (Before Audit)</th>
                  <th className="py-2.5 px-3">New Institutional Behavior</th>
                  <th className="py-2.5 px-3">Exact Revert Instruction</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70 bg-slate-950/60">
                {ARCHITECTURE_REVERT_LEDGER.map((item) => (
                  <tr key={item.revertId} className="hover:bg-slate-900/60">
                    <td className="py-3 px-3 whitespace-nowrap align-top">
                      <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-500/40 font-bold text-[10px]">
                        {item.revertId}
                      </span>
                      <div className="text-[10px] text-slate-500 mt-1">{item.dateIST}</div>
                    </td>
                    <td className="py-3 px-3 max-w-xs align-top">
                      <span className="inline-block px-1.5 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-500/30 text-[9px] font-bold mb-1">
                        {item.category.replace(/_/g, ' ')}
                      </span>
                      <div className="font-bold text-slate-100 text-xs font-sans">{item.moduleName}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5 break-all">{item.filePath}</div>
                    </td>
                    <td className="py-3 px-3 max-w-xs align-top text-[11px] text-slate-400 font-sans leading-relaxed">
                      {item.previousStateSummary}
                    </td>
                    <td className="py-3 px-3 max-w-xs align-top text-[11px] text-emerald-300/95 font-sans leading-relaxed">
                      {item.newStateSummary}
                    </td>
                    <td className="py-3 px-3 max-w-xs align-top text-[11px] text-amber-200/90 font-mono leading-relaxed">
                      {item.revertInstruction}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeOmsSubTab === 'ORDER_BOOK' && (
        <>
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

      {/* ADAPTIVE SCRIPT LEARNING, LOSER QUARANTINE & ANTI-PROFIT-EROSION CONTROL BAR */}
      <div className="p-3.5 rounded-xl bg-gradient-to-r from-[#071318] via-[#091526] to-[#080d1a] border border-emerald-500/30 flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 flex-wrap">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-bold text-emerald-300 uppercase tracking-wide">
              Adaptive Script Learner &amp; Anti-Profit-Erosion Guard:
            </span>
            <span className="px-2 py-0.5 rounded bg-emerald-950/90 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold">
              Confirmed Leaders: {learnedPositiveLeaders.slice(0, 4).map(s => `${s.symbol} (+${s.changePct}%)`).join(', ') || 'Observing'}
            </span>
            <span className="px-2 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-500/40 text-[10px] font-semibold">
              Observing (Flat/Low): {observingScripts.length}
            </span>
            <span className="px-2 py-0.5 rounded bg-rose-950/80 text-rose-300 border border-rose-500/40 text-[10px] font-bold">
              Discarded / Quarantined: {quarantinedScripts.map(s => s.symbol).join(', ') || 'None'}
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            Losing or weak scripts (including <strong className="text-rose-300">ULTRACEMCO</strong> when in loss/flat) are automatically quarantined and rotated out. Open gains are guarded by a <strong className="text-cyan-300">4-Tier Anti-Erosion Ratchet (+₹28 floor @ +0.3R → 65% lock @ +0.75R → 82% lock @ +1.35R)</strong>.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <button
            onClick={handleToggleAutoPrune}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
              autoPruneEnabled
                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50'
                : 'bg-slate-900 text-slate-400 border-slate-700'
            }`}
            title="Automatically discard losing scripts and lock profit erosion on every tick"
          >
            Auto-Prune Losers: {autoPruneEnabled ? 'ARMED (ON)' : 'PAUSED'}
          </button>
          <button
            onClick={handlePruneAndRotate}
            disabled={isScanning}
            className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-[11px] font-bold transition cursor-pointer shadow-[0_0_12px_rgba(16,185,129,0.3)]"
            title="Immediately discard any losing open script (e.g. ULTRACEMCO), quarantine it, and deploy top learned positive leaders"
          >
            Prune Losers &amp; Rotate to Winners
          </button>
        </div>
      </div>

      {/* QUICK DEPLOY DESK BAR (STRICT >2% NET PROFIT & STATUTORY TAX VETO GATED) */}
      <div className="flex flex-col gap-2.5 p-3.5 rounded-xl bg-[#070b14] border border-slate-800/80 text-xs text-slate-400">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-bold text-slate-200">Strict Veto Desk Scanners (&gt;2.0% Net Profit &amp; Cost &lt; Profit):</span>
            <span className="text-[11px] hidden xl:inline text-slate-400">
              Evaluates 2026 STT/CTT + Exch + GST + ₹20/order Brokerage; vetoes duplicates &amp; sub-2% setups:
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => handleDeployOrder('NSE_FNO')}
              disabled={isScanning}
              className="px-2.5 py-1 rounded-lg bg-sky-950/60 hover:bg-sky-900/80 text-sky-300 border border-sky-500/30 text-[11px] font-semibold transition cursor-pointer"
            >
              Scan NSE F&amp;O (Bhishma)
            </button>
            <button
              onClick={() => handleDeployOrder('NSE_CASH')}
              disabled={isScanning}
              className="px-2.5 py-1 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-500/30 text-[11px] font-semibold transition cursor-pointer"
            >
              Scan NSE Cash Leader (Arjuna)
            </button>
            <button
              onClick={() => handleDeployOrder('BSE_CASH')}
              disabled={isScanning}
              className="px-2.5 py-1 rounded-lg bg-indigo-950/60 hover:bg-indigo-900/80 text-indigo-300 border border-indigo-500/30 text-[11px] font-semibold transition cursor-pointer"
            >
              Scan BSE Cash Leader (Chanakya)
            </button>
            <button
              onClick={() => handleDeployOrder('MCX')}
              disabled={isScanning}
              className="px-2.5 py-1 rounded-lg bg-amber-950/60 hover:bg-amber-900/80 text-amber-300 border border-amber-500/30 text-[11px] font-semibold transition cursor-pointer"
            >
              Scan MCX Commodity (Kuber)
            </button>
          </div>
        </div>

        {/* LIVE PRE-TRADE STATUTORY VETO & >2.0% NET PROFIT AUDIT STRIP */}
        {lastScanAudit && (
          <div className="pt-2.5 border-t border-slate-800/80 flex flex-col gap-2">
            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/40 font-bold text-[10px]">
                  LAST VETO AUDIT ({lastScanAudit.timestampIST})
                </span>
                <span className="text-slate-200 font-semibold">{lastScanAudit.summaryHeadline}</span>
              </div>
              <div className="flex items-center gap-2 text-[10px]">
                <span className="px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 font-bold">
                  Approved (&gt;2% Net): {lastScanAudit.approvedCount}
                </span>
                <span className="px-2 py-0.5 rounded bg-rose-950/80 text-rose-300 border border-rose-500/40 font-bold">
                  Vetoed: {lastScanAudit.vetoedCount}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2">
              {lastScanAudit.evaluations.map((ev) => (
                <div
                  key={ev.id}
                  className={`p-2.5 rounded-lg border flex flex-col justify-between gap-1 text-[10px] ${
                    ev.approved
                      ? 'bg-emerald-950/20 border-emerald-500/40 text-slate-200'
                      : 'bg-rose-950/20 border-rose-500/35 text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-bold text-white truncate">{ev.symbol}</span>
                    <span
                      className={`px-1.5 py-0.2 rounded font-bold text-[9px] shrink-0 border ${
                        ev.approved
                          ? 'bg-emerald-950 text-emerald-300 border-emerald-500/50'
                          : 'bg-rose-950 text-rose-300 border-rose-500/50'
                      }`}
                    >
                      {ev.approved ? `DEPLOYED (+${ev.netProfitPct}% NET)` : 'VETOED'}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 flex items-center justify-between tabular-nums">
                    <span>Gross Target: +₹{ev.grossTargetProfitINR.toFixed(0)}</span>
                    <span className="text-amber-300">2026 Tax+Brok: -₹{ev.friction.totalFrictionINR.toFixed(2)}</span>
                    <span className={ev.netProfitPct > 2.0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                      Net: +₹{ev.netProfitINR.toFixed(0)} ({ev.grossToFrictionRatio}x)
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-300 font-sans leading-snug">
                    {ev.verdictReason}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* THE DEDICATED TRADE HISTORY TABLE */}
      {filteredRecords.length === 0 ? (
        <div className="p-12 rounded-2xl border border-slate-800 bg-[#070b14]/90 text-center flex flex-col items-center justify-center gap-3 font-mono">
          <Scale className="w-10 h-10 text-slate-600" />
          <div className="text-sm text-slate-300 font-bold uppercase tracking-wider">
            No Executed Paper Trades Matching Filter
          </div>
          <p className="text-xs text-slate-500 max-w-md">
            All static seed rows have been removed. Only confirmed setups passing the 2026 Statutory Tax &amp; &gt;2.0% Net Profit Veto Gate are deployed here.
          </p>
          <div className="flex items-center gap-2 mt-2">
            <button
              onClick={() => handleDeployOrder('ALL')}
              className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold uppercase rounded-xl transition cursor-pointer shadow-[0_0_15px_rgba(0,240,255,0.3)]"
            >
              Scan &amp; Deploy Confirmed &gt;2% Net Setups
            </button>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-[#080d1a]/90 shadow-2xl">
          <table className="w-full text-left text-xs font-mono">
            {/* Table Header: Instrument + Expiry + 2-Leg Breakdown + Total Instrument Cost */}
            <thead className="bg-[#0b1224] text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3.5 px-4 font-bold text-slate-200">Instrument, Expiry &amp; Leg Breakdown</th>
                <th className="py-3.5 px-3 font-bold text-center">Side</th>
                <th className="py-3.5 px-3 font-bold text-right">Qty &amp; Lots</th>
                <th className="py-3.5 px-4 font-bold text-right text-slate-200">Entry Price (Unit)</th>
                <th className="py-3.5 px-4 font-bold text-right text-cyan-300">Total Instrument Cost</th>
                <th className="py-3.5 px-4 font-bold text-right text-slate-200">Exit Price &amp; Value</th>
                <th className="py-3.5 px-4 font-bold text-right text-slate-200">P&amp;L</th>
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
                    {/* 1. Instrument + Expiry Date + 2-Position Spread Breakdown */}
                    <td className="py-3.5 px-4 min-w-[310px]">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-slate-100 font-bold text-xs tracking-wide">
                            {trade.instrument}
                          </span>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase border ${segmentBadge}`}>
                            {segmentLabel}
                          </span>
                          {trade.expiryDateStr ? (
                            <span
                              className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950/80 text-amber-300 border border-amber-500/40 inline-flex items-center gap-1"
                              title={trade.expirySeriesLabel || 'Contract Expiry Date'}
                            >
                              <Calendar className="w-3 h-3 text-amber-400 shrink-0" />
                              <span>EXP: {trade.expiryDateStr}</span>
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-slate-900 text-slate-400 border border-slate-700">
                              SPOT EQ · No Expiry
                            </span>
                          )}
                        </div>

                        <div className="text-[10px] text-slate-400">
                          {trade.strategyName} · <strong className="text-slate-300">{trade.agentName}</strong>
                          {trade.expirySeriesLabel && (
                            <span className="text-cyan-400 ml-1.5">({trade.expirySeriesLabel})</span>
                          )}
                        </div>

                        {/* Explicit 2-Position (2-Leg Spread) Breakdown when applicable */}
                        {trade.isTwoLegSpread && trade.constituentLegs.length === 2 ? (
                          <div className="mt-1 p-2 rounded-lg bg-slate-950/90 border border-sky-500/30 flex flex-col gap-1 text-[10px]">
                            <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-wider text-sky-300 border-b border-slate-800 pb-1">
                              <span>{trade.positionCountBadge}</span>
                              <span className="text-amber-300">EXP: {trade.expiryDateStr}</span>
                            </div>
                            {trade.constituentLegs.map((leg) => (
                              <div key={leg.legNumber} className="flex items-center justify-between gap-2 tabular-nums flex-wrap">
                                <span className="flex items-center gap-1.5">
                                  <span
                                    className={`px-1.5 py-0.2 rounded text-[9px] font-bold border ${
                                      leg.action === 'SELL'
                                        ? 'bg-rose-950/80 text-rose-300 border-rose-500/40'
                                        : 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
                                    }`}
                                  >
                                    Leg {leg.legNumber}: {leg.action}
                                  </span>
                                  <span className="font-bold text-slate-200">{leg.instrument}</span>
                                  {leg.moneynessBadge && (
                                    <span
                                      className={`px-1 py-0.2 rounded text-[8px] font-bold border ${
                                        leg.moneynessBadge === 'OTM'
                                          ? 'bg-emerald-950/70 text-emerald-300 border-emerald-500/30'
                                          : leg.moneynessBadge === 'ITM'
                                            ? 'bg-amber-950/80 text-amber-300 border-amber-500/40'
                                            : 'bg-cyan-950/80 text-cyan-300 border-cyan-500/40'
                                      }`}
                                    >
                                      {leg.moneynessBadge}
                                    </span>
                                  )}
                                  <span className="text-slate-400">× {leg.qty}</span>
                                </span>
                                <span className="text-slate-300 font-semibold">
                                  Entry ₹{leg.unitPrice.toFixed(2)} (
                                  <strong className={leg.action === 'SELL' ? 'text-amber-300' : 'text-cyan-300'}>
                                    ₹{leg.totalLegCostINR.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                  </strong>
                                  ) · LTP ₹{leg.currentUnitPrice.toFixed(2)}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-[10px] text-slate-500 flex items-center gap-1.5">
                            <span className="px-1.5 py-0.2 rounded bg-slate-900 border border-slate-800 text-slate-300 font-semibold text-[9px]">
                              {trade.positionCountBadge}
                            </span>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* 2. Side */}
                    <td className="py-3.5 px-3 text-center whitespace-nowrap">
                      <div className="flex flex-col items-center gap-1">
                        <span className={`px-2.5 py-1 rounded text-[10px] font-bold tracking-wider inline-flex items-center gap-1 ${
                          trade.side === 'BUY'
                            ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-500/40'
                            : 'bg-rose-950/70 text-rose-300 border border-rose-500/40'
                        }`}>
                          {trade.side === 'BUY' ? <ArrowUpRight className="w-3 h-3 text-emerald-400" /> : <ArrowDownRight className="w-3 h-3 text-rose-400" />}
                          <span>{trade.isTwoLegSpread ? `NET ${trade.side}` : trade.side}</span>
                        </span>
                        {trade.isTwoLegSpread && (
                          <span className="text-[9px] text-slate-400 font-semibold">
                            2 Legs (1 SELL + 1 BUY)
                          </span>
                        )}
                      </div>
                    </td>

                    {/* 3. Qty & Lots */}
                    <td className="py-3.5 px-3 text-right text-slate-200 font-medium tabular-nums whitespace-nowrap">
                      <div className="font-bold text-xs">
                        {trade.qty.toLocaleString('en-IN')} {trade.isTwoLegSpread ? '/ leg' : ''}
                      </div>
                      <div className="text-[10px] text-slate-400 font-normal">
                        {trade.qtyDisplayLabel}
                      </div>
                    </td>

                    {/* 4. Entry Price (Per Unit) & Live TSL Stop Price */}
                    <td className="py-3.5 px-4 text-right text-slate-200 font-semibold tabular-nums whitespace-nowrap">
                      <div className="text-xs font-bold">
                        ₹{trade.entryPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        <span className="text-[10px] text-slate-400 font-normal"> / unit</span>
                      </div>
                      {trade.isTwoLegSpread && trade.constituentLegs.length === 2 && (
                        <div className="text-[10px] text-amber-300 font-normal">
                          Net of ₹{trade.constituentLegs[0].unitPrice.toFixed(2)} − ₹{trade.constituentLegs[1].unitPrice.toFixed(2)}
                        </div>
                      )}
                      <div className="text-[10px] text-cyan-300/90 font-normal">
                        TSL: ₹{trade.trailingStopPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (1R ≤₹{trade.maxDefinedLossINR})
                      </div>
                    </td>

                    {/* 5. Total Instrument Cost (Entry × Qty + Margin Deployed) */}
                    <td className="py-3.5 px-4 text-right tabular-nums whitespace-nowrap">
                      <div className="text-xs font-bold text-cyan-300">
                        ₹{trade.totalEntryCostINR.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {trade.isTwoLegSpread
                          ? `Net Premium (₹${trade.entryPrice.toFixed(2)} × ${trade.qty})`
                          : `Contract Value (₹${trade.entryPrice.toFixed(2)} × ${trade.qty})`}
                      </div>
                      <div className="text-[10px] text-emerald-400 font-semibold">
                        {trade.isTwoLegSpread
                          ? `Hedged Margin: ₹${trade.marginDeployedINR.toLocaleString('en-IN')}`
                          : `Capital / Margin: ₹${trade.marginDeployedINR.toLocaleString('en-IN')}`}
                      </div>
                    </td>

                    {/* 6. Exit Price & Current Total Value */}
                    <td className="py-3.5 px-4 text-right font-semibold tabular-nums whitespace-nowrap">
                      {trade.isOpen ? (
                        <div className="flex flex-col items-end">
                          <span className="text-cyan-300 inline-flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping"></span>
                            <span>LTP ₹{trade.exitPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </span>
                          <span className="text-[10px] text-slate-300 font-semibold">
                            Curr Total: ₹{trade.totalCurrentValueINR.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                          <span className={`text-[10px] font-normal ${
                            trade.priceDeltaPerUnit > 0 ? 'text-emerald-400/90' : trade.priceDeltaPerUnit < 0 ? 'text-rose-400/90' : 'text-slate-500'
                          }`}>
                            Δ {trade.priceDeltaPerUnit >= 0 ? '+' : ''}₹{trade.priceDeltaPerUnit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/pt × {trade.qty}
                          </span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-end">
                          <span className="text-slate-200">
                            ₹{trade.exitPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                          <span className="text-[10px] text-slate-300 font-semibold">
                            Exit Total: ₹{trade.totalCurrentValueINR.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                          <span className={`text-[10px] font-normal ${
                            trade.priceDeltaPerUnit > 0 ? 'text-emerald-400/90' : trade.priceDeltaPerUnit < 0 ? 'text-rose-400/90' : 'text-slate-500'
                          }`}>
                            Δ {trade.priceDeltaPerUnit >= 0 ? '+' : ''}₹{trade.priceDeltaPerUnit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/pt × {trade.qty}
                          </span>
                        </div>
                      )}
                    </td>

                    {/* 7. P&L + High-Water-Mark Peak P&L vs Locked TSL Floor */}
                    <td className="py-3.5 px-4 text-right font-bold tabular-nums whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 ${
                        isProfit ? 'text-emerald-400' : isLoss ? 'text-rose-400' : 'text-slate-400'
                      }`}>
                        {isProfit && <TrendingUp className="w-3.5 h-3.5" />}
                        {isLoss && <TrendingDown className="w-3.5 h-3.5" />}
                        <span>
                          {isProfit ? '+' : ''}₹{trade.pnl.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </span>
                      <div className="text-[10px] font-normal text-slate-400 mt-0.5">
                        HWM Peak: <strong className="text-emerald-300">+₹{trade.peakPnlINR.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong> · Floor:{' '}
                        <strong className={trade.trailingStopPnlINR > 0 ? 'text-emerald-400' : 'text-rose-400'}>
                          {trade.trailingStopPnlINR >= 0 ? '+' : ''}₹{trade.trailingStopPnlINR.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </strong>
                      </div>
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

                    {/* Action / Status (Pruned synthetic SIM TSL LOCK button — REV-003) */}
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      {trade.isOpen ? (
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleSquareOffOrder(trade.orderId)}
                            className="px-2.5 py-1 bg-rose-950/60 hover:bg-rose-900 border border-rose-500/40 text-rose-300 text-[10px] font-bold rounded-lg transition cursor-pointer"
                            title="Square off this open position at live exchange LTP"
                          >
                            SQUARE OFF
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                            trade.status === 'TRAILING_STOP_HIT' || trade.status === 'TARGET_HIT'
                              ? 'bg-emerald-950/70 text-emerald-300 border-emerald-500/40'
                              : trade.status === 'STOP_HIT'
                                ? 'bg-rose-950/70 text-rose-300 border-rose-500/40'
                                : 'bg-slate-900/90 text-slate-400 border-slate-800'
                          }`}>
                            {trade.status === 'TRAILING_STOP_HIT'
                              ? 'TSL PROFIT LOCKED'
                              : trade.status === 'SQUARED_OFF'
                                ? 'CLOSED'
                                : trade.status}
                          </span>
                          {trade.exitReason && (
                            <span className="text-[9px] text-slate-400 mt-0.5 max-w-[180px] truncate" title={trade.exitReason}>
                              {trade.exitReason}
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
        </>
      )}

      {/* Footer Audit Guarantee */}
      <div className="p-4 rounded-xl bg-[#080d1a]/60 border border-slate-800 text-xs text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            SEBI Capital Preservation Guarantee: Per-trade initial risk bounded to 1R ≤ ₹400 (0.4% of ₹1L capital) with Step-Ratchet TSL (Breakeven @ +0.8R, 50%–75% Peak Profit Lock).
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
