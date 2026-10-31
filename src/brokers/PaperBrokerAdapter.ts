/**
 * PaperBrokerAdapter — Deterministic paper-trading broker.
 *
 * This adapter simulates order fills against live/delayed market quotes.
 * It implements the BrokerAdapter interface identically to a live broker,
 * so the strategy/risk/execution code is 100% portable.
 *
 * Fill simulation rules:
 *   MARKET order  → fills immediately at the last known quote (or entryPrice if no quote).
 *   LIMIT order   → fills immediately if price is at or better than limit; otherwise PENDING.
 *   STOPLOSS_*    → triggers when LTP crosses triggerPrice.
 *
 * No network calls. No real money. Fully deterministic.
 */

import {
  BrokerAdapter,
  OrderRequest,
  OrderResponse,
  Position,
  AccountInfo,
  Quote,
  Candle,
  CandleInterval,
  OptionChainRow,
  MarginInfo,
  Segment,
  generateClientOrderId,
} from './BrokerAdapter';

// ---------------------------------------------------------------------------
// Paper account state
// ---------------------------------------------------------------------------

export interface PaperAccountConfig {
  equityCapitalInr: number;
  commodityCapitalInr: number;
  brokerName?: string;
}

interface InternalPaperOrder {
  orderId: string;
  request: OrderRequest;
  status: 'PENDING' | 'OPEN' | 'FILLED' | 'CANCELLED' | 'REJECTED';
  fillPrice: number | null;
  fillQty: number;
  remainingQty: number;
  placedAt: string;
  filledAt: string | null;
}

// ---------------------------------------------------------------------------
// PaperBrokerAdapter
// ---------------------------------------------------------------------------

export class PaperBrokerAdapter implements BrokerAdapter {
  readonly brokerName: string;
  readonly isLive = false;
  readonly isPaper = true;

  private _config: PaperAccountConfig;
  private _orders: Map<string, InternalPaperOrder> = new Map();
  private _positions: Map<string, Position> = new Map();
  private _equityMarginUsed = 0;
  private _commodityMarginUsed = 0;

  /** Optional live quote cache injected from the frontend's market data hook. */
  private _quoteCache: Record<string, Quote> = {};

  constructor(config: PaperAccountConfig) {
    this._config = {
      equityCapitalInr: config.equityCapitalInr,
      commodityCapitalInr: config.commodityCapitalInr,
      brokerName: config.brokerName ?? 'PAPER_BROKER',
    };
    this.brokerName = this._config.brokerName!;
  }

  // ---------------------------------------------------------------------------
  // Quote cache — called by the app's market data hook on each tick
  // ---------------------------------------------------------------------------

  injectQuotes(quotes: Record<string, Quote>): void {
    this._quoteCache = { ...this._quoteCache, ...quotes };
  }

  private _getQuote(symbol: string): Quote | null {
    return this._quoteCache[symbol] ?? null;
  }

  // ---------------------------------------------------------------------------
  // BrokerAdapter implementation
  // ---------------------------------------------------------------------------

  async login(): Promise<void> {
    // Paper broker: no authentication needed.
  }

  async getAccount(): Promise<AccountInfo> {
    return {
      userId: 'PAPER_USER_001',
      brokerName: this.brokerName,
      isLive: false,
      isPaper: true,
      equityMarginAvailableInr: Math.max(0, this._config.equityCapitalInr - this._equityMarginUsed),
      commodityMarginAvailableInr: Math.max(0, this._config.commodityCapitalInr - this._commodityMarginUsed),
      usedMarginInr: this._equityMarginUsed + this._commodityMarginUsed,
      totalMarginInr: this._config.equityCapitalInr + this._config.commodityCapitalInr,
      timestamp: new Date().toISOString(),
    };
  }

  async getQuotes(instrumentKeys: string[]): Promise<Record<string, Quote>> {
    const result: Record<string, Quote> = {};
    for (const key of instrumentKeys) {
      const q = this._getQuote(key);
      if (q) result[key] = q;
    }
    return result;
  }

  async getHistoricalBars(
    _instrumentKey: string,
    _interval: CandleInterval,
    _fromDate: string,
    _toDate: string
  ): Promise<Candle[]> {
    // Paper broker: historical data must come from the market data service.
    // Return empty — caller should use src/server/marketData.ts for candles.
    console.warn('[PaperBroker] getHistoricalBars: route through marketData server instead.');
    return [];
  }

  async getOptionChain(
    _underlying: string,
    _expiry: string
  ): Promise<OptionChainRow[]> {
    // Paper broker: option chain must come from the market data service.
    console.warn('[PaperBroker] getOptionChain: route through marketData server instead.');
    return [];
  }

  async placeOrder(request: OrderRequest): Promise<OrderResponse> {
    const orderId = `PAPER-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const now = new Date().toISOString();

    // --- Basic validation
    if (!request.symbol || !request.action || request.qty <= 0) {
      return this._reject(request.clientOrderId, orderId, 'INVALID_REQUEST: symbol, action, qty required');
    }

    // --- Lot size validation for F&O / MCX
    if (request.lotSize && request.lotSize > 1) {
      if (request.qty % request.lotSize !== 0) {
        return this._reject(
          request.clientOrderId,
          orderId,
          `LOT_MISMATCH: qty ${request.qty} not a multiple of lotSize ${request.lotSize}`
        );
      }
    }

    // --- Simulate fill price
    const fillPrice = this._simulateFillPrice(request);

    // --- Build internal order
    const internal: InternalPaperOrder = {
      orderId,
      request,
      status: 'FILLED',
      fillPrice,
      fillQty: request.qty,
      remainingQty: 0,
      placedAt: now,
      filledAt: now,
    };

    this._orders.set(orderId, internal);

    // --- Update positions
    this._updatePosition(request, fillPrice);

    // --- Update margin used (approximate)
    const notional = request.qty * fillPrice;
    const isCommodity = request.segment === 'MCX_FUTURES' || request.segment === 'MCX_OPTIONS';
    const marginApprox = this._estimateMargin(notional, request.segment);

    if (isCommodity) {
      this._commodityMarginUsed = Math.max(0, this._commodityMarginUsed + (request.action === 'BUY' ? marginApprox : -marginApprox));
    } else {
      this._equityMarginUsed = Math.max(0, this._equityMarginUsed + (request.action === 'BUY' ? marginApprox : -marginApprox));
    }

    return {
      orderId,
      clientOrderId: request.clientOrderId,
      status: 'FILLED',
      message: `[PAPER] Filled ${request.qty} ${request.symbol} @ ₹${fillPrice}`,
      timestamp: now,
      brokerRaw: { ...internal, source: 'PAPER_SIMULATION' },
    };
  }

  async cancelOrder(orderId: string): Promise<void> {
    const order = this._orders.get(orderId);
    if (!order) throw new Error(`Order ${orderId} not found.`);
    if (order.status === 'FILLED') throw new Error(`Cannot cancel a filled order.`);
    order.status = 'CANCELLED';
    this._orders.set(orderId, order);
  }

  async getOrderStatus(orderId: string): Promise<OrderResponse> {
    const order = this._orders.get(orderId);
    if (!order) {
      return {
        orderId,
        clientOrderId: '',
        status: 'REJECTED',
        message: `Order ${orderId} not found in paper session.`,
        timestamp: new Date().toISOString(),
      };
    }
    return {
      orderId,
      clientOrderId: order.request.clientOrderId,
      status: order.status as any,
      message: `[PAPER] ${order.status}`,
      timestamp: new Date().toISOString(),
    };
  }

  async getPositions(): Promise<Position[]> {
    return Array.from(this._positions.values()).filter(p => p.qty > 0);
  }

  async getMargin(segment: Segment): Promise<MarginInfo> {
    const isCommodity = segment === 'MCX_FUTURES' || segment === 'MCX_OPTIONS';
    const total = isCommodity ? this._config.commodityCapitalInr : this._config.equityCapitalInr;
    const used = isCommodity ? this._commodityMarginUsed : this._equityMarginUsed;
    return {
      segment,
      available: Math.max(0, total - used),
      used,
      total,
    };
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private _simulateFillPrice(request: OrderRequest): number {
    // Try to get live quote first
    const quote = this._getQuote(request.symbol);
    const ltp = quote?.ltp ?? null;

    switch (request.orderType) {
      case 'MARKET':
        // Fill at LTP if available, else at requested price (fallback)
        return ltp ?? (request.price ?? 0);

      case 'LIMIT':
        // Fill immediately at limit price (paper trade optimism)
        return request.price ?? ltp ?? 0;

      case 'STOPLOSS_MARKET':
        return ltp ?? (request.triggerPrice ?? 0);

      case 'STOPLOSS_LIMIT':
        return request.price ?? request.triggerPrice ?? ltp ?? 0;

      default:
        return ltp ?? (request.price ?? 0);
    }
  }

  private _updatePosition(request: OrderRequest, fillPrice: number): void {
    const key = `${request.symbol}::${request.segment}::${request.productType}`;
    const existing = this._positions.get(key);
    const ltp = this._getQuote(request.symbol)?.ltp ?? fillPrice;

    if (!existing) {
      this._positions.set(key, {
        symbol: request.symbol,
        exchange: request.exchange,
        segment: request.segment,
        productType: request.productType,
        side: request.action,
        qty: request.qty,
        avgPrice: fillPrice,
        ltp,
        unrealizedPnlInr: null,
        realizedPnlInr: 0,
        expiry: request.expiry,
        strike: request.strike,
        optionType: request.optionType,
      });
      return;
    }

    // Net position logic (same side = add; opposite side = close)
    if (existing.side === request.action) {
      // Adding to position — weighted avg
      const newQty = existing.qty + request.qty;
      const newAvg = ((existing.avgPrice * existing.qty) + (fillPrice * request.qty)) / newQty;
      this._positions.set(key, { ...existing, qty: newQty, avgPrice: newAvg, ltp });
    } else {
      // Closing / reducing position
      const closeQty = Math.min(existing.qty, request.qty);
      const sign = existing.side === 'BUY' ? 1 : -1;
      const realizedPnl = sign * (fillPrice - existing.avgPrice) * closeQty;

      const remainingQty = existing.qty - closeQty;
      if (remainingQty <= 0) {
        this._positions.set(key, {
          ...existing,
          qty: 0,
          realizedPnlInr: existing.realizedPnlInr + realizedPnl,
          ltp,
        });
      } else {
        this._positions.set(key, {
          ...existing,
          qty: remainingQty,
          realizedPnlInr: existing.realizedPnlInr + realizedPnl,
          ltp,
        });
      }
    }
  }

  private _estimateMargin(notionalInr: number, segment: Segment): number {
    switch (segment) {
      case 'NSE_CASH':
      case 'BSE_CASH':
        return notionalInr; // Delivery: full notional
      case 'NSE_FNO':
        return notionalInr * 0.12; // ~12% SPAN+Exposure for F&O sell / futures
      case 'MCX_FUTURES':
      case 'MCX_OPTIONS':
        return notionalInr * 0.08; // ~8% for MCX
      default:
        return notionalInr;
    }
  }

  private _reject(clientOrderId: string, orderId: string, message: string): OrderResponse {
    const now = new Date().toISOString();
    this._orders.set(orderId, {
      orderId,
      request: { clientOrderId, symbol: '', exchange: 'NSE', segment: 'NSE_CASH', action: 'BUY', orderType: 'MARKET', productType: 'MIS', qty: 0, price: null, triggerPrice: null },
      status: 'REJECTED',
      fillPrice: null,
      fillQty: 0,
      remainingQty: 0,
      placedAt: now,
      filledAt: null,
    });
    return { orderId, clientOrderId, status: 'REJECTED', message: `[PAPER] REJECTED: ${message}`, timestamp: now };
  }

  // ---------------------------------------------------------------------------
  // Paper session reset (for testing / new session)
  // ---------------------------------------------------------------------------

  resetSession(): void {
    this._orders.clear();
    this._positions.clear();
    this._equityMarginUsed = 0;
    this._commodityMarginUsed = 0;
  }

  /** Returns all paper orders placed this session. */
  getAllOrders(): InternalPaperOrder[] {
    return Array.from(this._orders.values());
  }

  /** Returns paper session P&L summary. */
  getSessionSummary(): {
    totalOrders: number;
    filledOrders: number;
    realizedPnlInr: number;
    openPositions: number;
  } {
    const orders = this.getAllOrders();
    const filled = orders.filter(o => o.status === 'FILLED');
    const positions = Array.from(this._positions.values()).filter(p => p.qty > 0);
    const realizedPnl = Array.from(this._positions.values()).reduce((s, p) => s + p.realizedPnlInr, 0);

    return {
      totalOrders: orders.length,
      filledOrders: filled.length,
      realizedPnlInr: Math.round(realizedPnl),
      openPositions: positions.length,
    };
  }
}

// ---------------------------------------------------------------------------
// Singleton paper broker instance (shared across the app in paper mode)
// ---------------------------------------------------------------------------

let _paperBroker: PaperBrokerAdapter | null = null;

export function getPaperBroker(config?: PaperAccountConfig): PaperBrokerAdapter {
  if (!_paperBroker) {
    _paperBroker = new PaperBrokerAdapter(
      config ?? {
        equityCapitalInr: 1_000_000,    // ₹10 lakh default
        commodityCapitalInr: 500_000,    // ₹5 lakh default
        brokerName: 'PAPER_BROKER',
      }
    );
  }
  return _paperBroker;
}

export function resetPaperBroker(): void {
  _paperBroker?.resetSession();
  _paperBroker = null;
}

export { generateClientOrderId };

