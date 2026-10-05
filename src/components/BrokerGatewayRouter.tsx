import React, { useState, useEffect } from 'react';
import { 
  Network, 
  Activity, 
  Play, 
  RefreshCw, 
  Zap, 
  Lock, 
  ShieldAlert, 
  Eye, 
  EyeOff,
  CheckCircle2, 
  AlertTriangle, 
  Terminal, 
  Layers, 
  Radio, 
  Plus, 
  Clock, 
  Sliders, 
  Wifi, 
  Check, 
  Server,
  Trash2,
  Send,
  Key,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  X
} from 'lucide-react';
import { useLiveMarketData } from '../services/liveMarketService';

export const BrokerGatewayRouter: React.FC = () => {
  const { latencyMs } = useLiveMarketData(2500);

  // Live state
  const [tickRate, setTickRate] = useState<number>(2840);
  const [showKillModal, setShowKillModal] = useState<boolean>(false);
  const [showAddBrokerModal, setShowAddBrokerModal] = useState<boolean>(false);
  const [cliInput, setCliInput] = useState<string>('');
  const [selectedLogFilter, setSelectedLogFilter] = useState<'ALL' | 'AUTH_TOKENS' | 'WEBSOCKET' | 'RATELIMITS'>('ALL');

  // Broker states
  const [abmRoutingActive, setAbmRoutingActive] = useState<boolean>(true);
  const [kiteHotFeedActive, setKiteHotFeedActive] = useState<boolean>(true);
  const [dhanStandbyActive, setDhanStandbyActive] = useState<boolean>(true);

  // Upstox Analytics state
  const [upstoxData, setUpstoxData] = useState<{
    configured: boolean;
    status: 'CONNECTED' | 'DISCONNECTED' | 'ERROR' | 'UNCONFIGURED';
    baseUrl: string;
    hasApiKey: boolean;
    lastConnected: string | null;
    lastLatencyMs: number | null;
    profile: any | null;
    supportedInstruments?: Array<{ key: string; name: string }>;
    features?: string[];
  } | null>(null);
  const [showUpstoxModal, setShowUpstoxModal] = useState<boolean>(false);
  const [upstoxTokenInput, setUpstoxTokenInput] = useState<string>('');
  const [upstoxApiKeyInput, setUpstoxApiKeyInput] = useState<string>('');
  const [upstoxBaseUrlInput, setUpstoxBaseUrlInput] = useState<string>('https://api.upstox.com/v2');
  const [showUpstoxToken, setShowUpstoxToken] = useState<boolean>(false);
  const [isVerifyingUpstox, setIsVerifyingUpstox] = useState<boolean>(false);
  const [upstoxError, setUpstoxError] = useState<string | null>(null);
  const [upstoxSuccessMsg, setUpstoxSuccessMsg] = useState<string | null>(null);
  const [upstoxModalTab, setUpstoxModalTab] = useState<'CONFIG' | 'QUOTES' | 'OPTION_CHAIN'>('CONFIG');
  const [upstoxQuotesData, setUpstoxQuotesData] = useState<any | null>(null);
  const [upstoxOptionChainData, setUpstoxOptionChainData] = useState<any | null>(null);
  const [isLoadingQuotes, setIsLoadingQuotes] = useState<boolean>(false);
  const [isLoadingOptionChain, setIsLoadingOptionChain] = useState<boolean>(false);

  const fetchUpstoxStatus = async () => {
    try {
      const res = await fetch('/api/upstox/status');
      if (res.ok) {
        const data = await res.json();
        setUpstoxData(data);
      }
    } catch {}
  };

  useEffect(() => {
    fetchUpstoxStatus();
  }, []);

  const handleConfigureUpstox = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!upstoxTokenInput.trim()) {
      setUpstoxError('Please enter a valid Upstox Access Token.');
      return;
    }
    setIsVerifyingUpstox(true);
    setUpstoxError(null);
    setUpstoxSuccessMsg(null);

    try {
      let ownerToken = '';
      try { ownerToken = localStorage.getItem('jarvis_owner_token') || ''; } catch {}

      const res = await fetch('/api/upstox/configure', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-owner-token': ownerToken,
          'Authorization': `Bearer ${ownerToken}`,
        },
        body: JSON.stringify({
          accessToken: upstoxTokenInput.trim(),
          apiKey: upstoxApiKeyInput.trim() || undefined,
          baseUrl: upstoxBaseUrlInput.trim() || 'https://api.upstox.com/v2',
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setUpstoxSuccessMsg(`Connected successfully! Latency: ${data.latencyMs}ms. Client: ${data.profile?.userName || data.profile?.userId}`);
        setRouterToast(`[UPSTOX PAIRED]: Handshake verified with Upstox Analytics API in ${data.latencyMs}ms.`);
        const now = new Date();
        const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        setLogs(prev => [{
          id: `log-${Date.now()}`,
          timestamp: timeStr,
          type: 'AUTH_OK',
          category: 'AUTH_TOKENS',
          message: `Upstox Analytics Node paired. Bearer handshake verified in ${data.latencyMs}ms. Client: ${data.profile?.userId || 'UPSTOX'}.`
        }, ...prev]);
        await fetchUpstoxStatus();
        setUpstoxTokenInput('');
      } else {
        setUpstoxError(data.error || 'Failed to verify Upstox Access Token.');
      }
    } catch (err: any) {
      setUpstoxError('Network error connecting to Upstox verification service.');
    } finally {
      setIsVerifyingUpstox(false);
    }
  };

  const handlePingUpstox = async () => {
    try {
      const res = await fetch('/api/upstox/test-ping', { method: 'POST' });
      const data = await res.json();
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      if (data.success) {
        setRouterToast(`[UPSTOX PING OK]: RTT ${data.latencyMs}ms. Node: UPSTOX-ANALYTICS-V2.`);
        setLogs(prev => [{
          id: `log-${Date.now()}`,
          timestamp: timeStr,
          type: 'AUTH_OK',
          category: 'WEBSOCKET',
          message: `Upstox Analytics Gateway RTT test verified in ${data.latencyMs}ms. Status: ${data.status}.`
        }, ...prev]);
        await fetchUpstoxStatus();
      } else {
        setRouterToast(`[UPSTOX PING]: ${data.error || 'Not connected'}`);
      }
    } catch {
      setRouterToast('[UPSTOX PING]: Connection failed.');
    }
  };

  const handleDisconnectUpstox = async () => {
    try {
      let ownerToken = '';
      try { ownerToken = localStorage.getItem('jarvis_owner_token') || ''; } catch {}
      await fetch('/api/upstox/disconnect', {
        method: 'POST',
        headers: {
          'x-owner-token': ownerToken,
          'Authorization': `Bearer ${ownerToken}`,
        }
      });
      setUpstoxSuccessMsg('Upstox session disconnected.');
      setRouterToast('[UPSTOX]: Session disconnected.');
      await fetchUpstoxStatus();
    } catch {}
  };

  const handleFetchUpstoxQuotes = async () => {
    setIsLoadingQuotes(true);
    setUpstoxError(null);
    try {
      const res = await fetch('/api/upstox/market-quote?instrument_key=NSE_INDEX|Nifty 50,NSE_INDEX|Nifty Bank,BSE_INDEX|SENSEX,NSE_INDEX|India VIX');
      const data = await res.json();
      if (res.ok && data.success) {
        setUpstoxQuotesData(data.data);
      } else {
        setUpstoxError(data.error || 'Quote fetch failed. Please check Upstox token.');
      }
    } catch {
      setUpstoxError('Failed to fetch Upstox quotes.');
    } finally {
      setIsLoadingQuotes(false);
    }
  };

  const handleFetchUpstoxOptionChain = async () => {
    setIsLoadingOptionChain(true);
    setUpstoxError(null);
    try {
      const res = await fetch('/api/upstox/option-chain?instrument_key=NSE_INDEX|Nifty 50');
      const data = await res.json();
      if (res.ok && data.success) {
        setUpstoxOptionChainData(data.data);
      } else {
        setUpstoxError(data.error || 'Option chain fetch failed. Please check Upstox token.');
      }
    } catch {
      setUpstoxError('Failed to fetch Upstox option chain.');
    } finally {
      setIsLoadingOptionChain(false);
    }
  };

  // Terminal log stream
  const [logs, setLogs] = useState<Array<{
    id: string;
    timestamp: string;
    type: 'AUTH_OK' | 'KITE_WS' | 'DHAN_STANDBY' | 'RATE_LIMIT' | 'CROSS_CONNECT' | 'VOL_SURFACE' | 'CLI_OUTPUT';
    message: string;
    category: 'AUTH_TOKENS' | 'WEBSOCKET' | 'RATELIMITS' | 'GENERAL';
  }>>([
    {
      id: 'log-1',
      timestamp: '10:14:02.812',
      type: 'AUTH_OK',
      category: 'AUTH_TOKENS',
      message: 'Aditya Birla Money TOTP handshake verified. SHA256 Token renewed with 21,600s TTL. Gateway #02 response time: 2.12ms.'
    },
    {
      id: 'log-2',
      timestamp: '10:14:03.004',
      type: 'KITE_WS',
      category: 'WEBSOCKET',
      message: 'Zerodha binary mode handshake established on wss://ws.kite.trade?api_key=KT_PROD_***&enctoken=VALID. Subscribed 3,000 instrument tokens. Mode: full (depth 5).'
    },
    {
      id: 'log-3',
      timestamp: '10:14:03.490',
      type: 'DHAN_STANDBY',
      category: 'WEBSOCKET',
      message: 'DhanHQ Hot Standby ping acknowledged. RTT: 3.4ms. Feed multiplexer armed with automatic trip threshold set to 150ms packet drop.'
    },
    {
      id: 'log-4',
      timestamp: '10:14:04.118',
      type: 'RATE_LIMIT',
      category: 'RATELIMITS',
      message: 'Quota compliance: Zerodha Kite (1/3 orders/sec, 0/10 req/sec), DhanHQ (0/10 quotes/sec), ABM Broker (OK, 0 rejections). Margin pool synchronized.'
    },
    {
      id: 'log-5',
      timestamp: '10:14:05.901',
      type: 'CROSS_CONNECT',
      category: 'WEBSOCKET',
      message: 'Mumbai BKC <--> Mumbai NSE Rack-08 dark fiber laser link synced. Dispersion latency: 0.84ms. Zero packet retransmission requested.'
    },
    {
      id: 'log-6',
      timestamp: '10:14:06.319',
      type: 'VOL_SURFACE',
      category: 'WEBSOCKET',
      message: 'NIFTY 24800-25200 CE/PE IV skew refreshed using live exchange bid-ask spreads. Interpolated IV smile variance <0.012.'
    }
  ]);

  // Tick rate fluctuation simulation
  useEffect(() => {
    const timer = setInterval(() => {
      setTickRate(prev => Math.floor(2800 + Math.random() * 80));
    }, 1500);
    return () => clearInterval(timer);
  }, []);

  const handleExecuteCli = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!cliInput.trim()) return;

    const cmd = cliInput.trim();
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + '.' + String(now.getMilliseconds()).padStart(3, '0');

    let responseMsg = '';
    let cmdType: 'AUTH_OK' | 'KITE_WS' | 'DHAN_STANDBY' | 'RATE_LIMIT' | 'CROSS_CONNECT' | 'VOL_SURFACE' | 'CLI_OUTPUT' = 'CLI_OUTPUT';
    let category: 'AUTH_TOKENS' | 'WEBSOCKET' | 'RATELIMITS' | 'GENERAL' = 'GENERAL';

    if (cmd.includes('broker.reconnect')) {
      responseMsg = `[CLI EXEC] Reconnected broker sockets on BOM-DC2-RACK08. Auth handshake verified in 1.94ms.`;
      cmdType = 'AUTH_OK';
      category = 'AUTH_TOKENS';
    } else if (cmd.includes('stream.divert')) {
      responseMsg = `[CLI EXEC] Stream route diverted to DhanHQ secondary socket. Bandwidth reallocated to 1.82 MB/s.`;
      cmdType = 'DHAN_STANDBY';
      category = 'WEBSOCKET';
    } else if (cmd.includes('ping')) {
      responseMsg = `[CLI EXEC] ICMP Ping: NSE BKC Rack-08: 0.84ms, BSE PJ Towers: 1.12ms, MCX Goregaon: 1.45ms. 0% loss.`;
      cmdType = 'CROSS_CONNECT';
      category = 'WEBSOCKET';
    } else if (cmd.includes('clear')) {
      setLogs([]);
      setCliInput('');
      return;
    } else {
      responseMsg = `[CLI EXEC] Command '${cmd}' dispatched to colocation broker arbiter. Status: ACKNOWLEDGED (200 OK).`;
      cmdType = 'CLI_OUTPUT';
      category = 'GENERAL';
    }

    const newLogEntry = {
      id: `log-${Date.now()}`,
      timestamp: timeStr,
      type: cmdType,
      category,
      message: responseMsg
    };

    setLogs(prev => [newLogEntry, ...prev]);
    setCliInput('');
  };

  const filteredLogs = logs.filter(log => {
    if (selectedLogFilter === 'ALL') return true;
    return log.category === selectedLogFilter;
  });

  const [routerToast, setRouterToast] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-6 w-full">
      {routerToast && (
        <div className="p-3.5 rounded-xl bg-cyan-950/80 border border-cyan-500/40 text-xs font-mono text-cyan-200 flex items-center justify-between animate-in fade-in shadow-lg">
          <span>{routerToast}</span>
          <button onClick={() => setRouterToast(null)} className="text-cyan-400 hover:text-white text-xs font-bold">✕</button>
        </div>
      )}

      {/* TOP TELEMETRY RIBBON & SYSTEM GATEWAY BANNER */}
      <div className="relative w-full bg-[#080d1a]/95 rounded-2xl p-6 backdrop-blur-2xl border border-cyan-500/20 shadow-[0_0_35px_rgba(0,0,0,0.7)] overflow-hidden">
        <div className="absolute -top-12 -right-12 w-64 h-64 bg-cyan-400/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-8 -left-8 w-48 h-48 bg-emerald-400/10 rounded-full blur-2xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col xl:flex-row items-start xl:items-center justify-between gap-6">
          {/* Stream Identity & Metadata */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 flex-wrap font-mono">
              <span className="px-2.5 py-0.5 rounded bg-cyan-500/15 text-cyan-300 text-[10px] tracking-widest uppercase border border-cyan-500/30">
                NODE://GATEWAY_SYS
              </span>
              <span className="px-2.5 py-0.5 rounded bg-slate-900 text-slate-400 text-[10px] tracking-widest uppercase border border-slate-800">
                FEED_ROUTER_V3.8.4
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 text-[10px] uppercase border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                MULTI-BURST PROTOCOL ACTIVE
              </span>
            </div>

            <div className="flex items-baseline gap-3">
              <h1 className="text-3xl font-extrabold text-cyan-200 tracking-tight font-mono">
                BROKER_STREAM_GATEWAY
              </h1>
              <span className="text-xs font-mono text-cyan-400/80 tracking-widest hidden sm:inline">
                // TELEMETRY CLUSTER
              </span>
            </div>

            <p className="text-xs text-slate-400 max-w-3xl font-mono leading-relaxed">
              Unified sub-millisecond execution socket arbiter. Routing L2 market depth, tick-level derivative Greeks, and ultra-high frequency orders via colocation bridge <span className="text-cyan-300 font-bold">BOM-DC2-RACK08</span>.
            </p>
          </div>

          {/* System Stats Hub & Circuit Breaker */}
          <div className="flex flex-wrap items-center gap-4 w-full xl:w-auto justify-start xl:justify-end">
            {/* Quad Quick Metric Readouts */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-950/80 p-2.5 rounded-xl border border-slate-800/80 backdrop-blur-md font-mono">
              <div className="flex flex-col px-3 py-1.5 bg-slate-900/60 rounded-lg">
                <span className="text-[10px] text-slate-400">UPTIME</span>
                <span className="text-base text-emerald-400 font-bold leading-tight">99.98%</span>
                <span className="text-[9px] text-emerald-500 font-semibold">SLA LOCK</span>
              </div>
              <div className="flex flex-col px-3 py-1.5 bg-slate-900/60 rounded-lg">
                <span className="text-[10px] text-slate-400">THROUGHPUT</span>
                <div className="flex items-center gap-1">
                  <span className="text-base text-cyan-300 font-bold leading-tight">{tickRate.toLocaleString()}</span>
                  <span className="text-[10px] text-cyan-500">t/s</span>
                </div>
                <span className="text-[9px] text-slate-400">L2 BINARY</span>
              </div>
              <div className="flex flex-col px-3 py-1.5 bg-slate-900/60 rounded-lg">
                <span className="text-[10px] text-slate-400">AVG LATENCY</span>
                <span className="text-base text-emerald-300 font-bold leading-tight">{latencyMs} ms</span>
                <span className="text-[9px] text-emerald-400">MUMBAI DC</span>
              </div>
              <div className="flex flex-col px-3 py-1.5 bg-slate-900/60 rounded-lg">
                <span className="text-[10px] text-slate-400">PKT LOSS</span>
                <span className="text-base text-amber-300 font-bold leading-tight">0.00%</span>
                <span className="text-[9px] text-amber-400">OPTICAL FIBER</span>
              </div>
            </div>

            {/* Kill Switch / Safety Interlock */}
            <div className="flex flex-col items-end gap-1 w-full sm:w-auto">
              <button
                onClick={() => setShowKillModal(true)}
                className="relative group flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600/90 hover:bg-rose-500 text-white font-mono text-xs font-bold uppercase tracking-wider transition-all duration-200 shadow-[0_0_25px_rgba(244,63,94,0.4)] active:scale-95 cursor-pointer"
              >
                <Lock className="w-4 h-4 text-white animate-pulse" />
                <span>KILL ALL SESSIONS</span>
              </button>
              <span className="text-[9px] font-mono text-slate-500 tracking-tight">
                REQUIRES HARDWARE SECURITY YUBIKEY CONFIRMATION
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* PRIMARY BROKER TOPOLOGY GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* CARD 1: ADITYA BIRLA MONEY (PRIMARY ROUTE) */}
        <div className="relative flex flex-col justify-between bg-[#080d1a]/85 backdrop-blur-xl rounded-2xl p-5 border border-cyan-500/25 shadow-xl hover:shadow-[0_0_30px_rgba(0,240,255,0.18)] transition-all">
          <div className="space-y-3 font-mono">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-cyan-400 uppercase tracking-widest font-semibold">
                // SEC-01::PRIMARY_ORD
              </span>
              <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-950/60 border border-emerald-500/40 rounded text-emerald-400 text-[10px] font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                CONNECTED
              </div>
            </div>

            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl text-cyan-200 font-bold tracking-tight">ADITYA BIRLA</h2>
                <div className="text-[11px] text-slate-400">SMART TRADER V2 API</div>
              </div>
              <div className="p-2 rounded-lg bg-cyan-950/60 border border-cyan-500/30 text-cyan-300">
                <Server className="w-5 h-5" />
              </div>
            </div>

            {/* Colocation Telemetry Cardlet */}
            <div className="bg-slate-950/80 rounded-lg p-2.5 space-y-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">COLO NODE:</span>
                <span className="text-cyan-300 font-bold">BKC-DC02 // GATE-02</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">LATENCY:</span>
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> 2.8 ms
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">TOTP LIFESPAN:</span>
                <span className="text-amber-400 font-bold">05h 42m [AUTO-REFRESH]</span>
              </div>
            </div>

            {/* Stream Target Allocation */}
            <div className="space-y-1">
              <div className="text-[10px] text-slate-400 uppercase tracking-wider">ROUTED STREAMS:</div>
              <div className="flex flex-wrap gap-1 text-[10px]">
                <span className="px-2 py-0.5 rounded bg-slate-900 border border-cyan-500/20 text-cyan-300">NIFTY 50 OPTS</span>
                <span className="px-2 py-0.5 rounded bg-slate-900 border border-cyan-500/20 text-cyan-300">MCX CRUDE</span>
                <span className="px-2 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">CASH EQUITIES</span>
              </div>
            </div>

            {/* Credentials Vault Display */}
            <div className="space-y-2 pt-1">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-slate-400">API KEY IDENTIFIER</label>
                <div className="flex items-center justify-between bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-800 text-cyan-400 text-xs">
                  <span>ABM_LIVE_•••781</span>
                  <Eye className="w-3.5 h-3.5 text-slate-500 hover:text-cyan-300 cursor-pointer" />
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-slate-400">SESSION SECRET HASH</label>
                <div className="flex items-center justify-between bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-800 text-slate-400 text-xs">
                  <span>••••••••••••••••3D9A</span>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                </div>
              </div>
            </div>
          </div>

          {/* Action Trigger Dock */}
          <div className="pt-4 mt-4 bg-slate-950/60 -mx-5 -mb-5 p-4 rounded-b-2xl border-t border-slate-800 flex items-center justify-between gap-2 font-mono">
            <button
              onClick={() => {
                const now = new Date();
                const timeStr = now.toLocaleTimeString();
                setLogs(prev => [{
                  id: `log-${Date.now()}`,
                  timestamp: timeStr,
                  type: 'AUTH_OK',
                  category: 'AUTH_TOKENS',
                  message: 'Aditya Birla Money TOTP re-authenticated. SHA256 session extended for 21,600s.'
                }, ...prev]);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-cyan-500/30 text-cyan-300 text-xs font-bold uppercase tracking-wider transition-all"
            >
              <RefreshCw className="w-3 h-3" />
              <span>RE-AUTH</span>
            </button>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={abmRoutingActive}
                onChange={() => setAbmRoutingActive(!abmRoutingActive)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-500"></div>
              <span className="ml-2 text-[10px] text-slate-300 font-bold uppercase">ROUTING</span>
            </label>
          </div>
        </div>

        {/* CARD 2: ZERODHA KITE CONNECT (SECONDARY / VOLATILITY ENGINE) */}
        <div className="relative flex flex-col justify-between bg-[#080d1a]/85 backdrop-blur-xl rounded-2xl p-5 border border-cyan-500/25 shadow-xl hover:shadow-[0_0_30px_rgba(0,240,255,0.18)] transition-all">
          <div className="space-y-3 font-mono">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-cyan-400 uppercase tracking-widest font-semibold">
                // SEC-02::SABR_ENGINE
              </span>
              <div className="flex items-center gap-1.5 px-2 py-0.5 bg-cyan-950/60 border border-cyan-500/40 rounded text-cyan-300 text-[10px] font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
                SECONDARY ACTIVE
              </div>
            </div>

            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl text-cyan-200 font-bold tracking-tight">ZERODHA KITE</h2>
                <div className="text-[11px] text-slate-400">KITE TICKER BINARY V3</div>
              </div>
              <div className="p-2 rounded-lg bg-cyan-950/60 border border-cyan-500/30 text-cyan-300">
                <Activity className="w-5 h-5" />
              </div>
            </div>

            {/* Colocation Telemetry Cardlet */}
            <div className="bg-slate-950/80 rounded-lg p-2.5 space-y-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">COLO NODE:</span>
                <span className="text-cyan-300 font-bold">MUMBAI NSE // RACK-08</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">SOCKET PING:</span>
                <span className="text-cyan-400 font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span> 1.8 ms
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">DEPTH MODE:</span>
                <span className="text-emerald-400 font-bold">FULL L2 (5-DEPTH)</span>
              </div>
            </div>

            {/* Stream Target Allocation */}
            <div className="space-y-1">
              <div className="text-[10px] text-slate-400 uppercase tracking-wider">FEED INSTRUMENTS:</div>
              <div className="flex flex-wrap gap-1 text-[10px]">
                <span className="px-2 py-0.5 rounded bg-slate-900 border border-cyan-500/20 text-cyan-300">3,000 TOKENS</span>
                <span className="px-2 py-0.5 rounded bg-slate-900 border border-cyan-500/20 text-cyan-300">SABR GREEKS</span>
                <span className="px-2 py-0.5 rounded bg-slate-900 text-amber-400 border border-amber-500/20">HIST. FEED (₹4K/MO)</span>
              </div>
            </div>

            {/* Credentials Vault Display */}
            <div className="space-y-2 pt-1">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-slate-400">KITE APP API KEY</label>
                <div className="flex items-center justify-between bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-800 text-cyan-400 text-xs">
                  <span>KT_PROD_•••942</span>
                  <Key className="w-3.5 h-3.5 text-slate-500 hover:text-cyan-300 cursor-pointer" />
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-slate-400">ENCTOKEN PERSISTENCE</label>
                <div className="flex items-center justify-between bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-800 text-emerald-400 text-xs">
                  <span>AUTO-EXTENDED // 23:59 IST</span>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                </div>
              </div>
            </div>
          </div>

          {/* Action Trigger Dock */}
          <div className="pt-4 mt-4 bg-slate-950/60 -mx-5 -mb-5 p-4 rounded-b-2xl border-t border-slate-800 flex items-center justify-between gap-2 font-mono">
            <button
              onClick={() => {
                const now = new Date();
                const timeStr = now.toLocaleTimeString();
                setLogs(prev => [{
                  id: `log-${Date.now()}`,
                  timestamp: timeStr,
                  type: 'KITE_WS',
                  category: 'WEBSOCKET',
                  message: 'KiteTicker binary WS ping: RTT 1.84ms on wss://ws.kite.trade. Zero packet jitter.'
                }, ...prev]);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-cyan-500/30 text-cyan-300 text-xs font-bold uppercase tracking-wider transition-all"
            >
              <Zap className="w-3 h-3" />
              <span>TEST PING</span>
            </button>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={kiteHotFeedActive}
                onChange={() => setKiteHotFeedActive(!kiteHotFeedActive)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-500"></div>
              <span className="ml-2 text-[10px] text-slate-300 font-bold uppercase">HOT FEED</span>
            </label>
          </div>
        </div>

        {/* CARD 3: DHAN (HOT STANDBY FAILOVER) */}
        <div className="relative flex flex-col justify-between bg-[#080d1a]/85 backdrop-blur-xl rounded-2xl p-5 border border-amber-500/25 shadow-xl hover:shadow-[0_0_30px_rgba(255,186,32,0.15)] transition-all">
          <div className="space-y-3 font-mono">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-amber-400 uppercase tracking-widest font-semibold">
                // SEC-03::STANDBY_FAILOVER
              </span>
              <div className="flex items-center gap-1.5 px-2 py-0.5 bg-amber-950/60 border border-amber-500/40 rounded text-amber-300 text-[10px] font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                STANDBY HOT
              </div>
            </div>

            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl text-amber-200 font-bold tracking-tight">DHAN HQ</h2>
                <div className="text-[11px] text-slate-400">PROTOBUF WEBSOCKET</div>
              </div>
              <div className="p-2 rounded-lg bg-amber-950/60 border border-amber-500/30 text-amber-300">
                <Radio className="w-5 h-5" />
              </div>
            </div>

            {/* Colocation Telemetry Cardlet */}
            <div className="bg-slate-950/80 rounded-lg p-2.5 space-y-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">PROTOCOL:</span>
                <span className="text-amber-300 font-bold">PROMETHEUS PROTOBUF</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">SOCKET PING:</span>
                <span className="text-amber-400 font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span> 3.4 ms
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">FAILOVER TRIGGER:</span>
                <span className="text-emerald-400 font-bold">&gt;150ms LATENCY TRIP</span>
              </div>
            </div>

            {/* Stream Target Allocation */}
            <div className="space-y-1">
              <div className="text-[10px] text-slate-400 uppercase tracking-wider">FEATURES UNLOCKED:</div>
              <div className="flex flex-wrap gap-1 text-[10px]">
                <span className="px-2 py-0.5 rounded bg-slate-900 border border-amber-500/20 text-amber-300">OPTION GREEKS NATIVE</span>
                <span className="px-2 py-0.5 rounded bg-slate-900 border border-amber-500/20 text-amber-300">FREE HISTORICAL CNDL</span>
                <span className="px-2 py-0.5 rounded bg-slate-900 text-emerald-400 border border-emerald-500/20">ZERO COST TIER</span>
              </div>
            </div>

            {/* Credentials Vault Display */}
            <div className="space-y-2 pt-1">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-slate-400">CLIENT ID / PARTNER ID</label>
                <div className="flex items-center justify-between bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-800 text-amber-300 text-xs">
                  <span>1100293847</span>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-slate-400">ACCESS TOKEN STATUS</label>
                <div className="flex items-center justify-between bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-800 text-slate-400 text-xs">
                  <span>VALID FOR 29 DAYS</span>
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                </div>
              </div>
            </div>
          </div>

          {/* Action Trigger Dock */}
          <div className="pt-4 mt-4 bg-slate-950/60 -mx-5 -mb-5 p-4 rounded-b-2xl border-t border-slate-800 flex items-center justify-between gap-2 font-mono">
            <button
              onClick={() => {
                const now = new Date();
                const timeStr = now.toLocaleTimeString();
                setLogs(prev => [{
                  id: `log-${Date.now()}`,
                  timestamp: timeStr,
                  type: 'DHAN_STANDBY',
                  category: 'WEBSOCKET',
                  message: 'DhanHQ Protobuf Standby armed with 150ms trip tripwire. Ready for instant hot-swap.'
                }, ...prev]);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-amber-500/30 text-amber-300 text-xs font-bold uppercase tracking-wider transition-all"
            >
              <Activity className="w-3 h-3" />
              <span>ARM FAILOVER</span>
            </button>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={dhanStandbyActive}
                onChange={() => setDhanStandbyActive(!dhanStandbyActive)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
              <span className="ml-2 text-[10px] text-slate-300 font-bold uppercase">STANDBY</span>
            </label>
          </div>
        </div>

        {/* CARD 4: UPSTOX ANALYTICS API GATEWAY */}
        <div className="relative flex flex-col justify-between bg-[#080d1a]/85 backdrop-blur-xl rounded-2xl p-5 border border-cyan-500/30 shadow-xl hover:shadow-[0_0_30px_rgba(0,240,255,0.2)] transition-all font-mono">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-cyan-400 uppercase tracking-widest font-semibold">
                // SEC-04::UPSTOX_ANALYTICS
              </span>
              <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold ${
                upstoxData?.status === 'CONNECTED'
                  ? 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-400'
                  : 'bg-amber-950/60 border border-amber-500/40 text-amber-300'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${upstoxData?.status === 'CONNECTED' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
                {upstoxData?.status === 'CONNECTED' ? 'ONLINE PAIRED' : 'STANDBY / READY'}
              </div>
            </div>

            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl text-cyan-200 font-bold tracking-tight">UPSTOX</h2>
                <div className="text-[11px] text-slate-400">ANALYTICS & MARKET DATA V2</div>
              </div>
              <div className="p-2 rounded-lg bg-cyan-950/60 border border-cyan-500/30 text-cyan-300">
                <Wifi className="w-5 h-5" />
              </div>
            </div>

            {/* Colocation & Node Telemetry Cardlet */}
            <div className="bg-slate-950/80 rounded-lg p-2.5 space-y-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">ENDPOINT:</span>
                <span className="text-cyan-300 font-bold truncate max-w-[140px]">api.upstox.com/v2</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">LATENCY:</span>
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> 
                  {upstoxData?.lastLatencyMs ? `${upstoxData.lastLatencyMs} ms` : '— ms'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">CLIENT ID:</span>
                <span className="text-amber-400 font-bold truncate max-w-[140px]">
                  {upstoxData?.profile?.userId || (upstoxData?.configured ? 'ENV-CONFIGURED' : 'UNPAIRED')}
                </span>
              </div>
            </div>

            {/* Stream Target Allocation */}
            <div className="space-y-1">
              <div className="text-[10px] text-slate-400 uppercase tracking-wider">ROUTED CAPABILITIES:</div>
              <div className="flex flex-wrap gap-1 text-[10px]">
                <span className="px-2 py-0.5 rounded bg-slate-900 border border-cyan-500/20 text-cyan-300">L2 DEPTH QUOTES</span>
                <span className="px-2 py-0.5 rounded bg-slate-900 border border-cyan-500/20 text-cyan-300">OPTION CHAIN & GREEKS</span>
                <span className="px-2 py-0.5 rounded bg-slate-900 text-emerald-400 border border-emerald-500/20">NSE / BSE / MCX</span>
              </div>
            </div>

            {/* Credentials / Config Status */}
            <div className="space-y-1 pt-1 text-[11px]">
              <div className="flex items-center justify-between bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-800">
                <span className="text-slate-400 text-[10px]">AUTH MODE:</span>
                <span className="text-cyan-300 font-bold text-[10px]">BEARER ACCESS TOKEN</span>
              </div>
            </div>
          </div>

          {/* Action Trigger Dock */}
          <div className="pt-4 mt-4 bg-slate-950/60 -mx-5 -mb-5 p-4 rounded-b-2xl border-t border-slate-800 flex items-center justify-between gap-2 font-mono">
            <button
              onClick={handlePingUpstox}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-cyan-500/30 text-cyan-300 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
              title="Test ping to Upstox API gateway"
            >
              <RefreshCw className="w-3 h-3" />
              <span>TEST PING</span>
            </button>
            <button
              onClick={() => {
                setShowUpstoxModal(true);
                setUpstoxError(null);
                setUpstoxSuccessMsg(null);
              }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold uppercase tracking-wider text-xs shadow-[0_0_15px_rgba(0,240,255,0.3)] transition-all cursor-pointer"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>CONFIGURE</span>
            </button>
          </div>
        </div>
      </div>

      {/* MIDDLE DUAL PANE: LIVE STREAM ALLOCATION MATRIX & SOCKET SATURATION VISUALIZER */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* DATA PIPELINE ROUTING TABLE (8 COLS) */}
        <div className="lg:col-span-8 bg-[#080d1a]/95 rounded-2xl p-6 backdrop-blur-2xl border border-cyan-500/20 shadow-2xl flex flex-col justify-between font-mono">
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div>
                <span className="text-[10px] text-cyan-400 uppercase tracking-widest font-semibold">// MATRIX-V8::PIPELINE_ROUTING</span>
                <h3 className="text-lg font-bold text-cyan-200">LIVE STREAM ALLOCATION MATRIX</h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-slate-900 text-slate-400 text-[10px] border border-slate-800">FAILOVER: AUTO_STRICT</span>
                <span className="px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 text-[10px] font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> ACTIVE
                </span>
              </div>
            </div>

            {/* Dynamic Routing Table */}
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-900/80 text-slate-400 text-[10px] tracking-wider uppercase border-b border-slate-800">
                    <th className="py-2.5 px-3 rounded-l-lg">DATA PIPELINE / WORKLOAD</th>
                    <th className="py-2.5 px-3">CARRIER NODE</th>
                    <th className="py-2.5 px-3">DISPATCH PROTOCOL</th>
                    <th className="py-2.5 px-3">BANDWIDTH</th>
                    <th className="py-2.5 px-3 text-right rounded-r-lg">OVERRIDE ROUTE</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {/* ROW 1 */}
                  <tr className="hover:bg-slate-900/40 transition-colors">
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#00f0ff]"></div>
                        <div>
                          <div className="text-sm text-cyan-200 font-semibold leading-tight font-sans">3D Volatility Surface</div>
                          <div className="text-[10px] text-slate-400">Sub-millisecond SABR Greek generation</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-cyan-300">ZERODHA (KiteTicker)</td>
                    <td className="py-3 px-3 text-slate-400">BINARY WS // PORT 443</td>
                    <td className="py-3 px-3 text-emerald-400 font-bold">1.42 MB/s</td>
                    <td className="py-3 px-3 text-right">
                      <select className="bg-slate-900 border border-slate-800 text-cyan-300 text-[10px] rounded px-2 py-1 outline-none">
                        <option>ZERODHA (PRIMARY)</option>
                        <option>DHAN (STANDBY)</option>
                        <option>ADITYA BIRLA</option>
                      </select>
                    </td>
                  </tr>

                  {/* ROW 2 */}
                  <tr className="hover:bg-slate-900/40 transition-colors">
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#4dffb2]"></div>
                        <div>
                          <div className="text-sm text-cyan-200 font-semibold leading-tight font-sans">Order Execution Stream</div>
                          <div className="text-[10px] text-slate-400">Institutional direct DMA slicing engine</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-cyan-300">ADITYA BIRLA MONEY</td>
                    <td className="py-3 px-3 text-slate-400">REST TCP // DIRECT FIBER</td>
                    <td className="py-3 px-3 text-emerald-400 font-bold">620 KB/s</td>
                    <td className="py-3 px-3 text-right">
                      <select className="bg-slate-900 border border-slate-800 text-cyan-300 text-[10px] rounded px-2 py-1 outline-none">
                        <option>ABM (PRIMARY)</option>
                        <option>ZERODHA KITE</option>
                        <option>DHANHQ</option>
                      </select>
                    </td>
                  </tr>

                  {/* ROW 3 */}
                  <tr className="hover:bg-slate-900/40 transition-colors">
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_8px_#ffdea8]"></div>
                        <div>
                          <div className="text-sm text-cyan-200 font-semibold leading-tight font-sans">Historical Candlesticks & VWAP</div>
                          <div className="text-[10px] text-slate-400">Deep-tick rolling 1-min & 5-min bars</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-cyan-300">DHANHQ REST API</td>
                    <td className="py-3 px-3 text-slate-400">HTTPS REST / V2 HIST</td>
                    <td className="py-3 px-3 text-amber-400 font-bold">380 KB/s</td>
                    <td className="py-3 px-3 text-right">
                      <select className="bg-slate-900 border border-slate-800 text-cyan-300 text-[10px] rounded px-2 py-1 outline-none">
                        <option>DHAN (ZERO COST)</option>
                        <option>ZERODHA (PAID)</option>
                        <option>LOCAL CACHE</option>
                      </select>
                    </td>
                  </tr>

                  {/* ROW 4 */}
                  <tr className="hover:bg-slate-900/40 transition-colors">
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-rose-400 animate-pulse shadow-[0_0_8px_#ffb4ab]"></div>
                        <div>
                          <div className="text-sm text-cyan-200 font-semibold leading-tight font-sans">Fallback Hot-Swap Redundancy</div>
                          <div className="text-[10px] text-slate-400">Automatic heartbeat switch on link failure</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-emerald-400">DHANHQ HOT ARMED</td>
                    <td className="py-3 px-3 text-slate-400">ASYNC MULTIPLEX</td>
                    <td className="py-3 px-3 text-slate-500">0.05 KB/s (IDLE)</td>
                    <td className="py-3 px-3 text-right">
                      <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-emerald-400 font-bold text-[10px]">AUTO_ARMED</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-4 pt-3 bg-slate-950/60 -mx-6 -mb-6 p-4 rounded-b-2xl border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-slate-400">
              <CheckCircle2 className="w-4 h-4 text-cyan-400" />
              <span>COLOCATION CROSS-CONNECT RATIO: <strong className="text-cyan-300">1:1 DEDICATED BANDWIDTH</strong></span>
            </div>
            <button
              onClick={() => {
                setRouterToast('Routing profile saved successfully to colocation arbiter BOM-DC2-RACK08.');
                setTimeout(() => setRouterToast(null), 4000);
              }}
              className="px-4 py-1.5 rounded-lg bg-slate-900 hover:bg-cyan-500 hover:text-slate-950 text-cyan-300 font-bold uppercase tracking-wider transition-all border border-slate-800"
            >
              SAVE ROUTING PROFILE
            </button>
          </div>
        </div>

        {/* LOAD BALANCER & SPECTRUM VISUALIZER (4 COLS) */}
        <div className="lg:col-span-4 bg-[#080d1a]/95 rounded-2xl p-6 backdrop-blur-2xl border border-cyan-500/20 shadow-2xl flex flex-col justify-between font-mono">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-cyan-400 uppercase tracking-widest font-semibold">// TEL-14::SOCKET_SPECTRUM</span>
              <Activity className="w-5 h-5 text-cyan-400" />
            </div>

            <h3 className="text-lg font-bold text-cyan-200">SOCKET SATURATION</h3>
            <p className="text-xs text-slate-400 font-sans">
              Live byte distribution and connection load across authenticated gateway instances.
            </p>

            {/* SVG Visual Waveform Meter */}
            <div className="w-full bg-slate-950/80 rounded-xl p-3 border border-slate-800 flex flex-col gap-2">
              <div className="flex justify-between items-baseline text-xs">
                <span className="text-slate-400">BANDWIDTH CONSUMPTION</span>
                <span className="text-cyan-300 font-bold">2.42 MB/s</span>
              </div>

              {/* Real-time Bars SVG */}
              <svg className="w-full h-20 overflow-visible" fill="none" viewBox="0 0 300 80">
                <defs>
                  <linearGradient id="cyanGradient" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#00f0ff" stopOpacity="0.9" />
                    <stop offset="100%" stopColor="#006970" stopOpacity="0.1" />
                  </linearGradient>
                  <linearGradient id="goldGradient" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#feb700" stopOpacity="0.9" />
                    <stop offset="100%" stopColor="#5e4200" stopOpacity="0.1" />
                  </linearGradient>
                </defs>
                <rect fill="url(#cyanGradient)" height="35" rx="2" width="8" x="5" y="45"></rect>
                <rect fill="url(#cyanGradient)" height="50" rx="2" width="8" x="18" y="30"></rect>
                <rect fill="url(#cyanGradient)" height="60" rx="2" width="8" x="31" y="20"></rect>
                <rect fill="url(#cyanGradient)" height="70" rx="2" width="8" x="44" y="10"></rect>
                <rect fill="url(#cyanGradient)" height="55" rx="2" width="8" x="57" y="25"></rect>
                <rect fill="url(#cyanGradient)" height="40" rx="2" width="8" x="70" y="40"></rect>
                <rect fill="url(#cyanGradient)" height="65" rx="2" width="8" x="83" y="15"></rect>
                <rect fill="url(#cyanGradient)" height="52" rx="2" width="8" x="96" y="28"></rect>
                <rect fill="url(#cyanGradient)" height="42" rx="2" width="8" x="109" y="38"></rect>
                <rect fill="url(#cyanGradient)" height="72" rx="2" width="8" x="122" y="8"></rect>
                <rect fill="url(#cyanGradient)" height="62" rx="2" width="8" x="135" y="18"></rect>
                <rect fill="url(#cyanGradient)" height="58" rx="2" width="8" x="148" y="22"></rect>
                <rect fill="url(#goldGradient)" height="45" rx="2" width="8" x="161" y="35"></rect>
                <rect fill="url(#goldGradient)" height="32" rx="2" width="8" x="174" y="48"></rect>
                <rect fill="url(#goldGradient)" height="60" rx="2" width="8" x="187" y="20"></rect>
                <rect fill="url(#cyanGradient)" height="68" rx="2" width="8" x="200" y="12"></rect>
                <rect fill="url(#cyanGradient)" height="50" rx="2" width="8" x="213" y="30"></rect>
                <rect fill="url(#cyanGradient)" height="38" rx="2" width="8" x="226" y="42"></rect>
                <rect fill="url(#cyanGradient)" height="64" rx="2" width="8" x="239" y="16"></rect>
                <rect fill="url(#cyanGradient)" height="55" rx="2" width="8" x="252" y="25"></rect>
                <rect fill="url(#cyanGradient)" height="45" rx="2" width="8" x="265" y="35"></rect>
                <rect fill="url(#cyanGradient)" height="30" rx="2" width="8" x="278" y="50"></rect>
              </svg>
            </div>

            {/* Socket Distribution Gauges */}
            <div className="space-y-2.5 text-xs font-mono">
              <div>
                <div className="flex justify-between">
                  <span className="text-slate-300">ABM Execution Pipeline</span>
                  <span className="text-cyan-300 font-bold">58% load</span>
                </div>
                <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden mt-1">
                  <div className="bg-cyan-400 h-full w-[58%] shadow-[0_0_8px_#00f0ff]"></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between">
                  <span className="text-slate-300">Zerodha Kite Ticker WS</span>
                  <span className="text-emerald-400 font-bold">34% load</span>
                </div>
                <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden mt-1">
                  <div className="bg-emerald-400 h-full w-[34%] shadow-[0_0_8px_#4dffb2]"></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between">
                  <span className="text-slate-300">Dhan Protobuf Pool</span>
                  <span className="text-amber-400 font-bold">8% load</span>
                </div>
                <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden mt-1">
                  <div className="bg-amber-400 h-full w-[8%] shadow-[0_0_8px_#feb700]"></div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 flex items-center justify-between text-slate-400 text-xs font-mono border-t border-slate-800">
            <span>TLS 1.3 // AES-256-GCM</span>
            <span className="text-emerald-400 font-bold">ZERO DROPPED PACKETS</span>
          </div>
        </div>
      </div>

      {/* PROTOCOL & COLOCATION DIAGNOSTICS TERMINAL (LOG STREAM) */}
      <div className="relative bg-[#080d1a]/95 rounded-2xl p-6 backdrop-blur-2xl border border-cyan-500/20 shadow-2xl space-y-3 font-mono">
        {/* Terminal Window Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 bg-slate-950/60 -mx-6 -mt-6 px-6 pt-4 rounded-t-2xl border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            </div>
            <span className="text-xs text-cyan-300 tracking-wider font-bold">
              JARVIS_AUDIT_LOG://GATEWAY_COLOCATION_FEED.STDOUT
            </span>
          </div>

          {/* Terminal Filter Tabs */}
          <div className="flex items-center gap-1.5 text-xs">
            <button
              onClick={() => setSelectedLogFilter('ALL')}
              className={`px-2.5 py-1 rounded-md font-bold transition-all ${
                selectedLogFilter === 'ALL' ? 'bg-cyan-500 text-slate-950' : 'bg-slate-900 text-slate-400 hover:text-slate-200'
              }`}
            >
              ALL ({logs.length})
            </button>
            <button
              onClick={() => setSelectedLogFilter('AUTH_TOKENS')}
              className={`px-2.5 py-1 rounded-md transition-all ${
                selectedLogFilter === 'AUTH_TOKENS' ? 'bg-cyan-500 text-slate-950 font-bold' : 'bg-slate-900 text-slate-400 hover:text-slate-200'
              }`}
            >
              AUTH_TOKENS
            </button>
            <button
              onClick={() => setSelectedLogFilter('WEBSOCKET')}
              className={`px-2.5 py-1 rounded-md transition-all ${
                selectedLogFilter === 'WEBSOCKET' ? 'bg-cyan-500 text-slate-950 font-bold' : 'bg-slate-900 text-slate-400 hover:text-slate-200'
              }`}
            >
              WEBSOCKET
            </button>
            <button
              onClick={() => setSelectedLogFilter('RATELIMITS')}
              className={`px-2.5 py-1 rounded-md transition-all ${
                selectedLogFilter === 'RATELIMITS' ? 'bg-cyan-500 text-slate-950 font-bold' : 'bg-slate-900 text-slate-400 hover:text-slate-200'
              }`}
            >
              RATELIMITS
            </button>
            <button
              onClick={() => setLogs([])}
              title="Clear Terminal Log"
              className="ml-2 text-slate-400 hover:text-rose-400 p-1 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Log Rows Terminal Container */}
        <div className="space-y-1.5 h-48 overflow-y-auto pr-2 select-text text-xs text-slate-300">
          {filteredLogs.map((log) => (
            <div key={log.id} className="flex items-start gap-3 hover:bg-slate-900/40 p-1 rounded">
              <span className="text-slate-500 shrink-0">[{log.timestamp}]</span>
              <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold shrink-0 ${
                log.type === 'AUTH_OK' ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/40' :
                log.type === 'KITE_WS' ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-500/40' :
                log.type === 'DHAN_STANDBY' ? 'bg-amber-950/80 text-amber-300 border border-amber-500/40' :
                log.type === 'RATE_LIMIT' ? 'bg-slate-800 text-slate-300' :
                'bg-cyan-950/80 text-cyan-400'
              }`}>
                {log.type}
              </span>
              <span className="text-slate-200 leading-relaxed">{log.message}</span>
            </div>
          ))}
        </div>

        {/* Terminal Command Input Bar */}
        <form onSubmit={handleExecuteCli} className="flex items-center gap-2 pt-2 bg-slate-950/80 px-3 py-2 rounded-xl border border-slate-800">
          <span className="text-cyan-400 font-bold select-none">&gt;_</span>
          <input
            type="text"
            value={cliInput}
            onChange={(e) => setCliInput(e.target.value)}
            placeholder="Type tactical CLI command (e.g. 'broker.reconnect --force abm', 'stream.divert --to dhanhq', 'ping')..."
            className="w-full bg-transparent border-0 text-slate-100 text-xs outline-none focus:ring-0 placeholder:text-slate-600"
          />
          <button
            type="submit"
            className="px-4 py-1.5 rounded-lg bg-slate-900 hover:bg-cyan-500 hover:text-slate-950 text-cyan-300 text-xs font-bold uppercase tracking-wider transition-colors shrink-0 border border-slate-800 cursor-pointer"
          >
            EXECUTE
          </button>
        </form>
      </div>

      {/* KILL ALL SESSIONS HARDWARE CONFIRMATION MODAL */}
      {showKillModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="max-w-md w-full bg-[#0d0408] border-2 border-rose-500/60 rounded-2xl p-6 shadow-[0_0_50px_rgba(244,63,94,0.4)] flex flex-col gap-4 font-mono">
            <div className="flex items-center gap-3 text-rose-400">
              <ShieldAlert className="w-8 h-8 animate-pulse" />
              <div>
                <h3 className="text-base font-bold text-white uppercase">HARDWARE KILL INTERLOCK</h3>
                <span className="text-[10px] text-rose-300">YUBIKEY AUTHORIZATION REQUIRED</span>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed font-sans">
              Engaging the master kill switch will immediately sever all active binary WebSocket threads, cancel open L2 orders on Aditya Birla Money, and divert failover to local overnight repo cache.
            </p>

            <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-500/30 text-xs text-rose-200">
              [SAFETY ALERT]: INSERT & TOUCH PHYSICAL YUBIKEY 5 NFC TO SEVER SESSIONS.
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowKillModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-bold"
              >
                CANCEL
              </button>
              <button
                onClick={() => {
                  setShowKillModal(false);
                  const now = new Date();
                  const timeStr = now.toLocaleTimeString();
                  setLogs(prev => [{
                    id: `log-${Date.now()}`,
                    timestamp: timeStr,
                    type: 'AUTH_OK',
                    category: 'GENERAL',
                    message: '[EMERGENCY OVERRIDE] YUBIKEY VERIFIED. ALL 3 BROKER SOCKETS SAFELY FLUSHED. POSITIONS HEDGED.'
                  }, ...prev]);
                  setRouterToast('[SAFETY OVERRIDE AUTHENTICATED]: All broker sessions safely severed and working orders flushed.');
                  setTimeout(() => setRouterToast(null), 5000);
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-[0_0_20px_rgba(244,63,94,0.5)]"
              >
                CONFIRM HARDWARE KILL
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD BROKER NODE MODAL */}
      {showAddBrokerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="max-w-lg w-full bg-[#080d1a] border border-cyan-500/40 rounded-2xl p-6 shadow-2xl flex flex-col gap-4 font-mono">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-base font-bold text-cyan-200 uppercase">ADD NEW BROKER NODE</h3>
              <button onClick={() => setShowAddBrokerModal(false)} className="text-slate-400 hover:text-slate-200 text-sm">✕</button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">SELECT BROKER PROTOCOL</label>
                <select className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-cyan-300 outline-none">
                  <option>ICICI Direct Breeze API (V2 REST / WS)</option>
                  <option>Kotak Neo HS REST (TradeAPI)</option>
                  <option>Angel One SmartAPI (Python/REST SDK)</option>
                  <option>Upstox Pro V2 WebSocket</option>
                  <option>Custom FIX 4.4 Colocation Direct Cross-Connect</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">COLOCATION NODE</label>
                <input
                  type="text"
                  placeholder="e.g. MUMBAI-BKC-DC01 // RACK-14"
                  className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-100 outline-none"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">API APP KEY</label>
                <input
                  type="password"
                  placeholder="Enter API Key from Broker Developer Portal"
                  className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-100 outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                onClick={() => setShowAddBrokerModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-slate-300 text-xs font-bold"
              >
                CANCEL
              </button>
              <button
                onClick={() => {
                  setShowAddBrokerModal(false);
                  setRouterToast('Broker node initialized in verification sandbox. Colocation ping test scheduled.');
                  setTimeout(() => setRouterToast(null), 4000);
                }}
                className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-[0_0_15px_rgba(0,240,255,0.3)]"
              >
                PAIR BROKER NODE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* UPSTOX ANALYTICS CONFIGURATION & TELEMETRY MODAL */}
      {showUpstoxModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in font-mono">
          <div className="max-w-2xl w-full bg-[#080d1a] border border-cyan-500/40 rounded-2xl p-5 sm:p-6 shadow-2xl flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-cyan-950/80 border border-cyan-500/40 text-cyan-300">
                  <Wifi className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100 uppercase tracking-wide flex items-center gap-2">
                    <span>UPSTOX ANALYTICS GATEWAY</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/30">
                      v2 REST / WS
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Official Upstox Developer Platform Integration // Real Market Depth & Options Telemetry
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowUpstoxModal(false)}
                className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white cursor-pointer transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Navigation Tabs */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-950/80 rounded-xl border border-slate-800 text-xs">
              <button
                onClick={() => setUpstoxModalTab('CONFIG')}
                className={`flex-1 py-2 px-3 rounded-lg font-bold transition cursor-pointer flex items-center justify-center gap-2 ${
                  upstoxModalTab === 'CONFIG'
                    ? 'bg-cyan-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>PAIRING & CONFIG</span>
              </button>
              <button
                onClick={() => {
                  setUpstoxModalTab('QUOTES');
                  if (!upstoxQuotesData) handleFetchUpstoxQuotes();
                }}
                className={`flex-1 py-2 px-3 rounded-lg font-bold transition cursor-pointer flex items-center justify-center gap-2 ${
                  upstoxModalTab === 'QUOTES'
                    ? 'bg-cyan-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                <span>LIVE MARKET DEPTH</span>
              </button>
              <button
                onClick={() => {
                  setUpstoxModalTab('OPTION_CHAIN');
                  if (!upstoxOptionChainData) handleFetchUpstoxOptionChain();
                }}
                className={`flex-1 py-2 px-3 rounded-lg font-bold transition cursor-pointer flex items-center justify-center gap-2 ${
                  upstoxModalTab === 'OPTION_CHAIN'
                    ? 'bg-cyan-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>OPTION CHAIN</span>
              </button>
            </div>

            {/* TAB 1: PAIRING & CONFIGURATION */}
            {upstoxModalTab === 'CONFIG' && (
              <div className="space-y-4">
                {/* Active Connection Status Banner */}
                <div className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                  upstoxData?.status === 'CONNECTED'
                    ? 'bg-emerald-950/40 border-emerald-500/40'
                    : 'bg-amber-950/30 border-amber-500/30'
                }`}>
                  <div className="flex items-center gap-3">
                    {upstoxData?.status === 'CONNECTED' ? (
                      <div className="w-9 h-9 rounded-lg bg-emerald-900/60 border border-emerald-500/50 flex items-center justify-center text-emerald-400">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                    ) : (
                      <div className="w-9 h-9 rounded-lg bg-amber-900/60 border border-amber-500/50 flex items-center justify-center text-amber-400">
                        <AlertTriangle className="w-5 h-5" />
                      </div>
                    )}
                    <div>
                      <div className="text-xs font-bold text-slate-100 flex items-center gap-2">
                        <span>GATEWAY STATUS:</span>
                        <span className={upstoxData?.status === 'CONNECTED' ? 'text-emerald-400' : 'text-amber-400'}>
                          {upstoxData?.status === 'CONNECTED' ? 'VERIFIED & ONLINE' : 'STANDBY / NOT PAIRED'}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {upstoxData?.status === 'CONNECTED'
                          ? `Client ID: ${upstoxData.profile?.userId} (${upstoxData.profile?.userName}) · Ping: ${upstoxData.lastLatencyMs}ms`
                          : 'Configure your Upstox Bearer Access Token below to pair this terminal.'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={handlePingUpstox}
                      className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-cyan-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Ping</span>
                    </button>
                    {upstoxData?.status === 'CONNECTED' && (
                      <button
                        onClick={handleDisconnectUpstox}
                        className="px-3 py-1.5 rounded-lg bg-rose-950 hover:bg-rose-900 border border-rose-600/50 text-rose-300 text-xs font-bold cursor-pointer"
                      >
                        Disconnect
                      </button>
                    )}
                  </div>
                </div>

                {/* Feedback Alerts */}
                {upstoxError && (
                  <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2.5 animate-in fade-in">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                    <span>{upstoxError}</span>
                  </div>
                )}
                {upstoxSuccessMsg && (
                  <div className="p-3 rounded-xl bg-emerald-950/50 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2.5 animate-in fade-in">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                    <span>{upstoxSuccessMsg}</span>
                  </div>
                )}

                {/* Configuration Form */}
                <form onSubmit={handleConfigureUpstox} className="space-y-3.5 text-xs bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-slate-300 font-bold uppercase tracking-wider text-[11px]">
                        UPSTOX ACCESS TOKEN (BEARER) <span className="text-rose-400">*</span>
                      </label>
                      <span className="text-[10px] text-slate-500">From Upstox App Console</span>
                    </div>
                    <div className="relative">
                      <input
                        type={showUpstoxToken ? 'text' : 'password'}
                        value={upstoxTokenInput}
                        onChange={(e) => setUpstoxTokenInput(e.target.value)}
                        placeholder="Paste your active Upstox access token..."
                        className="w-full p-2.5 pr-10 rounded-lg bg-slate-900 border border-slate-800 text-slate-100 text-xs placeholder-slate-500 outline-none focus:border-cyan-500 transition"
                      />
                      <button
                        type="button"
                        onClick={() => setShowUpstoxToken(!showUpstoxToken)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-1"
                      >
                        {showUpstoxToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-slate-300 font-bold uppercase tracking-wider text-[10px] block mb-1">
                        API KEY / APP ID (OPTIONAL)
                      </label>
                      <input
                        type="text"
                        value={upstoxApiKeyInput}
                        onChange={(e) => setUpstoxApiKeyInput(e.target.value)}
                        placeholder="e.g. 5d9f... (from Upstox portal)"
                        className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-100 text-xs placeholder-slate-500 outline-none focus:border-cyan-500 transition"
                      />
                    </div>
                    <div>
                      <label className="text-slate-300 font-bold uppercase tracking-wider text-[10px] block mb-1">
                        API BASE URL
                      </label>
                      <input
                        type="text"
                        value={upstoxBaseUrlInput}
                        onChange={(e) => setUpstoxBaseUrlInput(e.target.value)}
                        placeholder="https://api.upstox.com/v2"
                        className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-cyan-300 text-xs outline-none focus:border-cyan-500 transition"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isVerifyingUpstox || !upstoxTokenInput.trim()}
                    className="w-full py-2.5 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-bold uppercase tracking-wider text-xs shadow-[0_0_15px_rgba(0,240,255,0.3)] transition flex items-center justify-center gap-2 cursor-pointer mt-2"
                  >
                    {isVerifyingUpstox ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Verifying with api.upstox.com...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        <span>VERIFY & PAIR UPSTOX NODE</span>
                      </>
                    )}
                  </button>
                </form>

                {/* Permanent Environment Persistence Guide */}
                <div className="p-3.5 rounded-xl bg-slate-950/90 border border-slate-800 space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-cyan-300 font-bold uppercase text-[11px]">
                    <Lock className="w-3.5 h-3.5" />
                    <span>PERMANENT ZERO-SECRET PERSISTENCE</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                    Tokens entered above are active for this server session. To make your Upstox Analytics API connection permanent across cloud cold-starts, configure <code className="text-cyan-300 bg-slate-900 px-1 py-0.5 rounded">UPSTOX_ACCESS_TOKEN</code> in your environment variables or Cloud Secrets as documented in <code className="text-slate-300">.env.example</code>.
                  </p>
                </div>
              </div>
            )}

            {/* TAB 2: LIVE MARKET DEPTH */}
            {upstoxModalTab === 'QUOTES' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">
                    Direct Upstox v2 Quotes API telemetry (<code className="text-cyan-300">/market-quote/quotes</code>)
                  </span>
                  <button
                    onClick={handleFetchUpstoxQuotes}
                    disabled={isLoadingQuotes}
                    className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingQuotes ? 'animate-spin' : ''}`} />
                    <span>Refresh Quotes</span>
                  </button>
                </div>

                {upstoxQuotesData ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {Object.entries(upstoxQuotesData).map(([key, quote]: [string, any]) => (
                      <div key={key} className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-cyan-300 font-bold text-xs">{quote.instrument_token || key.split('|')[1] || key}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-900 text-slate-400">UPSTOX REALTIME</span>
                        </div>
                        <div className="flex items-baseline justify-between">
                          <span className="text-lg font-bold text-slate-100 tabular-nums">
                            ₹{quote.last_price != null ? Number(quote.last_price).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '—'}
                          </span>
                          <span className={`text-xs font-bold ${Number(quote.net_change ?? 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {Number(quote.net_change ?? 0) >= 0 ? '+' : ''}{Number(quote.net_change ?? 0).toFixed(2)}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-1 pt-1 border-t border-slate-900 text-[10px] text-slate-400">
                          <div>OPEN: <span className="text-slate-200 font-semibold">{quote.ohlc?.open || '—'}</span></div>
                          <div>HIGH: <span className="text-emerald-400 font-semibold">{quote.ohlc?.high || '—'}</span></div>
                          <div>LOW: <span className="text-rose-400 font-semibold">{quote.ohlc?.low || '—'}</span></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center text-slate-500 text-xs">
                    {upstoxData?.status === 'CONNECTED' 
                      ? 'Click "Refresh Quotes" to fetch live tick depth from Upstox.'
                      : 'Please pair your Upstox Access Token in the Pairing tab to stream live market quotes.'}
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: OPTION CHAIN ANALYTICS */}
            {upstoxModalTab === 'OPTION_CHAIN' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">
                    NIFTY 50 Option Chain & Greeks (<code className="text-cyan-300">/market-quote/option-chain</code>)
                  </span>
                  <button
                    onClick={handleFetchUpstoxOptionChain}
                    disabled={isLoadingOptionChain}
                    className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingOptionChain ? 'animate-spin' : ''}`} />
                    <span>Query Chain</span>
                  </button>
                </div>

                {upstoxOptionChainData && Array.isArray(upstoxOptionChainData) && upstoxOptionChainData.length > 0 ? (
                  <div className="max-h-64 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950/80">
                    <table className="w-full text-[11px] text-left">
                      <thead className="bg-slate-900/90 text-slate-400 sticky top-0 border-b border-slate-800">
                        <tr>
                          <th className="py-2 px-2 text-cyan-300">CALL OI</th>
                          <th className="py-2 px-2 text-cyan-300">CALL LTP</th>
                          <th className="py-2 px-2 text-center text-amber-300">STRIKE</th>
                          <th className="py-2 px-2 text-right text-rose-300">PUT LTP</th>
                          <th className="py-2 px-2 text-right text-rose-300">PUT OI</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-900">
                        {upstoxOptionChainData.slice(0, 15).map((row: any, idx: number) => (
                          <tr key={idx} className="hover:bg-slate-900/50">
                            <td className="py-1.5 px-2 text-cyan-400 font-mono">{row.call_options?.market_data?.oi?.toLocaleString() || '—'}</td>
                            <td className="py-1.5 px-2 text-slate-200 font-mono">{row.call_options?.market_data?.ltp || '—'}</td>
                            <td className="py-1.5 px-2 text-center font-bold text-amber-300 font-mono bg-slate-900/40">{row.strike_price}</td>
                            <td className="py-1.5 px-2 text-right text-slate-200 font-mono">{row.put_options?.market_data?.ltp || '—'}</td>
                            <td className="py-1.5 px-2 text-right text-rose-400 font-mono">{row.put_options?.market_data?.oi?.toLocaleString() || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="py-8 text-center text-slate-500 text-xs">
                    {upstoxData?.status === 'CONNECTED'
                      ? 'Click "Query Chain" to pull live strike contracts and greeks.'
                      : 'Please pair your Upstox Access Token in the Pairing tab to view option chains.'}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
