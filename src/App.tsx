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
import { CircuitBreakerModal } from './components/CircuitBreakerModal';
import { OfflineIndicator } from './components/OfflineIndicator';
import { OwnerGate } from './components/OwnerGate';
import { DeskAuthProvider, useDeskAuth } from './context/DeskAuthContext';
import { MultiUserDesk } from './components/MultiUserDesk';
import { FirebaseAuthModal } from './components/FirebaseAuthModal';
import { Radio, Eye, Shield } from 'lucide-react';

export default function App() {
  return (
    <DeskAuthProvider>
      <AppInner />
    </DeskAuthProvider>
  );
}

function AppInner() {
  const { currentSeat } = useDeskAuth();
  const [userRole, setUserRoleState] = useState<UserRole>(() => {
    try {
      return (localStorage.getItem('jarvis_user_role') as UserRole) || 'admin';
    } catch {
      return 'admin';
    }
  });

  const [gateOpen, setGateOpen] = useState<boolean>(false);

  const setUserRole = (role: UserRole) => {
    if (role === 'admin') {
      let hasToken = false;
      try { hasToken = !!localStorage.getItem('jarvis_owner_token'); } catch {}
      if (!hasToken) {
        setGateOpen(true);
        return;
      }
    }
    setUserRoleState(role);
    try {
      localStorage.setItem('jarvis_user_role', role);
    } catch {
      // ignore
    }
  };

  const handleGateSuccess = (token: string) => {
    try {
      localStorage.setItem('jarvis_owner_token', token);
      localStorage.setItem('jarvis_user_role', 'admin');
    } catch {
      // ignore
    }
    setUserRoleState('admin');
    setGateOpen(false);
  };

  const [activeTab, setActiveTab] = useState<ActiveTab>('quant_bot');
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [isCircuitBreakerOpen, setIsCircuitBreakerOpen] = useState<boolean>(false);
  const [systemAlertMessage, setSystemAlertMessage] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);

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
      if (e.key === 'c' || e.key === 'C') {
        setIsSidebarOpen((prev) => !prev);
      }
    };
    const handleOpenGate = () => setGateOpen(true);

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('jarvis:open-owner-gate', handleOpenGate);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('jarvis:open-owner-gate', handleOpenGate);
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
      const summary = `Good morning Sir. Live market telemetry is active. All autonomous risk circuits are armed and fully compliant with SEBI peak margin rules.`;
      const utterance = new SpeechSynthesisUtterance(summary);
      utterance.rate = 1.05;
      utterance.pitch = 0.95;

      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(v => v.lang.includes('en-GB') || v.name.includes('UK') || v.name.includes('Daniel'));
      if (preferredVoice) utterance.voice = preferredVoice;

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      window.speechSynthesis.speak(utterance);
    }
  };

  const handleExecuteCircuitBreaker = (tier: string) => {
    window.dispatchEvent(new CustomEvent('jarvis:circuit-breaker', {
      detail: { tier, timestamp: Date.now() }
    }));
    try {
      localStorage.setItem('jarvis_bots_armed_state', 'false');
    } catch {
      // Ignore
    }
    setSystemAlertMessage(`Statutory Circuit Breaker Routine [${tier.toUpperCase()}] executed. Portfolio delta neutralized across NSE/MCX.`);
    setTimeout(() => {
      setSystemAlertMessage(null);
    }, 6000);
  };

  return (
    <div className="min-h-screen bg-[#060913] text-slate-100 flex antialiased selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Fixed Left Sidebar: Only displayed in Admin / Operations mode, collapsible via 'c' or breadcrumb button */}
      {userRole === 'admin' && (
        <div 
          className={`fixed left-0 top-0 h-full z-50 transition-transform duration-300 ease-in-out ${
            isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <Sidebar 
            activeTab={activeTab} 
            setActiveTab={setActiveTab} 
            isOpen={isSidebarOpen}
            onToggle={() => setIsSidebarOpen(false)}
          />
        </div>
      )}

      {/* Main Workspace Frame (Smoothly offsets by 64 on desktop when in admin mode AND sidebar is open) */}
      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out ${
        userRole === 'admin' && isSidebarOpen ? 'lg:pl-64' : 'lg:pl-0'
      }`}>
        {/* Fixed Top Telemetry Ribbon Header with Role Switcher & Breadcrumb Toggle */}
        <Header
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isSpeaking={isSpeaking}
          onToggleVoiceBriefing={handleToggleVoiceBriefing}
          onOpenCircuitBreaker={() => setIsCircuitBreakerOpen(true)}
          userRole={userRole}
          setUserRole={setUserRole}
          isSidebarOpen={isSidebarOpen}
          onToggleSidebar={() => setIsSidebarOpen(prev => !prev)}
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
        <main className={`flex-1 w-full max-w-[1720px] mx-auto px-3.5 sm:px-6 pt-20 ${userRole === 'viewer' ? 'pb-8' : 'pb-24 lg:pb-8'}`}>
          {userRole === 'viewer' ? (
            /* VIEWER MODE: Clean, lightweight, instant, 100% authentic market numbers */
            <ViewerDashboard />
          ) : (
            /* OWNER / ADMIN MODE: Advanced operational quant desks, broker sync & risk engine */
            <>
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
                <AutonomousAgentsDesk onOpenCircuitBreaker={() => setIsCircuitBreakerOpen(true)} />
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

      {/* Mobile Bottom Navigation Bar (Operational tabs for Owner/Admin only) */}
      {userRole === 'admin' && (
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 h-16 bg-[#090e19]/95 backdrop-blur-2xl border-t border-cyan-500/20 shadow-[0_-4px_24px_rgba(0,0,0,0.8)] flex items-center justify-around px-2 font-mono">
          <div className="flex items-center justify-around w-full overflow-x-auto no-scrollbar py-1">
            <button
              onClick={() => setActiveTab('quant_bot')}
              className={`flex flex-col items-center justify-center min-w-[50px] h-12 rounded-xl transition-all ${
                activeTab === 'quant_bot'
                  ? 'text-cyan-300 bg-cyan-950/40 border border-cyan-500/40 font-bold'
                  : 'text-slate-400'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">monitoring</span>
              <span className="text-[8px] uppercase tracking-wider mt-0.5">Quant</span>
            </button>

            <button
              onClick={() => setActiveTab('autonomous_agents')}
              className={`flex flex-col items-center justify-center min-w-[50px] h-12 rounded-xl transition-all ${
                activeTab === 'autonomous_agents'
                  ? 'text-cyan-300 bg-cyan-950/40 border border-cyan-500/40 font-bold'
                  : 'text-slate-400'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">group_work</span>
              <span className="text-[8px] uppercase tracking-wider mt-0.5">5-Agents</span>
            </button>

            <button
              onClick={() => setActiveTab('equity_radar')}
              className={`flex flex-col items-center justify-center min-w-[50px] h-12 rounded-xl transition-all ${
                activeTab === 'equity_radar'
                  ? 'text-cyan-300 bg-cyan-950/40 border border-cyan-500/40 font-bold'
                  : 'text-slate-400'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">candlestick_chart</span>
              <span className="text-[8px] uppercase tracking-wider mt-0.5">Radar</span>
            </button>

            <button
              onClick={() => setActiveTab('risk_engine')}
              className={`flex flex-col items-center justify-center min-w-[50px] h-12 rounded-xl transition-all ${
                activeTab === 'risk_engine'
                  ? 'text-cyan-300 bg-cyan-950/40 border border-cyan-500/40 font-bold'
                  : 'text-slate-400'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">security</span>
              <span className="text-[8px] uppercase tracking-wider mt-0.5">Risk</span>
            </button>

            <button
              onClick={() => setActiveTab('sync_hub')}
              className={`flex flex-col items-center justify-center min-w-[50px] h-12 rounded-xl transition-all ${
                activeTab === 'sync_hub'
                  ? 'text-cyan-300 bg-cyan-950/40 border border-cyan-500/40 font-bold'
                  : 'text-slate-400'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">hub</span>
              <span className="text-[8px] uppercase tracking-wider mt-0.5">Sync</span>
            </button>

            <button
              onClick={() => setActiveTab('risk_guard')}
              className={`flex flex-col items-center justify-center min-w-[50px] h-12 rounded-xl transition-all ${
                activeTab === 'risk_guard'
                  ? 'text-cyan-300 bg-cyan-950/40 border border-cyan-500/40 font-bold'
                  : 'text-slate-400'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">gpp_maybe</span>
              <span className="text-[8px] uppercase tracking-wider mt-0.5">Guard</span>
            </button>

            <button
              onClick={() => setActiveTab('backtest_lab')}
              className={`flex flex-col items-center justify-center min-w-[50px] h-12 rounded-xl transition-all ${
                activeTab === 'backtest_lab'
                  ? 'text-cyan-300 bg-cyan-950/40 border border-cyan-500/40 font-bold'
                  : 'text-slate-400'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">query_stats</span>
              <span className="text-[8px] uppercase tracking-wider mt-0.5">Backtest</span>
            </button>

            <button
              onClick={() => setActiveTab('voice_hud')}
              className={`flex flex-col items-center justify-center min-w-[50px] h-12 rounded-xl transition-all ${
                activeTab === 'voice_hud'
                  ? 'text-cyan-300 bg-cyan-950/40 border border-cyan-500/40 font-bold'
                  : 'text-slate-400'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">mic</span>
              <span className="text-[8px] uppercase tracking-wider mt-0.5">Voice</span>
            </button>
          </div>
        </nav>
      )}

      {/* Circuit Breaker Modal */}
      <CircuitBreakerModal
        isOpen={isCircuitBreakerOpen}
        onClose={() => setIsCircuitBreakerOpen(false)}
        onExecuteBreaker={handleExecuteCircuitBreaker}
      />

      {/* Owner Access Gate (Phase 1) */}
      <OwnerGate isOpen={gateOpen} onClose={() => setGateOpen(false)} onSuccess={handleGateSuccess} />

      {/* Multi-User 20-Seat Firebase Auth & Seat Switch Modal */}
      <FirebaseAuthModal />

      {/* PWA Offline Network Indicator */}
      <OfflineIndicator />
    </div>
  );
}
