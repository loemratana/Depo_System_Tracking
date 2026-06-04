import aj from "../lib/arcjet.js";

export async function arcjetMiddleware(req, res, next) {
  const decision = await aj.protect(req);

  // Log the decision for observability
  console.log("Arcjet decision:", decision.conclusion);

  if (decision.isDenied()) {
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

  next();
}
