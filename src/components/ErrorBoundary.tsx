import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[JARVIS Quant ErrorBoundary] Caught error:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private handleReset = () => {
    try {
      localStorage.removeItem('jarvis_desk_seats');
      localStorage.removeItem('jarvis_current_seat_number');
      localStorage.removeItem('jarvis_desk_orders');
      localStorage.removeItem('jarvis_user_role');
    } catch {}
    window.location.reload();
  };

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#060913] text-slate-100 flex items-center justify-center p-4 font-mono">
          <div className="max-w-md w-full bg-[#090e19] border border-cyan-500/30 rounded-2xl p-6 shadow-2xl flex flex-col items-center text-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-950/60 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <AlertTriangle className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 uppercase tracking-wide">
                Terminal Viewport Recovered
              </h2>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                A rendering anomaly was intercepted by the J.A.R.V.I.S. fault-tolerance shield.
              </p>
              {this.state.error && (
                <div className="mt-3 p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 text-rose-400 text-[11px] text-left font-mono overflow-x-auto max-h-24">
                  {this.state.error.message || String(this.state.error)}
                </div>
              )}
            </div>
            <div className="flex items-center gap-3 w-full pt-2">
              <button
                onClick={this.handleReload}
                className="flex-1 py-2.5 px-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold uppercase text-xs flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reload</span>
              </button>
              <button
                onClick={this.handleReset}
                className="flex-1 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold uppercase text-xs flex items-center justify-center gap-2 transition border border-slate-700 cursor-pointer"
                title="Clears local state cache and reloads"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Cache</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
