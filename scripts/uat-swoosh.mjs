import { chromium } from "playwright";

const URL = process.argv[2] || "https://dwfunnel-webgl.vercel.app/cinema.html";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

const errs = [];
page.on("pageerror", (e) => errs.push(`[pageerror] ${e.message}`));
page.on("console", (m) => { if (m.type() === "error") errs.push(`[console] ${m.text()}`); });

await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 120000 });
await page.waitForSelector("#loader.is-done", { timeout: 120000 });
await page.waitForTimeout(5400); // loader 2s + intro 4s + hero fade-in 0.9s + buffer

const snap = (label) =>
  page.evaluate((label) => {
    const op = (id) => parseFloat(document.getElementById(id)?.style.opacity || "0");
    const dots = Array.from(document.querySelectorAll(".cinema-stations__dot"));
    const stage = document.querySelector(".cinema__stage");
    const fill = document.querySelector(".cinema-progress__fill");
    const scrim = stage ? parseFloat(getComputedStyle(stage).getPropertyValue("--scrim-opacity") || "0") : 0;
    let progressScale = 0;
    if (fill) {
      const t = getComputedStyle(fill).transform;
      if (t && t !== "none") {
        const m = t.match(/matrix\(([-\d.]+),/);
        if (m) progressScale = parseFloat(m[1]);
      }
    }
    const idx = document.querySelector(".cinema-stations__current")?.textContent;
    return {
      label,
      playing: !!(window.gsap && document.getElementById("cinema")?.classList.contains("is-playing")),
      hero: op("hero-copy-block"),
      passage: op("passage-copy-block"),
      underworld: op("underworld-copy-block"),
      flash: parseFloat(document.getElementById("cinema-flash")?.style.opacity || "0"),
      activeDot: dots.findIndex((d) => d.classList.contains("is-active")),
      scrim,
      progressScale,
      stationIndex: idx,
    };
  }, label);

const samples = {};

samples.initial = await snap("initial");

// Advance 1: ArrowDown to start swoosh to station 1
await page.keyboard.press("ArrowDown");
await page.waitForTimeout(2000);
samples.mid_swoosh_1 = await snap("mid_swoosh_1");
await page.waitForTimeout(3500);
samples.after_arrow_1 = await snap("after_arrow_1");

// Advance 2: ArrowDown to reach station 2
await page.keyboard.press("ArrowDown");
await page.waitForTimeout(5200);
samples.after_arrow_2 = await snap("after_arrow_2");

// Click station dot 0 directly
await page.locator(".cinema-stations__dot[data-station='0']").click();
await page.waitForTimeout(5200);
samples.after_dot_0 = await snap("after_dot_0");

// Wheel advance: station 1
await page.mouse.move(640, 400);
await page.waitForTimeout(50);
await page.mouse.wheel(0, 400);
await page.waitForTimeout(5200);
samples.after_wheel = await snap("after_wheel");

console.log(JSON.stringify({ URL, errs, samples }, null, 2));

const checks = {
  noErrors: errs.length === 0,
  initialHero: samples.initial.hero === 1 && samples.initial.passage === 0 && samples.initial.underworld === 0,
  initialScrim: samples.initial.scrim > 0.2 && samples.initial.scrim < 0.6,
  initialProgressStarted: samples.initial.progressScale > 0.02,
  midSwooshFlash: samples.mid_swoosh_1.flash > 0.1,
  midSwooshScrim: samples.mid_swoosh_1.scrim > 0.6,
  afterArrow1Passage: samples.after_arrow_1?.passage > 0.95,
  afterArrow1Scrim: samples.after_arrow_1?.scrim > 0.85,
  afterArrow2Underworld: samples.after_arrow_2?.underworld > 0.95,
  afterArrow2Scrim: samples.after_arrow_2?.scrim > 0.3 && samples.after_arrow_2?.scrim < 0.75,
  afterArrow2ProgressStarted: samples.after_arrow_2?.progressScale > 0.95 || (samples.after_arrow_2?.progressScale > (samples.initial?.progressScale ?? 0) && samples.after_arrow_2?.progressScale > 0.5),
  dotJumpBack: samples.after_dot_0.hero > 0.95,
  dotJumpProgressChanged: Math.abs(samples.after_dot_0.progressScale - samples.after_arrow_2.progressScale) > 0.05,
  wheelAdv: samples.after_wheel.passage > 0.95,
};

console.log("\n--- SWOOSH UAT ---");
for (const [k, v] of Object.entries(checks)) console.log(`${k}: ${v}`);

await browser.close();
process.exit(Object.values(checks).every(Boolean) ? 0 : 1);
