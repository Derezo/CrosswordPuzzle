# Deployment

This project deploys via `lsd`, the Lifestream Dynamics deploy CLI.
See `~/Projects/lifestream-deploy` for the tool source and docs.

## Layout

Two services, one `deploy.yaml` each:

- `backend/deploy.yaml`  — Express + Prisma API on port 5001
  (`crossword-backend` → `https://api.crossword.mittonvillage.com`)
- `frontend/deploy.yaml` — Next.js 15 site on port 3001
  (`crossword-frontend` → `https://crossword.mittonvillage.com`)

## Common commands

```bash
# From the repo root (or pass --app-path):
lsd deploy crossword-backend
lsd deploy crossword-frontend

# Dry run (no remote writes) — use this before the first real deploy:
lsd deploy crossword-backend --dry-run
lsd deploy crossword-frontend --dry-run

# Rollback to the previous release:
lsd rollback crossword-backend
lsd rollback crossword-frontend

# Service status, ledger, doctor:
lsd status crossword-backend
lsd ledger
lsd doctor
```

## First-time secrets setup

Both deploy.yaml files declare their required secrets under `secrets.lsd_vault.keys`.
Populate each one via:

```bash
lsd secrets set crossword-backend JWT_SECRET
lsd secrets set crossword-backend SESSION_SECRET
lsd secrets set crossword-backend PUZZLE_SECRET
lsd secrets set crossword-backend GOOGLE_CLIENT_ID
lsd secrets set crossword-backend GOOGLE_CLIENT_SECRET
lsd secrets set crossword-backend DATABASE_URL
lsd secrets set crossword-backend FRONTEND_URL

lsd secrets set crossword-frontend NEXT_PUBLIC_API_URL
```

A deploy will refuse to start if a declared key is missing — that's intentional.
