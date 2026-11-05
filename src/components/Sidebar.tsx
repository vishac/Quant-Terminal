import React from 'react';
import { ActiveTab } from '../types/quant';
import { PanelLeftClose, Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  isOpen?: boolean;
  onToggle?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  activeTab, 
  setActiveTab,
  onToggle 
}) => {
  const { theme, setTheme } = useTheme();
  const navItems: { id: ActiveTab; label: string; icon: React.ReactNode }[] = [
    { 
      id: 'equity_radar', 
      label: '1. Market Finder', 
      icon: <span className="material-symbols-outlined text-[18px]">public</span> 
    },
    { 
      id: 'stress_test_lab', 
      label: '2. Stress Lab', 
      icon: <span className="material-symbols-outlined text-[18px]">science</span> 
    },
    { 
      id: 'autonomous_agents', 
      label: '3. AI Council', 
      icon: <span className="material-symbols-outlined text-[18px]">group_work</span> 
    },
    { 
      id: 'trade_history', 
      label: '4. Order Book & Guide', 
      icon: <span className="material-symbols-outlined text-[18px]">receipt_long</span> 
    },
    { 
      id: 'quant_bot', 
      label: 'NSE Option Chain & 3D', 
      icon: <span className="material-symbols-outlined text-[18px]">smart_toy</span> 
    },
    { 
      id: 'risk_engine', 
      label: 'Risk & <1.5% DD Guard', 
      icon: <span className="material-symbols-outlined text-[18px]">security</span> 
    },
    { 
      id: 'backtest_lab', 
      label: 'Backtest Lab', 
      icon: <span className="material-symbols-outlined text-[18px]">query_stats</span> 
    },
    { 
      id: 'settings', 
      label: 'Control Tower', 
      icon: <span className="material-symbols-outlined text-[18px]">settings</span> 
    },
  ];

  return (
    <aside className="h-full w-64 bg-[#090e19]/95 backdrop-blur-2xl flex flex-col justify-between border-r border-cyan-500/15 shadow-[0_0_30px_rgba(0,0,0,0.6)] font-mono select-none">
      <div className="flex flex-col">
        {/* Brand Header with Close/Collapse Button */}
        <div className="h-16 px-4 flex items-center justify-between bg-[#171b27]/50 border-b border-cyan-500/10">
          <div className="flex items-center gap-3">
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

          {/* Quick Collapse Button (Press 'C' to toggle) */}
          {onToggle && (
            <button
              onClick={onToggle}
              className="p-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-cyan-300 border border-slate-800 hover:border-cyan-500/40 transition-colors cursor-pointer"
              title="Hide Left Panel (Shortcut: Press 'C')"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Navigation Items */}
        <nav className="flex flex-col gap-1.5 px-3 mt-3">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  onToggle?.();
                }}
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

      {/* Theme Switcher & Footer Shortcut Helper */}
      <div className="p-3 border-t border-cyan-500/10 flex flex-col gap-2.5 font-mono">
        <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-slate-950/80 border border-slate-800">
          <button
            onClick={() => setTheme('light')}
            className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[10px] font-bold uppercase transition cursor-pointer ${
              theme === 'light'
                ? 'bg-cyan-500 text-slate-950 shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sun className="w-3.5 h-3.5" />
            <span>Lighter</span>
          </button>
          <button
            onClick={() => setTheme('dark')}
            className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[10px] font-bold uppercase transition cursor-pointer ${
              theme === 'dark'
                ? 'bg-cyan-500 text-slate-950 shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Moon className="w-3.5 h-3.5" />
            <span>Dark</span>
          </button>
        </div>

        <div className="flex items-center justify-between text-[10px] text-slate-400">
          <span className="flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300 font-bold">C</kbd>
            <span>PANEL</span>
            <kbd className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300 font-bold ml-1">T</kbd>
            <span>THEME</span>
          </span>
          <span className="text-slate-400">v8.4-PRO</span>
        </div>
      </div>
    </aside>
  );
};
