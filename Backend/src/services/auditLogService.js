// services/auditLogService.js
//
// General-purpose, system-wide audit trail (audit_logs table) — distinct
// from AssessmentAuditEvent, which only covers the assessment lifecycle.
// Call this from a controller/service whenever a meaningful action needs a
// permanent, queryable record of who did what, to what, and from where.
import { prisma } from "../config/db.js";
import logger from "../config/logger.js";
import { getClientIp } from "../utils/clientIp.js";

// Prisma's Json fields only accept plain JSON-serializable values — a raw
// Date (e.g. a User row's createdAt/lastLogin, passed straight through as
// oldData/newData by a caller) fails Prisma's input validation. Round-
// tripping through JSON.stringify/parse converts Dates to ISO strings (and
// drops undefined/functions/etc.) the same way the DB column would store
// them anyway, so every caller is protected without having to remember to
// sanitize its own payload.
function toJsonSafe(value) {
  if (value == null) return undefined;
  return JSON.parse(JSON.stringify(value));
}

class AuditLogService {
  /**
   * Writes one audit_logs row. Never throws — a failure to record an audit
   * entry must not fail the business action that triggered it; the error
   * is logged instead (same philosophy as the app's winston logger itself,
   * see config/logger.js's `exitOnError: false`).
   */
  async log({
    userId = null,
    username = null,
    action,
    entityType = null,
    entityId = null,
    requestId = null,
    ipAddress = null,
    userAgent = null,
    oldData = null,
    newData = null,
    metadata = null,
  }) {
    try {
      await prisma.auditLog.create({
        data: {
          userId,
          username,
          action,
          entityType,
          entityId: entityId != null ? String(entityId) : null,
          requestId,
          ipAddress,
          userAgent,
          oldData: toJsonSafe(oldData),
          newData: toJsonSafe(newData),
          metadata: toJsonSafe(metadata),
        },
      });
    } catch (err) {
      logger.error("Failed to write audit log", {
        err,
        action: "audit_log.write_failed",
        auditAction: action,
      });
    }
  }

  /**
   * Convenience wrapper for the common case: called from inside an Express
   * request handler. Pulls request/IP/user-agent straight off `req` —
   *   - requestId: req.requestId, set by middleware/requestId.js
   *   - ipAddress: the real client IP behind Cloudflare/Traefik, via
   *     utils/clientIp.js (same resolution httpLogger.js uses)
   *   - userId/username: req.user, set by middleware/auth.js, when present
   * — so call sites only need to supply what happened and to what.
   *
   * userId/username can be passed explicitly to override req.user (or
   * supply it when there isn't one yet, e.g. a login attempt — the user
   * being identified by the very request this audit row is for).
   */
  async logFromRequest(
    req,
    { action, entityType, entityId, userId, username, oldData, newData, metadata },
  ) {
    return this.log({
      userId: userId !== undefined ? userId : (req.user?.id ?? null),
      username: username !== undefined ? username : (req.user?.username ?? null),
      action,
      entityType,
      entityId,
      requestId: req.requestId ?? null,
      ipAddress: getClientIp(req),
      userAgent: req.get?.("user-agent") || null,
      oldData,
      newData,
      metadata,
    });
  }
}

export const auditLogService = new AuditLogService();
export default auditLogService;
