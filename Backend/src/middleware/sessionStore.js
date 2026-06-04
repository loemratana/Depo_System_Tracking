import session    from "express-session";
import { Redis } from "@upstash/redis";
import ConnectRedis from "connect-redis";

const RedisStore = ConnectRedis(session);

const client = new Redis({
    url:   process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export const sessionMiddleware = session({
    store: new RedisStore({ client }),
    secret:            process.env.SESSION_SECRET,
    resave:            false,
    saveUninitialized: false,
    cookie: {
        secure:   process.env.NODE_ENV === "production",
        httpOnly: true,
        sameSite: "lax",
        maxAge:   24 * 60 * 60 * 1000, // 24 hours
    },
});