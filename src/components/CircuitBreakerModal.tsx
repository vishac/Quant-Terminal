import React, { useState } from 'react';
import { ShieldAlert, AlertTriangle, CheckCircle2, X, Lock, RefreshCw } from 'lucide-react';

interface CircuitBreakerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExecuteBreaker: (tier: string) => void;
}

export const CircuitBreakerModal: React.FC<CircuitBreakerModalProps> = ({
  isOpen,
  onClose,
  onExecuteBreaker,
}) => {
  const [selectedTier, setSelectedTier] = useState<string>('tier2_delta_neutral');
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [hasExecuted, setHasExecuted] = useState<boolean>(false);
  const [executionReport, setExecutionReport] = useState<string>('');

  if (!isOpen) return null;

  const handleConfirmExecution = () => {
    setIsExecuting(true);
    setTimeout(() => {
      setIsExecuting(false);
      setHasExecuted(true);
      if (selectedTier === 'tier1_soft_alert') {
        setExecutionReport('Tier 1 Soft Alert deployed (Paper Ledger): Open positions marked squared-off in paper ledger. Autonomous bots disarmed. Zero live broker hedges created.');
      } else if (selectedTier === 'tier2_delta_neutral') {
        setExecutionReport('Tier 2 Paper Neutralization: Open positions marked squared-off in paper ledger. Autonomous bots disarmed. Zero live broker hedges created.');
      } else if (selectedTier === 'tier3_vol_collar') {
        setExecutionReport('Tier 3 Paper Volatility Collar: Open MIS positions marked squared-off in paper ledger. Autonomous bots disarmed. Zero live broker hedges created.');
      } else {
        setExecutionReport('Tier 4 Hard Circuit Freeze (Paper Ledger): All active paper positions marked squared-off. Autonomous bots disarmed. Zero live broker orders created.');
      }
      onExecuteBreaker(selectedTier);
    }, 850);
  };

  const handleReset = () => {
    setHasExecuted(false);
    setExecutionReport('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl rounded-2xl bg-[#090d18] border border-rose-600/40 p-6 shadow-2xl shadow-rose-950/50 flex flex-col gap-5">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-500 hover:text-slate-300 transition-colors p-1"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-950/80 border border-rose-500/50 flex items-center justify-center text-rose-400 shrink-0">
            <ShieldAlert className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h3 className="text-base font-bold text-rose-200 font-display">
              EMERGENCY CIRCUIT BREAKER (PAPER LEDGER)
            </h3>
            <p className="text-xs text-slate-400">
              Statutory Risk Protocol · Paper Position Square-Off & Bot Disarm
            </p>
          </div>
        </div>

        {!hasExecuted ? (
          <>
            <div className="p-3.5 rounded-xl bg-rose-950/30 border border-rose-500/30 text-xs text-rose-200 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                Confirming execution will mark all open positions as squared-off in the paper ledger and disarm all autonomous bots. This terminal operates strictly in paper-only mode; zero live broker hedges or orders are placed.
              </p>
            </div>

            <div className="flex flex-col gap-2.5">
              <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">Select Defensive Action Tier:</span>
              <div className="flex flex-col gap-2">
                {[
                  {
                    id: 'tier1_soft_alert',
                    label: 'Tier 1 · Passive Execution Freeze (-1.5% NIFTY)',
                    desc: 'Paper Ledger: Cancels simulated pending entries; marks open risk positions as squared-off.',
                    color: 'text-sky-300'
                  },
                  {
                    id: 'tier2_delta_neutral',
                    label: 'Tier 2 · Paper Delta Neutralization (-3.0% NIFTY)',
                    desc: 'Paper Ledger: Marks derivative positions squared-off to neutralize simulated delta; disarms bots.',
                    color: 'text-amber-300'
                  },
                  {
                    id: 'tier3_vol_collar',
                    label: 'Tier 3 · Paper Volatility Collar & Square-Off (-5.0% NIFTY)',
                    desc: 'Paper Ledger: Auto-squares off intraday MIS positions in ledger; halts autonomous triggers.',
                    color: 'text-orange-300'
                  },
                  {
                    id: 'tier4_hard_kill',
                    label: 'Tier 4 · Total Statutory Circuit Freeze (-10.0% NSE Limit)',
                    desc: 'Paper Ledger: Cancels all pending paper orders; disarms bots and locks trading until next session.',
                    color: 'text-rose-400'
                  },
                ].map((tier) => {
                  const isSelected = selectedTier === tier.id;
                  return (
                    <button
                      key={tier.id}
                      onClick={() => setSelectedTier(tier.id)}
                      className={`p-3 rounded-xl text-left border transition-all flex flex-col gap-0.5 ${
                        isSelected
                          ? 'bg-rose-950/40 border-rose-500 text-rose-100 shadow-[0_0_15px_rgba(225,29,72,0.25)]'
                          : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                      }`}
                    >
                      <span className={`text-xs font-bold ${tier.color}`}>{tier.label}</span>
                      <span className="text-[11px] text-slate-400">{tier.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 bg-slate-900 rounded-lg transition-colors"
              >
                Abort & Return
              </button>

              <button
                onClick={handleConfirmExecution}
                disabled={isExecuting}
                className="px-5 py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 disabled:opacity-50 rounded-lg shadow-lg shadow-rose-600/30 transition-all active:scale-95 flex items-center gap-2"
              >
                {isExecuting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Squaring Ledger & Disarming Bots...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>Confirm Paper Square-Off & Disarm</span>
                  </>
                )}
              </button>
            </div>
          </>
        ) : (
          <div className="flex flex-col gap-4 py-2">
            <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-200 flex flex-col gap-2">
              <div className="flex items-center gap-2 text-sm font-bold text-emerald-300">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <span>STATUTORY CIRCUIT ROUTINES EXECUTED (PAPER ONLY)</span>
              </div>
              <p className="text-xs text-slate-300 font-mono leading-relaxed">
                {executionReport}
              </p>
            </div>

            <div className="flex items-center justify-end">
              <button
                onClick={handleReset}
                className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors"
              >
                Acknowledge & Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
