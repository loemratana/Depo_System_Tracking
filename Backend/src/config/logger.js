// config/logger.js
import winston from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';
import environment from './env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Custom log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    let log = `${timestamp} [${level.toUpperCase()}]: ${message}`;

    if (Object.keys(meta).length > 0) {
      log += ` ${JSON.stringify(meta)}`;
    }

    if (stack) {
      log += `\n${stack}`;
    }

    return log;
  })
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let log = `${timestamp} ${level}: ${message}`;

    if (Object.keys(meta).length > 0 && meta.stack !== undefined) {
      log += ` ${JSON.stringify(meta)}`;
    }

    return log;
  })
);

// Configure transports
const transports = [];

// Always log to console
transports.push(
  new winston.transports.Console({
    format: environment.isDevelopment ? consoleFormat : winston.format.simple(),
  })
);

// Log to file in production
if (environment.isProduction) {
  transports.push(
    new winston.transports.File({
      filename: path.join(__dirname, '../logs/error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: path.join(__dirname, '../logs/combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  );
}

// Create logger instance
const logger = winston.createLogger({
  level: environment.isDevelopment ? 'debug' : 'info',
  format: logFormat,
  transports,
  exitOnError: false,
});

// Create stream for Morgan HTTP logging
export const stream = {
  write: (message) => {
    logger.info(message.trim());
  },
};

// Helper methods
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