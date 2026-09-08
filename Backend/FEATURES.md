# Features

Overview of backend features by module. All routes are mounted under `/api/v1` in `src/app.js` unless noted. Most routes require JWT auth (`authenticate` middleware); admin-only routes are marked.

## 1. Authentication (`/auth`)
- Login (Arcjet bot/abuse protection), JWT access + refresh token pair, logout, refresh
- `GET/PUT /me` — view/update own profile
- Change password
- No public self-registration — accounts are provisioned by admins via `/users`

## 2. User Management (`/users`) — admin only
- CRUD on system accounts (roles: `admin`, `manager`, `staff`, `viewer`)
- Bulk import via Excel template (`/template` download, `/bulk/import` upload)

## 3. Employees (`/employees`)
- CRUD, department listing
- Per-employee depot assignments (`/:id/depots`, `/:id/depots-count`, `/:id/summary-depots`)
- Profile image upload/removal
- Bulk import: template download → verify file → import (staged 3-step flow)

## 4. Depots (`/depots`)
- CRUD, counts, summary stats, "unassigned" depot lookup
- Owner photo upload/removal
- Nested staff management per depot (`/:id/staffs` CRUD)
- Bulk import: validate → verify (dry-run) → bulk-import (file) / bulk-import-json
- Excel/PDF report export (`/report`, `/export`)

## 5. Managers (`/managers`)
- CRUD for depot managers, photo upload/removal (linked to `Depot.managerId`)

## 6. Brands (`/brands`)
- CRUD, per-brand summary, depot counts, depots-by-brand lookup

## 7. Geography (`/provinces`, `/districts`)
- CRUD for both, each with its own Excel bulk-import pipeline (template/verify/import)

## 8. KPI System — two parallel layers

### Dashboard/analytics (`/kpis` → `kpiController.js`, legacy-oriented)
- `dashboard`, `dashboard-brand`, `dashboard-insights`, `assignment-trend`, `brand-distribution`, `brand-monthly`, `brand-yearly` report endpoints

### Dynamic KPI engine (`/kpis` → `kpiSystemController.js`, see `KPI_ARCHITECTURE.md`)
- `KpiDefinition` catalog (`/definitions`), `/options` filter metadata
- Rankings (`GET /`) and `/summary` cards
- Brand-monthly KPIs (PO actual/target, product availability %, volume display %): list, upsert, template download, Excel import, export
- Brand targets: set, template, Excel import
- `/seed-catalog` to bootstrap default KPI definitions

## 9. Reports (`/report`)
- Report generation service backing PDF (pdfkit/Puppeteer + Handlebars templates) and Excel exports (`src/exporters/`)

## 10. Telegram Bot (`/telegram`, admin-only; bot runs in-process)
- `/settings` get/update (which reports run at all), `/test/:reportId` (send one report to one registered chat)
- `/chats` CRUD (`GET/POST/PATCH/DELETE /telegram/chats(/:id)`, `POST /telegram/chats/:id/test`) — assigns a Telegram chat to a Brand; one brand can have multiple chats, one chat belongs to one brand
- Every report is generated scoped to a single brand and sent only to that brand's active chat(s) — no cross-brand broadcast. Inbound commands/buttons are authorized against the same `telegram_chats` table (unregistered/inactive chats are denied)
- Behind the scenes: Telegraf bot with command handlers, keyboards, scheduled reports via node-cron (one brand-scoped send per brand per tick)

## 11. File Upload (`/upload`)
- Local disk upload: profile photos, brand logos
- Cloudinary upload (`/cloudinary`) with type-based folder routing (owner/manager/sale-supervisor/profile/brand), gated on Cloudinary being configured

## Cross-cutting infrastructure
- **Security**: Helmet, CORS (allowlisted origins), optional Arcjet bot/rate protection, optional express-rate-limit, JWT auth on nearly every route
- **Observability**: Prometheus `/metrics`, `/health` DB health check, Winston logging (JSON in prod for Loki), Grafana dashboards in `../monitoring/`
- **Data layer**: Prisma 7 + Postgres (Supabase), pooled vs. direct connection URLs, Upstash Redis for sessions/cache (optional)
