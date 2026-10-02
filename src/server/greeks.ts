// Black-Scholes option pricing + greeks + implied-vol solver.
// Pure math, no external data. Ready to plug a real option-chain feed into
// (pass spot/strike/dte/iv or a market premium and it returns greeks).
// NOTE: European-style approximation; Indian index options are European so
// this is appropriate for NIFTY/BANKNIFTY. Stock options are American — treat
// these greeks as a close approximation, not broker-exact.

function erf(x: number): number {
  // Abramowitz & Stegun 7.1.26
  const t = 1 / (1 + 0.3275911 * Math.abs(x));
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return x >= 0 ? y : -y;
}

function normCdf(x: number): number {
  return 0.5 * (1 + erf(x / Math.SQRT2));
}

function normPdf(x: number): number {
  return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
}

export interface GreeksInput {
  optionType: 'CALL' | 'PUT';
  spot: number;
  strike: number;
  daysToExpiry: number;
  volatilityPct?: number;     // annualised IV in %, e.g. 14 => 0.14
  riskFreeRatePct?: number;   // annualised, default 6.5% (India)
  marketPrice?: number;       // if provided and no vol, IV is solved from this
}

export interface GreeksResult {
  optionType: 'CALL' | 'PUT';
  theoreticalPrice: number;
  delta: number;
  gamma: number;
  thetaPerDay: number;
  vegaPer1Pct: number;
  rhoPer1Pct: number;
  impliedVolPct: number | null;
  inputs: { spot: number; strike: number; daysToExpiry: number; volatilityPct: number; riskFreeRatePct: number };
  note: string;
}

function d1d2(S: number, K: number, T: number, r: number, sigma: number) {
  const vsqrt = sigma * Math.sqrt(T);
  const d1 = (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / vsqrt;
  const d2 = d1 - vsqrt;
  return { d1, d2 };
}

export function blackScholesPrice(type: 'CALL' | 'PUT', S: number, K: number, T: number, r: number, sigma: number): number {
  if (T <= 0 || sigma <= 0) {
    return type === 'CALL' ? Math.max(0, S - K) : Math.max(0, K - S);
  }
  const { d1, d2 } = d1d2(S, K, T, r, sigma);
  if (type === 'CALL') return S * normCdf(d1) - K * Math.exp(-r * T) * normCdf(d2);
  return K * Math.exp(-r * T) * normCdf(-d2) - S * normCdf(-d1);
}

export function impliedVolatility(type: 'CALL' | 'PUT', marketPrice: number, S: number, K: number, T: number, r: number): number | null {
  if (marketPrice <= 0 || T <= 0) return null;
  let sigma = 0.25;
  for (let i = 0; i < 100; i++) {
    const price = blackScholesPrice(type, S, K, T, r, sigma);
    const { d1 } = d1d2(S, K, T, r, sigma);
    const vega = S * normPdf(d1) * Math.sqrt(T);
    if (vega < 1e-8) break;
    const diff = price - marketPrice;
    if (Math.abs(diff) < 1e-4) return sigma;
    sigma -= diff / vega;
    if (sigma <= 0.0001) sigma = 0.0001;
    if (sigma > 5) sigma = 5;
  }
  return sigma > 0 && sigma < 5 ? sigma : null;
}

export function computeGreeks(input: GreeksInput): GreeksResult {
  const { optionType, spot, strike, daysToExpiry } = input;
  if (!optionType || !(spot > 0) || !(strike > 0) || !(daysToExpiry > 0)) {
    throw new Error('spot, strike and daysToExpiry must be positive, and optionType is required.');
  }
  const r = (input.riskFreeRatePct ?? 6.5) / 100;
  const T = daysToExpiry / 365;

  let sigma: number;
  let solvedIv: number | null = null;
  if (input.volatilityPct && input.volatilityPct > 0) {
    sigma = input.volatilityPct / 100;
  } else if (input.marketPrice && input.marketPrice > 0) {
    solvedIv = impliedVolatility(optionType, input.marketPrice, spot, strike, T, r);
    sigma = solvedIv ?? 0.2;
  } else {
    throw new Error('Provide either volatilityPct or marketPrice to compute greeks.');
  }

  const { d1, d2 } = d1d2(spot, strike, T, r, sigma);
  const price = blackScholesPrice(optionType, spot, strike, T, r, sigma);
  const delta = optionType === 'CALL' ? normCdf(d1) : normCdf(d1) - 1;
  const gamma = normPdf(d1) / (spot * sigma * Math.sqrt(T));
  const vega = spot * normPdf(d1) * Math.sqrt(T);
  const thetaYear = optionType === 'CALL'
    ? (-(spot * normPdf(d1) * sigma) / (2 * Math.sqrt(T))) - r * strike * Math.exp(-r * T) * normCdf(d2)
    : (-(spot * normPdf(d1) * sigma) / (2 * Math.sqrt(T))) + r * strike * Math.exp(-r * T) * normCdf(-d2);
  const rho = optionType === 'CALL'
    ? strike * T * Math.exp(-r * T) * normCdf(d2)
    : -strike * T * Math.exp(-r * T) * normCdf(-d2);

  const round = (n: number, p = 4) => Math.round(n * Math.pow(10, p)) / Math.pow(10, p);

  return {
    optionType,
    theoreticalPrice: round(price, 2),
    delta: round(delta),
    gamma: round(gamma, 6),
    thetaPerDay: round(thetaYear / 365, 2),
    vegaPer1Pct: round(vega / 100, 2),
    rhoPer1Pct: round(rho / 100, 2),
    impliedVolPct: input.volatilityPct ? input.volatilityPct : (solvedIv != null ? round(solvedIv * 100, 2) : null),
    inputs: { spot, strike, daysToExpiry, volatilityPct: round(sigma * 100, 2), riskFreeRatePct: r * 100 },
    note: 'Black-Scholes (European) approximation. Not broker-exact; computed from the supplied inputs only.',
  };
}
