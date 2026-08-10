// config/logger.js
import winston from 'winston';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import environment from './env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const logsDir = path.join(process.cwd(), 'logs');

const jsonFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json(),
);

// Human-readable console format for local development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    let log = `${timestamp} ${level}: ${message}`;
    const rest = { ...meta };
    delete rest.service;
    if (Object.keys(rest).length > 0) {
      log += ` ${JSON.stringify(rest)}`;
    }
    if (stack) {
      log += `\n${stack}`;
    }
    return log;
  }),
);

const useJsonLogs = environment.logFormat === 'json';
const transports = [];

transports.push(
  new winston.transports.Console({
    format: useJsonLogs ? jsonFormat : consoleFormat,
  }),
);

if (environment.logToFile) {
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }

  transports.push(
    new winston.transports.File({
      filename: path.join(logsDir, 'app.log'),
      format: jsonFormat,
      maxsize: 10_485_760, // 10MB
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      format: jsonFormat,
      maxsize: 5_242_880,
      maxFiles: 5,
    }),
  );
}

const logger = winston.createLogger({
  level: environment.isDevelopment ? 'debug' : 'info',
  defaultMeta: { service: 'depot-api' },
  format: jsonFormat,
  transports,
  exitOnError: false,
});

export const stream = {
  write: (message) => {
    logger.info(message.trim(), { type: 'http' });
  },
};

export const logError = (error, context = '') => {
  if (error instanceof Error) {
    logger.error(`${context} - ${error.message}`, { stack: error.stack });
  } else {
    logger.error(`${context} - ${error}`);
  }
};

export const logInfo = (message, meta = {}) => {
  logger.info(message, meta);
};

export const logDebug = (message, meta = {}) => {
  if (environment.isDevelopment) {
    logger.debug(message, meta);
  }
};

export const logWarn = (message, meta = {}) => {
  logger.warn(message, meta);
};

export default logger;
