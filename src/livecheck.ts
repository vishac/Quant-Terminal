import { planEntry } from './plan';
import { evaluateEntry } from './riskgate';
import { gateConfigFrom, type EngineConfig } from './engine';
import type { AccountView, Candidate } from './finder';

/**
 * Upstox Full Market Quotes V3 (per Upstox docs):
 * GET https://api.upstox.com/v3/market-quote/quotes?instrument_key=a,b,...  (max 500 keys)
 * `data` is keyed by "EXCHANGE:TRADING_SYMBOL", NOT by instrument key, so entries are matched on the
 * `instrument_token` field (pipe form). Not stated in the docs: pre-open behaviour of last_price, and
 * depth ordering (so best bid/ask are computed as max bid / min ask over levels with quantity > 0).
 */
export interface Quote {
  instrumentKey?: string;
  symbol?: string;
  lastPrice: number;
  prevClose: number;
  bestBid: number;
  bestAsk: number;
  lowerCircuit: number;
  upperCircuit: number;
  volume: number;
  timestamp: string;
}

export function parseQuotes(json: any): Quote[] {
  const d = json?.data;
  if (!d || typeof d !== 'object') throw new Error('Unexpected Upstox quote response: data missing');
  const levels = (arr: any): { price: number; quantity: number }[] =>
    Array.isArray(arr) ? arr.map((x) => ({ price: +x?.price, quantity: +x?.quantity })).filter((x) => x.price > 0 && x.quantity > 0) : [];
  return Object.values<any>(d).map((v) => {
    const bids = levels(v?.depth?.buy);
    const asks = levels(v?.depth?.sell);
    return {
      instrumentKey: typeof v?.instrument_token === 'string' ? v.instrument_token : undefined,
      symbol: typeof v?.symbol === 'string' ? v.symbol : undefined,
      lastPrice: +v?.last_price || 0,
      prevClose: +v?.prev_close_price || 0,
      bestBid: bids.length ? Math.max(...bids.map((x) => x.price)) : 0,
      bestAsk: asks.length ? Math.min(...asks.map((x) => x.price)) : 0,
      lowerCircuit: +v?.lower_circuit_limit || 0,
      upperCircuit: +v?.upper_circuit_limit || 0,
      volume: +v?.volume || 0,
      timestamp: String(v?.timestamp ?? ''),
    };
  });
}

export async function fetchQuotes(keys: string[], token: string, fetchImpl: typeof fetch = fetch): Promise<Quote[]> {
  const out: Quote[] = [];
  for (let i = 0; i < keys.length; i += 500) {
    const chunk = keys.slice(i, i + 500);
    const url = `https://api.upstox.com/v3/market-quote/quotes?instrument_key=${chunk.map(encodeURIComponent).join(',')}`;
    const res = await fetchImpl(url, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } });
    if (!res.ok) throw new Error(`Upstox quotes HTTP ${res.status}`);
    out.push(...parseQuotes(await res.json()));
  }
  return out;
}

export interface LiveOpts {
  maxGapUpAtr?: number; // CAUTION when price is more than this many ATR above the signal close (hypothesis)
  maxSpreadPct?: number; // CAUTION when (ask-bid)/mid exceeds this (hypothesis)
  circuitProximityPct?: number; // CAUTION when within this % of a circuit limit (hypothesis)
  prevCloseTolerancePct?: number; // flag when the quote's previous close differs from the scan close
}

export type LiveStatus = 'GO' | 'CAUTION' | 'SKIP' | 'NO_QUOTE';

export interface LiveCheck {
  symbol: string;
  status: LiveStatus;
  signalClose: number;
  ltp: number | null;
  gapPct: number | null;
  gapAtr: number | null;
  spreadPct: number | null;
  plan: null | { fill: number; stop: number; qty: number; riskInr: number; notional: number };
  flags: string[];
  gateCodes: string[];
}

/**
 * Pre-open check of each scan candidate against a live quote. The plan is re-priced at the live price with the
 * same planEntry/evaluateEntry the engine uses. Flags are DISCRETIONARY overlays: the backtest enters at the open
 * regardless of gaps, so acting on a flag departs from backtested behaviour and is untested.
 */
export function liveCheckAll(
  cands: Candidate[],
  quotes: Map<string, Quote>, // keyed by symbol label used in the scan
  cfg: EngineConfig,
  account: AccountView,
  opts: LiveOpts = {},
): LiveCheck[] {
  const o = { maxGapUpAtr: 1, maxSpreadPct: 0.5, circuitProximityPct: 1, prevCloseTolerancePct: 0.5, ...opts };
  const gateCfg = gateConfigFrom(cfg);
  let cashLeft = account.cash;
  let openCount = account.openSymbols.length;
  return cands.map((c) => {
    const q = quotes.get(c.symbol);
    const empty = { symbol: c.symbol, signalClose: c.close, ltp: null, gapPct: null, gapAtr: null, spreadPct: null, plan: null, gateCodes: [] as string[] };
    if (!q || !(q.lastPrice > 0)) return { ...empty, status: 'NO_QUOTE' as const, flags: ['no_quote'] };
    const flags: string[] = [];
    const gapPct = (q.lastPrice / c.close - 1) * 100;
    const gapAtr = (q.lastPrice - c.close) / c.atr;
    if (gapAtr > o.maxGapUpAtr) flags.push(`gap_up_over_limit(${gapAtr.toFixed(2)} ATR)`);
    if (c.plan && q.lastPrice < c.plan.refStop) flags.push('below_planned_stop_level');
    if (q.prevClose > 0 && Math.abs(q.prevClose / c.close - 1) * 100 > o.prevCloseTolerancePct) flags.push('prev_close_mismatch(stale scan or corporate action?)');
    let spreadPct: number | null = null;
    if (q.bestBid > 0 && q.bestAsk > 0) {
      spreadPct = ((q.bestAsk - q.bestBid) / ((q.bestAsk + q.bestBid) / 2)) * 100;
      if (spreadPct > o.maxSpreadPct) flags.push(`wide_spread(${spreadPct.toFixed(2)}%)`);
    } else flags.push('no_depth');
    if (q.lowerCircuit > 0 && (q.lastPrice / q.lowerCircuit - 1) * 100 < o.circuitProximityPct) flags.push('near_lower_circuit');
    if (q.upperCircuit > 0 && (1 - q.lastPrice / q.upperCircuit) * 100 < o.circuitProximityPct) flags.push('near_upper_circuit');

    const plan = planEntry(q.lastPrice, c.atr, account.equity, cashLeft, cfg);
    if (!plan.ok) {
      return { ...empty, ltp: q.lastPrice, gapPct, gapAtr, spreadPct, status: 'SKIP' as const, flags: [...flags, `sizing:${plan.reason}`], gateCodes: [`sizing:${plan.reason}`] };
    }
    const g = evaluateEntry(
      {
        symbol: c.symbol, qty: plan.qty, fill: plan.fill, stop: plan.stop, entryCost: plan.entryCost, equity: account.equity,
        cash: cashLeft, peak: account.peak, openCount, hasPosition: false, lastDayReturnPct: account.lastDayReturnPct, killSwitch: account.killSwitch,
      },
      gateCfg,
    );
    if (g.allowed) {
      cashLeft -= plan.notional + plan.entryCost;
      openCount++;
    }
    return {
      symbol: c.symbol,
      status: !g.allowed ? ('SKIP' as const) : flags.length ? ('CAUTION' as const) : ('GO' as const),
      signalClose: c.close,
      ltp: q.lastPrice,
      gapPct: +gapPct.toFixed(2),
      gapAtr: +gapAtr.toFixed(2),
      spreadPct: spreadPct === null ? null : +spreadPct.toFixed(3),
      plan: { fill: +plan.fill.toFixed(2), stop: +plan.stop.toFixed(2), qty: plan.qty, riskInr: Math.round(plan.riskInr), notional: Math.round(plan.notional) },
      flags,
      gateCodes: g.codes,
    };
  });
}
