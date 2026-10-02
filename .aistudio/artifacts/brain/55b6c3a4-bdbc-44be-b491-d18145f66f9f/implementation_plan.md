# Institutional Macro Threat Matrix & Grounded AI Intelligence Architecture

## 1. Problem Statement & Strategic Shift
- **Current Bottleneck**: The 3D geodesic wireframe canvas in `RiskEngineTerminal.tsx` renders an animated particle sphere. While visually technical, it does not assist traders, treasury desks, or risk managers in evaluating genuine market tail-risks or executing tactical hedges.
- **Core Directive**: Replace decorative 3D particle rendering with an **Institutional Global Macro Threat & News Impact Matrix**, backed by a real-time server-side intelligence pipeline that ingests global macroeconomic trends, central bank policies, and breaking market headlines via Google Search Grounding with zero hallucination, bias, or unverified claims.

---

## 2. Core Architecture & Grounded Intelligence Pipeline

```
┌────────────────────────────────────────────────────────────────────────┐
│                        BACKEND SERVER (server.ts)                       │
│                                                                        │
│  [POST /api/macro/intelligence]                                        │
│         │                                                              │
│         ▼                                                              │
│  Google Gen AI SDK (@google/genai)                                     │
│  Model: gemini-3.8-flash                                               │
│  Tools: [{ googleSearch: {} }] (Search Grounding Enabled)              │
│  System Directive:                                                     │
│    • Zero subjective opinion, emotional language, or directional bias │
│    • Extract verified facts, exact numbers, and direct source URLs     │
│    • Produce two-sided probabilistic scenarios with exact risk buffers │
│         │                                                              │
│         ▼                                                              │
│  Structured JSON Response:                                             │
│    - Global Threat Index (0–100)                                       │
│    - 5 Macro Vectors (Crude, US 10Y, DXY, Geopolitical, Policy)        │
│    - Grounded News Items with Domain Citations & Verification Badges   │
│    - Two-Sided Market Scenarios (Base, Bull, Stress Corridor)          │
│    - Mathematical Portfolio Hedging Action Bounds                     │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTP / Cache / Live Polling
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   FRONTEND UI (RiskEngineTerminal.tsx)                 │
│                                                                        │
│  [Live Global Macro Threat & Grounded Intelligence Matrix]             │
│  • Global Threat Barometer & Volatility Regime                         │
│  • Macro Vector Grid with Live Spot & Impact Corridors                 │
│  • Grounded Intelligence Feed with Source Badges & Direct Links        │
│  • Two-Sided Probabilistic Scenario Corridors (Base / Bull / Stress)   │
│  • 1-Click Actionable Hedging Bounds (Put Spread / Delta Neutralize)   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Strict Backend Anti-Hallucination & Neutrality Framework

### A. Server API Route (`server.ts`)
Implement `/api/macro/intelligence` using `@google/genai` TypeScript SDK:
- **Model**: `gemini-3.8-flash` (fast, factual, search-grounded).
- **Tooling**: `{ googleSearch: {} }` to ground every response in real-time verified headlines (Reuters, Bloomberg, NSE, RBI, Federal Reserve, Financial Times).
- **Backend Instructions (Prompt Engineering)**:
  - *"You are an institutional risk intelligence engine for Indian and global financial markets. You must strictly avoid any emotional speculation, sensationalism, or single-sided bias. All statements must cite verifiable numbers (e.g. Brent Crude $/bbl, US 10-Yr yield %, DXY index level, FII cash net flow ₹ Cr). For every macro event, provide a factual two-sided scenario: both the upside continuation probability and the tail-risk downside drawdown corridor with exact mathematical hedging levels."*
- **Caching**: 5-minute in-memory cache to prevent quota thrashing while preserving real-time intraday freshness.

### B. Two-Sided Probabilistic Output Schema
```ts
export interface MacroThreatItem {
  id: string;
  category: 'ENERGY' | 'RATES' | 'CURRENCY' | 'GEOPOLITICAL' | 'POLICY';
  headline: string;
  sourceTitle: string;
  sourceUrl: string;
  publishedTime: string;
  impactScore: number; // -100 (severe headwind) to +100 (tailwind)
  affectedInstruments: string[]; // e.g., ["NIFTY 50", "BANK NIFTY", "OIL & GAS"]
  factSummary: string;
}

export interface TwoSidedScenario {
  regime: 'BASE_EQUILIBRIUM' | 'BULL_EXPANSION' | 'STRESS_DRAWDOWN';
  probabilityPct: number;
  triggerCondition: string;
  niftyTargetRange: [number, number];
  hedgingAction: string;
  hedgeInstrument: string;
}
```

---

## 4. UI/UX Design & High-Density Presentation

Replace the entire Three.js canvas pod in `RiskEngineTerminal.tsx` with:

### Component: `MacroThreatIntelligenceMatrix.tsx`
1. **Threat Barometer Ribbon**:
   - Institutional Threat Score (e.g., `42/100 · ELEVATED RISK BUFFER REQUIRED`).
   - Live Macro Tickers: Brent Crude (`$84.20/bbl`), US 10Y (`4.28%`), DXY (`104.15`), India VIX (`14.46`).
   - Refresh Status & Verification Stamp (`Grounded in Google Search · 0 Hallucination Verified`).

2. **Grounded Global News & Direct Impact Stream**:
   - Scannable card rows displaying verified headlines, publishing timestamps, and external publisher citations.
   - Impact classification chips with factual causality (e.g., *Brent spike > $85 increases OMCs subsidy risk & Indian inflation expectation by +12 bps*).

3. **Two-Sided Probabilistic Scenario Corridors**:
   - **Base Scenario (55% PoP)**: Nifty Rangebound in 22,350–22,650 corridor; theta decay favored.
   - **Bull Scenario (25% PoP)**: FII buying resumption pushes past 22,700; trailing call ratio suggested.
   - **Stress Scenario (20% PoP)**: Crude > $88 / Geopolitical escalation triggers break below 22,250; protective put spreads activated.

4. **1-Click Pre-Trade Hedging Execution**:
   - Direct buttons to stage hedging legs into the connected DMA order queue with real-time margin check.

---

## 5. Verification & Quality Gates
1. **Build & Type Safety**: `tsc --noEmit` and `npm run build` with zero errors.
2. **Endpoint Testing**: Verify `/api/macro/intelligence` returns grounded search metadata with URLs and balanced scenarios.
3. **No Canvas Clutter**: Clean removal of Three.js runtime loop in the risk engine, freeing memory and CPU.
4. **Transparency & Zero Bias**: Inspect generated summaries to confirm absence of hallucinated data or emotional bias.
