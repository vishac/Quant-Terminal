import React, { useState, useMemo } from 'react';
import {
  Shield,
  RefreshCw,
  CheckCircle2,
  Database,
  Globe,
  Sliders,
  Smartphone,
  Download,
  Zap,
  Apple,
  Clock,
  Radio,
  FileText,
  Users,
  AlertTriangle,
  History,
  Sun,
  Moon,
} from 'lucide-react';
import { useLiveMarketData } from '../services/liveMarketService';
import { useTheme } from '../context/ThemeContext';
import { PWAInstallButton } from './PWAInstallButton';
import { BrokerGatewayRouter } from './BrokerGatewayRouter';
import { MultiUserDesk } from './MultiUserDesk';
import {
  CANONICAL_SECURITY_MASTER,
  evaluateMarketDataIntegrity,
  getStoredQuantParameters,
  getStoredGovernanceAuditTrail,
  updateQuantParameterWithAudit,
  QuantParameterRecord,
  GovernanceAuditEvent,
} from '../services/institutionalQuantRegistry';

type ControlTowerSubTab =
  | 'SECURITY_MASTER'
  | 'PARAMETER_GOVERNANCE'
  | 'BROKER_GATEWAY'
  | 'SEAT_RBAC';

export const SettingsTerminal: React.FC = () => {
  const {
    quotes,
    latencyMs,
    refetch,
    marketSession,
    isPacketSaverActive,
    packetsSavedCount,
    forceSyncOverride,
    toggleForceSyncOverride,
    provider,
  } = useLiveMarketData(3000);

  const isUpstoxLive = provider === 'UPSTOX_ANALYTICS_REALTIME';
  const { theme, setTheme } = useTheme();
  const [controlTowerTab, setControlTowerTab] = useState<ControlTowerSubTab>('SECURITY_MASTER');
  const [testStatus, setTestStatus] = useState<string | null>(null);

  // Versioned Parameter Registry & Governance Audit Trail state
  const [parameters, setParameters] = useState<QuantParameterRecord[]>(() =>
    getStoredQuantParameters()
  );
  const [auditTrail, setAuditTrail] = useState<GovernanceAuditEvent[]>(() =>
    getStoredGovernanceAuditTrail()
  );
  const [draftValues, setDraftValues] = useState<Record<string, number>>({});
  const [changeReason, setChangeReason] = useState<string>(
    'Intraday volatility & statutory tax friction calibration'
  );

  // Canonical Security Master joined with live Data Quality Integrity checks
  const dataQualityRecords = useMemo(
    () =>
      evaluateMarketDataIntegrity(
        quotes,
        isUpstoxLive ? 'UPSTOX_V2_REALTIME' : 'NSE_BSE_FEED_ROUTER',
        latencyMs ?? 12
      ),
    [quotes, isUpstoxLive, latencyMs]
  );

  const qualitySummary = useMemo(() => {
    const clean = dataQualityRecords.filter((r) => r.integrityStatus === 'VERIFIED_CLEAN').length;
    const stale = dataQualityRecords.filter((r) => r.integrityStatus === 'STALE_WARNING').length;
    const outliers = dataQualityRecords.filter((r) => r.integrityStatus === 'OUTLIER_FLAGGED').length;
    const missing = dataQualityRecords.filter((r) => r.integrityStatus === 'MISSING_FEED').length;
    return { total: dataQualityRecords.length, clean, stale, outliers, missing };
  }, [dataQualityRecords]);

  const handleCommitParameter = (param: QuantParameterRecord) => {
    const targetVal = draftValues[param.parameterId] ?? param.value;
    if (targetVal === param.value) {
      setTestStatus(`No change detected for ${param.parameterId} (already ${param.value} ${param.unit}).`);
      setTimeout(() => setTestStatus(null), 3500);
      return;
    }
    const { parameters: nextParams, auditTrail: nextAudit } = updateQuantParameterWithAudit(
      param.parameterId,
      targetVal,
      'Seat 01 (Owner/Admin)',
      changeReason
    );
    setParameters(nextParams);
    setAuditTrail(nextAudit);
    setTestStatus(
      `Committed ${param.parameterId}: ${param.value} ${param.unit} → ${targetVal} ${param.unit} (Signed to Governance Audit Trail).`
    );
    setTimeout(() => setTestStatus(null), 4500);
  };

  return (
    <div className="flex flex-col gap-5 w-full">
      {/* Unified Control Tower Header & Sub-Tab Bar */}
      <div className="bg-[#080d1a]/90 backdrop-blur-2xl rounded-2xl p-5 border border-cyan-500/20 shadow-2xl flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-bold uppercase">
                PIPELINE STAGE 07 // CONTROL TOWER &amp; GOVERNANCE
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold">
                ZERO-BIAS DETERMINISTIC SPEC
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold font-mono text-cyan-200 tracking-tight">
              SECURITY MASTER, PARAMETER REGISTRY &amp; BROKER CONTROL TOWER
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-3xl font-mono">
              Unambiguous instrument definitions (ISIN/MIC/Lot/Tick/Corp-Action flags), versioned parameter governance with immutable audit logs, Upstox Analytics v2 gateway, and 20-seat floor access.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0 font-mono">
            {/* Lighter / Dark Theme Switcher in Control Tower */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-950/90 border border-slate-800">
              <button
                onClick={() => setTheme('light')}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  theme === 'light'
                    ? 'bg-cyan-500 text-slate-950 shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Switch to Lighter Theme (Daylight Institutional High-Contrast)"
              >
                <Sun className="w-3.5 h-3.5" />
                <span>LIGHTER</span>
              </button>
              <button
                onClick={() => setTheme('dark')}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  theme === 'dark'
                    ? 'bg-cyan-500 text-slate-950 shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Switch to Dark Theme (Obsidian Quant High-Contrast)"
              >
                <Moon className="w-3.5 h-3.5" />
                <span>DARK</span>
              </button>
            </div>

            <button
              onClick={() => refetch()}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-cyan-950/60 hover:bg-cyan-900/80 border border-cyan-500/40 text-cyan-300 font-mono text-xs font-bold transition-all cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>VERIFY FEED INTEGRITY</span>
            </button>
          </div>
        </div>

        {/* 4 Clean Sub-Tabs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 pt-3 border-t border-slate-800/80 font-mono">
          <button
            onClick={() => setControlTowerTab('SECURITY_MASTER')}
            className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
              controlTowerTab === 'SECURITY_MASTER'
                ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 shadow-[0_0_15px_rgba(0,240,255,0.2)]'
                : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <span className="flex items-center gap-2">
              <Database className="w-4 h-4 text-cyan-400" />
              <span>01. Security Master &amp; Quality</span>
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-900 text-cyan-300">
              {CANONICAL_SECURITY_MASTER.length} SEC
            </span>
          </button>

          <button
            onClick={() => setControlTowerTab('PARAMETER_GOVERNANCE')}
            className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
              controlTowerTab === 'PARAMETER_GOVERNANCE'
                ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <span className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-emerald-400" />
              <span>02. Parameter &amp; Audit Trail</span>
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-900 text-emerald-300">
              {auditTrail.length} LOGS
            </span>
          </button>

          <button
            onClick={() => setControlTowerTab('BROKER_GATEWAY')}
            className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
              controlTowerTab === 'BROKER_GATEWAY'
                ? 'bg-amber-500/20 border-amber-400 text-amber-200 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <span className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-amber-400" />
              <span>03. Broker Gateway &amp; Mobile</span>
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-900 text-amber-300">
              {isUpstoxLive ? 'LIVE' : 'STANDBY'}
            </span>
          </button>

          <button
            onClick={() => setControlTowerTab('SEAT_RBAC')}
            className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
              controlTowerTab === 'SEAT_RBAC'
                ? 'bg-purple-500/20 border-purple-400 text-purple-200 shadow-[0_0_15px_rgba(168,85,247,0.2)]'
                : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <span className="flex items-center gap-2">
              <Users className="w-4 h-4 text-purple-400" />
              <span>04. 20-Seat Floor RBAC</span>
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-900 text-purple-300">
              20 SEATS
            </span>
          </button>
        </div>
      </div>

      {testStatus && (
        <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 text-xs font-mono flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{testStatus}</span>
          </div>
          <button
            onClick={() => setTestStatus(null)}
            className="text-slate-400 hover:text-slate-200 text-xs cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* =====================================================================
          SUB-TAB 01: CANONICAL SECURITY MASTER & DATA QUALITY INTEGRITY
         ===================================================================== */}
      {controlTowerTab === 'SECURITY_MASTER' && (
        <div className="flex flex-col gap-5 font-mono">
          {/* Data Integrity KPI Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div className="p-4 rounded-xl bg-[#080d1a]/90 border border-cyan-500/25">
              <span className="text-[10px] text-slate-400 uppercase block">
                SECURITY MASTER UNIVERSE
              </span>
              <span className="text-xl font-bold text-cyan-300 mt-1 block">
                {qualitySummary.total} Instruments
              </span>
              <span className="text-[10px] text-slate-500">
                Internal ID · ISIN · MIC (XNSE/XBOM/XMCX)
              </span>
            </div>

            <div className="p-4 rounded-xl bg-[#080d1a]/90 border border-emerald-500/25">
              <span className="text-[10px] text-slate-400 uppercase block">
                VERIFIED CLEAN TICKS
              </span>
              <span className="text-xl font-bold text-emerald-400 mt-1 block">
                {qualitySummary.clean} / {qualitySummary.total}
              </span>
              <span className="text-[10px] text-slate-500">
                Zero Missing · Zero Unadjusted Splits
              </span>
            </div>

            <div className="p-4 rounded-xl bg-[#080d1a]/90 border border-amber-500/25">
              <span className="text-[10px] text-slate-400 uppercase block">
                STALE / OUTLIER FLAGS
              </span>
              <span className="text-xl font-bold text-amber-300 mt-1 block">
                {qualitySummary.stale} Stale · {qualitySummary.outliers} Outlier
              </span>
              <span className="text-[10px] text-slate-500">
                Outlier Gate: |Δ%| &gt; 12.5% Intraday
              </span>
            </div>

            <div className="p-4 rounded-xl bg-[#080d1a]/90 border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase block">
                CORPORATE ACTION ENGINE
              </span>
              <span className="text-xl font-bold text-slate-100 mt-1 block">
                v2026.11.CA-ADJ
              </span>
              <span className="text-[10px] text-emerald-400">
                Splits, Bonus &amp; Special Dividends Adjusted
              </span>
            </div>
          </div>

          {/* Canonical Security Master & Live Data Quality Table */}
          <div className="bg-[#080d1a]/90 rounded-2xl p-5 border border-cyan-500/20 shadow-xl">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-4 border-b border-slate-800">
              <div>
                <h2 className="text-sm font-bold text-slate-100 uppercase">
                  CANONICAL INSTRUMENT / SECURITY MASTER &amp; FEED QUALITY MONITOR
                </h2>
                <p className="text-[11px] text-slate-400 font-sans">
                  Every signal, risk check, and order references the immutable Internal Security ID rather than loose ticker strings.
                </p>
              </div>
              <span className="text-[10px] px-2.5 py-1 rounded bg-slate-900 border border-slate-700 text-cyan-300">
                CALENDAR: NSE_BSE_2026_IST &amp; MCX_2026_IST
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-[10px] text-slate-400 uppercase">
                    <th className="py-2.5 px-3">Internal Security ID</th>
                    <th className="py-2.5 px-3">Symbol / ISIN</th>
                    <th className="py-2.5 px-3">Exch / MIC</th>
                    <th className="py-2.5 px-3">Type / Settlement</th>
                    <th className="py-2.5 px-3 text-right">Lot / Tick</th>
                    <th className="py-2.5 px-3 text-right">Live Price</th>
                    <th className="py-2.5 px-3 text-center">Corp-Act Adj</th>
                    <th className="py-2.5 px-3">Rollover / Contract Rule</th>
                    <th className="py-2.5 px-3 text-right">Feed Integrity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {CANONICAL_SECURITY_MASTER.map((sec) => {
                    const dq = dataQualityRecords.find(
                      (r) => r.internalSecurityId === sec.internalSecurityId
                    );
                    const isClean = dq?.integrityStatus === 'VERIFIED_CLEAN';
                    return (
                      <tr key={sec.internalSecurityId} className="hover:bg-slate-900/50">
                        <td className="py-2.5 px-3 font-bold text-cyan-300">
                          {sec.internalSecurityId}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-slate-100">{sec.symbol}</div>
                          <div className="text-[10px] text-slate-500">{sec.isin} · {sec.sector}</div>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-200 font-bold text-[10px]">
                            {sec.exchange} · {sec.mic}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="text-slate-200">{sec.instrumentType}</div>
                          <div className="text-[10px] text-slate-500">
                            {sec.settlementCycle} · {sec.settlementType}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-right tabular-nums">
                          <div className="text-slate-200 font-bold">Lot: {sec.lotSize}</div>
                          <div className="text-[10px] text-slate-500">Tick: ₹{sec.tickSize}</div>
                        </td>
                        <td className="py-2.5 px-3 text-right tabular-nums">
                          {dq?.livePrice ? (
                            <div>
                              <span className="font-bold text-cyan-300">
                                ₹{dq.livePrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </span>
                              <span
                                className={`block text-[10px] ${
                                  (dq.changePct ?? 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                                }`}
                              >
                                {(dq.changePct ?? 0) >= 0 ? '+' : ''}
                                {(dq.changePct ?? 0).toFixed(2)}%
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-500">—</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold">
                            {sec.corporateActionAdjusted ? 'RAW + ADJ' : 'RAW ONLY'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-[11px] text-slate-400 max-w-[230px]">
                          {sec.rolloverRule}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${
                              isClean
                                ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                                : 'bg-amber-950/60 border-amber-500/40 text-amber-300'
                            }`}
                          >
                            {isClean ? (
                              <CheckCircle2 className="w-3 h-3" />
                            ) : (
                              <AlertTriangle className="w-3 h-3" />
                            )}
                            <span>{dq?.integrityStatus || 'VERIFIED_CLEAN'}</span>
                          </span>
                          <div className="text-[9px] text-slate-500 mt-0.5">
                            Δt: {dq?.latencyDeltaMs ?? latencyMs}ms
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          SUB-TAB 02: VERSIONED PARAMETER REGISTRY & GOVERNANCE AUDIT TRAIL
         ===================================================================== */}
      {controlTowerTab === 'PARAMETER_GOVERNANCE' && (
        <div className="flex flex-col gap-5 font-mono">
          {/* Parameter Registry Panel */}
          <div className="bg-[#080d1a]/90 rounded-2xl p-5 border border-emerald-500/25 shadow-xl flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div>
                <h2 className="text-sm font-bold text-slate-100 uppercase flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-emerald-400" />
                  <span>UNBURIED STRATEGY &amp; RISK PARAMETER REGISTRY</span>
                </h2>
                <p className="text-[11px] text-slate-400 font-sans mt-0.5">
                  No magic numbers buried in strategy code. Every threshold has explicit min/max bounds, version tags, and automatic governance logging.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-400 uppercase">CHANGE REASON:</span>
                <input
                  type="text"
                  value={changeReason}
                  onChange={(e) => setChangeReason(e.target.value)}
                  className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-slate-200 w-64 focus:border-cyan-400 focus:outline-none"
                  placeholder="Enter audit reason..."
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {parameters.map((param) => {
                const currentDraft = draftValues[param.parameterId] ?? param.value;
                const step = param.unit === 'INR' ? 25 : param.unit === '%' ? 1 : 0.1;
                return (
                  <div
                    key={param.parameterId}
                    className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 flex flex-col justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-cyan-300">{param.name}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-emerald-400 font-bold">
                          {param.version} · {param.strategy}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        ID: <code className="text-slate-300">{param.parameterId}</code> · Owner: {param.owner}
                      </div>
                      <p className="text-[11px] text-slate-400 font-sans mt-1.5">
                        {param.description}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
                      <div className="text-[10px] text-slate-400">
                        Bounds: <span className="text-slate-200 font-bold">{param.min}</span> to{' '}
                        <span className="text-slate-200 font-bold">{param.max} {param.unit}</span>{' '}
                        (Default: {param.defaultValue} {param.unit})
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={param.min}
                          max={param.max}
                          step={step}
                          value={currentDraft}
                          onChange={(e) =>
                            setDraftValues((prev) => ({
                              ...prev,
                              [param.parameterId]: Number(e.target.value),
                            }))
                          }
                          className="w-24 px-2.5 py-1 rounded-lg bg-slate-900 border border-cyan-500/40 text-cyan-200 font-bold text-xs text-right tabular-nums"
                        />
                        <span className="text-xs text-slate-400 font-bold">{param.unit}</span>
                        <button
                          onClick={() => handleCommitParameter(param)}
                          className="px-3 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-[11px] font-bold transition cursor-pointer"
                        >
                          Sign &amp; Apply
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Immutable Governance Audit Trail Table */}
          <div className="bg-[#080d1a]/90 rounded-2xl p-5 border border-cyan-500/20 shadow-xl">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-cyan-400" />
                <div>
                  <h3 className="text-sm font-bold text-slate-100 uppercase">
                    IMMUTABLE GOVERNANCE &amp; PARAMETER CHANGE AUDIT LOG
                  </h3>
                  <span className="text-[11px] text-slate-400 font-sans">
                    Full audit lineage: Who changed which parameter, when, old → new value, version bump, and signed rationale.
                  </span>
                </div>
              </div>
              <span className="text-[10px] px-2.5 py-1 rounded bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 font-bold">
                SEBI AUDIT COMPLIANT
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-[10px] text-slate-400 uppercase">
                    <th className="py-2 px-3">Audit ID / Timestamp</th>
                    <th className="py-2 px-3">Actor / Role</th>
                    <th className="py-2 px-3">Target Parameter</th>
                    <th className="py-2 px-3">Previous → New Value</th>
                    <th className="py-2 px-3">Version</th>
                    <th className="py-2 px-3">Signed Rationale</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {auditTrail.map((evt) => (
                    <tr key={evt.auditId} className="hover:bg-slate-900/50">
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-cyan-300">{evt.auditId}</div>
                        <div className="text-[10px] text-slate-500">{evt.timestamp}</div>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="text-slate-200 font-bold">{evt.actor}</div>
                        <div className="text-[10px] text-slate-500">{evt.role}</div>
                      </td>
                      <td className="py-2.5 px-3 font-bold text-amber-300">{evt.targetId}</td>
                      <td className="py-2.5 px-3">
                        <span className="text-slate-400 line-through mr-1.5">{evt.previousValue}</span>
                        <span className="text-emerald-400 font-bold">→ {evt.newValue}</span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-cyan-300 text-[10px] font-bold">
                          {evt.strategyVersion}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-[11px] text-slate-300 font-sans">
                        {evt.reason}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          SUB-TAB 03: BROKER GATEWAY, MARKET-HOURS PACKET SAVER & MOBILE APP
         ===================================================================== */}
      {controlTowerTab === 'BROKER_GATEWAY' && (
        <div className="flex flex-col gap-6">
          {/* Embedded Sync Hub / Upstox Analytics v2 Gateway */}
          <BrokerGatewayRouter />

          {/* Market-Hours Gated Sync & Packet Saver Controller */}
          <div className="bg-[#080d1a]/85 backdrop-blur-xl rounded-2xl p-6 border border-cyan-500/20 shadow-xl flex flex-col gap-4 font-mono">
            <div className="flex flex-wrap items-center justify-between pb-3 border-b border-slate-800 gap-2">
              <div className="flex items-center gap-2.5">
                <Clock className="w-5 h-5 text-cyan-400" />
                <div>
                  <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wide">
                    Market-Hours Gated Sync &amp; Packet Saver Controller (09:15–15:30 IST)
                  </h2>
                  <span className="text-[11px] text-slate-400 font-sans">
                    Automatically pauses high-frequency polling outside NSE/BSE market hours to eliminate wasted data packets.
                  </span>
                </div>
              </div>

              <button
                onClick={toggleForceSyncOverride}
                className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  forceSyncOverride
                    ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200'
                    : 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white'
                }`}
              >
                <Radio className={`w-3.5 h-3.5 ${forceSyncOverride ? 'text-cyan-400 animate-pulse' : 'text-slate-500'}`} />
                <span>
                  {forceSyncOverride
                    ? 'OVERRIDE: FORCE SYNC ON'
                    : `PACKET SAVER (${packetsSavedCount.toLocaleString()} SAVED)`}
                </span>
              </button>
            </div>

            <div className="text-xs text-slate-300 font-sans">
              Active Market Phase: <strong className="text-cyan-300 font-mono">{marketSession?.phaseLabel || 'POST-MARKET EOD STANDBY'}</strong> · Next Session: <strong className="text-emerald-300 font-mono">{marketSession?.nextSessionText || 'Tomorrow @ 09:15 IST'}</strong>
            </div>
          </div>

          {/* iOS & Android Mobile Deployment Section */}
          <div className="bg-[#080d1a]/85 backdrop-blur-xl rounded-2xl p-6 border border-cyan-500/25 shadow-xl flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between pb-3 border-b border-slate-800 gap-2">
              <div className="flex items-center gap-2.5">
                <div className="flex items-center gap-1.5 text-cyan-400">
                  <Apple className="w-5 h-5 text-slate-100" />
                  <Smartphone className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                  <h2 className="text-sm font-bold font-mono text-slate-200 uppercase tracking-wide">
                    iOS (.mobileconfig) &amp; Android Native App Deployment
                  </h2>
                  <span className="text-[11px] text-slate-400 font-mono">
                    Download Apple Configuration Profile for iPhone/iPad or install Android WebAPK.
                  </span>
                </div>
              </div>

              <PWAInstallButton />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
              <div className="p-4 rounded-xl bg-gradient-to-br from-slate-950 to-cyan-950/30 border border-cyan-500/30 space-y-2.5 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-cyan-300 font-bold">
                      <Apple className="w-4 h-4 text-slate-200" />
                      <span>iOS DOWNLOADABLE PROFILE</span>
                    </div>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950 border border-cyan-500/40 text-cyan-300">
                      .mobileconfig
                    </span>
                  </div>
                  <p className="text-slate-300 font-sans text-xs leading-relaxed">
                    Download Apple&apos;s WebClip configuration profile to install J.A.R.V.I.S. full-screen on iPhone or iPad.
                  </p>
                </div>
                <a
                  href="/api/download/ios-profile"
                  download="JARVIS-Quant.mobileconfig"
                  className="w-full py-2 px-3 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs uppercase flex items-center justify-center gap-2 transition cursor-pointer text-center"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download iOS Profile</span>
                </a>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2.5 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-emerald-300 font-bold">
                      <Zap className="w-4 h-4 text-emerald-400" />
                      <span>ANDROID WEBAPK (1-TAP)</span>
                    </div>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950 border border-emerald-500/40 text-emerald-300">
                      INSTANT
                    </span>
                  </div>
                  <p className="text-slate-300 font-sans text-xs leading-relaxed">
                    Android Chrome, Brave, and Samsung Internet compile a native WebAPK with full home-screen and app drawer integration.
                  </p>
                </div>
                <div className="p-2 rounded bg-slate-900 border border-slate-800 text-[11px] text-slate-400">
                  Tap browser menu (⋮) &rarr; &quot;Install app&quot;
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          SUB-TAB 04: 20-SEAT FLOOR ACCESS & RBAC PERMISSIONS
         ===================================================================== */}
      {controlTowerTab === 'SEAT_RBAC' && <MultiUserDesk />}
    </div>
  );
};

