# J.A.R.V.I.S. Institutional Quant Terminal — User Guide, Strengths & Structural Limitations

> **Auto-Updated Operational Manual (`REV-019` — Post-Audit Remediated Edition)**  
> **Workflow Architecture**: `1. Market Finder` → `2. Stress Lab` → `3. AI Council` → `4. Order Book`

---

## 1. Plain-English 4-Core Operational Workflow

### Core 1: `1. Market Finder` *(Screener, 52W-Low Bottoms, Bear Puts & Elections)*
- **Sub-Tab `01. Live Breakout & Factor Screener`**:
  - Scans NSE Nifty 50 / Next 50 equities, NIFTY/BANKNIFTY indices, and MCX Crude Oil across a 5-Factor rubric (`0–100` score).
  - **Note on Factor Weights & Thresholds**: The `0.20 / 0.25 / 0.25 / 0.15 / 0.15` pillar weights and `88/100` qualification cutoff are **configurable heuristic priors (hypotheses)**, not universal constants of nature. Operators should validate symbol-level edge via `2. Stress Lab -> Backtest` or `npm run data:sync` before deploying capital.
- **Sub-Tab `02. 52W-Low Bottom Accumulation, Bear Put (T1/T2/T3) & Elections (India + US)`**:
  - **Mutually-Exclusive Regime & Relative-Strength Arbiter (`Mode A` vs. `Mode B`)**:
    - A single stock can **never** appear in both Mode A and Mode B simultaneously.
    - **Mode A (`52W-Low Bottom Accumulation Long`)**: Selected **only** when the sector is not under a hard macro outflow veto, the stock sits in the 52-week value zone (`<=14.5%` above 52W Low or `>=14%` below 52W High), **AND** it exhibits positive institutional delivery absorption (`deliveryRatio >= 1.25`) with relative strength holding above `min(-0.15%, NIFTY change %)`.
    - **Mode B (`Bear-Market Put PE F&O`)**: Mutually exclusive (`else if`); selected **only** when Mode A is false and the script is actively breaking down (`changePct <= -0.25%` or in a hard-vetoed outflow sector).

---

### Core 2: `2. Stress Lab` *(War, India/US Elections, Backtest & 10-Point Audit)*
- **Scenario Stress Sandbox & 12-Vector Telemetry**:
  - In `LIVE_EXCHANGE_FEED` mode, the 12 vectors are driven continuously by live market quotes (`^INDIAVIX`, `INR=X`, `DX-Y.NYB`, `BZ=F`, `GC=F`, `SI=F`, `NG=F`, `^TNX`, `^IRX`, `^GSPC`, `^NSEI`). When you switch the dropdowns to a crisis or election preset, the engine enters `STRESS_TEST_SANDBOX` mode to simulate how open positions and sector weights react to that shock.
- **Remediated Historical Backtester (`src/server/backtester.ts`)**:
  - Executes entries at **Next-Bar Open + 5 bps slippage**.
  - Evaluates stops against **intraday Lows (`candle.low`)** with **Gap-Through-Stop fills at the Open (`Math.min(open, stopLoss)`)** whenever a bar opens below the stop.
  - Enforces **monotonic High-Water-Mark ATR trailing stops** across trend/swing strategies.
  - Deducts full **Indian Cash-Delivery round-trip statutory costs (`~0.222%` STT, Stamp Duty, Exchange, SEBI, GST) + `10 bps` round-trip slippage**.
  - Excludes unrealized open positions from Win Rate, Profit Factor, Expectancy, and Student's *t*-statistics.
  - Computes Sharpe and Sortino by subtracting the `6.50%` annualized RBI G-Sec risk-free rate (`rf = 0.065 / 252`), and feeds the **per-period (daily) Sharpe** and daily skewness/kurtosis into the López de Prado Probabilistic Sharpe Ratio (`PSR`).

---

### Core 3: `3. AI Council` *(5-Agent Consensus Debate & NSE Option Chain)*
- **Rule-Based 5-Stage Consensus Gate**:
  - Sequentially evaluates macro/commodity alignment, participant flow, contract structure, sector concentration, and CPPI / Quarter-Kelly sizing.
- **Hard Lot-Sizing Risk Cap (`src/services/positionSizer.ts`)**:
  - Never forces `1 lot` when a single lot's stop-loss risk exceeds your `maxRiskInr` cap (`effectiveRiskPct <= riskPct`) or `maxOrderNotionalInr` cap. If 1 lot exceeds the risk budget, the order is cleanly rejected (`isValid: false, lots: 0`).

---

### Core 4: `4. Order Book` *(Live Trades, `<1.5%` Intraday DD Guard, T-1 Tax Calendar & Revert Ledger)*
- **Synchronized `1.50%` Daily Intraday Loss Limit (`src/server/riskEngine.ts`)**:
  - Both the frontend risk guard and backend `riskEngine.ts` enforce `maxDailyLossInr = 15,000` (`1.50%` of `₹10,00,000` reference capital) before tripping the intraday kill-switch.
- **T-1 Pre-Market Statutory Tax & Brokerage Calendar**:
  - Stages upcoming statutory tax or brokerage rule changes `T-1 Day` before Go-Live for manual operator sign-off and stamps `taxRuleVersionId` onto orders for auditable Before/After accounting.

---

## 2. Reconciled Feed, Drawdown & Regulatory Disclosures (Zero Contradictions)

1. **Market Data Feed Hierarchy (Upstox Primary When Paired vs. Yahoo Finance Fallback When Unpaired)**:
   - **When `UPSTOX_ACCESS_TOKEN` is paired** (via `.env` or Control Tower -> Broker Gateway), the server streams live NSE/BSE market quotes (`UPSTOX_ANALYTICS_REALTIME`).
   - **When `UPSTOX_ACCESS_TOKEN` is unpaired**, the server automatically falls back to delayed, unofficial Yahoo Finance daily/intraday candles (`YAHOO_DELAYED_UNOFFICIAL`, `~1.5s–3.0s` poll latency and exchange delay).
   - **Local Automated CLI Sync (`npm run data:sync`)**: Runs `scripts/sync-data.ts` using native Node.js `fetch` to pull historical daily candles, execute out-of-sample backtests across the core NSE universe, and write validated metrics to `.data/latest_walkforward_sync.json`.
2. **Intraday Drawdown Cap (`<= 1.50%`) vs. Overnight Gap Risk**:
   - The `<= 1.50%` daily drawdown cap is an **intraday circuit-breaker and per-trade stop-sizing rule** enforced during active exchange hours.
   - **Overnight Gap Disclosure**: Cash equities and futures held overnight can gap past an intraday stop-loss at the `09:15 IST` market open during sovereign or earnings shocks (which `backtester.ts` explicitly models via **gap-through-stop fills at the Open**). Only defined-risk long option (`PE` / `CE`) setups have mathematically capped overnight loss equal to the option premium paid.
3. **SEBI Regulatory & Paper-Trading Compliance**:
   - This workstation is a **single-operator quantitative research and paper-trading terminal**. It does not provide public investment advice (SEBI IA/RA regulations) or automated multi-client broker execution. Consult a SEBI-registered advisor or exchange compliance officer before connecting live broker execution APIs.
