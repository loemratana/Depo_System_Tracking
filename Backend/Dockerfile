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

# Pre-create the upload dirs so they exist (with correct ownership) in the
# image itself. Docker seeds a named/anonymous volume's initial content from
# whatever is already at that path in the image — if we didn't create this
# here, a `uploads:/app/uploads` volume would start out root-owned, and
# multer's mkdirSync/writes under it (see config/multer.js) would fail with
# EACCES as nodeuser.
RUN mkdir -p /app/uploads/profiles /app/uploads/brands

RUN chown -R nodeuser:nodejs /app
USER nodeuser

EXPOSE 5000

# Docker will ping /health/live every 30s. If it fails 3 times, the container
# is marked unhealthy. Deliberately liveness, not readiness (/health/ready) —
# a transient Postgres outage shouldn't make Docker think the Node process
# itself is stuck and restart the container over it.
# Use 127.0.0.1, not localhost — Alpine resolves "localhost" to ::1 first, and the
# app only binds the IPv4 wildcard, so "localhost" would fail with connection refused.
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:${PORT:-5000}/health/live || exit 1

CMD ["node", "src/server.js"]