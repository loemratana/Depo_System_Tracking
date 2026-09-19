import client from 'prom-client';
import environment from '../config/env.js';
import logger from '../config/logger.js';

const register = new client.Registry();

client.collectDefaultMetrics({
  register,
  prefix: 'depot_',
});

const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [register],
});

const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

const httpRequestsInFlight = new client.Gauge({
  name: 'http_requests_in_flight',
  help: 'Number of HTTP requests currently being processed',
  registers: [register],
});

/** Collapse dynamic path segments so Prometheus cardinality stays low. */
function normalizeRoute(req) {
  if (req.route?.path != null) {
    const base = req.baseUrl || '';
    const routePath = req.route.path === '/' ? '' : req.route.path;
    return `${base}${routePath}` || req.path || 'unknown';
  }

  return (req.path || 'unknown')
    .replace(
      /\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
      '/:id',
    )
    .replace(/\/\d+/g, '/:id');
}

const QUIET_PATHS = new Set(['/metrics', '/health', '/health/live', '/health/ready']);

export function metricsMiddleware(req, res, next) {
  if (QUIET_PATHS.has(req.path)) {
    return next();
  }

  httpRequestsInFlight.inc();
  const end = httpRequestDuration.startTimer();

  res.on('finish', () => {
    const labels = {
      method: req.method,
      route: normalizeRoute(req),
      status_code: String(res.statusCode),
    };
    end(labels);
    httpRequestsTotal.inc(labels);
    httpRequestsInFlight.dec();
  });

  res.on('close', () => {
    if (!res.writableEnded) {
      httpRequestsInFlight.dec();
    }
  });

  next();
}

if (environment.isProduction && environment.metricsEnabled && !environment.metricsToken) {
  logger.warn(
    'METRICS_TOKEN is not set in production — GET /metrics is publicly readable. Set METRICS_TOKEN to require a bearer token.',
  );
}

/** No-op (open) when METRICS_TOKEN is unset, so local/dev scraping needs no setup. */
export function metricsAuthMiddleware(req, res, next) {
  if (!environment.metricsToken) return next();

  const header = req.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (token === environment.metricsToken) return next();

  res.status(401).json({ success: false, message: 'Unauthorized' });
}

export async function metricsHandler(_req, res) {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
}

export { register };
