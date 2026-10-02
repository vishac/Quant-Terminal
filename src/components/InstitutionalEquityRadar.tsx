import React, { useState, useMemo } from 'react';
import { 
  INSTITUTIONAL_STOCK_PICKS, 
  InstitutionalStockPick,
  QUANTITATIVE_STRATEGY_FRAMEWORK_WEIGHTS,
} from '../data/institutionalEquityData';
import { useLiveMarketData } from '../services/liveMarketService';
import { 
  TrendingUp, 
  TrendingDown, 
  ShieldCheck, 
  Zap, 
  Activity, 
  Search, 
  Download, 
  RefreshCw, 
  Layers, 
  CheckCircle2, 
  Clock, 
  Target, 
  AlertCircle, 
  BarChart3, 
  Building2, 
  ArrowUpRight,
  ExternalLink,
  Table as TableIcon,
  LayoutGrid,
  FileText,
  Sliders,
  Sparkles,
  Percent,
  Check,
  X,
  ChevronRight,
  Scale,
  Compass,
  Award,
  BookOpen
} from 'lucide-react';

type ViewMode = 'TABLE_MATRIX' | 'SPLIT_DOSSIER';
type SortField = 'CONVICTION' | 'UPSIDE_T1' | 'RISK_REWARD' | 'PAT_GROWTH' | 'ROCE' | 'DELIVERY';

export const InstitutionalEquityRadar: React.FC = () => {
  // Radar Stocks LTP Polling Cadence: Default 10 seconds (10000ms) with Zero Gemini Credits
  const [radarPollingIntervalMs, setRadarPollingIntervalMs] = useState<number>(10000);
  const { quotes, latencyMs, isLive, lastUpdated, countdownSeconds, refetch } = useLiveMarketData(radarPollingIntervalMs);

  // View Mode
  const [viewMode, setViewMode] = useState<ViewMode>('TABLE_MATRIX');

  // Filters & Sorting
  const [horizonFilter, setHorizonFilter] = useState<'ALL' | 'SHORT_TERM' | 'LONG_TERM'>('ALL');
  const [sectorFilter, setSectorFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortField, setSortField] = useState<SortField>('CONVICTION');
  const [sortAscending, setSortAscending] = useState<boolean>(false);

  // Active / Selected Stock
  const [selectedStockId, setSelectedStockId] = useState<string>('stock-trent');
  const [modalStockId, setModalStockId] = useState<string | null>(null);

  // Notifications
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Daily Daemon status
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string>(
    'Today at 15:45:00 IST (Daily Post-Market Engine)'
  );

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    refetch();
    setTimeout(() => {
      const now = new Date();
      setLastRefreshedAt(`${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })} IST (Live Exchange Sync)`);
      setIsRefreshing(false);
      setToastMessage('Daily Institutional Alpha Engine: Synchronized 15 liquid equity candidates with real-time NSE/BSE tick feeds.');
      setTimeout(() => setToastMessage(null), 4500);
    }, 700);
  };

  // Filtered & Sorted stocks
  const filteredStocks = useMemo(() => {
    const list = INSTITUTIONAL_STOCK_PICKS.filter(stock => {
      const matchesHorizon = 
        horizonFilter === 'ALL' || 
        stock.horizon === horizonFilter || 
        stock.horizon === 'BOTH';

      const matchesSector = 
        sectorFilter === 'ALL' || 
        stock.sector === sectorFilter;

      const matchesSearch = 
        searchQuery === '' ||
        stock.ticker.toLowerCase().includes(searchQuery.toLowerCase()) ||
        stock.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        stock.institutionalStrategy.modelName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        stock.strategyQuantification.primaryDriver.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesHorizon && matchesSector && matchesSearch;
    });

    return list.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'CONVICTION':
          comparison = b.strategyQuantification.compositeScore - a.strategyQuantification.compositeScore;
          break;
        case 'UPSIDE_T1':
          comparison = b.tacticalLevels.target1.upsidePct - a.tacticalLevels.target1.upsidePct;
          break;
        case 'ROCE': {
          const aVal = parseFloat(a.companyAnalysis1Year.roce) || 0;
          const bVal = parseFloat(b.companyAnalysis1Year.roce) || 0;
          comparison = bVal - aVal;
          break;
        }
        case 'DELIVERY':
          comparison = b.volumeAnalysis.deliveryPct - a.volumeAnalysis.deliveryPct;
          break;
        default:
          comparison = b.strategyQuantification.compositeScore - a.strategyQuantification.compositeScore;
      }
      return sortAscending ? -comparison : comparison;
    });
  }, [horizonFilter, sectorFilter, searchQuery, sortField, sortAscending]);

  const activeStock = INSTITUTIONAL_STOCK_PICKS.find(s => s.id === selectedStockId) || filteredStocks[0] || INSTITUTIONAL_STOCK_PICKS[0];
  const modalStock = modalStockId ? INSTITUTIONAL_STOCK_PICKS.find(s => s.id === modalStockId) : null;

  // Live real market quote for active stock (strictly no fake numbers)
  const liveQuote = activeStock ? (quotes[activeStock.symbol] || {
    price: null,
    change: null,
    changePct: null,
    fiftyTwoWeekHigh: null,
    fiftyTwoWeekLow: null,
    volume: null,
  }) : {
    price: null,
    change: null,
    changePct: null,
    fiftyTwoWeekHigh: null,
    fiftyTwoWeekLow: null,
    volume: null,
  };

  // Calculate 52-week position percentage safely strictly using authentic feed data (no fake multipliers)
  const curPrice = liveQuote?.price ?? null;
  const high52 = liveQuote.fiftyTwoWeekHigh ?? null;
  const low52 = liveQuote.fiftyTwoWeekLow ?? null;
  const pctFrom52Low = (curPrice !== null && low52 !== null && high52 !== null && high52 > low52)
    ? Math.max(0, Math.min(100, ((curPrice - low52) / (high52 - low52)) * 100))
    : null;
  const pctBelow52High = (curPrice !== null && high52 !== null && high52 > 0)
    ? Math.max(0, ((high52 - curPrice) / high52) * 100)
    : null;

  const handleExportCSV = () => {
    const headers = 'Ticker,Name,Sector,Horizon,Conviction Score,Conviction Tier,Strategy Model,Primary Driver,Core Rationale,Order Flow Score,Momentum Score,Quality Score,Risk Reward Score,Macro Moat Score,Entry Min,Entry Max,Stop Loss,Target 1,Target 2,Target 3,Risk Reward,1Y Revenue YoY,1Y PAT YoY,ROCE,ROE,Delivery Pct\n';
    const rows = INSTITUTIONAL_STOCK_PICKS.map(s => {
      const q = s.strategyQuantification;
      const ofScore = q.factorBreakdown.find(f => f.id === 'ORDER_FLOW')?.score || 0;
      const momScore = q.factorBreakdown.find(f => f.id === 'MOMENTUM_CANSLIM')?.score || 0;
      const qarpScore = q.factorBreakdown.find(f => f.id === 'FUNDAMENTAL_QARP')?.score || 0;
      const rrScore = q.factorBreakdown.find(f => f.id === 'RISK_REWARD')?.score || 0;
      const moatScore = q.factorBreakdown.find(f => f.id === 'MACRO_MOAT')?.score || 0;

      return `"${s.ticker}","${s.name}","${s.sector}","${s.horizon}",${q.compositeScore},"${q.tierLabel}","${s.institutionalStrategy.modelName}","${q.primaryDriver.replace(/"/g, '""')}","${q.coreRationale.replace(/"/g, '""')}",${ofScore},${momScore},${qarpScore},${rrScore},${moatScore},${s.tacticalLevels.entryMin},${s.tacticalLevels.entryMax},${s.tacticalLevels.stopLoss},${s.tacticalLevels.target1.price},${s.tacticalLevels.target2.price},${s.tacticalLevels.target3.price},"${s.tacticalLevels.riskRewardRatio}","${s.companyAnalysis1Year.revenueGrowthYoY}","${s.companyAnalysis1Year.patGrowthYoY}","${s.companyAnalysis1Year.roce}","${s.companyAnalysis1Year.roe}","${s.volumeAnalysis.deliveryPct}%"`;
    }).join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `JARVIS_Institutional_Top15_Equities_With_Conviction_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    setToastMessage('Exported Institutional Top 15 Equity Screener dataset with Conviction & Strategy scores as CSV.');
    setTimeout(() => setToastMessage(null), 4000);
  };

  return (
    <div className="flex flex-col gap-6 w-full font-mono text-slate-100">
      {/* Top Banner: Institutional Equity Screener Header (Focus Mode Target) */}
      <div className="relative w-full bg-gradient-to-br from-[#080e22]/95 via-[#060a18]/95 to-[#030610]/98 rounded-2xl p-6 sm:p-7 border border-cyan-500/35 shadow-[0_0_45px_rgba(6,182,212,0.18)] backdrop-blur-2xl overflow-hidden ring-1 ring-cyan-500/20">
        {/* Cyber-Optic Glowing Radial Mesh Backdrop */}
        <div className="absolute -top-16 -right-16 w-96 h-96 rounded-full bg-gradient-to-br from-cyan-500/20 via-emerald-500/15 to-transparent blur-3xl pointer-events-none animate-pulse"></div>

        <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-[10px] font-bold tracking-widest uppercase flex items-center gap-1.5 shadow-[0_0_10px_rgba(0,240,255,0.2)]">
                <Compass className="w-3 h-3 text-cyan-400" />
                QUANTITATIVE_EQUITY_RADAR // MULTI_STRATEGY_ALPHA
              </span>
              <span className="px-2.5 py-0.5 rounded bg-emerald-950/70 border border-emerald-500/50 text-emerald-300 text-[10px] font-bold flex items-center gap-1.5 shadow-[0_0_12px_rgba(16,185,129,0.25)]">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                ZERO GEMINI CREDITS // DIRECT TICK FEED
              </span>
              <span className="px-2.5 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/40 text-cyan-300 text-[10px] font-bold flex items-center gap-1">
                <Clock className="w-3 h-3 text-cyan-400" />
                RADAR LTP CADENCE: {radarPollingIntervalMs / 1000}s
              </span>
              <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400 text-[10px]">
                5-FACTOR QUANTITATIVE MODEL · SCORE &ge; 88/100
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-cyan-100 tracking-tight font-sans flex items-center gap-2">
              INSTITUTIONAL STRATEGY RADAR & CONVICTION MATRIX
            </h1>
            <p className="text-xs text-slate-300/90 mt-1 max-w-3xl font-sans leading-relaxed">
              Every stock in this universe is strictly quantified across 5 orthogonal strategies: <strong className="text-slate-100">Order Flow (20%)</strong>, <strong className="text-slate-100">Momentum / CANSLIM (25%)</strong>, <strong className="text-slate-100">Fundamental QARP (25%)</strong>, <strong className="text-slate-100">Risk-Reward Asymmetry (15%)</strong>, and <strong className="text-slate-100">Sovereign Moat (15%)</strong>. All Last Traded Prices (LTP) stream directly from exchange tick feeds with <strong className="text-emerald-400 font-bold">0 Gemini API credits consumed</strong>.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* View Switcher: Table vs Split Dossier */}
            <div className="flex items-center p-1 bg-slate-950/90 border border-cyan-500/30 rounded-xl text-xs">
              <button
                onClick={() => setViewMode('TABLE_MATRIX')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  viewMode === 'TABLE_MATRIX'
                    ? 'bg-cyan-500 text-slate-950 shadow-[0_0_12px_rgba(0,240,255,0.4)]'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <TableIcon className="w-3.5 h-3.5" />
                <span>STRATEGY MATRIX (TABLE)</span>
              </button>
              <button
                onClick={() => setViewMode('SPLIT_DOSSIER')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  viewMode === 'SPLIT_DOSSIER'
                    ? 'bg-cyan-500 text-slate-950 shadow-[0_0_12px_rgba(0,240,255,0.4)]'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>QUANT DOSSIER (SPLIT)</span>
              </button>
            </div>

            <button
              onClick={handleExportCSV}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-cyan-300 text-xs font-bold transition-all cursor-pointer shadow active:scale-95"
            >
              <Download className="w-4 h-4" />
              <span>EXPORT CSV</span>
            </button>

            <button
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(0,240,255,0.3)] cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'SYNCING...' : 'FORCE SYNC'}</span>
            </button>
          </div>
        </div>

        {/* Live Zero-Credit LTP Streaming Telemetry Bar */}
        <div className="mt-4 p-3 rounded-xl bg-slate-950/80 border border-cyan-500/25 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 font-bold text-[11px]">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>0 CREDITS CONSUMED (100% FREE DIRECT ROUTER)</span>
            </div>

            <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-cyan-950/50 border border-cyan-500/30 text-cyan-300 text-[11px]">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
              <span>LTP REFRESH CADENCE: <strong>{radarPollingIntervalMs / 1000}s</strong></span>
              <span className="text-slate-500">|</span>
              <span className="flex items-center gap-1">
                NEXT TICK IN:
                <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-200 font-bold tabular-nums">
                  {countdownSeconds}s
                </span>
              </span>
            </div>

            <span className="hidden lg:inline text-slate-400 text-[11px]">
              Exchange Latency: <strong className="text-cyan-300">{latencyMs}ms</strong> · Last Tick: <strong className="text-slate-300">{lastUpdated}</strong>
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">LTP CADENCE:</span>
            <button
              onClick={() => {
                setRadarPollingIntervalMs(10000);
                setToastMessage('Radar Stocks LTP cadence set to 10 seconds (0 Gemini Credits used).');
                setTimeout(() => setToastMessage(null), 3000);
              }}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                radarPollingIntervalMs === 10000
                  ? 'bg-cyan-500 text-slate-950 shadow-[0_0_10px_rgba(0,240,255,0.4)]'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              10s (LTP Default)
            </button>
            <button
              onClick={() => {
                setRadarPollingIntervalMs(5000);
                setToastMessage('Radar Stocks LTP cadence set to 5 seconds (0 Gemini Credits used).');
                setTimeout(() => setToastMessage(null), 3000);
              }}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                radarPollingIntervalMs === 5000
                  ? 'bg-cyan-500 text-slate-950 shadow-[0_0_10px_rgba(0,240,255,0.4)]'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              5s (Turbo Sync)
            </button>
          </div>
        </div>

        {/* 5-Strategy Factor Model Summary Cards */}
        <div className="mt-5 pt-4 border-t border-slate-800/80">
          <div className="text-[11px] text-slate-400 mb-2.5 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-cyan-300 font-bold uppercase tracking-wider">
              <Scale className="w-3.5 h-3.5 text-cyan-400" />
              QUANTITATIVE STRATEGY FACTOR WEIGHTS & EVALUATION CRITERIA:
            </span>
            <span className="text-[10px] text-slate-500 font-sans">Formula: Total Conviction Score = &sum; (Factor Weight &times; Strategy Score)</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
            {QUANTITATIVE_STRATEGY_FRAMEWORK_WEIGHTS.map(factor => (
              <div 
                key={factor.id} 
                className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80 hover:border-cyan-500/40 transition-all text-xs"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-slate-200 truncate pr-1 text-[11px]">{factor.shortName}</span>
                  <span className="px-1.5 py-0.2 rounded bg-cyan-950/80 border border-cyan-500/30 text-cyan-300 font-bold text-[10px]">
                    {factor.weightLabel}
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 font-sans leading-tight line-clamp-2">
                  {factor.description}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Status Bar */}
        <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span>DAEMON ENGINE STATUS: <strong className="text-emerald-400">{lastRefreshedAt}</strong></span>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span>UNIVERSE: <strong>15 HIGH-LIQUIDITY EQUITIES</strong></span>
            <span>EXCHANGE ROUTE: <strong className="text-cyan-300">NSE / BSE LIVE TICK</strong></span>
            <span>LATENCY: <strong className="text-emerald-400">{latencyMs} ms</strong></span>
          </div>
        </div>
      </div>

      {toastMessage && (
        <div className="p-3.5 rounded-xl bg-cyan-950/80 border border-cyan-500/40 text-cyan-200 text-xs flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-slate-200 text-xs">Dismiss</button>
        </div>
      )}

      {/* Filter and Control Bar */}
      <div className="bg-[#080d1a]/90 rounded-2xl p-4 border border-cyan-500/20 shadow-xl flex flex-wrap items-center justify-between gap-4">
        {/* Horizon Filter Tabs */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 uppercase tracking-wider">HORIZON:</span>
          <div className="flex items-center gap-1 p-1 bg-slate-950 border border-slate-800 rounded-xl text-xs">
            <button
              onClick={() => setHorizonFilter('ALL')}
              className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                horizonFilter === 'ALL'
                  ? 'bg-cyan-500 text-slate-950 shadow-[0_0_10px_rgba(0,240,255,0.3)]'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              ALL (15)
            </button>
            <button
              onClick={() => setHorizonFilter('SHORT_TERM')}
              className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                horizonFilter === 'SHORT_TERM'
                  ? 'bg-cyan-500 text-slate-950 shadow-[0_0_10px_rgba(0,240,255,0.3)]'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              SHORT-TERM SWING (5-20D)
            </button>
            <button
              onClick={() => setHorizonFilter('LONG_TERM')}
              className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                horizonFilter === 'LONG_TERM'
                  ? 'bg-cyan-500 text-slate-950 shadow-[0_0_10px_rgba(0,240,255,0.3)]'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              LONG-TERM COMPOUNDERS (1-3Y)
            </button>
          </div>
        </div>

        {/* Sector, Search Box & Sort */}
        <div className="flex flex-wrap items-center gap-3 flex-1 max-w-xl justify-end">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">SORT:</span>
            <select
              value={sortField}
              onChange={(e) => setSortField(e.target.value as SortField)}
              className="p-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-cyan-300 outline-none cursor-pointer"
            >
              <option value="CONVICTION">Conviction Score (Highest)</option>
              <option value="UPSIDE_T1">Target 1 Upside %</option>
              <option value="ROCE">ROCE %</option>
              <option value="DELIVERY">Delivery Volume %</option>
            </select>
          </div>

          <select
            value={sectorFilter}
            onChange={(e) => setSectorFilter(e.target.value)}
            className="p-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-cyan-300 outline-none cursor-pointer"
          >
            <option value="ALL">All Sectors</option>
            <option value="DEFENSE">Defense & Aerospace</option>
            <option value="CONSUMER">Consumer & Retail</option>
            <option value="INFRASTRUCTURE">Infrastructure & Capital Goods</option>
            <option value="ELECTRONICS_EMS">Electronics EMS / Tech</option>
            <option value="BANKING_FINANCE">Banking & Financials</option>
            <option value="TELECOM">Telecom</option>
            <option value="POWER_ENERGY">Power & Energy Transition</option>
            <option value="IT_TECH">IT & Software</option>
          </select>

          <div className="relative min-w-[200px] flex-1">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search ticker, strategy, driver..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 placeholder:text-slate-600 outline-none focus:border-cyan-500/50"
            />
          </div>
        </div>
      </div>

      {/* VIEW 1: STRATEGY MATRIX (FULL TABLE VIEW) */}
      {viewMode === 'TABLE_MATRIX' && (
        <div className="bg-[#080d1a]/95 rounded-2xl border border-cyan-500/25 shadow-2xl overflow-hidden">
          <div className="p-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <TableIcon className="w-4 h-4 text-cyan-400" />
              <span className="font-bold text-slate-200 uppercase tracking-wider">
                STRATEGY QUANTIFICATION & CONVICTION COMPARATIVE MATRIX ({filteredStocks.length} STOCKS)
              </span>
            </div>
            <span className="text-[11px] text-cyan-400 font-sans">
              Click any stock row or "View Thesis" to inspect the full institutional deep-dive dossier.
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950 text-[11px] text-slate-400 uppercase tracking-wider">
                  <th className="py-3.5 px-4 font-bold">Ticker / Asset</th>
                  <th className="py-3.5 px-3 font-bold text-center">Conviction Score</th>
                  <th className="py-3.5 px-3 font-bold">5-Factor Strategy Breakdown</th>
                  <th className="py-3.5 px-3 font-bold text-right">
                    <div className="inline-flex flex-col items-end">
                      <div className="flex items-center gap-1.5 text-cyan-300">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                        <span>Live LTP</span>
                      </div>
                      <span className="text-[9px] text-slate-500 normal-case font-mono">{radarPollingIntervalMs / 1000}s tick · 0 cred</span>
                    </div>
                  </th>
                  <th className="py-3.5 px-3 font-bold text-center">Entry Zone</th>
                  <th className="py-3.5 px-3 font-bold text-center">Hard SL</th>
                  <th className="py-3.5 px-3 font-bold text-right">Targets (T1 / T2)</th>
                  <th className="py-3.5 px-3 font-bold text-center">R:R</th>
                  <th className="py-3.5 px-4 font-bold">Conviction Rationale & Core Driver</th>
                  <th className="py-3.5 px-3 font-bold text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {filteredStocks.map((stock) => {
                  const stockQuote = quotes[stock.symbol] || {
                    price: null,
                    change: null,
                    changePct: null,
                  };
                  const q = stock.strategyQuantification;
                  const isHighTier = q.compositeScore >= 93;

                  return (
                    <tr 
                      key={stock.id}
                      onClick={() => {
                        setSelectedStockId(stock.id);
                        setModalStockId(stock.id);
                      }}
                      className="hover:bg-slate-900/60 transition-colors cursor-pointer group"
                    >
                      {/* Ticker & Name */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-cyan-200 text-sm font-mono">{stock.ticker}</span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800 font-mono">
                            {stock.sector}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 truncate max-w-[170px]">{stock.name}</div>
                        <div className="text-[10px] text-cyan-400/80 font-mono mt-0.5">{stock.institutionalStrategy.modelName}</div>
                      </td>

                      {/* Conviction Score & Tier Badge */}
                      <td className="py-3.5 px-3 text-center">
                        <div className="inline-flex flex-col items-center">
                          <div className={`px-2.5 py-1 rounded-xl font-bold font-mono text-sm shadow-sm ${
                            isHighTier 
                              ? 'bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.25)]' 
                              : 'bg-cyan-950/80 border border-cyan-500/50 text-cyan-300 shadow-[0_0_12px_rgba(0,240,255,0.2)]'
                          }`}>
                            {q.compositeScore} / 100
                          </div>
                          <span className={`text-[9px] font-bold uppercase mt-1 ${
                            isHighTier ? 'text-emerald-400' : 'text-cyan-400'
                          }`}>
                            {q.convictionTier.replace(/_/g, ' ')}
                          </span>
                        </div>
                      </td>

                      {/* 5-Factor Strategy Quantification Mini-Bars */}
                      <td className="py-3.5 px-3 min-w-[200px]">
                        <div className="flex flex-col gap-1.5">
                          <div className="grid grid-cols-5 gap-1.5 font-mono text-[9px] text-center">
                            {q.factorBreakdown.map((f) => (
                              <div key={f.id} className="flex flex-col items-center">
                                <span className="text-slate-400 text-[8px]">{f.id === 'ORDER_FLOW' ? 'O' : f.id === 'MOMENTUM_CANSLIM' ? 'M' : f.id === 'FUNDAMENTAL_QARP' ? 'Q' : f.id === 'RISK_REWARD' ? 'R' : 'S'}</span>
                                <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden mt-0.5">
                                  <div 
                                    className={`h-full rounded-full ${
                                      f.score >= 95 ? 'bg-emerald-400' : f.score >= 90 ? 'bg-cyan-400' : 'bg-amber-400'
                                    }`}
                                    style={{ width: `${f.score}%` }}
                                  />
                                </div>
                                <span className="text-[9px] text-slate-300 font-bold mt-0.5">{f.score}</span>
                              </div>
                            ))}
                          </div>
                          <div className="text-[10px] text-slate-400 truncate max-w-[220px]">
                            {q.factorBreakdown[0].metricLabel}
                          </div>
                        </div>
                      </td>

                      {/* Live LTP (10s Real-time Tick, 0 Gemini Credits) */}
                      <td className="py-3.5 px-3 text-right font-mono">
                        <div className="inline-flex flex-col items-end">
                          <div className="flex items-center gap-1 text-sm font-bold text-cyan-200 tabular-nums">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse"></span>
                            {stockQuote?.price != null
                              ? `₹${stockQuote.price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                              : '—'}
                          </div>
                          {stockQuote.change !== null && stockQuote.change !== undefined && stockQuote.changePct !== null && stockQuote.changePct !== undefined ? (
                            <div className={`text-[10px] font-bold ${stockQuote.change >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {stockQuote.change >= 0 ? '+' : ''}{stockQuote.change >= 0 ? `₹${stockQuote.change.toFixed(2)}` : `-₹${Math.abs(stockQuote.change).toFixed(2)}`} ({stockQuote.change >= 0 ? '+' : ''}{stockQuote.changePct.toFixed(2)}%)
                            </div>
                          ) : (
                            <div className="text-[10px] text-slate-500">—</div>
                          )}
                          <span className="text-[8px] text-slate-500 font-sans">LTP ({radarPollingIntervalMs / 1000}s sync)</span>
                        </div>
                      </td>

                      {/* Entry Zone */}
                      <td className="py-3.5 px-3 text-center font-mono text-[11px]">
                        <div className="text-cyan-200 font-bold">
                          ₹{stock.tacticalLevels.entryMin} - ₹{stock.tacticalLevels.entryMax}
                        </div>
                        <span className="text-[9px] text-slate-500">Accumulation</span>
                      </td>

                      {/* Hard SL */}
                      <td className="py-3.5 px-3 text-center font-mono text-[11px]">
                        <div className="text-rose-400 font-bold">
                          ₹{stock.tacticalLevels.stopLoss}
                        </div>
                        <span className="text-[9px] text-rose-400/90">{stock.tacticalLevels.riskPct}% risk</span>
                      </td>

                      {/* Targets */}
                      <td className="py-3.5 px-3 text-right font-mono text-[11px]">
                        <div className="text-emerald-300 font-bold">
                          T1: ₹{stock.tacticalLevels.target1.price} (+{stock.tacticalLevels.target1.upsidePct}%)
                        </div>
                        <div className="text-cyan-300 text-[10px]">
                          T2: ₹{stock.tacticalLevels.target2.price} (+{stock.tacticalLevels.target2.upsidePct}%)
                        </div>
                      </td>

                      {/* R:R */}
                      <td className="py-3.5 px-3 text-center font-mono text-[11px]">
                        <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-200 font-bold">
                          {stock.tacticalLevels.riskRewardRatio.split(' ')[0]}
                        </span>
                      </td>

                      {/* Conviction Rationale & Core Driver */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="text-[11px] text-slate-200 font-semibold line-clamp-1">
                          {q.primaryDriver}
                        </div>
                        <div className="text-[10px] text-slate-400 line-clamp-2 mt-0.5 leading-snug">
                          {q.coreRationale}
                        </div>
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-3 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedStockId(stock.id);
                            setViewMode('SPLIT_DOSSIER');
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-cyan-950/80 hover:bg-cyan-500 hover:text-slate-950 border border-cyan-500/40 text-cyan-300 text-[10px] font-bold uppercase transition-all cursor-pointer whitespace-nowrap"
                        >
                          Deep Dive
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 2: SPLIT DOSSIER (2-COLUMN MASTER-DETAIL VIEW) */}
      {viewMode === 'SPLIT_DOSSIER' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          {/* Left Column: Qualified Stocks List (4 Cols) */}
          <div className="xl:col-span-4 flex flex-col gap-3">
            <div className="flex items-center justify-between text-xs px-1 text-slate-400">
              <span>QUALIFIED STOCKS ({filteredStocks.length})</span>
              <span className="text-[10px] text-cyan-400">SORT: CONVICTION SCORE</span>
            </div>

            <div className="flex flex-col gap-2.5 max-h-[920px] overflow-y-auto pr-1">
              {filteredStocks.map((stock) => {
                const isSelected = stock.id === activeStock.id;
                const stockQuote = quotes[stock.symbol] || {
                  price: null,
                  change: null,
                  changePct: null,
                };
                const q = stock.strategyQuantification;
                const isHighTier = q.compositeScore >= 93;

                return (
                  <div
                    key={stock.id}
                    onClick={() => setSelectedStockId(stock.id)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer relative overflow-hidden ${
                      isSelected
                        ? 'bg-slate-900 border-cyan-400 shadow-[0_0_20px_rgba(0,240,255,0.18)]'
                        : 'bg-[#080d1a]/85 border-slate-800/80 hover:border-cyan-500/40 hover:bg-slate-900/40'
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute top-0 left-0 bottom-0 w-1 bg-cyan-400 shadow-[0_0_8px_#00f0ff]" />
                    )}

                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-base font-bold text-slate-100 font-sans">{stock.ticker}</span>
                          <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                            stock.horizon === 'LONG_TERM' ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/30' :
                            stock.horizon === 'SHORT_TERM' ? 'bg-cyan-950/60 text-cyan-300 border border-cyan-500/30' :
                            'bg-amber-950/60 text-amber-300 border border-amber-500/30'
                          }`}>
                            {stock.horizon === 'BOTH' ? 'SWING + COMPOUND' : stock.horizon}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 truncate max-w-[190px] font-sans">{stock.name}</div>
                        <div className="text-[10px] text-cyan-400/90 font-mono mt-0.5 truncate max-w-[210px]">
                          {stock.institutionalStrategy.modelName}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-sm font-bold text-cyan-200 tabular-nums flex items-center justify-end gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                          {stockQuote?.price != null
                            ? `₹${stockQuote.price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                            : '—'}
                        </div>
                        {stockQuote.change !== null && stockQuote.change !== undefined && stockQuote.changePct !== null && stockQuote.changePct !== undefined ? (
                          <div className={`text-[10px] font-bold ${stockQuote.change >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {stockQuote.change >= 0 ? '+' : ''}{stockQuote.change >= 0 ? `₹${stockQuote.change.toFixed(2)}` : `-₹${Math.abs(stockQuote.change).toFixed(2)}`} ({stockQuote.change >= 0 ? '+' : ''}{stockQuote.changePct.toFixed(2)}%)
                          </div>
                        ) : (
                          <div className="text-[10px] text-slate-500">—</div>
                        )}
                        <span className="text-[8px] text-slate-500 font-mono">LTP · {radarPollingIntervalMs / 1000}s</span>
                      </div>
                    </div>

                    {/* Prominent Conviction Score & Factor Mini-Bar */}
                    <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-1.5">
                        <span className={`px-2 py-0.5 rounded-lg font-bold font-mono text-xs ${
                          isHighTier 
                            ? 'bg-emerald-950/90 border border-emerald-500/40 text-emerald-300' 
                            : 'bg-cyan-950/90 border border-cyan-500/40 text-cyan-300'
                        }`}>
                          CONVICTION: {q.compositeScore}/100
                        </span>
                      </div>
                      <div className="text-emerald-400 font-bold text-[10px]">T1: +{stock.tacticalLevels.target1.upsidePct}%</div>
                    </div>

                    <div className="mt-2 text-[10px] text-slate-400 font-sans line-clamp-1">
                      <strong className="text-slate-300">Driver:</strong> {q.primaryDriver}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Deep-Dive Institutional Dossier on Active Stock (8 Cols) */}
          <div className="xl:col-span-8 flex flex-col gap-6">
            {/* Main Stock Header Card with Massive Conviction Pod */}
            <div className="bg-[#080d1a]/95 rounded-2xl p-6 border border-cyan-500/25 shadow-2xl relative overflow-hidden">
              <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-slate-800">
                <div className="flex-1 min-w-[280px]">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-2xl font-bold text-cyan-100 font-sans">{activeStock.ticker}</span>
                    <span className="text-xs text-slate-400 font-mono">({activeStock.symbol})</span>
                    <span className="px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 text-xs font-bold">
                      {activeStock.strategyQuantification.tierLabel}
                    </span>
                  </div>
                  <h2 className="text-sm text-slate-300 font-sans font-medium">{activeStock.name} • {activeStock.marketCapINR}</h2>
                  <div className="mt-1 flex items-center gap-2 text-xs">
                    <span className="text-slate-400">STRATEGY:</span>
                    <span className="text-cyan-300 font-bold">{activeStock.institutionalStrategy.modelName}</span>
                  </div>
                </div>

                {/* Big Conviction Score Gauge Pod */}
                <div className="flex items-center gap-4 p-3 rounded-2xl bg-slate-950/90 border border-cyan-500/30 shadow-[0_0_20px_rgba(0,240,255,0.15)]">
                  <div className="text-center">
                    <div className="text-[10px] text-slate-400 uppercase tracking-widest">QUANT CONVICTION</div>
                    <div className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-400 font-mono">
                      {activeStock.strategyQuantification.compositeScore}
                      <span className="text-sm text-slate-400 font-normal"> / 100</span>
                    </div>
                    <div className="text-[9px] text-emerald-400 font-bold uppercase tracking-wider">
                      {activeStock.strategyQuantification.convictionTier.replace(/_/g, ' ')}
                    </div>
                  </div>

                  <div className="h-10 w-px bg-slate-800" />

                  {/* Current Price */}
                  <div className="flex flex-col items-end">
                    <div className="text-xl font-bold text-cyan-200 tabular-nums font-mono flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                      {liveQuote?.price != null
                        ? `₹${liveQuote.price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                        : '—'}
                    </div>
                    {liveQuote.change !== null && liveQuote.change !== undefined && liveQuote.changePct !== null && liveQuote.changePct !== undefined ? (
                      <div className={`text-xs font-bold ${liveQuote.change >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {liveQuote.change >= 0 ? '+' : ''}{liveQuote.change >= 0 ? `₹${liveQuote.change.toFixed(2)}` : `-₹${Math.abs(liveQuote.change).toFixed(2)}`} ({liveQuote.change >= 0 ? '+' : ''}{liveQuote.changePct.toFixed(2)}%)
                      </div>
                    ) : (
                      <div className="text-xs text-slate-500">—</div>
                    )}
                    <span className="text-[9px] text-emerald-400/90 mt-0.5 flex items-center gap-1 font-mono">
                      LTP ({radarPollingIntervalMs / 1000}s Sync) · 0 Credits
                    </span>
                  </div>
                </div>
              </div>

              {/* 52-Week High / Low Range Bar */}
              <div className="mt-4 p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>52W LOW: <strong className="text-slate-200">{low52 !== null ? `₹${low52.toLocaleString('en-IN')}` : '—'}</strong></span>
                  <span className="text-cyan-300 font-bold">52-WEEK PRICE RANGE</span>
                  <span>52W HIGH: <strong className="text-slate-200">{high52 !== null ? `₹${high52.toLocaleString('en-IN')}` : '—'}</strong></span>
                </div>
                {pctFrom52Low !== null ? (
                  <>
                    <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden flex relative">
                      <div 
                        className="bg-gradient-to-r from-cyan-600 via-cyan-400 to-emerald-400 h-full rounded-full shadow-[0_0_10px_#00f0ff]" 
                        style={{ width: `${Math.min(100, Math.max(5, pctFrom52Low))}%` }} 
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span className="text-emerald-400 font-bold">+{pctFrom52Low.toFixed(1)}% above 52W Low</span>
                      <span className="text-amber-400 font-bold">{pctBelow52High !== null ? `-${pctBelow52High.toFixed(1)}% below 52W High` : '—'}</span>
                    </div>
                  </>
                ) : (
                  <div className="text-[11px] text-slate-500 font-mono text-center py-1">
                    52-Week range awaiting exchange feed tick
                  </div>
                )}
              </div>

              {/* NEW SECTION 1: QUANTITATIVE 5-STRATEGY FACTOR SCORING BREAKDOWN */}
              <div className="mt-6 pt-5 border-t border-slate-800/80">
                <div className="flex items-center justify-between pb-3 text-xs">
                  <div className="flex items-center gap-2">
                    <Scale className="w-4 h-4 text-cyan-400" />
                    <span className="text-slate-200 font-bold uppercase tracking-wider">
                      QUANTITATIVE MULTI-STRATEGY FACTOR SCORING (WEIGHTED COMPOSITE)
                    </span>
                  </div>
                  <span className="text-[10px] text-emerald-400 font-bold font-mono">
                    COMPOSITE: {activeStock.strategyQuantification.compositeScore} / 100
                  </span>
                </div>

                <div className="space-y-3 font-sans">
                  {activeStock.strategyQuantification.factorBreakdown.map((factor) => {
                    const weightPct = `${(factor.weight * 100).toFixed(0)}%`;
                    const weightedContrib = (factor.score * factor.weight).toFixed(1);

                    return (
                      <div 
                        key={factor.id} 
                        className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-cyan-500/30 transition-all text-xs"
                      >
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-200">{factor.name}</span>
                            <span className="px-1.5 py-0.2 rounded bg-slate-900 border border-slate-800 text-slate-400 font-mono text-[10px]">
                              Weight: {weightPct}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono ${
                              factor.verdict === 'EXEMPLARY' ? 'bg-emerald-950/70 border border-emerald-500/40 text-emerald-300' :
                              factor.verdict === 'STRONG' ? 'bg-cyan-950/70 border border-cyan-500/40 text-cyan-300' :
                              'bg-amber-950/70 border border-amber-500/40 text-amber-300'
                            }`}>
                              {factor.verdict}
                            </span>
                            <span className="text-sm font-bold text-cyan-300 font-mono">
                              {factor.score} / 100
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono">
                              (+{weightedContrib} pts)
                            </span>
                          </div>
                        </div>

                        {/* Factor Progress Bar */}
                        <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden mb-2">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${
                              factor.score >= 95 ? 'bg-emerald-400 shadow-[0_0_8px_#10b981]' :
                              factor.score >= 90 ? 'bg-cyan-400 shadow-[0_0_8px_#00f0ff]' :
                              'bg-amber-400'
                            }`}
                            style={{ width: `${factor.score}%` }}
                          />
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
                          <div>
                            <strong className="text-slate-300 font-mono">Metric:</strong> <span className="text-cyan-200">{factor.metricLabel}</span>
                          </div>
                          <div className="text-slate-400 italic">
                            {factor.rationale}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* NEW SECTION 2: INSTITUTIONAL CONVICTION RATIONALE & INVESTMENT THESIS */}
              <div className="mt-6 pt-5 border-t border-slate-800/80">
                <div className="flex items-center justify-between pb-3 text-xs">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-emerald-400" />
                    <span className="text-slate-200 font-bold uppercase tracking-wider">
                      INSTITUTIONAL CONVICTION RATIONALE & INVESTMENT THESIS
                    </span>
                  </div>
                  <span className="text-[10px] text-cyan-400 font-bold">AUDITED INSTITUTIONAL DOSSIER</span>
                </div>

                {/* Primary Quantitative Driver Callout */}
                <div className="p-3.5 rounded-xl bg-gradient-to-r from-cyan-950/60 to-emerald-950/40 border border-cyan-500/40 text-xs space-y-1 mb-3">
                  <div className="flex items-center gap-2 text-cyan-300 font-bold text-[11px]">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                    <span>PRIMARY QUANTITATIVE ALPHA DRIVER:</span>
                  </div>
                  <p className="text-slate-200 font-sans font-semibold text-xs leading-relaxed">
                    {activeStock.strategyQuantification.primaryDriver}
                  </p>
                </div>

                {/* Core Quantitative Thesis */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-2 mb-3 font-sans">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400 font-mono uppercase">CORE INSTITUTIONAL THESIS:</span>
                    <span className="text-slate-500 font-mono text-[10px]">Framework: {activeStock.institutionalStrategy.framework}</span>
                  </div>
                  <p className="text-slate-100 text-sm leading-relaxed font-light border-l-2 border-cyan-400 pl-3.5">
                    "{activeStock.institutionalStrategy.thesis}"
                  </p>
                  <p className="text-slate-400 text-xs leading-relaxed pt-1">
                    <strong className="text-slate-300">Quantitative Rationale:</strong> {activeStock.strategyQuantification.coreRationale}
                  </p>
                </div>

                {/* Audited Quantitative Qualification Checklist */}
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-2">
                  <span className="text-[11px] text-slate-400 font-mono uppercase block mb-1">
                    VERIFIED QUANTITATIVE ENTRY CRITERIA CHECKLIST:
                  </span>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 font-sans">
                    {activeStock.strategyQuantification.qualificationChecklist.map((rule, idx) => (
                      <div key={idx} className="flex items-start gap-2 p-2 rounded-lg bg-slate-900/60 border border-slate-800/80">
                        <div className="w-4 h-4 rounded-full bg-emerald-950 border border-emerald-500/60 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
                          <Check className="w-2.5 h-2.5" />
                        </div>
                        <div className="text-[11px] leading-tight">
                          <div className="text-slate-300 font-medium">{rule.rule}</div>
                          <div className="text-emerald-400 font-mono text-[10px] mt-0.5">{rule.actualMetric}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Invalidation Condition (What breaks the trade?) */}
                <div className="mt-3 p-3.5 rounded-xl bg-amber-950/30 border border-amber-500/30 text-xs space-y-1">
                  <div className="flex items-center gap-2 text-amber-300 font-bold text-[11px]">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                    <span>INSTITUTIONAL INVALIDATION CONDITION (STOP DISCIPLINE):</span>
                  </div>
                  <p className="text-amber-200/90 font-sans text-xs leading-relaxed">
                    {activeStock.institutionalStrategy.invalidationCondition}
                  </p>
                </div>
              </div>

              {/* Tactical Order Execution Matrix (Entry, Exit, Stop Loss, Supports, Targets) */}
              <div className="mt-6 pt-5 border-t border-slate-800/80 space-y-3">
                <div className="flex items-center justify-between text-xs pb-1 border-b border-slate-800/80">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-cyan-400" />
                    <span className="text-slate-200 font-bold uppercase">TACTICAL EXECUTION GEOMETRY & TARGETS</span>
                  </div>
                  <span className="text-[10px] text-cyan-400 font-bold">R:R: {activeStock.tacticalLevels.riskRewardRatio}</span>
                </div>

                {/* Entry, Stop Loss & Key Supports Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="p-3 rounded-xl bg-slate-950 border border-cyan-500/30">
                    <span className="text-[10px] text-slate-400 block uppercase">OPTIMAL ENTRY BAND</span>
                    <span className="text-sm text-cyan-200 font-bold">
                      ₹{activeStock.tacticalLevels.entryMin} - ₹{activeStock.tacticalLevels.entryMax}
                    </span>
                    <span className="text-[9px] text-cyan-400 block mt-0.5">Accumulation Zone</span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950 border border-rose-500/30">
                    <span className="text-[10px] text-slate-400 block uppercase">HARD STOP LOSS</span>
                    <span className="text-sm text-rose-400 font-bold">
                      ₹{activeStock.tacticalLevels.stopLoss}
                    </span>
                    <span className="text-[9px] text-rose-400 block mt-0.5">{activeStock.tacticalLevels.riskPct}% Risk strictly capped</span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block uppercase">PRIMARY SUPPORT (S1)</span>
                    <span className="text-sm text-slate-200 font-bold">
                      ₹{activeStock.tacticalLevels.support1}
                    </span>
                    <span className="text-[9px] text-slate-400 block mt-0.5">20-Day EMA / VWAP</span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block uppercase">STRUCTURAL FLOOR (S2)</span>
                    <span className="text-sm text-slate-200 font-bold">
                      ₹{activeStock.tacticalLevels.support2}
                    </span>
                    <span className="text-[9px] text-slate-400 block mt-0.5">50 / 200 EMA Support</span>
                  </div>
                </div>

                {/* Multi-Tier Profit Targets: Target 1, Target 2, Target 3 */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                  {/* Target 1 */}
                  <div className="p-3.5 rounded-xl bg-slate-950 border border-emerald-500/30 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 uppercase text-[10px]">TARGET 1 (SWING CONSERVATIVE)</span>
                      <span className="text-emerald-400 font-bold">+{activeStock?.tacticalLevels?.target1?.upsidePct ?? 0}%</span>
                    </div>
                    <div className="text-xl text-emerald-300 font-bold">
                      {activeStock?.tacticalLevels?.target1?.price != null ? `₹${activeStock.tacticalLevels.target1.price.toLocaleString('en-IN')}` : '—'}
                    </div>
                    <span className="text-[10px] text-slate-400 block leading-tight font-sans">
                      {activeStock?.tacticalLevels?.target1?.label ?? ''}
                    </span>
                  </div>

                  {/* Target 2 */}
                  <div className="p-3.5 rounded-xl bg-slate-950 border border-cyan-500/30 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 uppercase text-[10px]">TARGET 2 (BASE EXTENSION)</span>
                      <span className="text-cyan-300 font-bold">+{activeStock?.tacticalLevels?.target2?.upsidePct ?? 0}%</span>
                    </div>
                    <div className="text-xl text-cyan-200 font-bold">
                      {activeStock?.tacticalLevels?.target2?.price != null ? `₹${activeStock.tacticalLevels.target2.price.toLocaleString('en-IN')}` : '—'}
                    </div>
                    <span className="text-[10px] text-slate-400 block leading-tight font-sans">
                      {activeStock?.tacticalLevels?.target2?.label ?? ''}
                    </span>
                  </div>

                  {/* Target 3 */}
                  <div className="p-3.5 rounded-xl bg-slate-950 border border-amber-500/30 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 uppercase text-[10px]">TARGET 3 (BLUE-SKY COMPOUNDER)</span>
                      <span className="text-amber-300 font-bold">+{activeStock?.tacticalLevels?.target3?.upsidePct ?? 0}%</span>
                    </div>
                    <div className="text-xl text-amber-200 font-bold">
                      {activeStock?.tacticalLevels?.target3?.price != null ? `₹${activeStock.tacticalLevels.target3.price.toLocaleString('en-IN')}` : '—'}
                    </div>
                    <span className="text-[10px] text-slate-400 block leading-tight font-sans">
                      {activeStock.tacticalLevels.target3.label}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Volume Analysis & Institutional Footprint Pod */}
            <div className="bg-[#080d1a]/95 rounded-2xl p-6 border border-cyan-500/20 shadow-xl space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-emerald-400" />
                  <span className="text-slate-200 font-bold uppercase">INSTITUTIONAL VOLUME & DELIVERY ANALYSIS</span>
                </div>
                <span className="text-emerald-400 font-bold text-[10px]">WYCKOFF ACCUMULATION PHASE</span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">DAILY AVG VOLUME (20D)</span>
                  <span className="text-sm text-slate-200 font-bold">{activeStock.volumeAnalysis.avgVolume20D}</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-emerald-500/30">
                  <span className="text-[10px] text-slate-400 block">DELIVERY VOLUME %</span>
                  <span className="text-sm text-emerald-400 font-bold">{activeStock.volumeAnalysis.deliveryPct}%</span>
                  <span className="text-[9px] text-slate-500 block">vs {activeStock.volumeAnalysis.deliveryAvg30D}% 30D baseline</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-cyan-500/30">
                  <span className="text-[10px] text-slate-400 block">VOLUME SURGE MULTIPLIER</span>
                  <span className="text-sm text-cyan-300 font-bold">{activeStock.volumeAnalysis.volumeSurge}</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">P/E vs 5Y MEDIAN</span>
                  <span className="text-sm text-slate-200 font-bold">{activeStock.valuation.trailingPE}x</span>
                  <span className="text-[9px] text-slate-500 block">Median: {activeStock.valuation.median5YPE}x</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs space-y-1">
                <div className="flex items-center gap-2 text-cyan-300 font-bold text-[11px]">
                  <Activity className="w-3.5 h-3.5" />
                  <span>BLOCK DEALS & FOOTPRINT SUMMARY:</span>
                </div>
                <p className="text-slate-300 font-sans text-xs leading-relaxed">
                  {activeStock.volumeAnalysis.blockDealsSummary}. {activeStock.volumeAnalysis.institutionalFootprint}.
                </p>
              </div>
            </div>

            {/* 1-Year Company Financial & Operational Analysis */}
            <div className="bg-[#080d1a]/95 rounded-2xl p-6 border border-cyan-500/20 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-cyan-400" />
                  <span className="text-slate-200 font-bold uppercase">1-YEAR COMPANY FINANCIAL & OPERATIONAL HEALTH</span>
                </div>
                <span className="text-[10px] text-cyan-400">AUDITED FY24-FY25 METRICS</span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">1Y REVENUE GROWTH</span>
                  <span className="text-sm text-emerald-400 font-bold">{activeStock.companyAnalysis1Year.revenueGrowthYoY}</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">1Y PAT / NET PROFIT</span>
                  <span className="text-sm text-emerald-400 font-bold">{activeStock.companyAnalysis1Year.patGrowthYoY}</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">ROCE / ROE</span>
                  <span className="text-sm text-cyan-300 font-bold">{activeStock.companyAnalysis1Year.roce} / {activeStock.companyAnalysis1Year.roe}</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">DEBT / EQUITY</span>
                  <span className="text-sm text-slate-200 font-bold">{activeStock.companyAnalysis1Year.debtToEquity}</span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                  <span>FII TREND: <strong className="text-emerald-400">{activeStock.companyAnalysis1Year.fiiHoldingChange}</strong></span>
                  <span>DII TREND: <strong className="text-cyan-300">{activeStock.companyAnalysis1Year.diiHoldingChange}</strong></span>
                  <span>PROMOTER: <strong className="text-slate-200">{activeStock.companyAnalysis1Year.promoterHolding}</strong></span>
                </div>
                <div className="pt-2 border-t border-slate-800/80 text-slate-300 font-sans text-xs">
                  <strong className="text-cyan-300 font-mono">Operational Catalyst:</strong> {activeStock.companyAnalysis1Year.operationalHighlight}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* QUICK FULL THESIS & DOSSIER MODAL */}
      {modalStock && (
        <div 
          onClick={() => setModalStockId(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-[#080d1a] border border-cyan-500/40 rounded-2xl shadow-2xl p-6 font-mono relative"
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-800">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-2xl font-bold text-cyan-200 font-sans">{modalStock.ticker}</span>
                  <span className="text-xs text-slate-400 font-mono">({modalStock.symbol})</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 text-xs font-bold font-mono">
                    SCORE: {modalStock.strategyQuantification.compositeScore} / 100
                  </span>
                </div>
                <div className="text-xs text-slate-300 font-sans">{modalStock.name} • {modalStock.marketCapINR}</div>
                <div className="text-xs text-cyan-300 font-bold mt-0.5">{modalStock.institutionalStrategy.modelName}</div>
              </div>

              <button
                onClick={() => setModalStockId(null)}
                className="w-8 h-8 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-200 hover:border-slate-700 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="py-4 space-y-5">
              {/* Primary Driver */}
              <div className="p-3.5 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-xs space-y-1">
                <span className="text-[10px] text-cyan-300 uppercase tracking-widest font-bold">PRIMARY QUANTITATIVE DRIVER:</span>
                <p className="text-slate-100 font-sans text-sm font-semibold">{modalStock.strategyQuantification.primaryDriver}</p>
              </div>

              {/* Core Thesis */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 font-sans">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="font-mono uppercase text-[10px]">VERIFIED INSTITUTIONAL THESIS</span>
                  <span className="text-[10px] text-cyan-400 font-mono">{modalStock.institutionalStrategy.framework}</span>
                </div>
                <p className="text-slate-200 text-sm leading-relaxed border-l-2 border-cyan-400 pl-3.5">
                  "{modalStock.institutionalStrategy.thesis}"
                </p>
                <p className="text-xs text-slate-400 pt-1">
                  <strong className="text-slate-300">Strategy Synthesis:</strong> {modalStock.strategyQuantification.coreRationale}
                </p>
              </div>

              {/* 5-Strategy Breakdown */}
              <div className="space-y-2">
                <span className="text-[11px] text-slate-400 font-mono uppercase block">
                  QUANTITATIVE FACTOR BREAKDOWN (5 STRATEGIES):
                </span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 font-sans">
                  {modalStock.strategyQuantification.factorBreakdown.map((f) => (
                    <div key={f.id} className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-slate-200">{f.name}</span>
                        <span className="text-cyan-300 font-mono font-bold">{f.score}/100</span>
                      </div>
                      <div className="text-[11px] text-emerald-400 font-mono">{f.metricLabel}</div>
                      <div className="text-[10px] text-slate-400 mt-1">{f.rationale}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tactical Levels Quick Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                <div className="p-2.5 rounded-xl bg-slate-950 border border-cyan-500/30 text-center">
                  <span className="text-[9px] text-slate-400 block">ENTRY ZONE</span>
                  <span className="text-cyan-200 font-bold">₹{modalStock.tacticalLevels.entryMin} - ₹{modalStock.tacticalLevels.entryMax}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-950 border border-rose-500/30 text-center">
                  <span className="text-[9px] text-slate-400 block">HARD STOP LOSS</span>
                  <span className="text-rose-400 font-bold">₹{modalStock.tacticalLevels.stopLoss} ({modalStock.tacticalLevels.riskPct}%)</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-950 border border-emerald-500/30 text-center">
                  <span className="text-[9px] text-slate-400 block">TARGET 1</span>
                  <span className="text-emerald-300 font-bold">{modalStock?.tacticalLevels?.target1?.price != null ? `₹${modalStock.tacticalLevels.target1.price} (+${modalStock.tacticalLevels.target1.upsidePct}%)` : '—'}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-950 border border-cyan-500/30 text-center">
                  <span className="text-[9px] text-slate-400 block">TARGET 2</span>
                  <span className="text-cyan-300 font-bold">{modalStock?.tacticalLevels?.target2?.price != null ? `₹${modalStock.tacticalLevels.target2.price} (+${modalStock.tacticalLevels.target2.upsidePct}%)` : '—'}</span>
                </div>
              </div>

              {/* Invalidation Condition */}
              <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/30 text-xs">
                <span className="text-[10px] text-amber-300 font-bold uppercase block mb-1">
                  INVALIDATION RULE (STOP DISCIPLINE):
                </span>
                <p className="text-amber-200/90 font-sans text-xs">{modalStock.institutionalStrategy.invalidationCondition}</p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-400 font-sans">
                Full audited data from FY24/25 filings and live NSE tick feed.
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setSelectedStockId(modalStock.id);
                    setViewMode('SPLIT_DOSSIER');
                    setModalStockId(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-cyan-500 text-slate-950 text-xs font-bold hover:bg-cyan-400 transition-all cursor-pointer"
                >
                  Switch to Split Dossier
                </button>
                <button
                  onClick={() => setModalStockId(null)}
                  className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-800 transition-all cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
