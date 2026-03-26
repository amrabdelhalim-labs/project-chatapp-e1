# syntax=docker/dockerfile:1.6
#
# Runtime-config Expo web export:
# - `deps` locks node_modules + source (no npm install at container start).
# - Entrypoint runs `npm run export:web` after writing `.env` from API_URL.

FROM node:22-alpine AS deps
WORKDIR /app

RUN apk add --no-cache --virtual .build-deps python3 make g++

COPY package*.json ./
RUN npm ci --legacy-peer-deps

COPY . .

FROM node:22-alpine AS runner
WORKDIR /app

ARG DEFAULT_API_URL=http://localhost:5000
ENV DEFAULT_API_URL=$DEFAULT_API_URL

RUN apk add --no-cache curl nginx wget \
  && mkdir -p /var/cache/nginx /var/log/nginx /usr/share/nginx/html /etc/nginx/http.d \
  && sed -i -e 's#/var/run/nginx.pid#/tmp/nginx.pid#g' -e 's#/run/nginx.pid#/tmp/nginx.pid#g' /etc/nginx/nginx.conf

COPY --from=deps /app /app

COPY nginx.conf /etc/nginx/http.d/default.conf

COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=180s --retries=5 \
  CMD sh -c 'curl -fsS http://127.0.0.1:8080/ >/dev/null || exit 1'

ENTRYPOINT ["/docker-entrypoint.sh"]
