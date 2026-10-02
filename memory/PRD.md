# PRD — J.A.R.V.I.S. Quant Terminal (Review + Remediation)

## Original problem statement
Owner of GitHub repo `vishac/Quant-Terminal` asked for an expert review of logic, code, security and all elements, with a plan before changes, using as few credits as possible. Stated goal: "earn profits from day 1 (Mon 5 Oct)."

## Reality / architecture note
- The repo is a **Vite + TypeScript + React + Express/Node** single-server app (its home is Google AI Studio / Cloud Run). It is **not** the Emergent CRA+FastAPI+Mongo stack, and the Emergent supervisor (read-only, Python/uvicorn + CRA `yarn start`) **cannot host it** — so there is no Emergent preview URL. A rewrite was explicitly out of scope per the approved plan and would waste credits.
- Work was done directly on the real codebase at `/app/quant-terminal` (clone of the repo), ready to pull into the owner's deployment.

## Approved plan = Phase 1: Review + Safety & Honesty (no real-money execution)
Delivered:
1. **Audit report** — `/app/quant-terminal/SECURITY_AND_LOGIC_AUDIT.md` (findings by severity + fixes + verification + roadmap).
2. **Security hardening** (`server.ts`): owner-token gate (fail-closed) + per-IP rate limit (20/min) + `prompt` validation on `/api/jarvis/analyze` & `/api/macro/intelligence`; removed hardcoded host; new `/api/owner/verify`.
3. **Honesty pass**: deleted fabricated macro news/levels (→ honest `dataUnavailable` empty state); broker ping → `NOT_CONNECTED`; removed invented greeks/PCR/VIX/confidence in AI fallback (`geminiService.ts`, server); dropped unconditional `sebiComplianceVerified:true` (→ `false` + `isSimulation:true`); removed hardcoded spot/VIX fallbacks.
4. **Data labelling**: `YAHOO_DELAYED_UNOFFICIAL` + disclaimer; UI relabelled "DELAYED · UNOFFICIAL" / "SIMULATION / PAPER" / "NOT CONNECTED" across Viewer, Header, Settings, Equity Radar, Macro, Voice HUD.
5. **Owner login gate** (`OwnerGate.tsx` + `App.tsx`): Admin/Owner desk requires the owner token; token attached to AI calls.

## Verification
`tsc --noEmit` ✅ · `vite build` ✅ · backend curl smoke tests (gate 401/200, honest market/broker/AI/macro payloads, 429 rate limit, 400 validation) ✅.

## Config required (secrets)
`GEMINI_API_KEY`, `OWNER_ACCESS_TOKEN` (long random), optional `APP_URL`.

## Roadmap
- Phase 2: licensed real-time + option-chain feed, computed greeks, broker (Kite/Dhan) in sandbox behind a hard simulation switch, backtesting harness + 1–2 validated defined-risk strategies.
- Phase 3: guarded live capital (kill-switch, position/daily-loss limits, SEBI margin checks, audit logging), on deliberately.

## Key truth
No responsible path exists to auto-trade real money on this build by the go-live date. "Profits from day 1" is a goal to build toward safely, not a guarantee.

## Phase 2/3 foundation (implemented, SANDBOX only)
- Backend: `src/server/greeks.ts` (Black-Scholes + IV), `src/server/riskEngine.ts` (kill-switch, daily-loss/position/notional/lot limits, approx SEBI margin, sandbox order router), `src/server/backtester.ts` (per-agent rules-based backtest on real Yahoo daily history).
- Endpoints (owner-gated): `/api/risk/*`, `/api/broker/sandbox/*`, `/api/greeks/compute`, `/api/backtest/*`.
- Frontend: `GuardedRiskControl.tsx` + `BacktestLab.tsx`, wired into Sidebar/Header/App nav.
- Verified via tsc + vite build + 11 backend curl assertions. See `PHASE2_3_BUILD_LOG.md`.
- Still needs YOUR keys/decisions for live: connected broker (Dhan/Kite), licensed real-time + option-chain feed, DB persistence, broker-exact margin, deliberate go-live switch.
