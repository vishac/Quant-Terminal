import React, { useState, useEffect, useMemo } from 'react';
import {
  Globe,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  Target,
  Zap,
  Newspaper,
  ExternalLink,
  PlusCircle,
  Trash2,
  DollarSign,
  Sliders,
  ChevronDown,
  ChevronUp,
  Activity,
  Briefcase,
} from 'lucide-react';
import type { MarketQuote } from '../types/quant';
import type {
  GlobalMarketImpactResponse,
  ActionableStockImpact,
  GlobalCueItem,
} from '../server/globalMarketImpactEngine';

export interface TrackedRoiPosition {
  id: string;
  symbol: string;
  name: string;
  sector: string;
  side: 'LONG' | 'SHORT';
  entryPrice: number;
  targetPrice: number;
  stopLoss: number;
  qty: number;
  capitalAllocated: number;
  reason: string;
  agentSource: string;
  enteredAt: string;
}

interface GlobalMarketActionDeskProps {
  quotes: Record<string, MarketQuote>;
  compactMode?: boolean;
}

export const GlobalMarketActionDesk: React.FC<GlobalMarketActionDeskProps> = ({
  quotes,
  compactMode = false,
}) => {
  const [impactData, setImpactData] = useState<GlobalMarketImpactResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    'STOCKS_IMPACTED' | 'GLOBAL_TRANSMISSION' | 'FIVE_AGENT_CALLS' | 'LIVE_NEWS_CATALYSTS'
  >('STOCKS_IMPACTED');
  const [stockFilter, setStockFilter] = useState<'ALL' | 'RISING' | 'FALLING'>('ALL');
  const [selectedGlobalCue, setSelectedGlobalCue] = useState<string | null>(null);
  const [expandedStockSymbol, setExpandedStockSymbol] = useState<string | null>(null);

  // User's Capital per Trade Base (default ₹1,00,000 so position sizing & ROI work out of the box)
  const [userCapital, setUserCapital] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('jarvis_roi_trade_capital');
      const parsed = saved ? Number(saved) : 100000;
      return parsed >= 10000 ? parsed : 100000;
    } catch {
      return 100000;
    }
  });

  // Live ROI Trade Tracker Ledger (persisted in localStorage)
  const [roiPositions, setRoiPositions] = useState<TrackedRoiPosition[]>(() => {
    try {
      const saved = localStorage.getItem('jarvis_roi_tracked_positions');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('jarvis_roi_trade_capital', String(userCapital));
    } catch {}
  }, [userCapital]);

  useEffect(() => {
    try {
      localStorage.setItem('jarvis_roi_tracked_positions', JSON.stringify(roiPositions));
    } catch {}
  }, [roiPositions]);

  const fetchImpactEngine = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/market/global-impact', { credentials: 'include' });
      const json = await res.json();
      if (json.success && json.data) {
        setImpactData(json.data);
      } else {
        setError(json.error || 'Unable to load global market impact engine.');
      }
    } catch {
      setError('Network error reaching Global Market Impact Engine.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchImpactEngine();
    const interval = setInterval(fetchImpactEngine, 30000);
    return () => clearInterval(interval);
  }, []);

  // Scale quantity based on userCapital (base is ₹1,00,000)
  const scaleQty = (baseQtyPerLakh: number) => {
    const multiplier = Math.max(0.1, userCapital / 100000);
    return Math.max(1, Math.round(baseQtyPerLakh * multiplier));
  };

  const handleTrackStockSetup = (stock: ActionableStockImpact, agentSource = '5-Agent Consensus') => {
    const liveP = quotes[stock.symbol]?.price ?? stock.livePrice;
    const qty = scaleQty(stock.tradeSetup.qtyPerOneLakhCapital);
    const side: 'LONG' | 'SHORT' = stock.direction === 'RISING' ? 'LONG' : 'SHORT';

    const newPos: TrackedRoiPosition = {
      id: `roi-${stock.symbol}-${Date.now()}`,
      symbol: stock.symbol,
      name: stock.name,
      sector: stock.sector,
      side,
      entryPrice: liveP,
      targetPrice: stock.tradeSetup.target1,
      stopLoss: stock.tradeSetup.stopLoss,
      qty,
      capitalAllocated: Math.round(liveP * qty),
      reason: stock.primaryGlobalDriver,
      agentSource,
      enteredAt: new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' }) + ' IST',
    };

    setRoiPositions((prev) => [newPos, ...prev]);
  };

  const handleDeployTopThreeSetups = () => {
    if (!impactData) return;
    const topRising = impactData.risingStocks.slice(0, 2);
    const topFalling = impactData.fallingStocks.slice(0, 1);
    const combined = [...topRising, ...topFalling];

    const newEntries: TrackedRoiPosition[] = combined
      .filter((s) => !roiPositions.some((p) => p.symbol === s.symbol))
      .map((stock) => {
        const liveP = quotes[stock.symbol]?.price ?? stock.livePrice;
        const qty = scaleQty(stock.tradeSetup.qtyPerOneLakhCapital);
        return {
          id: `roi-${stock.symbol}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          symbol: stock.symbol,
          name: stock.name,
          sector: stock.sector,
          side: stock.direction === 'RISING' ? 'LONG' : 'SHORT',
          entryPrice: liveP,
          targetPrice: stock.tradeSetup.target1,
          stopLoss: stock.tradeSetup.stopLoss,
          qty,
          capitalAllocated: Math.round(liveP * qty),
          reason: stock.primaryGlobalDriver,
          agentSource: '5-Agent Top ROI Basket',
          enteredAt: new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' }) + ' IST',
        };
      });

    if (newEntries.length > 0) {
      setRoiPositions((prev) => [...newEntries, ...prev]);
    }
  };

  const handleRemovePosition = (id: string) => {
    setRoiPositions((prev) => prev.filter((p) => p.id !== id));
  };

  // Compute live P&L and target progress for tracked positions
  const portfolioSummary = useMemo(() => {
    let totalDeployed = 0;
    let totalLivePnl = 0;
    let totalExpectedTargetProfit = 0;

    const enriched = roiPositions.map((pos) => {
      const currentPrice = quotes[pos.symbol]?.price ?? pos.entryPrice;
      const priceDiff =
        pos.side === 'LONG' ? currentPrice - pos.entryPrice : pos.entryPrice - currentPrice;
      const livePnl = Math.round(priceDiff * pos.qty * 100) / 100;
      const liveRoiPct =
        pos.entryPrice > 0 ? Math.round((priceDiff / pos.entryPrice) * 10000) / 100 : 0;
      const targetProfit = Math.round(Math.abs(pos.targetPrice - pos.entryPrice) * pos.qty);

      totalDeployed += pos.capitalAllocated;
      totalLivePnl += livePnl;
      totalExpectedTargetProfit += targetProfit;

      return {
        ...pos,
        currentPrice,
        livePnl,
        liveRoiPct,
        targetProfit,
      };
    });

    return {
      positions: enriched,
      totalDeployed,
      totalLivePnl: Math.round(totalLivePnl * 100) / 100,
      totalExpectedTargetProfit,
    };
  }, [roiPositions, quotes]);

  if (loading && !impactData) {
    return (
      <div className="rounded-xl bg-[#070d19] border border-slate-800 p-6 text-slate-300 font-mono flex items-center justify-between">
        <div className="flex items-center gap-3">
          <RefreshCw className="w-5 h-5 text-cyan-400 animate-spin" />
          <div>
            <div className="text-sm font-bold text-white">
              Synchronizing Live Global Markets, News &amp; NSE/BSE Stock Impact Engine…
            </div>
            <div className="text-xs text-slate-400 mt-0.5">
              Fetching live Brent Crude, NASDAQ, S&amp;P 500, Hang Seng, Copper, USD/INR, and live Indian stock news catalysts.
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error && !impactData) {
    return (
      <div className="rounded-xl bg-rose-950/30 border border-rose-500/40 p-4 text-rose-200 text-xs font-mono flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
        <button
          onClick={fetchImpactEngine}
          className="px-3 py-1.5 rounded bg-rose-900/60 hover:bg-rose-800 text-white font-bold cursor-pointer"
        >
          Retry Sync
        </button>
      </div>
    );
  }

  if (!impactData) return null;

  const activeCueObj = impactData.globalCues.find((c) => c.symbol === selectedGlobalCue);

  const displayedRising = impactData.risingStocks.filter((s) =>
    selectedGlobalCue
      ? activeCueObj?.beneficiaryStocks.includes(s.symbol) || true
      : true
  );
  const displayedFalling = impactData.fallingStocks.filter((s) =>
    selectedGlobalCue
      ? activeCueObj?.headwindStocks.includes(s.symbol) || true
      : true
  );

  return (
    <section
      className="rounded-xl bg-[#060c18] border border-cyan-500/30 shadow-2xl overflow-hidden font-mono"
      data-testid="global-market-action-desk"
    >
      {/* TOP DECISION HEADER & GLOBAL REGIME EXPLANATION */}
      <div className="p-4 sm:p-5 bg-gradient-to-r from-[#09152b] via-[#081121] to-[#060c18] border-b border-slate-800">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1.5 max-w-4xl">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-cyan-400 font-extrabold uppercase tracking-wider flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-cyan-400" />
                Live Global-to-India Market Impact &amp; Stock ROI Decision Engine
              </span>
              <span className="text-slate-600">·</span>
              <span className="text-emerald-400 font-bold">
                Updated {impactData.generatedAt}
              </span>
              <span className="text-slate-600">·</span>
              <span className="text-amber-300 font-bold">
                Verdict: {impactData.marketRegimeBanner.shouldTradeToday.replace(/_/g, ' ')}
              </span>
            </div>

            <h2 className="text-sm sm:text-base font-extrabold text-white leading-snug">
              {impactData.marketRegimeBanner.headline}
            </h2>

            <p className="text-xs text-slate-300 leading-relaxed">
              {impactData.marketRegimeBanner.executiveSummary}
            </p>
          </div>

          <div className="flex flex-col sm:items-end gap-2 shrink-0">
            <div className="flex items-center gap-2">
              <button
                onClick={handleDeployTopThreeSetups}
                className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-extrabold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-lg"
                title="Add top rising & short setups to your live ROI tracker below"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Track Top 3 ROI Setups</span>
              </button>
              <button
                onClick={fetchImpactEngine}
                className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 cursor-pointer"
                title="Refresh Global Cues & News Impact"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
              </button>
            </div>

            {/* Position Sizing Capital Control */}
            <div className="flex items-center gap-2 bg-slate-950/90 border border-slate-800 rounded-lg px-2.5 py-1 text-[11px]">
              <span className="text-slate-400">Your Capital Base:</span>
              <select
                value={userCapital}
                onChange={(e) => setUserCapital(Number(e.target.value))}
                className="bg-transparent text-cyan-300 font-bold outline-none cursor-pointer"
              >
                <option value={50000} className="bg-slate-950">₹50,000 (1% Risk = ₹500)</option>
                <option value={100000} className="bg-slate-950">₹1,00,000 (1% Risk = ₹1,000)</option>
                <option value={250000} className="bg-slate-950">₹2,50,000 (1% Risk = ₹2,500)</option>
                <option value={500000} className="bg-slate-950">₹5,00,000 (1% Risk = ₹5,000)</option>
                <option value={1000000} className="bg-slate-950">₹10,00,000 (1% Risk = ₹10,000)</option>
              </select>
            </div>
          </div>
        </div>

        {/* LIVE GLOBAL MARKETS STRIP (CLICK ANY CUE TO SEE INDIA TRANSMISSION) */}
        <div className="mt-4 pt-3 border-t border-slate-800/80">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
              Live Global Cues &amp; Macro Drivers (Click any global market to inspect its Indian stock impact):
            </span>
            {selectedGlobalCue && (
              <button
                onClick={() => setSelectedGlobalCue(null)}
                className="text-[10px] text-cyan-400 hover:underline cursor-pointer"
              >
                Clear Filter ({selectedGlobalCue})
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {impactData.globalCues.map((cue) => {
              const liveQ = quotes[cue.symbol];
              const price = liveQ?.price ?? cue.price;
              const changePct = liveQ?.changePct ?? cue.changePct ?? 0;
              const isSelected = selectedGlobalCue === cue.symbol;

              return (
                <button
                  key={cue.symbol}
                  onClick={() =>
                    setSelectedGlobalCue(isSelected ? null : cue.symbol)
                  }
                  className={`text-left p-2.5 rounded-lg border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-cyan-950/60 border-cyan-400'
                      : 'bg-slate-950/80 border-slate-800/90 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span className="truncate font-bold text-slate-300">{cue.name}</span>
                  </div>
                  <div className="flex items-baseline justify-between mt-1">
                    <span className="text-xs font-extrabold text-white">
                      {price != null ? price.toLocaleString('en-IN', { maximumFractionDigits: 2 }) : '—'}
                    </span>
                    <span
                      className={`text-[11px] font-bold ${
                        changePct >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {changePct >= 0 ? '+' : ''}
                      {changePct.toFixed(2)}%
                    </span>
                  </div>
                  <div className="mt-1 text-[9px] text-slate-400 truncate">
                    {cue.signal === 'BEARISH_FOR_INDIA' ? (
                      <span className="text-rose-400">Headwind: {cue.headwindStocks.map(s => s.replace('.NS', '')).slice(0, 2).join(', ')}</span>
                    ) : cue.signal === 'BULLISH_FOR_INDIA' ? (
                      <span className="text-emerald-400">Tailwind: {cue.beneficiaryStocks.map(s => s.replace('.NS', '')).slice(0, 2).join(', ')}</span>
                    ) : (
                      <span className="text-amber-300">Rotates: {cue.beneficiaryStocks.map(s => s.replace('.NS', '')).slice(0, 2).join(', ')}</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Selected Global Cue Causal Explanation Box */}
          {activeCueObj && (
            <div className="mt-2.5 p-3 rounded-lg bg-slate-900/90 border border-cyan-500/40 text-xs text-slate-200 space-y-1.5">
              <div className="font-bold text-cyan-300 flex items-center justify-between">
                <span>
                  Global-to-India Causal Chain: {activeCueObj.name} ({activeCueObj.symbol})
                </span>
                <button
                  onClick={() => setSelectedGlobalCue(null)}
                  className="text-slate-400 hover:text-white text-xs cursor-pointer"
                >
                  ✕
                </button>
              </div>
              <p className="text-slate-300 leading-relaxed">
                {activeCueObj.indiaTransmissionSummary}
              </p>
              <div className="flex flex-wrap items-center gap-4 pt-1 text-[11px]">
                <div>
                  <span className="text-emerald-400 font-bold">Beneficiary Indian Stocks (Rising): </span>
                  <span className="text-slate-200">
                    {activeCueObj.beneficiaryStocks.map((s) => s.replace('.NS', '')).join(', ') || 'None'}
                  </span>
                </div>
                <div>
                  <span className="text-rose-400 font-bold">Negatively Impacted Stocks (Falling): </span>
                  <span className="text-slate-200">
                    {activeCueObj.headwindStocks.map((s) => s.replace('.NS', '')).join(', ') || 'None'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* LIVE TRACKED ROI PORTFOLIO BAR (IF USER HAS TRACKED SETUPS) */}
      {portfolioSummary.positions.length > 0 && (
        <div className="p-4 bg-[#081326] border-b border-cyan-500/30 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs">
              <Briefcase className="w-4 h-4 text-emerald-400" />
              <span className="font-extrabold text-white uppercase tracking-wider">
                Your Active ROI Decision Tracker ({portfolioSummary.positions.length} Open Setups)
              </span>
              <span className="text-slate-500">·</span>
              <span className="text-slate-300">
                Capital Deployed: <strong className="text-white">₹{portfolioSummary.totalDeployed.toLocaleString('en-IN')}</strong>
              </span>
              <span className="text-slate-500">·</span>
              <span className="text-slate-300">
                Target ROI Potential: <strong className="text-emerald-400">+₹{portfolioSummary.totalExpectedTargetProfit.toLocaleString('en-IN')}</strong>
              </span>
            </div>

            <div className="flex items-center gap-3 text-xs">
              <span>Live Mark-to-Market P&amp;L:</span>
              <span
                className={`text-sm font-extrabold ${
                  portfolioSummary.totalLivePnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {portfolioSummary.totalLivePnl >= 0 ? '+' : ''}₹
                {portfolioSummary.totalLivePnl.toLocaleString('en-IN')}
              </span>
              <button
                onClick={() => setRoiPositions([])}
                className="text-[11px] text-slate-400 hover:text-rose-400 ml-2 cursor-pointer"
              >
                Clear All
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
            {portfolioSummary.positions.map((pos) => (
              <div
                key={pos.id}
                className="p-2.5 rounded-lg bg-slate-950/90 border border-slate-800 flex items-center justify-between gap-2 text-xs"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`font-extrabold ${
                        pos.side === 'LONG' ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {pos.side}
                    </span>
                    <span className="font-bold text-white truncate">
                      {pos.symbol.replace('.NS', '')}
                    </span>
                    <span className="text-slate-400 text-[10px]">×{pos.qty} qty</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Entry ₹{pos.entryPrice.toLocaleString('en-IN')} → Now ₹{pos.currentPrice.toLocaleString('en-IN')} · Tgt ₹{pos.targetPrice.toLocaleString('en-IN')} · SL ₹{pos.stopLoss.toLocaleString('en-IN')}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-right">
                    <div
                      className={`font-extrabold ${
                        pos.livePnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {pos.livePnl >= 0 ? '+' : ''}₹{pos.livePnl.toLocaleString('en-IN')}
                    </div>
                    <div className="text-[10px] text-emerald-400/80">
                      Tgt: +₹{pos.targetProfit.toLocaleString('en-IN')}
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemovePosition(pos.id)}
                    className="text-slate-500 hover:text-rose-400 p-1 cursor-pointer"
                    title="Close / Remove position"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* NAVIGATION TABS FOR ACTION DESK */}
      <div className="px-4 sm:px-5 py-2.5 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setActiveTab('STOCKS_IMPACTED')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              activeTab === 'STOCKS_IMPACTED'
                ? 'bg-cyan-500 text-slate-950'
                : 'bg-slate-900 text-slate-300 hover:text-white'
            }`}
          >
            1. Stocks Set to Rise &amp; Fall + Actual Reasons ({impactData.risingStocks.length + impactData.fallingStocks.length})
          </button>
          <button
            onClick={() => setActiveTab('FIVE_AGENT_CALLS')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              activeTab === 'FIVE_AGENT_CALLS'
                ? 'bg-cyan-500 text-slate-950'
                : 'bg-slate-900 text-slate-300 hover:text-white'
            }`}
          >
            2. 5-Agents Live Buy / Avoid Calls (Actionable)
          </button>
          <button
            onClick={() => setActiveTab('LIVE_NEWS_CATALYSTS')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              activeTab === 'LIVE_NEWS_CATALYSTS'
                ? 'bg-cyan-500 text-slate-950'
                : 'bg-slate-900 text-slate-300 hover:text-white'
            }`}
          >
            3. Live News &amp; Stock Impact Feed ({impactData.liveNewsFeed.length})
          </button>
        </div>

        {activeTab === 'STOCKS_IMPACTED' && (
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
            <button
              onClick={() => setStockFilter('ALL')}
              className={`px-2.5 py-1 rounded text-[11px] font-bold cursor-pointer ${
                stockFilter === 'ALL' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Side-by-Side (All)
            </button>
            <button
              onClick={() => setStockFilter('RISING')}
              className={`px-2.5 py-1 rounded text-[11px] font-bold cursor-pointer ${
                stockFilter === 'RISING' ? 'bg-emerald-950 text-emerald-300' : 'text-slate-400 hover:text-emerald-300'
              }`}
            >
              Rising Only ({displayedRising.length})
            </button>
            <button
              onClick={() => setStockFilter('FALLING')}
              className={`px-2.5 py-1 rounded text-[11px] font-bold cursor-pointer ${
                stockFilter === 'FALLING' ? 'bg-rose-950 text-rose-300' : 'text-slate-400 hover:text-rose-300'
              }`}
            >
              Falling / Avoid ({displayedFalling.length})
            </button>
          </div>
        )}
      </div>

      {/* TAB 1: PARTICULAR STOCKS THAT WILL RISE OR FALL + ACTUAL REASONS + TRADE SETUPS */}
      {activeTab === 'STOCKS_IMPACTED' && (
        <div className="p-4 sm:p-5 grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* LEFT COLUMN: STOCKS SET TO RISE (HIGH-CONVICTION LONGS) */}
          {(stockFilter === 'ALL' || stockFilter === 'RISING') && (
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-emerald-500/30 pb-2">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-emerald-400">
                    Stocks Set to RISE Today (Bullish Catalysts &amp; Long ROI)
                  </h3>
                </div>
                <span className="text-[11px] text-slate-400">
                  Outperforming NIFTY · Positive Global/Domestic Drivers
                </span>
              </div>

              <div className="space-y-3">
                {(compactMode ? displayedRising.slice(0, 4) : displayedRising).map((stock) => {
                  const liveQ = quotes[stock.symbol];
                  const livePrice = liveQ?.price ?? stock.livePrice;
                  const changePct = liveQ?.changePct ?? stock.changePct;
                  const scaledQty = scaleQty(stock.tradeSetup.qtyPerOneLakhCapital);
                  const expectedRupeeProfit = Math.round(
                    scaledQty * Math.abs(stock.tradeSetup.target1 - livePrice)
                  );
                  const maxRupeeRisk = Math.round(
                    scaledQty * Math.abs(livePrice - stock.tradeSetup.stopLoss)
                  );
                  const isExpanded = expandedStockSymbol === stock.symbol;

                  return (
                    <div
                      key={stock.symbol}
                      className="rounded-xl bg-[#0a1324] border border-emerald-500/30 hover:border-emerald-400/60 p-4 space-y-3 transition-all"
                    >
                      {/* Stock Header */}
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-extrabold text-white">
                              {stock.name}
                            </span>
                            <span className="text-xs text-emerald-300 font-bold">
                              ({stock.symbol.replace('.NS', '')} · BSE {stock.bseCode})
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            {stock.sector} · Action: <strong className="text-emerald-400">{stock.actionBadge}</strong> · Conviction: <strong className="text-cyan-300">{stock.convictionScore}%</strong>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-base font-extrabold text-white">
                            ₹{livePrice.toLocaleString('en-IN')}
                          </div>
                          <div className="text-xs font-bold text-emerald-400 flex items-center justify-end gap-1">
                            <ArrowUpRight className="w-3.5 h-3.5" />
                            <span>
                              {changePct >= 0 ? '+' : ''}
                              {changePct.toFixed(2)}% (Alpha{' '}
                              {stock.relativeAlphaVsNifty >= 0 ? '+' : ''}
                              {stock.relativeAlphaVsNifty.toFixed(2)}%)
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* THE ACTUAL REASON WHY IT IS RISING */}
                      <div className="p-3 rounded-lg bg-slate-950/90 border border-slate-800/90 space-y-1.5 text-xs">
                        <div className="text-[10px] uppercase tracking-wider text-emerald-400 font-bold">
                          Why {stock.symbol.replace('.NS', '')} is Rising / Set to Rise:
                        </div>
                        <p className="text-slate-200 leading-relaxed">
                          <strong className="text-cyan-300">1. Global / Macro Driver: </strong>
                          {stock.primaryGlobalDriver}
                        </p>
                        <p className="text-slate-300 leading-relaxed">
                          <strong className="text-slate-200">2. Business Impact: </strong>
                          {stock.fundamentalTransmissionReason}
                        </p>
                        <div className="pt-1 text-[11px] text-slate-400 flex items-center justify-between gap-2 border-t border-slate-800/70">
                          <span className="truncate">
                            <strong className="text-amber-300">Live Catalyst: </strong>
                            {stock.matchedNewsHeadline} ({stock.matchedNewsSource})
                          </span>
                          <a
                            href={stock.matchedNewsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-cyan-400 hover:underline shrink-0 flex items-center gap-0.5"
                          >
                            <span>Source</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </div>

                      {/* CONCRETE ROI TRADE SETUP */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-emerald-950/20 border border-emerald-500/20 rounded-lg p-2.5">
                        <div>
                          <span className="text-[10px] text-slate-400 block">Buy Entry Zone</span>
                          <span className="font-bold text-white">₹{livePrice.toLocaleString('en-IN')}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block">Target 1 / Target 2</span>
                          <span className="font-bold text-emerald-400">
                            ₹{stock.tradeSetup.target1.toLocaleString('en-IN')} (+{stock.tradeSetup.expectedRoiTarget1Pct}%)
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block">Strict Stop-Loss</span>
                          <span className="font-bold text-rose-400">
                            ₹{stock.tradeSetup.stopLoss.toLocaleString('en-IN')} (-{stock.tradeSetup.stopLossRiskPct}%)
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block">Position Size &amp; ROI</span>
                          <span className="font-bold text-cyan-300">
                            {scaledQty} Qty → +₹{expectedRupeeProfit.toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>

                      {/* Actions & 5-Agent Votes Toggle */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                        <button
                          onClick={() =>
                            setExpandedStockSymbol(isExpanded ? null : stock.symbol)
                          }
                          className="text-[11px] text-cyan-300 hover:text-cyan-200 flex items-center gap-1 cursor-pointer"
                        >
                          <span>View 5-Agent Consensus Votes (Risk: ₹{maxRupeeRisk} · R:R {stock.tradeSetup.riskRewardRatio})</span>
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>

                        <button
                          onClick={() => handleTrackStockSetup(stock)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-extrabold text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                        >
                          <PlusCircle className="w-3.5 h-3.5" />
                          <span>Track Long Setup (+{stock.tradeSetup.expectedRoiTarget1Pct}% ROI)</span>
                        </button>
                      </div>

                      {/* Expanded 5-Agent Votes */}
                      {isExpanded && (
                        <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-2 text-[11px]">
                          <div className="font-bold text-slate-300 uppercase tracking-wider text-[10px]">
                            How the 5 Autonomous Agents Vote on {stock.symbol.replace('.NS', '')}:
                          </div>
                          {stock.agentVotes.map((vote) => (
                            <div
                              key={vote.agentId}
                              className="flex items-start justify-between gap-2 border-t border-slate-800/70 pt-1.5"
                            >
                              <div>
                                <span className="font-bold text-cyan-300">{vote.agentName}: </span>
                                <span className="text-slate-300">{vote.rationale}</span>
                              </div>
                              <span
                                className={`font-extrabold shrink-0 ${
                                  vote.verdict === 'BUY' ? 'text-emerald-400' : 'text-rose-400'
                                }`}
                              >
                                {vote.verdict} ({vote.score}%)
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* RIGHT COLUMN: STOCKS SET TO FALL (BEARISH HEADWINDS / AVOID OR SHORT) */}
          {(stockFilter === 'ALL' || stockFilter === 'FALLING') && (
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-rose-500/30 pb-2">
                <div className="flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-rose-400" />
                  <h3 className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-rose-400">
                    Stocks Set to FALL Today (Global Headwinds · Short / Avoid)
                  </h3>
                </div>
                <span className="text-[11px] text-slate-400">
                  Hurt by Crude, US Tech or China Cues
                </span>
              </div>

              <div className="space-y-3">
                {(compactMode ? displayedFalling.slice(0, 4) : displayedFalling).map((stock) => {
                  const liveQ = quotes[stock.symbol];
                  const livePrice = liveQ?.price ?? stock.livePrice;
                  const changePct = liveQ?.changePct ?? stock.changePct;
                  const scaledQty = scaleQty(stock.tradeSetup.qtyPerOneLakhCapital);
                  const expectedRupeeProfit = Math.round(
                    scaledQty * Math.abs(livePrice - stock.tradeSetup.target1)
                  );
                  const isExpanded = expandedStockSymbol === stock.symbol;

                  return (
                    <div
                      key={stock.symbol}
                      className="rounded-xl bg-[#140c16] border border-rose-500/30 hover:border-rose-400/60 p-4 space-y-3 transition-all"
                    >
                      {/* Stock Header */}
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-extrabold text-white">
                              {stock.name}
                            </span>
                            <span className="text-xs text-rose-300 font-bold">
                              ({stock.symbol.replace('.NS', '')} · BSE {stock.bseCode})
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            {stock.sector} · Action: <strong className="text-rose-400">{stock.actionBadge}</strong> · Conviction: <strong className="text-amber-300">{stock.convictionScore}%</strong>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-base font-extrabold text-white">
                            ₹{livePrice.toLocaleString('en-IN')}
                          </div>
                          <div className="text-xs font-bold text-rose-400 flex items-center justify-end gap-1">
                            <ArrowDownRight className="w-3.5 h-3.5" />
                            <span>
                              {changePct >= 0 ? '+' : ''}
                              {changePct.toFixed(2)}% (Alpha{' '}
                              {stock.relativeAlphaVsNifty >= 0 ? '+' : ''}
                              {stock.relativeAlphaVsNifty.toFixed(2)}%)
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* THE ACTUAL REASON WHY IT IS FALLING */}
                      <div className="p-3 rounded-lg bg-slate-950/90 border border-slate-800/90 space-y-1.5 text-xs">
                        <div className="text-[10px] uppercase tracking-wider text-rose-400 font-bold">
                          Why {stock.symbol.replace('.NS', '')} is Falling / Under Pressure:
                        </div>
                        <p className="text-slate-200 leading-relaxed">
                          <strong className="text-rose-300">1. Global / Macro Headwind: </strong>
                          {stock.primaryGlobalDriver}
                        </p>
                        <p className="text-slate-300 leading-relaxed">
                          <strong className="text-slate-200">2. Margin / Flow Impact: </strong>
                          {stock.fundamentalTransmissionReason}
                        </p>
                        <div className="pt-1 text-[11px] text-slate-400 flex items-center justify-between gap-2 border-t border-slate-800/70">
                          <span className="truncate">
                            <strong className="text-amber-300">Live Catalyst: </strong>
                            {stock.matchedNewsHeadline} ({stock.matchedNewsSource})
                          </span>
                          <a
                            href={stock.matchedNewsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-cyan-400 hover:underline shrink-0 flex items-center gap-0.5"
                          >
                            <span>Source</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </div>

                      {/* CONCRETE SHORT / AVOID LEVELS */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-rose-950/20 border border-rose-500/20 rounded-lg p-2.5">
                        <div>
                          <span className="text-[10px] text-slate-400 block">Short / Exit Level</span>
                          <span className="font-bold text-white">₹{livePrice.toLocaleString('en-IN')}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block">Downside Target</span>
                          <span className="font-bold text-rose-400">
                            ₹{stock.tradeSetup.target1.toLocaleString('en-IN')} (-{stock.tradeSetup.expectedRoiTarget1Pct}%)
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block">Invalidation Stop</span>
                          <span className="font-bold text-amber-300">
                            ₹{stock.tradeSetup.stopLoss.toLocaleString('en-IN')} (+{stock.tradeSetup.stopLossRiskPct}%)
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block">Short / Saved ROI</span>
                          <span className="font-bold text-emerald-400">
                            {scaledQty} Qty → +₹{expectedRupeeProfit.toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>

                      {/* Actions & 5-Agent Votes Toggle */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                        <button
                          onClick={() =>
                            setExpandedStockSymbol(isExpanded ? null : stock.symbol)
                          }
                          className="text-[11px] text-cyan-300 hover:text-cyan-200 flex items-center gap-1 cursor-pointer"
                        >
                          <span>View 5-Agent Consensus Votes (R:R {stock.tradeSetup.riskRewardRatio})</span>
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>

                        <button
                          onClick={() => handleTrackStockSetup(stock)}
                          className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                        >
                          <PlusCircle className="w-3.5 h-3.5" />
                          <span>Track Short / Hedge (+{stock.tradeSetup.expectedRoiTarget1Pct}% Edge)</span>
                        </button>
                      </div>

                      {/* Expanded 5-Agent Votes */}
                      {isExpanded && (
                        <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-2 text-[11px]">
                          <div className="font-bold text-slate-300 uppercase tracking-wider text-[10px]">
                            How the 5 Autonomous Agents Vote on {stock.symbol.replace('.NS', '')}:
                          </div>
                          {stock.agentVotes.map((vote) => (
                            <div
                              key={vote.agentId}
                              className="flex items-start justify-between gap-2 border-t border-slate-800/70 pt-1.5"
                            >
                              <div>
                                <span className="font-bold text-cyan-300">{vote.agentName}: </span>
                                <span className="text-slate-300">{vote.rationale}</span>
                              </div>
                              <span
                                className={`font-extrabold shrink-0 ${
                                  vote.verdict === 'BUY' ? 'text-emerald-400' : 'text-rose-400'
                                }`}
                              >
                                {vote.verdict.replace('_', ' ')} ({vote.score}%)
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: 5-AGENTS LIVE BUY / AVOID ACTION PLANS */}
      {activeTab === 'FIVE_AGENT_CALLS' && (
        <div className="p-4 sm:p-5 space-y-4">
          <div className="text-xs text-slate-300">
            Instead of static status cards, each of the 5 Agents below analyzes its specific global/domestic domain in real time and gives you its <strong>#1 Conviction Stock to BUY</strong> and its <strong>#1 Stock to AVOID/SHORT</strong> today:
          </div>

          <div className="grid grid-cols-1 gap-4">
            {impactData.fiveAgentActionPlans.map((plan) => (
              <div
                key={plan.agentId}
                className="rounded-xl bg-[#0a1324] border border-slate-800 p-4 space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                  <div>
                    <div className="text-sm font-extrabold text-cyan-300">
                      {plan.agentName}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Domain: {plan.specialty} · Live Status: <strong className="text-emerald-400">{plan.status.replace(/_/g, ' ')}</strong>
                    </div>
                  </div>
                  <div className="text-xs font-bold text-amber-300 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
                    Rule: {plan.executableRule}
                  </div>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  <strong className="text-white">Live Global &amp; Desk Read: </strong>
                  {plan.globalRead}
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  {/* Agent's Top Buy Pick */}
                  <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-500/30 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-emerald-400 uppercase">
                        #1 BUY CALL: {plan.topBuyPick.name} ({plan.topBuyPick.symbol.replace('.NS', '')})
                      </span>
                      <span className="font-bold text-white">
                        ₹{plan.topBuyPick.livePrice.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <p className="text-slate-300 text-[11px] leading-relaxed">
                      {plan.topBuyPick.why}
                    </p>
                    <div className="flex items-center justify-between pt-1 text-[11px] text-slate-300">
                      <span>
                        Target: <strong className="text-emerald-400">₹{plan.topBuyPick.target.toLocaleString('en-IN')} (+{plan.topBuyPick.roiPct}%)</strong> · SL: <strong className="text-rose-400">₹{plan.topBuyPick.stopLoss.toLocaleString('en-IN')}</strong>
                      </span>
                    </div>
                  </div>

                  {/* Agent's Top Avoid / Short Pick */}
                  <div className="p-3 rounded-lg bg-rose-950/20 border border-rose-500/30 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-rose-400 uppercase">
                        #1 AVOID / SHORT: {plan.topAvoidOrShortPick.name} ({plan.topAvoidOrShortPick.symbol.replace('.NS', '')})
                      </span>
                      <span className="font-bold text-white">
                        ₹{plan.topAvoidOrShortPick.livePrice.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <p className="text-slate-300 text-[11px] leading-relaxed">
                      {plan.topAvoidOrShortPick.why}
                    </p>
                    <div className="flex items-center justify-between pt-1 text-[11px] text-slate-300">
                      <span>
                        Downside Target: <strong className="text-rose-400">₹{plan.topAvoidOrShortPick.downsideTarget.toLocaleString('en-IN')}</strong> · Invalidation: <strong className="text-amber-300">₹{plan.topAvoidOrShortPick.stopLoss.toLocaleString('en-IN')}</strong>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: LIVE NEWS & STOCK IMPACT FEED */}
      {activeTab === 'LIVE_NEWS_CATALYSTS' && (
        <div className="p-4 sm:p-5 space-y-3">
          <div className="text-xs text-slate-400">
            Live Indian &amp; global financial headlines mapped directly to the NSE/BSE stocks they will cause to rise or fall today:
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {impactData.liveNewsFeed.map((news) => (
              <div
                key={news.id}
                className="rounded-xl bg-[#0a1324] border border-slate-800 p-4 space-y-2.5 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span className="font-bold text-cyan-300">{news.publisher}</span>
                    <span>{news.category.replace(/_/g, ' ')}</span>
                  </div>

                  <a
                    href={news.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs sm:text-sm font-bold text-white hover:text-cyan-300 transition-colors flex items-start justify-between gap-2"
                  >
                    <span>{news.headline}</span>
                    <ExternalLink className="w-3.5 h-3.5 shrink-0 mt-0.5 text-slate-400" />
                  </a>

                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    <strong className="text-amber-300">Market Transmission: </strong>
                    {news.transmissionExplanation}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
                  <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                    Particular Stocks Impacted:
                  </div>
                  {news.impactedStocks.map((st, idx) => (
                    <div
                      key={idx}
                      className="flex items-start justify-between gap-2 text-[11px] bg-slate-950/80 p-2 rounded border border-slate-800/80"
                    >
                      <div>
                        <span
                          className={`font-extrabold mr-1.5 ${
                            st.direction === 'RISING' ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {st.direction === 'RISING' ? '▲ RISING:' : '▼ FALLING:'}
                        </span>
                        <strong className="text-white">{st.name} ({st.symbol.replace('.NS', '')})</strong>
                        <span className="text-slate-300"> — {st.reason}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
};
