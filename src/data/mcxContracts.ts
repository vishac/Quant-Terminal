/**
 * mcxContracts.ts — Multi Commodity Exchange of India (MCX) Contract Registry
 *
 * Provides:
 *   • Master registry for major MCX tradeable commodity futures
 *   • Lot sizes, quotation units, tick sizes, and initial margin estimates
 *   • Session schedules (Morning: 09:00–17:00, Evening: 17:00–23:30/23:55 IST)
 *   • Upstox instrument key builder for MCX commodity contracts
 */

export type CommodityCategory = 'BULLION' | 'ENERGY' | 'BASE_METALS' | 'AGRI';

export interface MCXContractSpec {
  symbol: string;             // e.g. 'GOLD', 'SILVER', 'CRUDEOIL'
  name: string;               // e.g. 'Gold 1 Kg'
  category: CommodityCategory;
  lotSize: number;            // Contract size
  unit: string;               // e.g. '10 grams', '1 kg', '100 barrels'
  tickSize: number;           // Minimum price tick (₹)
  spanMarginPct: number;      // Approximate initial margin %
  isEveningSessionActive: boolean; // True for non-agri (trades till 23:30/23:55 IST)
  upstoxPrefix: string;       // 'MCX_FO|'
}

export const MCX_CONTRACT_REGISTRY: Record<string, MCXContractSpec> = {
  // ── Bullion ─────────────────────────────────────────────────────────────
  'GOLD': {
    symbol: 'GOLD',
    name: 'Gold (1 Kg)',
    category: 'BULLION',
    lotSize: 1, // 1 kg
    unit: '10 grams',
    tickSize: 1.0,
    spanMarginPct: 9.0,
    isEveningSessionActive: true,
    upstoxPrefix: 'MCX_FO|',
  },
  'GOLDM': {
    symbol: 'GOLDM',
    name: 'Gold Mini (100 grams)',
    category: 'BULLION',
    lotSize: 10, // 100 grams
    unit: '10 grams',
    tickSize: 1.0,
    spanMarginPct: 9.0,
    isEveningSessionActive: true,
    upstoxPrefix: 'MCX_FO|',
  },
  'SILVER': {
    symbol: 'SILVER',
    name: 'Silver (30 Kg)',
    category: 'BULLION',
    lotSize: 30, // 30 kg
    unit: '1 kg',
    tickSize: 1.0,
    spanMarginPct: 10.5,
    isEveningSessionActive: true,
    upstoxPrefix: 'MCX_FO|',
  },
  'SILVERM': {
    symbol: 'SILVERM',
    name: 'Silver Mini (5 Kg)',
    category: 'BULLION',
    lotSize: 5, // 5 kg
    unit: '1 kg',
    tickSize: 1.0,
    spanMarginPct: 10.5,
    isEveningSessionActive: true,
    upstoxPrefix: 'MCX_FO|',
  },
  'SILVERMIC': {
    symbol: 'SILVERMIC',
    name: 'Silver Micro (1 Kg)',
    category: 'BULLION',
    lotSize: 1, // 1 kg
    unit: '1 kg',
    tickSize: 1.0,
    spanMarginPct: 10.5,
    isEveningSessionActive: true,
    upstoxPrefix: 'MCX_FO|',
  },

  // ── Energy ──────────────────────────────────────────────────────────────
  'CRUDEOIL': {
    symbol: 'CRUDEOIL',
    name: 'Crude Oil (100 Barrels)',
    category: 'ENERGY',
    lotSize: 100, // 100 barrels
    unit: '1 barrel',
    tickSize: 1.0,
    spanMarginPct: 14.0,
    isEveningSessionActive: true,
    upstoxPrefix: 'MCX_FO|',
  },
  'CRUDEOILM': {
    symbol: 'CRUDEOILM',
    name: 'Crude Oil Mini (10 Barrels)',
    category: 'ENERGY',
    lotSize: 10,
    unit: '1 barrel',
    tickSize: 1.0,
    spanMarginPct: 14.0,
    isEveningSessionActive: true,
    upstoxPrefix: 'MCX_FO|',
  },
  'NATURALGAS': {
    symbol: 'NATURALGAS',
    name: 'Natural Gas (1250 mmBtu)',
    category: 'ENERGY',
    lotSize: 1250,
    unit: '1 mmBtu',
    tickSize: 0.10,
    spanMarginPct: 18.0,
    isEveningSessionActive: true,
    upstoxPrefix: 'MCX_FO|',
  },
  'NATURALGASM': {
    symbol: 'NATURALGASM',
    name: 'Natural Gas Mini (250 mmBtu)',
    category: 'ENERGY',
    lotSize: 250,
    unit: '1 mmBtu',
    tickSize: 0.10,
    spanMarginPct: 18.0,
    isEveningSessionActive: true,
    upstoxPrefix: 'MCX_FO|',
  },

  // ── Base Metals ─────────────────────────────────────────────────────────
  'COPPER': {
    symbol: 'COPPER',
    name: 'Copper (2500 Kg)',
    category: 'BASE_METALS',
    lotSize: 2500,
    unit: '1 kg',
    tickSize: 0.05,
    spanMarginPct: 11.0,
    isEveningSessionActive: true,
    upstoxPrefix: 'MCX_FO|',
  },
  'ZINC': {
    symbol: 'ZINC',
    name: 'Zinc (5000 Kg)',
    category: 'BASE_METALS',
    lotSize: 5000,
    unit: '1 kg',
    tickSize: 0.05,
    spanMarginPct: 11.5,
    isEveningSessionActive: true,
    upstoxPrefix: 'MCX_FO|',
  },
  'ALUMINIUM': {
    symbol: 'ALUMINIUM',
    name: 'Aluminium (5000 Kg)',
    category: 'BASE_METALS',
    lotSize: 5000,
    unit: '1 kg',
    tickSize: 0.05,
    spanMarginPct: 11.0,
    isEveningSessionActive: true,
    upstoxPrefix: 'MCX_FO|',
  },
  'LEAD': {
    symbol: 'LEAD',
    name: 'Lead (5000 Kg)',
    category: 'BASE_METALS',
    lotSize: 5000,
    unit: '1 kg',
    tickSize: 0.05,
    spanMarginPct: 11.0,
    isEveningSessionActive: true,
    upstoxPrefix: 'MCX_FO|',
  },
};

/**
 * Builds Upstox instrument key for MCX commodity futures
 * Format: MCX_FO|<SYMBOL><EXPIRY_DDMMMYY>FUT
 */
export function buildUpstoxMCXFuturesKey(symbol: string, expiryDateStr: string): string {
  const spec = MCX_CONTRACT_REGISTRY[symbol.toUpperCase()];
  const prefix = spec?.upstoxPrefix || 'MCX_FO|';

  const [year, month, day] = expiryDateStr.split('-');
  const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const mon = MONTHS[parseInt(month, 10) - 1];
  const yy = year.slice(2);

  return `${prefix}${symbol.toUpperCase()}${day}${mon}${yy}FUT`;
}

export function getMCXSpec(symbol: string): MCXContractSpec | null {
  return MCX_CONTRACT_REGISTRY[symbol.toUpperCase()] ?? null;
}

export function getMCXLotSize(symbol: string): number {
  return MCX_CONTRACT_REGISTRY[symbol.toUpperCase()]?.lotSize ?? 1;
}

export const ALL_MCX_SYMBOLS = Object.keys(MCX_CONTRACT_REGISTRY);
