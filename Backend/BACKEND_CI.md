# Backend CI

Continuous Integration for the Depot System Tracking **Backend** API.

## What is CI?

CI (Continuous Integration) is an automatic check that runs on GitHub when you push code or open a pull request. It installs dependencies, validates Prisma, checks syntax, runs tests, and audits packages so broken changes are caught before merge.

## Workflow files

| File | Role |
|------|------|
| `.github/workflows/backend-ci.yml` (repo root) | **Active** — GitHub Actions runs this |
| `Backend/.github/workflows/ci.yml` | Same pipeline for if Backend becomes its own Git repo |

This project is a monorepo (`Depo_System_Tracking`). GitHub only loads workflows from the **repository root** `.github/workflows/`.

## When it runs

- **Push** or **pull request** to `main`, `master`, or `develop`
- Only when files under `Backend/**` (or the workflow file) change
- Or manually: GitHub → **Actions** → **Backend CI** → **Run workflow**

If you push again while a run is in progress on the same branch, the older run is cancelled (`concurrency`).

## Pipeline steps

| Step | Command / action | Required? | Purpose |
|------|------------------|-----------|---------|
| Checkout | `actions/checkout` | Yes | Download the repository |
| Setup Node | Node.js **22** + npm cache | Yes | Runtime for install & scripts |
| Install | `npm ci` | Yes | Clean install from `package-lock.json` |
| Prisma validate | `npx prisma validate` | Yes | Schema is valid |
| Prisma generate | `npx prisma generate` | Yes | Generate Prisma Client |
| Syntax check | `node --check src/server.js` / `src/app.js` | Yes | Entry files parse without errors |
| Format | `npm run format:check` | Advisory | Prettier style check |
| Lint | `npm run lint` | Advisory | ESLint on `src/` |
| Test | `npm test` | Yes* | Jest (`--passWithNoTests` until tests exist) |
| Audit | `npm audit --omit=dev --audit-level=high` | Advisory | High+ production vulnerabilities |

\* Tests are required to *run*; with no test files yet, Jest exits successfully via `--passWithNoTests`.

### Environment in CI

Dummy values are used so Prisma validate/generate work **without** a live database or real secrets:

- `DATABASE_URL` / `DIRECT_URL` — placeholder Postgres URLs  
- `JWT_SECRET` / `JWT_REFRESH_SECRET` / `SESSION_SECRET` — CI placeholders  
- `ENABLE_ARCJET` / `ENABLE_RATE_LIMIT` — `false`

Do **not** put production secrets in the workflow file. Use GitHub **Secrets** only if a future job needs a real DB or API keys.

## Related Backend config

| File | Purpose |
|------|---------|
| `package.json` scripts | `lint`, `format`, `format:check`, `test`, `ci`, `prisma:*` |
| `eslint.config.js` | ESLint flat config for `src/**/*.js` |
| `.prettierrc.json` | Prettier formatting rules |
| `jest.config.js` | Jest test runner |

### Useful local commands

```bash
cd Backend

# Same core checks as CI (prisma + syntax + tests)
npm run ci

# Individual checks
npm run prisma:validate
npm run prisma:generate
npm run format:check
npm run lint
npm test
```

## Viewing results

1. Open the repo on GitHub  
2. Go to **Actions**  
3. Select **Backend CI**  
4. Open the latest run for logs and the job summary  

Green = required steps passed. Advisory steps (lint / format / audit) may warn without failing the workflow until you tighten them.

## Tightening later (optional)

When the codebase is ready:

1. Remove `continue-on-error: true` from lint, format, and/or audit  
2. Add real tests under `src/**/*.test.js` or `__tests__/`  
3. Add a Postgres service container if integration tests need a database  
4. Wire `DATABASE_URL` from GitHub Secrets for those jobs only  
