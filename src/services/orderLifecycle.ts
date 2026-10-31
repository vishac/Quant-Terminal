/**
 * OrderLifecycle — Deterministic order state machine.
 *
 * Every order in the system transitions through well-defined states.
 * No UI component may mutate order state directly — all mutations go through
 * this module's functions and are recorded in an append-only audit log.
 *
 * State machine:
 *
 *   PENDING ──────────────────────────────── REJECTED
 *      │
 *      ▼
 *     OPEN ──────── PARTIAL_FILL
 *      │                  │
 *      ├──────────────────┘
 *      ▼
 *    FILLED ──── (auto square-off on target/SL) ──── SQUARED_OFF
 *      │
 *      └──────────────────────────────────────────── CANCELLED
 */

import { OrderRequest, OrderResponse, OrderStatus } from '../brokers/BrokerAdapter';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CloseReason = 'TARGET_HIT' | 'STOP_HIT' | 'MANUAL_SQUAREOFF' | 'EXPIRY_SQUAREOFF' | 'RISK_KILL';

export interface OrderLeg {
  instrument: string;
  action: 'BUY' | 'SELL';
  qty: number;
  requestedPrice: number | null;   // null for MARKET orders
  filledPrice: number | null;      // null until filled
  filledQty: number;
  remainingQty: number;
}

export interface LiveOrder {
  /** Unique lifecycle ID (separate from broker order ID). */
  lifecycleId: string;

  /** Client order ID sent to broker. */
  clientOrderId: string;

  /** Broker-assigned order ID (null until broker acknowledges). */
  brokerOrderId: string | null;

  symbol: string;
  exchange: 'NSE' | 'BSE' | 'MCX';
  segment: 'NSE_CASH' | 'BSE_CASH' | 'NSE_FNO' | 'MCX_FUTURES' | 'MCX_OPTIONS';
  productType: 'MIS' | 'CNC' | 'NRML';
  strategyName: string;
  agentId: string;

  /** Entry leg details. */
  entryLeg: OrderLeg;

  /** Defined-risk bounds set at order creation. */
  targetPriceInr: number | null;
  stopLossPriceInr: number | null;

  /** Lot metadata for F&O / MCX. */
  lotSize: number;
  lots: number;

  /** Total notional at time of order. */
  orderNotionalInr: number;

  /** Margin blocked at time of order (from riskEngine). */
  marginBlockedInr: number;

  status: OrderStatus | 'SQUARED_OFF';

  /** ISO-8601 timestamps. */
  createdAt: string;
  openedAt: string | null;
  filledAt: string | null;
  closedAt: string | null;

  /** If closed, why. */
  closeReason: CloseReason | null;

  /** Final P&L after close. Null while open. */
  realizedPnlInr: number | null;

  /** Mark-to-market unrealized P&L while open (updated by caller). */
  unrealizedPnlInr: number | null;

  /** Tax / statutory costs (STT, exchange fee, SEBI, stamp duty, GST). */
  statutoryCostsInr: number;

  /** Full audit trail — immutable append-only log. */
  auditLog: AuditEntry[];

  /** Whether this is a paper/simulation order (never real money). */
  isSimulation: boolean;

  /** Raw broker API responses stored for debugging. */
  brokerResponses: unknown[];
}

export interface AuditEntry {
  timestamp: string;  // ISO-8601 UTC
  event: string;
  detail: string;
}

export interface SquareOffResult {
  lifecycleId: string;
  exitPrice: number;
  realizedPnlInr: number;
  closeReason: CloseReason;
  closedAt: string;
}

// ---------------------------------------------------------------------------
// Statutory cost calculator (2026 SEBI rates)
// ---------------------------------------------------------------------------

/** Approximate statutory costs per round-trip. Conservative estimate. */
export function estimateStatutoryCosts(
  notionalInr: number,
  segment: LiveOrder['segment'],
  isSell: boolean = true
): number {
  // STT / CTT rates (approx)
  const sttRate = segment.startsWith('NSE_FNO') || segment === 'MCX_FUTURES'
    ? 0.0001   // F&O options sell-side STT
    : 0.001;   // Equity delivery sell-side STT
  const stt = isSell ? notionalInr * sttRate : 0;

  // Exchange + IPFT fee (~0.0325% both legs)
  const exchange = notionalInr * 0.000325;

  // SEBI turnover fee (₹10 per crore ~ 0.000001%)
  const sebi = notionalInr * 0.000001;

  // Stamp duty on buy (0.015% equity, 0.002% F&O)
  const stampBuy = segment === 'NSE_CASH' || segment === 'BSE_CASH'
    ? notionalInr * 0.00015
    : notionalInr * 0.00002;

  // GST on exchange + SEBI + brokerage (18%)
  const brokerage = 40; // Flat ₹40 per order (conservative)
  const gst = (exchange + sebi + brokerage) * 0.18;

  return Math.round(stt + exchange + sebi + stampBuy + gst + brokerage);
}

// ---------------------------------------------------------------------------
// Lifecycle ID generator
// ---------------------------------------------------------------------------

let _seq = 0;
export function generateLifecycleId(): string {
  _seq = (_seq + 1) % 100000;
  const ts = Date.now().toString(36).toUpperCase();
  const seq = _seq.toString().padStart(5, '0');
  return `LCY-${ts}-${seq}`;
}

// ---------------------------------------------------------------------------
// Order factory — creates a clean LiveOrder from a raw order request
// ---------------------------------------------------------------------------

export function createLiveOrder(params: {
  request: OrderRequest;
  brokerResponse: OrderResponse;
  strategyName: string;
  agentId: string;
  targetPriceInr: number | null;
  stopLossPriceInr: number | null;
  lotSize: number;
  lots: number;
  marginBlockedInr: number;
  isSimulation: boolean;
}): LiveOrder {
  const now = new Date().toISOString();
  const qty = params.request.qty;
  const price = params.request.price ?? 0;
  const notional = qty * price;

  return {
    lifecycleId: generateLifecycleId(),
    clientOrderId: params.request.clientOrderId,
    brokerOrderId: params.brokerResponse.orderId || null,
    symbol: params.request.symbol,
    exchange: params.request.exchange,
    segment: params.request.segment,
    productType: params.request.productType,
    strategyName: params.strategyName,
    agentId: params.agentId,
    entryLeg: {
      instrument: params.request.symbol,
      action: params.request.action,
      qty,
      requestedPrice: params.request.price,
      filledPrice: null,
      filledQty: 0,
      remainingQty: qty,
    },
    targetPriceInr: params.targetPriceInr,
    stopLossPriceInr: params.stopLossPriceInr,
    lotSize: params.lotSize,
    lots: params.lots,
    orderNotionalInr: Math.round(notional),
    marginBlockedInr: Math.round(params.marginBlockedInr),
    status: params.brokerResponse.status,
    createdAt: now,
    openedAt: params.brokerResponse.status === 'OPEN' ? now : null,
    filledAt: null,
    closedAt: null,
    closeReason: null,
    realizedPnlInr: null,
    unrealizedPnlInr: null,
    statutoryCostsInr: estimateStatutoryCosts(notional, params.request.segment),
    auditLog: [
      {
        timestamp: now,
        event: 'ORDER_CREATED',
        detail: `${params.request.action} ${qty} ${params.request.symbol} @ ${params.request.orderType} | Broker: ${params.brokerResponse.status} | ${params.isSimulation ? 'PAPER' : 'LIVE'}`,
      },
    ],
    isSimulation: params.isSimulation,
    brokerResponses: [params.brokerResponse.brokerRaw ?? params.brokerResponse],
  };
}

// ---------------------------------------------------------------------------
// State transition functions
// ---------------------------------------------------------------------------

/** Append an audit entry (pure function — returns new order). */
export function appendAudit(order: LiveOrder, event: string, detail: string): LiveOrder {
  return {
    ...order,
    auditLog: [
      ...order.auditLog,
      { timestamp: new Date().toISOString(), event, detail },
    ],
  };
}

/** Mark order as OPEN (broker acknowledged). */
export function markOpen(order: LiveOrder, brokerOrderId: string): LiveOrder {
  const now = new Date().toISOString();
  return appendAudit(
    {
      ...order,
      status: 'OPEN',
      brokerOrderId,
      openedAt: order.openedAt ?? now,
    },
    'ORDER_OPEN',
    `Broker acknowledged order ${brokerOrderId}`
  );
}

/** Record a (partial) fill. */
export function recordFill(order: LiveOrder, fillPrice: number, fillQty: number): LiveOrder {
  const newFilledQty = order.entryLeg.filledQty + fillQty;
  const newRemainingQty = order.entryLeg.qty - newFilledQty;
  const isFull = newRemainingQty <= 0;
  const now = new Date().toISOString();

  return appendAudit(
    {
      ...order,
      status: isFull ? 'FILLED' : 'PARTIAL_FILL',
      filledAt: isFull ? now : null,
      entryLeg: {
        ...order.entryLeg,
        filledPrice: fillPrice,
        filledQty: newFilledQty,
        remainingQty: Math.max(0, newRemainingQty),
      },
    },
    isFull ? 'ORDER_FILLED' : 'PARTIAL_FILL',
    `Fill: ${fillQty} × ₹${fillPrice} | Total filled: ${newFilledQty}/${order.entryLeg.qty}`
  );
}

/** Update unrealized P&L against latest market price. Pure function. */
export function updateMTM(order: LiveOrder, ltp: number): LiveOrder {
  if (order.status !== 'OPEN' && order.status !== 'PARTIAL_FILL' && order.status !== 'FILLED') {
    return order;
  }
  const fillPrice = order.entryLeg.filledPrice ?? order.entryLeg.requestedPrice ?? 0;
  const filledQty = order.entryLeg.filledQty;
  const sign = order.entryLeg.action === 'BUY' ? 1 : -1;
  const grossPnl = sign * (ltp - fillPrice) * filledQty;
  const unrealized = Math.round(grossPnl - order.statutoryCostsInr);
  return { ...order, unrealizedPnlInr: unrealized };
}

/** Square off a filled order. Returns a SquareOffResult and the updated order. */
export function squareOff(
  order: LiveOrder,
  exitPrice: number,
  reason: CloseReason
): { order: LiveOrder; result: SquareOffResult } {
  const fillPrice = order.entryLeg.filledPrice ?? order.entryLeg.requestedPrice ?? 0;
  const qty = order.entryLeg.filledQty || order.entryLeg.qty;
  const sign = order.entryLeg.action === 'BUY' ? 1 : -1;
  const grossPnl = sign * (exitPrice - fillPrice) * qty;
  const realizedPnlInr = Math.round(grossPnl - order.statutoryCostsInr);
  const closedAt = new Date().toISOString();

  const updatedOrder = appendAudit(
    {
      ...order,
      status: 'SQUARED_OFF' as OrderStatus,
      closedAt,
      closeReason: reason,
      realizedPnlInr,
      unrealizedPnlInr: 0,
    },
    'ORDER_SQUARED_OFF',
    `Exit @ ₹${exitPrice} | Reason: ${reason} | Realized P&L: ₹${realizedPnlInr.toLocaleString('en-IN')}`
  );

  return {
    order: updatedOrder,
    result: { lifecycleId: order.lifecycleId, exitPrice, realizedPnlInr, closeReason: reason, closedAt },
  };
}

/** Mark an order as REJECTED. */
export function markRejected(order: LiveOrder, reason: string): LiveOrder {
  return appendAudit(
    { ...order, status: 'REJECTED', closedAt: new Date().toISOString() },
    'ORDER_REJECTED',
    reason
  );
}

/** Mark an order as CANCELLED. */
export function markCancelled(order: LiveOrder, reason: string): LiveOrder {
  return appendAudit(
    { ...order, status: 'CANCELLED', closedAt: new Date().toISOString() },
    'ORDER_CANCELLED',
    reason
  );
}

// ---------------------------------------------------------------------------
// Auto square-off checker — call on every price tick for open orders
// ---------------------------------------------------------------------------

export interface AutoSquareOffCheck {
  shouldSquareOff: boolean;
  reason: CloseReason | null;
}

export function checkAutoSquareOff(order: LiveOrder, ltp: number): AutoSquareOffCheck {
  if (order.status !== 'FILLED') return { shouldSquareOff: false, reason: null };

  const isBuy = order.entryLeg.action === 'BUY';

  if (order.targetPriceInr !== null) {
    const targetHit = isBuy ? ltp >= order.targetPriceInr : ltp <= order.targetPriceInr;
    if (targetHit) return { shouldSquareOff: true, reason: 'TARGET_HIT' };
  }

  if (order.stopLossPriceInr !== null) {
    const stopHit = isBuy ? ltp <= order.stopLossPriceInr : ltp >= order.stopLossPriceInr;
    if (stopHit) return { shouldSquareOff: true, reason: 'STOP_HIT' };
  }

  return { shouldSquareOff: false, reason: null };
}

// ---------------------------------------------------------------------------
// In-memory session store (replaced by persistent store in Phase 3)
// ---------------------------------------------------------------------------

let _sessionOrders: LiveOrder[] = [];

export function getSessionOrders(): LiveOrder[] {
  return [..._sessionOrders];
}

export function upsertOrder(order: LiveOrder): void {
  const idx = _sessionOrders.findIndex(o => o.lifecycleId === order.lifecycleId);
  if (idx === -1) {
    _sessionOrders = [order, ..._sessionOrders];
  } else {
    _sessionOrders = [
      ..._sessionOrders.slice(0, idx),
      order,
      ..._sessionOrders.slice(idx + 1),
    ];
  }
}

export function clearSessionOrders(): void {
  _sessionOrders = [];
}

export function getOpenOrders(): LiveOrder[] {
  return _sessionOrders.filter(
    o => o.status === 'OPEN' || o.status === 'PARTIAL_FILL' || o.status === 'FILLED'
  );
}

export function getClosedOrders(): LiveOrder[] {
  return _sessionOrders.filter(
    o => o.status === 'SQUARED_OFF' || o.status === 'CANCELLED' || o.status === 'REJECTED'
  );
}

export function getSessionPnlSummary(): {
  totalRealizedPnlInr: number;
  totalUnrealizedPnlInr: number;
  totalStatutoryCostsInr: number;
  openCount: number;
  closedCount: number;
  winCount: number;
  lossCount: number;
  winRate: number | null;
} {
  const open = getOpenOrders();
  const closed = getClosedOrders().filter(o => o.status === 'SQUARED_OFF');

  const totalRealizedPnlInr = closed.reduce((s, o) => s + (o.realizedPnlInr ?? 0), 0);
  const totalUnrealizedPnlInr = open.reduce((s, o) => s + (o.unrealizedPnlInr ?? 0), 0);
  const totalStatutoryCostsInr = _sessionOrders.reduce((s, o) => s + o.statutoryCostsInr, 0);

  const winCount = closed.filter(o => (o.realizedPnlInr ?? 0) > 0).length;
  const lossCount = closed.filter(o => (o.realizedPnlInr ?? 0) <= 0).length;
  const winRate = closed.length > 0 ? winCount / closed.length : null;

  return {
    totalRealizedPnlInr: Math.round(totalRealizedPnlInr),
    totalUnrealizedPnlInr: Math.round(totalUnrealizedPnlInr),
    totalStatutoryCostsInr: Math.round(totalStatutoryCostsInr),
    openCount: open.length,
    closedCount: closed.length,
    winCount,
    lossCount,
    winRate,
  };
}
