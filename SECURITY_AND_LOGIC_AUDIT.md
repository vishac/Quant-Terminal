# J.A.R.V.I.S. Quant Terminal — Code, Logic & Security Audit (Phase 1)

**Date:** 2026-06  ·  **Reviewer:** Emergent (E1)  ·  **Repo:** vishac/Quant-Terminal
**Scope:** Full review of logic, correctness, data integrity, and security + a staged remediation plan.

> **Headline finding:** In its reviewed form the terminal **cannot place real trades** and **does not use real-time data**. It is a demo / paper-trading + AI-commentary dashboard. It therefore **cannot responsibly trade real capital on the go-live date**. "Profits from day 1" is a goal to build toward safely (Phases 2–3), **not** something this build can guarantee or even execute. Phase 1 (this delivery) makes the app **truthful and safe** first.

---

## 1. Severity legend

| Rating | Meaning |
|---|---|
| 🔴 CRITICAL | Misleads a real-money decision, or exposes cost/service to abuse |
| 🟠 HIGH | Fabricated data presented as real; violates the app's own "ZERO DUMMY DATA" rule |
| 🟡 MEDIUM | Misleading label / inaccurate telemetry / weak hardening |
| 🟢 LOW | Cosmetic / tech-debt |

---

## 2. Findings & fixes

### A. Trading / execution

| # | Finding | Sev | Phase-1 Fix |
|---|---|---|---|
| A1 | **No broker connection at all.** `POST /api/broker/test-ping` returns hardcoded fake latencies/nodes (`CONNECTED`, `MUMBAI NSE // RACK-08`, `BOM-DC2-RACK08`). No login/auth, no order placement, no positions, no option chain. | 🔴 | Endpoint now returns an honest `NOT_CONNECTED` state (`connected:false`, no fake latency/node). Settings UI updated: broker statuses → "NOT CONNECTED", latency "—", header "0 OF 3 CONNECTED (DEMO)", and the "test ping" now reports not-connected instead of a fake handshake. |
| A2 | `sebiComplianceVerified: true` stamped unconditionally on every generated order. No compliance check exists. | 🔴 | Removed the unconditional `true`. Orders now carry `isSimulation:true` and `complianceChecked:false`; the field no longer asserts a verification that never happened. |
| A3 | F&O P&L approximated by a single hardcoded delta formula (`change * 0.12 * 75`); not a real options P&L. | 🟠 | Documented as a **simulation-only** heuristic and badged "SIMULATION". Real greeks/option P&L is a Phase 2 item (needs an option-chain feed). |

### B. Market data

| # | Finding | Sev | Phase-1 Fix |
|---|---|---|---|
| B1 | Quotes come from an **unofficial Yahoo Finance** endpoint, `interval=1d` (daily candles) — effectively delayed/EOD — but labelled "LIVE EXCHANGE TICK STREAM", "100% Real Feed", "NSE/BSE LIVE TICK", "DIRECT_HTTP_EXCHANGE_FEED". | 🔴 | Source relabelled truthfully: `YAHOO_DELAYED_UNOFFICIAL`, with `isDelayed:true`, `isOfficial:false`, and a `dataDisclaimer` field. UI badges changed to "DELAYED · UNOFFICIAL". |
| B2 | Change% math: original used only `interval=1d` which can mislabel prev-close. | 🟡 | Confirmed the fetch uses `range=2d&interval=1d` and takes the **true prior session close** vs latest close, so change/∆% is mathematically consistent. Kept + documented. |
| B3 | No intraday, options, or greeks data exists anywhere. | 🟠 | Noted; greeks shown as fixed strings are removed (see C3). Real feed = Phase 2. |
| B4 | "Packet saver" counter seeded at `1420` and auto-increments — presented as a real saved-packet metric. | 🟢 | Left functional but it is cosmetic telemetry, not market data. Flagged for Phase 2 cleanup. |

### C. Data integrity (violates the project's own "ZERO DUMMY DATA" mandate)

| # | Finding | Sev | Phase-1 Fix |
|---|---|---|---|
| C1 | **Fabricated news** in the macro fallback: invented Reuters/Bloomberg/ET/RBI headlines with made-up `impactScore`s, presented as "GROUNDED IN SEARCH · 0 HALLUCINATION". | 🔴 | **Entire fabricated baseline removed.** When the grounded AI call is unavailable/rate-limited, the API now returns `dataUnavailable:true` with **empty** `verifiedNews/macroVectors/twoSidedScenarios`. UI shows an explicit "LIVE MACRO INTELLIGENCE UNAVAILABLE" state — never invented news. |
| C2 | Hardcoded NIFTY/VIX fallbacks (`22421.95`, `14.46`, `22620.45`, `13.5`) injected when live data missing, then displayed as current levels. | 🟠 | All hardcoded index/VIX fallbacks removed from `server.ts` and `agentQuantEngine.ts`. Missing data now shows "—" / awaiting-data, never a fake number. |
| C3 | AI assistant **fallback** asserts specific unmeasured figures: `PCR 1.08`, `VIX 12.45`, "verified scores ≥ 88/100", option premiums, order-book sizes, and fixed greeks (`delta +12.4`, `theta +₹42,800/day`). | 🔴 | `geminiService.ts` and the server fallback rewritten: when the model is unavailable they now **decline to state figures** and return a single honest "AI unavailable — no verified figures" response. Fixed greeks removed (`keyGreeksImpact:null`, `confidenceScore:null`). |
| C4 | Fixed `confidenceScore: 95/96/98` and canned recommendations returned as if computed. | 🟠 | `confidenceScore` set to `null` when not measured; recommendation reduced to a generic, clearly-static risk reminder. |

### D. Security

| # | Finding | Sev | Phase-1 Fix |
|---|---|---|---|
| D1 | `/api/jarvis/analyze` and `/api/macro/intelligence` have **no authentication** — anyone with the URL can run up the Gemini bill / overload the service. | 🔴 | Both endpoints now require an **owner token** (`OWNER_ACCESS_TOKEN` env; sent as `x-owner-token` / `Authorization: Bearer`). Fails **closed** if the token isn't configured. Constant-time comparison. |
| D2 | No rate limiting on AI endpoints. | 🔴 | Added a simple in-memory per-IP limiter (default 20 req/min) on both AI endpoints → HTTP 429 when exceeded. |
| D3 | No input validation on `prompt`. | 🟡 | `prompt` must be a string ≤ 2000 chars; otherwise 400. |
| D4 | Hardcoded hosting URL baked into the server (`...run.app`) in the mobileconfig route. | 🟡 | Removed. Host now comes from `APP_URL` env or the request headers — no hardcoded host. |
| D5 | `Access-Control-Allow-Origin: *` on the manifest route. | 🟢 | Wildcard removed (served same-origin). |
| D6 | (Positive) Gemini API key is kept **server-side** and never exposed to the browser. | ✅ | Preserved. Owner token must likewise be kept secret and set via the Secrets panel, never committed. |

### E. Strategy substance

| # | Finding | Sev | Phase-1 Fix |
|---|---|---|---|
| E1 | The five "agents" (Chanakya/Bhishma/Arjuna/Kuber/Vidura) are well-written **rule descriptions** only. No backtesting, no historical data, no validated edge, no real signal generation. Strikes derive from spot; entries/premiums/P&L are heuristic placeholders. | 🟠 | Kept as an explicitly-badged **paper-trading simulation** (P&L derived only from the delayed live price, starting at zero). Real signals, a backtesting harness, and validated defined-risk strategies are **Phase 2**. |

---

## 3. What changed in Phase 1 (this delivery)

**Backend (`server.ts`)**
- Owner-token gate + per-IP rate limit + `prompt` validation on both AI endpoints (fail-closed).
- Removed hardcoded host; `APP_URL`/request-derived only.
- Honest market-data labels (`YAHOO_DELAYED_UNOFFICIAL`, `isDelayed`, `dataDisclaimer`).
- Broker ping → honest `NOT_CONNECTED`.
- Jarvis endpoint: real Gemini answer kept; fabricated greeks/confidence/PCR removed; honest "unavailable" path.
- Macro endpoint: fabricated news/levels baseline **deleted**; honest `dataUnavailable` empty state.
- `GET /api/owner/verify` added for the login gate.

**Frontend**
- `geminiService.ts`: honest, figure-free fallback.
- `agentQuantEngine.ts`: removed hardcoded spot/VIX fallbacks; dropped unconditional SEBI-verified stamp; orders badged simulation.
- Honest labels in `ViewerDashboard`, `Header`, `SettingsTerminal`, `InstitutionalEquityRadar`, `MacroThreatIntelligenceMatrix` ("DELAYED · UNOFFICIAL", "SIMULATION / PAPER", "NOT CONNECTED", "UNAVAILABLE").
- Owner login gate for Admin/Owner mode; token attached to AI calls.

**Config**
- `.env.example` documents `OWNER_ACCESS_TOKEN`.

---

## 4. Required configuration

Set these as **secrets** (never commit):

| Var | Purpose |
|---|---|
| `GEMINI_API_KEY` | Server-side Gemini calls (existing). |
| `OWNER_ACCESS_TOKEN` | Single-operator login/gate for AI endpoints (new). Use a long random string. |
| `APP_URL` | Public URL for the iOS web-clip profile (optional; falls back to request host). |

---

## 4b. Verification performed (this delivery)

- `tsc --noEmit` passes; `vite build` succeeds with no errors.
- Backend smoke-tested (server run locally):
  - `/api/market-data` returns `provider: YAHOO_DELAYED_UNOFFICIAL`, `isDelayed:true`, `isOfficial:false` + disclaimer. ✅
  - `/api/broker/test-ping` → `NOT_CONNECTED`, `connected:false`, `latency:null`. ✅
  - `/api/jarvis/analyze` & `/api/macro/intelligence` → **401** without a valid owner token; **200** with it. ✅
  - `/api/owner/verify` → 401 wrong token, 200 correct token. ✅
  - Jarvis (no Gemini key) → honest `available:false`, `keyGreeksImpact:null`, `confidenceScore:null` — **no invented figures**. ✅
  - Macro (no Gemini key) → `dataUnavailable:true`, empty `verifiedNews`/`macroVectors` — **no fabricated news**. ✅
  - Rate limiter → `429` after ~20 req/min. ✅
  - Non-string `prompt` → `400`. ✅

## 4c. How to run

1. `yarn install`
2. Set secrets: `GEMINI_API_KEY`, `OWNER_ACCESS_TOKEN` (long random string), optional `APP_URL`.
3. Dev: `yarn dev` (serves app + API on one port). Prod: `yarn build` then `yarn start`.
4. Open the app → toggle to **Owner/Admin** → enter the owner token in the gate to unlock AI desks. Viewer mode (delayed quotes) needs no token.

## 4d. Remaining honesty items (recommended next, not blocking Phase 1)

These are cosmetic/illustrative values still present in the admin UI; they are now **labelled** as placeholders/simulation but could be removed entirely in a follow-up:

- `SettingsTerminal` AI-diagnostics pods (e.g. `38% NEURAL LOAD`, `128 TPUv5e`, `14 ms DSP`, `99.4% VOICE CLARITY`) — now subtitled "illustrative placeholders, not live telemetry".
- `SettingsTerminal` broker cards still show masked placeholder API-key strings (now under a "no broker connected / no real credentials stored" disclaimer).
- Kuber (MCX) simulated order uses fixed illustrative numbers (no MCX feed exists) — badged SIMULATION; real MCX data is Phase 2.
- Large components (`QuantTerminal3D`, `AutonomousAgentsDesk`, `RiskEngineTerminal`, `GlobalSentiment`) contain decorative figures; the data-integrity-critical paths (quotes, AI answers, macro news, broker status, order P&L/compliance flags) have been corrected in this pass.

---

## 5. Roadmap (unchanged from approved plan)

- **Phase 1 — Review + Safety & Honesty (done here).** Truthful, secure, abuse-resistant paper-trading + analytics terminal. No real capital at risk.
- **Phase 2 — Real data + broker in sandbox.** Licensed real-time + option-chain feed, computed greeks, broker login/authorisation (Kite/Dhan) in paper mode behind a hard simulation switch, and a backtesting harness with 1–2 validated defined-risk strategies.
- **Phase 3 — Live capital, guarded.** Only after backtests + forward paper-trading pass review: kill-switch, hard position & daily-loss limits, SEBI margin checks, full audit logging, owner's broker credentials — on deliberately, not by default.

---

## 6. Important note on the go-live expectation

There is **no responsible path** to auto-trade real money with this build by Monday. Markets carry real risk of loss. The safe sequence is: Phase 1 honesty/security (now) → Phase 2 real data + sandbox broker + backtests → Phase 3 guarded live capital. Enabling live execution sooner is a decision only you can make, explicitly, against the risks catalogued above.
