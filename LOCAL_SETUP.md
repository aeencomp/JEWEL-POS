# Run JewelPOS locally (after Replit → Neon)

## Prerequisites

- [Node.js](https://nodejs.org/) 20 LTS or newer
- Your Neon database already imported from Replit

## 1. Environment variables

```powershell
copy .env.example .env
```

Edit `.env`:

| Variable | Required | Notes |
|----------|----------|--------|
| `DATABASE_URL` | Yes | Neon connection string (pooled). Include `?sslmode=require` if Neon does not add it. |
| `SESSION_SECRET` | Yes | Any long random string |
| `PORT` | No | Default `5001` |
| `RESEND_API_KEY` | No | Only for store 2FA email codes |

## 2. Install and run

```powershell
npm install
npm run dev
```

Open **http://localhost:5001** (or whatever you set in `PORT`)

## 3. Log in

If your Neon DB already has users from Replit, use those credentials.

If the database is empty, the app seeds demo accounts on first start:

- **Admin:** `admin` / `admin123` → http://localhost:5001/auth
- **Store:** `alnoor` / `alnoor123` → http://localhost:5001/store-portal

> Seeding only runs when no `admin` user exists. With an imported DB, your real users are kept.

## 4. Schema sync (only if tables are missing)

If Neon is missing tables:

```powershell
npm run db:push
```

## Troubleshooting

- **`DATABASE_URL must be set`** — create `.env` in the project root (same folder as `package.json`).
- **SSL / connection errors** — append `?sslmode=require` to the Neon URL.
- **Store 2FA fails** — set `RESEND_API_KEY`, or log in as **admin** (no 2FA).
- **Port in use** — set another port in `.env`, e.g. `PORT=5002`.

## Production build (optional)

```powershell
npm run build
npm start
```
