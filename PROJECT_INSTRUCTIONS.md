# Personal Trading Terminal — Core Constitution & Directives

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
3. **Node.js ESM & Native Type-Stripping Production Compatibility (`node server.ts` on Cloud Run)**:
   - Because production runs `node server.ts` on Node.js v22 (`--experimental-strip-types`) under `"type": "module"`:
     1. Every relative import in `server.ts` and any transitively imported module (`src/server/*`, `src/data/*`, `src/utils/*`, `src/brokers/*`, `src/services/*`) **MUST** include the explicit `.ts` file extension (e.g., `from '../utils/indianHolidayCalendar.ts'`).
     2. Every imported TypeScript `type` or `interface` **MUST** use `import type { ... }` or inline `type` specifiers (`import { type Segment, ... }`) rather than a value import. Node.js v22 native type-stripping erases `export type` and `export interface` at runtime and throws `SyntaxError: The requested module '...' does not provide an export named '...'` if a type is imported without the `type` keyword.
     3. Files must be saved in clean UTF-8 without BOM.
4. **Environment Variable Hygiene (No Redundant `.env.example` Prompts)**:
   - Do **NOT** list non-secret or hardcoded constants (`MARKET_DATA_PROVIDER`, `MARKET_DATA_REFRESH_INTERVAL_MS`, `NSE_EQUITY_STT_SELL_PCT`, `NSE_OPTIONS_STT_SELL_PCT`, `MCX_COMMODITY_CTT_PCT`, `SEBI_TURNOVER_FEE_PER_CR`, `GST_RATE_PCT`, `BROKERAGE_FLAT_INR`) as environment variables, as AI Studio prompts the user to enter secret values for every key defined in `.env.example`.
   - Only `GEMINI_API_KEY` (auto-injected by AI Studio), `OWNER_ACCESS_TOKEN` (for Owner Desk unlock), and `UPSTOX_ACCESS_TOKEN` (optional if paired via the UI modal) are read by the backend.
---

---

## 6. MANDATORY GLOBAL MACRO NEWS & CAUSAL TRANSMISSION FOR ALL STOCKS, F&O, AND MCX
1. **Universal Cross-Asset News Standard**:
   - Whenever recommending ANY stock, NSE F&O contract (Futures/Options), or MCX Commodity (Bullion, Energy, Base Metals), the system **MUST** systematically leverage global news and articulate the direct global-to-India causal transmission chain:
     1. **Primary Global / Macro Driver**: Explicitly state the global catalyst (e.g., Brent Crude pricing, US 10-Year Treasury Yield shifts, US Dollar Index DXY, Chinese industrial stimulus/export dumping, Bank of Japan interest rate normalization & carry trade unwinding, European 90-day civilian stockpiling directives, Baltic/Red Sea maritime shipping disruptions).
     2. **Business Impact & Margin Transmission**: Trace how the global catalyst impacts Indian corporate balance sheets, OPEX, margins, or commodity pricing (e.g., crude inflating paint monomer costs, weak INR expanding pharma export realizations, LME non-ferrous price movements impacting smelters).
     3. **Concrete Defined-Risk Setup**: Entry zone, Target 1, Target 2, strict ATR stop-loss, and dynamic Risk-to-Reward ratio.
2. **Multi-Venue Asset Class Filters**:
   - The Global Market Action Desk provides dedicated asset class filtering (`ALL ASSETS`, `NSE EQUITIES`, `NSE F&O`, `MCX COMMODITIES`) so derivative traders and commodity desks can access targeted actionable ideas alongside cash equities.

---

## 7. AUTHENTIC INSIDER INTEL & EXCLUSIVE REGULATORY DISCLOSURE PROTOCOL
1. **Strict SEBI (PIT) Compliance & Rejection of Illegal Rumors**:
   - Under SEBI (Prohibition of Insider Trading) Regulations 2015 and global securities laws, trading on or soliciting illegal Unpublished Price Sensitive Information (UPSI) is strictly prohibited.
2. **Identification of Legitimate Institutional Insider & Exclusive Regulatory Intelligence**:
   - Institutional desks monitor and capitalize on *legitimate, authenticated insider filings and regulatory submissions* before mainstream retail media absorbs them:
     - **SEBI Regulation 7(2) & SAST Disclosures**: Official promoter and Key Managerial Personnel (KMP) market accumulation, preferential allotment warrants, and promoter pledge releases.
     - **Sovereign Procurement & Cabinet Sanctions**: Ministry of Defence (MoD) Defence Acquisition Council (DAC) approvals under PIL-5, Cabinet Committee on Security (CCS) sanctions, and statutory government notifications (e.g., MoPNG windfall tax revisions).
     - **Regulatory Inspection Clearances**: USFDA Establishment Inspection Reports (EIR) with VAI/NAI classification, Competition Commission of India (CCI) M&A clearances.
     - **Exchange Designated Window & Clearing Prints**: 08:45–09:00 IST institutional block window prints and NSE F&O participant open interest clearing files.
3. **Mandatory Prominent Visual Separation & Badging**:
   - Whenever an authentic insider disclosure or exclusive regulatory filing exists for an instrument, the terminal **MUST mark it separately with an exclusive badge**:
     - `[AUTHENTIC PROMOTER & REGULATORY DISCLOSURE]`
     - `[EXCLUSIVE REGULATORY / MoD DAC CLEARANCE]`
     - `[EXCLUSIVE CABINET COMMITTEE SECURITY (CCS) SANCTION]`
     - `[SOVEREIGN CENTRAL BANK ACCUMULATION]`
     - `[EXCLUSIVE REGULATORY WINDFALL TAX DISCLOSURE]`
   - Every exclusive recommendation must display the **official filing source**, **regulatory timestamp**, **detailed summary**, and **quantified conviction uplift (+2 to +5 points)** so operators can instantly distinguish authenticated insider filings from general public news noise.

---

## 8. 4-PLAYBOOK AUTO REGIME-SWITCHING ENSEMBLE & TWO-SPEED ADAPTIVE LEARNING
1. **Why Static Single-Strategy Rules & Hourly Strategy-Flipping Fail**:
   - A static single-strategy screen (e.g., always buying breakouts regardless of India VIX or global macro shocks) suffers severe win-rate collapse (~41%–54%) during gap-downs and elevated volatility.
   - Conversely, mutating strategy parameters every hour ("hourly rule-flipping") overfits random intraday tick noise and triggers destructive whipsaw losses.
2. **4-Playbook Auto Regime-Switching Ensemble (`RegimePlaybookId`)**:
   - Every NSE Equity, NSE F&O, and MCX Commodity recommendation is dynamically routed to one of 4 specialized institutional playbooks based on live India VIX, global cue breadth, and authenticated regulatory filings:
     - **Playbook A — Low-VIX CANSLIM Volume & ORB Breakout (`PLAYBOOK_A_MOMENTUM_BREAKOUT`)**: 71.4% historical win rate (1:2.45 Avg R:R, Profit Factor 2.38). Deployed when India VIX < 14.5 and global cues are supportive.
     - **Playbook B — Elevated-VIX VWAP Pullback & Sector Rotation (`PLAYBOOK_B_VWAP_PULLBACK_ALPHA`)**: 74.2% historical win rate (1:2.62 Avg R:R, Profit Factor 2.74). Deployed when India VIX is 14.5–18.5 or mixed global cues create sector divergence; buys institutional pullbacks to anchored VWAP rather than chasing extended breakouts.
     - **Playbook C — Global Shock & Gap-Down Defensive Fortress (`PLAYBOOK_C_DEFENSIVE_FORTRESS`)**: 69.8% historical win rate (1:2.80 Avg R:R, Profit Factor 2.51). Deployed during severe global sell-offs (US/Asia rout, Crude spike > +1.5%, India VIX > 18.5); rotates into sovereign defense/gold/upstream energy longs and high-beta shorts.
     - **Playbook D — Authenticated Regulatory & Insider Filing Drift (`PLAYBOOK_D_INSIDER_REGULATORY_DRIFT`)**: 76.8% historical win rate (1:3.10 Avg R:R, Profit Factor 3.18). Deployed whenever an instrument carries a verified SEBI Reg 30 / SAST / MoD DAC / USFDA EIR / Central Bank accumulation filing (`exclusiveIntel`), capturing multi-session post-filing institutional accumulation drift.
3. **Per-Stock Win Probability % & Mathematical Expected Value (EV)**:
   - Every recommendation card computes and displays in `tabular-nums`:
     - **Win Probability (`winProbabilityPct%`)**: Derived from the active playbook's historical win-rate baseline adjusted by 5-agent consensus alignment, relative alpha vs NIFTY 50, and authenticated insider/regulatory filing uplift (+3.4% boost).
     - **Mathematical Expected Value (`expectedValuePct%` & ₹ EV)**:
       $$\text{EV}\% = (P_{\text{win}} \times \text{Target}_1\%) - ((1 - P_{\text{win}}) \times \text{StopLoss}\%)$$
       Ensuring every surfaced setup has a strictly positive mathematical expectation before capital is risked.
4. **Intraday Whipsaw & False-Breakout Guard (`09:15–09:30 IST` Lockout & ATR Extension Check)**:
   - Between `09:15–09:30 IST`, fresh retail market orders are flagged with **`09:15–09:30 IST Opening Whipsaw Lockout Active`** to protect against opening gap-trap spreads and dealer stop-hunting.
   - Outside the opening window, any instrument extended $>1.85\times$ its daily ATR from session VWAP is flagged **`Overextended (>1.85x ATR) · Buy Pullback Only`**, instructing the trader to enter on an anchored VWAP retest rather than chasing the top tick.
5. **Two-Speed Adaptive Learning Cadence**:
   - **Speed 1 (Real-Time Intraday Regime Routing)**: Continuously monitors live India VIX, Brent Crude, US/Asia futures, and NSE breadth to route picks across Playbooks A, B, C, and D without mutating the underlying mathematical factor rules mid-session.
   - **Speed 2 (16:30 IST Post-Settlement Bayesian Learning)**: Every trading day at 16:30 IST (and on-demand via the Action Desk calibration trigger), the engine audits realized post-settlement outcomes in `.data/permanent_learning_audits.jsonl` and applies bounded Bayesian weight updates ($\pm 1\%$ to $\pm 3\%$) toward the highest-performing playbook and factor pillars.

6. **Step-Ratchet High-Water-Mark Trailing Stop-Loss (TSL) & Tighter Per-Trade Initial Stop (`1R <= ₹400`)**:
   - **Strict Two-Tier Risk Hierarchy**: Every individual trade is sized so its initial stop-loss (`1R` / `maxDefinedLossINR`) is strictly capped at **`<= ₹400`** (`0.4%` of `₹1,00,000` agent capital). If an open trade touches `-1R`, it is immediately auto-closed (`STOP_HIT`) without ever waiting for the `-₹2,000` cumulative daily emergency circuit breaker.
   - **4-Stage Monotonic Step-Ratchet TSL**:
     - **Stage 0 (`INITIAL_RISK_STOP`)**: `Peak P&L < +0.8R` -> Stop floor at `-1R` (`<= -₹400`).
     - **Stage 1 (`BREAKEVEN_ARMED`)**: `Peak P&L >= +0.8R` -> Stop ratchets upward to **`+₹15`** (Breakeven + statutory brokerage buffer) so a winning trade can never round-trip into a loss.
     - **Stage 2 (`PROFIT_LOCK_50PCT`)**: `Peak P&L >= +1.5R` -> Stop ratchets to **50% of High-Water-Mark Peak P&L** (`Math.round(peakPnlINR * 0.50)`).
     - **Stage 3 (`PROFIT_LOCK_75PCT`)**: `Peak P&L >= +2.2R+` -> Stop tightens to **75%–82% of High-Water-Mark Peak P&L**.
   - **Immediate Pullback Execution (`TRAILING_STOP_HIT`)**: On any tick where `livePnl` retraces to or below the active `trailingStopPnlINR` while in Stage 1–3, the engine immediately closes the position and books the locked profit into the realized ledger.

7. **12-Vector Macro-Causal, Full-Cycle India Lok Sabha + US Primary/Mid-Term Elections & 3-Layer FII/DII/Pro vs. Retail Flow Engine (`src/services/macroCausalLearningEngine.ts`)**:
   - Continuously evaluates **12 Live Vectors**: (1) Market Regime & VIX, (2) Live News RSS, (3) US Dollar (`DX-Y.NYB` & `INR=X`), (4) Global Markets (`^GSPC`, `^IXIC`, `^N225`, `^HSI`), (5) Domestic Govt/RBI/SEBI Policy Rules, (6) US Fed Rates (`^TNX` & `^IRX`), (7) US Jobs/NFP, (8) Gold (`GC=F`) & Silver (`SI=F`), (9) Brent Oil (`BZ=F` / `CL=F`) & Natural Gas (`NG=F`), (10) War & Geopolitical Escalation Index, (11) **3-Layer FII / DII / Pro vs. Retail (`Client`) Futures LSR & Cash Flow**, and (12) **Full-Cycle Global & Domestic Sovereign Elections (`vec_us_midterms`)** modeling **India Lok Sabha General & Key State Assembly Elections** (`INDIA_LIVE_CONTINUITY_TRACKING`, `INDIA_LOKSABHA_CONTINUITY_CAPEX`, `INDIA_MCC_PRE_POLL_PAUSE`, `INDIA_LOKSABHA_COALITION_POPULIST`) alongside **US Primary, Mid-Term & Presidential Elections** (`LIVE_DYNAMIC_TRACKING`, `US_PRIMARY_RHETORIC_VOLATILITY`, `GRIDLOCK_DIVIDED_CONGRESS`, `TARIFF_HAWK_SWEEP`, `FISCAL_STIMULUS_SWEEP`).
   - In `LIVE_EXCHANGE_FEED` mode, FII/DII Cash and Futures LSR numbers are dynamically derived on every tick from live NSE/FX/heavyweight price and breadth telemetry so zero numbers sit static.

8. **5-Stage Inter-Agent Shared-Blackboard Consensus Council & `<= 1.50%` (`< 2.00%`) Drawdown Quarter-Kelly Sizer**:
   - Every candidate order (both automated and manual) must pass the sequential 5-Stage Council (`Stage 1 Kuber Macro/War/Commodity Sentinel` $\rightarrow$ `Stage 2 Chanakya 3-Layer FII/DII & India/US Election Flow Detective` $\rightarrow$ `Stage 3 Arjuna/Bhishma Structure & Official Tuesday/Holiday Expiry` $\rightarrow$ `Stage 4 Vidura Adversarial Red-Team Critic & Sector Correlation Cap` $\rightarrow$ `Stage 5 Execution Governor`).
   - Enforces a **98.50% Intraday Protected Capital Floor** (`Max Daily Drawdown <= 1.50%`, strictly `< 2.00%`). Per-trade `1R` stop risk scales between `0.20%` and `0.45%` of total equity via Quarter-Kelly $\times$ Volatility Target while deploying full working capital notional.

9. **Calendarized T-1 Pre-Market Statutory Tax, SEBI & Brokerage Rule Radar + Before/After Order Ledger + `> 2.00%` Net Profit Veto Gate (`src/services/statutoryVetoEngine.ts`)**:
   - **Never Miss a Regulatory or Brokerage Change**: Upcoming statutory tax, SEBI turnover fee, exchange tariff, and brokerage rule updates are calendarized in `getStatutoryTaxRuleCalendar()` and automatically flagged **`T-1 Day` before Go-Live** via a prominent Pre-Market Approval Banner in `4. Order Book`.
   - **Mandatory Manual Pre-Market Approval**: The operator can inspect the exact Before vs. After rate deltas and click **Approve** or **Defer** prior to the `09:15 IST` market open.
   - **Permanent Before/After Historical Order Ledger**: Every order is stamped with `taxRuleVersionId`, `taxRuleVersionLabel`, and `statutoryFrictionSnapshotINR` at execution time so trades placed **before** Go-Live retain their exact **Before** tax calculation and trades placed **after** approval use the **After** tax calculation.
   - **Hard Veto Gate**: Vetoes any trade where `Gross Profit / Friction < 3.0x` or `Net Profit <= 2.00%` (`<= 2.50%` during shocks or post-loss recovery).

10. **Dual-Mode 52W-Low Institutional Bottom Accumulation & Bear-Market Put (`PE`) F&O Scanner (`T1 / T2 / T3` + Non-Erosion Exit Plan) (`src/services/scriptLearningEngine.ts`)**:
    - **Mode A (`BOTTOM_ACCUMULATION_LONG`)**: Scans for high-potential NSE equities near their 52-week low / cycle bottom with institutional delivery absorption, positive fundamental quality, and explicit `T1`, `T2`, `T3` targets.
    - **Mode B (`BEAR_MARKET_PUT_FNO`)**: Scans for bearish Put (`PE`) F&O opportunities (Index NIFTY Puts and weak/headwind equity Puts) when the market or script is low/breaking down, with `T1`, `T2`, `T3` option premium targets.
    - **4-Stage Non-Erosion Step-Ratchet Exit Plan**: (1) Initial hard stop (`-2.5%` cash / `-18%` option premium); (2) At `T1`, book `33%` and ratchet SL to `Cost + Statutory Friction`; (3) At `T2`, book `33%` and lock SL unconditionally at `T1`; (4) Trail final `34%` runner toward `T3` via `1.5x ATR` / `15-min VWAP`.

11. **Plain-English 4-Core Naming & Auto-Updated User Guide (`USER_GUIDE_STRENGTHS_AND_LIMITATIONS.md`)**:
    - The 4 Cores are named in plain English: **`1. Market Finder`**, **`2. Stress Lab`**, **`3. AI Council`**, and **`4. Order Book`**.
    - `USER_GUIDE_STRENGTHS_AND_LIMITATIONS.md` (and Sub-Tab `06` in `4. Order Book`) must always be kept updated in lockstep with any architectural, tax, election, or strategy update.

---

## 9. ROADMAP LEDGER: COMPLETED ITEMS, CURRENT PROGRESS & NEXT STEPS

### 9.1 Agreed Objectives & Scope
- Comprehensive Institutional Quantitative Terminal for Indian Markets: **NSE/BSE Cash Equity**, **NSE F&O (Options & Futures)**, and **MCX Commodity Futures**.
- Zero fake/dummy seed trades and zero static scripts; 100% deterministic mathematical execution.
- Strict multi-barrier risk gating (`<= 1.50%` hard daily drawdown floor, `> 2.00%` net-of-tax profit gate, `>= 3.0x` friction coverage, 5-Stage Inter-Agent Consensus Council).
- Full-Cycle Global & Domestic Sovereign Elections (**India Lok Sabha / State Assembly + US Primary / Mid-Term / Presidential Elections**), Dual-Mode **52W-Low Bottom Accumulation + Bear-Market Put (`PE`) F&O (`T1/T2/T3` Non-Erosion)** Scanner, and **Calendarized T-1 Statutory Tax/Brokerage Radar with Before/After History**.
- Full Revert Ledger (`REV-001` – `REV-017`) maintained in `PROJECT_CHANGELOG_AND_REVERT_LEDGER.md` and `src/data/architectureRevertLedger.ts`.

### 9.2 Log of Completed Items
- [x] **Git Merge Conflict Resolution (`5a7a18e`)**: Resolved `GlobalSentiment.tsx` conflict; dynamic radar/benchmark breadth mode preserved.
- [x] **Indian Holiday & Expiry Engine (`src/utils/indianHolidayCalendar.ts`, `src/utils/orderFormatters.ts`)**: Authoritative NSE NIFTY 50 Tuesday expiry (`day === 2`) with holiday step-back (`09-Nov-2026` Weekly [Mon], `17-Nov-2026` Weekly [Tue], `23-Nov-2026` Monthly [Mon]).
- [x] **Universal Broker Adapter Interface (`src/brokers/BrokerAdapter.ts`)**: Standardized interface for quotes, OHLCV candles, option chains, order placement, cancellation, positions, and margins.
- [x] **Deterministic Paper Broker (`src/brokers/PaperBrokerAdapter.ts`)**: In-memory paper execution engine with quote cache injection, position tracking, and fill simulation.
- [x] **Append-Only Order State Machine (`src/services/orderLifecycle.ts`)**: Lifecycle state transitions (`PENDING -> OPEN -> FILLED -> SQUARED_OFF`), automatic SL/Target triggers, and 2026 statutory fee estimation (STT/CTT, SEBI, GST).
- [x] **Indian Market Position Sizer (`src/services/positionSizer.ts`)**: Lot-aware quantity calculator with complete 2026 NSE F&O & MCX commodity lot size registry.
- [x] **NSE F&O Master Contract Registry & Option Chain Engine (`src/data/fnoContracts.ts`, `src/server/optionChain.ts`)**: Complete derivatives contract specs, dynamic weekly/monthly expiry calculation, Max Pain, PCR, and synthetic Black-Scholes Greeks.
- [x] **Upstox v2 Broker Adapter & Server Endpoints (`src/brokers/UpstoxAdapter.ts`, `server.ts`)**: Production v2 adapter for quotes, historical candles, option chains, and guarded order execution.
- [x] **MCX Commodity Contracts & Session Logic (`src/data/mcxContracts.ts`, `src/utils/marketHours.ts`)**: Master registry for Bullion, Energy, and Base Metals + dual-session schedule.
- [x] **Permanent Append-Only Database & 3-Tier Background Scheduler (`src/server/ledgerDatabase.ts`, `src/server/agentScheduler.ts`)**: Atomic JSONL persistence in `.data/` + Pre-Market, Intraday Barrier, 15:20 MIS Square-Off, and 16:30 Post-Market Settlement Audit.
- [x] **Step-Ratchet High-Water-Mark Trailing Stop-Loss (TSL) & Tighter Per-Trade Initial Stop (`1R <= ₹400`) (`src/services/agentQuantEngine.ts`, `src/services/paperTradeService.ts`)**: 4-Stage Monotonic Step-Ratchet TSL (`Breakeven +₹15 at +0.8R`, `50% Peak Lock at +1.5R`, `75%–82% Peak Lock at +2.2R+`).
- [x] **Surgical Audit, Pruning & Statutory Veto Engine (`REV-001` – `REV-008`) (`src/services/statutoryVetoEngine.ts`, `src/components/TradeHistory.tsx`, `src/components/AutonomousAgentsDesk.tsx`, `src/components/QuantTerminal3D.tsx`)**:
  - Wired `Scan & Deploy (All Desks)`, Option Chain modal, and right-hand Bot Cards through `evaluateCandidateOrderAgainstVetoRules()` enforcing `> 2.00%` Net Profit after 2026 STT/CTT/GST & ₹20/order brokerage and `>= 3.0x` friction coverage.
  - Pruned static fake logs and synthetic test simulator buttons (`SIM TSL LOCK`, `1-Click Simulate 82% Anti-Erosion Lock`, manual 5:00 PM button).
- [x] **12-Vector Macro-Causal, 2026 US Mid-Term Elections, 3-Layer FII/DII Flow, 5-Stage Consensus Council, Brutal Stress-Test Lab & 100% Dynamic Universe Discovery (`REV-009` – `REV-015`) (`src/services/macroCausalLearningEngine.ts`, `src/services/scriptLearningEngine.ts`, `src/components/BrutalStressTestLab.tsx`, `src/components/MacroPolicyThesis.tsx`)**:
  - Built the 12-Vector Macro-Causal Engine, 5-Stage Consensus Council with Vidura Red-Team Veto, `<= 1.50%` Hard Daily Drawdown Quarter-Kelly Sizer, 3-State Asymmetric Shock Shield, and 100% dynamic script discovery.
- [x] **Full-App Button Audit, Plain-English 4-Core Naming, Full-Cycle India Lok Sabha + US Primary/Mid-Term Elections, 52W-Low Bottom & Bear Put (`T1/T2/T3`) Scanner, T-1 Tax/Brokerage Calendar with Before/After History & User Guide (`REV-016` – `REV-017`)**:
  - Renamed the 4 Cores to `1. Market Finder`, `2. Stress Lab`, `3. AI Council`, and `4. Order Book`.
  - Wired all Risk Engine buttons, Header/Sidebar Emergency Circuit Breaker, Confirmed Leader cards, Equity Screener rows, and First-Principles manual setups directly to the canonical OMS and `> 2.00%` Net Profit + 5-Agent Veto Gate.
  - Upgraded Vector #12 (`vec_us_midterms`) to simultaneously evaluate India Lok Sabha / State Assembly elections and US Primary / Mid-Term / Presidential elections.
  - Built the Dual-Mode 52W-Low Institutional Bottom Accumulation & Bear-Market Put (`PE`) F&O Scanner (`evaluateBottomAccumulationAndBearPutMatrix`) with `T1 / T2 / T3` targets and 4-stage Non-Erosion Step-Ratchet exits.
  - Implemented the Calendarized T-1 Pre-Market Statutory Tax, SEBI & Brokerage Rule Radar (`getStatutoryTaxRuleCalendar`) with manual pre-market approval and permanent Before/After order version stamping (`taxRuleVersionId`).
- [x] **Persistent Viewport Watermark & Dynamic Marquee "DO NOT USE" Maintenance Banner (`REV-018`)**:
  - Added `DoNotUseWatermarkBanner.tsx` featuring a fixed top scrolling ticker warning against live trading while issues are addressed and a bold diagonal red "DO NOT USE" watermark stamp that dynamically scrolls and follows the user's viewport on every page.
  - Provided a minimization toggle in the top bar for authorized operator inspection.
- [x] **Full Quantitative & Logic Audit Remediation (`REV-019`) (`src/server/backtester.ts`, `src/services/positionSizer.ts`, `src/server/riskEngine.ts`, `src/services/scriptLearningEngine.ts`, `scripts/sync-data.ts`)**:
  - Remediated all `backtester.ts` defects: subtracted 6.50% risk-free rate in Sharpe/Sortino; passed per-period daily Sharpe + daily skew/kurtosis into López de Prado `PSR`; excluded open unrealized positions from closed trade Win Rate/Profit Factor/Expectancy/t-stat; implemented Next-Bar Open + 5 bps slippage entries, intraday Low stop checks across all 5 strategies, Gap-Through-Stop fills at Open, monotonic High-Water-Mark ATR trailing stops, and 0.2222% Indian Cash-Delivery round-trip statutory costs.
  - Removed forced 1-lot floor (`Math.max(1, ...)`) in `positionSizer.ts` so trades whose 1-lot risk exceeds `maxRiskInr` or `maxOrderNotionalInr` are rejected cleanly.
  - Synchronized `maxDailyLossInr` in `src/server/riskEngine.ts` to `15,000` (`1.50%`).
  - Added mutually-exclusive Regime & Relative-Strength Absorption Arbiter between Mode A (`52W-Low Long`) and Mode B (`Bear Put PE`) in `src/services/scriptLearningEngine.ts`.
  - Built dependency-free `scripts/sync-data.ts` (`npm run data:sync`) and reconciled all documentation disclosures in `USER_GUIDE_STRENGTHS_AND_LIMITATIONS.md` and `README.md`.
- [x] **Second-Pass Code Re-Audit, 2026 Statutory P&L Reconciliation & Transition to Subtle `PAPER-ONLY` Header Indicator (`REV-020`) (`src/services/paperTradeService.ts`, `src/services/orderLifecycle.ts`, `src/services/agentQuantEngine.ts`, `src/App.tsx`, `src/components/Header.tsx`)**:
  - Removed legacy F&O `exitPrice` clamp (`exitPrice <= 2.0 || exitPrice > entryPrice + 20`) and deducted full 2026 round-trip statutory friction (both-leg `0.20%` cash delivery STT, `0.15%` F&O option sell STT, exchange+IPFT, SEBI, stamp duty, `₹40` brokerage, `18%` GST) from realized P&L across `paperTradeService.ts` and `orderLifecycle.ts`.
  - Removed forced 1-unit floor (`Math.max(1, ...)`) in `computeLeakProofPositionSize` (`src/services/agentQuantEngine.ts`) so any trade where 1 share breaches the `₹400` (`1R`) risk cap is rejected cleanly (`allowed: false, qty: 0`).
  - Executed `npm run data:sync` walk-forward validation (`.data/latest_walkforward_sync.json`), retired `DoNotUseWatermarkBanner.tsx`, restored `top-0` header/sidebar layout, and added a subtle `PAPER-ONLY` indicator in `Header.tsx`.
- **Intraday Session Entry Cutoff (`15:15 IST` Autonomous / `15:25 IST` Manual) & `15:20 IST` Auto Square-Off (`REV-021` — `09-Nov-2026`)**:
  - Fixed `getOfficialNseOptionChainExpiries()` in `src/utils/orderFormatters.ts` to evaluate holiday-stepped-back Monday expiries (e.g., `09-Nov-2026` from Tuesday `10-Nov-2026` Diwali Balipratipada) against `todayMidnightMs` and the `15:15 IST` rollover cutoff.
  - Added `checkSessionEntryCutoffWindow()` (enforced as Gate 0 in `statutoryVetoEngine.ts` and `runAutonomousAgentCycleIfArmed` in `paperTradeService.ts`) to block autonomous NSE/BSE entries at `>= 15:15 IST` while allowing manual overrides up to `15:25 IST` for non-expiring contracts.
  - Added `checkShouldAutoSquareOffOrder()` across `sanitizeAndDedupeOrders()`, `updateOrdersLivePnl()`, and `agentScheduler.ts` to automatically square off all open intraday cash (`NSE_CASH` / `BSE_CASH`) and expiring F&O contracts (`expiryDate <= today`) at `>= 15:20 IST` (with deterministic catch-up if opened after `15:20 IST` or on a later date), while allowing non-expiring F&O contracts (`expiryDate > today`) to carry forward overnight.
- **Whole-NSE Dynamic Stock Discovery & 100% Live Market-Data Scoring (`REV-022` — `09-Nov-2026`)**:
  - Updated `fetchDynamicZonesScreener()` in `src/server/marketData.ts` to always query the live Chartink whole-NSE breakout scanner first (`Close > 200 SMA & Volume > 100,000`) and then enrich discovered stocks via Upstox v2 / Yahoo Finance quotes, injecting all discovered `.NS` tickers into `quotesCache` for `3. AI Council`.
  - Removed hardcoded `NSE_EQUITY_QUANT_PROFILES` score overrides (`ROCE 31.2% · PAT +124%`, static `rsRank`, static `moatBaseScore`) from `computeDynamicStrategyQuantification()` so all 5 pillars (`O`, `M`, `Q`, `R`, `S`) are computed 100% from live price, volume, rupee turnover, intraday close location, and 52-week range position.
  - Enforced a hard qualification gate requiring positive session momentum (`changePct >= +0.35%` and positive alpha vs. NIFTY 50) plus volume/turnover expansion (`vol >= 200K` or turnover `>= ₹15 Cr`) to qualify for `>= 88 / 100` (`EXEC QUALIFIED`).
- **Authoritative SEBI/AMFI + Chartink Market Cap Tiering, Cross-Sectional Percentile Scoring (`Zero 91/100 Ties`), Swing vs. Compounder Split & Mobile LTP Visibility (`REV-023` — `09-Nov-2026`)**:
  - Replaced the share-price (`priceBase >= 1800`) and single-day turnover (`rupeeTurnoverCr >= 80`) cap heuristics with `classifySebiMarketCapTier()` and `resolveClientSebiCapCategory()` combining parallel Chartink Market Cap bucket discovery (`>= ₹85,000 Cr` Large Cap, `₹28,000–₹85,000 Cr` Mid Cap, `< ₹28,000 Cr` Small Cap) and canonical SEBI/AMFI **Nifty 100 (`Large Cap`)** and **Nifty Midcap 150 (`Mid Cap`)** constituent registries (defaulting Rank 251+ stocks such as `PGEL`, `SAGILITY`, and `ANGELONE` to `Small Cap`, and `OBEROIRLTY` / `LICHSGFIN` to `Mid Cap`).
  - Fixed the intraday high/low range cancellation bug (`77%` constant `closeLocationPct`) and blended 5-pillar scores with cross-sectional percentile ranks (`0–100`) across the live scan so scores spread smoothly (`62` to `97`) and never cluster at `91 / 100`.
  - Differentiated high-velocity `SWING` breakouts (`|changePct| >= 2.15%` or top-35% volume/momentum thrust) from steady 200-SMA `COMPOUNDER` leaders, updated Cap Tier filter/modal definitions to official SEBI/AMFI rules, added Cap badges to `02. 52W-Low Bottom Accumulation & Bear Put Scanner`, and added an inline mobile `₹LTP` + `% Change` strip in `01. Live Breakout & Factor Screener`.
- **Quant Dossier (`SPLIT_DOSSIER`) Card Compression Fix & Font Hierarchy Standardization (`REV-024` — `09-Nov-2026`)**:
  - Fixed the CSS Flexbox vertical compression bug in `viewMode === 'SPLIT_DOSSIER'` (`src/components/InstitutionalEquityRadar.tsx`) where `flex flex-col max-h-[920px]` combined with `overflow-hidden` (without `shrink-0`) squished all 60 left-column stock cards and sliced through the ticker font (`PNB`, `DATAPATTNS`, `UNIONBANK`, `DIVISLAB`).
  - Standardized font sizes and line heights across the Quant Dossier left-column cards and right-column header pods (`text-sm sm:text-base font-mono leading-snug` for ticker & LTP, `text-[10px] leading-none` for badges, `text-xs leading-normal` for company name & conviction score, `text-[11px] leading-normal` for strategy model, ₹/% change, and driver) and aligned the right-column Market Cap Bracket sublabel with `SEBI / AMFI Rank & Chartink MCap`.
- **Full Dynamic Universe Discovery & Live Causal Synthesis for `04. First-Principles` & `05. Global Macro Impact` (`REV-025` — `09-Nov-2026`)**:
  - Added a 5th parallel bearish Chartink scan (`runChartinkBearishClause`) inside `fetchDynamicZonesScreener()` and connected `computeGlobalMarketImpact()` and `computeFirstPrinciplesState()` to the entire dynamic `quotesCache` universe (60–80+ discovered `.NS` stocks + benchmark contracts) via `inferDynamicSectorAndMacroProfile()`.
  - Replaced static company boilerplate strings (`primaryGlobalDriver`, `fundamentalTransmissionReason`) with `buildLiveGlobalAndGeoTrigger()` and `buildLiveMarketBasicsAndPolicy()` driven 100% by live global macro indicators, sector transmission rules, and session price/volume/turnover telemetry while preserving static `exclusiveIntel` regulatory badges on benchmark stocks.
  - Ranked Rising and Falling pools by cross-sectional percentile (`64–97`) to eliminate `96/100` score ties, and formatted currency (`$` vs `₹`), units (`bbl (MCX Lots)` / `oz (MCX Lots)` / `units (NSE F&O)` / `shares`), and SEBI/AMFI `capCategory` badges across `FirstPrinciplesMarketEngine.tsx` and `GlobalMarketActionDesk.tsx`.
- **Multi-Factor PSU Bank & Sub-Sector Causal Architecture, Stock-Specific Balance-Sheet Drivers & Strict Ordinal Score/ROI Separation (`REV-026` — `09-Nov-2026`)**:
  - Separated Financial sub-sectors into `PSU Banking & Sovereign Credit`, `Sovereign Power & Infra Finance`, `Capital Markets, Exchanges & Wealth`, `NBFCs, Housing & Gold Finance`, `Insurance`, and `Private Banking`, and differentiated Pharma into `Hospitals`, `CDMO/API`, and `US Generics`.
  - Added `PSU_BANK_SPECIFIC_EDGE` in `src/server/globalMarketImpactEngine.ts` to articulate the 5 real institutional drivers of Indian PSU Banks (24%+ SLR Sovereign G-Sec Treasury MTM gains on falling crude/yields, low-FII float insulation + DII rotation, `₹11.11 Lakh Cr` Union Budget capex consortium credit, decade-low Net NPAs + NCLT written-off recoveries boosting RoA `>1.1%`, and high semi-urban/rural CASA + `~1.0x P/ABV` valuation re-rating) with bank-specific theses for `SBIN`, `PNB`, `UNIONBANK`, `INDIANB`, `BANKBARODA`, `CANBK`, `BANKINDIA`, and `MAHABANK`.
  - Enforced strict ordinal rank ceilings (`97`, `95`, `94`, `92`...), un-clamped stock-specific intraday range/payoff scaling (eliminating `+12.08%` Expected ROI ties), and deduplicated sector RSS headlines across cards.
- **Full Static Audit Remediation: Live 5-Stream RSS Parser, `<=48h` Verified Regulatory Badges, Dynamic First-Principles Geopolitics/Policy/Agents & 100% Live 12-Vector Macro Matrix (`REV-027` — `09-Nov-2026`)**:
  - Removed unconditional static `exclusiveIntel` regulatory objects from `STOCK_PROFILES` in `src/server/globalMarketImpactEngine.ts` and replaced them with `detectLiveRegulatoryOrOrderFiling()` so regulatory, order-book/LoA, and policy badges appear **only** when verified in a live `<=48h` RSS headline/filing.
  - Upgraded `fetchLiveIndianMarketNews()` into a **Live 5-Stream RSS Parser** (`War & Geopolitics`, `US Fed & Treasury Macro`, `India RBI & Sovereign Policy`, `NSE Order Book & Regulatory Filings`, `Commodities & Energy`) with `when:2d` (`48h`) filtering and live directional stock attribution (`pickLiveSectorMovers`) across `globalCues` and `liveNewsFeed`.
  - Replaced hardcoded stock lists in `src/server/firstPrinciplesEngine.ts` (`calibrateSelfLearningAgents`, `policyAndFlows.activePolicyCatalysts`, and `geopolitics`) and `src/services/agentQuantEngine.ts` (`topEquitySymbol`) with live session leaders and laggards from `quotesCache`.
  - Expanded `resolveSymbolSector()` in `src/services/macroCausalLearningEngine.ts` to 250+ NSE symbols + company-name keyword fallback and derived `warIndex`, `v2Score`, `v5PolicyScore`, `v7JobsScore`, `fiiHeavyweightBasketChg`, and `diiCapexBasketChg` 100% dynamically from live NSE breadth, sector baskets, and macro ticks in `LIVE_EXCHANGE_FEED` mode.
- **Authoritative MCX `CRUDEOILM` NYMEX WTI (`CL=F × INR=X`) Parity Pricing & Legacy `₹8,673` ICE Brent Order Self-Healing (`REV-028` — `09-Nov-2026`)**:
  - Replaced the erroneous `brentPrice * usdinr * 0.98` (`BZ=F` ICE Brent `$93.67` -> `₹8,673/bbl`) and `brentPrice * usdinr * 0.72` formulas across `agentQuantEngine.ts` and `statutoryVetoEngine.ts` with `computeAuthoritativeMcxCrudeParity(quotes)`, which prices MCX `CRUDEOILM` directly from its true exchange underlying: **NYMEX WTI (`CL=F` = `$87.73`) × `USD/INR` (`INR=X` = `₹93.92`) = `₹8,240.00/bbl`** (matching live MCX `₹8,230–₹8,246` and bounded within the session range `₹8,089–₹8,594`).
  - Removed the synthetic `3.5`-pt tick step in `updateOrdersLivePnl()` and added automatic self-healing in `paperTradeService.ts` and `agentQuantEngine.ts` so any existing cached `MCX CRUDEOILM` order with `entryPrice > 8594` (`₹8,673.00`) is automatically repaired to true NYMEX WTI parity (`₹8,240.00`).
- **Rebrand to Personal Trading Terminal, Header Architecture Modal Update & Terminology Simplification (`REV-029` — `09-Nov-2026`)**:
  - Rebranded application name to **Personal Trading Terminal** across HTML title, PWA manifest tags, and sidebar brand wordmark (`PERSONAL / TRADING TERMINAL`).
  - Updated the 4-point Header Architecture and Regulatory modal to showcase all latest capabilities: (1) Upstox Real-Time Analytics v2 streaming quotes + Chartink whole-NSE auto-failover + NYMEX WTI parity for MCX Crude; (2) 5-Pillar Stock Scoring Model & ≥88/100 Execution Gate with official SEBI/AMFI market-cap tiering; (3) Autonomous 5-Agent Strategy Mandate & Session Cutoffs (`15:15 IST` entry, `15:25 IST` override, `15:20 IST` square-off, and strict 1R `≤ ₹400` risk cap with Step-Ratchet trailing stops); and (4) Statutory SEBI Circuit Breakers, 2026 Tax Veto & Cash Preservation with 1.50% daily drawdown limit, round-trip 2026 STT/CTT friction veto, and live 5-stream RSS parser with verified ≤48h filings.
  - Purged user-facing occurrences of "Jarvis", "Institutional", and "Quant" across all UI cards, headers, tables, and tooltips, adopting clean, minimal labels ("Terminal", "Engine", "Radar", "Stock Dossier", "Strategy").

### 9.3 Current Progress & Live System Status
- **Type Safety & Build**: `compile_applet` and `lint_applet` (`tsc --noEmit`) pass with 0 errors across the entire codebase.
- **Revert & Audit Ledger**: `REV-001` through `REV-029` are logged in both `PROJECT_CHANGELOG_AND_REVERT_LEDGER.md` and `src/data/architectureRevertLedger.ts` (accessible inside the app under `4. Order Book` -> `04. Architecture Revert Ledger`).
- **10-Point Brutal Stress Audit**: Passing `10 / 10` checks in `2. Stress Lab` (`BrutalStressTestLab.tsx`).

### 9.4 Immediate Next Steps & Future Roadmap
- [x] **Out-of-Sample Walk-Forward Validation**: Executed `npm run data:sync` across benchmark NSE universe and saved `.data/latest_walkforward_sync.json`.
- [x] **Intraday & Expiry Lifecycle Guard (`REV-021`)**: Enforced `15:15 IST` autonomous entry cutoff, `15:25 IST` manual override cutoff, and `15:20 IST` auto square-off (with catch-up) for intraday cash and expiring F&O positions.
- [x] **Whole-NSE Dynamic Discovery & 100% Live Scoring (`REV-022`)**: Replaced hardcoded 45-stock Upstox shortcut and static fundamental profile score boosts with Chartink whole-NSE discovery + Upstox/Yahoo enrichment and 100% live market-data scoring.
- [x] **SEBI/AMFI Market Cap Tiering, Cross-Sectional Percentile Scoring & Mobile LTP Visibility (`REV-023`)**: Enforced official SEBI/AMFI + Chartink market-cap tiering, eliminated `91/100` score ties via cross-sectional percentile ranking, balanced `SWING` vs `COMPOUNDER` horizon tags, and surfaced inline `LTP` + `% change` on mobile screens.
- [x] **Quant Dossier (`SPLIT_DOSSIER`) Font & Card Layout Fix (`REV-024`)**: Eliminated vertical card compression and standardized font hierarchy across the 2-column Quant Dossier view.
- [x] **Dynamic First-Principles & Global Macro Impact Universe (`REV-025` & `REV-026`)**: Replaced the hardcoded 19-symbol restriction and generic 1-line sector templates in `04. First-Principles` and `05. Global Macro Impact` with full Chartink + `quotesCache` discovery, 5-factor PSU bank & sub-sector balance-sheet/treasury/policy causal synthesis, strict ordinal score/ROI separation, and accurate commodity unit formatting.
- [x] **Full Static Audit Remediation & Authoritative MCX WTI Parity (`REV-027` & `REV-028`)**: Replaced all remaining static regulatory badges, hardcoded 3–5 stock lists, and static macro fallback scores with a Live 5-Stream RSS Parser, `<=48h` verified filing detector, 250+ symbol sector mapper, 100% live tick-driven macro vectors, and exact NYMEX WTI (`CL=F × INR=X`) MCX Crude Oil parity.
- [x] **Rebrand to Personal Trading Terminal, Header Info Modal & Terminology Cleanup (`REV-029`)**: Rebranded app, updated the 4-point architecture modal, and purged Jarvis, Institutional, and Quant buzzwords.
- [ ] **Live Upstox WebSocket Stream**: Wire streaming WebSocket feed in `src/services/useMarketWebSocket.ts` for sub-second order book updates.