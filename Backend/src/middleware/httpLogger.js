// middleware/httpLogger.js
// Structured replacement for morgan: one JSON-friendly log line per request
// (method, path, status, duration_ms, ip, user_agent, request_id — the
// latter is injected automatically by the logger's context format, see
// config/logger.js) plus an optional slow-request warning. Health/metrics
// polling is skipped to avoid drowning real traffic in noise.
import environment from "../config/env.js";
import logger from "../config/logger.js";
import { getClientIp } from "../utils/clientIp.js";

const SLOW_REQUEST_MS = environment.logSlowRequestMs;

// Frequently polled by uptime checks / Prometheus — only log these if they
// fail, not on every successful poll.
const QUIET_PATHS = new Set(["/health", "/metrics"]);

function levelForStatus(statusCode) {
  if (statusCode >= 500) return "error";
  if (statusCode >= 400) return "warn";
  return "info";
}

export function httpLogger(req, res, next) {
  const startedAt = process.hrtime.bigint();

  res.on("finish", () => {
    const path = req.baseUrl + (req.route?.path || req.path);
    const statusCode = res.statusCode;

    if (QUIET_PATHS.has(req.path) && statusCode < 400) return;

    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
    const meta = {
      type: "http",
      method: req.method,
      path,
      status: statusCode,
      duration_ms: Math.round(durationMs),
      ip: getClientIp(req),
      user_agent: req.get("user-agent") || null,
    };

    logger.log(
      levelForStatus(statusCode),
      `${req.method} ${path} ${statusCode}`,
      meta,
    );

    if (durationMs > SLOW_REQUEST_MS) {
      logger.warn("Slow HTTP request", {
        ...meta,
        action: "http.slow_request",
        thresholdMs: SLOW_REQUEST_MS,
      });
    }
  });

  next();
}
