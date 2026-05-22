# Enable store login 2FA (email OTP)

Store portal (`/store-portal`) can require a **6-digit code** sent by email after username/password. Admin login does **not** use 2FA.

## Requirements

1. **Resend** account — https://resend.com  
2. **Verified sender domain** (or use Resend sandbox for testing)  
3. Each store user must have an **email** on their account (set in Admin → Stores → edit store email)

2FA turns on only when **all** of these are set on the server:

```env
STORE_REQUIRE_2FA=true
RESEND_API_KEY=re_xxxxxxxxxxxxxxxx
RESEND_FROM_EMAIL=JewelPOS <noreply@yourdomain.com>
```

---

## Step 1 — Resend

1. Create API key at Resend → API Keys  
2. Add/verify your domain (e.g. `iq-pos.com`) under Domains  
3. Use a **From** address on that domain, e.g. `JewelPOS <noreply@iq-pos.com>`

---

## Step 2 — Local `.env` (on your PC)

Edit `C:\Users\AEEN.IQ\Desktop\JEWEL-POS\.env`:

```env
STORE_REQUIRE_2FA=true
RESEND_API_KEY=re_your_key_here
RESEND_FROM_EMAIL=JewelPOS <noreply@iq-pos.com>
```

---

## Step 3 — Sync to VPS and restart

```powershell
cd C:\Users\AEEN.IQ\Desktop\JEWEL-POS
powershell -ExecutionPolicy Bypass -File .\script\sync-vps-env.ps1
```

Or use the helper script:

```powershell
powershell -ExecutionPolicy Bypass -File .\script\enable-store-2fa.ps1
```

---

## Step 4 — GitHub Actions secrets (optional, for future deploys)

https://github.com/aeencomp/JEWEL-POS/settings/secrets/actions

| Secret | Value |
|--------|--------|
| `STORE_REQUIRE_2FA` | `true` |
| `RESEND_API_KEY` | `re_...` |
| `RESEND_FROM_EMAIL` | `JewelPOS <noreply@iq-pos.com>` |

Push to `main` or re-run **Deploy to VPS** — `patch-env.sh` updates these keys on the VPS without wiping `DATABASE_URL`.

---

## Step 5 — Store user email

In **Admin → المتاجر**, edit the store (e.g. مجوهرات القاسم) and set **Email** to the inbox that should receive codes (owner’s email).

Saving the store updates the linked store user’s email in the database.

Users **without** email still log in **without** OTP even when 2FA is enabled globally.

---

## Test

1. Open https://iq-pos.com/store-portal  
2. Log in as `حسين` (or your store user)  
3. You should see the **6-digit code** screen and receive an email within ~1 minute  
4. Enter the code to finish login

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| No OTP screen | `STORE_REQUIRE_2FA` not `true` on VPS, or user has no email |
| `Failed to send verification email` | Invalid `RESEND_API_KEY`, unverified domain, or wrong `RESEND_FROM_EMAIL` |
| Code invalid | Code expires in 10 minutes; use **Resend code** or log in again |
| Still old behavior | `pm2 restart jewel-pos --update-env` on VPS after `.env` change |

Check VPS env:

```bash
ssh deploy@82.38.44.205
grep -E 'STORE_REQUIRE_2FA|RESEND_' /home/deploy/jewel-pos/.env
pm2 restart jewel-pos --update-env
```
