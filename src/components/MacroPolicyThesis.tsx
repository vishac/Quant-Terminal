import React, { useState } from 'react';
import { 
  Globe, 
  TrendingUp, 
  CheckCircle2, 
  ArrowUpRight, 
  ShieldCheck, 
  Zap, 
  Activity, 
  Cpu, 
  Share2, 
  RefreshCw,
  Sliders,
  Award,
  Flame,
  Layers
} from 'lucide-react';
import { useLiveMarketData } from '../services/liveMarketService';

export const MacroPolicyThesis: React.FC = () => {
  const { quotes } = useLiveMarketData(5000);
  const belQuote = quotes['BEL.NS'] || { price: null, changePct: null };
  const tataQuote = quotes['TATAMOTORS.NS'] || quotes['TCS.NS'] || { price: null, changePct: null };

  const [activeScenario, setActiveScenario] = useState<'BASE_CASE' | 'ACCELERATED_PIL6'>('BASE_CASE');
  const [modelWeightToast, setModelWeightToast] = useState<string | null>(null);

  const handleReWeight = () => {
    setModelWeightToast('[MODEL RE-WEIGHTED]: Monte Carlo N=10,000 portfolio alpha updated to +18.4% vs Nifty 50.');
    setTimeout(() => setModelWeightToast(null), 4000);
  };

  return (
    <div className="flex flex-col gap-6 w-full font-mono">
      {/* HUD Telemetry Header Ribbon */}
      <div className="relative w-full rounded-2xl bg-[#080d1a]/95 backdrop-blur-2xl p-6 border border-cyan-500/20 shadow-2xl overflow-hidden">
        <div className="absolute -right-8 -top-8 w-28 h-28 bg-cyan-400/10 rounded-full blur-2xl pointer-events-none"></div>

        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
            <span className="text-[10px] text-cyan-300 uppercase tracking-widest font-bold">
              DEEP-THESIS // SEC-HORIZON
            </span>
          </div>
          <div className="flex items-center gap-1.5 bg-slate-900/80 border border-slate-800 px-3 py-1 rounded-lg text-xs">
            <span className="text-emerald-400 font-bold">LATENCY: 18ms</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
          </div>
        </div>

        <h1 className="text-3xl font-extrabold text-slate-100 tracking-tight leading-snug font-sans">
          MACRO INTEL & POLICY NEXUS
          <span className="block text-cyan-300 text-xl font-bold tracking-wider font-mono mt-0.5">
            HORIZON 2025–2030
          </span>
        </h1>

        <div className="flex flex-wrap items-center justify-between mt-3 pt-3 border-t border-slate-800 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-400">GEO-ANCHOR:</span>
            <span className="text-cyan-300 font-bold px-2 py-0.5 bg-cyan-950/60 border border-cyan-500/30 rounded-md">
              BHARAT (IND) SOVEREIGN
            </span>
          </div>
          <span className="text-amber-400 font-bold">MULTIVARIATE SIM v8.2</span>
        </div>
      </div>

      {modelWeightToast && (
        <div className="p-3.5 rounded-xl bg-cyan-950/80 border border-cyan-500/40 text-cyan-200 text-xs flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-cyan-400" />
          <span>{modelWeightToast}</span>
        </div>
      )}

      {/* Multi-Year Horizon Vector HUD Simulation Card */}
      <div className="relative w-full rounded-2xl bg-[#080d1a]/95 p-6 border border-cyan-500/20 shadow-2xl overflow-hidden">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              <span className="text-[10px] text-cyan-300 uppercase tracking-wider font-bold">
                SOVEREIGN CAPEX VECTOR SIMULATOR
              </span>
            </div>
            <div className="text-xl text-slate-100 mt-1 font-bold font-sans">
              5-Year Growth Trajectory
            </div>
          </div>
          <div className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-right">
            <span className="block text-[9px] text-slate-400 uppercase">CONFIDENCE</span>
            <span className="text-sm text-emerald-400 font-bold">96.4%</span>
          </div>
        </div>

        {/* Interactive Holographic Radar & Vector Field */}
        <div className="relative my-4 flex flex-col items-center justify-center py-2">
          <div className="relative w-full max-w-[420px] aspect-[16/9] flex items-center justify-center">
            <svg className="w-full h-full" fill="none" viewBox="0 0 320 180" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <radialGradient cx="50%" cy="50%" id="hologramGlow" r="50%">
                  <stop offset="0%" stopColor="#00f0ff" stopOpacity="0.22" />
                  <stop offset="60%" stopColor="#00f0ff" stopOpacity="0.05" />
                  <stop offset="100%" stopColor="#00f0ff" stopOpacity="0" />
                </radialGradient>
                <linearGradient id="areaGradient" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#00f0ff" stopOpacity="0.35" />
                  <stop offset="70%" stopColor="#feb700" stopOpacity="0.12" />
                  <stop offset="100%" stopColor="#0e131f" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              <circle cx="160" cy="90" r="75" stroke="#3b494b" strokeDasharray="3 3" strokeOpacity="0.3" />
              <circle cx="160" cy="90" r="50" stroke="#3b494b" strokeDasharray="3 3" strokeOpacity="0.3" />
              <circle cx="160" cy="90" r="25" stroke="#00f0ff" strokeOpacity="0.2" />
              <circle cx="160" cy="90" fill="url(#hologramGlow)" r="75" />

              <line stroke="#3b494b" strokeOpacity="0.3" x1="160" x2="160" y1="10" y2="170" />
              <line stroke="#3b494b" strokeOpacity="0.3" x1="30" x2="290" y1="90" y2="90" />
              <line stroke="#3b494b" strokeOpacity="0.2" x1="60" x2="260" y1="35" y2="145" />
              <line stroke="#3b494b" strokeOpacity="0.2" x1="60" x2="260" y1="145" y2="35" />

              <polygon fill="url(#areaGradient)" points="160,35 220,60 210,135 125,125 105,75" stroke="#00f0ff" strokeWidth="1.8" />

              <circle cx="160" cy="35" fill="#7df4ff" r="3.5" />
              <circle cx="220" cy="60" fill="#feb700" r="3.5" />
              <circle cx="210" cy="135" fill="#00dbe9" r="3" />
              <circle cx="125" cy="125" fill="#34f6a8" r="3" />
              <circle cx="105" cy="75" fill="#ffdea8" r="3.5" />

              <text fill="#dbfcff" fontFamily="JetBrains Mono" fontSize="8" fontWeight="600" textAnchor="middle" x="160" y="24">
                SEMI / FAB [9.2x]
              </text>
              <text fill="#feb700" fontFamily="JetBrains Mono" fontSize="8" textAnchor="start" x="235" y="62">
                DEFENSE INDIGENOUS
              </text>
              <text fill="#34f6a8" fontFamily="JetBrains Mono" fontSize="8" textAnchor="start" x="220" y="148">
                GREEN H2 (5 MMT)
              </text>
              <text fill="#849495" fontFamily="JetBrains Mono" fontSize="8" textAnchor="end" x="80" y="138">
                EV SUPPLY BASE
              </text>
              <text fill="#7df4ff" fontFamily="JetBrains Mono" fontSize="8" textAnchor="end" x="75" y="72">
                POWER MULTIPLIER
              </text>
            </svg>

            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800 backdrop-blur-sm">
                <span className="text-[10px] text-slate-400 block uppercase">MACRO CAGR</span>
                <span className="text-xl text-cyan-200 font-bold">+24.8%</span>
              </div>
            </div>
          </div>
        </div>

        {/* HUD Telemetry Tickers */}
        <div className="grid grid-cols-3 gap-3 pt-2">
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 text-center">
            <span className="text-[10px] text-slate-400 block">CAPEX SPILLOVER</span>
            <span className="text-base text-cyan-300 font-bold">4.2x MULT</span>
          </div>
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 text-center">
            <span className="text-[10px] text-slate-400 block">SOV SPREAD</span>
            <span className="text-base text-emerald-400 font-bold">-42 BPS</span>
          </div>
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 text-center">
            <span className="text-[10px] text-slate-400 block">FDI PIPELINE</span>
            <span className="text-base text-amber-300 font-bold">$118B</span>
          </div>
        </div>
      </div>

      {/* Real-Time Sentiment & News Radar Metric Hub */}
      <div className="w-full rounded-2xl bg-[#080d1a]/95 p-6 border border-cyan-500/20 shadow-xl">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="relative w-2.5 h-2.5">
              <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping"></span>
              <span className="relative block w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
            </div>
            <span className="text-sm font-bold text-slate-100 font-sans">Algorithmic Sentiment Radar</span>
          </div>
          <span className="text-[10px] px-2.5 py-0.5 rounded-md bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 font-bold">
            LIVE STREAM
          </span>
        </div>

        {/* Large Gauge Readout Bar */}
        <div className="bg-slate-950/80 rounded-xl p-4 border border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-cyan-300">AGGREGATE SENTIMENT CONVERGENCE</span>
            <span className="text-lg text-emerald-400 font-bold tracking-tight">88% BULLISH</span>
          </div>

          <div className="w-full h-3 rounded-full bg-slate-900 overflow-hidden flex p-0.5 border border-slate-800">
            <div className="h-full bg-emerald-400 rounded-l-full shadow-[0_0_8px_#34f6a8]" style={{ width: '88%' }}></div>
            <div className="h-full bg-amber-400" style={{ width: '8%' }}></div>
            <div className="h-full bg-rose-500 rounded-r-full" style={{ width: '4%' }}></div>
          </div>

          <div className="flex justify-between items-center mt-2 text-[10px] text-slate-400">
            <span className="text-emerald-400 font-bold">BULLISH: 88%</span>
            <span className="text-amber-300 font-bold">NEUTRAL: 8%</span>
            <span className="text-rose-400 font-bold">BEARISH: 4%</span>
          </div>
        </div>

        {/* Data Ingestion Monospace Tally */}
        <div className="grid grid-cols-3 gap-3 mt-4 text-center">
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3">
            <span className="text-[10px] text-slate-400 block">SCANNED CORPUS</span>
            <span className="text-lg text-cyan-300 font-bold">14,280</span>
            <span className="text-[10px] text-slate-500 block">News Dispatches</span>
          </div>
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3">
            <span className="text-[10px] text-slate-400 block">GAZETTES</span>
            <span className="text-lg text-amber-300 font-bold">342</span>
            <span className="text-[10px] text-slate-500 block">Notifications</span>
          </div>
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3">
            <span className="text-[10px] text-slate-400 block">PARLIAMENT</span>
            <span className="text-lg text-emerald-400 font-bold">89</span>
            <span className="text-[10px] text-slate-500 block">Standing Papers</span>
          </div>
        </div>
      </div>

      {/* Macro Catalyst & Union Policy Milestones */}
      <div className="w-full flex flex-col space-y-4">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-cyan-400" />
            <span className="text-base text-slate-100 font-bold font-sans">Union Catalyst Matrix</span>
          </div>
          <span className="text-xs text-slate-400">FY2025-30 MANDATES</span>
        </div>

        {/* Milestone 1 */}
        <div className="rounded-2xl bg-[#080d1a]/95 p-5 border border-cyan-500/20 shadow-xl relative overflow-hidden">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 rounded bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-[10px] font-bold">
                  POL-PLI-02
                </span>
                <span className="text-[10px] text-slate-400">ACTIVE ALLOCATION</span>
              </div>
              <h2 className="text-base text-slate-100 font-bold font-sans">
                PLI 2.0 Semiconductor & EV Components
              </h2>
            </div>
            <span className="text-base text-cyan-300 font-bold whitespace-nowrap">₹76,000 Cr</span>
          </div>

          <p className="text-xs text-slate-400 mt-2 leading-relaxed font-sans">
            High-priority sovereign capital for ATMP nodes, compound fab fabrication, and tier-1 high-voltage EV powertrain clusters.
          </p>

          <div className="mt-3 bg-slate-950/80 border border-slate-800 rounded-xl p-3">
            <div className="flex items-center justify-between mb-1.5 text-xs">
              <span className="text-slate-300">DISBURSEMENT LIFECYCLE</span>
              <span className="text-cyan-300 font-bold">64% ACHIEVED</span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden">
              <div className="h-full bg-cyan-400 rounded-full" style={{ width: '64%' }}></div>
            </div>
            <div className="flex items-center justify-between mt-1.5 text-[10px] text-slate-400">
              <span>₹48,640 Cr Executed</span>
              <span>Target Close: Q3 2026</span>
            </div>
          </div>
        </div>

        {/* Milestone 2 */}
        <div className="rounded-2xl bg-[#080d1a]/95 p-5 border border-emerald-500/20 shadow-xl">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold">
                  MISSION-H2
                </span>
                <span className="text-[10px] text-slate-400">CORRELATION: 0.89</span>
              </div>
              <h2 className="text-base text-slate-100 font-bold font-sans">
                National Green Hydrogen Mission
              </h2>
            </div>
            <div className="text-right">
              <span className="text-base text-emerald-400 font-bold">5 MMT / yr</span>
              <span className="block text-[10px] text-slate-400">by 2030</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-3 text-xs">
            <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl">
              <span className="text-[10px] text-slate-400 block">CORE BENEFICIARY</span>
              <span className="text-slate-200 font-bold font-sans">Renewables & Electrolyzers</span>
              <span className="text-[10px] text-emerald-400 block mt-0.5">Tata Power, L&T, Adani</span>
            </div>
            <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl">
              <span className="text-[10px] text-slate-400 block">OFFTAKE MANDATE</span>
              <span className="text-slate-200 font-bold font-sans">Refineries & Steel Hubs</span>
              <span className="text-[10px] text-cyan-300 block mt-0.5">30% Blending Mandate</span>
            </div>
          </div>
        </div>

        {/* Milestone 3 */}
        <div className="rounded-2xl bg-[#080d1a]/95 p-5 border border-amber-500/20 shadow-xl">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[10px] font-bold">
                  PIL-05 DEFENSE
                </span>
                <span className="text-[10px] text-slate-400">EMBARGO LISTING</span>
              </div>
              <h2 className="text-base text-slate-100 font-bold font-sans">
                Positive Indigenisation List (PIL-5)
              </h2>
            </div>
            <div className="text-right">
              <span className="text-base text-amber-300 font-bold">92%</span>
              <span className="block text-[10px] text-slate-400">Procurement</span>
            </div>
          </div>

          <div className="mt-3 p-3 bg-slate-950/80 border border-slate-800 rounded-xl flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-amber-400" />
              <div>
                <span className="text-slate-200 font-bold block font-sans">Mandated Indigenous Content</span>
                <span className="text-[11px] text-slate-400 font-sans">
                  Import block placed on 509 sub-systems & airborne radar electronics
                </span>
              </div>
            </div>
            <span className="text-xs text-amber-300 px-3 py-1 bg-amber-950/60 border border-amber-500/30 rounded-lg font-bold">
              Q4 FY25
            </span>
          </div>
        </div>
      </div>

      {/* Stock Logic & Institutional Bot Recommendation Matrix */}
      <div className="w-full flex flex-col space-y-4">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-emerald-400" />
            <span className="text-base text-slate-100 font-bold font-sans">Institutional Bot Logic Stack</span>
          </div>
          <span className="text-xs text-cyan-300 font-bold">QUANT-VERIFIED</span>
        </div>

        {/* Target Asset 1: BEL */}
        <div className="rounded-2xl bg-[#080d1a]/95 p-5 border border-cyan-500/20 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg text-cyan-200 font-bold">BEL</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400">
                  NSE: BEL • {belQuote?.price !== null && belQuote?.price !== undefined ? `₹${belQuote.price.toLocaleString('en-IN')}` : '—'} {belQuote?.changePct !== null && belQuote?.changePct !== undefined ? `(${belQuote.changePct >= 0 ? '+' : ''}${belQuote.changePct.toFixed(2)}%)` : ''}
                </span>
              </div>
              <span className="text-xs text-slate-400 font-sans">Bharat Electronics Limited // Radar & Avionics</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 block uppercase">3-5Y PROJ REVENUE CAGR</span>
              <span className="text-base text-emerald-400 font-bold">+26.4%</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
              <span className="text-[10px] text-slate-400 block">BOOK-TO-BILL RATIO</span>
              <span className="text-sm text-cyan-300 font-bold">3.8x Sovereign</span>
              <span className="text-[10px] text-slate-500 block mt-0.5">Order pipeline: ₹76,200 Cr</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
              <span className="text-[10px] text-slate-400 block">EXPORT SPILLOVER</span>
              <span className="text-sm text-amber-300 font-bold">+38% YoY</span>
              <span className="text-[10px] text-slate-500 block mt-0.5">ASEAN + Middle-East allies</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/90 border border-slate-800">
            <div className="flex items-center gap-2 mb-1 text-cyan-300 text-xs font-bold">
              <Activity className="w-3.5 h-3.5" />
              <span>BOT RATIONALE SYNTHESIS</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed font-sans">
              Direct monopolistic moat under PIL-5 mandates. Zero foreign bidder competition on naval sonars and EW suites. Multiplier benefit guaranteed through FY29 sovereign fiscal allocation.
            </p>
          </div>
        </div>

        {/* Target Asset 2: Tata Motors */}
        <div className="rounded-2xl bg-[#080d1a]/95 p-5 border border-cyan-500/20 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg text-cyan-200 font-bold">TATAMOTORS</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400">
                  NSE: TATAMOTORS • {tataQuote?.price !== null && tataQuote?.price !== undefined ? `₹${tataQuote.price.toLocaleString('en-IN')}` : '—'} {tataQuote?.changePct !== null && tataQuote?.changePct !== undefined ? `(${tataQuote.changePct >= 0 ? '+' : ''}${tataQuote.changePct.toFixed(2)}%)` : ''}
                </span>
              </div>
              <span className="text-xs text-slate-400 font-sans">Tata Motors Limited // EV Ecosystem & CV Fleet</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 block uppercase">3-5Y PROJ REVENUE CAGR</span>
              <span className="text-base text-emerald-400 font-bold">+23.2%</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
              <span className="text-[10px] text-slate-400 block">DOMESTIC EV SHARE</span>
              <span className="text-sm text-cyan-300 font-bold">69.4% Volume</span>
              <span className="text-[10px] text-slate-500 block mt-0.5">Agratas Giga-Fab integration</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
              <span className="text-[10px] text-slate-400 block">DELEVERAGING</span>
              <span className="text-sm text-emerald-400 font-bold">Net Auto Debt = 0</span>
              <span className="text-[10px] text-slate-500 block mt-0.5">Free Cash Flow ₹29,000 Cr</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/90 border border-slate-800">
            <div className="flex items-center gap-2 mb-1 text-cyan-300 text-xs font-bold">
              <Zap className="w-3.5 h-3.5" />
              <span>BOT RATIONALE SYNTHESIS</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed font-sans">
              Unrivalled localized supply chain beneficiary under PLI 2.0 component framework. Commercial vehicle fleet replacement cycle amplified by national clean air incentives.
            </p>
          </div>
        </div>
      </div>

      {/* Deep Scenario Stress Testing Controls */}
      <div className="rounded-2xl bg-[#080d1a]/95 p-6 border border-cyan-500/20 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs text-slate-200 font-bold uppercase">
            SCENARIO RUNNER // POLICY STRESS VECTORS
          </span>
          <span className="text-xs text-cyan-400 font-bold">MONTE CARLO (N=10,000)</span>
        </div>

        <div className="space-y-3">
          <div
            onClick={() => setActiveScenario('BASE_CASE')}
            className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all ${
              activeScenario === 'BASE_CASE'
                ? 'bg-slate-900 border-emerald-500/50 shadow-md'
                : 'bg-slate-950/60 border-slate-800'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                activeScenario === 'BASE_CASE' ? 'border-emerald-400 bg-emerald-400' : 'border-slate-600'
              }`}>
                {activeScenario === 'BASE_CASE' && <span className="w-1.5 h-1.5 rounded-full bg-slate-950"></span>}
              </span>
              <div>
                <span className="text-xs text-slate-100 font-bold block font-sans">
                  Base Case: Sovereign Capex Sustained (8.5% YoY)
                </span>
                <span className="text-[11px] text-slate-400 font-sans">
                  Projected Portfolio Alpha: +18.4% vs Nifty 50
                </span>
              </div>
            </div>
            <span className="text-[10px] px-2.5 py-1 rounded bg-slate-950 border border-slate-800 text-cyan-300 font-bold">
              ACTIVE
            </span>
          </div>

          <div
            onClick={() => setActiveScenario('ACCELERATED_PIL6')}
            className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all ${
              activeScenario === 'ACCELERATED_PIL6'
                ? 'bg-slate-900 border-amber-500/50 shadow-md'
                : 'bg-slate-950/60 border-slate-800'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                activeScenario === 'ACCELERATED_PIL6' ? 'border-amber-400 bg-amber-400' : 'border-slate-600'
              }`}>
                {activeScenario === 'ACCELERATED_PIL6' && <span className="w-1.5 h-1.5 rounded-full bg-slate-950"></span>}
              </span>
              <div>
                <span className="text-xs text-slate-100 font-bold block font-sans">
                  Accelerated Indigenization (Target PIL-6 Fast Track)
                </span>
                <span className="text-[11px] text-slate-400 font-sans">
                  Defense Multiplier Expands BEL EBITDA +320 Bps
                </span>
              </div>
            </div>
            <span className="text-[10px] px-2.5 py-1 rounded bg-slate-950 border border-slate-800 text-slate-400 font-bold">
              SIM
            </span>
          </div>
        </div>

        {/* Action Bar */}
        <div className="mt-5 pt-4 flex items-center gap-3 border-t border-slate-800">
          <button
            onClick={handleReWeight}
            className="flex-1 py-3 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold uppercase tracking-wider text-xs flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(0,240,255,0.3)] cursor-pointer active:scale-95 transition-all"
          >
            <Sliders className="w-4 h-4" />
            <span>Re-Weight Portfolio Model</span>
          </button>
          <button
            onClick={() => {
              setModelWeightToast('Model scenario exported as encrypted PDF research note.');
              setTimeout(() => setModelWeightToast(null), 4000);
            }}
            className="p-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-cyan-300 flex items-center justify-center cursor-pointer"
          >
            <Share2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
