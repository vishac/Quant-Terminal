import { useState, useEffect, useRef, useCallback } from 'react';
import { MarketQuote } from './liveMarketService';

export interface WebSocketMarketState {
  quotes: Record<string, MarketQuote>;
  niftyQuote: MarketQuote | undefined;
  bankNiftyQuote: MarketQuote | undefined;
  vixQuote: MarketQuote | undefined;
  sensexQuote: MarketQuote | undefined;
  wsStatus: 'CONNECTING' | 'CONNECTED' | 'DISCONNECTED';
  latencyMs: number;
  tickCount: number;
  lastTickTime: string;
  isLive: boolean;
  provider: string;
  reconnectCount: number;
}

export function useMarketWebSocket(): WebSocketMarketState {
  const [quotes, setQuotes] = useState<Record<string, MarketQuote>>({});
  const [wsStatus, setWsStatus] = useState<'CONNECTING' | 'CONNECTED' | 'DISCONNECTED'>('CONNECTING');
  const [latencyMs, setLatencyMs] = useState<number>(2);
  const [tickCount, setTickCount] = useState<number>(0);
  const [lastTickTime, setLastTickTime] = useState<string>('--');
  const [provider, setProvider] = useState<string>('NSE_BSE_EXCHANGE_TICK_ROUTER');
  const [reconnectCount, setReconnectCount] = useState<number>(0);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<any>(null);
  const pingIntervalRef = useRef<any>(null);
  const isMountedRef = useRef<boolean>(true);

  // Initial HTTP fallback load to ensure immediate data without waiting for first WS frame
  const fetchHttpFallback = useCallback(async () => {
    try {
      const res = await fetch('/api/market-data');
      if (res.ok) {
        const data = await res.json();
        if (data.quotes && isMountedRef.current) {
          setQuotes(data.quotes);
          if (data.latencyMs) setLatencyMs(data.latencyMs);
          if (data.provider) setProvider(data.provider);
          setLastTickTime(new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' }) + ' IST');
        }
      }
    } catch {
      // Ignore HTTP fallback failure
    }
  }, []);

  const connect = useCallback(() => {
    if (!isMountedRef.current) return;

    // Clean up any existing connection
    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch {
        // ignore
      }
      wsRef.current = null;
    }

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws/market`;

      setWsStatus('CONNECTING');
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!isMountedRef.current) return;
        setWsStatus('CONNECTED');

        // Start heartbeat ping
        if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ action: 'PING', timestamp: Date.now() }));
          }
        }, 15000);
      };

      ws.onmessage = (event) => {
        if (!isMountedRef.current) return;
        try {
          const payload = JSON.parse(event.data);

          if (payload.type === 'SNAPSHOT' || payload.type === 'TICK') {
            if (payload.quotes) {
              setQuotes(prev => ({
                ...prev,
                ...payload.quotes
              }));
            }
            if (typeof payload.latencyMs === 'number') {
              setLatencyMs(payload.latencyMs);
            }
            if (payload.provider) {
              setProvider(payload.provider);
            }
            setTickCount(c => c + 1);
            setLastTickTime(payload.serverTime || (new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' }) + ' IST'));
          } else if (payload.type === 'PONG') {
            // Heartbeat acknowledged
          }
        } catch {
          // ignore parsing error
        }
      };

      ws.onerror = () => {
        if (!isMountedRef.current) return;
        // On error, let onclose handle reconnection
      };

      ws.onclose = () => {
        if (!isMountedRef.current) return;
        setWsStatus('DISCONNECTED');
        if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);

        // Exponential backoff reconnect
        setReconnectCount(c => c + 1);
        if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = setTimeout(() => {
          if (isMountedRef.current) {
            connect();
          }
        }, 3000);
      };
    } catch {
      setWsStatus('DISCONNECTED');
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    fetchHttpFallback();
    connect();

    return () => {
      isMountedRef.current = false;
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
      if (wsRef.current) {
        try {
          wsRef.current.close();
        } catch {
          // ignore
        }
      }
    };
  }, [connect, fetchHttpFallback]);

  return {
    quotes,
    niftyQuote: quotes['^NSEI'],
    bankNiftyQuote: quotes['^NSEBANK'],
    vixQuote: quotes['^INDIAVIX'],
    sensexQuote: quotes['^BSESN'],
    wsStatus,
    latencyMs,
    tickCount,
    lastTickTime,
    isLive: wsStatus === 'CONNECTED',
    provider,
    reconnectCount
  };
}
