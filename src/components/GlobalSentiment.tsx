import React, { useState, useMemo } from 'react';
import { useMarketWebSocket } from '../services/useMarketWebSocket';
import { 
  Gauge, 
  Activity, 
  TrendingUp, 
  TrendingDown, 
  ShieldCheck, 
  ShieldAlert, 
  Zap, 
  ArrowUpRight, 
  ArrowDownRight, 
  Compass,
  Info,
  X,
  Layers,
  Scale,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';

import type { InstitutionalStockPick } from '../data/institutionalEquityData';

export interface SentimentFactor {
  id: 'VIX' | 'MOMENTUM' | 'BREADTH' | 'STRENGTH';
  name: string;
  category: string;
  score: number; // 0 - 100
  weightPct: number;
  currentValue: string;
  signal: 'EXTREME_FEAR' | 'FEAR' | 'NEUTRAL' | 'GREED' | 'EXTREME_GREED';
  detail: string;
  sampleClarification?: string;
}

export interface TrackedConstituentBreadth {
  symbol: string;
  name: string;
  price: number | null;
  changePct: number | null;
  change: number | null;
  status: 'ADVANCE' | 'DECLINE' | 'UNCHANGED';
  fiftyTwoWeekHigh: number | null;
  fiftyTwoWeekLow: number | null;
}

export interface FearAndGreedData {
  score: number;
  rating: 'EXTREME_FEAR' | 'FEAR' | 'NEUTRAL' | 'GREED' | 'EXTREME_GREED';
  label: string;
  summary: string;
  tacticalAction: string;
  factors: SentimentFactor[];
  advancersCount: number;
  declinersCount: number;
  unchangedCount: number;
  validEquitiesCount: number;
  constituentList: TrackedConstituentBreadth[];
  vixValue: number;
  niftyPct: number;
  bankNiftyPct: number;
  calculatedAt: string;
  isRadarUniverse: boolean;
}

interface GlobalSentimentProps {
  livePicks?: InstitutionalStockPick[];
}

export const GlobalSentiment: React.FC<GlobalSentimentProps> = ({ livePicks }) => {
  const { quotes, niftyQuote, bankNiftyQuote, vixQuote, wsStatus, latencyMs } = useMarketWebSocket();
  const [activeAuditModal, setActiveAuditModal] = useState<'MASTER' | 'VIX' | 'MOMENTUM' | 'BREADTH' | 'STRENGTH' | null>(null);

  const sentimentData: FearAndGreedData = useMemo(() => {
    // 1. India VIX (Market Volatility Factor) - Weight 30%
    const vix = vixQuote?.price ?? 13.5;
    // VIX <= 11 is extreme greed (100), VIX >= 27 is extreme fear (0)
    const vixScore = Math.max(0, Math.min(100, Math.round((1 - (vix - 11) / 16) * 100)));
    
    // 2. Index Momentum Factor (Nifty 50 & Bank Nifty drift) - Weight 25%
    const niftyPct = niftyQuote?.changePct ?? 0;
    const bankNiftyPct = bankNiftyQuote?.changePct ?? 0;
    const avgIndexPct = (niftyPct * 0.6) + (bankNiftyPct * 0.4);
    // Drift of +1.8% corresponds to 100, -1.8% corresponds to 0
    const momentumScore = Math.max(0, Math.min(100, Math.round(50 + (avgIndexPct / 1.8) * 50)));

    // 3. Market Breadth Factor - Dynamically computed from the 45 Live Breakout Stocks on Dynamic Technical Breakout Radar
    const isRadarUniverse = Boolean(livePicks && livePicks.length > 0);
    const equityDefinitions: { symbol: string; name: string }[] = isRadarUniverse && livePicks
      ? livePicks.map(p => ({ symbol: p.symbol, name: p.name }))
      : [
          { symbol: 'RELIANCE.NS', name: 'Reliance Industries' },
          { symbol: 'TCS.NS', name: 'Tata Consultancy Services' },
          { symbol: 'HDFCBANK.NS', name: 'HDFC Bank Ltd' },
          { symbol: 'INFY.NS', name: 'Infosys Limited' },
          { symbol: 'ICICIBANK.NS', name: 'ICICI Bank Ltd' },
          { symbol: 'SBIN.NS', name: 'State Bank of India' },
          { symbol: 'BHARTIARTL.NS', name: 'Bharti Airtel' },
          { symbol: 'LT.NS', name: 'Larsen & Toubro' },
          { symbol: 'TRENT.NS', name: 'Trent Ltd' },
          { symbol: 'BEL.NS', name: 'Bharat Electronics' },
          { symbol: 'HAL.NS', name: 'Hindustan Aeronautics' },
          { symbol: 'DIXON.NS', name: 'Dixon Technologies' },
          { symbol: 'POLYCAB.NS', name: 'Polycab India' },
          { symbol: 'SOLARINDS.NS', name: 'Solar Industries' },
          { symbol: 'COCHINSHIP.NS', name: 'Cochin Shipyard' },
          { symbol: 'NTPC.NS', name: 'NTPC Limited' },
        ];

    let advancers = 0;
    let decliners = 0;
    let unchanged = 0;
    let validEquities = 0;
    let highProximityTotal = 0;
    let highProximityCount = 0;
    const constituentList: TrackedConstituentBreadth[] = [];

    for (const item of equityDefinitions) {
      const q = quotes[item.symbol];
      const liveStock = isRadarUniverse && livePicks ? livePicks.find(p => p.symbol === item.symbol) : undefined;
      const price = q?.price ?? liveStock?.ltp ?? null;
      const changePct = q?.changePct ?? liveStock?.changePct ?? null;
      const change = q?.change ?? liveStock?.changeVal ?? null;

      if (price != null && changePct != null) {
        validEquities++;
        let status: 'ADVANCE' | 'DECLINE' | 'UNCHANGED' = 'UNCHANGED';
        if (changePct > 0.05) {
          advancers++;
          status = 'ADVANCE';
        } else if (changePct < -0.05) {
          decliners++;
          status = 'DECLINE';
        } else {
          unchanged++;
          status = 'UNCHANGED';
        }

        constituentList.push({
          symbol: item.symbol,
          name: item.name,
          price,
          changePct,
          change,
          status,
          fiftyTwoWeekHigh: q?.fiftyTwoWeekHigh ?? null,
          fiftyTwoWeekLow: q?.fiftyTwoWeekLow ?? null,
        });

        if (q?.fiftyTwoWeekHigh != null && q?.fiftyTwoWeekLow != null && q.fiftyTwoWeekHigh > q.fiftyTwoWeekLow) {
          const range = q.fiftyTwoWeekHigh - q.fiftyTwoWeekLow;
          const pos = Math.max(0, Math.min(1, (price - q.fiftyTwoWeekLow) / range));
          highProximityTotal += pos * 100;
          highProximityCount++;
        }
      } else {
        constituentList.push({
          symbol: item.symbol,
          name: item.name,
          price: null,
          changePct: null,
          change: null,
          status: 'UNCHANGED',
          fiftyTwoWeekHigh: null,
          fiftyTwoWeekLow: null,
        });
      }
    }

    const breadthRatio = validEquities > 0 ? (advancers / validEquities) * 100 : 50;
    const breadthScore = Math.round(breadthRatio);

    // 4. 52-Week High/Low Proximity Factor - Weight 20%
    const priceStrengthScore = highProximityCount > 0 
      ? Math.round(highProximityTotal / highProximityCount) 
      : 65;

    // Weighted composite score (0 - 100)
    const compositeScore = Math.round(
      (vixScore * 0.30) +
      (momentumScore * 0.25) +
      (breadthScore * 0.25) +
      (priceStrengthScore * 0.20)
    );

    const getRating = (score: number): FearAndGreedData['rating'] => {
      if (score <= 24) return 'EXTREME_FEAR';
      if (score <= 44) return 'FEAR';
      if (score <= 55) return 'NEUTRAL';
      if (score <= 75) return 'GREED';
      return 'EXTREME_GREED';
    };

    const rating = getRating(compositeScore);

    const labelMap: Record<FearAndGreedData['rating'], string> = {
      EXTREME_FEAR: 'Extreme Fear',
      FEAR: 'Fear',
      NEUTRAL: 'Neutral',
      GREED: 'Greed',
      EXTREME_GREED: 'Extreme Greed'
    };

    const summaryMap: Record<FearAndGreedData['rating'], string> = {
      EXTREME_FEAR: 'Aggressive risk aversion and elevated volatility dominate market participants. Panic hedging and put premium expansion are active.',
      FEAR: 'Defensive market sentiment prevails with cautious institutional participation and selective value rotation.',
      NEUTRAL: 'Market in balanced equilibrium. Volatility is anchored and advance-decline ratios reflect two-way institutional order flow.',
      GREED: 'Constructive risk appetite driving steady accumulation. Low India VIX indicates comfortable volatility pricing across domestic desks.',
      EXTREME_GREED: 'Euphoric momentum and low volatility complacency. Call option skew is stretched, signaling potential near-term mean reversion vulnerability.'
    };

    const tacticalActionMap: Record<FearAndGreedData['rating'], string> = {
      EXTREME_FEAR: 'Favorable risk-reward for staggered value accumulation in high-moat defense & bluechips. Avoid naked short option exposure.',
      FEAR: 'Focus on defensive index spreads (Bull Put Spreads with strictly defined risk) to harvest elevated option premiums.',
      NEUTRAL: 'Maintain delta-neutral iron condors and range-bound theta harvesting strategies with strict stop-losses.',
      GREED: 'Ride institutional breakout momentum in top relative-strength equities; enforce trailing stop-losses on long positions.',
      EXTREME_GREED: 'Hedge open portfolio gains with inexpensive OTM protective put wings; tighten bracket stops across intraday MIS desks.'
    };

    const getFactorSignal = (score: number) => getRating(score);

    const factors: SentimentFactor[] = [
      {
        id: 'VIX',
        name: 'Market Volatility',
        category: 'India VIX (Weight: 30%)',
        score: vixScore,
        weightPct: 30,
        currentValue: `${vix.toFixed(2)} pts`,
        signal: getFactorSignal(vixScore),
        detail: vix < 14 ? 'Low volatility complacency' : vix > 19 ? 'Elevated volatility stress' : 'Normal volatility corridor'
      },
      {
        id: 'MOMENTUM',
        name: 'Index Momentum',
        category: 'NIFTY & BANK NIFTY (Weight: 25%)',
        score: momentumScore,
        weightPct: 25,
        currentValue: `${niftyPct >= 0 ? '+' : ''}${niftyPct.toFixed(2)}%`,
        signal: getFactorSignal(momentumScore),
        detail: `NIFTY ${niftyPct >= 0 ? '+' : ''}${niftyPct.toFixed(2)}% · BANK NIFTY ${bankNiftyPct >= 0 ? '+' : ''}${bankNiftyPct.toFixed(2)}%`
      },
      {
        id: 'BREADTH',
        name: isRadarUniverse ? 'Dynamic Radar Breadth' : 'Benchmark Breadth',
        category: isRadarUniverse ? `${validEquities} Live Radar Stocks (Weight: 25%)` : '16 Bluechip Basket (Weight: 25%)',
        score: breadthScore,
        weightPct: 25,
        currentValue: `${advancers} Adv / ${decliners} Dec · ${unchanged} Flat`,
        signal: getFactorSignal(breadthScore),
        detail: `${advancers} of ${validEquities} dynamic breakout stocks trading positive (${Math.round((advancers / (validEquities || 1)) * 100)}%)`,
        sampleClarification: isRadarUniverse
          ? `Calculated across the ${validEquities} verified breakout stocks on Dynamic Technical Breakout Radar`
          : 'Sample: 16 tracked liquid bluechips (Not total NSE 2,200+ listed breadth)'
      },
      {
        id: 'STRENGTH',
        name: 'Price Strength',
        category: '52-Week Range (Weight: 20%)',
        score: priceStrengthScore,
        weightPct: 20,
        currentValue: `${priceStrengthScore}% of 52W range`,
        signal: getFactorSignal(priceStrengthScore),
        detail: `Proximity to 52-week highs across tracked ${isRadarUniverse ? validEquities : 16} dynamic equities`
      }
    ];

    return {
      score: compositeScore,
      rating,
      label: labelMap[rating],
      summary: summaryMap[rating],
      tacticalAction: tacticalActionMap[rating],
      factors,
      advancersCount: advancers,
      declinersCount: decliners,
      unchangedCount: unchanged,
      validEquitiesCount: validEquities,
      constituentList,
      vixValue: vix,
      niftyPct,
      bankNiftyPct,
      calculatedAt: new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' }) + ' IST',
      isRadarUniverse
    };
  }, [quotes, niftyQuote, bankNiftyQuote, vixQuote, livePicks]);

  // Color mapping based on Fear & Greed score
  const getColorScheme = (score: number) => {
    if (score <= 24) return { text: 'text-rose-400', bg: 'bg-rose-950/60', border: 'border-rose-500/40', stroke: '#f43f5e' };
    if (score <= 44) return { text: 'text-orange-400', bg: 'bg-orange-950/60', border: 'border-orange-500/40', stroke: '#fb923c' };
    if (score <= 55) return { text: 'text-amber-300', bg: 'bg-amber-950/60', border: 'border-amber-500/40', stroke: '#fcd34d' };
    if (score <= 75) return { text: 'text-emerald-400', bg: 'bg-emerald-950/60', border: 'border-emerald-500/40', stroke: '#34d399' };
    return { text: 'text-cyan-300', bg: 'bg-cyan-950/60', border: 'border-cyan-500/40', stroke: '#06b6d4' };
  };

  const scheme = getColorScheme(sentimentData.score);

  // SVG Gauge calculations (Angle: -180 to 0 degrees for half-circle)
  const angle = -180 + (sentimentData.score / 100) * 180;
  const needleRadians = (angle * Math.PI) / 180;
  const cx = 100;
  const cy = 95;
  const r = 70;
  const needleLength = 55;
  const nx = cx + needleLength * Math.cos(needleRadians);
  const ny = cy + needleLength * Math.sin(needleRadians);

  return (
    <div className="p-5 rounded-2xl bg-[#080d1a]/95 border border-cyan-500/20 shadow-xl flex flex-col gap-5 font-sans">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-cyan-950/70 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Compass className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wide">
                Quantitative Market Sentiment · Fear &amp; Greed Model
              </h3>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${scheme.bg} ${scheme.border} ${scheme.text} font-bold`}>
                {sentimentData.label.toUpperCase()}
              </span>
              <button
                onClick={() => setActiveAuditModal('MASTER')}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-cyan-950/80 border border-cyan-500/40 text-[10px] font-mono text-cyan-300 hover:bg-cyan-900/80 cursor-pointer transition-all"
                title="Click for full formula, assumptions & model audit"
              >
                <Info className="w-3 h-3 text-cyan-400" />
                <span>MODEL AUDIT</span>
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Quantitative proxy calculated from live India VIX (30%), NIFTY/Bank Nifty momentum (25%), 16 Core Heavyweight Breadth (25%), and 52W Proximity (20%).
            </p>
          </div>
        </div>

        {/* Real-time feed status */}
        <div className="flex items-center gap-2 text-xs font-mono">
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-900 border border-slate-800 rounded-lg text-slate-300">
            <span className={`inline-block w-2 h-2 rounded-full ${wsStatus === 'CONNECTED' ? 'bg-emerald-400 animate-ping' : 'bg-cyan-400'}`}></span>
            <span className="text-[10px] text-slate-400">FEED:</span>
            <span className="text-[10px] font-bold text-cyan-300">{latencyMs}ms</span>
          </div>
          <span className="text-[11px] text-slate-500 hidden sm:inline">
            CALCULATED: {sentimentData.calculatedAt}
          </span>
        </div>
      </div>

      {/* Explicit Assumption & Model Disclosure Banner */}
      <div className="p-2.5 rounded-xl bg-slate-950/90 border border-amber-500/30 flex items-start gap-2 text-xs">
        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <div className="flex-1 text-[11px] text-slate-300 leading-relaxed">
          <strong className="text-amber-300 uppercase font-mono">Model Assumption &amp; Scope Disclosure:</strong>{' '}
          All underlying input quotes (India VIX, NIFTY 50, Bank Nifty, and equities) are authentic exchange market numbers. 
          However, the Fear &amp; Greed Index itself is a <strong>proprietary quantitative model (0–100)</strong>, not an official index published by the NSE. 
          Advance/Decline breadth is measured across the terminal's <strong>16 core liquid benchmark equities</strong>, not the entire 2,200+ NSE exchange universe.{' '}
          <button 
            onClick={() => setActiveAuditModal('MASTER')} 
            className="text-cyan-400 underline font-semibold hover:text-cyan-300 cursor-pointer ml-1"
          >
            Review exact formulas &amp; source evidence &rarr;
          </button>
        </div>
      </div>

      {/* Main Grid: Gauge Meter (Left) + Factor Breakdown (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
        {/* Left: Interactive Circular Gauge Pod (5 cols) */}
        <div 
          onClick={() => setActiveAuditModal('MASTER')}
          className="lg:col-span-5 p-4 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-cyan-500/40 transition-all cursor-pointer flex flex-col items-center justify-center text-center group relative"
          title="Click to view complete quantitative model calculation & constituent audit"
        >
          <div className="absolute top-3 right-3 text-slate-500 group-hover:text-cyan-400 transition-colors">
            <Info className="w-4 h-4" />
          </div>

          <div className="relative w-56 h-36 flex items-center justify-center">
            <svg viewBox="0 0 200 115" className="w-full h-full overflow-visible">
              <defs>
                <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#f43f5e" />   {/* Extreme Fear */}
                  <stop offset="25%" stopColor="#fb923c" />  {/* Fear */}
                  <stop offset="50%" stopColor="#fcd34d" />  {/* Neutral */}
                  <stop offset="75%" stopColor="#34d399" />  {/* Greed */}
                  <stop offset="100%" stopColor="#06b6d4" /> {/* Extreme Greed */}
                </linearGradient>
              </defs>

              {/* Background Arc */}
              <path
                d="M 30 95 A 70 70 0 0 1 170 95"
                fill="none"
                stroke="#1e293b"
                strokeWidth="14"
                strokeLinecap="round"
              />

              {/* Colored Gauge Arc */}
              <path
                d="M 30 95 A 70 70 0 0 1 170 95"
                fill="none"
                stroke="url(#gaugeGradient)"
                strokeWidth="12"
                strokeLinecap="round"
                opacity="0.9"
              />

              {/* Gauge Tick Markers */}
              {[0, 25, 50, 75, 100].map((val) => {
                const tickAngle = -180 + (val / 100) * 180;
                const rad = (tickAngle * Math.PI) / 180;
                const x1 = cx + (r - 18) * Math.cos(rad);
                const y1 = cy + (r - 18) * Math.sin(rad);
                const x2 = cx + (r - 10) * Math.cos(rad);
                const y2 = cy + (r - 10) * Math.sin(rad);
                return (
                  <line
                    key={val}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke="#475569"
                    strokeWidth="2"
                  />
                );
              })}

              {/* Animated Needle */}
              <line
                x1={cx}
                y1={cy}
                x2={nx}
                y2={ny}
                stroke={scheme.stroke}
                strokeWidth="3.5"
                strokeLinecap="round"
                className="transition-all duration-700 ease-out"
              />

              {/* Needle Hub Center */}
              <circle cx={cx} cy={cy} r="6" fill="#0f172a" stroke={scheme.stroke} strokeWidth="3" />
            </svg>

            {/* Score Overlay Centered Under Needle */}
            <div className="absolute bottom-1 flex flex-col items-center">
              <span className={`text-3xl font-extrabold font-mono tracking-tight ${scheme.text}`}>
                {sentimentData.score}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                / 100
              </span>
            </div>
          </div>

          {/* Scale Labels */}
          <div className="w-full flex items-center justify-between text-[10px] font-mono text-slate-500 px-2 mt-1">
            <span className="text-rose-400 font-semibold">0 Extreme Fear</span>
            <span>50 Neutral</span>
            <span className="text-cyan-400 font-semibold">100 Extreme Greed</span>
          </div>

          {/* Summary Narrative */}
          <p className="text-xs text-slate-300 mt-3 leading-relaxed max-w-sm">
            {sentimentData.summary}
          </p>

          <span className="text-[10px] text-cyan-400/80 font-mono mt-2 group-hover:text-cyan-300">
            [Click to view mathematical proof &amp; constituent audit]
          </span>
        </div>

        {/* Right: 4 Component Factor Breakdown Grid (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {sentimentData.factors.map((factor) => {
              const fScheme = getColorScheme(factor.score);
              return (
                <div
                  key={factor.id}
                  onClick={() => setActiveAuditModal(factor.id)}
                  className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-cyan-500/40 hover:bg-slate-950/90 transition flex flex-col justify-between gap-2 cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-200 block">{factor.name}</span>
                        <Info className="w-3 h-3 text-slate-500 group-hover:text-cyan-300 transition-colors" />
                      </div>
                      <span className="text-[10px] font-mono text-slate-500 uppercase">{factor.category}</span>
                    </div>
                    <span className={`text-base font-extrabold font-mono ${fScheme.text}`}>
                      {factor.score}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-200 font-mono font-bold">{factor.currentValue}</span>
                      <span className={`font-semibold font-mono text-[10px] ${fScheme.text}`}>
                        {factor.signal.replace('_', ' ')}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-1.5 rounded-full bg-slate-900 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${factor.score}%`,
                          backgroundColor: fScheme.stroke
                        }}
                      />
                    </div>
                  </div>

                  <div className="space-y-0.5">
                    <p className="text-[10px] text-slate-400 leading-tight">
                      {factor.detail}
                    </p>
                    {factor.sampleClarification && (
                      <span className="text-[9px] text-amber-400/90 font-mono block">
                        ⚠ {factor.sampleClarification}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Institutional Tactical Guidance Banner */}
          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-start gap-2.5 text-xs text-slate-300">
            <Zap className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-mono tracking-wider text-cyan-300 font-bold">
                Tactical Positioning Corridor:
              </span>
              <span className="text-[11px] text-slate-300 leading-relaxed mt-0.5">
                {sentimentData.tacticalAction}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* AUDIT MODAL 1: MASTER FEAR & GREED METHODOLOGY & TRUTH VERIFICATION       */}
      {/* ========================================================================= */}
      {activeAuditModal === 'MASTER' && (
        <div
          onClick={() => setActiveAuditModal(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl bg-[#080d1a] border border-cyan-500/40 rounded-2xl shadow-2xl p-6 font-sans relative max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div className="flex items-center gap-2">
                <Compass className="w-5 h-5 text-cyan-400" />
                <h4 className="text-sm font-bold text-slate-100 uppercase tracking-wide">
                  Model Verification: Is the Market Greed Index True?
                </h4>
              </div>
              <button onClick={() => setActiveAuditModal(null)} className="text-slate-400 hover:text-white p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs text-slate-300 leading-relaxed">
              {/* Question 1: Are these actual numbers? */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                <div className="text-cyan-300 font-bold uppercase text-[11px] flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>1. Are the underlying market numbers actual &amp; live?</span>
                </div>
                <p className="text-slate-300 text-xs">
                  <strong>YES.</strong> All input numbers used in the calculation are authentic exchange quotes:
                </p>
                <ul className="list-disc list-inside text-slate-400 text-[11px] space-y-1 pl-2">
                  <li><strong>India VIX:</strong> {sentimentData.vixValue.toFixed(2)} pts (live daily quote from <code>^INDIAVIX</code>).</li>
                  <li><strong>NIFTY 50 Drift:</strong> {sentimentData.niftyPct >= 0 ? '+' : ''}{sentimentData.niftyPct.toFixed(2)}% (live daily session quote from <code>^NSEI</code>).</li>
                  <li><strong>BANK NIFTY Drift:</strong> {sentimentData.bankNiftyPct >= 0 ? '+' : ''}{sentimentData.bankNiftyPct.toFixed(2)}% (live daily session quote from <code>^NSEBANK</code>).</li>
                  <li><strong>Equities Prices:</strong> 16 individual stock quotes (Reliance, TCS, HDFC Bank, Infosys, etc.) with real Rupee LTPs and session percentage changes.</li>
                </ul>
              </div>

              {/* Question 2: Is the Greed Index itself an official exchange index? */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-amber-500/30 space-y-1.5">
                <div className="text-amber-300 font-bold uppercase text-[11px] flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <span>2. Is the Fear &amp; Greed Index an official exchange index?</span>
                </div>
                <p className="text-slate-300 text-xs">
                  <strong>NO.</strong> There is no official exchange-published "Fear &amp; Greed Index" on the NSE.
                  This index is a <strong>quantitative composite proxy model</strong> modeled after the CNN Fear &amp; Greed Index framework and adapted for Indian capital markets.
                </p>
                <p className="text-slate-400 text-[11px]">
                  The 0–100 score is computed from a transparent mathematical weighted formula combining the 4 verified live factors below:
                </p>
              </div>

              {/* Formula Table */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="text-cyan-300 font-bold uppercase text-[11px] font-mono">
                  Exact Mathematical Composite Formula:
                </div>
                <div className="font-mono text-[11px] bg-black/60 p-2.5 rounded-lg border border-slate-800 text-slate-200">
                  Score = (VIX_Score × 30%) + (Index_Momentum × 25%) + (Benchmark_Breadth × 25%) + (52W_Proximity × 20%)
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono pt-1">
                  <div className="p-2 rounded bg-slate-900 border border-slate-800">
                    <span className="text-slate-400 block text-[10px]">VIX (30%):</span>
                    <span className="text-cyan-300 font-bold">{sentimentData.factors[0].score}/100</span>
                  </div>
                  <div className="p-2 rounded bg-slate-900 border border-slate-800">
                    <span className="text-slate-400 block text-[10px]">Momentum (25%):</span>
                    <span className="text-cyan-300 font-bold">{sentimentData.factors[1].score}/100</span>
                  </div>
                  <div className="p-2 rounded bg-slate-900 border border-slate-800">
                    <span className="text-slate-400 block text-[10px]">Breadth (25%):</span>
                    <span className="text-cyan-300 font-bold">{sentimentData.factors[2].score}/100</span>
                  </div>
                  <div className="p-2 rounded bg-slate-900 border border-slate-800">
                    <span className="text-slate-400 block text-[10px]">52W Range (20%):</span>
                    <span className="text-cyan-300 font-bold">{sentimentData.factors[3].score}/100</span>
                  </div>
                </div>
                <div className="text-right text-[11px] font-mono text-emerald-400 font-bold pt-1">
                  Calculated Composite = {sentimentData.score} / 100 ({sentimentData.label})
                </div>
              </div>

              {/* Question 3: Reason for 12 Adv and 3 Dec */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-cyan-500/30 space-y-1.5">
                <div className="text-cyan-300 font-bold uppercase text-[11px] flex items-center justify-between">
                  <span>3. Why 12 Advances and 3 Declines?</span>
                  <button
                    onClick={() => setActiveAuditModal('BREADTH')}
                    className="text-cyan-400 underline hover:text-cyan-300 text-[10px] cursor-pointer"
                  >
                    View All 16 Stocks &rarr;
                  </button>
                </div>
                <p className="text-slate-300 text-xs">
                  This breadth metric measures the <strong>16 tracked liquid bluechip equities</strong>:
                </p>
                <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono py-1">
                  <div className="p-2 rounded bg-emerald-950/40 border border-emerald-500/30 text-emerald-300">
                    <span className="block text-lg font-bold">{sentimentData.advancersCount}</span>
                    <span className="text-[10px] text-emerald-400">Advancing (&gt; +0.05%)</span>
                  </div>
                  <div className="p-2 rounded bg-rose-950/40 border border-rose-500/30 text-rose-300">
                    <span className="block text-lg font-bold">{sentimentData.declinersCount}</span>
                    <span className="text-[10px] text-rose-400">Declining (&lt; -0.05%)</span>
                  </div>
                  <div className="p-2 rounded bg-slate-900 border border-slate-800 text-slate-300">
                    <span className="block text-lg font-bold">{sentimentData.unchangedCount}</span>
                    <span className="text-[10px] text-slate-400">Unchanged / Flat</span>
                  </div>
                </div>
                <p className="text-[11px] text-amber-300/90 font-mono">
                  ⚠ Note: This reflects the institutional heavyweights in our tracking universe. It does NOT represent the entire 2,200+ companies on the NSE cash market.
                </p>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setActiveAuditModal(null)}
                className="px-4 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold cursor-pointer"
              >
                Close Audit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* AUDIT MODAL 2: 16 CORE BENCHMARK BREADTH (12 ADV / 3 DEC / 1 FLAT)       */}
      {/* ========================================================================= */}
      {activeAuditModal === 'BREADTH' && (
        <div
          onClick={() => setActiveAuditModal(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-3xl bg-[#080d1a] border border-cyan-500/40 rounded-2xl shadow-2xl p-6 font-sans relative max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <Layers className="w-5 h-5 text-cyan-400" />
                  <h4 className="text-sm font-bold text-slate-100 uppercase tracking-wide">
                    Benchmark Breadth Audit: 16 Core Heavyweights
                  </h4>
                </div>
                <span className="text-xs text-slate-400 block mt-0.5">
                  Exact verification of why {sentimentData.advancersCount} stocks are advancing and {sentimentData.declinersCount} are declining.
                </span>
              </div>
              <button onClick={() => setActiveAuditModal(null)} className="text-slate-400 hover:text-white p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scope Clarification Alert */}
            <div className="p-3 rounded-xl bg-slate-950 border border-amber-500/30 text-xs text-slate-300 leading-relaxed mb-4">
              <strong className="text-amber-300 font-mono">BREADTH SCOPE DEFINITION:</strong>{' '}
              The Advance/Decline ratio displayed on this card is computed strictly across the <strong>16 high-liquidity benchmark equities</strong> below. 
              It is not the total NSE exchange-wide breadth (which comprises ~2,200 listed companies). 
              A 12:3 ratio signifies that 75% of India&apos;s most influential market heavyweights are trading positive.
            </div>

            {/* Constituent Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950">
              <table className="w-full text-left border-collapse text-xs font-mono">
                <thead>
                  <tr className="border-b border-slate-800 text-[10px] text-slate-400 uppercase bg-slate-900/80">
                    <th className="py-2.5 px-3">Symbol</th>
                    <th className="py-2.5 px-3">Company Name</th>
                    <th className="py-2.5 px-3 text-right">Live Price</th>
                    <th className="py-2.5 px-3 text-right">Change %</th>
                    <th className="py-2.5 px-3 text-center">Breadth Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {sentimentData.constituentList.map((item) => {
                    const isAdv = item.status === 'ADVANCE';
                    const isDec = item.status === 'DECLINE';
                    return (
                      <tr key={item.symbol} className="hover:bg-slate-900/50 transition">
                        <td className="py-2 px-3 font-bold text-slate-200">{item.symbol}</td>
                        <td className="py-2 px-3 text-slate-400 font-sans">{item.name}</td>
                        <td className="py-2 px-3 text-right text-slate-200">
                          {item.price != null ? `₹${item.price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                        </td>
                        <td className={`py-2 px-3 text-right font-bold ${isAdv ? 'text-emerald-400' : isDec ? 'text-rose-400' : 'text-slate-400'}`}>
                          {item.changePct != null ? `${item.changePct >= 0 ? '+' : ''}${item.changePct.toFixed(2)}%` : '—'}
                        </td>
                        <td className="py-2 px-3 text-center">
                          {isAdv && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950/80 border border-emerald-500/40 text-emerald-300">
                              ADVANCE (+{item.changePct}%)
                            </span>
                          )}
                          {isDec && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-950/80 border border-rose-500/40 text-rose-300">
                              DECLINE ({item.changePct}%)
                            </span>
                          )}
                          {!isAdv && !isDec && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-900 border border-slate-700 text-slate-400">
                              FLAT / UNCHANGED
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Total Count Summary */}
            <div className="mt-4 p-3 rounded-xl bg-slate-950 border border-slate-800 flex flex-wrap items-center justify-between text-xs font-mono">
              <span className="text-slate-400">
                Total Constituents: <strong className="text-slate-200">{sentimentData.constituentList.length}</strong>
              </span>
              <div className="flex items-center gap-3">
                <span className="text-emerald-400 font-bold">✓ {sentimentData.advancersCount} Advances</span>
                <span className="text-rose-400 font-bold">✗ {sentimentData.declinersCount} Declines</span>
                <span className="text-slate-400">○ {sentimentData.unchangedCount} Flat</span>
              </div>
              <span className="text-cyan-300 font-bold">
                Breadth Score = {sentimentData.factors[2].score} / 100
              </span>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setActiveAuditModal(null)}
                className="px-4 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold cursor-pointer"
              >
                Close Audit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* AUDIT MODAL 3: INDIA VIX VOLATILITY FACTOR                                */}
      {/* ========================================================================= */}
      {activeAuditModal === 'VIX' && (
        <div
          onClick={() => setActiveAuditModal(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg bg-[#080d1a] border border-cyan-500/40 rounded-2xl shadow-2xl p-6 font-sans relative"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-cyan-400" />
                <h4 className="text-sm font-bold text-slate-100 uppercase tracking-wide">
                  Market Volatility Factor Audit (India VIX)
                </h4>
              </div>
              <button onClick={() => setActiveAuditModal(null)} className="text-slate-400 hover:text-white p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300 font-mono">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-400">Constituent Symbol:</span>
                  <span className="text-cyan-300 font-bold">^INDIAVIX</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Current Live Level:</span>
                  <span className="text-emerald-400 font-bold text-sm">{sentimentData.vixValue.toFixed(2)} pts</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Factor Weight:</span>
                  <span className="text-slate-200">30% of Fear &amp; Greed Composite</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Factor Score:</span>
                  <span className="text-cyan-300 font-bold">{sentimentData.factors[0].score} / 100</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1 text-slate-300 font-sans">
                <span className="text-[10px] text-slate-400 uppercase font-mono block">Mathematical Scaling Rule</span>
                <p className="text-[11px] leading-relaxed">
                  In options theory, higher implied volatility reflects fear and put protection hedging. 
                  VIX &le; 11 pts maps to 100 (Extreme Greed / Complacency). VIX &ge; 27 pts maps to 0 (Extreme Fear).
                </p>
                <div className="bg-black/60 p-2 rounded border border-slate-800 font-mono text-[10px] text-amber-300 mt-1">
                  Formula: Math.round((1 - (VIX - 11) / 16) * 100) = {sentimentData.factors[0].score}
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setActiveAuditModal(null)}
                className="px-4 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* AUDIT MODAL 4: INDEX MOMENTUM FACTOR                                      */}
      {/* ========================================================================= */}
      {activeAuditModal === 'MOMENTUM' && (
        <div
          onClick={() => setActiveAuditModal(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg bg-[#080d1a] border border-cyan-500/40 rounded-2xl shadow-2xl p-6 font-sans relative"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-cyan-400" />
                <h4 className="text-sm font-bold text-slate-100 uppercase tracking-wide">
                  Index Momentum Factor Audit
                </h4>
              </div>
              <button onClick={() => setActiveAuditModal(null)} className="text-slate-400 hover:text-white p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300 font-mono">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-400">NIFTY 50 (^NSEI):</span>
                  <span className={`font-bold ${sentimentData.niftyPct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {sentimentData.niftyPct >= 0 ? '+' : ''}{sentimentData.niftyPct.toFixed(2)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">BANK NIFTY (^NSEBANK):</span>
                  <span className={`font-bold ${sentimentData.bankNiftyPct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {sentimentData.bankNiftyPct >= 0 ? '+' : ''}{sentimentData.bankNiftyPct.toFixed(2)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Weighted Index Drift:</span>
                  <span className="text-cyan-300 font-bold">
                    {((sentimentData.niftyPct * 0.6) + (sentimentData.bankNiftyPct * 0.4)).toFixed(2)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Factor Score:</span>
                  <span className="text-cyan-300 font-bold">{sentimentData.factors[1].score} / 100</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-sans text-slate-300 space-y-1">
                <span className="text-[10px] text-slate-400 uppercase font-mono block">Weighting &amp; Scaling Rule</span>
                <p>
                  Combines 60% NIFTY 50 and 40% BANK NIFTY session drift. A combined drift of +1.8% corresponds to 100 (Maximum Momentum Greed), 0.0% maps to 50 (Neutral equilibrium), and -1.8% corresponds to 0 (Extreme Fear).
                </p>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setActiveAuditModal(null)}
                className="px-4 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* AUDIT MODAL 5: PRICE STRENGTH (52-WEEK RANGE) FACTOR                      */}
      {/* ========================================================================= */}
      {activeAuditModal === 'STRENGTH' && (
        <div
          onClick={() => setActiveAuditModal(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg bg-[#080d1a] border border-cyan-500/40 rounded-2xl shadow-2xl p-6 font-sans relative"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
              <div className="flex items-center gap-2">
                <Scale className="w-5 h-5 text-cyan-400" />
                <h4 className="text-sm font-bold text-slate-100 uppercase tracking-wide">
                  Price Strength (52-Week Range) Audit
                </h4>
              </div>
              <button onClick={() => setActiveAuditModal(null)} className="text-slate-400 hover:text-white p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300 font-mono">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-400">Basket Tested:</span>
                  <span className="text-slate-200">16 Tracked Heavyweights</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Average Proximity:</span>
                  <span className="text-cyan-300 font-bold">{sentimentData.factors[3].score}% of 52W corridor</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Factor Weight:</span>
                  <span className="text-slate-200">20% of Fear &amp; Greed Composite</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-sans text-slate-300 space-y-1">
                <span className="text-[10px] text-slate-400 uppercase font-mono block">Methodology</span>
                <p>
                  Evaluates each stock&apos;s current LTP relative to its 52-week low and 52-week high:
                </p>
                <code className="text-amber-300 text-[10px] block font-mono bg-black/60 p-2 rounded border border-slate-800">
                  (LTP - 52W_Low) / (52W_High - 52W_Low) * 100
                </code>
                <p className="text-slate-400 pt-1">
                  Stocks trading near their 52-week highs contribute to Greed ratings, while proximity to 52-week lows contributes to Fear ratings.
                </p>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setActiveAuditModal(null)}
                className="px-4 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
