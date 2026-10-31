# J.A.R.V.I.S. Institutional Quant & Autonomous 5-Agent Terminal

> **Standing Engineering Rule**: Whenever any code, data pipeline, risk engine, or UI workflow change is performed, `PROJECT_INSTRUCTIONS.md` (workspace + artifact), `README.md`, and in-app info tooltips must be updated in lockstep.

## Core Architecture & Operational Directives

1. **Upstox Analytics Gateway (No Static IP Required)**:
   - Per [Upstox Analytics Token Supported APIs](https://upstox.com/developer/api-documentation/analytics-token/#supported-apis), Market Quote (`/market-quote/quotes`), Option Chain (`/option/chain`), Historical Candles, Market Information, and WebSockets require **no Static IP**.
   - This terminal operates strictly in **Analytics & Autonomous Paper-Trading Mode** (no live money orders are dispatched to brokers).
   - Pairing an Upstox Analytics Token in **Sync Hub -> Broker Gateway** verifies via `/market-quote/quotes` and switches the market feed from the delayed fallback (`YAHOO_DELAYED_UNOFFICIAL`) to **real-time Upstox v2 quotes (`UPSTOX_ANALYTICS_REALTIME`)** across NIFTY 50, SENSEX, NIFTY BANK, INDIA VIX, and 31 NSE equities mapped by ISIN.

2. **Live vs. Delayed Feed Transparency (`Info` Icons)**:
   - Interactive `Info` icons in the **Header**, **5-Agent Desk**, **Trade History**, **Broker Stream Gateway**, and **Settings** clearly indicate whether the terminal is currently streaming **Upstox Real-Time Data** or **Yahoo Finance Delayed Fallback Data (~15m delayed)**.

3. **Zero Static Seed Trades & Autonomous 5-Agent Execution**:
   - The legacy 11 rows of `INITIAL_INSTITUTIONAL_PAPER_TRADES` have been permanently removed.
   - When armed, the 5 autonomous agents (**Chanakya**, **Bhishma**, **Arjuna**, **Kuber**, **Vidura**) automatically evaluate incoming market ticks via `runAutonomousAgentCycleIfArmed()`, execute defined-risk paper trades across **NSE F&O, NSE Cash, BSE Cash, and MCX Commodity**, compute dynamic Risk-to-Reward (`1:X.XX`), and assist with broader market views.
   - All executed paper trades are logged in the dedicated **Trade History** view with `Date (dd-mmm-yyyy)` and 24-hour `Time ([hh]:mm:ss)` columns.

4. **Standby / Unused Brokers Hidden by Default**:
   - Non-used brokers (**Zerodha Kite**, **Dhan HQ**, **Aditya Birla Money**, **Angel One**) are hidden by default (`showUnusedBrokers = false`) behind a toggle button so **Upstox Analytics Gateway** is prominently focused, while preserving their code in the repository.
