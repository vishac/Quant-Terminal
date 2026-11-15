import type { Candle } from './types';

/**
 * Upstox Historical Candle Data V3 (v2 is deprecated). Per the Upstox docs:
 * GET https://api.upstox.com/v3/historical-candle/:instrument_key/:unit/:interval/:to_date/:from_date
 * daily = unit "days", interval 1; up to one decade per request; header Authorization: Bearer <token>.
 * Candle array order: [timestamp, open, high, low, close, volume, openInterest].
 * The docs do NOT state whether prices are split/bonus adjusted, so flagSuspectJumps() is run on every load.
 */
export function parseUpstoxCandles(json: any): Candle[] {
  const rows: any[] = json?.data?.candles;
  if (!Array.isArray(rows)) throw new Error('Unexpected Upstox response: data.candles missing');
  const byDate = new Map<string, Candle>();
  for (const r of rows) {
    const [ts, o, h, l, c, v] = r;
    const date = String(ts).slice(0, 10);
    const candle: Candle = { date, open: +o, high: +h, low: +l, close: +c, volume: +v || 0 };
    const ok =
      /^\d{4}-\d{2}-\d{2}$/.test(date) &&
      [candle.open, candle.high, candle.low, candle.close].every((x) => Number.isFinite(x) && x > 0) &&
      candle.high >= candle.low;
    if (ok) byDate.set(date, candle);
  }
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

/** Dates where close-to-close moves more than thr (default 35%): possible unadjusted split/bonus. */
export function flagSuspectJumps(c: Candle[], thr = 0.35): string[] {
  const out: string[] = [];
  for (let i = 1; i < c.length; i++) {
    if (Math.abs(c[i].close / c[i - 1].close - 1) > thr) out.push(c[i].date);
  }
  return out;
}

export async function fetchDaily(
  instrumentKey: string,
  from: string,
  to: string,
  token: string,
  fetchImpl: typeof fetch = fetch,
): Promise<Candle[]> {
  // Chunk into <= 9-year spans to stay inside the documented 1-decade limit.
  const spans: [string, string][] = [];
  let end = new Date(to + 'T00:00:00Z');
  const start = new Date(from + 'T00:00:00Z');
  while (end >= start) {
    const s = new Date(end);
    s.setUTCFullYear(s.getUTCFullYear() - 9);
    const sStart = s < start ? start : s;
    spans.push([sStart.toISOString().slice(0, 10), end.toISOString().slice(0, 10)]);
    end = new Date(sStart);
    end.setUTCDate(end.getUTCDate() - 1);
  }
  const all: Candle[] = [];
  for (const [f, t] of spans) {
    const url = `https://api.upstox.com/v3/historical-candle/${encodeURIComponent(instrumentKey)}/days/1/${t}/${f}`;
    const res = await fetchImpl(url, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } });
    if (!res.ok) throw new Error(`Upstox HTTP ${res.status} for ${instrumentKey} ${f}..${t}`);
    all.push(...parseUpstoxCandles(await res.json()));
  }
  const m = new Map(all.map((c) => [c.date, c]));
  return [...m.values()].sort((a, b) => a.date.localeCompare(b.date));
}
