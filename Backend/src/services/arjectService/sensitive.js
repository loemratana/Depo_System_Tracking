import aj from "../lib/arcjet.js";
import { detectSensitiveInfo } from "@arcjet/node";

const sensitiveAj = aj.withRule(
  detectSensitiveInfo({
    mode: "LIVE",
    deny: [
      "CREDIT_CARD_NUMBER",
      "SOCIAL_SECURITY_NUMBER",
      "PHONE_NUMBER",
      "EMAIL_ADDRESS",
      "IP_ADDRESS",
    ],
  }),
);

export async function sensitiveHandler(req, res) {
  const decision = await sensitiveAj.protect(req);

  if (decision.isDenied()) {
    res
      .status(400)
      .json({ error: "Sensitive information detected in request" });
    return;
  }

  res.json({ ok: true });
}
