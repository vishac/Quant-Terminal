import React, { useState } from 'react';
import { ActiveTab } from '../types/quant';
import { useLiveMarketData } from '../services/liveMarketService';
import { PWAInstallButton } from './PWAInstallButton';
import { 
  Eye, 
  Shield, 
  PanelLeft, 
  Info, 
  X, 
  ShieldCheck, 
  Zap, 
  Activity, 
  Lock,
  Layers
} from 'lucide-react';

import { useDeskAuth } from '../context/DeskAuthContext';

export type UserRole = 'viewer' | 'admin';

const TAB_LABELS: Record<ActiveTab, string> = {
  multi_user_desk: '20-Seat Desk',
  voice_hud: 'Voice HUD',
  quant_bot: 'Quant Bot',
  autonomous_agents: '5-Agent Desk',
  equity_radar: 'Equity Radar',
  deep_thesis: 'Deep Thesis',
  sync_hub: 'Sync Hub',
  risk_engine: 'Risk Engine',
  risk_guard: 'Guarded Risk',
  backtest_lab: 'Backtest Lab',
  settings: 'Settings',
};

interface HeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  isSpeaking: boolean;
  onToggleVoiceBriefing: () => void;
  onOpenCircuitBreaker: () => void;
  userRole: UserRole;
  setUserRole: (role: UserRole) => void;
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  isSpeaking,
  onToggleVoiceBriefing,
  onOpenCircuitBreaker,
  userRole,
  setUserRole,
  isSidebarOpen = true,
  onToggleSidebar,
}) => {
  const { 
    latencyMs, 
    countdownSeconds, 
    marketSession, 
    isPacketSaverActive, 
    packetsSavedCount, 
    toggleForceSyncOverride 
  } = useLiveMarketData(5000);

  const [isInfoModalOpen, setIsInfoModalOpen] = useState<boolean>(false);
  const { currentSeat, setIsAuthModalOpen } = useDeskAuth();

  return (
    <>
      <header className={`fixed top-0 right-0 h-16 bg-[#090e19]/90 backdrop-blur-xl border-b border-cyan-500/15 shadow-[0_1px_12px_rgba(0,240,255,0.06)] z-40 flex items-center justify-between px-3 sm:px-6 font-mono transition-all duration-300 ease-in-out ${
        userRole === 'admin' && isSidebarOpen ? 'left-0 lg:left-64' : 'left-0'
      }`}>
        {/* Left items: Breadcrumb Button, Info Icon & Live Feed Telemetry */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          
          {/* Breadcrumb Button to hide/show left panel on click / 'c' shortcut */}
          {userRole === 'admin' && onToggleSidebar ? (
            <div className="flex items-center gap-1.5">
              <button
                onClick={onToggleSidebar}
                className="flex items-center gap-1.5 sm:gap-2 px-2.5 py-1.5 bg-slate-900/90 hover:bg-slate-800 text-cyan-300 border border-slate-800 hover:border-cyan-500/40 rounded-xl text-xs font-mono transition-all cursor-pointer shadow-sm active:scale-95 group"
                title={`${isSidebarOpen ? 'Hide' : 'Show'} Left Panel (Shortcut: Press 'C')`}
              >
                <PanelLeft className={`w-3.5 h-3.5 text-cyan-400 transition-transform duration-200 ${isSidebarOpen ? '' : 'rotate-180'}`} />
                <span className="font-bold text-slate-200 hidden sm:inline">JARVIS</span>
                <span className="text-slate-600 hidden sm:inline">/</span>
                <span className="text-cyan-300 font-bold uppercase truncate max-w-[120px] sm:max-w-none">
                  {TAB_LABELS[activeTab] || 'DESK'}
                </span>
                <kbd className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700 font-mono hidden md:inline group-hover:text-cyan-300 group-hover:border-cyan-500/40">
                  C
                </kbd>
              </button>

              {/* Information Icon next to header to inspect long constant texts */}
              <button
                onClick={() => setIsInfoModalOpen(true)}
                className="p-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-cyan-300 border border-slate-800 hover:border-cyan-500/40 transition-colors cursor-pointer"
                title="Desk Architecture & Regulatory Framework Info"
              >
                <Info className="w-3.5 h-3.5 text-cyan-400" />
              </button>
            </div>
          ) : (
            /* Viewer Mode Brand Logo */
            <div className="flex items-center gap-2 pr-2 border-r border-slate-800">
              <svg className="w-6 h-6 shrink-0" viewBox="0 0 100 100" fill="none">
                <circle cx="50" cy="50" r="46" stroke="#00f0ff" strokeWidth="3" strokeDasharray="8 4" />
                <polygon points="50,28 69,61 31,61" stroke="#00f0ff" strokeWidth="2.5" fill="rgba(0, 240, 255, 0.2)" />
                <circle cx="50" cy="50" r="7" fill="#00f0ff" />
              </svg>
              <span className="text-xs font-bold text-cyan-200 uppercase font-sans tracking-wider">JARVIS</span>
            </div>
          )}

          {/* Live Feed Pill */}
          <div className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1 bg-slate-900/80 border border-slate-800 rounded-lg text-xs">
            <span className="text-slate-400 text-[10px] hidden sm:inline">FEED:</span>
            <span className="text-amber-300 font-bold text-[10px]">NSE/BSE · DELAYED</span>
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400"></span>
          </div>

          {/* Latency Telemetry */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-slate-900/80 border border-slate-800 rounded-lg text-xs">
            <span className="text-slate-400 text-[10px]">LATENCY:</span>
            <span className="text-emerald-400 font-bold text-[10px]">{latencyMs} ms</span>
          </div>

          {/* Market Hours Gated Sync & Packet Saver Telemetry */}
          <div 
            onClick={toggleForceSyncOverride}
            className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs cursor-pointer transition border ${
              isPacketSaverActive 
                ? 'bg-amber-950/40 border-amber-500/30 text-amber-300 hover:border-amber-400' 
                : 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300 hover:border-emerald-400'
            }`}
            title={isPacketSaverActive 
              ? `Data Packet Saver Active: Live feed sync operates during Indian market hours (09:15 - 15:30 IST). Rapid polling is paused to save data packets until ${marketSession?.nextSessionText || 'Tomorrow @ 09:15 IST'}. Click to toggle continuous sync.`
              : `Market is in active session (09:15 - 15:30 IST). Auto-syncing every 5s. Click to pause.`
            }
          >
            <span className={`w-1.5 h-1.5 rounded-full ${isPacketSaverActive ? 'bg-amber-400' : 'bg-emerald-400 animate-ping'}`}></span>
            <span className="text-[10px] font-bold">
              {isPacketSaverActive 
                ? `PACKET SAVER (${packetsSavedCount.toLocaleString()} SAVED)`
                : `${countdownSeconds}s LIVE SYNC`
              }
            </span>
          </div>

          {/* Real-time Voice Frequency Equalizer Visualizer */}
          <div 
            onClick={onToggleVoiceBriefing}
            className="hidden xl:flex items-center gap-1 px-2.5 py-1 bg-slate-900/80 border border-slate-800 rounded-lg cursor-pointer hover:border-cyan-500/40 transition-colors"
            title="Click to toggle J.A.R.V.I.S. Audio Briefing"
          >
            <span className="text-[10px] text-slate-400 mr-1 uppercase">VOICE FREQ</span>
            <span className={`inline-block w-1 h-3 bg-cyan-400 rounded-full ${isSpeaking ? 'animate-pulse' : 'h-2'}`}></span>
            <span className={`inline-block w-1 h-5 bg-cyan-300 rounded-full ${isSpeaking ? 'h-6' : 'h-3'}`}></span>
            <span className={`inline-block w-1 h-2 bg-cyan-500 rounded-full ${isSpeaking ? 'h-4' : 'h-1.5'}`}></span>
            <span className={`inline-block w-1 h-4 bg-emerald-400 rounded-full ${isSpeaking ? 'h-5' : 'h-2'}`}></span>
            <span className={`inline-block w-1 h-2 bg-cyan-400 rounded-full ${isSpeaking ? 'animate-pulse' : 'h-1'}`}></span>
          </div>
        </div>

        {/* Right items: Top-Right Unified Role Switcher, Single Clean PWA Button & Avatar */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Unified Top-Right Role Switcher: 1-Click Toggle between Viewer and Owner/Admin */}
          <button
            onClick={() => setUserRole(userRole === 'viewer' ? 'admin' : 'viewer')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl font-mono text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer border shrink-0 ${
              userRole === 'viewer'
                ? 'bg-gradient-to-r from-slate-900 to-cyan-950/80 border-cyan-500/40 text-cyan-200 hover:border-cyan-400 hover:bg-cyan-900/30 shadow-[0_0_12px_rgba(0,240,255,0.15)]'
                : 'bg-gradient-to-r from-slate-900 to-amber-950/80 border-amber-500/40 text-amber-200 hover:border-amber-400 hover:bg-amber-900/30 shadow-[0_0_12px_rgba(245,158,11,0.2)]'
            }`}
            title={
              userRole === 'viewer'
                ? 'Currently viewing Market Overview. Click to toggle to Owner/Admin Operations.'
                : 'Currently in Owner/Admin Mode. Click to toggle to Viewer Mode.'
            }
          >
            {userRole === 'viewer' ? (
              <>
                <Eye className="w-4 h-4 text-cyan-400 shrink-0" />
                <div className="flex flex-col text-left leading-tight">
                  <span className="text-[9px] text-slate-400 uppercase font-sans tracking-tight">VIEWER</span>
                  <span className="text-[11px] text-cyan-300 font-extrabold flex items-center gap-0.5">
                    <span>To Admin</span>
                    <span className="text-amber-400">➔</span>
                  </span>
                </div>
              </>
            ) : (
              <>
                <Shield className="w-4 h-4 text-amber-400 shrink-0" />
                <div className="flex flex-col text-left leading-tight">
                  <span className="text-[9px] text-slate-400 uppercase font-sans tracking-tight">OWNER/ADMIN</span>
                  <span className="text-[11px] text-amber-300 font-extrabold flex items-center gap-0.5">
                    <span>To Viewer</span>
                    <span className="text-cyan-400">➔</span>
                  </span>
                </div>
              </>
            )}
          </button>

          {/* Active 20-Seat Floor Operator Pill & Modal Launcher */}
          <button
            onClick={() => setIsAuthModalOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-cyan-500/30 hover:border-cyan-400 text-xs font-mono transition cursor-pointer shadow-sm active:scale-95"
            title="Active Quant Floor Seat. Click to switch between 20 trader seats or authenticate"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse shrink-0" />
            <span className="text-[10px] text-cyan-300 font-bold shrink-0">SEAT {String(currentSeat?.seatNumber ?? 1).padStart(2, '0')}:</span>
            <span className="text-xs font-bold text-white max-w-[85px] sm:max-w-[120px] truncate">{(currentSeat?.name || 'Operator').split(' ')[0]}</span>
          </button>

          {/* The Single Unified Mobile App Install Button (Kept prominent here) */}
          <PWAInstallButton />

          {/* Cybernetic Executive Profile Avatar */}
          <div className="relative shrink-0">
            <img
              alt="Executive Operator"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuBiD0KtnnvsQbK7BDFpiuk9ElEsmBbfRdhszhh1k4uJLirpK5WJLsw1pm-J8lrWnyBjbGreStmvEfCrOl3Aq1p1XhnGgnMPGU-ktW7QQQeQJpPb_hYwGRnYJeTfaS8jy_pXVPoxNfGn-CO9Dx-K5MOCMdIOpAHgmk2typ6katShzRNBWfCATdKdXPS7KUnD1pgwJUre-ehtPuccjhfSBXYChvP2emBSAvQLpWMIg9qwualbatfMz6El"
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full object-cover ring-2 ring-cyan-400/50 shadow-[0_0_12px_rgba(0,240,255,0.4)]"
            />
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 border-2 border-slate-950 rounded-full"></span>
          </div>
        </div>
      </header>

      {/* Global Desk Information Modal for Constant Administrative Texts */}
      {isInfoModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200 font-mono">
          <div className="bg-[#080d1a] border border-cyan-500/40 rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative flex flex-col gap-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
                  <Info className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wide">
                    Institutional Desk Architecture & Regulatory Framework
                  </h3>
                  <span className="text-[10px] text-slate-400">
                    J.A.R.V.I.S. TERMINAL SPECIFICATIONS & CONSTANT METHODOLOGY
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsInfoModalOpen(false)}
                className="w-7 h-7 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-slate-300 text-xs leading-relaxed max-h-[60vh] overflow-y-auto no-scrollbar pr-1">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-[11px] font-bold text-amber-300 block uppercase">
                  1. Market Data: Delayed &amp; Unofficial (Phase 1)
                </span>
                <p className="text-[11px] text-slate-400">
                  Quotes come from an unofficial Yahoo Finance endpoint (daily candles) and are DELAYED, not a licensed real-time exchange feed. No option-chain or live greeks data is available yet. A licensed real-time feed is a Phase 2 item.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-[11px] font-bold text-emerald-400 block uppercase">
                  2. 5-Factor Quantitative Stock Scoring Model
                </span>
                <p className="text-[11px] text-slate-400">
                  Every asset is evaluated across 5 orthogonal quantitative pillars: Order Flow (20%), Momentum / CANSLIM (25%), Fundamental QARP (25%), Risk-Reward Asymmetry (15%), and Sovereign Moat (15%). Minimum score for execution qualification is 88/100.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-[11px] font-bold text-amber-300 block uppercase">
                  3. Autonomous 5-Agent Strategy Mandate
                </span>
                <p className="text-[11px] text-slate-400">
                  Chanakya (Macro), Bhishma (Vega/Iron Condor), Arjuna (Momentum Gamma), Kuber (Cash Delivery), and Vidura (Risk Arb) execute strictly defined-risk positions with zero naked exposures and mathematical asymmetry.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-[11px] font-bold text-teal-300 block uppercase">
                  4. Statutory SEBI Circuit Breakers & Colocation DMA
                </span>
                <p className="text-[11px] text-slate-400">
                  Tier-1 (10%), Tier-2 (15%), and Tier-3 (20%) circuit breaker rules trigger automatic portfolio delta neutralization. DMA routing interfaces with Zerodha Kite Connect, Upstox, Angel One, and Aditya Birla Money.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-[10px] text-slate-500">
              <span>SHORTCUT: PRESS <kbd className="px-1 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300 font-bold">C</kbd> ANYWHERE TO TOGGLE SIDEBAR</span>
              <button
                onClick={() => setIsInfoModalOpen(false)}
                className="px-3 py-1.5 rounded-lg bg-cyan-500 text-slate-950 font-bold uppercase cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
