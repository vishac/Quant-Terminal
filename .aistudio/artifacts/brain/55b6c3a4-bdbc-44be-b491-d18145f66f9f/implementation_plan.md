# Implementation Plan: Interactive Institutional Trade Setup & Tax/Risk Blueprint Modal

## 1. Root Cause Diagnosis
Currently, clicking **`Track Buy Setup`** or **`Track Short Setup`** inside the **Sector Rotation Matrix** (`SECTOR_ROTATION` view in `FirstPrinciplesMarketEngine.tsx`) calls `handleTrackStockSetup(...)`, which silently appends the stock to the `trackedPositions` array rendered at the top of the page. Because the button in `SECTOR_ROTATION` had no active state toggle, no toast notification, and did not open a setup blueprint or dispatch to the terminal's Session Order Book, clicking it appeared to do nothing.

---

## 2. Architectural Solution & User Flow

### A. Interactive Trade Setup & Tax/Risk Blueprint Modal (`FirstPrinciplesMarketEngine.tsx`)
Clicking **`Track Buy Setup`**, **`Track Short Setup`**, or **`View / Deploy Setup`** on any stock card across both **Overview & Actionable Stocks (`OVERVIEW_DECISIONS`)** and **Sector Rotation Matrix (`SECTOR_ROTATION`)** will immediately open an interactive **Institutional Trade Setup & Tax/Risk Blueprint Modal** anchored to live exchange ticks (`quotes[symbol]`).

Inside the modal, deterministic TypeScript engines will compute and display:

1. **Instrument Mode Selector (4 Execution Modes)**
   - **Cash Delivery (`NSE_CASH · CNC`)**: 1x margin, delivery investment sizing.
   - **Intraday Margin (`NSE_CASH · MIS 5x`)**: 20% intraday margin requirement with auto-square-off rules.
   - **NSE Equity Futures (`NSE_FNO · FUT`)**: Exchange-mandated lot size (from Security Master / lot table) with ~22% SPAN + Exposure margin.
   - **NSE ATM Option (`NSE_FNO · CE/PE`)**: Dynamic ATM strike (`BUY CE` for Rising setups, `BUY PE` for Falling setups), lot-sized premium outlay, and Delta/Theta profile.

2. **CPPI + Quarter-Kelly & 1% Risk Position Sizing**
   - **Capital Floor ($F = 92\%$ of Account Equity)**: Hard untouchable capital preservation floor.
   - **Risk Cushion ($C = \text{Total Equity} - F = 8\%$ of Equity)**: Active risk budget.
   - **Sizing Comparison**: Displays both **1% Risk-Per-Trade Quantity** ($\lfloor 0.01 \times \text{Equity} / |\text{Entry} - \text{SL}| \rfloor$) and **Quarter-Kelly ($0.25 \times f^*$) Cushion Allocation**, automatically respecting lot multiples for F&O modes.
   - **Price Levels**: Live Entry Price, **Target 1 ($1.5\text{R}$ Partial Lock)**, **Target 2 (Full Structural Target)**, **Hard Stop-Loss**, and exact **Reward-to-Risk ($R:R$) Ratio**.

3. **2026 Indian Statutory Tax & Friction Audit (Deterministic Pre-Trade Veto Check)**
   - Calculates exact round-trip statutory costs based on the selected instrument mode:
     - **Brokerage**: ₹20 flat per executed leg (₹40 round-trip).
     - **STT**: `0.10%` buy+sell for Cash CNC, `0.025%` sell for Cash MIS, `0.05%` sell for Equity Futures, `0.15%` sell on premium for Equity Options.
     - **Exchange + IPFT Turnover**: `0.00322%` Cash, `0.00183%` Futures, `0.03553%` Options.
     - **SEBI Turnover Fee**: ₹10 per Crore (`0.0001%`).
     - **Stamp Duty**: `0.015%` CNC buy, `0.003%` MIS/Options buy, `0.002%` Futures buy.
     - **GST**: `18%` on $(\text{Brokerage} + \text{Exchange Turnover} + \text{SEBI Fee})$.
   - **Statutory Veto Gate**:
     - Computes $\text{Gross Profit} / \text{Total Friction}$ (requires $\ge 3.0\times$) and **Net-of-Tax Expectancy in $R$** (requires $\ge 0.15\text{R}$).
     - Displays a clear **PASS (`STATUTORY CLEARANCE`)** or **VETO WARNING (`FRICTION VETO`)** badge.

4. **4-Pillar Causal Thesis & Live Trailing Stop-Loss (TSL) Toggle**
   - Displays the stock's **Global & Geopolitical Trigger**, **Margin & Institutional Flow Impact**, **Live News Catalyst**, and **4-Pillar alignment**.
   - Includes an interactive **Autonomous Trailing Stop-Loss (TSL) Activation Toggle** (`ARMED: Breakeven at +1R → Lock 50% at +1.5R` vs `FIXED STOP`).

---

### B. Dual Execution & Card State Synchronization
1. **Action 1 — Track in ROI Decision Ledger**:
   - Saves/updates the setup in `trackedPositions` (`jarvis_fp_tracked_positions_v1`), starts live tick-by-tick P&L & Target/SL monitoring, and feeds the 5-Agent Bayesian self-learning loop.
2. **Action 2 — 1-Click Deploy to Live Session Order Book**:
   - Creates a verified `PaperTradeOrder` via `persistPaperTrades(...)` (`src/services/paperTradeService.ts`) and dispatches `jarvis:orders-updated` so the trade immediately appears in the **OMS / Trade History** tab and **5-Agent Desk** summary bar, while also tracking it in the ROI Ledger.
3. **Visual Feedback on Every Stock Card**:
   - Both `OVERVIEW_DECISIONS` and `SECTOR_ROTATION` stock cards will dynamically show whether a stock is currently **Tracked in ROI Ledger** or **Deployed to Order Book**, with instant badge indicators (`✓ Tracked · Open Setup`, `⚡ Deployed · View Order`) and a confirmation toast banner.

---

## 3. Files to Modify
- **`/src/services/firstPrinciplesEngine.ts`**:
  - Add a deterministic helper `computeInstitutionalStockSetupBlueprint(...)` that calculates Cash CNC, Intraday MIS, Equity Futures, and ATM Option lot sizes, CPPI 92% floor / 8% cushion, Quarter-Kelly & 1% Risk quantities, Target 1 ($1.5\text{R}$) / Target 2, and the full 2026 Indian Statutory Tax & Friction breakdown with Veto validation.
- **`/src/components/FirstPrinciplesMarketEngine.tsx`**:
  - Wire all `Track Buy Setup` and `Track Short Setup` buttons across `OVERVIEW_DECISIONS` and `SECTOR_ROTATION` to open the new **Institutional Trade Setup & Tax/Risk Blueprint Modal**.
  - Update the `SECTOR_ROTATION` stock card buttons so they reflect live tracked/deployed status (`isTracked`, `isDeployed`) and allow 1-click re-opening of the setup modal.
  - Connect **1-Click Deploy to Live Session Order Book** to `getStoredPaperTrades()` / `persistPaperTrades()` so deployed stock setups immediately sync across the entire terminal.
