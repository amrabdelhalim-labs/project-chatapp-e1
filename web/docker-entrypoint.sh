#!/bin/sh
set -e
# Build-time env for CRA: set at container start (no npm install here; deps are baked in the image).
export REACT_APP_API_URL="${REACT_APP_API_URL:-${DEFAULT_REACT_APP_API_URL:-http://localhost:5000}}"
export PUBLIC_URL="${PUBLIC_URL:-${DEFAULT_PUBLIC_URL:-/}}"

cd /app
npm run build

rm -rf /usr/share/nginx/html/*
cp -a build/. /usr/share/nginx/html/
chown -R nginx:nginx /usr/share/nginx/html /var/cache/nginx /var/log/nginx 2>/dev/null || true

exec nginx -g 'daemon off;'
