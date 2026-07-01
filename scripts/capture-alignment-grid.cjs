// Capture a 5-viewport screenshot grid of the live page. Hero dwell,
// passage dwell, underworld dwell, and three post-cinematic section
// samples per viewport. Saves under previews/align-2026-07-01/.

const { chromium } = require("playwright");
const fs = require("fs");
const proc = process;

const VIEWPORTS = [
  { w: 1280, h: 800, label: "desktop-1280" },
  { w: 1366, h: 768, label: "laptop-1366" },
  { w: 1440, h: 900, label: "desktop-1440" },
  { w: 1920, h: 1080, label: "desktop-1920" },
  { w: 390, h: 844, label: "mobile-390" },
];

const URL = proc.argv[2] || "https://dwfunnel-webgl.vercel.app/cinema.html";
const OUT_DIR = "previews/align-2026-07-01";

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true });

  for (const vp of VIEWPORTS) {
    const page = await browser.newPage({ viewport: { width: vp.w, height: vp.h } });
    await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 120000 });
    await page.waitForSelector("#loader.is-done", { state: "attached", timeout: 120000 });
    await page.waitForTimeout(6500);
    await page.screenshot({ path: `${OUT_DIR}/${vp.label}-01-hero.png` });

    await page.keyboard.press("ArrowDown");
    await page.waitForTimeout(4800);
    await page.screenshot({ path: `${OUT_DIR}/${vp.label}-02-passage.png` });

    await page.keyboard.press("ArrowDown");
    await page.waitForTimeout(5200);
    await page.screenshot({ path: `${OUT_DIR}/${vp.label}-03-underworld.png` });

    await page.locator("#cinema-enter").click().catch(() => {});
    await page.waitForTimeout(1500);

    for (const id of ["problem", "how-it-works", "work-with-us"]) {
      await page.evaluate((sid) => {
        const el = document.getElementById(sid);
        if (!el) return;
        el.scrollIntoView({ behavior: "instant", block: "center" });
      }, id);
      await page.waitForTimeout(1500);
      await page.screenshot({ path: `${OUT_DIR}/${vp.label}-post-${id}.png` });
    }

    await page.close();
    fs.writeFileSync(`${OUT_DIR}/_progress.log`, `done ${vp.label}\n`, { flag: "a" });
  }

  await browser.close();
}

main().then(() => proc.exit(0)).catch((err) => {
  proc.stderr.write(`FATAL: ${err.stack || err.message || err}\n`);
  proc.exit(1);
});
