import React from 'react';
import { ActiveTab } from '../types/quant';
import { useLiveMarketData } from '../services/liveMarketService';
import { PWAInstallButton } from './PWAInstallButton';
import { Eye, Shield, RefreshCw } from 'lucide-react';

export type UserRole = 'viewer' | 'admin';

interface HeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  isSpeaking: boolean;
  onToggleVoiceBriefing: () => void;
  onOpenCircuitBreaker: () => void;
  userRole: UserRole;
  setUserRole: (role: UserRole) => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  isSpeaking,
  onToggleVoiceBriefing,
  onOpenCircuitBreaker,
  userRole,
  setUserRole,
}) => {
  const { 
    latencyMs, 
    countdownSeconds, 
    marketSession, 
    isPacketSaverActive, 
    packetsSavedCount, 
    toggleForceSyncOverride 
  } = useLiveMarketData(5000);

  return (
    <header className={`fixed top-0 left-0 right-0 h-16 bg-[#090e19]/90 backdrop-blur-xl border-b border-cyan-500/15 shadow-[0_1px_12px_rgba(0,240,255,0.06)] z-40 flex items-center justify-between px-3 sm:px-6 font-mono ${
      userRole === 'admin' ? 'lg:left-64' : ''
    }`}>
      {/* Left items: Live Feed Telemetry */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Mobile menu trigger / title on small screen */}
        <div className="lg:hidden flex items-center gap-1.5 pr-2 border-r border-slate-800">
          <svg className="w-5 h-5 sm:w-6 sm:h-6 shrink-0" viewBox="0 0 100 100" fill="none">
            <circle cx="50" cy="50" r="46" stroke="#00f0ff" strokeWidth="3" strokeDasharray="8 4" />
            <polygon points="50,28 69,61 31,61" stroke="#00f0ff" strokeWidth="2.5" fill="rgba(0, 240, 255, 0.2)" />
            <circle cx="50" cy="50" r="7" fill="#00f0ff" />
          </svg>
          <span className="text-xs font-bold text-cyan-200 uppercase font-sans tracking-wider">JARVIS</span>
        </div>

        <div className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1 bg-slate-900/80 border border-slate-800 rounded-lg text-xs">
          <span className="text-slate-400 text-[10px] hidden sm:inline">FEED:</span>
          <span className="text-cyan-300 font-bold text-[10px]">NSE/BSE</span>
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
        </div>

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
          <span className={`w-2 h-2 rounded-full ${isPacketSaverActive ? 'bg-amber-400' : 'bg-emerald-400 animate-ping'}`}></span>
          <span className="text-[10px] font-bold">
            {isPacketSaverActive 
              ? `PACKET SAVER (${packetsSavedCount.toLocaleString()} SAVED)`
              : `${countdownSeconds}s LIVE SYNC`
            }
          </span>
        </div>

        <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 bg-slate-900/80 border border-slate-800 rounded-lg text-xs">
          <span className="text-slate-400 text-[10px]">LOCATION:</span>
          <span className="text-amber-300 font-bold text-[10px]">MUMBAI-DC // RACK-08</span>
        </div>

        {/* Real-time Voice Frequency Equalizer Visualizer */}
        <div 
          onClick={onToggleVoiceBriefing}
          className="hidden md:flex items-center gap-1 px-3 py-1 bg-slate-900/80 border border-slate-800 rounded-lg cursor-pointer hover:border-cyan-500/40 transition-colors"
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

      {/* Right items: Top-Right Unified Role Switcher, PWA, Token Status & Avatar */}
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

        <PWAInstallButton />

        <div className="hidden lg:flex items-center gap-1 px-2.5 py-1 bg-slate-900/80 border border-slate-800 rounded-lg text-xs text-slate-400">
          <span className="text-[10px]">SEC-TOKENS:</span>
          <span className="text-cyan-300 font-bold text-[10px]">99.98% OK</span>
        </div>

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
  );
};
