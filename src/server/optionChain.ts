/**
 * optionChain.ts — Unified NSE/BSE Option Chain Fetcher & Greeks Aggregator
 *
 * Integrates:
 *   • Upstox v2 Option Chain API (real-time exchange IV, Greeks, OI, Volume)
 *   • Black-Scholes Greeks synthesizer fallback via src/server/greeks.ts
 *   • Holiday-adjusted expiry calendar integration from src/data/fnoContracts.ts
 *
 * Output adheres strictly to OptionChainRow specification in BrokerAdapter.ts.
 */

import { computeGreeks } from './greeks.ts';
import {
  FNO_CONTRACT_REGISTRY,
  getUpcomingExpiries,
  generateStrikeRange,
  type FnOContractSpec,
} from '../data/fnoContracts.ts';
import type { OptionChainRow } from '../brokers/BrokerAdapter.ts';

export interface OptionChainSummary {
  underlying: string;
  exchange: 'NSE' | 'BSE';
  spotPrice: number;
  expiry: string;
  availableExpiries: string[];
  totalCallOI: number;
  totalPutOI: number;
  pcr: number;
  maxPainStrike: number;
  atmStrike: number;
  rows: OptionChainRow[];
  source: 'UPSTOX_REALTIME' | 'BLACK_SCHOLES_SYNTHETIC';
  timestamp: string;
}

/**
 * Normalizes raw Upstox `/v2/option/chain` response array into clean OptionChainRow[]
 */
export function normalizeUpstoxOptionChain(data: any[], expiryFilter?: string): {
  rows: OptionChainRow[];
  totalCallOI: number;
  totalPutOI: number;
  pcr: number;
  atmStrike: number;
  spotPrice: number;
} {
  if (!Array.isArray(data) || data.length === 0) {
    return { rows: [], totalCallOI: 0, totalPutOI: 0, pcr: 1.0, atmStrike: 0, spotPrice: 0 };
  }

  let totalCallOI = 0;
  let totalPutOI = 0;
  let spotPrice = 0;
  let atmStrike = 0;

  const rows: OptionChainRow[] = [];

  for (const item of data) {
    const expiry = item.expiry || '';
    if (expiryFilter && expiry !== expiryFilter) continue;

    const strike = Number(item.strike_price);
    if (!strike || isNaN(strike)) continue;

    if (!spotPrice && item.underlying_spot_price) {
      spotPrice = Number(item.underlying_spot_price);
    }

    const ceData = item.call_options;
    const peData = item.put_options;

    const ceLtp = ceData?.market_data?.ltp ?? ceData?.market_data?.close_price ?? null;
    const peLtp = peData?.market_data?.ltp ?? peData?.market_data?.close_price ?? null;

    const ceOI = Number(ceData?.market_data?.oi ?? 0);
    const peOI = Number(peData?.market_data?.oi ?? 0);
    totalCallOI += ceOI;
    totalPutOI += peOI;

    const ceRow = ceData
      ? {
          ltp: ceLtp != null ? Number(ceLtp) : 0,
          iv: Number(ceData.option_greeks?.iv ?? 0),
          delta: Number(ceData.option_greeks?.delta ?? 0),
          oi: ceOI,
          volume: Number(ceData.market_data?.volume ?? 0),
        }
      : null;

    const peRow = peData
      ? {
          ltp: peLtp != null ? Number(peLtp) : 0,
          iv: Number(peData.option_greeks?.iv ?? 0),
          delta: Number(peData.option_greeks?.delta ?? 0),
          oi: peOI,
          volume: Number(peData.market_data?.volume ?? 0),
        }
      : null;

    rows.push({
      strike,
      expiry,
      ce: ceRow,
      pe: peRow,
    });
  }

  // Sort ascending by strike
  rows.sort((a, b) => a.strike - b.strike);

  const pcr = totalCallOI > 0 ? Math.round((totalPutOI / totalCallOI) * 100) / 100 : 1.0;

  if (spotPrice > 0 && rows.length > 0) {
    atmStrike = rows.reduce((prev, curr) =>
      Math.abs(curr.strike - spotPrice) < Math.abs(prev.strike - spotPrice) ? curr : prev
    ).strike;
  } else if (rows.length > 0) {
    atmStrike = rows[Math.floor(rows.length / 2)].strike;
  }

  return { rows, totalCallOI, totalPutOI, pcr, atmStrike, spotPrice };
}

/**
 * Calculates option Max Pain strike from normalized rows
 */
export function calculateMaxPain(rows: OptionChainRow[]): number {
  if (rows.length === 0) return 0;
  let minLoss = Infinity;
  let maxPainStrike = rows[0].strike;

  for (const candidate of rows) {
    const s = candidate.strike;
    let totalLoss = 0;

    for (const r of rows) {
      // Call buyer profit = max(0, s - r.strike) * callOI
      if (r.ce && r.ce.oi > 0 && s > r.strike) {
        totalLoss += (s - r.strike) * r.ce.oi;
      }
      // Put buyer profit = max(0, r.strike - s) * putOI
      if (r.pe && r.pe.oi > 0 && s < r.strike) {
        totalLoss += (r.strike - s) * r.pe.oi;
      }
    }

    if (totalLoss < minLoss) {
      minLoss = totalLoss;
      maxPainStrike = s;
    }
  }

  return maxPainStrike;
}

/**
 * Synthesizes option chain using Black-Scholes when real-time broker feed is offline
 */
export function synthesizeOptionChain(
  underlying: string,
  targetExpiry?: string,
  currentSpot?: number
): OptionChainSummary {
  const upper = underlying.toUpperCase();
  const spec: FnOContractSpec | undefined = FNO_CONTRACT_REGISTRY[upper];
  const expiries = getUpcomingExpiries(upper, 6);
  const activeExpiry = targetExpiry || (expiries.length > 0 ? expiries[0].expiryDateStr : '2026-11-05');
  const availableExpiries = expiries.map(e => e.expiryDateStr);

  const spot = currentSpot && currentSpot > 0
    ? currentSpot
    : upper === 'NIFTY' ? 25450
    : upper === 'BANKNIFTY' ? 53800
    : upper === 'SENSEX' ? 83200
    : 1500;

  const strikeRange = generateStrikeRange(upper, spot, 12);
  const matchedExpiry = expiries.find(e => e.expiryDateStr === activeExpiry);
  const dte = Math.max(1, matchedExpiry ? matchedExpiry.daysRemaining : 5);

  const baseVolPct = upper.includes('BANK') ? 16.5 : upper.includes('SENSEX') ? 13.5 : 14.0;
  const rows: OptionChainRow[] = [];
  let totalCallOI = 0;
  let totalPutOI = 0;

  for (const k of strikeRange.strikes) {
    // Volatility smile simulation
    const moneyness = Math.abs(k - spot) / spot;
    const volSkew = baseVolPct + moneyness * 22;

    const callGreeks = computeGreeks({
      optionType: 'CALL',
      spot,
      strike: k,
      daysToExpiry: dte,
      volatilityPct: volSkew,
      riskFreeRatePct: 6.5,
    });

    const putGreeks = computeGreeks({
      optionType: 'PUT',
      spot,
      strike: k,
      daysToExpiry: dte,
      volatilityPct: volSkew,
      riskFreeRatePct: 6.5,
    });

    const callOI = Math.max(1000, Math.round(150000 / (1 + moneyness * 12)));
    const putOI = Math.max(1000, Math.round(140000 / (1 + moneyness * 14)));
    totalCallOI += callOI;
    totalPutOI += putOI;

    rows.push({
      strike: k,
      expiry: activeExpiry,
      ce: {
        ltp: Math.round(callGreeks.theoreticalPrice * 100) / 100,
        iv: Math.round(volSkew * 10) / 10,
        delta: Math.round(callGreeks.delta * 1000) / 1000,
        oi: callOI,
        volume: Math.round(callOI * 0.42),
      },
      pe: {
        ltp: Math.round(putGreeks.theoreticalPrice * 100) / 100,
        iv: Math.round(volSkew * 10) / 10,
        delta: Math.round(putGreeks.delta * 1000) / 1000,
        oi: putOI,
        volume: Math.round(putOI * 0.38),
      },
    });
  }

  const pcr = totalCallOI > 0 ? Math.round((totalPutOI / totalCallOI) * 100) / 100 : 1.0;
  const maxPainStrike = calculateMaxPain(rows);

  return {
    underlying: upper,
    exchange: spec?.exchange || 'NSE',
    spotPrice: spot,
    expiry: activeExpiry,
    availableExpiries,
    totalCallOI,
    totalPutOI,
    pcr,
    maxPainStrike,
    atmStrike: strikeRange.atm,
    rows,
    source: 'BLACK_SCHOLES_SYNTHETIC',
    timestamp: new Date().toISOString(),
  };
}

/**
 * Main query helper: Attempts Upstox live option chain if configured,
 * otherwise transparently falls back to Black-Scholes synthetic chain.
 */
export async function getOptionChainData(
  underlying: string,
  expiry?: string,
  upstoxToken?: string,
  upstoxBaseUrl = 'https://api.upstox.com/v2',
  spotPriceFallback?: number
): Promise<OptionChainSummary> {
  const upper = underlying.toUpperCase();
  const spec = FNO_CONTRACT_REGISTRY[upper];
  const instrumentKey = upper === 'NIFTY'
    ? 'NSE_INDEX|Nifty 50'
    : upper === 'BANKNIFTY'
    ? 'NSE_INDEX|Nifty Bank'
    : upper === 'SENSEX'
    ? 'BSE_INDEX|SENSEX'
    : `NSE_EQ|${upper}`;

  if (upstoxToken && upstoxToken.trim().length > 10) {
    try {
      let url = `${upstoxBaseUrl}/option/chain?instrument_key=${encodeURIComponent(instrumentKey)}`;
      if (expiry) url += `&expiry_date=${encodeURIComponent(expiry)}`;

      const res = await fetch(url, {
        headers: { Accept: 'application/json', Authorization: `Bearer ${upstoxToken.trim()}` },
      });

      if (res.ok) {
        const json = await res.json();
        const rawList = json?.data || [];
        if (Array.isArray(rawList) && rawList.length > 0) {
          const expiries = Array.from(new Set(rawList.map((d: any) => d.expiry).filter(Boolean))) as string[];
          const selectedExpiry = expiry || (expiries.length > 0 ? expiries[0] : '');
          const normalized = normalizeUpstoxOptionChain(rawList, selectedExpiry);

          if (normalized.rows.length > 0) {
            const maxPain = calculateMaxPain(normalized.rows);
            return {
              underlying: upper,
              exchange: spec?.exchange || 'NSE',
              spotPrice: normalized.spotPrice || spotPriceFallback || 25000,
              expiry: selectedExpiry,
              availableExpiries: expiries,
              totalCallOI: normalized.totalCallOI,
              totalPutOI: normalized.totalPutOI,
              pcr: normalized.pcr,
              maxPainStrike: maxPain,
              atmStrike: normalized.atmStrike,
              rows: normalized.rows,
              source: 'UPSTOX_REALTIME',
              timestamp: new Date().toISOString(),
            };
          }
        }
      }
    } catch {
      // Fallback below
    }
  }

  // Fallback to Black-Scholes synthetic chain
  return synthesizeOptionChain(upper, expiry, spotPriceFallback);
}
