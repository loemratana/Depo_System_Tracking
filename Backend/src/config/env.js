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
  // Write JSON logs under Backend/logs for Promtail (recommended with monitoring stack)
  logToFile:
    process.env.LOG_TO_FILE === 'true' ||
    (isProduction && process.env.LOG_TO_FILE !== 'false'),
  metricsEnabled: process.env.METRICS_ENABLED !== 'false',
};

export default env;
