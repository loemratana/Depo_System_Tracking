import aj from "../lib/arcjet.js";
import { validateEmail, detectBot, slidingWindow } from "@arcjet/node";

const signupAj = aj
  .withRule(
    validateEmail({
      mode: "LIVE",
      // Block these types of emails
      block: [
        "DISPOSABLE", // temp/throwaway email services
        "INVALID", // bad format or unresolvable domain
        "NO_MX_RECORDS", // domain has no mail server
        "FREE", // optional: block Gmail, Yahoo, etc.
      ],
    }),
  )
  .withRule(
    detectBot({
      mode: "LIVE",
      // Block all bots except legitimate ones
      allow: [
        "CATEGORY:SEARCH_ENGINE", // Google, Bing, etc.
        "CATEGORY:MONITOR", // Uptime monitors
      ],
    }),
  )
  .withRule(
    slidingWindow({
      mode: "LIVE",
      characteristics: ["ip.src"],
      interval: "1h",
      max: 10, // only 10 signups per IP per hour
    }),
  );

export async function signupHandler(req, res) {
  const { email } = req.body;

  const decision = await signupAj.protect(req, { email });

  if (decision.isDenied()) {
    for (const result of decision.results) {
      if (result.reason.isEmail()) {
        res.status(400).json({
          error: "Invalid email",
          detail: result.reason.emailTypes, // e.g. ["DISPOSABLE"]
        });
        return;
      }
      if (result.reason.isBot()) {
        res.status(403).json({ error: "Bot detected" });
        return;
      }
      if (result.reason.isRateLimit()) {
        res.status(429).json({ error: "Too many signups" });
        return;
      }
    }
  }

  // Proceed with registration
  res.json({ success: true });
}
