# Findings Outside Scope

Items surfaced during the 2026-05 remediation pass that were intentionally
deferred. Each entry has: title, status, surface date, pointer/reproducer,
why deferred, effort estimate, file references.

When a follow-up plan closes an item, **delete the entry** — git history is
the audit trail.

---

## Open

### Frontend testing not yet wired
- **Status:** Open
- **Surfaced:** 2026-05-12 (Phase 4 of remediation — deferred per user decision)
- **Pointer:** `frontend/` has no Vitest config, no `*.test.tsx` files. `CrosswordGrid`, `AuthContext`, and `puzzle/page.tsx` would benefit most.
- **Why deferred:** Explicit user choice to scope Phase 4 to backend only. Re-confirmed during the 2026-05 drain pass.
- **Effort:** ~4 hours (install vitest + React Testing Library + jsdom, add jest-dom, write first 10 component tests).

### Achievement check N+1 query pattern
- **Status:** Open
- **Surfaced:** 2026-05-12 (pre-deploy perf sweep)
- **Pointer:** `backend/src/services/achievement/achievementService.ts:147-176` — `checkAchievements()` runs `findMany({ isActive: true })` then loops per-achievement, hitting `userAchievement.findUnique` (and condition-specific queries: `dailyPuzzle.findUnique`, `userProgress.findMany`, etc.) on every iteration. ~10 achievements × per-completion calls = significant query load at scale.
- **Why deferred:** Acceptable at current user volume (single-digit users at launch). Worth fixing before sustained 100+ DAU. Not a deploy blocker.
- **Effort:** ~1 hour. Batch existing `userAchievement` rows for the user once at the top of `checkAchievements`, then narrow the per-achievement work to in-memory checks. The puzzle/progress lookups inside individual check methods are harder to batch — consider passing the data in via context.

### Puzzle generator backtracking caps may be over-generous
- **Status:** Open
- **Surfaced:** 2026-05-12 (pre-deploy perf sweep)
- **Pointer:** `backend/src/services/puzzle/nytStyleGenerator.ts:62-63` — `MAX_TEMPLATE_ATTEMPTS = 8000`, `MAX_FILL_BACKTRACKS = 150000`. Worst-case 1.2B recursive calls; bounded by a 5s timeout elsewhere in the file. On the 3.8GB / 4-vCPU mittonvillage VPS, the daily cron at midnight UTC will burn 5s of one core; concurrent puzzle gen via the multi-category SSE endpoint can do the same.
- **Why deferred:** Daily cron is single-shot; SSE now bails on client disconnect (fix landed in this pass). Backtrack cap tuning needs benchmarking against the actual dictionary, not a snap decision.
- **Effort:** ~2 hours. Reduce `MAX_TEMPLATE_ATTEMPTS` to ~100 if the success rate at that cap is >90%; expose a `--budget-ms` knob the SSE endpoint can pass.

### `sanitizeInput` middleware strips `<` and `>` from all request bodies
- **Status:** Open
- **Surfaced:** 2026-05-12 (pre-deploy perf sweep)
- **Pointer:** `backend/src/middleware/security.ts:101-127` — runs on every request, recursively walks the body and removes `<` and `>` from every string field. Costs CPU per request AND silently mangles legitimate content (e.g. user suggestion text).
- **Why deferred:** Removing this changes the security model (it's a defense-in-depth XSS layer). The correct fix is per-route validation/escaping at output (frontend), not whole-body mutation at the edge. Needs a security-aware design pass.
- **Effort:** ~3 hours. Replace with per-field validation in `validation.ts` schemas; render-time escaping is already handled by React. Audit each route to confirm no field actually needs `<`/`>` allowed.

### Helmet CSP `scriptSrc: 'self'` will break Next.js if backend ever serves HTML
- **Status:** Open
- **Surfaced:** 2026-05-12 (pre-deploy perf sweep)
- **Pointer:** `backend/src/middleware/security.ts:78-98`. Currently fine because backend serves only `/api/*`. If a future change routes a page through the API host, Next inline chunks will be blocked. Note for future cross-app routing.
- **Why deferred:** No current functional impact. Document for the future.

### Frontend animation cleanup on unmount
- **Status:** Open
- **Surfaced:** 2026-05-12 (pre-deploy perf sweep)
- **Pointer:** `frontend/src/app/puzzle/page.tsx` — `energyOrbs` and `fireworks` state arrays are cleared via `setTimeout` (~600-1200ms after triggering). If the user navigates away mid-animation, the timeout fires after unmount and React logs a state-update-on-unmounted-component warning; no functional issue.
- **Why deferred:** Cosmetic warning, not a perf or memory issue (the timeouts complete and free the closure). React 19 handles state updates on unmounted components without leaks.
- **Effort:** ~15 min. Add a `useEffect` cleanup that clears any pending timeouts.

### Frontend bundle hints in `next.config.ts`
- **Status:** Open
- **Surfaced:** 2026-05-12 (pre-deploy perf sweep)
- **Pointer:** `frontend/next.config.ts` is empty. No `images.remotePatterns`, no bundle-analyzer hookup. Build currently produces a working artifact; adding hints could shave bundle size if Drei or framer-motion ship unused exports.
- **Why deferred:** Not a deploy blocker. The current build produces static-prerendered output that ships fine.
- **Effort:** ~1 hour. Run `@next/bundle-analyzer`, identify largest contributors, add `experimental.optimizePackageImports` for the offenders.

### Stale nested DB layout (`backend/prisma/prisma/dev.db`)
- **Status:** Open
- **Surfaced:** 2026-05-12 (pre-deploy investigation)
- **Pointer:** The dev SQLite file lives at `backend/prisma/prisma/dev.db` (note the double `prisma/`). This is because `DATABASE_URL=file:./prisma/dev.db` in `backend/.env` is resolved relative to the schema file's directory (`backend/prisma/`) by Prisma 5+, not the cwd. Prod will inherit the same quirk (`file:./prisma/production.db` → `backend/prisma/prisma/production.db`).
- **Why deferred:** Works correctly; the nesting is harmless once you know about it. Migrate the path on the next planned downtime if cosmetics matter. Document in CLAUDE.md so future contributors don't get confused.
- **Effort:** ~30 min. Either change `DATABASE_URL` to `file:dev.db` (relative to schema.prisma dir) and move the file, or just document the existing layout.

