# J.A.R.V.I.S. Institutional Quant & Autonomous 5-Agent Terminal

> **Standing Engineering Rule**: Whenever any code, data pipeline, risk engine, or UI workflow change is performed, `PROJECT_INSTRUCTIONS.md` (workspace + artifact), `README.md`, and in-app info tooltips must be updated in lockstep.

## Core Architecture & Operational Directives

1. **Upstox Analytics Gateway (Primary — No Static IP Required)**:
   - Per [Upstox Analytics Token Supported APIs](https://upstox.com/developer/api-documentation/analytics-token/#supported-apis), Market Quote (`/market-quote/quotes`), Option Chain (`/option/chain`), Historical Candles, Market Information, and WebSockets require **no Static IP**.
   - This terminal operates strictly in **Analytics & Autonomous Paper-Trading Mode** (no live money orders are dispatched to brokers).
   - Pairing an Upstox Analytics Token in **Sync Hub -> Broker Gateway** verifies via `/market-quote/quotes` and switches both the live market ticker and the 45-stock Dynamic Breakout Radar to **real-time Upstox v2 quotes (`UPSTOX_ANALYTICS_REALTIME` / `UPSTOX_PRIMARY_LIVE`)** across NIFTY 50, SENSEX, NIFTY BANK, INDIA VIX, and 45 liquid NSE equities mapped by ISIN.

2. **Chartink Placed as Auto-Failover Backup (`CHARTINK_BACKUP_AUTO_FAILOVER`)**:
   - Chartink is **not** needed when Upstox is paired and healthy.
   - Chartink is configured as an **automatic backup** that triggers only if the Upstox token is unpaired or if the Upstox API encounters an error.

3. **Live vs. Failover/Delayed Transparency (`Info` Icons)**:
   - Interactive `Info` icons in the **Header**, **Viewer Dashboard**, **Institutional Equity Radar**, **5-Agent Desk**, **Trade History**, **Broker Stream Gateway**, and **Settings** clearly indicate whether the terminal is streaming **Upstox Real-Time Data (Primary)** or **Chartink / Yahoo Failover Data**.

4. **Zero Static Seed Trades & Autonomous 5-Agent Execution**:
   - The legacy 11 rows of `INITIAL_INSTITUTIONAL_PAPER_TRADES` have been permanently removed.
   - When armed, the 5 autonomous agents (**Chanakya**, **Bhishma**, **Arjuna**, **Kuber**, **Vidura**) automatically evaluate incoming market ticks via `runAutonomousAgentCycleIfArmed()`, execute defined-risk paper trades across **NSE F&O, NSE Cash, BSE Cash, and MCX Commodity**, compute dynamic Risk-to-Reward (`1:X.XX`), and assist with broader market views.
   - All executed paper trades are logged in the dedicated **Trade History** view with `Date (dd-mmm-yyyy)` and 24-hour `Time ([hh]:mm:ss)` columns.

5. **Standby / Unused Brokers Hidden & Unused Broker Audit Logs Removed**:
   - Non-used brokers (**Zerodha Kite**, **Dhan HQ**, **Aditya Birla Money**, **Angel One**) are hidden by default (`showUnusedBrokers = false`) behind a toggle button while preserving their standby card code.
   - All unused broker audit log line items, Live Stream Allocation Matrix rows, and Socket Saturation gauges have been cleaned up to display **Upstox Analytics v2 (Primary)**, **Chartink Auto-Failover Backup**, and the **5-Agent Paper Execution Engine**.
