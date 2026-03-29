# syntax=docker/dockerfile:1.6

FROM node:22-alpine AS deps
WORKDIR /app

# Build dependencies for native modules (e.g. bcrypt)
RUN apk add --no-cache --virtual .build-deps python3 make g++

COPY package*.json ./
RUN npm ci --omit=dev

FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

# Minimal runtime deps for HEALTHCHECK
RUN apk add --no-cache curl \
  && addgroup -S app \
  && adduser -S -G app -u 10001 app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package*.json ./
COPY . .

RUN chown -R app:app /app
USER app

EXPOSE 5000

# Tied to the app health endpoint
HEALTHCHECK --interval=10s --timeout=3s --start-period=15s --retries=5 \
  CMD sh -c 'curl -fsS "http://127.0.0.1:${PORT}/api/health" >/dev/null || exit 1'

CMD ["node", "index.js"]

