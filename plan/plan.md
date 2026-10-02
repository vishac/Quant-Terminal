# Quant-Terminal — Code, Logic & Security Review + Remediation Plan

A review of the existing "J.A.R.V.I.S. Institutional Quant Terminal" and a staged plan to make it honest, safe, and genuinely useful.
The headline finding up front: in its current form the terminal cannot place real trades and does not use real-time data, so it cannot responsibly trade real capital on the go-live date — this plan fixes the foundations first.

## Who it's for
A single owner/operator (you) who wants an Indian-markets (NSE/BSE/F&O/MCX) trading cockpit: live dashboards, AI market commentary, risk visibility, and — eventually — real, risk-controlled order execution through a broker.

## What the review found
The app is a polished React/3D "institutional terminal" with a Jarvis voice HUD, five named strategy "agents" (Chanakya, Bhishma, Arjuna, Kuber, Vidura), a macro-threat panel, and an equity radar. Under the surface:

- **No real trading is possible.** There is no broker connection. The "broker test-ping" returns hardcoded fake latencies and node names ("CONNECTED", "MUMBAI NSE // RACK-08"). There is no order-placement path, no broker login/authorisation, no option-chain or positions feed.
- **The data is not real-time.** Quotes come from an unofficial Yahoo Finance endpoint using daily candles (`interval=1d`), labelled in the UI as a "LIVE EXCHANGE TICK STREAM." It is effectively delayed end-of-day data, unofficial, and liable to break or be rate-limited. There is no intraday, options, or greeks data at all.
- **Fabricated numbers are presented as real** — which directly contradicts the project's own "ZERO DUMMY DATA" mandate. Examples: invented Reuters/Bloomberg news headlines with made-up impact scores in the macro fallback; hardcoded NIFTY/VIX levels; the AI assistant's fallback text asserting specific PCR, VIX, option premiums, "verified scores ≥ 88/100," and order-book sizes that are not measured; option "greeks" shown as fixed strings rather than computed; F&O P&L approximated by a single hardcoded formula; `sebiComplianceVerified: true` stamped on orders unconditionally.
- **Security gaps.** The AI-backed endpoints (`/api/jarvis/analyze`, `/api/macro/intelligence`) have no authentication and no rate limiting — anyone who finds the URL can run up the Gemini bill or overload the service. No input validation. A hardcoded hosting URL is baked into the server. (One positive: the Gemini key is kept server-side and is not exposed to the browser.)
- **Strategy substance is cosmetic.** The five "agents" are well-written rule descriptions, but there is no backtesting, no historical data, no validated edge, and no real signal generation driving them. Strikes are derived from the spot price, but entries, premiums, and P&L are heuristic placeholders.

Bottom line: today it is best described as a **demo/paper-trading and AI-commentary dashboard**, not a trading system. No responsible path exists to auto-trade real money on it by the go-live date. This plan therefore makes it truthful and safe first, then builds real data and execution in sandbox, and only then considers live capital.

## Core features and experience (Phase 1 — built now)
Phase 1 is a **review + safety-and-honesty remediation**. No real-money execution is enabled. Deliverables:

1. **Written audit report** — every issue above catalogued by severity (security, correctness, integrity, strategy), each with a specific fix and risk rating, kept in the repo for your sign-off.
2. **Security hardening** — add an access gate (owner password/token) and rate limiting to the AI endpoints; validate inputs; remove the hardcoded host; tighten permissive headers. Goal: the Gemini bill and the service cannot be abused by outsiders.
3. **Honesty pass (makes the app obey its own no-dummy rule)** — replace fabricated news, hardcoded index/VIX fallbacks, fake broker pings, invented greeks, and assertive AI "facts" with clearly labelled unavailable/empty states. The AI assistant stops stating numbers it cannot verify.
4. **Data-accuracy fix + honest labelling** — correct the price/previous-close calculation so change% is right, and relabel the feed truthfully (e.g. "Delayed market data — unofficial source," with timestamp and source shown). Clearly mark everything simulated as "SIMULATION / PAPER."
5. **Clean paper-trading mode** — keep the five-agent simulation but present it unambiguously as paper trading, with P&L derived only from the (delayed) live price and starting from zero as the project mandate intends.

The experience after Phase 1: the same impressive terminal, but every number is either real-and-labelled or clearly marked simulated — safe to show, demo, and learn from, with no risk of silent fake data or an abusable AI bill.

## User flow
1. Operator opens the terminal and signs in with an owner credential (new gate).
2. Dashboard shows delayed market quotes with an explicit "delayed / unofficial source" label and timestamp.
3. Operator can ask the Jarvis assistant questions; it answers from real context only and declines to invent figures.
4. Macro and radar panels show either real grounded data (when the AI search succeeds) or a clearly labelled "data unavailable" state — never fabricated news.
5. Operator runs the five-agent **paper-trading** simulation, watches simulated orders and P&L against delayed prices, all badged "SIMULATION."
6. Real order placement remains intentionally disabled and visibly marked "not connected" until Phase 2/3.

## UI/UX feel
Preserve the existing dark, high-tech "institutional terminal" aesthetic (3D terminal, Jarvis HUD, neon-on-black, PWA/installable). The only visual changes in Phase 1 are trust signals: honest data-source and "SIMULATION" badges, an "unavailable" empty state style, and a login gate consistent with the current look. No cosmetic redesign.

## Implementation phases

### Phase 1 — Review + Safety & Honesty (built now)
The audit report plus the five deliverables above. Outcome: a truthful, secure, abuse-resistant paper-trading and analytics terminal. No real capital at risk; nothing claims to be live that isn't.

### Phase 2 — Real data + broker in sandbox (later)
Integrate a licensed/real-time Indian market data + option-chain source and a broker API (e.g. Zerodha Kite Connect or Dhan) in **paper/sandbox mode**: proper broker login/authorisation, real quotes, option chains and computed greeks, and order placement kept behind a hard simulation switch. Add a backtesting harness and implement one or two genuinely defined-risk strategies with rules validated against history.

### Phase 3 — Live capital, guarded (later)
Enable real-money execution only after backtests and a period of forward paper-trading pass review. Ship with a kill-switch, hard position and daily-loss limits, SEBI-compliant margin checks, full audit logging, and your own broker credentials — turned on deliberately, not by default.

## Assumptions
- **No real-money trading is enabled in Phase 1, and no profit is promised for the go-live date.** Markets carry real risk of loss; "profits from day 1" is treated as a goal to build toward safely, not a guarantee. If you want live execution attempted sooner, that is a decision to make explicitly against the risks above.
- Work proceeds on the existing Quant-Terminal codebase and its current tech stack rather than a rewrite.
- "Best strategies from BlackRock / FII / DII" is interpreted as systematic, defined-risk, risk-managed strategies to be designed and backtested in Phase 2 — not as copying any firm's proprietary system, and not as anything deployable with real money in Phase 1.
- The owner access gate in Phase 1 is a single-operator credential, not a multi-user accounts system.
- The delayed/unofficial data source is acceptable only as a clearly labelled stopgap for Phase 1; a proper real-time/licensed feed is a Phase 2 item.
- Broker choice (Kite / Dhan / other), the market-data/option-chain provider, and any paid API keys will be confirmed with you before Phase 2 begins.
