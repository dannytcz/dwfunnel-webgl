/**
 * Generate hero poster WebP at responsive widths from still-B-hero-4k.png
 * Run: node scripts/optimize-hero-poster.mjs
 */
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const src = path.join(root, "assets/images/still-B-hero-4k.png");
const outDir = path.join(root, "assets/images/hero");

if (!fs.existsSync(src)) {
  console.error("Missing source:", src);
  process.exit(1);
}

fs.mkdirSync(outDir, { recursive: true });
const widths = [768, 1280, 1920, 2560];

for (const w of widths) {
  const base = path.join(outDir, `poster-${w}`);
  try {
    execSync(
      `ffmpeg -y -i "${src}" -vf "scale=${w}:-2" -c:v libaom-av1 -still_picture 1 -crf 30 "${base}.avif"`,
      { stdio: "pipe" }
    );
  } catch {
    console.warn(`AVIF skipped for ${w}w`);
  }
  execSync(
    `ffmpeg -y -i "${src}" -vf "scale=${w}:-2" -c:v libwebp -quality 82 "${base}.webp"`,
    { stdio: "inherit" }
  );
}

execSync(
  `ffmpeg -y -i "${src}" -vf "scale=1920:-2" -c:v libwebp -quality 84 "${path.join(outDir, "poster.webp")}"`,
  { stdio: "inherit" }
);
console.log("Hero poster variants written to", outDir);
