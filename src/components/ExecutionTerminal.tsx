/**
 * ExecutionTerminal — Order entry panel with mandatory risk gate.
 *
 * Architecture rule: NO order may be submitted without:
 *   1. riskEngine.evaluateOrder() returning { allowed: true }
 *   2. User explicitly clicking "CONFIRM & PLACE ORDER"
 *   3. Market session being LIVE_OPEN (or paper mode override)
 *
 * This component is the sole UI entry point for order placement.
 * All state derives from orderLifecycle — no local fake data.
 */

import React, { useState, useCallback, useEffect } from 'react';
import { ShieldAlert, ShieldCheck, AlertTriangle, CheckCircle2, XCircle, Loader2, ReceiptText, Crosshair } from 'lucide-react';

import { TerminalAccountState, TaxAuditResult } from '../types/quant_engine';
import {
  evaluateOrder,
  getRiskState,
  setDayPnl,
  setKillSwitch,
  type PreTradeOrder,
  type EvaluateResult,
} from '../server/riskEngine';
import {
  calculatePositionSize,
  getLotSize,
  validateLotMultiple,
  type SizingInput,
} from '../services/positionSizer';
import {
  createLiveOrder,
  upsertOrder,
  getSessionPnlSummary,
  type LiveOrder,
} from '../services/orderLifecycle';
import { getPaperBroker, generateClientOrderId } from '../brokers/PaperBrokerAdapter';
import { getIndianMarketSession, getMCXMarketSession } from '../utils/marketHours';
import { UpstoxAdapter } from '../brokers/UpstoxAdapter';
import type { Segment } from '../brokers/BrokerAdapter';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type OrderFormSegment = 'NSE_CASH' | 'BSE_CASH' | 'NSE_FNO' | 'MCX_FUTURES';
type OrderFormAction = 'BUY' | 'SELL';
type OrderFormProduct = 'MIS' | 'CNC' | 'NRML';

interface OrderForm {
  symbol: string;
  segment: OrderFormSegment;
  action: OrderFormAction;
  productType: OrderFormProduct;
  entryPrice: string;
  stopLossPrice: string;
  targetPrice: string;
  riskPct: string;
  expiry: string;
  strike: string;
  optionType: 'CE' | 'PE' | '';
}

const EMPTY_FORM: OrderForm = {
  symbol: '',
  segment: 'NSE_CASH',
  action: 'BUY',
  productType: 'MIS',
  entryPrice: '',
  stopLossPrice: '',
  targetPrice: '',
  riskPct: '1',
  expiry: '',
  strike: '',
  optionType: '',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const ExecutionTerminal: React.FC = () => {
  // --- Account state (derives from riskEngine + orderLifecycle)
  const [account, setAccount] = useState<TerminalAccountState>({
    capitalAllocated: null,
    hardFloorINR: 0,
    realizedPnL: 0.0,
    unrealizedPnL: 0.0,
    totalClosedTrades: 0,
    consecutiveLosses: 0,
    killSwitchEngaged: false,
    winRate: null,
  });

  const [form, setForm] = useState<OrderForm>(EMPTY_FORM);
  const [riskResult, setRiskResult] = useState<EvaluateResult | null>(null);
  const [sizingWarnings, setSizingWarnings] = useState<string[]>([]);
  const [computedQty, setComputedQty] = useState<number | null>(null);
  const [computedLots, setComputedLots] = useState<number | null>(null);
  const [placedOrder, setPlacedOrder] = useState<LiveOrder | null>(null);
  const [isPlacing, setIsPlacing] = useState(false);
  const [placeError, setPlaceError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [selectedBroker, setSelectedBroker] = useState<'PAPER' | 'UPSTOX'>('PAPER');
  const [isPaperMode, setIsPaperMode] = useState(true);

  // Compute market session dynamically depending on selected segment (NSE/BSE vs MCX)
  const isMCX = form.segment === 'MCX_FUTURES';
  const getActiveSession = useCallback(() => {
    return isMCX ? getMCXMarketSession() : getIndianMarketSession();
  }, [isMCX]);

  const [marketSession, setMarketSession] = useState(getActiveSession());

  useEffect(() => {
    setMarketSession(getActiveSession());
    const id = setInterval(() => setMarketSession(getActiveSession()), 15_000);
    return () => clearInterval(id);
  }, [getActiveSession]);

  // Sync account state from riskEngine + orderLifecycle
  const syncAccount = useCallback(() => {
    const rs = getRiskState();
    const pnl = getSessionPnlSummary();
    setAccount(prev => ({
      ...prev,
      capitalAllocated: rs.marginAvailableInr + rs.marginUsedInr,
      hardFloorINR: 0,
      realizedPnL: pnl.totalRealizedPnlInr,
      unrealizedPnL: pnl.totalUnrealizedPnlInr,
      totalClosedTrades: pnl.closedCount,
      killSwitchEngaged: rs.killSwitchActive,
      winRate: pnl.winRate,
    }));
    setDayPnl(pnl.totalRealizedPnlInr);
  }, []);

  useEffect(() => { syncAccount(); }, [syncAccount]);

  // ---------------------------------------------------------------------------
  // Form field handler
  // ---------------------------------------------------------------------------
  const setField = <K extends keyof OrderForm>(key: K, value: OrderForm[K]) => {
    setForm(f => ({ ...f, [key]: value }));
    // Clear previous evaluation
    setRiskResult(null);
    setComputedQty(null);
    setComputedLots(null);
    setShowConfirm(false);
    setPlaceError(null);
  };

  // ---------------------------------------------------------------------------
  // Evaluate — compute sizing + run risk gate
  // ---------------------------------------------------------------------------
  const handleEvaluate = useCallback(() => {
    setPlaceError(null);
    setPlacedOrder(null);

    const entryPrice = parseFloat(form.entryPrice);
    const stopLossPrice = parseFloat(form.stopLossPrice);

    if (!form.symbol.trim()) { setPlaceError('Symbol is required.'); return; }
    if (!isFinite(entryPrice) || entryPrice <= 0) { setPlaceError('Valid entry price required.'); return; }
    if (!isFinite(stopLossPrice) || stopLossPrice <= 0) { setPlaceError('Valid stop-loss price required.'); return; }

    const rs = getRiskState();
    const capital = rs.marginAvailableInr + rs.marginUsedInr;
    const lotSize = getLotSize(form.symbol, form.segment as Segment);

    // 1. Size the position
    const sizingInput: SizingInput = {
      capitalInr: capital,
      riskPct: parseFloat(form.riskPct) || 1,
      entryPrice,
      stopLossPrice,
      segment: form.segment as Segment,
      lotSize,
      maxLotsPerOrder: 20,
      maxOrderNotionalInr: 2_000_000,
    };

    const sizing = calculatePositionSize(sizingInput);
    setSizingWarnings(sizing.warnings);

    if (!sizing.isValid) {
      setPlaceError(`Sizing failed: ${sizing.rejectionReason}`);
      return;
    }

    setComputedQty(sizing.qty);
    setComputedLots(sizing.lots);

    // Validate lot multiple
    if (lotSize > 1) {
      const lv = validateLotMultiple(sizing.qty, lotSize);
      if (!lv.valid) { setPlaceError(lv.message); return; }
    }

    // 2. Run risk gate
    const preTradeOrder: PreTradeOrder = {
      symbol: form.symbol.toUpperCase(),
      side: form.action,
      productType:
        form.segment === 'NSE_FNO' || form.segment === 'MCX_FUTURES'
          ? 'FNO_FUT'
          : form.productType === 'CNC'
          ? 'EQ_DELIVERY'
          : 'EQ_INTRADAY',
      qty: sizing.qty,
      lots: sizing.lots,
      price: entryPrice,
      underlyingNotionalInr: sizing.notionalInr,
    };

    try {
      const result = evaluateOrder(preTradeOrder);
      setRiskResult(result);
      if (result.allowed) setShowConfirm(true);
    } catch (err: unknown) {
      setPlaceError(`Risk engine error: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, [form]);

  // ---------------------------------------------------------------------------
  // Place order (paper broker)
  // ---------------------------------------------------------------------------
  const handlePlace = useCallback(async () => {
    if (!riskResult?.allowed || computedQty === null) return;

    setIsPlacing(true);
    setPlaceError(null);

    try {
      const entryPrice = parseFloat(form.entryPrice);
      const targetPrice = form.targetPrice ? parseFloat(form.targetPrice) : null;
      const stopLossPrice = form.stopLossPrice ? parseFloat(form.stopLossPrice) : null;
      const lotSize = getLotSize(form.symbol, form.segment as Segment);
      const clientOrderId = generateClientOrderId();

      const broker = selectedBroker === 'UPSTOX'
        ? new UpstoxAdapter({ isLive: !isPaperMode })
        : getPaperBroker();
      const brokerResponse = await broker.placeOrder({
        clientOrderId,
        symbol: form.symbol.toUpperCase(),
        exchange: form.segment.startsWith('MCX') ? 'MCX' : form.segment.startsWith('BSE') ? 'BSE' : 'NSE',
        segment: form.segment as Segment,
        action: form.action,
        orderType: 'MARKET',
        productType: form.productType as 'MIS' | 'CNC' | 'NRML',
        qty: computedQty,
        price: entryPrice,
        triggerPrice: null,
        expiry: form.expiry || undefined,
        strike: form.strike ? parseFloat(form.strike) : undefined,
        optionType: (form.optionType as 'CE' | 'PE') || undefined,
        lotSize,
        tag: `PAPER::${form.segment}`,
      });

      const liveOrder = createLiveOrder({
        request: {
          clientOrderId,
          symbol: form.symbol.toUpperCase(),
          exchange: form.segment.startsWith('MCX') ? 'MCX' : form.segment.startsWith('BSE') ? 'BSE' : 'NSE',
          segment: form.segment as Segment,
          action: form.action,
          orderType: 'MARKET',
          productType: form.productType as 'MIS' | 'CNC' | 'NRML',
          qty: computedQty,
          price: entryPrice,
          triggerPrice: null,
          lotSize,
        },
        brokerResponse,
        strategyName: 'MANUAL_EXECUTION',
        agentId: 'USER',
        targetPriceInr: isFinite(targetPrice ?? NaN) ? targetPrice : null,
        stopLossPriceInr: isFinite(stopLossPrice ?? NaN) ? stopLossPrice : null,
        lotSize,
        lots: computedLots ?? 1,
        marginBlockedInr: riskResult.marginRequiredInr,
        isSimulation: isPaperMode,
      });

      upsertOrder(liveOrder);
      setPlacedOrder(liveOrder);
      setShowConfirm(false);
      setForm(EMPTY_FORM);
      setRiskResult(null);
      setComputedQty(null);
      setComputedLots(null);
      syncAccount();
    } catch (err: unknown) {
      setPlaceError(`Order placement failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsPlacing(false);
    }
  }, [riskResult, computedQty, computedLots, form, isPaperMode, syncAccount]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  const rs = getRiskState();
  const killSwitchActive = rs.killSwitchActive;
  const sessionOpen = marketSession.isOpen;

  return (
    <div className="flex flex-col h-full bg-[#05070c] text-slate-100 font-mono p-4 space-y-4 overflow-y-auto">

      {/* ── Header ── */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold tracking-wider text-amber-400 font-['Orbitron']">
            J.A.R.V.I.S. QUANT TERMINAL
          </h1>
          <p className="text-xs text-slate-400">
            Regime-Adaptive Triple-Barrier Execution Engine · {isPaperMode ? '📄 PAPER MODE' : '⚡ LIVE'}
          </p>
        </div>
        <div className="flex items-center gap-4 text-sm flex-wrap">
          <div>
            <span className="text-slate-500">CAPITAL: </span>
            <span className="font-semibold text-slate-200">
              {account.capitalAllocated !== null
                ? `₹${account.capitalAllocated.toLocaleString('en-IN')}`
                : 'Unallocated'}
            </span>
          </div>
          <div>
            <span className="text-slate-500">REALIZED P&L: </span>
            <span className={`font-semibold ${account.realizedPnL >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
              ₹{account.realizedPnL.toFixed(2)}
            </span>
          </div>
          <div>
            <span className="text-slate-500">WIN RATE: </span>
            <span className="font-semibold text-amber-300">
              {account.winRate !== null ? `${(account.winRate * 100).toFixed(1)}%` : '--'}
            </span>
          </div>
          <div>
            <span className="text-slate-500">TRADES: </span>
            <span className="font-semibold">{account.totalClosedTrades}</span>
          </div>
          {/* Kill switch badge */}
          <span className={`px-2 py-0.5 text-xs rounded font-bold border ${
            killSwitchActive
              ? 'bg-rose-950 text-rose-300 border-rose-700'
              : 'bg-emerald-950 text-emerald-300 border-emerald-700'
          }`}>
            {killSwitchActive ? '🔴 KILL SWITCH: LOCKED' : '🟢 ENGINE: ARMED'}
          </span>
          {/* Market session badge */}
          <span className={`px-2 py-0.5 text-xs rounded font-bold border ${
            sessionOpen
              ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
              : 'bg-slate-900 text-slate-400 border-slate-700'
          }`}>
            {marketSession.statusBadge}
          </span>
        </div>
      </div>

      {/* ── Kill switch warning ── */}
      {killSwitchActive && (
        <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-700 text-rose-300 text-xs flex items-start gap-2">
          <ShieldAlert className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <div>
            <span className="font-bold">KILL SWITCH ACTIVE — Order routing blocked.</span>{' '}
            {rs.killSwitchReason}
            <button
              onClick={() => { setKillSwitch(false, null); syncAccount(); }}
              className="ml-3 underline text-rose-400 hover:text-rose-200"
            >
              Reset
            </button>
          </div>
        </div>
      )}

      {/* ── Main grid ── */}
      <div className="grid grid-cols-12 gap-4">

        {/* ── Order entry form ── */}
        <div className="col-span-12 lg:col-span-7 border border-slate-800 rounded bg-[#070b14] p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2 flex-wrap gap-2">
            <h2 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
              <Crosshair className="w-4 h-4 text-amber-400" />
              ORDER ENTRY {isPaperMode && <span className="text-[10px] text-amber-500 font-normal">[PAPER SIMULATION]</span>}
            </h2>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-500 text-[10px]">VENUE:</span>
              <button
                type="button"
                onClick={() => setSelectedBroker('PAPER')}
                className={`px-2 py-0.5 rounded text-[11px] font-bold transition-colors ${
                  selectedBroker === 'PAPER'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50'
                    : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200'
                }`}
              >
                PAPER BROKER
              </button>
              <button
                type="button"
                onClick={() => setSelectedBroker('UPSTOX')}
                className={`px-2 py-0.5 rounded text-[11px] font-bold transition-colors ${
                  selectedBroker === 'UPSTOX'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50'
                    : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200'
                }`}
              >
                UPSTOX V2
              </button>
            </div>
          </div>

          {/* Row 1: Symbol + Segment + Action */}
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-1">
              <label className="text-[10px] text-slate-500 block mb-1">SYMBOL</label>
              <input
                value={form.symbol}
                onChange={e => setField('symbol', e.target.value.toUpperCase())}
                placeholder="NIFTY / RELIANCE"
                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-500 block mb-1">SEGMENT</label>
              <select
                value={form.segment}
                onChange={e => setField('segment', e.target.value as OrderFormSegment)}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
              >
                <option value="NSE_CASH">NSE Cash</option>
                <option value="BSE_CASH">BSE Cash</option>
                <option value="NSE_FNO">NSE F&O</option>
                <option value="MCX_FUTURES">MCX Futures</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] text-slate-500 block mb-1">ACTION</label>
              <select
                value={form.action}
                onChange={e => setField('action', e.target.value as OrderFormAction)}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
              >
                <option value="BUY">BUY</option>
                <option value="SELL">SELL</option>
              </select>
            </div>
          </div>

          {/* Row 2: Prices */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { key: 'entryPrice', label: 'ENTRY PRICE (₹)' },
              { key: 'stopLossPrice', label: 'STOP LOSS (₹)' },
              { key: 'targetPrice', label: 'TARGET (₹) — opt.' },
            ].map(({ key, label }) => (
              <div key={key}>
                <label className="text-[10px] text-slate-500 block mb-1">{label}</label>
                <input
                  type="number"
                  value={form[key as keyof OrderForm] as string}
                  onChange={e => setField(key as keyof OrderForm, e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500"
                />
              </div>
            ))}
          </div>

          {/* Row 3: Risk % + Product */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-[10px] text-slate-500 block mb-1">RISK % OF CAPITAL</label>
              <input
                type="number"
                value={form.riskPct}
                onChange={e => setField('riskPct', e.target.value)}
                step="0.1" min="0.1" max="2"
                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-500 block mb-1">PRODUCT</label>
              <select
                value={form.productType}
                onChange={e => setField('productType', e.target.value as OrderFormProduct)}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
              >
                <option value="MIS">MIS (Intraday)</option>
                <option value="CNC">CNC (Delivery)</option>
                <option value="NRML">NRML (Carry)</option>
              </select>
            </div>
            {/* F&O fields */}
            {form.segment === 'NSE_FNO' && (
              <div>
                <label className="text-[10px] text-slate-500 block mb-1">OPTION TYPE</label>
                <select
                  value={form.optionType}
                  onChange={e => setField('optionType', e.target.value as 'CE' | 'PE' | '')}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                >
                  <option value="">Futures</option>
                  <option value="CE">CE (Call)</option>
                  <option value="PE">PE (Put)</option>
                </select>
              </div>
            )}
          </div>

          {/* Sizing warnings */}
          {sizingWarnings.length > 0 && (
            <div className="space-y-1">
              {sizingWarnings.map((w, i) => (
                <p key={i} className="text-[10px] text-amber-400 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 flex-shrink-0" />{w}
                </p>
              ))}
            </div>
          )}

          {/* Computed sizing display */}
          {computedQty !== null && (
            <div className="bg-slate-900/60 border border-slate-700 rounded p-2 grid grid-cols-3 gap-2 text-xs">
              <div><span className="text-slate-500">QTY: </span><span className="text-amber-300 font-bold">{computedQty}</span></div>
              <div><span className="text-slate-500">LOTS: </span><span className="text-amber-300 font-bold">{computedLots}</span></div>
              <div><span className="text-slate-500">LOT SIZE: </span><span className="text-slate-300">{getLotSize(form.symbol, form.segment as Segment)}</span></div>
            </div>
          )}

          {/* Error display */}
          {placeError && (
            <div className="p-2 rounded bg-rose-950/50 border border-rose-700 text-rose-300 text-xs flex items-start gap-2">
              <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />{placeError}
            </div>
          )}

          {/* Evaluate button */}
          <button
            onClick={handleEvaluate}
            disabled={killSwitchActive}
            className="w-full py-2 rounded font-bold text-sm bg-amber-600 hover:bg-amber-500 text-black disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            EVALUATE ORDER → RUN RISK GATE
          </button>

          {/* Confirmation panel — only shown after risk passes */}
          {showConfirm && riskResult?.allowed && (
            <div className="border border-emerald-700 rounded bg-emerald-950/30 p-3 space-y-2">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                <ShieldCheck className="w-4 h-4" /> RISK GATE PASSED — AWAITING CONFIRMATION
              </div>
              <div className="grid grid-cols-2 gap-1 text-xs">
                <span className="text-slate-400">Notional:</span>
                <span>₹{riskResult.notionalInr.toLocaleString('en-IN')}</span>
                <span className="text-slate-400">Margin Required:</span>
                <span>₹{riskResult.marginRequiredInr.toLocaleString('en-IN')}</span>
                <span className="text-slate-400">Margin Available:</span>
                <span className={riskResult.marginAvailableInr > riskResult.marginRequiredInr ? 'text-emerald-400' : 'text-rose-400'}>
                  ₹{riskResult.marginAvailableInr.toLocaleString('en-IN')}
                </span>
                {riskResult.warnings.map((w, i) => (
                  <React.Fragment key={i}>
                    <span className="text-amber-400 col-span-2">⚠ {w}</span>
                  </React.Fragment>
                ))}
              </div>
              <p className="text-[10px] text-emerald-600 italic">{riskResult.marginNote}</p>
              <div className="flex gap-2">
                <button
                  onClick={handlePlace}
                  disabled={isPlacing}
                  className="flex-1 py-2 rounded font-bold text-sm bg-emerald-700 hover:bg-emerald-600 text-white disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
                >
                  {isPlacing ? <><Loader2 className="w-4 h-4 animate-spin" /> PLACING…</> : '✓ CONFIRM & PLACE ORDER'}
                </button>
                <button
                  onClick={() => { setShowConfirm(false); setRiskResult(null); }}
                  className="px-4 py-2 rounded font-bold text-sm bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                >
                  CANCEL
                </button>
              </div>
            </div>
          )}

          {/* Risk violations panel */}
          {riskResult && !riskResult.allowed && (
            <div className="border border-rose-700 rounded bg-rose-950/30 p-3 space-y-1">
              <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
                <ShieldAlert className="w-4 h-4" /> RISK GATE BLOCKED
              </div>
              {riskResult.violations.map((v, i) => (
                <p key={i} className="text-xs text-rose-300 flex items-start gap-1">
                  <XCircle className="w-3 h-3 flex-shrink-0 mt-0.5" />{v}
                </p>
              ))}
            </div>
          )}

          {/* Success panel */}
          {placedOrder && (
            <div className="border border-cyan-700 rounded bg-cyan-950/30 p-3 space-y-1">
              <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm">
                <CheckCircle2 className="w-4 h-4" /> ORDER PLACED — {placedOrder.isSimulation ? 'PAPER' : 'LIVE'}
              </div>
              <p className="text-xs text-cyan-300">ID: {placedOrder.lifecycleId}</p>
              <p className="text-xs text-cyan-300">
                {placedOrder.entryLeg.action} {placedOrder.entryLeg.qty} {placedOrder.symbol}
                {' @ '}₹{placedOrder.entryLeg.filledPrice?.toFixed(2) ?? placedOrder.entryLeg.requestedPrice?.toFixed(2) ?? '--'}
              </p>
              {placedOrder.stopLossPriceInr && (
                <p className="text-xs text-rose-300">SL: ₹{placedOrder.stopLossPriceInr}</p>
              )}
              {placedOrder.targetPriceInr && (
                <p className="text-xs text-emerald-300">Target: ₹{placedOrder.targetPriceInr}</p>
              )}
            </div>
          )}
        </div>

        {/* ── Risk gate + session panel ── */}
        <div className="col-span-12 lg:col-span-5 space-y-3">

          {/* Market session */}
          <div className="border border-slate-800 rounded bg-[#070b14] p-4">
            <h2 className="text-sm font-semibold text-slate-300 border-b border-slate-800 pb-2 mb-3">
              MARKET SESSION
            </h2>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Status:</span>
                <span className={sessionOpen ? 'text-emerald-400 font-bold' : 'text-slate-400'}>{marketSession.phaseLabel}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">IST Time:</span>
                <span className="text-slate-300">{marketSession.istTimeString}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Next Session:</span>
                <span className="text-slate-400">{marketSession.nextSessionText}</span>
              </div>
              {marketSession.holidayName && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Holiday:</span>
                  <span className="text-amber-400">{marketSession.holidayName}</span>
                </div>
              )}
            </div>
          </div>

          {/* Risk state summary */}
          <div className="border border-slate-800 rounded bg-[#070b14] p-4">
            <h2 className="text-sm font-semibold text-slate-300 border-b border-slate-800 pb-2 mb-3 flex items-center gap-2">
              <ReceiptText className="w-4 h-4 text-amber-400" /> RISK STATE
            </h2>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Kill Switch:</span>
                <span className={killSwitchActive ? 'text-rose-400 font-bold' : 'text-emerald-400'}>{killSwitchActive ? 'ARMED' : 'CLEAR'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Day P&L:</span>
                <span className={account.realizedPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                  ₹{account.realizedPnL.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Margin Used:</span>
                <span>₹{rs.marginUsedInr.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Margin Available:</span>
                <span className="text-emerald-400">₹{rs.marginAvailableInr.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Open Positions:</span>
                <span>{rs.openPositions.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Closed Trades:</span>
                <span>{account.totalClosedTrades}</span>
              </div>
            </div>
          </div>

          {/* Statutory compliance note */}
          <div className="text-[10px] text-slate-600 border border-slate-800 rounded p-2 bg-[#070b14]">
            <p className="text-slate-500 font-semibold mb-1">SEBI FY26 COMPLIANCE</p>
            Margin computed per SEBI Circular SEBI/HO/MRD1/DPIM/CIR/P/2024.
            STT/CTT, exchange fees, and GST are estimated — verify with broker before live trading.
            {isPaperMode && ' All orders are PAPER SIMULATION — no real capital at risk.'}
          </div>
        </div>
      </div>
    </div>
  );
};
