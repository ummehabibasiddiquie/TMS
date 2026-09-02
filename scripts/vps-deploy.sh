#!/usr/bin/env bash
# Production deploy on VPS (run from ~/tms after git pull).
set -euo pipefail

cd "$(dirname "$0")/.."

echo "==> ensure upload directories"
mkdir -p public/uploads public/uploads/certificates

echo "==> npm install"
npm install

if grep -q '"db:migrate:deploy"' package.json 2>/dev/null; then
  echo "==> prisma migrate deploy"
  npm run db:migrate:deploy || npm run db:push
else
  echo "==> prisma db push"
  npm run db:push
fi

echo "==> next build (required — skipping this causes unstyled pages)"
npm run build

echo "==> restart PM2 app 'tms'"
if pm2 describe tms >/dev/null 2>&1; then
  pm2 restart tms
else
  echo "PM2 app 'tms' not found. Start with:"
  echo "  PORT=3001 pm2 start npm --name tms -- start"
  exit 1
fi

echo "==> smoke check"
sleep 2
CSS_PATH=$(curl -fsS http://127.0.0.1:3001/login 2>/dev/null | grep -oE '/_next/static/css/[^"]+\.css' | head -1 || true)
if [ -n "${CSS_PATH}" ]; then
  CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:3001${CSS_PATH}")
  echo "CSS ${CSS_PATH} -> HTTP ${CODE}"
  if [ "${CODE}" != "200" ]; then
    echo "WARNING: CSS not returning 200. Page may look unstyled in the browser."
    exit 1
  fi
else
  echo "WARNING: Could not find CSS path in /login HTML. Check build output."
fi

echo "Deploy finished. Open https://tms.tfshrms.cloud (hard refresh: Ctrl+Shift+R)."
