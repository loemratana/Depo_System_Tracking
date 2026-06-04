import { rateLimiter } from "../config/ratelimit.js";

export const rateLimitMiddleware = async (req, res, next) => {
    const ip = req.headers["x-forwarded-for"] ?? req.socket.remoteAddress;
    const { success, limit, remaining, reset } = await rateLimiter.limit(ip);

    // Always set rate limit headers
    res.setHeader("X-RateLimit-Limit",     limit);
    res.setHeader("X-RateLimit-Remaining", remaining);
    res.setHeader("X-RateLimit-Reset",     reset);

    if (!success) {
        return res.status(429).json({
            error:   "Too many requests",
            retryAfter: Math.ceil((reset - Date.now()) / 1000),
        });
    }
    next();
};