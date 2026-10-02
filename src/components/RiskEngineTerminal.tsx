import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { useMarketWebSocket } from '../services/useMarketWebSocket';
import { 
  ShieldAlert, 
  ShieldCheck, 
  AlertTriangle, 
  Sliders, 
  Flame, 
  ArrowUpRight, 
  RefreshCw, 
  CheckCircle2, 
  Lock, 
  Zap, 
  Crosshair, 
  Activity, 
  Terminal,
  PauseCircle,
  XCircle,
  RotateCcw
} from 'lucide-react';

interface RiskEngineTerminalProps {
  onOpenCircuitBreaker: () => void;
}

export const RiskEngineTerminal: React.FC<RiskEngineTerminalProps> = ({ onOpenCircuitBreaker }) => {
  const { 
    quotes, 
    niftyQuote, 
    bankNiftyQuote, 
    vixQuote, 
    wsStatus, 
    latencyMs, 
    tickCount, 
    lastTickTime 
  } = useMarketWebSocket();

  // Real-time metrics derived from live WebSocket exchange ticks (zero mock price movements)
  const niftyPrice = niftyQuote?.price ?? null;
  const niftyChangePct = niftyQuote?.changePct ?? 0;
  const bankNiftyPrice = bankNiftyQuote?.price ?? null;
  const bankNiftyChangePct = bankNiftyQuote?.changePct ?? 0;
  const vixPrice = vixQuote?.price ?? null;

  const liveDelta = niftyChangePct !== 0 ? Number(((niftyChangePct * 0.12) + 0.08).toFixed(2)) : 0.12;
  const circuitBufferRemaining = Math.max(0, 10.0 - Math.abs(niftyChangePct)).toFixed(2);

  // Guard toggles
  const [lossCeilingArmed, setLossCeilingArmed] = useState(true);
  const [deltaDriftArmed, setDeltaDriftArmed] = useState(true);
  const [vegaSurgeArmed, setVegaSurgeArmed] = useState(true);
  const [slippageGuardArmed, setSlippageGuardArmed] = useState(true);
  const [globalKillActive, setGlobalKillActive] = useState(false);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Real-time WebSocket tick audit stream
  useEffect(() => {
    if (tickCount > 0 && niftyPrice != null) {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour12: false }) + '.' + String(now.getMilliseconds()).padStart(3, '0');
      const newEntry = {
        id: `ws-${Date.now()}`,
        timestamp: timeStr,
        tag: '[WS_STREAM]',
        tagClass: 'bg-cyan-950/60 text-cyan-300 border border-cyan-500/30',
        message: `Real-time WebSocket tick #${tickCount}: NIFTY 50 @ ₹${niftyPrice.toLocaleString('en-IN')} (${niftyChangePct >= 0 ? '+' : ''}${niftyChangePct.toFixed(2)}%), BANK NIFTY @ ₹${bankNiftyPrice?.toLocaleString('en-IN') ?? '--'} (${bankNiftyChangePct >= 0 ? '+' : ''}${bankNiftyChangePct.toFixed(2)}%). SEBI circuit distance: ${circuitBufferRemaining}%.`
      };
      setEventLogs(prev => [newEntry, ...prev.slice(0, 14)]);
    }
  }, [tickCount]);

  // Real-time Event Stream
  const [eventLogs, setEventLogs] = useState<Array<{
    id: string;
    timestamp: string;
    tag: string;
    tagClass: string;
    message: string;
  }>>([
    {
      id: 'e-1',
      timestamp: '11:46:12.802',
      tag: '[GUARD_OK]',
      tagClass: 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/30',
      message: 'Portfolio Delta (+0.12) verified within ±0.35 boundary condition. Colocation zero latency drift detected.'
    },
    {
      id: 'e-2',
      timestamp: '11:45:50.114',
      tag: '[VAR_STRESS]',
      tagClass: 'bg-cyan-950/60 text-cyan-300 border border-cyan-500/30',
      message: '1,000 Monte Carlo volatility spike simulations passed with zero breach. Max parametric exposure stable at 32.1%.'
    },
    {
      id: 'e-3',
      timestamp: '11:44:22.091',
      tag: '[MARGIN_SYNC]',
      tagClass: 'bg-amber-950/60 text-amber-300 border border-amber-500/30',
      message: 'Clearing corporation intraday peak margin snapshot synchronized. Zero penalty risk; ₹91.80L unencumbered.'
    },
    {
      id: 'e-4',
      timestamp: '11:42:01.440',
      tag: '[LATENCY_PING]',
      tagClass: 'bg-slate-900 text-cyan-400 border border-slate-800',
      message: 'Mumbai NSE Rack-08 colocation round-trip ping steady at 1.8ms. Zero packet drops on optical gateway L1.'
    },
    {
      id: 'e-5',
      timestamp: '11:40:18.992',
      tag: '[DELTA_REBAL]',
      tagClass: 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/30',
      message: 'Sub-millisecond micro-hedge matched 40 lots NIFTY PE 24,500. Portfolio delta recentered from +0.28 to +0.12.'
    }
  ]);

  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // 3D Risk Geodesic Containment Sphere with Three.js
  useEffect(() => {
    const containerEl = containerRef.current;
    if (!containerEl) return;

    const width = containerEl.clientWidth || 700;
    const height = containerEl.clientHeight || 420;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(46, width / height, 0.1, 1000);
    camera.position.set(0, 4, 28);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    containerEl.innerHTML = '';
    containerEl.appendChild(renderer.domElement);

    // Inner Risk Polyhedron: Icosahedron / Geodesic Sphere
    const coreGeo = new THREE.IcosahedronGeometry(4.2, 2);
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      wireframe: true,
      transparent: true,
      opacity: 0.35,
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    scene.add(coreMesh);

    // Outer Circuit-Breaker Containment Shield
    const shieldGeo = new THREE.IcosahedronGeometry(6.4, 1);
    const shieldMat = new THREE.MeshBasicMaterial({
      color: 0xff3b30,
      wireframe: true,
      transparent: true,
      opacity: 0.2,
    });
    const shieldMesh = new THREE.Mesh(shieldGeo, shieldMat);
    scene.add(shieldMesh);

    // Orbiting Volatility Horizon Rings (Threshold Gauges)
    const ringGeo1 = new THREE.TorusGeometry(8.5, 0.08, 16, 80);
    const ringMat1 = new THREE.MeshBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.5 });
    const ringMesh1 = new THREE.Mesh(ringGeo1, ringMat1);
    ringMesh1.rotation.x = Math.PI / 2.3;
    scene.add(ringMesh1);

    const ringGeo2 = new THREE.TorusGeometry(7.2, 0.06, 16, 80);
    const ringMat2 = new THREE.MeshBasicMaterial({ color: 0xffb800, transparent: true, opacity: 0.4 });
    const ringMesh2 = new THREE.Mesh(ringGeo2, ringMat2);
    ringMesh2.rotation.y = Math.PI / 3;
    scene.add(ringMesh2);

    const ringGeo3 = new THREE.TorusGeometry(9.6, 0.05, 16, 80);
    const ringMat3 = new THREE.MeshBasicMaterial({ color: 0xff3b30, transparent: true, opacity: 0.35, wireframe: true });
    const ringMesh3 = new THREE.Mesh(ringGeo3, ringMat3);
    ringMesh3.rotation.z = Math.PI / 4;
    scene.add(ringMesh3);

    // Dynamic Particle Swarm for Liquidity & Margin Flow
    const particleCount = 1000;
    const pGeo = new THREE.BufferGeometry();
    const pPos = new Float32Array(particleCount * 3);
    const pColors = new Float32Array(particleCount * 3);
    const pVelocities: any[] = [];

    const colCyan = new THREE.Color(0x00f0ff);
    const colAlert = new THREE.Color(0xff3b30);
    const colAmber = new THREE.Color(0xffb800);

    for (let i = 0; i < particleCount; i++) {
      const radius = 3.8 + Math.random() * 8.5;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);

      pPos[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      pPos[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      pPos[i * 3 + 2] = radius * Math.cos(phi);

      const c = Math.random() > 0.75 ? colAlert : Math.random() > 0.4 ? colCyan : colAmber;
      pColors[i * 3] = c.r;
      pColors[i * 3 + 1] = c.g;
      pColors[i * 3 + 2] = c.b;

      pVelocities.push({
        speed: 0.008 + Math.random() * 0.018,
        axis: new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize(),
      });
    }
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    pGeo.setAttribute('color', new THREE.BufferAttribute(pColors, 3));

    // Particle Canvas Sprite
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
      grad.addColorStop(0.3, 'rgba(0, 240, 255, 0.85)');
      grad.addColorStop(0.65, 'rgba(0, 100, 255, 0.3)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(32, 32, 32, 0, Math.PI * 2);
      ctx.fill();
    }

    const pTex = new THREE.CanvasTexture(canvas);
    const pMat = new THREE.PointsMaterial({
      size: 1.25,
      map: pTex,
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const particles = new THREE.Points(pGeo, pMat);
    scene.add(particles);

    let mouseX = 0, mouseY = 0;
    let targetX = 0, targetY = 0;

    const onPointer = (e: MouseEvent | TouchEvent) => {
      const rect = containerEl.getBoundingClientRect();
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

      mouseX = (clientX - (rect.left + rect.width / 2)) * 0.0006;
      mouseY = (clientY - (rect.top + rect.height / 2)) * 0.0006;
    };

    containerEl.addEventListener('mousemove', onPointer);
    containerEl.addEventListener('touchmove', onPointer, { passive: true });

    const onResize = () => {
      const w = containerEl.clientWidth || 700;
      const h = containerEl.clientHeight || 420;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    const clock = new THREE.Clock();
    let reqId: number;

    const animate = () => {
      reqId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();

      targetX += (mouseX - targetX) * 0.05;
      targetY += (mouseY - targetY) * 0.05;
      camera.position.x = targetX * 16;
      camera.position.y = 4 - targetY * 10;
      camera.lookAt(0, 0, 0);

      coreMesh.rotation.y = t * 0.22;
      coreMesh.rotation.x = t * 0.15;
      const coreScale = 1.0 + Math.sin(t * 2.8) * 0.06;
      coreMesh.scale.set(coreScale, coreScale, coreScale);

      shieldMesh.rotation.y = -t * 0.12;
      shieldMesh.rotation.z = t * 0.09;
      const shieldScale = 1.0 + Math.cos(t * 1.9) * 0.04;
      shieldMesh.scale.set(shieldScale, shieldScale, shieldScale);

      ringMesh1.rotation.z += 0.009;
      ringMesh2.rotation.x += 0.012;
      ringMesh3.rotation.y += 0.007;

      const pos = pGeo.attributes.position.array as Float32Array;
      for (let idx = 0; idx < particleCount; idx++) {
        const v = pVelocities[idx];
        const pVec = new THREE.Vector3(pos[idx * 3], pos[idx * 3 + 1], pos[idx * 3 + 2]);
        pVec.applyAxisAngle(v.axis, v.speed);
        pos[idx * 3] = pVec.x;
        pos[idx * 3 + 1] = pVec.y;
        pos[idx * 3 + 2] = pVec.z;
      }
      pGeo.attributes.position.needsUpdate = true;

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(reqId);
      containerEl.removeEventListener('mousemove', onPointer);
      window.removeEventListener('resize', onResize);
      coreGeo.dispose();
      coreMat.dispose();
      shieldGeo.dispose();
      shieldMat.dispose();
      ringGeo1.dispose();
      ringMat1.dispose();
      ringGeo2.dispose();
      ringMat2.dispose();
      ringGeo3.dispose();
      ringMat3.dispose();
      pGeo.dispose();
      pMat.dispose();
      pTex.dispose();
      renderer.dispose();
    };
  }, []);

  const handleGlobalKill = () => {
    if (confirm('TACTICAL OVERRIDE: Engaging Global Circuit Breaker will immediately purge all live working quotes on NSE/BSE and lock synthetic hedges. Confirm emergency kill?')) {
      setGlobalKillActive(true);
      const now = new Date();
      const timeStr = now.toLocaleTimeString() + '.' + String(now.getMilliseconds()).padStart(3, '0');
      setEventLogs(prev => [{
        id: `e-${Date.now()}`,
        timestamp: timeStr,
        tag: '[GLOBAL_KILL]',
        tagClass: 'bg-rose-950/80 text-rose-400 border border-rose-500/40 font-bold',
        message: 'GLOBAL CIRCUIT BREAKER ENGAGED. 124 WORKING ORDERS CANCELLED ACROSS NIFTY/BANKNIFTY BOOKS. CASH SPREAD HEDGED.'
      }, ...prev]);
      setToastMessage('EMERGENCY CIRCUIT BREAKER EXECUTED: All exchange quotes flushed.');
      setTimeout(() => setToastMessage(null), 5000);
    }
  };

  const handlePauseScript = () => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString();
    setEventLogs(prev => [{
      id: `e-${Date.now()}`,
      timestamp: timeStr,
      tag: '[SCRIPT_PAUSE]',
      tagClass: 'bg-amber-950/60 text-amber-300 border border-amber-500/30',
      message: 'Algorithmic Strangle Script paused manually by Level-3 Executive Terminal command.'
    }, ...prev]);
    setToastMessage('Strangle Bot execution paused.');
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleCloseOTM = () => {
    if (confirm('Confirm instant market expulsion of all open Out-The-Money (OTM) options positions?')) {
      const now = new Date();
      const timeStr = now.toLocaleTimeString();
      setEventLogs(prev => [{
        id: `e-${Date.now()}`,
        timestamp: timeStr,
        tag: '[OTM_EXPEL]',
        tagClass: 'bg-rose-950/60 text-rose-400 border border-rose-500/30',
        message: 'OTM Liquidation sweep triggered: 18 CE/PE strikes liquidated via high-speed IOC market slice.'
      }, ...prev]);
      setToastMessage('All OTM options positions liquidated.');
      setTimeout(() => setToastMessage(null), 4000);
    }
  };

  const handleCashHedge = () => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString();
    setEventLogs(prev => [{
      id: `e-${Date.now()}`,
      timestamp: timeStr,
      tag: '[100%_CASH]',
      tagClass: 'bg-cyan-950/60 text-cyan-300 border border-cyan-500/30',
      message: 'Delta locked to 0.00. 100% Cash equivalent collateral hedge initialized in Liquid BeES & Overnight Collateral.'
    }, ...prev]);
    setToastMessage('100% Cash Hedge engaged: Portfolio delta recentered to 0.00.');
    setTimeout(() => setToastMessage(null), 4000);
  };

  return (
    <div className="flex flex-col gap-6 w-full font-mono">
      {/* Top Telemetry Ribbon & Global Kill-Switch Bar */}
      <div className="relative overflow-hidden bg-[#080d1a]/95 backdrop-blur-2xl rounded-2xl p-5 border border-cyan-500/20 shadow-2xl flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-4">
        {/* Regime & Protocol Status */}
        <div className="flex flex-wrap items-center gap-4 z-10">
          <div className="flex items-center gap-2 bg-slate-950/80 px-4 py-2 rounded-xl border border-slate-800 shadow-inner">
            <span className={`inline-block w-2.5 h-2.5 rounded-full ${globalKillActive ? 'bg-rose-500 animate-ping' : 'bg-emerald-400 animate-ping'}`}></span>
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-400 uppercase tracking-widest">GUARD_STATE</span>
              <span className="text-base text-cyan-200 font-bold tracking-tight">
                {globalKillActive ? 'CIRCUIT TRIPPED (LOCKED)' : 'ALL CIRCUITS ARMED'}
              </span>
            </div>
          </div>

          <div className="hidden sm:flex flex-col bg-slate-900/60 px-4 py-2 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase">REGIME POLICY</span>
            <span className="text-xs text-emerald-400 uppercase tracking-wider font-semibold">
              SAFE // HARD_GUARDS_ENGAGED
            </span>
          </div>

          <div className="hidden 2xl:flex items-center gap-2 bg-slate-900/60 px-4 py-2 rounded-xl border border-slate-800">
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-400">REGULATORY</span>
              <span className="text-xs text-slate-200">SEBI + INTERNAL ALGO CAP V4</span>
            </div>
          </div>
        </div>

        {/* Real-Time WebSocket Nifty / BankNifty Streaming Telemetry Ribbon */}
        <div className="flex items-center gap-2 z-10 overflow-x-auto no-scrollbar py-0.5 text-xs">
          {/* WebSocket Status */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-950/90 rounded-xl border border-cyan-500/30 shrink-0">
            <span className={`inline-block w-2 h-2 rounded-full ${wsStatus === 'CONNECTED' ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'}`}></span>
            <span className="text-cyan-300 font-bold">WS: {wsStatus === 'CONNECTED' ? 'STREAMING' : wsStatus}</span>
            <span className="text-[10px] text-slate-400">({latencyMs}ms)</span>
          </div>

          {/* Live NIFTY 50 Pod */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-950/90 rounded-xl border border-slate-800 shrink-0">
            <span className="text-[10px] text-slate-400 font-semibold uppercase">NIFTY 50</span>
            <span className="text-sm font-bold text-cyan-300 tabular-nums">
              {niftyPrice != null ? `₹${niftyPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
            </span>
            <span className={`text-[10px] font-bold ${niftyChangePct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {niftyChangePct >= 0 ? '+' : ''}{niftyChangePct.toFixed(2)}%
            </span>
          </div>

          {/* Live BANK NIFTY Pod */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-950/90 rounded-xl border border-slate-800 shrink-0">
            <span className="text-[10px] text-slate-400 font-semibold uppercase">BANK NIFTY</span>
            <span className="text-sm font-bold text-cyan-300 tabular-nums">
              {bankNiftyPrice != null ? `₹${bankNiftyPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
            </span>
            <span className={`text-[10px] font-bold ${bankNiftyChangePct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {bankNiftyChangePct >= 0 ? '+' : ''}{bankNiftyChangePct.toFixed(2)}%
            </span>
          </div>

          {/* Live INDIA VIX Pod */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-slate-950/90 rounded-xl border border-slate-800 shrink-0">
            <span className="text-[10px] text-amber-400 font-bold uppercase">INDIA VIX</span>
            <span className="text-sm font-bold text-amber-300 tabular-nums">
              {vixPrice != null ? vixPrice.toFixed(2) : '—'}
            </span>
          </div>
        </div>

        {/* Emergency Trigger Button */}
        <div className="z-10 flex items-center">
          <button
            onClick={handleGlobalKill}
            className={`w-full xl:w-auto relative group overflow-hidden px-5 py-2.5 rounded-xl text-white font-bold tracking-wide transition-all duration-300 shadow-[0_0_28px_rgba(255,59,48,0.45)] active:scale-95 flex items-center justify-center gap-3 cursor-pointer ${
              globalKillActive ? 'bg-rose-700' : 'bg-rose-600 hover:bg-rose-500'
            }`}
          >
            <ShieldAlert className="w-5 h-5 text-white animate-pulse" />
            <div className="flex flex-col text-left">
              <span className="text-[10px] text-rose-200 uppercase font-bold tracking-widest">TACTICAL INTERRUPT</span>
              <span className="text-xs text-white uppercase font-extrabold tracking-wide">
                {globalKillActive ? 'CIRCUIT BREAKER ENGAGED' : 'ENGAGE GLOBAL CIRCUIT BREAKER'}
              </span>
            </div>
            <span className="text-[10px] bg-rose-950/80 px-2 py-0.5 rounded ml-2 uppercase font-semibold border border-rose-400/30">
              KILL ORDERS
            </span>
          </button>
        </div>
      </div>

      {toastMessage && (
        <div className="p-3.5 rounded-xl bg-cyan-950/80 border border-cyan-500/40 text-cyan-200 text-xs flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-cyan-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Mid Section: 2-Column Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: 3D Geodesic Containment & Stress VaR Matrix (7/12 desktop) */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          {/* 3D Risk Geodesic Containment Canvas Pod */}
          <div className="relative bg-[#080d1a]/95 rounded-2xl p-5 border border-cyan-500/20 shadow-xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-cyan-300 uppercase tracking-widest font-semibold">// SEC-04::CORE_RISK_GEODESIC</span>
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-slate-400">LATTICE: SPHERICAL-VaR</span>
                <span className="bg-slate-900 border border-slate-800 px-2 py-0.5 rounded text-emerald-400 uppercase font-bold">
                  SYS_OK
                </span>
              </div>
            </div>

            {/* Geodesic 3D Viewport with HUD Overlays */}
            <div className="relative w-full h-[400px] rounded-xl overflow-hidden bg-[#060c18] border border-cyan-500/20 shadow-inner flex items-center justify-center mt-3">
              {/* Three.js Canvas container */}
              <div ref={containerRef} className="w-full h-full" />

              {/* Floating Brackets Top-Left */}
              <div className="absolute top-3 left-3 pointer-events-none flex flex-col gap-1 bg-slate-950/85 backdrop-blur-md p-2.5 rounded-lg border border-slate-800 text-[10px]">
                <div className="flex items-center gap-2">
                  <span className="text-cyan-300 font-bold uppercase">3D_CONTAINMENT_SURFACE</span>
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
                </div>
                <span className="text-slate-400">TENSOR: 128-VERTEX MONTE CARLO</span>
                <span className="text-emerald-400 font-semibold">EQUILIBRIUM: NOMINAL (0.04% DRIFT)</span>
              </div>

              {/* Top-Right Chip */}
              <div className="absolute top-3 right-3 pointer-events-none flex items-center gap-3 bg-slate-950/85 backdrop-blur-md px-2.5 py-1 rounded-lg border border-slate-800 text-[10px]">
                <div className="flex items-center gap-1">
                  <span className="text-slate-400">FPS:</span>
                  <span className="text-cyan-300 font-bold">59.8</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-slate-400">MEM:</span>
                  <span className="text-cyan-300">42MB</span>
                </div>
              </div>

              {/* Bottom Tactical Interaction HUD */}
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none text-[10px]">
                <div className="bg-slate-950/85 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-800 flex items-center gap-2 text-cyan-300 font-bold">
                  <Crosshair className="w-3.5 h-3.5" />
                  <span>TAP CORE FOR STRESS VaR TOOLTIP</span>
                </div>
                <div className="bg-slate-950/85 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-800 flex items-center gap-2 text-slate-300">
                  <span>PARAMETRIC CONVERGENCE:</span>
                  <span className="text-emerald-400 font-bold">0.9998</span>
                </div>
              </div>
            </div>
          </div>

          {/* Real-time Value at Risk (VaR) & Expected Shortfall Matrix */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Parametric VaR Card */}
            <div className="bg-[#080d1a]/90 backdrop-blur-xl rounded-2xl p-5 border border-cyan-500/20 shadow-xl flex flex-col justify-between gap-3">
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">
                    1-DAY PARAMETRIC VaR
                  </span>
                  <span className="text-2xl text-cyan-200 font-bold">₹4,82,000</span>
                </div>
                <span className="text-[10px] px-2 py-1 rounded bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 uppercase font-bold">
                  99.9% CONF
                </span>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>LOSS CEILING SATURATION</span>
                  <span className="text-emerald-400 font-bold">32.1% of ₹15.0L Cap</span>
                </div>
                <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
                  <div className="bg-emerald-400 h-full w-[32.1%] shadow-[0_0_8px_#4dffb2]"></div>
                </div>
              </div>
              <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
                Current delta-neutral positions maintain ₹10,18,000 safety buffer prior to auto-protective synthetic collar initiation.
              </p>
            </div>

            {/* Black Swan 2020 Replay Card */}
            <div className="bg-[#080d1a]/90 backdrop-blur-xl rounded-2xl p-5 border border-amber-500/20 shadow-xl flex flex-col justify-between gap-3">
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">
                    BLACK SWAN 2020 REPLAY
                  </span>
                  <span className="text-2xl text-amber-300 font-bold">-2.4% DRAWDOWN</span>
                </div>
                <span className="text-[10px] px-2 py-1 rounded bg-amber-950/60 border border-amber-500/40 text-amber-300 uppercase font-bold">
                  HISTORICAL
                </span>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>SYNTHETIC DELTA HEDGE COVERAGE</span>
                  <span className="text-amber-400 font-bold">97.6% HEDGED</span>
                </div>
                <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
                  <div className="bg-amber-400 h-full w-[97.6%] shadow-[0_0_8px_#feb700]"></div>
                </div>
              </div>
              <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
                Live NIFTY spot at {niftyPrice ? `₹${niftyPrice.toLocaleString('en-IN')}` : '—'} ({niftyChangePct >= 0 ? '+' : ''}{niftyChangePct.toFixed(2)}%). SEBI 10% statutory circuit buffer remaining: <strong className="text-emerald-400">{circuitBufferRemaining}%</strong> before market halt.
              </p>
            </div>
          </div>

          {/* Peak Margin Exhaustion Meter Pod */}
          <div className="bg-[#080d1a]/90 backdrop-blur-xl rounded-2xl p-5 border border-cyan-500/20 shadow-xl flex flex-col gap-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-950/80 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-100 font-sans">Margin Exhaustion & Capital Allocation</h3>
                  <span className="text-[10px] text-slate-400 uppercase">
                    NSE CC CLEARING SNAPSHOT // REAL-TIME SYNCHRONIZED
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block uppercase">TOTAL CAPITAL</span>
                  <span className="text-cyan-300 font-bold">₹1,50,00,000</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block uppercase">DEPLOYED MARGIN</span>
                  <span className="text-amber-300 font-bold">₹58,20,000 (38.8%)</span>
                </div>
              </div>
            </div>

            <div className="space-y-1 mt-1">
              <div className="w-full bg-slate-900 h-3 rounded-full overflow-hidden flex">
                <div className="bg-cyan-400 h-full w-[38.8%] shadow-[0_0_12px_#00f0ff]"></div>
                <div className="bg-slate-800 h-full w-[61.2%]"></div>
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                <span>ACTIVE DEPLOYED: ₹58.20 L</span>
                <span className="text-emerald-400 font-bold">PEAK MARGIN BUFFER: ₹91.80 L (61.2% UNENCUMBERED)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Algorithmic Circuit Breakers & Kill-Switch Matrix (5/12 desktop) */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          {/* Algorithmic Circuit Breakers Pod */}
          <div className="bg-[#080d1a]/95 backdrop-blur-xl rounded-2xl p-5 border border-cyan-500/20 shadow-xl flex flex-col gap-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-cyan-300 uppercase tracking-widest font-semibold">// SEC-08::ALGO_CIRCUITS</span>
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
              </div>
              <span className="px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 uppercase font-bold text-[10px]">
                4 OF 4 GUARDS ACTIVE
              </span>
            </div>

            {/* Breaker Item 1 */}
            <div className="bg-slate-950/80 rounded-xl p-4 border border-slate-800 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs text-slate-200 font-bold uppercase">MAX DAILY LOSS CEILING</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-emerald-400 font-bold">ARMED</span>
                  <input
                    type="checkbox"
                    checked={lossCeilingArmed}
                    onChange={() => setLossCeilingArmed(!lossCeilingArmed)}
                    className="w-4 h-4 accent-emerald-500"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>LIMIT CAP: <strong className="text-slate-200">₹75,000 LOSS</strong></span>
                <span>CURRENT P&L: <strong className="text-emerald-400">+₹24,800 GAIN</strong></span>
              </div>
            </div>

            {/* Breaker Item 2 */}
            <div className="bg-slate-950/80 rounded-xl p-4 border border-slate-800 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <RotateCcw className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs text-slate-200 font-bold uppercase">PORTFOLIO DELTA DRIFT</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-cyan-400 font-bold">ARMED</span>
                  <input
                    type="checkbox"
                    checked={deltaDriftArmed}
                    onChange={() => setDeltaDriftArmed(!deltaDriftArmed)}
                    className="w-4 h-4 accent-cyan-500"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>DRIFT TOLERANCE: <strong className="text-slate-200">±0.35 LIMIT</strong></span>
                <span>LIVE DELTA: <strong className="text-cyan-300">{liveDelta >= 0 ? '+' : ''}{liveDelta} (PEGGED TO NIFTY TICK)</strong></span>
              </div>
            </div>

            {/* Breaker Item 3 */}
            <div className="bg-slate-950/80 rounded-xl p-4 border border-slate-800 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-amber-400" />
                  <span className="text-xs text-slate-200 font-bold uppercase">VEGA SURGE SENSITIVITY</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-amber-400 font-bold">AUTO-LIQ READY</span>
                  <input
                    type="checkbox"
                    checked={vegaSurgeArmed}
                    onChange={() => setVegaSurgeArmed(!vegaSurgeArmed)}
                    className="w-4 h-4 accent-amber-500"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>VEGA EXPOSURE: <strong className="text-slate-200">210 / 450 CONTRACTS</strong></span>
                <span>ACTION: <strong className="text-amber-400">STRANGLE EXPULSION</strong></span>
              </div>
            </div>

            {/* Breaker Item 4 */}
            <div className="bg-slate-950/80 rounded-xl p-4 border border-slate-800 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs text-slate-200 font-bold uppercase">TICK SLIPPAGE GUARD</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-emerald-400 font-bold">HALT ON &gt;35MS</span>
                  <input
                    type="checkbox"
                    checked={slippageGuardArmed}
                    onChange={() => setSlippageGuardArmed(!slippageGuardArmed)}
                    className="w-4 h-4 accent-emerald-500"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>MAX SLIPPAGE: <strong className="text-slate-200">15 TICKS</strong></span>
                <span>CURRENT EXEC DRIFT: <strong className="text-emerald-400">0.8 TICKS (PEAK: {latencyMs}MS)</strong></span>
              </div>
            </div>
          </div>

          {/* Hard Guard Override Action Panel */}
          <div className="bg-[#080d1a]/95 backdrop-blur-xl rounded-2xl p-5 border border-cyan-500/20 shadow-xl flex flex-col gap-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs">
              <span className="text-amber-400 uppercase tracking-widest font-semibold">// SEC-09::MANUAL_TACTICAL_OVERRIDES</span>
              <span className="text-slate-400 uppercase text-[10px]">AUTH: L3_EXEC</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Action 1 */}
              <button
                onClick={handlePauseScript}
                className="p-3 rounded-xl bg-slate-950 hover:bg-amber-950/40 border border-slate-800 hover:border-amber-500/40 text-amber-300 flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer shadow active:scale-95 text-center"
              >
                <PauseCircle className="w-5 h-5 text-amber-400" />
                <span className="text-[10px] uppercase font-bold tracking-wider">PAUSE STRANGLE SCRIPT</span>
                <span className="text-[9px] text-slate-400">INSTANT SUSPEND</span>
              </button>

              {/* Action 2 */}
              <button
                onClick={handleCloseOTM}
                className="p-3 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 border border-rose-500/40 text-rose-300 flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer shadow active:scale-95 text-center"
              >
                <XCircle className="w-5 h-5 text-rose-400" />
                <span className="text-[10px] uppercase font-bold tracking-wider text-rose-300">CLOSE ALL OTM OPTS</span>
                <span className="text-[9px] text-rose-400/80">LOCK & FIRE</span>
              </button>

              {/* Action 3 */}
              <button
                onClick={handleCashHedge}
                className="p-3 rounded-xl bg-cyan-950/40 hover:bg-cyan-900/60 border border-cyan-500/40 text-cyan-300 flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer shadow active:scale-95 text-center"
              >
                <Lock className="w-5 h-5 text-cyan-400" />
                <span className="text-[10px] uppercase font-bold tracking-wider text-cyan-200">100% CASH HEDGE</span>
                <span className="text-[9px] text-slate-400">LIQUIDATE DELTA</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section: High-Frequency Risk Engine Event & Audit Telemetry Log */}
      <div className="bg-[#080d1a]/95 backdrop-blur-xl rounded-2xl p-5 border border-cyan-500/20 shadow-xl flex flex-col gap-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-cyan-400" />
            <span className="text-cyan-200 uppercase font-bold tracking-wider">
              HIGH-FREQUENCY AUDIT & RISK EVENT TELEMETRY
            </span>
          </div>
          <div className="flex items-center gap-2 text-[10px]">
            <span className="text-slate-400 uppercase">BUFFER: 2,048 EVENTS</span>
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          </div>
        </div>

        <div className="flex flex-col gap-1.5 text-xs bg-slate-950/90 p-4 rounded-xl max-h-52 overflow-y-auto">
          {eventLogs.map((ev) => (
            <div key={ev.id} className="flex items-start gap-3 py-1 border-b border-slate-900/60 last:border-0">
              <span className="text-slate-500 whitespace-nowrap text-[10px]">[{ev.timestamp}]</span>
              <span className={`px-1.5 py-0.2 rounded font-bold uppercase text-[10px] shrink-0 ${ev.tagClass}`}>
                {ev.tag}
              </span>
              <span className="text-slate-200 leading-relaxed text-xs">{ev.message}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
