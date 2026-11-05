import React, { useState, useMemo, useEffect } from 'react';
import {
  Activity,
  Award,
  Cpu,
  ShieldCheck,
  Zap,
  Globe,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Radio,
  Target,
  ArrowUpRight,
  Flag,
} from 'lucide-react';
import { useLiveMarketData } from '../services/liveMarketService';
import { getStoredPaperTrades, persistPaperTrades } from '../services/paperTradeService';
import {
  evaluateElevenVectorMacroMatrix,
  loadMacroStressConfig,
  saveMacroStressConfig,
  UsMidtermElectionStance,
  IndiaElectionStance,
  resolveSymbolSector,
} from '../services/macroCausalLearningEngine';
import {
  evaluateAdaptiveScriptLearningMatrix,
  evaluateBottomAccumulationAndBearPutMatrix,
  BottomAndBearPutSetup,
} from '../services/scriptLearningEngine';
import { evaluateAndDeploySingleSetupViaCouncil } from '../services/statutoryVetoEngine';

export const MacroPolicyThesis: React.FC = () => {
  const { quotes, lastUpdated } = useLiveMarketData(5000);
  const [orders, setOrders] = useState(() => getStoredPaperTrades());
  const [stressConfig, setStressConfig] = useState(() => loadMacroStressConfig());
  const [modelWeightToast, setModelWeightToast] = useState<{
    message: string;
    isError?: boolean;
  } | null>(null);
  const [scannerFilterMode, setScannerFilterMode] = useState<
    'DUAL_VIEW' | 'BOTTOM_LONG_ONLY' | 'BEAR_PUT_ONLY'
  >('DUAL_VIEW');

  useEffect(() => {
    const syncOrders = () => setOrders(getStoredPaperTrades());
    const syncStress = () => setStressConfig(loadMacroStressConfig());
    window.addEventListener('jarvis:orders-updated', syncOrders);
    window.addEventListener('jarvis:macro-stress-updated', syncStress);
    return () => {
      window.removeEventListener('jarvis:orders-updated', syncOrders);
      window.removeEventListener('jarvis:macro-stress-updated', syncStress);
    };
  }, []);

  const macro12 = useMemo(
    () => evaluateElevenVectorMacroMatrix(quotes, orders, stressConfig),
    [quotes, orders, stressConfig]
  );

  const learningMatrix = useMemo(
    () => evaluateAdaptiveScriptLearningMatrix(quotes, orders),
    [quotes, orders]
  );

  const bottomAndBearMatrix = useMemo(
    () => evaluateBottomAccumulationAndBearPutMatrix(quotes, orders),
    [quotes, orders]
  );

  // Dynamically derive top learned institutional leaders & quarantined/vetoed laggards
  const topLiveLeaders = useMemo(
    () =>
      learningMatrix
        .filter((r) => !r.isQuarantined && r.ltp > 0)
        .sort((a, b) => b.learnedScore - a.learnedScore)
        .slice(0, 3),
    [learningMatrix]
  );

  const topVetoedLaggards = useMemo(
    () =>
      learningMatrix
        .filter((r) => r.isQuarantined && r.ltp > 0)
        .sort((a, b) => a.learnedScore - b.learnedScore)
        .slice(0, 3),
    [learningMatrix]
  );

  // Dynamic sentiment breakdown from the 12 Live Vectors
  const tailwindCount = macro12.vectors.filter((v) => v.status === 'TAILWIND').length;
  const neutralCount = macro12.vectors.filter((v) => v.status === 'NEUTRAL').length;
  const headwindCount = macro12.vectors.filter(
    (v) => v.status === 'HEADWIND' || v.status === 'SHOCK_VETO'
  ).length;
  const totalVecs = Math.max(1, macro12.vectors.length);

  const bullishPct = Math.round((tailwindCount / totalVecs) * 100);
  const neutralPct = Math.round((neutralCount / totalVecs) * 100);
  const bearishPct = Math.max(0, 100 - bullishPct - neutralPct);

  const electionVec = macro12.vectors.find((v) => v.id === 'vec_us_midterms');
  const us10yYield = quotes['^TNX']?.price ?? 4.28;
  const dxyPrice = quotes['DX-Y.NYB']?.price ?? 104.35;
  const dxyChg = quotes['DX-Y.NYB']?.changePct ?? 0.22;
  const usdinrPrice = quotes['INR=X']?.price ?? 84.42;
  const usdinrChg = quotes['INR=X']?.changePct ?? 0.12;
  const nasdaqChg = quotes['^IXIC']?.changePct ?? 0.48;

  const activeMidtermStance: UsMidtermElectionStance =
    stressConfig.usMidtermElectionOutcome || 'LIVE_DYNAMIC_TRACKING';
  const activeIndiaElectionStance: IndiaElectionStance =
    stressConfig.indiaElectionOutcome || 'INDIA_LIVE_CONTINUITY_TRACKING';

  const handleSelectMidtermStance = (stance: UsMidtermElectionStance) => {
    const isLiveBoth =
      stance === 'LIVE_DYNAMIC_TRACKING' &&
      activeIndiaElectionStance === 'INDIA_LIVE_CONTINUITY_TRACKING';
    const nextConfig = {
      ...stressConfig,
      usMidtermElectionOutcome: stance,
      mode: isLiveBoth ? ('LIVE_EXCHANGE_FEED' as const) : ('STRESS_TEST_SANDBOX' as const),
      presetId:
        stance === 'TARIFF_HAWK_SWEEP'
          ? ('US_MIDTERM_TARIFF_YIELD_SHOCK' as const)
          : stance === 'US_PRIMARY_RHETORIC_VOLATILITY'
          ? ('INDIA_LOKSABHA_US_PRIMARY_SHOCK' as const)
          : ('CUSTOM_SHOCK' as const),
      presetLabel:
        stance === 'TARIFF_HAWK_SWEEP'
          ? 'US Election Tariff & Yield Spike Sweep'
          : stance === 'US_PRIMARY_RHETORIC_VOLATILITY'
          ? 'US Primary Election H-1B & Drug Pricing Rhetoric Volatility'
          : stance === 'GRIDLOCK_DIVIDED_CONGRESS'
          ? 'US Divided Congress Gridlock'
          : stance === 'FISCAL_STIMULUS_SWEEP'
          ? 'US Pro-Tech & Fiscal Capex Sweep'
          : 'Live Exchange Telemetry (/api/market-data)',
    };
    setStressConfig(nextConfig);
    saveMacroStressConfig(nextConfig);
    setModelWeightToast({
      message: `US Primary / Mid-Term / General Election Vector updated to [${stance.replace(/_/g, ' ')}]. Active Leaders: ${topLiveLeaders
        .map((l) => l.symbol)
        .join(', ')}.`,
    });
    setTimeout(() => setModelWeightToast(null), 5000);
  };

  const handleSelectIndiaElectionStance = (indiaStance: IndiaElectionStance) => {
    const isLiveBoth =
      indiaStance === 'INDIA_LIVE_CONTINUITY_TRACKING' &&
      activeMidtermStance === 'LIVE_DYNAMIC_TRACKING';
    const nextConfig = {
      ...stressConfig,
      indiaElectionOutcome: indiaStance,
      mode: isLiveBoth ? ('LIVE_EXCHANGE_FEED' as const) : ('STRESS_TEST_SANDBOX' as const),
      presetId:
        indiaStance === 'INDIA_LOKSABHA_COALITION_POPULIST'
          ? ('INDIA_LOKSABHA_US_PRIMARY_SHOCK' as const)
          : ('CUSTOM_SHOCK' as const),
      presetLabel:
        indiaStance === 'INDIA_LOKSABHA_CONTINUITY_CAPEX'
          ? 'India Lok Sabha Majority Continuity (Capex + Defence Surge)'
          : indiaStance === 'INDIA_MCC_PRE_POLL_PAUSE'
          ? 'India Pre-Poll Model Code of Conduct (MCC) Tender Pause'
          : indiaStance === 'INDIA_LOKSABHA_COALITION_POPULIST'
          ? 'India Lok Sabha Coalition / Populist Rural Pivot'
          : 'Live Domestic Sovereign Continuity Tracking',
    };
    setStressConfig(nextConfig);
    saveMacroStressConfig(nextConfig);
    setModelWeightToast({
      message: `India Lok Sabha & State Election Vector updated to [${indiaStance.replace(/_/g, ' ')}]. Sectoral FII/DII flows recalibrated.`,
    });
    setTimeout(() => setModelWeightToast(null), 5000);
  };

  const handleDeploySetupViaCouncil = (setup: BottomAndBearPutSetup) => {
    const currentOrders = getStoredPaperTrades();
    const evaluation = evaluateAndDeploySingleSetupViaCouncil({
      symbol: setup.symbol,
      instrumentLabel: setup.instrumentLabel,
      segment: setup.segment,
      side: setup.side,
      entryPrice: setup.entryPrice,
      stopLossPrice: setup.stopLossPrice,
      t1Price: setup.t1Price,
      t2Price: setup.t2Price,
      t3Price: setup.t3Price,
      qty: setup.recommendedQty,
      optionType: setup.optionType,
      strike: setup.strike,
      strategyName: `${setup.modeLabel} (T1 ₹${setup.t1Price} / T2 ₹${setup.t2Price} / T3 ₹${setup.t3Price})`,
      nonErosionRule: `${setup.nonErosionExitPlan.stage2LockT1Floor} · ${setup.nonErosionExitPlan.stage3LockT2AndTrail82Pct}`,
      quotes,
      existingOrders: currentOrders,
    });

    if (evaluation.approved && evaluation.order) {
      const updated = [evaluation.order, ...currentOrders];
      persistPaperTrades(updated);
      setOrders(updated);
      setModelWeightToast({
        message: `✅ DEPLOYED TO ORDER BOOK: ${evaluation.order.symbol} · ${evaluation.verdictReason}`,
      });
    } else {
      setModelWeightToast({
        message: `🛡️ AI COUNCIL VETO: ${evaluation.verdictReason}`,
        isError: true,
      });
    }
    setTimeout(() => setModelWeightToast(null), 6500);
  };

  const handleDeployConfirmedLeader = (leader: {
    symbol: string;
    ltp: number;
    phaseLabel: string;
  }) => {
    const currentOrders = getStoredPaperTrades();
    const price = Number(leader.ltp.toFixed(2));
    const stopLoss = Number((price * 0.9932).toFixed(2));
    const t1 = Number((price * 1.021).toFixed(2));
    const t2 = Number((price * 1.0325).toFixed(2));
    const t3 = Number((price * 1.048).toFixed(2));
    const stopDist = Math.max(0.5, Number((price - stopLoss).toFixed(2)));
    const qty = Math.max(1, Math.floor(380 / stopDist));

    const evaluation = evaluateAndDeploySingleSetupViaCouncil({
      symbol: leader.symbol,
      instrumentLabel: `${leader.symbol} Intraday Cash MIS`,
      segment: 'NSE_CASH',
      side: 'BUY',
      entryPrice: price,
      stopLossPrice: stopLoss,
      t1Price: t1,
      t2Price: t2,
      t3Price: t3,
      qty,
      strategyName: `Confirmed Leader (${leader.phaseLabel}) · T1 ₹${t1} / T2 ₹${t2} / T3 ₹${t3}`,
      quotes,
      existingOrders: currentOrders,
    });

    if (evaluation.approved && evaluation.order) {
      const updated = [evaluation.order, ...currentOrders];
      persistPaperTrades(updated);
      setOrders(updated);
      setModelWeightToast({
        message: `✅ DEPLOYED CONFIRMED LEADER: ${evaluation.order.symbol} · ${evaluation.verdictReason}`,
      });
    } else {
      setModelWeightToast({
        message: `🛡️ AI COUNCIL VETO: ${evaluation.verdictReason}`,
        isError: true,
      });
    }
    setTimeout(() => setModelWeightToast(null), 6500);
  };

  const handleJumpToOrderBook = () => {
    window.dispatchEvent(new CustomEvent('jarvis:navigate-tab', { detail: 'trade_history' }));
  };

  return (
    <div className="w-full space-y-6 font-mono text-slate-100 pb-10">
      {/* Toast Feedback Banner */}
      {modelWeightToast && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center justify-between gap-2 shadow-lg ${
            modelWeightToast.isError
              ? 'bg-rose-950/90 border-rose-400/50 text-rose-200'
              : 'bg-cyan-950/90 border-cyan-400/50 text-cyan-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-cyan-400 animate-pulse shrink-0" />
            <span>{modelWeightToast.message}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleJumpToOrderBook}
              className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-cyan-500/40 text-cyan-300 text-[10px] font-bold cursor-pointer"
            >
              Open Order Book →
            </button>
            <button
              onClick={() => setModelWeightToast(null)}
              className="text-[11px] text-slate-300 hover:text-white underline cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Top Live Telemetry & Regime Header (Zero Static Numbers) */}
      <div className="w-full rounded-2xl bg-[#080d1a]/95 p-6 border border-cyan-500/30 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-[10px] font-bold uppercase tracking-wider">
                INDIA LOK SABHA + US PRIMARY &amp; MID-TERM ELECTIONS + 52W-LOW / BEAR PUT ENGINE
              </span>
              <span className="px-2.5 py-0.5 rounded bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold">
                {Object.keys(quotes).length} LIVE STREAMS · {learningMatrix.length} EQUITIES SCANNED
              </span>
              <span className="px-2.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-amber-300 text-[10px] font-bold">
                NET HURDLE: &gt;{macro12.requiredMinNetProfitPct.toFixed(2)}% NET-OF-TAX
              </span>
            </div>
            <h1 className="text-lg sm:text-xl font-bold text-white mt-2 font-sans">
              Market Finder: India (Lok Sabha) &amp; US (Primary/Mid-Term) Elections + 52W-Low Bottom &amp; Bear Put F&amp;O Scanner
            </h1>
            <p className="text-xs text-slate-400 mt-1 font-sans">
              {macro12.regimeHeadline}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-right">
              <span className="text-[10px] text-slate-400 block">COMPOSITE 12-VECTOR SCORE</span>
              <span
                className={`text-base font-bold tabular-nums ${
                  macro12.compositeMacroHealthScore >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {macro12.compositeMacroHealthScore >= 0 ? '+' : ''}
                {macro12.compositeMacroHealthScore} / 100
              </span>
            </div>
            <div className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-right">
              <span className="text-[10px] text-slate-400 block">WAR &amp; GEOPOLITICAL INDEX</span>
              <span
                className={`text-base font-bold tabular-nums ${
                  macro12.warEscalationIndex >= 55 ? 'text-rose-400' : 'text-cyan-300'
                }`}
              >
                {macro12.warEscalationIndex} / 100
              </span>
            </div>
          </div>
        </div>

        {/* Live Dynamic Key Macro & Institutional Flow Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-4">
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3">
            <span className="text-[10px] text-slate-400 block">US 10Y YIELD (^TNX)</span>
            <span className="text-base text-cyan-300 font-bold tabular-nums">
              {us10yYield.toFixed(2)}%
            </span>
            <span className="text-[10px] text-slate-500 block mt-0.5">
              13W T-Bill: {(quotes['^IRX']?.price ?? 4.52).toFixed(2)}%
            </span>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3">
            <span className="text-[10px] text-slate-400 block">DOLLAR INDEX (DXY)</span>
            <span
              className={`text-base font-bold tabular-nums ${
                dxyChg >= 0.5 ? 'text-rose-400' : 'text-emerald-400'
              }`}
            >
              {dxyPrice.toFixed(2)} ({dxyChg >= 0 ? '+' : ''}
              {dxyChg.toFixed(2)}%)
            </span>
            <span className="text-[10px] text-slate-500 block mt-0.5">
              USD/INR: ₹{usdinrPrice.toFixed(2)} ({usdinrChg >= 0 ? '+' : ''}
              {usdinrChg.toFixed(2)}%)
            </span>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3">
            <span className="text-[10px] text-slate-400 block">INDIA + US ELECTIONS</span>
            <span className="text-xs text-amber-300 font-bold truncate block">
              {electionVec?.liveValueText || 'INDIA + US LIVE'}
            </span>
            <span className="text-[10px] text-slate-500 block mt-0.5">
              Vector #12 Score: {electionVec?.score ?? 54}
            </span>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3">
            <span className="text-[10px] text-slate-400 block">LIVE FII CASH FLOW</span>
            <span
              className={`text-base font-bold tabular-nums ${
                macro12.participantFlow.fiiCashNetCrINR >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {macro12.participantFlow.fiiCashNetCrINR >= 0 ? '+' : ''}₹
              {macro12.participantFlow.fiiCashNetCrINR.toLocaleString('en-IN')} Cr
            </span>
            <span className="text-[10px] text-slate-500 block mt-0.5">
              FII Fut LSR: {macro12.participantFlow.fiiIndexFuturesLSR}%
            </span>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3">
            <span className="text-[10px] text-slate-400 block">LIVE DII CASH FLOW</span>
            <span
              className={`text-base font-bold tabular-nums ${
                macro12.participantFlow.diiCashNetCrINR >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {macro12.participantFlow.diiCashNetCrINR >= 0 ? '+' : ''}₹
              {macro12.participantFlow.diiCashNetCrINR.toLocaleString('en-IN')} Cr
            </span>
            <span className="text-[10px] text-slate-500 block mt-0.5">
              Pro Fut LSR: {macro12.participantFlow.proIndexFuturesLSR}%
            </span>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3">
            <span className="text-[10px] text-slate-400 block">RETAIL (CLIENT) LSR</span>
            <span
              className={`text-base font-bold tabular-nums ${
                macro12.participantFlow.isRetailCrowdedLongTrap ? 'text-rose-400' : 'text-cyan-300'
              }`}
            >
              {macro12.participantFlow.clientRetailIndexFuturesLSR}% Long
            </span>
            <span className="text-[10px] text-slate-500 block mt-0.5">
              {macro12.participantFlow.isRetailCrowdedLongTrap
                ? '⚠️ Retail Crowded Trap'
                : `Tick Sync: ${lastUpdated || 'Live'}`}
            </span>
          </div>
        </div>
      </div>

      {/* SECTION 1: DUAL-MODE 52-WEEK LOW INSTITUTIONAL BOTTOM ACCUMULATION & BEAR PUT F&O (T1 / T2 / T3) */}
      <div className="w-full rounded-2xl bg-[#080d1a]/95 p-6 border border-emerald-500/35 shadow-xl space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold uppercase">
                DUAL-MODE MARKET-LOW PROFIT ENGINE
              </span>
              <span className="px-2.5 py-0.5 rounded bg-rose-500/20 border border-rose-500/40 text-rose-300 text-[10px] font-bold uppercase">
                T1 · T2 · T3 TARGETS + 82% NON-EROSION EXIT RATCHET
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-white mt-1.5 font-sans">
              52-Week Low Institutional Bottom-Accumulation &amp; Bear-Market Put (PE) F&amp;O Scanner
            </h2>
            <p className="text-xs text-slate-400 font-sans mt-0.5">
              {bottomAndBearMatrix.marketLowRegimeSummary}
            </p>
          </div>

          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-950 border border-slate-800 shrink-0">
            <button
              onClick={() => setScannerFilterMode('DUAL_VIEW')}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer transition ${
                scannerFilterMode === 'DUAL_VIEW'
                  ? 'bg-cyan-500 text-slate-950'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Dual View (Both)
            </button>
            <button
              onClick={() => setScannerFilterMode('BOTTOM_LONG_ONLY')}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer transition ${
                scannerFilterMode === 'BOTTOM_LONG_ONLY'
                  ? 'bg-emerald-500 text-slate-950'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Mode A: 52W-Low Accumulation ({bottomAndBearMatrix.bottomAccumulationLongs.length})
            </button>
            <button
              onClick={() => setScannerFilterMode('BEAR_PUT_ONLY')}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer transition ${
                scannerFilterMode === 'BEAR_PUT_ONLY'
                  ? 'bg-rose-500 text-slate-950'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Mode B: Bear Put F&amp;O ({bottomAndBearMatrix.bearMarketPutSetups.length})
            </button>
          </div>
        </div>

        {/* Mode A: 52-Week Low Bottom Accumulation Cards */}
        {(scannerFilterMode === 'DUAL_VIEW' || scannerFilterMode === 'BOTTOM_LONG_ONLY') && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold text-emerald-300 uppercase">
                  Mode A: 52-Week Low Institutional Bottom Accumulation (High-Potential Reversal Longs with T1 / T2 / T3)
                </span>
              </div>
              <span className="text-[10px] text-slate-400">
                FII/DII Value Absorption Near Cycle Bottom
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {bottomAndBearMatrix.bottomAccumulationLongs.slice(0, 3).map((setup) => (
                <div
                  key={setup.id}
                  className="rounded-2xl bg-slate-950/90 p-4 border border-emerald-500/35 flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold">
                            52W-LOW ACCUMULATION · {setup.accumulationOrPutScore}/100
                          </span>
                          <span className="text-base font-bold text-white">{setup.symbol}</span>
                        </div>
                        <span className="text-[11px] text-slate-400 block mt-0.5 font-sans">
                          {setup.name} · {setup.sector}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-bold text-emerald-400 tabular-nums block">
                          Spot ₹{setup.spotLtp.toLocaleString('en-IN')}
                        </span>
                        <span className="text-[10px] text-cyan-300 block">
                          +{setup.distanceFrom52WLowPct}% from 52W Low (₹{setup.fiftyTwoWeekLow})
                        </span>
                      </div>
                    </div>

                    {/* Entry, Stop & T1 / T2 / T3 Strip */}
                    <div className="grid grid-cols-5 gap-1.5 text-center p-2 rounded-xl bg-slate-900/90 border border-slate-800 text-[10px]">
                      <div>
                        <span className="text-slate-400 block">ENTRY</span>
                        <span className="font-bold text-white">₹{setup.entryPrice}</span>
                      </div>
                      <div>
                        <span className="text-rose-400 block">HARD SL</span>
                        <span className="font-bold text-rose-300">₹{setup.stopLossPrice}</span>
                      </div>
                      <div>
                        <span className="text-emerald-400 block">TARGET 1</span>
                        <span className="font-bold text-emerald-300">₹{setup.t1Price}</span>
                      </div>
                      <div>
                        <span className="text-cyan-400 block">TARGET 2</span>
                        <span className="font-bold text-cyan-300">₹{setup.t2Price}</span>
                      </div>
                      <div>
                        <span className="text-amber-400 block">TARGET 3</span>
                        <span className="font-bold text-amber-300">₹{setup.t3Price}</span>
                      </div>
                    </div>

                    {/* Non-Erosion Exit Plan */}
                    <div className="p-2.5 rounded-xl bg-[#060b16] border border-slate-800/90 space-y-1 text-[10px] font-sans">
                      <div className="font-mono font-bold text-cyan-300 uppercase flex items-center justify-between">
                        <span>Non-Erosion Exit Plan (Qty: {setup.recommendedQty})</span>
                        <span className="text-emerald-400">Net @ T2: +{setup.expectedNetYieldAtT2Pct}%</span>
                      </div>
                      <div className="text-slate-300">• {setup.nonErosionExitPlan.stage1BreakevenLock}</div>
                      <div className="text-emerald-300">• {setup.nonErosionExitPlan.stage2LockT1Floor}</div>
                      <div className="text-cyan-300">• {setup.nonErosionExitPlan.stage3LockT2AndTrail82Pct}</div>
                    </div>

                    <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                      {setup.rationale}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-800 flex items-center gap-2">
                    <button
                      onClick={() => handleDeploySetupViaCouncil(setup)}
                      className="flex-1 py-2 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-[11px] uppercase tracking-wider cursor-pointer transition flex items-center justify-center gap-1.5 shadow-[0_0_12px_rgba(16,185,129,0.25)]"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      <span>Deploy via AI Council (&gt;2% Net)</span>
                    </button>
                    <button
                      onClick={handleJumpToOrderBook}
                      className="py-2 px-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-cyan-300 text-[10px] font-bold cursor-pointer transition"
                      title="Open Order Book"
                    >
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Mode B: Bear-Market / Weak-Script Put (PE) F&O Cards */}
        {(scannerFilterMode === 'DUAL_VIEW' || scannerFilterMode === 'BEAR_PUT_ONLY') && (
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-rose-400" />
                <span className="text-xs font-bold text-rose-300 uppercase">
                  Mode B: Bear-Market &amp; Weak-Script Put (PE) F&amp;O Setups (Profit When Market Is Low · T1 / T2 / T3)
                </span>
              </div>
              <span className="text-[10px] text-slate-400">
                Downside Delta &amp; Gamma Expansion with Zero Profit Giveback
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {bottomAndBearMatrix.bearMarketPutSetups.slice(0, 3).map((setup) => (
                <div
                  key={setup.id}
                  className="rounded-2xl bg-slate-950/90 p-4 border border-rose-500/35 flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="px-2 py-0.5 rounded bg-rose-500/20 border border-rose-500/40 text-rose-300 text-[10px] font-bold">
                            BEAR PUT (PE) F&amp;O · {setup.accumulationOrPutScore}/100
                          </span>
                          <span className="text-sm font-bold text-white">{setup.instrumentLabel}</span>
                        </div>
                        <span className="text-[11px] text-slate-400 block mt-0.5 font-sans">
                          Underlying Spot: ₹{setup.spotLtp.toLocaleString('en-IN')} ({setup.changePct >= 0 ? '+' : ''}
                          {setup.changePct}%) · {setup.sector}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-bold text-amber-300 tabular-nums block">
                          PE Entry ₹{setup.entryPrice}
                        </span>
                        <span className="text-[10px] text-rose-300 block">
                          Lot/Qty: {setup.recommendedQty}
                        </span>
                      </div>
                    </div>

                    {/* Option Premium Entry, Stop & T1 / T2 / T3 Strip */}
                    <div className="grid grid-cols-5 gap-1.5 text-center p-2 rounded-xl bg-slate-900/90 border border-slate-800 text-[10px]">
                      <div>
                        <span className="text-slate-400 block">PE ENTRY</span>
                        <span className="font-bold text-white">₹{setup.entryPrice}</span>
                      </div>
                      <div>
                        <span className="text-rose-400 block">STOP SL</span>
                        <span className="font-bold text-rose-300">₹{setup.stopLossPrice}</span>
                      </div>
                      <div>
                        <span className="text-emerald-400 block">TARGET 1</span>
                        <span className="font-bold text-emerald-300">₹{setup.t1Price}</span>
                      </div>
                      <div>
                        <span className="text-cyan-400 block">TARGET 2</span>
                        <span className="font-bold text-cyan-300">₹{setup.t2Price}</span>
                      </div>
                      <div>
                        <span className="text-amber-400 block">TARGET 3</span>
                        <span className="font-bold text-amber-300">₹{setup.t3Price}</span>
                      </div>
                    </div>

                    {/* Non-Erosion Exit Plan */}
                    <div className="p-2.5 rounded-xl bg-[#060b16] border border-slate-800/90 space-y-1 text-[10px] font-sans">
                      <div className="font-mono font-bold text-amber-300 uppercase flex items-center justify-between">
                        <span>Put F&amp;O Non-Erosion Exit Plan</span>
                        <span className="text-emerald-400">Net @ T2: +{setup.expectedNetYieldAtT2Pct}%</span>
                      </div>
                      <div className="text-slate-300">• {setup.nonErosionExitPlan.stage1BreakevenLock}</div>
                      <div className="text-emerald-300">• {setup.nonErosionExitPlan.stage2LockT1Floor}</div>
                      <div className="text-cyan-300">• {setup.nonErosionExitPlan.stage3LockT2AndTrail82Pct}</div>
                    </div>

                    <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                      {setup.rationale}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-800 flex items-center gap-2">
                    <button
                      onClick={() => handleDeploySetupViaCouncil(setup)}
                      className="flex-1 py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px] uppercase tracking-wider cursor-pointer transition flex items-center justify-center gap-1.5 shadow-[0_0_12px_rgba(245,158,11,0.25)]"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      <span>Deploy Put (PE) via Council</span>
                    </button>
                    <button
                      onClick={handleJumpToOrderBook}
                      className="py-2 px-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-cyan-300 text-[10px] font-bold cursor-pointer transition"
                      title="Open Order Book"
                    >
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* SECTION 2: FULL-CYCLE INDIA (LOK SABHA) & US (PRIMARY + MID-TERM + GENERAL) ELECTIONS ENGINE */}
      <div className="w-full rounded-2xl bg-[#080d1a]/95 p-6 border border-amber-500/30 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-amber-400" />
            <div>
              <h2 className="text-base font-bold text-white font-sans">
                Vector #12: Full-Cycle India (Lok Sabha &amp; State) + US (Primary, Mid-Term &amp; General) Elections Matrix
              </h2>
              <p className="text-xs text-slate-400 font-sans">
                Simultaneous transmission of India Lok Sabha Capex/MCC/Coalition regimes and US Primary H-1B/Drug-Pricing debates + Congressional Mid-Term outcomes into NSE/BSE equities.
              </p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-lg bg-amber-950/60 border border-amber-500/40 text-amber-300 text-[10px] font-bold uppercase shrink-0">
            ACTIVE: {electionVec?.liveValueText}
          </span>
        </div>

        {/* Sub-Panel A: India Lok Sabha & Key State Assembly Election Stance Selector */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-emerald-300 uppercase flex items-center gap-1.5">
              <Flag className="w-3.5 h-3.5 text-emerald-400" />
              <span>1. India Elections (Lok Sabha General &amp; Key State Polls — Active At Any Point In Time)</span>
            </span>
            <span className="text-[10px] text-slate-400">Select Regime to Re-Score All 32+ Scripts</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {[
              {
                stance: 'INDIA_LIVE_CONTINUITY_TRACKING' as IndiaElectionStance,
                title: '1. Live Sovereign Continuity Tracking',
                desc: 'Tracks live Union Budget Capex execution, Defence indigenisation, and RBI liquidity outside pre-poll freezes.',
                badge: 'LIVE DEFAULT',
              },
              {
                stance: 'INDIA_LOKSABHA_CONTINUITY_CAPEX' as IndiaElectionStance,
                title: '2. Lok Sabha Stable Majority Continuity',
                desc: 'Strong tailwind for HAL, BEL, LT, NTPC, POLYCAB, SBIN, ICICIBANK as sovereign infrastructure & defence orders accelerate.',
                badge: 'DEFENCE & INFRA BOOM',
              },
              {
                stance: 'INDIA_MCC_PRE_POLL_PAUSE' as IndiaElectionStance,
                title: '3. Pre-Poll Model Code (MCC) Pause',
                desc: '60-day pre-election tender pause slows fresh EPC/PSU awards; rotates capital into defensive Pharma & Consumption.',
                badge: 'PSU TENDER PAUSE',
              },
              {
                stance: 'INDIA_LOKSABHA_COALITION_POPULIST' as IndiaElectionStance,
                title: '4. Hung / Coalition Populist Pivot',
                desc: 'Fiscal deficit expansion + rural transfer shift: vetoes high-beta PSU Capex & Banks; boosts defensive FMCG/Pharma & Bear Puts.',
                badge: 'CAPEX VETO · DEFENSIVE',
              },
            ].map((opt) => {
              const isSelected = activeIndiaElectionStance === opt.stance;
              return (
                <button
                  key={opt.stance}
                  onClick={() => handleSelectIndiaElectionStance(opt.stance)}
                  className={`p-3.5 rounded-xl border text-left transition cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-950/40 border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                      : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-emerald-300 font-bold">
                      {opt.badge}
                    </span>
                    {isSelected && <span className="w-2 h-2 rounded-full bg-emerald-400" />}
                  </div>
                  <div className="text-xs font-bold text-white mt-1 font-sans">{opt.title}</div>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed font-sans">{opt.desc}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Sub-Panel B: US Primary, Mid-Term & General Election Stance Selector */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-amber-300 uppercase flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-amber-400" />
              <span>2. US Elections (US Primary Debates, 2026 Mid-Terms &amp; Presidential Cycle)</span>
            </span>
            <span className="text-[10px] text-slate-400">Includes US Primary Rhetoric &amp; Mid-Term Gridlock/Tariffs</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            {[
              {
                stance: 'LIVE_DYNAMIC_TRACKING' as UsMidtermElectionStance,
                title: '1. Live Yield & DXY Auto-Track',
                desc: `Derives US election risk from live ^TNX (${us10yYield.toFixed(2)}%), DXY (${dxyChg >= 0 ? '+' : ''}${dxyChg.toFixed(2)}%) & NASDAQ (${nasdaqChg >= 0 ? '+' : ''}${nasdaqChg.toFixed(2)}%)`,
                badge: 'AUTO LIVE',
              },
              {
                stance: 'US_PRIMARY_RHETORIC_VOLATILITY' as UsMidtermElectionStance,
                title: '2. US Primary Campaign Rhetoric',
                desc: 'Primary debate spikes on H-1B visa quotas, border tariffs & Medicare drug pricing create IT headwinds while boosting Domestic Defence.',
                badge: 'US PRIMARY VOL',
              },
              {
                stance: 'GRIDLOCK_DIVIDED_CONGRESS' as UsMidtermElectionStance,
                title: '3. Divided Congress Gridlock',
                desc: 'Blocks extreme US fiscal deficits & corporate tax hikes; stabilizes 10Y yields; unlocks IT & Pharma budgets.',
                badge: 'IT & PHARMA TAILWIND',
              },
              {
                stance: 'TARIFF_HAWK_SWEEP' as UsMidtermElectionStance,
                title: '4. Tariff & H-1B Hawk Sweep',
                desc: 'Universal 10–20% tariffs + H-1B wage floor hike + 10Y yield spike. Vetoes Metals & FII Banks; boosts Defence & Biosecure Pharma.',
                badge: 'METALS & BANKS VETO',
              },
              {
                stance: 'FISCAL_STIMULUS_SWEEP' as UsMidtermElectionStance,
                title: '5. Pro-Tech & Deregulation Sweep',
                desc: 'Accelerates US enterprise AI/Cloud spend & INDUS-X defense co-production. Strong tailwind for TCS, INFY, HAL, BEL.',
                badge: 'RISK-ON BOOM',
              },
            ].map((opt) => {
              const isSelected = activeMidtermStance === opt.stance;
              return (
                <button
                  key={opt.stance}
                  onClick={() => handleSelectMidtermStance(opt.stance)}
                  className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                    isSelected
                      ? 'bg-amber-950/40 border-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.2)]'
                      : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-amber-300 font-bold">
                      {opt.badge}
                    </span>
                    {isSelected && <span className="w-2 h-2 rounded-full bg-amber-400" />}
                  </div>
                  <div className="text-xs font-bold text-white mt-1 font-sans">{opt.title}</div>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed font-sans">{opt.desc}</p>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Dynamic 12-Vector Sentiment Convergence Bar */}
      <div className="w-full rounded-2xl bg-[#080d1a]/95 p-6 border border-cyan-500/20 shadow-xl">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="relative w-2.5 h-2.5">
              <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping" />
              <span className="relative block w-2.5 h-2.5 rounded-full bg-emerald-400" />
            </div>
            <span className="text-sm font-bold text-slate-100 font-sans">
              Live 12-Vector Algorithmic Convergence Radar
            </span>
          </div>
          <span className="text-[10px] px-2.5 py-0.5 rounded-md bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 font-bold">
            DYNAMIC TICK COMPUTATION
          </span>
        </div>

        <div className="bg-slate-950/80 rounded-xl p-4 border border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-cyan-300">
              12-VECTOR MACRO, FLOW &amp; ELECTION DISTRIBUTION
            </span>
            <span
              className={`text-sm font-bold tracking-tight ${
                bullishPct >= bearishPct ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {tailwindCount} TAILWINDS · {neutralCount} NEUTRAL · {headwindCount} HEADWINDS/VETOES
            </span>
          </div>

          <div className="w-full h-3 rounded-full bg-slate-900 overflow-hidden flex p-0.5 border border-slate-800">
            <div
              className="h-full bg-emerald-400 rounded-l-full transition-all duration-300"
              style={{ width: `${bullishPct}%` }}
            />
            <div
              className="h-full bg-amber-400 transition-all duration-300"
              style={{ width: `${neutralPct}%` }}
            />
            <div
              className="h-full bg-rose-500 rounded-r-full transition-all duration-300"
              style={{ width: `${bearishPct}%` }}
            />
          </div>

          <div className="flex justify-between items-center mt-2 text-[10px] text-slate-400">
            <span className="text-emerald-400 font-bold">TAILWIND VECTORS: {bullishPct}%</span>
            <span className="text-amber-300 font-bold">NEUTRAL VECTORS: {neutralPct}%</span>
            <span className="text-rose-400 font-bold">HEADWIND / SHOCK VETO: {bearishPct}%</span>
          </div>
        </div>
      </div>

      {/* Dynamic Institutional Bot Logic Stack: Live Top 3 Confirmed Leaders with 1-Click Deploy */}
      <div className="w-full flex flex-col space-y-4">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-emerald-400" />
            <span className="text-base text-slate-100 font-bold font-sans">
              Top 3 Confirmed Institutional Leaders (1-Click AI Council Deploy)
            </span>
          </div>
          <span className="text-xs text-cyan-300 font-bold">
            ZERO STATIC SCRIPTS · UPDATED ON EVERY TICK
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {topLiveLeaders.map((leader, idx) => {
            const secCode = resolveSymbolSector(leader.symbol);
            const secFlow = macro12.participantFlow.sectorFlows[secCode];
            return (
              <div
                key={leader.symbol}
                className="rounded-2xl bg-[#080d1a]/95 p-5 border border-emerald-500/30 shadow-xl flex flex-col justify-between space-y-3"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold">
                          #{idx + 1} CONFIRMED LEADER
                        </span>
                        <span className="text-lg text-white font-bold">{leader.symbol}</span>
                      </div>
                      <span className="text-xs text-slate-400 font-sans block mt-0.5">
                        {leader.name} // {leader.sector}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-base font-bold text-emerald-400 tabular-nums block">
                        ₹{leader.ltp.toLocaleString('en-IN')}
                      </span>
                      <span
                        className={`text-xs font-bold tabular-nums ${
                          leader.changePct >= 0 ? 'text-emerald-300' : 'text-rose-400'
                        }`}
                      >
                        {leader.changePct >= 0 ? '+' : ''}
                        {leader.changePct.toFixed(2)}% (Alpha {leader.relAlphaVsNifty >= 0 ? '+' : ''}
                        {leader.relAlphaVsNifty.toFixed(2)}%)
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">LEARNED SCORE</span>
                      <span className="text-sm text-cyan-300 font-bold">
                        {leader.learnedScore} / 100
                      </span>
                      <span className="text-[10px] text-slate-500 block mt-0.5">
                        Intraday Range: {leader.intradayRangePct}%
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">FII/DII CONVICTION</span>
                      <span className="text-sm text-emerald-400 font-bold">
                        {secFlow ? `${secFlow.netSectorConviction >= 0 ? '+' : ''}${secFlow.netSectorConviction}` : '+45'}
                      </span>
                      <span className="text-[10px] text-slate-500 block mt-0.5">
                        Vol/Deliv: {secFlow?.intradayVolumeDeliveryRatio ?? 1.7}x
                      </span>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950/90 border border-slate-800">
                    <div className="flex items-center gap-1.5 mb-1 text-cyan-300 text-[11px] font-bold">
                      <Activity className="w-3.5 h-3.5" />
                      <span>LIVE CAUSAL &amp; ELECTION RATIONALE</span>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-relaxed font-sans">
                      {leader.rationale}
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800 flex items-center gap-2">
                  <button
                    onClick={() => handleDeployConfirmedLeader(leader)}
                    className="flex-1 py-2 px-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-[11px] uppercase tracking-wider cursor-pointer transition flex items-center justify-center gap-1.5 shadow-[0_0_12px_rgba(0,240,255,0.25)]"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>Deploy via AI Council (&gt;2% Net)</span>
                  </button>
                  <button
                    onClick={handleJumpToOrderBook}
                    className="py-2 px-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-cyan-300 text-[10px] font-bold cursor-pointer transition"
                    title="Open in Order Book"
                  >
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Quarantined / Vetoed Scripts Row */}
        {topVetoedLaggards.length > 0 && (
          <div className="rounded-2xl bg-rose-950/15 border border-rose-500/30 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-rose-300 uppercase flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                <span>
                  Quarantined &amp; Macro/Election-Vetoed Scripts (Blocked From Long Deployment · Eligible for Mode B Bear Puts)
                </span>
              </span>
              <span className="text-[10px] text-rose-300 font-bold">
                ZERO CAPITAL LEAKAGE
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {topVetoedLaggards.map((vetoed) => (
                <div
                  key={vetoed.symbol}
                  className="p-3 rounded-xl bg-slate-950/80 border border-rose-500/30 text-xs"
                >
                  <div className="flex items-center justify-between font-bold">
                    <span className="text-white">{vetoed.symbol} ({vetoed.sector})</span>
                    <span className="text-rose-400 tabular-nums">
                      ₹{vetoed.ltp.toLocaleString('en-IN')} ({vetoed.changePct >= 0 ? '+' : ''}
                      {vetoed.changePct.toFixed(2)}%)
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed font-sans">
                    {vetoed.quarantineReason || vetoed.rationale}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
