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
- **How to Revert**: Revert core labels in `Header.tsx`/`Sidebar.tsx`/`App.tsx`, remove `evaluateBottomAccumulationAndBearPutMatrix()` in `scriptLearningEngine.ts`, and remove `getStatutoryTaxRuleCalendar()` in `statutoryVetoEngine.ts`.

