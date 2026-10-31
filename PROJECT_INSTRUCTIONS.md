# J.A.R.V.I.S. Institutional Quant Terminal — Core Constitution & Directives

## 0. CONTINUOUS INSTRUCTION SYNCHRONIZATION MANDATE (STANDING HABIT)
- **Always Keep Instructions Current**: Whenever any feature, architectural change, bug fix, data source update, or workflow adjustment is performed, the engineer **MUST** proactively update `PROJECT_INSTRUCTIONS.md` (both in the workspace root and the artifact directory), `README.md`, and any relevant in-app documentation/info modals in the same work cycle.
- Never leave stale architectural notes or outdated status disclaimers in the codebase or instruction files.

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
   - Every stock in the 45-stock NSE universe (`src/server/marketData.ts`) is evaluated using continuous formulas anchored by audited stock-specific fundamentals (`roce`, `roe`, `patGrowthYoY`, `debtToEquity`, `avgVol20D`, `deliveryPct`, `rsRank`, `atrPct`, `moatBaseScore`) combined with live exchange price/volume ticks:
     - **O — Institutional Order Flow (20%)**: Continuous function of Relative Volume (`RVOL = liveVolume / avgVol20D`), institutional delivery %, and live Rupee turnover (Cr).
     - **M — Momentum & CANSLIM RS (25%)**: Blends multi-week Relative Strength percentile rank (`rsRank` 1–99) with live intraday ATR-adjusted price expansion (`changePct / atrPct`).
     - **Q — Fundamental QARP Quality (25%)**: Continuous function of audited ROCE %, ROE %, YoY PAT growth %, and Debt-to-Equity leverage penalty.
     - **R — Risk-Reward Asymmetry (15%)**: Derived from stock-specific ATR stop-loss distance vs Target 1/Target 2 upside geometry and RS follow-through probability.
     - **S — Sovereign Moat & 200-DMA Regime (15%)**: Combines structural industry moat score with live 200-DMA trend persistence and institutional delivery support.

---

## 4. MANDATORY USER CONSULTATION & ENGINEERING HYGIENE
1. **Always Ask Before Replacing Core Modules**:
   - Never unilaterally replace primary decision workspaces without user alignment.
2. **No Purely Decorative 3D Gimmicks**:
   - Every visualization must function as an operational decision maker with explicit trade signals, entry bands, stop losses, profit targets, and risk parameters.
3. **Node.js ESM Production Compatibility (`node server.ts` on Cloud Run)**:
   - Because production runs `node server.ts` under `"type": "module"`, every relative import in `server.ts` and any transitively imported module (`src/server/*`, `src/data/*`, `src/utils/*`, `src/brokers/*`, `src/services/*`) **MUST** include the explicit `.ts` file extension (e.g., `from '../utils/indianHolidayCalendar.ts'`) and files must be saved in clean UTF-8 without BOM so Cloud Run containers never throw `ERR_MODULE_NOT_FOUND` on startup.


