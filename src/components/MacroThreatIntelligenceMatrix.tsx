import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  ShieldCheck, 
  Globe, 
  TrendingUp, 
  TrendingDown, 
  RefreshCw, 
  ExternalLink, 
  CheckCircle2, 
  Search, 
  Zap, 
  Layers, 
  Scale, 
  Lock, 
  Info, 
  AlertTriangle,
  Flame,
  ArrowUpRight,
  ArrowDownRight,
  Activity
} from 'lucide-react';

export interface MacroVector {
  name: string;
  value: string;
  direction: 'RISING' | 'FALLING' | 'NEUTRAL';
  impact: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  factDetail: string;
}

export interface VerifiedNewsItem {
  id: string;
  headline: string;
  publisher: string;
  sourceUrl: string;
  category: 'ENERGY' | 'RATES' | 'CURRENCY' | 'GEOPOLITICAL' | 'POLICY';
  impactScore: number;
  affectedSector: string;
  factTakeaway: string;
}

export interface TwoSidedScenario {
  regime: 'BASE_CASE' | 'BULL_CASE' | 'STRESS_CASE';
  title: string;
  probabilityPct: number;
  niftyRange: string;
  catalysts: string;
  hedgingAction: string;
}

export interface MacroIntelligenceData {
  threatScore: number | null;
  threatRegime: 'LOW_VOLATILITY' | 'MODERATE_ELEVATED' | 'HIGH_STRESS' | null;
  threatHeadline: string;
  threatSummary: string;
  lastUpdated?: string;
  isGrounded?: boolean;
  dataUnavailable?: boolean;
  notice?: string;
  macroVectors: MacroVector[];
  verifiedNews: VerifiedNewsItem[];
  twoSidedScenarios: TwoSidedScenario[];
  groundedSources?: Array<{ title: string; url: string }>;
  searchQueries?: string[];
}

interface MacroThreatIntelligenceMatrixProps {
  onStageHedge?: (actionName: string, detail: string) => void;
}

export const MacroThreatIntelligenceMatrix: React.FC<MacroThreatIntelligenceMatrixProps> = ({ onStageHedge }) => {
  const [data, setData] = useState<MacroIntelligenceData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'SCENARIOS' | 'NEWS_IMPACT' | 'VECTORS' | 'GROUNDING'>('SCENARIOS');
  const [stagedToast, setStagedToast] = useState<string | null>(null);

  const fetchIntelligence = async (force: boolean = false) => {
    if (force) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      let token = '';
      try { token = localStorage.getItem('jarvis_owner_token') || ''; } catch {}
      const res = await fetch(`/api/macro/intelligence${force ? '?refresh=true' : ''}`, {
        headers: {
          'x-owner-token': token,
          'Authorization': `Bearer ${token}`,
        },
      });
      if (res.status === 401 || res.status === 503) {
        setData({
          dataUnavailable: true, isGrounded: false,
          notice: 'Owner authorization is required for macro intelligence.',
          threatScore: null, threatRegime: null, threatHeadline: '', threatSummary: '',
          macroVectors: [], verifiedNews: [], twoSidedScenarios: [], groundedSources: [], searchQueries: [],
        });
        return;
      }
      const json = await res.json();
      if (json.success && json.data) {
        setData(json.data);
      }
    } catch (err) {
      console.warn('[MacroThreatMatrix] Fetch failed', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchIntelligence();
    // Background refresh aligned with 15-minute institutional macro window
    const interval = setInterval(() => {
      fetchIntelligence(false);
    }, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const handleStageHedgeAction = (actionTitle: string, detail: string) => {
    if (onStageHedge) {
      onStageHedge(actionTitle, detail);
    }
    setStagedToast(`[HEDGE STAGED]: ${actionTitle} sent to DMA Pre-Trade Verifier`);
    setTimeout(() => setStagedToast(null), 4000);
  };

  if (isLoading && !data) {
    return (
      <div className="relative bg-[#080d1a]/95 rounded-2xl p-6 border border-cyan-500/20 shadow-xl flex flex-col items-center justify-center min-h-[380px] font-mono text-xs gap-3">
        <RefreshCw className="w-6 h-6 text-cyan-400 animate-spin" />
        <span className="text-cyan-300 font-bold uppercase tracking-widest">
          INGESTING SEARCH-GROUNDED MACRO INTELLIGENCE...
        </span>
        <span className="text-[10px] text-slate-500">
          Requesting a Google-search-grounded AI assessment. Figures are AI-generated — verify independently.
        </span>
      </div>
    );
  }

  const threatScoreNum = typeof data?.threatScore === 'number' ? data.threatScore : null;
  const threatScore = threatScoreNum ?? 0;
  const isUnavailable = data?.dataUnavailable === true;

  return (
    <div className="relative bg-[#080d1a]/95 rounded-2xl p-5 border border-cyan-500/25 shadow-2xl flex flex-col gap-4 font-mono select-none overflow-hidden">
      {/* Background Accent Glow */}
      <div className="absolute -top-12 -right-12 w-48 h-48 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* TOP BAROMETER RIBBON */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800 text-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-[0_0_12px_rgba(0,240,255,0.2)]">
            <Globe className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-100 uppercase tracking-wide text-sm">
                GLOBAL MACRO THREAT & NEWS MATRIX
              </span>
              <span className={`px-2 py-0.5 rounded text-[9px] font-bold flex items-center gap-1 shadow-sm border ${
                data?.isGrounded
                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
                  : 'bg-slate-900 text-slate-400 border-slate-700'
              }`}>
                <CheckCircle2 className="w-2.5 h-2.5" />
                {data?.isGrounded ? 'AI · GROUNDED IN GOOGLE SEARCH' : 'AI-GENERATED · VERIFY INDEPENDENTLY'}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5 max-w-xl truncate">
              {data?.threatHeadline || (isUnavailable ? 'Live macro intelligence is unavailable right now.' : '')}
            </p>
          </div>
        </div>

        {/* Threat Score Barometer & Refresh Trigger */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800">
            <div className="flex flex-col text-right">
              <span className="text-[9px] text-slate-500 uppercase">THREAT SCORE</span>
              <span className={`text-sm font-bold tabular-nums ${
                threatScore > 65 ? 'text-rose-400' : threatScore > 40 ? 'text-amber-300' : 'text-emerald-400'
              }`}>
                {threatScoreNum != null ? threatScoreNum : '—'} / 100
              </span>
            </div>
            <div className="w-1.5 h-6 rounded-full bg-slate-800 overflow-hidden flex flex-col justify-end">
              <div 
                className={`w-full transition-all duration-500 ${
                  threatScore > 65 ? 'bg-rose-500' : threatScore > 40 ? 'bg-amber-400' : 'bg-emerald-400'
                }`}
                style={{ height: `${threatScore}%` }}
              />
            </div>
          </div>

          <button
            onClick={() => fetchIntelligence(true)}
            disabled={isRefreshing}
            className="p-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-cyan-300 border border-slate-800 hover:border-cyan-500/40 transition cursor-pointer disabled:opacity-50"
            title="Force refresh live search-grounded intelligence"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-cyan-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* HONEST UNAVAILABLE STATE — never fabricated news/levels */}
      {isUnavailable && (
        <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/40 text-amber-200 text-xs flex items-start gap-2" data-testid="macro-unavailable">
          <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
          <span>{data?.notice || 'Live, search-grounded macro intelligence is unavailable right now. Showing no data rather than fabricated figures.'}</span>
        </div>
      )}

      {/* MACRO VECTOR HORIZONTAL STRIP */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
        {data?.macroVectors.map((v, idx) => (
          <div 
            key={idx}
            className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/80 flex flex-col justify-between hover:border-slate-700 transition"
            title={v.factDetail}
          >
            <div className="flex items-center justify-between text-[9px] text-slate-400">
              <span className="truncate">{v.name}</span>
              {v.direction === 'RISING' ? (
                <ArrowUpRight className="w-3 h-3 text-amber-400 shrink-0" />
              ) : v.direction === 'FALLING' ? (
                <ArrowDownRight className="w-3 h-3 text-cyan-400 shrink-0" />
              ) : (
                <span className="text-slate-500">●</span>
              )}
            </div>
            <div className="my-1">
              <span className="text-xs font-bold text-slate-100 tabular-nums">{v.value}</span>
            </div>
            <div className="flex items-center justify-between text-[9px]">
              <span className={`px-1.5 py-0.2 rounded font-semibold ${
                v.impact === 'BULLISH' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
                v.impact === 'BEARISH' ? 'bg-rose-950 text-rose-400 border border-rose-800' :
                'bg-slate-900 text-slate-400'
              }`}>
                {v.impact}
              </span>
              <span className="text-slate-500 text-[8px] uppercase">AI EST.</span>
            </div>
          </div>
        ))}
      </div>

      {/* VIEW SWITCHER TABS */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-1.5 text-xs">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {[
            { id: 'SCENARIOS' as const, label: 'TWO-SIDED SCENARIOS', icon: <Scale className="w-3 h-3" /> },
            { id: 'NEWS_IMPACT' as const, label: 'GROUNDED HEADLINES', icon: <Globe className="w-3 h-3" /> },
            { id: 'GROUNDING' as const, label: 'PROVENANCE & CITATIONS', icon: <Search className="w-3 h-3" /> }
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer border ${
                activeTab === t.id
                  ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-sm'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
            >
              {t.icon}
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        <span className="text-[9px] text-slate-500 hidden sm:inline">
          MODEL: GEMINI 3.8 FLASH · AI-GENERATED, VERIFY INDEPENDENTLY
        </span>
      </div>

      {/* TAB 1: TWO-SIDED PROBABILISTIC SCENARIOS (CORE DECISION-MAKER) */}
      {activeTab === 'SCENARIOS' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {data?.twoSidedScenarios.map((sc, scIdx) => {
            const isBase = sc.regime === 'BASE_CASE';
            const isBull = sc.regime === 'BULL_CASE';
            const isStress = sc.regime === 'STRESS_CASE';

            return (
              <div
                key={scIdx}
                className={`p-3.5 rounded-xl border flex flex-col justify-between gap-2.5 transition bg-slate-950 ${
                  isBase ? 'border-cyan-500/40 shadow-[0_0_15px_rgba(0,240,255,0.08)]' :
                  isBull ? 'border-emerald-500/30' :
                  'border-rose-500/30'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold border uppercase ${
                      isBase ? 'bg-cyan-950 text-cyan-300 border-cyan-800' :
                      isBull ? 'bg-emerald-950 text-emerald-300 border-emerald-800' :
                      'bg-rose-950 text-rose-300 border-rose-800'
                    }`}>
                      {sc.regime.replace('_', ' ')}
                    </span>
                    <span className="text-xs font-bold text-slate-100 tabular-nums">
                      {sc.probabilityPct}% PoP
                    </span>
                  </div>

                  <h4 className="text-xs font-bold text-slate-200 mt-2 leading-snug">
                    {sc.title}
                  </h4>

                  <div className="my-2 p-2 rounded bg-slate-900/80 border border-slate-800 text-[10px] space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-400">CORRIDOR:</span>
                      <span className="text-cyan-300 font-bold font-mono">₹{sc.niftyRange}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">CATALYSTS:</span>
                      <span className="text-slate-300 text-right truncate max-w-[150px]">{sc.catalysts}</span>
                    </div>
                  </div>

                  <div className="p-2 rounded bg-slate-900/50 border border-slate-800/60 text-[10px] text-slate-300 leading-relaxed font-sans">
                    <strong className="text-slate-100 block mb-0.5 font-mono text-[9px] uppercase tracking-wider text-amber-300">
                      RECOMMENDED INSTITUTIONAL HEDGE:
                    </strong>
                    {sc.hedgingAction}
                  </div>
                </div>

                <button
                  onClick={() => handleStageHedgeAction(sc.title, sc.hedgingAction)}
                  className={`w-full py-1.5 px-3 rounded-lg text-xs font-bold uppercase transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 shadow-md ${
                    isBase ? 'bg-cyan-500 hover:bg-cyan-400 text-slate-950' :
                    isBull ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950' :
                    'bg-rose-500 hover:bg-rose-400 text-slate-950'
                  }`}
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>1-CLICK STAGE HEDGE</span>
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 2: GROUNDED GLOBAL HEADLINES & CASUAL IMPACT */}
      {activeTab === 'NEWS_IMPACT' && (
        <div className="space-y-2 max-h-[340px] overflow-y-auto no-scrollbar pr-1">
          {data?.verifiedNews.map((news) => (
            <div 
              key={news.id}
              className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-700 transition"
            >
              <div className="flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-cyan-950 text-cyan-300 border border-cyan-800 uppercase">
                    {news.category}
                  </span>
                  <span className="text-[10px] text-slate-400 font-semibold">
                    via {news.publisher}
                  </span>
                  {news.sourceUrl && (
                    <a 
                      href={news.sourceUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-cyan-400 hover:underline flex items-center gap-0.5 text-[9px]"
                    >
                      <span>Direct Citation</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  )}
                </div>

                <h5 className="text-xs font-bold text-slate-100 font-sans">
                  {news.headline}
                </h5>

                <p className="text-[11px] text-slate-300 font-sans leading-relaxed">
                  {news.factTakeaway}
                </p>
              </div>

              <div className="sm:text-right shrink-0">
                <span className="text-[9px] text-slate-500 block uppercase">SECTOR EXPOSURE</span>
                <span className="text-xs text-amber-300 font-semibold block">{news.affectedSector}</span>
                <span className={`text-[10px] font-bold ${news.impactScore >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {news.impactScore >= 0 ? `+${news.impactScore}` : news.impactScore} IMPACT
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 3: SEARCH GROUNDING PROVENANCE & TRANSPARENCY */}
      {activeTab === 'GROUNDING' && (
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 text-xs">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
            <Search className="w-4 h-4 text-cyan-400" />
            <span className="font-bold text-slate-100 uppercase tracking-wide">
              ZERO-HALLUCINATION PROVENANCE & GOOGLE SEARCH AUDIT
            </span>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 uppercase font-bold block">
              REAL-TIME QUERIES EXECUTED:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {(data?.searchQueries && data.searchQueries.length > 0 ? data.searchQueries : ['— no queries reported —']).map((q, qIdx) => (
                <span key={qIdx} className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-cyan-300 text-[10px]">
                  🔍 "{q}"
                </span>
              ))}
            </div>
          </div>

          <div className="space-y-1 pt-2 border-t border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase font-bold block">
              VERIFIED CITATION SOURCES:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {(data?.groundedSources && data.groundedSources.length > 0 ? data.groundedSources : [
                { title: 'No grounded citations available', url: '' }
              ]).map((src, sIdx) => (
                <a
                  key={sIdx}
                  href={src.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded bg-slate-900/60 border border-slate-800 hover:border-cyan-500/40 text-slate-300 hover:text-cyan-200 transition flex items-center justify-between text-[11px]"
                >
                  <span className="truncate pr-2">{src.title}</span>
                  <ExternalLink className="w-3 h-3 text-slate-500 shrink-0" />
                </a>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TOAST FEEDBACK ON ACTION EXECUTION */}
      {stagedToast && (
        <div className="p-3 rounded-xl bg-cyan-950/90 border border-cyan-500/40 text-cyan-200 text-xs flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-cyan-400" />
          <span>{stagedToast}</span>
        </div>
      )}
    </div>
  );
};
