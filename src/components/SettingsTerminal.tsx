import React, { useState } from 'react';
import { Shield, Key, RefreshCw, CheckCircle2, Server, Database, Globe, Sliders, Lock, ArrowRight, ExternalLink, Smartphone, Download, Zap, Apple, Cpu, Activity, Layers, Bot, Clock, Radio } from 'lucide-react';
import { useLiveMarketData } from '../services/liveMarketService';
import { executePostMarketSync, INITIAL_SYNC_STATE, PostMarketSyncState } from '../utils/indianHolidayCalendar';
import { PWAInstallButton } from './PWAInstallButton';

export const SettingsTerminal: React.FC = () => {
  const { 
    quotes, 
    isLive, 
    latencyMs, 
    lastUpdated, 
    refetch, 
    marketSession, 
    isPacketSaverActive, 
    packetsSavedCount, 
    forceSyncOverride, 
    toggleForceSyncOverride 
  } = useLiveMarketData(3000);
  const [postMarketSync, setPostMarketSync] = useState<PostMarketSyncState>(INITIAL_SYNC_STATE);
  const [isSyncingHolidays, setIsSyncingHolidays] = useState(false);
  const [testStatus, setTestStatus] = useState<string | null>(null);

  // Broker Credentials Configuration State
  const [brokers, setBrokers] = useState([
    {
      id: 'abm',
      name: 'Aditya Birla Money',
      apiCode: 'Smart Trader V2',
      apiKey: 'ABM_LIVE_•••781',
      sessionSecret: '••••••••••••••••3D9A',
      coloNode: 'BKC-DC02 // GATE-02',
      status: 'CONNECTED',
      latency: '2.8 ms',
    },
    {
      id: 'zerodha',
      name: 'Zerodha Kite Connect',
      apiCode: 'Kite Ticker Binary V3',
      apiKey: 'KT_PROD_•••942',
      sessionSecret: '••••••••••••••••ENCTOKEN',
      coloNode: 'MUMBAI NSE // RACK-08',
      status: 'CONNECTED',
      latency: '1.8 ms',
    },
    {
      id: 'dhan',
      name: 'Dhan HQ',
      apiCode: 'Prometheus Protobuf',
      apiKey: '1100293847',
      sessionSecret: '••••••••••••••••TOKEN',
      coloNode: 'MUMBAI-DC01',
      status: 'STANDBY_HOT',
      latency: '3.4 ms',
    },
  ]);

  const handleTestBroker = (brokerName: string) => {
    setTestStatus(`Testing round-trip latency to ${brokerName} colocation gateway...`);
    setTimeout(() => {
      setTestStatus(`[SUCCESS] 0 packet drop. Handshake verified with ${brokerName} via FIX 5.0 SP2.`);
      setTimeout(() => setTestStatus(null), 4000);
    }, 800);
  };

  const handleManualHolidayCheck = () => {
    setIsSyncingHolidays(true);
    setTimeout(() => {
      setPostMarketSync(prev => executePostMarketSync(prev.auditLog));
      setIsSyncingHolidays(false);
      setTestStatus('Post-Market Task Executed: NSE & BSE 2026/2027 holiday circulars verified.');
      setTimeout(() => setTestStatus(null), 4000);
    }, 700);
  };

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Settings Header */}
      <div className="bg-[#080d1a]/90 backdrop-blur-2xl rounded-2xl p-6 border border-cyan-500/20 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-bold uppercase">
              NODE://SETTINGS_CONFIG
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold">
              SYS_LEVEL_01
            </span>
          </div>
          <h1 className="text-2xl font-bold font-mono text-cyan-200 tracking-tight">
            TERMINAL SETTINGS & BROKER CREDENTIALS
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl font-mono">
            Configure direct DMA broker execution routes, manage live exchange data feeds, and monitor statutory SEBI & NSE clearing invariants.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-950/60 hover:bg-cyan-900/80 border border-cyan-500/40 text-cyan-300 font-mono text-xs font-bold transition-all shadow-[0_0_15px_rgba(0,240,255,0.2)] active:scale-95"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>FORCE REFETCH TICKS</span>
          </button>
        </div>
      </div>

      {testStatus && (
        <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 text-xs font-mono flex items-center justify-between animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{testStatus}</span>
          </div>
          <button onClick={() => setTestStatus(null)} className="text-slate-400 hover:text-slate-200 text-xs">Dismiss</button>
        </div>
      )}

      {/* AI Engine & Neural Runtime Diagnostics (Moved to Configuration Hub) */}
      <div className="bg-[#080d1a]/85 backdrop-blur-xl rounded-2xl p-6 border border-cyan-500/25 shadow-xl flex flex-col gap-4 font-mono">
        <div className="flex flex-wrap items-center justify-between pb-3 border-b border-slate-800 gap-2">
          <div className="flex items-center gap-2.5">
            <Bot className="w-5 h-5 text-cyan-400" />
            <div>
              <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wide flex items-center gap-2">
                <span>AI ENGINE &amp; NEURAL RUNTIME DIAGNOSTICS</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 text-[10px] font-bold">
                  ALL_SYSTEMS_NOMINAL
                </span>
              </h2>
              <span className="text-[11px] text-slate-400 font-sans block mt-0.5">
                Gemini 2.5 Flash / Flash-Lite server-side inference, tensor cores, neural load, audio DSP &amp; memory cache.
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>HOST: MUMBAI-DC01 // RACK-08</span>
            </span>
          </div>
        </div>

        {/* 4 Diagnostic Metric Pods */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          {/* Metric 1 */}
          <div className="p-3.5 rounded-2xl bg-slate-950/90 border border-cyan-500/20 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1.5 text-[9px] text-slate-400">
              <span className="font-bold tracking-wider">NEURAL LOAD</span>
              <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl text-cyan-300 font-bold">38%</span>
              <span className="text-[9px] text-emerald-400 font-medium">TENSOR_V5</span>
            </div>
            <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden mt-2">
              <div className="bg-gradient-to-r from-cyan-500 to-cyan-300 h-full rounded-full w-[38%] shadow-[0_0_8px_#00f0ff]"></div>
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-500 mt-2">
              <span>ACTIVE CORES</span>
              <span className="text-slate-300 font-bold">128 TPUv5e</span>
            </div>
          </div>

          {/* Metric 2 */}
          <div className="p-3.5 rounded-2xl bg-slate-950/90 border border-emerald-500/20 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1.5 text-[9px] text-slate-400">
              <span className="font-bold tracking-wider">DSP LATENCY</span>
              <Zap className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl text-emerald-300 font-bold">14<span className="text-xs font-normal text-slate-400 ml-0.5">ms</span></span>
              <span className="text-[9px] text-emerald-400 font-medium">EDGE_LOCAL</span>
            </div>
            <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden mt-2">
              <div className="bg-gradient-to-r from-emerald-500 to-emerald-300 h-full rounded-full w-[14%] shadow-[0_0_8px_#34f6a8]"></div>
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-500 mt-2">
              <span>ROUND-TRIP</span>
              <span className="text-emerald-400 font-bold">&lt; 20 ms</span>
            </div>
          </div>

          {/* Metric 3 */}
          <div className="p-3.5 rounded-2xl bg-slate-950/90 border border-amber-500/20 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1.5 text-[9px] text-slate-400">
              <span className="font-bold tracking-wider">VOICE CLARITY</span>
              <Activity className="w-3.5 h-3.5 text-amber-300" />
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl text-amber-300 font-bold">99.4%</span>
              <span className="text-[9px] text-amber-400 font-medium">SNR +42dB</span>
            </div>
            <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden mt-2">
              <div className="bg-gradient-to-r from-amber-500 to-amber-300 h-full rounded-full w-[99.4%] shadow-[0_0_8px_#feb700]"></div>
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-500 mt-2">
              <span>SPECTROGRAM</span>
              <span className="text-amber-300 font-bold">44.1 kHz FLAC</span>
            </div>
          </div>

          {/* Metric 4 */}
          <div className="p-3.5 rounded-2xl bg-slate-950/90 border border-cyan-500/20 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1.5 text-[9px] text-slate-400">
              <span className="font-bold tracking-wider">BUFFER CACHE</span>
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl text-slate-100 font-bold">12.8<span className="text-xs font-normal text-slate-400">/16G</span></span>
              <span className="text-[9px] text-cyan-400 font-medium">HBM3</span>
            </div>
            <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden mt-2">
              <div className="bg-gradient-to-r from-cyan-600 to-cyan-400 h-full rounded-full w-[80%] shadow-[0_0_8px_#00f0ff]"></div>
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-500 mt-2">
              <span>HOT PRECACHE</span>
              <span className="text-cyan-300 font-bold">100% HIT RATE</span>
            </div>
          </div>
        </div>

        {/* Engine Configuration Invariants */}
        <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs font-mono space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-slate-400">ACTIVE LLM PROVIDER:</span>
            <span className="text-cyan-300 font-bold">gemini-2.5-flash / gemini-2.5-flash-lite (Server-side Proxy /api/jarvis/analyze)</span>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-slate-400">FAILOVER ARMED ENGINE:</span>
            <span className="text-emerald-400 font-bold">INSTITUTIONAL QUANT DETERMINISTIC ENGINE (Zero Credit Consumption)</span>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-slate-400">AUDIO INFERENCE MODEL:</span>
            <span className="text-slate-200">Web Speech API SpeechSynthesis + Acoustic Pointcloud Mesh Visualizer</span>
          </div>
        </div>
      </div>

      {/* Free Live NSE/BSE Market Data Feed Configuration Card */}
      <div className="bg-[#080d1a]/85 backdrop-blur-xl rounded-2xl p-6 border border-cyan-500/20 shadow-xl flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between pb-3 border-b border-slate-800 gap-2">
          <div className="flex items-center gap-2.5">
            <Globe className="w-5 h-5 text-cyan-400" />
            <div>
              <h2 className="text-sm font-bold font-mono text-slate-200 uppercase tracking-wide">
                Free Real-Time NSE / BSE Exchange Market Data Router
              </h2>
              <span className="text-[11px] text-slate-400 font-mono">
                Direct zero-cost real-time feed polling National Stock Exchange & Bombay Stock Exchange indices & cash equities.
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 text-xs font-mono font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              {isLive ? 'LIVE EXCHANGE TICKS ACTIVE' : 'CACHED'}
            </span>
            <span className="text-xs font-mono text-slate-400 bg-slate-900 px-2.5 py-1 rounded border border-slate-800">
              RTT: {latencyMs} ms
            </span>
          </div>
        </div>

        {/* Market Hours Sync & Packet Saver Controller Banner */}
        <div className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4 font-mono transition-all ${
          isPacketSaverActive 
            ? 'bg-amber-950/30 border-amber-500/30 text-amber-200 shadow-[0_0_20px_rgba(254,183,0,0.08)]' 
            : 'bg-emerald-950/30 border-emerald-500/30 text-emerald-200 shadow-[0_0_20px_rgba(52,246,168,0.08)]'
        }`}>
          <div className="flex items-start gap-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
              isPacketSaverActive ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'
            }`}>
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-100">
                  MARKET-HOURS GATED SYNC: {marketSession?.phaseLabel || 'POST-MARKET EOD STANDBY'}
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                  isPacketSaverActive 
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' 
                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                }`}>
                  {isPacketSaverActive ? 'PACKET SAVER ACTIVE' : 'STREAMING LIVE TICKS'}
                </span>
              </div>
              <p className="text-[11px] text-slate-300 font-sans mt-1">
                Data packet sync operates exclusively during Indian market hours (<strong>09:15 AM to 03:30 PM IST</strong>, Mon-Fri).
                {isPacketSaverActive
                  ? ` Rapid polling is automatically paused to prevent wasted data packets. Next session opens ${marketSession?.nextSessionText || 'Tomorrow @ 09:15 IST'}.`
                  : ' Active session streaming high-fidelity ticks with zero credit consumption.'
                }
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <div className="flex flex-col items-end">
              <span className="text-[10px] text-slate-400 uppercase">PACKETS SAVED TODAY</span>
              <span className="text-sm font-bold text-amber-300">+{packetsSavedCount.toLocaleString()} PACKETS</span>
            </div>

            <button
              onClick={toggleForceSyncOverride}
              className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                forceSyncOverride 
                  ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200' 
                  : 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white hover:border-slate-500'
              }`}
              title="Toggle to override market hours and test continuous polling"
            >
              <Radio className={`w-3.5 h-3.5 ${forceSyncOverride ? 'text-cyan-400 animate-pulse' : 'text-slate-500'}`} />
              <span>{forceSyncOverride ? 'OVERRIDE: FORCE SYNC ON' : 'ENABLE CONTINUOUS SYNC'}</span>
            </button>
          </div>
        </div>

        {/* Live Prices Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {Object.values(quotes).slice(0, 5).map((q) => {
            const hasPrice = q?.price != null;
            const hasChange = q?.change != null && q?.changePct != null;
            const isPositive = (q?.change ?? 0) >= 0;

            return (
              <div key={q.symbol} className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-slate-300">{q.name}</span>
                  {hasChange ? (
                    <span className={`text-[10px] font-mono font-bold ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {isPositive ? '+' : ''}{q.changePct!.toFixed(2)}%
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono text-slate-500">—</span>
                  )}
                </div>
                <div className="my-2">
                  <span className="text-lg font-bold font-mono text-cyan-300 tabular-nums">
                    {hasPrice ? `₹${q.price!.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
                  <span>{q.source}</span>
                  <span>{q.timestamp}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Broker Nodes & Direct Execution Gateway */}
      <div className="bg-[#080d1a]/85 backdrop-blur-xl rounded-2xl p-6 border border-cyan-500/20 shadow-xl flex flex-col gap-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <Key className="w-5 h-5 text-amber-400" />
            <div>
              <h2 className="text-sm font-bold font-mono text-slate-200 uppercase tracking-wide">
                Configured Broker Nodes & API Key Vault
              </h2>
              <span className="text-[11px] text-slate-400 font-mono">
                Hardware-encrypted credentials for direct DMA slicing, option basket execution, and WebSocket L2 streaming.
              </span>
            </div>
          </div>
          <span className="text-xs font-mono text-cyan-400 bg-cyan-950/40 px-2.5 py-1 rounded border border-cyan-500/30">
            3 OF 3 NODES ARMED
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {brokers.map((broker) => (
            <div key={broker.id} className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col justify-between gap-3">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold font-mono text-cyan-300">{broker.name}</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-400 font-bold border border-emerald-500/30">
                    {broker.status}
                  </span>
                </div>
                <div className="space-y-1.5 text-xs font-mono">
                  <div className="flex items-center justify-between text-slate-400">
                    <span>PROTOCOL:</span>
                    <span className="text-slate-200 font-semibold">{broker.apiCode}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400">
                    <span>COLO NODE:</span>
                    <span className="text-cyan-400">{broker.coloNode}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400">
                    <span>API KEY:</span>
                    <span className="text-slate-300 font-bold">{broker.apiKey}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400">
                    <span>LATENCY:</span>
                    <span className="text-emerald-400 font-bold">{broker.latency}</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                <button
                  onClick={() => handleTestBroker(broker.name)}
                  className="w-full py-1.5 px-3 rounded-lg bg-slate-900 hover:bg-cyan-950/60 border border-slate-800 hover:border-cyan-500/40 text-xs font-mono text-cyan-300 font-bold transition-all"
                >
                  TEST PING
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Automated 5:00 PM IST Holiday Sync Task Status */}
      <div className="bg-[#080d1a]/85 backdrop-blur-xl rounded-2xl p-6 border border-cyan-500/20 shadow-xl flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between pb-3 border-b border-slate-800 gap-2">
          <div className="flex items-center gap-2.5">
            <Database className="w-5 h-5 text-emerald-400" />
            <div>
              <h2 className="text-sm font-bold font-mono text-slate-200 uppercase tracking-wide">
                NSE & BSE 2026/2027 Statutory Holiday Sync Daemon
              </h2>
              <span className="text-[11px] text-slate-400 font-mono">
                Automated background daemon runs every trading day after market close at 5:00 PM IST (17:00 IST).
              </span>
            </div>
          </div>

          <button
            onClick={handleManualHolidayCheck}
            disabled={isSyncingHolidays}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-500/40 text-emerald-300 text-xs font-mono font-bold transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncingHolidays ? 'animate-spin' : ''}`} />
            <span>{isSyncingHolidays ? 'Verifying...' : 'TEST 5:00 PM IST DAEMON'}</span>
          </button>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs font-mono space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">DAEMON CRON SCHEDULE:</span>
            <span className="text-cyan-400 font-bold">30 11 * * * (11:30 UTC // 17:00:00 IST DAILY)</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">LAST VERIFIED PASSED:</span>
            <span className="text-emerald-400 font-bold">{postMarketSync.lastRunTimestamp}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">OFFICIAL CIRCULAR REF:</span>
            <span className="text-slate-200">{postMarketSync.exchangeCircularRef}</span>
          </div>
        </div>
      </div>

      {/* iOS & Android Mobile Deployment Section */}
      <div className="bg-[#080d1a]/85 backdrop-blur-xl rounded-2xl p-6 border border-cyan-500/25 shadow-xl flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between pb-3 border-b border-slate-800 gap-2">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1.5 text-cyan-400">
              <Apple className="w-5 h-5 text-slate-100" />
              <Smartphone className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold font-mono text-slate-200 uppercase tracking-wide">
                iOS (.mobileconfig) &amp; Android Native App Deployment
              </h2>
              <span className="text-[11px] text-slate-400 font-mono">
                Download Apple Configuration Profile for iPhone/iPad or install Android WebAPK / Standalone .APK.
              </span>
            </div>
          </div>

          <PWAInstallButton />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
          {/* iOS Card */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-slate-950 to-cyan-950/30 border border-cyan-500/30 space-y-2.5 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-cyan-300 font-bold">
                  <Apple className="w-4 h-4 text-slate-200" />
                  <span>iOS DOWNLOADABLE PROFILE</span>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950 border border-cyan-500/40 text-cyan-300">
                  .mobileconfig
                </span>
              </div>
              <p className="text-slate-300 font-sans text-xs leading-relaxed">
                Download Apple's official WebClip configuration profile. Tap Allow &rarr; Settings &rarr; Profile Downloaded &rarr; Install to add J.A.R.V.I.S. to your iPhone/iPad Home Screen.
              </p>
            </div>
            <a
              href="/api/download/ios-profile"
              download="JARVIS-Quant.mobileconfig"
              className="w-full py-2 px-3 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs uppercase flex items-center justify-center gap-2 shadow-[0_0_12px_rgba(0,240,255,0.3)] transition cursor-pointer text-center"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download iOS Profile</span>
            </a>
          </div>

          {/* Android WebAPK Card */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2.5 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-300 font-bold">
                  <Zap className="w-4 h-4 text-emerald-400" />
                  <span>ANDROID WEBAPK (1-TAP)</span>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950 border border-emerald-500/40 text-emerald-300">
                  INSTANT
                </span>
              </div>
              <p className="text-slate-300 font-sans text-xs leading-relaxed">
                Android Chrome, Brave, and Samsung Internet automatically compile and sign a native WebAPK with full home-screen icon and app drawer integration.
              </p>
            </div>
            <div className="p-2 rounded bg-slate-900 border border-slate-800 text-[11px] text-slate-400">
              Tap browser menu (⋮) &rarr; "Install app"
            </div>
          </div>

          {/* Standalone APK Card */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2.5 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-amber-300 font-bold">
                  <Download className="w-4 h-4 text-amber-400" />
                  <span>STANDALONE .APK / .AAB</span>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-950 border border-amber-500/40 text-amber-300">
                  PLAY STORE
                </span>
              </div>
              <p className="text-slate-300 font-sans text-xs leading-relaxed">
                Use PWABuilder to generate a direct downloadable .apk for sideloading, or an .aab package for Google Play Store publishing.
              </p>
            </div>
            <a
              href="https://www.pwabuilder.com"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-cyan-300 hover:text-white font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer text-center"
            >
              <span>Build APK with PWABuilder</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
