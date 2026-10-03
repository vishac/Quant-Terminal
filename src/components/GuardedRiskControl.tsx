import React, { useEffect, useState, useCallback } from 'react';
import { ShieldAlert, Power, Save, RefreshCw, CheckCircle2, XCircle, AlertTriangle, Calculator } from 'lucide-react';

interface RiskConfig {
  capitalInr: number; maxDailyLossInr: number; maxOpenPositions: number;
  maxOrderNotionalInr: number; maxPositionNotionalInr: number; maxLotsPerOrder: number;
  equityIntradayMarginPct: number; fnoSpanExposurePct: number;
}
interface RiskState {
  killSwitchActive: boolean; killSwitchReason: string | null; dayRealizedPnlInr: number;
  openPositions: Array<{ id: string; symbol: string; side: string; productType: string; qty: number; price: number; notionalInr: number; marginUsedInr: number }>;
  marginUsedInr: number; marginAvailableInr: number;
}

const token = () => { try { return localStorage.getItem('jarvis_owner_token') || ''; } catch { return ''; } };
const api = (path: string, opts: RequestInit = {}) =>
  fetch(path, { ...opts, headers: { 'Content-Type': 'application/json', 'x-owner-token': token(), ...(opts.headers || {}) } });

const fmt = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN');

const CONFIG_FIELDS: { key: keyof RiskConfig; label: string; suffix?: string }[] = [
  { key: 'capitalInr', label: 'Trading Capital', suffix: '₹' },
  { key: 'maxDailyLossInr', label: 'Max Daily Loss', suffix: '₹' },
  { key: 'maxOpenPositions', label: 'Max Open Positions' },
  { key: 'maxOrderNotionalInr', label: 'Max Order Notional', suffix: '₹' },
  { key: 'maxPositionNotionalInr', label: 'Max Position Notional', suffix: '₹' },
  { key: 'maxLotsPerOrder', label: 'Max Lots / Order' },
  { key: 'equityIntradayMarginPct', label: 'Equity Intraday Margin', suffix: '%' },
  { key: 'fnoSpanExposurePct', label: 'F&O SPAN+Exposure', suffix: '%' },
];

export const GuardedRiskControl: React.FC = () => {
  const [config, setConfig] = useState<RiskConfig | null>(null);
  const [state, setState] = useState<RiskState | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pnlInput, setPnlInput] = useState('0');

  const [order, setOrder] = useState({ symbol: 'NIFTY', side: 'BUY', productType: 'FNO_OPT_BUY', lots: 1, qty: 75, price: 120, underlyingNotionalInr: 0 });
  const [evalResult, setEvalResult] = useState<any>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await api('/api/risk/state');
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.error || 'Risk engine request failed.');
        setConfig(null);
        setState(null);
        return;
      }
      const j = await res.json();
      setError(null);
      setState(j.state);
      setConfig(j.config);
      setPnlInput(String(j.state.dayRealizedPnlInr));
    } catch (err) {
      setError('Could not reach the risk engine. Please verify the owner token or server status.');
      setConfig(null);
      setState(null);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(null), 3500); };

  const saveConfig = async () => {
    if (!config) return;
    setSaving(true);
    const res = await api('/api/risk/config', { method: 'POST', body: JSON.stringify(config) });
    setSaving(false);
    if (res.ok) { flash('Risk limits saved.'); refresh(); } else { flash('Failed to save limits.'); }
  };

  const toggleKill = async () => {
    const res = await api('/api/risk/kill-switch', { method: 'POST', body: JSON.stringify({ active: !state?.killSwitchActive, reason: 'Manually armed by operator' }) });
    if (res.ok) { const j = await res.json(); setState(j.state); flash(j.state.killSwitchActive ? 'KILL-SWITCH ARMED — routing blocked' : 'Kill-switch disarmed'); }
  };

  const applyPnl = async () => {
    const res = await api('/api/risk/day-pnl', { method: 'POST', body: JSON.stringify({ pnl: Number(pnlInput) || 0 }) });
    if (res.ok) { const j = await res.json(); setState(j.state); if (j.state.killSwitchActive) flash('Daily loss breached — kill-switch auto-tripped.'); }
  };

  const evaluate = async (place: boolean) => {
    const path = place ? '/api/broker/sandbox/order' : '/api/risk/evaluate';
    const res = await api(path, { method: 'POST', body: JSON.stringify(order) });
    const j = await res.json();
    setEvalResult(j);
    if (place) refresh();
  };

  const resetSandbox = async () => { await api('/api/broker/sandbox/reset', { method: 'POST' }); setEvalResult(null); refresh(); flash('Sandbox reset.'); };

  if (!config || !state) return (
    <div className="p-8 text-slate-400 font-mono text-sm" data-testid="risk-loading">
      <div className="rounded-2xl border border-slate-800 bg-[#0a1120] p-5 max-w-xl">
        <div className="text-cyan-400 font-bold uppercase tracking-wide mb-2">Risk engine</div>
        {error ? (
          <div className="space-y-3">
            <p className="text-rose-300">{error}</p>
            <button onClick={() => refresh()} className="px-3 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold">
              Retry
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-slate-300">
            <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
            <span>Loading risk engine…</span>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-5 font-mono" data-testid="guarded-risk-control">
      {/* SANDBOX banner */}
      <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/40 text-amber-200 text-xs flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
        <span><strong>SIMULATION / SANDBOX — no real capital.</strong> This guard must pass before any Phase-3 go-live. Margins are approximate SEBI-style, not broker-exact.</span>
      </div>

      {toast && <div className="p-2.5 rounded-lg bg-cyan-950/50 border border-cyan-500/30 text-cyan-200 text-xs" data-testid="risk-toast">{toast}</div>}

      {/* Kill switch + live state */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className={`rounded-2xl p-5 border flex flex-col gap-3 ${state.killSwitchActive ? 'bg-rose-950/40 border-rose-500/50' : 'bg-[#0a1120] border-slate-800'}`}>
          <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-slate-300"><ShieldAlert className="w-4 h-4" /> Kill-Switch</div>
          <button onClick={toggleKill} data-testid="kill-switch-toggle"
            className={`w-full py-3 rounded-xl font-bold uppercase text-xs flex items-center justify-center gap-2 transition cursor-pointer ${state.killSwitchActive ? 'bg-rose-500 text-white hover:bg-rose-400' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'}`}>
            <Power className="w-4 h-4" /> {state.killSwitchActive ? 'ARMED — click to disarm' : 'DISARMED — click to arm'}
          </button>
          {state.killSwitchReason && <span className="text-[10px] text-rose-300">{state.killSwitchReason}</span>}
        </div>

        <div className="rounded-2xl p-5 border bg-[#0a1120] border-slate-800 flex flex-col gap-2">
          <span className="text-xs uppercase tracking-wide text-slate-400">Day Realized P&amp;L (simulate)</span>
          <div className="flex gap-2">
            <input type="number" value={pnlInput} onChange={(e) => setPnlInput(e.target.value)} data-testid="day-pnl-input"
              className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 outline-none focus:border-cyan-500" />
            <button onClick={applyPnl} data-testid="day-pnl-apply" className="px-3 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold cursor-pointer">Apply</button>
          </div>
          <span className={`text-lg font-bold ${state.dayRealizedPnlInr < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>{fmt(state.dayRealizedPnlInr)}</span>
          <span className="text-[10px] text-slate-500">Auto-trips kill-switch at −{fmt(config.maxDailyLossInr)}</span>
        </div>

        <div className="rounded-2xl p-5 border bg-[#0a1120] border-slate-800 flex flex-col gap-1.5 text-xs">
          <span className="text-xs uppercase tracking-wide text-slate-400 mb-1">Margin</span>
          <div className="flex justify-between"><span className="text-slate-400">Capital</span><span className="text-slate-200">{fmt(config.capitalInr)}</span></div>
          <div className="flex justify-between"><span className="text-slate-400">Used</span><span className="text-amber-300">{fmt(state.marginUsedInr)}</span></div>
          <div className="flex justify-between"><span className="text-slate-400">Available</span><span className="text-emerald-300">{fmt(state.marginAvailableInr)}</span></div>
          <div className="flex justify-between"><span className="text-slate-400">Open Positions</span><span className="text-slate-200">{state.openPositions.length} / {config.maxOpenPositions}</span></div>
        </div>
      </div>

      {/* Config editor */}
      <div className="rounded-2xl p-5 border bg-[#0a1120] border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs uppercase tracking-wide text-slate-300 font-bold">Risk Limits</span>
          <button onClick={saveConfig} disabled={saving} data-testid="save-risk-config"
            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-60">
            <Save className="w-3.5 h-3.5" /> {saving ? 'Saving…' : 'Save Limits'}
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {CONFIG_FIELDS.map((f) => (
            <label key={f.key} className="flex flex-col gap-1">
              <span className="text-[10px] uppercase text-slate-500">{f.label}{f.suffix ? ` (${f.suffix})` : ''}</span>
              <input type="number" value={config[f.key]} data-testid={`risk-config-${f.key}`}
                onChange={(e) => setConfig({ ...config, [f.key]: Number(e.target.value) })}
                className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-slate-200 outline-none focus:border-cyan-500" />
            </label>
          ))}
        </div>
      </div>

      {/* Pre-trade check */}
      <div className="rounded-2xl p-5 border bg-[#0a1120] border-slate-800">
        <span className="text-xs uppercase tracking-wide text-slate-300 font-bold flex items-center gap-2 mb-4"><Calculator className="w-4 h-4" /> Pre-Trade Guard Check (Sandbox)</span>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          <label className="flex flex-col gap-1"><span className="text-[10px] uppercase text-slate-500">Symbol</span>
            <input value={order.symbol} data-testid="order-symbol" onChange={(e) => setOrder({ ...order, symbol: e.target.value })} className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-slate-200 outline-none focus:border-cyan-500" /></label>
          <label className="flex flex-col gap-1"><span className="text-[10px] uppercase text-slate-500">Side</span>
            <select value={order.side} data-testid="order-side" onChange={(e) => setOrder({ ...order, side: e.target.value })} className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-slate-200 outline-none focus:border-cyan-500"><option>BUY</option><option>SELL</option></select></label>
          <label className="flex flex-col gap-1 col-span-2"><span className="text-[10px] uppercase text-slate-500">Product</span>
            <select value={order.productType} data-testid="order-product" onChange={(e) => setOrder({ ...order, productType: e.target.value })} className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-slate-200 outline-none focus:border-cyan-500">
              <option value="EQ_DELIVERY">Equity Delivery</option><option value="EQ_INTRADAY">Equity Intraday</option><option value="FNO_OPT_BUY">Option Buy</option><option value="FNO_OPT_SELL">Option Sell</option><option value="FNO_FUT">Futures</option></select></label>
          <label className="flex flex-col gap-1"><span className="text-[10px] uppercase text-slate-500">Lots</span>
            <input type="number" value={order.lots} data-testid="order-lots" onChange={(e) => setOrder({ ...order, lots: Number(e.target.value) })} className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-slate-200 outline-none focus:border-cyan-500" /></label>
          <label className="flex flex-col gap-1"><span className="text-[10px] uppercase text-slate-500">Qty</span>
            <input type="number" value={order.qty} data-testid="order-qty" onChange={(e) => setOrder({ ...order, qty: Number(e.target.value) })} className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-slate-200 outline-none focus:border-cyan-500" /></label>
          <label className="flex flex-col gap-1"><span className="text-[10px] uppercase text-slate-500">Price/Prem</span>
            <input type="number" value={order.price} data-testid="order-price" onChange={(e) => setOrder({ ...order, price: Number(e.target.value) })} className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-slate-200 outline-none focus:border-cyan-500" /></label>
          <label className="flex flex-col gap-1 col-span-2"><span className="text-[10px] uppercase text-slate-500">Underlying Notional (F&amp;O)</span>
            <input type="number" value={order.underlyingNotionalInr} data-testid="order-underlying" onChange={(e) => setOrder({ ...order, underlyingNotionalInr: Number(e.target.value) })} className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-slate-200 outline-none focus:border-cyan-500" /></label>
        </div>
        <div className="flex flex-wrap gap-2 mt-4">
          <button onClick={() => evaluate(false)} data-testid="btn-evaluate" className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold cursor-pointer">Check Only</button>
          <button onClick={() => evaluate(true)} data-testid="btn-place-sandbox" className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold cursor-pointer">Place Sandbox Order</button>
          <button onClick={resetSandbox} data-testid="btn-reset-sandbox" className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer"><RefreshCw className="w-3.5 h-3.5" /> Reset</button>
        </div>

        {evalResult && (
          <div className={`mt-4 p-4 rounded-xl border ${evalResult.allowed ? 'bg-emerald-950/30 border-emerald-500/40' : 'bg-rose-950/30 border-rose-500/40'}`} data-testid="eval-result">
            <div className="flex items-center gap-2 text-sm font-bold mb-2">
              {evalResult.allowed ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <XCircle className="w-4 h-4 text-rose-400" />}
              <span className={evalResult.allowed ? 'text-emerald-300' : 'text-rose-300'}>{evalResult.allowed ? 'ALLOWED' : 'BLOCKED'}{evalResult.status ? ` · ${evalResult.status}` : ''}</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs text-slate-300 mb-2">
              <span>Notional: <span className="text-slate-100">{fmt(evalResult.notionalInr || 0)}</span></span>
              <span>Margin req: <span className="text-amber-300">{fmt(evalResult.marginRequiredInr || 0)}</span></span>
              <span>Margin avail: <span className="text-emerald-300">{fmt(evalResult.marginAvailableInr || 0)}</span></span>
            </div>
            {(evalResult.violations || []).map((v: string, i: number) => <div key={i} className="text-[11px] text-rose-300">• {v}</div>)}
            {(evalResult.warnings || []).map((v: string, i: number) => <div key={i} className="text-[11px] text-amber-300">⚠ {v}</div>)}
            {evalResult.marginNote && <div className="text-[10px] text-slate-500 mt-2">{evalResult.marginNote}</div>}
          </div>
        )}
      </div>

      {/* Open sandbox positions */}
      <div className="rounded-2xl p-5 border bg-[#0a1120] border-slate-800">
        <span className="text-xs uppercase tracking-wide text-slate-300 font-bold">Open Sandbox Positions ({state.openPositions.length})</span>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-xs" data-testid="positions-table">
            <thead><tr className="text-slate-500 text-left"><th className="py-1.5 pr-3">Symbol</th><th className="pr-3">Side</th><th className="pr-3">Product</th><th className="pr-3">Qty</th><th className="pr-3">Price</th><th className="pr-3">Notional</th><th>Margin</th></tr></thead>
            <tbody>
              {state.openPositions.length === 0 && <tr><td colSpan={7} className="py-3 text-slate-600">No open sandbox positions.</td></tr>}
              {state.openPositions.map((p) => (
                <tr key={p.id} className="border-t border-slate-800/60 text-slate-300">
                  <td className="py-1.5 pr-3 text-slate-100">{p.symbol}</td><td className="pr-3">{p.side}</td><td className="pr-3">{p.productType}</td>
                  <td className="pr-3">{p.qty}</td><td className="pr-3">{p.price}</td><td className="pr-3">{fmt(p.notionalInr)}</td><td>{fmt(p.marginUsedInr)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
