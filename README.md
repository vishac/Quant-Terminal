# J.A.R.V.I.S. Institutional Quant & Autonomous 5-Agent Terminal

> **Standing Engineering Rule**: Whenever any code, data pipeline, risk engine, or UI workflow change is performed, `PROJECT_INSTRUCTIONS.md` (workspace + artifact), `README.md`, and in-app info tooltips must be updated in lockstep.

## Core Architecture & Operational Directives

1. **Upstox Analytics Gateway (Primary — No Static IP Required)**:
   - Per [Upstox Analytics Token Supported APIs](https://upstox.com/developer/api-documentation/analytics-token/#supported-apis), Market Quote (`/market-quote/quotes`), Option Chain (`/option/chain`), Historical Candles, Market Information, and WebSockets require **no Static IP**.
   - This terminal operates strictly in **Analytics & Autonomous Paper-Trading Mode** (no live money orders are dispatched to brokers).
   - Pairing an Upstox Analytics Token in **Sync Hub -> Broker Gateway** verifies via `/market-quote/quotes` and switches both the live market ticker and the 45-stock Dynamic Breakout Radar to **real-time Upstox v2 quotes (`UPSTOX_ANALYTICS_REALTIME` / `UPSTOX_PRIMARY_LIVE`)** across NIFTY 50, SENSEX, NIFTY BANK, INDIA VIX, and 45 liquid NSE equities mapped by ISIN.

2. **Chartink Placed as Auto-Failover Backup (`CHARTINK_BACKUP_AUTO_FAILOVER`) & Dynamic Gateway Switching**:
   - Chartink is **not** needed when Upstox is paired and healthy.
   - Chartink is configured as an **automatic backup** that triggers only if the Upstox token is unpaired or if the Upstox API encounters an error.
   - Every modal footer, Per-Stock Live Audit Evidence modal, Split Dossier telemetry box, and CSV export dynamically switches its **Feed Tier** and **API Gateway URL** between `https://api.upstox.com/v2/market-quote/quotes` (`Upstox Analytics v2 Live NSE Quotes (Primary)`) and `https://chartink.com/screener/process` (`Chartink NSE Technical Screener (Auto-Failover Backup)`) based on the live connection.

3. **Live vs. Failover/Delayed Transparency (`Info` Icons)**:
   - Interactive `Info` icons in the **Header**, **Viewer Dashboard**, **Institutional Equity Radar**, **5-Agent Desk**, **Trade History**, **Broker Stream Gateway**, and **Settings** clearly indicate whether the terminal is streaming **Upstox Real-Time Data (Primary)** or **Chartink / Yahoo Failover Data**.

4. **Zero Static Seed Trades & Autonomous 5-Agent Execution**:
   - The legacy 11 rows of `INITIAL_INSTITUTIONAL_PAPER_TRADES` have been permanently removed.
   - When armed, the 5 autonomous agents (**Chanakya**, **Bhishma**, **Arjuna**, **Kuber**, **Vidura**) automatically evaluate incoming market ticks via `runAutonomousAgentCycleIfArmed()`, execute defined-risk paper trades across **NSE F&O, NSE Cash, BSE Cash, and MCX Commodity**, compute dynamic Risk-to-Reward (`1:X.XX`), and assist with broader market views.
   - All executed paper trades are logged in the dedicated **Trade History** view with `Date (dd-mmm-yyyy)` and 24-hour `Time ([hh]:mm:ss)` columns.

5. **Standby / Unused Brokers Hidden & Unused Broker Audit Logs Removed**:
   - Non-used brokers (**Zerodha Kite**, **Dhan HQ**, **Aditya Birla Money**, **Angel One**) are hidden by default (`showUnusedBrokers = false`) behind a toggle button while preserving their standby card code.
   - All unused broker audit log line items, Live Stream Allocation Matrix rows, and Socket Saturation gauges have been cleaned up to display **Upstox Analytics v2 (Primary)**, **Chartink Auto-Failover Backup**, and the **5-Agent Paper Execution Engine**.

6. **5-Factor Quantitative Conviction Score & ≥88/100 Execution Qualification Gate**:
   - Every stock's **Conviction Score (`0–100`)** is the weighted composite of 5 stock-specific pillars: `Round(0.20×O + 0.25×M + 0.25×Q + 0.15×R + 0.15×S)`.
   - **`88/100` is the Minimum Execution Qualification Gate**: stocks scoring **`≥ 88/100`** are marked **`✓ EXEC QUALIFIED (≥88 · Tier 1 Alpha)`**, whereas stocks scoring **`80–87/100`** are marked **`WATCHLIST (80–87 · -X TO 88)`** awaiting intraday volume or momentum expansion.
   - All 45 NSE equities use audited stock-specific fundamentals (`ROCE`, `ROE`, `PAT YoY Growth`, `D/E`, `20D Avg Volume`, `Delivery %`, `RS Percentile`, `ATR %`, and `Sovereign Moat`) blended with live exchange ticks so no two stocks share artificial step-bucket scores.

7. **Plain-English 4-Core Operational Workflow (`REV-017`)**:
   - **`1. Market Finder`** *(Screener, 52W-Low Bottoms, Bear Puts & Elections)*
   - **`2. Stress Lab`** *(War, India/US Elections & 10-Point Audit)*
   - **`3. AI Council`** *(5-Agent Consensus Debate & NSE Option Chain)*
   - **`4. Order Book`** *(Live Trades, `<1.5%` DD Guard, T-1 Tax & Brokerage Calendar, User Guide & Revert Ledger)*

8. **12-Vector Macro-Causal, Full-Cycle India Lok Sabha + US Primary/Mid-Term/Presidential Elections & 3-Layer FII/DII/Pro vs. Retail Flow Engine (`src/services/macroCausalLearningEngine.ts`)**:
   - Continuously evaluates **12 Live Vectors**: (1) Market Regime & VIX, (2) Live News RSS, (3) US Dollar (`DX-Y.NYB` & `INR=X`), (4) Global Markets, (5) Domestic Govt/RBI/SEBI Policy Rules, (6) US Fed Rates (`^TNX` & `^IRX`), (7) US Jobs/NFP, (8) Gold (`GC=F`) & Silver (`SI=F`), (9) Brent Oil (`BZ=F` / `CL=F`) & Natural Gas (`NG=F`), (10) War & Geopolitical Escalation Index, (11) **3-Layer FII / DII / Pro vs. Retail (`Client`) Futures LSR & Cash Flow**, and (12) **Full-Cycle Global & Domestic Sovereign Elections (`vec_us_midterms`)** simultaneously modeling **India Lok Sabha General & Key State Assembly Elections** (`INDIA_LIVE_CONTINUITY_TRACKING`, `INDIA_LOKSABHA_CONTINUITY_CAPEX`, `INDIA_MCC_PRE_POLL_PAUSE`, `INDIA_LOKSABHA_COALITION_POPULIST`) alongside **US Primary, Mid-Term & Presidential Elections** (`LIVE_DYNAMIC_TRACKING`, `US_PRIMARY_RHETORIC_VOLATILITY`, `GRIDLOCK_DIVIDED_CONGRESS`, `TARIFF_HAWK_SWEEP`, `FISCAL_STIMULUS_SWEEP`).

9. **Dual-Mode 52W-Low Institutional Bottom Accumulation & Bear-Market Put (`PE`) F&O Scanner with `T1 / T2 / T3` & Non-Erosion Ratchet (`src/services/scriptLearningEngine.ts`)**:
   - **Mode A (`BOTTOM_ACCUMULATION_LONG`)**: Identifies high-potential NSE equities near their 52-week low / cycle bottom showing institutional delivery absorption and asymmetric rebound potential (`T1`, `T2`, `T3`).
   - **Mode B (`BEAR_MARKET_PUT_FNO`)**: Identifies bearish Put (`PE`) F&O setups (Index NIFTY Puts and weak/headwind equity Puts) to profit when the market or script is low, with `T1`, `T2`, and `T3` option premium targets.
   - **Non-Erosion Step-Ratchet Exit Plan**: (Stage 1) Hard initial stop (`-2.5%` cash / `-18%` option premium); (Stage 2) At `T1`, book `33%` and ratchet SL to `Cost + Statutory Friction`; (Stage 3) At `T2`, book `33%` and lock SL at `T1`; (Stage 4) Trail final `34%` runner toward `T3` with a `1.5x ATR` / `15-min VWAP` ratchet.

10. **Calendarized T-1 Pre-Market Statutory Tax, SEBI & Brokerage Rule Radar + Before/After Order Ledger (`src/services/statutoryVetoEngine.ts`)**:
    - Automatically stages upcoming statutory tax, SEBI turnover, exchange fee, and brokerage rules **`T-1 Day` before Go-Live** with a prominent pre-market alert banner so the operator can manually **Approve** or **Defer** the rule before `09:15 IST` market open.
    - Permanently stamps `taxRuleVersionId` and `taxRuleVersionLabel` onto every executed order so historical trades preserve their exact **Before** statutory calculation while post-approval trades use the **After** calculation.

11. **5-Stage Inter-Agent Consensus Council, Universal `> 2.00%` Net Profit Veto Gate & `<= 1.50%` Intraday Drawdown Sizer**:
    - Every automated and manual trade across all 4 Cores passes through the sequential 5-Stage Council and pre-trade statutory friction veto (`Net Profit > 2.00%`, `Gross/Friction >= 3.0x`, `Max Daily Intraday Drawdown <= 1.50%` synchronized across both frontend and `src/server/riskEngine.ts`).
    - **Overnight Gap vs. Intraday Stop Disclosure**: While intraday drawdown is capped at `<= 1.50%` during market hours, overnight cash equity positions can gap through stops at the `09:15 IST` open (explicitly modelled as gap-through-stop fills at the Open in `src/server/backtester.ts`).
    - **Strict Lot-Sizing Cap (`src/services/positionSizer.ts`)**: Never forces `1 lot` when 1 lot exceeds the operator's `maxRiskInr` or `maxOrderNotionalInr` cap.

12. **Remediated Backtester (`src/server/backtester.ts`) & Automated Data Sync CLI (`npm run data:sync`)**:
    - Models **Next-Bar Open + 5 bps slippage** entries, **intraday Low (`candle.low`) stop checks**, **Gap-Through-Stop fills at the Open**, **monotonic High-Water-Mark ATR trailing stops**, and **Indian Cash-Delivery round-trip statutory costs (`0.2222%`) + `10 bps` slippage**.
    - Excludes unrealized open positions from Win Rate, Profit Factor, Expectancy, and *t*-statistics; subtracts the `6.50%` annualized risk-free rate in Sharpe/Sortino; and computes López de Prado `PSR` using per-period (daily) Sharpe and daily skewness/kurtosis.
    - Run `npm run data:sync` (`scripts/sync-data.ts`) to execute automated historical candle validation and write an IN-SAMPLE summary to `.data/latest_backtest_sync.json` (single fixed-parameter run per symbol and strategy; not walk-forward, not out-of-sample evidence).

13. **Standalone & In-App User Guide + Complete Revert Ledger (`REV-001` – `REV-019`)**:
    - See `USER_GUIDE_STRENGTHS_AND_LIMITATIONS.md` (and Sub-Tab `06` inside **`4. Order Book`**) for reconciled feed disclosures (Upstox real-time when paired vs. Yahoo Finance delayed fallback when unpaired), heuristic prior disclaimers, and structural limitations.
    - All architectural changes (`REV-001` through `REV-019`) are documented in `PROJECT_CHANGELOG_AND_REVERT_LEDGER.md` and `src/data/architectureRevertLedger.ts`.


