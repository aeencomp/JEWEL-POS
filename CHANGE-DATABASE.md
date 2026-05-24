# Switch to a new database (Neon / PostgreSQL)

JewelPOS uses one connection string everywhere: **`DATABASE_URL`**.

Update it in **three places** (same value in all):

1. PC: `.env` in project root  
2. VPS: `/home/deploy/jewel-pos/.env`  
3. GitHub: secret `DATABASE_URL`  

---

## Option A — New **empty** database (fresh start)

### 1. Create database

In [Neon](https://neon.tech): new project → copy **pooled** connection string.

Example:

```env
DATABASE_URL=postgresql://user:pass@ep-xxxx.region.aws.neon.tech/neondb?sslmode=require
```

### 2. Update PC `.env`

Replace the `DATABASE_URL=` line with the new string.

### 3. Create tables

```powershell
cd C:\Users\AEEN.IQ\Desktop\JEWEL-POS
npm run db:push
```

Optional demo data:

```powershell
npm run dev
# or on VPS after deploy: bash deploy/first-install.sh
```

### 4. Apply on VPS + GitHub

```powershell
powershell -ExecutionPolicy Bypass -File .\script\sync-vps-env.ps1
```

GitHub → Settings → Secrets → Actions → edit **`DATABASE_URL`**.

SSH (if needed):

```bash
cd /home/deploy/jewel-pos
npm run db:push
pm2 restart jewel-pos --update-env
```

### 5. Verify

```powershell
npx tsx script/db-diagnose.ts
```

You should see stores/users (or empty tables if fresh).

---

## Option B — Move **existing data** to the new database

### 1. Dump old database (PC)

Install PostgreSQL client tools (`pg_dump`, `pg_restore`) if needed.

```powershell
cd C:\Users\AEEN.IQ\Desktop\JEWEL-POS

# OLD database (current production data)
$env:PROD_DATABASE_URL = "postgresql://OLD_USER:OLD_PASS@ep-old....neon.tech/neondb?sslmode=require"
.\scripts\dump-neon.ps1 -OutFile jewel-backup.dump
```

### 2. Restore into new Neon database

```powershell
# NEW empty database connection string
$env:NEW_DATABASE_URL = "postgresql://NEW_USER:NEW_PASS@ep-new....neon.tech/neondb?sslmode=require"

# Restore (creates tables + data)
pg_restore --dbname=$env:NEW_DATABASE_URL --no-owner --no-acl --verbose jewel-backup.dump
```

If `pg_restore` complains about existing objects, use a **new empty** Neon branch/database first.

### 3. Point app to new DB

Edit `.env`:

```env
DATABASE_URL=<same as NEW_DATABASE_URL>
```

```powershell
npx tsx script/db-diagnose.ts
powershell -ExecutionPolicy Bypass -File .\script\sync-vps-env.ps1
```

Update GitHub secret **`DATABASE_URL`**.

### 4. Restart VPS

```bash
pm2 restart jewel-pos --update-env
```

---

## Checklist

| Step | Done |
|------|------|
| New `DATABASE_URL` in PC `.env` | ☐ |
| `npm run db:push` (empty DB) or `pg_restore` (copy data) | ☐ |
| `npx tsx script/db-diagnose.ts` shows expected stores | ☐ |
| `sync-vps-env.ps1` uploaded `.env` to VPS | ☐ |
| GitHub secret `DATABASE_URL` updated | ☐ |
| PM2 restarted | ☐ |
| Test login admin + store portal | ☐ |

---

## Notes

- **Sessions** are in Postgres (`connect-pg-simple`). After switching DB, everyone must **log in again**.
- **Uploads** (logos/images) stay on VPS disk (`uploads/`), not in the database.
- Use the Neon connection string that contains your **imported Replit data** if you need مجوهرات القاسم / حسين.
- Wrong DB = empty stores or demo-only data (`alnoor`). Always run `db-diagnose` after switching.
