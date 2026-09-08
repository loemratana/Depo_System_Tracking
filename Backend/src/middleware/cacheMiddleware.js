import redis from "../config/redis.js";
import logger from "../config/logger.js";

/**
 * Cache middleware — caches GET responses in Redis.
 * @param {number} ttl  seconds to cache (default 60)
 */
export const cache = (ttl = 60) => async (req, res, next) => {
    if (req.method !== "GET") return next();

    const key = `cache:${req.originalUrl}`;

    try {
        const cached = await redis.get(key);
        if (cached) {
            res.setHeader("X-Cache", "HIT");
            return res.json(cached);
        }
    } catch (err) {
        logger.warn("Cache read error", { err, key });
    }

    // Intercept res.json to store in Redis
    const originalJson = res.json.bind(res);
    res.json = async (body) => {
        if (res.statusCode === 200) {
            await redis.set(key, body, {ex: ttl}).catch(() => {
            });
        }
        res.setHeader("X-Cache", "MISS");
        return originalJson(body);
    };

    next();
};