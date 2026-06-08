import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const repoRoot = path.resolve(root, "../..");
const svgPath = path.join(repoRoot, "client", "public", "favicon.svg");
const resourcesDir = path.join(root, "resources");

const sizes = {
  "icon-only.png": 1024,
  "icon-foreground.png": 1024,
  "icon-background.png": 1024,
  "splash.png": 2732,
};

await mkdir(resourcesDir, { recursive: true });

let svg = await readFile(svgPath, "utf8");

for (const [name, size] of Object.entries(sizes)) {
  const out = path.join(resourcesDir, name);
  if (name === "icon-background.png") {
    await sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: { r: 15, g: 23, b: 42, alpha: 1 },
      },
    })
      .png()
      .toFile(out);
    continue;
  }

  const padding = name === "splash.png" ? Math.round(size * 0.22) : Math.round(size * 0.12);
  const inner = size - padding * 2;
  const iconBuf = await sharp(Buffer.from(svg)).resize(inner, inner).png().toBuffer();

  const bg =
    name === "splash.png"
      ? { r: 15, g: 23, b: 42, alpha: 1 }
      : { r: 180, g: 83, b: 9, alpha: 1 };

  await sharp({
    create: { width: size, height: size, channels: 4, background: bg },
  })
    .composite([{ input: iconBuf, gravity: "centre" }])
    .png()
    .toFile(out);

  console.log(`Wrote ${out}`);
}

// Play Store listing graphic
const feature = path.join(resourcesDir, "play-store-icon-512.png");
await sharp(path.join(resourcesDir, "icon-only.png")).resize(512, 512).png().toFile(feature);
console.log(`Wrote ${feature}`);
