import React, { useState } from 'react';
import { 
  X, 
  UserCheck, 
  LogIn, 
  UserPlus, 
  LogOut, 
  KeyRound, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2, 
  Loader2 
} from 'lucide-react';
import { useDeskAuth } from '../context/DeskAuthContext';

export const FirebaseAuthModal: React.FC = () => {
  const {
    currentSeat,
    seats,
    firebaseUser,
    isAuthModalOpen,
    setIsAuthModalOpen,
    switchSeat,
    signInWithCredentials,
    signUpWithCredentials,
    logoutUser
  } = useDeskAuth();

  const [tab, setTab] = useState<'quick_switch' | 'email_auth'>('quick_switch');
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [assignSeatNum, setAssignSeatNum] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isAuthModalOpen) return null;

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      if (isRegistering) {
        if (!displayName.trim()) {
          setErrorMsg('Please enter your full name or trader handle.');
          setLoading(false);
          return;
        }
        await signUpWithCredentials(email, password, displayName, assignSeatNum);
        setSuccessMsg(`Account created and bound to Seat-${assignSeatNum}!`);
      } else {
        await signInWithCredentials(email, password);
        setSuccessMsg('Signed in successfully via Firebase Auth!');
      }
      setTimeout(() => {
        setIsAuthModalOpen(false);
      }, 1200);
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logoutUser();
    setSuccessMsg('Logged out.');
    setTimeout(() => setSuccessMsg(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 font-mono animate-in fade-in duration-200">
      <div className="bg-[#080d1a] border border-cyan-500/40 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative flex flex-col gap-4">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center text-cyan-300">
              <UserCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Multi-User Desk Authentication
              </h3>
              <p className="text-[10px] text-slate-400">
                20-Seat Institutional Quant Floor Access
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsAuthModalOpen(false)}
            className="w-7 h-7 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex rounded-lg overflow-hidden border border-slate-800 bg-slate-950 text-xs">
          <button
            onClick={() => { setTab('quick_switch'); setErrorMsg(null); }}
            className={`flex-1 py-2 font-bold transition cursor-pointer ${
              tab === 'quick_switch' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Instant 20-Seat Floor Switch
          </button>
          <button
            onClick={() => { setTab('email_auth'); setErrorMsg(null); }}
            className={`flex-1 py-2 font-bold transition cursor-pointer ${
              tab === 'email_auth' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Firebase Auth Login
          </button>
        </div>

        {/* Active Session Status */}
        <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between text-xs">
          <div>
            <span className="text-[10px] text-slate-500 block uppercase">Current Operator</span>
            <span className="font-bold text-cyan-300">
              Seat #{String(currentSeat.seatNumber).padStart(2, '0')}: {currentSeat.name} ({currentSeat.role.toUpperCase()})
            </span>
            {firebaseUser && (
              <span className="text-[10px] text-emerald-400 block mt-0.5">
                Firebase Auth UID: {firebaseUser.email}
              </span>
            )}
          </div>
          {firebaseUser && (
            <button
              onClick={handleLogout}
              className="px-2 py-1 rounded bg-slate-900 border border-slate-800 text-slate-300 hover:text-rose-400 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
            >
              <LogOut className="w-3 h-3" />
              <span>Sign Out</span>
            </button>
          )}
        </div>

        {/* Tab 1: Instant Seat Switch (20 pre-configured institutional seats) */}
        {tab === 'quick_switch' && (
          <div className="space-y-3">
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Instantly toggle between any of the 20 seats on the quant floor to review individual trader views, permissions, and portfolios:
            </p>
            <div className="grid grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
              {seats.map((s) => {
                const isSelected = s.seatNumber === currentSeat.seatNumber;
                return (
                  <button
                    key={s.seatNumber}
                    onClick={() => {
                      switchSeat(s.seatNumber);
                      setIsAuthModalOpen(false);
                    }}
                    className={`p-2 rounded-xl text-left border transition flex items-center gap-2 cursor-pointer ${
                      isSelected
                        ? 'bg-cyan-950/80 border-cyan-400 text-white shadow-sm'
                        : 'bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-300'
                    }`}
                  >
                    <span className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-black shrink-0 ${
                      isSelected ? 'bg-cyan-500 text-slate-950' : 'bg-slate-900 text-cyan-400 border border-slate-800'
                    }`}>
                      {String(s.seatNumber).padStart(2, '0')}
                    </span>
                    <div className="truncate">
                      <div className="font-bold text-xs truncate">{s.name}</div>
                      <div className="text-[9px] text-slate-500 truncate uppercase">{s.role}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 2: Firebase Auth email/password */}
        {tab === 'email_auth' && (
          <form onSubmit={handleEmailSubmit} className="space-y-3">
            <p className="text-[11px] text-slate-400">
              Sign in with your verified institutional Firebase account, or register a new seat:
            </p>

            {isRegistering && (
              <div>
                <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Full Name / Quant Handle</label>
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Vishal Chandran"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 outline-none focus:border-cyan-500"
                />
              </div>
            )}

            <div>
              <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="trader@quantdesk.internal"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 outline-none focus:border-cyan-500"
              />
            </div>

            {isRegistering && (
              <div>
                <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Bind to Floor Seat Number</label>
                <select
                  value={assignSeatNum}
                  onChange={(e) => setAssignSeatNum(parseInt(e.target.value, 10))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 outline-none focus:border-cyan-500"
                >
                  {seats.map((s) => (
                    <option key={s.seatNumber} value={s.seatNumber}>
                      Seat {String(s.seatNumber).padStart(2, '0')}: {s.desk} ({s.role.toUpperCase()})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {errorMsg && (
              <div className="p-2.5 rounded-lg bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-2.5 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-2 shadow-md"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Authenticating…</span>
                </>
              ) : isRegistering ? (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>Register Quant Seat</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Sign In</span>
                </>
              )}
            </button>

            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => { setIsRegistering(!isRegistering); setErrorMsg(null); }}
                className="text-xs text-cyan-400 hover:text-cyan-300 underline cursor-pointer"
              >
                {isRegistering ? 'Already have a desk account? Sign in' : 'Need a new seat? Register trader'}
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
};
