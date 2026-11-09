# J.A.R.V.I.S. Institutional Quant Terminal — Change & Revert Ledger

This document records every surgical UI/module pruning action, static data removal, and quantitative strategy/veto formula upgrade so any change can be audited or reverted cleanly.

---

## 1. Core Quantitative Rules Enforced (`04-Nov-2026` · `REV-001` – `REV-015`)

1. **Strict Cost-of-Trading & 3.0x Friction Veto Gate (`src/services/statutoryVetoEngine.ts`)**:
   - Every candidate trade across `NSE F&O`, `NSE Cash`, `BSE Cash`, and `MCX` calculates round-trip **2026 Indian Statutory Taxes + Brokerage**:
     - **Brokerage**: `₹20` flat per executed order (`₹40` round-trip per single-leg order; `₹80` round-trip for 2-leg defined-risk option spreads).
     - **NSE F&O Options**: STT `0.15%` (sell on premium), Exchange+IPFT `0.03553%`, SEBI `₹10/Cr`, Stamp Duty `0.003%` (buy on premium), GST `18%` on `(Brokerage + Exchange + SEBI)`.
     - **NSE/BSE Cash**: STT `0.025%` (sell), Exchange+IPFT `0.00307%` (NSE) / `0.00375%` (BSE), SEBI `₹10/Cr`, Stamp Duty `0.003%` (buy), GST `18%`.
     - **MCX Futures**: CTT `0.01%` (sell), Exchange `0.0026%`, SEBI `₹10/Cr`, Stamp Duty `0.002%` (buy), GST `18%`.
   - **Hard Veto Condition**:
     - If `Total Friction INR >= Target Gross Profit INR` OR `Gross Profit / Total Friction < 3.0x`, the trade is **VETOED** immediately.
2. **Strict `> 2.00%` (`> 2.50%` Under Shock/Post-Loss) Net-of-Tax Profit Requirement**:
   - `Net Profit % = ((Target Gross Profit INR - Total Friction INR) / Capital or Margin Deployed INR) × 100`.
   - Any trade projecting `<= 2.00%` Net Profit (`<= 2.50%` during War/Fed/Election shock or post-loss recovery) is **VETOED** immediately.
3. **12-Vector Macro-Causal, 2026 US Mid-Term Elections & 3-Layer FII/DII/Pro vs Retail Flow Engine (`src/services/macroCausalLearningEngine.ts`)**:
   - Continuously evaluates all **12 Live Vectors**: (1) Market Regime & VIX, (2) Live News RSS, (3) US Dollar (`DX-Y.NYB` & `INR=X`), (4) Global Markets (`^GSPC`, `^IXIC`, `^N225`, `^HSI`), (5) Domestic Govt/RBI/SEBI Policy Rules, (6) US Fed Rates (`^TNX` & `^IRX`), (7) US Jobs/NFP & Unemployment, (8) Gold (`GC=F`) & Silver (`SI=F`), (9) Brent Oil (`BZ=F` / `CL=F`) & Natural Gas (`NG=F`), (10) War & Geopolitical Escalation Index, (11) **3-Layer FII / DII / Pro vs. Retail (`Client`) Futures LSR & Cash Flow**, and (12) **2026 US Mid-Term Elections & Indo-US Sectoral Transmission (`vec_us_midterms`)**.
   - In `LIVE_EXCHANGE_FEED` mode, FII/DII Cash and Futures LSR numbers are dynamically derived on every tick from live NSE/FX/heavyweight price and breadth telemetry so nothing sits static.
4. **5-Stage Inter-Agent Shared-Blackboard Consensus Council with Vidura Red-Team Veto**:
   - Sequential pipeline: `Stage 1 Kuber (12-Vector Macro/War/Commodity Sentinel)` $\rightarrow$ `Stage 2 Chanakya (3-Layer FII/DII & US Mid-Term Flow Detective)` $\rightarrow$ `Stage 3 Arjuna / Bhishma (Cash & F&O Structure Proposer)` $\rightarrow$ `Stage 4 Vidura (Adversarial Red-Team Critic & Sector Correlation Veto)` $\rightarrow$ `Stage 5 Execution & Risk Governor`.
5. **Hard Intraday Drawdown Locked at `<= 1.50%` (Strictly `< 2.00%`) via Consensus Quarter-Kelly Sizing**:
   - Enforces a **98.50% Intraday Protected Capital Floor** (`Max Daily Drawdown <= 1.50%`). Per-trade `1R` stop-loss risk scales between `0.20%` and `0.45%` of total equity via Quarter-Kelly $\times$ Volatility Target while deploying full working capital notional with zero return drag.
6. **3-State Asymmetric Shock & Anti-Whipsaw Cash Preservation Protocol**:
   - (State 1) Open winners lock **82% of peak unrealized profit** during shocks; (State 2) Open losers in hard-vetoed sectors exit to **100% Protected Cash** (never force-rotating on the same tick); (State 3) Freed cash requires **3-tick persistence** and a **`> 2.50%` Net Profit Recovery Hurdle** before redeployment.
7. **100% Dynamic Universe Discovery (Zero Static Scripts)**:
   - `discoverDynamicEquityUniverse(quotes)` automatically ingests all 30+ tracked NSE/BSE equities plus any runtime `.NS`/`.BO` symbols. All 5 agents generate their `decisionScripts` 100% dynamically from `evaluateAdaptiveScriptLearningMatrix()`.

---

## 2. Granular Change & Revert Ledger (`REV-001` – `REV-015`)

### `REV-001` — Intelligent Scan & Deploy Veto Engine (`src/services/statutoryVetoEngine.ts`)
- **Files Modified**: `src/services/statutoryVetoEngine.ts`, `src/components/TradeHistory.tsx`, `src/components/AutonomousAgentsDesk.tsx`
- **Previous Behavior**: Clicking `Scan & Deploy (All Desks)` unconditionally generated 3–4 orders via `generateLiveMarketOrder` even if those symbols were already `OPEN` or projected `< 2.0%` net profit after taxes.
- **New Behavior**: Routes all desk scans through `executeIntelligentScanAndDeploy(quotes, orders, segment)` and renders the live **Pre-Trade Veto & >2% Net Profit Audit Strip**.
- **How to Revert**: In `TradeHistory.tsx` (`handleDeployOrder`) and `AutonomousAgentsDesk.tsx` (`handleTriggerScanCycle`), replace `executeIntelligentScanAndDeploy` with direct calls to `generateLiveMarketOrder(quotes, agentId)`.

### `REV-002` — Pruned Toolbar Button: `1-Click Simulate 82% Anti-Erosion Lock` (`src/components/TradeHistory.tsx`)
- **File Modified**: `src/components/TradeHistory.tsx`
- **Previous Behavior**: Quick Deploy Desk Bar included a synthetic button `1-Click Simulate 82% Anti-Erosion Lock` (`handleSimulateTslLock()`).
- **New Behavior**: Removed synthetic button from toolbar; replaced with the **Revert & Change Audit (`REV-001..008`)** sub-tab and live **Scan & Veto Audit Strip**.
- **How to Revert**: Re-add the button calling `handleSimulateTslLock()` inside the Quick Deploy Desk Bar in `src/components/TradeHistory.tsx`.

### `REV-003` — Pruned Row Button: `SIM TSL LOCK` (`src/components/TradeHistory.tsx`)
- **File Modified**: `src/components/TradeHistory.tsx`
- **Previous Behavior**: Each open trade row had a `SIM TSL LOCK` button next to `SQUARE OFF`.
- **New Behavior**: Pruned `SIM TSL LOCK`; kept only the real `SQUARE OFF` button that closes the position at live exchange LTP.
- **How to Revert**: Re-add `<button onClick={() => handleSimulateTslLock(trade.orderId)}>SIM TSL LOCK</button>` inside the open row action column in `src/components/TradeHistory.tsx`.

### `REV-004` — Pruned Simulator Buttons in 5-Agent Desk (`src/components/AutonomousAgentsDesk.tsx`)
- **File Modified**: `src/components/AutonomousAgentsDesk.tsx`
- **Previous Behavior**: Top command bar had a `SIMULATE TSL PROFIT LOCK` button, and Governance sub-tab had a manual `Run 5:00 PM IST Auto-Check Now` button.
- **New Behavior**: Replaced `SIMULATE TSL PROFIT LOCK` in the command bar with `PRUNE LOSERS & ROTATE (>2% NET)` (`executeAdaptivePruneAndRotateCycle`), and made the 17:00 IST circular check an automated status badge without a fake manual trigger button.
- **How to Revert**: Restore the `handleSimulateTrailingProfitLock` button in the command bar and `handleRunPostMarketSync` button in `src/components/AutonomousAgentsDesk.tsx`.

### `REV-005` — Pruned Hardcoded Static Audit Logs (`src/components/QuantTerminal3D.tsx`)
- **File Modified**: `src/components/QuantTerminal3D.tsx`
- **Previous Behavior**: `auditLogs` initialized with 3 static entries (`11:42:09.104`, `11:41:45.882`, `11:40:12.331`).
- **New Behavior**: Dynamically derives live execution & option chain audit entries from current IST timestamps, live ATM Option Chain Greeks/OI walls, and real OMS orders stored in `paperTradeService.ts`.
- **How to Revert**: Restore the 3 static seed objects in `useState` for `auditLogs` in `src/components/QuantTerminal3D.tsx`.

### `REV-006` — Wired Option Chain & Strategy Cards to Canonical OMS (`src/components/QuantTerminal3D.tsx`)
- **File Modified**: `src/components/QuantTerminal3D.tsx`
- **Previous Behavior**: Clicking `CONFIRM & TRANSMIT ORDER` in the Option Chain modal or `STAGE ORDER / GO LONG / DEPLOY SPREAD` on the right-hand Bot Cards only displayed a toast message without adding the trade to the Canonical Order Book.
- **New Behavior**: Runs `evaluateCandidateOrderAgainstVetoRules()` and persists approved `> 2.0%` net profit orders directly into `paperTradeService.ts` (`persistPaperTrades`), broadcasting `jarvis:orders-updated`.
- **How to Revert**: Remove the `persistPaperTrades` call inside `handleConfirmOrderTransmission` and `handleFireSignal` in `src/components/QuantTerminal3D.tsx`.

### `REV-007` — Upgraded Equity & F&O Target Calibration for `> 2.0%` Net Profit (`src/services/agentQuantEngine.ts` & `src/services/scriptLearningEngine.ts`)
- **Files Modified**: `src/services/agentQuantEngine.ts`, `src/services/scriptLearningEngine.ts`
- **Previous Behavior**: Equity cash targets were set at `+2.4%` to `+2.5%` gross, which after statutory taxes and brokerage could dip near `1.95%` net on smaller quantities.
- **New Behavior**: Calibrated confirmed leader breakout targets to `+2.85%`–`+2.90%` gross (`> 2.38%` Net Profit after all 2026 taxes & ₹40 brokerage) with tight `0.72%`–`0.75%` initial stop (`1R <= ₹380`) and 82% Anti-Erosion TSL.
- **How to Revert**: Change target multiplier in `agentQuantEngine.ts` back to `1.025`.

### `REV-008` — Authoritative NSE NIFTY 50 Tuesday Expiry & Holiday Step-Back (`src/utils/orderFormatters.ts`)
- **Files Modified**: `src/utils/orderFormatters.ts`, `src/components/QuantTerminal3D.tsx`, `src/services/paperTradeService.ts`
- **Previous Behavior**: Used browser timezone and legacy Thursday (`day === 4`) calculation, showing `05-Nov-2026`.
- **New Behavior**: Uses IST (`UTC+5:30`) and official NSE Tuesday expiry (`day === 2`) with holiday step-back (`09-Nov-2026` Weekly [Mon, advanced from Tue `10-Nov-2026` Diwali Balipratipada], `17-Nov-2026` Weekly [Tue], `23-Nov-2026` Monthly [Mon, advanced from Tue `24-Nov-2026` Guru Nanak Jayanti]).
- **How to Revert**: Edit `getOfficialNseOptionChainExpiries()` in `src/utils/orderFormatters.ts`.

### `REV-009` — 11-Vector Macro-Causal & 3-Layer FII/DII/Pro vs Retail Flow Engine (`src/services/macroCausalLearningEngine.ts`)
- **Files Modified**: `src/services/macroCausalLearningEngine.ts`, `src/data/symbols.ts`, `src/services/scriptLearningEngine.ts`
- **New Behavior**: Tracks all 11 vectors—(1) Market Regime & VIX, (2) Live News RSS, (3) US Dollar DXY & USD/INR, (4) Global Markets, (5) Govt/RBI/SEBI Policies, (6) US Fed Rates (`^TNX` & `^IRX`), (7) US Jobs/NFP, (8) Gold (`GC=F`) & Silver (`SI=F`), (9) Brent Oil (`BZ=F`) & Natural Gas (`NG=F`), (10) War Escalation Index, and (11) **3-Layer NSE Participant-Wise OI (`FII`, `DII`, `Pro` vs. `Client` Retail LSR) & Sectoral Flow Matrix**.
- **How to Revert**: Remove `evaluateElevenVectorMacroMatrix` in `src/services/scriptLearningEngine.ts`.

### `REV-010` — 5-Stage Inter-Agent Shared-Blackboard Consensus Council with Red-Team Veto (`src/services/macroCausalLearningEngine.ts`)
- **Files Modified**: `src/services/macroCausalLearningEngine.ts`, `src/services/statutoryVetoEngine.ts`
- **New Behavior**: Rewires the 5 agents into a sequential Shared-Blackboard Consensus Council (`Stage 1 Kuber Macro/War` $\rightarrow$ `Stage 2 Chanakya FII/DII Flow` $\rightarrow$ `Stage 3 Arjuna/Bhishma Structure` $\rightarrow$ `Stage 4 Vidura Red-Team Critic` $\rightarrow$ `Stage 5 Execution Governor`). Blocks any trade with `< 70/100` consensus or any single Hard Veto.
- **How to Revert**: Bypass `interAgentConsensus` check in `evaluateCandidateOrderAgainstVetoRules()` inside `src/services/statutoryVetoEngine.ts`.

### `REV-011` — Hard Intraday Drawdown Locked at `<= 1.50%` (`< 2.00%`) Consensus Quarter-Kelly Sizing (`src/services/macroCausalLearningEngine.ts`)
- **File Modified**: `src/services/macroCausalLearningEngine.ts`
- **New Behavior**: Locks a **98.50% Intraday Protected Capital Floor** (`Max Daily Drawdown <= 1.50%`, strictly `< 2.00%`). Per-trade stop-loss risk (`1R`) scales between `0.20%` and `0.45%` of total equity via Consensus Quarter-Kelly $\times$ Volatility Target, while deploying full working capital notional to achieve `> 2.00%` Net Profit.
- **How to Revert**: Restore `computeLeakProofPositionSize()` in `src/services/agentQuantEngine.ts`.

### `REV-012` — 3-State Asymmetric Shock & Anti-Whipsaw Cash Preservation Protocol (`src/services/macroCausalLearningEngine.ts`, `src/services/paperTradeService.ts`)
- **Files Modified**: `src/services/macroCausalLearningEngine.ts`, `src/services/paperTradeService.ts`
- **New Behavior**: Replaces blind same-tick rotation with: (State 1) **82% Peak Profit-Lock** on open winners during macro/war shocks; (State 2) **100% Protected Cash** parking on stopped-out trades; (State 3) **3-Tick Persistence + `> 2.50%` Net Profit Recovery Hurdle** before redeploying freed cash.
- **How to Revert**: Remove `applyAsymmetricMacroShockShield` and `blockSameTickRotation` in `src/services/paperTradeService.ts`.

### `REV-013` — Interactive Brutal Stress-Test Lab & 4-Core Pipeline Bar (`src/components/BrutalStressTestLab.tsx`, `src/App.tsx`)
- **Files Modified**: `src/components/BrutalStressTestLab.tsx`, `src/App.tsx`, `src/components/Header.tsx`, `src/components/Sidebar.tsx`
- **New Behavior**: Adds the interactive **Brutal Stress-Test Lab** with 1-click institutional crisis presets, custom multi-vector sliders, 1-click Reset to Live Feed, and the **10-Point Brutal Audit Scorecard**, integrated into the top **4-Core Causal Pipeline Bar**.
- **How to Revert**: Remove the 4-Core Pipeline bar and `stress_test_lab` route in `src/App.tsx`.

### `REV-014` — 100% Dynamic Universe Discovery & Elimination of Remaining Static Agent Scripts (`src/services/scriptLearningEngine.ts`, `src/services/agentQuantEngine.ts`, `src/services/macroCausalLearningEngine.ts`)
- **Files Modified**: `src/services/scriptLearningEngine.ts`, `src/services/agentQuantEngine.ts`, `src/services/macroCausalLearningEngine.ts`
- **New Behavior**: Added `discoverDynamicEquityUniverse(quotes)` to automatically ingest all 30+ tracked NSE/BSE equities plus any runtime `.NS`/`.BO` symbols; rewrote `Bhishma`, `Chanakya`, and `Kuber` `decisionScripts` so every stock pick, pair trade, and commodity beneficiary/victim is ranked 100% dynamically from `evaluateAdaptiveScriptLearningMatrix()`; and derived live FII/DII Cash & LSR numbers directly from streaming index/FX/heavyweight ticks in `LIVE_EXCHANGE_FEED` mode.
- **How to Revert**: Restore static `candidateSymbols` and static `decisionScript` templates in `src/services/agentQuantEngine.ts`.

### `REV-015` — Vector #12: 2026 US Mid-Term Elections & Indo-US Sectoral Transmission Matrix (`src/services/macroCausalLearningEngine.ts`, `src/components/BrutalStressTestLab.tsx`, `src/components/MacroPolicyThesis.tsx`)
- **Files Modified**: `src/services/macroCausalLearningEngine.ts`, `src/components/BrutalStressTestLab.tsx`, `src/components/MacroPolicyThesis.tsx`
- **New Behavior**: Added **Vector #12 (`vec_us_midterms`)** modeling **2026 US Mid-Term Elections** (`LIVE_DYNAMIC_TRACKING`, `GRIDLOCK_DIVIDED_CONGRESS`, `TARIFF_HAWK_SWEEP`, `FISCAL_STIMULUS_SWEEP`) across 4 Indo-US channels: (1) US Biosecure Act & FDA Generics (`CIPLA`, `SUNPHARMA`, `DRREDDY`), (2) H-1B Visa & Fortune-500 IT Spend (`TCS`, `INFY`, `HCLTECH`), (3) INDUS-X & GE-F404 Defence Co-Production (`HAL`, `BEL`, `SOLARINDS`), and (4) Section 232 Tariffs & US 10Y Treasury Yields (`^TNX`) on Metals & FII-Heavy Banks.
- **How to Revert**: Remove `vec_us_midterms` and `US_MIDTERM_TARIFF_YIELD_SHOCK` in `src/services/macroCausalLearningEngine.ts`.

### `REV-016` — Full-App Button Audit, Real OMS Wiring of Risk Engine & Circuit Breaker, and Universal `>2%` Net + 5-Agent Veto Enforcement (`src/App.tsx`, `src/components/RiskEngineTerminal.tsx`, `src/components/FirstPrinciplesMarketEngine.tsx`)
- **Files Modified**: `src/App.tsx`, `src/components/RiskEngineTerminal.tsx`, `src/components/FirstPrinciplesMarketEngine.tsx`, `src/components/MacroPolicyThesis.tsx`, `src/components/InstitutionalEquityRadar.tsx`
- **New Behavior**:
  1. Wired Header/Sidebar Emergency Circuit Breaker (`handleExecuteCircuitBreaker`) and all Risk Engine buttons (`Global Kill Switch`, `Expel All OTM Options`, `Pause/Resume Strangle Bot`, `100% Cash Hedge`) directly to `getStoredPaperTrades()` / `persistPaperTrades()` and `jarvis_bot_status_overrides`.
  2. Replaced static seed logs in `RiskEngineTerminal.tsx` with live OMS & risk telemetry.
  3. Added 1-click **"Deploy via AI Council (>2% Net)"** and **"Open Order Book"** actions to Confirmed Leader cards and Equity Screener rows via `evaluateAndDeploySingleSetupViaCouncil()`.
  4. Routed all manual setups in `FirstPrinciplesMarketEngine.tsx` through the 5-Stage Inter-Agent Consensus Council and `> 2.00%` Net-of-Tax Profit Veto Gate.
- **How to Revert**: Remove `persistPaperTrades()` calls in `App.tsx` and `RiskEngineTerminal.tsx`, and bypass `evaluateCandidateOrderAgainstVetoRules()` in `FirstPrinciplesMarketEngine.tsx`.

### `REV-017` — Plain-English 4-Core Naming, Full-Cycle India Lok Sabha + US Primary/Mid-Term Elections, Dual-Mode 52W-Low Bottom & Bear Put (`T1/T2/T3`) Scanner, T-1 Tax/Brokerage Calendar with Before/After History & User Guide
- **Files Modified**: `src/App.tsx`, `src/components/Header.tsx`, `src/components/Sidebar.tsx`, `src/services/macroCausalLearningEngine.ts`, `src/services/scriptLearningEngine.ts`, `src/services/statutoryVetoEngine.ts`, `src/components/MacroPolicyThesis.tsx`, `src/components/BrutalStressTestLab.tsx`, `src/components/TradeHistory.tsx`, `USER_GUIDE_STRENGTHS_AND_LIMITATIONS.md`
- **New Behavior**:
  1. **Plain-English 4-Core Workflow**: Renamed the 4 Cores to **`1. Market Finder`**, **`2. Stress Lab`**, **`3. AI Council`**, and **`4. Order Book`**.
  2. **Full-Cycle India Lok Sabha/State + US Primary/Mid-Term/Presidential Election Engine (`vec_us_midterms`)**: Simultaneously evaluates India Lok Sabha (`INDIA_LIVE_CONTINUITY_TRACKING`, `INDIA_LOKSABHA_CONTINUITY_CAPEX`, `INDIA_MCC_PRE_POLL_PAUSE`, `INDIA_LOKSABHA_COALITION_POPULIST`) and US Primary/Mid-Term/Presidential stances (`LIVE_DYNAMIC_TRACKING`, `US_PRIMARY_RHETORIC_VOLATILITY`, `GRIDLOCK_DIVIDED_CONGRESS`, `TARIFF_HAWK_SWEEP`, `FISCAL_STIMULUS_SWEEP`).
  3. **Dual-Mode 52W-Low Institutional Bottom Accumulation & Bear-Market Put (`PE`) F&O Scanner (`evaluateBottomAccumulationAndBearPutMatrix`)**: Identifies both 52W-Low accumulation longs (`BOTTOM_ACCUMULATION_LONG`) and Bear-Market Put F&O setups (`BEAR_MARKET_PUT_FNO`) with explicit `T1 / T2 / T3` targets and a 4-stage **Non-Erosion Step-Ratchet Exit Plan** (`Cost+Friction at T1 -> Lock T1 at T2 -> 1.5x ATR Runner at T3`).
  4. **Calendarized T-1 Pre-Market Statutory Tax, SEBI & Brokerage Rule Radar + Before/After Order Ledger**: Stages upcoming tax/SEBI/brokerage changes `T-1 Day` before Go-Live for manual user approval before `09:15 IST` market open, and stamps `taxRuleVersionId` onto every order so historical trades preserve their **Before** calculation while post-approval trades use the **After** calculation.
  5. **Auto-Updated User Guide & Strengths/Weaknesses**: Added standalone `/USER_GUIDE_STRENGTHS_AND_LIMITATIONS.md` and Sub-Tab `06. User Guide & Strengths/Weaknesses` in `4. Order Book`.
### `REV-018` — Persistent Viewport Watermark & Dynamic Scrolling "DO NOT USE" Maintenance Banner
- **Files Modified**: `src/components/DoNotUseWatermarkBanner.tsx`, `src/App.tsx`, `src/index.css`, `src/data/architectureRevertLedger.ts`
- **New Behavior**:
  1. **Fixed Top Dynamic Scrolling Ticker**: Added a persistent, marquee-scrolling red warning banner across the top of all pages (`DO NOT USE — THIS APPLICATION HAS ISSUES WHICH ARE CURRENTLY BEING INVESTIGATED & FIXED • DO NOT PLACE REAL TRADES OR RELY ON SIGNALS / ORDER BOOK OUTPUTS • ENGINEERING HOTFIXES IN PROGRESS ACROSS ALL 4 CORES`).
  2. **Prominent Viewport Diagonal Watermark**: Implemented a bold diagonal red "DO NOT USE" stamp (`font-black text-red-600 text-6xl sm:text-8xl md:text-9xl`) with an authentic maintenance border that stays locked in the center of the user's viewport dynamically as they scroll across any page or tab.
  3. **Viewport Minimizer**: Added a top-bar control allowing authorized operators to dim/minimize the central watermark stamp when conducting code diagnostics without obscuring underlying tables.
- **How to Revert**: Remove `<DoNotUseWatermarkBanner />` from `src/App.tsx` and reset top header/sidebar offsets.

### `REV-019` — Full Quantitative & Logic Audit Remediation (`src/server/backtester.ts`, `src/services/positionSizer.ts`, `src/server/riskEngine.ts`, `src/services/scriptLearningEngine.ts`, `scripts/sync-data.ts`)
- **Files Modified**: `src/server/backtester.ts`, `src/services/positionSizer.ts`, `src/server/riskEngine.ts`, `src/services/scriptLearningEngine.ts`, `scripts/sync-data.ts`, `package.json`, `USER_GUIDE_STRENGTHS_AND_LIMITATIONS.md`, `README.md`, `.gitignore`, `LICENSE`
- **New Behavior**:
  1. **Sharpe, Sortino & López de Prado PSR Fix (`src/server/backtester.ts`)**: Subtracts daily risk-free rate (`rf = 0.065 / 252`) in Sharpe and Sortino, and passes per-period (daily) Sharpe along with daily return skewness/kurtosis and daily sample count into `calcPSR()`.
  2. **Closed-Only Trade Statistics (`src/server/backtester.ts`)**: Separates `closedTrades` from any unrealized open position at the end of the test window so Win Rate, Wilson 95% CI, Profit Factor, Expectancy, Consecutive Losses, and Student's *t*-statistic are never polluted by open trades.
  3. **Next-Bar Open + Slippage, Gap-Through-Stop Fills, Monotonic Trailing Stops & Cash-Delivery Statutory Costs (`src/server/backtester.ts`)**: Enters at Next-Bar Open + `5 bps` slippage; checks stops against `candle.low` on all 5 strategies; fills overnight gap-downs below stop at `candle.open` (less `5 bps` slippage); ratchets `trailingStopPrice` monotonically upward using `highestHighSinceEntry`; and deducts `0.2222%` Indian Cash-Delivery statutory taxes (`0.20%` round-trip STT + Stamp Duty + Exchange + SEBI + 18% GST) on every trade and equity curve transition.
  4. **Hard Risk Cap in Lot Sizer (`src/services/positionSizer.ts`)**: Removed `Math.max(1, ...)` so `calculatePositionSize()` returns `isValid: false, lots: 0` whenever 1 lot exceeds `maxRiskInr` or `maxOrderNotionalInr`.
  5. **Synchronized `1.50%` Daily Loss Cap (`src/server/riskEngine.ts`)**: Changed `maxDailyLossInr` from `25,000` (`2.5%`) to `15,000` (`1.5%` of `₹10,00,000` capital) to match documentation.
  6. **Mutually-Exclusive Mode A vs. Mode B Arbiter (`src/services/scriptLearningEngine.ts`)**: Enforced `qualifiesForModeALong` vs. `else if (qualifiesForModeBPut)` so no stock can simultaneously be recommended as a 52W-Low Cash Long and a Bear Put (`PE`).
  7. **Automated Native-Fetch Data & Walk-Forward Sync CLI (`scripts/sync-data.ts`)**: Added `npm run data:sync` using native `fetch` and `runBacktest` to output `.data/latest_walkforward_sync.json`.
- **How to Revert**: Revert the listed files to `REV-018`.

### `REV-020` — Second-Pass Re-Audit: Unclamped F&O Exit Prices, Full 2026 Statutory Friction Deduction, Leak-Proof `1R` Floor Removal & Transition to Subtle `PAPER-ONLY` Header Indicator
- **Files Modified**: `src/services/paperTradeService.ts`, `src/services/orderLifecycle.ts`, `src/services/agentQuantEngine.ts`, `src/App.tsx`, `src/components/Header.tsx`
- **New Behavior**:
  1. **Removed Legacy F&O Option Exit-Price Clamp (`src/services/paperTradeService.ts`)**: Deleted the legacy rule that overwrote `exitPrice` whenever `exitPrice <= 2.0 || exitPrice > entryPrice + 20`, preserving true market option prices.
  2. **Full 2026 Round-Trip Statutory Friction Deduction (`src/services/paperTradeService.ts`, `src/services/orderLifecycle.ts`)**: Updated `estimateStatutoryCosts()` and `computePaperOrderStatutoryFrictionINR()` to model both-leg cash-delivery STT (`0.20%` round-trip), `0.15%` F&O option sell STT, exchange + IPFT fees, SEBI turnover fee, stamp duty, `₹40` round-trip brokerage, and `18%` GST, deducting full statutory friction from realized P&L on closed trades.
  3. **Removed Forced 1-Share Floor in `computeLeakProofPositionSize` (`src/services/agentQuantEngine.ts`)**: Removed `Math.max(1, ...)` so any stock whose single-unit stop distance exceeds the `₹400` (`1R`) ceiling or margin cap is cleanly rejected (`allowed: false, qty: 0`).
  4. **Verified Walk-Forward Sync & Retired `DO NOT USE` Watermark (`src/App.tsx`, `src/components/Header.tsx`)**: Executed `npm run data:sync` (16 validated NSE walk-forward runs saved to `.data/latest_walkforward_sync.json`), removed `DoNotUseWatermarkBanner.tsx`, restored `top-0` header/sidebar and `pt-20` workspace geometry, and added the subtle `PAPER-ONLY` simulation indicator in `Header.tsx`.
- **How to Revert**: Restore `DoNotUseWatermarkBanner` in `src/App.tsx` and revert `paperTradeService.ts`, `orderLifecycle.ts`, and `agentQuantEngine.ts` to `REV-019`.

### `REV-021` — `15:15 IST` Autonomous / `15:25 IST` Manual Entry Cutoff, `15:20 IST` Intraday & Expiry Auto Square-Off with Catch-Up, and Holiday-Adjusted Expiry Rollover Fix
- **Files Modified**: `src/utils/orderFormatters.ts`, `src/services/paperTradeService.ts`, `src/services/agentQuantEngine.ts`, `src/services/statutoryVetoEngine.ts`, `src/server/agentScheduler.ts`, `src/components/AutonomousAgentsDesk.tsx`
- **New Behavior**:
  1. **Holiday-Adjusted Expiry Rollover Fix (`src/utils/orderFormatters.ts`)**: `getOfficialNseOptionChainExpiries()` now computes `stepBackIfWeekendOrHoliday(probe)` *before* checking whether the contract expires today at `>= 15:15 IST` or in the past (`adjustedMidnightMs < todayMidnightMs`), ensuring Monday-advanced expiries (such as `09-Nov-2026` advanced from Tuesday `10-Nov-2026` Diwali Balipratipada) properly roll over to `17-Nov-2026` at `15:15 IST`.
  2. **Session Entry Cutoff Gate (`checkSessionEntryCutoffWindow` in `src/utils/orderFormatters.ts` & Gate 0 in `src/services/statutoryVetoEngine.ts`)**: Blocks all autonomous NSE/BSE (`NSE_CASH`, `BSE_CASH`, `NSE_FNO`) entries at or after `15:15 IST` (`09:15–15:14:59 IST` active window) while permitting manual operator overrides for non-expiring setups until `15:25 IST` (same-day expiring F&O blocked at `>= 15:15 IST`; Cash MIS blocked at `>= 15:20 IST`).
  3. **`15:20 IST` Auto Square-Off with Catch-Up & Non-Expiring F&O Carry-Forward (`checkShouldAutoSquareOffOrder` in `src/utils/orderFormatters.ts`, `src/services/paperTradeService.ts`, `src/services/agentQuantEngine.ts`, `src/server/agentScheduler.ts`)**: Preserves each order's original `expiryDate` and automatically squares off all open intraday positions (`NSE_CASH` / `BSE_CASH`) and expiring F&O contracts (`expiryDate <= today`) at `>= 15:20 IST` (or immediately on app load if opened after `15:20 IST` or on a subsequent day), deducting full 2026 round-trip statutory friction while allowing non-expiring F&O contracts (`expiryDate > today`) to carry forward overnight.
- **How to Revert**: Revert `src/utils/orderFormatters.ts`, `src/services/paperTradeService.ts`, `src/services/agentQuantEngine.ts`, `src/services/statutoryVetoEngine.ts`, and `src/server/agentScheduler.ts` to `REV-020`.

### `REV-022` — Whole-NSE Chartink Discovery First + Upstox/Yahoo Enrichment & 100% Live Market-Data Conviction Scoring (`src/server/marketData.ts`, `server.ts`, `src/components/InstitutionalEquityRadar.tsx`)
- **Files Modified**: `src/server/marketData.ts`, `server.ts`, `src/components/InstitutionalEquityRadar.tsx`, `src/server/firstPrinciplesEngine.ts`, `src/server/globalMarketImpactEngine.ts`
- **New Behavior**:
  1. **Whole-NSE Chartink Discovery First, Live Quote Enrichment Second (`fetchDynamicZonesScreener`)**: Removed the early return that restricted Upstox mode to the 45 hardcoded stocks in `UPSTOX_EQUITY_NAMES`. Every scan now queries the live Chartink NSE breakout scanner (`latest close > 200 SMA AND latest volume > 100,000`) across all 2,000+ NSE stocks first, enriches discovered symbols with live Upstox v2 / Yahoo Finance quotes, and injects all discovered `.NS` tickers into `quotesCache` so `3. AI Council` and `discoverDynamicEquityUniverse()` automatically evaluate the full dynamic universe.
  2. **100% Live Market-Data 5-Pillar Scoring (`computeDynamicStrategyQuantification`)**: Removed all hardcoded `NSE_EQUITY_QUANT_PROFILES` score overrides (`ROCE 31.2% · PAT +124%`, static `rsRank`, static `moatBaseScore`) and hash offsets. All 5 pillars (`O: 20%`, `M: 25%`, `Q: 25%`, `R: 15%`, `S: 15%`) are now calculated strictly from live rupee turnover (`₹ Cr`), share volume, intraday range close location (`%`), session `% change`, relative alpha vs. NIFTY 50, and 52-week high proximity.
  3. **Strict Live Momentum & Volume Gate for `>= 88 / 100` (`EXEC QUALIFIED`)**: Requires positive session momentum (`changePct >= +0.35%` and positive relative alpha vs. NIFTY 50) **and** volume/turnover surge (`volume >= 200,000` or turnover `>= ₹15 Cr`) to unlock `compositeScore >= 88`. Flat or red stocks are capped on the watchlist (`<= 86` or `<= 78`).
- **How to Revert**: Revert `src/server/marketData.ts`, `server.ts`, and `src/components/InstitutionalEquityRadar.tsx` to `REV-021`.

### `REV-023` — Authoritative SEBI/AMFI + Chartink Market Cap Classification, Cross-Sectional Percentile Scoring (`Zero 91/100 Ties`), Swing vs. Compounder Split & Mobile LTP Visibility
- **Files Modified**: `src/server/marketData.ts`, `src/components/InstitutionalEquityRadar.tsx`, `src/services/scriptLearningEngine.ts`, `src/components/MacroPolicyThesis.tsx`
- **New Behavior**:
  1. **Authoritative SEBI / AMFI + Chartink Market Cap Classification (`classifySebiMarketCapTier` & `resolveClientSebiCapCategory`)**: Removed the share-price (`priceBase >= 1800`) and single-day turnover (`rupeeTurnoverCr >= 80`) heuristics that falsely tagged small/mid-cap stocks (`PGEL`, `SAGILITY`, `ANGELONE`, `OBEROIRLTY`, `LICHSGFIN`) as `Large Cap`. Queries Chartink across three explicit market-cap buckets (`market cap >= 85000` Cr for `LARGE_CAP`, `28000..85000` Cr for `MID_CAP`, `< 28000` Cr for `SMALL_CAP`) combined with canonical SEBI/AMFI **Nifty 100 (`Large Cap`, Rank 1–100)** and **Nifty Midcap 150 (`Mid Cap`, Rank 101–250)** symbol sets, defaulting all Rank 251+ equities to **`Small Cap`**.
  2. **Cross-Sectional Percentile Scoring (`0–100`) Eliminating `91 / 100` Ties**: Replaced the constant-ratio intraday `dayHigh`/`dayLow` fallback (which cancelled out to `77%`) with a momentum- and turnover-sensitive range estimator and blended all 5 pillars (`O`, `M`, `Q`, `R`, `S`) with **cross-sectional percentile ranks (`0–100`)** across the active scan so conviction scores spread smoothly from `62` to `97` without clustering at `91 / 100`.
  3. **Balanced `SWING` vs. `COMPOUNDER` Horizon Classification**: Classifies `SHORT_TERM` (`SWING`) only when intraday price expansion is high (`|changePct| >= 2.15%` or top-35% cross-sectional volume/momentum thrust with `changePct >= 1.45%`), and classifies steady trend followers above 200-SMA (`< 2.15%`) as `LONG_TERM` (`COMPOUNDER`).
  4. **Mobile Inline LTP & `% Change` Visibility + Cap Tier Badges Across All `1. Market Finder` Views**: Added a mobile-only (`sm:hidden`) live `₹LTP`, `% Change`, and `Volume` pill inside the primary stock column in `InstitutionalEquityRadar.tsx`, updated the Cap Tier filter dropdown and modal to display SEBI/AMFI Market Cap definitions, and added color-coded `Large Cap` / `Mid Cap` / `Small Cap` badges to `MacroPolicyThesis.tsx`.
- **How to Revert**: Revert `src/server/marketData.ts`, `src/components/InstitutionalEquityRadar.tsx`, `src/services/scriptLearningEngine.ts`, and `src/components/MacroPolicyThesis.tsx` to `REV-022`.

