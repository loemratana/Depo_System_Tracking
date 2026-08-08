# Server Capacity Planning

How to **estimate and calculate** CPU, RAM, disk, database connections, and bandwidth for the Depot System Tracking **Backend**.

Use this with `DEPLOYMENT_INFRASTRUCTURE.md`.

---

## 1. What “capacity” means here

| Resource | What it limits |
|----------|----------------|
| **CPU** | Concurrent requests, Excel generation, KPI aggregations |
| **RAM** | Node process, Prisma/pg pool, Excel buffers, file uploads |
| **Disk** | `uploads/`, logs, Telegram Excel temp buffers, `data/` |
| **DB connections** | Parallel queries (pool size vs Supabase limit) |
| **Bandwidth** | API JSON + Excel Telegram sends + image downloads |

This app is mostly **I/O-bound** (Postgres + HTTP), with short **CPU spikes** when building Excel reports or bulk importing depots.

---

## 2. Inputs you must collect first

Fill these from real usage (or assumptions for go-live):

| Symbol | Meaning | Example |
|--------|---------|---------|
| `U` | Concurrent active users (admins/staff in UI) | 20 |
| `R_user` | Avg API requests per user per minute | 6 |
| `P_peak` | Peak factor (morning / month-end) | 2.0 – 3.0 |
| `S_json` | Avg API response size (KB) | 50 |
| `N_depots` | Depot rows in DB | 1,000 – 5,000+ |
| `N_kpi` | KPI rows per month (depot × brand) | 2,000 – 10,000 |
| `Excel_MB` | Largest Telegram/report Excel | 1 – 20 MB |
| `Upload_MB_day` | New uploads per day | 50 – 500 MB |
| `Retain_days` | Keep uploads this many days | 365 |

---

## 3. Calculate request rate (RPS)

### Step A — Average requests per second

\[
RPS_{avg} = \frac{U \times R_{user}}{60}
\]

**Example:** 20 users × 6 req/min ÷ 60 = **2 RPS** average.

### Step B — Peak RPS

\[
RPS_{peak} = RPS_{avg} \times P_{peak}
\]

**Example:** 2 × 2.5 = **5 RPS** peak.

### Step C — Design capacity (safety margin)

\[
RPS_{design} = RPS_{peak} \times 1.5
\]

**Example:** 5 × 1.5 = **7.5 RPS** design target.

> Your rate limit default is **200 requests / 15 min / IP** (`app.js`). That is abuse protection, not a capacity target.

---

## 4. Calculate RAM

### Formula (Backend Node process)

\[
RAM_{api} \approx RAM_{base} + (C \times RAM_{per\_req}) + RAM_{pool} + RAM_{excel} + RAM_{upload}
\]

| Piece | Suggested value for this stack |
|-------|--------------------------------|
| `RAM_base` | **256–384 MB** (Node + Express + Prisma client) |
| `C` | Concurrent in-flight requests ≈ `RPS_peak × latency_sec` |
| `RAM_per_req` | **2–8 MB** (JSON handlers); **20–80 MB** during Excel build |
| `RAM_pool` | **~2–5 MB × pool size** (pg connections) |
| `RAM_excel` | Size of largest workbook × **2–3×** (build buffer) |
| `RAM_upload` | Max multipart body (you allow **10 MB** JSON; files may be larger) |

### Concurrent in-flight requests

\[
C = RPS_{peak} \times T_{sec}
\]

If avg API latency `T` = 0.3 s and peak RPS = 5:

\[
C = 5 \times 0.3 = 1.5 \approx 2
\]

Normal traffic RAM is low. **Excel / bulk import** dominates.

### Practical RAM sizing

| Scenario | Recommended API RAM |
|----------|---------------------|
| Small team (&lt; 15 users), light reports | **512 MB** |
| Medium (15–50 users), daily Telegram Excel | **1 GB** |
| Heavy imports + large license Excel | **2 GB** |
| OS + overhead on a VPS (API only) | Add **+512 MB–1 GB** for OS |

**Render / container rule of thumb**

\[
RAM_{instance} = RAM_{api} \times 1.3
\]

(30% headroom for GC spikes and Telegram cron overlap.)

---

## 5. Calculate CPU

### Rule of thumb for this API

| Peak RPS | Excel/cron load | vCPU |
|----------|-----------------|------|
| &lt; 5 | Light | **0.5 – 1** |
| 5 – 20 | Regular Excel | **1 – 2** |
| 20 – 50 | Heavy dashboards + import | **2 – 4** |

### More formal estimate

Assume one “CPU-second” of work per request average `W` (often **0.02–0.05** for simple CRUD; **0.2–2.0** for Excel):

\[
CPU_{cores} \approx \frac{RPS_{peak} \times W}{U_{cpu}} \times 1.5
\]

- `U_cpu` = target CPU utilization (use **0.7**)
- `1.5` = safety factor

**Example (CRUD-heavy):**  
`RPS_peak=5`, `W=0.04` → \(5 × 0.04 / 0.7 × 1.5 ≈ 0.43\) → **1 vCPU**.

**Example (Excel at noon):**  
Treat Excel as a separate job: if report build takes 10 s of CPU once per day, you still need headroom so API latency does not stall — keep **≥ 1 vCPU** if Telegram Excel is enabled.

---

## 6. Calculate database connections

Default `pg.Pool` without explicit `max` uses **node-pg default (often 10)**.

### How many connections you need

\[
Conn_{needed} = N_{instances} \times Pool_{max} + Conn_{migrate} + Conn_{admin}
\]

| Term | Typical |
|------|---------|
| `N_instances` | Number of Backend replicas (start with **1**) |
| `Pool_max` | Set explicitly, e.g. **5–10** on small Supabase |
| `Conn_migrate` | 1–2 during deploy |
| `Conn_admin` | Supabase dashboard / BI |

### Must stay under Postgres limit

\[
Conn_{needed} < Conn_{supabase\_limit}
\]

Supabase free/pro connection limits vary by plan (pooler vs direct). Prefer:

- App traffic → **`DATABASE_URL` (pooler, port 6543)**
- Migrations → **`DIRECT_URL` (port 5432)**

### Sizing pool

\[
Pool_{max} \approx \min\left(10,\ \lceil RPS_{peak} \times T_{db} \rceil + 2\right)
\]

If DB query time `T_db` = 0.1 s and peak RPS = 5 → \(\lceil 0.5 \rceil + 2 = 3\) → pool **5** is enough.

Bulk depot import uses parallel upserts capped at **20** (`PARALLEL_LIMIT` in `depotService`) — that can stress the pool; keep imports off-peak or lower parallelism in production if the DB plan is small.

---

## 7. Calculate disk

### Uploads

\[
Disk_{uploads} = Upload_{MB\_day} \times Retain_{days} \times 1.2
\]

**Example:** 100 MB/day × 365 × 1.2 ≈ **43 GB**.

### App + logs + Telegram artifacts

| Item | Estimate |
|------|----------|
| App + `node_modules` on build host | ~500 MB – 1.5 GB (not always on runtime disk) |
| Runtime app image | ~200–400 MB |
| Logs (rotated) | 1–5 GB |
| `data/telegram-settings.json` | negligible |
| Temp Excel during send | peak ≈ largest Excel × 2 |

### Persistent disk (Render)

\[
Disk_{persistent} = Disk_{uploads} + Disk_{logs} + 5\ GB\ buffer
\]

If you move uploads to **S3/R2**, API disk can stay small (**5–10 GB**).

---

## 8. Calculate bandwidth (rough)

### API JSON

\[
BW_{out\_GB\_day} \approx \frac{RPS_{avg} \times 86400 \times S_{json}}{1024 \times 1024}
\]

**Example:** 2 RPS × 86400 × 50 KB ≈ **8.2 GB/day** outbound API (often less; many responses are smaller).

### Telegram Excel

\[
BW_{telegram} \approx N_{reports\_day} \times Excel_{MB} \times N_{chats}
\]

### Design tip

CDN/Vercel for frontend; Backend bandwidth mostly API + uploads + Telegram.

---

## 9. Worked example (recommended starter)

**Assumptions**

- 25 concurrent staff users  
- 8 API calls/user/min  
- Peak factor 2.5  
- Avg latency 300 ms  
- ~3,000 depots, monthly KPI Excel ~5–15 MB  
- Uploads 80 MB/day, keep 1 year  

**Calc**

| Metric | Calculation | Result |
|--------|-------------|--------|
| RPS avg | 25×8/60 | 3.3 |
| RPS peak | 3.3×2.5 | 8.3 |
| RPS design | 8.3×1.5 | **~12.5** |
| In-flight | 8.3×0.3 | ~2.5 |
| RAM | base 384 + excel headroom | **1 GB** (safe) |
| vCPU | | **1** (prefer **2** if Excel + import same hour) |
| DB pool | | **5–10** via pooler |
| Upload disk | 80×365×1.2 | **~35 GB** persistent |

**Starter instance (Render / VPS)**

| Resource | Starter | Comfortable |
|----------|---------|-------------|
| vCPU | 1 | 2 |
| RAM | 1 GB | 2 GB |
| Persistent disk | 40 GB | 80 GB (or S3) |
| Postgres | Supabase small/medium | Watch connection + CPU |
| Redis | Upstash free/paid | Sessions only |

---

## 10. How to measure (do not only guess)

After deploy, collect real numbers for 1–2 weeks:

| Signal | How |
|--------|-----|
| RPS / latency | Render metrics, or reverse proxy logs |
| RAM / CPU | Host dashboard; `process.memoryUsage()` in `/health` (optional) |
| DB | Supabase reports: connections, CPU, disk |
| Slow queries | Prisma query logs (dev) / Supabase query insights |
| Excel duration | Log time in Telegram report send |

### Scale-up triggers

| Symptom | Action |
|---------|--------|
| CPU &gt; 70% sustained | +1 vCPU or move Excel to worker |
| RSS RAM &gt; 80% | +RAM or reduce Excel size / stream |
| DB `too many connections` | Lower `Pool.max`, use pooler, fewer instances |
| API p95 &gt; 1–2 s | Index DB, paginate lists, cache dashboards |
| Disk full | Purge uploads, object storage, log rotation |

### Scale-out (later)

\[
N_{instances} = \lceil RPS_{design} / RPS_{per\_instance} \rceil
\]

Only after **1 instance** is tuned. Remember:

\[
Conn_{total} = N_{instances} \times Pool_{max} < DB_{limit}
\]

Telegram cron should run on **one** instance only (leader) if you scale out — otherwise duplicate reports.

---

## 11. Quick calculator sheet (fill in)

```text
U (concurrent users) .............. ______
R_user (req/user/min) ............. ______
P_peak ............................ ______
T_latency_sec ..................... ______
Excel_MB_max ...................... ______
Upload_MB_day ..................... ______
Retain_days ....................... ______
N_instances ....................... ______
Pool_max .......................... ______
DB_connection_limit ............... ______

RPS_avg   = U * R_user / 60
RPS_peak  = RPS_avg * P_peak
RPS_design= RPS_peak * 1.5
C         = RPS_peak * T_latency_sec
RAM_GB    = max(0.5, 0.4 + Excel_MB_max/512 + 0.3)   # rough
vCPU      = 1 if RPS_design < 15 else 2+
Disk_GB   = Upload_MB_day * Retain_days * 1.2 / 1024
Conn_need = N_instances * Pool_max + 3
OK_DB?    = Conn_need < DB_connection_limit
```

---

## 12. Related docs

| Document | Topic |
|----------|--------|
| `DEPLOYMENT_INFRASTRUCTURE.md` | Where to host (Render, Vercel, Supabase) |
| `BACKEND_CI.md` | CI before deploy |
| `.env.example` | Runtime configuration |

---

## 13. Summary

1. Estimate **users → RPS → peak RPS**.  
2. Size **RAM** for Node + Excel spikes (usually **1 GB** to start).  
3. Size **CPU** for peak RPS + Excel (**1–2 vCPU**).  
4. Size **DB pool** so `instances × pool < Supabase limit`.  
5. Size **disk** from upload retention (or use object storage).  
6. **Measure** after go-live and scale when CPU/RAM/DB hit ~70–80%.  
