import { useState, useEffect, useCallback, useRef } from 'react';
import { getIndianMarketSession, MarketSessionInfo } from '../utils/marketHours';
import { MarketQuote } from '../types/quant';
import { TRACKED_SYMBOLS } from '../data/symbols';

export type { MarketQuote };
export { TRACKED_SYMBOLS };

export interface LiveMarketState {
  quotes: Record<string, MarketQuote>;
  /** Null until first successful fetch; never a hardcoded fake value. */
  latencyMs: number | null;
  isLive: boolean;
  provider: string;
  lastUpdated: string;
  error: string | null;
  geminiCreditsUsed: 0;
  zeroCreditMode: true;
  countdownSeconds: number;
  lastTickTimestamp: number;
  intervalMs: number;
  // Market Hours & Smart Data Packet Saver Telemetry
  marketSession: MarketSessionInfo;
  isPacketSaverActive: boolean;
  /** Starts at 0; incremented from real server responses — never faked. */
  packetsSavedCount: number;
  forceSyncOverride: boolean;
}

// Initial state — null prices, zero counters, no faked numbers
const DEFAULT_QUOTES: Record<string, MarketQuote> = {};
TRACKED_SYMBOLS.forEach(({ symbol, name }) => {
  DEFAULT_QUOTES[symbol] = {
    symbol,
    name,
    price: null,
    change: null,
    changePct: null,
    high: null,
    low: null,
    prevClose: null,
    fiftyTwoWeekHigh: null,
    fiftyTwoWeekLow: null,
    volume: null,
    timestamp: '',
    source: 'AWAITING_TICK',
  };
});

export function useLiveMarketData(pollingIntervalMs = 5000) {
  const initialCountdown = Math.max(1, Math.round(pollingIntervalMs / 1000));
  const [countdown, setCountdown] = useState<number>(initialCountdown);
  const [forceSyncOverride, setForceSyncOverrideState] = useState<boolean>(() => {
    try {
      return localStorage.getItem('jarvis_force_sync_override') === 'true';
    } catch {
      return false;
    }
  });

  const initialSession = getIndianMarketSession();

  const [state, setState] = useState<LiveMarketState>({
    quotes: DEFAULT_QUOTES,
    latencyMs: null,        // null until first real fetch — not a fake number
    isLive: false,          // false until first successful response
    provider: 'YAHOO_DELAYED_UNOFFICIAL',
    lastUpdated: initialSession.istTimeString,
    error: null,
    geminiCreditsUsed: 0,
    zeroCreditMode: true,
    countdownSeconds: initialCountdown,
    lastTickTimestamp: Date.now(),
    intervalMs: pollingIntervalMs,
    marketSession: initialSession,
    isPacketSaverActive: !initialSession.shouldSync && !false,
    packetsSavedCount: 0,   // starts at 0; real value comes from server
    forceSyncOverride: false,
  });

  const setForceSyncOverride = useCallback((enabled: boolean) => {
    try {
      localStorage.setItem('jarvis_force_sync_override', String(enabled));
    } catch { /* ignore */ }
    setForceSyncOverrideState(enabled);
  }, []);

  const toggleForceSyncOverride = useCallback(() => {
    setForceSyncOverrideState((prev) => {
      const nextVal = !prev;
      try { localStorage.setItem('jarvis_force_sync_override', String(nextVal)); }
      catch { /* ignore */ }
      return nextVal;
    });
  }, []);

  const fetchQuotes = useCallback(async (isForced = false) => {
    const fetchStart = Date.now();
    try {
      const session = getIndianMarketSession();
      const shouldForce = isForced || forceSyncOverride;
      const res = await fetch(`/api/market-data${shouldForce ? '?force=true' : ''}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const latencyMs = Date.now() - fetchStart;

      if (data.success && data.quotes) {
        const isSaving = !session.shouldSync && !shouldForce;
        setState({
          quotes: data.quotes,
          latencyMs,
          isLive: true,
          provider: data.provider || 'YAHOO_DELAYED_UNOFFICIAL',
          lastUpdated: data.timestamp || session.istTimeString,
          error: null,
          geminiCreditsUsed: 0,
          zeroCreditMode: true,
          countdownSeconds: Math.max(1, Math.round(pollingIntervalMs / 1000)),
          lastTickTimestamp: Date.now(),
          intervalMs: pollingIntervalMs,
          marketSession: session,
          isPacketSaverActive: isSaving,
          packetsSavedCount: data.packetsSavedToday ?? 0,
          forceSyncOverride: shouldForce,
        });
        setCountdown(Math.max(1, Math.round(pollingIntervalMs / 1000)));
      }
    } catch (err: any) {
      const session = getIndianMarketSession();
      setState((prev) => ({
        ...prev,
        // Correctly signal that the live feed is DOWN so the UI can warn the user
        isLive: false,
        error: err.message || 'Failed to fetch market data',
        lastUpdated: session.istTimeString,
        lastTickTimestamp: Date.now(),
        marketSession: session,
        isPacketSaverActive: !session.shouldSync && !forceSyncOverride,
      }));
      setCountdown(Math.max(1, Math.round(pollingIntervalMs / 1000)));
    }
  }, [pollingIntervalMs, forceSyncOverride]);

  // Market Session Monitor & Adaptive Polling
  useEffect(() => {
    // Initial fetch on mount so closing prices load immediately
    fetchQuotes(false);

    const session = getIndianMarketSession();
    const isStreamingActive = session.shouldSync || forceSyncOverride;

    if (isStreamingActive) {
      // Regular Market Session (09:15 - 15:30 IST) — rapid live polling
      const interval = setInterval(() => fetchQuotes(false), pollingIntervalMs);
      return () => clearInterval(interval);
    } else {
      // Market Closed — packet saver mode; check every 5 s if market opens
      const standbyInterval = setInterval(() => {
        const currentSession = getIndianMarketSession();
        if (currentSession.shouldSync) {
          fetchQuotes(false);
        }
      }, 5000);
      return () => clearInterval(standbyInterval);
    }
  }, [fetchQuotes, pollingIntervalMs, forceSyncOverride]);

  // 1-second countdown tick for UI feedback (only when actively streaming)
  useEffect(() => {
    const session = getIndianMarketSession();
    if (!session.shouldSync && !forceSyncOverride) return;

    const timer = setInterval(() => {
      setCountdown((prev) =>
        prev > 1 ? prev - 1 : Math.max(1, Math.round(pollingIntervalMs / 1000)),
      );
    }, 1000);
    return () => clearInterval(timer);
  }, [pollingIntervalMs, forceSyncOverride]);

  return {
    ...state,
    countdownSeconds: countdown,
    refetch: () => fetchQuotes(true),
    forceSyncOverride,
    setForceSyncOverride,
    toggleForceSyncOverride,
  };
}

/**
 * Dedicated hook for Institutional Equity Radar stocks LTP stream.
 * Defaults to 10 seconds with 0 Gemini Credits.
 */
export function useRadarStocksLtpData(intervalMs = 10000) {
  return useLiveMarketData(intervalMs);
}
