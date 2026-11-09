/**
 * positionSizer.ts — Deterministic, lot-aware position sizing for Indian markets.
 *
 * Supports:
 *   • NSE/BSE Cash Equity  — quantity in shares
 *   • NSE F&O              — quantity in lots (must be integer multiple of lotSize)
 *   • MCX Futures          — quantity in lots
 *
 * Every calculation is fully transparent: the output includes all intermediate
 * values so the UI can display the exact risk math to the user.
 *
 * There is NO AI or stochastic logic here. Given the same inputs this function
 * always produces the same output.
 */

import type { Segment } from '../brokers/BrokerAdapter.ts';

// ---------------------------------------------------------------------------
// Input / output types
// ---------------------------------------------------------------------------

export interface SizingInput {
  /** Total trading capital available (INR). */
  capitalInr: number;

  /**
   * Maximum percentage of capital to risk on this single trade.
   * E.g. 1.5 means "risk at most 1.5% of capital".
   * Hard-capped at MAX_RISK_PCT_PER_TRADE internally.
   */
  riskPct: number;

  /** Entry price per unit / per lot for F&O/MCX. */
  entryPrice: number;

  /**
   * Stop-loss price per unit.
   * For options: stop-loss on the premium (not underlying price).
   */
  stopLossPrice: number;

  segment: Segment;

  /**
   * Required for NSE_FNO and MCX_FUTURES/MCX_OPTIONS.
   * Cash equity lots default to 1 (i.e. qty = shares).
   */
  lotSize?: number;

  /**
   * Max lots per order hard cap (from riskEngine config).
   * Defaults to 20.
   */
  maxLotsPerOrder?: number;

  /**
   * Max notional per order hard cap (from riskEngine config, INR).
   * Defaults to 20,00,000.
   */
  maxOrderNotionalInr?: number;
}

export interface SizingOutput {
  /** Whether sizing produced a valid non-zero quantity. */
  isValid: boolean;

  /** Human-readable rejection reason if isValid === false. */
  rejectionReason: string | null;

  /** Total units (shares for cash, lots×lotSize for F&O/MCX). */
  qty: number;

  /** Number of lots (1 for cash equity). */
  lots: number;

  /** Effective lot size used (1 for cash equity). */
  lotSizeUsed: number;

  /** Notional value of the order (qty × entryPrice, INR). */
  notionalInr: number;

  /** Maximum INR at risk (qty × |entryPrice - stopLossPrice|). */
  riskAmountInr: number;

  /** Effective risk percentage of capital after rounding. */
  effectiveRiskPct: number;

  /** Price distance per unit between entry and stop-loss. */
  priceDistance: number;

  /** Capital allocated (notional for delivery; margin approx for F&O). */
  capitalAllocatedInr: number;

  /** Warnings to surface in the UI (non-fatal). */
  warnings: string[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Hard ceiling on risk per trade as a fraction of capital. */
const MAX_RISK_PCT_PER_TRADE = 2.0;

/** Minimum price distance to avoid division explosions. */
const MIN_PRICE_DISTANCE = 0.01;

// ---------------------------------------------------------------------------
// Core sizing function
// ---------------------------------------------------------------------------

export function calculatePositionSize(input: SizingInput): SizingOutput {
  const warnings: string[] = [];

  // --- Guard: capital
  if (!input.capitalInr || input.capitalInr <= 0) {
    return invalid('Capital must be a positive number.');
  }

  // --- Guard: entry price
  if (!input.entryPrice || input.entryPrice <= 0) {
    return invalid('Entry price must be a positive number.');
  }

  // --- Guard: stop-loss price
  if (!input.stopLossPrice || input.stopLossPrice <= 0) {
    return invalid('Stop-loss price must be a positive number.');
  }

  if (input.stopLossPrice === input.entryPrice) {
    return invalid('Stop-loss price cannot equal entry price (zero risk distance).');
  }

  // --- Clamp risk pct
  const rawRiskPct = Math.max(0.01, Math.min(MAX_RISK_PCT_PER_TRADE, input.riskPct));
  if (input.riskPct > MAX_RISK_PCT_PER_TRADE) {
    warnings.push(`Risk % clamped from ${input.riskPct}% to ${MAX_RISK_PCT_PER_TRADE}% (max per-trade limit).`);
  }

  // --- Lot size
  const isCash = input.segment === 'NSE_CASH' || input.segment === 'BSE_CASH';
  const lotSize = isCash ? 1 : Math.max(1, Math.round(input.lotSize ?? 1));
  const maxLots = input.maxLotsPerOrder ?? 20;
  const maxNotional = input.maxOrderNotionalInr ?? 2_000_000;

  // --- Price distance
  const priceDistance = Math.max(MIN_PRICE_DISTANCE, Math.abs(input.entryPrice - input.stopLossPrice));

  // --- Max risk amount in INR
  const maxRiskInr = (rawRiskPct / 100) * input.capitalInr;

  // --- Raw quantity (in shares / units)
  const rawQty = maxRiskInr / priceDistance;

  // --- Round down to nearest lot (NEVER force 1 lot if 1 lot exceeds maxRiskInr)
  const rawLots = rawQty / lotSize;
  let lots = Math.floor(rawLots);

  if (lots < 1) {
    const oneLotRiskInr = lotSize * priceDistance;
    const oneLotRiskPct = (oneLotRiskInr / input.capitalInr) * 100;
    return invalid(
      `1 lot (${lotSize} units) risks ₹${Math.round(oneLotRiskInr).toLocaleString('en-IN')} (${oneLotRiskPct.toFixed(2)}% of capital), which exceeds your max risk cap of ₹${Math.round(maxRiskInr).toLocaleString('en-IN')} (${rawRiskPct}%). Increase capital or tighten stop-loss.`
    );
  }

  // --- Cap at maxLotsPerOrder
  if (lots > maxLots) {
    warnings.push(`Lots capped from ${lots} to ${maxLots} (max lots per order limit).`);
    lots = maxLots;
  }

  const qty = lots * lotSize;
  const notionalInr = qty * input.entryPrice;

  // --- Cap at maxOrderNotionalInr (NEVER force 1 lot if 1 lot exceeds maxNotional)
  if (notionalInr > maxNotional) {
    const capped = Math.floor(maxNotional / (input.entryPrice * lotSize));
    if (capped < 1) {
      const oneLotNotional = lotSize * input.entryPrice;
      return invalid(
        `1 lot (${lotSize} units) notional ₹${Math.round(oneLotNotional).toLocaleString('en-IN')} exceeds max order notional cap ₹${maxNotional.toLocaleString('en-IN')}.`
      );
    }
    warnings.push(
      `Lots reduced from ${lots} to ${capped} — notional ₹${Math.round(notionalInr).toLocaleString('en-IN')} exceeded cap ₹${maxNotional.toLocaleString('en-IN')}.`
    );
    lots = capped;
  }

  const finalQty = lots * lotSize;
  const finalNotional = finalQty * input.entryPrice;
  const riskAmountInr = finalQty * priceDistance;
  const effectiveRiskPct = (riskAmountInr / input.capitalInr) * 100;

  // --- Capital allocated estimate
  // Delivery: full notional | Intraday cash: ~20% | F&O buy: premium | F&O sell: ~12% notional
  let capitalAllocatedInr: number;
  switch (input.segment) {
    case 'NSE_CASH':
    case 'BSE_CASH':
      capitalAllocatedInr = finalNotional; // conservative: full delivery
      break;
    case 'NSE_FNO':
      capitalAllocatedInr = finalQty * input.entryPrice; // premium (buy-side)
      break;
    case 'MCX_FUTURES':
    case 'MCX_OPTIONS':
      capitalAllocatedInr = finalNotional * 0.08; // ~8% SPAN approx for MCX
      break;
    default:
      capitalAllocatedInr = finalNotional;
  }

  return {
    isValid: true,
    rejectionReason: null,
    qty: finalQty,
    lots,
    lotSizeUsed: lotSize,
    notionalInr: Math.round(finalNotional),
    riskAmountInr: Math.round(riskAmountInr),
    effectiveRiskPct: Math.round(effectiveRiskPct * 100) / 100,
    priceDistance: Math.round(priceDistance * 100) / 100,
    capitalAllocatedInr: Math.round(capitalAllocatedInr),
    warnings,
  };
}

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function invalid(reason: string): SizingOutput {
  return {
    isValid: false,
    rejectionReason: reason,
    qty: 0,
    lots: 0,
    lotSizeUsed: 1,
    notionalInr: 0,
    riskAmountInr: 0,
    effectiveRiskPct: 0,
    priceDistance: 0,
    capitalAllocatedInr: 0,
    warnings: [],
  };
}

// ---------------------------------------------------------------------------
// Convenience: validate that qty is a valid multiple of lotSize
// ---------------------------------------------------------------------------

export function validateLotMultiple(qty: number, lotSize: number): { valid: boolean; message: string } {
  if (lotSize <= 1) return { valid: true, message: '' };
  if (qty % lotSize !== 0) {
    return {
      valid: false,
      message: `Qty ${qty} is not a valid multiple of lot size ${lotSize}. Nearest valid quantities: ${Math.floor(qty / lotSize) * lotSize} or ${Math.ceil(qty / lotSize) * lotSize}.`,
    };
  }
  return { valid: true, message: '' };
}

// ---------------------------------------------------------------------------
// Lot size registry for common NSE F&O instruments (2026)
// ---------------------------------------------------------------------------

const NSE_LOT_SIZES: Record<string, number> = {
  'NIFTY': 75,
  'BANKNIFTY': 35,
  'FINNIFTY': 65,
  'MIDCPNIFTY': 120,
  'SENSEX': 20,
  'BANKEX': 20,
  'RELIANCE': 250,
  'TCS': 175,
  'INFY': 300,
  'HDFCBANK': 550,
  'ICICIBANK': 700,
  'SBIN': 1500,
  'AXISBANK': 1200,
  'KOTAKBANK': 400,
  'ITC': 3200,
  'BAJFINANCE': 125,
  'HINDUNILVR': 300,
  'LT': 175,
  'ADANIPORTS': 625,
  'TATAMOTORS': 1425,
  'MARUTI': 25,
  'SUNPHARMA': 700,
  'WIPRO': 1500,
  'HCLTECH': 700,
  'ONGC': 3850,
  'POWERGRID': 4700,
  'NTPC': 3675,
  'BHARTIARTL': 475,
  'M&M': 350,
  'TATASTEEL': 5500,
  'JSWSTEEL': 1350,
  'HINDALCO': 2175,
  'COALINDIA': 4200,
  'BPCL': 3000,
  'DIVISLAB': 200,
  'DRREDDY': 250,
  'CIPLA': 775,
};

const MCX_LOT_SIZES: Record<string, number> = {
  'GOLD': 1,
  'GOLDM': 10,
  'GOLDPETAL': 100,
  'SILVER': 30,
  'SILVERM': 5,
  'SILVERMIC': 1,
  'CRUDEOIL': 100,
  'CRUDEOILM': 10,
  'NATURALGAS': 1250,
  'NATURALGASM': 250,
  'COPPER': 2500,
  'ZINC': 5000,
  'LEAD': 5000,
  'ALUMINIUM': 5000,
  'NICKEL': 1500,
  'MENTHAOIL': 360,
  'COTTON': 4,
};

export function getLotSize(symbol: string, segment: Segment): number {
  const upper = symbol.toUpperCase();
  if (segment === 'NSE_FNO') {
    return NSE_LOT_SIZES[upper] ?? 1;
  }
  if (segment === 'MCX_FUTURES' || segment === 'MCX_OPTIONS') {
    return MCX_LOT_SIZES[upper] ?? 1;
  }
  return 1; // Cash equity
}

