import React, { useEffect, useState, useMemo } from 'react';
import { 
  Play, 
  TrendingUp, 
  AlertTriangle, 
  Loader2, 
  Star, 
  Plus, 
  Trash2, 
  Search, 
  ShieldCheck, 
  Percent, 
  BarChart3, 
  Activity, 
  Sparkles, 
  Check, 
  ChevronDown,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  HelpCircle,
  Database,
  Calendar,
  ExternalLink,
  Info,
  CheckCircle2
} from 'lucide-react';

interface StrategyMeta { 
  id: string; 
  agent: string; 
  name: string; 
  rule: string; 
}

interface FavouriteList {
  id: string;
  name: string;
  symbols: { symbol: string; label: string; exchange: 'NSE' | 'BSE' | 'INDEX' }[];
}

interface Candle {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

interface BacktestResultData {
  symbol: string;
  resolvedSymbol?: string;
  fallbackNote?: string;
  strategy: StrategyMeta;
  range: string;
  bars: number;
  from: string;
  to: string;
  metrics: {
    totalReturnPct: number;
    buyHoldReturnPct: number;
    alphaPct: number;
    maxDrawdownPct: number;
    winRatePct: number;
    numTrades: number;
    sharpe: number;
    sortino: number;
    calmar: number;
    avgTradePct: number;
    expectancyPct: number;
    profitFactor: number;
    confidenceLevelPct: number;
    confidenceTier: 'VERY_HIGH' | 'HIGH' | 'MODERATE' | 'LOW';
    probabilisticSharpeRatioPct: number;
    winRateLowerBound: number;
    winRateUpperBound: number;
    tStat: number;
    pValue: number;
    maxConsecutiveLosses: number;
    sampleSizeAdequate: boolean;
    sampleNote: string;
  };
  equityCurve: Array<{ date: string; strategy: number; buyHold: number }>;
  trades: Array<{
    entryDate: string;
    exitDate: string;
    entryPrice: number;
    exitPrice: number;
    returnPct: number;
    bars: number;
    exitReason: string;
  }>;
  audit: {
    feedSource: string;
    resolvedTicker: string;
    evaluationBars: number;
    warmupBars: number;
    firstBar: Candle;
    lastBar: Candle;
    latestFeedTimestamp: string;
    recentCandlesAudit: Candle[];
    methodologyNotes: string[];
  };
  disclaimer: string;
}

const token = () => { 
  try { return localStorage.getItem('jarvis_owner_token') || ''; } 
  catch { return ''; } 
};

const api = (path: string, opts: RequestInit = {}) => {
  const t = token();
  return fetch(path, {
    ...opts,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(t ? { 'x-owner-token': t, 'Authorization': `Bearer ${t}` } : {}),
      ...(opts.headers || {}),
    },
  });
};

const PRESET_SYMBOLS = [
  // Major Indices
  { v: '^NSEI', l: 'NIFTY 50', ex: 'INDEX' as const, cat: 'Indices' },
  { v: '^NSEBANK', l: 'BANK NIFTY', ex: 'INDEX' as const, cat: 'Indices' },
  { v: '^BSESN', l: 'SENSEX 30', ex: 'INDEX' as const, cat: 'Indices' },
  { v: '^CNXIT', l: 'NIFTY IT', ex: 'INDEX' as const, cat: 'Indices' },
  { v: '^NSEMDCP50', l: 'NIFTY MIDCAP 50', ex: 'INDEX' as const, cat: 'Indices' },
  
  // NSE Equities
  { v: 'RELIANCE.NS', l: 'Reliance Industries', ex: 'NSE' as const, cat: 'NSE Heavyweights' },
  { v: 'TCS.NS', l: 'Tata Consultancy Services', ex: 'NSE' as const, cat: 'NSE Heavyweights' },
  { v: 'HDFCBANK.NS', l: 'HDFC Bank Ltd', ex: 'NSE' as const, cat: 'NSE Heavyweights' },
  { v: 'INFY.NS', l: 'Infosys Ltd', ex: 'NSE' as const, cat: 'NSE Heavyweights' },
  { v: 'ICICIBANK.NS', l: 'ICICI Bank Ltd', ex: 'NSE' as const, cat: 'NSE Heavyweights' },
  { v: 'BHARTIARTL.NS', l: 'Bharti Airtel', ex: 'NSE' as const, cat: 'NSE Heavyweights' },
  { v: 'SBIN.NS', l: 'State Bank of India', ex: 'NSE' as const, cat: 'NSE Heavyweights' },
  { v: 'LT.NS', l: 'Larsen & Toubro', ex: 'NSE' as const, cat: 'NSE Heavyweights' },
  { v: 'TRENT.NS', l: 'Trent Ltd', ex: 'NSE' as const, cat: 'NSE High Beta' },
  { v: 'BEL.NS', l: 'Bharat Electronics', ex: 'NSE' as const, cat: 'NSE High Beta' },
  { v: 'HAL.NS', l: 'Hindustan Aeronautics', ex: 'NSE' as const, cat: 'NSE High Beta' },
  { v: 'TMCV.NS', l: 'Tata Motors (TMCV)', ex: 'NSE' as const, cat: 'NSE High Beta' },
  { v: 'BAJFINANCE.NS', l: 'Bajaj Finance', ex: 'NSE' as const, cat: 'NSE Heavyweights' },
  
  // BSE Equities
  { v: 'ICICIBANK.BO', l: 'ICICI Bank (BSE 532174)', ex: 'BSE' as const, cat: 'BSE Listed' },
  { v: 'RELIANCE.BO', l: 'Reliance (BSE 500325)', ex: 'BSE' as const, cat: 'BSE Listed' },
  { v: 'TCS.BO', l: 'TCS (BSE 532540)', ex: 'BSE' as const, cat: 'BSE Listed' },
  { v: 'HDFCBANK.BO', l: 'HDFC Bank (BSE 500180)', ex: 'BSE' as const, cat: 'BSE Listed' },
  { v: 'INFY.BO', l: 'Infosys (BSE 500209)', ex: 'BSE' as const, cat: 'BSE Listed' },
  { v: 'SBIN.BO', l: 'SBI (BSE 500112)', ex: 'BSE' as const, cat: 'BSE Listed' },
  { v: 'TMCV.BO', l: 'Tata Motors (BSE 500570)', ex: 'BSE' as const, cat: 'BSE Listed' },
];

const DEFAULT_FAV_LISTS: FavouriteList[] = [
  {
    id: 'fav-default',
    name: 'Core Bluechips',
    symbols: [
      { symbol: '^NSEI', label: 'NIFTY 50', exchange: 'INDEX' },
      { symbol: 'RELIANCE.NS', label: 'Reliance', exchange: 'NSE' },
      { symbol: 'HDFCBANK.NS', label: 'HDFC Bank', exchange: 'NSE' },
      { symbol: 'TCS.NS', label: 'TCS', exchange: 'NSE' },
      { symbol: '^BSESN', label: 'SENSEX', exchange: 'INDEX' },
    ]
  },
  {
    id: 'fav-highbeta',
    name: 'High Beta & Alpha',
    symbols: [
      { symbol: 'TRENT.NS', label: 'Trent', exchange: 'NSE' },
      { symbol: 'BEL.NS', label: 'BEL', exchange: 'NSE' },
      { symbol: 'HAL.NS', label: 'HAL', exchange: 'NSE' },
      { symbol: 'TMCV.NS', label: 'Tata Motors', exchange: 'NSE' },
    ]
  }
];

export const BacktestLab: React.FC = () => {
  const [strategies, setStrategies] = useState<StrategyMeta[]>([]);
  const [symbol, setSymbol] = useState('^NSEI');
  const [customInput, setCustomInput] = useState('');
  const [exchangeTab, setExchangeTab] = useState<'ALL' | 'NSE' | 'BSE' | 'INDEX'>('ALL');
  const [strategy, setStrategy] = useState('chanakya');
  const [range, setRange] = useState('1y');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BacktestResultData | null>(null);

  // Methodology & Raw Data Drawer State
  const [showMethodologyModal, setShowMethodologyModal] = useState(false);
  const [showRawCandlesModal, setShowRawCandlesModal] = useState(false);

  // Personalized Favourite Lists
  const [favouriteLists, setFavouriteLists] = useState<FavouriteList[]>(() => {
    try {
      const saved = localStorage.getItem('jarvis_backtest_fav_lists');
      return saved ? JSON.parse(saved) : DEFAULT_FAV_LISTS;
    } catch {
      return DEFAULT_FAV_LISTS;
    }
  });
  const [activeListId, setActiveListId] = useState<string>(() => favouriteLists[0]?.id || 'fav-default');
  const [isCreatingList, setIsCreatingList] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [symbolSearchQuery, setSymbolSearchQuery] = useState('');

  // Save favourite lists to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('jarvis_backtest_fav_lists', JSON.stringify(favouriteLists));
    } catch {}
  }, [favouriteLists]);

  // Load available strategies
  useEffect(() => { 
    api('/api/backtest/strategies')
      .then(r => r.ok ? r.json() : null)
      .then(j => { 
        if (j?.strategies) {
          setStrategies(j.strategies);
        }
      })
      .catch(() => {}); 
  }, []);

  const activeFavList = useMemo(() => {
    return favouriteLists.find(l => l.id === activeListId) || favouriteLists[0];
  }, [favouriteLists, activeListId]);

  const isCurrentSymbolFavourite = useMemo(() => {
    if (!activeFavList) return false;
    return activeFavList.symbols.some(s => s.symbol.toUpperCase() === symbol.toUpperCase());
  }, [activeFavList, symbol]);

  const toggleFavourite = (targetSymbol: string, targetLabel?: string) => {
    if (!activeFavList) return;
    const symUpper = targetSymbol.toUpperCase();
    const exists = activeFavList.symbols.some(s => s.symbol.toUpperCase() === symUpper);

    setFavouriteLists(prev => prev.map(list => {
      if (list.id !== activeFavList.id) return list;
      if (exists) {
        return {
          ...list,
          symbols: list.symbols.filter(s => s.symbol.toUpperCase() !== symUpper)
        };
      } else {
        const ex: 'NSE' | 'BSE' | 'INDEX' = symUpper.startsWith('^') 
          ? 'INDEX' 
          : symUpper.endsWith('.BO') 
            ? 'BSE' 
            : 'NSE';
        return {
          ...list,
          symbols: [...list.symbols, {
            symbol: symUpper,
            label: targetLabel || symUpper.replace('.NS', '').replace('.BO', ''),
            exchange: ex
          }]
        };
      }
    }));
  };

  const handleCreateList = () => {
    if (!newListName.trim()) return;
    const newList: FavouriteList = {
      id: `fav-${Date.now()}`,
      name: newListName.trim(),
      symbols: []
    };
    setFavouriteLists(prev => [...prev, newList]);
    setActiveListId(newList.id);
    setNewListName('');
    setIsCreatingList(false);
  };

  const handleDeleteList = (listId: string) => {
    if (favouriteLists.length <= 1) return;
    setFavouriteLists(prev => prev.filter(l => l.id !== listId));
    if (activeListId === listId) {
      const remaining = favouriteLists.filter(l => l.id !== listId);
      setActiveListId(remaining[0]?.id || '');
    }
  };

  const handleApplyCustomSymbol = (exchange: 'NSE' | 'BSE' | 'RAW') => {
    if (!customInput.trim()) return;
    let clean = customInput.trim().toUpperCase();
    if (exchange === 'NSE' && !clean.endsWith('.NS') && !clean.startsWith('^')) {
      clean = `${clean}.NS`;
    } else if (exchange === 'BSE' && !clean.endsWith('.BO') && !clean.startsWith('^')) {
      clean = `${clean}.BO`;
    }
    setSymbol(clean);
  };

  const filteredPresets = useMemo(() => {
    return PRESET_SYMBOLS.filter(s => {
      const matchesExchange = exchangeTab === 'ALL' || s.ex === exchangeTab;
      const matchesSearch = !symbolSearchQuery.trim() || 
        s.l.toLowerCase().includes(symbolSearchQuery.toLowerCase()) || 
        s.v.toLowerCase().includes(symbolSearchQuery.toLowerCase());
      return matchesExchange && matchesSearch;
    });
  }, [exchangeTab, symbolSearchQuery]);

  const run = async (targetSymbol = symbol, targetStrategy = strategy, targetRange = range) => {
    setLoading(true); 
    setError(null);
    try {
      const res = await api('/api/backtest/run', { 
        method: 'POST', 
        body: JSON.stringify({ 
          symbol: targetSymbol.trim(), 
          strategy: targetStrategy, 
          range: targetRange 
        }) 
      });
      const j = await res.json();
      if (j.success && j.result) {
        setResult(j.result); 
      } else {
        setError(j.error || 'Backtest failed to execute on upstream exchange feed.');
      }
    } catch { 
      setError('Could not reach the backtester harness. Please check server status.'); 
    }
    finally { 
      setLoading(false); 
    }
  };

  // Run automatically on first load to immediately display verified stats
  useEffect(() => {
    run('^NSEI', 'chanakya', '1y');
  }, []);

  const meta = strategies.find(s => s.id === strategy) || result?.strategy;

  // Build high-fidelity equity-curve SVG
  const renderCurve = () => {
    if (!result?.equityCurve?.length) return null;
    const pts = result.equityCurve;
    const W = 900, H = 240, pad = 12;
    const all = pts.flatMap(p => [p.strategy, p.buyHold]);
    const min = Math.min(...all), max = Math.max(...all);
    const sx = (i: number) => pad + (i / (pts.length - 1)) * (W - 2 * pad);
    const sy = (v: number) => H - pad - ((v - min) / (max - min || 1)) * (H - 2 * pad);
    const line = (key: 'strategy' | 'buyHold') => pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${sx(i).toFixed(1)},${sy(p[key]).toFixed(1)}`).join(' ');
    
    // Baseline 100 level
    const y100 = sy(100);

    return (
      <div className="relative w-full">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto drop-shadow-md" data-testid="equity-curve">
          <defs>
            <linearGradient id="stratGlow" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.0" />
            </linearGradient>
          </defs>
          
          {/* Baseline 100 level */}
          {y100 >= pad && y100 <= H - pad && (
            <line x1={pad} y1={y100} x2={W - pad} y2={y100} stroke="#334155" strokeDasharray="3 3" strokeWidth="1" />
          )}

          {/* Benchmark line */}
          <path d={line('buyHold')} fill="none" stroke="#64748b" strokeWidth="1.6" strokeDasharray="4 3" opacity="0.8" />
          
          {/* Strategy equity line */}
          <path d={line('strategy')} fill="none" stroke="#22d3ee" strokeWidth="2.4" />
        </svg>

        {/* Legend */}
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-800/80 text-[11px] text-slate-400">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-0.5 bg-cyan-400 rounded-full" />
              <span className="text-cyan-300 font-bold font-mono">Strategy Equity Curve (₹{result.equityCurve[result.equityCurve.length - 1]?.strategy})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-0.5 bg-slate-500 rounded-full stroke-dasharray" />
              <span className="text-slate-400 font-mono">Buy &amp; Hold Benchmark (₹{result.equityCurve[result.equityCurve.length - 1]?.buyHold})</span>
            </div>
          </div>
          <span className="text-[10px] text-slate-500 font-mono">
            Normalized Base: ₹100.00 at {result.from}
          </span>
        </div>
      </div>
    );
  };

  const metric = (label: string, val: string, cls = 'text-slate-100', subtitle?: string) => (
    <div className="rounded-xl bg-[#0a1120] border border-slate-800 p-3.5 flex flex-col justify-between hover:border-slate-700 transition-colors">
      <span className="text-[10px] uppercase text-slate-500 font-bold tracking-wider">{label}</span>
      <span className={`text-lg font-bold font-mono my-1 ${cls}`}>{val}</span>
      {subtitle && <span className="text-[9px] text-slate-400 truncate">{subtitle}</span>}
    </div>
  );

  return (
    <div className="space-y-6 font-mono" data-testid="backtest-lab">
      {/* 1. Scope, Methodology & Truth Banner */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-cyan-950/40 via-slate-900 to-slate-950 border border-cyan-500/30 text-slate-200 text-xs flex flex-wrap items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-cyan-950 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shrink-0">
            <Database className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-cyan-300 font-bold uppercase tracking-wider text-[11px]">
                Deterministic Live-Feed Backtest Engine (NSE &amp; BSE)
              </span>
              <span className="px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-700 text-[9px] font-bold">
                100% Real Live Feeds
              </span>
            </div>
            <p className="text-slate-400 text-[11px] mt-0.5">
              Statistically validated with Probabilistic Sharpe Ratio (PSR), exact Wilson Score 95% Confidence Intervals, and warm-up buffer. Zero dummy or synthetic data.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowMethodologyModal(true)}
            className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-slate-700 hover:border-cyan-500 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Info className="w-3.5 h-3.5" />
            <span>Calculation Methodology</span>
          </button>
        </div>
      </div>

      {/* 2. BACKTEST CONFIGURATION CARD */}
      <div className="rounded-2xl p-5 border bg-[#0a1120] border-slate-800 space-y-5 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
          <span className="text-xs uppercase tracking-wide text-cyan-300 font-bold flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-cyan-400" />
            Quant Strategy Backtester &amp; Agent Engine
          </span>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400 text-[11px]">Active Target:</span>
            <span className="px-2.5 py-1 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 font-bold font-mono text-xs shadow-inner">
              {symbol}
            </span>
            <button
              onClick={() => toggleFavourite(symbol)}
              className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                isCurrentSymbolFavourite
                  ? 'bg-amber-950/80 text-amber-400 border-amber-600 shadow-[0_0_10px_rgba(245,158,11,0.3)]'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-amber-300 hover:border-slate-700'
              }`}
              title={isCurrentSymbolFavourite ? 'Remove from Favourite List' : 'Add to Favourite List'}
            >
              <Star className={`w-3.5 h-3.5 ${isCurrentSymbolFavourite ? 'fill-amber-400 text-amber-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* PERSONALIZED FAVOURITE LISTS SECTION */}
        <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/90 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400/40" />
              <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                Personalized Favourite List(s):
              </span>
              <div className="flex items-center gap-1.5 ml-2">
                {favouriteLists.map(list => (
                  <button
                    key={list.id}
                    onClick={() => setActiveListId(list.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all cursor-pointer border ${
                      activeListId === list.id
                        ? 'bg-amber-950/80 text-amber-200 border-amber-500 font-bold shadow-[0_0_10px_rgba(245,158,11,0.2)]'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700'
                    }`}
                  >
                    <span>{list.name}</span>
                    <span className="ml-1.5 text-[10px] px-1 py-0.2 rounded bg-black/40 text-slate-400">
                      {list.symbols.length}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isCreatingList ? (
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    value={newListName}
                    onChange={(e) => setNewListName(e.target.value)}
                    placeholder="New list name…"
                    className="px-2 py-1 rounded bg-slate-900 border border-slate-700 text-xs text-slate-200 outline-none w-32 focus:border-amber-400"
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateList()}
                  />
                  <button
                    onClick={handleCreateList}
                    className="px-2 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded text-xs font-bold cursor-pointer"
                  >
                    Add
                  </button>
                  <button
                    onClick={() => setIsCreatingList(false)}
                    className="px-1.5 py-1 text-slate-400 hover:text-slate-200 text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setIsCreatingList(true)}
                  className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-amber-300 transition-colors cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>New List</span>
                </button>
              )}

              {favouriteLists.length > 1 && (
                <button
                  onClick={() => handleDeleteList(activeListId)}
                  className="text-slate-500 hover:text-rose-400 transition-colors p-1"
                  title="Delete this custom favourite list"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Favourite Symbols Pills in Active List */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            {activeFavList && activeFavList.symbols.length > 0 ? (
              activeFavList.symbols.map(fav => (
                <div
                  key={fav.symbol}
                  className={`group flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono border transition-all cursor-pointer ${
                    symbol.toUpperCase() === fav.symbol.toUpperCase()
                      ? 'bg-cyan-950 text-cyan-200 border-cyan-400 font-bold shadow-[0_0_8px_rgba(0,240,255,0.2)]'
                      : 'bg-slate-900/90 text-slate-300 border-slate-800 hover:border-slate-700 hover:text-white'
                  }`}
                  onClick={() => {
                    setSymbol(fav.symbol);
                    run(fav.symbol, strategy, range);
                  }}
                >
                  <span className={`text-[9px] px-1 py-0.2 rounded font-bold ${
                    fav.exchange === 'INDEX' ? 'bg-purple-950 text-purple-300' :
                    fav.exchange === 'BSE' ? 'bg-orange-950 text-orange-300' : 'bg-sky-950 text-sky-300'
                  }`}>
                    {fav.exchange}
                  </span>
                  <span>{fav.label}</span>
                  <span className="text-[10px] text-slate-400 opacity-60">({fav.symbol})</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavourite(fav.symbol);
                    }}
                    className="ml-1 text-slate-500 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Remove from list"
                  >
                    ×
                  </button>
                </div>
              ))
            ) : (
              <span className="text-xs text-slate-500 italic">
                No symbols in this list yet. Click the star icon next to any symbol below to bookmark it here.
              </span>
            )}
          </div>
        </div>

        {/* SYMBOL PICKER & CUSTOM ENTRY (NSE & BSE) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Custom Symbol Input & Exchange Selector (5 Cols) */}
          <div className="lg:col-span-5 flex flex-col gap-2 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="text-[10px] uppercase text-slate-400 font-bold flex items-center justify-between">
              <span>Pick Any Market Symbol (NSE / BSE)</span>
              <span className="text-cyan-400">Direct Upstream Query</span>
            </span>

            <div className="flex items-center gap-1.5 mt-1">
              <input
                type="text"
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                placeholder="e.g. RELIANCE, TCS, INFY, 500325, NIFTY…"
                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 outline-none focus:border-cyan-500 font-mono"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && customInput.trim()) {
                    handleApplyCustomSymbol('NSE');
                    run(customInput.trim().toUpperCase().includes('.') ? customInput.trim().toUpperCase() : `${customInput.trim().toUpperCase()}.NS`, strategy, range);
                  }
                }}
              />
              <button
                onClick={() => {
                  if (customInput.trim()) {
                    handleApplyCustomSymbol('NSE');
                    const sym = customInput.trim().toUpperCase().includes('.') || customInput.startsWith('^') ? customInput.trim().toUpperCase() : `${customInput.trim().toUpperCase()}.NS`;
                    run(sym, strategy, range);
                  }
                }}
                className="px-2.5 py-2 rounded-lg bg-sky-950 hover:bg-sky-900 text-sky-300 border border-sky-700 text-xs font-bold cursor-pointer transition-colors"
                title="Resolve as NSE Symbol (.NS)"
              >
                NSE
              </button>
              <button
                onClick={() => {
                  if (customInput.trim()) {
                    handleApplyCustomSymbol('BSE');
                    const sym = customInput.trim().toUpperCase().includes('.') || customInput.startsWith('^') ? customInput.trim().toUpperCase() : `${customInput.trim().toUpperCase()}.BO`;
                    run(sym, strategy, range);
                  }
                }}
                className="px-2.5 py-2 rounded-lg bg-orange-950 hover:bg-orange-900 text-orange-300 border border-orange-700 text-xs font-bold cursor-pointer transition-colors"
                title="Resolve as BSE Symbol (.BO)"
              >
                BSE
              </button>
            </div>
            <span className="text-[10px] text-slate-500">
              Supports ticker symbols (e.g. <span className="text-slate-300">TRENT</span>, <span className="text-slate-300">HAL</span>), BSE Scrip Codes (e.g. <span className="text-slate-300">500325</span>, <span className="text-slate-300">532540</span>), and indices (<span className="text-slate-300">^NSEI</span>, <span className="text-slate-300">^BSESN</span>).
            </span>
          </div>

          {/* Quick Presets Carousel with Search & Tabs (7 Cols) */}
          <div className="lg:col-span-7 flex flex-col gap-2 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[10px] uppercase text-slate-400 font-bold">
                Market Presets &amp; Heavyweights
              </span>
              <div className="flex items-center gap-1">
                {(['ALL', 'INDEX', 'NSE', 'BSE'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setExchangeTab(tab)}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono transition-colors cursor-pointer ${
                      exchangeTab === tab
                        ? 'bg-cyan-950 text-cyan-300 border border-cyan-700'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-1.5 mt-0.5">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  value={symbolSearchQuery}
                  onChange={(e) => setSymbolSearchQuery(e.target.value)}
                  placeholder="Filter presets…"
                  className="w-full bg-slate-900/90 border border-slate-800 rounded-lg pl-8 pr-2 py-1.5 text-xs text-slate-200 outline-none focus:border-cyan-500 font-mono"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1 mt-1">
              {filteredPresets.map(p => (
                <button
                  key={p.v}
                  onClick={() => {
                    setSymbol(p.v);
                    run(p.v, strategy, range);
                  }}
                  className={`px-2 py-1 rounded text-[11px] font-mono border transition-all cursor-pointer flex items-center gap-1.5 ${
                    symbol.toUpperCase() === p.v.toUpperCase()
                      ? 'bg-cyan-950 text-cyan-200 border-cyan-400 font-bold shadow-[0_0_8px_rgba(0,240,255,0.2)]'
                      : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700 hover:text-white'
                  }`}
                >
                  <span className={`text-[8px] px-1 py-0.1 rounded font-bold ${
                    p.ex === 'INDEX' ? 'bg-purple-950 text-purple-300' :
                    p.ex === 'BSE' ? 'bg-orange-950 text-orange-300' : 'bg-sky-950 text-sky-300'
                  }`}>
                    {p.ex}
                  </span>
                  <span>{p.l}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* STRATEGY SELECTION & PARAMETERS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-slate-800/80">
          {/* Strategy Agent Selector */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] uppercase text-slate-500 font-bold flex items-center justify-between">
              <span>Agent Strategy</span>
              <span className="text-cyan-400">5 Autonomous Agents</span>
            </span>
            <select 
              value={strategy} 
              data-testid="bt-strategy" 
              onChange={(e) => {
                setStrategy(e.target.value);
                run(symbol, e.target.value, range);
              }} 
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 outline-none focus:border-cyan-500 font-bold"
            >
              {strategies.map(s => (
                <option key={s.id} value={s.id}>
                  {s.agent} — {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Historical Range */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] uppercase text-slate-500 font-bold flex items-center justify-between">
              <span>Historical Evaluation Range</span>
              <span className="text-slate-400">+Warmup Buffer</span>
            </span>
            <select 
              value={range} 
              data-testid="bt-range" 
              onChange={(e) => {
                setRange(e.target.value);
                run(symbol, strategy, e.target.value);
              }} 
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 outline-none focus:border-cyan-500 font-bold"
            >
              <option value="6mo">6 Months (Recent Regime ~125 Bars)</option>
              <option value="1y">1 Year (Full Cycle ~247 Bars)</option>
              <option value="2y">2 Years (Multi-Year Regime ~495 Bars)</option>
              <option value="5y">5 Years (Structural Macro ~1235 Bars)</option>
            </select>
          </div>

          {/* Run Action Button */}
          <div className="flex items-end">
            <button 
              onClick={() => run(symbol, strategy, range)} 
              disabled={loading} 
              data-testid="bt-run" 
              className="w-full py-2.5 rounded-lg bg-gradient-to-r from-cyan-600 to-teal-500 hover:from-cyan-500 hover:to-teal-400 text-white text-xs font-extrabold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 shadow-[0_0_15px_rgba(34,211,238,0.25)] transition-all"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Computing Live Backtest…</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" />
                  <span>Execute Backtest</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Selected Strategy Invariant Rule Display */}
        {meta && (
          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] text-slate-300 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <div>
              <span className="text-cyan-300 font-bold uppercase tracking-wide mr-1.5">
                {meta.agent} Engine:
              </span>
              <span>{meta.rule}</span>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2" data-testid="bt-error">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* BACKTEST RESULT VIEW */}
      {result && (
        <>
          {/* 3. STATISTICAL CONFIDENCE LEVEL & EDGE CARD (CSS Selector 1) */}
          <div className="rounded-2xl p-5 border bg-gradient-to-br from-[#0a1120] to-[#070e1c] border-cyan-500/30 shadow-2xl relative">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-800/80">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-cyan-950 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-inner">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs uppercase tracking-wide text-cyan-300 font-extrabold">
                      Statistical Confidence Level &amp; Edge Evaluation
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase border ${
                      result.metrics.confidenceTier === 'VERY_HIGH' 
                        ? 'bg-emerald-950 text-emerald-300 border-emerald-600'
                        : result.metrics.confidenceTier === 'HIGH'
                          ? 'bg-teal-950 text-teal-300 border-teal-600'
                          : result.metrics.confidenceTier === 'MODERATE'
                            ? 'bg-amber-950 text-amber-300 border-amber-600'
                            : 'bg-rose-950 text-rose-300 border-rose-600'
                    }`}>
                      {result.metrics.confidenceTier} CONFIDENCE ({result.metrics.confidenceLevelPct}%)
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                    <span>
                      Evaluated on {result.bars} daily bars ({result.from} → {result.to})
                    </span>
                    <span>•</span>
                    <span className="text-cyan-400 font-mono">
                      Resolved: {result.resolvedSymbol || result.symbol}
                    </span>
                    {result.fallbackNote && (
                      <span className="text-amber-400 italic">({result.fallbackNote})</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Confidence Meter Bar & Action Links */}
              <div className="flex items-center gap-4">
                <div className="w-48 flex flex-col gap-1">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-slate-400">Statistical Edge Score:</span>
                    <span className="text-cyan-300 font-bold font-mono">{result.metrics.confidenceLevelPct}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden border border-slate-800">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        result.metrics.confidenceTier === 'VERY_HIGH' ? 'bg-gradient-to-r from-teal-500 to-emerald-400' :
                        result.metrics.confidenceTier === 'HIGH' ? 'bg-gradient-to-r from-teal-500 to-cyan-400' :
                        result.metrics.confidenceTier === 'MODERATE' ? 'bg-gradient-to-r from-amber-500 to-teal-400' :
                        'bg-gradient-to-r from-rose-500 to-amber-500'
                      }`}
                      style={{ width: `${result.metrics.confidenceLevelPct}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Statistical Edge Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Wilson Score 95% Confidence Interval */}
              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80">
                <span className="text-[10px] uppercase text-slate-500 font-bold block">
                  95% Win-Rate Interval
                </span>
                <span className="text-sm font-bold text-slate-200 font-mono mt-0.5 block">
                  [{result.metrics.winRateLowerBound}% — {result.metrics.winRateUpperBound}%]
                </span>
                <span className="text-[9px] text-slate-500 block mt-0.5">
                  Wilson score binomial interval (N={result.metrics.numTrades})
                </span>
              </div>

              {/* Probabilistic Sharpe Ratio (PSR) */}
              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80">
                <span className="text-[10px] uppercase text-slate-500 font-bold block">
                  Probabilistic Sharpe (PSR)
                </span>
                <span className={`text-sm font-bold font-mono mt-0.5 block ${
                  result.metrics.probabilisticSharpeRatioPct >= 75 ? 'text-emerald-400' :
                  result.metrics.probabilisticSharpeRatioPct >= 50 ? 'text-cyan-300' : 'text-rose-400'
                }`}>
                  {result.metrics.probabilisticSharpeRatioPct}%
                </span>
                <span className="text-[9px] text-slate-500 block mt-0.5">
                  Prob. true Sharpe &gt; 0 (López de Prado)
                </span>
              </div>

              {/* Profit Factor & Expectancy */}
              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80">
                <span className="text-[10px] uppercase text-slate-500 font-bold block">
                  Profit Factor &amp; Expectancy
                </span>
                <span className={`text-sm font-bold font-mono mt-0.5 block ${
                  result.metrics.profitFactor >= 1.5 ? 'text-emerald-400' : result.metrics.profitFactor >= 1.0 ? 'text-teal-400' : 'text-rose-400'
                }`}>
                  {result.metrics.profitFactor}x <span className="text-xs text-slate-400 font-normal">({result.metrics.expectancyPct >= 0 ? '+' : ''}{result.metrics.expectancyPct}% / trade)</span>
                </span>
                <span className="text-[9px] text-slate-500 block mt-0.5">
                  Gross Profit / Gross Loss ratio
                </span>
              </div>

              {/* Student's t-Statistic */}
              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80">
                <span className="text-[10px] uppercase text-slate-500 font-bold block">
                  Student's t-Stat &amp; p-Value
                </span>
                <span className="text-sm font-bold text-slate-200 font-mono mt-0.5 block">
                  {result.metrics.tStat} <span className="text-xs text-slate-400 font-normal">(p={result.metrics.pValue})</span>
                </span>
                <span className="text-[9px] text-slate-500 block mt-0.5">
                  {result.metrics.pValue < 0.05 ? 'Statistically significant (p < 0.05)' : 'Developing statistical sample'}
                </span>
              </div>
            </div>

            {/* Sample Size Transparency Note */}
            <div className="mt-3 pt-3 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span>{result.metrics.sampleNote}</span>
              </div>
              <button
                onClick={() => setShowRawCandlesModal(true)}
                className="text-cyan-400 hover:text-cyan-300 underline font-mono text-[10px] cursor-pointer"
              >
                Inspect Raw Live Feed Bars ({result.bars})
              </button>
            </div>
          </div>

          {/* 4. CORE PERFORMANCE METRICS GRID (CSS Selectors 2 to 8) */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {/* 1. Strategy Return */}
            {metric(
              'Strategy Return', 
              `${result.metrics.totalReturnPct >= 0 ? '+' : ''}${result.metrics.totalReturnPct}%`, 
              result.metrics.totalReturnPct >= 0 ? 'text-emerald-400' : 'text-rose-400',
              'Cumulative return'
            )}

            {/* 2. Buy & Hold Benchmark */}
            {metric(
              'Buy & Hold', 
              `${result.metrics.buyHoldReturnPct >= 0 ? '+' : ''}${result.metrics.buyHoldReturnPct}%`, 
              'text-slate-300',
              `Alpha: ${result.metrics.alphaPct >= 0 ? '+' : ''}${result.metrics.alphaPct}%`
            )}

            {/* 3. Max Drawdown */}
            {metric(
              'Max Drawdown', 
              `-${result.metrics.maxDrawdownPct}%`, 
              'text-rose-400',
              'Peak-to-trough decline'
            )}

            {/* 4. Win Rate */}
            {metric(
              'Win Rate', 
              `${result.metrics.winRatePct}%`,
              result.metrics.winRatePct >= 50 ? 'text-emerald-400' : 'text-amber-400',
              `95% CI: [${result.metrics.winRateLowerBound}% - ${result.metrics.winRateUpperBound}%]`
            )}

            {/* 5. Trades Count */}
            {metric(
              'Trades Executed', 
              `${result.metrics.numTrades}`,
              'text-slate-100',
              `Max Consec Losses: ${result.metrics.maxConsecutiveLosses}`
            )}

            {/* 6. Sharpe & Sortino */}
            {metric(
              'Sharpe / Sortino', 
              `${result.metrics.sharpe} / ${result.metrics.sortino}`, 
              result.metrics.sharpe >= 1.0 ? 'text-emerald-400' : result.metrics.sharpe >= 0 ? 'text-cyan-300' : 'text-rose-400',
              `Calmar: ${result.metrics.calmar}x`
            )}

            {/* 7. Confidence Tier */}
            {metric(
              'Confidence Tier', 
              result.metrics.confidenceTier, 
              result.metrics.confidenceTier === 'VERY_HIGH' ? 'text-emerald-400' : 
              result.metrics.confidenceTier === 'HIGH' ? 'text-teal-400' : 
              result.metrics.confidenceTier === 'MODERATE' ? 'text-amber-400' : 'text-rose-400',
              `${result.metrics.confidenceLevelPct}% Score`
            )}
          </div>

          {/* 5. EQUITY CURVE VISUALIZATION (CSS Selector 9) */}
          <div className="rounded-2xl p-5 border bg-[#0a1120] border-slate-800 shadow-xl">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3 pb-2 border-b border-slate-800/80">
              <span className="text-xs uppercase tracking-wide text-cyan-300 font-bold flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-cyan-400" />
                Equity Curve Simulation (Normalized Base = ₹100.00)
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                {result.from} → {result.to} · {result.bars} trading bars · <span className="text-cyan-400 font-bold">Strategy</span> vs <span className="text-slate-400 font-bold">Buy &amp; Hold Benchmark</span>
              </span>
            </div>
            {renderCurve()}
          </div>

          {/* 6. TRADES AUDIT TABLE & LIVE DATA AUDIT (CSS Selector 10) */}
          <div className="rounded-2xl p-5 border bg-[#0a1120] border-slate-800 shadow-xl space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800/80">
              <span className="text-xs uppercase tracking-wide text-slate-200 font-bold flex items-center gap-2">
                <Activity className="w-4 h-4 text-cyan-400" />
                Detailed Execution Trade Log ({result.trades.length} positions)
              </span>
              <div className="flex items-center gap-2 text-[10px] text-slate-400">
                <span>Verified Source:</span>
                <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-cyan-300 font-mono font-bold">
                  {result.audit.feedSource}
                </span>
              </div>
            </div>

            {/* Trades Table */}
            <div className="overflow-x-auto max-h-80 overflow-y-auto">
              <table className="w-full text-xs" data-testid="trades-table">
                <thead>
                  <tr className="text-slate-500 text-left border-b border-slate-800 sticky top-0 bg-[#0a1120]">
                    <th className="py-2 pr-3">Entry Date</th>
                    <th className="pr-3">Exit Date</th>
                    <th className="pr-3 text-right">Entry (₹)</th>
                    <th className="pr-3 text-right">Exit (₹)</th>
                    <th className="pr-3 text-right">Return</th>
                    <th className="pr-3 text-right">Holding</th>
                    <th className="text-left">Exit Reason / Condition</th>
                  </tr>
                </thead>
                <tbody>
                  {result.trades.map((t, i) => (
                    <tr key={i} className="border-t border-slate-800/60 text-slate-300 hover:bg-slate-900/40">
                      <td className="py-2 pr-3 font-mono">{t.entryDate}</td>
                      <td className="pr-3 font-mono">{t.exitDate}</td>
                      <td className="pr-3 text-right font-mono">₹{t.entryPrice.toLocaleString('en-IN')}</td>
                      <td className="pr-3 text-right font-mono">₹{t.exitPrice.toLocaleString('en-IN')}</td>
                      <td className={`pr-3 text-right font-bold font-mono ${t.returnPct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {t.returnPct >= 0 ? '+' : ''}{t.returnPct}%
                      </td>
                      <td className="pr-3 text-right font-mono text-slate-400">{t.bars}d</td>
                      <td className="text-left font-mono text-slate-400 text-[11px] truncate max-w-xs">{t.exitReason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* LIVE UPSTREAM DATA AUDIT PANEL */}
            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/90 text-[11px] text-slate-400 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
                <span className="text-cyan-300 font-bold uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-cyan-400" />
                  Live Market Feed Audit &amp; Data Verification
                </span>
                <span className="text-[10px] text-slate-500 font-mono">
                  Upstream Timestamp: {result.audit.latestFeedTimestamp}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-slate-500 text-[10px] block">Resolved Upstream Ticker:</span>
                  <span className="text-slate-200 font-mono font-bold">{result.audit.resolvedTicker}</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block">Evaluation Window:</span>
                  <span className="text-slate-200 font-mono">{result.audit.evaluationBars} Daily Bars</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block">Warm-up Buffer:</span>
                  <span className="text-slate-200 font-mono">{result.audit.warmupBars} Prior Bars</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block">Latest Live Bar (Close):</span>
                  <span className="text-emerald-400 font-mono font-bold">
                    ₹{result.audit.lastBar.close.toLocaleString('en-IN')} ({result.audit.lastBar.date})
                  </span>
                </div>
              </div>

              <p className="text-[10px] text-slate-500 pt-2 border-t border-slate-800">
                {result.disclaimer}
              </p>
            </div>
          </div>
        </>
      )}

      {/* METHODOLOGY & FORMULAS MODAL */}
      {showMethodologyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="max-w-2xl w-full bg-[#0a1120] border border-cyan-500/40 rounded-2xl p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto font-mono text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-cyan-400" />
                <span className="text-sm font-bold text-cyan-300 uppercase">
                  Institutional Quantitative Methodology &amp; Mathematical Formulas
                </span>
              </div>
              <button 
                onClick={() => setShowMethodologyModal(false)}
                className="text-slate-400 hover:text-white text-base font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-slate-300 leading-relaxed text-[11px]">
              <div>
                <strong className="text-cyan-300 block mb-0.5">1. Probabilistic Sharpe Ratio (PSR) — Marcos López de Prado</strong>
                <p className="text-slate-400">
                  Calculates the probability that the estimated Sharpe ratio is greater than zero ($SR^* = 0$), adjusting for sample length ($N$), skewness ($\gamma_3$), and kurtosis ($\gamma_4$):
                </p>
                <code className="block bg-slate-950 p-2 rounded border border-slate-800 text-teal-300 my-1 font-mono text-[10px]">
                  PSR = Φ( (SR - SR*)·√(N - 1) / √(1 - γ3·SR + ((γ4 - 1)/4)·SR²) )
                </code>
              </div>

              <div>
                <strong className="text-cyan-300 block mb-0.5">2. Exact Wilson Score 95% Confidence Interval for Win Rate</strong>
                <p className="text-slate-400">
                  Unlike broken Wald approximations (p ± z·√(p(1-p)/n)) which collapse to 0% at boundaries, the Wilson Score interval provides exact asymmetric binomial bounds that remain mathematically valid even with zero losses or wins:
                </p>
                <code className="block bg-slate-950 p-2 rounded border border-slate-800 text-teal-300 my-1 font-mono text-[10px]">
                  (p + z²/2n ± z·√(p(1-p)/n + z²/4n²)) / (1 + z²/n), where z = 1.96 for 95% CI
                </code>
              </div>

              <div>
                <strong className="text-cyan-300 block mb-0.5">3. Technical Indicator Warm-Up Buffer</strong>
                <p className="text-slate-400">
                  Standard backtests that start indicators on Day 1 lose up to 200 trading days before a 200-SMA or 50-SMA is valid. Our engine pre-fetches preceding market bars to initialize all moving averages, RSI, and ATR from the exact first bar of the evaluation range.
                </p>
              </div>

              <div>
                <strong className="text-cyan-300 block mb-0.5">4. Risk-Free Benchmark &amp; Execution Model</strong>
                <p className="text-slate-400">
                  Annualized Sharpe and Sortino ratios assume a 6.50% annualized risk-free rate based on the RBI 10-Year Government Securities (G-Sec) bond yield. Orders are executed deterministically on the next-bar close with defined-risk ATR stop-loss enforcement.
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setShowMethodologyModal(false)}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold rounded-lg cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RAW CANDLES AUDIT DRAWER / MODAL */}
      {showRawCandlesModal && result?.audit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="max-w-3xl w-full bg-[#0a1120] border border-cyan-500/40 rounded-2xl p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto font-mono text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-cyan-400" />
                <span className="text-sm font-bold text-cyan-300 uppercase">
                  Raw Daily Price Bars Audit Feed — {result.audit.resolvedTicker}
                </span>
              </div>
              <button 
                onClick={() => setShowRawCandlesModal(false)}
                className="text-slate-400 hover:text-white text-base font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="text-slate-400 text-[11px]">
              Inspecting the actual daily price candles returned by upstream exchange feeds (Yahoo Finance). Confirms the exact data points used in the backtest calculations.
            </div>

            <div className="overflow-x-auto max-h-80 overflow-y-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-slate-500 text-left border-b border-slate-800 sticky top-0 bg-[#0a1120]">
                    <th className="py-2 pr-3">Date</th>
                    <th className="pr-3 text-right">Open (₹)</th>
                    <th className="pr-3 text-right">High (₹)</th>
                    <th className="pr-3 text-right">Low (₹)</th>
                    <th className="pr-3 text-right">Close (₹)</th>
                    <th className="text-right">Volume</th>
                  </tr>
                </thead>
                <tbody>
                  {result.audit.recentCandlesAudit.map((c, i) => (
                    <tr key={i} className="border-t border-slate-800/60 text-slate-300 hover:bg-slate-900/40 font-mono">
                      <td className="py-2 pr-3 text-cyan-300 font-bold">{c.date}</td>
                      <td className="pr-3 text-right">₹{c.open.toLocaleString('en-IN')}</td>
                      <td className="pr-3 text-right">₹{c.high.toLocaleString('en-IN')}</td>
                      <td className="pr-3 text-right">₹{c.low.toLocaleString('en-IN')}</td>
                      <td className="pr-3 text-right font-bold text-emerald-400">₹{c.close.toLocaleString('en-IN')}</td>
                      <td className="text-right text-slate-400">{c.volume?.toLocaleString('en-IN') || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
              <span>Showing last {result.audit.recentCandlesAudit.length} audited market bars out of {result.bars} total bars.</span>
              <button
                onClick={() => setShowRawCandlesModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-lg cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
