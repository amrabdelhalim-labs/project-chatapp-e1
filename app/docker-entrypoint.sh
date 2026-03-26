#!/bin/sh
set -e
# API URL for react-native-dotenv / app config — written at container start (no npm install here).
export API_URL="${API_URL:-${DEFAULT_API_URL:-http://localhost:5000}}"
printf 'API_URL=%s\n' "$API_URL" > /app/.env

export EXPO_DISABLE_TELEMETRY=1
export CI=1
export NODE_ENV=production

cd /app
rm -rf dist
npm run export:web

rm -rf /usr/share/nginx/html/*
cp -a dist/. /usr/share/nginx/html/
chown -R nginx:nginx /usr/share/nginx/html /var/cache/nginx /var/log/nginx 2>/dev/null || true

exec nginx -g 'daemon off;'
