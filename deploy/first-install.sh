#!/usr/bin/env bash
# One-time setup on the VPS (run AFTER git clone, BEFORE first pm2 start).
set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$APP_DIR"

echo "==> JewelPOS first install in $APP_DIR"

if [[ ! -f .env ]]; then
  echo ""
  echo "Create .env first:"
  echo "  cp .env.example .env"
  echo "  nano .env"
  echo ""
  echo "Required: DATABASE_URL, SESSION_SECRET, PORT=5000, NODE_ENV=production"
  exit 1
fi

npm ci
npm run build
mkdir -p uploads

if command -v pm2 >/dev/null 2>&1; then
  pm2 start ecosystem.config.cjs --env production
  pm2 save
  echo "==> Started with PM2"
  pm2 status jewel-pos
else
  echo "Install PM2: sudo npm install -g pm2"
  echo "Then run: pm2 start ecosystem.config.cjs --env production"
fi

echo "==> First install done. App should listen on PORT from .env (default 5000)."
