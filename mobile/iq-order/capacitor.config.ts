import type { CapacitorConfig } from "@capacitor/cli";

/**
 * IQ Order loads the live web app from production so store updates don't require
 * a new APK for every UI change. Bump versionCode/versionName when publishing.
 */
const config: CapacitorConfig = {
  appId: "com.iqpos.iqorder",
  appName: "IQ Order",
  webDir: "www",
  server: {
    url: "https://iq-pos.com/app",
    cleartext: false,
    androidScheme: "https",
  },
  android: {
    allowMixedContent: false,
    backgroundColor: "#0f172a",
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2500,
      launchAutoHide: true,
      backgroundColor: "#0f172a",
      androidSplashResourceName: "splash",
      showSpinner: false,
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#0f172a",
    },
  },
};

export default config;
