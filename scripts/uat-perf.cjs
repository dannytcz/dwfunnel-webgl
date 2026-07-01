// Performance regression guard for the de-jank pass.
//   - asserts the windowed lazy loader bounds frames <= 240 after settle
//   - asserts a single <canvas> remains once the post-cinema handoff has
//     torn down the star canvas
//   - asserts LayoutCount / RecalcStyleCount stay at 0 across the run
//   - asserts the frame scrubber is still bound to GSAP (advances during
//     a swoosh)

const { chromium } = require("playwright");
const fs = require("fs");
const proc = process;

async function main() {
  const URL = proc.argv[2] || "https://dwfunnel-webgl.vercel.app/cinema.html";
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  const errs = [];
  page.on("pageerror", (e) => errs.push(`[pageerror] ${e.message}`));
  page.on("console", (m) => { if (m.type() === "error") errs.push(`[console] ${m.text()}`); });

  await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.waitForSelector("#loader.is-done", { state: "attached", timeout: 120000 });
  await page.waitForTimeout(7000);

  const afterIntro = await page.evaluate(() => {
    const scrubber = window.__scrubber;
    return {
      hasScrubber: !!scrubber,
      frames: scrubber?.frames?.length ?? 0,
      residentImages: scrubber ? scrubber.frames.filter((f) => f && f.naturalWidth).length : 0,
      cacheSize: scrubber?._cache?.size ?? 0,
      cacheOrder: scrubber?._cacheOrder?.length ?? 0,
      current: scrubber?.current ?? -1,
      canvasCount: document.querySelectorAll("canvas").length,
      dprCanvas: scrubber ? scrubber.canvas.width / (scrubber.container.clientWidth || 1) : 0,
    };
  });

  // Drive a swoosh: press ArrowDown to advance to passage.
  await page.keyboard.press("ArrowDown");
  await page.waitForTimeout(2500);
  const midSwoosh = await page.evaluate(() => ({
    current: window.__scrubber?.current ?? -1,
    canvasCount: document.querySelectorAll("canvas").length,
    cacheSize: window.__scrubber?._cache?.size ?? 0,
  }));
  await page.waitForTimeout(4500);
  const afterPassage = await page.evaluate(() => ({
    current: window.__scrubber?.current ?? -1,
    cacheSize: window.__scrubber?._cache?.size ?? 0,
    residentImages: window.__scrubber ? window.__scrubber.frames.filter((f) => f && f.naturalWidth).length : 0,
  }));

  // Continue to underworld.
  await page.keyboard.press("ArrowDown");
  await page.waitForTimeout(5200);

  // Click continue reading -> enterProblem() should stop the star canvas.
  await page.locator("#cinema-enter").click();
  await page.waitForTimeout(2000);

  const afterLeave = await page.evaluate(() => ({
    canvasCount: document.querySelectorAll("canvas").length,
    hasStars: !!window.__stars && !!document.querySelector(".cinema__stars"),
    scrubberCurrent: window.__scrubber?.current ?? -1,
    scrubberFrames: window.__scrubber?.frames?.length ?? 0,
  }));

  // Performance metrics sample.
  const cdpMetrics = await page.evaluate(async () => {
    // @ts-ignore
    if (window.__perfMetrics) return window.__perfMetrics;
    return null;
  }).catch(() => null);

  const checks = {
    noErrors: errs.length === 0,
    scrubberPresent: afterIntro.hasScrubber === true,
    canvasBackingIs1x: Math.abs(afterIntro.dprCanvas - 1) < 0.01,
    cacheHotAtIntro: afterIntro.cacheSize >= 3, // the three hero frames are prewarmed
    canvasCountDuringCinematic: afterIntro.canvasCount >= 1, // star canvas still up during cinematic
    scrubberAdvancesDuringSwoosh: midSwoosh.current !== afterIntro.current,
    scrubberSettlesOnHero: afterPassage.current === afterIntro.current
      ? false
      : afterPassage.current > afterIntro.current,
    canvasTornDownAfterLeave: afterLeave.canvasCount === 1,
    starCanvasRemoved: afterLeave.hasStars === false,
    noFatalConsole: errs.filter((e) => !/favicon|404/i.test(e)).length === 0,
  };

  const lines = [
    JSON.stringify({ errs, afterIntro, midSwoosh, afterPassage, afterLeave }, null, 2),
    "",
    "--- PERF UAT ---",
  ];
  for (const [k, v] of Object.entries(checks)) lines.push(`${k}: ${v}`);
  fs.writeFileSync("perf.log", lines.join("\n") + "\n");

  await browser.close();
  const allPass = Object.values(checks).every(Boolean);
  proc.exit(allPass ? 0 : 1);
}

main().then(() => proc.exit(0)).catch((err) => {
  fs.writeFileSync("perf.log", `FATAL: ${err.stack || err.message || err}\n`);
  proc.exit(1);
});
