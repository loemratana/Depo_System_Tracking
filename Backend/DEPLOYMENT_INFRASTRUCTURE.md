# Deployment Infrastructure

Infrastructure and deployment guide for **Depot System Tracking** — Backend API, admin frontend, database, cache, and integrations.

---

## 1. High-level architecture

```text
┌─────────────────────┐         ┌──────────────────────────────┐
│  Admin Frontend     │  HTTPS  │  Backend API (Node/Express)  │
│  (Vercel / static)  │ ──────► │  e.g. Render                 │
│  Vite / React       │  /api   │  PORT 5000 (or platform)     │
└─────────────────────┘         └──────────────┬───────────────┘
                                               │
                    ┌──────────────────────────┼──────────────────────────┐
                    │                          │                          │
                    ▼                          ▼                          ▼
           ┌────────────────┐       ┌─────────────────┐       ┌──────────────────┐
           │ PostgreSQL     │       │ Upstash Redis   │       │ Telegram Bot     │
           │ (Supabase)     │       │ (sessions/cache)│       │ (Telegraf + cron)│
           │ DATABASE_URL   │       │ REST API        │       │ ALLOWED_CHAT_IDS │
           │ DIRECT_URL     │       └─────────────────┘       └──────────────────┘
           └────────────────┘
                    │
                    ▼ (optional)
           ┌────────────────┐
           │ Arcjet         │  Bot / abuse protection
           └────────────────┘
```

| Layer | Technology | Typical host |
|-------|------------|--------------|
| Frontend | Vite + React (`frontend` / admin) | **Vercel** |
| Backend API | Node.js 22 + Express + Prisma | **Render** (current proxy target) |
| Database | PostgreSQL | **Supabase** (or managed Postgres) |
| Cache / sessions | Redis (HTTP REST) | **Upstash** |
| CI | GitHub Actions | See `BACKEND_CI.md` |
| Notifications | Telegram Bot API | Runs **inside** the Backend process |

> Current frontend proxy (see `frontend/vercel.json`) points API/uploads to  
> `https://depo-system-tracking.onrender.com`.

---

## 2. Components

### 2.1 Backend API

- **Runtime:** Node.js (recommend **22 LTS**, matches CI)
- **Entry:** `src/server.js` → Express `app.js`
- **ORM:** Prisma (`prisma/schema.prisma`, migrations under `prisma/migrations/`)
- **Static files:** `uploads/` served at `/uploads`
- **Background work:** Telegram bot + `node-cron` schedulers start with the HTTP server

**Production start**

```bash
cd Backend
npm ci
npx prisma migrate deploy
npx prisma generate
NODE_ENV=production npm start
```

Health check: `GET /health`

### 2.2 Frontend

- Built as static assets (`npm run build` → `dist/client` for `frontend`)
- On Vercel, `/api/*` and `/uploads/*` are **rewritten** to the Backend URL
- CORS on the Backend must allow the frontend origin(s)

### 2.3 PostgreSQL (Supabase)

| Variable | Use |
|----------|-----|
| `DATABASE_URL` | App / Prisma pooler URL (often port **6543** with `sslmode=require`) |
| `DIRECT_URL` | Direct connection for migrations (often port **5432**) |

Always run schema changes with:

```bash
npx prisma migrate deploy
```

Never use `prisma db push` as the primary production migration path.

### 2.4 Upstash Redis

Optional but used for sessions / cache when configured:

- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `SESSION_SECRET`

### 2.5 Telegram

Runs in the same Node process as the API:

- `TELEGRAM_BOT_TOKEN`
- `ALLOWED_CHAT_IDS` (comma-separated; groups are usually negative)
- Optional: `TELEGRAM_CRON_TZ` (default `Asia/Phnom_Penh`)

Notification toggles are stored under `Backend/data/telegram-settings.json` (filesystem). On ephemeral hosts, prefer a persistent disk or move settings to the database later.

### 2.6 Security toggles

| Variable | Production recommendation |
|----------|---------------------------|
| `ENABLE_RATE_LIMIT` | `true` |
| `ENABLE_ARCJET` | `true` if you have an Arcjet key |
| `ARCJET_KEY` / `ARCJET_ENV` | Set when Arcjet is enabled |
| `JWT_*` secrets | Long random strings; never reuse from `.env.example` |

---

## 3. Environment variables (production checklist)

Copy from `Backend/.env.example` and set on the host (Render/env dashboard). Never commit real `.env` / `.env.local`.

| Group | Variables |
|-------|-----------|
| Core | `NODE_ENV=production`, `PORT`, `HOST=0.0.0.0` |
| Public URL | `TARGET_API=https://<your-api-host>` |
| Database | `DATABASE_URL`, `DIRECT_URL` |
| Auth | `JWT_SECRET`, `JWT_REFRESH_SECRET`, expiry/issuer/audience as needed |
| Session | `SESSION_SECRET`, Upstash URL/token |
| Security | `ENABLE_RATE_LIMIT`, `ENABLE_ARCJET`, `ARCJET_*` |
| Telegram | `TELEGRAM_BOT_TOKEN`, `ALLOWED_CHAT_IDS` |
| Branding | `COMPANY_LOGO_URL` (optional) |

Also update Backend CORS (`src/app.js`) to include the production frontend origin (Vercel URL), not only `localhost`.

---

## 4. Recommended deployment topology

### Option A — Current style (Vercel + Render + Supabase)

```text
Users
  │
  ▼
Vercel (frontend)
  │  rewrite /api, /uploads
  ▼
Render Web Service (Backend)
  ├── Supabase Postgres
  ├── Upstash Redis
  └── Telegram API (outbound)
```

| Pros | Cons |
|------|------|
| Simple, matches existing `vercel.json` | Render free tier may sleep; cron/Telegram pause while asleep |
| Managed TLS & CDN on frontend | `uploads/` and `data/` need persistent disk on Render |

**Render notes**

- Service type: **Web Service**
- Root / build context: `Backend`
- Build: `npm ci && npx prisma generate`
- Start: `npx prisma migrate deploy && npm start`
- Health path: `/health`
- Attach a **persistent disk** mounted for `uploads/` (and ideally `data/`) if files must survive restarts

### Option B — Single VPS (Docker / PM2)

```text
Internet → Nginx (TLS) → Node Backend (:5000)
                       → Static frontend (or separate CDN)
                       → Postgres + Redis (managed or local)
```

Better for always-on Telegram cron and local file storage. Use a process manager (`pm2` or systemd) and reverse proxy (Nginx/Caddy).

### Option C — Containers

Future improvement: `Dockerfile` + `docker-compose` for API + optional local Postgres. Not required for Option A.

---

## 5. Deployment procedure (Backend → Render)

1. **Push** Backend changes to GitHub (`main` / `develop`).
2. Confirm **Backend CI** is green (`BACKEND_CI.md`).
3. On Render (or your host), set all production env vars.
4. Deploy / auto-deploy from the monorepo `Backend` directory.
5. Run migrations (in start command or one-off shell):

   ```bash
   npx prisma migrate deploy
   ```

6. Verify:

   - `GET https://<api-host>/health`
   - Login from the frontend
   - Upload / image URL under `/uploads`
   - Telegram **Test** send from Settings → Notifications (admin)

7. Update frontend `vercel.json` rewrite target if the API hostname changes.

---

## 6. Deployment procedure (Frontend → Vercel)

1. Point the Vercel project at the frontend app.
2. Ensure `vercel.json` rewrites `/api` and `/uploads` to the live Backend URL.
3. Build with production API expectations (proxy or env base URL if the admin app uses one).
4. Confirm CORS on Backend allows the Vercel domain.

---

## 7. Networking & CORS

```text
Browser (https://your-app.vercel.app)
   → Vercel rewrite → https://depo-system-tracking.onrender.com/api/v1/...
   → Backend CORS must allow the Vercel origin (credentials if cookies used)
```

Checklist:

- [ ] Frontend origin listed in Backend CORS
- [ ] HTTPS only in production
- [ ] `TARGET_API` set to the public API URL
- [ ] Supabase `sslmode=require` on connection strings

---

## 8. Data & storage

| Data | Location | Production note |
|------|----------|-----------------|
| Business data | PostgreSQL | Backups via Supabase |
| Uploaded images/files | `Backend/uploads/` | Needs **persistent disk** or object storage (S3/R2) |
| Telegram report toggles | `Backend/data/telegram-settings.json` | Persist disk or migrate to DB |
| Prisma schema history | `prisma/migrations/` | Apply with `migrate deploy` |

**Recommendation:** plan a move of uploads to S3-compatible object storage so deploys are stateless.

---

## 9. CI / CD flow

```text
Developer push
    → GitHub Actions (Backend CI)
        → npm ci, prisma validate/generate, syntax, tests
    → (optional) auto-deploy Render / Vercel on main
```

See **`BACKEND_CI.md`** for CI details.

Suggested gate: only deploy `main` when Backend CI succeeds.

---

## 10. Observability & operations

| Concern | Approach |
|---------|----------|
| Logs | Platform logs (Render) + Winston (`src/config/logger.js`) |
| Health | `GET /health` (include in uptime monitor) |
| Telegram cron | Confirm timezone `Asia/Phnom_Penh`; host must stay awake |
| Secrets rotation | Rotate JWT/session secrets with planned logout; rotate DB password in Supabase + host env together |
| Incidents | Disable Telegram / rate-limit flags via env without code change |

---

## 11. Security baseline

- [ ] `NODE_ENV=production`
- [ ] Strong unique `JWT_*` and `SESSION_SECRET`
- [ ] Rate limit + Arcjet enabled in production
- [ ] No `.env` / `.env.local` in git
- [ ] Database SSL required
- [ ] Least-privilege DB user for the app (if available)
- [ ] Admin-only routes protected (`authenticate` + `authorize`)
- [ ] CORS limited to known frontend origins

---

## 12. Rollback

1. Redeploy previous Render deploy / previous Git commit.
2. Database: prefer **forward-fix** migrations; avoid destructive down-migrations in production.
3. If a bad migration shipped, restore from Supabase backup before retrying.

---

## 13. Local vs production

| | Local | Production |
|--|-------|------------|
| Env files | `.env.local` / `.env` | Host dashboard secrets |
| DB | Docker Postgres or remote Supabase | Supabase |
| Frontend API | Vite proxy → `localhost:5000` | Vercel rewrite → Render |
| Telegram | Optional; real token in `.env.local` | Always set if reports required |
| Uploads | Local `uploads/` folder | Persistent disk or object storage |

---

## 14. Related docs

| Document | Topic |
|----------|--------|
| `BACKEND_CI.md` | GitHub Actions CI |
| `SERVER_CAPACITY.md` | How to calculate CPU / RAM / disk / DB capacity |
| `.env.example` | Environment template |
| `KPI_ARCHITECTURE.md` / `KPI_CALCULATION.md` | Domain logic |
| `ANALYTICS_DASHBOARD.md` | Analytics cards |

---

## 15. Quick production checklist

- [ ] Backend env vars set on host
- [ ] `prisma migrate deploy` succeeded
- [ ] `/health` returns OK
- [ ] Frontend rewrites point to correct API
- [ ] CORS includes frontend origin
- [ ] Login + KPI pages work
- [ ] Uploads persist across restart
- [ ] Telegram test report + Excel arrives
- [ ] Rate limit / Arcjet enabled
- [ ] Backups enabled on Supabase
