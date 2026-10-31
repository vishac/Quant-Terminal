# J.A.R.V.I.S. Institutional Quant Terminal — Core Constitution & Directives

## 0. CONTINUOUS INSTRUCTION SYNCHRONIZATION MANDATE (STANDING HABIT)
- **Always Keep Instructions Current**: Whenever any feature, architectural change, bug fix, data source update, or workflow adjustment is performed, the engineer **MUST** proactively update `PROJECT_INSTRUCTIONS.md` (both in the workspace root and the artifact directory), `README.md`, and any relevant in-app documentation/info modals in the same work cycle.
- Never leave stale architectural notes or outdated status disclaimers in the codebase or instruction files.
- **Mandatory Tracking Sections**: The instructions file must always maintain an up-to-date **Log of Completed Items**, **Current Progress**, and **Next Steps** so that agreed scope, current implementation status, and future roadmap milestones are permanently recorded.

---

## 1. ABSOLUTE PROHIBITION OF DUMMY / DEMO / STATIC SEED DATA
Under no circumstances should dummy, mock, or hardcoded static seed trades be injected into the terminal dashboards, including the 5-Agent Desk and Trade History:

1. **Zero Static Paper Trade Seeds (`INITIAL_INSTITUTIONAL_PAPER_TRADES` Removed) & Unique Monotonic Order IDs**:
   - Never hardcode static seed rows (the legacy 11 rows of `INITIAL_INSTITUTIONAL_PAPER_TRADES` are permanently removed and any cached legacy IDs such as `ORD-NSE-FNO-101` are automatically stripped).
   - **Autonomous 5-Agent Paper Execution**: When the 5 autonomous agents (**Chanakya**, **Bhishma**, **Arjuna**, **Kuber**, **Vidura**) are armed and market quotes arrive, `runAutonomousAgentCycleIfArmed()` evaluates the broader market and automatically executes defined-risk paper trades across **NSE F&O, NSE Cash, BSE Cash, and MCX Commodity**, while assisting with broader market intelligence.
   - **Monotonic Unique Order & Leg IDs**: Because all 5 agents can execute simultaneously within the same millisecond (`Date.now()`), `generateLiveMarketOrder()` and `generateOrderFromDecisionScript()` must always append a monotonic sequence counter and agent prefix (`SIM-ORD-<AGENT>-<TIMESTAMP>-<SEQ>`), and `getStoredPaperTrades()` / `flattenOrdersToTrades()` must self-heal any colliding IDs in `localStorage` so React keys (`-leg-0`) are 100% unique.

2. **Capital Allocation**:
   - Capital allocations default to the ₹5,00,000 working paper-trading pool split equally across the 5 autonomous agents (₹1,00,000 each) and are directly adjustable by the operator via allocation controls.
   - Never hardcode arbitrary fake institutional figures (e.g., ₹2.5 Crore, ₹1 Crore).

3. **Realized & Unrealized P&L & Dynamic Risk-to-Reward**:
   - Realized and Unrealized P&L must be mathematically derived from `(liveMarketPrice - entryPrice) * quantity` (with 2026 SEBI/NSE STT/CTT tax, Garman-Klass volatility, and CPPI Quarter-Kelly sizing safeguards).
   - Risk-to-Reward (`R:R`) ratios must never be a constant `1:2.1`; they must be dynamically computed from each instrument's live volatility, entry, target, and stop-loss distance (`1:X.XX`).

4. **Dedicated Trade History Table Format**:
   - All executed paper trades from NSE/BSE/MCX are displayed in the dedicated **Trade History** navigation view with columns:
     `Instrument`, `Side`, `Qty`, `Entry Price`, `Exit Price`, `P&L`, `Date (dd-mmm-yyyy)`, and `Time ([hh]:mm:ss)` (24-hour format with no AM/PM).

---

## 2. UPSTOX ANALYTICS TOKEN (PRIMARY) & CHARTINK AUTO-FAILOVER BACKUP
1. **No Static IP Required for Upstox Analytics Token**:
   - Per official Upstox documentation (`https://upstox.com/developer/api-documentation/analytics-token/#supported-apis`), a Static IP is **NOT** required for Market Quote (`/market-quote/quotes`), Option Chain (`/option/chain`), Historical Candles, Market Information, Fundamentals, and WebSocket streams.
   - Because this terminal strictly operates in **Analytics & Paper-Trading Mode** (no live money orders are dispatched to brokers), Upstox token verification and ping checks must always use `/market-quote/quotes?instrument_key=NSE_INDEX|Nifty 50,NSE_INDEX|India VIX` rather than `/user/profile` (which triggers Static IP blocks).

2. **Upstox Primary vs. Chartink Auto-Failover Backup (`fetchDynamicZonesScreener`) & Dynamic UI Attribution**:
   - **Chartink is NOT required when Upstox API is paired and active.** When `activeUpstoxToken` is configured, `src/server/marketData.ts` pulls live batch quotes directly from Upstox v2 across **45 liquid NSE equities mapped by ISIN** + 4 benchmark indices (`^NSEI`, `^BSESN`, `^NSEBANK`, `^INDIAVIX`) and generates the 45 dynamic breakout/radar candidates directly from Upstox (`source: 'UPSTOX_PRIMARY_LIVE'`, `apiEndpoint: 'https://api.upstox.com/v2/market-quote/quotes'`).
   - **Automatic Failover to Chartink**: Chartink is placed strictly as an **automatic backup** (`source: 'CHARTINK_BACKUP_AUTO_FAILOVER'`, `apiEndpoint: 'https://chartink.com/screener/process'`). It auto-triggers **only** if Upstox is unconfigured or experiences an API/network issue.
   - **Zero Contradictory Gateway Strings**: Every component (`ViewerDashboard.tsx`, `InstitutionalEquityRadar.tsx`, Split Dossier, Quick Full Thesis Modal footer, and Per-Stock Live Audit Evidence Modal) must dynamically switch its **Feed Tier** label (`Upstox Analytics v2 Live NSE Quotes (Primary)` vs `Chartink NSE Technical Screener (Auto-Failover Backup)`) and **API Gateway URL** (`https://api.upstox.com/v2/market-quote/quotes` vs `https://chartink.com/screener/process`) based on the live connection (`isUpstoxLive`), never hardcoding `https://chartink.com/screener/process` when Upstox is active.

3. **Live vs. Delayed Fallback & Mandatory `Info` Icons**:
   - When Upstox is paired, the market quote stream runs in real time (`provider: 'UPSTOX_ANALYTICS_REALTIME'`, `isDelayed: false`). When Upstox is unpaired, quotes fall back to Yahoo Finance (`provider: 'YAHOO_DELAYED_UNOFFICIAL'`, `isDelayed: true`).
   - Wherever market feed status is displayed (Header, Viewer Dashboard, 5-Agent Desk, Trade History, Institutional Equity Radar, Broker Stream Gateway, Settings), an interactive **`Info` icon** must inform the user of the active feed and clarify that trades are paper-only.

4. **Hide Unused Brokers & Clean Audit Logs (Do Not Delete Standby Broker Card Code)**:
   - Unused brokers (**Zerodha Kite**, **Dhan HQ**, **Aditya Birla Money**, and **Angel One**) are hidden by default behind a toggle (`showUnusedBrokers = false`) while keeping their standby card code intact in the repository.
   - In `BrokerGatewayRouter.tsx`, the **Live Stream Allocation Matrix**, **Socket Saturation**, and **`JARVIS_AUDIT_LOG`** must only show **Upstox Analytics v2 (Primary)**, **Chartink Auto-Failover Backup**, and the **5-Agent Paper Execution Engine** (all unused broker audit log line items for Zerodha, DhanHQ, and Aditya Birla Money have been removed).

---

## 3. 5-FACTOR QUANTITATIVE CONVICTION SCORE & ≥88/100 EXECUTION GATE
1. **How Conviction Score Relates to the 88/100 Minimum Qualification Score**:
   - The **Conviction Score (`0–100`)** is the 5-Factor Weighted Composite Score:
     `Conviction Score = Round(0.20 * O + 0.25 * M + 0.25 * Q + 0.15 * R + 0.15 * S)`
   - **`88/100` (`EXECUTION_QUALIFICATION_THRESHOLD = 88`) is the Minimum Execution Qualification Gate**:
     - **`≥ 88 / 100`**: **`EXECUTION QUALIFIED (≥88 · Tier 1 Alpha)`** (`VERY_HIGH_CONVICTION`) — passes all 5 quantitative gates for autonomous/desk deployment.
     - **`80 – 87 / 100`**: **`HIGH CONVICTION WATCHLIST (80–87 · Needs +X pts for ≥88 Gate)`** (`HIGH_CONVICTION`) — strong institutional thesis sitting 1–8 points below the execution cutoff (typically awaiting intraday volume or momentum breakout).
     - **`< 80 / 100`**: **`MONITOR / HOLD (<80)`** (`MODERATE_CONVICTION`).
2. **Continuous Stock-Differentiated Pillar Quantification (`NSE_EQUITY_QUANT_PROFILES`)**:
   - Never use coarse step-buckets that assign identical pillar numbers (`M: 74, Q: 92, R: 90, S: 83`) across multiple stocks.
   - Every stock in the 45-stock NSE universe (`src/server/marketData.ts`) is evaluated using continuous formulas anchored by audited stock-specific fundamentals (`capTier`, `roce`, `roe`, `patGrowthYoY`, `debtToEquity`, `avgVol20D`, `deliveryPct`, `rsRank`, `atrPct`, `moatBaseScore`) combined with live exchange price/volume ticks.

---

## 4. MANDATORY USER CONSULTATION & ENGINEERING HYGIENE
1. **Always Ask Before Replacing Core Modules**:
   - Never unilaterally replace primary decision workspaces without user alignment.
2. **No Purely Decorative 3D Gimmicks**:
   - Every visualization must function as an operational decision maker with explicit trade signals, entry bands, stop losses, profit targets, and risk parameters.
3. **Node.js ESM Production Compatibility (`node server.ts` on Cloud Run)**:
   - Because production runs `node server.ts` under `"type": "module"`, every relative import in `server.ts` and any transitively imported module (`src/server/*`, `src/data/*`, `src/utils/*`, `src/brokers/*`, `src/services/*`) **MUST** include the explicit `.ts` file extension (e.g., `from '../utils/indianHolidayCalendar.ts'`) and files must be saved in clean UTF-8 without BOM so Cloud Run containers never throw `ERR_MODULE_NOT_FOUND` on startup.
4. **Environment Variable Hygiene (No Redundant `.env.example` Prompts)**:
   - Do **NOT** list non-secret or hardcoded constants (`MARKET_DATA_PROVIDER`, `MARKET_DATA_REFRESH_INTERVAL_MS`, `NSE_EQUITY_STT_SELL_PCT`, `NSE_OPTIONS_STT_SELL_PCT`, `MCX_COMMODITY_CTT_PCT`, `SEBI_TURNOVER_FEE_PER_CR`, `GST_RATE_PCT`, `BROKERAGE_FLAT_INR`) as environment variables, as AI Studio prompts the user to enter secret values for every key defined in `.env.example`.
   - Only `GEMINI_API_KEY` (auto-injected by AI Studio), `OWNER_ACCESS_TOKEN` (for Owner Desk unlock), and `UPSTOX_ACCESS_TOKEN` (optional if paired via the UI modal) are read by the backend.
---

## 5. ROADMAP LEDGER: COMPLETED ITEMS, CURRENT PROGRESS & NEXT STEPS

### 5.1 Agreed Objectives & Scope
- Comprehensive Institutional Quantitative Terminal for Indian Markets: **NSE/BSE Cash Equity**, **NSE F&O (Options & Futures)**, and **MCX Commodity Futures**.
- Zero fake/dummy seed trades; 100% deterministic mathematical execution.
- Strict multi-barrier risk gating (kill-switch, daily loss limits, lot sizing, SEBI SPAN+Exposure approximations).
- Dual execution routing: **Deterministic Paper Broker** (Simulation) and **Upstox Analytics v2 Gateway** (Live/Analytics).
- Persistent append-only learning ledger and automated 3-tier operational scheduler.

### 5.2 Log of Completed Items
- [x] **Git Merge Conflict Resolution (`5a7a18e`)**: Resolved `GlobalSentiment.tsx` conflict; dynamic radar/benchmark breadth mode preserved.
- [x] **Indian Holiday & Expiry Engine (`src/utils/indianHolidayCalendar.ts`)**: Fixed hardcoded dates (`new Date()`); statutory holiday-preceding expiry calculation for NIFTY & SENSEX.
- [x] **Universal Broker Adapter Interface (`src/brokers/BrokerAdapter.ts`)**: Standardized interface for quotes, OHLCV candles, option chains, order placement, cancellation, positions, and margins.
- [x] **Deterministic Paper Broker (`src/brokers/PaperBrokerAdapter.ts`)**: In-memory paper execution engine with quote cache injection, position tracking, and fill simulation.
- [x] **Append-Only Order State Machine (`src/services/orderLifecycle.ts`)**: Lifecycle state transitions (`PENDING -> OPEN -> FILLED -> SQUARED_OFF`), automatic SL/Target triggers, and 2026 statutory fee estimation (STT/CTT, SEBI, GST).
- [x] **Indian Market Position Sizer (`src/services/positionSizer.ts`)**: Lot-aware quantity calculator with complete 2026 NSE F&O (NIFTY=75, BANKNIFTY=35) & MCX commodity lot size registry.
- [x] **Risk-Gated Execution Terminal UI (`src/components/ExecutionTerminal.tsx`)**: Order entry panel wired directly to `riskEngine.evaluateOrder()`, multi-venue selection (Paper vs Upstox), and dynamic market session switching.
- [x] **NSE F&O Master Contract Registry (`src/data/fnoContracts.ts`)**: Complete derivatives contract specs, dynamic weekly/monthly expiry calculation, and Upstox option/futures key builder.
- [x] **Option Chain & Greeks Engine (`src/server/optionChain.ts`)**: Real-time Upstox option chain aggregator with Max Pain, PCR, and synthetic Black-Scholes Greeks fallback.
- [x] **Upstox v2 Broker Adapter (`src/brokers/UpstoxAdapter.ts`)**: Production v2 adapter for quotes, historical candles, option chains, and guarded order execution.
- [x] **Server API Endpoints (`server.ts`)**: Implemented `/api/upstox/historical-candles`, `/api/upstox/order/place`, and enhanced `/api/upstox/option-chain`.
- [x] **MCX Commodity Contracts & Session Logic (`src/data/mcxContracts.ts`, `src/utils/marketHours.ts`)**: Master registry for Bullion, Energy, and Base Metals + dual-session schedule (Morning 09:00–17:00, Evening 17:00–23:30 IST) with holiday overrides.
- [x] **Permanent Append-Only Database (`src/server/ledgerDatabase.ts`)**: Solved the 20-record truncation limitation with atomic JSONL persistence in `.data/` for audits, paper trades, and scheduler logs.
- [x] **Autonomous 3-Tier Background Scheduler (`src/server/agentScheduler.ts`)**:
  - `08:45–09:00 IST`: Pre-Market scan, Bayesian recalibration & auto paper trade entry (≥88 conviction).
  - `09:15–15:20 IST`: Continuous 60s barrier monitoring (Stop-Loss / Target triggers).
  - `15:20 IST`: Mandatory intraday MIS auto-square-off before NSE close.
  - `16:30 IST`: Post-Market official settlement audit & Bayesian weight update.

### 5.3 Current Progress & Live System Status
- **Type Safety**: `npx tsc --noEmit` passes with 0 errors across the entire codebase.
- **Production Build**: Vite + PWA production build compiles cleanly in ~1.3s.
- **Execution Modes**: Paper Broker active by default; Upstox Analytics v2 ready for live quotes and paper wire routing.
- **Scheduler**: Running automatically on server start (`agentScheduler.start()`).

### 5.4 Immediate Next Steps & Future Roadmap
- [ ] **UI Integration for Scheduler & Permanent Audits**: Surface background scheduler status and permanent audit query view (`/api/scheduler/status`, `/api/scheduler/audits`) in the Settings or Autonomous Agents desk.
- [ ] **Live Upstox WebSocket Stream**: Wire streaming WebSocket feed for live sub-second order book updates.
- [ ] **Multi-User Desk Real-Time Sync**: Connect Firebase Firestore / SQLite backend for concurrent multi-seat paper trade journals.