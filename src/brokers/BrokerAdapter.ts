/**
 * BrokerAdapter — Abstract interface for all broker integrations.
 *
 * Every broker (Upstox, Zerodha, Dhan, Paper) must implement this contract.
 * The rest of the application only depends on this interface — never on a
 * concrete broker class directly. This makes it trivial to swap or add brokers
 * without touching strategy/risk/UI code.
 *
 * Segments supported: NSE_CASH · BSE_CASH · NSE_FNO · MCX_FUTURES · MCX_OPTIONS
 */

// ---------------------------------------------------------------------------
// Shared enums & value types
// ---------------------------------------------------------------------------

export type Exchange = 'NSE' | 'BSE' | 'MCX';

export type Segment =
  | 'NSE_CASH'
  | 'BSE_CASH'
  | 'NSE_FNO'
  | 'MCX_FUTURES'
  | 'MCX_OPTIONS';

export type OrderAction = 'BUY' | 'SELL';

export type OrderType = 'MARKET' | 'LIMIT' | 'STOPLOSS_MARKET' | 'STOPLOSS_LIMIT';

/** MIS = intraday, CNC = delivery, NRML = carry-forward (F&O/MCX). */
export type ProductType = 'MIS' | 'CNC' | 'NRML';

export type OrderStatus =
  | 'PENDING'
  | 'OPEN'
  | 'PARTIAL_FILL'
  | 'FILLED'
  | 'CANCELLED'
  | 'REJECTED';

export type OptionType = 'CE' | 'PE';

// ---------------------------------------------------------------------------
// Request / Response models
// ---------------------------------------------------------------------------

/**
 * Canonical internal order request.
 * All broker adapters map this → their own wire format.
 */
export interface OrderRequest {
  /** Client-generated idempotency key (UUID v4 recommended). */
  clientOrderId: string;

  symbol: string;
  exchange: Exchange;
  segment: Segment;
  action: OrderAction;
  orderType: OrderType;
  productType: ProductType;

  /** Total units. For F&O/MCX this must be a multiple of lotSize. */
  qty: number;

  /** Required for LIMIT, STOPLOSS_LIMIT orders. Null for MARKET. */
  price: number | null;

  /** Required for STOPLOSS_MARKET / STOPLOSS_LIMIT. */
  triggerPrice: number | null;

  // F&O fields — required when segment === 'NSE_FNO'
  expiry?: string;           // 'YYYY-MM-DD'
  strike?: number;
  optionType?: OptionType;
  lotSize?: number;

  // MCX fields — required when segment === 'MCX_FUTURES' | 'MCX_OPTIONS'
  contractMonth?: string;    // e.g. 'NOV2026'

  /** Optional human-readable annotation for audit trail. */
  tag?: string;
}

export interface OrderResponse {
  orderId: string;           // Broker-assigned order ID
  clientOrderId: string;     // Echo of the request's clientOrderId
  status: OrderStatus;
  message: string;
  timestamp: string;         // ISO-8601 UTC
  brokerRaw?: unknown;       // Raw broker API response (for debugging)
}

export interface FillEvent {
  orderId: string;
  fillPrice: number;
  fillQty: number;
  remainingQty: number;
  status: OrderStatus;
  timestamp: string;
}

export interface Position {
  symbol: string;
  exchange: Exchange;
  segment: Segment;
  productType: ProductType;
  side: OrderAction;
  qty: number;
  avgPrice: number;
  ltp: number | null;       // Last traded price (null if data not available)
  unrealizedPnlInr: number | null;
  realizedPnlInr: number;
  expiry?: string;
  strike?: number;
  optionType?: OptionType;
}

export interface AccountInfo {
  userId: string;
  brokerName: string;
  isLive: boolean;
  isPaper: boolean;
  equityMarginAvailableInr: number;
  commodityMarginAvailableInr: number;
  usedMarginInr: number;
  totalMarginInr: number;
  timestamp: string;
}

export interface Quote {
  symbol: string;
  ltp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  timestamp: string;
}

export interface Candle {
  timestamp: string;   // ISO-8601
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type CandleInterval =
  | '1minute'
  | '5minute'
  | '15minute'
  | '30minute'
  | '60minute'
  | 'day';

export interface OptionChainRow {
  strike: number;
  expiry: string;
  ce: {
    ltp: number;
    iv: number;
    delta: number;
    oi: number;
    volume: number;
  } | null;
  pe: {
    ltp: number;
    iv: number;
    delta: number;
    oi: number;
    volume: number;
  } | null;
}

export interface MarginInfo {
  segment: Segment;
  available: number;
  used: number;
  total: number;
}

// ---------------------------------------------------------------------------
// Abstract broker interface
// ---------------------------------------------------------------------------

export interface BrokerAdapter {
  /** Human-readable broker name for UI display. */
  readonly brokerName: string;

  /** True if this adapter submits real orders to the exchange. */
  readonly isLive: boolean;

  /** True if this adapter is a paper/simulation mode. */
  readonly isPaper: boolean;

  /**
   * Authenticate / refresh session.
   * Must be called once on startup before any other method.
   */
  login(): Promise<void>;

  /** Fetch account balances and margin. */
  getAccount(): Promise<AccountInfo>;

  /**
   * Fetch live quotes for one or more instrument keys.
   * Key format depends on the broker (e.g. Upstox uses 'NSE_EQ|RELIANCE').
   */
  getQuotes(instrumentKeys: string[]): Promise<Record<string, Quote>>;

  /** Fetch OHLCV candles for a symbol. */
  getHistoricalBars(
    instrumentKey: string,
    interval: CandleInterval,
    fromDate: string,   // 'YYYY-MM-DD'
    toDate: string      // 'YYYY-MM-DD'
  ): Promise<Candle[]>;

  /** Fetch option chain for an underlying + expiry. */
  getOptionChain(
    underlying: string,
    expiry: string  // 'YYYY-MM-DD'
  ): Promise<OptionChainRow[]>;

  /**
   * Place an order.
   * Implementations MUST:
   *   1. Validate that isLive===true before submitting a real order.
   *   2. Log the full request and response to the audit trail.
   *   3. Return a deterministic OrderResponse regardless of network outcome.
   */
  placeOrder(order: OrderRequest): Promise<OrderResponse>;

  /** Cancel a working order. */
  cancelOrder(orderId: string): Promise<void>;

  /** Fetch the current fill status of an order. */
  getOrderStatus(orderId: string): Promise<OrderResponse>;

  /** Fetch all open positions. */
  getPositions(): Promise<Position[]>;

  /** Fetch available margin for a segment. */
  getMargin(segment: Segment): Promise<MarginInfo>;
}

// ---------------------------------------------------------------------------
// Helper — generate a client order ID
// ---------------------------------------------------------------------------

/** Generates a unique client order ID. Format: COI-<timestamp>-<random 4 hex chars> */
export function generateClientOrderId(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rnd = Math.floor(Math.random() * 0xffff).toString(16).toUpperCase().padStart(4, '0');
  return `COI-${ts}-${rnd}`;
}
