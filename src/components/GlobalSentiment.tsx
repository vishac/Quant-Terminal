import React, { useMemo } from 'react';
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
  Info
} from 'lucide-react';

export interface SentimentFactor {
  name: string;
  category: string;
  score: number; // 0 - 100
  weightPct: number;
  currentValue: string;
  signal: 'EXTREME_FEAR' | 'FEAR' | 'NEUTRAL' | 'GREED' | 'EXTREME_GREED';
  detail: string;
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
  calculatedAt: string;
}

export const GlobalSentiment: React.FC = () => {
  const { quotes, niftyQuote, bankNiftyQuote, vixQuote, wsStatus, latencyMs, tickCount } = useMarketWebSocket();

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

    // 3. Market Breadth Factor (Advancers vs Decliners across tracked equities) - Weight 25%
    const equityKeys = [
      'RELIANCE.NS', 'TCS.NS', 'HDFCBANK.NS', 'INFY.NS', 'ICICIBANK.NS',
      'SBIN.NS', 'BHARTIARTL.NS', 'LT.NS', 'TRENT.NS', 'BEL.NS',
      'HAL.NS', 'DIXON.NS', 'POLYCAB.NS', 'SOLARINDS.NS', 'COCHINSHIP.NS', 'NTPC.NS'
    ];

    let advancers = 0;
    let decliners = 0;
    let unchanged = 0;
    let validEquities = 0;
    let highProximityTotal = 0;
    let highProximityCount = 0;

    for (const key of equityKeys) {
      const q = quotes[key];
      if (q && q.price != null && q.changePct != null) {
        validEquities++;
        if (q.changePct > 0.05) advancers++;
        else if (q.changePct < -0.05) decliners++;
        else unchanged++;

        if (q.fiftyTwoWeekHigh != null && q.fiftyTwoWeekLow != null && q.fiftyTwoWeekHigh > q.fiftyTwoWeekLow) {
          const range = q.fiftyTwoWeekHigh - q.fiftyTwoWeekLow;
          const pos = Math.max(0, Math.min(1, (q.price - q.fiftyTwoWeekLow) / range));
          highProximityTotal += pos * 100;
          highProximityCount++;
        }
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
        name: 'Market Volatility',
        category: 'India VIX',
        score: vixScore,
        weightPct: 30,
        currentValue: `${vix.toFixed(2)} pts`,
        signal: getFactorSignal(vixScore),
        detail: vix < 14 ? 'Low volatility complacency' : vix > 19 ? 'Elevated volatility stress' : 'Normal volatility corridor'
      },
      {
        name: 'Index Momentum',
        category: 'NIFTY & BANK NIFTY',
        score: momentumScore,
        weightPct: 25,
        currentValue: `${niftyPct >= 0 ? '+' : ''}${niftyPct.toFixed(2)}%`,
        signal: getFactorSignal(momentumScore),
        detail: `NIFTY ${niftyPct >= 0 ? '+' : ''}${niftyPct.toFixed(2)}% · BANK NIFTY ${bankNiftyPct >= 0 ? '+' : ''}${bankNiftyPct.toFixed(2)}%`
      },
      {
        name: 'Market Breadth',
        category: 'Advance / Decline',
        score: breadthScore,
        weightPct: 25,
        currentValue: `${advancers} Adv / ${decliners} Dec`,
        signal: getFactorSignal(breadthScore),
        detail: `${Math.round((advancers / (validEquities || 1)) * 100)}% of benchmark stocks trading in the green`
      },
      {
        name: 'Price Strength',
        category: '52-Week Range',
        score: priceStrengthScore,
        weightPct: 20,
        currentValue: `${priceStrengthScore}% of 52W range`,
        signal: getFactorSignal(priceStrengthScore),
        detail: 'Proximity to 52-week lifetime highs across high-liquidity basket'
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
      calculatedAt: new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' }) + ' IST'
    };
  }, [quotes, niftyQuote, bankNiftyQuote, vixQuote]);

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
            <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wide flex items-center gap-2">
              <span>Indian Markets · Real-Time Fear &amp; Greed Index</span>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${scheme.bg} ${scheme.border} ${scheme.text} font-bold`}>
                {sentimentData.label.toUpperCase()}
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Multi-factor quantitative sentiment engine calculated from live India VIX, NIFTY momentum, and exchange advance-decline breadth.
            </p>
          </div>
        </div>

        {/* Real-time feed status */}
        <div className="flex items-center gap-2 text-xs font-mono">
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-900 border border-slate-800 rounded-lg text-slate-300">
            <span className={`inline-block w-2 h-2 rounded-full ${wsStatus === 'CONNECTED' ? 'bg-emerald-400 animate-ping' : 'bg-cyan-400'}`}></span>
            <span className="text-[10px] text-slate-400">WS FEED:</span>
            <span className="text-[10px] font-bold text-cyan-300">{latencyMs}ms</span>
          </div>
          <span className="text-[11px] text-slate-500 hidden sm:inline">
            UPDATED: {sentimentData.calculatedAt}
          </span>
        </div>
      </div>

      {/* Main Grid: Gauge Meter (Left) + Factor Breakdown (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
        {/* Left: Interactive Circular Gauge Pod (5 cols) */}
        <div className="lg:col-span-5 p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col items-center justify-center text-center">
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
        </div>

        {/* Right: 4 Component Factor Breakdown Grid (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {sentimentData.factors.map((factor, idx) => {
              const fScheme = getColorScheme(factor.score);
              return (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 transition flex flex-col justify-between gap-2"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-200 block">{factor.name}</span>
                      <span className="text-[10px] font-mono text-slate-500 uppercase">{factor.category}</span>
                    </div>
                    <span className={`text-base font-extrabold font-mono ${fScheme.text}`}>
                      {factor.score}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400 font-mono">{factor.currentValue}</span>
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

                  <p className="text-[10px] text-slate-400 leading-tight">
                    {factor.detail}
                  </p>
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
    </div>
  );
};
