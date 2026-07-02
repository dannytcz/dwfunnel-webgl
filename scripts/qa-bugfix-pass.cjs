// Bug fix pass QA
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const URL = process.env.UAT_URL || "http://127.0.0.1:8766/cinema.html?v=27";
const widths = [1400, 1024, 768, 375];

(async () => {
  const html = fs.readFileSync(path.join(__dirname, "..", "cinema.html"), "utf8");
  const visible = html.replace(/<!--[\s\S]*?-->/g, "");
  const dashes = visible.match(/[—–]/g);
  console.log("Em/en dashes in cinema.html visible text:", dashes ? dashes.length : 0);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const iframeReqs = [];
  page.on("request", (r) => {
    if (r.url().includes("cal.com")) iframeReqs.push(r.url());
  });

  await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.waitForTimeout(4000);

  const bodyOverflow = await page.evaluate(() => ({
    bodyOverflowY: getComputedStyle(document.body).overflowY,
    bodyOverflowX: getComputedStyle(document.body).overflowX,
    lenis: !!window.lenis,
    heroPin: !!window.__heroPinST,
  }));
  console.log("Scroll ownership:", bodyOverflow);

  for (const w of widths) {
    await page.setViewportSize({ width: w, height: 900 });
    await page.waitForTimeout(200);
    const wrap = await page.evaluate(() => {
      const title = document.getElementById("hero-title");
      if (!title) return null;
      const words = [...title.querySelectorAll(".word")];
      return words.map((word) => {
        const r1 = word.getBoundingClientRect();
        const chars = [...word.querySelectorAll(".char")];
        const broken = chars.some((c) => {
          const r2 = c.getBoundingClientRect();
          return Math.abs(r2.top - r1.top) > 4;
        });
        return broken;
      }).some(Boolean);
    });
    console.log(`H1 mid-word break at ${w}px:`, wrap ? "FAIL" : "OK");
  }

  await page.setViewportSize({ width: 1400, height: 900 });
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(1500);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(800);

  const act6 = await page.evaluate(() => ({
    hasIframe: !!document.querySelector("#cal-embed iframe"),
    hasPlaceholder: !!document.querySelector(".booking-placeholder"),
    hasSlots: document.querySelectorAll(".booking-slot").length,
  }));
  console.log("Act 06 booking:", act6);
  console.log("cal.com network requests:", iframeReqs.length);

  const trustAfterHero = await page.evaluate(() => {
    const hero = document.getElementById("hero-pin");
    const trust = document.getElementById("trust-strip");
    if (!hero || !trust) return null;
    return hero.compareDocumentPosition(trust) & Node.DOCUMENT_POSITION_FOLLOWING;
  });
  console.log("Trust strip follows hero pin:", !!trustAfterHero);

  await browser.close();
  if (dashes && dashes.length) process.exit(1);
  if (iframeReqs.length) process.exit(1);
  console.log("QA pass");
})();
