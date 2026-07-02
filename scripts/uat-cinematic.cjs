// UAT: native scroll cinema v25 — act0 sky hold, nav dots, handoff veil, section layouts.
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const URL = process.env.UAT_URL || "https://dwfunnel-webgl.vercel.app/cinema.html?v=25";
const OUT = path.resolve(__dirname, "..", "previews");

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  const errors = [];
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push("console.error: " + m.text());
  });

  console.log("navigating ->", URL);
  await page.goto(URL, { waitUntil: "networkidle", timeout: 90000 });
  await page.waitForTimeout(3500);

  const atTop = await page.evaluate(() => ({
    loaderDone: !!document.getElementById("loader")?.classList.contains("is-done"),
    pinTrigger: !!window.__cinemaPinST,
    lastDrawn: window.__scrubber?._lastDrawnIndex ?? null,
    heroCopyVisible: (() => {
      const el = document.querySelector("#hero-copy-block");
      return el ? parseFloat(getComputedStyle(el).opacity) > 0.5 : false;
    })(),
    heroDotActive: !!document.querySelector('.page-nav__dot[data-nav-id="hero"]')?.classList.contains("is-active"),
    idleHidden: document.getElementById("cinema-idle")?.classList.contains("is-hidden"),
    handoffExists: !!document.getElementById("cinema-handoff"),
    problemFixed: getComputedStyle(document.getElementById("problem")).position !== "fixed",
    problemRows: document.querySelectorAll("#problem-system .cinema-system__row").length,
    buildCards: document.querySelectorAll("#build .build-card").length,
    timelineNodes: document.querySelectorAll("#how-it-works .timeline__node").length,
  }));
  console.log("at top:", JSON.stringify(atTop, null, 2));

  if (atTop.lastDrawn !== 0) {
    console.error("FAIL: expected frame 0 (sky) at page top, got", atTop.lastDrawn);
    process.exit(1);
  }
  if (!atTop.heroDotActive) {
    console.error("FAIL: hero nav dot should be active at scroll top");
    process.exit(1);
  }
  if (!atTop.problemFixed) {
    console.error("FAIL: #problem must not use position:fixed bridge");
    process.exit(1);
  }

  await page.screenshot({ path: path.join(OUT, "uat-v25-01-hero.png") });

  const pinStart = await page.evaluate(() => window.__cinemaPinST?.start ?? 0);
  const pinEnd = await page.evaluate(() => window.__cinemaPinST?.end ?? window.innerHeight * 4);
  const scroll5 = pinStart + (pinEnd - pinStart) * 0.05;

  await page.evaluate((y) => window.scrollTo({ top: y, behavior: "instant" }), scroll5);
  await page.waitForTimeout(600);

  const after5pct = await page.evaluate(() => ({
    lastDrawn: window.__scrubber?._lastDrawnIndex ?? null,
    globalP: window.__cinemaProgress?.globalP ?? null,
  }));
  console.log("after 5% pin scroll:", after5pct);

  if (after5pct.lastDrawn !== null && after5pct.lastDrawn < 0) {
    console.error("FAIL: frame index went backward on first scroll");
    process.exit(1);
  }

  await page.evaluate((y) => window.scrollTo({ top: y, behavior: "instant" }), pinEnd * 0.5);
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(OUT, "uat-v25-02-mid-pin.png") });

  const sections = [
    "problem",
    "build",
    "transform",
    "platforms",
    "how-it-works",
    "process",
    "proof",
    "testimonials",
    "work-with-us",
  ];
  for (const id of sections) {
    await page.evaluate((sid) => {
      document.getElementById(sid)?.scrollIntoView({ behavior: "instant", block: "start" });
    }, id);
    await page.waitForTimeout(700);
    const data = await page.evaluate((sid) => {
      const el = document.getElementById(sid);
      if (!el) return null;
      return { h2: el.querySelector("h2")?.innerText?.slice(0, 60) ?? null, revealed: el.getAttribute("data-revealed") };
    }, id);
    console.log(`section ${id}:`, JSON.stringify(data));
  }

  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.waitForTimeout(900);

  const backTop = await page.evaluate(() => ({
    scrollY: window.scrollY,
    lastDrawn: window.__scrubber?._lastDrawnIndex ?? null,
    heroDotActive: !!document.querySelector('.page-nav__dot[data-nav-id="hero"]')?.classList.contains("is-active"),
    problemVisible: (() => {
      const el = document.getElementById("problem");
      if (!el) return false;
      const r = el.getBoundingClientRect();
      return r.top < window.innerHeight && r.bottom > 0;
    })(),
    handoffActive: document.getElementById("cinema-handoff")?.classList.contains("is-active"),
  }));
  console.log("scroll back to top:", backTop);

  if (backTop.lastDrawn !== 0) {
    console.error("FAIL: expected frame 0 after scroll back to top");
    process.exit(1);
  }
  if (backTop.problemVisible) {
    console.error("FAIL: #problem visible when scrolled back to hero");
    process.exit(1);
  }
  if (backTop.handoffActive) {
    console.error("FAIL: handoff veil still active at scroll top");
    process.exit(1);
  }

  await page.click('.page-nav__dot[data-nav-id="hero"]');
  await page.waitForTimeout(800);
  const heroClick = await page.evaluate(() => window.scrollY);
  console.log("hero dot click scrollY:", heroClick);
  if (heroClick > 50) {
    console.error("FAIL: hero dot click should scroll to top");
    process.exit(1);
  }

  await browser.close();

  if (errors.length) {
    console.error("ERRORS:", errors);
    process.exit(1);
  }
  if (!atTop.pinTrigger) {
    console.error("FAIL: ScrollTrigger pin not initialized");
    process.exit(1);
  }
  if (atTop.problemRows < 3) {
    console.error("FAIL: problem section missing rows");
    process.exit(1);
  }
  if (atTop.buildCards < 3) {
    console.error("FAIL: build section missing cards");
    process.exit(1);
  }
  console.log("UAT passed");
})();
