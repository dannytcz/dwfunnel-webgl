// eslint-disable-next-line no-undef
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

  await page.keyboard.press("ArrowDown");
  await page.waitForTimeout(5000);
  await page.keyboard.press("ArrowDown");
  await page.waitForTimeout(5800);

  const before = await page.evaluate(() => {
    const scrimEl = document.querySelector(".cinema__stage");
    const afterComputed = scrimEl ? getComputedStyle(scrimEl, "::after") : null;
    return {
      progressOpacity: parseFloat(getComputedStyle(document.querySelector(".cinema-progress") || document.body).opacity || "1"),
      stationsOpacity: parseFloat(getComputedStyle(document.querySelector(".cinema-stations") || document.body).opacity || "1"),
      scrimAfterOpacity: afterComputed ? parseFloat(afterComputed.opacity || "0") : 0,
      bodyAttr: document.body.getAttribute("data-cinema-leaving"),
    };
  });

  await page.locator("#cinema-enter").click();
  await page.waitForTimeout(1500);

  const after = await page.evaluate(() => {
    const scrimEl = document.querySelector(".cinema__stage");
    const afterComputed = scrimEl ? getComputedStyle(scrimEl, "::after") : null;
    return {
      progressOpacity: parseFloat(getComputedStyle(document.querySelector(".cinema-progress") || document.body).opacity || "1"),
      stationsOpacity: parseFloat(getComputedStyle(document.querySelector(".cinema-stations") || document.body).opacity || "1"),
      scrimAfterOpacity: afterComputed ? parseFloat(afterComputed.opacity || "0") : 0,
      bodyAttr: document.body.getAttribute("data-cinema-leaving"),
      pinVisibility: getComputedStyle(document.querySelector(".cinema-pin") || document.body).visibility,
      problemTop: document.getElementById("problem") ? Math.round(document.getElementById("problem").getBoundingClientRect().top) : null,
      workWithUsPresent: !!document.getElementById("work-with-us"),
      oldContactStillThere: !!document.getElementById("contact"),
    };
  });

  const checks = {
    noErrors: errs.length === 0,
    bodyAttrSet: after.bodyAttr === "true",
    progressFaded: after.progressOpacity < before.progressOpacity && after.progressOpacity < 0.05,
    stationsFaded: after.stationsOpacity < before.stationsOpacity && after.stationsOpacity < 0.05,
    scrimAfterFaded: after.scrimAfterOpacity < before.scrimAfterOpacity && after.scrimAfterOpacity < 0.1,
    pinHidden: after.pinVisibility === "hidden",
    scrolledIntoProblem: after.problemTop !== null && after.problemTop >= -20 && after.problemTop <= 800,
    workWithUsExists: after.workWithUsPresent === true,
    noOldContactId: after.oldContactStillThere === false,
  };

  const lines = [
    JSON.stringify({ errs, before, after }, null, 2),
    "",
    "--- LEAVING UAT ---",
  ];
  for (const [k, v] of Object.entries(checks)) lines.push(`${k}: ${v}`);
  fs.writeFileSync("leaving.log", lines.join("\n") + "\n");

  await browser.close();
}

main().then(() => process.exit(0)).catch((err) => {
  fs.writeFileSync("leaving.log", `FATAL: ${err.stack || err.message || err}\n`);
  process.exit(1);
});
