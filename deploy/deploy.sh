#!/usr/bin/env bash
# Run on the VPS after git pull (also used by GitHub Actions deploy workflow).
set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$APP_DIR"

echo "==> Deploying JewelPOS in $APP_DIR"

if [[ ! -f .env ]]; then
  echo "ERROR: Missing .env file. Copy .env.example to .env and set DATABASE_URL, SESSION_SECRET."
  exit 1
fi

git pull origin main

npm ci
npm run build

mkdir -p uploads

if command -v pm2 >/dev/null 2>&1; then
  pm2 startOrRestart ecosystem.config.cjs --env production
  pm2 save
  echo "==> PM2 status:"
  pm2 status jewel-pos
else
  echo "WARN: pm2 not installed. Start manually: NODE_ENV=production npm start"
fi

echo "==> Deploy finished."
