import { chromium } from "playwright";

const URL = process.argv[2] || "https://dwfunnel-webgl.vercel.app/cinema.html";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

const errs = [];
page.on("pageerror", (e) => errs.push(`[pageerror] ${e.message}`));
page.on("console", (m) => { if (m.type() === "error") errs.push(`[console] ${m.text()}`); });

await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 120000 });
await page.waitForSelector("#loader.is-done", { timeout: 120000 });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(5400); // loader 2s + intro 4s + hero fade-in 0.9s + buffer

// Wait until fonts actually resolve
const fontsReady = await page.evaluate(async () => {
  const out = {};
  for (const f of ["Cinzel", "EB Garamond"]) {
    try {
      out[f] = await document.fonts.check(`16px "${f}"`);
    } catch (e) { out[f] = false; }
  }
  return out;
});

const inspect = (sel) =>
  page.evaluate((s) => {
    const el = document.querySelector(s);
    if (!el) return null;
    const cs = getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    return {
      text: el.textContent?.trim().slice(0, 60) ?? null,
      fontFamily: cs.fontFamily,
      fontStyle: cs.fontStyle,
      fontWeight: cs.fontWeight,
      fontVariant: cs.fontVariant,
      textTransform: cs.textTransform,
      letterSpacing: cs.letterSpacing,
      fontSize: cs.fontSize,
      textAlign: cs.textAlign,
      rectCx: Math.round(rect.left + rect.width / 2),
    };
  }, sel);

const snap = {
  h1: await inspect("#hero-copy-block h1"),
  h2passage: await inspect("#passage-copy-block h2"),
  heroEyebrow: await inspect("#hero-copy-block .cinema-copy__eyebrow"),
  heroLede: await inspect("#hero-copy-block .cinema-copy__lede"),
  heroP: await inspect("#hero-copy-block p:not(.cinema-copy__eyebrow):not(.cinema-copy__lede)"),
  heroButton: await inspect("#hero-copy-block .cinema-btn--primary"),
  problemH2: await inspect("#problem h2"),
  cardH3: await inspect("#problem .cinema-card h3"),
  cardNum: await inspect("#problem .cinema-card__num"),
  stationDot: await inspect(".cinema-stations__dot"),
};

console.log(JSON.stringify({ errs, fontsReady, snap }, null, 2));

const heroBlock = await page.evaluate(() => {
  const r = document.getElementById("hero-copy-block").getBoundingClientRect();
  return { cx: Math.round(r.left + r.width / 2), width: Math.round(r.width) };
});

const progressAndScrim = await page.evaluate(() => {
  const stage = document.querySelector(".cinema__stage");
  const fill = document.querySelector(".cinema-progress__fill");
  const scrim = stage ? parseFloat(getComputedStyle(stage).getPropertyValue("--scrim-opacity") || "0") : 0;
  const fillT = fill ? getComputedStyle(fill).transform : "none";
  let scale = 0;
  if (fillT && fillT !== "none") {
    const m = fillT.match(/matrix\(([-\d.]+),/);
    if (m) scale = parseFloat(m[1]);
  }
  return { scrim, progressScale: scale };
});

const checks = {
  noErrors: errs.length === 0,
  cinzelLoaded: fontsReady.Cinzel === true,
  ebGaramondLoaded: fontsReady["EB Garamond"] === true,
  h1IsCinzel: /Cinzel/i.test(snap.h1.fontFamily),
  h1NotItalic: snap.h1.fontStyle === "normal",
  h1TitleCase: snap.h1.textTransform === "none" && /A Page People Remember/.test(snap.h1.text || ""),
  h1Oversize: parseFloat(snap.h1.fontSize) >= 50,
  h2NotItalic: snap.h2passage.fontStyle === "normal",
  ledeNotItalic: snap.heroLede?.fontStyle === "italic", // the lede IS italic — guard it explicitly
  btnNotItalic: snap.heroButton?.fontStyle === "normal",
  eyebrowItalic: snap.heroEyebrow?.fontStyle === "italic",
  cardH3NotItalic: snap.cardH3?.fontStyle === "normal",
  cardNumSmallCaps: snap.cardNum?.fontVariant === "small-caps",
  stationDotCinzel: /Cinzel/i.test(snap.stationDot?.fontFamily || ""),
  heroBlockCentered: Math.abs(heroBlock.cx - 640) < 16,
  noShizuruLeak: !/Shizuru|Cormorant/i.test(JSON.stringify(snap)),
  heroScrimPresent: progressAndScrim.scrim > 0.25,
  heroProgressStarted: progressAndScrim.progressScale > 0.02,
};

console.log("\n--- TYPOGRAPHY UAT ---");
for (const [k, v] of Object.entries(checks)) console.log(`${k}: ${v}`);

await browser.close();
process.exit(Object.values(checks).every(Boolean) ? 0 : 1);
