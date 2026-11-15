/**
 * Independent pre-trade gate for NEW long entries. Sizing proposes a quantity; this gate re-checks it
 * against hard limits so a sizing bug cannot silently breach them. Deterministic, no model calls.
 *
 * Daily-bar note: "daily_loss_cooldown" blocks new entries after a day whose equity change was at or
 * below -maxDailyLossPct. A true intraday loss limit needs intraday marks, which this stage does not have.
 */
export interface GateConfig {
  maxPositions: number;
  maxPositionPct: number; // notional cap per position, % of equity
  maxRiskPct: number; // hard cap on loss-if-stopped, % of equity
  maxDailyLossPct: number;
  haltDrawdownPct: number; // block new entries while equity is this far below its peak
}

export const GATE_DEFAULTS = { maxRiskPct: 1.0, maxDailyLossPct: 1.5 } as const;

export interface GateInput {
  symbol: string;
  qty: number;
  fill: number;
  stop: number;
  entryCost: number;
  equity: number;
  cash: number;
  peak: number;
  openCount: number;
  hasPosition: boolean;
  lastDayReturnPct: number;
  killSwitch: boolean;
}

export type GateCode =
  | 'kill_switch'
  | 'bad_order'
  | 'duplicate_position'
  | 'max_positions'
  | 'risk_cap'
  | 'position_cap'
  | 'cash'
  | 'daily_loss_cooldown'
  | 'drawdown_halt';

export interface GateResult {
  allowed: boolean;
  codes: GateCode[]; // every violated rule, in priority order
  messages: string[];
}

export function evaluateEntry(i: GateInput, c: GateConfig): GateResult {
  const codes: GateCode[] = [];
  const messages: string[] = [];
  const fail = (code: GateCode, msg: string) => {
    codes.push(code);
    messages.push(msg);
  };

  if (i.killSwitch) fail('kill_switch', 'Kill switch is active: no new entries.');
  const badOrder = !(i.qty >= 1) || !Number.isInteger(i.qty) || !(i.fill > 0) || !(i.stop > 0) || !(i.stop < i.fill) || !(i.equity > 0);
  if (badOrder) {
    fail('bad_order', 'Order needs integer qty >= 1, 0 < stop < fill, and positive equity.');
  }
  if (i.hasPosition) fail('duplicate_position', `Already holding ${i.symbol}.`);
  if (i.openCount >= c.maxPositions) fail('max_positions', `Max open positions (${c.maxPositions}) reached.`);
  if (!badOrder) {
    const risk = i.qty * (i.fill - i.stop);
    if (risk > (i.equity * c.maxRiskPct) / 100 + 1e-9) {
      fail('risk_cap', `Loss if stopped ${risk.toFixed(0)} exceeds ${c.maxRiskPct}% of equity.`);
    }
    if (i.qty * i.fill > (i.equity * c.maxPositionPct) / 100 + 1e-9) {
      fail('position_cap', `Notional exceeds ${c.maxPositionPct}% of equity.`);
    }
    if (i.qty * i.fill + i.entryCost > i.cash + 1e-9) fail('cash', 'Insufficient cash including entry costs.');
  }
  if (i.lastDayReturnPct <= -c.maxDailyLossPct) {
    fail('daily_loss_cooldown', `Last day lost ${i.lastDayReturnPct.toFixed(2)}% (limit -${c.maxDailyLossPct}%).`);
  }
  if (i.peak > 0 && ((i.peak - i.equity) / i.peak) * 100 >= c.haltDrawdownPct) {
    fail('drawdown_halt', `Drawdown from peak is at or beyond ${c.haltDrawdownPct}%.`);
  }
  return { allowed: codes.length === 0, codes, messages };
}
