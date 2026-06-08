# IQ Order — Google Play Store

## What this app is

Capacitor Android wrapper for **IQ Order** (`https://iq-pos.com/app`). The APK/AAB opens your live delivery web app in a native shell (splash screen, status bar, Play Store listing).

**Package ID:** `com.iqpos.iqorder`

---

## 1. One-time setup

### Install tools

- [Android Studio](https://developer.android.com/studio) (includes JDK)
- Google Play Developer account — **$25 one-time** at [play.google.com/console](https://play.google.com/console)

### Build dependencies

```powershell
cd mobile/iq-order
npm install
npm run icons
npx cap add android
npx cap sync android
```

---

## 2. Create signing key (release only)

Google Play requires a signed **AAB** (Android App Bundle), not a raw debug APK.

```powershell
cd mobile/iq-order
mkdir keystore -Force
$keytool = "C:\Program Files\Android\Android Studio\jbr\bin\keytool.exe"
& $keytool -genkeypair -v -storetype PKCS12 -keystore keystore/iq-order-upload.jks -alias iqorder -keyalg RSA -keysize 2048 -validity 10000
```

Copy `keystore.properties.example` → `keystore.properties` and fill in passwords.

**Never commit** `keystore.properties` or `*.jks` to git.

---

## 3. Build

### Debug APK (testing on phone)

```powershell
cd mobile/iq-order
npm run build:debug
```

Output: `android/app/build/outputs/apk/debug/app-debug.apk`

Install: enable **USB debugging**, connect phone, or send APK via WhatsApp/Drive and install (allow unknown sources).

### Release AAB (Google Play upload)

```powershell
cd mobile/iq-order
npm run build:release
```

Output: `android/app/build/outputs/bundle/release/app-release.aab`

---

## 4. Google Play Console checklist

1. **Create app** → name: **IQ Order**, default language, app/game, free.
2. **App signing:** choose **Google Play App Signing** (recommended). Upload your AAB; Google manages the store key.
3. **Store listing:**
   - Short description: Food delivery from local restaurants — track your order live.
   - Full description: IQ Order by IQ-POS. Browse restaurants, order delivery, pay cash/card, track driver on map.
   - App icon: `resources/play-store-icon-512.png`
   - Feature graphic: 1024×500 (create in Canva/Figma)
   - Phone screenshots: at least 2 from `/app` on a phone
4. **Privacy policy URL** (required): `https://iq-pos.com/privacy`
5. **Data safety:** declare location (if used), name, phone, address for delivery orders.
6. **Content rating:** complete questionnaire (food ordering → typically Everyone).
7. **Target audience:** 18+ or general per your market.
8. **Production release:** upload `app-release.aab` → review → publish.

---

## 5. Version updates

Edit `android/app/build.gradle`:

- `versionCode` — integer, **must increase** every upload
- `versionName` — user-visible, e.g. `1.0.1`

Then rebuild `npm run build:release` and upload new AAB.

Web UI changes on `iq-pos.com` do **not** require a new APK (remote URL mode).

---

## 6. Open in Android Studio (optional)

```powershell
cd mobile/iq-order
npm run open
```

Build → Generate Signed Bundle / APK from Android Studio UI.
