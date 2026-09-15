// config/logger.js
import fs from "fs";
import path from "path";
import winston from "winston";
import environment from "./env.js";
import { requestContext } from "./requestContext.js";

const logsDir = path.join(process.cwd(), "logs");

/* ------------------------------------------------------------------ */
/* Error normalization                                                  */
/* ------------------------------------------------------------------ */
// Errors don't survive JSON.stringify on their own (message/stack are
// non-enumerable), so anything under `err`/`error` gets flattened into a
// plain, serializable object here before it reaches winston.format.json().
// winston.format.errors({ stack: true }) already covers the single-arg
// `logger.error(someError)` case; this covers `logger.error(msg, { err })`.
function serializeError(value, depth = 0) {
  if (depth > 3) return value;
  if (value instanceof Error) {
    const plain = {
      name: value.name,
      message: value.message,
      stack: value.stack,
    };
    for (const key of Object.keys(value)) {
      if (!(key in plain)) plain[key] = value[key];
    }
    if (value.cause !== undefined) {
      plain.cause = serializeError(value.cause, depth + 1);
    }
    return plain;
  }
  if (typeof value === "string") return { message: value };
  return value;
}

const ERROR_META_KEYS = ["err", "error"];

const errorMetaFormat = winston.format((info) => {
  for (const key of ERROR_META_KEYS) {
    if (info[key] !== undefined) info[key] = serializeError(info[key]);
  }
  return info;
})();

/* ------------------------------------------------------------------ */
/* Request context injection (request_id / user_id)                    */
/* ------------------------------------------------------------------ */
// Populated by middleware/requestId.js via AsyncLocalStorage — this makes
// the same request_id/user_id show up on every log line produced anywhere
// during a request (controller, service, db layer) with no need to pass
// it through every function call. Output keys are snake_case to match the
// centralized-logging schema (see monitoring/README.md); the
// AsyncLocalStorage store itself stays camelCase (requestId/userId) — an
// internal implementation detail used by requestContext.js's own API.
const contextFormat = winston.format((info) => {
  const store = requestContext.getStore();
  if (!store) return info;
  if (store.requestId && info.request_id === undefined) {
    info.request_id = store.requestId;
  }
  if (store.userId != null && info.user_id === undefined) {
    info.user_id = store.userId;
  }
  return info;
})();

/* ------------------------------------------------------------------ */
/* Sensitive-data redaction                                             */
/* ------------------------------------------------------------------ */
const REDACTED = "[REDACTED]";

// Matches: password, pwd, token, accessToken, refreshToken, authorization,
// cookie, secret, clientSecret, apiKey, api_key, databasePassword,
// jwtSecret, credential(s), etc. — by key name, case-insensitive.
const SENSITIVE_KEY_PATTERN =
  /pass(word)?|pwd|token|secret|authoriz|cookie|api[-_]?key|credential/i;

// Project-specific fields that don't match the pattern above but still
// carry credentials (e.g. a Postgres connection string embeds user:pass).
const SENSITIVE_EXACT_KEYS = new Set([
  "databaseurl",
  "directurl",
  "connectionstring",
]);

function isSensitiveKey(key) {
  const lower = key.toLowerCase();
  return SENSITIVE_EXACT_KEYS.has(lower) || SENSITIVE_KEY_PATTERN.test(lower);
}

function redactValue(value, seen, depth) {
  if (value == null || depth > 6) return value;
  if (Array.isArray(value)) {
    return value.map((item) => redactValue(item, seen, depth + 1));
  }
  if (typeof value === "object") {
    if (seen.has(value)) return "[Circular]";
    seen.add(value);
    const output = {};
    for (const [key, val] of Object.entries(value)) {
      output[key] = isSensitiveKey(key)
        ? REDACTED
        : redactValue(val, seen, depth + 1);
    }
    return output;
  }
  return value;
}

const redactFormat = winston.format((info) => {
  const seen = new WeakSet();
  for (const key of Object.keys(info)) {
    if (key === "level" || key === "message") continue;
    info[key] = isSensitiveKey(key)
      ? REDACTED
      : redactValue(info[key], seen, 0);
  }
  return info;
})();

/* ------------------------------------------------------------------ */
/* Shared pipeline + final renderers                                    */
/* ------------------------------------------------------------------ */
// Deliberately no winston.format.splat() here: nothing in this codebase
// uses %s-style interpolation, and splat's transform re-merges the
// *original* meta object onto `info` whenever there are no tokens to
// interpolate — which silently overwrites our serialized `err`/`error`
// with the raw (non-JSON-safe) Error instance again, undoing
// errorMetaFormat right before winston.format.json() runs.
const baseFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  errorMetaFormat,
  contextFormat,
  redactFormat,
);

const jsonFormat = winston.format.combine(baseFormat, winston.format.json());

// Human-readable console format for local development.
const prettyFormat = winston.format.combine(
  baseFormat,
  winston.format.colorize(),
  winston.format.timestamp({ format: "HH:mm:ss" }),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    let log = `${timestamp} ${level}: ${message}`;
    const rest = { ...meta };
    delete rest.service;
    delete rest.environment;
    if (Object.keys(rest).length > 0) {
      log += ` ${JSON.stringify(rest)}`;
    }
    if (stack) {
      log += `\n${stack}`;
    }
    return log;
  }),
);

const useJsonLogs = environment.logFormat === "json";
const transports = [
  new winston.transports.Console({
    format: useJsonLogs ? jsonFormat : prettyFormat,
  }),
];

if (environment.logToFile) {
  try {
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }

    transports.push(
      new winston.transports.File({
        filename: path.join(logsDir, "app.log"),
        format: jsonFormat,
        maxsize: 10_485_760, // 10MB
        maxFiles: 5,
      }),
      new winston.transports.File({
        filename: path.join(logsDir, "error.log"),
        level: "error",
        format: jsonFormat,
        maxsize: 5_242_880, // 5MB
        maxFiles: 5,
      }),
    );
  } catch (err) {
    // Read-only filesystem, missing permissions, etc. — stay on console-only
    // logging (the primary path in Docker anyway) instead of crashing boot.
    console.error(
      "Failed to initialize file logging, continuing with console only:",
      err.message,
    );
  }
}

const logger = winston.createLogger({
  level: environment.logLevel,
  defaultMeta: { service: "depot-api", environment: environment.nodeEnv },
  format: jsonFormat,
  transports,
  exitOnError: false,
});

export default logger;
