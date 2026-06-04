import { Redis } from "@upstash/redis";

const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,   // Required
    token: process.env.UPSTASH_REDIS_REST_TOKEN, // Required

    // Optional: suppress per-command latency logs
    latencyLogging: false,

    // Optional: batch concurrent commands into one HTTP request
    enableAutoPipelining: true,

    // Optional: disable automatic base64 encoding (only if data is always valid JSON)
    // enableTelemetry: false,
});