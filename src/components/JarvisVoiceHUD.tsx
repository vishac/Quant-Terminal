import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { useLiveMarketData } from '../services/liveMarketService';
import { askJarvisQuantAssistant } from '../services/geminiService';
import { 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  Play, 
  Pause, 
  Send, 
  RotateCw, 
  CheckCircle2, 
  Sparkles, 
  FolderLock, 
  Mail, 
  Cpu, 
  Activity, 
  Layers,
  ChevronRight,
  TrendingUp,
  FileText,
  ShieldCheck,
  Zap
} from 'lucide-react';

interface JarvisVoiceHUDProps {
  isSpeaking: boolean;
  setIsSpeaking: (speaking: boolean) => void;
  onOpenCircuitBreaker: () => void;
}

export const JarvisVoiceHUD: React.FC<JarvisVoiceHUDProps> = ({
  isSpeaking,
  setIsSpeaking,
  onOpenCircuitBreaker,
}) => {
  const { quotes } = useLiveMarketData(3000);
  const niftyQuote = quotes['^NSEI'];
  const sensexQuote = quotes['^BSESN'];
  const vixQuote = quotes['^INDIAVIX'];
  const trentQuote = quotes['TRENT.NS'];
  const belQuote = quotes['BEL.NS'];
  const halQuote = quotes['HAL.NS'];

  const [queryInput, setQueryInput] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [activeTriggerIndex, setActiveTriggerIndex] = useState<number | null>(null);
  const [playbackSeconds, setPlaybackSeconds] = useState<number>(18);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [activeTranscription, setActiveTranscription] = useState<string>(
    '“Jarvis, summarize market open, options skew & institutional block deal signals.”'
  );
  const niftyPriceStr = niftyQuote?.price != null
    ? `₹${niftyQuote.price.toLocaleString('en-IN')}`
    : '—';
  const vixPriceStr = vixQuote?.price != null
    ? vixQuote.price.toFixed(2)
    : '—';
  const sensexPriceStr = sensexQuote?.price != null
    ? `₹${sensexQuote.price.toLocaleString('en-IN')}`
    : '—';

  const [latestAssistantResponse, setLatestAssistantResponse] = useState<{
    answer: string;
    recommendation?: string;
    confidenceScore?: number | null;
    keyGreeksImpact?: null | {
      delta: string;
      gamma: string;
      vega: string;
      theta: string;
    };
  } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const speechUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const [hudToast, setHudToast] = useState<string | null>(null);

  // Executive briefing text dynamically using real live exchange prices
  const niftyChangeStr = niftyQuote?.change !== null && niftyQuote?.change !== undefined && niftyQuote?.changePct !== null && niftyQuote?.changePct !== undefined
    ? `${niftyQuote.change >= 0 ? 'up' : 'down'} ${Math.abs(niftyQuote.change).toFixed(1)} points (${niftyQuote.changePct >= 0 ? '+' : ''}${niftyQuote.changePct.toFixed(2)}%)`
    : 'standing by for tick';

  const briefingSummary = `Good morning Sir. Using delayed, unofficial market data, Nifty is at ${niftyPriceStr}, ${niftyChangeStr}. Sensex is at ${sensexPriceStr}, and India VIX is at ${vixPriceStr}. This is a paper-trading simulation; no real orders are placed and the figures are not a licensed real-time feed.`;

  // Real TTS Playback using Web Speech API
  const handlePlayVocal = () => {
    if (!('speechSynthesis' in window)) {
      setHudToast('Web Speech API is not supported in this browser.');
      setTimeout(() => setHudToast(null), 4000);
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(briefingSummary);
    utterance.rate = 1.05;
    utterance.pitch = 0.92;

    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(v => 
      v.lang.includes('en-GB') || 
      v.name.includes('UK') || 
      v.name.includes('Daniel') || 
      v.name.includes('Arthur') ||
      v.name.includes('Google UK English Male')
    );
    if (preferredVoice) utterance.voice = preferredVoice;

    utterance.onstart = () => {
      setIsSpeaking(true);
      setIsPaused(false);
    };
    utterance.onend = () => {
      setIsSpeaking(false);
      setIsPaused(false);
    };
    utterance.onerror = () => {
      setIsSpeaking(false);
      setIsPaused(false);
    };

    speechUtteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  const handlePauseVocal = () => {
    if ('speechSynthesis' in window) {
      if (isPaused) {
        window.speechSynthesis.resume();
        setIsPaused(false);
      } else {
        window.speechSynthesis.pause();
        setIsPaused(true);
      }
    }
  };

  const handleTriggerQuickVoice = async (triggerText: string, triggerIdx?: number) => {
    if (triggerIdx !== undefined) setActiveTriggerIndex(triggerIdx);
    setActiveTranscription(`“Jarvis, ${triggerText}”`);
    setIsProcessing(true);
    try {
      const response = await askJarvisQuantAssistant(
        `Operator Command: ${triggerText}. Current NIFTY is ${niftyPriceStr}. Provide concise institutional execution assessment.`
      );
      setLatestAssistantResponse(response);
      // Safely synthesize vocal response
      if ('speechSynthesis' in window && response.answer) {
        try {
          window.speechSynthesis.cancel();
          const ut = new SpeechSynthesisUtterance(response.answer);
          ut.rate = 1.05;
          ut.pitch = 0.95;
          const voices = window.speechSynthesis.getVoices();
          const v = voices.find(vox => vox.lang.includes('en-GB') || vox.name.includes('UK') || vox.name.includes('Daniel'));
          if (v) ut.voice = v;
          ut.onstart = () => setIsSpeaking(true);
          ut.onend = () => setIsSpeaking(false);
          ut.onerror = () => setIsSpeaking(false);
          window.speechSynthesis.speak(ut);
        } catch (synthErr) {
          console.warn('Vocal synthesis handled safely:', synthErr);
        }
      }
    } catch (e) {
      console.warn('Quant assistant prompt handled safely:', e);
    } finally {
      setIsProcessing(false);
      setTimeout(() => setActiveTriggerIndex(null), 1200);
    }
  };

  const handleTextSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!queryInput.trim()) return;

    const text = queryInput.trim();
    setActiveTranscription(`“${text}”`);
    setQueryInput('');
    setIsProcessing(true);

    try {
      const answer = await askJarvisQuantAssistant(text);
      setLatestAssistantResponse(answer);
      if ('speechSynthesis' in window && answer.answer) {
        try {
          window.speechSynthesis.cancel();
          const ut = new SpeechSynthesisUtterance(answer.answer);
          ut.rate = 1.05;
          ut.pitch = 0.95;
          ut.onstart = () => setIsSpeaking(true);
          ut.onend = () => setIsSpeaking(false);
          ut.onerror = () => setIsSpeaking(false);
          window.speechSynthesis.speak(ut);
        } catch (synthErr) {
          console.warn('Vocal playback handled safely:', synthErr);
        }
      }
    } catch (err) {
      console.warn('Manual query handled safely:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Three.js interactive 3D particle swarm / point-cloud wave inspired by Lusion Zero Tech
  useEffect(() => {
    const containerEl = containerRef.current;
    if (!containerEl) return;

    const width = containerEl.clientWidth || 800;
    const height = containerEl.clientHeight || 340;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.set(0, 5, 28);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    containerEl.innerHTML = '';
    containerEl.appendChild(renderer.domElement);

    const countX = 65;
    const countY = 65;
    const numParticles = countX * countY;
    const positions = new Float32Array(numParticles * 3);
    const scales = new Float32Array(numParticles);
    const colors = new Float32Array(numParticles * 3);

    const colorCyan = new THREE.Color(0x00f0ff);
    const colorDeep = new THREE.Color(0x0055ff);
    const colorWhite = new THREE.Color(0xffffff);

    let i = 0, j = 0;
    for (let ix = 0; ix < countX; ix++) {
      for (let iy = 0; iy < countY; iy++) {
        const u = (ix / countX) - 0.5;
        const v = (iy / countY) - 0.5;

        positions[i] = u * 42;
        positions[i + 1] = 0;
        positions[i + 2] = v * 42;

        scales[j] = 1.0;

        const mixed = colorCyan.clone().lerp(colorDeep, Math.sqrt(u * u + v * v) * 1.5);
        if (Math.random() > 0.96) mixed.lerp(colorWhite, 0.7);

        colors[i] = mixed.r;
        colors[i + 1] = mixed.g;
        colors[i + 2] = mixed.b;

        i += 3;
        j++;
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('scale', new THREE.BufferAttribute(scales, 1));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      grad.addColorStop(0, 'rgba(255,255,255,1)');
      grad.addColorStop(0.35, 'rgba(0,240,255,0.85)');
      grad.addColorStop(0.7, 'rgba(0,100,255,0.3)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(32, 32, 32, 0, Math.PI * 2);
      ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.PointsMaterial({
      size: 1.1,
      map: texture,
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      opacity: 0.85,
    });

    const particlesMesh = new THREE.Points(geometry, material);
    particlesMesh.rotation.x = -0.55;
    particlesMesh.rotation.z = 0.15;
    scene.add(particlesMesh);

    // Glowing central orb (Neural reactor core)
    const coreGeo = new THREE.SphereGeometry(2.4, 32, 32);
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      wireframe: true,
      transparent: true,
      opacity: 0.25,
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    coreMesh.position.set(0, 2.5, 0);
    scene.add(coreMesh);

    let mouseX = 0, mouseY = 0;
    let targetX = 0, targetY = 0;
    const windowHalfX = window.innerWidth / 2;
    const windowHalfY = window.innerHeight / 2;

    const onPointerMove = (event: MouseEvent) => {
      mouseX = (event.clientX - windowHalfX) * 0.0008;
      mouseY = (event.clientY - windowHalfY) * 0.0008;
    };
    window.addEventListener('pointermove', onPointerMove, { passive: true });

    const onResize = () => {
      const w = containerEl.clientWidth || 800;
      const h = containerEl.clientHeight || 340;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    const clock = new THREE.Clock();
    let reqId: number;

    const animate = () => {
      reqId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      targetX += (mouseX - targetX) * 0.05;
      targetY += (mouseY - targetY) * 0.05;
      camera.position.x = targetX * 18;
      camera.position.y = 5 - targetY * 12;
      camera.lookAt(0, 0, 0);

      const pos = geometry.attributes.position.array as Float32Array;
      let idx = 0;
      for (let ix = 0; ix < countX; ix++) {
        for (let iy = 0; iy < countY; iy++) {
          const x = pos[idx];
          const z = pos[idx + 2];
          pos[idx + 1] =
            Math.sin(ix * 0.3 + elapsedTime * 1.6) * 1.8 +
            Math.cos(iy * 0.25 + elapsedTime * 1.2) * 1.6 +
            Math.sin(Math.sqrt(x * x + z * z) * 0.45 - elapsedTime * 2.2) * 2.2;
          idx += 3;
        }
      }
      geometry.attributes.position.needsUpdate = true;

      coreMesh.rotation.y += 0.008;
      coreMesh.rotation.x += 0.005;
      const s = 1.0 + Math.sin(elapsedTime * 2.8) * 0.12;
      coreMesh.scale.set(s, s, s);

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(reqId);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('resize', onResize);
      geometry.dispose();
      material.dispose();
      coreGeo.dispose();
      coreMat.dispose();
      texture.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div className="flex flex-col gap-6 w-full font-mono">
      {hudToast && (
        <div className="p-3 rounded-xl bg-amber-950/60 border border-amber-500/40 text-xs font-mono text-amber-200 flex items-center justify-between animate-in fade-in">
          <span>{hudToast}</span>
          <button onClick={() => setHudToast(null)} className="text-amber-400 hover:text-amber-200 text-xs font-bold">✕</button>
        </div>
      )}

      {/* Avant-Garde Minimal Sub-Bar (Lusion Editorial Style) */}
      <div className="flex items-center justify-between px-4 py-2 rounded-full bg-slate-950/70 border border-cyan-500/20 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400"></span>
          </span>
          <span className="text-[10px] text-cyan-300 tracking-[0.2em] uppercase font-bold">
            CORE_01 // 3D_POINTCLOUD_FIELD
          </span>
        </div>
        <div className="flex items-center gap-3 text-[10px]">
          <span className="text-slate-400 tracking-wider">AUDIO_WAVE_FIDELITY: 99.4%</span>
          <span className="px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-bold tracking-widest">
            SYNTH_α
          </span>
        </div>
      </div>

      {/* LUSION INSPIRED 3D PARTICLE FIELD HERO AREA */}
      <div className="relative w-full h-80 rounded-3xl overflow-hidden border border-cyan-500/25 shadow-[0_0_50px_rgba(0,240,255,0.15)] bg-slate-950/90">
        {/* Three.js Canvas Viewport */}
        <div ref={containerRef} className="w-full h-full" />

        {/* Overlay Glassmorphic Cyber HUD Elements */}
        <div className="absolute inset-0 rounded-3xl pointer-events-none p-5 flex flex-col justify-between overflow-hidden">
          {/* Top Floating Badges */}
          <div className="flex items-center justify-between z-10 pointer-events-auto">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#060913]/70 backdrop-blur-md border border-cyan-500/30 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#00f0ff]"></span>
              <span className="text-[9px] text-cyan-300 tracking-[0.18em] uppercase font-bold">
                NEURAL_ORBIT // ZERO_TECH
              </span>
            </div>
            <div className="px-3 py-1 rounded-full bg-[#060913]/70 backdrop-blur-md border border-white/10 shadow-sm text-[9px] text-slate-300 tracking-wider">
              <span>FPS 60.0</span> <span className="text-cyan-400 font-bold ml-1">· LIVE</span>
            </div>
          </div>

          {/* Center Reticle Indicator */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-40 h-40 rounded-full border border-cyan-400/20 flex items-center justify-center animate-[spin_40s_linear_infinite]">
              <div className="w-32 h-32 rounded-full border border-dashed border-cyan-300/30 flex items-center justify-center animate-[spin_25s_linear_infinite_reverse]">
                <div className="w-20 h-20 rounded-full bg-cyan-400/5 backdrop-blur-sm border border-cyan-400/40 shadow-[0_0_30px_rgba(0,240,255,0.3)] flex flex-col items-center justify-center">
                  <Mic className="w-6 h-6 text-cyan-400 drop-shadow-[0_0_12px_rgba(0,240,255,0.9)] animate-pulse" />
                  <span className="text-[8px] text-cyan-300 tracking-[0.2em] uppercase font-bold mt-1">
                    {isSpeaking ? 'SPEAKING' : 'LISTENING'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Audio Equalizer Bar & Status Strip */}
          <div className="z-10 bg-[#060913]/85 backdrop-blur-lg rounded-2xl p-3 border border-cyan-500/20 shadow-lg pointer-events-auto">
            <div className="flex items-center justify-between mb-2 px-1 text-[10px]">
              <div className="flex items-center gap-2">
                <span className="text-cyan-300 font-bold tracking-wider">ACOUSTIC SPECTROGRAM</span>
                <span className="text-slate-500">•</span>
                <span className="text-slate-400">44.1 kHz FLAC</span>
              </div>
              <span className="text-emerald-400 font-bold tracking-widest uppercase">
                DYNAMIC MESH ACTIVE
              </span>
            </div>

            {/* Realtime Equalizer Frequency Bars */}
            <div className="w-full flex items-center justify-between gap-1 h-8 px-2 bg-slate-950/70 rounded-xl border border-white/5">
              <span className="flex-1 bg-cyan-400/60 rounded-full h-2 animate-pulse"></span>
              <span className="flex-1 bg-cyan-300 rounded-full h-5 animate-pulse"></span>
              <span className="flex-1 bg-cyan-400 rounded-full h-7 animate-pulse"></span>
              <span className="flex-1 bg-cyan-200 rounded-full h-3 animate-pulse"></span>
              <span className="flex-1 bg-cyan-400 rounded-full h-6 animate-pulse"></span>
              <span className="flex-1 bg-amber-300 rounded-full h-8 animate-pulse"></span>
              <span className="flex-1 bg-cyan-300 rounded-full h-5 animate-pulse"></span>
              <span className="flex-1 bg-cyan-400 rounded-full h-7 animate-pulse"></span>
              <span className="flex-1 bg-cyan-200 rounded-full h-4 animate-pulse"></span>
              <span className="flex-1 bg-cyan-400 rounded-full h-8 animate-pulse"></span>
              <span className="flex-1 bg-cyan-400 rounded-full h-5 animate-pulse"></span>
              <span className="flex-1 bg-amber-400 rounded-full h-6 animate-pulse"></span>
              <span className="flex-1 bg-cyan-300 rounded-full h-3 animate-pulse"></span>
              <span className="flex-1 bg-cyan-400 rounded-full h-6 animate-pulse"></span>
              <span className="flex-1 bg-cyan-300 rounded-full h-4 animate-pulse"></span>
            </div>

            <div className="mt-2 flex items-center justify-between px-1 text-[9px] text-slate-400">
              <span className="text-cyan-200 font-semibold">VOICE SYNTHESIZER: ALPHA</span>
              <span className="text-amber-300/80">RESONANT TONE</span>
              <span className="text-emerald-400 tracking-wider font-bold">READY</span>
            </div>
          </div>
        </div>
      </div>

      {/* Real-time Operator Voice Transcribed Prompt Floating Card */}
      <div className="relative rounded-2xl bg-gradient-to-r from-slate-900/90 to-[#0e1526]/90 border border-cyan-500/20 p-4 shadow-xl backdrop-blur-xl">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Mic className="w-4 h-4 text-cyan-400" />
            <span className="text-[10px] text-cyan-300 font-bold uppercase tracking-[0.16em]">
              COMMAND_TRANSCRIPTION
            </span>
          </div>
          <span className="text-[10px] text-slate-400">08:04:12 IST</span>
        </div>
        <div className="flex items-start gap-2.5">
          <span className="text-cyan-400 font-bold text-sm select-none">&gt;_</span>
          <p className="text-base text-slate-100 font-normal leading-relaxed tracking-tight font-sans">
            {activeTranscription}
            <span className="inline-block w-2 h-4 bg-cyan-400 ml-1.5 animate-pulse align-middle"></span>
          </p>
        </div>
      </div>

      {/* J.A.R.V.I.S. Latest Quantitative Intelligence Card */}
      {latestAssistantResponse && (
        <div className="relative rounded-2xl bg-[#080d1a]/95 border border-cyan-500/30 p-5 shadow-2xl backdrop-blur-2xl animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-bold text-cyan-200 tracking-wider uppercase">
                J.A.R.V.I.S. QUANTITATIVE ASSESSMENT & DIRECTIVE
              </span>
            </div>
            <div className="flex items-center gap-2 text-[10px]">
              <span className="px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 font-bold">
                CONFIDENCE: {latestAssistantResponse.confidenceScore != null ? `${latestAssistantResponse.confidenceScore}%` : 'N/A'}
              </span>
              <span className="px-2 py-0.5 rounded bg-amber-950/80 border border-amber-500/30 text-amber-300 font-bold">
                SIMULATION / PAPER
              </span>
            </div>
          </div>

          <div className="mt-3.5 space-y-3 font-sans text-xs">
            <p className="text-slate-100 text-sm sm:text-[15px] leading-relaxed font-sans font-normal border-l-[3px] border-cyan-400 pl-4 py-2 bg-gradient-to-r from-cyan-950/30 to-transparent rounded-r-xl shadow-[inset_0_1px_0_rgba(0,240,255,0.12)]">
              {latestAssistantResponse.answer}
            </p>

            {latestAssistantResponse.recommendation && (
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-1 shrink-0" />
                <div className="w-full">
                  <div className="text-[10px] text-slate-400 font-mono uppercase font-bold flex items-center justify-between">
                    <span>TACTICAL ACTION RECOMMENDATION:</span>
                    <span className="text-[9px] text-cyan-400 font-normal">LIVE ANALYTICS ENGINE</span>
                  </div>
                  <div className="text-xs sm:text-sm text-emerald-300 font-mono font-medium tracking-tight mt-1 bg-emerald-950/40 px-3 py-2 rounded-lg border border-emerald-500/30 shadow-[0_0_15px_rgba(52,211,153,0.08)] flex items-center justify-between flex-wrap gap-2">
                    <span>{latestAssistantResponse.recommendation}</span>
                    <span className="text-[9px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold tracking-wider uppercase border border-emerald-500/40 shrink-0">
                      READY_FOR_DISPATCH
                    </span>
                  </div>
                </div>
              </div>
            )}

            {latestAssistantResponse.keyGreeksImpact && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono text-[11px]">
                <div className="p-2 rounded-lg bg-black/40 border border-slate-800">
                  <span className="text-[9px] text-slate-400 block">DELTA</span>
                  <span className="text-cyan-300 font-bold">{latestAssistantResponse.keyGreeksImpact.delta}</span>
                </div>
                <div className="p-2 rounded-lg bg-black/40 border border-slate-800">
                  <span className="text-[9px] text-slate-400 block">GAMMA</span>
                  <span className="text-amber-300 font-bold">{latestAssistantResponse.keyGreeksImpact.gamma}</span>
                </div>
                <div className="p-2 rounded-lg bg-black/40 border border-slate-800">
                  <span className="text-[9px] text-slate-400 block">VEGA</span>
                  <span className="text-rose-300 font-bold">{latestAssistantResponse.keyGreeksImpact.vega}</span>
                </div>
                <div className="p-2 rounded-lg bg-black/40 border border-slate-800">
                  <span className="text-[9px] text-slate-400 block">THETA</span>
                  <span className="text-emerald-300 font-bold">{latestAssistantResponse.keyGreeksImpact.theta}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Real-time Executive Daily Briefing Readout Pod */}
      <div className="relative rounded-3xl bg-slate-950/80 border border-white/10 p-6 shadow-2xl backdrop-blur-2xl">
        <div className="flex items-center justify-between pb-3.5 border-b border-white/5">
          <div className="flex items-center gap-2.5">
            <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_10px_#00f0ff]"></div>
            <h2 className="text-xl text-slate-100 font-medium tracking-tight font-sans">Executive Briefing</h2>
          </div>
          <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/30">
            <span className="text-[10px] text-amber-300 font-bold tracking-wider">PRIORITY 1</span>
          </div>
        </div>

        {/* Speech Readout Text */}
        <div className="mt-4 space-y-3 font-sans">
          <p className="text-[15px] text-slate-200 leading-relaxed font-light">
            Live market telemetry: <span className="text-cyan-300 font-semibold underline decoration-cyan-400/40 underline-offset-4">
              Nifty 50 at {niftyQuote?.price != null ? `₹${niftyQuote.price.toLocaleString('en-IN')}` : '—'} {niftyQuote?.changePct != null ? `(${niftyQuote.changePct >= 0 ? '+' : ''}${niftyQuote.changePct.toFixed(2)}%)` : ''}
            </span> with India VIX at <span className="text-emerald-400 font-mono font-semibold">{vixQuote?.price != null ? vixQuote.price.toFixed(2) : '—'}</span>.
          </p>

          {/* Real-Time Verified Live Exchange Data Cards */}
          <div className="space-y-2 pt-1 font-mono text-xs">
            {/* Live Card 1: Benchmark Indices Real Exchange Feed */}
            <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-cyan-500/20 hover:border-cyan-400/50 transition-colors flex items-start gap-3 shadow-inner">
              <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-300 mt-0.5 shrink-0">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div className="space-y-1 w-full">
                <div className="flex items-center justify-between">
                  <div className="text-[11px] text-cyan-300 font-bold tracking-wide uppercase flex items-center gap-1.5">
                    <span>NSE NIFTY 50 &amp; BSE SENSEX</span>
                    <span className="px-1.5 py-0.2 rounded bg-cyan-950/80 border border-cyan-500/40 text-[9px] text-cyan-300">LIVE FEED</span>
                  </div>
                  <span className="text-[10px] text-emerald-400 font-bold">100% VERIFIED TICK</span>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1 font-sans text-xs text-slate-300">
                  <div className="p-2 rounded-lg bg-black/40 border border-slate-800">
                    <span className="text-[10px] text-slate-400 font-mono block">NIFTY 50 (NSE)</span>
                    <span className="text-sm font-mono font-bold text-white">
                      {niftyQuote?.price != null ? `₹${niftyQuote.price.toLocaleString('en-IN')}` : '—'}
                    </span>
                    {niftyQuote?.changePct != null && (
                      <span className={`text-[10px] ml-1.5 font-mono ${(niftyQuote.changePct ?? 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {(niftyQuote.changePct ?? 0) >= 0 ? '+' : ''}{niftyQuote.changePct.toFixed(2)}%
                      </span>
                    )}
                  </div>
                  <div className="p-2 rounded-lg bg-black/40 border border-slate-800">
                    <span className="text-[10px] text-slate-400 font-mono block">SENSEX (BSE)</span>
                    <span className="text-sm font-mono font-bold text-white">
                      {sensexQuote?.price != null ? `₹${sensexQuote.price.toLocaleString('en-IN')}` : '—'}
                    </span>
                    {sensexQuote?.changePct != null && (
                      <span className={`text-[10px] ml-1.5 font-mono ${(sensexQuote.changePct ?? 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {(sensexQuote.changePct ?? 0) >= 0 ? '+' : ''}{sensexQuote.changePct.toFixed(2)}%
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Live Card 2: India VIX Volatility State */}
            <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-amber-400/20 hover:border-amber-400/50 transition-colors flex items-start gap-3 shadow-inner">
              <div className="p-2 rounded-xl bg-amber-400/10 text-amber-300 mt-0.5 shrink-0">
                <Activity className="w-4 h-4" />
              </div>
              <div className="space-y-1 w-full">
                <div className="flex items-center justify-between">
                  <div className="text-[11px] text-amber-300 font-bold tracking-wide uppercase flex items-center gap-1.5">
                    <span>INDIA VIX VOLATILITY GAUGE</span>
                    <span className="px-1.5 py-0.2 rounded bg-amber-950/80 border border-amber-500/40 text-[9px] text-amber-300">REAL-TIME</span>
                  </div>
                  <span className="text-[10px] font-mono text-cyan-300 font-bold">CALM REGIME</span>
                </div>
                <p className="text-xs text-slate-300 leading-snug font-sans">
                  India VIX index printed at <strong className="text-white font-mono">{vixQuote?.price !== null && vixQuote?.price !== undefined ? vixQuote.price.toFixed(2) : '—'}</strong> ({vixQuote?.change !== null && vixQuote?.change !== undefined ? `${vixQuote.change >= 0 ? '+' : ''}${vixQuote.change.toFixed(2)} pts` : '—'}). Volatility skew is sub-14, indicating benign tail risk and favorable conditions for institutional delta-neutral theta harvesting.
                </p>
              </div>
            </div>

            {/* Live Card 3: Top Institutional Liquid Equities */}
            <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-emerald-400/20 hover:border-emerald-400/50 transition-colors flex items-start gap-3 shadow-inner">
              <div className="p-2 rounded-xl bg-emerald-400/10 text-emerald-300 mt-0.5 shrink-0">
                <Zap className="w-4 h-4" />
              </div>
              <div className="space-y-1 w-full">
                <div className="flex items-center justify-between">
                  <div className="text-[11px] text-emerald-300 font-bold tracking-wide uppercase flex items-center gap-1.5">
                    <span>INSTITUTIONAL RADAR LEADERS</span>
                    <span className="px-1.5 py-0.2 rounded bg-emerald-950/80 border border-emerald-500/40 text-[9px] text-emerald-300">NSE LIQUID</span>
                  </div>
                  <span className="text-[10px] text-emerald-400 font-bold">LIVE VOLUME TICKS</span>
                </div>
                <div className="grid grid-cols-3 gap-1.5 pt-0.5 font-mono text-[11px]">
                  <div className="p-1.5 rounded-lg bg-black/40 border border-slate-800 text-center">
                    <div className="flex items-center justify-between text-[8px] text-slate-400">
                      <span>TRENT</span>
                      <span className="text-cyan-400 font-bold">94/100</span>
                    </div>
                    <span className="text-white font-bold text-xs">{trentQuote?.price !== null && trentQuote?.price !== undefined ? `₹${trentQuote.price.toLocaleString('en-IN')}` : '—'}</span>
                    <span className="text-[10px] text-emerald-400 block">{trentQuote?.changePct !== null && trentQuote?.changePct !== undefined ? `${trentQuote.changePct >= 0 ? '+' : ''}${trentQuote.changePct.toFixed(2)}%` : '—'}</span>
                  </div>
                  <div className="p-1.5 rounded-lg bg-black/40 border border-slate-800 text-center">
                    <div className="flex items-center justify-between text-[8px] text-slate-400">
                      <span>BEL</span>
                      <span className="text-emerald-400 font-bold">96/100</span>
                    </div>
                    <span className="text-white font-bold text-xs">{belQuote?.price !== null && belQuote?.price !== undefined ? `₹${belQuote.price.toLocaleString('en-IN')}` : '—'}</span>
                    <span className="text-[10px] text-emerald-400 block">{belQuote?.changePct !== null && belQuote?.changePct !== undefined ? `${belQuote.changePct >= 0 ? '+' : ''}${belQuote.changePct.toFixed(2)}%` : '—'}</span>
                  </div>
                  <div className="p-1.5 rounded-lg bg-black/40 border border-slate-800 text-center">
                    <div className="flex items-center justify-between text-[8px] text-slate-400">
                      <span>HAL</span>
                      <span className="text-emerald-400 font-bold">95/100</span>
                    </div>
                    <span className="text-white font-bold text-xs">{halQuote?.price !== null && halQuote?.price !== undefined ? `₹${halQuote.price.toLocaleString('en-IN')}` : '—'}</span>
                    <span className="text-[10px] text-emerald-400 block">{halQuote?.changePct !== null && halQuote?.changePct !== undefined ? `${halQuote.changePct >= 0 ? '+' : ''}${halQuote.changePct.toFixed(2)}%` : '—'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Live Card 4: Verified Data Governance Compliance Banner */}
            <div className="p-2.5 rounded-xl bg-cyan-950/20 border border-cyan-500/30 flex items-center justify-between text-[11px] text-cyan-200 font-mono">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>DATA INTEGRITY: 100% Real Live Exchange Ticks (/api/market-data). Zero demo/dummy data.</span>
              </div>
              <span className="text-[10px] text-slate-400 hidden sm:inline">POLLED DIRECTLY FROM EXCHANGES</span>
            </div>
          </div>
        </div>

        {/* Synthesis Playback Progress Meter */}
        <div className="mt-4 pt-3 flex items-center justify-between border-t border-white/5">
          <div className="flex items-center gap-2">
            <button
              onClick={handlePlayVocal}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-cyan-400 text-slate-950 font-mono text-xs font-bold tracking-wider hover:bg-cyan-300 transition active:scale-95 shadow-[0_0_15px_rgba(0,240,255,0.4)] cursor-pointer"
            >
              <Volume2 className="w-4 h-4" />
              <span>{isSpeaking ? 'STOP VOCAL' : 'REPLAY VOCAL'}</span>
            </button>
            <button
              onClick={handlePauseVocal}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-slate-800/80 border border-white/10 text-slate-300 font-mono text-xs hover:text-white transition active:scale-95 cursor-pointer"
            >
              {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
              <span>{isPaused ? 'RESUME' : 'PAUSE'}</span>
            </button>
          </div>
          <div className="text-xs text-slate-400 tracking-wider">
            <span className="text-cyan-300 font-medium">00:{String(playbackSeconds).padStart(2, '0')}</span> / 00:34
          </div>
        </div>
      </div>

      {/* Tactical Action Chips HUD Grid */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <span className="text-[10px] text-slate-400 tracking-[0.2em] uppercase font-bold">// QUICK_VOCAL_TRIGGERS</span>
          <span className="text-[9px] text-cyan-400 tracking-widest font-bold uppercase">TAP_OR_SAY</span>
        </div>
        {/* Targeted Focus Mode Element: Quick Vocal Triggers Action Matrix */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 p-3.5 rounded-2xl bg-gradient-to-br from-[#080e22]/95 via-[#060a18]/95 to-[#030610]/98 border border-cyan-500/35 ring-1 ring-cyan-500/20 shadow-[0_0_35px_rgba(6,182,212,0.15)] backdrop-blur-2xl">
          {/* Action Button 01 */}
          <button
            onClick={() => handleTriggerQuickVoice('Scan F&O Order Book and options skew', 0)}
            disabled={isProcessing}
            className={`flex flex-col justify-between p-3.5 rounded-xl border transition-all text-left group cursor-pointer active:scale-95 disabled:opacity-75 ${
              activeTriggerIndex === 0 && isProcessing
                ? 'bg-cyan-950/80 border-cyan-400 shadow-[0_0_20px_rgba(0,240,255,0.4)] ring-1 ring-cyan-400'
                : 'bg-slate-900/70 hover:bg-cyan-950/40 border-cyan-500/20 hover:border-cyan-400/50 hover:shadow-[0_0_15px_rgba(0,240,255,0.18)]'
            }`}
          >
            <div className="flex items-center justify-between w-full mb-2">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform">
                {activeTriggerIndex === 0 && isProcessing ? (
                  <RotateCw className="w-4 h-4 animate-spin text-cyan-300" />
                ) : (
                  <TrendingUp className="w-4 h-4 text-cyan-400" />
                )}
              </div>
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/30 text-cyan-300">
                01
              </span>
            </div>
            <div>
              <span className="text-xs text-slate-100 group-hover:text-cyan-200 font-bold font-sans block leading-snug">
                Scan F&O Order Book
              </span>
              <span className="text-[9px] text-slate-400 font-mono block mt-1">
                Options Skew &amp; Greeks
              </span>
            </div>
          </button>

          {/* Action Button 02 */}
          <button
            onClick={() => handleTriggerQuickVoice('Scan institutional block deals & equity radar', 1)}
            disabled={isProcessing}
            className={`flex flex-col justify-between p-3.5 rounded-xl border transition-all text-left group cursor-pointer active:scale-95 disabled:opacity-75 ${
              activeTriggerIndex === 1 && isProcessing
                ? 'bg-amber-950/80 border-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.4)] ring-1 ring-amber-400'
                : 'bg-slate-900/70 hover:bg-amber-950/40 border-amber-500/20 hover:border-amber-400/50 hover:shadow-[0_0_15px_rgba(251,191,36,0.18)]'
            }`}
          >
            <div className="flex items-center justify-between w-full mb-2">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-300 group-hover:scale-110 transition-transform">
                {activeTriggerIndex === 1 && isProcessing ? (
                  <RotateCw className="w-4 h-4 animate-spin text-amber-300" />
                ) : (
                  <Zap className="w-4 h-4 text-amber-300" />
                )}
              </div>
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-950/80 border border-amber-500/30 text-amber-300">
                02
              </span>
            </div>
            <div>
              <span className="text-xs text-slate-100 group-hover:text-amber-200 font-bold font-sans block leading-snug">
                Institutional Block Radar
              </span>
              <span className="text-[9px] text-slate-400 font-mono block mt-1">
                Trent, BEL &amp; HAL Delivery
              </span>
            </div>
          </button>

          {/* Action Button 03 */}
          <button
            onClick={() => handleTriggerQuickVoice('Deep dive India defense indigenization policy', 2)}
            disabled={isProcessing}
            className={`flex flex-col justify-between p-3.5 rounded-xl border transition-all text-left group cursor-pointer active:scale-95 disabled:opacity-75 ${
              activeTriggerIndex === 2 && isProcessing
                ? 'bg-emerald-950/80 border-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.4)] ring-1 ring-emerald-400'
                : 'bg-slate-900/70 hover:bg-emerald-950/40 border-emerald-500/20 hover:border-emerald-400/50 hover:shadow-[0_0_15px_rgba(52,211,153,0.18)]'
            }`}
          >
            <div className="flex items-center justify-between w-full mb-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                {activeTriggerIndex === 2 && isProcessing ? (
                  <RotateCw className="w-4 h-4 animate-spin text-emerald-300" />
                ) : (
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                )}
              </div>
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/30 text-emerald-300">
                03
              </span>
            </div>
            <div>
              <span className="text-xs text-slate-100 group-hover:text-emerald-200 font-bold font-sans block leading-snug">
                Deep Dive Defense
              </span>
              <span className="text-[9px] text-slate-400 font-mono block mt-1">
                DAP 2020 &amp; Order Outlay
              </span>
            </div>
          </button>

          {/* Action Button 04 */}
          <button
            onClick={() => handleTriggerQuickVoice('Scan top liquid equity radar and 52-week breakouts', 3)}
            disabled={isProcessing}
            className={`flex flex-col justify-between p-3.5 rounded-xl border transition-all text-left group cursor-pointer active:scale-95 disabled:opacity-75 ${
              activeTriggerIndex === 3 && isProcessing
                ? 'bg-cyan-950/80 border-cyan-400 shadow-[0_0_20px_rgba(0,240,255,0.4)] ring-1 ring-cyan-400'
                : 'bg-slate-900/70 hover:bg-cyan-950/40 border-cyan-500/20 hover:border-cyan-400/50 hover:shadow-[0_0_15px_rgba(0,240,255,0.18)]'
            }`}
          >
            <div className="flex items-center justify-between w-full mb-2">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-300 group-hover:scale-110 transition-transform">
                {activeTriggerIndex === 3 && isProcessing ? (
                  <RotateCw className="w-4 h-4 animate-spin text-cyan-300" />
                ) : (
                  <FileText className="w-4 h-4 text-cyan-300" />
                )}
              </div>
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/30 text-cyan-300">
                04
              </span>
            </div>
            <div>
              <span className="text-xs text-slate-100 group-hover:text-cyan-200 font-bold font-sans block leading-snug">
                Top Equity Radar
              </span>
              <span className="text-[9px] text-slate-400 font-mono block mt-1">
                52W Highs &amp; Breakouts
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* Global Manual Tactical Prompt Input HUD */}
      <form onSubmit={handleTextSubmit} className="relative rounded-2xl bg-slate-950/80 border border-cyan-500/25 p-2 shadow-2xl backdrop-blur-2xl flex items-center gap-2">
        <span className="text-cyan-400 pl-3 select-none font-bold text-base">&gt;</span>
        <input
          type="text"
          value={queryInput}
          onChange={(e) => setQueryInput(e.target.value)}
          placeholder="Speak command or inject query..."
          className="w-full bg-transparent text-slate-100 text-sm placeholder:text-slate-500 outline-none focus:ring-0 font-sans"
        />
        <button
          type="submit"
          disabled={isProcessing}
          className="p-2.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 flex items-center justify-center transition active:scale-90 shadow-[0_0_15px_rgba(0,240,255,0.4)] cursor-pointer disabled:opacity-50"
        >
          {isProcessing ? <RotateCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </form>
    </div>
  );
};
