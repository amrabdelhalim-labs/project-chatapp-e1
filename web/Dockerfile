# syntax=docker/dockerfile:1.6
#
# Runtime-config web image:
# - `deps` stage locks node_modules + source in the image (no network at container start).
# - At `docker run`, the entrypoint runs `npm run build` using REACT_APP_* / PUBLIC_URL from env.

FROM node:22-alpine AS deps
WORKDIR /app

RUN npm config set fund false \
  && npm config set audit false

COPY package*.json ./
RUN npm ci

COPY . .

FROM node:22-alpine AS runner
WORKDIR /app

ARG DEFAULT_REACT_APP_API_URL=http://localhost:5000
ARG DEFAULT_PUBLIC_URL=/
ENV DEFAULT_REACT_APP_API_URL=$DEFAULT_REACT_APP_API_URL
ENV DEFAULT_PUBLIC_URL=$DEFAULT_PUBLIC_URL

RUN apk add --no-cache nginx curl wget \
  && mkdir -p /var/cache/nginx /var/log/nginx /usr/share/nginx/html /etc/nginx/http.d \
  && sed -i -e 's#/var/run/nginx.pid#/tmp/nginx.pid#g' -e 's#/run/nginx.pid#/tmp/nginx.pid#g' /etc/nginx/nginx.conf

COPY --from=deps /app /app

COPY nginx.conf /etc/nginx/http.d/default.conf

COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=120s --retries=3 \
  CMD sh -c 'wget -qO- http://127.0.0.1:8080/ >/dev/null || exit 1'

ENTRYPOINT ["/docker-entrypoint.sh"]
