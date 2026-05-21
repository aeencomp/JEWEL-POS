#!/usr/bin/env bash
# Runs on VPS via GitHub Actions (or SSH). Bootstraps /var/www/jewel-pos if missing.
set -euo pipefail

APP_PATH="${APP_PATH:-/var/www/jewel-pos}"
REPO_URL="${REPO_URL:-https://github.com/aeencomp/JEWEL-POS.git}"
BRANCH="${BRANCH:-main}"

if [[ -n "${GITHUB_DEPLOY_TOKEN:-}" ]]; then
  CLONE_URL="https://${GITHUB_DEPLOY_TOKEN}@github.com/aeencomp/JEWEL-POS.git"
else
  CLONE_URL="$REPO_URL"
fi

sudo mkdir -p /var/www
sudo chown -R "$(whoami):$(whoami)" /var/www 2>/dev/null || true

if [[ ! -d "$APP_PATH/.git" ]]; then
  echo "==> Cloning repo into $APP_PATH"
  rm -rf "$APP_PATH"
  git clone --branch "$BRANCH" "$CLONE_URL" "$APP_PATH"
fi

cd "$APP_PATH"
git remote set-url origin "$REPO_URL" 2>/dev/null || true
git fetch origin
git checkout "$BRANCH"
git pull origin "$BRANCH"

chmod +x deploy/deploy.sh deploy/first-install.sh 2>/dev/null || true

if [[ ! -f .env ]]; then
  if [[ -z "${DATABASE_URL:-}" || -z "${SESSION_SECRET:-}" ]]; then
    echo "ERROR: .env missing. Add DATABASE_URL and SESSION_SECRET as GitHub Actions secrets."
    exit 1
  fi
  echo "==> Creating .env from GitHub secrets"
  cat > .env <<EOF
DATABASE_URL=${DATABASE_URL}
SESSION_SECRET=${SESSION_SECRET}
PORT=5000
NODE_ENV=production
EOF
  if [[ -n "${RESEND_API_KEY:-}" ]]; then
    echo "RESEND_API_KEY=${RESEND_API_KEY}" >> .env
  fi
  if [[ -n "${RESEND_FROM_EMAIL:-}" ]]; then
    echo "RESEND_FROM_EMAIL=${RESEND_FROM_EMAIL}" >> .env
  fi
fi

if ! command -v node >/dev/null 2>&1; then
  echo "ERROR: Node.js not installed on VPS. Run on VPS:"
  echo "  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -"
  echo "  sudo apt install -y nodejs && sudo npm install -g pm2"
  exit 1
fi

if ! command -v pm2 >/dev/null 2>&1; then
  echo "==> Installing PM2"
  sudo npm install -g pm2
fi

bash deploy/deploy.sh
