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
    return {
      label,
      station: window.__scrubber ? null : null,
      playing: !!(window.gsap && document.getElementById("cinema")?.classList.contains("is-playing")),
      hero: op("hero-copy-block"),
      passage: op("passage-copy-block"),
      underworld: op("underworld-copy-block"),
      flash: parseFloat(document.getElementById("cinema-flash")?.style.opacity || "0"),
      activeDot: dots.findIndex((d) => d.classList.contains("is-active")),
      modeLabel: document.querySelector(".cinema-mode-toggle__label")?.textContent,
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

// Wheel advance: station 1 — move cursor away from station dots first
await page.mouse.move(640, 400);
await page.waitForTimeout(50);
await page.mouse.wheel(0, 400);
await page.waitForTimeout(5200);
samples.after_wheel = await snap("after_wheel");

// Toggle free-scroll off
await page.locator("#cinema-mode-toggle").click();
await page.waitForTimeout(150);
samples.after_toggle_off = await snap("after_toggle_off");

// Try wheel — should NOT advance
const before = samples.after_toggle_off;
await page.mouse.wheel(0, 400);
await page.waitForTimeout(800);
samples.after_toggle_off_wheel = await snap("after_toggle_off_wheel");

console.log(JSON.stringify({ URL, errs, samples }, null, 2));

const checks = {
  noErrors: errs.length === 0,
  initialHero: samples.initial.hero === 1 && samples.initial.passage === 0 && samples.initial.underworld === 0,
  midSwooshFlash: samples.mid_swoosh_1.flash > 0.1,
  afterArrow1Passage: samples.after_arrow_1?.passage > 0.95,
  afterArrow2Underworld: samples.after_arrow_2?.underworld > 0.95,
  dotJumpBack: samples.after_dot_0.hero > 0.95,
  wheelAdv: samples.after_wheel.passage > 0.95,
  toggleOffBlocksWheel: samples.after_toggle_off_wheel.activeDot === before.activeDot,
};

console.log("\n--- SWOOSH UAT ---");
for (const [k, v] of Object.entries(checks)) console.log(`${k}: ${v}`);

await browser.close();
process.exit(Object.values(checks).every(Boolean) ? 0 : 1);
