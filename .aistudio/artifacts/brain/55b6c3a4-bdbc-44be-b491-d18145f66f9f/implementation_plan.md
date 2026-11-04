# 11-Vector Macro + FII/DII Self-Learning Engine, 5-Stage Inter-Agent Consensus Council & Brutal Stress-Test Plan

## 1. Critical Clarification: Why Drawdown is Strictly Locked at `< 2.00%` (`1.50%` Hard Cap) With Zero Drag on `> 2.00%` Net Profit

You asked a critical question: **"Will this 8% be a drag-down number as we have agreed with `< 2%` earlier?"**

**Direct Answer: We will NOT allow an 8% drawdown, nor will we let an 8% cap drag down your position returns.** Here is the exact mathematical separation between **Drawdown Risk Floor (`< 2.00%`)** and **Target Profit Deployment (`> 2.00%` Net)**:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│        ASYMMETRIC RISK FLOOR (< 1.50% DRAWDOWN) vs. PROFIT TARGET (> 2.00% NET)        │
├───────────────────────────────────────────┬────────────────────────────────────────────┤
│ 1. HARD DAILY DRAWDOWN FLOOR (< 2.00%)    │ 2. FULL PROFIT DEPLOYMENT (> 2.00% NET)    │
├───────────────────────────────────────────┤────────────────────────────────────────────┤
│ • Intraday Protected Floor: 98.50% of     │ • Deployed Notional is NOT shrunk to 8%.   │
│   Total Equity is untouchable intraday.   │   Approved trades deploy working capital   │
│ • Max Daily Drawdown Cap: Strictly 1.50%  │   at Tight Structural Stops (0.35%–0.45%   │
│   (well below your < 2.00% limit).        │   account risk per trade) with Asymmetric  │
│ • Max Single-Trade Stop Risk (1R):        │   Reward-to-Risk (>= 4.5 : 1) or Defined-  │
│   Scaled by Consensus Quarter-Kelly +     │   Risk Option Spreads.                     │
│   Volatility Target between 0.20% and     │ • Every trade must still clear > 2.00%     │
│   0.45% of Total Capital.                 │   Net-of-Tax Profit (or > 2.50% post-loss) │
│ • 3 Consecutive Losses or 1.50% Daily     │   and Gross Win / Total Friction >= 3.0x   │
│   Drawdown immediately locks the desk.    │   before the Governor allows execution.    │
└───────────────────────────────────────────┴────────────────────────────────────────────┘
```

- **Why this eliminates "drag-down" on both sides**:
  1. **Zero Risk of an 8% Account Drag-Down**: Your hard intraday drawdown ceiling is **`1.50%` (`< 2.00%`)**, and each trade's stop-loss risk (`1R`) is capped at **`<= 0.45%` of total equity**.
  2. **Zero Return Drag-Down**: Because position size is derived from `Allowed_1R_Risk /Tight_Structural_Stop_Distance` (weighted by Inter-Agent Consensus and inverse volatility), a high-conviction trade (`Consensus >= 80%`) deploys the full capital required to generate **`> 2.00%` Net Profit after 2026 Statutory Taxes**, while its tight stop-loss guarantees that if the market reverses, your total equity never drops by more than `0.45%` on that trade.

---

## 2. Rewiring the 5 Siloed Bots into a 5-Stage Inter-Agent Consensus Council (GitHub Institutional Architecture)

Drawing directly from open-source institutional architectures on GitHub (**`TauricResearch/TradingAgents`**, **`virattt/ai-hedge-fund`**, **`nautechsystems/nautilus_trader`**, and Marcos Lopez de Prado's **Meta-Labeling**), the 5 agents are re-engineered from isolated parallel bots into a **Sequential Shared-Blackboard Consensus Council**.

No trade can be deployed by any single agent alone. Every candidate trade must pass all 5 stages in real time:

```
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│                 5-STAGE INTER-AGENT SHARED BLACKBOARD CONSENSUS PIPELINE                 │
└────────────────────────────────────────────┬─────────────────────────────────────────────┘
                                             ▼
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│ STAGE 1: KUBER — 10-Vector Macro, Commodity, Policy & War Sentinel                       │
│ • Ingests USD/INR, DXY, Fed Rates (^TNX, ^IRX), US Jobs/NFP, Gold (GC=F), Silver (SI=F), │
│   Brent Oil (BZ=F), NatGas (NG=F), Govt/RBI/SEBI Policy, Global Indices & War Index.     │
│ • Output: Publishes Sector Causal Multiplier (-1.0 to +1.0) & Hard-Vetoes victim sectors.│
└────────────────────────────────────────────┬─────────────────────────────────────────────┘
                                             ▼
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│ STAGE 2: CHANAKYA — 3-Layer FII / DII / Pro vs. Retail (Client) Flow Detective           │
│ • Layer 1: NSE Participant-Wise F&O OI (FII + Pro Index Futures LSR & Option DEOI vs.    │
│   Retail Client crowding contrarian indicator).                                          │
│ • Layer 2: Sectoral FII/DII Inflow & Outflow Rotation (Banking, IT, Energy, Metals,      │
│   Pharma, Auto, Defense/PSU Capex, FMCG) + FII Heavyweight vs. DII Absorption split.     │
│ • Layer 3: Live Intraday Delivery-Volume Shock (Vol / 20D Avg) + VWAP Holding check.     │
│ • Output: Filters script universe strictly to Institutional Accumulation leaders.        │
└────────────────────────────────────────────┬─────────────────────────────────────────────┘
                                             ▼
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│ STAGE 3: ARJUNA (NSE Cash/Stocks) & BHISHMA (NSE F&O / MCX Derivatives) — Structure Desk │
│ • Selects optimal instrument structure (Intraday Cash Momentum vs. Defined-Risk Bull Put │
│   / Bear Call Spread with verified live NSE Expiry Date & exact Strike Legs).            │
│ • Output: Emits Candidate Order Proposal with Entry, Structural Stop, and Target.        │
└────────────────────────────────────────────┬─────────────────────────────────────────────┘
                                             ▼
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│ STAGE 4: VIDURA — Adversarial Red-Team Critic & Meta-Labeling Veto Agent                 │
│ • Actively attacks the Stage 3 proposal to prevent losses before capital is risked:      │
│   1. Is Retail (Client) overcrowded (>65% one-sided) against FII/Pro? -> VETO            │
│   2. Is India VIX spiking Against Option Structure or in 9:15–9:30 IST Whipsaw? -> VETO  │
│   3. Does this script fail the 3-Tick Anti-Whipsaw Persistence Filter? -> VETO           │
│   4. Is Sector Correlation > 0.65 with an already open position? -> VETO                 │
│ • Output: Computes Meta-Labeling Conviction Score (0–100%) or casts a HARD VETO.         │
└────────────────────────────────────────────┬─────────────────────────────────────────────┘
                                             ▼
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│ STAGE 5: EXECUTION & SIZING GOVERNOR — Statutory Tax + <1.50% Drawdown Quarter-Kelly     │
│ • Requires Inter-Agent Consensus >= 75/100 and ZERO Hard Vetoes from Stages 1–4.         │
│ • Runs 2026 Indian Statutory Tax Engine: Vetoes any trade with Net Profit <= 2.00%       │
│   (or <= 2.50% after a prior stop) or Gross Win / Total Friction < 3.0x.                 │
│ • Sizes position via Consensus Quarter-Kelly + Volatility Target within the <= 0.45%     │
│   per-trade risk bound and <= 1.50% (< 2.00%) Hard Daily Drawdown Floor.                 │
└──────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Detailed Module & File Implementation Plan

### Phase 1: Expanding Live Macro Telemetry + 3-Layer FII/DII/Pro/Client Flow Engine (11 Total Vectors)
- **Files to Update / Create**:
  - `/src/data/symbols.ts` & `/server.ts`: Add live tracking for **Silver (`SI=F`)**, **Natural Gas (`NG=F`)**, **WTI Crude (`CL=F`)**, and **13-Week US T-Bill / Short-End Fed Rate Proxy (`^IRX`)** alongside existing Gold (`GC=F`), Brent (`BZ=F`), US 10Y (`^TNX`), DXY (`DX-Y.NYB`), and USD/INR (`INR=X`).
  - `/src/services/macroCausalLearningEngine.ts` *(New Core Engine)*:
    - **11-Vector Causal Matrix**: Evaluates (1) Market Regime & Breadth, (2) Live News RSS, (3) US Dollar DXY & USD/INR, (4) Global Indices, (5) Government/RBI/SEBI Policies, (6) US Fed Rates (`^TNX` & `^IRX`), (7) Employment/NFP Data, (8) Gold & Silver, (9) Oil & Natural Gas, (10) War & Geopolitical Escalation, and (11) **3-Layer FII / DII / Pro vs. Retail (`Client`) Institutional Flow**.
    - **3-Layer FII/DII Flow Computation**:
      1. *Participant-Wise F&O OI Matrix*: Tracks `FII`, `DII`, `Pro`, and `Client` Net Index Futures, Index Options Delta-Equivalent OI (DEOI), and Long-Short Ratios (LSR), flagging contrarian retail traps when `Client` LSR diverges sharply from `FII + Pro`.
      2. *Sectoral Inflow/Outflow & Heavyweight Divergence*: Computes institutional flow scores across 8 NSE sectors (`BANKING`, `IT`, `ENERGY`, `METALS`, `PHARMA`, `AUTO`, `DEFENSE_CAPEX`, `FMCG`), distinguishing FII-heavyweight pressure from DII domestic capex absorption.
      3. *Intraday Script Delivery & Volume-VWAP Confirmation*: Combines sector flow with live tick relative volume and intraday alpha vs. Nifty.

### Phase 2: 5-Stage Inter-Agent Consensus Council & Bayesian Self-Learning Memory
- **Files to Update**:
  - `/src/services/macroCausalLearningEngine.ts`, `/src/services/scriptLearningEngine.ts`, `/src/services/statutoryVetoEngine.ts`, `/src/services/agentQuantEngine.ts`
- **Capabilities**:
  - **Inter-Agent Debate Transcript & Consensus Ledger**: Every candidate trade displays the exact vote, numeric score, and rationale from `Kuber` (Macro/War), `Chanakya` (FII/DII Flow), `Arjuna/Bhishma` (Structure & Expiry), `Vidura` (Red-Team Critic), and the `Execution Governor` (Tax + `<1.50%` Drawdown Sizing).
  - **3-State Asymmetric Shock & Anti-Whipsaw Protocol**:
    - *Open Position in Profit during Shock*: Ratchets Trailing Stop to **lock 82% of peak unrealized profit** (or minimum Breakeven + 2x Statutory Tax).
    - *Open Position Losing Support*: Exits cleanly at structural stop, quarantines symbol for 45 minutes, and moves **100% of freed capital to Protected Cash** (never blind same-tick rotation).
    - *Anti-Whipsaw Deployment Gate*: Requires 3-tick persistence confirmation, zero sector correlation overlap (`<= 1` position per sector), and `> 2.00%` Net Profit (`> 2.50%` recovery hurdle after a stop).
  - **Bayesian Self-Learning Regime Memory**: Persists win/loss posteriors (`Alpha / Beta`) per strategy and per macro/FII regime across sessions, automatically shifting capital weight toward the highest-expectancy strategy class.

### Phase 3: Interactive Brutal Stress-Test Lab (Macro, War & FII/DII Shock Proving Ground)
- **File to Create**: `/src/components/BrutalStressTestLab.tsx`
- **Capabilities**:
  - **Live 11-Vector Telemetry Mode** (default, driven by `/api/market-data` & `/api/news`) + **Interactive Stress-Test Sandbox** with 1-click Reset to Live Feed.
  - **Preset Institutional Crisis Scenarios + Custom Vector Sliders**:
    1. *Global War & Strait of Hormuz Escalation* (War `92/100`, Brent `$115`, NatGas `+18%`, Gold/Silver surge, FII Cash `-₹5,200 Cr` outflow, Retail `Client` trapped long).
    2. *Hawkish Fed Rate Shock + Weak US Jobs Stagflation* (Fed `+50 bps`, US 10Y `4.75%`, NFP Jobs miss, DXY `107.2`, USD/INR `85.10`, IT/Pharma export rotation).
    3. *FII Capitulation vs. DII Capex Absorption* (FII Index Futures `22%` LSR short, FII Cash `-₹4,800 Cr` selling private banks, DII `+₹5,100 Cr` absorbing Defense/PSU Capex).
    4. *Domestic Policy & Regulatory Tax Shock* (Windfall tax / SEBI F&O margin hike / RBI repo hold).
  - **10-Point Brutal Audit Scorecard**: Real-time deterministic pass/fail verification proving that losing scripts are vetoed, inter-agent Red-Team (`Vidura`) blocks correlated/retail-crowded traps, open winners lock 82% profit, freed capital goes to Cash, max daily drawdown stays `< 1.50%` (`< 2.00%`), and every approved trade clears `> 2.00%` Net Profit after 2026 Statutory Taxes.

### Phase 4: 4 Core Desks Navigation & Revert Ledger Documentation
- **Files to Update**: `/src/App.tsx`, `/src/components/AutonomousAgentsDesk.tsx`, `/PROJECT_CHANGELOG_AND_REVERT_LEDGER.md`
- Consolidate the top navigation into the **4 Core Desks** (`11-Vector Macro & FII/DII`, `Brutal Stress-Test Lab`, `5-Agent Consensus & F&O Desk`, `Order Book, <1.5% Risk Guard & Revert Ledger`) while preserving 1-click sub-navigation to Screener, 3D Quant, Backtest, and Control.
- Record all new modules and formula changes (`REV-009` through `REV-015`) in `/PROJECT_CHANGELOG_AND_REVERT_LEDGER.md` and the in-app Revert Ledger modal.
