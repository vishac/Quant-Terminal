/**
 * fnoContracts.ts — F&O Contract Registry for NSE (2026–2027)
 *
 * Provides:
 *   • Live upcoming expiry dates (wired to indianHolidayCalendar adjusted expiries)
 *   • Lot sizes, tick sizes, and SPAN margin % for all tradeable F&O underlyings
 *   • Strike selection helpers (ATM, ITM, OTM bands)
 *   • Upstox instrument key builder for option/futures contracts
 *
 * The expiry calendar is NOT hardcoded — it calls getAdjustedExpiryDate()
 * from indianHolidayCalendar.ts so holiday-adjusted dates are always correct.
 */

import {
  getAdjustedExpiryDate,
  formatDate,
  isHoliday,
} from '../utils/indianHolidayCalendar';

// ---------------------------------------------------------------------------
// Segment definitions
// ---------------------------------------------------------------------------

export type FnOExchange = 'NSE' | 'BSE';
export type FnOOptionType = 'CE' | 'PE';
export type FnOInstrumentType = 'OPT' | 'FUT';

// ---------------------------------------------------------------------------
// Contract spec — static metadata per underlying
// ---------------------------------------------------------------------------

export interface FnOContractSpec {
  underlying: string;           // e.g. 'NIFTY', 'BANKNIFTY', 'RELIANCE'
  exchange: FnOExchange;
  instrumentType: 'INDEX' | 'STOCK';

  /** Weekly expiry day (0=Sun … 6=Sat). null = monthly-only. */
  weeklyExpiryDay: number | null;

  /** Monthly expiry day of week (e.g. 4=Thursday for SENSEX). */
  monthlyExpiryDay: number;

  lotSize: number;              // Contracts per lot
  tickSize: number;             // Minimum price movement (₹)
  strikeInterval: number;       // Strike gap (₹)

  /**
   * Approximate SPAN + Exposure margin %.
   * For option SELL / futures positions.
   * e.g. 12 = 12% of underlying notional.
   */
  spanMarginPct: number;

  /** Upstox instrument key prefix for building option chain keys. */
  upstoxPrefix: string;         // e.g. 'NSE_FO|' or 'BSE_FO|'
}

// ---------------------------------------------------------------------------
// Master contract registry
// ---------------------------------------------------------------------------

export const FNO_CONTRACT_REGISTRY: Record<string, FnOContractSpec> = {
  // ── Index derivatives ──────────────────────────────────────────────────
  'NIFTY': {
    underlying: 'NIFTY', exchange: 'NSE', instrumentType: 'INDEX',
    weeklyExpiryDay: 2,          // Tuesday (changed from Thursday in Nov 2024)
    monthlyExpiryDay: 2,
    lotSize: 75, tickSize: 0.05, strikeInterval: 50,
    spanMarginPct: 10,
    upstoxPrefix: 'NSE_FO|',
  },
  'BANKNIFTY': {
    underlying: 'BANKNIFTY', exchange: 'NSE', instrumentType: 'INDEX',
    weeklyExpiryDay: 3,          // Wednesday
    monthlyExpiryDay: 3,
    lotSize: 35, tickSize: 0.05, strikeInterval: 100,
    spanMarginPct: 11,
    upstoxPrefix: 'NSE_FO|',
  },
  'FINNIFTY': {
    underlying: 'FINNIFTY', exchange: 'NSE', instrumentType: 'INDEX',
    weeklyExpiryDay: 2,          // Tuesday
    monthlyExpiryDay: 2,
    lotSize: 65, tickSize: 0.05, strikeInterval: 50,
    spanMarginPct: 11,
    upstoxPrefix: 'NSE_FO|',
  },
  'MIDCPNIFTY': {
    underlying: 'MIDCPNIFTY', exchange: 'NSE', instrumentType: 'INDEX',
    weeklyExpiryDay: 1,          // Monday
    monthlyExpiryDay: 1,
    lotSize: 120, tickSize: 0.05, strikeInterval: 25,
    spanMarginPct: 12,
    upstoxPrefix: 'NSE_FO|',
  },
  'SENSEX': {
    underlying: 'SENSEX', exchange: 'BSE', instrumentType: 'INDEX',
    weeklyExpiryDay: 4,          // Thursday (BSE SENSEX — unchanged)
    monthlyExpiryDay: 4,
    lotSize: 20, tickSize: 0.05, strikeInterval: 100,
    spanMarginPct: 10,
    upstoxPrefix: 'BSE_FO|',
  },
  'BANKEX': {
    underlying: 'BANKEX', exchange: 'BSE', instrumentType: 'INDEX',
    weeklyExpiryDay: 1,          // Monday
    monthlyExpiryDay: 1,
    lotSize: 20, tickSize: 0.05, strikeInterval: 100,
    spanMarginPct: 11,
    upstoxPrefix: 'BSE_FO|',
  },

  // ── Stock derivatives (top 30 most liquid) ─────────────────────────────
  'RELIANCE':   { underlying: 'RELIANCE',   exchange: 'NSE', instrumentType: 'STOCK', weeklyExpiryDay: null, monthlyExpiryDay: 4, lotSize: 250,  tickSize: 0.05, strikeInterval: 20,  spanMarginPct: 13, upstoxPrefix: 'NSE_FO|' },
  'TCS':        { underlying: 'TCS',        exchange: 'NSE', instrumentType: 'STOCK', weeklyExpiryDay: null, monthlyExpiryDay: 4, lotSize: 175,  tickSize: 0.05, strikeInterval: 50,  spanMarginPct: 13, upstoxPrefix: 'NSE_FO|' },
  'INFY':       { underlying: 'INFY',       exchange: 'NSE', instrumentType: 'STOCK', weeklyExpiryDay: null, monthlyExpiryDay: 4, lotSize: 300,  tickSize: 0.05, strikeInterval: 20,  spanMarginPct: 13, upstoxPrefix: 'NSE_FO|' },
  'HDFCBANK':   { underlying: 'HDFCBANK',   exchange: 'NSE', instrumentType: 'STOCK', weeklyExpiryDay: null, monthlyExpiryDay: 4, lotSize: 550,  tickSize: 0.05, strikeInterval: 10,  spanMarginPct: 12, upstoxPrefix: 'NSE_FO|' },
  'ICICIBANK':  { underlying: 'ICICIBANK',  exchange: 'NSE', instrumentType: 'STOCK', weeklyExpiryDay: null, monthlyExpiryDay: 4, lotSize: 700,  tickSize: 0.05, strikeInterval: 10,  spanMarginPct: 12, upstoxPrefix: 'NSE_FO|' },
  'SBIN':       { underlying: 'SBIN',       exchange: 'NSE', instrumentType: 'STOCK', weeklyExpiryDay: null, monthlyExpiryDay: 4, lotSize: 1500, tickSize: 0.05, strikeInterval: 5,   spanMarginPct: 13, upstoxPrefix: 'NSE_FO|' },
  'AXISBANK':   { underlying: 'AXISBANK',   exchange: 'NSE', instrumentType: 'STOCK', weeklyExpiryDay: null, monthlyExpiryDay: 4, lotSize: 1200, tickSize: 0.05, strikeInterval: 5,   spanMarginPct: 12, upstoxPrefix: 'NSE_FO|' },
  'KOTAKBANK':  { underlying: 'KOTAKBANK',  exchange: 'NSE', instrumentType: 'STOCK', weeklyExpiryDay: null, monthlyExpiryDay: 4, lotSize: 400,  tickSize: 0.05, strikeInterval: 20,  spanMarginPct: 12, upstoxPrefix: 'NSE_FO|' },
  'BAJFINANCE': { underlying: 'BAJFINANCE', exchange: 'NSE', instrumentType: 'STOCK', weeklyExpiryDay: null, monthlyExpiryDay: 4, lotSize: 125,  tickSize: 0.05, strikeInterval: 50,  spanMarginPct: 13, upstoxPrefix: 'NSE_FO|' },
  'HINDUNILVR': { underlying: 'HINDUNILVR', exchange: 'NSE', instrumentType: 'STOCK', weeklyExpiryDay: null, monthlyExpiryDay: 4, lotSize: 300,  tickSize: 0.05, strikeInterval: 20,  spanMarginPct: 12, upstoxPrefix: 'NSE_FO|' },
  'LT':         { underlying: 'LT',         exchange: 'NSE', instrumentType: 'STOCK', weeklyExpiryDay: null, monthlyExpiryDay: 4, lotSize: 175,  tickSize: 0.05, strikeInterval: 20,  spanMarginPct: 12, upstoxPrefix: 'NSE_FO|' },
  'ADANIPORTS': { underlying: 'ADANIPORTS', exchange: 'NSE', instrumentType: 'STOCK', weeklyExpiryDay: null, monthlyExpiryDay: 4, lotSize: 625,  tickSize: 0.05, strikeInterval: 10,  spanMarginPct: 14, upstoxPrefix: 'NSE_FO|' },
  'TATAMOTORS': { underlying: 'TATAMOTORS', exchange: 'NSE', instrumentType: 'STOCK', weeklyExpiryDay: null, monthlyExpiryDay: 4, lotSize: 1425, tickSize: 0.05, strikeInterval: 5,   spanMarginPct: 14, upstoxPrefix: 'NSE_FO|' },
  'MARUTI':     { underlying: 'MARUTI',     exchange: 'NSE', instrumentType: 'STOCK', weeklyExpiryDay: null, monthlyExpiryDay: 4, lotSize: 25,   tickSize: 0.05, strikeInterval: 100, spanMarginPct: 13, upstoxPrefix: 'NSE_FO|' },
  'SUNPHARMA':  { underlying: 'SUNPHARMA',  exchange: 'NSE', instrumentType: 'STOCK', weeklyExpiryDay: null, monthlyExpiryDay: 4, lotSize: 700,  tickSize: 0.05, strikeInterval: 10,  spanMarginPct: 13, upstoxPrefix: 'NSE_FO|' },
  'WIPRO':      { underlying: 'WIPRO',      exchange: 'NSE', instrumentType: 'STOCK', weeklyExpiryDay: null, monthlyExpiryDay: 4, lotSize: 1500, tickSize: 0.05, strikeInterval: 5,   spanMarginPct: 12, upstoxPrefix: 'NSE_FO|' },
  'HCLTECH':    { underlying: 'HCLTECH',    exchange: 'NSE', instrumentType: 'STOCK', weeklyExpiryDay: null, monthlyExpiryDay: 4, lotSize: 700,  tickSize: 0.05, strikeInterval: 10,  spanMarginPct: 12, upstoxPrefix: 'NSE_FO|' },
  'ONGC':       { underlying: 'ONGC',       exchange: 'NSE', instrumentType: 'STOCK', weeklyExpiryDay: null, monthlyExpiryDay: 4, lotSize: 3850, tickSize: 0.05, strikeInterval: 2,   spanMarginPct: 13, upstoxPrefix: 'NSE_FO|' },
  'POWERGRID':  { underlying: 'POWERGRID',  exchange: 'NSE', instrumentType: 'STOCK', weeklyExpiryDay: null, monthlyExpiryDay: 4, lotSize: 4700, tickSize: 0.05, strikeInterval: 2,   spanMarginPct: 12, upstoxPrefix: 'NSE_FO|' },
  'NTPC':       { underlying: 'NTPC',       exchange: 'NSE', instrumentType: 'STOCK', weeklyExpiryDay: null, monthlyExpiryDay: 4, lotSize: 3675, tickSize: 0.05, strikeInterval: 2,   spanMarginPct: 12, upstoxPrefix: 'NSE_FO|' },
  'BHARTIARTL': { underlying: 'BHARTIARTL', exchange: 'NSE', instrumentType: 'STOCK', weeklyExpiryDay: null, monthlyExpiryDay: 4, lotSize: 475,  tickSize: 0.05, strikeInterval: 10,  spanMarginPct: 12, upstoxPrefix: 'NSE_FO|' },
  'ITC':        { underlying: 'ITC',        exchange: 'NSE', instrumentType: 'STOCK', weeklyExpiryDay: null, monthlyExpiryDay: 4, lotSize: 3200, tickSize: 0.05, strikeInterval: 2,   spanMarginPct: 12, upstoxPrefix: 'NSE_FO|' },
  'TATASTEEL':  { underlying: 'TATASTEEL',  exchange: 'NSE', instrumentType: 'STOCK', weeklyExpiryDay: null, monthlyExpiryDay: 4, lotSize: 5500, tickSize: 0.05, strikeInterval: 1,   spanMarginPct: 14, upstoxPrefix: 'NSE_FO|' },
  'HINDALCO':   { underlying: 'HINDALCO',   exchange: 'NSE', instrumentType: 'STOCK', weeklyExpiryDay: null, monthlyExpiryDay: 4, lotSize: 2175, tickSize: 0.05, strikeInterval: 5,   spanMarginPct: 14, upstoxPrefix: 'NSE_FO|' },
  'COALINDIA':  { underlying: 'COALINDIA',  exchange: 'NSE', instrumentType: 'STOCK', weeklyExpiryDay: null, monthlyExpiryDay: 4, lotSize: 4200, tickSize: 0.05, strikeInterval: 2,   spanMarginPct: 13, upstoxPrefix: 'NSE_FO|' },
  'BPCL':       { underlying: 'BPCL',       exchange: 'NSE', instrumentType: 'STOCK', weeklyExpiryDay: null, monthlyExpiryDay: 4, lotSize: 3000, tickSize: 0.05, strikeInterval: 2,   spanMarginPct: 13, upstoxPrefix: 'NSE_FO|' },
  'DIVISLAB':   { underlying: 'DIVISLAB',   exchange: 'NSE', instrumentType: 'STOCK', weeklyExpiryDay: null, monthlyExpiryDay: 4, lotSize: 200,  tickSize: 0.05, strikeInterval: 50,  spanMarginPct: 13, upstoxPrefix: 'NSE_FO|' },
  'DRREDDY':    { underlying: 'DRREDDY',    exchange: 'NSE', instrumentType: 'STOCK', weeklyExpiryDay: null, monthlyExpiryDay: 4, lotSize: 250,  tickSize: 0.05, strikeInterval: 50,  spanMarginPct: 13, upstoxPrefix: 'NSE_FO|' },
  'CIPLA':      { underlying: 'CIPLA',      exchange: 'NSE', instrumentType: 'STOCK', weeklyExpiryDay: null, monthlyExpiryDay: 4, lotSize: 775,  tickSize: 0.05, strikeInterval: 10,  spanMarginPct: 13, upstoxPrefix: 'NSE_FO|' },
  'HAL':        { underlying: 'HAL',        exchange: 'NSE', instrumentType: 'STOCK', weeklyExpiryDay: null, monthlyExpiryDay: 4, lotSize: 150,  tickSize: 0.05, strikeInterval: 50,  spanMarginPct: 14, upstoxPrefix: 'NSE_FO|' },
  'BEL':        { underlying: 'BEL',        exchange: 'NSE', instrumentType: 'STOCK', weeklyExpiryDay: null, monthlyExpiryDay: 4, lotSize: 2800, tickSize: 0.05, strikeInterval: 2,   spanMarginPct: 13, upstoxPrefix: 'NSE_FO|' },
  'DIXON':      { underlying: 'DIXON',      exchange: 'NSE', instrumentType: 'STOCK', weeklyExpiryDay: null, monthlyExpiryDay: 4, lotSize: 75,   tickSize: 0.05, strikeInterval: 100, spanMarginPct: 15, upstoxPrefix: 'NSE_FO|' },
  'TRENT':      { underlying: 'TRENT',      exchange: 'NSE', instrumentType: 'STOCK', weeklyExpiryDay: null, monthlyExpiryDay: 4, lotSize: 275,  tickSize: 0.05, strikeInterval: 20,  spanMarginPct: 14, upstoxPrefix: 'NSE_FO|' },
};

// ---------------------------------------------------------------------------
// Expiry generation — live, holiday-adjusted
// ---------------------------------------------------------------------------

export interface UpcomingExpiry {
  underlying: string;
  expiryDateStr: string;      // 'YYYY-MM-DD' adjusted
  expiryLabel: string;        // Human-readable with holiday note
  isWeekly: boolean;
  isMonthly: boolean;
  daysRemaining: number;
  isAdjusted: boolean;
}

/**
 * Returns the next N upcoming expiry dates for an underlying,
 * starting from today, with holiday adjustment applied.
 */
export function getUpcomingExpiries(
  underlying: string,
  count = 6
): UpcomingExpiry[] {
  const spec = FNO_CONTRACT_REGISTRY[underlying.toUpperCase()];
  if (!spec) return [];

  const results: UpcomingExpiry[] = [];
  const today = new Date();
  const cursor = new Date(today);

  // Scan the next 180 days for expiry candidates
  let scanned = 0;
  while (results.length < count && scanned < 180) {
    cursor.setDate(cursor.getDate() + 1);
    scanned++;

    const dow = cursor.getDay();
    const isWeeklyCandidate = spec.weeklyExpiryDay !== null && dow === spec.weeklyExpiryDay;
    const isMonthlyCandidate = dow === spec.monthlyExpiryDay && isLastWeekDayOfMonth(cursor, spec.monthlyExpiryDay);

    if (!isWeeklyCandidate && !isMonthlyCandidate) continue;

    const benchmark = spec.exchange === 'BSE' ? 'SENSEX' : 'NIFTY';
    const adjusted = getAdjustedExpiryDate(new Date(cursor), benchmark);

    // Avoid duplicates (same adjusted date)
    const dupe = results.some(r => r.expiryDateStr === adjusted.adjustedDateStr);
    if (dupe) continue;

    results.push({
      underlying,
      expiryDateStr: adjusted.adjustedDateStr,
      expiryLabel: adjusted.label,
      isWeekly: isWeeklyCandidate && !isMonthlyCandidate,
      isMonthly: isMonthlyCandidate,
      daysRemaining: adjusted.daysRemaining,
      isAdjusted: adjusted.isAdjusted,
    });
  }

  return results;
}

/** True if the given date is the last occurrence of its weekday in the month. */
function isLastWeekDayOfMonth(date: Date, targetDow: number): boolean {
  if (date.getDay() !== targetDow) return false;
  const nextWeek = new Date(date);
  nextWeek.setDate(date.getDate() + 7);
  return nextWeek.getMonth() !== date.getMonth();
}

// ---------------------------------------------------------------------------
// Strike selection helpers
// ---------------------------------------------------------------------------

export interface StrikeRange {
  atm: number;
  strikes: number[];           // Sorted ascending
  itmCalls: number[];          // Strikes below ATM
  otmCalls: number[];          // Strikes above ATM
  itmPuts: number[];           // Strikes above ATM
  otmPuts: number[];           // Strikes below ATM
}

/**
 * Generates a strike range centered on the ATM price.
 * depth = number of strikes on each side of ATM.
 */
export function generateStrikeRange(
  underlying: string,
  spotPrice: number,
  depth = 10
): StrikeRange {
  const spec = FNO_CONTRACT_REGISTRY[underlying.toUpperCase()];
  const interval = spec?.strikeInterval ?? 50;

  const atm = Math.round(spotPrice / interval) * interval;
  const strikes: number[] = [];

  for (let i = -depth; i <= depth; i++) {
    strikes.push(atm + i * interval);
  }

  return {
    atm,
    strikes,
    itmCalls: strikes.filter(s => s < atm),
    otmCalls: strikes.filter(s => s > atm),
    itmPuts: strikes.filter(s => s > atm),
    otmPuts: strikes.filter(s => s < atm),
  };
}

// ---------------------------------------------------------------------------
// Upstox instrument key builder
// ---------------------------------------------------------------------------

/**
 * Builds an Upstox v2 instrument key for an options contract.
 * Format: NSE_FO|<UNDERLYING><EXPIRY_DDMMMYY><STRIKE><CE/PE>
 * e.g.: NSE_FO|NIFTY26OCT2526000CE
 */
export function buildUpstoxOptionKey(
  underlying: string,
  expiryDateStr: string,     // 'YYYY-MM-DD'
  strike: number,
  optionType: 'CE' | 'PE'
): string {
  const spec = FNO_CONTRACT_REGISTRY[underlying.toUpperCase()];
  const prefix = spec?.upstoxPrefix ?? 'NSE_FO|';

  const [year, month, day] = expiryDateStr.split('-');
  const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const mon = MONTHS[parseInt(month, 10) - 1];
  const yy = year.slice(2);

  return `${prefix}${underlying.toUpperCase()}${day}${mon}${yy}${strike}${optionType}`;
}

/**
 * Builds an Upstox v2 instrument key for a futures contract.
 * Format: NSE_FO|<UNDERLYING><EXPIRY_DDMMMYY>FUT
 */
export function buildUpstoxFuturesKey(
  underlying: string,
  expiryDateStr: string     // 'YYYY-MM-DD'
): string {
  const spec = FNO_CONTRACT_REGISTRY[underlying.toUpperCase()];
  const prefix = spec?.upstoxPrefix ?? 'NSE_FO|';

  const [year, month, day] = expiryDateStr.split('-');
  const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const mon = MONTHS[parseInt(month, 10) - 1];
  const yy = year.slice(2);

  return `${prefix}${underlying.toUpperCase()}${day}${mon}${yy}FUT`;
}

// ---------------------------------------------------------------------------
// Margin estimation
// ---------------------------------------------------------------------------

export interface MarginEstimate {
  underlying: string;
  spotPrice: number;
  lots: number;
  lotSize: number;
  notionalInr: number;
  spanMarginInr: number;
  exposureMarginInr: number;
  totalMarginInr: number;
  note: string;
}

/**
 * Approximate SPAN + Exposure margin for F&O.
 * This is NOT the exact broker-computed margin. Always verify with broker API.
 */
export function estimateFnOMargin(
  underlying: string,
  spotPrice: number,
  lots: number,
  instrumentType: FnOInstrumentType,
  optionSide: 'BUY' | 'SELL' = 'BUY',
  optionPremium = 0
): MarginEstimate {
  const spec = FNO_CONTRACT_REGISTRY[underlying.toUpperCase()];
  const lotSize = spec?.lotSize ?? 1;
  const spanPct = spec?.spanMarginPct ?? 12;

  const qty = lots * lotSize;
  const notionalInr = qty * spotPrice;

  let spanMarginInr: number;
  let exposureMarginInr: number;

  if (instrumentType === 'OPT' && optionSide === 'BUY') {
    // Option buy: only premium outflow
    spanMarginInr = lots * lotSize * optionPremium;
    exposureMarginInr = 0;
  } else {
    // Futures / Option sell: SPAN + Exposure
    spanMarginInr = notionalInr * (spanPct / 100) * 0.7;     // ~70% of total = SPAN
    exposureMarginInr = notionalInr * (spanPct / 100) * 0.3; // ~30% = Exposure
  }

  return {
    underlying,
    spotPrice,
    lots,
    lotSize,
    notionalInr: Math.round(notionalInr),
    spanMarginInr: Math.round(spanMarginInr),
    exposureMarginInr: Math.round(exposureMarginInr),
    totalMarginInr: Math.round(spanMarginInr + exposureMarginInr),
    note: 'Approximate SEBI SPAN+Exposure. Verify with broker before placing real orders.',
  };
}

// ---------------------------------------------------------------------------
// Convenience exports
// ---------------------------------------------------------------------------

export function getFnOSpec(underlying: string): FnOContractSpec | null {
  return FNO_CONTRACT_REGISTRY[underlying.toUpperCase()] ?? null;
}

export function isIndexDerivative(underlying: string): boolean {
  return FNO_CONTRACT_REGISTRY[underlying.toUpperCase()]?.instrumentType === 'INDEX';
}

export function getLotSizeForFnO(underlying: string): number {
  return FNO_CONTRACT_REGISTRY[underlying.toUpperCase()]?.lotSize ?? 1;
}

export function getStrikeInterval(underlying: string): number {
  return FNO_CONTRACT_REGISTRY[underlying.toUpperCase()]?.strikeInterval ?? 50;
}

/** All underlyings available for F&O trading. */
export const ALL_FNO_UNDERLYINGS = Object.keys(FNO_CONTRACT_REGISTRY);

/** Only index derivatives. */
export const INDEX_UNDERLYINGS = ALL_FNO_UNDERLYINGS.filter(u =>
  FNO_CONTRACT_REGISTRY[u].instrumentType === 'INDEX'
);

/** Only stock derivatives. */
export const STOCK_UNDERLYINGS = ALL_FNO_UNDERLYINGS.filter(u =>
  FNO_CONTRACT_REGISTRY[u].instrumentType === 'STOCK'
);

