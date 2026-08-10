# Depot API — production image (Node 22)
FROM node:22-bookworm-slim AS base

WORKDIR /app

ENV NODE_ENV=production \
    PORT=5000 \
    HOST=0.0.0.0 \
    LOG_FORMAT=json \
    LOG_TO_FILE=true \
    PUPPETEER_SKIP_DOWNLOAD=true \
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY prisma ./prisma
COPY prisma.config.js ./
RUN npx prisma generate

COPY src ./src

RUN mkdir -p uploads logs \
  && chown -R node:node /app

USER node

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||5000)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "src/server.js"]
