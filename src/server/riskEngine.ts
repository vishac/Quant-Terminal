// Guarded Risk Engine (Phase 3 foundation).
// Pure in-memory, single-operator. Enforces a kill-switch, daily-loss limit,
// position/notional/lot limits, and an APPROXIMATE SEBI-style margin check
// BEFORE any (currently SANDBOX-only) order is accepted. No real capital is ever
// at risk here — this layer is the guard that must pass before Phase-3 go-live.

export type ProductType = 'EQ_DELIVERY' | 'EQ_INTRADAY' | 'FNO_OPT_BUY' | 'FNO_OPT_SELL' | 'FNO_FUT';
export type Side = 'BUY' | 'SELL';

export interface RiskConfig {
  capitalInr: number;              // total trading capital / available margin
  maxDailyLossInr: number;         // auto-trips kill-switch when breached
  maxOpenPositions: number;
  maxOrderNotionalInr: number;     // per-order underlying exposure cap
  maxPositionNotionalInr: number;  // per-symbol aggregate exposure cap
  maxLotsPerOrder: number;
  equityIntradayMarginPct: number; // e.g. 20 => 20% of notional
  fnoSpanExposurePct: number;      // approx SPAN+Exposure for FNO sell/futures, e.g. 12 => 12%
}

export interface SandboxPosition {
  id: string;
  symbol: string;
  side: Side;
  productType: ProductType;
  qty: number;
  price: number;
  notionalInr: number;
  marginUsedInr: number;
  openedAt: string;
  isSimulation: true;
}

export interface RiskState {
  killSwitchActive: boolean;
  killSwitchReason: string | null;
  dayRealizedPnlInr: number;
  openPositions: SandboxPosition[];
  marginUsedInr: number;
  marginAvailableInr: number;
  updatedAt: string;
}

export interface PreTradeOrder {
  symbol: string;
  side: Side;
  productType: ProductType;
  lots?: number;
  qty: number;               // total units (shares, or lots*lotSize for FNO)
  price: number;             // per-unit price; for options this is the premium
  underlyingNotionalInr?: number; // required for FNO sell/futures margin accuracy
}

export interface EvaluateResult {
  allowed: boolean;
  violations: string[];
  warnings: string[];
  notionalInr: number;
  marginRequiredInr: number;
  marginAvailableInr: number;
  marginNote: string;
}

const DEFAULT_CONFIG: RiskConfig = {
  capitalInr: 1_000_000,
  maxDailyLossInr: 25_000,
  maxOpenPositions: 5,
  maxOrderNotionalInr: 2_000_000,
  maxPositionNotionalInr: 3_000_000,
  maxLotsPerOrder: 20,
  equityIntradayMarginPct: 20,
  fnoSpanExposurePct: 12,
};

let config: RiskConfig = { ...DEFAULT_CONFIG };
let state: RiskState = {
  killSwitchActive: false,
  killSwitchReason: null,
  dayRealizedPnlInr: 0,
  openPositions: [],
  marginUsedInr: 0,
  marginAvailableInr: DEFAULT_CONFIG.capitalInr,
  updatedAt: new Date().toISOString(),
};

function recompute() {
  state.marginUsedInr = state.openPositions.reduce((s, p) => s + p.marginUsedInr, 0);
  state.marginAvailableInr = Math.max(0, config.capitalInr - state.marginUsedInr);
  state.updatedAt = new Date().toISOString();
}

export function getRiskConfig(): RiskConfig {
  return { ...config };
}

export function setRiskConfig(partial: Partial<RiskConfig>): RiskConfig {
  const numericKeys: (keyof RiskConfig)[] = [
    'capitalInr', 'maxDailyLossInr', 'maxOpenPositions', 'maxOrderNotionalInr',
    'maxPositionNotionalInr', 'maxLotsPerOrder', 'equityIntradayMarginPct', 'fnoSpanExposurePct',
  ];
  for (const k of numericKeys) {
    if (partial[k] !== undefined) {
      const v = Number(partial[k]);
      if (!isFinite(v) || v < 0) throw new Error(`${k} must be a non-negative number.`);
      (config as any)[k] = v;
    }
  }
  recompute();
  return { ...config };
}

export function getRiskState(): RiskState {
  recompute();
  return JSON.parse(JSON.stringify(state));
}

export function setKillSwitch(active: boolean, reason: string | null): RiskState {
  state.killSwitchActive = active;
  state.killSwitchReason = active ? (reason || 'Manually armed by operator') : null;
  state.updatedAt = new Date().toISOString();
  return getRiskState();
}

export function setDayPnl(pnl: number): RiskState {
  state.dayRealizedPnlInr = Number(pnl) || 0;
  if (state.dayRealizedPnlInr <= -config.maxDailyLossInr && !state.killSwitchActive) {
    setKillSwitch(true, `Daily loss limit breached (₹${Math.abs(state.dayRealizedPnlInr).toLocaleString('en-IN')} ≥ ₹${config.maxDailyLossInr.toLocaleString('en-IN')})`);
  }
  return getRiskState();
}

function computeMargin(order: PreTradeOrder): { notionalInr: number; marginRequiredInr: number; marginNote: string } {
  const premiumOrPrice = order.price * order.qty;
  const underlying = order.underlyingNotionalInr && order.underlyingNotionalInr > 0 ? order.underlyingNotionalInr : premiumOrPrice;
  switch (order.productType) {
    case 'EQ_DELIVERY':
      return { notionalInr: premiumOrPrice, marginRequiredInr: premiumOrPrice, marginNote: 'Equity delivery: 100% of value.' };
    case 'EQ_INTRADAY':
      return { notionalInr: premiumOrPrice, marginRequiredInr: premiumOrPrice * (config.equityIntradayMarginPct / 100), marginNote: `Equity intraday: ${config.equityIntradayMarginPct}% of value (approx).` };
    case 'FNO_OPT_BUY':
      return { notionalInr: underlying, marginRequiredInr: premiumOrPrice, marginNote: 'Option buy: full premium outflow.' };
    case 'FNO_OPT_SELL':
      return { notionalInr: underlying, marginRequiredInr: underlying * (config.fnoSpanExposurePct / 100), marginNote: `Option sell: ~${config.fnoSpanExposurePct}% SPAN+Exposure of underlying notional (approx, not broker-exact).` };
    case 'FNO_FUT':
      return { notionalInr: underlying, marginRequiredInr: underlying * (config.fnoSpanExposurePct / 100), marginNote: `Futures: ~${config.fnoSpanExposurePct}% SPAN+Exposure of notional (approx, not broker-exact).` };
    default:
      return { notionalInr: premiumOrPrice, marginRequiredInr: premiumOrPrice, marginNote: 'Unknown product; full value held.' };
  }
}

export function evaluateOrder(order: PreTradeOrder): EvaluateResult {
  const violations: string[] = [];
  const warnings: string[] = [];

  if (!order || !order.symbol || !order.side || !order.productType) {
    throw new Error('order requires symbol, side and productType.');
  }
  if (!(order.qty > 0) || !(order.price > 0)) {
    throw new Error('order requires positive qty and price.');
  }

  const { notionalInr, marginRequiredInr, marginNote } = computeMargin(order);
  recompute();
  const marginAvailableInr = state.marginAvailableInr;

  if (state.killSwitchActive) {
    violations.push(`KILL-SWITCH ACTIVE — all order routing blocked. ${state.killSwitchReason || ''}`.trim());
  }
  if (state.dayRealizedPnlInr <= -config.maxDailyLossInr) {
    violations.push(`Daily loss limit reached (₹${Math.abs(state.dayRealizedPnlInr).toLocaleString('en-IN')} ≥ ₹${config.maxDailyLossInr.toLocaleString('en-IN')}).`);
  }
  if (order.lots !== undefined && order.lots > config.maxLotsPerOrder) {
    violations.push(`Lots ${order.lots} exceed max ${config.maxLotsPerOrder} per order.`);
  }
  if (notionalInr > config.maxOrderNotionalInr) {
    violations.push(`Order notional ₹${Math.round(notionalInr).toLocaleString('en-IN')} exceeds per-order cap ₹${config.maxOrderNotionalInr.toLocaleString('en-IN')}.`);
  }
  const existingForSymbol = state.openPositions.filter(p => p.symbol === order.symbol).reduce((s, p) => s + p.notionalInr, 0);
  if (existingForSymbol + notionalInr > config.maxPositionNotionalInr) {
    violations.push(`Aggregate ${order.symbol} notional ₹${Math.round(existingForSymbol + notionalInr).toLocaleString('en-IN')} exceeds per-symbol cap ₹${config.maxPositionNotionalInr.toLocaleString('en-IN')}.`);
  }
  const isNewSymbol = !state.openPositions.some(p => p.symbol === order.symbol);
  if (isNewSymbol && state.openPositions.length >= config.maxOpenPositions) {
    violations.push(`Max open positions (${config.maxOpenPositions}) reached.`);
  }
  if (marginRequiredInr > marginAvailableInr) {
    violations.push(`Margin required ₹${Math.round(marginRequiredInr).toLocaleString('en-IN')} exceeds available ₹${Math.round(marginAvailableInr).toLocaleString('en-IN')}.`);
  }
  if (order.productType.startsWith('FNO') && !(order.underlyingNotionalInr && order.underlyingNotionalInr > 0)) {
    warnings.push('No underlyingNotionalInr supplied for an F&O order — margin is a rough approximation.');
  }

  return {
    allowed: violations.length === 0,
    violations,
    warnings,
    notionalInr: Math.round(notionalInr),
    marginRequiredInr: Math.round(marginRequiredInr),
    marginAvailableInr: Math.round(marginAvailableInr),
    marginNote: marginNote + ' Approximate SEBI-style margin — verify with your broker before any real order.',
  };
}

let sandboxOrders: Array<PreTradeOrder & { id: string; placedAt: string; result: EvaluateResult; status: 'ACCEPTED' | 'REJECTED' }> = [];

export function placeSandboxOrder(order: PreTradeOrder): EvaluateResult & { orderId: string; status: 'ACCEPTED' | 'REJECTED' } {
  const result = evaluateOrder(order);
  const id = `SBX-${Date.now().toString().slice(-7)}`;
  const status: 'ACCEPTED' | 'REJECTED' = result.allowed ? 'ACCEPTED' : 'REJECTED';
  sandboxOrders.unshift({ ...order, id, placedAt: new Date().toISOString(), result, status });

  if (result.allowed) {
    state.openPositions.push({
      id,
      symbol: order.symbol,
      side: order.side,
      productType: order.productType,
      qty: order.qty,
      price: order.price,
      notionalInr: result.notionalInr,
      marginUsedInr: result.marginRequiredInr,
      openedAt: new Date().toISOString(),
      isSimulation: true,
    });
    recompute();
  }
  return { ...result, orderId: id, status };
}

export function getSandboxOrders() {
  return { orders: sandboxOrders.slice(0, 50), positions: getRiskState().openPositions };
}

export function resetSandbox() {
  sandboxOrders = [];
  state.openPositions = [];
  state.dayRealizedPnlInr = 0;
  state.killSwitchActive = false;
  state.killSwitchReason = null;
  recompute();
}
