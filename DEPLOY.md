# Deploy JewelPOS to a VPS (GitHub + Neon)

This guide covers: push code to GitHub, clone on your VPS, connect to Neon PostgreSQL, and auto-deploy on every `git push` to `main`.

## What you need

- A VPS (Ubuntu 22.04+ recommended) with SSH access
- A GitHub account and repository
- Neon `DATABASE_URL` (with data already imported)
- A domain pointed to your VPS IP (optional but recommended for HTTPS)

## Part 1 — Push project to GitHub (on your PC)

### 1. Create a GitHub repo

On GitHub: **New repository** → name it e.g. `jewel-pos` → **Private** recommended → do not add README if the folder already has code.

### 2. Push from your PC

In PowerShell, from the project folder:

```powershell
cd C:\Users\AEEN.IQ\Desktop\JEWEL-POS

# One-time: only track app files (not .local Replit cache)
git add .
git status
# Confirm .env is NOT listed (it is gitignored)

git commit -m "Prepare JewelPOS for VPS deployment"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/jewel-pos.git
git push -u origin main
```

Replace `YOUR_USERNAME/jewel-pos` with your repo URL.

**Never commit `.env`** — secrets stay only on the VPS.

---

## Part 2 — First-time VPS setup

SSH into your VPS as root or a deploy user:

```bash
ssh user@YOUR_VPS_IP
```

### Install Node.js 20, Git, Nginx, PM2

```bash
sudo apt update
sudo apt install -y git nginx curl

curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

sudo npm install -g pm2
```

### Clone the repo

```bash
sudo mkdir -p /var/www
sudo chown $USER:$USER /var/www
cd /var/www
git clone https://github.com/YOUR_USERNAME/jewel-pos.git jewel-pos
cd jewel-pos
```

### Create production `.env` on the VPS

```bash
cp .env.example .env
nano .env
```

Set at minimum:

```env
DATABASE_URL=postgresql://...@ep-....neon.tech/neondb?sslmode=require
SESSION_SECRET=long-random-string-here
PORT=5000
NODE_ENV=production

# Optional — store 2FA emails
# RESEND_API_KEY=re_xxxxx
# RESEND_FROM_EMAIL=JewelPOS <noreply@yourdomain.com>
```

Use the Neon URL that **has your tables and data** (not an empty database).

### Install, build, and start

```bash
chmod +x deploy/deploy.sh
npm ci
npm run build

# If this is a brand-new empty Neon DB only:
# npm run db:push

pm2 start ecosystem.config.cjs --env production
pm2 save
pm2 startup
# Run the command PM2 prints, then:
pm2 save
```

App listens on **port 5000** locally.

### Nginx reverse proxy (public URL)

```bash
sudo cp deploy/nginx.example.conf /etc/nginx/sites-available/jewel-pos
sudo nano /etc/nginx/sites-available/jewel-pos
# Replace YOUR_DOMAIN with your domain or server IP

sudo ln -s /etc/nginx/sites-available/jewel-pos /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### HTTPS (recommended)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d YOUR_DOMAIN
```

Open `https://YOUR_DOMAIN` — store portal: `/store-portal`, admin: `/auth`.

---

## Part 3 — Auto-deploy from GitHub (CI/CD)

Every push to `main` can SSH into the VPS and run `deploy/deploy.sh`.

### 1. SSH key for GitHub Actions

On your **PC**:

```powershell
ssh-keygen -t ed25519 -f jewel-pos-deploy -N '""'
```

- **Public key** (`jewel-pos-deploy.pub`) → add to VPS: `~/.ssh/authorized_keys`
- **Private key** (`jewel-pos-deploy`) → GitHub secret (below)

On the **VPS**, ensure the deploy user can pull without a password prompt:

```bash
cd /var/www/jewel-pos
git config --global --add safe.directory /var/www/jewel-pos
# For private repos, use a deploy key or HTTPS token — see GitHub docs
```

### 2. GitHub repository secrets

Repo → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**:

| Secret | Example |
|--------|---------|
| `VPS_HOST` | `123.45.67.89` or `vps.yourdomain.com` |
| `VPS_USER` | `ubuntu` or your SSH user |
| `VPS_SSH_KEY` | Full private key file contents |
| `VPS_APP_PATH` | `/var/www/jewel-pos` |

### 3. Deploy workflow

The workflow file is already in the repo: `.github/workflows/deploy.yml`.

After secrets are set, push to `main`:

```powershell
git add .
git commit -m "Update app"
git push origin main
```

Check **Actions** tab on GitHub for deploy logs.

Manual deploy on the VPS anytime:

```bash
cd /var/www/jewel-pos
bash deploy/deploy.sh
```

---

## Part 4 — Uploads folder (images)

User-uploaded images are stored in `uploads/` on the server. That folder is gitignored.

- Back it up with your VPS snapshots, or
- Copy `uploads/` from your PC to the VPS:  
  `scp -r uploads user@VPS:/var/www/jewel-pos/`

---

## Checklist

| Step | Done? |
|------|-------|
| Neon DB has tables + your data | |
| `.env` on VPS with `DATABASE_URL` + `SESSION_SECRET` | |
| `npm run build` succeeds on VPS | |
| `pm2 status` shows `jewel-pos` online | |
| Nginx proxies to port 5000 | |
| HTTPS enabled (certbot) | |
| GitHub secrets configured | |
| Push to `main` triggers deploy | |

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Empty customers / no data | Wrong `DATABASE_URL` — use the Neon project that has your import |
| 502 Bad Gateway | `pm2 logs jewel-pos` — app not running or wrong port |
| Login session lost | Set `SESSION_SECRET` and use HTTPS; `trust proxy` is already enabled |
| Deploy fails on `git pull` | Fix Git auth on VPS for private repos (deploy key) |
| Build fails on VPS | Need ~1GB RAM; run `npm run build` manually and check errors |

```bash
pm2 logs jewel-pos --lines 100
pm2 restart jewel-pos
```
