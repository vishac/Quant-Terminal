export interface StrategyFactorScore {
  id: 'ORDER_FLOW' | 'MOMENTUM_CANSLIM' | 'FUNDAMENTAL_QARP' | 'RISK_REWARD' | 'MACRO_MOAT';
  name: string;
  weight: number; // e.g. 0.20
  weightLabel: string; // e.g. "20%"
  score: number; // 0-100
  metricLabel: string;
  verdict: 'EXEMPLARY' | 'STRONG' | 'OPTIMAL' | 'ACCEPTABLE';
  rationale: string;
}

export interface QualificationRule {
  rule: string;
  category: string;
  passed: boolean;
  actualMetric: string;
}

export interface StrategyQuantification {
  compositeScore: number;
  convictionTier: 'VERY_HIGH_CONVICTION' | 'HIGH_CONVICTION' | 'MODERATE_CONVICTION';
  tierLabel: string;
  primaryDriver: string;
  coreRationale: string;
  factorBreakdown: StrategyFactorScore[];
  qualificationChecklist: QualificationRule[];
}

export interface StrategyWeightInfo {
  id: string;
  name: string;
  shortName: string;
  weight: number;
  weightLabel: string;
  color: string;
  description: string;
  keySignals: string[];
}

export const QUANTITATIVE_STRATEGY_FRAMEWORK_WEIGHTS: StrategyWeightInfo[] = [
  {
    id: 'ORDER_FLOW',
    name: 'Institutional Order Flow & Wyckoff Accumulation',
    shortName: 'Order Flow',
    weight: 0.20,
    weightLabel: '20%',
    color: '#00f0ff',
    description: 'Tracks delivery volume percentages, volume surge relative to 20-day moving average, sovereign FPI/DII block deal footprints, and absorption at VWAP support bands.',
    keySignals: ['Delivery Vol > 50%', 'Volume Surge > 2.0x 20D SMA', 'Block Deal Absorption', 'Low Retail Float'],
  },
  {
    id: 'MOMENTUM_CANSLIM',
    name: 'Price Momentum & Relative Strength (RS / CANSLIM)',
    shortName: 'Momentum / RS',
    weight: 0.25,
    weightLabel: '25%',
    color: '#10b981',
    description: 'Measures relative strength percentile versus the NIFTY 50 benchmark, Wyckoff Phase D markup progression, multi-week consolidation base breakouts, and alignment above 20, 50, and 200 EMAs.',
    keySignals: ['RS Percentile > 85', 'Wyckoff Phase D Markup', 'Above 50 & 200 EMA', 'Base Volatility Contraction'],
  },
  {
    id: 'FUNDAMENTAL_QARP',
    name: 'Fundamental Quality & Capital Allocation (QARP)',
    shortName: 'Quality / QARP',
    weight: 0.25,
    weightLabel: '25%',
    color: '#3b82f6',
    description: 'Enforces strict audited return on capital employed (ROCE > 20%), return on equity (ROE > 18%), 1-year trailing revenue & PAT growth acceleration, EBITDA margin expansion, and low or net-cash debt structure.',
    keySignals: ['ROCE > 20%', 'PAT Growth YoY > 20%', 'Net Cash or D/E < 0.3', 'EBITDA Margin Expansion'],
  },
  {
    id: 'RISK_REWARD',
    name: 'Risk-Reward Geometry & Tactical Asymmetry',
    shortName: 'Risk / Reward',
    weight: 0.15,
    weightLabel: '15%',
    color: '#f59e0b',
    description: 'Quantifies asymmetric trade payoff with minimum 1:3.0 Risk-to-Reward ratio to Target 2, hard-coded stop loss strictly capped between -3.0% and -4.5%, and verified multi-tier structural Fibonacci extensions.',
    keySignals: ['R:R Ratio >= 1:3.0', 'Stop Loss Capped at -4.5%', 'Multi-Tier Target Geometry', 'Defined Invalidation Level'],
  },
  {
    id: 'MACRO_MOAT',
    name: 'Sovereign Moat & Macro Policy Catalysts',
    shortName: 'Macro Moat',
    weight: 0.15,
    weightLabel: '15%',
    color: '#ec4899',
    description: 'Evaluates statutory policy tailwinds, central government capex allocation, Production-Linked Incentive (PLI) subsidies, defense indigenization mandates (PIL-5), or oligopolistic industry pricing power.',
    keySignals: ['Statutory Moat / Monopoly', 'PLI Scheme Beneficiary', 'Multi-Year Order Backlog', 'Pricing Power & Market Share'],
  },
];

export const STOCK_STRATEGY_QUANTIFICATION_MAP: Record<string, StrategyQuantification> = {
  TRENT: {
    compositeScore: 94,
    convictionTier: 'VERY_HIGH_CONVICTION',
    tierLabel: 'Very High Conviction (Tier 1 Alpha)',
    primaryDriver: 'Hyper-scaling value fashion unit economics (Zudio) & 124% PAT growth',
    coreRationale: 'Exceptional earnings compounding driven by rapid domestic retail market share acquisition (Zudio/Westside) with zero store-level leverage, compounded same-store-sales growth exceeding 24%, and high delivery volume absorption by domestic institutional funds.',
    factorBreakdown: [
      {
        id: 'ORDER_FLOW',
        name: 'Institutional Order Flow & Wyckoff Accumulation',
        weight: 0.20,
        weightLabel: '20%',
        score: 96,
        metricLabel: '58.4% Delivery Vol · 4.2x 20D SMA Surge',
        verdict: 'EXEMPLARY',
        rationale: 'Substantial delivery accumulation across 3 sovereign/DII block deal clusters in the ₹2,600-₹2,650 band.'
      },
      {
        id: 'MOMENTUM_CANSLIM',
        name: 'Price Momentum & Relative Strength (RS / CANSLIM)',
        weight: 0.25,
        weightLabel: '25%',
        score: 95,
        metricLabel: 'Wyckoff Phase D Markup · RS Rank 96',
        verdict: 'EXEMPLARY',
        rationale: 'Consistently leading the consumer discretionary sector with persistent relative strength and tight consolidation above 20 EMA.'
      },
      {
        id: 'FUNDAMENTAL_QARP',
        name: 'Fundamental Quality & Capital Allocation (QARP)',
        weight: 0.25,
        weightLabel: '25%',
        score: 96,
        metricLabel: 'ROCE 31.2% · PAT YoY +124.0% · Net Cash',
        verdict: 'EXEMPLARY',
        rationale: 'Pristine Tata governance, 31.2% ROCE, and debt-free balance sheet enabling aggressive self-funded store additions.'
      },
      {
        id: 'RISK_REWARD',
        name: 'Risk-Reward Geometry & Tactical Asymmetry',
        weight: 0.15,
        weightLabel: '15%',
        score: 90,
        metricLabel: '1:3.2 (T1) / 1:5.9 (T3) · SL: -3.60%',
        verdict: 'STRONG',
        rationale: 'Downside strictly capped at ₹2,545 stop loss against tactical targets stretching from ₹2,780 to ₹3,200.'
      },
      {
        id: 'MACRO_MOAT',
        name: 'Sovereign Moat & Macro Policy Catalysts',
        weight: 0.15,
        weightLabel: '15%',
        score: 92,
        metricLabel: 'Organized Retail Formalization Moat',
        verdict: 'EXEMPLARY',
        rationale: 'Accelerating shift from unorganized apparel to organized value fashion across Tier 2 and Tier 3 Indian municipalities.'
      }
    ],
    qualificationChecklist: [
      { rule: 'Delivery Volume Absorption > 50%', category: 'Order Flow', passed: true, actualMetric: '58.4% Delivery (vs 38.2% 30D avg)' },
      { rule: 'Volume Surge > 2.5x 20D SMA', category: 'Order Flow', passed: true, actualMetric: '4.2x 20D SMA Surge' },
      { rule: 'Capital Efficiency: ROCE > 20% & ROE > 18%', category: 'Quality', passed: true, actualMetric: 'ROCE: 31.2% | ROE: 28.6%' },
      { rule: 'Balance Sheet Health: Debt/Equity < 0.2', category: 'Quality', passed: true, actualMetric: '0.00 (Net Cash Balance Sheet)' },
      { rule: 'Asymmetric Payoff: Risk-Reward >= 1:3.0', category: 'Risk/Reward', passed: true, actualMetric: '1:3.2 to T1 / 1:5.9 to T3' },
      { rule: 'Earnings Growth: 1Y PAT YoY > 25%', category: 'Quality', passed: true, actualMetric: '+124.0% YoY (₹1,477 Cr)' }
    ]
  },

  BEL: {
    compositeScore: 96,
    convictionTier: 'VERY_HIGH_CONVICTION',
    tierLabel: 'Very High Conviction (Tier 1 Alpha)',
    primaryDriver: 'Monopolistic defense electronics indigenization & ₹76,200 Cr order backlog',
    coreRationale: 'Monopolistic domestic supplier of military radars, naval sonars, and electronic warfare suites protected by sovereign Positive Indigenisation Lists (PIL-5). Backed by ₹76,200 Cr order backlog, zero debt, record-high FII accumulation, and 34.8% ROCE.',
    factorBreakdown: [
      {
        id: 'ORDER_FLOW',
        name: 'Institutional Order Flow & Wyckoff Accumulation',
        weight: 0.20,
        weightLabel: '20%',
        score: 97,
        metricLabel: '64.2% Delivery Vol · FPI Block Deals',
        verdict: 'EXEMPLARY',
        rationale: 'Heavy institutional absorption at ₹380-₹390 VWAP anchor with rising institutional ownership reaching 40.6%.'
      },
      {
        id: 'MOMENTUM_CANSLIM',
        name: 'Price Momentum & Relative Strength (RS / CANSLIM)',
        weight: 0.25,
        weightLabel: '25%',
        score: 95,
        metricLabel: 'Stage 2 Institutional Base Breakout',
        verdict: 'EXEMPLARY',
        rationale: 'Consistent relative strength persistence outperforming the NIFTY PSE index with expanding trading ranges.'
      },
      {
        id: 'FUNDAMENTAL_QARP',
        name: 'Fundamental Quality & Capital Allocation (QARP)',
        weight: 0.25,
        weightLabel: '25%',
        score: 98,
        metricLabel: 'ROCE 34.8% · ROE 27.4% · ₹8,400 Cr Net Cash',
        verdict: 'EXEMPLARY',
        rationale: 'Zero debt, ₹8,400 Cr in cash & equivalents, EBITDA margins expanded to 25.8% on higher-margin domestic subsystems.'
      },
      {
        id: 'RISK_REWARD',
        name: 'Risk-Reward Geometry & Tactical Asymmetry',
        weight: 0.15,
        weightLabel: '15%',
        score: 91,
        metricLabel: '1:3.3 (T2) / 1:5.0 (T3) · SL: -4.37%',
        verdict: 'STRONG',
        rationale: 'Tight downside protection at ₹372 stop loss against multi-tier targets reaching ₹420 (T1), ₹445 (T2), and ₹475 (T3).'
      },
      {
        id: 'MACRO_MOAT',
        name: 'Sovereign Moat & Macro Policy Catalysts',
        weight: 0.15,
        weightLabel: '15%',
        score: 99,
        metricLabel: '100% Domestic Procurement Exclusivity',
        verdict: 'EXEMPLARY',
        rationale: 'Statutory indigenization mandates guarantee that domestic armed forces procure strategic electronics exclusively from BEL.'
      }
    ],
    qualificationChecklist: [
      { rule: 'Delivery Volume Absorption > 50%', category: 'Order Flow', passed: true, actualMetric: '64.2% Delivery (vs 44.0% 30D avg)' },
      { rule: 'Volume Surge > 2.5x 20D SMA', category: 'Order Flow', passed: true, actualMetric: '3.4x 20D SMA Surge' },
      { rule: 'Capital Efficiency: ROCE > 20% & ROE > 18%', category: 'Quality', passed: true, actualMetric: 'ROCE: 34.8% | ROE: 27.4%' },
      { rule: 'Balance Sheet Health: Debt/Equity < 0.2', category: 'Quality', passed: true, actualMetric: '0.00 (₹8,400 Cr Cash Surplus)' },
      { rule: 'Asymmetric Payoff: Risk-Reward >= 1:3.0', category: 'Risk/Reward', passed: true, actualMetric: '1:3.3 to Target 2' },
      { rule: 'Earnings Growth: 1Y PAT YoY > 20%', category: 'Quality', passed: true, actualMetric: '+26.4% YoY (₹3,985 Cr)' }
    ]
  },

  HAL: {
    compositeScore: 95,
    convictionTier: 'VERY_HIGH_CONVICTION',
    tierLabel: 'Very High Conviction (Tier 1 Alpha)',
    primaryDriver: 'Sole fighter jet/helicopter manufacturer & ₹94,000 Cr order backlog',
    coreRationale: 'Sovereign aerospace monopoly with 10-year manufacturing backlog exceeding ₹94,000 Cr across Tejas Mk1A fighters and Prachand combat helicopters. Generates >35% of EBITDA from high-margin recurring maintenance/repair (MRO) with ₹26,000 Cr cash surplus.',
    factorBreakdown: [
      {
        id: 'ORDER_FLOW',
        name: 'Institutional Order Flow & Wyckoff Accumulation',
        weight: 0.20,
        weightLabel: '20%',
        score: 95,
        metricLabel: '61.8% Delivery Vol · 850K FII Deal Absorption',
        verdict: 'EXEMPLARY',
        rationale: 'FII long-only funds absorbed 850K shares during rebalancing; ultra-low retail float locked in sovereign custody.'
      },
      {
        id: 'MOMENTUM_CANSLIM',
        name: 'Price Momentum & Relative Strength (RS / CANSLIM)',
        weight: 0.25,
        weightLabel: '25%',
        score: 94,
        metricLabel: 'Multimonth Base Retest near Pivot',
        verdict: 'EXEMPLARY',
        rationale: 'Consolidation retest near multi-month pivot holding well above rising 50-day and 200-day exponential moving averages.'
      },
      {
        id: 'FUNDAMENTAL_QARP',
        name: 'Fundamental Quality & Capital Allocation (QARP)',
        weight: 0.25,
        weightLabel: '25%',
        score: 97,
        metricLabel: 'ROCE 36.1% · PAT YoY +31.2% · ₹26,000 Cr Surplus',
        verdict: 'EXEMPLARY',
        rationale: 'Extraordinary capital productivity with 36.1% ROCE and substantial treasury yields generated from advance defense payments.'
      },
      {
        id: 'RISK_REWARD',
        name: 'Risk-Reward Geometry & Tactical Asymmetry',
        weight: 0.15,
        weightLabel: '15%',
        score: 92,
        metricLabel: '1:3.9 (T2) / 1:7.2 (T3) · SL: -4.18%',
        verdict: 'STRONG',
        rationale: 'Entry band ₹4,640-₹4,700 with stop loss at ₹4,490; targets extend up to ₹6,100 on GE-F414 domestic co-production.'
      },
      {
        id: 'MACRO_MOAT',
        name: 'Sovereign Moat & Macro Policy Catalysts',
        weight: 0.15,
        weightLabel: '15%',
        score: 98,
        metricLabel: 'Uncontested Sovereign Aerospace Moat',
        verdict: 'EXEMPLARY',
        rationale: 'Sole Indian entity capable of designing, assembling, and certifying supersonic combat aircraft and combat rotorcraft.'
      }
    ],
    qualificationChecklist: [
      { rule: 'Delivery Volume Absorption > 50%', category: 'Order Flow', passed: true, actualMetric: '61.8% Delivery (vs 42.5% 30D avg)' },
      { rule: 'Volume Surge > 2.5x 20D SMA', category: 'Order Flow', passed: true, actualMetric: '2.9x 20D SMA Surge' },
      { rule: 'Capital Efficiency: ROCE > 20% & ROE > 18%', category: 'Quality', passed: true, actualMetric: 'ROCE: 36.1% | ROE: 29.4%' },
      { rule: 'Balance Sheet Health: Debt/Equity < 0.2', category: 'Quality', passed: true, actualMetric: '0.00 (₹26,000 Cr Cash Surplus)' },
      { rule: 'Asymmetric Payoff: Risk-Reward >= 1:3.0', category: 'Risk/Reward', passed: true, actualMetric: '1:3.9 to Target 2' },
      { rule: 'Earnings Growth: 1Y PAT YoY > 25%', category: 'Quality', passed: true, actualMetric: '+31.2% YoY (₹7,621 Cr)' }
    ]
  },

  LT: {
    compositeScore: 92,
    convictionTier: 'VERY_HIGH_CONVICTION',
    tierLabel: 'Very High Conviction (Tier 1 Alpha)',
    primaryDriver: 'Record ₹4.75 Lakh Cr order book & Middle East hydrocarbon capex cycle',
    coreRationale: 'Undisputed national capex bellwether capturing record domestic public infrastructure spending alongside high-margin Middle East energy and EPC mega-contracts, supported by 38.4% domestic mutual fund backing.',
    factorBreakdown: [
      {
        id: 'ORDER_FLOW',
        name: 'Institutional Order Flow & Wyckoff Accumulation',
        weight: 0.20,
        weightLabel: '20%',
        score: 91,
        metricLabel: '52.4% Delivery Vol · Institutional Accumulation',
        verdict: 'STRONG',
        rationale: 'Consistent mutual fund inflows absorbing options supply with highest institutional ownership in the Nifty index.'
      },
      {
        id: 'MOMENTUM_CANSLIM',
        name: 'Price Momentum & Relative Strength (RS / CANSLIM)',
        weight: 0.25,
        weightLabel: '25%',
        score: 90,
        metricLabel: 'Reclaiming 20-Day EMA on Heavy Volume',
        verdict: 'STRONG',
        rationale: 'Clean technical recovery off structural Fibonacci supports with ascending volume profile.'
      },
      {
        id: 'FUNDAMENTAL_QARP',
        name: 'Fundamental Quality & Capital Allocation (QARP)',
        weight: 0.25,
        weightLabel: '25%',
        score: 93,
        metricLabel: 'Rev YoY +20.6% · PAT YoY +24.7% (₹13,059 Cr)',
        verdict: 'STRONG',
        rationale: 'Consolidated revenue surpassed ₹2.21 Lakh Cr; divestment of non-core assets actively expanding return ratios.'
      },
      {
        id: 'RISK_REWARD',
        name: 'Risk-Reward Geometry & Tactical Asymmetry',
        weight: 0.15,
        weightLabel: '15%',
        score: 92,
        metricLabel: '1:3.3 (T2) / 1:5.7 (T3) · SL: -3.64%',
        verdict: 'STRONG',
        rationale: 'Accumulation band ₹3,740-₹3,780 with stop loss at ₹3,630; targets ₹3,980, ₹4,220, and ₹4,550.'
      },
      {
        id: 'MACRO_MOAT',
        name: 'Sovereign Moat & Macro Policy Catalysts',
        weight: 0.15,
        weightLabel: '15%',
        score: 96,
        metricLabel: 'National Infrastructure & Aramco LTA Moat',
        verdict: 'EXEMPLARY',
        rationale: 'Long-term agreement vendor for Aramco and sole contractor for bullet train / semiconductor cleanroom infrastructure in India.'
      }
    ],
    qualificationChecklist: [
      { rule: 'Delivery Volume Absorption > 50%', category: 'Order Flow', passed: true, actualMetric: '52.4% Delivery (vs 46.0% 30D avg)' },
      { rule: 'Volume Surge > 2.0x 20D SMA', category: 'Order Flow', passed: true, actualMetric: '2.1x 20D SMA Surge' },
      { rule: 'Capital Efficiency: ROCE > 15%', category: 'Quality', passed: true, actualMetric: 'ROCE: 16.8% | ROE: 15.4%' },
      { rule: 'Balance Sheet Health: Debt/Equity Deleveraging', category: 'Quality', passed: true, actualMetric: '0.58 (Core EPC Deleveraging)' },
      { rule: 'Asymmetric Payoff: Risk-Reward >= 1:3.0', category: 'Risk/Reward', passed: true, actualMetric: '1:3.3 to Target 2' },
      { rule: 'Earnings Growth: 1Y PAT YoY > 20%', category: 'Quality', passed: true, actualMetric: '+24.7% YoY (₹13,059 Cr)' }
    ]
  },

  DIXON: {
    compositeScore: 91,
    convictionTier: 'VERY_HIGH_CONVICTION',
    tierLabel: 'Very High Conviction (Tier 1 Alpha)',
    primaryDriver: 'Global electronics manufacturing relocation (PLI) & Google Pixel assembly',
    coreRationale: 'Undisputed domestic contract electronics manufacturer capturing >50% of outsourced smartphone assembly under central PLI incentives, delivering 108% profit growth and entering high-margin precision component fabrication.',
    factorBreakdown: [
      {
        id: 'ORDER_FLOW',
        name: 'Institutional Order Flow & Wyckoff Accumulation',
        weight: 0.20,
        weightLabel: '20%',
        score: 93,
        metricLabel: '54.6% Delivery Vol · 3.8x 20D SMA Surge',
        verdict: 'EXEMPLARY',
        rationale: 'Institutional block volume exceeding ₹480 Cr on breakout above ₹13,000 with institutional float rising.'
      },
      {
        id: 'MOMENTUM_CANSLIM',
        name: 'Price Momentum & Relative Strength (RS / CANSLIM)',
        weight: 0.25,
        weightLabel: '25%',
        score: 92,
        metricLabel: 'High Relative Strength vs MidCap Index',
        verdict: 'EXEMPLARY',
        rationale: 'CANSLIM market leader with successive quarterly earnings gaps holding above previous resistance.'
      },
      {
        id: 'FUNDAMENTAL_QARP',
        name: 'Fundamental Quality & Capital Allocation (QARP)',
        weight: 0.25,
        weightLabel: '25%',
        score: 92,
        metricLabel: 'Rev YoY +92.4% · PAT YoY +108.2% · ROCE 32.4%',
        verdict: 'EXEMPLARY',
        rationale: 'Revenue surged 92% YoY to ₹17,690 Cr while ROCE reached 32.4% with minimal balance sheet leverage (D/E: 0.12).'
      },
      {
        id: 'RISK_REWARD',
        name: 'Risk-Reward Geometry & Tactical Asymmetry',
        weight: 0.15,
        weightLabel: '15%',
        score: 88,
        metricLabel: '1:3.6 (T2) / 1:6.6 (T3) · SL: -4.22%',
        verdict: 'OPTIMAL',
        rationale: 'Accumulation zone ₹13,150-₹13,350 with stop loss at ₹12,680; targets ₹14,200, ₹15,300, and ₹17,000.'
      },
      {
        id: 'MACRO_MOAT',
        name: 'Sovereign Moat & Macro Policy Catalysts',
        weight: 0.15,
        weightLabel: '15%',
        score: 92,
        metricLabel: 'Smartphone & IT Hardware PLI Beneficiary',
        verdict: 'EXEMPLARY',
        rationale: 'Dominant manufacturing partner for Google Pixel, Motorola, Xiaomi, and HP laptops in India.'
      }
    ],
    qualificationChecklist: [
      { rule: 'Delivery Volume Absorption > 50%', category: 'Order Flow', passed: true, actualMetric: '54.6% Delivery (vs 36.5% 30D avg)' },
      { rule: 'Volume Surge > 2.5x 20D SMA', category: 'Order Flow', passed: true, actualMetric: '3.8x 20D SMA Surge' },
      { rule: 'Capital Efficiency: ROCE > 25%', category: 'Quality', passed: true, actualMetric: 'ROCE: 32.4% | ROE: 26.8%' },
      { rule: 'Balance Sheet Health: Debt/Equity < 0.2', category: 'Quality', passed: true, actualMetric: '0.12 (Virtually Debt-Free)' },
      { rule: 'Asymmetric Payoff: Risk-Reward >= 1:3.0', category: 'Risk/Reward', passed: true, actualMetric: '1:3.6 to Target 2' },
      { rule: 'Earnings Growth: 1Y PAT YoY > 50%', category: 'Quality', passed: true, actualMetric: '+108.2% YoY (₹415 Cr)' }
    ]
  },

  BHARTIARTL: {
    compositeScore: 93,
    convictionTier: 'VERY_HIGH_CONVICTION',
    tierLabel: 'Very High Conviction (Tier 1 Alpha)',
    primaryDriver: 'Telecom duopoly ARPU expansion & post-5G capex free cash flow inflection',
    coreRationale: 'Structural industry duopoly enabling recurring tariff hikes that flow directly to bottom-line EBITDA now that pan-India 5G rollouts are mature and capex intensity has declined.',
    factorBreakdown: [
      {
        id: 'ORDER_FLOW',
        name: 'Institutional Order Flow & Wyckoff Accumulation',
        weight: 0.20,
        weightLabel: '20%',
        score: 94,
        metricLabel: '68.2% Delivery Vol · Sovereign Long-Only Absorption',
        verdict: 'EXEMPLARY',
        rationale: 'Singtel stakes smoothly absorbed by long-term sovereign wealth and domestic pension desks without price discount.'
      },
      {
        id: 'MOMENTUM_CANSLIM',
        name: 'Price Momentum & Relative Strength (RS / CANSLIM)',
        weight: 0.25,
        weightLabel: '25%',
        score: 92,
        metricLabel: 'Steady Upward Trend Channel on Weekly Chart',
        verdict: 'EXEMPLARY',
        rationale: 'Unbroken sequence of higher swing highs and higher swing lows across 12 consecutive months.'
      },
      {
        id: 'FUNDAMENTAL_QARP',
        name: 'Fundamental Quality & Capital Allocation (QARP)',
        weight: 0.25,
        weightLabel: '25%',
        score: 94,
        metricLabel: 'FCF Inflection · EBITDA Margin 52.8%',
        verdict: 'EXEMPLARY',
        rationale: 'Operating free cash flow expanding at +38% YoY with Africa mobile money and enterprise cloud segments accelerating.'
      },
      {
        id: 'RISK_REWARD',
        name: 'Risk-Reward Geometry & Tactical Asymmetry',
        weight: 0.15,
        weightLabel: '15%',
        score: 91,
        metricLabel: '1:3.3 (T2) / 1:6.0 (T3) · SL: -3.91%',
        verdict: 'STRONG',
        rationale: 'Entry band ₹1,745-₹1,775 with stop loss at ₹1,695; targets ₹1,880, ₹1,990, and ₹2,180.'
      },
      {
        id: 'MACRO_MOAT',
        name: 'Sovereign Moat & Macro Policy Catalysts',
        weight: 0.15,
        weightLabel: '15%',
        score: 96,
        metricLabel: 'Telecom Duopoly Pricing Power Moat',
        verdict: 'EXEMPLARY',
        rationale: 'Effective 2-player market structure enables guaranteed margin expansion with industry ARPU heading to ₹300.'
      }
    ],
    qualificationChecklist: [
      { rule: 'Delivery Volume Absorption > 50%', category: 'Order Flow', passed: true, actualMetric: '68.2% Delivery (vs 54.0% 30D avg)' },
      { rule: 'Volume Surge > 2.0x 20D SMA', category: 'Order Flow', passed: true, actualMetric: '2.4x 20D SMA Surge' },
      { rule: 'Capital Efficiency: EBITDA Margin > 45%', category: 'Quality', passed: true, actualMetric: '52.8% Consolidated EBITDA Margin' },
      { rule: 'Free Cash Flow Growth: YoY > 25%', category: 'Quality', passed: true, actualMetric: '+38.4% YoY Operating FCF' },
      { rule: 'Asymmetric Payoff: Risk-Reward >= 1:3.0', category: 'Risk/Reward', passed: true, actualMetric: '1:3.3 to Target 2' },
      { rule: 'Subscriber ARPU Trend: Upward', category: 'Quality', passed: true, actualMetric: 'ARPU ₹211 (+14.8% YoY)' }
    ]
  },

  HDFCBANK: {
    compositeScore: 91,
    convictionTier: 'VERY_HIGH_CONVICTION',
    tierLabel: 'Very High Conviction (Tier 1 Alpha)',
    primaryDriver: 'Post-merger loan-to-deposit normalization & MSCI passive weight accretion',
    coreRationale: 'Historic valuation mean reversion as post-merger deposit accretion normalizes credit-deposit ratios, with impending MSCI foreign inclusion factor multiplier triggering massive passive institutional inflows.',
    factorBreakdown: [
      {
        id: 'ORDER_FLOW',
        name: 'Institutional Order Flow & Wyckoff Accumulation',
        weight: 0.20,
        weightLabel: '20%',
        score: 92,
        metricLabel: '62.4% Delivery Vol · MSCI Passive Accumulation',
        verdict: 'EXEMPLARY',
        rationale: 'FIIs aggressively buying the cash delivery float to pre-position for MSCI weight increase tranches.'
      },
      {
        id: 'MOMENTUM_CANSLIM',
        name: 'Price Momentum & Relative Strength (RS / CANSLIM)',
        weight: 0.25,
        weightLabel: '25%',
        score: 88,
        metricLabel: 'Bottoming Base Reversal above 200 EMA',
        verdict: 'OPTIMAL',
        rationale: 'Constructing an institutional accumulation base above long-term moving averages after deep time-correction.'
      },
      {
        id: 'FUNDAMENTAL_QARP',
        name: 'Fundamental Quality & Capital Allocation (QARP)',
        weight: 0.25,
        weightLabel: '25%',
        score: 93,
        metricLabel: 'Net NPA 0.33% · NIM Stability at 3.47%',
        verdict: 'STRONG',
        rationale: 'Pristine underwriting standards maintained with gross NPA at 1.24% and branch deposit accretion outpacing peers.'
      },
      {
        id: 'RISK_REWARD',
        name: 'Risk-Reward Geometry & Tactical Asymmetry',
        weight: 0.15,
        weightLabel: '15%',
        score: 93,
        metricLabel: '1:3.7 (T2) / 1:6.0 (T3) · SL: -3.48%',
        verdict: 'EXEMPLARY',
        rationale: 'Entry band ₹712-₹722 with tight stop loss at ₹692 (-3.48%); targets ₹760, ₹805, and ₹865.'
      },
      {
        id: 'MACRO_MOAT',
        name: 'Sovereign Moat & Macro Policy Catalysts',
        weight: 0.15,
        weightLabel: '15%',
        score: 92,
        metricLabel: 'Dominant Private Banking Deposit Franchise',
        verdict: 'EXEMPLARY',
        rationale: 'Controls over 18% of India total banking system credit with lowest blended cost of liabilities.'
      }
    ],
    qualificationChecklist: [
      { rule: 'Delivery Volume Absorption > 50%', category: 'Order Flow', passed: true, actualMetric: '62.4% Delivery (vs 48.0% 30D avg)' },
      { rule: 'Asset Quality: Net NPA < 0.8%', category: 'Quality', passed: true, actualMetric: '0.33% Net NPA' },
      { rule: 'Capital Adequacy (CRAR) > 16%', category: 'Quality', passed: true, actualMetric: '18.8% Tier 1 Capital' },
      { rule: 'Valuation Multiple: Below 10Y Median PB', category: 'Valuation', passed: true, actualMetric: '2.4x PB vs 3.8x 10Y Median' },
      { rule: 'Asymmetric Payoff: Risk-Reward >= 1:3.0', category: 'Risk/Reward', passed: true, actualMetric: '1:3.7 to Target 2' },
      { rule: 'Deposit Inflow: Outpacing Loan Growth', category: 'Quality', passed: true, actualMetric: 'Deposit Growth +24.4% YoY' }
    ]
  },

  ICICIBANK: {
    compositeScore: 94,
    convictionTier: 'VERY_HIGH_CONVICTION',
    tierLabel: 'Very High Conviction (Tier 1 Alpha)',
    primaryDriver: 'Best-in-class 2.36% ROA compounding & sub-39% cost-to-income efficiency',
    coreRationale: 'Gold-standard Indian banking franchise compounding at 18.5% ROE with lowest corporate credit costs, superior digital underwriting, and sustained 16% loan book expansion.',
    factorBreakdown: [
      {
        id: 'ORDER_FLOW',
        name: 'Institutional Order Flow & Wyckoff Accumulation',
        weight: 0.20,
        weightLabel: '20%',
        score: 93,
        metricLabel: '58.1% Delivery Vol · Foreign Institutional Inflows',
        verdict: 'EXEMPLARY',
        rationale: 'Uninterrupted institutional net buying across all major global active emerging market funds.'
      },
      {
        id: 'MOMENTUM_CANSLIM',
        name: 'Price Momentum & Relative Strength (RS / CANSLIM)',
        weight: 0.25,
        weightLabel: '25%',
        score: 94,
        metricLabel: 'Outperforming Bank Nifty by +640 bps',
        verdict: 'EXEMPLARY',
        rationale: 'Consistently leading the private bank universe with clean pullbacks into the 20-day EMA.'
      },
      {
        id: 'FUNDAMENTAL_QARP',
        name: 'Fundamental Quality & Capital Allocation (QARP)',
        weight: 0.25,
        weightLabel: '25%',
        score: 96,
        metricLabel: 'ROA 2.36% · ROE 18.5% · PAT +18.4% YoY',
        verdict: 'EXEMPLARY',
        rationale: 'Consolidated profit after tax reached ₹44,256 Cr with provision coverage ratio at 83.2%.'
      },
      {
        id: 'RISK_REWARD',
        name: 'Risk-Reward Geometry & Tactical Asymmetry',
        weight: 0.15,
        weightLabel: '15%',
        score: 92,
        metricLabel: '1:3.4 (T2) / 1:5.8 (T3) · SL: -3.42%',
        verdict: 'STRONG',
        rationale: 'Entry band ₹1,295-₹1,315 with stop loss at ₹1,265; targets ₹1,380, ₹1,460, and ₹1,570.'
      },
      {
        id: 'MACRO_MOAT',
        name: 'Sovereign Moat & Macro Policy Catalysts',
        weight: 0.15,
        weightLabel: '15%',
        score: 94,
        metricLabel: 'Digital Risk & Corporate Underwriting Moat',
        verdict: 'EXEMPLARY',
        rationale: 'iMobile app ecosystem and proprietary corporate supply chain finance platform generate industry-low credit defaults.'
      }
    ],
    qualificationChecklist: [
      { rule: 'Delivery Volume Absorption > 50%', category: 'Order Flow', passed: true, actualMetric: '58.1% Delivery (vs 46.2% 30D avg)' },
      { rule: 'Asset Quality: Net NPA < 0.6%', category: 'Quality', passed: true, actualMetric: '0.42% Net NPA' },
      { rule: 'Capital Efficiency: ROA > 2.0%', category: 'Quality', passed: true, actualMetric: '2.36% Return on Assets' },
      { rule: 'Cost Discipline: Cost-to-Income < 42%', category: 'Quality', passed: true, actualMetric: '38.8% Cost-to-Income' },
      { rule: 'Asymmetric Payoff: Risk-Reward >= 1:3.0', category: 'Risk/Reward', passed: true, actualMetric: '1:3.4 to Target 2' },
      { rule: 'Loan Growth: YoY > 15%', category: 'Quality', passed: true, actualMetric: '+16.2% YoY Domestic Loan Growth' }
    ]
  },

  SBIN: {
    compositeScore: 92,
    convictionTier: 'VERY_HIGH_CONVICTION',
    tierLabel: 'Very High Conviction (Tier 1 Alpha)',
    primaryDriver: 'Cleanest credit balance sheet in 20 years & corporate capex loan underwriting',
    coreRationale: 'Sovereign state banking champion with record-low net NPA (0.57%), sustained 18%+ ROE, and dominant 25% national deposit market share trading at deep discount to intrinsic economic value.',
    factorBreakdown: [
      {
        id: 'ORDER_FLOW',
        name: 'Institutional Order Flow & Wyckoff Accumulation',
        weight: 0.20,
        weightLabel: '20%',
        score: 91,
        metricLabel: '56.4% Delivery Vol · Domestic Mutual Fund Support',
        verdict: 'STRONG',
        rationale: 'Massive domestic institutional mutual fund systematic accumulation at key structural Fibonacci support levels.'
      },
      {
        id: 'MOMENTUM_CANSLIM',
        name: 'Price Momentum & Relative Strength (RS / CANSLIM)',
        weight: 0.25,
        weightLabel: '25%',
        score: 92,
        metricLabel: 'Rebound from Structural Support with Expanding Volume',
        verdict: 'EXEMPLARY',
        rationale: 'Strong institutional demand tail on daily candlestick charts with RSI stabilizing in bullish divergence zone.'
      },
      {
        id: 'FUNDAMENTAL_QARP',
        name: 'Fundamental Quality & Capital Allocation (QARP)',
        weight: 0.25,
        weightLabel: '25%',
        score: 94,
        metricLabel: 'Net NPA 0.57% · ROE 18.2% · PAT ₹67,085 Cr',
        verdict: 'EXEMPLARY',
        rationale: 'Highest annual net profit ever reported by an Indian financial institution; credit costs under 0.35%.'
      },
      {
        id: 'RISK_REWARD',
        name: 'Risk-Reward Geometry & Tactical Asymmetry',
        weight: 0.15,
        weightLabel: '15%',
        score: 90,
        metricLabel: '1:3.5 (T2) / 1:6.1 (T3) · SL: -3.66%',
        verdict: 'STRONG',
        rationale: 'Entry band ₹960-₹975 with stop loss at ₹935; targets ₹1,030, ₹1,095, and ₹1,190.'
      },
      {
        id: 'MACRO_MOAT',
        name: 'Sovereign Moat & Macro Policy Catalysts',
        weight: 0.15,
        weightLabel: '15%',
        score: 95,
        metricLabel: 'Sovereign Deposit & Industrial Underwriting Monopoly',
        verdict: 'EXEMPLARY',
        rationale: 'Direct custodian of Government of India treasury and primary lead arranger for multi-billion dollar domestic infrastructure loans.'
      }
    ],
    qualificationChecklist: [
      { rule: 'Delivery Volume Absorption > 50%', category: 'Order Flow', passed: true, actualMetric: '56.4% Delivery (vs 44.0% 30D avg)' },
      { rule: 'Asset Quality: Net NPA < 1.0%', category: 'Quality', passed: true, actualMetric: '0.57% Net NPA (20-Year Record Low)' },
      { rule: 'Capital Efficiency: ROE > 16%', category: 'Quality', passed: true, actualMetric: '18.2% Return on Equity' },
      { rule: 'Valuation Multiple: P/B < 1.6x', category: 'Valuation', passed: true, actualMetric: '1.28x PB (Deep Discount)' },
      { rule: 'Asymmetric Payoff: Risk-Reward >= 1:3.0', category: 'Risk/Reward', passed: true, actualMetric: '1:3.5 to Target 2' },
      { rule: 'Corporate Loan Pipeline: Expanding', category: 'Quality', passed: true, actualMetric: '₹4.8 Lakh Cr Project Loan Sanctions' }
    ]
  },

  POLYCAB: {
    compositeScore: 92,
    convictionTier: 'VERY_HIGH_CONVICTION',
    tierLabel: 'Very High Conviction (Tier 1 Alpha)',
    primaryDriver: 'Power grid transmission capex & real estate electrification cycle',
    coreRationale: 'Undisputed 26% market share leader in Indian cables and wires capturing synchronized demand from state electricity boards, data center construction, and luxury residential real estate projects.',
    factorBreakdown: [
      {
        id: 'ORDER_FLOW',
        name: 'Institutional Order Flow & Wyckoff Accumulation',
        weight: 0.20,
        weightLabel: '20%',
        score: 91,
        metricLabel: '54.2% Delivery Vol · Strong Post-Audit Absorption',
        verdict: 'STRONG',
        rationale: 'Institutional re-accumulation following statutory audit clarity with FIIs adding +2.4% net stake.'
      },
      {
        id: 'MOMENTUM_CANSLIM',
        name: 'Price Momentum & Relative Strength (RS / CANSLIM)',
        weight: 0.25,
        weightLabel: '25%',
        score: 93,
        metricLabel: 'Capital Goods Segment Relative Strength Leader',
        verdict: 'EXEMPLARY',
        rationale: 'Consistent outperformance vs BSE Capital Goods Index with base consolidation breakout.'
      },
      {
        id: 'FUNDAMENTAL_QARP',
        name: 'Fundamental Quality & Capital Allocation (QARP)',
        weight: 0.25,
        weightLabel: '25%',
        score: 94,
        metricLabel: 'ROCE 28.6% · ROE 23.4% · PAT YoY +24.1%',
        verdict: 'EXEMPLARY',
        rationale: 'Zero long-term debt, working capital cycle reduced to 52 days, and EBITDA margins steady at 13.8%.'
      },
      {
        id: 'RISK_REWARD',
        name: 'Risk-Reward Geometry & Tactical Asymmetry',
        weight: 0.15,
        weightLabel: '15%',
        score: 89,
        metricLabel: '1:3.4 (T2) / 1:5.8 (T3) · SL: -4.13%',
        verdict: 'OPTIMAL',
        rationale: 'Entry band ₹6,220-₹6,320 with stop loss at ₹6,040; targets ₹6,720, ₹7,180, and ₹7,800.'
      },
      {
        id: 'MACRO_MOAT',
        name: 'Sovereign Moat & Macro Policy Catalysts',
        weight: 0.15,
        weightLabel: '15%',
        score: 94,
        metricLabel: '26% Organized Market Share & Dealer Network Moat',
        verdict: 'EXEMPLARY',
        rationale: 'Network of 4,300+ authorized dealers and 205,000+ retail touchpoints creates insurmountable distribution barrier.'
      }
    ],
    qualificationChecklist: [
      { rule: 'Delivery Volume Absorption > 50%', category: 'Order Flow', passed: true, actualMetric: '54.2% Delivery (vs 39.0% 30D avg)' },
      { rule: 'Volume Surge > 2.0x 20D SMA', category: 'Order Flow', passed: true, actualMetric: '2.6x 20D SMA Surge' },
      { rule: 'Capital Efficiency: ROCE > 25%', category: 'Quality', passed: true, actualMetric: 'ROCE: 28.6% | ROE: 23.4%' },
      { rule: 'Balance Sheet Health: Debt/Equity < 0.2', category: 'Quality', passed: true, actualMetric: '0.04 (Net Cash Position)' },
      { rule: 'Asymmetric Payoff: Risk-Reward >= 1:3.0', category: 'Risk/Reward', passed: true, actualMetric: '1:3.4 to Target 2' },
      { rule: 'Earnings Growth: 1Y PAT YoY > 20%', category: 'Quality', passed: true, actualMetric: '+24.1% YoY (₹1,803 Cr)' }
    ]
  },

  SOLARINDS: {
    compositeScore: 93,
    convictionTier: 'VERY_HIGH_CONVICTION',
    tierLabel: 'Very High Conviction (Tier 1 Alpha)',
    primaryDriver: 'Pinaka rocket propellant exclusivity & military drone warhead exports',
    coreRationale: 'Monopolistic private supplier of solid propellant boosters for Pinaka multi-barrel rockets and BrahMos missiles with expanding high-margin European and Middle Eastern defense ammunition exports.',
    factorBreakdown: [
      {
        id: 'ORDER_FLOW',
        name: 'Institutional Order Flow & Wyckoff Accumulation',
        weight: 0.20,
        weightLabel: '20%',
        score: 92,
        metricLabel: '56.8% Delivery Vol · Low Float Cornering',
        verdict: 'EXEMPLARY',
        rationale: 'Long-term defense institutional funds systematically accumulating float on contract award announcements.'
      },
      {
        id: 'MOMENTUM_CANSLIM',
        name: 'Price Momentum & Relative Strength (RS / CANSLIM)',
        weight: 0.25,
        weightLabel: '25%',
        score: 95,
        metricLabel: 'High-Tight Consolidation Breakout on Volume',
        verdict: 'EXEMPLARY',
        rationale: 'Classic CANSLIM high-tight flag breakout on 3.1x average volume with zero overhead supply.'
      },
      {
        id: 'FUNDAMENTAL_QARP',
        name: 'Fundamental Quality & Capital Allocation (QARP)',
        weight: 0.25,
        weightLabel: '25%',
        score: 94,
        metricLabel: 'ROCE 26.8% · PAT YoY +36.2% · EBITDA 24.2%',
        verdict: 'EXEMPLARY',
        rationale: 'Defense segment revenue share expanded from 18% to 32% with EBITDA margins widening to 24.2%.'
      },
      {
        id: 'RISK_REWARD',
        name: 'Risk-Reward Geometry & Tactical Asymmetry',
        weight: 0.15,
        weightLabel: '15%',
        score: 90,
        metricLabel: '1:3.4 (T2) / 1:5.8 (T3) · SL: -4.38%',
        verdict: 'STRONG',
        rationale: 'Entry band ₹19,250-₹19,650 with stop loss at ₹18,650; targets ₹20,900, ₹22,500, and ₹24,800.'
      },
      {
        id: 'MACRO_MOAT',
        name: 'Sovereign Moat & Macro Policy Catalysts',
        weight: 0.15,
        weightLabel: '15%',
        score: 96,
        metricLabel: 'Explosives Licensing & Defense Ordnance Exclusivity',
        verdict: 'EXEMPLARY',
        rationale: 'Rigid statutory explosive licensing barriers make competitive entry virtually impossible.'
      }
    ],
    qualificationChecklist: [
      { rule: 'Delivery Volume Absorption > 50%', category: 'Order Flow', passed: true, actualMetric: '56.8% Delivery (vs 41.5% 30D avg)' },
      { rule: 'Volume Surge > 2.5x 20D SMA', category: 'Order Flow', passed: true, actualMetric: '3.1x 20D SMA Surge' },
      { rule: 'Capital Efficiency: ROCE > 22%', category: 'Quality', passed: true, actualMetric: 'ROCE: 26.8% | ROE: 24.1%' },
      { rule: 'Balance Sheet Health: Debt/Equity < 0.4', category: 'Quality', passed: true, actualMetric: '0.22 (Conservative Capital Structure)' },
      { rule: 'Asymmetric Payoff: Risk-Reward >= 1:3.0', category: 'Risk/Reward', passed: true, actualMetric: '1:3.4 to Target 2' },
      { rule: 'Earnings Growth: 1Y PAT YoY > 30%', category: 'Quality', passed: true, actualMetric: '+36.2% YoY (₹1,024 Cr)' }
    ]
  },

  COCHINSHIP: {
    compositeScore: 89,
    convictionTier: 'HIGH_CONVICTION',
    tierLabel: 'High Conviction (Tier 2 Tactical Alpha)',
    primaryDriver: 'Naval modernization, IAC-2 aircraft carrier & European hybrid vessel backlog',
    coreRationale: 'Premier Indian naval shipyard commissioned with massive new drydock capacity to execute next-generation guided missile corvettes, aircraft carrier maintenance, and European green commercial ferries.',
    factorBreakdown: [
      {
        id: 'ORDER_FLOW',
        name: 'Institutional Order Flow & Wyckoff Accumulation',
        weight: 0.20,
        weightLabel: '20%',
        score: 88,
        metricLabel: '49.5% Delivery Vol · Active Swing Accumulation',
        verdict: 'OPTIMAL',
        rationale: 'DII institutional funds accumulating during 50 EMA mean-reversion pullbacks.'
      },
      {
        id: 'MOMENTUM_CANSLIM',
        name: 'Price Momentum & Relative Strength (RS / CANSLIM)',
        weight: 0.25,
        weightLabel: '25%',
        score: 91,
        metricLabel: 'Stage 2 Pullback Retest of 50-Day Moving Average',
        verdict: 'EXEMPLARY',
        rationale: 'Clean technical bounce off 50 EMA with constructive volume contraction on declining sessions.'
      },
      {
        id: 'FUNDAMENTAL_QARP',
        name: 'Fundamental Quality & Capital Allocation (QARP)',
        weight: 0.25,
        weightLabel: '25%',
        score: 90,
        metricLabel: 'ROCE 22.4% · Rev YoY +48.2% · Zero Debt',
        verdict: 'STRONG',
        rationale: 'Debt-free balance sheet with ₹22,000 Cr order backlog providing multi-year cash flow certainty.'
      },
      {
        id: 'RISK_REWARD',
        name: 'Risk-Reward Geometry & Tactical Asymmetry',
        weight: 0.15,
        weightLabel: '15%',
        score: 88,
        metricLabel: '1:3.2 (T2) / 1:5.5 (T3) · SL: -4.73%',
        verdict: 'OPTIMAL',
        rationale: 'Entry band ₹1,310-₹1,340 with stop loss at ₹1,260; targets ₹1,440, ₹1,550, and ₹1,720.'
      },
      {
        id: 'MACRO_MOAT',
        name: 'Sovereign Moat & Macro Policy Catalysts',
        weight: 0.15,
        weightLabel: '15%',
        score: 91,
        metricLabel: 'Indigenous Aircraft Carrier (IAC) Building Moat',
        verdict: 'EXEMPLARY',
        rationale: 'Sole Indian yard that has built and commissioned an indigenous aircraft carrier (INS Vikrant).'
      }
    ],
    qualificationChecklist: [
      { rule: 'Delivery Volume Absorption > 45%', category: 'Order Flow', passed: true, actualMetric: '49.5% Delivery' },
      { rule: 'Volume Surge > 2.0x 20D SMA', category: 'Order Flow', passed: true, actualMetric: '2.4x 20D SMA Surge' },
      { rule: 'Capital Efficiency: ROCE > 20%', category: 'Quality', passed: true, actualMetric: 'ROCE: 22.4% | ROE: 18.2%' },
      { rule: 'Balance Sheet Health: Zero Debt', category: 'Quality', passed: true, actualMetric: '0.00 (Net Cash Balance Sheet)' },
      { rule: 'Asymmetric Payoff: Risk-Reward >= 1:3.0', category: 'Risk/Reward', passed: true, actualMetric: '1:3.2 to Target 2' },
      { rule: 'Order Visibility: > 3.0x Revenue', category: 'Quality', passed: true, actualMetric: '4.2x Revenue Order Book (₹22,000 Cr)' }
    ]
  },

  RELIANCE: {
    compositeScore: 93,
    convictionTier: 'VERY_HIGH_CONVICTION',
    tierLabel: 'Very High Conviction (Tier 1 Alpha)',
    primaryDriver: 'Telecom monetization, retail IPO optionality & Jamnagar new energy hub',
    coreRationale: 'Sum-of-the-parts deep valuation discount with upcoming value unlocking from public listings of Jio Infocomm and Reliance Retail, alongside commercialization of the Jamnagar solar-hydrogen gigacomplex.',
    factorBreakdown: [
      {
        id: 'ORDER_FLOW',
        name: 'Institutional Order Flow & Wyckoff Accumulation',
        weight: 0.20,
        weightLabel: '20%',
        score: 92,
        metricLabel: '64.5% Delivery Vol · Massive Domestic SIP Inflows',
        verdict: 'EXEMPLARY',
        rationale: 'Largest constituent of domestic equity mutual funds with systematic net accumulation.'
      },
      {
        id: 'MOMENTUM_CANSLIM',
        name: 'Price Momentum & Relative Strength (RS / CANSLIM)',
        weight: 0.25,
        weightLabel: '25%',
        score: 91,
        metricLabel: 'Post-Bonus Consolidation Base Breakout',
        verdict: 'EXEMPLARY',
        rationale: 'Constructing strong accumulation base following bonus issuance with volume profile expanding.'
      },
      {
        id: 'FUNDAMENTAL_QARP',
        name: 'Fundamental Quality & Capital Allocation (QARP)',
        weight: 0.25,
        weightLabel: '25%',
        score: 93,
        metricLabel: 'Consolidated EBITDA > ₹1,78,000 Cr',
        verdict: 'STRONG',
        rationale: 'O2C refining margins rebounding while Jio telecom ARPU expansion drops straight to EBITDA.'
      },
      {
        id: 'RISK_REWARD',
        name: 'Risk-Reward Geometry & Tactical Asymmetry',
        weight: 0.15,
        weightLabel: '15%',
        score: 93,
        metricLabel: '1:3.6 (T2) / 1:6.7 (T3) · SL: -3.61%',
        verdict: 'EXEMPLARY',
        rationale: 'Entry band ₹1,180-₹1,200 with stop loss at ₹1,145; targets ₹1,270, ₹1,350, and ₹1,480.'
      },
      {
        id: 'MACRO_MOAT',
        name: 'Sovereign Moat & Macro Policy Catalysts',
        weight: 0.15,
        weightLabel: '15%',
        score: 97,
        metricLabel: 'Tripartite National Monopoly: Telecom, Retail, Energy',
        verdict: 'EXEMPLARY',
        rationale: 'Dominates India digital connectivity (Jio: 480M users), grocery/electronics retail, and petrochem exports.'
      }
    ],
    qualificationChecklist: [
      { rule: 'Delivery Volume Absorption > 50%', category: 'Order Flow', passed: true, actualMetric: '64.5% Delivery (vs 52.0% 30D avg)' },
      { rule: 'Volume Surge > 2.0x 20D SMA', category: 'Order Flow', passed: true, actualMetric: '2.2x 20D SMA Surge' },
      { rule: 'Operating Cash Flow > ₹1,20,000 Cr', category: 'Quality', passed: true, actualMetric: '₹1,56,400 Cr Operating Cash Flow' },
      { rule: 'Balance Sheet Health: Net Debt / EBITDA < 1.0', category: 'Quality', passed: true, actualMetric: '0.64x Net Debt / EBITDA' },
      { rule: 'Asymmetric Payoff: Risk-Reward >= 1:3.0', category: 'Risk/Reward', passed: true, actualMetric: '1:3.6 to Target 2' },
      { rule: 'Jio ARPU Growth: YoY > 8%', category: 'Quality', passed: true, actualMetric: '+11.4% YoY Telecom ARPU' }
    ]
  },

  NTPC: {
    compositeScore: 94,
    convictionTier: 'VERY_HIGH_CONVICTION',
    tierLabel: 'Very High Conviction (Tier 1 Alpha)',
    primaryDriver: 'Regulated 15.5% ROE thermal compounding & NTPC Green Energy renewable IPO',
    coreRationale: 'Monopolistic baseload power supplier generating 25% of India total electricity with CERC-guaranteed 15.5% return on equity on all regulated capital, alongside immense value unlock from 60 GW renewable arm spin-off.',
    factorBreakdown: [
      {
        id: 'ORDER_FLOW',
        name: 'Institutional Order Flow & Wyckoff Accumulation',
        weight: 0.20,
        weightLabel: '20%',
        score: 95,
        metricLabel: '66.2% Delivery Vol · Sovereign Pension Absorption',
        verdict: 'EXEMPLARY',
        rationale: 'Domestic retirement funds (EPFO/NPS) and global utility infrastructure funds accumulating float.'
      },
      {
        id: 'MOMENTUM_CANSLIM',
        name: 'Price Momentum & Relative Strength (RS / CANSLIM)',
        weight: 0.25,
        weightLabel: '25%',
        score: 93,
        metricLabel: 'Bullish Consolidation above 50-Day EMA',
        verdict: 'EXEMPLARY',
        rationale: 'Sustained institutional base structure outperforming the NIFTY Energy benchmark.'
      },
      {
        id: 'FUNDAMENTAL_QARP',
        name: 'Fundamental Quality & Capital Allocation (QARP)',
        weight: 0.25,
        weightLabel: '25%',
        score: 95,
        metricLabel: 'Regulated 15.5% ROE · PAT YoY +22.4% (₹21,332 Cr)',
        verdict: 'EXEMPLARY',
        rationale: 'Regulated tariff framework guarantees steady 15.5% ROE regardless of fuel price fluctuations.'
      },
      {
        id: 'RISK_REWARD',
        name: 'Risk-Reward Geometry & Tactical Asymmetry',
        weight: 0.15,
        weightLabel: '15%',
        score: 92,
        metricLabel: '1:3.5 (T2) / 1:6.1 (T3) · SL: -4.29%',
        verdict: 'STRONG',
        rationale: 'Entry band ₹318-₹325 with stop loss at ₹308; targets ₹350, ₹385, and ₹425.'
      },
      {
        id: 'MACRO_MOAT',
        name: 'Sovereign Moat & Macro Policy Catalysts',
        weight: 0.15,
        weightLabel: '15%',
        score: 97,
        metricLabel: 'Supplies 25% of India Power & Green Energy IPO',
        verdict: 'EXEMPLARY',
        rationale: 'Indispensable thermal baseload provider with ₹10,000 Cr NTPC Green Energy IPO value unlock.'
      }
    ],
    qualificationChecklist: [
      { rule: 'Delivery Volume Absorption > 50%', category: 'Order Flow', passed: true, actualMetric: '66.2% Delivery (vs 51.0% 30D avg)' },
      { rule: 'Volume Surge > 2.0x 20D SMA', category: 'Order Flow', passed: true, actualMetric: '2.8x 20D SMA Surge' },
      { rule: 'Guaranteed Statutory Return on Equity', category: 'Quality', passed: true, actualMetric: '15.5% Regulated ROE (CERC Norms)' },
      { rule: 'Thermal Plant Load Factor (PLF) > 75%', category: 'Quality', passed: true, actualMetric: '77.8% PLF (Industry Leading)' },
      { rule: 'Asymmetric Payoff: Risk-Reward >= 1:3.0', category: 'Risk/Reward', passed: true, actualMetric: '1:3.5 to Target 2' },
      { rule: 'Earnings Growth: 1Y PAT YoY > 20%', category: 'Quality', passed: true, actualMetric: '+22.4% YoY (₹21,332 Cr)' }
    ]
  },

  INFY: {
    compositeScore: 90,
    convictionTier: 'VERY_HIGH_CONVICTION',
    tierLabel: 'Very High Conviction (Tier 1 Alpha)',
    primaryDriver: 'Enterprise AI large-deal expansion ($17.7B TCV) & historical multiple mean reversion',
    coreRationale: 'Tier-1 enterprise digital transformation leader with record $17.7B large deal pipeline, Topaz generative AI suite adoption across Fortune 500 clients, 35.8% ROCE, and attractive valuation multiple mean reversion.',
    factorBreakdown: [
      {
        id: 'ORDER_FLOW',
        name: 'Institutional Order Flow & Wyckoff Accumulation',
        weight: 0.20,
        weightLabel: '20%',
        score: 91,
        metricLabel: '61.4% Delivery Vol · Global Tech Fund Buying',
        verdict: 'STRONG',
        rationale: 'Long-term international technology mandate funds building strategic core positions.'
      },
      {
        id: 'MOMENTUM_CANSLIM',
        name: 'Price Momentum & Relative Strength (RS / CANSLIM)',
        weight: 0.25,
        weightLabel: '25%',
        score: 88,
        metricLabel: 'Mean Reversion Base near Long-Term Support',
        verdict: 'OPTIMAL',
        rationale: 'Reclaiming structural base with declining selling pressure on down days.'
      },
      {
        id: 'FUNDAMENTAL_QARP',
        name: 'Fundamental Quality & Capital Allocation (QARP)',
        weight: 0.25,
        weightLabel: '25%',
        score: 92,
        metricLabel: 'ROCE 35.8% · ROE 31.4% · 85%+ FCF Payout',
        verdict: 'EXEMPLARY',
        rationale: 'Exceptional cash conversion with zero debt and consistent dividend and share buyback distributions.'
      },
      {
        id: 'RISK_REWARD',
        name: 'Risk-Reward Geometry & Tactical Asymmetry',
        weight: 0.15,
        weightLabel: '15%',
        score: 91,
        metricLabel: '1:3.7 (T2) / 1:6.5 (T3) · SL: -4.38%',
        verdict: 'STRONG',
        rationale: 'Entry band ₹988-₹1,008 with stop loss at ₹955; targets ₹1,070, ₹1,160, and ₹1,280.'
      },
      {
        id: 'MACRO_MOAT',
        name: 'Sovereign Moat & Macro Policy Catalysts',
        weight: 0.15,
        weightLabel: '15%',
        score: 90,
        metricLabel: 'Global Tier-1 Enterprise Client Moat',
        verdict: 'STRONG',
        rationale: 'Sticky enterprise relationships across Global 2000 corporations with Topaz AI platform expansion.'
      }
    ],
    qualificationChecklist: [
      { rule: 'Delivery Volume Absorption > 50%', category: 'Order Flow', passed: true, actualMetric: '61.4% Delivery (vs 48.0% 30D avg)' },
      { rule: 'Volume Surge > 2.0x 20D SMA', category: 'Order Flow', passed: true, actualMetric: '2.1x 20D SMA Surge' },
      { rule: 'Capital Efficiency: ROCE > 30%', category: 'Quality', passed: true, actualMetric: 'ROCE: 35.8% | ROE: 31.4%' },
      { rule: 'Balance Sheet Health: Zero Debt', category: 'Quality', passed: true, actualMetric: '0.00 (₹18,000 Cr Cash & Investments)' },
      { rule: 'Asymmetric Payoff: Risk-Reward >= 1:3.0', category: 'Risk/Reward', passed: true, actualMetric: '1:3.7 to Target 2' },
      { rule: 'Deal Flow: Large Deal TCV > $15 Billion', category: 'Quality', passed: true, actualMetric: '$17.7 Billion Record Large Deal TCV' }
    ]
  }
};

export const getStrategyQuantification = (ticker: string): StrategyQuantification => {
  const cleanTicker = ticker.toUpperCase().replace('.NS', '').replace('.BO', '');
  return STOCK_STRATEGY_QUANTIFICATION_MAP[cleanTicker] || STOCK_STRATEGY_QUANTIFICATION_MAP['TRENT'];
};
