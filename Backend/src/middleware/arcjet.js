import aj from "../lib/arcjet.js";
import environment from "../config/env.js";
import logger from "../config/logger.js";

export async function arcjetMiddleware(req, res, next) {
  if (!environment.enableArcjet) {
    return next();
  }

  const decision = await aj.protect(req);

  if (decision.isDenied()) {
    logger.warn("Arcjet request denied", {
      action: "arcjet.denied",
      conclusion: decision.conclusion,
      path: req.path,
    });

    // Check which rule triggered the denial
    for (const result of decision.results) {
      if (result.reason.isShield()) {
        res.status(403).json({ error: "Forbidden", reason: "Shield" });
        return;
      }
      if (result.reason.isBot()) {
        res.status(403).json({ error: "Forbidden", reason: "Bot detected" });
        return;
      }
      if (result.reason.isRateLimit()) {
        res.status(429).json({ error: "Too many requests" });
        return;
      }
    }

    // Generic fallback
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  logger.debug("Arcjet decision", { conclusion: decision.conclusion });
  next();
}
