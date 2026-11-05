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

7. **12-Vector Macro-Causal, 2026 US Mid-Term Elections & 3-Layer FII/DII/Pro vs. Retail Flow Engine (`src/services/macroCausalLearningEngine.ts`)**:
   - Continuously evaluates **12 Live Vectors**: (1) Market Regime & VIX, (2) Live News RSS, (3) US Dollar (`DX-Y.NYB` & `INR=X`), (4) Global Markets, (5) Domestic Govt/RBI/SEBI Policy Rules, (6) US Fed Rates (`^TNX` & `^IRX`), (7) US Jobs/NFP, (8) Gold (`GC=F`) & Silver (`SI=F`), (9) Brent Oil (`BZ=F` / `CL=F`) & Natural Gas (`NG=F`), (10) War & Geopolitical Escalation Index, (11) **3-Layer FII / DII / Pro vs. Retail (`Client`) Futures LSR & Cash Flow**, and (12) **2026 US Mid-Term Elections & Indo-US Sectoral Transmission (`vec_us_midterms`)**.
   - In `LIVE_EXCHANGE_FEED` mode, FII/DII Cash and Futures LSR numbers are dynamically derived on every tick from live NSE/FX/heavyweight price and breadth telemetry so zero metrics sit static.

8. **5-Stage Inter-Agent Shared-Blackboard Consensus Council & `<= 1.50%` (`< 2.00%`) Drawdown Quarter-Kelly Sizer**:
   - Every candidate trade passes through a sequential 5-Stage Council (`Stage 1 Kuber Macro/War` $\rightarrow$ `Stage 2 Chanakya 3-Layer FII/DII & US Mid-Term Flow` $\rightarrow$ `Stage 3 Arjuna/Bhishma Structure & Official Tuesday/Holiday Expiry` $\rightarrow$ `Stage 4 Vidura Adversarial Red-Team Critic` $\rightarrow$ `Stage 5 Execution Governor`).
   - Enforces a **98.50% Intraday Protected Capital Floor** (`Max Daily Drawdown <= 1.50%`, strictly `< 2.00%`). Per-trade `1R` stop risk scales between `0.20%` and `0.45%` of total equity via Quarter-Kelly $\times$ Volatility Target while deploying full working capital notional.

9. **2026 Indian Statutory Tax + `> 2.00%` Net Profit Veto Gate & 3-State Anti-Whipsaw Shield (`src/services/statutoryVetoEngine.ts`)**:
   - Pre-calculates round-trip 2026 STT/CTT, Exchange+IPFT, SEBI, Stamp Duty, 18% GST, and `₹20`/order flat brokerage. Vetoes any trade with `Gross Profit / Friction < 3.0x` or `Net Profit <= 2.00%` (`<= 2.50%` during shocks or post-loss recovery).
   - **3-State Anti-Whipsaw Protocol**: (1) Locks **82% of peak unrealized profit** on open winners during macro/war shocks; (2) Parks freed capital from stopped-out losers in **100% Protected Cash** (blocking blind same-tick rotation); (3) Requires **3-tick persistence** + `> 2.50%` Net Profit before redeploying cash.

10. **Interactive Brutal Stress-Test Lab & Revert Ledger (`REV-001` – `REV-015`)**:
    - Core 2 (`src/components/BrutalStressTestLab.tsx`) provides 7 crisis/election presets, custom multi-vector sliders, a 2026 US Mid-Term Election stance selector, 1-click Reset to Live Feed, and a **Deterministic 10-Point Brutal Audit Scorecard**.
    - All architectural changes (`REV-001` through `REV-015`) are documented with 1-step revert instructions in `PROJECT_CHANGELOG_AND_REVERT_LEDGER.md` and `src/data/architectureRevertLedger.ts`.
