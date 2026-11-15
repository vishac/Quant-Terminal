export interface Candle {
  date: string; // YYYY-MM-DD, exchange local date
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/** symbol -> candles in ascending date order */
export type Universe = Record<string, Candle[]>;
