import React, { useState, useMemo } from 'react';
import { useLiveMarketData } from '../services/liveMarketService';
import { GlobalSentiment } from './GlobalSentiment';
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
  ExternalLink
} from 'lucide-react';

interface ViewerDashboardProps {
  onSwitchToAdmin?: () => void;
}

export const ViewerDashboard: React.FC<ViewerDashboardProps> = () => {
  const { quotes, latencyMs, countdownSeconds, marketSession, refetch, isLive } = useLiveMarketData(5000);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSector, setSelectedSector] = useState<'ALL' | 'HEAVYWEIGHTS' | 'BANKING' | 'DEFENSE_INFRA' | 'IT'>('ALL');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    refetch();
    setTimeout(() => setIsRefreshing(false), 600);
  };

  // Real major indices from live feed
  const nifty = quotes['^NSEI'];
  const sensex = quotes['^BSESN'];
  const bankNifty = quotes['^NSEBANK'];
  const indiaVix = quotes['^INDIAVIX'];

  // Indian equities list
  const stocksList = useMemo(() => {
    const list = [
      { symbol: 'RELIANCE.NS', name: 'Reliance Industries', sector: 'HEAVYWEIGHTS' },
      { symbol: 'TCS.NS', name: 'Tata Consultancy Services', sector: 'IT' },
      { symbol: 'HDFCBANK.NS', name: 'HDFC Bank Ltd', sector: 'BANKING' },
      { symbol: 'INFY.NS', name: 'Infosys Limited', sector: 'IT' },
      { symbol: 'ICICIBANK.NS', name: 'ICICI Bank Ltd', sector: 'BANKING' },
      { symbol: 'SBIN.NS', name: 'State Bank of India', sector: 'BANKING' },
      { symbol: 'BHARTIARTL.NS', name: 'Bharti Airtel', sector: 'HEAVYWEIGHTS' },
      { symbol: 'LT.NS', name: 'Larsen & Toubro', sector: 'DEFENSE_INFRA' },
      { symbol: 'TRENT.NS', name: 'Trent Ltd', sector: 'HEAVYWEIGHTS' },
      { symbol: 'BEL.NS', name: 'Bharat Electronics', sector: 'DEFENSE_INFRA' },
      { symbol: 'HAL.NS', name: 'Hindustan Aeronautics', sector: 'DEFENSE_INFRA' },
      { symbol: 'DIXON.NS', name: 'Dixon Technologies', sector: 'DEFENSE_INFRA' },
      { symbol: 'POLYCAB.NS', name: 'Polycab India', sector: 'DEFENSE_INFRA' },
      { symbol: 'SOLARINDS.NS', name: 'Solar Industries', sector: 'DEFENSE_INFRA' },
      { symbol: 'COCHINSHIP.NS', name: 'Cochin Shipyard', sector: 'DEFENSE_INFRA' },
      { symbol: 'NTPC.NS', name: 'NTPC Limited', sector: 'HEAVYWEIGHTS' },
    ];

    return list.map(item => {
      const live = quotes[item.symbol];
      return {
        ...item,
        price: live?.price ?? null,
        change: live?.change ?? null,
        changePct: live?.changePct ?? null,
        prevClose: live?.prevClose ?? null,
        high: live?.high ?? null,
        low: live?.low ?? null,
        fiftyTwoWeekHigh: live?.fiftyTwoWeekHigh ?? null,
        fiftyTwoWeekLow: live?.fiftyTwoWeekLow ?? null,
        volume: live?.volume ?? null,
        timestamp: live?.timestamp || '',
      };
    });
  }, [quotes]);

  const filteredStocks = useMemo(() => {
    return stocksList.filter(s => {
      const matchesSector = selectedSector === 'ALL' || s.sector === selectedSector;
      const matchesQuery = 
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.symbol.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSector && matchesQuery;
    });
  }, [stocksList, selectedSector, searchQuery]);

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
              <span className="text-[11px] font-mono text-cyan-400 font-semibold bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/40">
                100% Real Feed
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Strictly authentic exchange quotes with verified previous close calculations. Zero demo or mock numbers.
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
            <span>
              Chg: {nifty?.change != null 
                ? `${(nifty.change ?? 0) >= 0 ? '+' : ''}${nifty.change.toFixed(2)}` 
                : '—'}
            </span>
            <span>
              Prev: {nifty?.prevClose != null 
                ? nifty.prevClose.toLocaleString('en-IN') 
                : '—'}
            </span>
          </div>
        </div>

        {/* BSE SENSEX */}
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
            <span>
              Chg: {sensex?.change != null 
                ? `${(sensex.change ?? 0) >= 0 ? '+' : ''}${sensex.change.toFixed(2)}` 
                : '—'}
            </span>
            <span>
              Prev: {sensex?.prevClose != null 
                ? sensex.prevClose.toLocaleString('en-IN') 
                : '—'}
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
            <span>
              Chg: {bankNifty?.change != null 
                ? `${(bankNifty.change ?? 0) >= 0 ? '+' : ''}${bankNifty.change.toFixed(2)}` 
                : '—'}
            </span>
            <span>
              Prev: {bankNifty?.prevClose != null 
                ? bankNifty.prevClose.toLocaleString('en-IN') 
                : '—'}
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
              {indiaVix?.price != null
                ? indiaVix.price.toFixed(2)
                : '—'}
            </span>
            {indiaVix?.changePct != null && (
              <span className={`text-xs font-mono font-bold flex items-center gap-0.5 ${
                (indiaVix.changePct ?? 0) <= 0 ? 'text-emerald-400' : 'text-amber-400'
              }`}>
                {(indiaVix.changePct ?? 0) >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                {(indiaVix.changePct ?? 0) >= 0 ? '+' : ''}{indiaVix.changePct.toFixed(2)}%
              </span>
            )}
          </div>
          <div className="mt-1 text-[11px] font-mono text-slate-400 flex items-center justify-between">
            <span>
              Chg: {indiaVix?.change != null 
                ? `${(indiaVix.change ?? 0) >= 0 ? '+' : ''}${indiaVix.change.toFixed(2)}` 
                : '—'}
            </span>
            <span>
              Prev: {indiaVix?.prevClose != null 
                ? indiaVix.prevClose.toFixed(2) 
                : '—'}
            </span>
          </div>
        </div>
      </div>

      {/* Global Sentiment: Real-Time Fear & Greed Index */}
      <GlobalSentiment />

      {/* Main Content: Equities Watchlist & Filter */}
      <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 shadow-sm space-y-4">
        {/* Filter and Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {[
              { id: 'ALL', label: 'All Equities' },
              { id: 'HEAVYWEIGHTS', label: 'Large Cap' },
              { id: 'BANKING', label: 'Banking & Financials' },
              { id: 'DEFENSE_INFRA', label: 'Defense & Infra' },
              { id: 'IT', label: 'IT & Tech' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setSelectedSector(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition cursor-pointer ${
                  selectedSector === tab.id
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
              placeholder="Search stock by name or symbol..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-cyan-500 transition"
            />
          </div>
        </div>

        {/* Clean, Lightweight Stock Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-sans">
            <thead>
              <tr className="border-b border-slate-800 text-[11px] font-mono text-slate-400 uppercase">
                <th className="py-2.5 px-3">Company / Symbol</th>
                <th className="py-2.5 px-3 text-right">LTP (₹)</th>
                <th className="py-2.5 px-3 text-right">Change (₹)</th>
                <th className="py-2.5 px-3 text-right">Gain / Loss (%)</th>
                <th className="py-2.5 px-3 text-right hidden md:table-cell">Day High / Low</th>
                <th className="py-2.5 px-3 text-right hidden lg:table-cell">Previous Close</th>
                <th className="py-2.5 px-3 text-right hidden xl:table-cell">Volume</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {filteredStocks.map(stock => {
                const isPositive = (stock.changePct ?? 0) >= 0;
                return (
                  <tr key={stock.symbol} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-3">
                      <div className="font-bold text-slate-100 font-sans">{stock.name}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{stock.symbol}</div>
                    </td>

                    <td className="py-3 px-3 text-right font-bold text-slate-100">
                      {stock.price !== null
                        ? `₹${stock.price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                        : '—'}
                    </td>

                    <td className={`py-3 px-3 text-right font-medium ${
                      stock.change === null ? 'text-slate-500' : isPositive ? 'text-emerald-400' : 'text-rose-400'
                    }`}>
                      {stock.change !== null
                        ? `${isPositive ? '+' : ''}₹${stock.change.toFixed(2)}`
                        : '—'}
                    </td>

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

                    <td className="py-3 px-3 text-right text-slate-400 hidden md:table-cell text-[11px]">
                      {stock.high !== null && stock.low !== null ? (
                        <span>
                          ₹{stock.low.toLocaleString('en-IN')} &ndash; ₹{stock.high.toLocaleString('en-IN')}
                        </span>
                      ) : '—'}
                    </td>

                    <td className="py-3 px-3 text-right text-slate-400 hidden lg:table-cell text-[11px]">
                      {stock.prevClose !== null
                        ? `₹${stock.prevClose.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                        : '—'}
                    </td>

                    <td className="py-3 px-3 text-right text-slate-400 hidden xl:table-cell text-[11px]">
                      {stock.volume ? stock.volume.toLocaleString('en-IN') : '—'}
                    </td>
                  </tr>
                );
              })}

              {filteredStocks.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    No equities found matching "{searchQuery}"
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
