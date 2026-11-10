# P0 security patch for vishac/Quant-Terminal (base commit b545016)

Apply (from the repo root, on a new branch):
    git checkout -b p0-security-fixes
    git am p0-patches/*.patch
    npm install && npm test        # 8 tests

Then, BEFORE first run:
 1. Set OWNER_ACCESS_TOKEN to a random string of 16+ characters (e.g. `openssl rand -hex 24`) in .env.local.
 2. Deploy firestore.rules in the Firebase console / `firebase deploy --only firestore:rules`.
 3. The owner account must be signed in with the VERIFIED email in firestore.rules, or have a custom claim role=admin.
 4. Behind a reverse proxy only: set TRUST_PROXY=1 so the rate limiter reads X-Forwarded-For.

Behaviour changes to expect:
 - Owner login = type the token once; a 7-day HttpOnly cookie is issued; there is no auto-login.
 - Upstox proxy routes, scheduler trigger, calibrate and test-ping now need the owner cookie (viewers get 401).
 - /api/upstox/order/place always returns 403 (paper-only).
 - Non-admin users can no longer read other users' orders/users/backtests; the unfiltered orders listener in DeskAuthContext will log a permission warning for them.
 - Self sign-up creates quant_trader/analyst; admins grant privileged roles with updateSeatRole.
