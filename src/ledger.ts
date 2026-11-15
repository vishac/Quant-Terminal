import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

export type ExitReason = 'stop' | 'stop_gap' | 'time';

export interface Trade {
  symbol: string;
  entryDate: string;
  exitDate: string;
  entryFill: number;
  exitFill: number;
  qty: number;
  grossPnl: number;
  costs: number;
  netPnl: number;
  netReturnPct: number;
  rMultiple: number; // net P&L / initial risk (qty * stopDist)
  bars: number;
  exitReason: ExitReason;
}

export interface PosState {
  symbol: string;
  qty: number;
  entryFill: number;
  entryDate: string;
  entryCost: number;
  stop: number;
  stopDist: number;
  highestClose: number;
  barsHeld: number;
  exitAtNextOpen: boolean;
  managedThrough: string; // last date this position was processed ('' = not yet); makes reruns idempotent
}

export interface Planned {
  symbol: string;
  atr: number;
  dist: number;
  signalDate: string;
}

export interface CurvePoint {
  date: string;
  equity: number;
  exposurePct: number;
}

export type LedgerEvent =
  | { type: 'INIT'; capital: number }
  | { type: 'ENTRY_FILLED'; date: string; symbol: string; qty: number; fill: number; entryCost: number; stop: number; stopDist: number }
  | { type: 'ENTRY_SKIPPED'; date: string; symbol: string; reason: string }
  | { type: 'POSITION_UPDATED'; date: string; symbol: string; stop: number; highestClose: number; barsHeld: number; exitAtNextOpen: boolean }
  | { type: 'POSITION_CLOSED'; date: string; trade: Trade; exitCost: number }
  | { type: 'SIGNALS'; date: string; items: Planned[] }
  | { type: 'DAY_CLOSED'; date: string; equity: number; exposurePct: number }
  | { type: 'KILL_SWITCH'; active: boolean; reason: string };

export interface LedgerState {
  initialized: boolean;
  capital: number;
  cash: number;
  equity: number; // as of the last DAY_CLOSED
  peak: number;
  lastDayReturnPct: number;
  lastClosedDate: string;
  pos: Map<string, PosState>;
  pending: Planned[];
  trades: Trade[];
  curve: CurvePoint[];
  skipped: Record<string, number>;
  skipKeys: Set<string>;
  killSwitch: { active: boolean; reason: string };
}

export function emptyState(): LedgerState {
  return {
    initialized: false,
    capital: 0,
    cash: 0,
    equity: 0,
    peak: 0,
    lastDayReturnPct: 0,
    lastClosedDate: '',
    pos: new Map(),
    pending: [],
    trades: [],
    curve: [],
    skipped: {},
    skipKeys: new Set(),
    killSwitch: { active: false, reason: '' },
  };
}

/** The ONLY place state changes. Live runs and replays both go through here, so they cannot diverge. */
export function apply(s: LedgerState, e: LedgerEvent): void {
  switch (e.type) {
    case 'INIT':
      if (s.initialized) throw new Error('Ledger already initialized');
      s.initialized = true;
      s.capital = s.cash = s.equity = s.peak = e.capital;
      return;
    case 'ENTRY_FILLED':
      s.cash -= e.qty * e.fill + e.entryCost;
      s.pos.set(e.symbol, {
        symbol: e.symbol,
        qty: e.qty,
        entryFill: e.fill,
        entryDate: e.date,
        entryCost: e.entryCost,
        stop: e.stop,
        stopDist: e.stopDist,
        highestClose: e.fill,
        barsHeld: 0,
        exitAtNextOpen: false,
        managedThrough: '',
      });
      return;
    case 'ENTRY_SKIPPED': {
      const key = `${e.date}|${e.symbol}|${e.reason}`;
      if (s.skipKeys.has(key)) return;
      s.skipKeys.add(key);
      s.skipped[e.reason] = (s.skipped[e.reason] ?? 0) + 1;
      return;
    }
    case 'POSITION_UPDATED': {
      const p = s.pos.get(e.symbol);
      if (!p) throw new Error(`POSITION_UPDATED for unknown position ${e.symbol}`);
      p.stop = e.stop;
      p.highestClose = e.highestClose;
      p.barsHeld = e.barsHeld;
      p.exitAtNextOpen = e.exitAtNextOpen;
      p.managedThrough = e.date;
      return;
    }
    case 'POSITION_CLOSED':
      if (!s.pos.has(e.trade.symbol)) throw new Error(`POSITION_CLOSED for unknown position ${e.trade.symbol}`);
      s.cash += e.trade.qty * e.trade.exitFill - e.exitCost;
      s.trades.push(e.trade);
      s.pos.delete(e.trade.symbol);
      return;
    case 'SIGNALS':
      s.pending = e.items;
      return;
    case 'DAY_CLOSED':
      s.lastDayReturnPct = s.equity > 0 ? (e.equity / s.equity - 1) * 100 : 0;
      s.equity = e.equity;
      s.peak = Math.max(s.peak, e.equity);
      if (e.date > s.lastClosedDate) s.lastClosedDate = e.date;
      s.curve.push({ date: e.date, equity: e.equity, exposurePct: e.exposurePct });
      return;
    case 'KILL_SWITCH':
      s.killSwitch = { active: e.active, reason: e.active ? e.reason : '' };
      return;
    default:
      throw new Error(`Unknown ledger event type: ${(e as { type?: string }).type}`);
  }
}

export interface Store {
  append(line: string): void;
  readAll(): string[];
  dropLast?(): void;
}

export class MemoryStore implements Store {
  constructor(public lines: string[] = []) {}
  append(line: string) {
    this.lines.push(line);
  }
  readAll() {
    return [...this.lines];
  }
  dropLast() {
    this.lines.pop();
  }
}

/** Append-only JSON-lines file. One event per line; each append is a single write. */
export class FileStore implements Store {
  constructor(private path: string) {}
  append(line: string) {
    mkdirSync(dirname(this.path), { recursive: true });
    appendFileSync(this.path, line + '\n');
  }
  readAll() {
    return existsSync(this.path) ? readFileSync(this.path, 'utf8').split('\n').filter((l) => l.trim() !== '') : [];
  }
  dropLast() {
    const lines = this.readAll();
    lines.pop();
    writeFileSync(this.path, lines.map((l) => l + '\n').join(''));
  }
}

export class Ledger {
  readonly state: LedgerState = emptyState();
  /** A truncated final line (crash mid-write) is dropped and counted; corruption anywhere else throws. */
  droppedTrailingLines = 0;

  constructor(
    private store: Store | null,
    private clock: () => string = () => new Date().toISOString(),
  ) {
    if (!store) return;
    const lines = store.readAll();
    lines.forEach((l, i) => {
      let parsed: any;
      try {
        parsed = JSON.parse(l);
      } catch {
        if (i === lines.length - 1) {
          this.droppedTrailingLines++;
          store.dropLast?.();
          return;
        }
        throw new Error(`Ledger corrupt at line ${i + 1}; refusing to continue`);
      }
      const { ts: _ts, ...event } = parsed;
      apply(this.state, event as LedgerEvent);
    });
  }

  emit(e: LedgerEvent): void {
    // Validate against state first so a rejected event is never persisted.
    const probe = e.type === 'INIT' && this.state.initialized;
    if (probe) throw new Error('Ledger already initialized');
    this.store?.append(JSON.stringify({ ts: this.clock(), ...e }));
    apply(this.state, e);
  }
}
