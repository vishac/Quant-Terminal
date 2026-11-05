# J.A.R.V.I.S. Institutional Quant Terminal — User Guide, Strengths & Structural Limitations

> **Auto-Updated Operational Manual (`REV-017`)**  
> **Workflow Architecture**: `1. Market Finder` → `2. Stress Lab` → `3. AI Council` → `4. Order Book`

---

## 1. Plain-English 4-Core Operational Workflow

### Core 1: `1. Market Finder` *(Screener, 52W-Low Bottoms, Bear Puts & Elections)*
- **Sub-Tab `01. Live Breakout & Factor Screener`**:
  - Scans real-time NSE Nifty 50 / Next 50 equities, NIFTY/BANKNIFTY indices, and MCX Crude Oil across a 10-Factor Institutional Rubric (`0–100` score).
  - Click **"Council Deploy"** on any equity row to run the setup directly through the 5-Agent AI Council (`>2.00%` Net-of-Tax Profit + `<=1.50%` Max Drawdown Veto Gate) and dispatch it to **`4. Order Book`**.
- **Sub-Tab `02. 52W-Low Bottom Accumulation, Bear Put (T1/T2/T3) & Elections (India + US)`**:
  - **Dual-Mode 52W-Low Bottom Accumulation & Bear-Market Put (`PE`) Scanner**:
    - **Mode A (`52W-Low Bottom Accumulation Long`)**: Identifies high-potential NSE equities trading near their 52-week low / cycle bottom with institutional delivery absorption, positive free-cash-flow/order-book visibility, and asymmetric upside (`T1` Initial Breakout, `T2` Mean-Reversion Value Zone, `T3` Full Cycle Expansion).
    - **Mode B (`Bear-Market Put PE F&O`)**: Identifies bearish Put (`PE`) F&O setups (including Index NIFTY Put hedges and weak/headwind equity Puts) to profit when the market or individual script is breaking down, complete with `T1`, `T2`, and `T3` option premium targets.
    - **Non-Erosion Step-Ratchet Exit Plan**: Every setup enforces a 4-stage capital & profit protection protocol:
      1. **Initial Hard Stop**: Strictly capped (`-2.5%` spot for Cash Bottom Longs; `-18%` premium for Bear Put F&O).
      2. **At `T1` Hit**: Book `33%` partial profit and ratchet Stop-Loss to `Cost + Statutory Friction` (Zero Capital Erosion).
      3. **At `T2` Hit**: Book another `33%` profit and lock Stop-Loss unconditionally at `T1` (`100%` of `T1` gain protected).
      4. **At `T3` Runner**: Trail final `34%` position with a `1.5x ATR` / `15-min VWAP` ratchet.
  - **Full-Cycle India Lok Sabha / State Assembly + US Primary / Mid-Term / Presidential Election Engine (Vector #12)**:
    - Select both the **India Election Stance** (`Live Continuity Tracking`, `Lok Sabha Policy Continuity & Capex`, `Model Code of Conduct Pre-Poll Pause`, or `Coalition / Populist Shift`) and the **US Election Stance** (`Live Dynamic Tracking`, `US Primary Campaign Rhetoric & Healthcare/Tariff Noise`, `Divided Congress Gridlock`, `Tariff Hawk Sweep`, or `Fiscal Stimulus Sweep`) to see real-time sector institutional flows and script tailwinds/headwinds.

---

### Core 2: `2. Stress Lab` *(War, India/US Elections & 10-Point Audit)*
- Tests every active and candidate strategy against extreme macro shocks before risking capital:
  - **Preset 1**: `Baseline Live Market`
  - **Preset 2**: `Lok Sabha + US Primary Shock` *(India MCC Pre-Poll Capex Pause + US Primary Rhetoric Volatility)*
  - **Preset 3**: `Hormuz Blockade + US Tariff Sweep` *(Brent Crude `$112/bbl`, `USD/INR 84.85`, `INDIA VIX 23.5`)*
  - **Preset 4**: `Full Sovereign Tail-Risk Crisis` *(Geopolitical escalation + Coalition/Populist shift + Tariff Hawk Sweep + RBI +50 bps hike)*
- Displays the **10-Point Brutal Reality Audit** and verifies that portfolio drawdown remains strictly `<= 1.50%` (`< 2.00%` hard mandate) even under tail-risk shocks.

---

### Core 3: `3. AI Council` *(5-Agent Consensus Debate & NSE Option Chain)*
- **Sub-Tab `01. 5-Agent Consensus Debate & Statutory Veto`**:
  - Every trade must pass 5 deterministic institutional agents before reaching the Order Book:
    1. **Agent 1 (Macro & Geopolitical Vet)**: Checks 12 macro vectors + India Lok Sabha & US Primary/Mid-Term election alignment.
    2. **Agent 2 (Bottom-Up Fundamental & 52W-Low Accumulation Auditor)**: Verifies institutional delivery & earnings quality.
    3. **Agent 3 (Derivatives & Volatility Surface Architect)**: Validates option IV skew, Delta/Theta ratio, and strike liquidity.
    4. **Agent 4 (Statutory Tax, SEBI & Brokerage Auditor)**: Computes exact round-trip Indian statutory friction using the active **T-1 Approved Tax Version** (`STT/CTT`, `NSE/MCX Exchange Fees`, `SEBI Turnover`, `Stamp Duty`, `18% GST`, and flat brokerage) and vetoes any trade with `< 2.00%` Net Return or `Gross Win / Friction < 3.0x`.
    5. **Agent 5 (CPPI & Fractional Quarter-Kelly Risk Governor)**: Enforces the `92%` untouchable capital floor (`<= 1.50%` intraday drawdown lock) and sizes positions strictly from the `8%` risk cushion.
- **Sub-Tab `02. Live NSE Option Chain & Greek Surface`**:
  - Real-time Black-76 option pricing, implied volatility skew, and PCR telemetry. Any manual option or sector setup tracked from here is also routed through the 5-Agent Veto Gate.

---

### Core 4: `4. Order Book` *(Live Trades, `<1.5%` DD Guard, T-1 Tax & Brokerage Calendar, User Guide & Revert Ledger)*
- **T-1 Pre-Market Statutory Tax, SEBI & Brokerage Alert Banner**:
  - Automatically surfaces any statutory tax, SEBI turnover, exchange tariff, or brokerage rule scheduled for **Tomorrow (`T-1 Day` before Go-Live)** so you can manually **Approve** or **Defer** it before the `09:15 IST` market open.
- **Sub-Tabs**:
  - **`01. Active & Closed Orders`**: Full execution blotter showing `T1 / T2 / T3` targets, Non-Erosion Rule badges, and the exact **Tax Rule Version Stamp** (`Before` vs `After` statutory calculation) on every order.
  - **`02. Script Win/Loss Matrix`**: Historical per-symbol win/loss telemetry, Kelly multiplier adjustments, and setup post-mortems.
  - **`03. Risk & Bot Circuit Breaker`**: Live emergency controls (`Global Kill Switch`, `Expel All OTM Options`, `Pause/Resume Strangle Bot`, `100% Cash Hedge`) wired directly to the canonical Order Book (`jarvis_paper_trade_orders_v1`).
  - **`04. Architecture Revert Ledger`**: Complete `REV-001` through `REV-017` audit trail with 1-click JSON snapshot export.
  - **`05. T-1 Tax & Brokerage Calendar`**: Side-by-side comparison of Active (`Before`), T-1 Staged (`Pending Manual Approval`), and Approved/Archived (`After`) statutory tax rates, plus an Order-Level Before/After Audit Table.
  - **`06. User Guide & Strengths/Weaknesses`**: Live in-app operational guide and brutal honesty disclosure.

---

## 2. Brutal Strengths (What This Terminal Excels At)

1. **100% Deterministic Quantitative Math (Zero LLM Hallucination on Numbers)**:
   - Entry prices, Stop-Losses, `T1 / T2 / T3` targets, Black-76 Option Greeks, CPPI cushions, Quarter-Kelly position sizes, and Indian statutory taxes are calculated exclusively by deterministic TypeScript modules—never guessed by generative text.
2. **Pre-Trade Indian Statutory Tax & Friction Veto (`>2.00%` Net Mandate)**:
   - Automatically blocks low-expectancy trades where STT/CTT, exchange fees, SEBI charges, stamp duty, 18% GST, and brokerage erode net alpha below `+2.00%` net-of-tax return or `3.0x` Gross-to-Friction ratio.
3. **Calendarized T-1 Pre-Market Statutory Rule Governance + Before/After Ledger**:
   - Never misses a Finance Act STT hike, NSE/MCX exchange tariff revision, or brokerage update. Stages rules at `T-1 Day` for manual user approval before `09:15 IST` and permanently stamps `taxRuleVersionId` onto every order so historical trades keep their exact **Before** tax calculation while post-go-live trades use the **After** rate.
4. **Dual-Market Profit Capability (Bull Accumulation + Bear Crash Put F&O)**:
   - Combines **Mode A (52W-Low Institutional Bottom Accumulation)** for deep-value turnarounds with **Mode B (Bear-Market Put `PE` F&O)** so the portfolio can generate structured alpha even during market selloffs, enforced by a 4-stage **Non-Erosion Step-Ratchet Exit Plan**.
5. **Dual-Sovereign Election Radar (India Lok Sabha/State + US Primary/Mid-Term/General)**:
   - Explicitly cross-multiplies domestic Indian political/capex cycles (Lok Sabha continuity, Model Code of Conduct pre-poll pauses, coalition/rural shifts) with US primary rhetoric, mid-term congressional gridlock, and tariff sweeps.
6. **Hard `<1.50%` Intraday Drawdown Lock**:
   - Protects `98.50%` of capital intraday (`92.00%` hard CPPI floor) and automatically halts new order creation if daily net drawdown reaches `-1.50%` or `3` consecutive losses occur.

---

## 3. Structural Weaknesses & Honest Limitations (What You Must Watch Out For)

1. **Paper-Trading OMS vs. Live Exchange Order-Book Slippage**:
   - Unless connected to a live broker execution webhook (e.g., Zerodha Kite Connect / Upstox / Interactive Brokers FIX API) with live margin collateral, fills in `4. Order Book` execute at top-of-book spot/theoretical Black-76 option prices. In live illiquid mid-cap options, bid-ask spread and market-impact slippage during flash crashes can exceed theoretical friction by `0.15%–0.45%`.
2. **Public Yahoo Finance / WebSocket Poll Latency (`~1.5s–3.0s`) vs. Colocated NSE TBT**:
   - The live `/api/market-data` proxy streams real market quotes without API keys, which carries `1.5s–3.0s` latency compared to colocated NSE Tick-by-Tick (TBT) fiber feeds. Therefore, this terminal is architected for **Intraday Swing, 52W-Low Accumulation, and Multi-Hour/Multi-Day F&O Directional/Strangle Setups**—NOT sub-millisecond high-frequency scalping.
3. **Overnight Gap Risk Beyond Intraday Stop-Loss Ratchets**:
   - The Non-Erosion Step-Ratchet (`Cost -> T1 -> T2`) and `<1.50%` Drawdown Circuit Breaker operate continuously during market hours. However, an overnight sovereign shock (e.g., surprise weekend war escalation or emergency election result gap at `09:15 IST` open) can gap cash equities past an intraday stop-loss. Only **Mode B Long Put (`PE`) F&O** setups have mathematically capped maximum loss equal to the option premium paid.
4. **T-1 Tax Radar Requires Human Sign-Off Before `09:15 IST`**:
   - By design, the T-1 Statutory Tax & Brokerage Calendar never silently mutates tax math without your approval. If a regulatory circular is staged at `T-1` and you do not click **Approve** before `09:15 IST` on Go-Live day, the OMS continues using the prior active tax version until approved.
