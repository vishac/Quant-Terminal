import React, { useState, useMemo, useEffect } from 'react';
import { useLiveMarketData } from '../services/liveMarketService';
import { PaperTradeOrder } from '../types/quant';
import { getStoredPaperTrades, persistPaperTrades } from '../services/paperTradeService';
import {
  BRUTAL_STRESS_PRESETS,
  MacroStressOverrideConfig,
  loadMacroStressConfig,
  saveMacroStressConfig,
  resetToLiveExchangeMacroFeed,
  evaluateElevenVectorMacroMatrix,
  computeBayesianStrategyPosteriors,
  runBrutalTenPointStressAudit,
  applyAsymmetricMacroShockShield,
} from '../services/macroCausalLearningEngine';
import {
  executeIntelligentScanAndDeploy,
  getLastScanVetoAuditBatch,
  ScanAndDeployAuditBatch,
} from '../services/statutoryVetoEngine';
import {
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Zap,
  RotateCcw,
  Sliders,
  Layers,
  TrendingUp,
  TrendingDown,
  Activity,
  Bot,
  Scale,
  ArrowRight,
  Lock,
  Radio,
  Flame,
} from 'lucide-react';

interface BrutalStressTestLabProps {
  onNavigateToAgents?: () => void;
  onNavigateToOrders?: () => void;
}

export const BrutalStressTestLab: React.FC<BrutalStressTestLabProps> = ({
  onNavigateToAgents,
  onNavigateToOrders,
}) => {
  const { quotes } = useLiveMarketData(5000);
  const [orders, setOrders] = useState<PaperTradeOrder[]>(() => getStoredPaperTrades());
  const [stressConfig, setStressConfig] = useState<MacroStressOverrideConfig>(() =>
    loadMacroStressConfig()
  );
  const [lastScanAudit, setLastScanAudit] = useState<ScanAndDeployAuditBatch | null>(() =>
    getLastScanVetoAuditBatch()
  );
  const [actionBanner, setActionBanner] = useState<string | null>(null);
  const [activeSubView, setActiveSubView] = useState<
    'TEN_POINT_AUDIT' | 'ELEVEN_VECTORS' | 'FII_DII_SECTOR_MATRIX' | 'INTER_AGENT_DEBATE'
  >('TEN_POINT_AUDIT');

  useEffect(() => {
    const syncOrders = () => setOrders(getStoredPaperTrades());
    const syncAudit = () => setLastScanAudit(getLastScanVetoAuditBatch());
    const syncStress = () => setStressConfig(loadMacroStressConfig());
    window.addEventListener('jarvis:orders-updated', syncOrders);
    window.addEventListener('jarvis:scan-veto-audit', syncAudit);
    window.addEventListener('jarvis:macro-stress-updated', syncStress);
    return () => {
      window.removeEventListener('jarvis:orders-updated', syncOrders);
      window.removeEventListener('jarvis:scan-veto-audit', syncAudit);
      window.removeEventListener('jarvis:macro-stress-updated', syncStress);
    };
  }, []);

  const macroSnapshot = useMemo(
    () => evaluateElevenVectorMacroMatrix(quotes, orders, stressConfig),
    [quotes, orders, stressConfig]
  );

  const bayesianPosteriors = useMemo(
    () => computeBayesianStrategyPosteriors(quotes, orders, stressConfig),
    [quotes, orders, stressConfig]
  );

  const tenPointChecks = useMemo(
    () => runBrutalTenPointStressAudit(quotes, orders, stressConfig),
    [quotes, orders, stressConfig]
  );

  const passedChecksCount = tenPointChecks.filter((c) => c.passed).length;

  const handleSelectPreset = (presetKey: string) => {
    const next = BRUTAL_STRESS_PRESETS[presetKey] || BRUTAL_STRESS_PRESETS.LIVE_EXCHANGE_FEED;
    setStressConfig(next);
    saveMacroStressConfig(next);
    setActionBanner(
      `Loaded Scenario [${next.presetLabel}] -> Recomputed 12 Causal Vectors (incl. 2026 US Mid-Terms), 3-Layer FII/DII Flows & 5-Agent Council Weights.`
    );
  };

  const handleUpdateCustomSlider = (patch: Partial<MacroStressOverrideConfig>) => {
    const updated: MacroStressOverrideConfig = {
      ...stressConfig,
      ...patch,
      mode: 'STRESS_TEST_SANDBOX',
      presetId: 'CUSTOM_SHOCK',
      presetLabel: 'Custom Multi-Vector Shock Scenario',
    };
    setStressConfig(updated);
    saveMacroStressConfig(updated);
  };

  const handleResetToLiveFeed = () => {
    const live = resetToLiveExchangeMacroFeed();
    setStressConfig(live);
    setActionBanner(
      'Restored 100% Live Exchange Telemetry (/api/market-data & /api/news). All synthetic stress overrides cleared.'
    );
  };

  const handleExecuteShieldAndScan = () => {
    // Step 1: Apply 3-State Asymmetric Shock & Anti-Whipsaw Shield on open orders
    const shieldRes = applyAsymmetricMacroShockShield(orders, quotes, stressConfig);
    // Step 2: Run 5-Stage Inter-Agent Consensus & >2.0% Net Tax Veto Scan
    const scanBatch = executeIntelligentScanAndDeploy(quotes, shieldRes.updatedOrders, 'ALL');
    const mergedOrders = [...scanBatch.deployedOrders, ...shieldRes.updatedOrders];
    persistPaperTrades(mergedOrders);
    setOrders(mergedOrders);
    setLastScanAudit(scanBatch);

    const shieldNote =
      shieldRes.profitLockedCount > 0 || shieldRes.vetoExitedCount > 0
        ? `Shield locked 82% profit on ${shieldRes.profitLockedCount} winner(s) & exited ${shieldRes.vetoExitedCount} macro-vetoed trade(s) to Cash. `
        : '';
    setActionBanner(`${shieldNote}${scanBatch.summaryHeadline}`);
  };

  return (
    <div className="space-y-4 font-mono text-slate-100 pb-10">
      {/* Top Header & Scenario Control Deck */}
      <div className="rounded-xl bg-[#0b101d] border border-cyan-500/30 p-4 shadow-lg">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2 py-0.5 rounded bg-cyan-500/15 border border-cyan-500/40 text-cyan-300 text-[10px] font-bold uppercase tracking-wider">
                CORE 2 · BRUTAL STRESS-TEST LAB & BAYESIAN SELF-LEARNER
              </span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                  stressConfig.mode === 'LIVE_EXCHANGE_FEED'
                    ? 'bg-emerald-950/70 border-emerald-500/40 text-emerald-300'
                    : 'bg-amber-950/80 border-amber-500/50 text-amber-300 animate-pulse'
                }`}
              >
                {stressConfig.mode === 'LIVE_EXCHANGE_FEED'
                  ? '● LIVE EXCHANGE FEED ACTIVE'
                  : `⚡ STRESS SANDBOX: ${stressConfig.presetLabel}`}
              </span>
              <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-emerald-300 text-[10px] font-bold">
                MAX DAILY DRAWDOWN CAP: &le;1.50% (&lt;2.00% LOCKED)
              </span>
            </div>
            <h1 className="text-base sm:text-lg font-bold text-white mt-1.5 font-sans">
              12-Vector Macro, 2026 US Mid-Terms, War, Policy &amp; 3-Layer FII/DII Self-Learning Proving Ground
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              {macroSnapshot.regimeHeadline}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <button
              onClick={handleExecuteShieldAndScan}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition cursor-pointer shadow-md"
            >
              <Zap className="w-4 h-4" />
              <span>Run 5-Agent Council Scan &amp; Shield (&gt;{macroSnapshot.requiredMinNetProfitPct.toFixed(1)}% Net)</span>
            </button>
            {stressConfig.mode !== 'LIVE_EXCHANGE_FEED' && (
              <button
                onClick={handleResetToLiveFeed}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-cyan-500/40 font-bold text-xs transition cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset to Live Feed</span>
              </button>
            )}
            {onNavigateToAgents && (
              <button
                onClick={onNavigateToAgents}
                className="flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs transition cursor-pointer"
              >
                <Bot className="w-3.5 h-3.5 text-cyan-400" />
                <span>5-Agent Desk</span>
              </button>
            )}
            {onNavigateToOrders && (
              <button
                onClick={onNavigateToOrders}
                className="flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs transition cursor-pointer"
              >
                <Scale className="w-3.5 h-3.5 text-amber-400" />
                <span>Order Book ({orders.filter((o) => o.status === 'OPEN').length} Open)</span>
              </button>
            )}
          </div>
        </div>

        {/* Action feedback banner */}
        {actionBanner && (
          <div className="mt-3 p-2.5 rounded-lg bg-cyan-950/50 border border-cyan-500/40 text-xs text-cyan-200 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-cyan-400 shrink-0 animate-pulse" />
              <span>{actionBanner}</span>
            </div>
            <button
              onClick={() => setActionBanner(null)}
              className="text-[11px] text-cyan-400 hover:text-white underline shrink-0"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* 1-Click Institutional Crisis & Regime Presets */}
        <div className="mt-3">
          <div className="text-[11px] text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>Select Live Feed or Inject Brutal Institutional Stress Scenario:</span>
            <span className="text-emerald-400 font-bold">
              10-Point Brutal Audit Score: {passedChecksCount} / {tenPointChecks.length} PASSED
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-2">
            {[
              {
                key: 'LIVE_EXCHANGE_FEED',
                title: '1. Live Exchange Feed',
                sub: '100% Live Ticks + Dynamic FII/DII',
                tone: 'emerald',
              },
              {
                key: 'INDIA_LOKSABHA_US_PRIMARY_SHOCK',
                title: '2. Lok Sabha + US Primary',
                sub: 'Coalition Pivot + US Primary H-1B Vol',
                tone: 'amber',
              },
              {
                key: 'US_MIDTERM_TARIFF_YIELD_SHOCK',
                title: '3. US Mid-Term Shock',
                sub: 'Tariff Sweep · H-1B · 10Y Yield Spike',
                tone: 'amber',
              },
              {
                key: 'WAR_HORMUZ_ESCALATION',
                title: '4. Global War & Oil $115',
                sub: 'War 92/100 · Oil +11.8% · Gold +4.2%',
                tone: 'rose',
              },
              {
                key: 'FED_HAWKISH_JOBS_STAGFLATION',
                title: '5. Fed +50bps & Jobs Miss',
                sub: 'NFP -110K · DXY +1.95% · IT/Pharma',
                tone: 'amber',
              },
              {
                key: 'FII_CAPITULATION_DII_CAPEX',
                title: '6. FII Dump vs DII Capex',
                sub: 'FII -₹6,100Cr · DII +₹6,850Cr · Retail Trap',
                tone: 'cyan',
              },
              {
                key: 'GOVT_WINDFALL_SEBI_POLICY_SHOCK',
                title: '7. Policy & Tax Tightening',
                sub: 'Windfall Tax + SEBI Margin Hike',
                tone: 'purple',
              },
              {
                key: 'GLOBAL_RISK_ON_DEFLATION',
                title: '8. Continuity & Risk-On',
                sub: 'Lok Sabha Continuity + US Gridlock',
                tone: 'emerald',
              },
            ].map((item) => {
              const active = stressConfig.presetId === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => handleSelectPreset(item.key)}
                  className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                    active
                      ? 'bg-cyan-950/70 border-cyan-400 shadow-[0_0_15px_rgba(0,240,255,0.2)]'
                      : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="text-xs font-bold text-white flex items-center justify-between">
                    <span className="truncate">{item.title}</span>
                    {active && <span className="w-2 h-2 rounded-full bg-cyan-400 shrink-0" />}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1 truncate">{item.sub}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Interactive Multi-Vector Fine-Tuning Sliders + India Lok Sabha & US Primary/Mid-Term Election Selectors */}
        <div className="mt-3 pt-3 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
          <div className="bg-slate-900/70 border border-slate-800 rounded-lg p-2">
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>INDIA LOK SABHA</span>
              <span className="font-bold text-emerald-400">VEC #12A</span>
            </div>
            <select
              value={stressConfig.indiaElectionOutcome || 'INDIA_LIVE_CONTINUITY_TRACKING'}
              onChange={(e) =>
                handleUpdateCustomSlider({
                  indiaElectionOutcome: e.target.value as MacroStressOverrideConfig['indiaElectionOutcome'],
                })
              }
              className="w-full mt-1.5 bg-slate-950 border border-slate-700 rounded px-1.5 py-1 text-[10px] text-white font-bold cursor-pointer"
            >
              <option value="INDIA_LIVE_CONTINUITY_TRACKING">Live Continuity Tracking</option>
              <option value="INDIA_LOKSABHA_CONTINUITY_CAPEX">Lok Sabha Majority Capex</option>
              <option value="INDIA_MCC_PRE_POLL_PAUSE">Pre-Poll MCC Tender Pause</option>
              <option value="INDIA_LOKSABHA_COALITION_POPULIST">Coalition / Populist Pivot</option>
            </select>
          </div>

          <div className="bg-slate-900/70 border border-slate-800 rounded-lg p-2">
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>US PRIMARY / MID-TERM</span>
              <span className="font-bold text-cyan-300">VEC #12B</span>
            </div>
            <select
              value={stressConfig.usMidtermElectionOutcome || 'LIVE_DYNAMIC_TRACKING'}
              onChange={(e) =>
                handleUpdateCustomSlider({
                  usMidtermElectionOutcome: e.target.value as MacroStressOverrideConfig['usMidtermElectionOutcome'],
                })
              }
              className="w-full mt-1.5 bg-slate-950 border border-slate-700 rounded px-1.5 py-1 text-[10px] text-white font-bold cursor-pointer"
            >
              <option value="LIVE_DYNAMIC_TRACKING">Live Yield/DXY Tracking</option>
              <option value="US_PRIMARY_RHETORIC_VOLATILITY">US Primary H-1B/Drug Rhetoric</option>
              <option value="GRIDLOCK_DIVIDED_CONGRESS">Divided Congress Gridlock</option>
              <option value="TARIFF_HAWK_SWEEP">Tariff &amp; H-1B Hawk Sweep</option>
              <option value="FISCAL_STIMULUS_SWEEP">Fiscal &amp; Tech Capex Sweep</option>
            </select>
          </div>

          <div className="bg-slate-900/70 border border-slate-800 rounded-lg p-2">
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>WAR ESCALATION</span>
              <span className="font-bold text-rose-400">{macroSnapshot.warEscalationIndex}/100</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={stressConfig.warEscalationIndex}
              onChange={(e) => handleUpdateCustomSlider({ warEscalationIndex: Number(e.target.value) })}
              className="w-full accent-rose-500 mt-1 cursor-pointer"
            />
          </div>

          <div className="bg-slate-900/70 border border-slate-800 rounded-lg p-2">
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>FED RATE SHOCK</span>
              <span className="font-bold text-amber-300">
                {stressConfig.fedRateShockBps >= 0 ? '+' : ''}
                {stressConfig.fedRateShockBps} bps
              </span>
            </div>
            <input
              type="range"
              min={-50}
              max={75}
              step={5}
              value={stressConfig.fedRateShockBps}
              onChange={(e) => handleUpdateCustomSlider({ fedRateShockBps: Number(e.target.value) })}
              className="w-full accent-amber-400 mt-1 cursor-pointer"
            />
          </div>

          <div className="bg-slate-900/70 border border-slate-800 rounded-lg p-2">
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>BRENT OIL SHOCK</span>
              <span className="font-bold text-cyan-300">
                {(stressConfig.brentOilOverrideChangePct ?? quotes['BZ=F']?.changePct ?? 0.8) >= 0 ? '+' : ''}
                {(stressConfig.brentOilOverrideChangePct ?? quotes['BZ=F']?.changePct ?? 0.8).toFixed(1)}%
              </span>
            </div>
            <input
              type="range"
              min={-10}
              max={15}
              step={0.5}
              value={stressConfig.brentOilOverrideChangePct ?? quotes['BZ=F']?.changePct ?? 0.8}
              onChange={(e) =>
                handleUpdateCustomSlider({ brentOilOverrideChangePct: Number(e.target.value) })
              }
              className="w-full accent-cyan-400 mt-1 cursor-pointer"
            />
          </div>

          <div className="bg-slate-900/70 border border-slate-800 rounded-lg p-2">
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>FII CASH FLOW</span>
              <span
                className={`font-bold ${
                  macroSnapshot.participantFlow.fiiCashNetCrINR >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {macroSnapshot.participantFlow.fiiCashNetCrINR >= 0 ? '+' : ''}₹{macroSnapshot.participantFlow.fiiCashNetCrINR}Cr
              </span>
            </div>
            <input
              type="range"
              min={-7000}
              max={5000}
              step={250}
              value={macroSnapshot.participantFlow.fiiCashNetCrINR}
              onChange={(e) => handleUpdateCustomSlider({ fiiCashNetCrINR: Number(e.target.value) })}
              className="w-full accent-emerald-400 mt-1 cursor-pointer"
            />
          </div>

          <div className="bg-slate-900/70 border border-slate-800 rounded-lg p-2">
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>FII FUTURES LSR</span>
              <span className="font-bold text-cyan-300">{macroSnapshot.participantFlow.fiiIndexFuturesLSR}%</span>
            </div>
            <input
              type="range"
              min={15}
              max={75}
              value={macroSnapshot.participantFlow.fiiIndexFuturesLSR}
              onChange={(e) =>
                handleUpdateCustomSlider({ fiiIndexFuturesLSR: Number(e.target.value) })
              }
              className="w-full accent-cyan-400 mt-1 cursor-pointer"
            />
          </div>

          <div className="bg-slate-900/70 border border-slate-800 rounded-lg p-2">
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>RETAIL (CLIENT) LSR</span>
              <span
                className={`font-bold ${
                  macroSnapshot.participantFlow.clientRetailIndexFuturesLSR >= 64 ? 'text-rose-400' : 'text-slate-200'
                }`}
              >
                {macroSnapshot.participantFlow.clientRetailIndexFuturesLSR}%
              </span>
            </div>
            <input
              type="range"
              min={25}
              max={82}
              value={macroSnapshot.participantFlow.clientRetailIndexFuturesLSR}
              onChange={(e) =>
                handleUpdateCustomSlider({ clientRetailIndexFuturesLSR: Number(e.target.value) })
              }
              className="w-full accent-rose-400 mt-1 cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* KPI Summary Strip: 98.5% Floor (<1.50% Max DD), Active Net Hurdle, FII/DII Divergence, Bayesian Top Strategy */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-[#0b101d] border border-emerald-500/30">
          <div className="text-[10px] text-slate-400 uppercase">HARD DAILY DRAWDOWN FLOOR (&lt;2% RULE)</div>
          <div className="text-lg font-bold text-emerald-400 mt-1 tabular-nums">
            98.50% Protected (&le;1.50% Max DD)
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Per-Trade 1R Stop: <span className="text-white font-bold">0.20%–0.45%</span> · Full Notional Deployed
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-[#0b101d] border border-cyan-500/30">
          <div className="text-[10px] text-slate-400 uppercase">STATUTORY NET PROFIT HURDLE</div>
          <div className="text-lg font-bold text-cyan-300 mt-1 tabular-nums">
            &gt; {macroSnapshot.requiredMinNetProfitPct.toFixed(2)}% Net-of-Tax
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {macroSnapshot.postLossRecoveryHurdleActive
              ? 'Raised to >2.50% (Shock / Anti-Whipsaw Recovery Gate)'
              : 'Standard >2.00% Net after 2026 STT/CTT/GST & ₹20/ord'}
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-[#0b101d] border border-amber-500/30">
          <div className="text-[10px] text-slate-400 uppercase">SMART MONEY (FII+PRO) VS RETAIL</div>
          <div
            className={`text-lg font-bold mt-1 tabular-nums ${
              macroSnapshot.participantFlow.isRetailCrowdedLongTrap
                ? 'text-rose-400'
                : 'text-amber-300'
            }`}
          >
            {macroSnapshot.participantFlow.isRetailCrowdedLongTrap
              ? 'RETAIL LONG TRAP ARMED'
              : `Divergence ${macroSnapshot.participantFlow.smartMoneyVsRetailDivergence >= 0 ? '+' : ''}${macroSnapshot.participantFlow.smartMoneyVsRetailDivergence}%`}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Net Inst. Cash: ₹{macroSnapshot.participantFlow.netInstitutionalCashCrINR.toLocaleString('en-IN')} Cr
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-[#0b101d] border border-purple-500/30">
          <div className="text-[10px] text-slate-400 uppercase">BAYESIAN SELF-LEARNED STRATEGY</div>
          <div className="text-sm font-bold text-purple-300 mt-1 truncate">
            {bayesianPosteriors.find((p) => p.status === 'OVERWEIGHT_LEADER')?.strategyLabel ||
              macroSnapshot.recommendedStrategyClass}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Anti-Whipsaw: <span className="text-emerald-300 font-bold">82% Profit-Lock / 100% Cash Floor</span>
          </div>
        </div>
      </div>

      {/* Sub-Navigation Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {[
          {
            id: 'TEN_POINT_AUDIT',
            label: `1. 10-Point Brutal Stress Audit (${passedChecksCount}/10 PASS)`,
          },
          {
            id: 'ELEVEN_VECTORS',
            label: '2. All 12 Live Macro, US Mid-Terms & War Vectors',
          },
          {
            id: 'FII_DII_SECTOR_MATRIX',
            label: '3. 3-Layer FII/DII/Pro vs Retail & Sector Matrix',
          },
          {
            id: 'INTER_AGENT_DEBATE',
            label: '4. 5-Agent Council Debate & Bayesian Weights',
          },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSubView(tab.id as typeof activeSubView)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer border ${
              activeSubView === tab.id
                ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-sm'
                : 'bg-[#0b101d] text-slate-300 border-slate-800 hover:border-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* VIEW 1: 10-POINT BRUTAL STRESS AUDIT SCORECARD */}
      {activeSubView === 'TEN_POINT_AUDIT' && (
        <div className="rounded-xl bg-[#0b101d] border border-slate-800 p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Deterministic 10-Point Brutal Stress Audit Scorecard
              </h2>
              <p className="text-xs text-slate-400">
                Verifies in real time that losing macro/FII victims are hard-vetoed, agents debate on a shared blackboard, open winners lock 82% profit, stopped capital goes to Cash, and drawdown stays &lt;1.50%.
              </p>
            </div>
            <span className="px-3 py-1 rounded-lg bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-bold shrink-0">
              {passedChecksCount} / {tenPointChecks.length} AUDIT CHECKS VERIFIED
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
            {tenPointChecks.map((chk) => (
              <div
                key={chk.checkNumber}
                className={`p-3 rounded-xl border ${
                  chk.passed
                    ? 'bg-slate-900/60 border-emerald-500/30'
                    : 'bg-rose-950/30 border-rose-500/40'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-cyan-300 text-[10px] font-bold">
                      #{chk.checkNumber}
                    </span>
                    <span className="text-xs font-bold text-white">{chk.title}</span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                      chk.passed
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    }`}
                  >
                    {chk.passed ? 'VERIFIED PASS' : 'ALERT'}
                  </span>
                </div>
                <div className="mt-2 text-xs font-bold text-cyan-300 tabular-nums">
                  {chk.metricText}
                </div>
                <p className="mt-1 text-[11px] text-slate-400 leading-relaxed">{chk.proofDetail}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VIEW 2: ALL 12 LIVE MACRO, US MID-TERMS, POLICY & WAR VECTORS */}
      {activeSubView === 'ELEVEN_VECTORS' && (
        <div className="rounded-xl bg-[#0b101d] border border-slate-800 p-4">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-3">
            12-Vector Macro-Causal Telemetry (Including 2026 US Mid-Term Elections) &amp; Sector Transmission Matrix
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {macroSnapshot.vectors.map((vec) => (
              <div
                key={vec.id}
                className={`p-3 rounded-xl border ${
                  vec.status === 'SHOCK_VETO'
                    ? 'bg-rose-950/25 border-rose-500/40'
                    : vec.status === 'HEADWIND'
                    ? 'bg-amber-950/20 border-amber-500/30'
                    : 'bg-slate-900/70 border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-white">
                    V{vec.vectorNumber}. {vec.name}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      vec.status === 'SHOCK_VETO'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        : vec.status === 'HEADWIND'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    }`}
                  >
                    {vec.status} ({vec.score >= 0 ? '+' : ''}
                    {vec.score})
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between text-xs tabular-nums">
                  <span className="text-cyan-300 font-bold">{vec.liveValueText}</span>
                  <span className="text-slate-400">{vec.changeText}</span>
                </div>
                <p className="mt-2 text-[11px] text-slate-300 leading-relaxed">
                  {vec.causalImpactSummary}
                </p>
                <div className="mt-2 pt-2 border-t border-slate-800/80 flex flex-wrap gap-1.5 text-[10px]">
                  <span className="text-emerald-400">
                    +Favors: {vec.beneficiarySectors.join(', ') || 'Defensive Cash'}
                  </span>
                  {vec.vetoedSectors.length > 0 && (
                    <span className="text-rose-400">
                      · -Vetoes: {vec.vetoedSectors.join(', ')}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VIEW 3: 3-LAYER FII / DII / PRO VS RETAIL SECTOR MATRIX */}
      {activeSubView === 'FII_DII_SECTOR_MATRIX' && (
        <div className="rounded-xl bg-[#0b101d] border border-slate-800 p-4 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                3-Layer NSE Participant-Wise OI (FII / DII / Pro vs Retail) &amp; Sector Rotation Matrix
              </h2>
              <p className="text-xs text-slate-400">
                Combines Participant Index Futures LSR + Cash FII/DII Inflow/Outflow + Intraday Volume/Delivery Absorption to pinpoint winning sectors and hard-veto institutional exits.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-[10px] text-slate-400 uppercase">
                  <th className="py-2.5 px-3">NSE Sector &amp; Key Scripts</th>
                  <th className="py-2.5 px-3 text-right">FII Flow Score</th>
                  <th className="py-2.5 px-3 text-right">DII Flow Score</th>
                  <th className="py-2.5 px-3 text-right">Vol / 20D Avg</th>
                  <th className="py-2.5 px-3 text-right">11-Vec Multiplier</th>
                  <th className="py-2.5 px-3 text-right">Net Conviction</th>
                  <th className="py-2.5 px-3">Execution Verdict</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70 tabular-nums">
                {Object.entries(macroSnapshot.participantFlow.sectorFlows).map(([code, sf]) => (
                  <tr key={code} className="hover:bg-slate-900/50">
                    <td className="py-2.5 px-3 font-bold text-white">{sf.sectorName}</td>
                    <td
                      className={`py-2.5 px-3 text-right font-bold ${
                        sf.fiiFlowScore >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {sf.fiiFlowScore >= 0 ? '+' : ''}
                      {sf.fiiFlowScore}
                    </td>
                    <td
                      className={`py-2.5 px-3 text-right font-bold ${
                        sf.diiFlowScore >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {sf.diiFlowScore >= 0 ? '+' : ''}
                      {sf.diiFlowScore}
                    </td>
                    <td className="py-2.5 px-3 text-right text-cyan-300">
                      {sf.intradayVolumeDeliveryRatio.toFixed(2)}x
                    </td>
                    <td
                      className={`py-2.5 px-3 text-right font-bold ${
                        sf.causalMacroMultiplier >= 0 ? 'text-emerald-300' : 'text-rose-400'
                      }`}
                    >
                      {sf.causalMacroMultiplier >= 0 ? '+' : ''}
                      {sf.causalMacroMultiplier.toFixed(2)}
                    </td>
                    <td
                      className={`py-2.5 px-3 text-right font-bold ${
                        sf.netSectorConviction >= 20
                          ? 'text-emerald-400'
                          : sf.netSectorConviction <= -15
                          ? 'text-rose-400'
                          : 'text-amber-300'
                      }`}
                    >
                      {sf.netSectorConviction >= 0 ? '+' : ''}
                      {sf.netSectorConviction}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          sf.verdict === 'STRONG_ACCUMULATION'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : sf.verdict === 'HARD_VETO_OUTFLOW'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {sf.verdict}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 4: 5-AGENT COUNCIL DEBATE & BAYESIAN STRATEGY POSTERIORS */}
      {activeSubView === 'INTER_AGENT_DEBATE' && (
        <div className="space-y-4">
          {/* Bayesian Strategy Weight Allocation Table */}
          <div className="rounded-xl bg-[#0b101d] border border-slate-800 p-4">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-1">
              Bayesian Self-Learning Strategy Weights (Conditioned on Active 11-Vector Regime)
            </h2>
            <p className="text-xs text-slate-400 mb-3">
              Strategies automatically gain capital weight when their macro/FII regime aligns and hibernate when macro vectors turn hostile.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-2.5">
              {bayesianPosteriors.map((post) => (
                <div
                  key={post.strategyClassId}
                  className={`p-3 rounded-xl border ${
                    post.status === 'OVERWEIGHT_LEADER'
                      ? 'bg-emerald-950/30 border-emerald-500/40'
                      : post.status === 'HIBERNATED_BY_REGIME'
                      ? 'bg-rose-950/20 border-rose-500/30 opacity-75'
                      : 'bg-slate-900/70 border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-bold text-cyan-300 uppercase">{post.assignedAgentId.replace('agent_', '')}</span>
                    <span
                      className={`px-1.5 py-0.5 rounded font-bold ${
                        post.status === 'OVERWEIGHT_LEADER'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : post.status === 'HIBERNATED_BY_REGIME'
                          ? 'bg-rose-500/20 text-rose-300'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {post.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div className="text-xs font-bold text-white mt-1.5 line-clamp-2">
                    {post.strategyLabel}
                  </div>
                  <div className="mt-2 pt-2 border-t border-slate-800 flex items-center justify-between text-xs tabular-nums">
                    <span className="text-slate-400">
                      Prior: {post.alphaWins}W / {post.betaLosses}L ({post.posteriorWinRatePct}%)
                    </span>
                    <span className="text-emerald-400 font-bold">
                       Wt: {post.dynamicCapitalWeightPct}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Latest 5-Agent Council Debate Transcript */}
          <div className="rounded-xl bg-[#0b101d] border border-slate-800 p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                  Last 5-Stage Inter-Agent Shared-Blackboard Debate Transcript
                </h2>
                <p className="text-xs text-slate-400">
                  Every trade requires Stage 1 (Kuber Macro) &rarr; Stage 2 (Chanakya FII/DII) &rarr; Stage 3 (Arjuna/Bhishma Structure) &rarr; Stage 4 (Vidura Red-Team) &rarr; Stage 5 (Governor Tax &amp; &lt;1.5% DD Gate).
                </p>
              </div>
              <button
                onClick={handleExecuteShieldAndScan}
                className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs cursor-pointer"
              >
                Re-Run Council Scan Now
              </button>
            </div>

            {lastScanAudit && lastScanAudit.evaluations.length > 0 ? (
              <div className="space-y-3">
                {lastScanAudit.evaluations.map((ev) => (
                  <div
                    key={ev.id}
                    className={`p-3 rounded-xl border ${
                      ev.approved
                        ? 'bg-emerald-950/20 border-emerald-500/40'
                        : 'bg-rose-950/20 border-rose-500/40'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-800">
                      <div>
                        <span className="text-xs font-bold text-white">{ev.symbol}</span>
                        <span className="text-[11px] text-slate-400 ml-2">({ev.deskName})</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs tabular-nums">
                        <span className="text-slate-300">
                          Gross ₹{ev.grossTargetProfitINR.toFixed(0)} · Tax+Brok ₹{ev.friction.totalFrictionINR.toFixed(2)} ({ev.grossToFrictionRatio}x)
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                            ev.approved
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                          }`}
                        >
                          {ev.approved ? `APPROVED (+${ev.netProfitPct}% NET)` : ev.vetoCode}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-200 mt-2">{ev.verdictReason}</p>

                    {ev.interAgentConsensus && (
                      <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 mt-2.5">
                        {ev.interAgentConsensus.stageVotes.map((sv) => (
                          <div
                            key={sv.stageNumber}
                            className={`p-2 rounded-lg border text-[11px] ${
                              sv.hardVeto
                                ? 'bg-rose-950/50 border-rose-500/50 text-rose-200'
                                : 'bg-slate-900/80 border-slate-800 text-slate-300'
                            }`}
                          >
                            <div className="flex items-center justify-between font-bold">
                              <span className="text-cyan-300 truncate">
                                S{sv.stageNumber}. {sv.agentName.split(' ')[0]}
                              </span>
                              <span>{sv.score}/100</span>
                            </div>
                            <div className="text-[10px] text-slate-400 mt-1 line-clamp-3">
                              {sv.reasoning}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center text-xs text-slate-400 border border-dashed border-slate-800 rounded-xl">
                Click <span className="text-emerald-400 font-bold">"Run 5-Agent Council Scan &amp; Shield"</span> above to generate a live 5-Agent shared-blackboard debate transcript across all desks.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
