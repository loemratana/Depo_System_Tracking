# Production Performance — Why It’s Slow & What To Do

Practical fixes for Depot System Tracking when the **production host feels very slow**.

---

## 1. Diagnose first (2 minutes)

Open the API in a browser or curl:

```bash
curl -w "\nTTFB: %{time_starttransfer}s  Total: %{time_total}s\n" -o NUL -s https://depo-system-tracking.onrender.com/health
```

| Result | Likely cause |
|--------|----------------|
| First call **30–60+ seconds**, next calls OK | **Render Free cold start** (service slept) |
| Every call **1–3+ seconds** even when warm | **Region / DB latency** or heavy queries |
| Only **list / dashboard / KPI** slow | Missing pagination, N+1, big Excel/joins |
| Only after idle Telegram/cron | CPU spike on small instance |

---

## 2. Top causes (this project)

### A) Render Free tier cold start (most common)

Free web services **sleep after ~15 minutes** with no traffic. Next request waits **~30–60 seconds** while the container starts, Node boots, Prisma connects, Telegram starts.

**Fix (best):** Upgrade Render to a **paid** instance (Starter+). No sleep.

**Fix (cheap workaround):** Ping `/health` every **10 minutes**.

This repo includes a GitHub Action:

- **Active file:** `.github/workflows/keep-warm.yml` (monorepo root)
- Runs on a schedule (`*/10`) + manual **Run workflow**
- Optional secret: `API_HEALTH_URL` (defaults to `https://depo-system-tracking.onrender.com/health`)

```bash
# After push to main/master:
# GitHub → Actions → "Keep API warm" → Enable / Run workflow
```

> GitHub cron can drift. If cold starts still happen, switch cron to `*/5` or use UptimeRobot.  
> Keep-warm uses Free instance hours; paid Render is cleaner for real production.


---

### B) Region mismatch (Vercel ↔ Render ↔ Supabase)

Your Supabase pooler is in **`ap-northeast-1` (Tokyo)**.

If Render is in **US/EU** and the frontend on Vercel elsewhere, every DB query pays long network RTT.

**Fix:** Put Backend + DB in the **same region** (prefer Tokyo / Singapore if users are in Cambodia/SEA):

| Service | Set region to |
|---------|----------------|
| Supabase | `ap-northeast-1` (already) |
| Render | **Singapore** or **Ohio** only if forced — prefer closest to Tokyo |
| Vercel | Auto edge; API still hits Render |

Target: API and Postgres **same continent**, ideally same cloud region.

---

### C) Weak instance size

Free / tiny plans: **0.1 CPU + 512 MB RAM**.

Heavy pages (dashboard, brand KPI, depot lists, Excel) will feel laggy.

**Fix:** Use at least **1 GB RAM / 0.5–1 CPU** (see `SERVER_CAPACITY.md`).

---

### D) Database connection / pool

Use:

- App: `DATABASE_URL` → pooler **port 6543**
- Migrate only: `DIRECT_URL` → **5432**

Tune pool (see `src/config/db.js`): small `max`, short idle timeout on serverless-ish hosts.

---

### E) Slow API queries (after host is warm)

Typical hotspots in this app:

- Dashboard / analytics (aggregations over many depots)
- Depot list without tight filters
- KPI monthly / yearly reports
- Bulk import

**Fixes:**

1. Always paginate (`page` / `pageSize`)
2. Avoid `include` of huge relations when a `select` is enough
3. Add indexes on filter columns (`brand_id`, `period_month`, `depot_id`, status)
4. Cache dashboard cards in Redis (Upstash) for 30–60 seconds
5. Move Telegram Excel generation off the request path (already cron — keep it that way)

---

### F) Frontend → API path

If `vercel.json` rewrites `/api` to Render, the browser waits on Render. Cold start = blank/slow UI.

**Fixes:**

- Upgrade Render (no sleep)
- Or show a “API waking up…” toast when `/health` is slow
- Ensure CORS allows the Vercel origin (failed CORS can look like “hang”)

---

## 3. Recommended action plan (priority)

| Priority | Action | Impact | Effort |
|----------|--------|--------|--------|
| 1 | Upgrade Render off Free (no cold start) | **Huge** | Low |
| 2 | Same region: Render near Supabase Tokyo | **High** | Low |
| 3 | Keep-warm ping `/health` every 10 min (if stay Free) | High | Low |
| 4 | Set production pool + use port 6543 for app | Medium | Low |
| 5 | Paginate heavy lists / trim Prisma includes | Medium | Medium |
| 6 | Redis cache for dashboard insights | Medium | Medium |
| 7 | Object storage for uploads (less disk I/O) | Lower | Medium |

---

## 4. Quick Render checklist

On the Render service:

- [ ] Instance type: **not Free** for real production
- [ ] Region: closest to Supabase (`ap-northeast-1` users → Asia region)
- [ ] Env: `NODE_ENV=production`
- [ ] Env: `DATABASE_URL` = pooler **6543**
- [ ] Env: `DIRECT_URL` = direct/session **5432** (migrate only)
- [ ] Health check path: `/health`
- [ ] Start: `npx prisma migrate deploy && npm start` (or migrate separately)

---

## 5. Quick code / config wins

Already useful in this repo:

- Health: `GET /health`
- Rate limit off unless `ENABLE_RATE_LIMIT=true`
- Prisma logs only errors in production

Do next if still slow when warm:

1. Log slow requests (`morgan` or custom middleware > 1s)
2. Supabase → Query performance / indexes
3. Cap dashboard `limit` (already often 25–50)

---

## 6. How to tell “cold start” vs “slow SQL”

1. Hit `/health` twice, 5 seconds apart.  
2. If **1st is 40s** and **2nd is 200ms** → cold start (host).  
3. If **both are 2s+** → DB/region/query.  
4. In Supabase SQL, run a heavy report query and check duration.

---

## 7. Related docs

| Doc | Topic |
|-----|--------|
| `DEPLOYMENT_INFRASTRUCTURE.md` | Hosting topology |
| `SERVER_CAPACITY.md` | CPU / RAM sizing |
| `MIGRATE_PRODUCTION.md` | DB migrate |
| `BACKEND_CI.md` | CI |

---

## 8. Bottom line

For this stack, **#1 fix is almost always: stop using Render Free sleep** (upgrade or keep-warm), then **put API + Supabase in the same region**, then optimize heavy KPI/dashboard queries.

If you want, next step I can add: keep-warm GitHub Action + request timing middleware + production pool defaults in `db.js`.
