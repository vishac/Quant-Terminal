# J.A.R.V.I.S. Institutional Quant Terminal — Change & Revert Ledger

This document records every surgical UI/module pruning action, static data removal, and quantitative strategy/veto formula upgrade so any change can be audited or reverted cleanly.

---

## 1. Core Quantitative Rules Enforced (`04-Nov-2026`)

1. **Strict Cost-of-Trading & 3.0x Friction Veto Gate**:
   - Every candidate trade across `NSE F&O`, `NSE Cash`, `BSE Cash`, and `MCX` calculates round-trip **2026 Indian Statutory Taxes + Brokerage** (`src/services/statutoryVetoEngine.ts`):
     - **Brokerage**: `₹20` flat per executed order (`₹40` round-trip per single-leg order; `₹80` round-trip for 2-leg defined-risk option spreads).
     - **NSE F&O Options**: STT `0.15%` (sell on premium), Exchange+IPFT `0.03553%`, SEBI `₹10/Cr`, Stamp Duty `0.003%` (buy on premium), GST `18%` on `(Brokerage + Exchange + SEBI)`.
     - **NSE/BSE Cash**: STT `0.025%` (sell), Exchange+IPFT `0.00307%` (NSE) / `0.00375%` (BSE), SEBI `₹10/Cr`, Stamp Duty `0.003%` (buy), GST `18%`.
     - **MCX Futures**: CTT `0.01%` (sell), Exchange `0.0026%`, SEBI `₹10/Cr`, Stamp Duty `0.002%` (buy), GST `18%`.
   - **Hard Veto Condition**:
     - If `Total Friction INR >= Target Gross Profit INR` OR `Gross Profit / Total Friction < 3.0x`, the trade is **VETOED** immediately.
2. **Strict `> 2.0%` Net-of-Tax Profit Requirement**:
   - `Net Profit % = ((Target Gross Profit INR - Total Friction INR) / Capital or Margin Deployed INR) × 100`.
   - Any trade projecting `<= 2.00%` Net Profit is **VETOED** immediately.
3. **Confirmed Scripts Only (Zero Duplicate Stacking, Zero Losing Script Lock-In)**:
   - `Scan & Deploy (All Desks)` only deploys confirmed leaders (`!isQuarantined`, `isEligibleForDeploy`, `learnedScore >= 68`, not already `OPEN`).
   - If fewer scripts (or zero scripts) qualify on a given scan, only the confirmed `> 2.0%` net setups are deployed, and all skipped desks are logged in the **Live Scan & Veto Audit Strip**.

---

## 2. Granular Change & Revert Ledger (`REV-001` – `REV-008`)

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

