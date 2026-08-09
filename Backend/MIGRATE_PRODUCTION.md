# Migrate Database to Production

Safe steps to apply Prisma migrations to the **production** PostgreSQL database (Supabase / managed Postgres).

> Do **not** use `prisma db push` on production.  
> Use **`prisma migrate deploy`** only.

---

## 1. Before you start

- [ ] Production DB backup enabled (Supabase → Database → Backups)
- [ ] You have **direct** connection string (port **5432**), not only the pooler
- [ ] All migration folders exist under `Backend/prisma/migrations/`
- [ ] Backend CI is green (optional but recommended)
- [ ] App downtime window if migrations lock tables (usually short)

### Connection strings

| Variable | Port (typical) | Use |
|----------|----------------|-----|
| `DATABASE_URL` | **6543** (pooler) | App runtime (Prisma client) |
| `DIRECT_URL` | **5432** (direct) | **Migrations** (`migrate deploy`) |

`prisma.config.js` uses:

```text
DIRECT_URL || DATABASE_URL
```

So for migrate, set **`DIRECT_URL`** to the direct Postgres URL with `sslmode=require`.

---

## 2. Create a production env file (local machine)

Do **not** overwrite your local Docker `.env` / `.env.local`.

```bash
cd Backend
cp .env.example .env.production
```

Edit `.env.production` with **production** values only:

```env
NODE_ENV=production

# Pooler (app) — port 6543 on Supabase
DATABASE_URL="postgresql://USER:PASSWORD@HOST:6543/postgres?sslmode=require"

# Direct (migrations) — port 5432 on Supabase
DIRECT_URL="postgresql://USER:PASSWORD@HOST:5432/postgres?sslmode=require"
```

URL-encode special characters in the password (`@` → `%40`, `#` → `%23`, etc.).

Add `.env.production` to gitignore if not already ignored (never commit it).

---

## 3. Check status (production)

PowerShell:

```powershell
cd Backend
$env:DOTENV_CONFIG_PATH=".env.production"
npx dotenv -e .env.production -- npx prisma migrate status
```

Or without extra tools:

```powershell
cd Backend
Get-Content .env.production | ForEach-Object {
  if ($_ -match '^\s*#' -or $_ -match '^\s*$') { return }
  $k,$v = $_.Split('=',2)
  Set-Item -Path "Env:$($k.Trim())" -Value ($v.Trim().Trim('"'))
}
npx prisma migrate status
```

Or use the npm script:

```bash
npm run prisma:migrate:status:prod
```

Expected:

- “Database schema is up to date” → nothing to do  
- “N migrations have not yet been applied” → run deploy (next step)

---

## 4. Apply migrations (production)

```bash
cd Backend
npm run prisma:migrate:deploy:prod
```

This runs:

```bash
npx prisma migrate deploy
```

with env loaded from `.env.production`.

What it does:

1. Reads `prisma/migrations/*`
2. Applies any **pending** SQL in order
3. Records them in `_prisma_migrations`

What it does **not** do:

- Does not create new migration files  
- Does not reset / drop data  
- Does not seed

---

## 5. Generate client & verify

```bash
npx prisma generate
```

Quick checks:

```bash
# From app with production DATABASE_URL on the host
curl https://<your-api-host>/health
```

Optional: open Supabase SQL editor and confirm new tables/enums exist (e.g. `DepotStatus` includes `expired`).

---

## 6. Deploy the Backend app

After DB migrate succeeds:

1. Set the same `DATABASE_URL` / `DIRECT_URL` on Render (or your host)
2. Start command should include migrate on boot **or** you migrate manually (prefer manual for first prod cutover):

   ```bash
   npx prisma migrate deploy && npm start
   ```

3. Redeploy / restart the API

---

## 7. If production DB already has tables (baseline)

If production was created earlier with `db push` or manual SQL and `_prisma_migrations` is empty/missing, `migrate deploy` may fail on “already exists”.

Options:

### A) Baseline (preferred if schema already matches)

```bash
npx prisma migrate resolve --applied "20260511085211_init"
# repeat for each migration that is already reflected in prod schema
npx prisma migrate deploy
```

### B) Fresh production database

Only if the DB is empty and you are OK starting clean:

1. Create empty Supabase project / database  
2. `npm run prisma:migrate:deploy:prod`  
3. Seed if needed: `npm run seed` (only with production env loaded — be careful)

---

## 8. Rollback policy

Prisma does **not** auto-rollback SQL on failure mid-migration.

- Prefer **forward-fix** migrations  
- On failure: restore Supabase backup, fix migration, redeploy  
- Never run `prisma migrate reset` on production

---

## 9. Local vs production cheat sheet

| Task | Local (Docker) | Production |
|------|----------------|------------|
| Env file | `.env.local` / `.env` | `.env.production` or host secrets |
| Host | `127.0.0.1:5433` | Supabase host |
| Create migration | `npx prisma migrate dev --name ...` | **Never** |
| Apply migrations | `migrate dev` or `migrate deploy` | **`migrate deploy` only** |
| Push schema without history | `db push` (dev only) | **Forbidden** |

---

## 10. Commands reference

```bash
# Validate schema file
npm run prisma:validate

# See pending migrations (prod env)
npm run prisma:migrate:status:prod

# Apply pending migrations (prod env)
npm run prisma:migrate:deploy:prod

# Mark a migration as already applied (baseline)
npx prisma migrate resolve --applied "<migration_folder_name>"
```

---

## 11. Current migration history (Backend)

Apply order under `prisma/migrations/`:

1. `20260511085211_init`
2. `20260529071700`
3. `20260706170000_add_depot_note`
4. `20260709160000_remove_product_price`
5. `20260728110000_add_brand_logo_url`
6. `20260728120000_dynamic_kpi_architecture`
7. `20260728161000_brand_monthly_kpis`
8. `20260804050000_sync_depot_staff_brand`
9. `20260804090000_staff_email_optional`
10. `20260804120000_add_kpi_analytics_tables`
11. `20260804121000_employee_remarks`
12. `20260805050000_add_depot_status_expired`
13. `20260807140000_remove_products`

---

## 12. Need help from the agent?

Provide (privately / in chat, do not commit):

1. Production `DIRECT_URL` (direct, port 5432, `sslmode=require`)  
2. Confirm: empty DB vs existing schema  

Then we can run `migrate status` + `migrate deploy` against production for you.
