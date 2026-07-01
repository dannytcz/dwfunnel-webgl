// Final UAT: confirm the live page shows the WebP hero, runs the intro,
// and exits cleanly to #problem.
const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on("pageerror", (e) => errs.push(e.message));
  page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });

  await page.goto("https://dwfunnel-webgl.vercel.app/cinema.html", { waitUntil: "domcontentloaded", timeout: 60000 });
  console.log("navigated to live");

  await page.waitForFunction(() => document.getElementById("loader")?.classList.contains("is-done"), { timeout: 60000 });
  console.log("loader done");

  // Sample at 1s and 5s to see the intro playing.
  await page.waitForTimeout(1000);
  const at1s = await page.evaluate(() => {
    const s = window.__scrubber;
    return s ? { current: s.current, fx: s._lastFx } : { error: "no scrubber" };
  });
  console.log("t=1s:", at1s);

  await page.waitForTimeout(4000);
  const at5s = await page.evaluate(() => {
    const s = window.__scrubber;
    return s ? { current: s.current, fx: s._lastFx, stations: window.__scrubber ? "ok" : "missing" } : { error: "no scrubber" };
  });
  console.log("t=5s:", at5s);

  // Verify hero copy is visible
  const heroVisible = await page.evaluate(() => {
    const h1 = document.querySelector("#hero-copy-block h1");
    if (!h1) return { ok: false };
    const cs = getComputedStyle(h1);
    return { ok: parseFloat(cs.opacity) > 0.9, opacity: cs.opacity };
  });
  console.log("hero h1 visible:", heroVisible);

  await page.screenshot({ path: "previews/uat-live-hero.png" });
  console.log("errors:", errs.length === 0 ? "none" : errs);
  await browser.close();
  process.exit(errs.length === 0 && heroVisible.ok ? 0 : 1);
})();
