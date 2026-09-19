import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import depotRoutes from './routes/depotRoutes.js';
import authRoutes from './routes/authRoutes.js';
import provinceRoutes from './routes/provinceRoutes.js';
import districtRoutes from './routes/districtRoutes.js';
import employeeRoutes from './routes/employeeRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import db from './config/db.js';
import brandRoutes from "./routes/brandRoutes.js";
import path from 'path';
import environment from './config/env.js';
import reportRoutes from "./routes/reportRoutes.js";
import kpiSystemRoutes from "./routes/kpiSystemRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import telegramRoutes from "./routes/telegramRoutes.js";
import managerRoutes from "./routes/managerRoutes.js";
import permissionRoutes from "./routes/permissionRoutes.js";
import assessmentRoutes from "./routes/assessmentRoutes.js";
import {
  metricsAuthMiddleware,
  metricsHandler,
  metricsMiddleware,
} from './middleware/metrics.js';
import { requestIdMiddleware } from './middleware/requestId.js';
import { httpLogger } from './middleware/httpLogger.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();

// Trivial Express fingerprinting — helmet doesn't remove this header itself.
app.disable('x-powered-by');

/* ========================
   REQUEST ID / HTTP LOGGING
======================== */
// Runs first so every response carries X-Request-ID and every log line
// produced further down the chain (including inside services/db calls,
// via AsyncLocalStorage) is tagged with it.
app.use(requestIdMiddleware);
app.use(httpLogger);

/* ========================
   CORS CONFIG
======================== */
// Origins come from CORS_ORIGIN (comma-separated) — see config/env.js for
// the default fallback and the production warning when it's unset. Never
// commit a real origin list (or a personal tunnel URL) here again.
const corsOptions = {
  origin: environment.cors.origins,
  credentials: true,
};

app.use(cors(corsOptions));
// Render / reverse proxies: trust X-Forwarded-* so rate-limit & IPs work correctly
app.set('trust proxy', environment.isProduction || process.env.TRUST_PROXY === '1' ? 1 : 0);
/* ========================
   SECURITY MIDDLEWARE
======================== */
app.use(
  helmet({
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: false,
  }),
);

/* ========================
   BODY PARSER
======================== */
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Serve static uploads
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
// Add CORS and cross-origin headers for the /uploads route
app.use('/uploads',(req,res,next)=>{
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
  next()
})
/* ========================
   COMPRESSION
======================== */
app.use(compression());

/* ========================
   METRICS (Prometheus)
======================== */
if (environment.metricsEnabled) {
  app.use(metricsMiddleware);
  app.get('/metrics', metricsAuthMiddleware, metricsHandler);
}

/* ========================
   RATE LIMITING (optional — off in dev by default)
======================== */
if (environment.enableRateLimit) {
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use('/api', limiter);
}

/* ========================
   ROUTES
======================== */
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/provinces', provinceRoutes);
app.use('/api/v1/districts', districtRoutes);
app.use('/api/v1/employees', employeeRoutes);
app.use('/api/v1/upload', uploadRoutes);
app.use('/api/v1/depots', depotRoutes);
app.use('/api/v1/report', reportRoutes);
app.use('/api/v1/brands', brandRoutes);
app.use("/api/v1/kpis", kpiSystemRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/telegram', telegramRoutes);
app.use('/api/v1/managers', managerRoutes);
app.use('/api/v1/permissions', permissionRoutes);
app.use('/api/v1/assessments', assessmentRoutes);


/* ========================
   HEALTH CHECKS
======================== */
// Liveness: is the Node process itself running? Must NOT depend on
// Postgres (or anything else) — this is what the Dockerfile's HEALTHCHECK
// polls, and a container getting marked unhealthy over a transient DB blip
// (rather than the process actually being stuck) risks unnecessary restarts.
app.get('/health/live', (req, res) => {
  res.status(200).json({ status: 'UP' });
});

// Readiness: can the app actually serve traffic right now? Checks required
// dependencies (Postgres). /health is kept as an alias for backward
// compatibility — it used to be the only health endpoint and conflated
// both checks.
async function readinessHandler(req, res) {
  const dbHealth = await db.healthCheck?.() || { status: 'unknown' };

  const health = {
    status: dbHealth.status === 'healthy' ? 'ok' : 'unavailable',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: environment.nodeEnv,
    database: dbHealth,
    memory: process.memoryUsage(),
    version: process.version,
  };

  res.status(dbHealth.status === 'healthy' ? 200 : 503).json(health);
}

app.get('/health/ready', readinessHandler);
app.get('/health', readinessHandler);

/* ========================
   ROOT ROUTE
======================== */
app.get('/', (req, res) => {
  res.json({
    name: 'API Server',
    version: '1.0.0',
    status: 'running',
    environment: environment.nodeEnv,
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/health/ready',
      live: '/health/live',
      metrics: '/metrics',
      api: '/api',
    },
  });
});

/* ========================
   ROUTES (future)
======================== */

/* ========================
   404 HANDLER
======================== */
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

/* ========================
   ERROR HANDLER (must be last)
======================== */
app.use(errorHandler);

export default app;