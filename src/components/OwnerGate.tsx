import React, { useState } from 'react';
import { Lock, ShieldCheck, X, Loader2, Eye, EyeOff } from 'lucide-react';

interface OwnerGateProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (token: string) => void;
}

// Phase-1 single-operator access gate. Verifies the owner token against the
// backend (/api/owner/verify) before unlocking Owner/Admin operations. The token
// is also attached to the AI endpoints so outsiders cannot run up the Gemini bill.
export const OwnerGate: React.FC<OwnerGateProps> = ({ isOpen, onClose, onSuccess }) => {
  const [token, setToken] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);

  if (!isOpen) return null;

  const handleVerify = async () => {
    let t = token.trim();
    if (!t) {
      setError('Enter your owner access token.');
      return;
    }
    // Clean token: strip surrounding quotes and leading "Bearer "
    t = t.replace(/^["']|["']$/g, '').trim();
    if (t.toLowerCase().startsWith('bearer ')) {
      t = t.slice(7).trim();
    }

    setVerifying(true);
    setError(null);
    try {
      const res = await fetch('/api/owner/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-owner-token': t,
          'Authorization': `Bearer ${t}`,
        },
        body: JSON.stringify({ token: t }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.authorized) {
        onSuccess(t);
        setToken('');
      } else if (res.status === 503) {
        setError('Server has no OWNER_ACCESS_TOKEN configured in environment secrets.');
      } else {
        setError('Invalid owner token. Access denied. Please ensure the token matches the server OWNER_ACCESS_TOKEN secret.');
      }
    } catch {
      setError('Could not reach the server to verify the token.');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 font-mono animate-in fade-in duration-200"
      data-testid="owner-gate-overlay"
    >
      <div className="bg-[#080d1a] border border-amber-500/40 rounded-2xl max-w-md w-full p-6 shadow-2xl relative flex flex-col gap-4">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-7 h-7 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white cursor-pointer"
          data-testid="owner-gate-close"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-amber-950/80 border border-amber-500/40 flex items-center justify-center text-amber-400">
            <Lock className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wide">Owner Access Required</h3>
            <span className="text-[10px] text-slate-400">Admin / Operations desk is restricted to the owner.</span>
          </div>
        </div>

        <div className="relative w-full">
          <input
            type={showPassword ? 'text' : 'password'}
            value={token}
            onChange={(e) => setToken(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleVerify(); }}
            placeholder="Owner access token or secret"
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 pr-10 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-amber-500 transition"
            data-testid="owner-gate-token-input"
            autoFocus
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-1"
            title={showPassword ? 'Hide token' : 'Show token'}
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>

        {error && (
          <div className="text-[11px] text-rose-400 bg-rose-950/40 border border-rose-500/30 rounded-lg px-3 py-2 leading-relaxed" data-testid="owner-gate-error">
            {error}
          </div>
        )}

        <button
          onClick={handleVerify}
          disabled={verifying}
          className="w-full py-2.5 px-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold uppercase text-xs flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-60"
          data-testid="owner-gate-submit"
        >
          {verifying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
          <span>{verifying ? 'Verifying…' : 'Unlock Owner Desk'}</span>
        </button>

        <p className="text-[10px] text-slate-500 leading-relaxed">
          Phase-1 single-operator gate. The token is validated server-side and kept only in this browser.
          Order execution remains disabled until a broker is connected (Phase 2+).
        </p>
      </div>
    </div>
  );
};
