import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

const nodeEnv = process.env.NODE_ENV || 'development';
const isProduction = nodeEnv === 'production';
const isDevelopment = nodeEnv === 'development';

const env = {
  nodeEnv,
  port: process.env.PORT || 5000,
  host: process.env.HOST || '0.0.0.0',

  databaseUrl: process.env.DATABASE_URL,

  jwtSecret: process.env.JWT_SECRET,

  isDevelopment,
  isProduction,
  isTest: nodeEnv === 'test',

  enableRateLimit: process.env.ENABLE_RATE_LIMIT === 'true',
  enableArcjet: process.env.ENABLE_ARCJET === 'true',

  // Observability
  // LOG_FORMAT=json for Loki; default json in production
  logFormat:
    process.env.LOG_FORMAT || (isProduction ? 'json' : 'pretty'),
  // LOG_LEVEL=debug|info|warn|error; default debug in dev, info in production
  logLevel: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),
  // stdout/stderr is the only supported log destination in production —
  // Docker's own log driver is the source of truth, collected by Grafana
  // Alloy directly from the Docker Engine API (see monitoring/README.md).
  // File logging is an explicit opt-in for local debugging only; it used to
  // default on in production for the old Promtail file-tailing setup, which
  // no longer exists.
  logToFile: process.env.LOG_TO_FILE === 'true',
  // HTTP requests slower than this are logged as a warning (see middleware/httpLogger.js)
  logSlowRequestMs: Number(process.env.LOG_SLOW_REQUEST_MS) || 1000,
  metricsEnabled: process.env.METRICS_ENABLED !== 'false',
  // When set, GET /metrics requires `Authorization: Bearer <token>`.
  // Unset by default so local/dev scraping keeps working without extra setup —
  // see monitoring/README.md for why this must be set in production.
  metricsToken: process.env.METRICS_TOKEN || null,
};

export default env;
