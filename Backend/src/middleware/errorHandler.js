// middleware/errorHandler.js
// Centralized fallback for errors passed to next(error) — either directly
// (an AppError from a service, see utils/app-error.js) or automatically:
// Express 5 forwards a rejected/thrown promise from any async route
// handler here on its own, no try/catch or asyncHandler wrapper needed.
//
// Response shape: `err.isOperational` (set by AppError — an anticipated
// failure like "not found" or "invalid credentials") means `err.message`/
// `err.code` are safe to send to the client as-is. Anything else (a plain
// Error, a Prisma error, a TypeError from a real bug) is NOT operational —
// its real message/stack could contain SQL, file paths, or other internals,
// so the client only ever sees a generic "Internal server error" while the
// full error is still logged here for debugging.
import logger from "../config/logger.js";
import { getClientIp } from "../utils/clientIp.js";

const GENERIC_MESSAGE = "Internal server error";
const GENERIC_CODE = "INTERNAL_ERROR";

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  const isOperational = err.isOperational === true;
  const statusCode = isOperational ? err.statusCode : err.statusCode || err.status || 500;

  logger.error(err.message || "Unhandled request error", {
    err,
    action: "http.unhandled_error",
    method: req.method,
    path: req.baseUrl + (req.route?.path || req.path),
    status: statusCode,
    ip: getClientIp(req),
  });

  if (res.headersSent) return;

  res.status(statusCode).json({
    success: false,
    message: isOperational ? err.message : GENERIC_MESSAGE,
    code: isOperational ? err.code || GENERIC_CODE : GENERIC_CODE,
    requestId: req.requestId,
  });
}
