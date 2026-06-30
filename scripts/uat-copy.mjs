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

const getText = (sel) => page.evaluate((s) => document.querySelector(s)?.textContent?.trim() ?? null, sel);

// HERO
const hero = {
  eyebrow: await getText("#hero-copy-block .cinema-copy__eyebrow"),
  h1: await getText("#hero-copy-block h1"),
  lede: await getText("#hero-copy-block .cinema-copy__lede"),
  primaryCta: await getText("#hero-copy-block .cinema-btn--primary"),
  secondaryCta: await getText("#hero-copy-block .cinema-btn--ghost"),
  hintText: await getText("#scroll-hint-text"),
};

// Advance via ArrowDown (click-to-descend removed)
await page.keyboard.press("ArrowDown");
await page.waitForTimeout(5000); // swoosh 4s + passage fade-in 0.65s + buffer

const passage = {
  eyebrow: await getText("#passage-copy-block .cinema-copy__eyebrow"),
  h2: await getText("#passage-copy-block h2"),
  lede: await getText("#passage-copy-block .cinema-copy__lede"),
  beats: await page.evaluate(() => Array.from(document.querySelectorAll("#passage-copy-block .cinema-passage__beats li")).map((li) => ({
    text: li.textContent?.replace(/\s+/g, " ").trim(),
  }))),
};

// Advance to Underworld
await page.keyboard.press("ArrowDown");
await page.waitForTimeout(5800); // swoosh 4s + fade 0.65s + row stagger (3 * 220ms) + row transition 0.55s

const underworld = {
  eyebrow: await getText("#underworld-copy-block .cinema-copy__eyebrow"),
  h2: await getText("#underworld-copy-block h2"),
  lede: await getText("#underworld-copy-block .cinema-copy__lede"),
  cards: await page.evaluate(() => Array.from(document.querySelectorAll(".cinema-system__row")).map((c) => ({
    num: c.querySelector(".cinema-system__num")?.textContent?.trim(),
    h3: c.querySelector("h3")?.textContent?.trim(),
    p: c.querySelector("p")?.textContent?.trim(),
    revealed: c.classList.contains("is-revealed"),
  }))),
};

// Continue reading → scroll to problem
await page.locator("#cinema-enter").click();
await page.waitForTimeout(1700);

const problem = {
  h2: await getText("#problem h2"),
  lead: await getText("#problem .cinema-section__lead"),
  cards: await page.evaluate(() => Array.from(document.querySelectorAll("#problem .cinema-card")).map((c) => ({
    num: c.querySelector(".cinema-card__num")?.textContent?.trim(),
    h3: c.querySelector("h3")?.textContent?.trim(),
    p: c.querySelector("p")?.textContent?.trim(),
  }))),
  bridgeP: await getText("#problem .cinema-section__bridge p"),
  bridgeCta: await getText("#problem .cinema-section__bridge .cinema-btn--primary"),
};

console.log(JSON.stringify({ errs, hero, passage, underworld, problem }, null, 2));

const checks = {
  noErrors: errs.length === 0,
  heroH1: /A Page People Remember\./.test(hero.h1 || "") && /A Funnel That Follows Up\./.test(hero.h1 || ""),
  heroEyebrow: /Landing Pages.*Funnels.*Follow-Up/i.test(hero.eyebrow || ""),
  heroPrimary: hero.primaryCta === "Map My Funnel",
  heroSecondary: /See Why Pages Fail/i.test(hero.secondaryCta || ""),
  heroHintNoClick: !/click anywhere/i.test(hero.hintText || ""),
  passageHas: /Attention Is Only The Entrance\./.test(passage.eyebrow || "") && /First Booked Call/i.test(passage.h2 || ""),
  passageBeats: passage.beats.length === 3 && /See/.test(passage.beats[0].text) && /Trust/.test(passage.beats[1].text) && /Decide/.test(passage.beats[2].text),
  underworldEyebrow: /The Machine/i.test(underworld.eyebrow || ""),
  underworldH2: /Under The Beauty Is The Machine\./.test(underworld.h2 || ""),
  underworldRows: underworld.cards.length === 3 && underworld.cards.every((c) => c.revealed) && /Landing Page/.test(underworld.cards[0].h3) && /Funnel Logic/.test(underworld.cards[1].h3) && /Follow-Up/.test(underworld.cards[2].h3),
  problemH2: /Why Beautiful Pages Still Fail\./.test(problem.h2 || ""),
  problemCards: problem.cards.length === 3 && /Template Trap/.test(problem.cards[0].h3) && /Weak Journey/.test(problem.cards[1].h3) && /Lost Leads/.test(problem.cards[2].h3),
  bridgeCta: /Want Your Page To Do More Than Look Good\?/.test(problem.bridgeP || "") && problem.bridgeCta === "Map My Funnel",
  noEmdash: !JSON.stringify({ hero, passage, underworld, problem }).includes("—"),
};

console.log("\n--- COPY UAT ---");
for (const [k, v] of Object.entries(checks)) console.log(`${k}: ${v}`);

await browser.close();
process.exit(Object.values(checks).every(Boolean) ? 0 : 1);
