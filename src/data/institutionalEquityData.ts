import {
  StrategyFactorScore,
  StrategyQuantification,
  QualificationRule,
  QUANTITATIVE_STRATEGY_FRAMEWORK_WEIGHTS,
  getStrategyQuantification,
} from './strategyQuantificationData';

export type {
  StrategyFactorScore,
  StrategyQuantification,
  QualificationRule,
};

export {
  QUANTITATIVE_STRATEGY_FRAMEWORK_WEIGHTS,
  getStrategyQuantification,
};

export interface InstitutionalStockPick {
  id: string;
  ticker: string;
  symbol: string;
  name: string;
  sector: 'CONSUMER' | 'DEFENSE' | 'INFRASTRUCTURE' | 'ELECTRONICS_EMS' | 'TELECOM' | 'BANKING_FINANCE' | 'CAPITAL_GOODS' | 'POWER_ENERGY' | 'IT_TECH';
  marketCapINR: string;
  horizon: 'SHORT_TERM' | 'LONG_TERM' | 'BOTH';
  strategyQuantification: StrategyQuantification;
  institutionalStrategy: {
    modelName: string;
    framework: string;
    thesis: string;
    invalidationCondition: string;
  };
  tacticalLevels: {
    entryMin: number;
    entryMax: number;
    stopLoss: number;
    riskPct: number;
    support1: number;
    support2: number;
    resistance1: number;
    resistance2: number;
    target1: { price: number; upsidePct: number; label: string };
    target2: { price: number; upsidePct: number; label: string };
    target3: { price: number; upsidePct: number; label: string };
    riskRewardRatio: string;
    confidenceScore: number;
    institutionalRating: 'STRONG_CONVICTION_BUY' | 'ACCUMULATE';
  };
  volumeAnalysis: {
    avgVolume20D: string;
    deliveryPct: number;
    deliveryAvg30D: number;
    volumeSurge: string;
    blockDealsSummary: string;
    institutionalFootprint: string;
  };
  companyAnalysis1Year: {
    revenueGrowthYoY: string;
    patGrowthYoY: string;
    ebitdaMargin: string;
    roce: string;
    roe: string;
    debtToEquity: string;
    fiiHoldingChange: string;
    diiHoldingChange: string;
    promoterHolding: string;
    operationalHighlight: string;
  };
  valuation: {
    trailingPE: number;
    median5YPE: number;
    priceToBook: number;
    evToEbitda: number;
  };
}

const RAW_INSTITUTIONAL_STOCK_PICKS: Omit<InstitutionalStockPick, 'strategyQuantification'>[] = [
  {
    id: 'stock-trent',
    ticker: 'TRENT',
    symbol: 'TRENT.NS',
    name: 'Trent Limited',
    sector: 'CONSUMER',
    marketCapINR: '₹93,800 Cr [Large Cap]',
    horizon: 'BOTH',
    institutionalStrategy: {
      modelName: 'QARP Quality Momentum & CANSLIM Base Breakout',
      framework: 'Wyckoff Phase D Markup & High Relative Strength Persistence',
      thesis: 'Unprecedented unit economic expansion across Zudio and Westside. Compounded same-store-sales growth exceeding 24% with zero store-level leverage, creating an industry-leading inventory turnover ratio.',
      invalidationCondition: 'Weekly close below 50-day EMA (₹2,510) or drop in delivery volume below 30% on red days.'
    },
    tacticalLevels: {
      entryMin: 2620,
      entryMax: 2650,
      stopLoss: 2545,
      riskPct: -3.60,
      support1: 2580,
      support2: 2510,
      resistance1: 2750,
      resistance2: 2900,
      target1: { price: 2780, upsidePct: 5.30, label: 'Pivot Fibonacci 1.272x Extension' },
      target2: { price: 2940, upsidePct: 11.36, label: 'Secondary Markup Wave' },
      target3: { price: 3200, upsidePct: 21.21, label: 'Blue-Sky Multi-Quarter Target' },
      riskRewardRatio: '1:3.2 (T1) / 1:5.9 (T3)',
      confidenceScore: 94,
      institutionalRating: 'STRONG_CONVICTION_BUY'
    },
    volumeAnalysis: {
      avgVolume20D: '438K shares',
      deliveryPct: 58.4,
      deliveryAvg30D: 38.2,
      volumeSurge: '4.2x 20D SMA',
      blockDealsSummary: '3 Sovereign/DII block deal clusters identified in ₹2,600-₹2,650 range',
      institutionalFootprint: 'Massive institutional absorption on intraday pullbacks'
    },
    companyAnalysis1Year: {
      revenueGrowthYoY: '+56.8% YoY (₹12,650 Cr)',
      patGrowthYoY: '+124.0% YoY (₹1,477 Cr)',
      ebitdaMargin: '16.4% (Expanded +220 bps)',
      roce: '31.2%',
      roe: '28.6%',
      debtToEquity: '0.00 (Net Cash Balance Sheet)',
      fiiHoldingChange: '+4.8% net accumulation over past 4 quarters to 28.2%',
      diiHoldingChange: '+2.1% net accumulation to 16.4%',
      promoterHolding: '37.0% (Tata Sons - Pristine Governance)',
      operationalHighlight: 'Added 220+ stores in FY25; international expansion in UAE commenced.'
    },
    valuation: {
      trailingPE: 74.5,
      median5YPE: 68.4,
      priceToBook: 24.2,
      evToEbitda: 32.1
    }
  },
  {
    id: 'stock-bel',
    ticker: 'BEL',
    symbol: 'BEL.NS',
    name: 'Bharat Electronics Ltd',
    sector: 'DEFENSE',
    marketCapINR: '₹2,84,000 Cr [Large Cap]',
    horizon: 'LONG_TERM',
    institutionalStrategy: {
      modelName: 'Sovereign Indigenization Moat + Order Backlog Multiplier',
      framework: 'Positive Indigenisation List (PIL-5) Monopolistic Supplier',
      thesis: 'Sole domestic prime contractor for airborne radar, naval sonars, and electronic warfare suites. Ministry of Defence mandates guarantee 100% domestic procurement exclusivity through FY30.',
      invalidationCondition: 'Order intake falling below ₹20,000 Cr in trailing 12 months or cancellation of major radar contracts.'
    },
    tacticalLevels: {
      entryMin: 384,
      entryMax: 392,
      stopLoss: 372,
      riskPct: -4.37,
      support1: 380,
      support2: 368,
      resistance1: 410,
      resistance2: 435,
      target1: { price: 420, upsidePct: 7.83, label: 'Initial Breakout Pivot' },
      target2: { price: 445, upsidePct: 14.25, label: 'Export Spillover Acceleration' },
      target3: { price: 475, upsidePct: 21.95, label: '10-Year Defense Cycle 52W High Test' },
      riskRewardRatio: '1:3.3 (T2)',
      confidenceScore: 96,
      institutionalRating: 'STRONG_CONVICTION_BUY'
    },
    volumeAnalysis: {
      avgVolume20D: '6.85M shares',
      deliveryPct: 64.2,
      deliveryAvg30D: 44.0,
      volumeSurge: '3.4x 20D SMA',
      blockDealsSummary: 'Heavy FPI sovereign wealth buying at ₹380-₹390 VWAP anchor',
      institutionalFootprint: 'Systematic DII accumulation on every 2-day decline'
    },
    companyAnalysis1Year: {
      revenueGrowthYoY: '+18.4% YoY (₹20,268 Cr)',
      patGrowthYoY: '+26.4% YoY (₹3,985 Cr)',
      ebitdaMargin: '25.8% (Expanded +140 bps)',
      roce: '34.8%',
      roe: '27.4%',
      debtToEquity: '0.00 (Zero Debt, ₹8,400 Cr Cash & Equivalents)',
      fiiHoldingChange: '+3.4% to 17.8% (Record High FII Holding)',
      diiHoldingChange: '22.8% (Steady institutional anchor)',
      promoterHolding: '51.1% (President of India)',
      operationalHighlight: 'Order pipeline of ₹76,200 Cr provides 3.8x revenue visibility.'
    },
    valuation: {
      trailingPE: 56.4,
      median5YPE: 34.1,
      priceToBook: 14.2,
      evToEbitda: 36.8
    }
  },
  {
    id: 'stock-hal',
    ticker: 'HAL',
    symbol: 'HAL.NS',
    name: 'Hindustan Aeronautics Ltd',
    sector: 'DEFENSE',
    marketCapINR: '₹3,13,000 Cr [Large Cap]',
    horizon: 'LONG_TERM',
    institutionalStrategy: {
      modelName: 'Sovereign Aerospace Monopoly & Manufacturing Supercycle',
      framework: 'Tejas Mk1A, Prachand LCH & GE F414 Engine Transfer of Technology',
      thesis: 'Unmatched 10-year manufacturing backlog exceeding ₹94,000 Cr with recurring high-margin maintenance, repair, and overhaul (MRO) revenue accounting for >35% of EBITDA.',
      invalidationCondition: 'Structural delays in GE engine deliveries exceeding 18 months.'
    },
    tacticalLevels: {
      entryMin: 4640,
      entryMax: 4700,
      stopLoss: 4490,
      riskPct: -4.18,
      support1: 4580,
      support2: 4420,
      resistance1: 4950,
      resistance2: 5200,
      target1: { price: 5050, upsidePct: 7.83, label: 'Tejas Squadron Milestone' },
      target2: { price: 5450, upsidePct: 16.36, label: 'GE-414 Co-Production Re-rating' },
      target3: { price: 6100, upsidePct: 30.25, label: 'Global Export Fleet Valuation' },
      riskRewardRatio: '1:3.9 (T2)',
      confidenceScore: 95,
      institutionalRating: 'STRONG_CONVICTION_BUY'
    },
    volumeAnalysis: {
      avgVolume20D: '938K shares',
      deliveryPct: 61.8,
      deliveryAvg30D: 42.5,
      volumeSurge: '2.9x 20D SMA',
      blockDealsSummary: 'FII long-only funds absorbed 850K shares during index rebalancing',
      institutionalFootprint: 'Ultra-low retail float; locked in sovereign custody'
    },
    companyAnalysis1Year: {
      revenueGrowthYoY: '+13.8% YoY (₹30,381 Cr)',
      patGrowthYoY: '+31.2% YoY (₹7,621 Cr)',
      ebitdaMargin: '27.2%',
      roce: '36.1%',
      roe: '29.4%',
      debtToEquity: '0.00 (Cash surplus ₹26,000 Cr)',
      fiiHoldingChange: '+4.2% over 4Q to 14.6%',
      diiHoldingChange: '17.8%',
      promoterHolding: '71.6% (President of India)',
      operationalHighlight: 'Third manufacturing line commissioned in Nashik for Su-30 and Tejas.'
    },
    valuation: {
      trailingPE: 38.6,
      median5YPE: 24.2,
      priceToBook: 9.8,
      evToEbitda: 24.1
    }
  },
  {
    id: 'stock-lt',
    ticker: 'LT',
    symbol: 'LT.NS',
    name: 'Larsen & Toubro Ltd',
    sector: 'INFRASTRUCTURE',
    marketCapINR: '₹5,18,000 Cr [Large Cap]',
    horizon: 'BOTH',
    institutionalStrategy: {
      modelName: 'Capex Supercycle Proxy & Middle East Hydrocarbon Mega-Orders',
      framework: 'GIFT City / High-Speed Rail / Aramco LTA Long-Term Vendor',
      thesis: 'Consolidated order book at historic high of ₹4,75,000 Cr with international Middle East orders diversifying margin risk and Indian public infrastructure spending ramping ahead of budget execution.',
      invalidationCondition: 'Working capital to sales rising above 20% or crude oil collapse below $50 impacting Middle East capex.'
    },
    tacticalLevels: {
      entryMin: 3740,
      entryMax: 3780,
      stopLoss: 3630,
      riskPct: -3.64,
      support1: 3710,
      support2: 3620,
      resistance1: 3920,
      resistance2: 4150,
      target1: { price: 3980, upsidePct: 5.63, label: 'Intraday F&O Target' },
      target2: { price: 4220, upsidePct: 12.01, label: 'Order Inflow Accretion' },
      target3: { price: 4550, upsidePct: 20.77, label: 'Multi-Year Core Infrastructure Target' },
      riskRewardRatio: '1:3.3 (T2)',
      confidenceScore: 92,
      institutionalRating: 'STRONG_CONVICTION_BUY'
    },
    volumeAnalysis: {
      avgVolume20D: '1.39M shares',
      deliveryPct: 52.4,
      deliveryAvg30D: 46.0,
      volumeSurge: '2.1x 20D SMA',
      blockDealsSummary: 'Consistent FII call-option writing absorbed by synthetic cash buying',
      institutionalFootprint: 'High mutual fund weighting across all large-cap mandates'
    },
    companyAnalysis1Year: {
      revenueGrowthYoY: '+20.6% YoY (₹2,21,113 Cr)',
      patGrowthYoY: '+24.7% YoY (₹13,059 Cr)',
      ebitdaMargin: '10.8%',
      roce: '16.8%',
      roe: '15.4%',
      debtToEquity: '0.58 (Deleveraging core EPC debt)',
      fiiHoldingChange: '+1.6% to 24.8%',
      diiHoldingChange: '38.4% (Highest institutional ownership in Nifty)',
      promoterHolding: '0.00% (Broadly held institutional governance)',
      operationalHighlight: 'Secured landmark ultra-deepwater gas and semiconductor fab construction contracts.'
    },
    valuation: {
      trailingPE: 34.6,
      median5YPE: 28.5,
      priceToBook: 5.1,
      evToEbitda: 18.9
    }
  },
  {
    id: 'stock-dixon',
    ticker: 'DIXON',
    symbol: 'DIXON.NS',
    name: 'Dixon Technologies Ltd',
    sector: 'ELECTRONICS_EMS',
    marketCapINR: '₹79,200 Cr [Mid-Large Cap]',
    horizon: 'BOTH',
    institutionalStrategy: {
      modelName: 'Global Smartphone PLI Shift & IT Hardware Indigenization',
      framework: 'Scale Economics EMS Dominance (Motorola, Xiaomi, Google Pixel, HP)',
      thesis: 'Capturing >50% of outsourced smartphone assembly in India under PLI incentives with backward integration into precision display modules, camera optics, and high-layer PCBs expanding gross margins.',
      invalidationCondition: 'Loss of key OEM manufacturing contracts or PLI subsidy disbursal disputes.'
    },
    tacticalLevels: {
      entryMin: 13150,
      entryMax: 13350,
      stopLoss: 12680,
      riskPct: -4.22,
      support1: 12950,
      support2: 12400,
      resistance1: 13900,
      resistance2: 14800,
      target1: { price: 14200, upsidePct: 7.07, label: 'Initial Momentum Surge' },
      target2: { price: 15300, upsidePct: 15.36, label: 'Export Volume Breakthrough' },
      target3: { price: 17000, upsidePct: 28.18, label: 'Component Integration Blue-Sky' },
      riskRewardRatio: '1:3.6 (T2)',
      confidenceScore: 91,
      institutionalRating: 'STRONG_CONVICTION_BUY'
    },
    volumeAnalysis: {
      avgVolume20D: '186K shares',
      deliveryPct: 54.6,
      deliveryAvg30D: 36.5,
      volumeSurge: '3.8x 20D SMA',
      blockDealsSummary: 'Institutional block volume exceeding ₹480 Cr recorded on breakout above ₹13,000',
      institutionalFootprint: 'Rapid rotation by tech alpha and small/mid-cap funds'
    },
    companyAnalysis1Year: {
      revenueGrowthYoY: '+92.4% YoY (₹17,690 Cr)',
      patGrowthYoY: '+108.2% YoY (₹415 Cr)',
      ebitdaMargin: '4.2% (EMS standard, moving to 5.0% on component integration)',
      roce: '32.4%',
      roe: '26.8%',
      debtToEquity: '0.12 (Virtually Debt-Free)',
      fiiHoldingChange: '+6.2% over 1Y to 21.4%',
      diiHoldingChange: '25.6%',
      promoterHolding: '33.8%',
      operationalHighlight: 'Commenced Google Pixel 8 assembly in Noida campus; annual capacity reached 30M handsets.'
    },
    valuation: {
      trailingPE: 93.8,
      median5YPE: 72.0,
      priceToBook: 22.1,
      evToEbitda: 47.5
    }
  },
  {
    id: 'stock-bharti',
    ticker: 'BHARTIARTL',
    symbol: 'BHARTIARTL.NS',
    name: 'Bharti Airtel Ltd',
    sector: 'TELECOM',
    marketCapINR: '₹10,25,000 Cr [Large Cap]',
    horizon: 'LONG_TERM',
    institutionalStrategy: {
      modelName: 'Oligopoly Free Cash Flow Machine & Industry ARPU Expansion',
      framework: 'Post-Tariff Hike FCF Inflection + Africa & Enterprise Cloud Scaling',
      thesis: 'Indian telecom has transitioned into an effective duopoly. Every ₹10 ARPU hike flows directly into EBITDA with minimal incremental capex now that national 5G rollout is 90% complete.',
      invalidationCondition: 'Aggressive price war initiated by competitors or severe regulatory spectrum penalty.'
    },
    tacticalLevels: {
      entryMin: 1745,
      entryMax: 1775,
      stopLoss: 1695,
      riskPct: -3.91,
      support1: 1730,
      support2: 1680,
      resistance1: 1840,
      resistance2: 1920,
      target1: { price: 1880, upsidePct: 6.58, label: 'ARPU Metric Flow-Through' },
      target2: { price: 1990, upsidePct: 12.81, label: 'Enterprise & Cloud Rerating' },
      target3: { price: 2180, upsidePct: 23.58, label: 'FCF Yield Compression Target' },
      riskRewardRatio: '1:3.3 (T2)',
      confidenceScore: 93,
      institutionalRating: 'STRONG_CONVICTION_BUY'
    },
    volumeAnalysis: {
      avgVolume20D: '4.26M shares',
      deliveryPct: 68.2,
      deliveryAvg30D: 54.0,
      volumeSurge: '2.4x 20D SMA',
      blockDealsSummary: 'Singtel stakes rebalanced into long-term sovereign pension funds without price slippage',
      institutionalFootprint: 'High delivery percentage reflects long-only institutional holding'
    },
    companyAnalysis1Year: {
      revenueGrowthYoY: '+12.4% YoY (₹1,54,000 Cr)',
      patGrowthYoY: '+68.4% YoY (₹12,450 Cr)',
      ebitdaMargin: '52.6% (Industry Benchmark)',
      roce: '17.4%',
      roe: '18.2%',
      debtToEquity: '1.42 (Net debt rapidly shrinking by ₹24,000 Cr/yr)',
      fiiHoldingChange: '+2.8% to 26.4%',
      diiHoldingChange: '21.2%',
      promoterHolding: '51.4%',
      operationalHighlight: 'Blended ARPU expanded from ₹200 to ₹233; targeted to hit ₹280 by FY27.'
    },
    valuation: {
      trailingPE: 61.2,
      median5YPE: 48.0,
      priceToBook: 9.8,
      evToEbitda: 15.2
    }
  },
  {
    id: 'stock-hdfc',
    ticker: 'HDFCBANK',
    symbol: 'HDFCBANK.NS',
    name: 'HDFC Bank Ltd',
    sector: 'BANKING_FINANCE',
    marketCapINR: '₹10,95,000 Cr [Mega Cap]',
    horizon: 'LONG_TERM',
    institutionalStrategy: {
      modelName: 'Historic Mean Reversion & Loan-to-Deposit (LDR) Normalization',
      framework: 'Post-Merger Synergy Harvest + MSCI Weight Increase Catalyst',
      thesis: 'Trading near 10-year valuation trough on Price-to-Book while maintaining best-in-class GNPA below 1.25%. Gradual reduction in LDR back toward 85% unlocks profitable loan growth without NIM compression.',
      invalidationCondition: 'GNPA rising above 2.0% or persistent NIM decline below 3.2% for 2 consecutive quarters.'
    },
    tacticalLevels: {
      entryMin: 712,
      entryMax: 722,
      stopLoss: 688,
      riskPct: -4.11,
      support1: 705,
      support2: 682,
      resistance1: 755,
      resistance2: 790,
      target1: { price: 768, upsidePct: 7.04, label: 'LDR Milestone Target' },
      target2: { price: 820, upsidePct: 14.28, label: 'FII Weight Inflow Target' },
      target3: { price: 910, upsidePct: 26.83, label: 'Full Historical P/B Normalization' },
      riskRewardRatio: '1:3.5 (T2)',
      confidenceScore: 91,
      institutionalRating: 'STRONG_CONVICTION_BUY'
    },
    volumeAnalysis: {
      avgVolume20D: '25.3M shares',
      deliveryPct: 71.4,
      deliveryAvg30D: 62.0,
      volumeSurge: '2.2x 20D SMA',
      blockDealsSummary: 'MSCI passive weight-adjustment inflows absorbed cleanly',
      institutionalFootprint: 'Top holding across nearly all Indian domestic equity funds'
    },
    companyAnalysis1Year: {
      revenueGrowthYoY: '+28.2% YoY (Net Interest Income ₹1,12,000 Cr)',
      patGrowthYoY: '+33.4% YoY (₹64,060 Cr post merger)',
      ebitdaMargin: 'N/A (Net Interest Margin: 3.65%)',
      roce: 'N/A',
      roe: '16.8%',
      debtToEquity: 'N/A (Capital Adequacy Ratio: 19.8% - Substantial buffer)',
      fiiHoldingChange: '+3.1% to 54.8%',
      diiHoldingChange: '30.4%',
      promoterHolding: '0.00% (Widely held institutional stock)',
      operationalHighlight: 'CASA deposits stabilized at 38.5%; branch network surpassed 8,800 offices nationwide.'
    },
    valuation: {
      trailingPE: 18.6,
      median5YPE: 23.8,
      priceToBook: 2.52,
      evToEbitda: 13.9
    }
  },
  {
    id: 'stock-icici',
    ticker: 'ICICIBANK',
    symbol: 'ICICIBANK.NS',
    name: 'ICICI Bank Ltd',
    sector: 'BANKING_FINANCE',
    marketCapINR: '₹9,35,000 Cr [Mega Cap]',
    horizon: 'BOTH',
    institutionalStrategy: {
      modelName: 'Compound Industry-Leading ROA/ROE & Digital Underwriting Moat',
      framework: 'Consistent 15-18% Loan Growth with Sub-40% Cost-to-Income',
      thesis: 'Gold-standard corporate & retail banking execution in India. Delivering 2.36% ROA and 18.8% ROE consistently with provision coverage ratio exceeding 80%, providing unmatched risk-adjusted earnings compounding.',
      invalidationCondition: 'Slippages in unsecured retail book exceeding 3.5% or ROA dropping below 1.8%.'
    },
    tacticalLevels: {
      entryMin: 1315,
      entryMax: 1335,
      stopLoss: 1275,
      riskPct: -4.14,
      support1: 1305,
      support2: 1260,
      resistance1: 1385,
      resistance2: 1440,
      target1: { price: 1410, upsidePct: 6.09, label: 'Swing Resistance Test' },
      target2: { price: 1480, upsidePct: 11.36, label: 'FY26 Forward ROE Accretion' },
      target3: { price: 1600, upsidePct: 20.39, label: 'P/B Expansion Target' },
      riskRewardRatio: '1:3.0 (T2)',
      confidenceScore: 94,
      institutionalRating: 'STRONG_CONVICTION_BUY'
    },
    volumeAnalysis: {
      avgVolume20D: '9.0M shares',
      deliveryPct: 64.8,
      deliveryAvg30D: 58.0,
      volumeSurge: '1.8x 20D SMA',
      blockDealsSummary: 'FII overweight stance verified in monthly mutual fund factsheets',
      institutionalFootprint: 'Zero retail panic selling; absorbed by SIP institutional inflows'
    },
    companyAnalysis1Year: {
      revenueGrowthYoY: '+17.4% YoY (NII ₹74,300 Cr)',
      patGrowthYoY: '+24.2% YoY (₹44,250 Cr)',
      ebitdaMargin: 'N/A (NIM: 4.40%)',
      roce: 'N/A',
      roe: '18.8%',
      debtToEquity: 'N/A (CAR: 16.8%)',
      fiiHoldingChange: '+1.8% to 45.2%',
      diiHoldingChange: '34.8%',
      promoterHolding: '0.00%',
      operationalHighlight: 'Digital iMobile Pay platform driving 86% of retail loans digitally with minimal branch friction.'
    },
    valuation: {
      trailingPE: 18.9,
      median5YPE: 21.5,
      priceToBook: 3.24,
      evToEbitda: 14.2
    }
  },
  {
    id: 'stock-sbin',
    ticker: 'SBIN',
    symbol: 'SBIN.NS',
    name: 'State Bank of India',
    sector: 'BANKING_FINANCE',
    marketCapINR: '₹8,65,000 Cr [Mega Cap]',
    horizon: 'BOTH',
    institutionalStrategy: {
      modelName: 'Sovereign Banking Titan & Clean Credit Cycle ROE Re-rating',
      framework: 'Sub-2.2% Net NPA + Massive Corporate Capex Underwriting Monopoly',
      thesis: 'Largest financial conglomerate in India with 24% credit market share. Record low credit costs and sustained >17% ROE have permanently rerated the public sector balance sheet.',
      invalidationCondition: 'Gross NPA rising above 3.5% or treasury losses from yield curve steepening.'
    },
    tacticalLevels: {
      entryMin: 955,
      entryMax: 975,
      stopLoss: 928,
      riskPct: -4.13,
      support1: 948,
      support2: 915,
      resistance1: 1020,
      resistance2: 1080,
      target1: { price: 1035, upsidePct: 6.87, label: 'Four-Digit Psychological Pivot' },
      target2: { price: 1120, upsidePct: 15.65, label: 'Corporate Credit Growth Surge' },
      target3: { price: 1240, upsidePct: 28.04, label: '1.2x P/BV Multiple Re-rating' },
      riskRewardRatio: '1:3.8 (T2)',
      confidenceScore: 92,
      institutionalRating: 'STRONG_CONVICTION_BUY'
    },
    volumeAnalysis: {
      avgVolume20D: '5.29M shares',
      deliveryPct: 51.4,
      deliveryAvg30D: 42.0,
      volumeSurge: '2.1x 20D SMA',
      blockDealsSummary: 'Heavy institutional buying at ₹950-₹965 base support zone',
      institutionalFootprint: 'Core portfolio pillar for all Indian public financial mandates'
    },
    companyAnalysis1Year: {
      revenueGrowthYoY: '+21.2% YoY (NII ₹1,59,000 Cr)',
      patGrowthYoY: '+20.5% YoY (₹61,077 Cr)',
      ebitdaMargin: 'N/A (NIM: 3.32%)',
      roce: 'N/A',
      roe: '18.4%',
      debtToEquity: 'N/A (CAR: 14.3%)',
      fiiHoldingChange: '+1.9% to 11.8%',
      diiHoldingChange: '24.2%',
      promoterHolding: '57.5% (Government of India)',
      operationalHighlight: 'YONO digital platform registered over 75M users with zero credit impairment.'
    },
    valuation: {
      trailingPE: 11.2,
      median5YPE: 10.4,
      priceToBook: 1.48,
      evToEbitda: 8.9
    }
  },
  {
    id: 'stock-polycab',
    ticker: 'POLYCAB',
    symbol: 'POLYCAB.NS',
    name: 'Polycab India Ltd',
    sector: 'CAPITAL_GOODS',
    marketCapINR: '₹1,21,000 Cr [Large Cap]',
    horizon: 'BOTH',
    institutionalStrategy: {
      modelName: 'Power Grid Transmission Capex & Real Estate Cabling Supercycle',
      framework: 'CANSLIM Earnings Surprises + Institutional Distribution Network Moat',
      thesis: 'Dominant 26% organized market share in domestic cables and wires. Direct beneficiary of data center construction, renewable power evacuation, and residential infrastructure expansion.',
      invalidationCondition: 'Copper price volatility triggering unhedged gross margin compression below 22%.'
    },
    tacticalLevels: {
      entryMin: 8020,
      entryMax: 8140,
      stopLoss: 7780,
      riskPct: -3.83,
      support1: 7950,
      support2: 7720,
      resistance1: 8450,
      resistance2: 8800,
      target1: { price: 8650, upsidePct: 6.93, label: 'Swing High Breakout' },
      target2: { price: 9200, upsidePct: 13.73, label: 'Transmission Order Flow Surge' },
      target3: { price: 10100, upsidePct: 24.86, label: 'Export 52W High Re-test' },
      riskRewardRatio: '1:3.6 (T2)',
      confidenceScore: 92,
      institutionalRating: 'STRONG_CONVICTION_BUY'
    },
    volumeAnalysis: {
      avgVolume20D: '364K shares',
      deliveryPct: 56.2,
      deliveryAvg30D: 41.0,
      volumeSurge: '3.1x 20D SMA',
      blockDealsSummary: 'Promoter IT tax inquiry fully resolved; FIIs reinstituted heavy buying above ₹7,800',
      institutionalFootprint: 'High mutual fund sponsorship across consumption & capital goods'
    },
    companyAnalysis1Year: {
      revenueGrowthYoY: '+27.8% YoY (₹18,040 Cr)',
      patGrowthYoY: '+34.2% YoY (₹1,780 Cr)',
      ebitdaMargin: '13.8%',
      roce: '30.4%',
      roe: '24.8%',
      debtToEquity: '0.04 (Net Cash Position ₹1,800 Cr)',
      fiiHoldingChange: '+3.8% over past 2Q to 14.2%',
      diiHoldingChange: '16.4%',
      promoterHolding: '65.2%',
      operationalHighlight: 'International business grew +64% YoY contributing 9.2% of total revenue.'
    },
    valuation: {
      trailingPE: 62.4,
      median5YPE: 42.0,
      priceToBook: 14.8,
      evToEbitda: 41.2
    }
  },
  {
    id: 'stock-solarinds',
    ticker: 'SOLARINDS',
    symbol: 'SOLARINDS.NS',
    name: 'Solar Industries India Ltd',
    sector: 'DEFENSE',
    marketCapINR: '₹1,77,000 Cr [Large Cap]',
    horizon: 'LONG_TERM',
    institutionalStrategy: {
      modelName: 'Defense Ordnance Exclusivity & Warhead Propellant Exports',
      framework: 'Pinaka Rocket Propellant Moat + Drone Munition Integration',
      thesis: 'Only private sector manufacturer in India capable of industrial-scale high-energy warheads and rocket motors for Pinaka, BrahMos, and Akash missile systems, with export orders expanding 4x.',
      invalidationCondition: 'Raw material ammonium nitrate supply disruption or defense test trial failures.'
    },
    tacticalLevels: {
      entryMin: 19400,
      entryMax: 19700,
      stopLoss: 18750,
      riskPct: -4.14,
      support1: 19200,
      support2: 18500,
      resistance1: 20500,
      resistance2: 21800,
      target1: { price: 21000, upsidePct: 7.36, label: 'Export Contract Milestone' },
      target2: { price: 22800, upsidePct: 16.56, label: 'Pinaka Multi-Year Supply Accretion' },
      target3: { price: 25000, upsidePct: 27.81, label: 'Global Defense Ordnance Valuation' },
      riskRewardRatio: '1:4.0 (T2)',
      confidenceScore: 93,
      institutionalRating: 'STRONG_CONVICTION_BUY'
    },
    volumeAnalysis: {
      avgVolume20D: '240K shares',
      deliveryPct: 62.4,
      deliveryAvg30D: 48.0,
      volumeSurge: '2.8x 20D SMA',
      blockDealsSummary: 'Low liquidity, high float lock-in by institutional long-term funds',
      institutionalFootprint: 'Zero secondary market dumping; buy-and-hold accumulation'
    },
    companyAnalysis1Year: {
      revenueGrowthYoY: '+24.2% YoY (₹6,140 Cr)',
      patGrowthYoY: '+42.8% YoY (₹890 Cr)',
      ebitdaMargin: '22.4%',
      roce: '28.9%',
      roe: '25.6%',
      debtToEquity: '0.28 (Prudent leverage for capex)',
      fiiHoldingChange: '+2.1% to 8.8%',
      diiHoldingChange: '14.2%',
      promoterHolding: '73.2%',
      operationalHighlight: 'Defense order book surpassed ₹3,800 Cr; secured ₹880 Cr export order from friendly foreign nation.'
    },
    valuation: {
      trailingPE: 94.0,
      median5YPE: 58.0,
      priceToBook: 24.2,
      evToEbitda: 46.5
    }
  },
  {
    id: 'stock-cochin',
    ticker: 'COCHINSHIP',
    symbol: 'COCHINSHIP.NS',
    name: 'Cochin Shipyard Ltd',
    sector: 'DEFENSE',
    marketCapINR: '₹35,000 Cr [Mid Cap]',
    horizon: 'BOTH',
    institutionalStrategy: {
      modelName: 'Naval Modernization Order Execution & Commercial Green Vessels',
      framework: 'Indigenous Aircraft Carrier (IAC-2) + European Hybrid Ferry Backlog',
      thesis: 'Operating new ₹2,800 Cr international ship-repair and drydock facility in Kochi, capable of docking largest vessels in Indian Ocean. Order book of ₹22,000 Cr guarantees 5.5x revenue coverage.',
      invalidationCondition: 'Ship delivery milestone slippage leading to liquidated damages penalties.'
    },
    tacticalLevels: {
      entryMin: 1310,
      entryMax: 1345,
      stopLoss: 1260,
      riskPct: -5.26,
      support1: 1290,
      support2: 1220,
      resistance1: 1440,
      resistance2: 1580,
      target1: { price: 1480, upsidePct: 11.28, label: 'Drydock Commissioning Pivot' },
      target2: { price: 1650, upsidePct: 24.06, label: 'Next-Gen Corvette Contract Finalization' },
      target3: { price: 1920, upsidePct: 44.36, label: 'IAC-2 Sovereign Construction Cycle' },
      riskRewardRatio: '1:4.6 (T2)',
      confidenceScore: 89,
      institutionalRating: 'STRONG_CONVICTION_BUY'
    },
    volumeAnalysis: {
      avgVolume20D: '670K shares',
      deliveryPct: 44.8,
      deliveryAvg30D: 34.0,
      volumeSurge: '3.2x 20D SMA',
      blockDealsSummary: 'High beta defense momentum stock with strong institutional floor',
      institutionalFootprint: 'DIIs increased allocation during 2026 defense sector consolidations'
    },
    companyAnalysis1Year: {
      revenueGrowthYoY: '+62.4% YoY (₹3,830 Cr)',
      patGrowthYoY: '+156.0% YoY (₹783 Cr)',
      ebitdaMargin: '26.8% (Up +620 bps on high-margin ship repair)',
      roce: '24.2%',
      roe: '18.6%',
      debtToEquity: '0.00 (Zero Debt, ₹4,800 Cr cash balances)',
      fiiHoldingChange: '+3.2% to 7.4%',
      diiHoldingChange: '5.8%',
      promoterHolding: '72.9% (Government of India)',
      operationalHighlight: 'Delivered first European zero-emission electric container feeder vessel.'
    },
    valuation: {
      trailingPE: 42.0,
      median5YPE: 28.0,
      priceToBook: 7.8,
      evToEbitda: 25.4
    }
  },
  {
    id: 'stock-reliance',
    ticker: 'RELIANCE',
    symbol: 'RELIANCE.NS',
    name: 'Reliance Industries Ltd',
    sector: 'CONSUMER',
    marketCapINR: '₹16,10,000 Cr [Mega Cap]',
    horizon: 'LONG_TERM',
    institutionalStrategy: {
      modelName: 'Deep Value Sum-Of-The-Parts (SOTP) & New Energy Giga-Complex',
      framework: 'Jio 5G Monetization + Retail IPO Optionality + Jamnagar Solar-H2 Hub',
      thesis: 'Trading below historical EV/EBITDA median for consumer business. Massive ₹75,000 Cr New Energy capex near completion with solar PV cell and electrolyzer manufacturing commissioning in Gujarat.',
      invalidationCondition: 'Gross refining margins dropping below $4/bbl alongside retail same-store-sales contraction.'
    },
    tacticalLevels: {
      entryMin: 1180,
      entryMax: 1200,
      stopLoss: 1148,
      riskPct: -3.53,
      support1: 1175,
      support2: 1140,
      resistance1: 1245,
      resistance2: 1310,
      target1: { price: 1265, upsidePct: 6.30, label: 'Jio Tariff Flow-Through' },
      target2: { price: 1340, upsidePct: 12.60, label: 'Retail Demerger Unlocking' },
      target3: { price: 1480, upsidePct: 24.37, label: 'New Energy Gigafactory Re-rating' },
      riskRewardRatio: '1:3.6 (T2)',
      confidenceScore: 93,
      institutionalRating: 'STRONG_CONVICTION_BUY'
    },
    volumeAnalysis: {
      avgVolume20D: '9.19M shares',
      deliveryPct: 64.0,
      deliveryAvg30D: 58.2,
      volumeSurge: '1.9x 20D SMA',
      blockDealsSummary: 'FIIs absorbed strategic treasury shares with zero market disruption',
      institutionalFootprint: 'Anchor weight in all benchmark Nifty and BSE Sensex indices'
    },
    companyAnalysis1Year: {
      revenueGrowthYoY: '+8.4% YoY (₹10,00,122 Cr)',
      patGrowthYoY: '+9.2% YoY (₹79,020 Cr)',
      ebitdaMargin: '17.8% (Consolidated EBITDA ₹1,78,000 Cr)',
      roce: '10.2%',
      roe: '9.8%',
      debtToEquity: '0.42 (Net debt well contained against massive operating cash flow)',
      fiiHoldingChange: '+1.1% to 22.4%',
      diiHoldingChange: '17.8%',
      promoterHolding: '50.3%',
      operationalHighlight: 'Retail footprint crossed 18,800 physical stores; Jio 5G subscriber count surpassed 130M.'
    },
    valuation: {
      trailingPE: 22.8,
      median5YPE: 28.4,
      priceToBook: 2.15,
      evToEbitda: 11.2
    }
  },
  {
    id: 'stock-ntpc',
    ticker: 'NTPC',
    symbol: 'NTPC.NS',
    name: 'NTPC Limited',
    sector: 'POWER_ENERGY',
    marketCapINR: '₹3,12,000 Cr [Large Cap]',
    horizon: 'LONG_TERM',
    institutionalStrategy: {
      modelName: 'Thermal Baseload Anchor & 60 GW Renewable Spin-off Value Unlock',
      framework: 'Regulated Equity Compounding (15.5% Guaranteed RoE) + Green Energy IPO',
      thesis: 'Unmatched competitive advantage with power purchase agreements (PPAs) locking 15.5% regulated return on equity. NTPC Green Energy subsidiary provides explosive ESG value unlocking.',
      invalidationCondition: 'Coal linkage disruptions resulting in plant load factor dropping below 65%.'
    },
    tacticalLevels: {
      entryMin: 318,
      entryMax: 325,
      stopLoss: 308,
      riskPct: -4.19,
      support1: 315,
      support2: 302,
      resistance1: 342,
      resistance2: 365,
      target1: { price: 350, upsidePct: 8.76, label: 'Regulated Equity Expansion Target' },
      target2: { price: 385, upsidePct: 19.64, label: 'Green Energy Subsidiary Re-rating' },
      target3: { price: 425, upsidePct: 32.07, label: 'Thermal-Renewable Hybrid Sovereign Target' },
      riskRewardRatio: '1:4.7 (T2)',
      confidenceScore: 94,
      institutionalRating: 'STRONG_CONVICTION_BUY'
    },
    volumeAnalysis: {
      avgVolume20D: '4.01M shares',
      deliveryPct: 59.8,
      deliveryAvg30D: 48.5,
      volumeSurge: '2.5x 20D SMA',
      blockDealsSummary: 'Massive foreign utility & ESG funds building long stakes ahead of green IPO',
      institutionalFootprint: 'High dividend payout (~3.4% yield) with sovereign backing'
    },
    companyAnalysis1Year: {
      revenueGrowthYoY: '+7.4% YoY (₹1,76,200 Cr)',
      patGrowthYoY: '+21.4% YoY (₹21,300 Cr)',
      ebitdaMargin: '28.4%',
      roce: '11.8%',
      roe: '14.2%',
      debtToEquity: '1.45 (Standard utility debt funded by guaranteed regulated tariff)',
      fiiHoldingChange: '+3.4% to 18.2%',
      diiHoldingChange: '27.4%',
      promoterHolding: '51.1% (Government of India)',
      operationalHighlight: 'Commercial capacity reached 76 GW; 20 GW renewable projects currently under construction.'
    },
    valuation: {
      trailingPE: 16.4,
      median5YPE: 11.4,
      priceToBook: 1.85,
      evToEbitda: 9.8
    }
  },
  {
    id: 'stock-infy',
    ticker: 'INFY',
    symbol: 'INFY.NS',
    name: 'Infosys Limited',
    sector: 'IT_TECH',
    marketCapINR: '₹4,15,000 Cr [Mega Cap]',
    horizon: 'BOTH',
    institutionalStrategy: {
      modelName: 'Enterprise Generative AI Transformation & Large Deal Momentum',
      framework: 'Mean Reversion to 5-Year Historical Multiple + US Tech Capex Recovery',
      thesis: 'Record large deal total contract value (TCV) of $14.2B with free cash flow conversion at 102% of net profit. Topaz and Cobalt AI enterprise suites positioning firm as prime beneficiary of enterprise GenAI deployments.',
      invalidationCondition: 'BFSI tech spending freeze in US/Europe or large deal cancellations.'
    },
    tacticalLevels: {
      entryMin: 988,
      entryMax: 1008,
      stopLoss: 955,
      riskPct: -4.31,
      support1: 978,
      support2: 940,
      resistance1: 1050,
      resistance2: 1120,
      target1: { price: 1070, upsidePct: 7.13, label: 'BFSI Discretionary Recovery' },
      target2: { price: 1160, upsidePct: 16.14, label: 'GenAI Topaz Contract Accretion' },
      target3: { price: 1280, upsidePct: 28.15, label: 'Historical Valuation Peak Retest' },
      riskRewardRatio: '1:3.7 (T2)',
      confidenceScore: 90,
      institutionalRating: 'STRONG_CONVICTION_BUY'
    },
    volumeAnalysis: {
      avgVolume20D: '7.73M shares',
      deliveryPct: 66.4,
      deliveryAvg30D: 58.0,
      volumeSurge: '2.1x 20D SMA',
      blockDealsSummary: 'FIIs shifted from net sellers to aggressive buyers (+₹4,200 Cr over trailing month)',
      institutionalFootprint: 'High dividend payout (85% of FCF returned to shareholders)'
    },
    companyAnalysis1Year: {
      revenueGrowthYoY: '+6.8% YoY ($18.5B USD)',
      patGrowthYoY: '+8.9% YoY (₹26,233 Cr)',
      ebitdaMargin: '24.1% (Operating Margin: 21.2%)',
      roce: '38.2%',
      roe: '31.8%',
      debtToEquity: '0.00 (Zero Debt, ₹28,000 Cr Cash & Liquid Investments)',
      fiiHoldingChange: '+1.4% to 32.8%',
      diiHoldingChange: '36.4%',
      promoterHolding: '14.8%',
      operationalHighlight: 'Signed 3 mega-deals each valued over $1.5B in telecom, retail, and manufacturing sectors.'
    },
    valuation: {
      trailingPE: 24.2,
      median5YPE: 27.2,
      priceToBook: 7.2,
      evToEbitda: 16.8
    }
  }
];

export const INSTITUTIONAL_STOCK_PICKS: InstitutionalStockPick[] = RAW_INSTITUTIONAL_STOCK_PICKS.map(stock => ({
  ...stock,
  strategyQuantification: getStrategyQuantification(stock.ticker),
}));
