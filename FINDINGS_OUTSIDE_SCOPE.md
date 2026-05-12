# Findings Outside Scope

Items surfaced during the 2026-05 remediation pass that were intentionally
deferred. Each entry has: title, status, surface date, pointer/reproducer,
why deferred, effort estimate, file references.

When a follow-up plan closes an item, **delete the entry** — git history is
the audit trail.

---

## Open

### Backend `tsconfig` strict mode + remove `any` types
- **Status:** Open
- **Surfaced:** 2026-05-12 (Phase 5 of remediation)
- **Pointer:** `backend/tsconfig.json` has `"strict": false`. `rg "\bany\b" backend/src --type ts` returns 145 hits across ~30 files.
- **Why deferred:** Flipping strict mode produces 30–50 files of cascading type errors, each requiring case-by-case fix. Belongs in its own focused plan with subagent fan-out per directory.
- **Effort:** ~1 day (1 agent per route file).
- **Hot spots:** `routes/puzzle.ts` (highest density), `routes/categories.ts`, `services/achievement/achievementService.ts`.

### Pre-existing Prisma migration drift
- **Status:** Open
- **Surfaced:** 2026-05-12 (Phase 1 of remediation)
- **Pointer:** `cd backend && npx prisma migrate dev` reports `user_favorite_categories` table + `userId_categoryId` unique index were added to the database without a corresponding migration file (someone ran `db push` instead of `migrate create`).
- **Why deferred:** Resolving the drift requires either rolling the live schema back and re-applying, or hand-crafting a migration file that captures the drift. Either way it's a one-shot fix that's orthogonal to the remediation plan.
- **Effort:** ~30 min (hand-craft migration `20260512100200_resolve_user_favorite_categories_drift` mirroring what the live DB already has, then `prisma migrate resolve --applied`).
- **File:** `backend/prisma/schema.prisma:147-159` (the existing `UserFavoriteCategory` model).

### Stale dev scripts reference deleted Docker/env files
- **Status:** Open
- **Surfaced:** 2026-05-12 (Phase 3 of remediation)
- **Pointer:** `scripts/dev-setup.sh`, `scripts/dev.sh`, `scripts/dev-utils.sh`, `scripts/production-deploy.sh` reference `docker-compose.yml` and root-level `.env.development` / `.env.production` / `.env.staging`, all of which were deleted in the deploy migration.
- **Why deferred:** Out of scope for the lsd migration (which handled production only). These scripts cover the local dev environment.
- **Effort:** ~1 hour (delete the scripts that depended on docker-compose, update the others to point at `backend/.env` / `frontend/.env.local`).
- **Files:** `scripts/dev-setup.sh`, `scripts/dev.sh`, `scripts/dev-utils.sh`, `scripts/production-deploy.sh`, `.github/workflows/deploy.yml`.

### `.github/workflows/deploy.yml` references retired env files
- **Status:** Open
- **Surfaced:** 2026-05-12 (Phase 3 of remediation)
- **Pointer:** The workflow loads `.env.production` and `.env.staging` from the repo root; both files were removed in the lsd migration.
- **Why deferred:** CI workflow rewrite is its own piece of work; ideally CI should call `lsd deploy --dry-run` rather than re-implementing the deploy.
- **Effort:** ~1 hour (replace deploy step with `lsd deploy crossword-{backend,frontend}` invocation; ensure CI runner has the lsd binary).

### Backend lint missing
- **Status:** Open
- **Surfaced:** 2026-05-12 (Phase 3 of remediation)
- **Pointer:** `backend/package.json` has no `lint` script; the lsd preflight hook in `backend/deploy.yaml` has a TODO comment for it.
- **Why deferred:** Adding ESLint requires picking and configuring a rule set; the test infrastructure work (Phase 4) was higher priority.
- **Effort:** ~2 hours (install `eslint`, `@typescript-eslint/eslint-plugin`, write `.eslintrc`, fix the resulting findings).

### Frontend testing not yet wired
- **Status:** Open
- **Surfaced:** 2026-05-12 (Phase 4 of remediation — deferred per user decision)
- **Pointer:** `frontend/` has no Vitest config, no `*.test.tsx` files. `CrosswordGrid`, `AuthContext`, and `puzzle/page.tsx` would benefit most.
- **Why deferred:** Explicit user choice to scope Phase 4 to backend only.
- **Effort:** ~4 hours (install vitest + React Testing Library + jsdom, add jest-dom, write first 10 component tests).

### Frontend `no-unsafe-*` ESLint rules disabled
- **Status:** Open
- **Surfaced:** 2026-05-12 (Phase 6 of remediation)
- **Pointer:** `frontend/eslint.config.mjs` keeps `@typescript-eslint/no-unsafe-*` rules off because they require type-checked linting via `parserOptions.project`, which the Next.js base config doesn't enable. Enabling crashes ESLint.
- **Why deferred:** Requires reworking the ESLint setup to use `typescript-eslint` with project references; bigger config change than the Phase 6 scope.
- **Effort:** ~2 hours.
- **Files:** `frontend/eslint.config.mjs:24-30`, `frontend/tsconfig.json`.

### Categories endpoint still has loose `any[]` cache
- **Status:** Open
- **Surfaced:** 2026-05-12 (Phase 5 of remediation)
- **Pointer:** `backend/src/routes/categories.ts:15` `let categoriesCache: any[] = []` — should be a strongly-typed `Category[]` once the route's response shape is defined.
- **Why deferred:** Same root cause as the strict-mode item above. Tackle together.
