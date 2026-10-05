# Data-Integrity & Source Remediation Report (NSE/BSE/F&O)

Brownfield review of the J.A.R.V.I.S. Quant Terminal against the mandate: never present demo/fabricated values as live market data; obtain data only from approved, traceable sources; clearly label real-time/delayed/EOD/historical/cached/calculated/unavailable; fail safe when data is missing.

## 1. Executive summary
The app presents Indian equity/index and a derived F&O workspace. The only implemented live source is the **unofficial, delayed** Yahoo Finance daily-candle endpoint. Earlier phases removed fabricated news, fake broker pings, invented greeks/PCR/VIX, and relabelled the feed as delayed/unofficial. This phase adds a **MarketDataProvider abstraction + configuration boundary** that returns explicit `DATA_UNAVAILABLE` / `PROVIDER_NOT_CONFIGURED` states (never fabricated), formal **dataMode + freshness** on every quote, an outbound request timeout, and removal of the remaining `Math.random`-based market fabrications and false "LIVE/100% real" labels. The large synthetic option-chain view (`QuantTerminal3D`) is now honestly labelled **CALCULATED MODEL — not live exchange OI/greeks**; replacing it with a real option-chain feed is a documented Phase-2 blocker.

## 2. Current architecture
- **Frontend:** React 19 + TypeScript + Vite, Tailwind, Three.js HUD, PWA. Admin desks gated by an owner token.
- **Backend:** Node/Express (`server.ts`) + `ws` WebSocket; server-side Gemini (owner-gated). No DB — **in-memory** quote cache + risk/sandbox state.
- **Data paths:** REST `/api/market-data` polling (primary), `/ws/market` WebSocket (optional), owner-gated AI (`/api/jarvis`, `/api/macro`), Phase 2/3 `/api/risk/*`, `/api/broker/sandbox/*`, `/api/greeks/compute`, `/api/backtest/*`.
- **Hosting:** Google AI Studio / Cloud Run (single service). Secrets via env.

## 3. Dummy/demo-data audit (key findings & remediation)
| File | Field | Classification | Remediation |
|---|---|---|---|
| server.ts (prev) | Macro news, NIFTY/VIX fallbacks, broker ping, jarvis greeks | E/F | Removed → honest unavailable (Phase 1) |
| liveMarketService.ts | `latencyMs = Math.random()`, `isLive:true` on error, `provider:'NSE_BSE_EXCHANGE_TICK_ROUTER'`, `packetsSaved=1420` | E/F | latency→null, isLive→false+error on failure, provider→feed id, seed→0 |
| QuantTerminal3D.tsx | `niftySpot ?? 22421.95`, `vix ?? 14.46` | F | Removed; null-safe + `DATA UNAVAILABLE` state when no spot |
| QuantTerminal3D.tsx | `ce/peChangePct += Math.random()*0.2-0.1` | E | Random jitter removed; deterministic model value |
| QuantTerminal3D.tsx | "LIVE OPTION CHAIN / LIVE OI / Direct exchange tick feeds · Zero mock" | F | Relabelled **MODEL / CALCULATED — not live** |
| QuantTerminal3D.tsx | Hardcoded OI (85000, 22600 wall, 34.8% PE), audit logs w/ fake NSE_FEED_IDs, strategy premiums/margins | E/F | **BLOCKER** — needs real option-chain feed (Phase 2); labelled model meanwhile |
| JarvisVoiceHUD.tsx | "100% Real Live Exchange Ticks. Zero demo/dummy" | F | Relabelled delayed/unofficial + calculated |
| BrokerGatewayRouter.tsx | `tickRate = 2800+Math.random()*80`; fake broker creds/latency | E/F | tickRate→0 (no feed); broker section already labelled NOT CONNECTED |
| SettingsTerminal.tsx | Fake broker latencies/AI diagnostics | E | Labelled NOT CONNECTED / illustrative (Phase 1) |

Remaining `Math.random` usages are **non-market**: Three.js particle color, synthetic order IDs, and millisecond suffixes on sandbox audit timestamps (cosmetic). Classified C/cosmetic, not market data.

## 4. Data-lineage map (representative)
`ViewerDashboard / QuantTerminal3D ticker` → `useLiveMarketData` / `useMarketWebSocket` → `GET /api/market-data` → `syncMarketQuotes()` → `MarketDataProvider.getQuote()` → **Yahoo delayed (daily candle)** → normalized quote (`dataMode=DELAYED`, `receivedTimestamp` IST, `freshness`) → UI labelled "DELAYED · UNOFFICIAL".
`QuantTerminal3D option chain / greeks / OI` → **calculated in-component from delayed spot + VIX** (no upstream) → labelled **CALCULATED MODEL**. `Greeks compute` → `/api/greeks/compute` → Black-Scholes (`dataMode=CALCULATED`).

## 5. NSE/BSE source matrix
| Domain | Intended authoritative source | Mode | Transport | Status |
|---|---|---|---|---|
| Quotes/Indices | NSE Data & Analytics real-time; BSE Self Data Feed | Real-time | WebSocket/leased | `PROVIDER_NOT_CONFIGURED` stub ready · REQUIRES_VENDOR_CONFIRMATION |
| Equity depth | Exchange/authorized vendor | Real-time | WS | Not implemented · REQUIRES_VENDOR_CONFIRMATION |
| Futures / Options / Option chain / OI & ΔOI | Exchange/authorized vendor | Real-time/snapshot | WS/file | Not implemented (currently CALCULATED model) · BLOCKER |
| Historical candles | Vendor / exchange EOD | Historical/EOD | REST/file | Backtester uses free Yahoo daily (clearly labelled proxy) |
| Instrument master / expiry calendar | Exchange reference files | Reference | File | Not implemented · REQUIRES_VENDOR_CONFIRMATION |
| Corp announcements/actions | NSE/BSE corporate feeds | EOD/snapshot | REST/file | Not implemented |
| Current interim source | Yahoo Finance chart | **Delayed/EOD, UNOFFICIAL** | REST | Implemented, labelled; **not redistribution-safe** — stopgap only |

No NSE/BSE page scraping, cookies, or anti-bot workarounds are used. The Yahoo endpoint is a labelled stopgap, not an authorized production feed.

## 6. Licensing / redistribution questions (must resolve before go-live)
- Which licensed product: NSE Data & Analytics vs BSE Self Data Feed vs an authorized vendor? (REQUIRES_VENDOR_CONFIRMATION)
- Does the agreement permit **display, storage, calculation and any redistribution** for this app's use?
- Real-time vs delayed entitlement; permitted retention; attribution requirements.
- Is continued use of the unofficial Yahoo endpoint acceptable even as a labelled stopgap? (Recommend: no for production.)

## 7. Security findings (ranked)
- **High (resolved):** unauthenticated AI endpoints → owner-token gate + rate limit + input validation (Phase 1). Outbound market/backtest fetches now have an **8s timeout** (no hung sockets). JSON body capped at 32kb.
- **Medium (resolved/partial):** hardcoded host removed; secrets server-side only; Gemini key never sent to browser; owner token constant-time compared.
- **Medium (open / by design for now):** `MARKET_DATA_PROVIDER` is an allow-listed key (no arbitrary URL → no SSRF). When a real provider is added, its base URL must stay server-side allow-listed. In-memory state is not persisted (acceptable single-operator; DB + audit log is a Phase-3 item). CORS is currently permissive on static assets — tighten to the known origin at deploy.
- **Low:** sandbox audit-log millisecond jitter is cosmetic; synthetic order IDs are not market data.

## 8. Recommended target architecture
Keep the provider seam. Implement `NseOfficialProvider` / `BseSelfFeedProvider` / `VendorProvider` behind the same interface (WebSocket for ticks, REST/file for masters & historical), add `InstrumentMasterProvider`, `OptionChainProvider`, `CorporateDataProvider`. Normalize to the exchange-aware model (exchange+segment+token+ISIN+expiry+strike+optionType). Persist quotes/positions to a DB with audit logging. Replace the `QuantTerminal3D` calculated chain with provider option-chain data; keep locally-computed greeks labelled "calculated".

## 9. Files changed (this phase)
`server.ts`, `src/server/marketDataProvider.ts` (new), `src/services/liveMarketService.ts`, `src/components/QuantTerminal3D.tsx`, `src/components/JarvisVoiceHUD.tsx`, `src/components/BrokerGatewayRouter.tsx`. (Prior phases: audit docs, risk engine, backtester, greeks, owner gate, honesty relabels.)

## 10. Patch summary
Provider abstraction + config boundary; explicit `DATA_UNAVAILABLE`/`PROVIDER_NOT_CONFIGURED`; `dataMode` + `freshness` per quote; outbound timeout; removal of random market jitter and false live labels; null-safe option-chain model with a DATA_UNAVAILABLE state.

## 11. Tests / verification
No paid feeds are called from tests. Verified: `tsc --noEmit` ✅, `vite build` ✅. Backend curl: default provider → `OK/DELAYED`, quote `freshness=FRESH`; `MARKET_DATA_PROVIDER=nse_official` → `PROVIDER_NOT_CONFIGURED`, **quotes null, dataMode=UNAVAILABLE** (no fabrication) ✅. (Formal unit/contract tests for provider adapters + stale/holiday/expiry are a recommended next step; see blockers.)

## 12. Remaining blockers (production)
1. **No licensed real-time/option-chain feed** — the headline blocker. Current quotes are delayed/unofficial; option chain/OI/greeks are a calculated model. REQUIRES_VENDOR_CONFIRMATION + subscription + signed data agreement.
2. **Instrument master / expiry calendar / holidays** from authoritative reference data (expiries in `QuantTerminal3D` are placeholder strings).
3. **Persistence + audit logging** (currently in-memory).
4. **Automated provider/stale/holiday/expiry/reconnect test suite.**
5. **Broker integration** (Dhan/Kite) still a sandbox stub — no real orders.

## 13. Production-readiness checklist
- [x] No random/fabricated values presented as live market data (re-scan clean except cosmetic)
- [x] Explicit unavailable state; never zero/sample substitution for live
- [x] dataMode + freshness + source labelled on quote responses
- [x] Owner gate + rate limit + input validation + outbound timeouts
- [x] No NSE/BSE scraping / endpoint circumvention
- [x] Credentials server-side only, not in browser/repo
- [ ] Licensed feed configured (BLOCKER)
- [ ] Instrument master/expiry/holiday reference data (BLOCKER)
- [ ] Persistence + audit log (Phase 3)
- [ ] Provider/stale/holiday test suite (recommended)

## 14. Final traceability matrix
| UI field | Internal model | Backend endpoint | Provider | Upstream | Timestamp | Freshness rule |
|---|---|---|---|---|---|---|
| Index/stock LTP, Δ% (Viewer, ticker) | NormalizedQuote | `GET /api/market-data` | active (default YAHOO_DELAYED_UNOFFICIAL) | Yahoo daily candle | `receivedTimestamp` IST + `exchangeTimestamp` | `FRESH` ≤ threshold else `STALE`; null → `UNAVAILABLE` |
| Option chain LTP/OI/IV/greeks (QuantTerminal3D) | OptionChainRow (CALCULATED) | — (client model) | none | delayed spot + VIX | derived at render | labelled **CALCULATED MODEL**, not live |
| Greeks (compute) | GreeksResult | `POST /api/greeks/compute` | Black-Scholes | supplied inputs | request time | `CALCULATED` |
| Backtest metrics/curve | BacktestResult | `POST /api/backtest/run` | Yahoo historical | daily candles | from/to dates | `HISTORICAL` proxy, disclaimer |
| Risk/limits/positions | RiskState/Config | `/api/risk/*`, `/api/broker/sandbox/*` | in-memory | operator input | `updatedAt` | SANDBOX only |
| AI commentary | JarvisAnalysis | `POST /api/jarvis/analyze` | Gemini (server) | model | response time | figure-free when unavailable |
