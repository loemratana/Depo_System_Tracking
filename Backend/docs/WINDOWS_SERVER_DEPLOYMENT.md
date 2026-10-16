# Hosting on a Windows Server (native, no Docker)

Full setup for running this system — React frontend, Node.js backend, PostgreSQL,
Redis — on one remote Windows Server you RDP into, with everything installed
natively (no Docker). Frontend and backend are served from the same domain
through one reverse proxy, so there's no CORS to fight and no separate host to
manage.

```text
Internet (443/80)
   │
   ▼
Caddy (reverse proxy + automatic HTTPS + static files)
   ├── /               → React build (D:\apps\depot-frontend\dist, static files)
   ├── /api/*          → Node backend (127.0.0.1:5000)
   └── /uploads/*      → Node backend (127.0.0.1:5000)
                              │
                              ├── PostgreSQL (127.0.0.1:5432)
                              └── Memurai / Redis (127.0.0.1:6379)
```

Only Caddy is reachable from the internet (ports 80/443). Postgres, Redis and
the Node process are bound to `127.0.0.1` and never exposed publicly — same
principle as the existing Linux VPS setup (`deploy/README.md`), just with
Windows-native tools instead of Docker Compose + nginx + certbot.

If you'd rather reuse the Docker image and GitHub Actions pipeline that
already exist for the Linux VPS (`.github/workflows/backend-cicd.yml`,
`Backend/Dockerfile`), see **"Alternative: Docker Desktop with WSL2"** at the
end instead of the native setup below — it needs virtualization enabled on
the server, but almost nothing to write from scratch.

## 0. Prerequisites

- RDP access to the Windows Server (2019/2022/2025), with a local admin account.
- A domain name with a DNS **A record** pointed at the server's public IP —
  needed for Caddy's automatic HTTPS (Let's Encrypt) to work. Without a real
  domain reachable from the internet, you can still do everything below but
  skip HTTPS and use `http://<server-ip>` (see the Caddyfile note in step 8).
- Inbound firewall/security-group rules open for **TCP 80 and 443** to this
  server (from your cloud/VPS provider's console, if it has one in front of
  Windows Firewall).
- Git for Windows installed (https://git-scm.com/download/win) — gives you
  `git`, and `curl`/`openssl` as a side effect via Git Bash, useful for the
  verification steps later.

Everything below is run from an **elevated PowerShell** (right-click → *Run
as administrator*) unless said otherwise.

## 1. Install Node.js 22

```powershell
winget install OpenJS.NodeJS.LTS
```

Node 22 matches what this project's Docker image and CI both use
(`Backend/Dockerfile`'s `node:22-alpine`, `.github/workflows/backend-cicd.yml`'s
`node-version: '22'`). Close and reopen PowerShell after installing so `node`
is on `PATH`, then confirm:

```powershell
node -v      # v22.x
npm -v
```

Enable pnpm (the frontend's package manager — see `depo-system-frontend/vercel.json`'s
`installCommand`):

```powershell
corepack enable
corepack prepare pnpm@latest --activate
```

## 2. Install PostgreSQL

```powershell
winget install PostgreSQL.PostgreSQL.17
```

The installer registers `postgresql-x64-17` as a Windows service (auto-start)
and prompts you to set a password for the `postgres` superuser — write it
down, you need it once below. It also installs `psql` under
`C:\Program Files\PostgreSQL\17\bin`; add that folder to `PATH` if you want
`psql` on the command line directly (the installer usually offers to do this).

Create the application database and a dedicated (non-superuser) app user —
open **SQL Shell (psql)** from the Start menu, or run `psql -U postgres`:

```sql
CREATE DATABASE depot;
CREATE USER depot_app WITH ENCRYPTED PASSWORD 'choose-a-long-random-password';
GRANT ALL PRIVILEGES ON DATABASE depot TO depot_app;
\c depot
GRANT ALL ON SCHEMA public TO depot_app;
```

This server only ever talks to Postgres over `localhost`, so the installer's
default `pg_hba.conf` (which already trusts local connections) needs no
changes — don't open port 5432 in the firewall.

## 3. Install Redis (Memurai)

This backend requires Redis for the mandatory 2FA login challenge and the
password-reset code (`src/services/loginChallengeService.js`,
`src/services/passwordResetOtpService.js`) — without it, every login and
every password reset fails, even though the app still boots (`REDIS_URL` has
a fallback default, it isn't in the production fail-fast list). Redis itself
isn't officially supported on Windows; **Memurai** is a Windows-native,
Redis-protocol-compatible service that installs as a normal Windows service
— this is the path of least resistance here.

1. Download the free **Memurai Developer** edition:
   https://www.memurai.com/get-memurai
2. Run the installer — it registers `Memurai` as a Windows service listening
   on `127.0.0.1:6379`, matching this app's default `REDIS_URL`
   (`redis://localhost:6379`, see `src/config/env.js`).
3. Verify it's running:

   ```powershell
   Get-Service Memurai
   ```

## 4. Get the code onto the server

```powershell
mkdir D:\apps
cd D:\apps
git clone https://github.com/loemratana/Depo_System_Tracking.git backend-src
git clone https://github.com/loemratana/Depo-System-Management.git frontend-src
```

(Both are public per this project's existing CI badges/URLs used elsewhere in
these docs — if either is private, `git clone` will prompt for GitHub
credentials/a personal access token.)

The backend code you actually run lives under `backend-src\Backend`.

## 5. Configure and install the backend

```powershell
cd D:\apps\backend-src\Backend
npm ci --omit=dev
```

`npm ci`'s `postinstall` runs `prisma generate` automatically (see
`package.json`'s `postinstall` script) — no separate step needed.

### 5.1 Create the production `.env`

Important, codebase-specific detail: `src/config/env.js` only ever auto-loads
`.env.local` then plain **`.env`** (`dotenv.config({path:'.env.local'});
dotenv.config();`) — it does **not** auto-load a file named `.env.production`.
That name only matters for the one-off `npm run prisma:migrate:deploy:prod`
helper (`scripts/run-with-env.js`), used from a developer's own machine that
also has a local `.env` for dev. On this server there is only one
environment, so the real file the running service reads is just `.env`,
sitting in `D:\apps\backend-src\Backend`.

```powershell
Copy-Item .env.example .env
notepad .env
```

Generate the required secrets with Node (works identically on Windows, no
OpenSSL dependency):

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"   # run twice → JWT_SECRET, JWT_REFRESH_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))" # → TOTP_ENCRYPTION_KEY (must decode to exactly 32 bytes)
```

Set at least these in `.env` (values from your own installs above):

```env
NODE_ENV=production
PORT=5000
HOST=127.0.0.1

DATABASE_URL="postgresql://depot_app:choose-a-long-random-password@localhost:5432/depot?schema=public"
DIRECT_URL="postgresql://depot_app:choose-a-long-random-password@localhost:5432/depot?schema=public"

JWT_SECRET=<generated above>
JWT_REFRESH_SECRET=<generated above>
JWT_ISSUER=depot-management-api
JWT_AUDIENCE=depot-management-client

TOTP_ENCRYPTION_KEY=<generated above>

REDIS_URL=redis://localhost:6379

CORS_ORIGIN=https://your-domain.example

# Optional but recommended — see config/mailer.js; without these, password
# reset codes are only written to the log file, not emailed.
SMTP_HOST=smtp.resend.com
SMTP_PORT=465
SMTP_USER=resend
SMTP_PASS=<your Resend API key>
SMTP_FROM="Depot System <no-reply@your-domain.example>"

LOG_TO_FILE=true
METRICS_TOKEN=<another long random value — required in production or /metrics is public>
```

`HOST=127.0.0.1` (not `0.0.0.0`) is deliberate: Caddy runs on the same
machine, so the Node process never needs to accept connections from anywhere
else. `DATABASE_URL`/`DIRECT_URL` are identical here because, unlike Supabase's
pooled connection, this is a direct local Postgres with no pooler in front of
it — see `prisma.config.js`'s comment on why migrations specifically need
`DIRECT_URL`.

Two local, filesystem-backed things this app creates relative to wherever
Node's working directory is (`src/config/multer.js`, `src/config/logger.js`):
`uploads\profiles`, `uploads\brands`, and `logs\app.log`/`logs\error.log` —
all under `D:\apps\backend-src\Backend` once the service's *AppDirectory* is
set to that folder in step 6. Nothing to create manually; they're created on
first write.

### 5.2 Run database migrations

```powershell
npm run prisma:migrate:deploy
```

Reads `.env` the normal way (no env-file override needed, since this *is*
the one environment on this machine). Confirm nothing's pending:

```powershell
npm run prisma:migrate:status
```

### 5.3 Seed the permission catalog and an initial admin user

The permission catalog (`src/services/permissionCatalog.js`) needs seeding
once against a fresh database, and you need at least one login to get in the
door:

```powershell
npm run seed
node scripts/create-local-admin.js
```

Check `scripts/create-local-admin.js`'s own output/prompts for the exact
credentials it creates — read it before running if you want to control the
username/password directly.

## 6. Run the backend as a Windows Service (NSSM)

Node has no built-in "run forever as a Windows service" story, so use
**NSSM** (Non-Sucking Service Manager) — a small, well-known, free tool for
exactly this.

1. Download NSSM: https://nssm.cc/download — grab the win64 build, extract
   `nssm.exe` somewhere permanent, e.g. `C:\tools\nssm.exe`.
2. Install the service:

   ```powershell
   C:\tools\nssm.exe install DepotBackend "C:\Program Files\nodejs\node.exe" "src\server.js"
   C:\tools\nssm.exe set DepotBackend AppDirectory "D:\apps\backend-src\Backend"
   C:\tools\nssm.exe set DepotBackend AppStdout "D:\apps\backend-src\Backend\logs\service-out.log"
   C:\tools\nssm.exe set DepotBackend AppStderr "D:\apps\backend-src\Backend\logs\service-err.log"
   C:\tools\nssm.exe set DepotBackend AppExit Default Restart
   C:\tools\nssm.exe set DepotBackend Start SERVICE_AUTO_START
   C:\tools\nssm.exe start DepotBackend
   ```

   `AppDirectory` is what makes `process.cwd()` inside the app resolve to the
   `Backend` folder — that's where it finds `.env`, and where it creates
   `uploads\` and `logs\`. `AppExit Default Restart` makes NSSM relaunch the
   process if it ever crashes.

3. Verify:

   ```powershell
   Get-Service DepotBackend
   curl http://127.0.0.1:5000/health/live
   ```

   Expect `{"status":"UP"}`. If it's not running, check
   `logs\service-err.log` first.

## 7. Build the frontend

```powershell
cd D:\apps\frontend-src
pnpm install --frozen-lockfile
pnpm build
```

Output lands in `D:\apps\frontend-src\dist` (`vercel.json`'s
`outputDirectory: dist` — same build, just run locally instead of on
Vercel). No `VITE_API_URL` needs setting: the app calls same-origin
`/api/v1` and `/uploads` (`src/lib/api.ts`), and Caddy (next step) reverse-
proxies those paths to the backend on the same domain — exactly the same
same-origin approach Vercel's `vercel.json` rewrites use, just implemented
with Caddy instead.

## 8. Install Caddy as the reverse proxy + static file server

Caddy is a single executable with automatic HTTPS built in — no separate
certbot-equivalent tool needed, unlike the nginx setup on the Linux VPS.

1. Download `caddy_windows_amd64.exe` from
   https://caddyserver.com/download and save it as
   `C:\caddy\caddy.exe`.
2. Create `C:\caddy\Caddyfile`:

   ```caddyfile
   your-domain.example {
       # Matches this backend's own multer limits (image uploads 5MB, Excel
       # import 10MB — src/config/multer.js) plus headroom.
       request_body {
           max_size 15MB
       }

       handle /api/* {
           reverse_proxy 127.0.0.1:5000
       }

       handle /uploads/* {
           reverse_proxy 127.0.0.1:5000
       }

       handle {
           root * D:\apps\frontend-src\dist
           try_files {path} /index.html
           file_server
       }
   }
   ```

   Replace `your-domain.example` with your real domain (must match the DNS A
   record from step 0, and the `CORS_ORIGIN` you set in `.env`). If you have
   no domain yet and just want to test over plain HTTP by IP, use
   `:80 { ... }` as the site address instead — Caddy then serves plain HTTP
   with no certificate, and you skip HTTPS until a domain is ready.

3. Install Caddy as a service, the same way as the backend:

   ```powershell
   C:\tools\nssm.exe install Caddy "C:\caddy\caddy.exe" "run --config C:\caddy\Caddyfile"
   C:\tools\nssm.exe set Caddy AppDirectory "C:\caddy"
   C:\tools\nssm.exe set Caddy AppExit Default Restart
   C:\tools\nssm.exe set Caddy Start SERVICE_AUTO_START
   C:\tools\nssm.exe start Caddy
   ```

4. Open the firewall for the ports the public actually uses:

   ```powershell
   New-NetFirewallRule -DisplayName "HTTP"  -Direction Inbound -Protocol TCP -LocalPort 80  -Action Allow
   New-NetFirewallRule -DisplayName "HTTPS" -Direction Inbound -Protocol TCP -LocalPort 443 -Action Allow
   ```

   Deliberately **not** opening 5000 (backend), 5432 (Postgres) or 6379
   (Redis) — they only need to be reachable from `127.0.0.1`, which Windows
   Firewall's default inbound rules already allow without any extra rule.

Caddy obtains and renews its own Let's Encrypt certificate automatically the
first time it starts with a real domain in the Caddyfile — no manual
certbot/win-acme step.

## 9. Verify end to end

From your own PC (not the server):

```powershell
curl https://your-domain.example/health/live
curl https://your-domain.example/api/v1/auth/login -Method POST -Body '{}' -ContentType 'application/json'
```

First should return `{"status":"UP"}`; second should return a `400` with
validation errors (proves the reverse proxy → backend path works). Then open
`https://your-domain.example` in a browser — you should see the sign-in
page, and since 2FA is mandatory system-wide, the first successful login
with a freshly-seeded admin account goes straight to the QR-code 2FA setup
screen.

## 10. Deploying an update later

There's no CI/CD wired up for this native Windows target (the existing
`.github/workflows/backend-cicd.yml` deploys a Docker image over SSH to the
Linux VPS — it doesn't apply here as-is). Until/unless you want a PowerShell-
based pipeline built for this box specifically, updates are manual:

```powershell
# Backend
cd D:\apps\backend-src
git pull
cd Backend
npm ci --omit=dev
npm run prisma:migrate:deploy   # only matters if new migrations were added
C:\tools\nssm.exe restart DepotBackend

# Frontend
cd D:\apps\frontend-src
git pull
pnpm install --frozen-lockfile
pnpm build
# no restart needed — Caddy serves the new dist\ files immediately
```

## 11. Backups

Postgres isn't backed up by anything above. A minimal nightly dump via
Windows Task Scheduler:

```powershell
& "C:\Program Files\PostgreSQL\17\bin\pg_dump.exe" -U depot_app -d depot -Fc -f "D:\backups\depot-$(Get-Date -Format yyyyMMdd).dump"
```

Wrap that line in a `.ps1` file and register it as a daily Scheduled Task
running as an account with access to `PGPASSWORD` (set it as an environment
variable for the task, or use a `.pgpass`-equivalent — `pg_dump` on Windows
reads `%APPDATA%\postgresql\pgpass.conf` in the same format as Linux's
`.pgpass`).

---

## Alternative: Docker Desktop with WSL2

If the server has virtualization available (check `systeminfo` for
"Virtualization Enabled In Firmware: Yes", and it isn't itself a nested VM
without nested-virtualization support), you can skip almost everything above
and reuse what's already built and tested for the Linux VPS instead:

1. `wsl --install` and reboot, then install **Docker Desktop for Windows**
   with the WSL2 backend enabled.
2. Enable **OpenSSH Server** on the Windows box (`Settings → Optional
   Features → OpenSSH Server`, or
   `Add-WindowsCapability -Online -Name OpenSSH.Server~~~~0.0.1.0`) so
   `deploy/deploy-backend.sh` can SSH in exactly like it does for the Linux
   VPS.
3. Copy `deploy/docker-compose.yml` (backend + redis + nginx + certbot) to
   the server and adjust bind-mount paths for Windows.
4. Point the `VPS_HOST`/`VPS_USER`/`VPS_SSH_KEY`/`VPS_HOST_KEY` GitHub
   secrets at this Windows box instead of the Linux VPS — the rest of
   `.github/workflows/backend-cicd.yml` and `deploy/deploy-backend.sh` runs
   unchanged, since both are plain `bash`/`docker compose` commands that work
   identically once OpenSSH + Docker are present.

This path gets you the same CI/CD (test → build → push to GHCR → SSH deploy
→ health-check → automatic rollback) with almost no new configuration, at
the cost of needing WSL2/virtualization support on the server. The native
setup above has no such prerequisite and is the more traditional "Windows
Server hosting" path — pick whichever matches what your server actually
supports and how much you want to keep the Docker-based pipeline.
