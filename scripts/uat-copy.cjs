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
  await page.waitForTimeout(5400);

  const getText = (sel) => page.evaluate((s) => document.querySelector(s)?.textContent?.trim() ?? null, sel);
  const getAll = (sel) => page.evaluate((s) => Array.from(document.querySelectorAll(s)).map((el) => el.textContent?.replace(/\s+/g, " ").trim()), sel);

  const hero = {
    eyebrow: await getText("#hero-copy-block .cinema-copy__eyebrow"),
    h1: await getText("#hero-copy-block h1"),
    lede: await getText("#hero-copy-block .cinema-copy__lede"),
    primaryCta: await getText("#hero-copy-block .cinema-btn--primary"),
    secondaryCta: await getText("#hero-copy-block .cinema-btn--ghost"),
    rulePresent: await page.evaluate(() => !!document.querySelector("#hero-copy-block .cinema-copy__rule")),
    scrollHintPresent: await page.evaluate(() => !!document.getElementById("scroll-hint")),
    modeTogglePresent: await page.evaluate(() => !!document.getElementById("cinema-mode-toggle")),
    progressFillX: await page.evaluate(() => {
      const f = document.querySelector(".cinema-progress__fill");
      if (!f) return 0;
      const t = getComputedStyle(f).transform;
      if (t === "none") return 0;
      const m = t.match(/matrix\(([-\d.]+),/);
      return m ? parseFloat(m[1]) : 0;
    }),
  };

  await page.keyboard.press("ArrowDown");
  await page.waitForTimeout(5000);

  const passage = {
    eyebrow: await getText("#passage-copy-block .cinema-copy__eyebrow"),
    h2: await getText("#passage-copy-block h2"),
    lede: await getText("#passage-copy-block .cinema-copy__lede"),
    beats: await getAll("#passage-copy-block .cinema-passage__beats li"),
  };

  await page.keyboard.press("ArrowDown");
  await page.waitForTimeout(5800);

  const underworld = {
    eyebrow: await getText("#underworld-copy-block .cinema-copy__eyebrow"),
    h2: await getText("#underworld-copy-block h2"),
    lede: await getText("#underworld-copy-block .cinema-copy__lede"),
    rows: await page.evaluate(() => Array.from(document.querySelectorAll("#underworld-copy-block .cinema-system__row")).map((c) => ({
      num: c.querySelector(".cinema-system__num")?.textContent?.trim(),
      h3: c.querySelector("h3")?.textContent?.trim(),
      p: c.querySelector("p")?.textContent?.trim(),
    }))),
  };

  await page.locator("#cinema-enter").click();
  await page.waitForTimeout(2500);

  const snapSection = (id) => page.evaluate((id) => ({
    eyebrow: document.querySelector(`${id} .cinema-copy__eyebrow`)?.textContent?.trim() ?? null,
    h2: document.querySelector(`${id} h2`)?.textContent?.trim() ?? null,
    lead: document.querySelector(`${id} .cinema-section__lead`)?.textContent?.trim() ?? null,
  }), id);

  const problem = await snapSection("#problem");
  const strategy = await snapSection("#strategy");
  const build = await snapSection("#build");
  const transform = await snapSection("#transform");
  const platforms = await snapSection("#platforms");
  const howItWorks = await snapSection("#how-it-works");
  const process = await snapSection("#process");
  const proof = await snapSection("#proof");
  const testimonials = await snapSection("#testimonials");
  const workWithUs = await snapSection("#work-with-us");

  const contactCtas = await page.evaluate(() => Array.from(document.querySelectorAll(".contact-cta")).map((c) => ({
    label: c.querySelector(".contact-cta__label")?.textContent?.trim(),
    h3: c.querySelector("h3")?.textContent?.trim(),
    cta: c.querySelector(".cinema-btn")?.textContent?.trim(),
    href: c.querySelector(".cinema-btn")?.getAttribute("href"),
  })));
  const midCtaCount = await page.evaluate(() => document.querySelectorAll(".cinema-section__cta-mid .cinema-btn--ghost").length);
  const testimonialCount = await page.evaluate(() => document.querySelectorAll(".testimonial").length);
  const urgencyText = await getText(".contact-cta__urgency");
  const oldContactPresent = await page.evaluate(() => !!document.getElementById("contact"));
  const pageBodyText = await getText("body");

  const snapshot = JSON.stringify({
    errs, hero, passage, underworld,
    problem, strategy, build, transform, platforms, howItWorks, process, proof, testimonials, workWithUs,
    contactCtas, midCtaCount, testimonialCount, urgencyText, oldContactPresent,
  }, null, 2);

  const checks = {
    noErrors: errs.length === 0,
    heroH1: /A Page People Remember\./.test(hero.h1 || "") && /A Funnel That Follows Up\./.test(hero.h1 || ""),
    heroEyebrow: /Landing Pages.*Funnels.*Follow-Up/i.test(hero.eyebrow || ""),
    heroPrimary: hero.primaryCta === "Get My Funnel Plan",
    heroSecondary: /See Why Pages Fail/i.test(hero.secondaryCta || ""),
    heroRulePresent: hero.rulePresent === true,
    noScrollHint: hero.scrollHintPresent === false,
    noModeToggle: hero.modeTogglePresent === false,
    noFreeScrollText: !/free scroll/i.test(pageBodyText || ""),
    progressFillStarted: hero.progressFillX > 0.02,

    passageHas: /Attention Is Only The Entrance\./.test(passage.eyebrow || "") && /First Booked Call/i.test(passage.h2 || ""),
    passageBeats: passage.beats.length === 3 && /See/.test(passage.beats[0]) && /Trust/.test(passage.beats[1]) && /Decide/.test(passage.beats[2]),
    underworldEyebrow: /The Machine/i.test(underworld.eyebrow || ""),
    underworldH2: /Under The Beauty Is The Machine\./.test(underworld.h2 || ""),
    underworldRows: underworld.rows.length === 3 && /Landing Page/.test(underworld.rows[0].h3) && /Funnel Logic/.test(underworld.rows[1].h3) && /Follow-Up/.test(underworld.rows[2].h3),

    problemH2: /Why Beautiful Pages Still Leak Leads/.test(problem.h2 || ""),
    strategyH2: /One Offer, One Page, One Machine Behind It/.test(strategy.h2 || ""),
    buildH2: /We Fix What Breaks Behind The Clicks/.test(build.h2 || ""),
    transformH2: /Strangers Stop Bouncing/.test(transform.h2 || ""),
    platformsH2: /Built On The Platform You Already Trust/.test(platforms.h2 || ""),
    howItWorksH2: /Six Parts\. One Outcome\. Clients Who Convert/.test(howItWorks.h2 || ""),
    processH2: /Five Steps From Brief To Live/.test(process.h2 || ""),
    proofH2: /270\+ Builds/.test(proof.h2 || "") && /10 Booked Calls A Week/.test(proof.h2 || ""),
    testimonialsH2: /Creators Who Stopped Sending Template Links/.test(testimonials.h2 || ""),
    workWithUsH2: /Map Your Funnel In One Call/.test(workWithUs.h2 || "") && /Message Daphne On Facebook/i.test(workWithUs.h2 || ""),

    midCtaCountAtLeastFive: midCtaCount >= 5,
    testimonialCountThree: testimonialCount === 3,
    contactHasBothCtas: contactCtas.length === 2 &&
      /Book A 20-Min Call/.test(contactCtas[0].cta || "") &&
      /DM On Facebook/.test(contactCtas[1].cta || ""),
    contactBookHrefCorrect: /cal\.com/.test(contactCtas[0].href || ""),
    contactDmHrefCorrect: /m\.me\/daphne\.wong\.funnel/.test(contactCtas[1].href || ""),
    contactUrgencyShown: /Only 3 build slots open this month/i.test(urgencyText || ""),
    noOldContactId: oldContactPresent === false,

    noEmdash: !JSON.stringify({
      hero, passage, underworld,
      problem, strategy, build, transform, platforms, howItWorks, process, proof, testimonials, workWithUs,
      contactCtas,
    }).includes("—"),
  };

  const lines = [`SNAP: ${snapshot}`, "", "--- COPY UAT ---"];
  for (const [k, v] of Object.entries(checks)) lines.push(`${k}: ${v}`);
  fs.writeFileSync("copy.log", lines.join("\n") + "\n");

  await browser.close();
}

main().then(() => process.exit(0)).catch((err) => {
  fs.writeFileSync("copy.log", `FATAL: ${err.stack || err.message || err}\n`);
  process.exit(1);
});
