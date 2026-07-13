/*
 * Convert Selected Work preview mp4 loops to animated WebP for the grid.
 *
 * Why: many concurrent <video> elements fight Lenis + scroll scrub for decoder
 * slots. Animated WebP in <img> uses the image path; the page only swaps a
 * couple of cards to the loop at a time (see initWorkGrid).
 *
 * Usage:
 *   node scripts/mp4-to-preview-webp.cjs
 *   node scripts/mp4-to-preview-webp.cjs lexis,webpal
 */
const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const OUT = path.join(__dirname, "..", "assets", "demos", "previews");
const FPS = 10;
const WIDTH = 480;
const QUALITY = 58;

function encodeWebp(mp4Path, webpPath) {
  execFileSync(
    "ffmpeg",
    [
      "-y",
      "-loglevel",
      "error",
      "-i",
      mp4Path,
      "-vf",
      `fps=${FPS},scale=${WIDTH}:-1`,
      "-c:v",
      "libwebp",
      "-lossless",
      "0",
      "-quality",
      String(QUALITY),
      "-loop",
      "0",
      webpPath,
    ],
    { stdio: "inherit" }
  );
}

const only = process.argv[2] ? process.argv[2].split(",") : null;
const mp4s = fs
  .readdirSync(OUT)
  .filter((f) => f.endsWith(".mp4"))
  .map((f) => f.replace(/\.mp4$/, ""))
  .filter((key) => !only || only.includes(key));

for (const key of mp4s) {
  const mp4 = path.join(OUT, `${key}.mp4`);
  const webp = path.join(OUT, `${key}.webp`);
  if (!fs.existsSync(mp4)) continue;
  encodeWebp(mp4, webp);
  const mp4Kb = (fs.statSync(mp4).size / 1024).toFixed(0);
  const webpKb = (fs.statSync(webp).size / 1024).toFixed(0);
  console.log(`[${key}] ${mp4Kb}KB mp4 -> ${webpKb}KB webp`);
}

console.log("DONE ->", OUT);
