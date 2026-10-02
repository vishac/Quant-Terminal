import React from 'react';
import { ActiveTab } from '../types/quant';
import { 
  Mic, 
  Bot, 
  Activity, 
  Network, 
  ShieldCheck, 
  Settings, 
  Radio
} from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const navItems: { id: ActiveTab; label: string; icon: React.ReactNode }[] = [
    { 
      id: 'voice_hud', 
      label: 'Voice HUD', 
      icon: <span className="material-symbols-outlined text-[18px]">graphic_eq</span> 
    },
    { 
      id: 'quant_bot', 
      label: 'Quant Bot', 
      icon: <span className="material-symbols-outlined text-[18px]">smart_toy</span> 
    },
    { 
      id: 'autonomous_agents', 
      label: '5-Agent Desk', 
      icon: <span className="material-symbols-outlined text-[18px]">group_work</span> 
    },
    { 
      id: 'equity_radar', 
      label: 'Equity Radar', 
      icon: <span className="material-symbols-outlined text-[18px]">candlestick_chart</span> 
    },
    { 
      id: 'deep_thesis', 
      label: 'Deep Thesis', 
      icon: <span className="material-symbols-outlined text-[18px]">analytics</span> 
    },
    { 
      id: 'sync_hub', 
      label: 'Sync Hub', 
      icon: <span className="material-symbols-outlined text-[18px]">hub</span> 
    },
    { 
      id: 'risk_engine', 
      label: 'Risk Engine', 
      icon: <span className="material-symbols-outlined text-[18px]">security</span> 
    },
    { 
      id: 'settings', 
      label: 'Settings', 
      icon: <span className="material-symbols-outlined text-[18px]">settings</span> 
    },
  ];

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-[#090e19]/95 backdrop-blur-2xl z-50 flex flex-col justify-between border-r border-cyan-500/15 shadow-[0_0_30px_rgba(0,0,0,0.6)] font-mono">
      <div className="flex flex-col">
        {/* Brand Header */}
        <div className="h-16 px-4 flex items-center gap-3 bg-[#171b27]/50 border-b border-cyan-500/10">
          {/* Futuristic Glowing HUD Arc Reactor Insignia */}
          <div className="relative w-8 h-8 flex items-center justify-center shrink-0">
            <svg className="w-8 h-8" viewBox="0 0 100 100" fill="none">
              <circle cx="50" cy="50" r="46" stroke="#00f0ff" strokeWidth="2.5" strokeDasharray="8 4" opacity="0.85" />
              <circle cx="50" cy="50" r="38" stroke="#00b8d9" strokeWidth="1.5" opacity="0.6" />
              <circle cx="50" cy="50" r="26" stroke="#ffb800" strokeWidth="2" strokeDasharray="14 6" />
              <polygon points="50,28 69,61 31,61" stroke="#00f0ff" strokeWidth="2.5" fill="rgba(0, 240, 255, 0.2)" />
              <circle cx="50" cy="50" r="7" fill="#00f0ff" />
              <circle cx="50" cy="50" r="3" fill="#ffffff" />
            </svg>
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
          </div>

          <div className="flex flex-col">
            <span className="text-sm font-bold uppercase tracking-wider text-cyan-200 leading-none font-sans">
              JARVIS
            </span>
            <span className="text-[10px] uppercase tracking-widest text-cyan-400/80 mt-1">
              TERMINAL // V8.4
            </span>
          </div>
        </div>

        {/* System Status Ticker */}
        <div className="px-4 py-2.5">
          <div className="flex items-center justify-between px-3 py-1.5 bg-[#1b1f2b]/70 rounded-lg border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase">SEC_SYS // STAT</span>
            <span className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-bold">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              ONLINE
            </span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex flex-col gap-1 px-2.5 mt-1">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs uppercase tracking-wide transition-all text-left cursor-pointer ${
                  isActive
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow-[0_0_15px_rgba(0,240,255,0.35)]'
                    : 'text-slate-400 hover:bg-[#252a36] hover:text-slate-100'
                }`}
              >
                {item.icon}
                <span className="font-semibold">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* PWA & Android APK Installation Button */}
      <div className="p-3 border-t border-cyan-500/10">
        <PWAInstallButton variant="sidebar" />
      </div>

      {/* Bottom Core Engine Status */}
      <div className="p-4 bg-[#171b27]/40 border-t border-cyan-500/10 flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-[10px] text-slate-400">
          <span className="tracking-wider">CORE ENGINE</span>
          <span className="text-cyan-300 font-bold">98.4%</span>
        </div>
        <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
          <div className="bg-cyan-400 h-full w-[98.4%] shadow-[0_0_8px_#00f0ff]"></div>
        </div>
        <div className="flex items-center justify-between mt-1 text-[10px]">
          <span className="text-slate-500">HOST: RACK-08</span>
          <span className="text-emerald-400 font-bold uppercase">COLOCATED</span>
        </div>
      </div>
    </aside>
  );
};
