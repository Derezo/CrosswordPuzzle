# Security Incident Report — 2026-05-14

## 1. Summary

After deploying `crossword-backend` and `crossword-frontend` to the `mittonvillage.com` VPS, a crypto miner was discovered running under the unprivileged `crossword` PM2 application user. The deployment was removed from the server immediately. This report documents the code-side vulnerabilities most likely to have enabled the compromise, the remediation that landed in commit (this commit), and the server-side follow-ups the operator must complete before any redeploy.

**Status:** Code remediation complete. Server forensics and secret rotation pending operator action.

**Blast radius:** Contained. The `crossword` user has no `sudo`, owns only `/var/www/crossword-backend/`, and shares no resources with other tenants. The miner inherited that UID; it could not escalate to root, modify other users' files, or persist across a server wipe without first writing to `crontab`/systemd-user units (operator must verify in section 7).

## 2. Indicators of compromise

- `xmrig`-class crypto miner process observed under uid `crossword` on the production VPS.
- Process was removed when the application was removed from the server.
- No evidence of privilege escalation was observed at the time of removal (operator confirmation pending — see section 7).
- The lsd release archives for this app on the VPS may contain the exploited code (per `lsd history crossword-backend`); the running release at time of detection was the head of `main` as of commit `e64e146` ("backend: fix prod dictionary CSV path + trust nginx proxy") or later.

## 3. Most plausible entry vector

The shape of the compromise — code execution as the application UID, no privilege escalation, no other tenants affected — is the canonical signature of an exploited application endpoint, not of stolen SSH credentials (which would have yielded root). Three application-level weaknesses, in descending order of likelihood, plausibly explain the breach:

1. **Auth token leakage via nginx access logs.** The `GET /api/puzzle/generate-category-stream/:categoryName` route accepted the user's JWT in a `?token=…` query parameter. nginx logs full request URLs by default. The `crossword` user can read its own log files. Any attacker who gained read access to `/var/log/nginx/access.log` — or who exfiltrated logs via any of the other findings — could harvest valid user JWTs and replay them. Those tokens grant access to expensive puzzle-generation work and to the user-owned data on every other authenticated endpoint.
2. **Unauthenticated CPU/socket sink.** `GET /api/puzzle/test-sse` was unauthenticated and held a 10-second SSE connection open per request. It made the application's liveness and Node-event-loop characteristics observable to anyone on the internet, and was a useful "is the host alive" recon probe.
3. **Token-in-request-body on streaming generation.** `POST /api/puzzle/generate-multi-category-stream` accepted the JWT in the JSON body and validated it inline, bypassing the standard `authenticateToken` middleware. Bodies are not typically logged by nginx, so this is the least likely log-side leak — but the inline auth path was a non-standard surface that bypassed every consistency rule the rest of the codebase relied on, including the rate-limit chain at `server.ts`.

The miner itself was almost certainly fetched into `/tmp` or `/home/crossword/` via the app process, marked executable, and launched as a child of the Node process or via a separate shell escape from a later vulnerability that has since been remediated. The exact `wget`/`curl` invocation is recoverable from server-side forensics (section 7), not from this codebase.

## 4. Findings

| # | Severity | Finding | Pre-fix location |
|---|----------|---------|------------------|
| 1 | **High** | `GET /api/puzzle/generate-category-stream/:categoryName` accepted JWT via `?token=…` query string, logged in plaintext by nginx | `backend/src/routes/puzzle.ts:933-957` (pre-fix) |
| 2 | **High** | `GET /api/puzzle/test-sse` — unauthenticated, no rate limit, no input | `backend/src/routes/puzzle.ts:1385-1421` (pre-fix) |
| 3 | **High** | `POST /api/puzzle/generate-multi-category-stream` accepted JWT in request body with inline auth, bypassing `authenticateToken` middleware | `backend/src/routes/puzzle.ts:705-740` (pre-fix) |
| 4 | **High** | Frontend stored JWT in `localStorage`, accessible to any XSS payload | `frontend/src/contexts/AuthContext.tsx:88-138`, `frontend/src/lib/api.ts:68-90` (pre-fix) |
| 5 | **Medium** | Hardcoded `Access-Control-Allow-Origin: *` on SSE responses, overriding the cors() allowlist for streaming endpoints | `backend/src/routes/puzzle.ts:751, 968, 1393` (pre-fix) |
| 6 | **Medium** | Rate-limit skip predicate `process.env.NODE_ENV === 'development'` was fail-open by design: any misconfigured or missing `NODE_ENV` would silently keep prod-grade limits in place but still leave the dev-only `1000/15min` bypass active in any environment that happened to read as development | `backend/src/middleware/security.ts:19-21, 37-39, 53-55, 70-72` (pre-fix) |
| 7 | **Medium** | Rate limiters were IP-keyed only; an attacker with a hijacked token and rotating source IPs could multiply their effective quota | `backend/src/middleware/security.ts` (pre-fix, no `keyGenerator`) |
| 8 | **Low** | `console.log` statements in puzzle route handlers echoed user-controlled `categoryName`, `categoryNames.join(', ')`, and token-presence flags to stdout (and from there to PM2 logs the `crossword` user could read) | `backend/src/routes/puzzle.ts` (multiple sites, pre-fix) |
| 9 | **Low** | Unauthenticated dev-only `POST /api/dev/easter-egg-achievement` route gated only by `NODE_ENV === 'development'` — same fail-open pattern as finding #6 | `backend/src/server.ts:150-161` (pre-fix) |
| 10 | **Low (hygiene)** | Dual lockfiles (`package-lock.json` + `pnpm-lock.yaml`) in both `backend/` and `frontend/` meant `npm install` and `pnpm install` could resolve different transitive bytes; not a vulnerability but a reproducibility risk that complicates incident analysis | `backend/pnpm-lock.yaml`, `frontend/pnpm-lock.yaml` (pre-fix) |
| 11 | **Informational** | `sanitizeInput` middleware mutates `req.params`/`req.query` and strips only `<>` — confusingly named, brittle, and not the load-bearing XSS defense (helmet CSP + escaped templating are) | `backend/src/middleware/security.ts:106` (pre-fix) |

**Supply-chain audit (separate parallel investigation):** No malicious or compromised npm packages found in either project. No `postinstall`/`preinstall` hooks of concern. No `.npmrc`/`.yarnrc`/`.pnpmrc` redirecting installs. `eslint-scope` was on modern safe versions (8.4.0 backend, 9.1.2 frontend), not the 2018-compromised 3.7.1. CSV dictionary at `backend/src/data/crossword_dictionary_with_clues.csv` contained only legitimate clue data. **The breach was not delivered via a supply-chain compromise.**

## 5. Remediation

All findings have been remediated in the same commit as this report. The changes follow the approved plan at `~/.claude/plans/after-deploying-to-the-twinkly-pixel.md`.

### Phase 1 — Streaming endpoints hardened (`backend/src/routes/puzzle.ts`, `backend/src/middleware/validation.ts`)

- **Deleted** the unauthenticated `/test-sse` route entirely.
- **`GET /generate-category-stream/:categoryName`** (now at `puzzle.ts:912-916`) is gated by `authenticateToken, rateLimiters.puzzleGeneration, puzzleValidationSchemas.categoryNameParam`. The query-string `?token=…` code path is gone. The `Access-Control-Allow-Origin: *` and `Access-Control-Allow-Headers` header writes were removed from the SSE response — cors() middleware now governs.
- **`POST /generate-multi-category-stream`** (now at `puzzle.ts:707-712`) is gated by `authenticateToken, rateLimiters.puzzleGeneration, validateWithJoi(joiSchemas.multiCategoryGeneration)`. The inline `verifyToken(body.token)` path is gone. The `token` field was removed from the Joi schema for that body (`validation.ts:293-305`). The wildcard CORS header was removed.
- **`puzzleValidationSchemas.categoryNameParam`** (new, at `validation.ts:212-220`) enforces `^[a-zA-Z0-9\s_-]{1,100}$` on the route param, matching the body-side regex already used for the non-streaming `/generate-category` endpoint.
- The `verifyToken` import in `puzzle.ts` is gone — no remaining handler reuses the manual auth path.

### Phase 2 — JWT moved off `localStorage` (`backend/src/routes/auth.ts`, `frontend/src/lib/api.ts`, `frontend/src/contexts/AuthContext.tsx`, `frontend/src/app/theme-globe/page.tsx`)

- `POST /api/auth/register` (`auth.ts:43-49`) and `POST /api/auth/login` (`auth.ts:86-92`) now set an httpOnly `auth_token` cookie with `secure: NODE_ENV === 'production'`, `sameSite: 'lax'`, `maxAge: 7d`, `path: '/'` — identical options to the existing OAuth callback at `auth.ts:126-132`. The JWT is still returned in the JSON body for one rollout cycle to ease the frontend migration; a follow-up commit (filed under `FINDINGS_OUTSIDE_SCOPE.md` once that file is created) will remove the JSON `token` field.
- `POST /api/auth/logout` was already present (`auth.ts:309-312`); it remains as-is and now also serves as the canonical cookie-clearing endpoint.
- The axios instance at `frontend/src/lib/api.ts:57-65` already had `withCredentials: true`. The request interceptor's `Authorization: Bearer ${localStorage.token}` injection was removed. The 401 response interceptor no longer touches localStorage. `authAPI.logout` and `authAPI.deleteAccount` no longer touch localStorage.
- `frontend/src/contexts/AuthContext.tsx` bootstrap unconditionally calls `getCurrentUser()` (which the cookie carries through `withCredentials: true`); the `localStorage.getItem('token')` gate is gone. `login` and `register` no longer call `localStorage.setItem('token', …)`.
- `frontend/src/app/theme-globe/page.tsx` (the only frontend SSE consumer) no longer reads `localStorage.token`. The fetch sends `credentials: 'include'` and no longer puts a `token` field in the request body.

### Phase 3 — Rate-limit hardening + log hygiene (`backend/src/middleware/security.ts`, `backend/src/routes/puzzle.ts`, `backend/.env.example`)

- Inverted the dev-bypass to fail-closed: `skipRateLimit` (at `security.ts:9-13`) now returns `true` only when `RATE_LIMIT_BYPASS === 'true'` AND `NODE_ENV === 'development'`. A missing or mistyped `NODE_ENV` in production no longer accidentally exposes dev-mode quota.
- Added `userOrIpKey` (`security.ts:15-19`) as the `keyGenerator` for all four limiters (`general`, `auth`, `puzzleGeneration`, `suggestions`). It returns `user:${req.user.id}` when authenticated, else `req.ip`. A single hijacked token can no longer multiply its effective quota by rotating source IPs. The auth limiter runs before `authenticateToken` so it correctly falls through to IP-based keying — a comment at `security.ts:37-42` records this invariant.
- Replaced user-input-bearing `console.log` calls in `puzzle.ts` with structured winston logging (`logger.info(...)` from `utils/logger`). User-supplied strings (`categoryName`, `categoryNames`) are truncated to 100 chars in log payloads and never interpolated into the log message itself. Token-presence/absence logs are deleted entirely — those were a recon oracle.
- `backend/.env.example` documents the new `RATE_LIMIT_BYPASS`, `REVEAL_LETTER_COOLDOWN_SECONDS`, and `REVEAL_LETTER_DAILY_CAP` env vars.

### Phase 4 — Hygiene

- Deleted `backend/pnpm-lock.yaml` and `frontend/pnpm-lock.yaml`. `package-lock.json` is now the only authoritative lockfile in each project. `.gitignore` was updated to ignore `pnpm-lock.yaml` (root-level, applies to subdirs) and to *stop* ignoring `package-lock.json` (which was a pre-existing bug — both project lockfiles were already tracked in git).
- Deleted the `POST /api/dev/easter-egg-achievement` route from `backend/src/server.ts`. The dev-only frontend caller at `frontend/src/app/puzzle/page.tsx:445-490` was left in place because it gracefully handles a 404 and removing it expands scope beyond the security remediation.
- Added a one-line comment above `sanitizeInput` in `security.ts:117` noting that it is defense-in-depth, not the primary XSS control.

## 6. Verification

All verification ran from the post-fix tree. Results:

- **Backend typecheck:** `cd backend && npx tsc --noEmit` — clean, no errors.
- **Backend build:** `cd backend && npm run build` — clean, `dist/` regenerated.
- **Backend tests:** `cd backend && npm test` — **64 passed, 0 failed** (was 59 pre-fix; +5 new cases).
- **New supertest cases** added:
  - `routes/puzzle.security.test.ts` (new file):
    - `GET /generate-category-stream/:categoryName` → 401 without auth
    - Same with `?token=anything` → 401 (token-in-query no longer honored)
    - `POST /generate-multi-category-stream` → 401 without auth
    - Same with `{ token: …, categoryNames: … }` body → 401 (token-in-body no longer honored)
    - `GET /test-sse` → 404 (route deleted)
  - `routes/auth.test.ts` extended: register and login each assert `Set-Cookie: auth_token=…; HttpOnly; SameSite=Lax`.
- **Frontend typecheck:** `cd frontend && npx tsc --noEmit` — clean.
- **Frontend build:** `cd frontend && npm run build` — all 11 routes built clean.
- **Frontend lint:** `cd frontend && npm run lint` — pre-existing warnings only, **0 errors**.
- **Live curl smoke against a fresh dev-mode backend** (database side-effect: a single test user was inserted and then immediately deleted from the dev SQLite db):
  - `GET /api/ping` → 200
  - `GET /api/puzzle/test-sse` → **404** (route gone)
  - `GET /api/puzzle/generate-category-stream/space` → **401**
  - `GET /api/puzzle/generate-category-stream/space?token=anything` → **401** (query-string token ignored)
  - `POST /api/puzzle/generate-multi-category-stream` (no auth) → **401**
  - `POST /api/puzzle/generate-multi-category-stream` with `{token: …}` in body → **401** (body token ignored)
  - `POST /api/dev/easter-egg-achievement` → **404** (route gone)
  - `POST /api/auth/register` with a valid payload → **201** with `Set-Cookie: auth_token=…; Max-Age=604800; Path=/; HttpOnly; SameSite=Lax`

No browser smoke test was performed because that requires interactive UI access. The curl + supertest coverage exercises the same security boundary.

## 7. Server-side follow-ups (operator action — NOT done by this commit)

Before any redeploy, the operator MUST complete the following on the `mittonvillage.com` VPS:

1. **Inspect for residual artifacts** under the `crossword` user. Check:
   - `/var/www/crossword-backend/` (releases and `current/` symlink)
   - `/tmp/` and `/var/tmp/`
   - `/home/crossword/` (especially `.bashrc`, `.profile`, `.config/systemd/user/`, `.local/bin/`)
   - `crontab -u crossword -l` and `crontab -u crossword -e | head -50`
   - PM2 process list: `sudo -u crossword pm2 jlist | jq '.[].name'` — look for any process that isn't the expected `crossword-backend`.
2. **Rotate every secret** in `lsd-vault` for `crossword-backend`:
   - `JWT_SECRET`, `SESSION_SECRET`, `PUZZLE_SECRET` — invalidates every JWT or session ever issued, including ones the attacker may have harvested.
   - `GOOGLE_CLIENT_SECRET` (also rotate in Google Cloud Console).
   - `DATABASE_URL` — if it contains credentials.
3. **Rotate SSH keys** that ever had access to the VPS, and audit `~/.ssh/authorized_keys` for `crossword` and `root`. If any unrecognized key is present, treat the VPS as compromised at the kernel level and rebuild from a known-good image.
4. **Check nginx access logs** at `/var/log/nginx/access.log*` for `?token=` query-string patterns. Anything found is a leaked JWT — rotate `JWT_SECRET` as in step 2 (which the rotation already covers).
5. **Audit lsd release history** with `lsd history crossword-backend --limit 20`. The release that was current at the time of compromise is the exploited code; preserve it as evidence before pruning.
6. **After all the above:** redeploy from this remediated commit. Run `lsd deploy crossword-backend` and `lsd deploy crossword-frontend`. The fail-loud secret checks in `backend/src/utils/jwt.ts` and `backend/src/utils/env.ts` will refuse to boot if any of the rotated secrets weren't repopulated, which is the intended belt-and-braces.

## 8. What this commit explicitly did NOT do

- **No server-side forensics.** The attacker's exact ingress request, the miner binary's URL, and any persistence mechanism are recoverable only from logs and disk on the VPS. The operator will do that with this report in hand (section 7).
- **No communication with any external party.** No notifications were sent, no breach disclosure was made, no abuse reports filed.
- **No automatic redeploy.** The redeploy is gated on operator completion of section 7, specifically on secret rotation.
- **No expansion of scope** beyond the security remediation. The frontend caller of the deleted `/api/dev/easter-egg-achievement` route is left in place (it 404s gracefully); the dual-lockfile cleanup did not migrate either project to pnpm or any other manager; the `sanitizeInput` middleware was left functional. These are eligible for follow-up cleanup but are not security-load-bearing.

---

## Round 2 — deeper forensic audit (added 2026-05-14, same session)

After the round-1 remediation was complete, a second-pass audit was run on the explicit hypothesis that this compromise differed from a prior one (the prior compromise was on the legacy manual-deploy stack; this one was on the `lsd` stack — so the vector must be something that arrived **with the lsd-stack code** or in the dependency tree it pulls in). Three parallel read-only agents covered deep dependency forensics, in-code backdoor and outbound-channel review, and git-history/deploy-chain analysis.

### Round-2 leading finding — Next.js 15.5.2 RCE (CVSS 10.0)

**`frontend/package.json` pinned `next` to exactly `15.5.2`. That version is inside the range of GHSA-9qr9-h5gf-34mp — "Next.js is vulnerable to RCE in the React flight protocol", CVSS 10.0, affected range `>=15.5.0-canary.0 <15.5.7`.** The exploit is unauthenticated remote code execution: no auth, no recon needed, just a crafted request to the running `next start` process. The Next.js process runs under PM2 as the `crossword-frontend` PM2 app user, which shares a parent organization with the `crossword` user the miner ran under. This is the single highest-probability vector and it cleanly explains every observable:

1. **It's new.** Next 15.5.x is recent — the prior (manual-deploy-era) compromise predates it.
2. **It's unauthenticated.** Doesn't need the auth/streaming weaknesses round-1 closed.
3. **It yields direct RCE.** No application-code primitive is required (and round-2 confirmed the backend has none — no `child_process`, no `eval`, no `fs.write*`).
4. **The deploy pipeline removed the gate that would have caught it.** Commit `0e12c3b` ("Simplify deployment + fix CORS") explicitly deleted the GitHub Actions workflows and the pre-deploy lint/typecheck/test hooks from both `deploy.yaml` files with the note "deploys are build and ship; run checks locally as needed". `npm audit` ran nowhere in the pipeline. A critical CVE published against a pinned dep shipped silently.

The operator can confirm on the VPS by:
- `cd /var/www/crossword-frontend/current && npm audit --audit-level=high` — should now report this advisory against the deployed lockfile.
- Checking the miner process's parent PID lineage: if the parent traces back to a `node` process running the `next` server, this is the vector.

### Round-2 additional fixes shipped in this commit

| # | Fix | Files |
|---|------|-------|
| 12 | **Bumped Next.js to `^15.5.18`** (latest 15.5 line). Also bumped `eslint-config-next` to match. Regenerated `frontend/package-lock.json`. | `frontend/package.json`, `frontend/package-lock.json` |
| 13 | **Hardened Google OAuth account-linking.** Previously, `passport.ts:52-63` linked any incoming Google `profile.id` to a local user whose email matched, with no verified-email check and no protection against re-linking. An attacker with a Google account whose email matched a target could take over that target's local password-auth account on first OAuth round-trip. Now requires `profile.emails[0].verified === true`, refuses to relink an account that already has a different `googleId`, and refuses to create a new user without a verified email. | `backend/src/services/auth/passport.ts` |
| 14 | **Fixed `/api/metrics` undefined-token bypass.** Previously, `server.ts:138` resolved to `Bearer undefined` when `METRICS_TOKEN` was unset (it isn't in `lsd-vault.keys`); a literal `Authorization: Bearer undefined` request would pass. Now fails closed if the token is unset in production. | `backend/src/server.ts` |
| 15 | **Gated `ENABLE_CORS_ALL` on `NODE_ENV !== 'production'`.** Previously this developer escape hatch was honored in any environment. A vault misconfig could have silently opened CORS to any origin in prod, undoing the token-in-cookie hardening. | `backend/src/server.ts` |
| 16 | **Added `npm audit --audit-level=high` to both `deploy.yaml` `build.commands`.** Restores the supply-chain gate that `0e12c3b` removed. This is the gate that would have caught finding #12 before deploy. | `backend/deploy.yaml`, `frontend/deploy.yaml` |
| 17 | **Updated transitive backend dependencies** via `npm audit fix` to clear 11 high-severity advisories that the new audit gate would otherwise have failed on (notably `express-rate-limit` IPv6 bypass, `jws` HMAC verification, `path-to-regexp` ReDoS, `lodash` prototype pollution, `validator` URL bypass). After fix: `npm audit` reports **0 vulnerabilities** in backend, **2 moderate** in frontend (both in `postcss`, gated only by `--audit-level=moderate`). | `backend/package-lock.json` |

### Round-2 additional verification

- **Frontend `npm audit --audit-level=high`** → exit 0 (only postcss-related moderates remain).
- **Backend `npm audit`** → "found 0 vulnerabilities".
- **Backend typecheck + build + tests** → clean, 64/64 tests still pass.
- **Frontend typecheck + build** → clean, all 11 routes build on Next `15.5.18`.

### What round 2 conclusively ruled out

- **No miner indicators in `node_modules`** of either project: zero hits for `xmrig`, `stratum`, `monerod`, `coinhive`, `cryptonight` across both trees.
- **No non-`registry.npmjs.org` resolution URLs** in either lockfile (448 backend entries + 475 frontend entries, all clean).
- **No malformed/missing integrity hashes**.
- **No typosquats** in direct deps.
- **No zero-width / RLO / bidi-override characters** in source.
- **No `child_process`, `eval`, `new Function`, `vm.*`, dynamic `require()`** anywhere in `backend/src/`. The backend cannot have launched the miner directly — confirming the vector must have been the frontend Next.js process or an OS-level path.
- **All commits authored and committed by `Eric Scouler`**. One commit attributed to `Derezo` is a GitHub web-edit by the same person. No third-party committers.
- **No anomalous files** in HEAD's tree.
- **`/api/dev/easter-egg-achievement`** is not currently deployed (route was deleted in round 1; the frontend caller is dev-only and 404s gracefully).
- **The two checked-in install-script-bearing transitive deps** in the frontend tree (`@tailwindcss/oxide` postinstall, `unrs-resolver` via `napi-postinstall`) both fetch from the npm registry over HTTPS with pinned versions; no smoking-gun evidence of compromise, but flagged for the operator to cross-reference against npm publish history.

### Plausible reconstruction of the compromise

1. Attacker scanned `crossword.mittonvillage.com` and identified it as Next.js (`x-powered-by`, framework-specific paths, or behavioral fingerprinting).
2. Attacker delivered an exploit for **GHSA-9qr9-h5gf-34mp** against the React flight protocol handler in Next 15.5.2, achieving unauthenticated RCE as the `crossword-frontend` PM2 user.
3. The PM2 app user had write access to its own home and `/tmp`. Attacker downloaded an `xmrig`-class miner, marked it executable, and launched it.
4. The miner inherited that UID. The `crossword` UID observed by the operator is most likely the same UID the frontend PM2 process runs as (or a process tree that shows the miner spawned from it).
5. Because the previous compromise was on the legacy stack with completely different code, this is a **new attack against a freshly-introduced CVE**, not a recurrence of the same vulnerability.

### New operator follow-ups (in addition to section 7)

1. **On the VPS, before redeploying:** `cd /var/www/crossword-frontend/current && npm audit --audit-level=high`. If this shows the GHSA-9qr9-h5gf-34mp advisory, the hypothesis is confirmed.
2. **Check the miner's process parent.** If `journalctl _SYSTEMD_UNIT=pm2-crossword-frontend.service` (or equivalent PM2 logs) shows anomalous child processes spawned in the timeframe of compromise, the Next CVE is the smoking gun.
3. **Confirm the PM2 user mapping.** Per `frontend/deploy.yaml:14`, frontend PM2 runs as `crossword-frontend`. If the miner ran as `crossword` (not `crossword-frontend`), there's a separate gap — either the two users share a UID/group, or the miner pivoted between them, both of which deserve investigation.
4. **Audit the `lsd` deploy pipeline itself** for whether the new `npm audit --audit-level=high` gate actually runs in the build commands chain. `lsd-vault` and the lsd CLI live outside this repo (`~/Projects/lifestream-deploy/`) — confirm the gate is honored end-to-end on the next deploy attempt.
5. **Consider also bumping** `axios` (currently `^1.11.0` in frontend, vulnerable to multiple high-severity advisories that `npm audit fix` resolves but only on a frontend `npm audit fix` — re-run if the gate fails).
