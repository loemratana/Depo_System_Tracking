// utils/clientIp.js
//
// Real client IP resolution behind the actual production proxy chain:
//   Client -> Cloudflare -> Dokploy's Traefik -> Docker container -> here
//
// Cloudflare overwrites `CF-Connecting-IP` at its edge with the real
// visitor IP on every request it proxies — unlike `X-Forwarded-For`, there
// is no hop count to get right (Traefik sits between Cloudflare and the
// app, so a naive `trust proxy` hop count would have to know exactly how
// many proxies are in front, and get it wrong the moment that changes).
// This is only trusted when the app has been told it's behind a trusted
// proxy at all (`app.set('trust proxy', ...)` in app.js, true in
// production) — a client talking to the app directly (dev, or a request
// that somehow bypassed Cloudflare) cannot spoof its way past that gate.
//
// Falls back to Express's own proxy-aware `req.ip`, which already respects
// the `trust proxy` setting for the X-Forwarded-For chain.
const CF_CONNECTING_IP_HEADER = "cf-connecting-ip";

export function getClientIp(req) {
  const trustsProxy = Boolean(req.app?.get?.("trust proxy"));

  if (trustsProxy) {
    const cfIp = req.headers[CF_CONNECTING_IP_HEADER];
    if (typeof cfIp === "string" && cfIp.trim()) {
      return cfIp.trim();
    }
  }

  return req.ip || req.socket?.remoteAddress || null;
}
