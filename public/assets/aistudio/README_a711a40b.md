# qt-core (Stage 1 of the Quant-Terminal rewrite)

Long-only, cash-delivery **52-week-low accumulation** backtester with costs, intrabar stops,
fixed-fractional sizing, walk-forward selection and honest statistics. No UI, no live orders.

## Run
```
npm install
npm test                      # 27 tests
export UPSTOX_ANALYTICS_TOKEN=...   # never commit this
cp universe.example.json universe.json   # fill in instrument keys yourself
npx tsx src/cli.ts fetch --from 2015-01-01
npx tsx src/cli.ts backtest
npx tsx src/cli.ts walkforward
```

## What is fixed versus the old code
- Entries fill at the NEXT bar's open (+slippage); a test proves every entry follows a prior-bar signal.
- Stops are checked against the intraday low; a gap through the stop fills at the open.
- Real costs (STT, exchange, SEBI, stamp, GST, brokerage, DP) and slippage are deducted per trade.
- Sizing never forces a minimum position; trades whose risk budget cannot afford one share are skipped.
- Open positions are reported separately, never counted as closed trades.
- Statistics use a bootstrap CI on per-trade R, a Wilson interval for win rate, and Sharpe over an explicit risk-free ASSUMPTION.
- Parameters are chosen only on train windows; only test windows are out-of-sample.

## Not verified (check before trusting any net number)
- Cost fields marked UNVERIFIED in `src/costs.ts` (only delivery STT 0.1% is source-verified). Copy yours from a broker contract note.
- Whether Upstox daily candles are split/bonus adjusted (the v3 docs do not say). `fetch` prints a CHECK line when it sees a >35% close-to-close jump.
- The strategy defaults are hypotheses, not findings. The universe you choose can bias results (survivorship, hindsight).
- Network calls were not exercised against live Upstox from this environment; parsing is tested on a fixture shaped like the documented response.

## Stage 2: paper order book + risk gate
```
npx tsx src/cli.ts paper-run      # run after market close, after `fetch`; catches up any missed dates
npx tsx src/cli.ts paper-status   # equity, positions, stops, entries planned for the next open
npx tsx src/cli.ts kill on|off    # blocks NEW entries; stops and time exits keep running
```
- One engine (`src/engine.ts`) drives both the backtest and the paper trader, so they cannot disagree.
- State lives in an append-only ledger (`data/ledger.jsonl`). Every change goes through one reducer, so a replay reproduces live state exactly (tested).
- Reprocessing a date is a no-op; a crash mid-day is repaired by rerunning that date (tested). A truncated last line is repaired; corruption elsewhere stops the run.
- `src/riskgate.ts` independently re-checks every entry (kill switch, duplicate, max positions, risk cap, notional cap, cash, cooldown after a day losing >= 1.5%, drawdown halt). Sizing above the hard cap is rejected.
- Paper fills use the next bar's open plus slippage. Planned entries are shown by `paper-status`; the paper fill happens when the next bar appears.
- Limits: daily bars only, so there is no intraday loss limit and no live order routing. The ledger records what the engine would have done, not what you actually traded.

## Stage 3: Market Finder (read-only)
`tsx src/cli.ts scan [--asof YYYY-MM-DD] [--live]` ranks today's rule matches (closest to the 52W low first) and previews, per candidate, the plan, gate verdict and round-trip cost as % of 1R. It uses the same `checkSignal`, `planEntry` and `evaluateEntry` as the engine, so scan == what the engine would plan (parity tested, including the slot limit). It never writes the ledger or places orders.
- Near misses list which single rule failed. Stale and insufficient-history symbols are reported, not silently dropped. Held symbols are excluded.
- `--live` pulls Upstox v3 full quotes and flags GO / CAUTION / SKIP / NO_QUOTE (gap-up > 1 ATR, below planned stop, spread > 0.5%, near circuit, prev-close mismatch). These thresholds are untested hypotheses and the backtest enters at the open regardless of gaps, so acting on a flag departs from backtested behaviour.
- Not verified: the quote calls were never run against the live API (sandbox cannot reach Upstox; parsing is tested on fixtures built from the docs); pre-open `last_price` semantics are undocumented; a scan match is a rule match, not evidence of edge.

## Backlog (not built)
4 Stress Lab - 5 Rule-based council - 6 UI for the 4 cores - 7 F&O strategies - 8 Repo hygiene and security.
