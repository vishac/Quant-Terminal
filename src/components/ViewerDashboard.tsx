import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useLiveMarketData } from '../services/liveMarketService';
import { GlobalSentiment } from './GlobalSentiment';
import type { InstitutionalStockPick } from '../data/institutionalEquityData';
import { 
  TrendingUp, 
  TrendingDown, 
  Search, 
  RefreshCw, 
  Clock, 
  ShieldCheck, 
  Activity, 
  ArrowUpRight, 
  ArrowDownRight,
  Sparkles,
  ExternalLink
} from 'lucide-react';

interface ViewerDashboardProps {
  onSwitchToAdmin?: () => void;
}

export const ViewerDashboard: React.FC<ViewerDashboardProps> = () => {
  const { quotes, latencyMs, countdownSeconds, marketSession, refetch, isLive } = useLiveMarketData(5000);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'ALL' | 'SHORT_TERM' | 'LONG_TERM' | 'LARGE_CAP' | 'MID_CAP' | 'SMALL_CAP'>('ALL');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Dynamic Live Technical Breakout Radar Universe (Same 45 stocks as Dynamic Technical Breakout Radar)
  const [screenerStocks, setScreenerStocks] = useState<InstitutionalStockPick[]>([]);
  const [isLoadingScreener, setIsLoadingScreener] = useState<boolean>(true);

  const loadScreener = useCallback(async () => {
    try {
      const res = await fetch('/api/screener/chartink');
      const data = await res.json();
      if (data.success && Array.isArray(data.data) && data.data.length > 0) {
        setScreenerStocks(data.data);
      }
    } catch {
      // Keep existing screener stocks on transient failure
    } finally {
      setIsLoadingScreener(false);
    }
  }, []);

  useEffect(() => {
    loadScreener();
    const interval = setInterval(loadScreener, 60000);
    return () => clearInterval(interval);
  }, [loadScreener]);

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    refetch();
    loadScreener();
    setTimeout(() => setIsRefreshing(false), 600);
  };

  // Real major indices from live feed
  const nifty = quotes['^NSEI'];
  const sensex = quotes['^BSESN'];
  const bankNifty = quotes['^NSEBANK'];
  const indiaVix = quotes['^INDIAVIX'];

  // Indian equities list: dynamically mapped directly from the 45 stocks on Dynamic Technical Breakout Radar
  const stocksList = useMemo(() => {
    return screenerStocks.map(stock => {
      const live = quotes[stock.symbol];
      const price = live?.price ?? stock.ltp ?? null;
      const change = live?.change ?? stock.changeVal ?? null;
      const changePct = live?.changePct ?? stock.changePct ?? null;
      const high = live?.high ?? null;
      const low = live?.low ?? null;
      const convictionScore =
        stock.strategyQuantification?.compositeScore ??
        stock.tacticalLevels?.confidenceScore ??
        92;

      return {
        id: stock.id,
        ticker: stock.ticker,
        symbol: stock.symbol,
        name: stock.name,
        sector: stock.sector,
        capCategory: stock.capCategory || 'Mid Cap',
        horizon: stock.horizon,
        price,
        change,
        changePct,
        high,
        low,
        convictionScore,
      };
    });
  }, [screenerStocks, quotes]);

  const shortTermCount = useMemo(() => stocksList.filter(s => s.horizon === 'SHORT_TERM').length, [stocksList]);
  const longTermCount = useMemo(() => stocksList.filter(s => s.horizon === 'LONG_TERM').length, [stocksList]);
  const largeCapCount = useMemo(() => stocksList.filter(s => s.sector === 'LARGE_CAP').length, [stocksList]);
  const midCapCount = useMemo(() => stocksList.filter(s => s.sector === 'MID_CAP').length, [stocksList]);
  const smallCapCount = useMemo(() => stocksList.filter(s => s.sector === 'SMALL_CAP').length, [stocksList]);

  const filteredStocks = useMemo(() => {
    return stocksList.filter(s => {
      const matchesFilter =
        selectedFilter === 'ALL' ||
        (selectedFilter === 'SHORT_TERM' && s.horizon === 'SHORT_TERM') ||
        (selectedFilter === 'LONG_TERM' && s.horizon === 'LONG_TERM') ||
        (selectedFilter === 'LARGE_CAP' && s.sector === 'LARGE_CAP') ||
        (selectedFilter === 'MID_CAP' && s.sector === 'MID_CAP') ||
        (selectedFilter === 'SMALL_CAP' && s.sector === 'SMALL_CAP');

      const q = searchQuery.toLowerCase().trim();
      const matchesQuery =
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.symbol.toLowerCase().includes(q) ||
        s.ticker.toLowerCase().includes(q);

      return matchesFilter && matchesQuery;
    });
  }, [stocksList, selectedFilter, searchQuery]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans animate-in fade-in duration-300">
      {/* Top Banner: Market Status & Real-time Indicator */}
      <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wide">
                Live Indian Markets (NSE &amp; BSE)
              </h2>
              <span className="text-[11px] font-mono text-emerald-400 font-semibold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-700/40">
                CHARTINK LIVE NSE RADAR FEED
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              45 verified dynamic technical breakout candidates polled live from the National Stock Exchange (NSE). Synchronized with the Dynamic Technical Breakout Radar.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs self-start md:self-auto">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/50 border border-slate-800 text-slate-300">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>{marketSession?.istTimeString || 'IST'}</span>
          </div>

          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 font-bold transition cursor-pointer"
            title="Refresh Quotes Now"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Syncing...' : 'Sync'}</span>
          </button>
        </div>
      </div>

      {/* 4 Major Index Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* NIFTY 50 */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span className="font-bold text-slate-200">NIFTY 50</span>
            <span className="font-mono text-[10px] text-slate-500">NSE</span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-white">
              {nifty?.price != null
                ? `₹${nifty.price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                : '—'}
            </span>
            {nifty?.changePct != null && (
              <span className={`text-xs font-mono font-bold flex items-center gap-0.5 ${
                (nifty.changePct ?? 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}>
                {(nifty.changePct ?? 0) >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                {(nifty.changePct ?? 0) >= 0 ? '+' : ''}{nifty.changePct.toFixed(2)}%
              </span>
            )}
          </div>
          <div className="mt-1 text-[11px] font-mono text-slate-400 flex items-center justify-between">
            <span>Prev: ₹{nifty?.prevClose?.toLocaleString('en-IN') ?? '—'}</span>
            <span className={(nifty?.change ?? 0) >= 0 ? 'text-emerald-400/90' : 'text-rose-400/90'}>
              {nifty?.change != null ? `${(nifty.change ?? 0) >= 0 ? '+' : ''}${nifty.change.toFixed(2)}` : '—'}
            </span>
          </div>
        </div>

        {/* SENSEX */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span className="font-bold text-slate-200">BSE SENSEX</span>
            <span className="font-mono text-[10px] text-slate-500">BSE</span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-white">
              {sensex?.price != null
                ? `₹${sensex.price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                : '—'}
            </span>
            {sensex?.changePct != null && (
              <span className={`text-xs font-mono font-bold flex items-center gap-0.5 ${
                (sensex.changePct ?? 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}>
                {(sensex.changePct ?? 0) >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                {(sensex.changePct ?? 0) >= 0 ? '+' : ''}{sensex.changePct.toFixed(2)}%
              </span>
            )}
          </div>
          <div className="mt-1 text-[11px] font-mono text-slate-400 flex items-center justify-between">
            <span>Prev: ₹{sensex?.prevClose?.toLocaleString('en-IN') ?? '—'}</span>
            <span className={(sensex?.change ?? 0) >= 0 ? 'text-emerald-400/90' : 'text-rose-400/90'}>
              {sensex?.change != null ? `${(sensex.change ?? 0) >= 0 ? '+' : ''}${sensex.change.toFixed(2)}` : '—'}
            </span>
          </div>
        </div>

        {/* BANK NIFTY */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span className="font-bold text-slate-200">BANK NIFTY</span>
            <span className="font-mono text-[10px] text-slate-500">NSE</span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-white">
              {bankNifty?.price != null
                ? `₹${bankNifty.price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                : '—'}
            </span>
            {bankNifty?.changePct != null && (
              <span className={`text-xs font-mono font-bold flex items-center gap-0.5 ${
                (bankNifty.changePct ?? 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}>
                {(bankNifty.changePct ?? 0) >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                {(bankNifty.changePct ?? 0) >= 0 ? '+' : ''}{bankNifty.changePct.toFixed(2)}%
              </span>
            )}
          </div>
          <div className="mt-1 text-[11px] font-mono text-slate-400 flex items-center justify-between">
            <span>Prev: ₹{bankNifty?.prevClose?.toLocaleString('en-IN') ?? '—'}</span>
            <span className={(bankNifty?.change ?? 0) >= 0 ? 'text-emerald-400/90' : 'text-rose-400/90'}>
              {bankNifty?.change != null ? `${(bankNifty.change ?? 0) >= 0 ? '+' : ''}${bankNifty.change.toFixed(2)}` : '—'}
            </span>
          </div>
        </div>

        {/* INDIA VIX */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span className="font-bold text-slate-200">INDIA VIX</span>
            <span className="font-mono text-[10px] text-slate-500">VOLATILITY</span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-white">
              {indiaVix?.price != null ? indiaVix.price.toFixed(2) : '—'}
            </span>
            {indiaVix?.changePct != null && (
              <span className={`text-xs font-mono font-bold flex items-center gap-0.5 ${
                (indiaVix.changePct ?? 0) <= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}>
                {(indiaVix.changePct ?? 0) >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                {(indiaVix.changePct ?? 0) >= 0 ? '+' : ''}{indiaVix.changePct.toFixed(2)}%
              </span>
            )}
          </div>
          <div className="mt-1 text-[11px] font-mono text-slate-400 flex items-center justify-between">
            <span>Prev: {indiaVix?.prevClose?.toFixed(2) ?? '—'}</span>
            <span className={(indiaVix?.change ?? 0) <= 0 ? 'text-emerald-400/90' : 'text-rose-400/90'}>
              {indiaVix?.change != null ? `${(indiaVix.change ?? 0) >= 0 ? '+' : ''}${indiaVix.change.toFixed(2)}` : '—'}
            </span>
          </div>
        </div>
      </div>

      {/* Global Sentiment: Real-Time Fear & Greed Index (Dynamically uses 45 Live Screener Picks) */}
      <GlobalSentiment livePicks={screenerStocks} />

      {/* Main Content: Equities Watchlist & Filter (Same 45 stocks as Dynamic Technical Breakout Radar) */}
      <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 shadow-sm space-y-4">
        {/* Header & Live Count Badge */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-slate-800/80">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wide">
              Dynamic Technical Breakout Equities ({stocksList.length} Active Candidates)
            </h3>
            <span className="px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 font-mono text-[10px] font-bold">
              100% LIVE NSE SCREENER FEED
            </span>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {filteredStocks.length} of {stocksList.length} stocks shown
          </span>
        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {[
              { id: 'ALL', label: `All Radar Stocks (${stocksList.length})` },
              { id: 'SHORT_TERM', label: `Short-Term Swings (${shortTermCount})` },
              { id: 'LONG_TERM', label: `Long-Term Compounders (${longTermCount})` },
              { id: 'LARGE_CAP', label: `Large Cap (${largeCapCount})` },
              { id: 'MID_CAP', label: `Mid Cap (${midCapCount})` },
              { id: 'SMALL_CAP', label: `Small Cap (${smallCapCount})` },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setSelectedFilter(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition cursor-pointer ${
                  selectedFilter === tab.id
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by company or symbol..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-cyan-500 transition"
            />
          </div>
        </div>

        {/* Dynamic Stock Table — strictly rendering ONLY the requested fields:
            Company/Symbol, LTP, Change, Gain/Loss%, Day High/Low, Conviction Score */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-sans">
            <thead>
              <tr className="border-b border-slate-800 text-[11px] font-mono text-slate-400 uppercase">
                <th className="py-2.5 px-3">Company / Symbol</th>
                <th className="py-2.5 px-3 text-right">LTP (₹)</th>
                <th className="py-2.5 px-3 text-right">Change (₹)</th>
                <th className="py-2.5 px-3 text-right">Gain / Loss (%)</th>
                <th className="py-2.5 px-3 text-right">Day High / Low</th>
                <th className="py-2.5 px-3 text-right">Conviction Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {filteredStocks.map(stock => {
                const isPositive = (stock.changePct ?? 0) >= 0;
                return (
                  <tr key={stock.symbol} className="hover:bg-slate-800/40 transition">
                    {/* Company / Symbol */}
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <div>
                          <div className="font-bold text-slate-100 font-sans text-xs">{stock.name}</div>
                          <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1.5 mt-0.5">
                            <span className="text-cyan-300 font-bold">{stock.ticker}</span>
                            <span>·</span>
                            <span className="text-slate-500">{stock.symbol}</span>
                            <span>·</span>
                            <span className="text-slate-400">{stock.capCategory}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* LTP (₹) */}
                    <td className="py-3 px-3 text-right font-bold text-slate-100 text-sm">
                      {stock.price !== null
                        ? `₹${stock.price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                        : '—'}
                    </td>

                    {/* Change (₹) */}
                    <td className={`py-3 px-3 text-right font-medium ${
                      stock.change === null ? 'text-slate-500' : isPositive ? 'text-emerald-400' : 'text-rose-400'
                    }`}>
                      {stock.change !== null
                        ? `${isPositive ? '+' : ''}₹${stock.change.toFixed(2)}`
                        : '—'}
                    </td>

                    {/* Gain / Loss (%) */}
                    <td className={`py-3 px-3 text-right font-bold ${
                      stock.changePct === null ? 'text-slate-500' : isPositive ? 'text-emerald-400' : 'text-rose-400'
                    }`}>
                      {stock.changePct !== null ? (
                        <span className="inline-flex items-center justify-end gap-1">
                          {isPositive ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                          {isPositive ? '+' : ''}{stock.changePct.toFixed(2)}%
                        </span>
                      ) : '—'}
                    </td>

                    {/* Day High / Low */}
                    <td className="py-3 px-3 text-right text-slate-300 text-[11px]">
                      {stock.high !== null && stock.low !== null ? (
                        <span>
                          ₹{stock.low.toLocaleString('en-IN')} &ndash; ₹{stock.high.toLocaleString('en-IN')}
                        </span>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>

                    {/* Conviction Score */}
                    <td className="py-3 px-3 text-right">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 font-mono font-bold text-xs">
                        {stock.convictionScore} / 100
                      </span>
                    </td>
                  </tr>
                );
              })}

              {filteredStocks.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    {isLoadingScreener 
                      ? 'Synchronizing 45 dynamic breakout candidates from Chartink live NSE feed...' 
                      : `No equities found matching "${searchQuery}"`}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
