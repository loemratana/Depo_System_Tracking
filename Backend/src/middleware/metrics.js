import client from 'prom-client';

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

export function metricsMiddleware(req, res, next) {
  if (req.path === '/metrics' || req.path === '/health') {
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

export async function metricsHandler(_req, res) {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
}

export { register };
