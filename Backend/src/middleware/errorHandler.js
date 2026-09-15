// middleware/errorHandler.js
// Centralized fallback for errors passed to next(error) (or thrown in sync
// middleware/body-parser). Most controllers already catch and respond
// themselves, so this mainly logs+normalizes the paths that don't (a chunk
// of kpiSystemController/depotController/staffController use next(error)
// and previously fell through to Express's default handler, which neither
// logs via Winston nor returns this API's usual { success, message } shape).
import logger from "../config/logger.js";
import { getClientIp } from "../utils/clientIp.js";

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || err.status || 500;

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
    message: err.message || "Internal server error",
    requestId: req.requestId,
  });
}
