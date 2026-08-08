# KPI Calculation Guide

How the Brand Depot KPI System calculates every number you see on **KPI Management** and the dashboard.

Source of truth in code:

- `Backend/src/services/kpiSystemService.js` for ranking/legacy KPI aggregation
- `Backend/src/services/brandMonthlyKpiService.js` for the manager-entered brand monthly workflow

---

## 1. Measure catalog (what we store)

Each monthly fact is stored in `kpi_values` as:

**employee × depot × month × measure**

| Code                    | UI name              | Meaning                                | Unit            |
| ----------------------- | -------------------- | -------------------------------------- | --------------- |
| `PO_COUNT`              | **# PO**             | Purchase orders completed in the month | count           |
| `PO_TARGET`             | **# Target**         | Monthly PO target                      | count           |
| `PRODUCT_AVAILABLE_PCT` | **% Available**      | Product availability %                 | percent (0–100) |
| `VOLUME_DISPLAY_PCT`    | **% Volume Display** | Volume display %                       | percent (0–100) |

`% Available` and `% Volume Display` are **imported as-is** (or demo-seeded). The system does **not** derive them from stock tables today.

For the new manager workflow, one primary row is also stored in `brand_depot_month_kpis` as:

**depot × brand × month**

Fields:

- `poActual`
- `poTarget`
- `productAvailablePct`
- `volumeDisplayPct`

This row is mirrored into `kpi_values` when the depot has an assigned supervisor, so old KPI screens can still read the numbers.

---

## 2. Core PO % formula

Used everywhere a **PO %** / **KPI %** is shown:

\[
\text{PO \%} = \begin{cases}
\dfrac{\text{\# PO}}{\text{\# Target}} \times 100 & \text{if \# Target} > 0 \\
0 & \text{otherwise}
\end{cases}
\]

Code:

```js
function calcKpiPercent(targetQty, actualQty) {
  return targetQty > 0 ? (actualQty / targetQty) * 100 : 0;
}
```

Rounded to **1 decimal** in API responses (`toFixed(1)`).

### Example

| # Target | # PO | PO %                         |
| -------- | ---- | ---------------------------- |
| 160      | 140  | \(140 / 160 × 100 = 87.5\%\) |
| 0        | 50   | \(0\%\) (no target)          |
| 100      | 120  | \(120\%\) (above target)     |

---

## 3. Ranking view (employee roll-up)

**Endpoint:** `GET /api/v1/kpis?fromDate=&toDate=`

For each **employee**, over the selected date range (all their depots / months in range):

| UI column            | Calculation                                               |
| -------------------- | --------------------------------------------------------- |
| **# Target**         | Sum of all `PO_TARGET` values for that employee           |
| **# PO**             | Sum of all `PO_COUNT` values for that employee            |
| **% Available**      | Average of `PRODUCT_AVAILABLE_PCT` rows for that employee |
| **% Volume Display** | Average of `VOLUME_DISPLAY_PCT` rows for that employee    |
| **PO %**             | `# PO / # Target × 100` (same core formula)               |

### Status badge (frontend)

| PO %              | Status            |
| ----------------- | ----------------- |
| ≥ 100             | Excellent         |
| ≥ 90 and &lt; 100 | Good              |
| &lt; 90           | Needs Improvement |

### Rank order

1. Higher **PO %** first
2. If tie → higher **# PO** first
3. Rank = position after sort (`1`, `2`, `3`, …)

---

## 4. Scorecard view (Excel-shaped)

**Endpoint:** `GET /api/v1/kpis/wide?month=YYYY-MM`

One row = **one employee × one depot × one month** (no sum across depots).

| Field                   | Calculation                                 |
| ----------------------- | ------------------------------------------- |
| `poTarget` / `# Target` | Value of `PO_TARGET` for that row           |
| `poCount` / `# PO`      | Value of `PO_COUNT` for that row            |
| `productAvailablePct`   | Value of `PRODUCT_AVAILABLE_PCT` (or empty) |
| `volumeDisplayPct`      | Value of `VOLUME_DISPLAY_PCT` (or empty)    |
| `kpiPercent` / **PO %** | `# PO / # Target × 100`                     |

Month filter uses the full calendar month: `periodMonth` between month start and month end (UTC month helpers).

---

## 5. Summary cards

**Endpoint:** `GET /api/v1/kpis/summary`

Built from the **ranking** rows:

| Card                       | Calculation                                      |
| -------------------------- | ------------------------------------------------ |
| **Average PO %**           | Mean of `PO %` for employees with `# Target > 0` |
| **Top Performer**          | Name of rank #1 (highest PO %)                   |
| **Employees Assessed**     | Count of ranking rows                            |
| (internal) above target    | Count where `PO % ≥ 100`                         |
| (internal) below threshold | Count where `PO % < 80`                          |

Dashboard (`GET /api/v1/report/dashboard`) uses the same average for `averageKpi`.

---

## 6. Matrix view (depot × product)

**Endpoint:** `GET /api/v1/kpis/matrix`

Different formula (product sales vs split depot target):

1. Depot monthly PO target = sum of `PO_TARGET` for that depot in the period
2. Split evenly across products that have sales in that depot:

\[
\text{target per product} = \dfrac{\text{depot PO target}}{\text{number of products with sales}}
\]

3. Cell %:

\[
\text{cell \%} = \dfrac{\text{quantity sold}}{\text{target per product}} \times 100
\]

Capped at **999** in the UI response for display safety.

---

## 7. Import mapping

**Endpoint:** `POST /api/v1/kpis/import`

| JSON field         | Stored as                                 |
| ------------------ | ----------------------------------------- |
| `po`               | `PO_COUNT.actualValue`                    |
| `target`           | `PO_TARGET.actualValue` (+ `targetValue`) |
| `productAvailable` | `PRODUCT_AVAILABLE_PCT.actualValue`       |
| `volumeDisplay`    | `VOLUME_DISPLAY_PCT.actualValue`          |

On import, PO score (internal) is also written when target &gt; 0:

\[
\text{score} = \dfrac{\text{po}}{\text{target}} \times 100
\]

Legacy `employee_kpis` is updated for PO target/actual so old screens keep working.

---

## 8. Demo sample values (local seed only)

Script: `Backend/scripts/seed-kpi-scorecard-samples.js`

For each existing PO row:

- **% Available** ≈ `min(100, 88 + (depotId % 12))`
- **% Volume Display** ≈ `min(100, 75 + (depotId % 20) + (po % 5))`

These are **demo numbers**, not live field measurements.

---

## 9. Quick worked example (Ranking)

Employee A in June, 2 depots:

| Depot   | # Target | # PO | % Available | % Display |
| ------- | -------- | ---- | ----------- | --------- |
| Depot 1 | 120      | 86   | 89          | 77        |
| Depot 2 | 100      | 95   | 96          | 88        |

**Ranking roll-up:**

- `# Target` = 120 + 100 = **220**
- `# PO` = 86 + 95 = **181**
- `% Available` = (89 + 96) / 2 = **92.5**
- `% Volume Display` = (77 + 88) / 2 = **82.5**
- **PO %** = 181 / 220 × 100 = **82.3%** → status _Needs Improvement_

**Scorecard** keeps the two rows separate (no averaging).

---

## 10. Where to look in the app

| Screen              | What calculation you see        |
| ------------------- | ------------------------------- |
| KPI → **Ranking**   | Employee sums + averages (§3)   |
| KPI → **Scorecard** | Per employee×depot (§4)         |
| KPI → **Matrix**    | Depot×product split target (§6) |
| Dashboard KPI card  | Average PO % (§5)               |
| **Analytics** cards | Total PO, Available/Display avg, on target / under / at risk, license risk — see `Backend/ANALYTICS_DASHBOARD.md` |

For architecture tables/APIs, see also `Backend/KPI_ARCHITECTURE.md`.
For Analytics top cards in detail, see `Backend/ANALYTICS_DASHBOARD.md`.

---

## 11. Brand monthly report

**Endpoint:** `GET /api/v1/report/brand-monthly?brandId=&year=&month=`

One row = **one depot × one brand × one month**.

Rules:

- `totalPo` on the card = `SUM(poActual)` across filtered rows
- `avgAvailable` = average of non-null `productAvailablePct`
- `avgDisplay` = average of non-null `volumeDisplayPct`
- same depot display names are **not merged** across brands; row identity is always `depotId + brandId`

This flow does **not** calculate sale score, revenue score, or SKU-based KPI performance.

---

## 12. Brand yearly report

**Endpoint:** `GET /api/v1/report/brand-yearly?brandId=&year=`

Rows are grouped by **brand + depot** across the selected year.

Rules:

- `Yearly total PO = SUM(monthly poActual)`
- `Yearly avg Available = AVG(productAvailablePct)` over months where the manager entered a value
- `Yearly avg Display = AVG(volumeDisplayPct)` over months where the manager entered a value
- null months are skipped from the average
- rows stay split by brand even when depot names look the same

Example:

- Jan `PO=90`, Feb `PO=110`, Mar `PO=100` -> yearly `totalPo=300`
- Jan `Available=92`, Feb `Available=null`, Mar `Available=88` -> yearly `avgAvailable=(92+88)/2=90`

---

## 13. Brand dashboard summary

**Endpoint:** `GET /api/v1/report/dashboard-brand?year=&month=`

One row = **one brand** for the selected month.

Rules:

- `totalDepots` = count of depots assigned to that brand
- `totalPo` = sum of current-month `poActual`
- `vacancy` = count of brand depots with `status = vacancy`
- `expired` = count of brand depots whose `expiryDate` is before today
- `avgAvailable` = average of current-month manager-entered `productAvailablePct`
- `avgVolumeDisplay` = average of current-month manager-entered `volumeDisplayPct`

This brand dashboard is the manager-facing monthly snapshot for the new workflow.
