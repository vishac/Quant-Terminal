import React, { useState } from 'react';
import { TerminalAccountState, TripleBarrierSpec, TaxAuditResult } from '../types/quant_engine';

export const ExecutionTerminal: React.FC = () => {
  // ZERO DUMMY DATA MANDATE: State initializes completely clean
  const [account, setAccount] = useState<TerminalAccountState>({
    capitalAllocated: null, // Displays 'Unallocated' per directive
    hardFloorINR: 0,
    realizedPnL: 0.0,
    unrealizedPnL: 0.0,
    totalClosedTrades: 0,
    consecutiveLosses: 0,
    killSwitchEngaged: false,
    winRate: null, // Displays '--' until trades close
  });

  const [activeOrders, setActiveOrders] = useState<TripleBarrierSpec[]>([]);
  const [lastAudit, setLastAudit] = useState<TaxAuditResult | null>(null);

  return (
    <div className="flex flex-col h-full bg-[#05070c] text-slate-100 font-mono p-4 space-y-4">
      {/* Institutional Top Bar */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div>
          <h1 className="text-xl font-bold tracking-wider text-amber-400 font-['Orbitron']">
            J.A.R.V.I.S. QUANT TERMINAL
          </h1>
          <p className="text-xs text-slate-400">
            Regime-Adaptive Triple-Barrier Execution Engine (NSE / MCX)
          </p>
        </div>
        <div className="flex items-center space-x-6 text-sm">
          <div>
            <span className="text-slate-500">ALLOCATED CAPITAL: </span>
            <span className="font-semibold text-slate-200">
              {account.capitalAllocated !== null
                ? `₹${account.capitalAllocated.toLocaleString('en-IN')}`
                : 'Unallocated'}
            </span>
          </div>
          <div>
            <span className="text-slate-500">REALIZED P&L: </span>
            <span
              className={`font-semibold ${
                account.realizedPnL >= 0 ? 'text-emerald-400' : 'text-rose-500'
              }`}
            >
              ₹{account.realizedPnL.toFixed(2)}
            </span>
          </div>
          <div>
            <span className="text-slate-500">SESSION WIN RATE: </span>
            <span className="font-semibold text-amber-300">
              {account.winRate !== null ? `${(account.winRate * 100).toFixed(1)}%` : '--'}
            </span>
          </div>
          <div>
            <span className="text-slate-500">TRADES: </span>
            <span className="font-semibold">{account.totalClosedTrades}</span>
          </div>
          <div>
            <span
              className={`px-2 py-0.5 text-xs rounded font-bold ${
                account.killSwitchEngaged
                  ? 'bg-rose-950 text-rose-300 border border-rose-700'
                  : 'bg-emerald-950 text-emerald-300 border border-emerald-700'
              }`}
            >
              {account.killSwitchEngaged ? 'CIRCUIT BREAKER: LOCKED' : 'ENGINE: ARMED'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid: Working Orders & Gatekeeper Audit */}
      <div className="grid grid-cols-12 gap-4 flex-1">
        {/* Session Order Book: Mandatory Clean Boot */}
        <div className="col-span-8 border border-slate-800 rounded bg-[#070b14] p-4 flex flex-col">
          <h2 className="text-sm font-semibold text-slate-300 border-b border-slate-800 pb-2 mb-3">
            ACTIVE SESSION ORDER BOOK
          </h2>

          {activeOrders.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-600">
              <span className="material-symbols-outlined text-4xl mb-2">inbox</span>
              <p className="text-sm">No active working orders in current session.</p>
              <p className="text-xs text-slate-700 mt-1">
                Zero dummy data mandate active. Awaiting CUSUM event breach.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {activeOrders.map((ord, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between bg-slate-900/60 border border-slate-800 p-2 text-xs rounded"
                >
                  <span className="font-bold text-amber-400">{ord.regime}</span>
                  <span>Entry: ₹{ord.entryPrice}</span>
                  <span className="text-emerald-400">PT: ₹{ord.profitTakeBarrier}</span>
                  <span className="text-rose-400">SL: ₹{ord.stopLossBarrier}</span>
                  <span>Lots: {ord.lots}</span>
                  <span>Expiry: {new Date(ord.verticalTimeBarrier).toLocaleTimeString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Expectancy & Tax Gatekeeper Panel */}
        <div className="col-span-4 border border-slate-800 rounded bg-[#070b14] p-4 flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-300 border-b border-slate-800 pb-2 mb-3">
              EXPECTANCY AUDIT (2026 STATUTORY RATES)
            </h2>
            {lastAudit ? (
              <div className="space-y-3 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Status:</span>
                  <span
                    className={`font-bold ${
                      lastAudit.approved ? 'text-emerald-400' : 'text-rose-500'
                    }`}
                  >
                    {lastAudit.approved ? 'APPROVED' : 'VETOED'}
                  </span>
                </div>
                {lastAudit.rejectionReason && (
                  <p className="text-rose-400 bg-rose-950/40 p-2 rounded border border-rose-900 text-[11px]">
                    {lastAudit.rejectionReason}
                  </p>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-400">Gross Win:</span>
                  <span>₹{lastAudit.grossWinINR}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Gross Loss:</span>
                  <span>₹{lastAudit.grossLossINR}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">STT/CTT + GST + Fees:</span>
                  <span className="text-amber-300">₹{lastAudit.statutoryTotalINR}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Est. Slippage:</span>
                  <span>₹{lastAudit.slippageINR}</span>
                </div>
                <div className="flex justify-between border-t border-slate-800 pt-1 font-semibold">
                  <span>Net Expectancy:</span>
                  <span
                    className={
                      lastAudit.netExpectancyINR >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }
                  >
                    ₹{lastAudit.netExpectancyINR}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Break-even Prob:</span>
                  <span>{(lastAudit.breakEvenProbability * 100).toFixed(1)}%</span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-600 mt-4">
                Gatekeeper idle. Awaiting candidate order evaluation.
              </p>
            )}
          </div>

          <div className="text-[10px] text-slate-600 border-t border-slate-900 pt-2">
            SEBI FY26 Compliance: Capped at &le;8 OPS. Whitelisted Static IP check active.
          </div>
        </div>
      </div>
    </div>
  );
};