# Deploy from your PC (GitHub → VPS)

Do everything on Windows; GitHub Actions updates the VPS automatically.

## Step 1 — GitHub secrets (one time)

Open: **https://github.com/aeencomp/JEWEL-POS/settings/secrets/actions**

Click **New repository secret** for each:

| Secret name | Value |
|-------------|--------|
| `VPS_HOST` | VPS IP or hostname (e.g. from Hostkey panel) |
| `VPS_USER` | `deploy` |
| `VPS_SSH_KEY` | Private SSH key (full file) used to log into VPS |
| `VPS_APP_PATH` | `/home/deploy/jewel-pos` (no sudo needed) |
| `DATABASE_URL` | Your Neon connection string (with data) |
| `SESSION_SECRET` | Long random string |
| `REPO_CLONE_TOKEN` | GitHub PAT with `repo` scope (needed if repo is **private**) |

Optional: `RESEND_API_KEY`, `RESEND_FROM_EMAIL`

### SSH key for `VPS_SSH_KEY`

On PC (if you do not have a key yet):

```powershell
ssh-keygen -t ed25519 -f $env:USERPROFILE\.ssh\jewel-vps -N '""'
```

- Public key → VPS: add to `/home/deploy/.ssh/authorized_keys`
- Private key → paste into GitHub secret `VPS_SSH_KEY`

Test login:

```powershell
ssh -i $env:USERPROFILE\.ssh\jewel-vps deploy@YOUR_VPS_IP
```

## Step 2 — Node.js on VPS (one time, SSH once)

GitHub cannot install system packages. SSH in **once**:

```bash
ssh deploy@YOUR_VPS_IP

sudo apt update
sudo apt install -y git curl
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2
exit
```

## Step 3 — Push from PC (deploys automatically)

```powershell
cd C:\Users\AEEN.IQ\Desktop\JEWEL-POS

git add .
git status
git commit -m "Your message"
git push origin main
```

## Step 4 — Watch deploy

**https://github.com/aeencomp/JEWEL-POS/actions**

- Green check = deployed
- Red X = open the log; common fixes below

### Manual deploy (without new commit)

GitHub → **Actions** → **Deploy to VPS** → **Run workflow**

## Step 5 — Open the app

After first successful deploy:

```bash
ssh deploy@YOUR_VPS_IP
curl -I http://127.0.0.1:5000
pm2 status
```

Point Nginx to port 5000 (`deploy/nginx.example.conf`) for a public URL.

---

## Troubleshooting

| Error | Fix |
|-------|-----|
| Clone failed / not found | Add `REPO_CLONE_TOKEN` (PAT) for private repo |
| Node not installed | Run Step 2 on VPS |
| Missing .env | Add `DATABASE_URL` + `SESSION_SECRET` secrets |
| Permission denied SSH | Fix `VPS_SSH_KEY` and `authorized_keys` on VPS |
| `VPS_APP_PATH` wrong | Set exactly `/var/www/jewel-pos` |
