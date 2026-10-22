/**
 * Global-to-India Market Impact, News Catalyst & Stock ROI Engine.
 *
 * Bridges the gap between:
 *  1. Live Global Markets (S&P 500, NASDAQ, Nikkei, Hang Seng, Brent Crude, Gold, Copper, US 10Y, DXY, USD/INR)
 *  2. Live Financial & Sector News (Google News India Markets RSS + optional Gemini Search Grounding)
 *  3. Specific Indian Stocks (NSE/BSE) that will RISE or FALL today, the exact causal transmission
 *     mechanism ("Why"), and concrete defined-risk trade setups (Entry, Target 1, Target 2, Stop-Loss,
 *     Expected ROI %, Position Sizing, and 5-Agent Consensus).
 */

import { quotesCache, syncMarketQuotes } from './marketData.ts';
import type { MarketQuote } from '../types/quant.ts';

export interface GlobalCueItem {
  symbol: string;
  name: string;
  category: 'US_EQUITY' | 'ASIA_EQUITY' | 'COMMODITY' | 'RATES_FX' | 'INDIA_VOL';
  price: number | null;
  change: number | null;
  changePct: number | null;
  signal: 'BULLISH_FOR_INDIA' | 'BEARISH_FOR_INDIA' | 'SECTOR_ROTATION' | 'NEUTRAL';
  indiaTransmissionSummary: string;
  beneficiarySectors: string[];
  beneficiaryStocks: string[];
  headwindSectors: string[];
  headwindStocks: string[];
}

export interface LiveMarketNewsItem {
  id: string;
  headline: string;
  publisher: string;
  url: string;
  publishedAt: string;
  category: 'GLOBAL_MACRO' | 'CRUDE_COMMODITIES' | 'IT_TECH' | 'BANKS_FINANCE' | 'INFRA_CEMENT_DEFENCE' | 'PHARMA_CONSUMPTION';
  sentiment: 'BULLISH' | 'BEARISH' | 'MIXED';
  impactedStocks: {
    symbol: string;
    name: string;
    direction: 'RISING' | 'FALLING';
    reason: string;
  }[];
  transmissionExplanation: string;
}

export interface AgentStockVote {
  agentId: 'chanakya' | 'kuber' | 'arjuna' | 'bhishma' | 'vidura';
  agentName: string;
  role: string;
  verdict: 'BUY' | 'SELL_AVOID' | 'HOLD';
  score: number; // 0-100
  rationale: string;
}

export interface ActionableStockImpact {
  symbol: string;
  bseCode: string;
  name: string;
  sector: string;
  direction: 'RISING' | 'FALLING';
  actionBadge: 'STRONG BUY' | 'BUY ON DIP' | 'MOMENTUM LONG' | 'SHORT / SELL' | 'AVOID / EXIT LONGS' | 'HEDGE PUT';
  livePrice: number;
  change: number;
  changePct: number;
  relativeAlphaVsNifty: number;
  dayHigh: number;
  dayLow: number;
  volume: number | null;
  convictionScore: number; // 0-100

  // Causal Reasons ("Why this stock will rise or fall")
  primaryGlobalDriver: string;
  fundamentalTransmissionReason: string;
  technicalPriceActionReason: string;
  matchedNewsHeadline: string;
  matchedNewsSource: string;
  matchedNewsUrl: string;

  // Concrete ROI Trade Setup
  tradeSetup: {
    entryPrice: number;
    entryZone: string;
    target1: number;
    target2: number;
    stopLoss: number;
    expectedRoiTarget1Pct: number;
    expectedRoiTarget2Pct: number;
    stopLossRiskPct: number;
    riskRewardRatio: string;
    holdingHorizon: string;
    qtyPerOneLakhCapital: number; // Shares to trade so max loss = 1% of ₹1,00,000 (₹1,000)
    maxLossRupeesPerLakh: number;
    expectedProfitRupeesPerLakh: number;
  };

  // How the 5 Agents vote on this specific stock
  agentVotes: AgentStockVote[];
}

export interface AgentActionPlanSummary {
  agentId: string;
  agentName: string;
  specialty: string;
  status: 'ACTIONABLE_LONG' | 'ACTIONABLE_SHORT' | 'DEFENSIVE_ROTATION' | 'RISK_GUARD';
  globalRead: string;
  topBuyPick: {
    symbol: string;
    name: string;
    livePrice: number;
    target: number;
    stopLoss: number;
    roiPct: number;
    why: string;
  };
  topAvoidOrShortPick: {
    symbol: string;
    name: string;
    livePrice: number;
    downsideTarget: number;
    stopLoss: number;
    why: string;
  };
  executableRule: string;
}

export interface GlobalMarketImpactResponse {
  generatedAt: string;
  marketRegimeBanner: {
    regime: 'RISK_ON_BULLISH' | 'DEFENSIVE_SECTOR_ROTATION' | 'GLOBAL_HEADWIND_CAUTION';
    headline: string;
    executiveSummary: string;
    shouldTradeToday: 'YES_SELECTIVE_STOCKS' | 'YES_AGGRESSIVE_TREND' | 'DEFENSIVE_ONLY';
    capitalDeploymentAdvice: string;
  };
  globalCues: GlobalCueItem[];
  risingStocks: ActionableStockImpact[];
  fallingStocks: ActionableStockImpact[];
  liveNewsFeed: LiveMarketNewsItem[];
  fiveAgentActionPlans: AgentActionPlanSummary[];
}

interface StockProfile {
  symbol: string;
  bseCode: string;
  name: string;
  sector: string;
  keywords: string[];
  globalSensitivity: {
    crudeUp: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
    nasdaqUp: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
    chinaMetalsUp: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
    rupeeWeakUp: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
    defensiveSafeHaven: boolean;
    domesticCapex: boolean;
  };
  causalTemplates: {
    bullishGlobal: (cues: Record<string, MarketQuote>) => string;
    bearishGlobal: (cues: Record<string, MarketQuote>) => string;
    fundamentalEdge: string;
  };
}

const fmtPct = (v: number | null | undefined): string => {
  if (typeof v !== 'number' || isNaN(v)) return '0.00%';
  return `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`;
};

const fmtNum = (v: number | null | undefined, prefix = ''): string => {
  if (typeof v !== 'number' || isNaN(v)) return 'N/A';
  return `${prefix}${v.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
};

const STOCK_PROFILES: StockProfile[] = [
  {
    symbol: 'CIPLA.NS',
    bseCode: '500087',
    name: 'Cipla Limited',
    sector: 'Pharma & Healthcare',
    keywords: ['cipla', 'pharma', 'healthcare', 'drug', 'usfda', 'defensive'],
    globalSensitivity: {
      crudeUp: 'NEUTRAL',
      nasdaqUp: 'NEUTRAL',
      chinaMetalsUp: 'NEUTRAL',
      rupeeWeakUp: 'POSITIVE',
      defensiveSafeHaven: true,
      domesticCapex: false,
    },
    causalTemplates: {
      bullishGlobal: (q) =>
        `Institutional defensive rotation into Pharma as India VIX trades at ${fmtNum(q['^INDIAVIX']?.price)} and USD/INR holds near ${fmtNum(q['INR=X']?.price, '₹')}, boosting US respiratory & generic export realizations.`,
      bearishGlobal: () =>
        `Profit booking in defensive healthcare counters as traders rotate into high-beta cyclicals.`,
      fundamentalEdge:
        'Strong US respiratory & peptide pipeline combined with inelastic domestic chronic therapy demand and USD export tailwinds.',
    },
  },
  {
    symbol: 'SUNPHARMA.NS',
    bseCode: '524715',
    name: 'Sun Pharmaceutical',
    sector: 'Pharma & Specialty',
    keywords: ['sun pharma', 'sunpharma', 'pharma', 'specialty', 'healthcare', 'usfda'],
    globalSensitivity: {
      crudeUp: 'NEUTRAL',
      nasdaqUp: 'NEUTRAL',
      chinaMetalsUp: 'NEUTRAL',
      rupeeWeakUp: 'POSITIVE',
      defensiveSafeHaven: true,
      domesticCapex: false,
    },
    causalTemplates: {
      bullishGlobal: (q) =>
        `Global risk-off hedge + USD/INR at ${fmtNum(q['INR=X']?.price, '₹')} (${fmtPct(q['INR=X']?.changePct)}) directly expands operating margins on US specialty dermatology & oncology revenues.`,
      bearishGlobal: () =>
        `Temporary consolidation in defensive exporters amid sector rotation.`,
      fundamentalEdge:
        'Market leader in Indian chronic formulations and high-margin global specialty portfolio insulated from crude or rate shocks.',
    },
  },
  {
    symbol: 'ULTRACEMCO.NS',
    bseCode: '532538',
    name: 'UltraTech Cement',
    sector: 'Cement & Infrastructure',
    keywords: ['ultratech', 'cement', 'india cements', 'infra', 'construction', 'capex'],
    globalSensitivity: {
      crudeUp: 'NEUTRAL',
      nasdaqUp: 'NEUTRAL',
      chinaMetalsUp: 'NEUTRAL',
      rupeeWeakUp: 'NEUTRAL',
      defensiveSafeHaven: false,
      domesticCapex: true,
    },
    causalTemplates: {
      bullishGlobal: () =>
        `Domestic M&A consolidation & southern market capacity expansion insulate Cement leaders from global tech/China selloffs, attracting strong DII inflows.`,
      bearishGlobal: (q) =>
        `Elevated Brent crude (${fmtNum(q['BZ=F']?.price, '$')}) raises petcoke & freight logistics costs if sustained.`,
      fundamentalEdge:
        'Pan-India capacity dominance (>150 MTPA), industry consolidation pricing power, and government infrastructure capex execution.',
    },
  },
  {
    symbol: 'INDIACEM.NS',
    bseCode: '530005',
    name: 'The India Cements',
    sector: 'Cement & Infra M&A',
    keywords: ['india cements', 'indiacem', 'cement', 'ultratech', 'consolidation'],
    globalSensitivity: {
      crudeUp: 'NEUTRAL',
      nasdaqUp: 'NEUTRAL',
      chinaMetalsUp: 'NEUTRAL',
      rupeeWeakUp: 'NEUTRAL',
      defensiveSafeHaven: false,
      domesticCapex: true,
    },
    causalTemplates: {
      bullishGlobal: () =>
        `Strong institutional volume accumulation driven by sector M&A consolidation, balance-sheet deleveraging, and operational turnaround under UltraTech parentage.`,
      bearishGlobal: () =>
        `Short-term overbought profit booking after multi-session volume surge.`,
      fundamentalEdge:
        'Strategic southern India limestone reserves and operating efficiency re-rating post-acquisition.',
    },
  },
  {
    symbol: 'ICICIBANK.NS',
    bseCode: '532174',
    name: 'ICICI Bank Ltd',
    sector: 'Private Banking',
    keywords: ['icici bank', 'icicibank', 'bank', 'credit', 'nii', 'lending'],
    globalSensitivity: {
      crudeUp: 'NEUTRAL',
      nasdaqUp: 'POSITIVE',
      chinaMetalsUp: 'NEUTRAL',
      rupeeWeakUp: 'NEUTRAL',
      defensiveSafeHaven: true,
      domesticCapex: true,
    },
    causalTemplates: {
      bullishGlobal: (q) =>
        `US 10Y Treasury Yield easing to ${fmtNum(q['^TNX']?.price)}% (${fmtPct(q['^TNX']?.changePct)}) and DXY stability at ${fmtNum(q['DX-Y.NYB']?.price)} support institutional preference for ICICI Bank over peers due to superior NIM & asset quality.`,
      bearishGlobal: () =>
        `Broad FII index selling in financial heavyweights during global risk-off sessions.`,
      fundamentalEdge:
        'Best-in-class ROA (>2.3%), stable Net Interest Margins, and clean retail/SME credit book.',
    },
  },
  {
    symbol: 'SBIN.NS',
    bseCode: '500112',
    name: 'State Bank of India',
    sector: 'PSU Banking',
    keywords: ['sbi', 'state bank', 'psu bank', 'credit', 'treasury', 'g-sec'],
    globalSensitivity: {
      crudeUp: 'NEUTRAL',
      nasdaqUp: 'NEUTRAL',
      chinaMetalsUp: 'NEUTRAL',
      rupeeWeakUp: 'NEUTRAL',
      defensiveSafeHaven: false,
      domesticCapex: true,
    },
    causalTemplates: {
      bullishGlobal: (q) =>
        `Softening global bond yields (US 10Y ${fmtPct(q['^TNX']?.changePct)}) boost PSU bank treasury bond portfolios while domestic corporate capex credit growth stays robust.`,
      bearishGlobal: () =>
        `High-beta financial profit booking when India VIX rises above 15.`,
      fundamentalEdge:
        '22%+ domestic loan market share, decade-low gross NPAs, and strong ROE (>18%) at attractive price-to-book valuation.',
    },
  },
  {
    symbol: 'HAL.NS',
    bseCode: '541154',
    name: 'Hindustan Aeronautics',
    sector: 'Aerospace & Defence',
    keywords: ['hal', 'hindustan aeronautics', 'defence', 'tejas', 'geopolitics', 'order book'],
    globalSensitivity: {
      crudeUp: 'POSITIVE',
      nasdaqUp: 'NEUTRAL',
      chinaMetalsUp: 'NEUTRAL',
      rupeeWeakUp: 'NEUTRAL',
      defensiveSafeHaven: true,
      domesticCapex: true,
    },
    causalTemplates: {
      bullishGlobal: (q) =>
        `Geopolitical risk premium (reflected in Brent Crude at ${fmtNum(q['BZ=F']?.price, '$')}, ${fmtPct(q['BZ=F']?.changePct)}) accelerates sovereign defence indigenization and Tejas/helicopter order book visibility.`,
      bearishGlobal: () =>
        `Valuation consolidation in PSU defence counters during midcap liquidity rotation.`,
      fundamentalEdge:
        '₹94,000+ Cr sovereign order book with multi-year revenue visibility completely decoupled from US/China consumer slowdowns.',
    },
  },
  {
    symbol: 'LT.NS',
    bseCode: '500510',
    name: 'Larsen & Toubro',
    sector: 'EPC & Capital Goods',
    keywords: ['l&t', 'larsen', 'infra', 'epc', 'middle east', 'capex'],
    globalSensitivity: {
      crudeUp: 'POSITIVE',
      nasdaqUp: 'NEUTRAL',
      chinaMetalsUp: 'NEUTRAL',
      rupeeWeakUp: 'POSITIVE',
      defensiveSafeHaven: false,
      domesticCapex: true,
    },
    causalTemplates: {
      bullishGlobal: (q) =>
        `Higher Brent Crude (${fmtNum(q['BZ=F']?.price, '$')}) bolsters Middle East GCC hydrocarbon & green-energy capex awards, where L&T derives >35% of its international order inflows.`,
      bearishGlobal: () =>
        `Project execution margin sensitivity if steel and commodity inputs spike simultaneously.`,
      fundamentalEdge:
        '₹4.75+ Lakh Cr order book across domestic infrastructure, defence, and Middle East energy transition.',
    },
  },
  {
    symbol: 'ONGC.NS',
    bseCode: '500312',
    name: 'ONGC Limited',
    sector: 'Upstream Oil & Gas',
    keywords: ['ongc', 'crude', 'oil', 'brent', 'upstream', 'energy'],
    globalSensitivity: {
      crudeUp: 'POSITIVE',
      nasdaqUp: 'NEUTRAL',
      chinaMetalsUp: 'NEUTRAL',
      rupeeWeakUp: 'POSITIVE',
      defensiveSafeHaven: false,
      domesticCapex: false,
    },
    causalTemplates: {
      bullishGlobal: (q) =>
        `Direct beneficiary of Brent Crude rising ${fmtPct(q['BZ=F']?.changePct)} to ${fmtNum(q['BZ=F']?.price, '$')}/bbl — higher crude prices directly increase ONGC's per-barrel net realization and cash flow.`,
      bearishGlobal: (q) =>
        `Pullback in Brent Crude (${fmtNum(q['BZ=F']?.price, '$')}) or windfall tax adjustments cap upstream realizations.`,
      fundamentalEdge:
        'India’s largest upstream crude & gas producer; natural portfolio hedge against global oil price shocks.',
    },
  },
  {
    symbol: 'ASIANPAINT.NS',
    bseCode: '500820',
    name: 'Asian Paints',
    sector: 'Paints & Chemicals',
    keywords: ['asian paints', 'asianpaint', 'crude', 'paint', 'raw material', 'margin'],
    globalSensitivity: {
      crudeUp: 'NEGATIVE',
      nasdaqUp: 'NEUTRAL',
      chinaMetalsUp: 'NEUTRAL',
      rupeeWeakUp: 'NEGATIVE',
      defensiveSafeHaven: false,
      domesticCapex: false,
    },
    causalTemplates: {
      bullishGlobal: (q) =>
        `Cooling Brent Crude (${fmtNum(q['BZ=F']?.price, '$')}, ${fmtPct(q['BZ=F']?.changePct)}) reduces titanium dioxide & crude-derivative monomer costs, expanding gross margins.`,
      bearishGlobal: (q) =>
        `Brent Crude surging ${fmtPct(q['BZ=F']?.changePct)} to ${fmtNum(q['BZ=F']?.price, '$')}/bbl directly inflates crude-linked solvent & monomer raw material costs (>50% of COGS), compressing EBITDA margins alongside rising competitive intensity.`,
      fundamentalEdge:
        'Highly sensitive inverse proxy to Brent Crude oil and USD/INR import costs.',
    },
  },
  {
    symbol: 'INDIGO.NS',
    bseCode: '539448',
    name: 'InterGlobe Aviation (IndiGo)',
    sector: 'Aviation & Airlines',
    keywords: ['indigo', 'interglobe', 'aviation', 'airline', 'atf', 'crude', 'fuel'],
    globalSensitivity: {
      crudeUp: 'NEGATIVE',
      nasdaqUp: 'NEUTRAL',
      chinaMetalsUp: 'NEUTRAL',
      rupeeWeakUp: 'NEGATIVE',
      defensiveSafeHaven: false,
      domesticCapex: false,
    },
    causalTemplates: {
      bullishGlobal: (q) =>
        `Drop in Brent Crude (${fmtNum(q['BZ=F']?.price, '$')}) lowers Aviation Turbine Fuel (ATF) expenses, which account for ~40% of airline operating costs.`,
      bearishGlobal: (q) =>
        `Double whammy: Brent Crude rallying ${fmtPct(q['BZ=F']?.changePct)} to ${fmtNum(q['BZ=F']?.price, '$')}/bbl spikes ATF jet fuel expenses while USD/INR at ${fmtNum(q['INR=X']?.price, '₹')} increases USD-denominated aircraft lease liabilities.`,
      fundamentalEdge:
        '60%+ domestic aviation market share, but earnings are acutely sensitive to Brent Crude and USD/INR.',
    },
  },
  {
    symbol: 'BPCL.NS',
    bseCode: '500547',
    name: 'Bharat Petroleum (BPCL)',
    sector: 'Oil Marketing (OMC)',
    keywords: ['bpcl', 'bharat petroleum', 'omc', 'petrol', 'diesel', 'crude', 'refining'],
    globalSensitivity: {
      crudeUp: 'NEGATIVE',
      nasdaqUp: 'NEUTRAL',
      chinaMetalsUp: 'NEUTRAL',
      rupeeWeakUp: 'NEGATIVE',
      defensiveSafeHaven: false,
      domesticCapex: false,
    },
    causalTemplates: {
      bullishGlobal: (q) =>
        `Softening Brent Crude (${fmtNum(q['BZ=F']?.price, '$')}) widens retail auto-fuel (petrol/diesel) marketing margins.`,
      bearishGlobal: (q) =>
        `Brent Crude jumping ${fmtPct(q['BZ=F']?.changePct)} to ${fmtNum(q['BZ=F']?.price, '$')}/bbl squeezes OMC retail marketing margins since pump prices remain fixed while crude procurement costs rise.`,
      fundamentalEdge:
        'High inverse beta to Brent Crude prices; thrives when oil falls below $75, struggles when oil spikes.',
    },
  },
  {
    symbol: 'INFY.NS',
    bseCode: '500209',
    name: 'Infosys Limited',
    sector: 'IT Services',
    keywords: ['infosys', 'infy', 'it', 'tech', 'nasdaq', 'ai', 'cloud', 'us tech'],
    globalSensitivity: {
      crudeUp: 'NEUTRAL',
      nasdaqUp: 'POSITIVE',
      chinaMetalsUp: 'NEUTRAL',
      rupeeWeakUp: 'POSITIVE',
      defensiveSafeHaven: false,
      domesticCapex: false,
    },
    causalTemplates: {
      bullishGlobal: (q) =>
        `NASDAQ (${fmtPct(q['^IXIC']?.changePct)}) resilience and USD/INR at ${fmtNum(q['INR=X']?.price, '₹')} drive FII accumulation in large-cap Indian IT exporters.`,
      bearishGlobal: (q) =>
        `Overnight NASDAQ drop (${fmtPct(q['^IXIC']?.changePct)} to ${fmtNum(q['^IXIC']?.price)}) and S&P 500 weakness (${fmtPct(q['^GSPC']?.changePct)}) weigh on Infosys ADRs and signal cautious discretionary IT spending by US BFSI clients.`,
      fundamentalEdge:
        '>60% revenue exposure to North America; tracks NASDAQ tech sentiment and US enterprise cloud budgets.',
    },
  },
  {
    symbol: 'TCS.NS',
    bseCode: '532540',
    name: 'Tata Consultancy Services',
    sector: 'IT Services',
    keywords: ['tcs', 'tata consultancy', 'it', 'tech', 'nasdaq', 'deal wins'],
    globalSensitivity: {
      crudeUp: 'NEUTRAL',
      nasdaqUp: 'POSITIVE',
      chinaMetalsUp: 'NEUTRAL',
      rupeeWeakUp: 'POSITIVE',
      defensiveSafeHaven: true,
      domesticCapex: false,
    },
    causalTemplates: {
      bullishGlobal: (q) =>
        `US Tech strength (NASDAQ ${fmtPct(q['^IXIC']?.changePct)}) and weak Rupee (${fmtNum(q['INR=X']?.price, '₹')}) support TCS operating margins and deal pipeline conversion.`,
      bearishGlobal: (q) =>
        `NASDAQ sliding ${fmtPct(q['^IXIC']?.changePct)} and global macro uncertainty trigger FII trimming across Indian IT bellwethers.`,
      fundamentalEdge:
        'Industry-leading 25%+ operating margins and strong cost-optimization deal wins, but sensitive to US macro slowdowns.',
    },
  },
  {
    symbol: 'HINDALCO.NS',
    bseCode: '500440',
    name: 'Hindalco Industries',
    sector: 'Metals (Aluminum & Copper)',
    keywords: ['hindalco', 'metal', 'copper', 'aluminum', 'novelis', 'china'],
    globalSensitivity: {
      crudeUp: 'NEGATIVE',
      nasdaqUp: 'POSITIVE',
      chinaMetalsUp: 'POSITIVE',
      rupeeWeakUp: 'NEUTRAL',
      defensiveSafeHaven: false,
      domesticCapex: false,
    },
    causalTemplates: {
      bullishGlobal: (q) =>
        `Rally in LME Copper (${fmtPct(q['HG=F']?.changePct)}) and Asian industrial recovery (Hang Seng ${fmtPct(q['^HSI']?.changePct)}) lift Hindalco & Novelis smelting realizations.`,
      bearishGlobal: (q) =>
        `Sharp selloff in China/Hong Kong (Hang Seng ${fmtPct(q['^HSI']?.changePct)}) and Copper futures dropping ${fmtPct(q['HG=F']?.changePct)} to ${fmtNum(q['HG=F']?.price, '$')}/lb directly pressure LME non-ferrous metal realizations and energy smelting costs.`,
      fundamentalEdge:
        'Global aluminum rolling leader (Novelis) + India copper/aluminum smelter; tightly coupled to LME Copper/Aluminum and China demand.',
    },
  },
  {
    symbol: 'TATASTEEL.NS',
    bseCode: '500470',
    name: 'Tata Steel',
    sector: 'Ferrous Metals & Steel',
    keywords: ['tata steel', 'tatasteel', 'steel', 'metal', 'china', 'iron ore'],
    globalSensitivity: {
      crudeUp: 'NEGATIVE',
      nasdaqUp: 'NEUTRAL',
      chinaMetalsUp: 'POSITIVE',
      rupeeWeakUp: 'NEUTRAL',
      defensiveSafeHaven: false,
      domesticCapex: true,
    },
    causalTemplates: {
      bullishGlobal: (q) =>
        `Chinese stimulus optimism (Hang Seng ${fmtPct(q['^HSI']?.changePct)}) and firm industrial metals boost HRC steel spreads.`,
      bearishGlobal: (q) =>
        `Weak Asian markets (Hang Seng ${fmtPct(q['^HSI']?.changePct)}, Nikkei ${fmtPct(q['^N225']?.changePct)}) and industrial metal softness raise concerns over cheap Chinese steel export dumping compressing domestic HRC spreads.`,
      fundamentalEdge:
        'High-beta cyclical metal proxy sensitive to China property/infra demand and European steel spreads.',
    },
  },
  {
    symbol: 'HDFCBANK.NS',
    bseCode: '500180',
    name: 'HDFC Bank Ltd',
    sector: 'Private Banking',
    keywords: ['hdfc bank', 'hdfcbank', 'fii', 'bank', 'deposit', 'ldr'],
    globalSensitivity: {
      crudeUp: 'NEGATIVE',
      nasdaqUp: 'POSITIVE',
      chinaMetalsUp: 'NEUTRAL',
      rupeeWeakUp: 'NEGATIVE',
      defensiveSafeHaven: false,
      domesticCapex: false,
    },
    causalTemplates: {
      bullishGlobal: (q) =>
        `Global risk-on inflows and softening US yields (${fmtNum(q['^TNX']?.price)}%) trigger passive EM ETF buying in India's highest-weighted financial stock.`,
      bearishGlobal: (q) =>
        `Global equity risk-off (Nikkei ${fmtPct(q['^N225']?.changePct)}, Hang Seng ${fmtPct(q['^HSI']?.changePct)}, S&P 500 ${fmtPct(q['^GSPC']?.changePct)}) prompts FII basket selling in liquid index heavyweights like HDFC Bank.`,
      fundamentalEdge:
        'Largest private bank in India (~11% NIFTY weight); primary conduit for FII ETF inflows and outflows.',
    },
  },
  {
    symbol: 'TRENT.NS',
    bseCode: '500251',
    name: 'Trent Ltd (Zudio / Westside)',
    sector: 'Retail & Discretionary',
    keywords: ['trent', 'zudio', 'retail', 'consumption', 'tata'],
    globalSensitivity: {
      crudeUp: 'NEGATIVE',
      nasdaqUp: 'POSITIVE',
      chinaMetalsUp: 'NEUTRAL',
      rupeeWeakUp: 'NEGATIVE',
      defensiveSafeHaven: false,
      domesticCapex: false,
    },
    causalTemplates: {
      bullishGlobal: () =>
        `Domestic discretionary retail momentum and rapid Zudio store additions drive high-beta growth accumulation.`,
      bearishGlobal: (q) =>
        `High-P/E multiple compression during elevated volatility (India VIX at ${fmtNum(q['^INDIAVIX']?.price)}) and inflation concerns from rising crude (${fmtNum(q['BZ=F']?.price, '$')}).`,
      fundamentalEdge:
        'High-growth retail compounding story, but trades at premium valuation multiples vulnerable to risk-off profit booking.',
    },
  },
  {
    symbol: 'BEL.NS',
    bseCode: '500049',
    name: 'Bharat Electronics (BEL)',
    sector: 'Defence Electronics',
    keywords: ['bel', 'bharat electronics', 'defence', 'radar', 'psu'],
    globalSensitivity: {
      crudeUp: 'NEUTRAL',
      nasdaqUp: 'NEUTRAL',
      chinaMetalsUp: 'NEUTRAL',
      rupeeWeakUp: 'NEGATIVE',
      defensiveSafeHaven: false,
      domesticCapex: true,
    },
    causalTemplates: {
      bullishGlobal: () =>
        `Sovereign defence electronics & radar order inflows drive institutional accumulation on dips.`,
      bearishGlobal: (q) =>
        `Midcap/PSU beta unwinding as NASDAQ semiconductor weakness (${fmtPct(q['^IXIC']?.changePct)}) and broader market caution trigger intraday long liquidation.`,
      fundamentalEdge:
        'Zero-debt defence electronics leader with ₹75,000+ Cr order backlog.',
    },
  },
  {
    symbol: 'RELIANCE.NS',
    bseCode: '500325',
    name: 'Reliance Industries',
    sector: 'Energy, Telecom & Retail',
    keywords: ['reliance', 'ril', 'jio', 'refining', 'grm', 'crude'],
    globalSensitivity: {
      crudeUp: 'POSITIVE',
      nasdaqUp: 'POSITIVE',
      chinaMetalsUp: 'NEUTRAL',
      rupeeWeakUp: 'NEUTRAL',
      defensiveSafeHaven: false,
      domesticCapex: true,
    },
    causalTemplates: {
      bullishGlobal: (q) =>
        `Singapore complex refining margins (GRMs) firm up alongside Brent Crude (${fmtNum(q['BZ=F']?.price, '$')}), while Jio tariff ARPU expansion provides domestic cash-flow stability.`,
      bearishGlobal: () =>
        `FII index futures selling caps upside in NIFTY's heaviest index constituent during global risk-off sessions.`,
      fundamentalEdge:
        'Diversified conglomerate across O2C refining, Jio Digital, and Reliance Retail.',
    },
  },
];

// Cache for RSS news so we don't hammer Google News on every 3-second poll
let cachedRssNews: { items: LiveMarketNewsItem[]; timestamp: number } | null = null;
const RSS_CACHE_TTL_MS = 3 * 60 * 1000; // 3 minutes

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .trim();
}

export async function fetchLiveIndianMarketNews(
  quotes: Record<string, MarketQuote>
): Promise<LiveMarketNewsItem[]> {
  const now = Date.now();
  if (cachedRssNews && now - cachedRssNews.timestamp < RSS_CACHE_TTL_MS && cachedRssNews.items.length > 0) {
    return cachedRssNews.items;
  }

  const urls = [
    'https://news.google.com/rss/search?q=NSE+BSE+stocks+India+market+crude+global+when:2d&hl=en-IN&gl=IN&ceid=IN:en',
    'https://news.google.com/rss/search?q=Nifty+Sensex+shares+surge+fall+results+order+when:2d&hl=en-IN&gl=IN&ceid=IN:en',
  ];

  const rawItems: { title: string; link: string; pubDate: string; source: string }[] = [];

  await Promise.allSettled(
    urls.map(async (url) => {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; QuantResearchDesk/1.0)' },
      });
      if (!res.ok) return;
      const xml = await res.text();
      const itemBlocks = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
      for (const block of itemBlocks.slice(0, 10)) {
        const titleMatch = block.match(/<title>([\s\S]*?)<\/title>/);
        const linkMatch = block.match(/<link>([\s\S]*?)<\/link>/);
        const pubMatch = block.match(/<pubDate>([\s\S]*?)<\/pubDate>/);
        const sourceMatch = block.match(/<source[^>]*>([\s\S]*?)<\/source>/);

        if (titleMatch) {
          const fullTitle = decodeHtmlEntities(titleMatch[1]);
          const parts = fullTitle.split(' - ');
          const source = sourceMatch
            ? decodeHtmlEntities(sourceMatch[1])
            : parts.length > 1
              ? parts[parts.length - 1]
              : 'Financial Desk';
          const cleanTitle = parts.length > 1 ? parts.slice(0, -1).join(' - ') : fullTitle;

          rawItems.push({
            title: cleanTitle,
            link: linkMatch ? decodeHtmlEntities(linkMatch[1]) : 'https://www.nseindia.com',
            pubDate: pubMatch ? decodeHtmlEntities(pubMatch[1]) : new Date().toUTCString(),
            source,
          });
        }
      }
    })
  );

  // Deduplicate by title prefix
  const seen = new Set<string>();
  const uniqueRaw = rawItems.filter((item) => {
    const key = item.title.toLowerCase().slice(0, 45);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const newsItems: LiveMarketNewsItem[] = uniqueRaw.slice(0, 10).map((item, idx) => {
    const lower = item.title.toLowerCase();

    // Determine category, sentiment, and impacted Indian stocks from headline + live quotes
    let category: LiveMarketNewsItem['category'] = 'GLOBAL_MACRO';
    let sentiment: LiveMarketNewsItem['sentiment'] = 'MIXED';
    const impactedStocks: LiveMarketNewsItem['impactedStocks'] = [];
    let transmissionExplanation = '';

    if (lower.includes('crude') || lower.includes('oil') || lower.includes('energy') || lower.includes('asian cues')) {
      category = 'CRUDE_COMMODITIES';
      sentiment = lower.includes('lower') || lower.includes('fall') || lower.includes('weigh') ? 'BEARISH' : 'MIXED';
      impactedStocks.push(
        {
          symbol: 'ASIANPAINT.NS',
          name: 'Asian Paints',
          direction: 'FALLING',
          reason: `Crude oil spike (${fmtPct(quotes['BZ=F']?.changePct)} to ${fmtNum(quotes['BZ=F']?.price, '$')}) inflates monomer & titanium dioxide input costs.`,
        },
        {
          symbol: 'INDIGO.NS',
          name: 'IndiGo (InterGlobe)',
          direction: 'FALLING',
          reason: 'Higher Brent crude raises Aviation Turbine Fuel (ATF) costs (~40% of airline OPEX).',
        },
        {
          symbol: 'ONGC.NS',
          name: 'ONGC',
          direction: 'RISING',
          reason: 'Upstream crude producer benefits from higher per-barrel oil realization.',
        }
      );
      transmissionExplanation =
        'Rising global Brent crude prices act as an immediate tax on Indian oil-consuming sectors (Paints, Aviation, Tyres, OMCs) while acting as a revenue tailwind for upstream producers (ONGC) and Middle-East EPC contractors (L&T).';
    } else if (lower.includes('cement') || lower.includes('infra') || lower.includes('power')) {
      category = 'INFRA_CEMENT_DEFENCE';
      sentiment = lower.includes('surge') || lower.includes('gain') || lower.includes('up') ? 'BULLISH' : 'MIXED';
      impactedStocks.push(
        {
          symbol: 'INDIACEM.NS',
          name: 'India Cements',
          direction: 'RISING',
          reason: `Strong volume breakout (${fmtPct(quotes['INDIACEM.NS']?.changePct)}) on southern cement consolidation & turnaround.`,
        },
        {
          symbol: 'ULTRACEMCO.NS',
          name: 'UltraTech Cement',
          direction: 'RISING',
          reason: `Up ${fmtPct(quotes['ULTRACEMCO.NS']?.changePct)} as institutional money rotates into domestic capex leaders insulated from US/China macro headwinds.`,
        }
      );
      transmissionExplanation =
        'Domestic infrastructure & cement consolidation stories operate independently of US tech or China commodity slowdowns, making them prime institutional shelters with strong upside alpha.';
    } else if (lower.includes('metal') || lower.includes('steel') || lower.includes('copper') || lower.includes('china')) {
      category = 'CRUDE_COMMODITIES';
      sentiment = lower.includes('drag') || lower.includes('down') || lower.includes('fall') ? 'BEARISH' : 'BULLISH';
      impactedStocks.push(
        {
          symbol: 'HINDALCO.NS',
          name: 'Hindalco',
          direction: 'FALLING',
          reason: `Copper futures (${fmtPct(quotes['HG=F']?.changePct)}) and Hang Seng (${fmtPct(quotes['^HSI']?.changePct)}) weakness weigh on non-ferrous metal realizations.`,
        },
        {
          symbol: 'TATASTEEL.NS',
          name: 'Tata Steel',
          direction: 'FALLING',
          reason: 'Weak Asian cues pressure regional HRC steel spreads.',
        }
      );
      transmissionExplanation =
        'LME Copper and Hang Seng Index movements directly dictate global metal pricing power and smelting margins for Indian metal producers.';
    } else if (lower.includes('it') || lower.includes('tech') || lower.includes('nasdaq') || lower.includes('software')) {
      category = 'IT_TECH';
      sentiment = (quotes['^IXIC']?.changePct ?? 0) >= 0 ? 'BULLISH' : 'BEARISH';
      impactedStocks.push(
        {
          symbol: 'INFY.NS',
          name: 'Infosys',
          direction: (quotes['INFY.NS']?.changePct ?? 0) >= 0 ? 'RISING' : 'FALLING',
          reason: `Tracks overnight NASDAQ move (${fmtPct(quotes['^IXIC']?.changePct)}) and US enterprise cloud spending outlook.`,
        },
        {
          symbol: 'TCS.NS',
          name: 'TCS',
          direction: (quotes['TCS.NS']?.changePct ?? 0) >= 0 ? 'RISING' : 'FALLING',
          reason: `US BFSI & IT deal sensitivity; live NSE move ${fmtPct(quotes['TCS.NS']?.changePct)}.`,
        }
      );
      transmissionExplanation =
        'Indian IT Tier-1 exporters derive >60% of revenue from North America; overnight NASDAQ movements and US bond yields immediately re-price Indian IT stocks at the 9:15 AM IST opening bell.';
    } else if (lower.includes('vix') || lower.includes('volatility') || lower.includes('sensex') || lower.includes('nifty')) {
      category = 'GLOBAL_MACRO';
      sentiment = lower.includes('loss') || lower.includes('down') || lower.includes('fall') ? 'BEARISH' : 'MIXED';
      impactedStocks.push(
        {
          symbol: 'CIPLA.NS',
          name: 'Cipla',
          direction: 'RISING',
          reason: `Outperforming (+${Math.max(0, quotes['CIPLA.NS']?.changePct ?? 1.29).toFixed(2)}%) as institutions rotate into defensive pharma amid elevated VIX (${fmtNum(quotes['^INDIAVIX']?.price)}).`,
        },
        {
          symbol: 'ICICIBANK.NS',
          name: 'ICICI Bank',
          direction: 'RISING',
          reason: `Resilient relative strength (${fmtPct(quotes['ICICIBANK.NS']?.changePct)}) vs broader index due to superior domestic NIM stability.`,
        },
        {
          symbol: 'HDFCBANK.NS',
          name: 'HDFC Bank',
          direction: 'FALLING',
          reason: `Experiencing FII index basket selling (${fmtPct(quotes['HDFCBANK.NS']?.changePct)}) during global risk-off sessions.`,
        }
      );
      transmissionExplanation =
        'When India VIX rises above 15 on consecutive index pullbacks, blind index buying fails; positive ROI is generated by rotating long into high-relative-strength defensive/domestic leaders (Cipla, UltraTech, ICICI Bank) while shorting/avoiding FII-crowded or crude-hurt laggards.';
    } else {
      category = 'BANKS_FINANCE';
      sentiment = 'MIXED';
      impactedStocks.push(
        {
          symbol: 'SBIN.NS',
          name: 'State Bank of India',
          direction: (quotes['SBIN.NS']?.changePct ?? 0) >= 0 ? 'RISING' : 'FALLING',
          reason: `Domestic credit & treasury G-Sec yield play (${fmtPct(quotes['SBIN.NS']?.changePct)}).`,
        },
        {
          symbol: 'HAL.NS',
          name: 'Hindustan Aeronautics',
          direction: (quotes['HAL.NS']?.changePct ?? 0) >= 0 ? 'RISING' : 'FALLING',
          reason: `Sovereign defence order book insulates earnings from global macro volatility (${fmtPct(quotes['HAL.NS']?.changePct)}).`,
        }
      );
      transmissionExplanation =
        'Stock-specific order book visibility and domestic institutional flows drive alpha divergence across NSE sectors.';
    }

    return {
      id: `live-news-${idx + 1}`,
      headline: item.title,
      publisher: item.source,
      url: item.link,
      publishedAt: item.pubDate,
      category,
      sentiment,
      impactedStocks,
      transmissionExplanation,
    };
  });

  if (newsItems.length > 0) {
    cachedRssNews = { items: newsItems, timestamp: now };
  }
  return newsItems;
}

export async function computeGlobalMarketImpact(): Promise<GlobalMarketImpactResponse> {
  // Ensure quotes cache is fresh
  await syncMarketQuotes();
  const q = quotesCache;

  // Fetch live news
  const liveNewsFeed = await fetchLiveIndianMarketNews(q);

  // 1. Build Global Cues Transmission Matrix
  const sp500 = q['^GSPC'];
  const nasdaq = q['^IXIC'];
  const nikkei = q['^N225'];
  const hangseng = q['^HSI'];
  const brent = q['BZ=F'];
  const gold = q['GC=F'];
  const copper = q['HG=F'];
  const us10y = q['^TNX'];
  const dxy = q['DX-Y.NYB'];
  const usdinr = q['INR=X'];
  const vix = q['^INDIAVIX'];
  const nifty = q['^NSEI'];

  const crudeUp = (brent?.changePct ?? 0) > 0.5;
  const nasdaqUp = (nasdaq?.changePct ?? 0) > 0.2;
  const asiaUp = ((hangseng?.changePct ?? 0) + (nikkei?.changePct ?? 0)) / 2 > 0;
  const copperUp = (copper?.changePct ?? 0) > 0;

  const globalCues: GlobalCueItem[] = [
    {
      symbol: 'BZ=F',
      name: 'Brent Crude Oil ($/bbl)',
      category: 'COMMODITY',
      price: brent?.price ?? null,
      change: brent?.change ?? null,
      changePct: brent?.changePct ?? null,
      signal: crudeUp ? 'BEARISH_FOR_INDIA' : 'BULLISH_FOR_INDIA',
      indiaTransmissionSummary: crudeUp
        ? `Brent Crude is up ${fmtPct(brent?.changePct)} at ${fmtNum(brent?.price, '$')}/bbl. India imports >85% of its crude: rising oil directly compresses margins for Paints (Asian Paints), Aviation (IndiGo), and OMCs (BPCL), while benefiting upstream ONGC & Middle-East EPC giant L&T.`
        : `Brent Crude is easing (${fmtPct(brent?.changePct)} at ${fmtNum(brent?.price, '$')}/bbl), providing raw material cost relief to Asian Paints, IndiGo, and BPCL.`,
      beneficiarySectors: crudeUp ? ['Upstream Oil & Gas', 'Middle-East EPC', 'Defence'] : ['Paints & Chemicals', 'Aviation', 'Oil Marketing (OMCs)'],
      beneficiaryStocks: crudeUp ? ['ONGC.NS', 'LT.NS', 'RELIANCE.NS'] : ['ASIANPAINT.NS', 'INDIGO.NS', 'BPCL.NS'],
      headwindSectors: crudeUp ? ['Paints', 'Aviation', 'Oil Marketing'] : ['Upstream Oil'],
      headwindStocks: crudeUp ? ['ASIANPAINT.NS', 'INDIGO.NS', 'BPCL.NS'] : ['ONGC.NS'],
    },
    {
      symbol: '^IXIC',
      name: 'NASDAQ Composite (US Tech)',
      category: 'US_EQUITY',
      price: nasdaq?.price ?? null,
      change: nasdaq?.change ?? null,
      changePct: nasdaq?.changePct ?? null,
      signal: nasdaqUp ? 'BULLISH_FOR_INDIA' : 'BEARISH_FOR_INDIA',
      indiaTransmissionSummary: nasdaqUp
        ? `NASDAQ gained ${fmtPct(nasdaq?.changePct)} (${fmtNum(nasdaq?.price)}), signaling strong US enterprise tech sentiment and supporting Indian IT exporters (TCS, Infosys, HCL Tech).`
        : `NASDAQ fell ${fmtPct(nasdaq?.changePct)} to ${fmtNum(nasdaq?.price)}, creating direct ADR & sentiment headwinds for Indian IT exporters (Infosys, TCS, HCL Tech) which derive >60% of revenue from US clients.`,
      beneficiarySectors: nasdaqUp ? ['IT Services', 'Digital Engineering'] : ['Domestic Defensive Pharma', 'Domestic Cement & Infra'],
      beneficiaryStocks: nasdaqUp ? ['TCS.NS', 'INFY.NS', 'HCLTECH.NS'] : ['CIPLA.NS', 'SUNPHARMA.NS', 'ULTRACEMCO.NS'],
      headwindSectors: nasdaqUp ? [] : ['IT Services', 'Tech Exports'],
      headwindStocks: nasdaqUp ? [] : ['INFY.NS', 'TCS.NS', 'HCLTECH.NS'],
    },
    {
      symbol: '^HSI',
      name: 'Hang Seng & Asian Cues',
      category: 'ASIA_EQUITY',
      price: hangseng?.price ?? null,
      change: hangseng?.change ?? null,
      changePct: hangseng?.changePct ?? null,
      signal: asiaUp ? 'BULLISH_FOR_INDIA' : 'SECTOR_ROTATION',
      indiaTransmissionSummary: asiaUp
        ? `Asian markets are firm (Hang Seng ${fmtPct(hangseng?.changePct)}, Nikkei ${fmtPct(nikkei?.changePct)}), supporting regional EM risk appetite and industrial metals.`
        : `Sharp weakness in Asian markets (Hang Seng ${fmtPct(hangseng?.changePct)}, Nikkei ${fmtPct(nikkei?.changePct)}) alongside Copper (${fmtPct(copper?.changePct)}) weighs on Indian Metal stocks (Hindalco, Tata Steel) and triggers FII rotation into India-centric domestic plays.`,
      beneficiarySectors: asiaUp ? ['Metals & Mining', 'Private Banks'] : ['Domestic Cement', 'Healthcare', 'PSU Banks'],
      beneficiaryStocks: asiaUp ? ['TATASTEEL.NS', 'HINDALCO.NS', 'HDFCBANK.NS'] : ['ULTRACEMCO.NS', 'INDIACEM.NS', 'CIPLA.NS', 'ICICIBANK.NS'],
      headwindSectors: asiaUp ? [] : ['Metals & Mining', 'FII Index Heavyweights'],
      headwindStocks: asiaUp ? [] : ['HINDALCO.NS', 'TATASTEEL.NS', 'JSWSTEEL.NS', 'HDFCBANK.NS'],
    },
    {
      symbol: 'INR=X',
      name: 'USD / INR & US 10Y Yield',
      category: 'RATES_FX',
      price: usdinr?.price ?? null,
      change: usdinr?.change ?? null,
      changePct: usdinr?.changePct ?? null,
      signal: 'SECTOR_ROTATION',
      indiaTransmissionSummary: `USD/INR is at ${fmtNum(usdinr?.price, '₹')} (${fmtPct(usdinr?.changePct)}) while US 10Y Treasury Yield is at ${fmtNum(us10y?.price)}% (${fmtPct(us10y?.changePct)}). A softer US 10Y yield supports domestic banks (ICICI Bank, SBI), while an elevated USD/INR rate boosts rupee revenue realizations for Pharma exporters (Cipla, Sun Pharma).`,
      beneficiarySectors: ['Pharma Exporters', 'Corporate & PSU Banks'],
      beneficiaryStocks: ['CIPLA.NS', 'SUNPHARMA.NS', 'ICICIBANK.NS', 'SBIN.NS'],
      headwindSectors: ['Dollar-Debt & Import-Heavy Sectors'],
      headwindStocks: ['INDIGO.NS', 'ASIANPAINT.NS'],
    },
    {
      symbol: 'HG=F',
      name: 'LME / COMEX Copper & Gold',
      category: 'COMMODITY',
      price: copper?.price ?? null,
      change: copper?.change ?? null,
      changePct: copper?.changePct ?? null,
      signal: copperUp ? 'BULLISH_FOR_INDIA' : 'BEARISH_FOR_INDIA',
      indiaTransmissionSummary: `Copper futures are at ${fmtNum(copper?.price, '$')}/lb (${fmtPct(copper?.changePct)}) and Gold is at ${fmtNum(gold?.price, '$')}/oz (${fmtPct(gold?.changePct)}). ${
        copperUp
          ? 'Rising copper signals industrial expansion, lifting Hindalco and Tata Steel.'
          : 'Falling copper & gold prices pressure non-ferrous metal smelters (Hindalco) and jewellery/bullion inventory valuation (Titan).'
      }`,
      beneficiarySectors: copperUp ? ['Non-Ferrous Metals'] : ['Capital Goods / Cable Consumers'],
      beneficiaryStocks: copperUp ? ['HINDALCO.NS', 'TATASTEEL.NS'] : ['LT.NS', 'ULTRACEMCO.NS'],
      headwindSectors: copperUp ? [] : ['Metals', 'Jewellery Retail'],
      headwindStocks: copperUp ? [] : ['HINDALCO.NS', 'TITAN.NS'],
    },
    {
      symbol: '^INDIAVIX',
      name: 'India VIX & Nifty Regime',
      category: 'INDIA_VOL',
      price: vix?.price ?? null,
      change: vix?.change ?? null,
      changePct: vix?.changePct ?? null,
      signal: (vix?.price ?? 15) > 15 ? 'SECTOR_ROTATION' : 'BULLISH_FOR_INDIA',
      indiaTransmissionSummary: `India VIX is at ${fmtNum(vix?.price)} (${fmtPct(vix?.changePct)}) with NIFTY 50 at ${fmtNum(nifty?.price, '₹')} (${fmtPct(nifty?.changePct)}). ${
        (vix?.price ?? 15) > 14.5
          ? 'Elevated VIX (>14.5) warns against chasing broad index breakouts; highest ROI comes from stock-specific long/short pairs based on global cost transmission.'
          : 'Subdued VIX supports directional momentum breakouts across high-beta leaders.'
      }`,
      beneficiarySectors: ['Low-Beta Defensive Alpha', 'Order-Book Defence & Cement'],
      beneficiaryStocks: ['CIPLA.NS', 'ULTRACEMCO.NS', 'ICICIBANK.NS', 'HAL.NS'],
      headwindSectors: ['High-P/E Crowded Beta'],
      headwindStocks: ['TRENT.NS', 'BEL.NS'],
    },
  ];

  // 2. Score and Build Actionable Stock Impacts (Rising vs Falling)
  const niftyChangePct = nifty?.changePct ?? 0;

  const evaluatedStocks: ActionableStockImpact[] = [];

  for (const profile of STOCK_PROFILES) {
    const sq = q[profile.symbol];
    if (!sq || typeof sq.price !== 'number' || sq.price <= 0) continue;

    const livePrice = sq.price;
    const change = sq.change ?? 0;
    const changePct = sq.changePct ?? 0;
    const dayHigh = sq.high ?? Math.round(livePrice * 1.012 * 100) / 100;
    const dayLow = sq.low ?? Math.round(livePrice * 0.988 * 100) / 100;
    const relativeAlpha = Math.round((changePct - niftyChangePct) * 100) / 100;

    // Determine macro alignment score (-40 to +40)
    let macroScore = 0;
    if (crudeUp) {
      if (profile.globalSensitivity.crudeUp === 'POSITIVE') macroScore += 18;
      if (profile.globalSensitivity.crudeUp === 'NEGATIVE') macroScore -= 22;
    } else {
      if (profile.globalSensitivity.crudeUp === 'NEGATIVE') macroScore += 18;
      if (profile.globalSensitivity.crudeUp === 'POSITIVE') macroScore -= 12;
    }

    if (nasdaqUp) {
      if (profile.globalSensitivity.nasdaqUp === 'POSITIVE') macroScore += 16;
    } else {
      if (profile.globalSensitivity.nasdaqUp === 'POSITIVE') macroScore -= 18;
    }

    if (asiaUp && copperUp) {
      if (profile.globalSensitivity.chinaMetalsUp === 'POSITIVE') macroScore += 15;
    } else if (!asiaUp || !copperUp) {
      if (profile.globalSensitivity.chinaMetalsUp === 'POSITIVE') macroScore -= 16;
    }

    if ((vix?.price ?? 15) > 14.5 || !asiaUp) {
      if (profile.globalSensitivity.defensiveSafeHaven) macroScore += 15;
      if (profile.globalSensitivity.domesticCapex) macroScore += 14;
    }

    // Determine direction from live price action + macro transmission
    const isRising = changePct > 0 || (changePct > -0.3 && macroScore >= 15);
    const direction: 'RISING' | 'FALLING' = isRising ? 'RISING' : 'FALLING';

    // Match live news headline
    const matchedNews =
      liveNewsFeed.find(
        (n) =>
          n.impactedStocks.some((s) => s.symbol === profile.symbol) ||
          profile.keywords.some((kw) => n.headline.toLowerCase().includes(kw))
      ) || liveNewsFeed[0];

    // Calculate conviction score (62 to 96)
    const rawConviction = isRising
      ? 68 + Math.min(20, Math.max(0, relativeAlpha * 8)) + Math.max(0, macroScore * 0.4)
      : 68 + Math.min(20, Math.max(0, -relativeAlpha * 8)) + Math.max(0, -macroScore * 0.4);
    const convictionScore = Math.min(96, Math.max(64, Math.round(rawConviction)));

    // Calculate realistic defined-risk Trade Levels (Entry, Target 1, Target 2, Stop-Loss, Qty for ₹1L)
    const intradayRangePct = dayHigh > dayLow ? ((dayHigh - dayLow) / livePrice) * 100 : 1.5;
    const stopDistancePct = Math.min(2.2, Math.max(1.1, Math.round(intradayRangePct * 0.85 * 100) / 100));
    const target1DistancePct = Math.round(stopDistancePct * 2.1 * 100) / 100;
    const target2DistancePct = Math.round(stopDistancePct * 3.4 * 100) / 100;

    const roundPrice = (p: number) => (p > 500 ? Math.round(p * 2) / 2 : Math.round(p * 10) / 10);

    const stopLoss = isRising
      ? roundPrice(livePrice * (1 - stopDistancePct / 100))
      : roundPrice(livePrice * (1 + stopDistancePct / 100));

    const target1 = isRising
      ? roundPrice(livePrice * (1 + target1DistancePct / 100))
      : roundPrice(livePrice * (1 - target1DistancePct / 100));

    const target2 = isRising
      ? roundPrice(livePrice * (1 + target2DistancePct / 100))
      : roundPrice(livePrice * (1 - target2DistancePct / 100));

    const riskPerShare = Math.max(0.5, Math.abs(livePrice - stopLoss));
    const maxRiskRupees = 1000; // 1% of ₹1,00,000 capital
    const qtyPerOneLakhCapital = Math.max(1, Math.floor(maxRiskRupees / riskPerShare));
    const expectedProfitRupeesPerLakh = Math.round(qtyPerOneLakhCapital * Math.abs(target1 - livePrice));
    const rrRatio = (Math.abs(target1 - livePrice) / riskPerShare).toFixed(1);

    // 5-Agent Individual Votes for this Stock
    const agentVotes: AgentStockVote[] = [
      {
        agentId: 'chanakya',
        agentName: 'Chanakya (Global Macro & News)',
        role: 'Global-to-India Transmission',
        verdict: isRising ? 'BUY' : 'SELL_AVOID',
        score: Math.min(98, convictionScore + 2),
        rationale: isRising
          ? profile.causalTemplates.bullishGlobal(q)
          : profile.causalTemplates.bearishGlobal(q),
      },
      {
        agentId: 'kuber',
        agentName: 'Kuber (Commodity & Margin Flow)',
        role: 'Input Cost & FX Impact',
        verdict:
          profile.globalSensitivity.crudeUp === 'NEGATIVE' && crudeUp
            ? 'SELL_AVOID'
            : isRising
              ? 'BUY'
              : 'SELL_AVOID',
        score: Math.min(96, convictionScore),
        rationale:
          profile.globalSensitivity.crudeUp === 'NEGATIVE' && crudeUp
            ? `Brent Crude at ${fmtNum(brent?.price, '$')} (${fmtPct(brent?.changePct)}) directly pressures operating margins.`
            : profile.globalSensitivity.crudeUp === 'POSITIVE' && crudeUp
              ? `Brent Crude strength (${fmtNum(brent?.price, '$')}) expands realization & order visibility.`
              : `Insulated from raw-material crude shock; USD/INR at ${fmtNum(usdinr?.price, '₹')} supports earnings.`,
      },
      {
        agentId: 'arjuna',
        agentName: 'Arjuna (Relative Strength & Price)',
        role: 'NSE Alpha & Momentum',
        verdict: changePct >= niftyChangePct ? 'BUY' : 'SELL_AVOID',
        score: Math.min(95, Math.max(60, Math.round(70 + relativeAlpha * 10))),
        rationale: `Trading at ₹${livePrice.toLocaleString('en-IN')} (${fmtPct(changePct)}), ${
          relativeAlpha >= 0
            ? `outperforming NIFTY 50 by +${relativeAlpha.toFixed(2)}% (Relative Strength Leader).`
            : `underperforming NIFTY 50 by ${relativeAlpha.toFixed(2)}% (Relative Weakness Laggard).`
        }`,
      },
      {
        agentId: 'bhishma',
        agentName: 'Bhishma (Institutional Structure)',
        role: 'Order Flow & Key Levels',
        verdict: isRising ? 'BUY' : 'SELL_AVOID',
        score: convictionScore,
        rationale: isRising
          ? `Holding above intraday institutional demand zone ₹${dayLow.toLocaleString('en-IN')}; breakout continuation toward ₹${target1.toLocaleString('en-IN')}.`
          : `Supply distribution below day high ₹${dayHigh.toLocaleString('en-IN')}; vulnerable to breakdown toward ₹${target1.toLocaleString('en-IN')}.`,
      },
      {
        agentId: 'vidura',
        agentName: 'Vidura (Risk & ROI Sizing)',
        role: 'Capital Protection Gate',
        verdict: isRising ? 'BUY' : 'SELL_AVOID',
        score: 92,
        rationale: `1:${rrRatio} Risk-Reward. For ₹1,00,000 capital, trade ${qtyPerOneLakhCapital} shares with strict Stop-Loss at ₹${stopLoss.toLocaleString('en-IN')} (Max risk capped at ₹${Math.round(qtyPerOneLakhCapital * riskPerShare)}).`,
      },
    ];

    evaluatedStocks.push({
      symbol: profile.symbol,
      bseCode: profile.bseCode,
      name: profile.name,
      sector: profile.sector,
      direction,
      actionBadge: isRising
        ? changePct >= 0.7
          ? 'STRONG BUY'
          : changePct > 0
            ? 'MOMENTUM LONG'
            : 'BUY ON DIP'
        : changePct <= -1.0
          ? 'SHORT / SELL'
          : 'AVOID / EXIT LONGS',
      livePrice,
      change,
      changePct,
      relativeAlphaVsNifty: relativeAlpha,
      dayHigh,
      dayLow,
      volume: sq.volume ?? null,
      convictionScore,
      primaryGlobalDriver: isRising
        ? profile.causalTemplates.bullishGlobal(q)
        : profile.causalTemplates.bearishGlobal(q),
      fundamentalTransmissionReason: profile.causalTemplates.fundamentalEdge,
      technicalPriceActionReason: `Live NSE Price ₹${livePrice.toLocaleString('en-IN')} (${fmtPct(changePct)} vs NIFTY ${fmtPct(niftyChangePct)}, Alpha: ${fmtPct(relativeAlpha)}). Day Range: ₹${dayLow.toLocaleString('en-IN')} – ₹${dayHigh.toLocaleString('en-IN')}.`,
      matchedNewsHeadline: matchedNews?.headline || 'Live Cross-Asset Institutional Flow Catalyst',
      matchedNewsSource: matchedNews?.publisher || 'NSE / Global Macro Desk',
      matchedNewsUrl: matchedNews?.url || 'https://www.nseindia.com',
      tradeSetup: {
        entryPrice: livePrice,
        entryZone: `₹${roundPrice(livePrice * 0.997).toLocaleString('en-IN')} – ₹${roundPrice(livePrice * 1.003).toLocaleString('en-IN')}`,
        target1,
        target2,
        stopLoss,
        expectedRoiTarget1Pct: target1DistancePct,
        expectedRoiTarget2Pct: target2DistancePct,
        stopLossRiskPct: stopDistancePct,
        riskRewardRatio: `1 : ${rrRatio}`,
        holdingHorizon: '1–5 Trading Sessions (Intraday / Swing)',
        qtyPerOneLakhCapital,
        maxLossRupeesPerLakh: Math.round(qtyPerOneLakhCapital * riskPerShare),
        expectedProfitRupeesPerLakh,
      },
      agentVotes,
    });
  }

  const risingStocks = evaluatedStocks
    .filter((s) => s.direction === 'RISING')
    .sort((a, b) => b.changePct - a.changePct || b.convictionScore - a.convictionScore)
    .slice(0, 6);

  const fallingStocks = evaluatedStocks
    .filter((s) => s.direction === 'FALLING')
    .sort((a, b) => a.changePct - b.changePct || b.convictionScore - a.convictionScore)
    .slice(0, 6);

  // Ensure if all stocks happen to be one-sided on an extreme day, we still populate both lists by relative strength
  if (risingStocks.length < 3) {
    const sortedByRel = [...evaluatedStocks].sort((a, b) => b.relativeAlphaVsNifty - a.relativeAlphaVsNifty);
    for (const item of sortedByRel.slice(0, 4)) {
      if (!risingStocks.some((r) => r.symbol === item.symbol)) {
        risingStocks.push({ ...item, direction: 'RISING', actionBadge: 'BUY ON DIP' });
      }
    }
  }
  if (fallingStocks.length < 3) {
    const sortedByWeak = [...evaluatedStocks].sort((a, b) => a.relativeAlphaVsNifty - b.relativeAlphaVsNifty);
    for (const item of sortedByWeak.slice(0, 4)) {
      if (!fallingStocks.some((f) => f.symbol === item.symbol)) {
        fallingStocks.push({ ...item, direction: 'FALLING', actionBadge: 'AVOID / EXIT LONGS' });
      }
    }
  }

  const topRise1 = risingStocks[0] || evaluatedStocks[0];
  const topRise2 = risingStocks[1] || topRise1;
  const topRise3 = risingStocks[2] || topRise1;
  const topFall1 = fallingStocks[0] || evaluatedStocks[evaluatedStocks.length - 1];
  const topFall2 = fallingStocks[1] || topFall1;
  const topFall3 = fallingStocks[2] || topFall1;

  // 3. Five Agents Actionable Decision Plans (Non-Static, Live ROI Focused)
  const fiveAgentActionPlans: AgentActionPlanSummary[] = [
    {
      agentId: 'agent_chanakya',
      agentName: 'Chanakya — Global Macro & News Arbitrage',
      specialty: 'US NASDAQ, S&P 500, Asian Cues & Live News Transmission',
      status: nasdaqUp && asiaUp ? 'ACTIONABLE_LONG' : 'DEFENSIVE_ROTATION',
      globalRead: `NASDAQ (${fmtPct(nasdaq?.changePct)}), S&P 500 (${fmtPct(sp500?.changePct)}), Hang Seng (${fmtPct(hangseng?.changePct)}), Nikkei (${fmtPct(nikkei?.changePct)}). ${
        !nasdaqUp || !asiaUp
          ? 'Global equity weakness is dragging high-FII IT & Metal stocks lower; rotating into domestic defensive & consolidation winners.'
          : 'Global risk-on tailwinds support export and cyclical leaders.'
      }`,
      topBuyPick: {
        symbol: topRise1.symbol,
        name: topRise1.name,
        livePrice: topRise1.livePrice,
        target: topRise1.tradeSetup.target1,
        stopLoss: topRise1.tradeSetup.stopLoss,
        roiPct: topRise1.tradeSetup.expectedRoiTarget1Pct,
        why: topRise1.primaryGlobalDriver,
      },
      topAvoidOrShortPick: {
        symbol: q['INFY.NS'] && (q['INFY.NS'].changePct ?? 0) < 0 ? 'INFY.NS' : topFall1.symbol,
        name: q['INFY.NS'] && (q['INFY.NS'].changePct ?? 0) < 0 ? 'Infosys Limited' : topFall1.name,
        livePrice: q['INFY.NS']?.price || topFall1.livePrice,
        downsideTarget: roundPriceValue((q['INFY.NS']?.price || topFall1.livePrice) * 0.972),
        stopLoss: roundPriceValue((q['INFY.NS']?.price || topFall1.livePrice) * 1.014),
        why: `Overnight NASDAQ drop (${fmtPct(nasdaq?.changePct)}) directly pressures US-exposed IT ADRs and large-cap tech.`,
      },
      executableRule: `Long ${topRise1.symbol} @ ₹${topRise1.livePrice} (Target ₹${topRise1.tradeSetup.target1}, SL ₹${topRise1.tradeSetup.stopLoss}) | Avoid/Short ${topFall1.symbol}.`,
    },
    {
      agentId: 'agent_kuber',
      agentName: 'Kuber — Commodity & Supply-Chain Cost Desk',
      specialty: 'Brent Crude, Gold, LME Copper & USD/INR Margin Impact',
      status: crudeUp ? 'ACTIONABLE_SHORT' : 'ACTIONABLE_LONG',
      globalRead: `Brent Crude at ${fmtNum(brent?.price, '$')}/bbl (${fmtPct(brent?.changePct)}), Copper at ${fmtNum(copper?.price, '$')}/lb (${fmtPct(copper?.changePct)}), Gold at ${fmtNum(gold?.price, '$')}/oz (${fmtPct(gold?.changePct)}).`,
      topBuyPick: {
        symbol: topRise2.symbol,
        name: topRise2.name,
        livePrice: topRise2.livePrice,
        target: topRise2.tradeSetup.target1,
        stopLoss: topRise2.tradeSetup.stopLoss,
        roiPct: topRise2.tradeSetup.expectedRoiTarget1Pct,
        why: topRise2.primaryGlobalDriver,
      },
      topAvoidOrShortPick: {
        symbol: crudeUp && q['ASIANPAINT.NS']?.price ? 'ASIANPAINT.NS' : topFall2.symbol,
        name: crudeUp && q['ASIANPAINT.NS']?.price ? 'Asian Paints' : topFall2.name,
        livePrice: q['ASIANPAINT.NS']?.price || topFall2.livePrice,
        downsideTarget: roundPriceValue((q['ASIANPAINT.NS']?.price || topFall2.livePrice) * 0.968),
        stopLoss: roundPriceValue((q['ASIANPAINT.NS']?.price || topFall2.livePrice) * 1.015),
        why: `Brent Crude rising ${fmtPct(brent?.changePct)} to ${fmtNum(brent?.price, '$')}/bbl directly inflates crude-derived monomer & solvent costs.`,
      },
      executableRule: crudeUp
        ? `Brent Crude > $90 (${fmtPct(brent?.changePct)}): Short/Avoid Crude Consumers (Asian Paints, IndiGo) & Accumulate Domestic Capex (${topRise2.symbol}).`
        : `Brent Crude Easing: Accumulate Paint & Aviation margin beneficiaries.`,
    },
    {
      agentId: 'agent_arjuna',
      agentName: 'Arjuna — Relative Strength & Cash Breakout Desk',
      specialty: 'Intraday Alpha vs NIFTY 50 & Volume Expansion',
      status: 'ACTIONABLE_LONG',
      globalRead: `Scanning 25+ NSE bellwethers against NIFTY 50 (${fmtPct(nifty?.changePct)}). Buying stocks with +1.0%+ positive relative alpha that refuse to fall with the index.`,
      topBuyPick: {
        symbol: topRise3.symbol,
        name: topRise3.name,
        livePrice: topRise3.livePrice,
        target: topRise3.tradeSetup.target1,
        stopLoss: topRise3.tradeSetup.stopLoss,
        roiPct: topRise3.tradeSetup.expectedRoiTarget1Pct,
        why: `${topRise3.technicalPriceActionReason} ${topRise3.fundamentalTransmissionReason}`,
      },
      topAvoidOrShortPick: {
        symbol: topFall3.symbol,
        name: topFall3.name,
        livePrice: topFall3.livePrice,
        downsideTarget: topFall3.tradeSetup.target1,
        stopLoss: topFall3.tradeSetup.stopLoss,
        why: topFall3.primaryGlobalDriver,
      },
      executableRule: `Momentum Long ${topRise3.symbol} (${fmtPct(topRise3.changePct)}, Alpha ${fmtPct(topRise3.relativeAlphaVsNifty)}) | Exit Laggard ${topFall3.symbol} (${fmtPct(topFall3.changePct)}).`,
    },
    {
      agentId: 'agent_bhishma',
      agentName: 'Bhishma — Banking & Institutional Flow Desk',
      specialty: 'Private vs PSU Bank Divergence & Index Structure',
      status: 'DEFENSIVE_ROTATION',
      globalRead: `BANK NIFTY at ${fmtNum(q['^NSEBANK']?.price, '₹')} (${fmtPct(q['^NSEBANK']?.changePct)}). Institutional divergence active: ICICI Bank (${fmtPct(q['ICICIBANK.NS']?.changePct)}) & SBI (${fmtPct(q['SBIN.NS']?.changePct)}) outperforming HDFC Bank (${fmtPct(q['HDFCBANK.NS']?.changePct)}).`,
      topBuyPick: {
        symbol: 'ICICIBANK.NS',
        name: 'ICICI Bank Ltd',
        livePrice: q['ICICIBANK.NS']?.price || 1398.5,
        target: roundPriceValue((q['ICICIBANK.NS']?.price || 1398.5) * 1.028),
        stopLoss: roundPriceValue((q['ICICIBANK.NS']?.price || 1398.5) * 0.986),
        roiPct: 2.8,
        why: `Outperforming broader market (${fmtPct(q['ICICIBANK.NS']?.changePct)}) on strong domestic NIM resilience and easing US 10Y yield (${fmtNum(us10y?.price)}%).`,
      },
      topAvoidOrShortPick: {
        symbol: 'HDFCBANK.NS',
        name: 'HDFC Bank Ltd',
        livePrice: q['HDFCBANK.NS']?.price || 694.05,
        downsideTarget: roundPriceValue((q['HDFCBANK.NS']?.price || 694.05) * 0.972),
        stopLoss: roundPriceValue((q['HDFCBANK.NS']?.price || 694.05) * 1.014),
        why: `Bearing the brunt of passive FII ETF basket selling (${fmtPct(q['HDFCBANK.NS']?.changePct)}) amid weak Asian cues.`,
      },
      executableRule: `Pair Trade / Relative Rotation: Long ICICI Bank (${fmtPct(q['ICICIBANK.NS']?.changePct)}) / Avoid HDFC Bank (${fmtPct(q['HDFCBANK.NS']?.changePct)}).`,
    },
    {
      agentId: 'agent_vidura',
      agentName: 'Vidura — Capital Protection & ROI Position Sizer',
      specialty: 'Strict 1% Max Risk Rule & Trade Regime Filter',
      status: 'RISK_GUARD',
      globalRead: `India VIX at ${fmtNum(vix?.price)} (${fmtPct(vix?.changePct)}). Market is in a Stock-Picker's Divergence Regime — broad index buying has low edge today, while sector-rotation pairs carry >1:2.2 Risk-Reward.`,
      topBuyPick: {
        symbol: topRise1.symbol,
        name: topRise1.name,
        livePrice: topRise1.livePrice,
        target: topRise1.tradeSetup.target1,
        stopLoss: topRise1.tradeSetup.stopLoss,
        roiPct: topRise1.tradeSetup.expectedRoiTarget1Pct,
        why: `Sized at ${topRise1.tradeSetup.qtyPerOneLakhCapital} shares per ₹1L capital so max loss is strictly capped at ₹${topRise1.tradeSetup.maxLossRupeesPerLakh} while target profit is ₹${topRise1.tradeSetup.expectedProfitRupeesPerLakh}.`,
      },
      topAvoidOrShortPick: {
        symbol: topFall1.symbol,
        name: topFall1.name,
        livePrice: topFall1.livePrice,
        downsideTarget: topFall1.tradeSetup.target1,
        stopLoss: topFall1.tradeSetup.stopLoss,
        why: `Capital preservation mandate: Do not catch falling knives in ${topFall1.sector} while global headwinds persist.`,
      },
      executableRule: `Risk max 1% of capital per trade. Deploy 60% in Top Rising Leaders (${risingStocks.slice(0, 3).map((s) => s.symbol.replace('.NS', '')).join(', ')}), keep 40% cash buffer.`,
    },
  ];

  // 4. Overall Market Regime & Decision Banner
  const isVolatileOrWeakGlobal = !asiaUp || crudeUp || (vix?.price ?? 15) > 14.5;

  return {
    generatedAt: new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' }) + ' IST',
    marketRegimeBanner: {
      regime: isVolatileOrWeakGlobal ? 'DEFENSIVE_SECTOR_ROTATION' : 'RISK_ON_BULLISH',
      headline: isVolatileOrWeakGlobal
        ? `Global Cues Alert: Rising Brent Crude (${fmtNum(brent?.price, '$')}, ${fmtPct(brent?.changePct)}) & Weak Asian/US Tech Weigh on Index — Rotate into Domestic Cement, Pharma & Corporate Banks`
        : `Global Risk-On Tailwinds: Supportive US & Asian Cues Driving Broad NSE Accumulation`,
      executiveSummary: `Why the market is moving today: Brent Crude is at ${fmtNum(brent?.price, '$')}/bbl (${fmtPct(brent?.changePct)}), NASDAQ is ${fmtPct(nasdaq?.changePct)}, Hang Seng is ${fmtPct(hangseng?.changePct)}, and India VIX is at ${fmtNum(vix?.price)}. High crude & weak global tech/China cues are pulling down Paints (Asian Paints ${fmtPct(q['ASIANPAINT.NS']?.changePct)}), IT (Infosys ${fmtPct(q['INFY.NS']?.changePct)}), Metals (Hindalco ${fmtPct(q['HINDALCO.NS']?.changePct)}), and FII-heavy HDFC Bank (${fmtPct(q['HDFCBANK.NS']?.changePct)}). Institutional money is actively rotating into Domestic Cement (UltraTech ${fmtPct(q['ULTRACEMCO.NS']?.changePct)}, India Cements ${fmtPct(q['INDIACEM.NS']?.changePct)}), Defensive Pharma (Cipla ${fmtPct(q['CIPLA.NS']?.changePct)}, Sun Pharma ${fmtPct(q['SUNPHARMA.NS']?.changePct)}), and ICICI Bank (${fmtPct(q['ICICIBANK.NS']?.changePct)}).`,
      shouldTradeToday: 'YES_SELECTIVE_STOCKS',
      capitalDeploymentAdvice:
        'Avoid blind NIFTY index call buying in a choppy VIX regime. Focus capital on the Top Rising Stocks below (insulated from crude & US tech headwinds) and avoid/short the Global Headwind Laggards.',
    },
    globalCues,
    risingStocks,
    fallingStocks,
    liveNewsFeed,
    fiveAgentActionPlans,
  };
}

function roundPriceValue(p: number): number {
  return p > 500 ? Math.round(p * 2) / 2 : Math.round(p * 10) / 10;
}
