import React, { useState, useEffect } from 'react';
import { ActiveTab } from './types/quant';
import { Sidebar } from './components/Sidebar';
import { Header, UserRole } from './components/Header';
import { ViewerDashboard } from './components/ViewerDashboard';
import { JarvisVoiceHUD } from './components/JarvisVoiceHUD';
import { QuantTerminal3D } from './components/QuantTerminal3D';
import { MacroPolicyThesis } from './components/MacroPolicyThesis';
import { BrokerGatewayRouter } from './components/BrokerGatewayRouter';
import { RiskEngineTerminal } from './components/RiskEngineTerminal';
import { GuardedRiskControl } from './components/GuardedRiskControl';
import { BacktestLab } from './components/BacktestLab';
import { SettingsTerminal } from './components/SettingsTerminal';
import { InstitutionalEquityRadar } from './components/InstitutionalEquityRadar';
import { AutonomousAgentsDesk } from './components/AutonomousAgentsDesk';
import { BrutalStressTestLab } from './components/BrutalStressTestLab';
import { TradeHistory } from './components/TradeHistory';
import { CircuitBreakerModal } from './components/CircuitBreakerModal';
import { OfflineIndicator } from './components/OfflineIndicator';
import { OwnerGate } from './components/OwnerGate';
import { DeskAuthProvider, useDeskAuth } from './context/DeskAuthContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { MultiUserDesk } from './components/MultiUserDesk';
import { FirebaseAuthModal } from './components/FirebaseAuthModal';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Radio } from 'lucide-react';
import { getStoredPaperTrades, persistPaperTrades } from './services/paperTradeService';
import { formatOrderDate, formatOrderTime } from './utils/orderFormatters';

// ---------------------------------------------------------------------------
// Mobile bottom nav tab definitions — single source of truth, never repeated
// ---------------------------------------------------------------------------

const MOBILE_NAV_TABS: { id: ActiveTab; icon: string; label: string }[] = [
  { id: 'equity_radar',      icon: 'public',            label: '1. Finder'   },
  { id: 'stress_test_lab',   icon: 'science',           label: '2. Stress'   },
  { id: 'autonomous_agents', icon: 'group_work',        label: '3. Council'  },
  { id: 'trade_history',     icon: 'receipt_long',      label: '4. Orders'   },
  { id: 'quant_bot',         icon: 'monitoring',        label: 'F&O Chain'   },
  { id: 'risk_engine',       icon: 'security',          label: 'Risk'        },
  { id: 'settings',          icon: 'settings',          label: 'Control'     },
];

// ---------------------------------------------------------------------------
// Time-aware greeting helper
// ---------------------------------------------------------------------------

function getTimeBasedGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12)  return 'Good morning Sir.';
  if (hour >= 12 && hour < 17) return 'Good afternoon Sir.';
  if (hour >= 17 && hour < 21) return 'Good evening Sir.';
  return 'Good evening Sir.';
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <DeskAuthProvider>
          <AppInner />
        </DeskAuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

function AppInner() {
  const { currentSeat } = useDeskAuth();
  const { theme } = useTheme();
  const [userRole, setUserRoleState] = useState<UserRole>(() => {
    try {
      return (localStorage.getItem('jarvis_user_role') as UserRole) || 'admin';
    } catch {
      return 'admin';
    }
  });

  const [gateOpen, setGateOpen] = useState<boolean>(false);

  /**
   * Owner verification:
   * 1. Check if existing session cookie is already valid via /api/owner/status.
   * 2. If server has no OWNER_ACCESS_TOKEN configured, allow access.
   * 3. If cookie is not authorized, prompt owner to log in via OwnerGate modal.
   * The client never stores the raw token in localStorage and auto-auth is disabled.
   */
  const ensureOwnerAccess = async (): Promise<boolean> => {
    try {
      const res = await fetch('/api/owner/status', { credentials: 'include' });
      const data = await res.json();
      if (!data.configured) return true; // No token configured on server
      if (data.authorized) return true;  // Cookie already authorized
    } catch {}

    return false;
  };

  const setUserRole = async (role: UserRole) => {
    if (role === 'admin') {
      const hasAccess = await ensureOwnerAccess();
      if (!hasAccess) {
        setGateOpen(true);
        return;
      }
    }
    setUserRoleState(role);
    try { localStorage.setItem('jarvis_user_role', role); } catch { /* ignore */ }
  };

  const handleGateSuccess = () => {
    try {
      localStorage.setItem('jarvis_user_role', 'admin');
    } catch { /* ignore */ }
    setUserRoleState('admin');
    setGateOpen(false);
  };

  // Background verification on mount to check if owner session cookie is already active
  useEffect(() => {
    if (userRole === 'admin') {
      ensureOwnerAccess().then((hasAccess) => {
        if (!hasAccess) {
          setUserRoleState('viewer');
          try { localStorage.setItem('jarvis_user_role', 'viewer'); } catch {}
        }
      }).catch(() => {});
    }
  }, []);

  const [activeTab, setActiveTab] = useState<ActiveTab>('quant_bot');
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [isCircuitBreakerOpen, setIsCircuitBreakerOpen] = useState<boolean>(false);
  const [systemAlertMessage, setSystemAlertMessage] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);

  // Global Keyboard Shortcut: Press 'c' or 'C' to toggle left panel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }
      if (e.key === 'c' || e.key === 'C') setIsSidebarOpen((prev) => !prev);
    };
    const handleOpenGate = () => setGateOpen(true);
    const handleNavigateTab = (e: Event) => {
      const targetTab = (e as CustomEvent<ActiveTab>).detail;
      if (targetTab) setActiveTab(targetTab);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('jarvis:open-owner-gate', handleOpenGate);
    window.addEventListener('jarvis:navigate-tab', handleNavigateTab);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('jarvis:open-owner-gate', handleOpenGate);
      window.removeEventListener('jarvis:navigate-tab', handleNavigateTab);
    };
  }, []);

  const handleToggleVoiceBriefing = () => {
    if (!('speechSynthesis' in window)) {
      setSystemAlertMessage('Speech synthesis is not supported on this browser.');
      setTimeout(() => setSystemAlertMessage(null), 4000);
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    } else {
      const greeting = getTimeBasedGreeting();
      const summary = `${greeting} Live market telemetry is active. All autonomous risk circuits are armed and fully compliant with SEBI peak margin rules.`;
      const utterance = new SpeechSynthesisUtterance(summary);
      utterance.rate = 1.05;
      utterance.pitch = 0.95;

      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(
        (v) => v.lang.includes('en-GB') || v.name.includes('UK') || v.name.includes('Daniel'),
      );
      if (preferredVoice) utterance.voice = preferredVoice;

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      window.speechSynthesis.speak(utterance);
    }
  };

  const handleExecuteCircuitBreaker = (tier: string) => {
    const now = new Date();
    const orderDate = formatOrderDate(now);
    const orderTime = formatOrderTime(now);
    const currentOrders = getStoredPaperTrades();
    let squaredCount = 0;

    const updatedOrders = currentOrders.map((o) => {
      if (o.status !== 'OPEN') return o;
      squaredCount += 1;
      const entryP = o.entryPrice ?? o.legs?.[0]?.price ?? 100;
      const exitP = o.exitPrice ?? o.legs?.[0]?.exitPrice ?? entryP;
      return {
        ...o,
        status: 'SQUARED_OFF' as const,
        exitPrice: exitP,
        exitReason: `Emergency Circuit Breaker [${tier.toUpperCase()}] · Portfolio Delta Neutralized (Paper Ledger)`,
        orderDate: o.orderDate || orderDate,
        orderTime,
        timestamp: `${o.orderDate || orderDate} ${orderTime} (Circuit Breaker - Paper)`,
      };
    });

    persistPaperTrades(updatedOrders);
    window.dispatchEvent(new CustomEvent('jarvis:circuit-breaker', { detail: { tier, timestamp: Date.now() } }));
    try { localStorage.setItem('jarvis_bots_armed_state', 'false'); } catch { /* ignore */ }
    setSystemAlertMessage(
      `Statutory Circuit Breaker Routine [${tier.toUpperCase()}] executed (Paper Ledger): Squared off ${squaredCount} paper position(s) and disarmed bots. Zero live broker hedges created.`,
    );
    setTimeout(() => setSystemAlertMessage(null), 6000);
  };

  return (
    <div
      data-theme={theme}
      className={`min-h-screen bg-[#060913] text-slate-100 flex antialiased selection:bg-cyan-500/30 selection:text-cyan-200 theme-${theme}`}
    >
      {/* Fixed Left Sidebar: Only displayed in Admin / Operations mode */}
      {userRole === 'admin' && (
        <>
          {isSidebarOpen && (
            <div
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 transition-opacity cursor-pointer animate-in fade-in duration-200"
              title="Click outside to close panel"
            />
          )}
          <div
            className={`fixed left-0 top-0 h-full z-50 transition-transform duration-300 ease-in-out ${
              isSidebarOpen ? 'translate-x-0 shadow-[0_0_50px_rgba(0,0,0,0.8)]' : '-translate-x-full'
            }`}
          >
            <Sidebar
              activeTab={activeTab}
              setActiveTab={(tab) => {
                setActiveTab(tab);
                setIsSidebarOpen(false);
              }}
              isOpen={isSidebarOpen}
              onToggle={() => setIsSidebarOpen(false)}
            />
          </div>
        </>
      )}

      {/* Main Workspace Frame */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out ${
          userRole === 'admin' && isSidebarOpen ? 'lg:pl-64' : 'lg:pl-0'
        }`}
      >
        <Header
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isSpeaking={isSpeaking}
          onToggleVoiceBriefing={handleToggleVoiceBriefing}
          onOpenCircuitBreaker={() => setIsCircuitBreakerOpen(true)}
          userRole={userRole}
          setUserRole={setUserRole}
          isSidebarOpen={isSidebarOpen}
          onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
        />

        {/* System Alert Banner */}
        {systemAlertMessage && (
          <div className="mx-4 sm:mx-6 mt-20 p-3 rounded-xl bg-amber-950/40 border border-amber-500/40 text-xs font-mono text-amber-200 flex items-center justify-between animate-in slide-in-from-top-2 duration-300">
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-amber-400 animate-pulse" />
              <span>{systemAlertMessage}</span>
            </div>
            <button
              onClick={() => setSystemAlertMessage(null)}
              className="text-amber-400 hover:text-amber-200 underline text-[11px]"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Viewport Content */}
        <main
          className={`flex-1 w-full max-w-[1720px] mx-auto px-3.5 sm:px-6 pt-20 ${
            userRole === 'viewer' ? 'pb-8' : 'pb-24 lg:pb-8'
          }`}
        >
          {userRole === 'viewer' ? (
            <ViewerDashboard />
          ) : (
            <>
              {/* Unified 4-Core Causal Pipeline Switcher */}
              <div className="mb-4 p-2.5 rounded-xl bg-[#090e19]/95 border border-cyan-500/25 shadow-md font-mono">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                  {[
                    {
                      id: 'equity_radar' as ActiveTab,
                      coreBadge: '1. MARKET FINDER',
                      title: 'Screener, 52W-Low Bottoms, Bear Puts & Elections',
                      matchTabs: ['equity_radar', 'deep_thesis'],
                    },
                    {
                      id: 'stress_test_lab' as ActiveTab,
                      coreBadge: '2. STRESS LAB',
                      title: 'War, India/US Elections & 10-Point Audit',
                      matchTabs: ['stress_test_lab', 'backtest_lab'],
                    },
                    {
                      id: 'autonomous_agents' as ActiveTab,
                      coreBadge: '3. AI COUNCIL',
                      title: '5-Agent Consensus Debate & NSE Option Chain',
                      matchTabs: ['autonomous_agents', 'quant_bot'],
                    },
                    {
                      id: 'trade_history' as ActiveTab,
                      coreBadge: '4. ORDER BOOK',
                      title: 'Live Trades, <1.5% DD Guard, T-1 Tax & Guide',
                      matchTabs: ['trade_history', 'risk_engine', 'settings'],
                    },
                  ].map((core) => {
                    const isCoreActive = core.matchTabs.includes(activeTab);
                    return (
                      <button
                        key={core.id}
                        onClick={() => setActiveTab(core.id)}
                        className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                          isCoreActive
                            ? 'bg-cyan-950/70 border-cyan-400 shadow-[0_0_15px_rgba(0,240,255,0.2)]'
                            : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[10px] font-bold">
                          <span className={isCoreActive ? 'text-cyan-300' : 'text-slate-400'}>
                            {core.coreBadge}
                          </span>
                          {isCoreActive && (
                            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                          )}
                        </div>
                        <div className="text-xs font-bold text-white mt-0.5 truncate">
                          {core.title}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Secondary Quick Tool Switcher */}
                <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between flex-wrap gap-2 text-[11px]">
                  <span className="text-slate-400">
                    Active Pipeline Rules: <span className="text-emerald-300 font-bold">&le;1.50% Max Daily Drawdown (&lt;2% Locked)</span> · <span className="text-cyan-300 font-bold">&gt;2.00% Net Profit Gate</span> · <span className="text-amber-300 font-bold">82% Profit-Lock / 100% Cash Anti-Whipsaw</span>
                  </span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[
                      { id: 'quant_bot' as ActiveTab, label: 'NSE Option Chain & 3D Surface' },
                      { id: 'stress_test_lab' as ActiveTab, label: 'Brutal Stress Lab' },
                      { id: 'risk_engine' as ActiveTab, label: 'Risk Engine' },
                      { id: 'backtest_lab' as ActiveTab, label: 'Backtest' },
                      { id: 'settings' as ActiveTab, label: 'Broker & Control' },
                    ].map((sub) => (
                      <button
                        key={sub.id}
                        onClick={() => setActiveTab(sub.id)}
                        className={`px-2.5 py-1 rounded-lg border text-[10px] font-bold transition cursor-pointer ${
                          activeTab === sub.id
                            ? 'bg-cyan-500 text-slate-950 border-cyan-400'
                            : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        {sub.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {activeTab === 'multi_user_desk' && <MultiUserDesk />}
              {activeTab === 'voice_hud' && (
                <JarvisVoiceHUD
                  isSpeaking={isSpeaking}
                  setIsSpeaking={setIsSpeaking}
                  onOpenCircuitBreaker={() => setIsCircuitBreakerOpen(true)}
                />
              )}
              {activeTab === 'quant_bot' && (
                <QuantTerminal3D onNavigateToAgents={() => setActiveTab('autonomous_agents')} />
              )}
              {activeTab === 'autonomous_agents' && (
                <AutonomousAgentsDesk 
                  onOpenCircuitBreaker={() => setIsCircuitBreakerOpen(true)}
                  onNavigateToTradeHistory={() => setActiveTab('trade_history')}
                />
              )}
              {activeTab === 'stress_test_lab' && (
                <BrutalStressTestLab
                  onNavigateToAgents={() => setActiveTab('autonomous_agents')}
                  onNavigateToOrders={() => setActiveTab('trade_history')}
                />
              )}
              {activeTab === 'trade_history' && (
                <TradeHistory onNavigateToAgents={() => setActiveTab('autonomous_agents')} />
              )}
              {activeTab === 'equity_radar' && <InstitutionalEquityRadar />}
              {activeTab === 'deep_thesis' && <MacroPolicyThesis />}
              {activeTab === 'sync_hub' && <BrokerGatewayRouter />}
              {activeTab === 'risk_engine' && (
                <RiskEngineTerminal onOpenCircuitBreaker={() => setIsCircuitBreakerOpen(true)} />
              )}
              {activeTab === 'risk_guard' && <GuardedRiskControl />}
              {activeTab === 'backtest_lab' && <BacktestLab />}
              {activeTab === 'settings' && <SettingsTerminal />}
            </>
          )}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar — rendered from MOBILE_NAV_TABS, never copy-pasted */}
      {userRole === 'admin' && (
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 h-16 bg-[#090e19]/95 backdrop-blur-2xl border-t border-cyan-500/20 shadow-[0_-4px_24px_rgba(0,0,0,0.8)] flex items-center justify-around px-2 font-mono">
          <div className="flex items-center justify-around w-full overflow-x-auto no-scrollbar py-1">
            {MOBILE_NAV_TABS.map(({ id, icon, label }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex flex-col items-center justify-center min-w-[50px] h-12 rounded-xl transition-all ${
                  activeTab === id
                    ? 'text-cyan-300 bg-cyan-950/40 border border-cyan-500/40 font-bold'
                    : 'text-slate-400'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">{icon}</span>
                <span className="text-[8px] uppercase tracking-wider mt-0.5">{label}</span>
              </button>
            ))}
          </div>
        </nav>
      )}

      {/* Circuit Breaker Modal */}
      <CircuitBreakerModal
        isOpen={isCircuitBreakerOpen}
        onClose={() => setIsCircuitBreakerOpen(false)}
        onExecuteBreaker={handleExecuteCircuitBreaker}
      />

      {/* Owner Access Gate */}
      <OwnerGate isOpen={gateOpen} onClose={() => setGateOpen(false)} onSuccess={handleGateSuccess} />

      {/* Multi-User 20-Seat Firebase Auth & Seat Switch Modal */}
      <FirebaseAuthModal />

      {/* PWA Offline Network Indicator */}
      <OfflineIndicator />
    </div>
  );
}
