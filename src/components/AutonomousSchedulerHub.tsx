import React, { useState, useEffect, useCallback } from 'react';
import {
  Clock,
  Play,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Search,
  Zap,
  TrendingUp,
  TrendingDown,
  Layers,
  FileText,
  Database,
  Activity,
  History,
  Check,
} from 'lucide-react';
import type { StoredAuditRecord, StoredPaperTrade, SchedulerLogEntry } from '../server/ledgerDatabase';

interface SchedulerStatusData {
  isRunning: boolean;
  currentPhase: string;
  istTime: string;
  lastPreMarketRun: string | null;
  lastIntradayMonitorRun: string | null;
  lastIntradaySquareOffRun: string | null;
  lastPostMarketAuditRun: string | null;
  activeOpenPaperTradesCount: number;
}

interface StatsSummaryData {
  totalAuditsCount: number;
  verifiedWinsCount: number;
  verifiedLossesCount: number;
  winRatePct: number;
  totalPaperTradesCount: number;
  totalRealizedPnlINR: number;
  databaseSizeKB: number;
  lastUpdated: string;
}

interface AutonomousSchedulerHubProps {
  onRecalibrateRequested?: () => void;
}

export const AutonomousSchedulerHub: React.FC<AutonomousSchedulerHubProps> = ({
  onRecalibrateRequested,
}) => {
  // Navigation & Sub-views
  const [activeTab, setActiveTab] = useState<'AUDIT_LEDGER' | 'PAPER_TRADES' | 'LOGS'>(
    'AUDIT_LEDGER',
  );

  // Scheduler status & summary stats
  const [status, setStatus] = useState<SchedulerStatusData | null>(null);
  const [stats, setStats] = useState<StatsSummaryData | null>(null);
  const [statusLoading, setStatusLoading] = useState<boolean>(true);

  // Permanent Audit records
  const [audits, setAudits] = useState<StoredAuditRecord[]>([]);
  const [auditsLoading, setAuditsLoading] = useState<boolean>(false);
  const [auditFilterOutcome, setAuditFilterOutcome] = useState<'ALL' | 'VERIFIED_WIN' | 'VERIFIED_LOSS'>('ALL');
  const [auditSearchSymbol, setAuditSearchSymbol] = useState<string>('');
  const [auditLimit, setAuditLimit] = useState<number>(50);

  // Autonomous Paper Trades
  const [trades, setTrades] = useState<StoredPaperTrade[]>([]);
  const [tradesLoading, setTradesLoading] = useState<boolean>(false);
  const [tradesFilterStatus, setTradesFilterStatus] = useState<'ALL' | 'OPEN' | 'TARGET_HIT' | 'STOP_HIT' | 'SQUARED_OFF'>('ALL');

  // Scheduler logs
  const [logs, setLogs] = useState<SchedulerLogEntry[]>([]);
  const [logsLoading, setLogsLoading] = useState<boolean>(false);

  // Action status
  const [triggeringRoutine, setTriggeringRoutine] = useState<string | null>(null);
  const [noticeMessage, setNoticeMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 1. Fetch Scheduler Status & Stats
  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/scheduler/status');
      const json = await res.json();
      if (res.ok && json.success) {
        setStatus(json.status);
        setStats(json.stats);
      }
    } catch {
      // ignore network glitch
    } finally {
      setStatusLoading(false);
    }
  }, []);

  // 2. Fetch Permanent Audits from .data/
  const fetchAudits = useCallback(async () => {
    setAuditsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('limit', String(auditLimit));
      if (auditFilterOutcome !== 'ALL') {
        params.set('outcome', auditFilterOutcome);
      }
      if (auditSearchSymbol.trim()) {
        params.set('symbol', auditSearchSymbol.trim().toUpperCase());
      }
      const res = await fetch(`/api/scheduler/audits?${params.toString()}`);
      const json = await res.json();
      if (res.ok && json.success) {
        setAudits(json.audits || []);
      }
    } catch {
      // ignore
    } finally {
      setAuditsLoading(false);
    }
  }, [auditLimit, auditFilterOutcome, auditSearchSymbol]);

  // 3. Fetch Autonomous Paper Trades
  const fetchTrades = useCallback(async () => {
    setTradesLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('limit', '100');
      if (tradesFilterStatus !== 'ALL') {
        params.set('status', tradesFilterStatus);
      }
      const res = await fetch(`/api/scheduler/trades?${params.toString()}`);
      const json = await res.json();
      if (res.ok && json.success) {
        setTrades(json.trades || []);
      }
    } catch {
      // ignore
    } finally {
      setTradesLoading(false);
    }
  }, [tradesFilterStatus]);

  // 4. Fetch Scheduler Event Logs
  const fetchLogs = useCallback(async () => {
    setLogsLoading(true);
    try {
      const res = await fetch('/api/scheduler/logs');
      const json = await res.json();
      if (res.ok && json.success) {
        setLogs(json.logs || []);
      }
    } catch {
      // ignore
    } finally {
      setLogsLoading(false);
    }
  }, []);

  // Initial load & Polling
  useEffect(() => {
    fetchStatus();
    fetchAudits();
    const interval = setInterval(fetchStatus, 15000);
    return () => clearInterval(interval);
  }, [fetchStatus, fetchAudits]);

  useEffect(() => {
    if (activeTab === 'AUDIT_LEDGER') fetchAudits();
    if (activeTab === 'PAPER_TRADES') fetchTrades();
    if (activeTab === 'LOGS') fetchLogs();
  }, [activeTab, fetchAudits, fetchTrades, fetchLogs]);

  // Trigger on-demand routine
  const handleTriggerRoutine = async (routine: 'PRE_MARKET' | 'INTRADAY_SQUAREOFF' | 'POST_MARKET') => {
    setTriggeringRoutine(routine);
    setNoticeMessage(null);
    try {
      let ownerToken = '';
      try {
        ownerToken = localStorage.getItem('jarvis_owner_token') || '';
      } catch { /* ignore */ }

      const res = await fetch('/api/scheduler/trigger-cycle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(ownerToken ? { 'x-owner-token': ownerToken, Authorization: `Bearer ${ownerToken}` } : {}),
        },
        body: JSON.stringify({ routine }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setNoticeMessage({ type: 'success', text: data.message || `Routine ${routine} triggered successfully.` });
        await fetchStatus();
        if (activeTab === 'AUDIT_LEDGER') await fetchAudits();
        if (activeTab === 'PAPER_TRADES') await fetchTrades();
        if (activeTab === 'LOGS') await fetchLogs();
        if (routine === 'POST_MARKET' && onRecalibrateRequested) {
          onRecalibrateRequested();
        }
      } else {
        setNoticeMessage({ type: 'error', text: data.error || `Failed to execute ${routine}.` });
      }
    } catch (err: any) {
      setNoticeMessage({ type: 'error', text: err?.message || 'Network error triggering routine.' });
    } finally {
      setTriggeringRoutine(null);
      setTimeout(() => setNoticeMessage(null), 6000);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Live Scheduler Heartbeat Banner */}
      <div className="bg-slate-900/90 border border-cyan-500/30 rounded-xl p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 font-mono font-semibold">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                {status?.currentPhase || 'AUTONOMOUS SCHEDULER'}
              </span>
              <span className="text-slate-400">·</span>
              <span className="text-slate-300 font-mono">
                {status?.istTime ? `${status.istTime} IST` : 'Indian Market Hours'}
              </span>
              <span className="text-slate-400">·</span>
              <span className="text-slate-400 text-[11px]">
                3-Tier Operational Cadence (08:45 Pre-Market · 60s Intraday · 15:20 MIS · 16:30 Audit)
              </span>
            </div>
            <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <Activity className="w-5 h-5 text-cyan-400" />
              Autonomous Agent Scheduler & Persistent Historical Ledger
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed max-w-3xl">
              Autonomous execution and evaluation pipeline. Agents analyze pre-market setups at 08:45 IST, auto-enter high-conviction paper trades (≥88%), enforce 60s barrier checks, trigger 15:20 statutory MIS square-offs, and conduct walk-forward Bayesian grading against realized NSE closing prices at 16:30 IST.
            </p>
          </div>

          {/* Quick Manual Execution Routine Buttons */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={() => handleTriggerRoutine('PRE_MARKET')}
              disabled={!!triggeringRoutine}
              className="px-3 py-1.5 rounded-lg bg-sky-950/80 hover:bg-sky-900/80 border border-sky-500/40 text-sky-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              title="Runs 08:45 Pre-Market Routine: Syncs prices, evaluates high-volume candidates, and places paper orders if conviction is ≥88%"
            >
              {triggeringRoutine === 'PRE_MARKET' ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-sky-400" />
              ) : (
                <Play className="w-3.5 h-3.5 text-sky-400" />
              )}
              <span>08:45 Pre-Market Run</span>
            </button>

            <button
              onClick={() => handleTriggerRoutine('INTRADAY_SQUAREOFF')}
              disabled={!!triggeringRoutine}
              className="px-3 py-1.5 rounded-lg bg-amber-950/80 hover:bg-amber-900/80 border border-amber-500/40 text-amber-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              title="Runs 15:20 MIS Square-Off: Auto-closes all open intraday paper positions before the NSE closing bell"
            >
              {triggeringRoutine === 'INTRADAY_SQUAREOFF' ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
              ) : (
                <Zap className="w-3.5 h-3.5 text-amber-400" />
              )}
              <span>15:20 MIS Square-Off</span>
            </button>

            <button
              onClick={() => handleTriggerRoutine('POST_MARKET')}
              disabled={!!triggeringRoutine}
              className="px-3 py-1.5 rounded-lg bg-emerald-950/80 hover:bg-emerald-900/80 border border-emerald-500/40 text-emerald-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              title="Runs 16:30 Post-Market Audit: Grades open calls against realized closing prices, recalibrates Bayesian weights, and saves records to .data/audits.jsonl"
            >
              {triggeringRoutine === 'POST_MARKET' ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              )}
              <span>16:30 Audit & Recalibrate</span>
            </button>
          </div>
        </div>

        {/* User feedback alert */}
        {noticeMessage && (
          <div
            className={`p-3 rounded-lg border text-xs flex items-center justify-between ${
              noticeMessage.type === 'success'
                ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-200'
                : 'bg-rose-950/50 border-rose-500/40 text-rose-200'
            }`}
          >
            <span>{noticeMessage.text}</span>
            <button
              onClick={() => setNoticeMessage(null)}
              className="text-xs hover:underline cursor-pointer ml-3 font-medium"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* 2. Key Metrics & Database Health Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 pt-2">
          {/* Card 1: Permanent Audits */}
          <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 space-y-1">
            <div className="text-[11px] text-slate-400 flex items-center justify-between">
              <span>Permanent Audits</span>
              <Database className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <div className="text-base font-bold font-mono text-white">
              {stats?.totalAuditsCount ?? (statusLoading ? '...' : 0)}
            </div>
            <div className="text-[10px] text-slate-500">Non-truncating JSONL</div>
          </div>

          {/* Card 2: Historical Win Rate */}
          <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 space-y-1">
            <div className="text-[11px] text-slate-400 flex items-center justify-between">
              <span>Historical Win Rate</span>
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-base font-bold font-mono text-emerald-400">
              {stats?.winRatePct !== undefined ? `${stats.winRatePct}%` : '—'}
            </div>
            <div className="text-[10px] text-slate-500">
              {stats?.verifiedWinsCount || 0}W / {stats?.verifiedLossesCount || 0}L
            </div>
          </div>

          {/* Card 3: Autonomous Trades */}
          <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 space-y-1">
            <div className="text-[11px] text-slate-400 flex items-center justify-between">
              <span>Auto Paper Trades</span>
              <Activity className="w-3.5 h-3.5 text-sky-400" />
            </div>
            <div className="text-base font-bold font-mono text-white">
              {stats?.totalPaperTradesCount ?? (statusLoading ? '...' : 0)}
            </div>
            <div className="text-[10px] text-slate-500">
              Active Open: <strong className="text-sky-400">{status?.activeOpenPaperTradesCount || 0}</strong>
            </div>
          </div>

          {/* Card 4: Realized Paper PnL */}
          <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 space-y-1">
            <div className="text-[11px] text-slate-400 flex items-center justify-between">
              <span>Realized Paper P&L</span>
              {(stats?.totalRealizedPnlINR || 0) >= 0 ? (
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
              )}
            </div>
            <div
              className={`text-base font-bold font-mono ${
                (stats?.totalRealizedPnlINR || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              ₹{(stats?.totalRealizedPnlINR || 0).toLocaleString('en-IN')}
            </div>
            <div className="text-[10px] text-slate-500">Simulation P&L</div>
          </div>

          {/* Card 5: Last Pre-Market Run */}
          <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 space-y-1">
            <div className="text-[11px] text-slate-400 flex items-center justify-between">
              <span>Pre-Market Routine</span>
              <Clock className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <div className="text-xs font-mono font-medium text-slate-200 truncate">
              {status?.lastPreMarketRun ? status.lastPreMarketRun : 'Pending'}
            </div>
            <div className="text-[10px] text-slate-500">08:45 IST Auto Cycle</div>
          </div>

          {/* Card 6: Database Storage */}
          <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 space-y-1">
            <div className="text-[11px] text-slate-400 flex items-center justify-between">
              <span>Storage Size</span>
              <FileText className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <div className="text-base font-bold font-mono text-slate-200">
              {stats?.databaseSizeKB || 0} KB
            </div>
            <div className="text-[10px] text-emerald-400">Crash-Safe JSONL</div>
          </div>
        </div>
      </div>

      {/* 3. Sub-Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('AUDIT_LEDGER')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'AUDIT_LEDGER'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Permanent Prediction Audits</span>
            <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-[10px] font-mono text-slate-300">
              {audits.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('PAPER_TRADES')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'PAPER_TRADES'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Autonomous Paper Orders</span>
            <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-[10px] font-mono text-slate-300">
              {trades.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('LOGS')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'LOGS'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Scheduler Telemetry</span>
            <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-[10px] font-mono text-slate-300">
              {logs.length}
            </span>
          </button>
        </div>

        <button
          onClick={() => {
            if (activeTab === 'AUDIT_LEDGER') fetchAudits();
            if (activeTab === 'PAPER_TRADES') fetchTrades();
            if (activeTab === 'LOGS') fetchLogs();
            fetchStatus();
          }}
          className="text-xs text-slate-400 hover:text-cyan-400 flex items-center gap-1 cursor-pointer transition-colors"
        >
          <RefreshCw className="w-3 h-3" />
          <span>Refresh View</span>
        </button>
      </div>

      {/* ==================================================================== */}
      {/* TAB 1: PERMANENT PREDICTION AUDIT LEDGER                              */}
      {/* ==================================================================== */}
      {activeTab === 'AUDIT_LEDGER' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3 bg-slate-900/60 border border-slate-800 rounded-lg">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Search className="w-3.5 h-3.5" />
              </span>
              <input
                type="text"
                placeholder="Search symbol (e.g. CIPLA, RELIANCE)..."
                value={auditSearchSymbol}
                onChange={(e) => setAuditSearchSymbol(e.target.value)}
                className="px-2.5 py-1 rounded bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 w-52"
              />

              <div className="flex items-center gap-1 ml-2">
                <button
                  onClick={() => setAuditFilterOutcome('ALL')}
                  className={`px-2.5 py-1 rounded text-xs transition-colors cursor-pointer ${
                    auditFilterOutcome === 'ALL'
                      ? 'bg-slate-700 text-white font-semibold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  All Outcomes
                </button>
                <button
                  onClick={() => setAuditFilterOutcome('VERIFIED_WIN')}
                  className={`px-2.5 py-1 rounded text-xs transition-colors cursor-pointer ${
                    auditFilterOutcome === 'VERIFIED_WIN'
                      ? 'bg-emerald-900/70 border border-emerald-500/50 text-emerald-300 font-semibold'
                      : 'text-slate-400 hover:text-emerald-400'
                  }`}
                >
                  Wins Only
                </button>
                <button
                  onClick={() => setAuditFilterOutcome('VERIFIED_LOSS')}
                  className={`px-2.5 py-1 rounded text-xs transition-colors cursor-pointer ${
                    auditFilterOutcome === 'VERIFIED_LOSS'
                      ? 'bg-amber-900/70 border border-amber-500/50 text-amber-300 font-semibold'
                      : 'text-slate-400 hover:text-amber-400'
                  }`}
                >
                  Lessons / Recalibrations
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span>Show:</span>
              {[25, 50, 100].map((lim) => (
                <button
                  key={lim}
                  onClick={() => setAuditLimit(lim)}
                  className={`px-2 py-0.5 rounded text-xs cursor-pointer ${
                    auditLimit === lim
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-mono'
                      : 'hover:text-white text-slate-500'
                  }`}
                >
                  {lim}
                </button>
              ))}
            </div>
          </div>

          {/* Audit List */}
          {auditsLoading ? (
            <div className="p-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
              <span>Querying permanent historical audits from .data/prediction_audits.jsonl...</span>
            </div>
          ) : audits.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500 bg-slate-900/40 border border-slate-800 rounded-lg">
              No audit records match the current filters. Run the 16:30 post-market audit cycle to record newly graded outcomes.
            </div>
          ) : (
            <div className="space-y-2.5">
              {audits.map((audit) => {
                const isWin = audit.outcome === 'VERIFIED_WIN';
                const isLoss = audit.outcome === 'VERIFIED_LOSS';

                return (
                  <div
                    key={audit.id}
                    className={`p-3.5 rounded-lg bg-slate-950 border transition-all ${
                      isWin
                        ? 'border-emerald-500/30 hover:border-emerald-500/60'
                        : isLoss
                          ? 'border-amber-500/30 hover:border-amber-500/60'
                          : 'border-slate-800'
                    }`}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span
                            className={`font-bold flex items-center gap-1 ${
                              isWin ? 'text-emerald-400' : isLoss ? 'text-amber-400' : 'text-cyan-400'
                            }`}
                          >
                            {isWin ? (
                              <Check className="w-3 h-3" />
                            ) : (
                              <AlertTriangle className="w-3 h-3" />
                            )}
                            {isWin ? 'VERIFIED WIN' : isLoss ? 'LESSON & RECALIBRATION' : 'TRACKING'}
                          </span>
                          <span className="text-slate-600">·</span>
                          <span className="font-bold text-white font-mono">
                            {audit.symbol.replace('.NS', '')}
                          </span>
                          <span className="text-slate-400">({audit.sector})</span>
                          <span className="text-slate-600">·</span>
                          <span className="font-mono text-slate-300">
                            Predicted {audit.predictedDirection} @ ₹{audit.entryPrice.toLocaleString('en-IN')} → ₹{audit.evaluatedPrice.toLocaleString('en-IN')}
                          </span>
                          <span
                            className={`font-mono font-bold ${
                              audit.realizedReturnPct >= 0 ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            ({audit.realizedReturnPct >= 0 ? '+' : ''}{audit.realizedReturnPct}%)
                          </span>
                          <span className="text-slate-600">·</span>
                          <span className="text-slate-400 text-[11px]">
                            Evaluated: {audit.evaluatedDate}
                          </span>
                        </div>

                        <p className="text-xs text-slate-300 leading-relaxed">
                          {audit.rootCauseLesson}
                        </p>

                        <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-slate-400">
                          <span>Lead Agent: <strong className="text-slate-200">{audit.leadAgent}</strong></span>
                          {audit.supportingAgents && audit.supportingAgents.length > 0 && (
                            <>
                              <span>·</span>
                              <span>Supporting: <span className="text-emerald-300">{audit.supportingAgents.join(', ')}</span></span>
                            </>
                          )}
                          {audit.dissentingAgents && audit.dissentingAgents.length > 0 && (
                            <>
                              <span>·</span>
                              <span>Dissent: <span className="text-rose-300">{audit.dissentingAgents.join(', ')}</span></span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="shrink-0 text-right space-y-1">
                        <div className="text-xs font-mono text-cyan-400">
                          {audit.weightAdjustmentApplied}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          ID: {audit.id.slice(0, 18)}...
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 2: AUTONOMOUS 5-AGENT PAPER TRADES BLOTTER                        */}
      {/* ==================================================================== */}
      {activeTab === 'PAPER_TRADES' && (
        <div className="space-y-4">
          {/* Status Filters */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-900/60 border border-slate-800 rounded-lg">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-400 mr-1">Status:</span>
              {(['ALL', 'OPEN', 'TARGET_HIT', 'STOP_HIT', 'SQUARED_OFF'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setTradesFilterStatus(st)}
                  className={`px-2.5 py-1 rounded text-xs transition-colors cursor-pointer ${
                    tradesFilterStatus === st
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {st === 'ALL' ? 'All Orders' : st}
                </button>
              ))}
            </div>

            <div className="text-xs text-slate-400">
              Orders automatically created at 08:45 IST when Ensemble Conviction is ≥88%.
            </div>
          </div>

          {/* Trades Blotter Table */}
          {tradesLoading ? (
            <div className="p-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
              <span>Loading autonomous paper executions...</span>
            </div>
          ) : trades.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500 bg-slate-900/40 border border-slate-800 rounded-lg">
              No paper orders recorded for this filter. Trigger the 08:45 Pre-Market cycle above to simulate high-conviction paper orders.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-800">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 font-mono text-[11px]">
                  <tr>
                    <th className="p-3">Order ID / Symbol</th>
                    <th className="p-3">Side & Segment</th>
                    <th className="p-3">Qty & Entry</th>
                    <th className="p-3">Target / Stop-Loss</th>
                    <th className="p-3">Exit Price</th>
                    <th className="p-3">Realized P&L</th>
                    <th className="p-3">Status & Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 bg-slate-900/50">
                  {trades.map((t) => {
                    const isProfit = (t.pnlInr || 0) > 0;
                    const isLoss = (t.pnlInr || 0) < 0;

                    return (
                      <tr key={t.orderId} className="hover:bg-slate-850/60 transition-colors">
                        <td className="p-3 font-mono">
                          <div className="font-bold text-white">{t.symbol}</div>
                          <div className="text-[10px] text-slate-500">{t.orderId}</div>
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              t.side === 'BUY'
                                ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40'
                                : 'bg-rose-950/80 text-rose-300 border border-rose-500/40'
                            }`}
                          >
                            {t.side}
                          </span>
                          <span className="text-slate-400 ml-1.5 text-[11px] font-mono">{t.segment}</span>
                        </td>
                        <td className="p-3 font-mono">
                          <div>{t.qty} shares</div>
                          <div className="text-slate-400 text-[11px]">₹{t.entryPrice.toLocaleString('en-IN')}</div>
                        </td>
                        <td className="p-3 font-mono text-[11px]">
                          <div className="text-emerald-400">Tgt: ₹{t.targetPrice?.toLocaleString('en-IN') ?? '—'}</div>
                          <div className="text-rose-400">SL: ₹{t.stopLossPrice?.toLocaleString('en-IN') ?? '—'}</div>
                        </td>
                        <td className="p-3 font-mono">
                          {t.exitPrice ? `₹${t.exitPrice.toLocaleString('en-IN')}` : '—'}
                        </td>
                        <td className="p-3 font-mono font-bold">
                          <span className={isProfit ? 'text-emerald-400' : isLoss ? 'text-rose-400' : 'text-slate-400'}>
                            {t.pnlInr >= 0 ? '+' : ''}₹{t.pnlInr.toLocaleString('en-IN')}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                t.status === 'TARGET_HIT'
                                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                                  : t.status === 'STOP_HIT'
                                    ? 'bg-rose-950 text-rose-300 border border-rose-500/30'
                                    : t.status === 'SQUARED_OFF'
                                      ? 'bg-amber-950 text-amber-300 border border-amber-500/30'
                                      : 'bg-sky-950 text-sky-300 border border-sky-500/30'
                              }`}
                            >
                              {t.status}
                            </span>
                          </div>
                          {t.closeReason && (
                            <div className="text-[10px] text-slate-400 mt-0.5 max-w-xs truncate" title={t.closeReason}>
                              {t.closeReason}
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
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 3: SCHEDULER TELEMETRY & EVENT LOG                                */}
      {/* ==================================================================== */}
      {activeTab === 'LOGS' && (
        <div className="space-y-4">
          <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-lg text-xs text-slate-400">
            Audit trail of background routines, auto square-offs, and Bayesian recalibrations executed by the Autonomous Scheduler.
          </div>

          {logsLoading ? (
            <div className="p-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
              <span>Loading telemetry events from .data/scheduler_events.jsonl...</span>
            </div>
          ) : logs.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500 bg-slate-900/40 border border-slate-800 rounded-lg">
              No scheduler events logged yet. Events will appear automatically as background routines execute.
            </div>
          ) : (
            <div className="space-y-2 font-mono text-xs">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        log.routine === 'PRE_MARKET'
                          ? 'bg-sky-950 text-sky-300 border border-sky-500/40'
                          : log.routine === 'INTRADAY_SQUAREOFF'
                            ? 'bg-amber-950 text-amber-300 border border-amber-500/40'
                            : log.routine === 'POST_MARKET_AUDIT'
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                              : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {log.routine}
                    </span>
                    <span className="text-slate-200 font-sans">{log.message}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 shrink-0">
                    {new Date(log.timestamp).toLocaleTimeString('en-IN', { hour12: false })} · {new Date(log.timestamp).toLocaleDateString('en-IN')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
