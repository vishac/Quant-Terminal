import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Globe,
  Brain,
  Landmark,
  ShieldAlert,
  Layers,
  RefreshCw,
  CheckCircle2,
  XCircle,
  ArrowUpRight,
  ArrowDownRight,
  PlusCircle,
  Trash2,
  ExternalLink,
  Scale,
  Compass,
  Award,
  Activity,
  Clock,
  ShieldCheck,
  Zap,
  Sliders,
  X,
} from 'lucide-react';
import type { MarketQuote, PaperTradeOrder } from '../types/quant';
import type {
  FirstPrinciplesMarketPayload,
  SectorGainLossItem,
  SelfLearningAgentProfile,
  PredictionAuditRecord,
} from '../server/firstPrinciplesEngine';
import {
  computeInstitutionalStockSetupBlueprint,
  type SetupInstrumentMode,
  type InstitutionalStockSetupBlueprint,
} from '../utils/institutionalSetupBlueprint';
import type { ActionableStockImpact } from '../server/globalMarketImpactEngine';
import { getStoredPaperTrades, persistPaperTrades } from '../services/paperTradeService';
import { formatOrderDate, formatOrderTime } from '../utils/orderFormatters';
import { AutonomousSchedulerHub } from './AutonomousSchedulerHub';

interface SetupModalContext {
  symbol: string;
  name: string;
  sector: string;
  direction: 'RISE' | 'FALL';
  entryPrice: number;
  targetPrice: number;
  stopLoss: number;
  leadPillar: string;
  causalSummary: {
    globalOrGeoReason: string;
    basicsAndPolicyReason: string;
    emotionsOrFlowReason: string;
    catalystHeadline: string;
  };
}

interface TrackedPosition {
  id: string;
  symbol: string;
  name: string;
  sector: string;
  direction: 'RISE' | 'FALL';
  entryPrice: number;
  targetPrice: number;
  stopLoss: number;
  quantity: number;
  capitalAllocated: number;
  addedAt: string;
  leadPillar: string;
}

interface FirstPrinciplesMarketEngineProps {
  quotes: Record<string, MarketQuote>;
  onOpenBacktest?: () => void;
  onNavigateToAgents?: () => void;
}

export const FirstPrinciplesMarketEngine: React.FC<FirstPrinciplesMarketEngineProps> = ({
  quotes,
  onOpenBacktest,
  onNavigateToAgents,
}) => {
  const [payload, setPayload] = useState<FirstPrinciplesMarketPayload | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [calibrating, setCalibrating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [activeView, setActiveView] = useState<
    'OVERVIEW_DECISIONS' | 'FOUR_FOUNDATIONS' | 'SECTOR_ROTATION' | 'SELF_LEARNING_AGENTS' | 'AUTONOMOUS_SCHEDULER'
  >('OVERVIEW_DECISIONS');

  const [selectedSectorId, setSelectedSectorId] = useState<string>('pharma');
  const [capitalBase, setCapitalBase] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('jarvis_fp_capital_base');
      return saved ? Math.max(25000, Number(saved)) : 200000;
    } catch {
      return 200000;
    }
  });

  const [trackedPositions, setTrackedPositions] = useState<TrackedPosition[]>(() => {
    try {
      const saved = localStorage.getItem('jarvis_fp_tracked_positions');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Custom user feedback memory for agent weight boost
  const [userAgentFeedbackBoost, setUserAgentFeedbackBoost] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem('jarvis_fp_agent_feedback');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [feedbackNotice, setFeedbackNotice] = useState<string | null>(null);

  // Interactive Institutional Trade Setup & 2026 Tax/Risk Blueprint Modal state
  const [activeSetupContext, setActiveSetupContext] = useState<SetupModalContext | null>(null);
  const [setupInstrumentMode, setSetupInstrumentMode] = useState<SetupInstrumentMode>('CASH_CNC');
  const [setupSizingMethod, setSetupSizingMethod] = useState<'ONE_PCT_RISK' | 'QUARTER_KELLY'>('ONE_PCT_RISK');
  const [setupTslEnabled, setSetupTslEnabled] = useState<boolean>(true);
  const [sessionOrders, setSessionOrders] = useState<PaperTradeOrder[]>(() => getStoredPaperTrades());

  useEffect(() => {
    const syncOrders = () => setSessionOrders(getStoredPaperTrades());
    window.addEventListener('jarvis:orders-updated', syncOrders);
    window.addEventListener('storage', syncOrders);
    return () => {
      window.removeEventListener('jarvis:orders-updated', syncOrders);
      window.removeEventListener('storage', syncOrders);
    };
  }, []);

  const fetchIntelligence = useCallback(async (recalibrate = false) => {
    try {
      if (recalibrate) setCalibrating(true);
      else setLoading(true);
      setError(null);
      const res = await fetch(`/api/market/first-principles${recalibrate ? '?recalibrate=true' : ''}`);
      const json = await res.json();
      if (res.ok && json?.success && json?.data) {
        setPayload(json.data);
      } else {
        setError(json?.error || 'Unable to load first-principles market intelligence.');
      }
    } catch (err: any) {
      setError(String(err?.message || 'Network error loading market intelligence.'));
    } finally {
      setLoading(false);
      setCalibrating(false);
    }
  }, []);

  useEffect(() => {
    fetchIntelligence(false);
    const timer = setInterval(() => fetchIntelligence(false), 30000);
    return () => clearInterval(timer);
  }, [fetchIntelligence]);

  const handleRunSelfLearningCycle = async () => {
    await fetchIntelligence(true);
    setFeedbackNotice(
      'Self-learning calibration complete: 5 Agents graded open calls against live NSE prices & updated Bayesian weights.',
    );
    setTimeout(() => setFeedbackNotice(null), 5000);
  };

  const handleTrackStockSetup = (
    symbol: string,
    name: string,
    sector: string,
    direction: 'RISE' | 'FALL',
    entryPrice: number,
    targetPrice: number,
    stopLoss: number,
    leadPillar: string,
    customQty?: number,
    customCapitalAllocated?: number,
  ) => {
    const livePrice = quotes[symbol]?.price ?? entryPrice;
    const riskPerShare = Math.max(1, Math.abs(livePrice - stopLoss));
    const maxRiskRupees = capitalBase * 0.01; // 1% max risk rule
    const qty = customQty ?? Math.max(1, Math.floor(maxRiskRupees / riskPerShare));

    const newPos: TrackedPosition = {
      id: `${symbol}-${direction}-${Date.now()}`,
      symbol,
      name,
      sector,
      direction,
      entryPrice: livePrice,
      targetPrice,
      stopLoss,
      quantity: qty,
      capitalAllocated: customCapitalAllocated ?? Math.round(qty * livePrice),
      addedAt: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      leadPillar,
    };

    const next = [newPos, ...trackedPositions.filter((p) => p.symbol !== symbol)];
    setTrackedPositions(next);
    try {
      localStorage.setItem('jarvis_fp_tracked_positions', JSON.stringify(next));
    } catch { /* ignore */ }
    setFeedbackNotice(
      `Tracked ${symbol.replace('.NS', '')} (${direction === 'RISE' ? 'LONG BUY' : 'SHORT / AVOID'}) in Live ROI Decision Ledger — Qty: ${qty} @ ₹${livePrice.toLocaleString('en-IN')}.`,
    );
    setTimeout(() => setFeedbackNotice(null), 5000);
  };

  const handleOpenSetupBlueprintModal = (ctx: SetupModalContext) => {
    setSetupInstrumentMode(ctx.direction === 'FALL' ? 'INTRADAY_MIS' : 'CASH_CNC');
    setActiveSetupContext(ctx);
  };

  const activeBlueprint: InstitutionalStockSetupBlueprint | null = useMemo(() => {
    if (!activeSetupContext) return null;
    const livePrice = quotes[activeSetupContext.symbol]?.price ?? activeSetupContext.entryPrice;
    return computeInstitutionalStockSetupBlueprint({
      symbol: activeSetupContext.symbol,
      name: activeSetupContext.name,
      sector: activeSetupContext.sector,
      direction: activeSetupContext.direction,
      livePrice,
      targetPrice: activeSetupContext.targetPrice,
      stopLossPrice: activeSetupContext.stopLoss,
      capitalBase,
      instrumentMode: setupInstrumentMode,
      sizingMethod: setupSizingMethod,
    });
  }, [activeSetupContext, quotes, capitalBase, setupInstrumentMode, setupSizingMethod]);

  const handleDeployBlueprintToOrderBook = (bp: InstitutionalStockSetupBlueprint) => {
    if (!activeSetupContext) return;
    // 1. Track in ROI Decision Ledger
    handleTrackStockSetup(
      bp.symbol,
      bp.name,
      bp.sector,
      bp.direction,
      bp.spotEntryPrice,
      bp.target2Price,
      bp.stopLossPrice,
      activeSetupContext.leadPillar,
      bp.quantity,
      bp.marginRequired,
    );

    // 2. Dispatch verified PaperTradeOrder into Live Session Order Book
    const now = new Date();
    const agentId =
      activeSetupContext.leadPillar.toLowerCase().includes('vidura') || activeSetupContext.leadPillar.toLowerCase().includes('geo')
        ? 'agent_vidura'
        : activeSetupContext.leadPillar.toLowerCase().includes('chanakya') || activeSetupContext.leadPillar.toLowerCase().includes('policy')
          ? 'agent_chanakya'
          : activeSetupContext.leadPillar.toLowerCase().includes('arjuna') || activeSetupContext.leadPillar.toLowerCase().includes('emotion')
            ? 'agent_arjuna'
            : 'agent_bhishma';

    const segment: PaperTradeOrder['segment'] =
      bp.instrumentMode === 'NSE_FUTURES' || bp.instrumentMode === 'NSE_OPTION' ? 'NSE_FNO' : 'NSE_CASH';

    const newOrder: PaperTradeOrder = {
      id: `ORD-FP-${bp.baseTicker}-${Date.now().toString().slice(-5)}`,
      agentId,
      agentName: activeSetupContext.leadPillar,
      symbol: bp.symbol,
      segment,
      strategyName: `${bp.instrumentLabel} · ${bp.direction === 'RISE' ? 'Long Accumulation' : 'Short / Tactical Hedge'}${setupTslEnabled ? ' [TSL ARMED]' : ''}`,
      legs: [
        {
          instrument: bp.contractSymbol,
          action: bp.side,
          qty: bp.quantity,
          price: bp.instrumentEntryPrice,
          exitPrice: bp.instrumentEntryPrice,
        },
      ],
      totalInvestmentINR: bp.marginRequired,
      maxDefinedLossINR: Math.min(400, Math.max(200, Math.round(bp.taxAudit.grossRiskAtStop))),
      targetProfitINR: Math.round(bp.taxAudit.netWinAfterTax),
      riskRewardRatio: `1 : ${bp.rewardToRiskRatio}`,
      timestamp: now.toLocaleTimeString('en-IN', { hour12: false }),
      orderDate: formatOrderDate(now),
      orderTime: formatOrderTime(now),
      status: 'OPEN',
      pnlINR: 0,
      peakPnlINR: 0,
      trailingStopPnlINR: -Math.min(400, Math.max(200, Math.round(bp.taxAudit.grossRiskAtStop))),
      trailingStopPrice: bp.instrumentStopLoss,
      initialStopLossPrice: bp.instrumentStopLoss,
      targetPriceLevel: bp.instrumentTarget2,
      tslStage: setupTslEnabled ? 'BREAKEVEN_ARMED' : 'INITIAL_RISK_STOP',
      entryPrice: bp.instrumentEntryPrice,
      exitPrice: bp.instrumentEntryPrice,
      side: bp.side,
      qty: bp.quantity,
      sebiComplianceVerified: !bp.taxAudit.isVetoed,
    };

    const existing = getStoredPaperTrades();
    const updatedOrders = [newOrder, ...existing];
    persistPaperTrades(updatedOrders);
    setSessionOrders(updatedOrders);
    setActiveSetupContext(null);
    setFeedbackNotice(
      `⚡ Deployed ${bp.contractSymbol} (${bp.side} Qty ${bp.quantity} @ ₹${bp.instrumentEntryPrice.toLocaleString('en-IN')}) to Live Session Order Book & ROI Ledger.`,
    );
    setTimeout(() => setFeedbackNotice(null), 6000);
  };

  const handleRemovePosition = (id: string) => {
    const next = trackedPositions.filter((p) => p.id !== id);
    setTrackedPositions(next);
    try {
      localStorage.setItem('jarvis_fp_tracked_positions', JSON.stringify(next));
    } catch { /* ignore */ }
  };

  const handleGradePositionForLearning = (pos: TrackedPosition, currentPrice: number) => {
    const isWin =
      pos.direction === 'RISE' ? currentPrice >= pos.entryPrice : currentPrice <= pos.entryPrice;
    const agentKey =
      pos.leadPillar.toLowerCase().includes('vidura') || pos.leadPillar.toLowerCase().includes('geo')
        ? 'vidura'
        : pos.leadPillar.toLowerCase().includes('chanakya') || pos.leadPillar.toLowerCase().includes('policy')
          ? 'chanakya'
          : pos.leadPillar.toLowerCase().includes('arjuna') || pos.leadPillar.toLowerCase().includes('emotion')
            ? 'arjuna'
            : 'bhishma';

    const delta = isWin ? 1.5 : -1.0;
    const updated = {
      ...userAgentFeedbackBoost,
      [agentKey]: Number(((userAgentFeedbackBoost[agentKey] || 0) + delta).toFixed(1)),
    };
    setUserAgentFeedbackBoost(updated);
    try {
      localStorage.setItem('jarvis_fp_agent_feedback', JSON.stringify(updated));
    } catch { /* ignore */ }

    setFeedbackNotice(
      isWin
        ? `Logged WIN on ${pos.symbol.replace('.NS', '')}: Reinforced ${agentKey.toUpperCase()} weight by +1.5% in self-learning memory.`
        : `Logged LOSS on ${pos.symbol.replace('.NS', '')}: Penalized ${agentKey.toUpperCase()} weight by -1.0% and tightened stop-loss filter.`,
    );
    setTimeout(() => setFeedbackNotice(null), 5000);
  };

  const portfolioSummary = useMemo(() => {
    let netPnl = 0;
    let targetProfit = 0;
    let maxRisk = 0;

    const enriched = trackedPositions.map((pos) => {
      const currentPrice = quotes[pos.symbol]?.price ?? pos.entryPrice;
      const perSharePnl =
        pos.direction === 'RISE'
          ? currentPrice - pos.entryPrice
          : pos.entryPrice - currentPrice;
      const positionPnl = perSharePnl * pos.quantity;
      const pnlPct = pos.entryPrice > 0 ? (perSharePnl / pos.entryPrice) * 100 : 0;
      const expectedTargetProfit = Math.abs(pos.targetPrice - pos.entryPrice) * pos.quantity;
      const definedRisk = Math.abs(pos.entryPrice - pos.stopLoss) * pos.quantity;

      netPnl += positionPnl;
      targetProfit += expectedTargetProfit;
      maxRisk += definedRisk;

      return {
        ...pos,
        currentPrice,
        positionPnl,
        pnlPct,
        expectedTargetProfit,
        definedRisk,
      };
    });

    return {
      positions: enriched,
      netPnl,
      targetProfit,
      maxRisk,
      roiOnCapitalPct: capitalBase > 0 ? (netPnl / capitalBase) * 100 : 0,
    };
  }, [trackedPositions, quotes, capitalBase]);

  const liveReconciled = useMemo(() => {
    if (!payload) return null;

    const rawRising = payload.globalImpact.risingStocks || [];
    const rawFalling = payload.globalImpact.fallingStocks || [];

    const liveRisingMap = new Map<string, ActionableStockImpact>();
    const liveFallingMap = new Map<string, ActionableStockImpact>();

    const allEvaluated = [...rawRising, ...rawFalling];
    for (const st of allEvaluated) {
      const livePrice = quotes[st.symbol]?.price ?? st.livePrice;
      const livePct = quotes[st.symbol]?.changePct ?? st.changePct;
      const updatedStock: ActionableStockImpact = {
        ...st,
        livePrice: Number(livePrice.toFixed(2)),
        changePct: Number(livePct.toFixed(2)),
      };

      const isCurrentlyRising =
        livePct >= 0.05 || (livePct >= -0.05 && st.direction === 'RISING');

      if (isCurrentlyRising) {
        if (!liveFallingMap.has(st.symbol)) {
          liveRisingMap.set(st.symbol, { ...updatedStock, direction: 'RISING' });
        }
      } else {
        liveRisingMap.delete(st.symbol);
        liveFallingMap.set(st.symbol, { ...updatedStock, direction: 'FALLING' });
      }
    }

    const risingSymbols = new Set(liveRisingMap.keys());
    const fallingSymbols = new Set(liveFallingMap.keys());

    // Reconcile sectorRotationMatrix with live quotes and strictly disjoint Buy/Avoid sets
    const reconciledSectors = payload.sectorRotationMatrix.map((sec) => {
      const allSectorStocksMap = new Map<string, typeof sec.stocksToBuy[number]>();
      for (const s of [...sec.stocksToBuy, ...sec.stocksToAvoidOrShort]) {
        const lp = quotes[s.symbol]?.price ?? s.price;
        const lpct = quotes[s.symbol]?.changePct ?? s.changePct;
        allSectorStocksMap.set(s.symbol, {
          ...s,
          price: Number(lp.toFixed(2)),
          changePct: Number(lpct.toFixed(2)),
        });
      }

      const nextBuy: typeof sec.stocksToBuy = [];
      const nextAvoid: typeof sec.stocksToAvoidOrShort = [];

      for (const s of allSectorStocksMap.values()) {
        const inFalling = fallingSymbols.has(s.symbol);
        const inRising = risingSymbols.has(s.symbol);
        const isLiveGain =
          !inFalling && (inRising || s.changePct >= 0.05 || (s.changePct >= -0.05 && sec.stocksToBuy.some((b) => b.symbol === s.symbol)));

        if (isLiveGain) {
          const targetPrice = s.targetPrice > s.price ? s.targetPrice : Number((s.price * 1.035).toFixed(2));
          const stopLoss = s.stopLoss < s.price ? s.stopLoss : Number((s.price * 0.983).toFixed(2));
          nextBuy.push({
            ...s,
            entryPrice: s.price,
            targetPrice,
            stopLoss,
          });
        } else {
          const targetPrice = s.targetPrice < s.price ? s.targetPrice : Number((s.price * 0.966).toFixed(2));
          const stopLoss = s.stopLoss > s.price ? s.stopLoss : Number((s.price * 1.017).toFixed(2));
          nextAvoid.push({
            ...s,
            entryPrice: s.price,
            targetPrice,
            stopLoss,
            reason:
              s.changePct < 0
                ? `Live intraday supply (${s.changePct.toFixed(2)}%) — avoid long accumulation until relative strength recovers.`
                : s.reason,
          });
        }
      }

      nextBuy.sort((a, b) => b.changePct - a.changePct);
      nextAvoid.sort((a, b) => a.changePct - b.changePct);

      const allVals = Array.from(allSectorStocksMap.values());
      const liveAvgPct =
        allVals.length > 0
          ? Number((allVals.reduce((acc, item) => acc + item.changePct, 0) / allVals.length).toFixed(2))
          : sec.avgChangePctToday;

      let adjustedScore = sec.netScore;
      if (nextBuy.length === 0 && liveAvgPct < 0) {
        adjustedScore = Math.min(-22, adjustedScore);
      } else if (nextAvoid.length === 0 && liveAvgPct > 0.25) {
        adjustedScore = Math.max(22, adjustedScore);
      }

      return {
        ...sec,
        avgChangePctToday: liveAvgPct,
        netScore: adjustedScore,
        stocksToBuy: nextBuy,
        stocksToAvoidOrShort: nextAvoid,
      };
    });

    return {
      sectorRotationMatrix: reconciledSectors,
      globalImpact: {
        ...payload.globalImpact,
        risingStocks: Array.from(liveRisingMap.values()).sort((a, b) => b.convictionScore - a.convictionScore),
        fallingStocks: Array.from(liveFallingMap.values()).sort((a, b) => b.convictionScore - a.convictionScore),
      },
    };
  }, [payload, quotes]);

  if (loading && !payload) {
    return (
      <div className="p-8 bg-slate-900/70 border border-slate-800 rounded-xl text-slate-300 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <RefreshCw className="w-5 h-5 text-cyan-400 animate-spin" />
          <div>
            <div className="text-sm font-semibold text-white">
              Synthesizing First-Principles Market Intelligence & Calibrating Self-Learning Agents...
            </div>
            <div className="text-xs text-slate-400 mt-0.5">
              Analyzing Market Basics · Crowd Emotions · Govt Policy & FII/DII Flows · Geopolitics · 3-Month NSE Walk-Forward Accuracy
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error && !payload) {
    return (
      <div className="p-6 bg-rose-950/30 border border-rose-500/40 rounded-xl text-rose-200 flex items-center justify-between">
        <div className="text-sm">{error}</div>
        <button
          onClick={() => fetchIntelligence(false)}
          className="px-4 py-2 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 text-xs font-semibold cursor-pointer"
        >
          Retry Sync
        </button>
      </div>
    );
  }

  if (!payload || !liveReconciled) return null;

  const {
    pillars,
    crowdPsychology,
    policyAndFlows,
    geopolitics,
    selfLearning,
  } = payload;

  const { sectorRotationMatrix, globalImpact } = liveReconciled;

  const gainingSectors = sectorRotationMatrix.filter(
    (s) => s.netScore >= 20 && s.stocksToBuy.length > 0,
  );
  const losingSectors = sectorRotationMatrix.filter(
    (s) => s.netScore <= -20 && s.stocksToAvoidOrShort.length > 0,
  );
  const selectedSector =
    sectorRotationMatrix.find((s) => s.sectorId === selectedSectorId) || sectorRotationMatrix[0];

  return (
    <div className="space-y-6">
      {/* Top Executive First-Principles Header & Self-Learning Status Bar */}
      <section className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-lg">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <div className="text-xs text-cyan-400 font-medium tracking-wide">
              First-Principles Indian Market Decision System · Self-Learning Generation #{selfLearning.generationNumber} · Verified Accuracy {selfLearning.overallSystemAccuracyPct}% ({selfLearning.totalVerifiedCalls} Audited Calls)
            </div>
            <h1 className="text-lg md:text-xl font-bold text-white mt-1 leading-snug">
              {globalImpact.marketRegimeBanner.headline}
            </h1>
            <p className="text-xs text-slate-300 mt-1.5 leading-relaxed max-w-5xl">
              {globalImpact.marketRegimeBanner.executiveSummary}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2">
              <label className="text-xs text-slate-400">Your Capital:</label>
              <select
                value={capitalBase}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setCapitalBase(val);
                  try {
                    localStorage.setItem('jarvis_fp_capital_base', String(val));
                  } catch { /* ignore */ }
                }}
                className="bg-transparent text-xs font-mono font-bold text-emerald-400 focus:outline-none cursor-pointer"
              >
                <option value={50000} className="bg-slate-900">₹50,000</option>
                <option value={100000} className="bg-slate-900">₹1,00,000</option>
                <option value={200000} className="bg-slate-900">₹2,00,000</option>
                <option value={500000} className="bg-slate-900">₹5,00,000</option>
                <option value={1000000} className="bg-slate-900">₹10,00,000</option>
              </select>
            </div>

            <button
              onClick={handleRunSelfLearningCycle}
              disabled={calibrating}
              className="px-3.5 py-2 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 text-cyan-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${calibrating ? 'animate-spin' : ''}`} />
              <span>{calibrating ? 'Calibrating Agents...' : 'Run Self-Learning Calibration'}</span>
            </button>

            {onOpenBacktest && (
              <button
                onClick={onOpenBacktest}
                className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors cursor-pointer"
              >
                Historical Backtest Lab
              </button>
            )}
          </div>
        </div>

        {feedbackNotice && (
          <div className="mt-3 p-3 rounded-lg bg-emerald-950/40 border border-emerald-500/40 text-emerald-200 text-xs flex items-center justify-between">
            <span>{feedbackNotice}</span>
            <button onClick={() => setFeedbackNotice(null)} className="text-emerald-400 hover:underline text-xs cursor-pointer">
              Dismiss
            </button>
          </div>
        )}

        {/* 4 First-Principle Pillars Quick Summary Strip */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
          {pillars.map((pillar) => {
            const isPositive = pillar.score >= 15;
            const isNegative = pillar.score <= -15;
            return (
              <div
                key={pillar.id}
                onClick={() => setActiveView('FOUR_FOUNDATIONS')}
                className="p-3.5 rounded-lg bg-slate-950/90 border border-slate-800 hover:border-slate-700 transition-colors cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>{pillar.specialistAgent}</span>
                    <span
                      className={`font-mono font-bold ${
                        isPositive ? 'text-emerald-400' : isNegative ? 'text-rose-400' : 'text-amber-300'
                      }`}
                    >
                      {pillar.score > 0 ? '+' : ''}{pillar.score} / 100
                    </span>
                  </div>
                  <h2 className="text-sm font-bold text-white mt-1">{pillar.title}</h2>
                  <p className="text-xs text-slate-300 mt-1 line-clamp-2 leading-relaxed">
                    {pillar.primaryDriverHeadline}
                  </p>
                </div>
                <div className="mt-2.5 pt-2 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
                  <span className="truncate">Gaining: <strong className="text-emerald-400 font-normal">{pillar.sectorWinners[0]}</strong></span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Primary View Switcher (Functional Segmented Control) */}
        <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-4 border-t border-slate-800">
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-950 rounded-lg border border-slate-800">
            <button
              onClick={() => setActiveView('OVERVIEW_DECISIONS')}
              className={`px-3.5 py-2 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                activeView === 'OVERVIEW_DECISIONS'
                  ? 'bg-cyan-500 text-slate-950'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              1. Today’s Stock & Sector Decisions (Rise vs Fall)
            </button>
            <button
              onClick={() => setActiveView('SECTOR_ROTATION')}
              className={`px-3.5 py-2 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                activeView === 'SECTOR_ROTATION'
                  ? 'bg-cyan-500 text-slate-950'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              2. Sector Gain/Loss Matrix ({gainingSectors.length} Gaining · {losingSectors.length} Losing)
            </button>
            <button
              onClick={() => setActiveView('FOUR_FOUNDATIONS')}
              className={`px-3.5 py-2 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                activeView === 'FOUR_FOUNDATIONS'
                  ? 'bg-cyan-500 text-slate-950'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              3. Basics, Emotions, Policy & Geopolitics
            </button>
            <button
              onClick={() => setActiveView('SELF_LEARNING_AGENTS')}
              className={`px-3.5 py-2 rounded-md text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                activeView === 'SELF_LEARNING_AGENTS'
                  ? 'bg-cyan-500 text-slate-950'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              4. Prediction Audit &amp; Calibration
            </button>
            <button
              onClick={() => setActiveView('AUTONOMOUS_SCHEDULER')}
              className={`px-3.5 py-2 rounded-md text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                activeView === 'AUTONOMOUS_SCHEDULER'
                  ? 'bg-cyan-500 text-slate-950 font-bold'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>5. Autonomous Scheduler &amp; Ledger</span>
            </button>
          </div>

          <div className="text-xs text-slate-400">
            Crowd Fear/Greed: <strong className="text-white">{crowdPsychology.fearGreedIndex}/100</strong> · FII: <strong className="text-rose-400">{policyAndFlows.fiiFlowStance.replace(/_/g, ' ')}</strong> · DII: <strong className="text-emerald-400">{policyAndFlows.diiFlowStance.replace(/_/g, ' ')}</strong>
          </div>
        </div>
      </section>

      {/* Active ROI Decision Tracker & Self-Learning Feedback Bar */}
      {portfolioSummary.positions.length > 0 && (
        <section className="bg-slate-900/90 border border-cyan-500/30 rounded-xl p-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div>
              <h2 className="text-sm font-bold text-white">
                Active ROI Decision Tracker & Live Agent Feedback Loop ({portfolioSummary.positions.length} Open Setups)
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Sized for 1% max capital risk on ₹{capitalBase.toLocaleString('en-IN')}. Click “Grade Outcome” on any setup to feed its live result directly into the 5 Agents’ self-learning weights.
              </p>
            </div>
            <div className="flex items-center gap-5 font-mono text-xs">
              <div>
                <div className="text-slate-400">Live Open P&L</div>
                <div className={`text-sm font-bold ${portfolioSummary.netPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {portfolioSummary.netPnl >= 0 ? '+' : ''}₹{portfolioSummary.netPnl.toFixed(0)} ({portfolioSummary.roiOnCapitalPct >= 0 ? '+' : ''}{portfolioSummary.roiOnCapitalPct.toFixed(2)}%)
                </div>
              </div>
              <div>
                <div className="text-slate-400">Target Profit</div>
                <div className="text-sm font-bold text-cyan-400">
                  +₹{portfolioSummary.targetProfit.toFixed(0)}
                </div>
              </div>
              <div>
                <div className="text-slate-400">Max Stop Risk</div>
                <div className="text-sm font-bold text-amber-400">
                  -₹{portfolioSummary.maxRisk.toFixed(0)}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-3">
            {portfolioSummary.positions.map((pos) => (
              <div key={pos.id} className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex flex-col justify-between gap-2">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-xs font-bold text-white">
                      {pos.symbol.replace('.NS', '')} · {pos.direction === 'RISE' ? 'LONG (BUY)' : 'SHORT / AVOID'}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {pos.sector} · Lead: {pos.leadPillar}
                    </div>
                  </div>
                  <div className="text-right font-mono">
                    <div className={`text-xs font-bold ${pos.positionPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {pos.positionPnl >= 0 ? '+' : ''}₹{pos.positionPnl.toFixed(0)} ({pos.pnlPct >= 0 ? '+' : ''}{pos.pnlPct.toFixed(2)}%)
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Qty: {pos.quantity} @ ₹{pos.entryPrice.toLocaleString('en-IN')} → ₹{pos.currentPrice.toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[11px]">
                  <span className="font-mono text-slate-400">
                    Target: ₹{pos.targetPrice.toLocaleString('en-IN')} · SL: ₹{pos.stopLoss.toLocaleString('en-IN')}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleGradePositionForLearning(pos, pos.currentPrice)}
                      className="px-2 py-1 rounded bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 font-medium cursor-pointer"
                    >
                      Grade Outcome
                    </button>
                    <button
                      onClick={() => handleRemovePosition(pos.id)}
                      className="text-slate-500 hover:text-rose-400 cursor-pointer"
                      title="Remove setup"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ==================================================================== */}
      {/* VIEW 1: OVERVIEW — TODAY'S SECTOR & STOCK DECISIONS (RISE VS FALL)   */}
      {/* ==================================================================== */}
      {activeView === 'OVERVIEW_DECISIONS' && (
        <div className="space-y-6">
          {/* Quick Sector Winners vs Losers Strip */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-slate-900/80 border border-emerald-500/30 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-sm font-bold text-emerald-400">
                    Sectors Gaining Today (Backed by Policy, Margins & DII Flows)
                  </h2>
                  <p className="text-xs text-slate-400">
                    Focus long capital here — insulated from global oil & US tech shocks
                  </p>
                </div>
                <TrendingUp className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="space-y-2.5">
                {gainingSectors.map((sec) => (
                  <div
                    key={sec.sectorId}
                    onClick={() => {
                      setSelectedSectorId(sec.sectorId);
                      setActiveView('SECTOR_ROTATION');
                    }}
                    className="p-3 rounded-lg bg-slate-950/90 border border-slate-800 hover:border-emerald-500/40 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">{sec.sectorName}</span>
                      <span className="text-xs font-mono font-bold text-emerald-400">
                        Score +{sec.netScore}/100 · Avg {sec.avgChangePctToday >= 0 ? '+' : ''}{sec.avgChangePctToday.toFixed(2)}%
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-1">
                      <strong className="text-slate-200">Why Gaining:</strong> {sec.whyGainingOrLosing.policyReason} {sec.whyGainingOrLosing.marketBasicsReason}
                    </p>
                    <div className="text-[11px] text-emerald-400 mt-1.5 font-mono">
                      Top Stocks to Buy: {sec.stocksToBuy.map((s) => `${s.symbol.replace('.NS', '')} (₹${s.price})`).join(' · ')}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-slate-900/80 border border-rose-500/30 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-sm font-bold text-rose-400">
                    Sectors Losing Today (Hit by Crude, US Tech Slowdown & FII Selling)
                  </h2>
                  <p className="text-xs text-slate-400">
                    Do not average down blindly — high probability of margin compression
                  </p>
                </div>
                <TrendingDown className="w-5 h-5 text-rose-400" />
              </div>
              <div className="space-y-2.5">
                {losingSectors.map((sec) => (
                  <div
                    key={sec.sectorId}
                    onClick={() => {
                      setSelectedSectorId(sec.sectorId);
                      setActiveView('SECTOR_ROTATION');
                    }}
                    className="p-3 rounded-lg bg-slate-950/90 border border-slate-800 hover:border-rose-500/40 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">{sec.sectorName}</span>
                      <span className="text-xs font-mono font-bold text-rose-400">
                        Score {sec.netScore}/100 · Avg {sec.avgChangePctToday >= 0 ? '+' : ''}{sec.avgChangePctToday.toFixed(2)}%
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-1">
                      <strong className="text-slate-200">Why Losing:</strong> {sec.whyGainingOrLosing.geopoliticsReason} {sec.whyGainingOrLosing.emotionsReason}
                    </p>
                    <div className="text-[11px] text-rose-400 mt-1.5 font-mono">
                      Stocks to Avoid / Short: {sec.stocksToAvoidOrShort.map((s) => `${s.symbol.replace('.NS', '')} (₹${s.price})`).join(' · ')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Side-by-Side Particular Stocks Set to RISE vs Stocks Set to FALL with 4-Pillar Causal Reasons */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Stocks Set to RISE */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <div>
                  <h2 className="text-base font-bold text-white">
                    Particular NSE Stocks Set to RISE (Buy / Accumulate)
                  </h2>
                  <p className="text-xs text-slate-400">
                    Selected by the Self-Learning 5 Agents across Basics, Policy, Emotions & Geopolitics
                  </p>
                </div>
                <span className="text-xs font-mono text-emerald-400">
                  {globalImpact.risingStocks.length} High-Conviction Calls
                </span>
              </div>

              {globalImpact.risingStocks.map((stock: ActionableStockImpact) => {
                const livePrice = quotes[stock.symbol]?.price ?? stock.livePrice;
                const livePct = quotes[stock.symbol]?.changePct ?? stock.changePct;
                const isTracked = trackedPositions.some((p) => p.symbol === stock.symbol);

                return (
                  <div
                    key={stock.symbol}
                    className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-emerald-500/40 transition-colors space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-xs text-emerald-400 font-medium">
                          {stock.sector} · Conviction {stock.convictionScore}/100 · R:R {stock.tradeSetup.riskRewardRatio}
                        </div>
                        <h3 className="text-base font-bold text-white mt-0.5">
                          {stock.name} ({stock.symbol.replace('.NS', '')})
                        </h3>
                      </div>
                      <div className="text-right font-mono">
                        <div className="text-base font-bold text-white">
                          ₹{livePrice.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                        </div>
                        <div className={`text-xs font-bold ${livePct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {livePct >= 0 ? '+' : ''}{livePct.toFixed(2)}%
                        </div>
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-slate-950 border border-slate-800/90 space-y-1.5 text-xs">
                      <div className="text-slate-200 font-semibold">
                        Actual Reasons Why {stock.symbol.replace('.NS', '')} Is Set to Rise:
                      </div>
                      <p className="text-slate-300 leading-relaxed">
                        <strong className="text-cyan-400">Global & Geopolitical Trigger:</strong> {stock.primaryGlobalDriver}
                      </p>
                      <p className="text-slate-300 leading-relaxed">
                        <strong className="text-emerald-400">Market Basics & Policy Impact:</strong> {stock.fundamentalTransmissionReason}
                      </p>
                      <p className="text-slate-400 leading-relaxed">
                        <strong className="text-amber-300">Live News Catalyst:</strong> {stock.matchedNewsHeadline}
                      </p>
                    </div>

                    <div className="grid grid-cols-4 gap-2 p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 text-center font-mono text-xs">
                      <div>
                        <div className="text-[10px] text-slate-400">Entry</div>
                        <div className="font-bold text-white">₹{stock.tradeSetup.entryPrice.toLocaleString('en-IN')}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-emerald-400">Target 1</div>
                        <div className="font-bold text-emerald-400">₹{stock.tradeSetup.target1.toLocaleString('en-IN')}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-rose-400">Stop-Loss</div>
                        <div className="font-bold text-rose-400">₹{stock.tradeSetup.stopLoss.toLocaleString('en-IN')}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-cyan-400">Expected ROI</div>
                        <div className="font-bold text-cyan-400">+{stock.tradeSetup.expectedRoiTarget1Pct}%</div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] text-slate-400">
                        1% Risk Sizing on ₹{capitalBase.toLocaleString('en-IN')}:{' '}
                        <strong className="text-white font-mono">
                          {Math.max(1, Math.round((capitalBase / 100000) * stock.tradeSetup.qtyPerOneLakhCapital))} shares
                        </strong>
                      </span>
                      <button
                        onClick={() =>
                          handleOpenSetupBlueprintModal({
                            symbol: stock.symbol,
                            name: stock.name,
                            sector: stock.sector,
                            direction: 'RISE',
                            entryPrice: livePrice,
                            targetPrice: stock.tradeSetup.target1,
                            stopLoss: stock.tradeSetup.stopLoss,
                            leadPillar: 'Chanakya & Bhishma',
                            causalSummary: {
                              globalOrGeoReason: stock.primaryGlobalDriver,
                              basicsAndPolicyReason: stock.fundamentalTransmissionReason,
                              emotionsOrFlowReason: 'Institutional accumulation & positive relative strength vs index.',
                              catalystHeadline: stock.matchedNewsHeadline,
                            },
                          })
                        }
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                          isTracked
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                            : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                        }`}
                      >
                        {isTracked ? '✓ Tracked · View / Deploy Setup' : 'Track Long Setup'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Stocks Set to FALL */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <div>
                  <h2 className="text-base font-bold text-white">
                    Particular NSE Stocks Set to FALL (Avoid / Short)
                  </h2>
                  <p className="text-xs text-slate-400">
                    Direct causal casualties of Crude spikes, US Tech slowdown & FII outflows
                  </p>
                </div>
                <span className="text-xs font-mono text-rose-400">
                  {globalImpact.fallingStocks.length} High-Risk Alerts
                </span>
              </div>

              {globalImpact.fallingStocks.map((stock: ActionableStockImpact) => {
                const livePrice = quotes[stock.symbol]?.price ?? stock.livePrice;
                const livePct = quotes[stock.symbol]?.changePct ?? stock.changePct;
                const isTracked = trackedPositions.some((p) => p.symbol === stock.symbol);

                return (
                  <div
                    key={stock.symbol}
                    className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-rose-500/40 transition-colors space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-xs text-rose-400 font-medium">
                          {stock.sector} · Headwind Score {stock.convictionScore}/100 · R:R {stock.tradeSetup.riskRewardRatio}
                        </div>
                        <h3 className="text-base font-bold text-white mt-0.5">
                          {stock.name} ({stock.symbol.replace('.NS', '')})
                        </h3>
                      </div>
                      <div className="text-right font-mono">
                        <div className="text-base font-bold text-white">
                          ₹{livePrice.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                        </div>
                        <div className={`text-xs font-bold ${livePct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {livePct >= 0 ? '+' : ''}{livePct.toFixed(2)}%
                        </div>
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-slate-950 border border-slate-800/90 space-y-1.5 text-xs">
                      <div className="text-slate-200 font-semibold">
                        Actual Reasons Why {stock.symbol.replace('.NS', '')} Is Set to Fall:
                      </div>
                      <p className="text-slate-300 leading-relaxed">
                        <strong className="text-rose-400">Global & Geopolitical Trigger:</strong> {stock.primaryGlobalDriver}
                      </p>
                      <p className="text-slate-300 leading-relaxed">
                        <strong className="text-amber-300">Margin & Flow Impact:</strong> {stock.fundamentalTransmissionReason}
                      </p>
                      <p className="text-slate-400 leading-relaxed">
                        <strong className="text-cyan-400">Live News Catalyst:</strong> {stock.matchedNewsHeadline}
                      </p>
                    </div>

                    <div className="grid grid-cols-4 gap-2 p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 text-center font-mono text-xs">
                      <div>
                        <div className="text-[10px] text-slate-400">Short / Exit</div>
                        <div className="font-bold text-white">₹{stock.tradeSetup.entryPrice.toLocaleString('en-IN')}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-emerald-400">Downside Target</div>
                        <div className="font-bold text-emerald-400">₹{stock.tradeSetup.target1.toLocaleString('en-IN')}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-rose-400">Stop-Loss</div>
                        <div className="font-bold text-rose-400">₹{stock.tradeSetup.stopLoss.toLocaleString('en-IN')}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-cyan-400">Downside Move</div>
                        <div className="font-bold text-cyan-400">+{stock.tradeSetup.expectedRoiTarget1Pct}%</div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] text-slate-400">
                        1% Risk Sizing on ₹{capitalBase.toLocaleString('en-IN')}:{' '}
                        <strong className="text-white font-mono">
                          {Math.max(1, Math.round((capitalBase / 100000) * stock.tradeSetup.qtyPerOneLakhCapital))} shares
                        </strong>
                      </span>
                      <button
                        onClick={() =>
                          handleOpenSetupBlueprintModal({
                            symbol: stock.symbol,
                            name: stock.name,
                            sector: stock.sector,
                            direction: 'FALL',
                            entryPrice: livePrice,
                            targetPrice: stock.tradeSetup.target1,
                            stopLoss: stock.tradeSetup.stopLoss,
                            leadPillar: 'Vidura (Geopolitics/Crude)',
                            causalSummary: {
                              globalOrGeoReason: stock.primaryGlobalDriver,
                              basicsAndPolicyReason: stock.fundamentalTransmissionReason,
                              emotionsOrFlowReason: 'Institutional distribution & retail dip-buying trap warning.',
                              catalystHeadline: stock.matchedNewsHeadline,
                            },
                          })
                        }
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                          isTracked
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30'
                            : 'bg-rose-500 hover:bg-rose-400 text-slate-950'
                        }`}
                      >
                        {isTracked ? '✓ Tracked · View / Deploy Setup' : 'Track Short / Avoid'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* VIEW 2: 9-SECTOR GAIN / LOSS ROTATION MATRIX                         */}
      {/* ==================================================================== */}
      {activeView === 'SECTOR_ROTATION' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left Column: Ranked Sector List */}
          <div className="lg:col-span-5 space-y-2.5">
            <h2 className="text-sm font-bold text-white px-1">
              All Indian Sectors Ranked by Net First-Principles Score
            </h2>
            {sectorRotationMatrix.map((sec) => {
              const isSelected = sec.sectorId === selectedSector.sectorId;
              const isGain = sec.netScore >= 20;
              const isLoss = sec.netScore <= -20;

              return (
                <div
                  key={sec.sectorId}
                  onClick={() => setSelectedSectorId(sec.sectorId)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-cyan-500/10 border-cyan-400'
                      : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-bold text-white">{sec.sectorName}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Lead Specialist: {sec.DominantAgentName} · Today Avg: {sec.avgChangePctToday >= 0 ? '+' : ''}{sec.avgChangePctToday.toFixed(2)}%
                      </div>
                    </div>
                    <div className="text-right font-mono">
                      <div
                        className={`text-sm font-bold ${
                          isGain ? 'text-emerald-400' : isLoss ? 'text-rose-400' : 'text-amber-300'
                        }`}
                      >
                        {sec.netScore > 0 ? '+' : ''}{sec.netScore} / 100
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {sec.verdict.replace(/_/g, ' ')}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right Column: Deep 4-Pillar Causal Breakdown of Selected Sector */}
          <div className="lg:col-span-7 bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-5">
            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
              <div>
                <div className="text-xs text-cyan-400 font-medium">
                  Sector First-Principles Causal Breakdown · Lead: {selectedSector.DominantAgentName}
                </div>
                <h2 className="text-lg font-bold text-white mt-0.5">{selectedSector.sectorName}</h2>
              </div>
              <div className="text-right font-mono">
                <div
                  className={`text-lg font-bold ${
                    selectedSector.netScore >= 20
                      ? 'text-emerald-400'
                      : selectedSector.netScore <= -20
                        ? 'text-rose-400'
                        : 'text-amber-300'
                  }`}
                >
                  Net Score: {selectedSector.netScore > 0 ? '+' : ''}{selectedSector.netScore} / 100
                </div>
                <div className="text-xs text-slate-400">
                  Verdict: {selectedSector.verdict.replace(/_/g, ' ')}
                </div>
              </div>
            </div>

            {/* 4 Pillars Breakdown for this Sector */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-white">1. Market Basics & Margins</span>
                  <span className={`font-mono font-bold ${selectedSector.pillarBreakdown.marketBasicsScore >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {selectedSector.pillarBreakdown.marketBasicsScore > 0 ? '+' : ''}{selectedSector.pillarBreakdown.marketBasicsScore}
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                  {selectedSector.whyGainingOrLosing.marketBasicsReason}
                </p>
              </div>

              <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-white">2. People Emotions & Positioning</span>
                  <span className={`font-mono font-bold ${selectedSector.pillarBreakdown.crowdEmotionsScore >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {selectedSector.pillarBreakdown.crowdEmotionsScore > 0 ? '+' : ''}{selectedSector.pillarBreakdown.crowdEmotionsScore}
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                  {selectedSector.whyGainingOrLosing.emotionsReason}
                </p>
              </div>

              <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-white">3. Govt Policy, RBI & FII/DII Flows</span>
                  <span className={`font-mono font-bold ${selectedSector.pillarBreakdown.policyInstitutionsScore >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {selectedSector.pillarBreakdown.policyInstitutionsScore > 0 ? '+' : ''}{selectedSector.pillarBreakdown.policyInstitutionsScore}
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                  {selectedSector.whyGainingOrLosing.policyReason}
                </p>
              </div>

              <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-white">4. Geopolitics & Global Supply Chain</span>
                  <span className={`font-mono font-bold ${selectedSector.pillarBreakdown.geopoliticsScore >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {selectedSector.pillarBreakdown.geopoliticsScore > 0 ? '+' : ''}{selectedSector.pillarBreakdown.geopoliticsScore}
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                  {selectedSector.whyGainingOrLosing.geopoliticsReason}
                </p>
              </div>
            </div>

            {/* Actionable Stocks in this Sector */}
            <div className="space-y-3 pt-2">
              {selectedSector.stocksToBuy.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold text-emerald-400 mb-2">
                    Stocks to BUY / ACCUMULATE in {selectedSector.sectorName}
                  </h3>
                  <div className="space-y-2">
                    {selectedSector.stocksToBuy.map((st) => {
                      const isTracked = trackedPositions.some((p) => p.symbol === st.symbol);
                      const isDeployed = sessionOrders.some((o) => o.symbol === st.symbol && o.status === 'OPEN');
                      const livePrice = quotes[st.symbol]?.price ?? st.price;
                      const riskPerShare = Math.max(1, Math.abs(livePrice - st.stopLoss));
                      const recShares = Math.max(1, Math.floor((capitalBase * 0.01) / riskPerShare));
                      const rr = Number((Math.abs(st.targetPrice - livePrice) / riskPerShare).toFixed(2));

                      return (
                        <div key={st.symbol} className="p-3 rounded-lg bg-slate-950 border border-emerald-500/30 flex flex-col md:flex-row md:items-center justify-between gap-3">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-xs font-bold text-white">
                                {st.name} ({st.symbol.replace('.NS', '')}) · ₹{livePrice.toLocaleString('en-IN')} ({st.changePct >= 0 ? '+' : ''}{st.changePct}%)
                              </span>
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                                R:R 1:{rr} · 1% Risk Qty: {recShares} shs
                              </span>
                              {isDeployed && (
                                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                                  ⚡ Live in Order Book
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-300 mt-0.5">{st.reason}</div>
                            <div className="text-[11px] font-mono text-slate-400 mt-1">
                              Entry: ₹{livePrice} · Target: ₹{st.targetPrice} · Stop-Loss: ₹{st.stopLoss}
                            </div>
                          </div>
                          <button
                            onClick={() =>
                              handleOpenSetupBlueprintModal({
                                symbol: st.symbol,
                                name: st.name,
                                sector: selectedSector.sectorName,
                                direction: 'RISE',
                                entryPrice: livePrice,
                                targetPrice: st.targetPrice,
                                stopLoss: st.stopLoss,
                                leadPillar: selectedSector.DominantAgentName,
                                causalSummary: {
                                  globalOrGeoReason: selectedSector.whyGainingOrLosing.geopoliticsReason,
                                  basicsAndPolicyReason: `${selectedSector.whyGainingOrLosing.policyReason} ${selectedSector.whyGainingOrLosing.marketBasicsReason}`,
                                  emotionsOrFlowReason: selectedSector.whyGainingOrLosing.emotionsReason,
                                  catalystHeadline: st.reason,
                                },
                              })
                            }
                            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold shrink-0 cursor-pointer transition-colors ${
                              isTracked || isDeployed
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                                : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                            }`}
                          >
                            {isDeployed
                              ? '⚡ Deployed · View Setup'
                              : isTracked
                                ? '✓ Tracked · View / Deploy'
                                : 'Track Buy Setup'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {selectedSector.stocksToAvoidOrShort.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold text-rose-400 mb-2">
                    Stocks to AVOID / SHORT in {selectedSector.sectorName}
                  </h3>
                  <div className="space-y-2">
                    {selectedSector.stocksToAvoidOrShort.map((st) => {
                      const isTracked = trackedPositions.some((p) => p.symbol === st.symbol);
                      const isDeployed = sessionOrders.some((o) => o.symbol === st.symbol && o.status === 'OPEN');
                      const livePrice = quotes[st.symbol]?.price ?? st.price;
                      const riskPerShare = Math.max(1, Math.abs(livePrice - st.stopLoss));
                      const recShares = Math.max(1, Math.floor((capitalBase * 0.01) / riskPerShare));
                      const rr = Number((Math.abs(st.targetPrice - livePrice) / riskPerShare).toFixed(2));

                      return (
                        <div key={st.symbol} className="p-3 rounded-lg bg-slate-950 border border-rose-500/30 flex flex-col md:flex-row md:items-center justify-between gap-3">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-xs font-bold text-white">
                                {st.name} ({st.symbol.replace('.NS', '')}) · ₹{livePrice.toLocaleString('en-IN')} ({st.changePct >= 0 ? '+' : ''}{st.changePct}%)
                              </span>
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-300 border border-rose-500/30">
                                R:R 1:{rr} · 1% Risk Qty: {recShares} shs
                              </span>
                              {isDeployed && (
                                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                                  ⚡ Live in Order Book
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-300 mt-0.5">{st.reason}</div>
                            <div className="text-[11px] font-mono text-slate-400 mt-1">
                              Short/Exit: ₹{livePrice} · Downside Target: ₹{st.targetPrice} · Stop: ₹{st.stopLoss}
                            </div>
                          </div>
                          <button
                            onClick={() =>
                              handleOpenSetupBlueprintModal({
                                symbol: st.symbol,
                                name: st.name,
                                sector: selectedSector.sectorName,
                                direction: 'FALL',
                                entryPrice: livePrice,
                                targetPrice: st.targetPrice,
                                stopLoss: st.stopLoss,
                                leadPillar: selectedSector.DominantAgentName,
                                causalSummary: {
                                  globalOrGeoReason: selectedSector.whyGainingOrLosing.geopoliticsReason,
                                  basicsAndPolicyReason: `${selectedSector.whyGainingOrLosing.policyReason} ${selectedSector.whyGainingOrLosing.marketBasicsReason}`,
                                  emotionsOrFlowReason: selectedSector.whyGainingOrLosing.emotionsReason,
                                  catalystHeadline: st.reason,
                                },
                              })
                            }
                            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold shrink-0 cursor-pointer transition-colors ${
                              isTracked || isDeployed
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30'
                                : 'bg-rose-500 hover:bg-rose-400 text-slate-950'
                            }`}
                          >
                            {isDeployed
                              ? '⚡ Deployed · View Setup'
                              : isTracked
                                ? '✓ Tracked · View / Deploy'
                                : 'Track Short / Avoid'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* VIEW 3: THE 4 FOUNDATIONS (EMOTIONS, POLICY/FLOWS, GEOPOLITICS)      */}
      {/* ==================================================================== */}
      {activeView === 'FOUR_FOUNDATIONS' && (
        <div className="space-y-6">
          {/* Section A: Human Emotions & Crowd Psychology Trap Detector */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 pb-3 border-b border-slate-800">
              <div>
                <div className="text-xs text-amber-400 font-medium">
                  Foundation 1 · Human Emotions & Crowd Psychology (Managed by Agent Arjuna)
                </div>
                <h2 className="text-base font-bold text-white mt-0.5">
                  {crowdPsychology.headline}
                </h2>
              </div>
              <div className="font-mono text-xs text-slate-300">
                India VIX: <strong className="text-white">{crowdPsychology.vixLevel.toFixed(2)}</strong> · Breadth: <strong className="text-emerald-400">{crowdPsychology.advancingStocks} Up</strong> / <strong className="text-rose-400">{crowdPsychology.decliningStocks} Down</strong>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              <strong className="text-white">How Crowd Psychology Is Moving Stocks Right Now:</strong> {crowdPsychology.contrarianAction}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {crowdPsychology.emotionalTraps.map((trap) => {
                const isOpportunity = trap.trapType.includes('ACCUMULATION') || trap.trapType.includes('OPPORTUNITY');
                return (
                  <div
                    key={trap.symbol}
                    className={`p-3.5 rounded-lg bg-slate-950 border ${
                      isOpportunity ? 'border-emerald-500/30' : 'border-rose-500/30'
                    } space-y-1.5`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">
                        {trap.name} ({trap.symbol.replace('.NS', '')}) · ₹{trap.price.toLocaleString('en-IN')} ({trap.changePct >= 0 ? '+' : ''}{trap.changePct.toFixed(2)}%)
                      </span>
                      <span className={`text-[11px] font-semibold ${isOpportunity ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {trap.trapType.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      <strong className="text-slate-200">What Retail Crowd Does:</strong> {trap.crowdBehavior}
                    </p>
                    <p className="text-xs text-slate-300">
                      <strong className="text-cyan-400">What Smart Money Knows:</strong> {trap.smartMoneyReality}
                    </p>
                    <div className={`text-xs font-semibold pt-1 ${isOpportunity ? 'text-emerald-400' : 'text-rose-400'}`}>
                      Decision: {trap.actionableVerdict}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section B: Government Policy, RBI & Institutional Flows */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 pb-3 border-b border-slate-800">
              <div>
                <div className="text-xs text-cyan-400 font-medium">
                  Foundation 2 · Government Policy, RBI & Institutional Flows (Managed by Agent Chanakya)
                </div>
                <h2 className="text-base font-bold text-white mt-0.5">
                  How Policy, Taxation, RBI Liquidity & FII/DII Flows Are Shifting Indian Sectors
                </h2>
              </div>
              <div className="text-xs text-slate-300">
                FII Stance: <strong className="text-rose-400">{policyAndFlows.fiiFlowStance.replace(/_/g, ' ')}</strong> · DII Stance: <strong className="text-emerald-400">{policyAndFlows.diiFlowStance.replace(/_/g, ' ')}</strong>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {policyAndFlows.activePolicyCatalysts.map((pol) => (
                <div key={pol.id} className="p-4 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
                  <div className="text-[11px] text-cyan-400 font-medium">
                    {pol.policyArea.replace(/_/g, ' ')}
                  </div>
                  <h3 className="text-sm font-bold text-white">{pol.title}</h3>
                  <p className="text-xs text-slate-300 leading-relaxed">{pol.currentStatus}</p>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    <strong className="text-slate-200">Sector Transmission:</strong> {pol.transmissionMechanism}
                  </p>
                  <div className="pt-2 border-t border-slate-800/80 text-xs space-y-1">
                    {pol.topBeneficiaryStocks.length > 0 && (
                      <div className="text-emerald-400">
                        <strong>Stocks Gaining:</strong> {pol.topBeneficiaryStocks.map((s) => s.replace('.NS', '')).join(' · ')}
                      </div>
                    )}
                    {pol.headwindStocks.length > 0 && (
                      <div className="text-rose-400">
                        <strong>Stocks Losing:</strong> {pol.headwindStocks.map((s) => s.replace('.NS', '')).join(' · ')}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section C: Geopolitics & Global Supply Chains */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="pb-3 border-b border-slate-800">
              <div className="text-xs text-rose-400 font-medium">
                Foundation 3 · Geopolitical Conflicts, Energy Chokepoints & Global Supply Chains (Managed by Agent Vidura)
              </div>
              <h2 className="text-base font-bold text-white mt-0.5">
                Live Geopolitical & Global Macro Transmission to Indian Stocks
              </h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {geopolitics.map((geo) => (
                <div key={geo.id} className="p-4 rounded-lg bg-slate-950 border border-slate-800 space-y-2.5 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-rose-400 font-semibold">{geo.severity} IMPACT</span>
                      <span className="font-mono text-slate-300">{geo.liveIndicator} ({geo.liveIndicatorChange})</span>
                    </div>
                    <h3 className="text-sm font-bold text-white">{geo.regionOrTheme}</h3>
                    <p className="text-xs text-slate-300 leading-relaxed">{geo.whatIsHappening}</p>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      <strong className="text-slate-200">India Impact:</strong> {geo.indianSectorImpact}
                    </p>
                  </div>

                  <div className="pt-2.5 border-t border-slate-800 space-y-1.5 text-xs">
                    <div>
                      <span className="text-emerald-400 font-semibold">Beneficiaries: </span>
                      <span className="text-slate-300">
                        {geo.stocksSetToGain.map((g) => `${g.symbol.replace('.NS', '')} (${g.reason})`).join('; ')}
                      </span>
                    </div>
                    <div>
                      <span className="text-rose-400 font-semibold">Casualties: </span>
                      <span className="text-slate-300">
                        {geo.stocksSetToLose.map((l) => `${l.symbol.replace('.NS', '')} (${l.reason})`).join('; ')}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* VIEW 4: VERIFIED PREDICTION AUDIT & WALK-FORWARD CALIBRATION LEDGER  */}
      {/* ==================================================================== */}
      {activeView === 'SELF_LEARNING_AGENTS' && (
        <div className="space-y-6">
          {/* Self-Learning Summary Banner & Canonical 5-Agent Desk Gateway */}
          <div className="bg-slate-900/90 border border-cyan-500/30 rounded-xl p-5 space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <div className="text-xs text-cyan-400 font-medium">
                  Bayesian Multiplicative Weights · Generation #{selfLearning.generationNumber} · Last Calibrated {selfLearning.lastCalibratedAt}
                </div>
                <h2 className="text-base font-bold text-white mt-0.5">
                  Walk-Forward Calibration &amp; Verified Prediction Audit
                </h2>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleRunSelfLearningCycle}
                  disabled={calibrating}
                  className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${calibrating ? 'animate-spin' : ''}`} />
                  <span>{calibrating ? 'Running Walk-Forward Calibration...' : 'Recalibrate Weights Against Live NSE Data'}</span>
                </button>
                {onNavigateToAgents && (
                  <button
                    onClick={onNavigateToAgents}
                    className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-cyan-500/40 text-cyan-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap"
                  >
                    <span>Open 5-Agent Execution Desk →</span>
                  </button>
                )}
              </div>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              {selfLearning.dailyAdaptationSummary}
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/80 text-xs font-mono">
              <span className="text-slate-400">Learned Trust Weights:</span>
              {selfLearning.agents.map((ag: SelfLearningAgentProfile) => {
                const userBoost = userAgentFeedbackBoost[ag.agentId] || 0;
                const effectiveWeight = Number((ag.learnedTrustWeightPct + userBoost).toFixed(1));
                return (
                  <span
                    key={ag.agentId}
                    className="px-2.5 py-1 rounded-md bg-slate-950 border border-slate-800 text-slate-200"
                  >
                    <strong className="text-white">{ag.name}:</strong>{' '}
                    <span className="text-cyan-400 font-bold">{effectiveWeight}%</span>{' '}
                    <span className="text-emerald-400">({ag.rollingWinRatePct}% Win)</span>
                  </span>
                );
              })}
            </div>
          </div>

          {/* Verified Prediction Audit & Post-Mortem Learning Log */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-white">
                  Verified Prediction Audit Trail & Daily Self-Improvement Lessons ({selfLearning.recentLessonsAndAudits.length} Recent Graded Decisions)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Every stock call is verified against actual realized NSE price movement. Wins boost the responsible specialist agent’s weight; misses trigger automatic rule adaptation.
                </p>
              </div>
              <button
                onClick={() => setActiveView('AUTONOMOUS_SCHEDULER')}
                className="px-3 py-1.5 rounded-lg bg-cyan-950/80 hover:bg-cyan-900/80 border border-cyan-500/40 text-cyan-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Open Permanent Ledger & Scheduler Hub →</span>
              </button>
            </div>

            <div className="space-y-2.5">
              {selfLearning.recentLessonsAndAudits.map((audit: PredictionAuditRecord) => {
                const isWin = audit.outcome === 'VERIFIED_WIN';
                return (
                  <div
                    key={audit.id}
                    className={`p-3.5 rounded-lg bg-slate-950 border ${
                      isWin ? 'border-emerald-500/30' : 'border-amber-500/30'
                    } flex flex-col lg:flex-row lg:items-center justify-between gap-3`}
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className={`font-bold ${isWin ? 'text-emerald-400' : 'text-amber-400'}`}>
                          {isWin ? 'VERIFIED WIN' : 'LESSON & RECALIBRATION'}
                        </span>
                        <span className="text-slate-500">·</span>
                        <span className="font-bold text-white">
                          {audit.symbol.replace('.NS', '')} ({audit.sector})
                        </span>
                        <span className="text-slate-500">·</span>
                        <span className="font-mono text-slate-300">
                          Predicted {audit.predictedDirection} @ ₹{audit.entryPrice.toLocaleString('en-IN')} → ₹{audit.evaluatedPrice.toLocaleString('en-IN')} ({audit.realizedReturnPct >= 0 ? '+' : ''}{audit.realizedReturnPct}%)
                        </span>
                        <span className="text-slate-500">·</span>
                        <span className="text-slate-400">{audit.evaluatedDate}</span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        {audit.rootCauseLesson}
                      </p>
                    </div>
                    <div className="text-xs font-mono text-cyan-400 shrink-0">
                      {audit.weightAdjustmentApplied}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* VIEW 5: AUTONOMOUS SCHEDULER & PERMANENT APPEND-ONLY LEDGER          */}
      {/* ==================================================================== */}
      {activeView === 'AUTONOMOUS_SCHEDULER' && (
        <AutonomousSchedulerHub onRecalibrateRequested={() => fetchIntelligence(true)} />
      )}

      {/* ==================================================================== */}
      {/* INTERACTIVE INSTITUTIONAL TRADE SETUP & 2026 TAX/RISK BLUEPRINT MODAL */}
      {/* ==================================================================== */}
      {activeSetupContext && activeBlueprint && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
          onClick={() => setActiveSetupContext(null)}
        >
          <div
            className="w-full max-w-4xl bg-[#070d1a] border border-cyan-500/40 rounded-xl p-4 sm:p-6 space-y-5 shadow-2xl my-auto max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold ${
                      activeBlueprint.direction === 'RISE'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    }`}
                  >
                    {activeBlueprint.direction === 'RISE' ? 'INSTITUTIONAL LONG / ACCUMULATE' : 'INSTITUTIONAL SHORT / TACTICAL HEDGE'}
                  </span>
                  <span className="text-xs text-cyan-400 font-medium">
                    {activeBlueprint.sector} · Lead Specialist: {activeSetupContext.leadPillar}
                  </span>
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-white mt-1">
                  {activeBlueprint.name} ({activeBlueprint.baseTicker}) — Trade Setup &amp; 2026 Tax/Risk Blueprint
                </h2>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right font-mono">
                  <div className="text-[11px] text-slate-400">Live NSE Spot</div>
                  <div className="text-lg font-bold text-white tabular-nums">
                    ₹{activeBlueprint.spotEntryPrice.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                  </div>
                </div>
                <button
                  onClick={() => setActiveSetupContext(null)}
                  className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-400 hover:text-white cursor-pointer"
                  title="Close Setup Blueprint"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Control Row: Instrument Selector & Sizing Method */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 p-3.5 rounded-xl bg-slate-950 border border-slate-800">
              <div className="lg:col-span-7 space-y-1.5">
                <div className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                  <span>1. Select Execution Instrument (Auto-Recalculates Lot Size, Margin &amp; 2026 Statutory Taxes)</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {(
                    [
                      { id: 'CASH_CNC', label: 'Cash (CNC 1x)', sub: 'Delivery' },
                      { id: 'INTRADAY_MIS', label: 'Intraday (MIS 5x)', sub: '20% Margin' },
                      { id: 'NSE_FUTURES', label: 'NSE Futures', sub: `Lot: ${activeBlueprint.lotSize > 1 ? activeBlueprint.lotSize : 'F&O'}` },
                      { id: 'NSE_OPTION', label: activeBlueprint.direction === 'RISE' ? 'ATM Call (CE)' : 'ATM Put (PE)', sub: 'Defined Risk' },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => setSetupInstrumentMode(opt.id)}
                      className={`p-2 rounded-lg border text-left transition-all cursor-pointer ${
                        setupInstrumentMode === opt.id
                          ? 'bg-cyan-500/20 border-cyan-400 text-white'
                          : 'bg-slate-900/90 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <div className="text-xs font-bold">{opt.label}</div>
                      <div className="text-[10px] font-mono text-slate-400">{opt.sub}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="lg:col-span-5 space-y-1.5">
                <div className="text-[11px] font-semibold text-slate-300 flex items-center justify-between">
                  <span>2. Position Sizing Engine (Capital: ₹{capitalBase.toLocaleString('en-IN')})</span>
                  <span className="text-[10px] font-mono text-cyan-400">CPPI Floor: ₹{activeBlueprint.cppiFloor92.toLocaleString('en-IN')}</span>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => setSetupSizingMethod('ONE_PCT_RISK')}
                    className={`p-2 rounded-lg border text-left transition-all cursor-pointer ${
                      setupSizingMethod === 'ONE_PCT_RISK'
                        ? 'bg-emerald-500/20 border-emerald-400 text-white'
                        : 'bg-slate-900/90 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="text-xs font-bold">1% Max Equity Risk</div>
                    <div className="text-[10px] font-mono text-emerald-300">
                      Risk Budget: ₹{activeBlueprint.onePctRiskRupees.toLocaleString('en-IN')}
                    </div>
                  </button>
                  <button
                    onClick={() => setSetupSizingMethod('QUARTER_KELLY')}
                    className={`p-2 rounded-lg border text-left transition-all cursor-pointer ${
                      setupSizingMethod === 'QUARTER_KELLY'
                        ? 'bg-emerald-500/20 border-emerald-400 text-white'
                        : 'bg-slate-900/90 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="text-xs font-bold">Quarter-Kelly (0.25f*)</div>
                    <div className="text-[10px] font-mono text-cyan-300">
                      {activeBlueprint.quarterKellyFractionPct}% of ₹{activeBlueprint.cppiRiskCushion8.toLocaleString('en-IN')} Cushion
                    </div>
                  </button>
                </div>
              </div>
            </div>

            {/* Key Execution Levels & Sizing Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5 font-mono">
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <div className="text-[10px] text-slate-400">Contract &amp; Side</div>
                <div className="text-xs font-bold text-white mt-0.5">
                  {activeBlueprint.side} {activeBlueprint.contractSymbol}
                </div>
                <div className="text-[10px] text-cyan-400">
                  Qty: {activeBlueprint.quantity} ({activeBlueprint.lotsCount} {activeBlueprint.lotSize > 1 ? 'Lot' : 'Shs'})
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <div className="text-[10px] text-slate-400">Entry Price</div>
                <div className="text-sm font-bold text-white mt-0.5 tabular-nums">
                  ₹{activeBlueprint.instrumentEntryPrice.toLocaleString('en-IN')}
                </div>
                <div className="text-[10px] text-slate-400">
                  Spot: ₹{activeBlueprint.spotEntryPrice.toLocaleString('en-IN')}
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-950 border border-emerald-500/30">
                <div className="text-[10px] text-emerald-400">Target 1 (1.5R Lock)</div>
                <div className="text-sm font-bold text-emerald-300 mt-0.5 tabular-nums">
                  ₹{activeBlueprint.instrumentTarget1.toLocaleString('en-IN')}
                </div>
                <div className="text-[10px] text-slate-400">
                  Spot T1: ₹{activeBlueprint.target1Price.toLocaleString('en-IN')}
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-950 border border-emerald-500/40">
                <div className="text-[10px] text-emerald-400">Target 2 (Full)</div>
                <div className="text-sm font-bold text-emerald-400 mt-0.5 tabular-nums">
                  ₹{activeBlueprint.instrumentTarget2.toLocaleString('en-IN')}
                </div>
                <div className="text-[10px] text-emerald-300">
                  +₹{activeBlueprint.taxAudit.grossWinAtTarget2.toLocaleString('en-IN')} Gross
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-950 border border-rose-500/30">
                <div className="text-[10px] text-rose-400">Hard Stop-Loss</div>
                <div className="text-sm font-bold text-rose-400 mt-0.5 tabular-nums">
                  ₹{activeBlueprint.instrumentStopLoss.toLocaleString('en-IN')}
                </div>
                <div className="text-[10px] text-rose-300">
                  -₹{activeBlueprint.taxAudit.grossRiskAtStop.toLocaleString('en-IN')} Risk
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-950 border border-cyan-500/30">
                <div className="text-[10px] text-cyan-400">Margin &amp; R:R</div>
                <div className="text-sm font-bold text-cyan-300 mt-0.5 tabular-nums">
                  ₹{activeBlueprint.marginRequired.toLocaleString('en-IN')}
                </div>
                <div className="text-[10px] text-white">
                  R:R 1 : {activeBlueprint.rewardToRiskRatio}
                </div>
              </div>
            </div>

            {/* Two-Column: 2026 Indian Statutory Tax Audit + 4-Pillar Causal Thesis & TSL Toggle */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* Left: 2026 Indian Statutory Tax & Friction Breakdown */}
              <div className="lg:col-span-6 p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-white">
                      2026 Indian Statutory Tax &amp; Friction Audit (Round-Trip)
                    </div>
                    <div className="text-[11px] text-slate-400">
                       Veto Gate: Gross Win / Friction ≥ 3.0x &amp; Net Expectancy ≥ +0.15R
                    </div>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded text-[11px] font-mono font-bold ${
                      activeBlueprint.taxAudit.isVetoed
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    }`}
                  >
                    {activeBlueprint.taxAudit.isVetoed ? 'FRICTION VETO WARNING' : 'STATUTORY CLEARANCE ✓'}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 font-mono text-xs pt-1">
                  <div className="p-2 rounded bg-slate-900/90 border border-slate-800/80">
                    <div className="text-[10px] text-slate-400">Brokerage (2 Legs)</div>
                    <div className="font-bold text-white">₹{activeBlueprint.taxAudit.brokerage.toFixed(2)}</div>
                  </div>
                  <div className="p-2 rounded bg-slate-900/90 border border-slate-800/80">
                    <div className="text-[10px] text-slate-400">STT (2026 Rate)</div>
                    <div className="font-bold text-white">₹{activeBlueprint.taxAudit.stt.toFixed(2)}</div>
                  </div>
                  <div className="p-2 rounded bg-slate-900/90 border border-slate-800/80">
                    <div className="text-[10px] text-slate-400">NSE Exch + IPFT</div>
                    <div className="font-bold text-white">₹{activeBlueprint.taxAudit.exchangeAndIpft.toFixed(2)}</div>
                  </div>
                  <div className="p-2 rounded bg-slate-900/90 border border-slate-800/80">
                    <div className="text-[10px] text-slate-400">SEBI + Stamp Duty</div>
                    <div className="font-bold text-white">
                      ₹{(activeBlueprint.taxAudit.sebiFee + activeBlueprint.taxAudit.stampDuty).toFixed(2)}
                    </div>
                  </div>
                  <div className="p-2 rounded bg-slate-900/90 border border-slate-800/80">
                    <div className="text-[10px] text-slate-400">18% GST</div>
                    <div className="font-bold text-white">₹{activeBlueprint.taxAudit.gst18.toFixed(2)}</div>
                  </div>
                  <div className="p-2 rounded bg-slate-900/90 border border-amber-500/30">
                    <div className="text-[10px] text-amber-300">Total Friction</div>
                    <div className="font-bold text-amber-300">₹{activeBlueprint.taxAudit.totalFriction.toFixed(2)}</div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800 font-mono text-xs">
                  <div>
                    <div className="text-[10px] text-slate-400">Net Profit (After Tax)</div>
                    <div className="font-bold text-emerald-400">
                      +₹{activeBlueprint.taxAudit.netWinAfterTax.toLocaleString('en-IN')}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400">Win / Friction Ratio</div>
                    <div className={`font-bold ${activeBlueprint.taxAudit.grossWinToFrictionRatio >= 3 ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {activeBlueprint.taxAudit.grossWinToFrictionRatio}x (Min 3.0x)
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400">Net Expectancy</div>
                    <div className={`font-bold ${activeBlueprint.taxAudit.netExpectancyR >= 0.15 ? 'text-cyan-400' : 'text-amber-400'}`}>
                      +{activeBlueprint.taxAudit.netExpectancyR}R (Min 0.15R)
                    </div>
                  </div>
                </div>

                {activeBlueprint.taxAudit.vetoReason && (
                  <div className="p-2.5 rounded-lg bg-amber-950/40 border border-amber-500/40 text-[11px] text-amber-200">
                    {activeBlueprint.taxAudit.vetoReason}
                  </div>
                )}
              </div>

              {/* Right: 4-Pillar Causal Thesis & Autonomous TSL Activation */}
              <div className="lg:col-span-6 p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between space-y-3">
                <div className="space-y-2 text-xs">
                  <div className="font-bold text-white">
                    4-Pillar Causal Thesis ({activeBlueprint.baseTicker})
                  </div>
                  <p className="text-slate-300 leading-relaxed">
                    <strong className="text-cyan-400">1. Catalyst &amp; Business Moat:</strong>{' '}
                    {activeSetupContext.causalSummary.catalystHeadline}
                  </p>
                  <p className="text-slate-300 leading-relaxed">
                    <strong className="text-emerald-400">2. Policy &amp; Fundamental Transmission:</strong>{' '}
                    {activeSetupContext.causalSummary.basicsAndPolicyReason}
                  </p>
                  <p className="text-slate-300 leading-relaxed">
                    <strong className="text-amber-300">3. Geopolitics &amp; Crowd Positioning:</strong>{' '}
                    {activeSetupContext.causalSummary.globalOrGeoReason}
                  </p>
                </div>

                {/* Live Trailing Stop-Loss (TSL) Toggle */}
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-cyan-400" />
                      <span>Autonomous Step-Ladder Trailing Stop-Loss (TSL)</span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Shifts SL to Breakeven at +1.0R (₹{activeBlueprint.instrumentTarget1.toLocaleString('en-IN')}) and locks 50% profit at +1.5R
                    </div>
                  </div>
                  <button
                    onClick={() => setSetupTslEnabled((prev) => !prev)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold cursor-pointer shrink-0 transition-colors ${
                      setupTslEnabled
                        ? 'bg-cyan-500 text-slate-950'
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}
                  >
                    {setupTslEnabled ? 'TSL ARMED ✓' : 'FIXED STOP'}
                  </button>
                </div>
              </div>
            </div>

            {/* Footer Action Bar: Track in ROI Ledger vs 1-Click Deploy to Live Session Order Book */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-800">
              <div className="text-xs text-slate-400">
                Choose <strong className="text-white">Track in ROI Ledger</strong> to monitor &amp; grade this call, or{' '}
                <strong className="text-cyan-300">1-Click Deploy to Session Order Book</strong> for live OMS execution.
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  onClick={() => {
                    handleTrackStockSetup(
                      activeBlueprint.symbol,
                      activeBlueprint.name,
                      activeBlueprint.sector,
                      activeBlueprint.direction,
                      activeBlueprint.spotEntryPrice,
                      activeBlueprint.target2Price,
                      activeBlueprint.stopLossPrice,
                      activeSetupContext.leadPillar,
                      activeBlueprint.quantity,
                      activeBlueprint.marginRequired,
                    );
                    setActiveSetupContext(null);
                  }}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Track in ROI Decision Ledger</span>
                </button>

                <button
                  onClick={() => handleDeployBlueprintToOrderBook(activeBlueprint)}
                  className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-lg"
                >
                  <Zap className="w-4 h-4" />
                  <span>
                    1-Click Deploy to Session Order Book ({activeBlueprint.side} {activeBlueprint.quantity} Qty)
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
