import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const androidDir = path.join(root, "android");

const mode = process.argv[2] === "release" ? "release" : "debug";
const isWin = process.platform === "win32";

const javaCandidates = [
  process.env.JAVA_HOME && path.join(process.env.JAVA_HOME, "bin", isWin ? "java.exe" : "java"),
  "C:\\Program Files\\Android\\Android Studio\\jbr\\bin\\java.exe",
  "C:\\Program Files\\Android\\Android Studio\\jbr\\bin\\java",
].filter(Boolean);

function resolveJavaHome() {
  if (process.env.JAVA_HOME) return process.env.JAVA_HOME;
  for (const java of javaCandidates) {
    if (java && existsSync(java)) {
      return path.dirname(path.dirname(java));
    }
  }
  return null;
}

const javaHome = resolveJavaHome();
if (!javaHome) {
  console.error("JAVA_HOME not found. Install Android Studio or set JAVA_HOME to a JDK 17+.");
  process.exit(1);
}

const sdkRoot =
  process.env.ANDROID_HOME ||
  process.env.ANDROID_SDK_ROOT ||
  path.join(process.env.LOCALAPPDATA || "", "Android", "Sdk");

if (!existsSync(sdkRoot)) {
  console.error(`Android SDK not found at ${sdkRoot}. Set ANDROID_HOME.`);
  process.exit(1);
}

const env = {
  ...process.env,
  JAVA_HOME: javaHome,
  ANDROID_HOME: sdkRoot,
  ANDROID_SDK_ROOT: sdkRoot,
};

console.log(`Building IQ Order Android (${mode})...`);
console.log(`JAVA_HOME=${javaHome}`);
console.log(`ANDROID_HOME=${sdkRoot}`);

const sync = spawnSync(isWin ? "npx.cmd" : "npx", ["cap", "sync", "android"], {
  cwd: root,
  stdio: "inherit",
  env,
  shell: isWin,
});
if (sync.status !== 0) process.exit(sync.status ?? 1);

if (!existsSync(androidDir)) {
  console.error("android/ folder missing. Run: npm install && npx cap add android");
  process.exit(1);
}

const gradle = isWin ? "gradlew.bat" : "./gradlew";
const task = mode === "release" ? "bundleRelease" : "assembleDebug";
const build = spawnSync(gradle, [task], { cwd: androidDir, stdio: "inherit", env, shell: isWin });
if (build.status !== 0) process.exit(build.status ?? 1);

if (mode === "release") {
  const aab = path.join(
    androidDir,
    "app",
    "build",
    "outputs",
    "bundle",
    "release",
    "app-release.aab",
  );
  console.log(`\nPlay Store upload file:\n  ${aab}`);
  console.log("\nSign with your upload key before publishing (see mobile/iq-order/PLAY_STORE.md).");
} else {
  const apk = path.join(androidDir, "app", "build", "outputs", "apk", "debug", "app-debug.apk");
  console.log(`\nDebug APK:\n  ${apk}`);
}
