# Phase 2/3 Build Log — Risk Engine, Backtester, Greeks, Sandbox Broker

Added on top of the Phase-1 honesty/security pass. **No real capital is involved** — all order placement is SANDBOX only, keyed off the owner gate. Confirmed scope with owner: stub broker (Dhan-shaped), keep free delayed data + build greeks math feed-ready, build Risk Engine + Backtester now, everything stays SIMULATION until an explicit Phase-3 sign-off.

## New backend modules
- `src/server/greeks.ts` — Black-Scholes (European) pricing + delta/gamma/theta(per-day)/vega(per 1%)/rho and a Newton implied-vol solver. Pure math, ready for a real option-chain feed. Labelled "not broker-exact".
- `src/server/riskEngine.ts` — in-memory **Guarded Risk Engine**: kill-switch (manual + auto-trip on daily-loss breach), daily-loss limit, max open positions, per-order & per-symbol notional caps, max lots/order, and **approximate SEBI-style margin** (equity delivery/intraday, option buy = premium, option sell/futures ≈ SPAN+Exposure % of underlying). A sandbox order router records positions and margin used.
- `src/server/backtester.ts` — **Backtesting harness** over REAL free Yahoo daily candles. One defined, rules-based strategy per agent (Chanakya=Bollinger mean-reversion, Bhishma=MA crossover, Arjuna=Donchian breakout, Kuber=RSI swing, Vidura=200-SMA regime filter). Computes total return vs buy&hold, max drawdown, win rate, Sharpe, trade list, equity curve. Honestly labelled an underlying daily-candle proxy (not option-level; no costs/slippage/taxes).

## New endpoints (all owner-gated; backtest also rate-limited)
`GET/POST /api/risk/config` · `GET /api/risk/state` · `POST /api/risk/kill-switch` · `POST /api/risk/day-pnl` · `POST /api/risk/evaluate` · `POST /api/broker/sandbox/order` · `GET /api/broker/sandbox/orders` · `POST /api/broker/sandbox/reset` · `POST /api/greeks/compute` · `GET /api/backtest/strategies` · `POST /api/backtest/run`

## New frontend
- `GuardedRiskControl.tsx` (sidebar "Guarded Risk") — kill-switch, editable limits, day-P&L simulator, pre-trade guard check, sandbox order placement + open positions. SIMULATION banner throughout.
- `BacktestLab.tsx` (sidebar "Backtest Lab") — pick symbol/agent/range, run, see metric cards, an equity-curve chart (strategy vs buy&hold) and a trades table, with the proxy disclaimer.

## Verification (local)
`tsc --noEmit` ✅ · `vite build` ✅ · 11 backend curl assertions: greeks + IV solver ✅, owner gate (401) ✅, config set ✅, order-cap / lot-cap blocks ✅, daily-loss auto-trips kill-switch ✅, kill-switch blocks orders (422) ✅, sandbox accept + position tracking ✅, backtest over real Yahoo history (246 bars) ✅, invalid strategy 400 ✅.

> Platform `testing_agent` (browser automation on the Emergent preview) cannot reach this Vite+Express app because the Emergent supervisor is fixed to CRA+FastAPI; verification was done via tsc, vite build, and backend curl.

## Still required before any Phase-3 live capital (not done — needs your keys/decisions)
- A connected broker (Dhan access-token or Kite OAuth) replacing the sandbox stub.
- A licensed real-time + option-chain feed to drive greeks and live risk off real data.
- Persisted state (DB) instead of in-memory, full audit logging, and broker-exact margin.
- A deliberate go-live switch after a period of forward paper-trading review.
