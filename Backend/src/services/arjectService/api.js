import aj from "../../lib/arcjet.js";
import { tokenBucket, fixedWindow, slidingWindow } from "@arcjet/node";


// token buck :good for burst traffic

const  apiBucket  = aj.withRule(
  tokenBucket({
    mode: "LIVE",
    characteristics: ["ip.src"],
    refillRate: 10,
    interval:"1m",
    capacity :50,
  })
)
export async function apiHandler(req, res) {
  const decision = await apiBucket.protect(req, {
    requested: 1, // consume 1 token per request
  });

  if (decision.isDenied()) {
    res.status(429).json({
      error: "Rate limit exceeded",
      reset: decision.reason.resetTime, // when the limit resets
    });
    return;
  }

  res.json({ data: "Your API response" });
}

// --- Fixed Window: simple, resets on interval ---
const fixedAj = aj.withRule(
  fixedWindow({
    mode: "LIVE",
    characteristics: ["ip.src"],
    window: "1h", // 1 hour window
    max: 100, // max 100 requests per window
  }),
);

// --- Sliding Window: smoother than fixed ---
const slidingAj = aj.withRule(
  slidingWindow({
    mode: "LIVE",
    characteristics: ["ip.src"],
    interval: "1h",
    max: 100,
  }),
);
