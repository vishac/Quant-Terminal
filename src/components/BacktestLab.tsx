import React, { useEffect, useState } from 'react';
import { Play, TrendingUp, AlertTriangle, Loader2 } from 'lucide-react';
import { AVAILABLE_STRATEGIES, type StrategyMeta } from '../server/backtester';

const token = () => { try { return localStorage.getItem('jarvis_owner_token') || ''; } catch { return ''; } };
const api = (path: string, opts: RequestInit = {}) =>
  fetch(path, { ...opts, headers: { 'Content-Type': 'application/json', 'x-owner-token': token(), ...(opts.headers || {}) } });

const SYMBOLS = [
  { v: '^NSEI', l: 'NIFTY 50' }, { v: '^NSEBANK', l: 'BANK NIFTY' }, { v: '^BSESN', l: 'SENSEX' },
  { v: 'RELIANCE.NS', l: 'Reliance' }, { v: 'TCS.NS', l: 'TCS' }, { v: 'HDFCBANK.NS', l: 'HDFC Bank' }, { v: 'INFY.NS', l: 'Infosys' },
];

export const BacktestLab: React.FC = () => {
  const [strategies, setStrategies] = useState<StrategyMeta[]>(AVAILABLE_STRATEGIES);
  const [symbol, setSymbol] = useState('^NSEI');
  const [strategy, setStrategy] = useState(AVAILABLE_STRATEGIES[0]?.id ?? 'bhishma');
  const [range, setRange] = useState('1y');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    api('/api/backtest/strategies')
      .then(r => r.ok ? r.json() : null)
      .then(j => {
        if (Array.isArray(j?.strategies) && j.strategies.length > 0) {
          setStrategies(j.strategies);
          setStrategy((current) => j.strategies.some((s: StrategyMeta) => s.id === current) ? current : j.strategies[0].id);
        }
      })
      .catch(() => {
        setStrategies(AVAILABLE_STRATEGIES);
        setStrategy((current) => AVAILABLE_STRATEGIES.some((s) => s.id === current) ? current : AVAILABLE_STRATEGIES[0]?.id ?? 'bhishma');
      });
  }, []);

  const run = async () => {
    setLoading(true); setError(null); setResult(null);
    try {
      const res = await api('/api/backtest/run', { method: 'POST', body: JSON.stringify({ symbol, strategy, range }) });
      const j = await res.json();
      if (j.success) setResult(j.result); else setError(j.error || 'Backtest failed.');
    } catch { setError('Could not reach the backtester.'); }
    finally { setLoading(false); }
  };

  const meta = strategies.find(s => s.id === strategy);

  // Build equity-curve SVG
  const renderCurve = () => {
    if (!result?.equityCurve?.length) return null;
    const pts: { strategy: number; buyHold: number }[] = result.equityCurve;
    const W = 900, H = 240, pad = 8;
    const all = pts.flatMap(p => [p.strategy, p.buyHold]);
    const min = Math.min(...all), max = Math.max(...all);
    const sx = (i: number) => pad + (i / (pts.length - 1)) * (W - 2 * pad);
    const sy = (v: number) => H - pad - ((v - min) / (max - min || 1)) * (H - 2 * pad);
    const line = (key: 'strategy' | 'buyHold') => pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${sx(i).toFixed(1)},${sy(p[key]).toFixed(1)}`).join(' ');
    return (
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" data-testid="equity-curve">
        <path d={line('buyHold')} fill="none" stroke="#64748b" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.7" />
        <path d={line('strategy')} fill="none" stroke="#22d3ee" strokeWidth="2" />
      </svg>
    );
  };

  const metric = (label: string, val: string, cls = 'text-slate-100') => (
    <div className="rounded-xl bg-[#0a1120] border border-slate-800 p-3 flex flex-col">
      <span className="text-[10px] uppercase text-slate-500">{label}</span>
      <span className={`text-lg font-bold ${cls}`}>{val}</span>
    </div>
  );

  return (
    <div className="space-y-5 font-mono" data-testid="backtest-lab">
      <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/40 text-amber-200 text-xs flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
        <span><strong>Underlying daily-candle proxy backtest</strong> on real free historical data — long/flat, no costs/slippage/taxes, not option-level P&amp;L. Validate an edge here before any live use.</span>
      </div>

      <div className="rounded-2xl p-5 border bg-[#0a1120] border-slate-800">
        <span className="text-xs uppercase tracking-wide text-slate-300 font-bold flex items-center gap-2 mb-4"><TrendingUp className="w-4 h-4" /> Backtest Configuration</span>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <label className="flex flex-col gap-1"><span className="text-[10px] uppercase text-slate-500">Symbol</span>
            <select value={symbol} data-testid="bt-symbol" onChange={(e) => setSymbol(e.target.value)} className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-slate-200 outline-none focus:border-cyan-500">
              {SYMBOLS.map(s => <option key={s.v} value={s.v}>{s.l}</option>)}</select></label>
          <label className="flex flex-col gap-1"><span className="text-[10px] uppercase text-slate-500">Agent Strategy</span>
            <select value={strategy} data-testid="bt-strategy" disabled={strategies.length === 0} onChange={(e) => setStrategy(e.target.value)} className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-slate-200 outline-none focus:border-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed">
              {strategies.length === 0 ? <option value="">No strategies available</option> : strategies.map(s => <option key={s.id} value={s.id}>{s.agent} — {s.name}</option>)}
            </select></label>
          <label className="flex flex-col gap-1"><span className="text-[10px] uppercase text-slate-500">Range</span>
            <select value={range} data-testid="bt-range" onChange={(e) => setRange(e.target.value)} className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-slate-200 outline-none focus:border-cyan-500">
              <option value="6mo">6 Months</option><option value="1y">1 Year</option><option value="2y">2 Years</option><option value="5y">5 Years</option></select></label>
          <div className="flex items-end">
            <button onClick={run} disabled={loading || !strategy || strategies.length === 0} data-testid="bt-run" className="w-full py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60">
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />} {loading ? 'Running…' : 'Run Backtest'}</button>
          </div>
        </div>
        {meta && <p className="text-[11px] text-slate-500 mt-3"><span className="text-cyan-400 font-bold">{meta.agent}:</span> {meta.rule}</p>}
      </div>

      {error && <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs" data-testid="bt-error">{error}</div>}

      {result && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {metric('Strategy Return', `${result.metrics.totalReturnPct}%`, result.metrics.totalReturnPct >= 0 ? 'text-emerald-400' : 'text-rose-400')}
            {metric('Buy & Hold', `${result.metrics.buyHoldReturnPct}%`, 'text-slate-400')}
            {metric('Max Drawdown', `${result.metrics.maxDrawdownPct}%`, 'text-rose-400')}
            {metric('Win Rate', `${result.metrics.winRatePct}%`)}
            {metric('Sharpe', `${result.metrics.sharpe}`)}
            {metric('Trades', `${result.metrics.numTrades}`)}
            {metric('Avg Trade', `${result.metrics.avgTradePct}%`, result.metrics.avgTradePct >= 0 ? 'text-emerald-400' : 'text-rose-400')}
          </div>

          <div className="rounded-2xl p-5 border bg-[#0a1120] border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs uppercase tracking-wide text-slate-300 font-bold">Equity Curve (start = 100)</span>
              <span className="text-[10px] text-slate-500">{result.from} → {result.to} · {result.bars} bars · <span className="text-cyan-400">strategy</span> vs <span className="text-slate-400">buy&amp;hold</span></span>
            </div>
            {renderCurve()}
          </div>

          <div className="rounded-2xl p-5 border bg-[#0a1120] border-slate-800">
            <span className="text-xs uppercase tracking-wide text-slate-300 font-bold">Trades (last {result.trades.length})</span>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-xs" data-testid="trades-table">
                <thead><tr className="text-slate-500 text-left"><th className="py-1.5 pr-3">Entry</th><th className="pr-3">Exit</th><th className="pr-3">Entry ₹</th><th className="pr-3">Exit ₹</th><th className="pr-3">Return</th><th>Bars</th></tr></thead>
                <tbody>
                  {result.trades.map((t: any, i: number) => (
                    <tr key={i} className="border-t border-slate-800/60 text-slate-300">
                      <td className="py-1.5 pr-3">{t.entryDate}</td><td className="pr-3">{t.exitDate}</td><td className="pr-3">{t.entryPrice}</td><td className="pr-3">{t.exitPrice}</td>
                      <td className={`pr-3 font-bold ${t.returnPct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{t.returnPct}%</td><td>{t.bars}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[10px] text-slate-500 mt-3">{result.disclaimer}</p>
          </div>
        </>
      )}
    </div>
  );
};
