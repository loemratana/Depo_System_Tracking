# Monitoring stack — Grafana + Prometheus + Loki

Local observability for the Depot System Tracking backend.

## Architecture

```text
Express (/metrics, Winston JSON logs)
        │                    │
        ▼                    ▼
   Prometheus  ◄── Promtail ──► Loki
        │                         │
        ▼                         │
   Alertmanager ──► Telegram      │
        │                         │
        └──────────┬──────────────┘
                   ▼
                Grafana (:3001)
```

Prometheus scrapes **both** environments (see `prometheus/prometheus.yml`):
`depot-api` (your local `npm run dev`) and `depot-api-render` (the live
production deployment, over HTTPS). Every route is broken out individually
via the `route` label on `http_requests_total` / `http_request_duration_seconds`
(see `Backend/src/middleware/metrics.js`) — the dashboard's "Top routes (req/s)"
panel is this per-endpoint view.

## Quick start

### 1. Enable file logs on the API

In `Backend/.env` (or `.env.local`):

```env
LOG_FORMAT=json
LOG_TO_FILE=true
METRICS_ENABLED=true
```

Create the log folder once:

```powershell
New-Item -ItemType Directory -Force Backend\logs
```

### 2. Start the API (host)

```powershell
cd Backend
npm run dev
```

Check:

- Health: http://localhost:5000/health
- Metrics: http://localhost:5000/metrics

### 3. Start monitoring containers

```powershell
cd monitoring
copy .env.example .env
docker compose up -d
```

Optional Postgres metrics are included by default (`postgres-exporter` on :9187).
Set `POSTGRES_EXPORTER_DSN` in `monitoring/.env` if your DB credentials/port differ.

### 4. Open UIs

| Service    | URL |
|-----------|-----|
| Grafana   | http://localhost:3001 (admin / admin) |
| Prometheus| http://localhost:9090 |
| Alertmanager | http://localhost:9093 |
| Loki      | http://localhost:3100 |

Grafana dashboard: **Depot → Depot API Overview**

## What was added in the Backend

| Piece | Purpose |
|-------|---------|
| `GET /metrics` | Prometheus scrape endpoint (`prom-client`) |
| `GET /health` | Existing health check (DB + process) |
| Winston JSON + `logs/app.log` | Promtail → Loki |
| `Backend/Dockerfile` | Container image with JSON logging |

## Telegram alerts (Alertmanager)

Alert rules already exist in `prometheus/alerts.yml` (`DepotApiDown`,
`DepotApiHighErrorRate`, `DepotApiHighLatency`) and Prometheus is wired to
send firing alerts to Alertmanager (`:9093`). To actually get a Telegram
message when one fires:

1. In `monitoring/.env`, set `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID`
   (the same bot the app already uses for reports is fine).
2. `docker compose up -d alertmanager` (or `docker compose up -d` for
   everything) — `alertmanager/entrypoint.sh` renders
   `alertmanager.telegram.yml.template` with those values automatically.
3. Until both are set, Alertmanager runs with a no-op receiver — alerts
   still fire and are visible in Prometheus/Grafana, they just aren't
   delivered anywhere yet. Check `docker logs depot-alertmanager` to see
   which mode it started in.

## Securing `GET /metrics`

Both the Backend and Prometheus support a shared bearer token:

1. Set `METRICS_TOKEN` in the Backend's environment (Render dashboard for
   production, `Backend/.env` for local) to a long random string.
2. Put the same value in `monitoring/prometheus/secrets/metrics_token`
   (gitignored — copy `metrics_token.example` for the format) so the
   `depot-api-render` scrape job can authenticate.
3. Until `METRICS_TOKEN` is set on the Backend, `/metrics` stays open
   (dev-friendly default) — the backend logs a warning on boot if it's
   running in production without one.

## Production notes

- **Set `METRICS_TOKEN`** — as of this setup, production's `/metrics` was
  found publicly readable with no auth. See "Securing GET /metrics" above.
- **Set `NODE_ENV=production` on Render** — production was found reporting
  `"environment":"development"` from `/health`, which means it's also
  running with dev logging (pretty, not JSON — Promtail/Loki won't parse it
  well) and dev rate-limit/trust-proxy defaults. This has to be fixed in
  Render's dashboard, not from this repo.
- Change `GRAFANA_ADMIN_PASSWORD` — note it only takes effect on a **new**
  `grafana_data` volume; Grafana ignores the env var once the volume exists.
- Point `POSTGRES_EXPORTER_DSN` at your managed Postgres (Supabase may need
  allow-listing / direct connection).
- Prefer scraping a private network URL instead of `host.docker.internal`.
- This whole stack currently only runs when someone's machine has
  `docker compose up -d` running in `monitoring/` — for always-on production
  monitoring (alerts firing while nobody's laptop is on), it needs to be
  deployed to a persistent host.

## Stop

```powershell
docker compose -f monitoring/docker-compose.yml down
```

Volumes (`prometheus_data`, `loki_data`, `grafana_data`) keep history unless you add `-v`.
