import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import depotRoutes from './routes/depotRoutes.js';
import authRoutes from './routes/authRoutes.js';
import provinceRoutes from './routes/provinceRoutes.js';
import districtRoutes from './routes/districtRoutes.js';
import employeeRoutes from './routes/employeeRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import db from './config/db.js';
import path from 'path';
import logger, { stream } from './config/logger.js';
import environment from './config/env.js';
import reportRoutes from './routes/reportRoutes.js';

const app = express();

/* ========================
   CORS CONFIG
======================== */
const corsOptions = {
  origin: true, // or your frontend URL
  credentials: true,
};

app.use(cors(corsOptions));

/* ========================
   SECURITY MIDDLEWARE
======================== */
app.use(helmet({
  contentSecurityPolicy: environment.isProduction,
  crossOriginEmbedderPolicy: environment.isProduction,
}));

/* ========================
   BODY PARSER
======================== */
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Serve static uploads
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

/* ========================
   COMPRESSION
======================== */
app.use(compression());

/* ========================
   LOGGING
======================== */
app.use(
  morgan(
    environment.isDevelopment ? 'dev' : 'combined',
    { stream }
  )
);

/* ========================
   RATE LIMITING
======================== */
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api', limiter);

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


/* ========================
   HEALTH CHECK
======================== */
app.get('/health', async (req, res) => {
  const dbHealth = await db.healthCheck?.() || { status: 'unknown' };

  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: environment.nodeEnv,
    database: dbHealth,
    memory: process.memoryUsage(),
    version: process.version,
  };

  const isHealthy = dbHealth.status === 'healthy';

  res.status(isHealthy ? 200 : 503).json(health);
});

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
      health: '/health',
      api: '/api',
    },
  });
});

/* ========================
   ROUTES (future)
======================== */
// import userRoutes from './routes/user.routes.js';
// app.use('/api/users', userRoutes);

/* ========================
   404 HANDLER
======================== */
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

export default app;