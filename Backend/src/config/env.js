import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

const nodeEnv = process.env.NODE_ENV || 'development';
const isProduction = nodeEnv === 'production';
const isDevelopment = nodeEnv === 'development';
const isTest = nodeEnv === 'test';

if (isProduction) {
  const missing = ['DATABASE_URL', 'JWT_SECRET', 'JWT_REFRESH_SECRET', 'TOTP_ENCRYPTION_KEY'].filter(
    (name) => !process.env[name],
  );
  if (missing.length > 0) {
    throw new Error(
      `Missing required production environment variable(s): ${missing.join(', ')}. ` +
        'Set them before starting the server — see .env.example.',
    );
  }
}

const INSECURE_DEV_JWT_SECRET = 'dev-only-insecure-jwt-secret-do-not-use-in-production';
const INSECURE_DEV_JWT_REFRESH_SECRET =
  'dev-only-insecure-jwt-refresh-secret-do-not-use-in-production';
// Must decode to exactly 32 bytes (AES-256) — this is the base64 encoding of
// 32 fixed bytes, not a random value, for the same reason the JWT dev
// secrets above are fixed: a misconfigured dev box should fail loudly and
// *consistently*, not generate a new key (and silently orphan every
// previously-encrypted TOTP secret) on each restart.
const INSECURE_DEV_TOTP_ENCRYPTION_KEY = 'ZGV2LW9ubHktaW5zZWN1cmUtdG90cC1rZXktMzJieSE=';

const jwtSecret = process.env.JWT_SECRET || INSECURE_DEV_JWT_SECRET;
const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET || INSECURE_DEV_JWT_REFRESH_SECRET;
const totpEncryptionKey = process.env.TOTP_ENCRYPTION_KEY || INSECURE_DEV_TOTP_ENCRYPTION_KEY;


const DEFAULT_CORS_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:8080',
  'http://localhost:5173',
];
const corsOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((origin) => origin.trim()).filter(Boolean)
  : DEFAULT_CORS_ORIGINS;

if (isProduction && !process.env.CORS_ORIGIN) {
  console.warn(
    '[config] CORS_ORIGIN is not set — falling back to the localhost-only ' +
      'default origin list, which almost certainly excludes your real ' +
      'frontend. Set CORS_ORIGIN to a comma-separated list of allowed origins.',
  );
}

const env = {
  nodeEnv,
  port: process.env.PORT || 5000,
  host: process.env.HOST || '0.0.0.0',
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret,
  // 32 raw bytes, base64-encoded — decode with Buffer.from(value, 'base64')
  // before use. See config/encryption.js.
  totpEncryptionKey,
  isDevelopment,
  isProduction,
  isTest,
  enableRateLimit: process.env.ENABLE_RATE_LIMIT === 'true',
  enableArcjet: process.env.ENABLE_ARCJET === 'true',

  // Nested, validated config namespaces (config.jwt.secret, config.cors.origins,
  // config.database.url, config.server.port) — additive, not a replacement for
  // the flat properties above/below that dozens of existing files already read;
  // this is what new/refactored code (config/jwt.js, app.js's CORS setup) uses.
  jwt: {
    secret: jwtSecret,
    refreshSecret: jwtRefreshSecret,
    accessExpiry: process.env.JWT_ACCESS_EXPIRY || '7d',
    refreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
    verifyExpiry: process.env.JWT_VERIFY_EXPIRY || '24h',
    // Mandatory-2FA-enrollment token (see authService.login's setupRequired
    // branch) — short-lived on purpose: it only ever needs to survive the
    // few minutes between password login and finishing TOTP setup.
    twoFactorSetupExpiry: process.env.JWT_2FA_SETUP_EXPIRY || '10m',
    issuer: process.env.JWT_ISSUER || 'depot-management-api',
    audience: process.env.JWT_AUDIENCE || 'depot-management-client',
  },
  database: {
    url: process.env.DATABASE_URL,
  },
  server: {
    port: process.env.PORT || 5000,
    host: process.env.HOST || '0.0.0.0',
  },
  cors: {
    origins: corsOrigins,
  },
  // Not required to boot (same convention as METRICS_TOKEN/Telegram below —
  // an unconfigured optional integration warns, it doesn't crash the app).
  // Without these, config/mailer.js logs the email instead of sending it,
  // so password reset stays testable locally with zero SMTP setup.
  smtp: {
    host: process.env.SMTP_HOST || null,
    port: Number(process.env.SMTP_PORT) || 587,
    user: process.env.SMTP_USER || null,
    pass: process.env.SMTP_PASS || null,
    from: process.env.SMTP_FROM || 'no-reply@depot-system.local',
  },

  // 2FA login-challenge store (config/redis.js, services/loginChallengeService.js).
  // Self-hosted Redis via docker-compose.yml's `redis` service — not
  // Upstash/@upstash-redis (see the 2FA design doc's §4 for why). Defaults
  // to the docker-compose network alias; override for local (non-compose)
  // dev, e.g. redis://localhost:6379.
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',

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
