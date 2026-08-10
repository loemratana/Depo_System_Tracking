# Monitoring stack — Grafana + Prometheus + Loki

Local observability for the Depot System Tracking backend.

## Architecture

```text
Express (/metrics, Winston JSON logs)
        │                    │
        ▼                    ▼
   Prometheus  ◄── Promtail ──► Loki
        │                         │
        └──────────┬──────────────┘
                   ▼
                Grafana (:3001)
```

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
| Loki      | http://localhost:3100 |

Grafana dashboard: **Depot → Depot API Overview**

## What was added in the Backend

| Piece | Purpose |
|-------|---------|
| `GET /metrics` | Prometheus scrape endpoint (`prom-client`) |
| `GET /health` | Existing health check (DB + process) |
| Winston JSON + `logs/app.log` | Promtail → Loki |
| `Backend/Dockerfile` | Container image with JSON logging |

## Telegram alerts (Grafana)

1. Grafana → **Alerting → Contact points → New**
2. Type: **Telegram**
3. Bot token + chat ID (same bot you use for the app is fine)
4. Create alert rules from Prometheus metrics, e.g.:
   - `up{job="depot-api"} == 0`
   - 5xx rate / latency (also defined in `prometheus/alerts.yml`)

Prometheus alert rules are loaded from `prometheus/alerts.yml`. Wire **Alertmanager** or use **Grafana unified alerting** (recommended for Telegram).

## Production notes

- Do **not** expose `/metrics` publicly without a firewall, VPN, or auth.
- Change `GRAFANA_ADMIN_PASSWORD`.
- Point `POSTGRES_EXPORTER_DSN` at your managed Postgres (Supabase may need allow-listing / direct connection).
- Prefer scraping a private network URL instead of `host.docker.internal`.

## Stop

```powershell
docker compose -f monitoring/docker-compose.yml down
```

Volumes (`prometheus_data`, `loki_data`, `grafana_data`) keep history unless you add `-v`.
