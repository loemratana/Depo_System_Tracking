# Depot Tracking System — Detailed Features & Formulas

Technical reference for every feature module: what it does, the data it manages, business rules, and every calculation the system performs. Where a formula is already documented in more depth elsewhere, this file links to it instead of duplicating it.

---

## 1. Authentication & Sessions

- Login is protected by Arcjet (bot/rate-abuse detection) before credentials are checked.
- Passwords are hashed with `bcryptjs`; plaintext is never stored.
- On successful login, two JWTs are issued (`JWTConfig.generateTokenPair`, algorithm `HS256`):
  - **Access token** — short-lived (`JWT_ACCESS_EXPIRY`, default `7d`), embeds `{ userId, email, role, name, type: 'access' }`.
  - **Refresh token** — longer-lived (`JWT_REFRESH_EXPIRY`, default `30d`), embeds `{ ..., type: 'refresh', tokenId }`, and is persisted as a row in `refresh_tokens` so it can be revoked server-side.
- Every authenticated request re-fetches the user from the database (`authenticate()`) and rejects if `user.status !== 'active'` — a disabled account is locked out immediately, even with a still-valid token.
- `authorize(...roles)` gates actions by `UserRole` enum: `admin`, `manager`, `staff`, `viewer`.
- Password reset and email-verification tokens follow the same JWT pattern with their own `purpose` claim (`JWT_RESET_EXPIRY` = `1h`, `JWT_VERIFY_EXPIRY` = `24h`).

**No formula here** — this module is pass/fail (token valid or not), not calculated output.

---

## 2. User & Role Management (admin only)

- CRUD over system accounts (`username`, `role`, `status`, optional link to one `Employee`).
- Roles: `admin`, `manager`, `staff`, `viewer`. Status: `active`, `locked`.
- Bulk import: template download → file parsed and hashed row-by-row → per-row success/failure report.
- List pagination formula (reused across most list functions):

  ```
  page       = max(1, requestedPage)
  pageSize   = min(100, max(1, requestedPageSize))
  totalPages = ceil(totalCount / pageSize)
  ```

---

## 3. Employee Management

- Full profile: Khmer/English name, position, department, phone, email, address, gender, date of birth, hire date, salary, status (`active`/`inactive`), free-text remarks, profile image.
- One employee can be linked to one `User` account (login) and to many `Depot` records (as sale supervisor) and `Staff`/`KPI` rows.
- Depot roll-up functions return every depot an employee is responsible for, for the employee detail screen.
- Image upload/removal via memory-buffer storage → Cloudinary (or local disk fallback).
- Bulk workflow is **3-step**, not a single upload, so bad data never lands silently:
  1. **Template** — generate the expected Excel column layout.
  2. **Verify** — parse the uploaded file and return per-row validation results **without writing anything**.
  3. **Import** — commit the rows.
- Same pagination formula as §2.

---

## 4. Depot Directory

- Core record: name, code, address (house number/street/village/commune/district/province), phone, `status` enum, optional linked `Employee` (sale supervisor), `Manager`, `Brand`, owner sub-record (Khmer name, DOB, sex, ID number, `ownerPhotoUrl`), `expiryDate`, free-text `note`.
- **Depot status** (`DepotStatus` enum): `active`, `inactive`, `vacancy`, `expired`. Status is stored, not purely derived, but two read-time signals layer on top of it:

  ```
  isExpired      = expiryDate < today                     (past its licence/expiry date)
  isExpiringSoon = today ≤ expiryDate ≤ today + 30 days    (renewal window)
  ```

  Used by the summary/counts functions (`total`, `vacancy`, `active`, `expired`, `expiringSoon`) and by the depot PDF report builder, same 30-day window.
- **Bulk import pipeline** — the most guarded flow in the system, 3 stages:
  1. **Validate** — schema/shape validation only.
  2. **Verify** (file upload) — parses the Excel/CSV and dry-runs every row (duplicate code detection, lookups for province/district/brand/employee/manager) without writing.
  3. **Import** (from file, or from already-parsed JSON rows) — commits.
- A dedicated lookup returns depots with no assigned sale supervisor (`employeeId` is empty).
- Nested **staff** management: each depot can have multiple `Staff` records (name/email/phone) distinct from the single sale-supervisor `Employee` link — create/update/remove per depot.
- Owner photo upload/removal.
- Reporting: JSON payload for the UI, or PDF (Handlebars template + PDF renderer) / Excel export.
- Pagination formula differs slightly when no explicit paging is requested — it returns everything as a single page:

  ```
  effectivePageSize = pageSize ?? max(totalCount, 1)   // "no paging" = one big page
  totalPages         = max(1, ceil(totalCount / effectivePageSize))
  ```

---

## 5. Manager Directory

- Simple roster: `name`, `phone`, `photoUrl`. A `Manager` can be linked to many `Depot` records.
- Standard CRUD + image upload/removal (same Cloudinary/memory-storage pattern as Employee/Depot photos).

---

## 6. Brand Management

- `name`, `code`, `description`, `logoUrl`, `status` (`active`/`inactive`).
- Brand-level rollup: depot count, summary stats, list of depots carrying that brand.
- A `Brand` is the pivot for the KPI system's per-brand monthly tracking (§8) and optional brand-specific scorecard templates (`KpiPackAssignment`).

---

## 7. Geography — Provinces & Districts

- Two-level hierarchy: `Province` (`name`, `code`) → `District` (`name`, `code`, belongs to one province) → `Depot` (belongs to a district, and optionally directly to a province for reporting).
- Each has the same template/verify/import Excel bulk-load pattern used elsewhere, restricted to `.xlsx`/`.xls` files.

---

## 8. KPI System

Two layers exist side by side; see also **`KPI_ARCHITECTURE.md`** (table reference) and **`KPI_CALCULATION.md`** (full formula derivations with worked examples) for the canonical detail — summarized here.

### 8.1 Measure catalog

Every monthly fact is one row of **employee × depot × month × measure**:

| Code | UI name | Meaning | Unit |
|---|---|---|---|
| `PO_COUNT` | # PO | Purchase orders completed in the month | count |
| `PO_TARGET` | # Target | Monthly PO target | count |
| `PRODUCT_AVAILABLE_PCT` | % Available | Product availability | percent (0–100) |
| `VOLUME_DISPLAY_PCT` | % Volume Display | Shelf/volume display | percent (0–100) |

`% Available` and `% Volume Display` are **entered/imported values**, not derived from any stock table.

A parallel, manager-facing table stores one primary row per **depot × brand × month** (`poActual`, `poTarget`, `productAvailablePct`, `volumeDisplayPct`); it is mirrored into the measure catalog when the depot has an assigned sale supervisor, so legacy screens keep working.

### 8.2 Core formula — PO %

Used everywhere a PO % / KPI % is shown:

```
PO % = (# PO / # Target) × 100     if # Target > 0
PO % = 0                            otherwise
```

Rounded to 1 decimal place.

| # Target | # PO | PO % |
|---|---|---|
| 160 | 140 | 87.5% |
| 0 | 50 | 0% (no target) |
| 100 | 120 | 120% (above target) |

### 8.3 Ranking (employee roll-up over a date range)

| Column | Calculation |
|---|---|
| # Target | Σ `PO_TARGET` for that employee |
| # PO | Σ `PO_COUNT` for that employee |
| % Available | mean of `PRODUCT_AVAILABLE_PCT` rows |
| % Volume Display | mean of `VOLUME_DISPLAY_PCT` rows |
| PO % | `# PO / # Target × 100` |

**Status band:** `≥100` Excellent · `90–99` Good · `<90` Needs Improvement.
**Rank order:** higher PO % first; ties broken by higher # PO; rank = position after sort.

### 8.4 Scorecard (Excel-shaped view)

One row = one employee × one depot × one month (no summing across depots) — same PO % formula applied per-row.

### 8.5 Matrix (depot × product)

```
target per product = depot's monthly PO_TARGET sum / number of products with sales that month
cell % = (quantity sold / target per product) × 100      (capped at 999 for display)
```

### 8.6 Summary cards

- **Average PO %** — mean of PO % across employees with `# Target > 0`.
- **Top performer** — rank #1 name.
- **Employees assessed** — count of ranking rows.
- Internal-only counters: `# above target` (`PO % ≥ 100`), `# below threshold` (`PO % < 80`).

### 8.7 Import mapping

| Input field | Stored as |
|---|---|
| `po` | `PO_COUNT.actualValue` |
| `target` | `PO_TARGET.actualValue` + `targetValue` |
| `productAvailable` | `PRODUCT_AVAILABLE_PCT.actualValue` |
| `volumeDisplay` | `VOLUME_DISPLAY_PCT.actualValue` |

The legacy KPI table is updated in parallel so older screens/reports keep functioning.

---

## 9. Brand-Level Reporting & Analytics

Full derivation and worked examples live in **`ANALYTICS_DASHBOARD.md`**; summarized:

### 9.1 Monthly Total PO

```
Monthly Total PO = Σ poActual   over all depot×brand×month rows in the selected month (+ optional brand filter)
```

### 9.2 Avg Available % / Avg Display %

```
Avg X% = Σ (non-null X values) / count(rows where X is not null)
```
Rows missing the field are excluded from both numerator and denominator (never treated as 0). If no row has a value, the metric renders as "—".

### 9.3 On target / at risk / under (status bands)

```
PO % = poActual / poTarget × 100   (if poTarget > 0, else "missing")

On target : PO % ≥ 100
At risk   : 80 ≤ PO % < 100
Under     : PO % < 80
Missing   : no target set / cannot compute
```

Summary shows `onTarget / totalDepotRows`, e.g. `8/20`, with a breakdown of `under` vs `at risk` counts. Rows with a missing target still count toward the row total but not toward under/at-risk.

### 9.4 License risk

```
License risk = count(depots with expiryDate < today) + count(depots with status = "vacancy")
```
Scoped to the selected brand when a brand filter is applied. Independent of PO performance.

### 9.5 Brand monthly / yearly report

- **Monthly**: one row per depot × brand × month; `totalPo = Σ poActual`, `avgAvailable`/`avgDisplay` = mean of non-null values; rows are never merged across brands even if depot names match.
- **Yearly**: grouped by brand + depot across a year; `yearlyTotalPo = Σ monthly poActual`; yearly averages skip null months (e.g. Jan 92, Feb null, Mar 88 → yearly avg = (92+88)/2 = 90).

### 9.6 Brand dashboard summary

One row per brand for the selected month: `totalDepots` (assigned count), `totalPo` (Σ current-month `poActual`), `vacancy`/`expired` counts, `avgAvailable`/`avgVolumeDisplay` (current-month means).

> **Known limitation:** the brand-distribution function still queries `products` / `product_performances` tables for stock/quantity-sold figures. The Products domain was removed in a later migration, so this function will fail against the current schema until it is repointed at the depot×brand×month KPI table or retired.

---

## 10. Reports & Exports

- PDF generation: Handlebars template rendered to HTML, then converted via `puppeteer`/`pdfkit`.
- Excel generation: `exceljs` via `excel.exporter.js`.
- Depot report payload includes the `expiringSoon` 30-day-window count from §4.
- Report metadata (who generated it, parameters used, file path) is persisted, tied to the generating user.

---

## 11. Telegram Notifications

- Telegraf bot runs inside the same Node process, started after the HTTP server binds.
- A `node-cron`-driven scheduler pushes reports on a schedule.
- Report/Excel-building functions reuse the KPI/brand formulas above (no separate calculation logic).
- Delivery restricted to chat IDs in an allow-list (env var); admin settings control what gets sent where, plus a manual test-send function.

---

## 12. File Uploads & Media

- Two storage paths:
  - **Local disk** — profile photos and brand logos, served back statically.
  - **Cloudinary** — memory-buffer upload → cloud storage, folder chosen by type (`owner` | `manager` | `sale-supervisor` | `profile` | `brand`), gated on Cloudinary being configured; fails gracefully (clear error) if not.
- Depot/Employee/Manager image functions (§3–5) call into these same helpers rather than duplicating upload logic.

---

## 13. Platform Reliability & Monitoring

- Health check function: DB check (`SELECT 1` through Prisma) plus process uptime/memory/Node version; reports unhealthy if the database check fails.
- Prometheus metrics collection (`prom-client`), toggled by an env flag (on by default). Scraped by the Grafana/Prometheus/Loki stack alongside this app.
- Structured logging via Winston: JSON in production (for log aggregation), pretty-printed in development; optional file logging.
- Database pooling: connection pool sized differently in production vs. development, with SSL auto-enabled for hosted Postgres connection strings.

---

## System-wide conventions

- **Pagination** — the standard formula used across list functions (Users, Employees, and most others):
  ```
  page       = max(1, requestedPage)
  pageSize   = min(100, max(1, requestedPageSize))     // Depots caps at 1000, not 100
  totalPages = max(1, ceil(totalCount / pageSize))
  hasNext    = page * pageSize < totalCount
  hasPrev    = page > 1
  ```
- **Bulk import pattern** — every entity that supports Excel import (Users, Employees, Depots, Provinces, Districts, KPI brand-monthly/brand-targets) follows the same **template → verify (dry run) → import (commit)** three-step shape, so nothing is written to the database until a row has passed validation.
- **Role model** — `admin` / `manager` / `staff` / `viewer` (`UserRole` enum) is the single permission vocabulary used everywhere access is gated.
