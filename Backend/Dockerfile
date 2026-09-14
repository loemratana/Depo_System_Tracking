# ── Stage 1: Install dependencies ──────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

# Copy package files first — Docker caches this layer separately.
# If you only change src code (not package.json), Docker skips npm ci on rebuild.
COPY package*.json ./
# prisma/schema.prisma must exist before `npm ci`, since postinstall runs
# `prisma generate` against it.
COPY prisma ./prisma
RUN npm ci
COPY . .


# ── Stage 2: Production image ───────────────────────────────────────────────

FROM node:22-alpine AS production

ENV NODE_ENV=production \
    PORT=5000 \
    HOST=0.0.0.0

# Create a non-root user — running as root inside a container is a security risk
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodeuser -u 1001

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma
RUN npm ci --omit=dev

# Copy only the source code from the builder stage (not node_modules or dev files)
COPY --from=builder /app/src ./src

RUN chown -R nodeuser:nodejs /app
USER nodeuser

EXPOSE 5000

# Docker will ping /health every 30s. If it fails 3 times, the container is marked unhealthy.
# Use 127.0.0.1, not localhost — Alpine resolves "localhost" to ::1 first, and the
# app only binds the IPv4 wildcard, so "localhost" would fail with connection refused.
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:${PORT:-5000}/health || exit 1

CMD ["node", "src/server.js"]