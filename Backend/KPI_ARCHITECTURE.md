# Dynamic KPI Architecture (Approach B) — Shipped

## What changed

Monthly performance is no longer locked to `EmployeeKPI` columns only.

| Table | Role |
|-------|------|
| `kpi_definitions` | Measure catalog (`PO_COUNT`, `PO_TARGET`, `PRODUCT_AVAILABLE_PCT`, `VOLUME_DISPLAY_PCT`) |
| `kpi_values` | Monthly facts: employee × depot × period × measure |
| `kpi_packs` / `kpi_pack_items` | Scorecard templates + weights |
| `kpi_pack_assignments` | Optional brand/department packs |
| `import_batches` | Excel/JSON import audit |
| `v_monthly_kpi_wide` | BI-friendly pivot view |

Legacy `employee_kpis` is still written on import/set-target so old screens keep working.

## APIs (`/api/v1/kpis`)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/` | Rankings (reads `kpi_values`, falls back to legacy) |
| GET | `/summary` | Summary cards |
| GET | `/definitions` | Active KPI catalog |
| GET | `/wide?month=2026-06` | Excel-shaped rows (PO, Target, Available%, Display%) |
| POST | `/import` | Body `{ fileName?, rows: [...] }` |
| POST | `/targets` | Upserts PO target in both models |
| POST | `/seed-catalog` | Seed defs + backfill legacy |

### Import row shape

```json
{
  "fileName": "jun-2026.xlsx",
  "rows": [
    {
      "employeeCode": "EMP002",
      "depotCode": "DEP-002",
      "month": "2026-06",
      "po": 140,
      "target": 160,
      "productAvailable": 98,
      "volumeDisplay": 90
    }
  ]
}
```

## Frontend (KPI Management)

| View | Shows |
|------|--------|
| Ranking | # Target, # PO, % Available, % Volume Display, PO % |
| Scorecard | Employee × depot monthly Excel shape (`GET /kpis/wide`) |
| Matrix | Depot × product (existing) |
| Import Scorecard | JSON rows → `POST /kpis/import` |

Sample Available/Display seed:
`node --env-file=.env.local scripts/seed-kpi-scorecard-samples.js`

## Local migrate (existing DB)

```bash
cd Backend
npx prisma db execute --file prisma/migrations/20260728120000_dynamic_kpi_architecture/migration.sql
npx prisma generate
node --env-file=.env.local scripts/migrate-kpi-architecture.js
```

Or full reseed: `node --env-file=.env.local prisma/seed.js`

## Restart

Restart the backend after `prisma generate` so rankings use the new tables.
