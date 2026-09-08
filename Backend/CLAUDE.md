# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository layout

This directory (`Backend`) is one folder inside a larger monorepo checkout (`D:\Project\Depo_System_Tracking`, the actual git root) that also contains `depo-system-frontend/` and `monitoring/` (Prometheus/Grafana/Loki stack, see `../monitoring/`). Treat `Backend` as the working root for this API; changes to `../monitoring/**` affect the shared observability stack, not this app's code.

## Commands

```bash
npm run dev                    # nodemon src/server.js (local dev)
npm start                      # node src/server.js (production)
npm test                       # jest --passWithNoTests --forceExit
npx jest path/to/file.test.js  # run a single test file
npm run lint                   # eslint src --ext .js --max-warnings=50
npm run format                 # prettier --write src + prisma
npm run format:check
npm run ci                     # prisma validate + generate, syntax-check server.js, test (mirrors CI)

npm run prisma:validate
npm run prisma:generate
npm run prisma:migrate:status
npm run prisma:migrate:deploy          # applies migrations against DIRECT_URL (never `prisma db push` in prod)
npm run prisma:migrate:deploy:prod     # same, loaded against .env.production via scripts/run-with-env.js
npm run seed                           # node prisma/seed.js
```

There is no test suite of significant size yet (`--passWithNoTests`); Jest looks for `**/__tests__/**/*.test.js` or `*.test.js`/`*.spec.js` anywhere under the project.

CI (`.github/workflows/ci.yml` — note: this describes the workflow to use if Backend ever becomes its own repo; in the current monorepo the root `.github/workflows/backend-ci.yml` runs instead) runs: `prisma validate` → `prisma generate` → syntax-check `server.js`/`app.js` → format check (advisory) → lint (advisory) → `npm test` (required) → `npm audit` (advisory). Node 22 is the target runtime.

## Architecture

Express 5 + Prisma 7 (Postgres via Supabase) ESM backend. Entry point is `src/server.js`, which wraps `src/app.js` (the actual Express app) in a `Server` class that connects the DB, starts HTTP listening, starts the in-process Telegram bot, and wires graceful shutdown on `SIGINT`/`SIGTERM`. `app.js` is not started when `NODE_ENV=test`.

**Request flow**: `routes/*Routes.js` → `middleware/auth.js` (`authenticate`/`authorize`) + `validators/*Validator.js` (express-validator) → `controllers/*Controller.js` → `services/*Service.js` (business logic + Prisma calls) → Prisma client from `config/db.js`.

**Database (`src/config/db.js`)**: a singleton `Database` class wraps a `pg.Pool` + `PrismaPg` adapter (Prisma 7 requires an explicit driver adapter, no direct URL-only client). Import `{ prisma }` from `config/db.js` everywhere rather than instantiating `PrismaClient` directly. `DATABASE_URL` is the pooled connection (Supabase port 6543) used at runtime; `DIRECT_URL` (port 5432) is used only for migrations (`prisma.config.js` prefers `DIRECT_URL`, falling back to `DATABASE_URL`). SSL is auto-enabled when the URL contains `supabase`/`render`/`pooler` or in production.

**Auth**: JWT access/refresh tokens (`config/jwt.js`, `HS256`, distinct secrets for access vs refresh, embeds a `type` claim checked on verify) plus `RefreshToken` rows in Postgres for revocation. `middleware/auth.js#authenticate` reads the `Authorization: Bearer` header (or `accessToken` cookie via `extractToken`), verifies the token, then re-fetches the user from the DB on every request (checks `status === 'active'`). `authorize(...roles)` gates by `UserRole` enum (`admin`, `manager`, `staff`, `viewer`).

**Domain model (`prisma/schema.prisma`)**: Province → District → Depot hierarchy; a Depot belongs to an optional Employee, Manager, and Brand. Employees can have a linked User account (1:1) for login.

**KPI system is dynamic, not hardcoded** (see `KPI_ARCHITECTURE.md`): `KpiDefinition` (measure catalog, e.g. `PO_COUNT`) + `KpiValue` (monthly fact: employee × depot × brand × period) + `KpiPack`/`KpiPackItem` (scorecard templates with weights) + `KpiPackAssignment` (per-brand/department packs) + `ImportBatch` (Excel/JSON import audit trail). The legacy `EmployeeKPI` table is still written alongside `KpiValue` on import/target-set so older screens keep working — don't remove writes to it without checking `kpiSystemService.js`/`kpiCatalog.js` callers. `BrandDepotMonthKpi` is a separate per-brand monthly rollup (PO actual/target, product availability %, volume display %) used by `brandMonthlyKpiService.js`. KPI endpoints live under `/api/v1/kpis` (`kpiSystemRoutes.js`/`kpiSystemController.js`), distinct from the older `kpiController.js`/`kpiCatalog.js`.

**Products were removed** — migration `20260807140000_remove_products` dropped that domain. `enpoint.md` at the repo root still documents old `/api/products` and `/api/kpi-targets` routes; it is stale and should not be trusted for current route shapes. Check `src/routes/*.js` directly instead.

**Routing base path**: all API routes are mounted under `/api/v1/*` in `app.js` (auth, provinces, districts, employees, upload, depots, report, brands, kpis, users, telegram, managers). `/health` and `/metrics` (Prometheus, `middleware/metrics.js`, gated by `METRICS_ENABLED`) are unversioned. Uploaded files are served statically from `/uploads` (also has permissive CORS headers applied separately from the main `corsOptions`).

**File uploads**: two paths exist — `config/multer.js` (`uploadImageMemory`, memory storage, used for owner/manager photos uploaded to Cloudinary via `config/cloudinary.js`) and ad-hoc `multer.memoryStorage()` instances defined inline in route files (e.g. `depotRoutes.js`) for spreadsheet import (`.csv`/`.xlsx`/`.xls`) with custom `fileFilter`/error handling.

**Reporting/exports**: `services/report/` (dashboard + report service) drives `exporters/{excel,pdf}.exporter.js` (extending `base.exporter.js`) and Handlebars templates in `src/templates/` (`depot-report.hbs` + `partials/`) for PDF generation via `pdfkit`/`puppeteer`.

**Telegram bot** (`services/telegram/`): runs inside the same Node process, started from `server.js` after the HTTP server binds. Split into `telegram.service.js` (Telegraf setup + one-chat-at-a-time send: `sendMessageToChat`/`sendDocumentToChat`/`sendReportPackageToChat` — there is no broadcast method), `telegram.auth.js` (`chatAuthMiddleware` — the single inbound authorization point, see below), `telegram.commands.js`, `telegram.keyboards.js`, `telegram.reports.js`/`telegram.excel.js`/`telegram.alert-reports.js` (report generation/formatting, all brand-scoped via a required `brandId`), and `telegram.scheduler.js` (node-cron jobs, one brand-scoped package built and sent per brand per tick).

**Brand ↔ Telegram chat routing**: the `telegram_chats` table (`TelegramChat` model: `chatId` unique, `brandId`, `isActive`) is the *only* source of truth for which chat(s) a brand's reports go to — a brand may have zero, one, or several active chats; a chat belongs to exactly one brand. Admin-managed via `GET/POST/PATCH/DELETE /api/v1/telegram/chats(/:id)` and `POST /api/v1/telegram/chats/:id/test` (`telegramChatService.js`, `telegramChatController.js`). Depots with `brandId = null` are excluded from every brand report (no fallback chat). Inbound commands/callbacks all pass through `chatAuthMiddleware` (registered via `bot.use(...)` in `telegram.commands.js`), which resolves `ctx.chat.id` → `TelegramChat` and denies (identical message either way) if the chat is unregistered or inactive; on success it sets `ctx.state.brandId`, which is the only thing report handlers use for scoping — never trust brand info from command arguments. The legacy `ALLOWED_CHAT_IDS` env var is retired and read by no runtime code (kept only as a historical note).

**Arcjet** (bot/abuse protection): config in `config/arject.js` + `lib/arcjet.js`, applied via `middleware/arcjet.js` and `services/arjectService/{api,auth,sensitive}.js`, gated by `ENABLE_ARCJET`. Off by default in dev/CI.

**Sessions/cache**: Upstash Redis (REST API, not TCP) via `config/upstash.js`, used by `middleware/sessionStore.js` and `middleware/cacheMiddleware.js` when configured; optional.

**Logging**: Winston (`config/logger.js`) — `LOG_FORMAT=json` in production for Loki ingestion, `LOG_TO_FILE` writes under `Backend/logs/` for Promtail. Morgan streams HTTP logs through the same Winston stream.

## Environment

Copy `.env.example` to `.env`. Key vars: `DATABASE_URL`/`DIRECT_URL` (Supabase pooled vs direct), `JWT_SECRET`/`JWT_REFRESH_SECRET`, `SESSION_SECRET`, `ENABLE_ARCJET`/`ARCJET_KEY`, `UPSTASH_REDIS_REST_URL`/`TOKEN`, `TELEGRAM_BOT_TOKEN` (chat routing lives in the `telegram_chats` table, not an env var — see above), `CLOUDINARY_*`. `config/env.js` and `prisma.config.js` both load `.env.local` first, then `.env` (local overrides win); `prisma.config.js` additionally honors `PRISMA_ENV_FILE` (used by `scripts/run-with-env.js` to target `.env.production` exclusively for prod migration commands).

## Deployment

Backend runs on Render, Postgres on Supabase, Redis on Upstash, frontend on Vercel (proxies `/api/*` and `/uploads/*` to the Render URL). Production migrations always use `prisma migrate deploy` against `DIRECT_URL`, never `prisma db push`. See `DEPLOYMENT_INFRASTRUCTURE.md`, `MIGRATE_PRODUCTION.md`, and `PRODUCTION_PERFORMANCE.md` for details beyond this summary.
