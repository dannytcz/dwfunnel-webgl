import { chromium } from "playwright";

const URL = process.argv[2] || "https://dwfunnel-webgl.vercel.app/cinema.html";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

const errs = [];
page.on("pageerror", (e) => errs.push(e.message));
page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });

await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 120000 });
await page.waitForSelector("#loader.is-done", { timeout: 120000 });

const sampleAt = async (target) => {
  await page.evaluate((y) => {
    window.scrollTo(0, y);
  }, target);
  await page.waitForTimeout(450);
  return page.evaluate(() => {
    const get = (id) => parseFloat(document.getElementById(id)?.style.opacity || "0");
    const stars = document.querySelector(".cinema__stars");
    return {
      hero: get("hero-copy-block"),
      passage: get("passage-copy-block"),
      underworld: get("underworld-copy-block"),
      canvasActive: document.getElementById("scrub-canvas")?.classList.contains("is-active"),
      stProgress: window.ScrollTrigger?.getAll?.()[0]?.progress ?? null,
      starsCount: stars ? stars.getContext("2d").getImageData(0, 0, 1, 1).data.length : 0,
      h1Font: getComputedStyle(document.querySelector("#hero-copy-block h1")).fontFamily,
      h2Font: getComputedStyle(document.querySelector("#passage-copy-block h2")).fontFamily,
    };
  });
};

const totalHeight = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
const at = {
  top:    await sampleAt(0),
  hero:   await sampleAt(totalHeight * 0.20),
  passage:await sampleAt(totalHeight * 0.50),
  under:  await sampleAt(totalHeight * 0.88),
  end:    await sampleAt(totalHeight),
};

console.log(JSON.stringify({ URL, errs, totalHeight, at }, null, 2));

const checks = {
  heroStation: at.hero.hero > 0.7 && at.hero.passage < 0.2 && at.hero.underworld < 0.2,
  passageStation: at.passage.passage > 0.7 && at.passage.hero < 0.2 && at.passage.underworld < 0.2,
  underStation: at.under.underworld > 0.7 && at.under.hero < 0.2 && at.under.passage < 0.2,
  noErrors: errs.length === 0,
  shizuruLoaded: /Shizuru/i.test(at.top.h1Font),
  cormorantLoaded: /Cormorant Garamond/i.test(at.top.h2Font),
};

console.log("\n--- STATION UAT ---");
for (const [k, v] of Object.entries(checks)) console.log(`${k}: ${v}`);

await browser.close();
process.exit(Object.values(checks).every(Boolean) ? 0 : 1);
