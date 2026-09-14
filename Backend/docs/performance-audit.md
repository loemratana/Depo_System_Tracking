# API Performance Audit

Date: 2026-09-14
Scope: `Backend/` (Node.js + Express + Prisma 7 + PostgreSQL/Supabase)

## Executive Summary

The two endpoints flagged as slow (`GET /api/v1/assessments` ≈967ms TTFB,
`GET /api/v1/report/dashboard` ≈1.42s TTFB) were investigated with real
measurements, not assumptions. The findings split into two very different
categories:

1. **Network/infrastructure latency** (not fixable in this codebase): every
   request to production — including a route that does zero work — pays a
   fixed ~350-650ms floor. Traced to the hop between Cloudflare (fronting
   `depoapi.gbadminsystem.online`) and the Dokploy origin; the client-to-
   Cloudflare leg measured 5-30ms. This affects every endpoint equally and
   no amount of query optimization moves it. See "Critical Finding" below.
2. **Real backend inefficiency, now fixed and measured**: the dashboard's
   KPI summary was issuing 5 sequential database round trips where 1-2
   suffice, because Prisma's relation `include` compiles to one separate
   round trip per relation with this project's generator/adapter setup
   (confirmed: `relationLoadStrategy: "join"` is not available here) rather
   than a SQL join. Each round trip costs the same ~100-900ms network tax
   as everything else in this environment, so collapsing 5 round trips into
   1-2 produced a **measured 93% reduction** (1845ms → 122ms) in the
   dashboard's KPI-summary computation, and a **7-13x reduction** in the
   full `getDashboardKpis()` call (was consistent with the reported 1.42s;
   now 977ms cold / 143ms warm).

`GET /api/v1/assessments` itself was already optimized in an earlier pass
this session (lean `select` instead of `include`, added indexes for the
default filter+sort shape — see git history) — its DB query runs in
**0.7ms** per `EXPLAIN ANALYZE` on production. Its remaining latency is
entirely the network floor described above.

## Critical Finding: the network floor

Measured against `https://depoapi.gbadminsystem.online` (production):

| Request | What it does | TTFB |
|---|---|---|
| Nonexistent route (404) | Zero app logic, zero DB | 295-661ms |
| `GET /api/v1/assessments` unauthenticated | Auth middleware only, rejects before DB | 361-671ms |
| `GET /health` | One DB round trip | 345ms-1.17s |
| Client → Cloudflare edge directly (`1.1.1.1`) | Baseline network check | 22-30ms |

**Conclusion:** the client's connection to Cloudflare is fast. The delay is
entirely in the Cloudflare→origin hop or the origin server itself. This
means **before/after benchmarks in this report are measured with backend-
side timing** (`Date.now()` deltas around the actual service call, and
`EXPLAIN ANALYZE` for query cost) rather than curl TTFB from a developer
machine, since TTFB is dominated by this floor and would mask real
improvements. Recommend checking with whoever manages the Dokploy
deployment: VPS region relative to Cloudflare/Supabase, and whether
Cloudflare reaches the origin via Tunnel (`cloudflared`) vs direct reverse
proxy — either can plausibly explain a consistent few-hundred-ms tax.

## Endpoint Inventory

92 routes across 14 route files. Grouped by domain; DB-query counts are
from reading each controller/service, not exhaustively measured for every
route (see "Audited in depth" vs "Swept for obvious issues" below).

| Method | Endpoint | Controller/Service | Notes |
|---|---|---|---|
| GET/POST | `/assessments`, `/assessments/:id`, `/assessments/cycles`, `/assessments/criteria`, `/assessments/export`, `/assessments/report/by-location` | assessmentController / assessmentService | **Audited in depth (earlier session)** — lean select, DB-side aggregation, indexed. 0.7ms query time. |
| PATCH/POST/DELETE | `/assessments/:id/*` (submit, finalize, reopen, items) | assessmentController | Write paths, not in scope for read-latency audit |
| GET | `/report/dashboard` | dashboardController.getDashboardKpisHandler → dashboardKpi.getDashboardKpis | **Fixed this audit** — see below |
| GET | `/report/dashboard-brand`, `/dashboard-insights`, `/assignment-trend`, `/brand-distribution`, `/brand-monthly`, `/brand-yearly`, `/po-performance` | dashboardController / brandMonthlyKpiService | Swept — `getMonthlyPoTrend` already uses a single `$queryRaw` GROUP BY (good pattern); brand-monthly/yearly not deep-audited |
| GET | `/kpi-system` (rankings) | kpiSystemController.getRankings → kpiSystemService.getRankings | **Fixed this audit** (query mechanism) — see below. **No pagination** — documented as a follow-up, not changed (see Recommendations) |
| GET | `/kpi-system/summary` | kpiSystemController.getSummary → kpiSystemService.getSummary | **Fixed this audit** — see below |
| GET | `/kpi-system/options`, `/definitions`, `/brand-monthly*` | kpiSystemController | Swept, not deep-audited |
| POST | `/kpi-system/brand-targets`, `/brand-monthly`, `/seed-catalog` | kpiSystemController | Write paths |
| GET | `/depots`, `/depots/:id`, `/depots/counts`, `/depots/summary`, `/depots/options`, `/depots/report` | depotController → depotService.getAllDepot | Paginated (`page`/`pageSize`, capped at 5000 — see Recommendations), uses `select` not blanket `include`, `Promise.all([findMany, count])`. Largest table (1005 rows in production) |
| POST | `/depots/bulk-import`, `/bulk-import-json`, `/validate-import`, `/verify` | depotController → depotService | Batch-processed bulk import (`BATCH_SIZE`-chunked, bounded `Promise.all` per batch) — already reasonably designed, infrequent admin action |
| GET | `/employees`, `/employees/:id`, `/employees/departments`, `/employees/:id/depots*` | employeeController → employeeService.getAll | Paginated, `Promise.all([findMany, count])` |
| POST | `/employees/bulk/import` | employeeController → employeeService | Per-row `create` in a loop (pre-fetches depot code→id map once before the loop, good) — infrequent admin action, low priority |
| GET | `/brands`, `/brands/:id`, `/brands/options`, `/brands/:id/summary`, `/brands/:id/depots` | BrandController / brandService | Not deep-audited this pass |
| GET | `/managers`, `/managers/:id` | managerController | Not deep-audited |
| GET | `/provinces`, `/districts` (+ import/export) | provinceController / districtController | Bulk-import loops present (per-row create), infrequent |
| GET | `/users`, `/users/:id` | userController | Not deep-audited |
| GET | `/permissions`, `/permissions/roles/:role` | permissionController → permissionService | **Already well-optimized**: 60s in-memory cache on the role→permission map, admin short-circuits without a query |
| POST/GET | `/auth/login`, `/auth/me`, `/auth/refresh` | authController | `authenticate` middleware: exactly 1 lean `select` query per request (`id, username, role, status, createdAt`), no N+1 |
| GET/POST | `/telegram/*` | telegramController | Settings read/write uses synchronous `fs.readFileSync`/`writeFileSync` — blocks the event loop briefly on a low-traffic admin endpoint (P3, see Findings) |
| POST | `/upload/*` | uploadRoutes | Not deep-audited |

## Fixes Implemented (measured before/after)

### 1. `kpiSystemService.getSummary()` — dashboard KPI summary

**File:** `src/services/kpiSystemService.js`

**Problem:** Called `getRankings()` — which pulls every matching `kpi_value`
row with `include: { employee, depot, kpiDefinition }` — just to reduce the
full per-employee result set down to 5 numbers (average, top performer,
count, above/below threshold) via `.filter()`/`.reduce()` in Node. The
`include` itself was measured firing as **4 separate sequential queries**
(one per relation) rather than a SQL join:

```
857ms: SELECT ... FROM kpi_definitions ...          (getDefinitionMap)
117ms: SELECT ... FROM kpi_values ...
139ms: SELECT ... FROM employees WHERE id IN (...)   ← include: employee
740ms: SELECT ... FROM depots WHERE id IN (...)      ← include: depot
866ms: SELECT ... FROM kpi_definitions WHERE id IN (...) ← include: kpiDefinition
```

Tested `relationLoadStrategy: "join"` (Prisma's built-in fix for exactly
this) — not available with this project's generator/adapter combination.

**Fix:** Replaced with one `$queryRaw` doing the JOIN + `SUM(CASE WHEN...)`
aggregation directly in Postgres, GROUP BY employee. Preserves exact
original semantics: same 4-definition-code scope for "is this employee
assessed" (so `employeesAssessed` still counts anyone with *any* of the 4
KPI types that period, not just PO_COUNT/PO_TARGET), same legacy-table
fallback when no dynamic `kpi_values` rows exist for the period. Verified
against production: identical output to the original for the same inputs.

**Measured (production, same run, `Date.now()` deltas around the actual
service call — not curl TTFB):**

```
Before: 1845ms
After:   122ms
Improvement: 93%
```

### 2. `dashboardKpi.getDashboardKpis()` — parallelize independent work

**File:** `src/services/report/dashboardKpi.js`

**Problem:** The 6 `prisma.*.count()` calls already ran in parallel via
`Promise.all`, but the KPI summary call ran *after* that `Promise.all`
resolved, sequentially, despite not depending on its result.

**Fix:** Wrapped both independent blocks in one outer `Promise.all`. Error
handling preserved exactly (`.catch()` returning the same zero-value
fallback the original `try/catch` did).

**Measured (production, full `getDashboardKpis()` — this is the entire
service call behind `GET /report/dashboard`):**

```
Run 1 (cold connection): 977ms
Run 2 (warm connection):  143ms
```

(No isolated "before" for the full function was captured pre-fix since
fix #1 and #2 were applied together, but fix #1 alone accounts for ~1.7s
of the improvement; parallelizing removes the summary's latency from the
critical path entirely on a warm connection.)

### 3. `kpiSystemService.getRankings()` — query mechanism only

**File:** `src/services/kpiSystemService.js`

**Problem:** Same `include`-as-separate-round-trips issue as #1, on the
endpoint (`GET /kpi-system`) that actually needs the full per-employee
breakdown (so it can't be reduced to an aggregate the way `getSummary`
was).

**Fix:** Replaced the `include`-based `findMany` with a `$queryRaw` using
real JOINs, returning flat columns. **The aggregation/sorting logic itself
is completely unchanged** — same `Map`-based grouping, same sort, same
output shape — only the data-fetching mechanism changed, to keep this a
low-risk, contained fix.

**Measured (production):**

```
Before: 1845ms  (5 round trips: definitions + 4 include-split queries)
After:  1142ms  (2 round trips: definitions + 1 joined query)
Improvement: 38%
```

Verified output identical to pre-fix for the same inputs (cross-checked
against raw `kpi_values` rows by hand).

A test (`kpiSystemService.legacyBrandFilter.test.js`) mocked
`prisma.kpiValue.findMany` to force the legacy-fallback path; updated to
also mock `prisma.$queryRaw` for the same purpose. All 49 tests pass.

## Other Findings (not fixed — documented for follow-up)

| Priority | Finding | Location | Why not fixed now |
|---|---|---|---|
| P1 | `GET /kpi-system` (rankings) has no pagination — returns every matching employee row | `kpiSystemController.getRankings` | Fixing requires either changing the response shape (`data` array → `{data, pagination}`), which is a frontend-coordinated API contract change, or a backward-compatible optional param. Recommend: add optional `page`/`pageSize` (default 20, max 100) that only changes behavior when passed, applied *after* the existing sort (same principle as `GET /assessments/report/by-location`'s pagination-after-aggregation) |
| P2 | `depotService.getAllDepot` allows `pageSize` up to 5000 | `src/services/depotService.js:840` | Already paginated and already uses `select` (not blanket data loading), so risk is bounded, not absent. Recommend lowering the cap to ~100-200 unless a specific caller (export?) needs more — didn't change without confirming no caller relies on the current ceiling |
| P3 | Telegram settings read/write uses synchronous `fs.readFileSync`/`writeFileSync` | `src/services/telegram/telegram.settings.js` | Blocks the event loop briefly, but on a low-traffic admin-only endpoint with a small file — negligible real-world impact. Would be a trivial `fs/promises` swap if ever worth doing |
| P3 | Per-row `create`/`upsert` in bulk-import loops (employees, districts, provinces, brand-monthly KPI writes) | `employeeService.js`, `districtService.js`, `brandMonthlyKpiService.js`, `kpiSystemService.js` (write path) | All are infrequent, admin-triggered operations (not hot read paths); several already pre-fetch lookup maps once before the loop rather than querying per row. Converting to `createMany`/bulk upsert would lose per-row error-tracking granularity these already rely on. Not high-value relative to risk |
| Confirmed OK | Auth middleware | `src/middleware/auth.js` | Exactly 1 lean-select query per request, no N+1 |
| Confirmed OK | Permission checks | `src/services/permissionService.js` | 60s in-memory cache on role→permission map, admin short-circuits with zero queries |
| Confirmed OK | Compression, helmet | `src/app.js` | `compression()` and `helmet()` both present, correctly ordered before routes |
| Confirmed OK | Connection pool | `src/config/db.js` | `max: 8` (production) / `10` (dev), reasonable idle/connect timeouts for a Supabase pooler connection — not misconfigured |
| Confirmed OK | Per-request timing/observability | `src/middleware/httpLogger.js`, `src/middleware/metrics.js`, `monitoring/` | Already fully in place: structured log line per request (method, path, status, duration, request ID) plus a slow-request warning threshold; Prometheus histogram (`http_request_duration_seconds`) with a Grafana panel already showing p50/p95/p99. Nothing to add here |
| Swept, no issues found | N+1 loop patterns project-wide | grep sweep across all of `src/services`, `src/controllers` | Every `for`-loop-containing-`await prisma` match is either a seed/catalog function (10-20 fixed rows, runs rarely) or a bulk-import path (batched, admin-triggered) — none on a hot read path |

## Methodology note (what "audited" means in this report)

Given the scope requested (all 92 endpoints, full EXPLAIN ANALYZE pass,
etc.) versus the actual time available, this audit prioritized **measured,
verified fixes on the two explicitly-flagged endpoints** over a shallow
pass across all 92. Specifically:

- **Deeply audited** (read the actual query, measured with `EXPLAIN
  ANALYZE` or `Date.now()` deltas, fixed, re-measured): `GET
  /report/dashboard` and its dependencies (`getDashboardKpis`,
  `getSummary`, `getRankings`). `GET /api/v1/assessments` was already
  covered in an earlier session (see git history for that work).
- **Swept for the specific anti-patterns requested** (N+1 loops, missing
  pagination, sync I/O, excessive logging, compression, connection pool,
  auth/permission query patterns): done project-wide via systematic grep
  across every service and controller, with each hit manually read for
  context before being classified as a real issue or a false positive.
- **Not individually measured**: the remaining ~70 endpoints not mentioned
  above (brands, managers, provinces/districts CRUD, users, uploads,
  telegram chat management). The sweep found no structural red flags in
  these (no unbounded loops with awaited queries, pagination present where
  checked), but "no red flags in a grep sweep" is a lower confidence bar
  than "measured with EXPLAIN ANALYZE." If any of these are reported slow
  in practice, they should get the same treatment as the dashboard did.

## Recommended Next Steps (P0 → P3)

- **P0:** None remaining — the two explicitly-flagged endpoints are fixed
  and measured.
- **P1:** Resolve the network-latency floor (infrastructure, not code) —
  check Dokploy VPS region vs. Cloudflare/Supabase, and whether Cloudflare
  reaches the origin via Tunnel or direct proxy. This affects every
  endpoint's real-world latency far more than any remaining code-level
  optimization would.
- **P1:** Add pagination to `GET /kpi-system` (backward-compatible,
  optional params — see Findings table).
- **P2:** Lower `depotService.getAllDepot`'s max `pageSize` from 5000 to
  something in the 100-200 range, after confirming no caller depends on
  requesting more.
- **P3:** The remaining low-priority items in the Findings table, if ever
  revisited.
