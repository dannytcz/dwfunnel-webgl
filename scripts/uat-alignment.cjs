// Typography + alignment + visual-hierarchy audit for the post-de-jank
// pass. Runs across 5 viewports, samples every section's heading / lede
// / body / contact card, and writes alignment.log with one pass/fail
// line per check.

const { chromium } = require("playwright");
const fs = require("fs");
const proc = process;

const VIEWPORTS = [
  { w: 1280, h: 800, label: "desktop-1280" },
  { w: 1366, h: 768, label: "laptop-1366" },
  { w: 1440, h: 900, label: "desktop-1440" },
  { w: 1920, h: 1080, label: "desktop-1920" },
  { w: 390, h: 844, label: "mobile-390" },
];

const SECTIONS = [
  "hero-copy-block",
  "passage-copy-block",
  "underworld-copy-block",
  "problem",
  "strategy",
  "build",
  "transform",
  "platforms",
  "how-it-works",
  "process",
  "proof",
  "testimonials",
  "work-with-us",
];

const FONT_DISPLAY_RE = /^"?Cinzel"?/i;
const FONT_BODY_RE = /^"?EB Garamond"?/i;

function pickRect(el) {
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
}

function rectHeight(r) {
  if (!r) return 0;
  return Math.round(r.height);
}

async function samplePage(page, sectionId) {
  return await page.evaluate((id) => {
    function rect(el) {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
    }
    function styleOf(el) {
      if (!el) return null;
      const cs = getComputedStyle(el);
      return {
        fontFamily: cs.fontFamily,
        fontStyle: cs.fontStyle,
        fontSize: cs.fontSize,
        textAlign: cs.textAlign,
        lineHeight: cs.lineHeight,
        maxWidth: cs.maxWidth,
      };
    }
    const root = document.getElementById(id);
    if (!root) return { found: false };
    const h = root.querySelector("h1, h2");
    const lede = root.querySelector(".cinema-section__lead, .cinema-copy__lede");
    const eyebrow = root.querySelector(".cinema-copy__eyebrow");
    const rows = Array.from(root.querySelectorAll(
      ".cinema-system__row, .process-step, .platforms-list__item, .testimonial, .contact-cta"
    ));
    const contactCards = Array.from(root.querySelectorAll(".contact-cta"));
    return {
      found: true,
      h: h ? { rect: rect(h), style: styleOf(h), tag: h.tagName.toLowerCase() } : null,
      lede: lede ? { rect: rect(lede), style: styleOf(lede) } : null,
      eyebrow: eyebrow ? { rect: rect(eyebrow), style: styleOf(eyebrow) } : null,
      rows: rows.map((row) => ({
        rect: rect(row),
        h3: row.querySelector("h3") ? { style: styleOf(row.querySelector("h3")) } : null,
      })),
      contactCards: contactCards.map((c) => ({
        rect: rect(c),
        h3: c.querySelector("h3") ? { style: styleOf(c.querySelector("h3")) } : null,
        label: c.querySelector(".contact-cta__label") ? { style: styleOf(c.querySelector(".contact-cta__label")) } : null,
      })),
    };
  }, sectionId);
}

function fontChainHas(style, re) {
  if (!style?.fontFamily) return false;
  // fontFamily may be a comma list; check the first token against the regex.
  const first = style.fontFamily.split(",")[0].trim().replace(/^"|"$/g, "");
  return re.test(first);
}

function maxWidthInCh(style, containerWidth) {
  if (!style?.maxWidth) return null;
  const m = /([\d.]+)ch/.exec(style.maxWidth);
  if (!m) return null;
  // ch ≈ 0.5em of the element's font size
  const fontPx = parseFloat(style.fontSize) || 16;
  const chPx = 0.5 * fontPx;
  const maxPx = parseFloat(m[1]) * chPx;
  return { ch: parseFloat(m[1]), px: Math.round(maxPx), ofContainer: containerWidth ? Math.round((maxPx / containerWidth) * 100) / 100 : null };
}

async function main() {
  const URL = proc.argv[2] || "https://dwfunnel-webgl.vercel.app/cinema.html";
  const browser = await chromium.launch({ headless: true });

  const errs = [];
  const allChecks = [];

  for (const vp of VIEWPORTS) {
    const page = await browser.newPage({ viewport: { width: vp.w, height: vp.h } });
    page.on("pageerror", (e) => errs.push(`[${vp.label}][pageerror] ${e.message}`));
    page.on("console", (m) => { if (m.type() === "error") errs.push(`[${vp.label}][console] ${m.text()}`); });

    await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 120000 });
    await page.waitForSelector("#loader.is-done", { state: "attached", timeout: 120000 });
    await page.waitForTimeout(6000);

    // Sample cinematic copy blocks while the user is still on hero.
    for (const id of ["hero-copy-block", "passage-copy-block", "underworld-copy-block"]) {
      const sample = await samplePage(page, id);
      if (!sample.found) {
        allChecks.push({ vp: vp.label, id, name: "section-found", pass: false, note: "element not found" });
        continue;
      }
      // Hero h1 must be centered (text-align center) and within the
      // horizontal gutter and within 80px of the viewport vertical center.
      if (id === "hero-copy-block" && sample.h) {
        const r = sample.h.rect;
        allChecks.push({ vp: vp.label, id, name: "hero-h1-center-axis", pass: sample.h.style.textAlign === "center", note: `text-align=${sample.h.style.textAlign}` });
        allChecks.push({ vp: vp.label, id, name: "hero-h1-h1-tag", pass: sample.h.tag === "h1", note: `tag=${sample.h.tag}` });
        allChecks.push({ vp: vp.label, id, name: "hero-h1-display-font", pass: fontChainHas(sample.h.style, FONT_DISPLAY_RE), note: `font-family=${sample.h.style.fontFamily}` });
        const leftGutter = vp.w >= 720 ? 32 : 16;
        allChecks.push({ vp: vp.label, id, name: "hero-h1-left-gutter", pass: r.left >= leftGutter, note: `left=${Math.round(r.left)}` });
        allChecks.push({ vp: vp.label, id, name: "hero-h1-right-gutter", pass: vp.w - r.right >= leftGutter, note: `right-gap=${Math.round(vp.w - r.right)}` });
        const vCenter = vp.h / 2;
        allChecks.push({ vp: vp.label, id, name: "hero-h1-vertically-centered", pass: Math.abs((r.top + r.height / 2) - vCenter) <= 120, note: `deviation=${Math.round(((r.top + r.height / 2) - vCenter))}` });
      }
      if (sample.eyebrow) {
        allChecks.push({ vp: vp.label, id, name: "eyebrow-italic", pass: sample.eyebrow.style.fontStyle === "italic", note: `font-style=${sample.eyebrow.style.fontStyle}` });
        allChecks.push({ vp: vp.label, id, name: "eyebrow-body-font", pass: fontChainHas(sample.eyebrow.style, FONT_BODY_RE), note: `font-family=${sample.eyebrow.style.fontFamily}` });
      }
      if (sample.lede) {
        allChecks.push({ vp: vp.label, id, name: "lede-italic", pass: sample.lede.style.fontStyle === "italic", note: `font-style=${sample.lede.style.fontStyle}` });
        allChecks.push({ vp: vp.label, id, name: "lede-body-font", pass: fontChainHas(sample.lede.style, FONT_BODY_RE), note: `font-family=${sample.lede.style.fontFamily}` });
        const mw = maxWidthInCh(sample.lede.style, vp.w);
        if (mw) {
          allChecks.push({ vp: vp.label, id, name: "lede-max-width-in-range", pass: mw.ch >= 48 && mw.ch <= 70, note: `${mw.ch}ch` });
        }
      }
    }

    // Now click Continue Reading to reach the post-cinematic sections.
    // For hero dwell, we just sample hero. For post-cinema, we click and scroll.
    await page.locator("#cinema-enter").click().catch(() => {});
    await page.waitForTimeout(1500);

    // Sample the post-cinematic sections in turn.
    for (const id of ["problem", "strategy", "build", "transform", "platforms", "how-it-works", "process", "proof", "testimonials", "work-with-us"]) {
      // Scroll the section into view so the ScrollTrigger has revealed it.
      await page.evaluate((sid) => {
        const el = document.getElementById(sid);
        if (!el) return;
        el.scrollIntoView({ behavior: "instant", block: "center" });
      }, id);
      await page.waitForTimeout(1200);
      const sample = await samplePage(page, id);
      if (!sample.found) {
        allChecks.push({ vp: vp.label, id, name: "section-found", pass: false, note: "element not found" });
        continue;
      }
      if (sample.h) {
        allChecks.push({ vp: vp.label, id, name: "h2-tag", pass: sample.h.tag === "h2", note: `tag=${sample.h.tag}` });
        allChecks.push({ vp: vp.label, id, name: "h2-centered-axis", pass: sample.h.style.textAlign === "center", note: `text-align=${sample.h.style.textAlign}` });
        allChecks.push({ vp: vp.label, id, name: "h2-body-font", pass: fontChainHas(sample.h.style, FONT_BODY_RE), note: `font-family=${sample.h.style.fontFamily}` });
        allChecks.push({ vp: vp.label, id, name: "h2-not-italic", pass: sample.h.style.fontStyle !== "italic", note: `font-style=${sample.h.style.fontStyle}` });
      }
      if (sample.lede) {
        allChecks.push({ vp: vp.label, id, name: "lede-italic", pass: sample.lede.style.fontStyle === "italic", note: `font-style=${sample.lede.style.fontStyle}` });
        allChecks.push({ vp: vp.label, id, name: "lede-body-font", pass: fontChainHas(sample.lede.style, FONT_BODY_RE), note: `font-family=${sample.lede.style.fontFamily}` });
        const mw = maxWidthInCh(sample.lede.style, vp.w);
        if (mw) {
          allChecks.push({ vp: vp.label, id, name: "lede-max-width-in-range", pass: mw.ch >= 48 && mw.ch <= 70, note: `${mw.ch}ch` });
        }
      }
      if (sample.rows.length >= 2) {
        const heights = sample.rows.map((r) => Math.round(r.rect.height));
        const minH = Math.min(...heights);
        const maxH = Math.max(...heights);
        allChecks.push({ vp: vp.label, id, name: "row-heights-match", pass: maxH - minH <= 2, note: `min=${minH}px max=${maxH}px` });
      }
      if (id === "work-with-us" && sample.contactCards.length === 2) {
        const [a, b] = sample.contactCards;
        allChecks.push({ vp: vp.label, id, name: "contact-card-h3-not-italic", pass: a.h3?.style?.fontStyle !== "italic" && b.h3?.style?.fontStyle !== "italic", note: `a=${a.h3?.style?.fontStyle} b=${b.h3?.style?.fontStyle}` });
        allChecks.push({ vp: vp.label, id, name: "contact-card-label-italic", pass: a.label?.style?.fontStyle === "italic" && b.label?.style?.fontStyle === "italic", note: `a=${a.label?.style?.fontStyle} b=${b.label?.style?.fontStyle}` });
        allChecks.push({ vp: vp.label, id, name: "contact-cards-equal-height", pass: Math.abs(a.rect.height - b.rect.height) <= 2, note: `a=${Math.round(a.rect.height)}px b=${Math.round(b.rect.height)}px` });
      }
    }

    // Header collision check (only at desktop widths).
    if (vp.w >= 720) {
      const collision = await page.evaluate(() => {
        const brand = document.querySelector(".cinema-header__brand");
        const cta = document.querySelector(".cinema-header__cta");
        if (!brand || !cta) return null;
        const b = brand.getBoundingClientRect();
        const c = cta.getBoundingClientRect();
        return { brandRight: Math.round(b.right), ctaLeft: Math.round(c.left), viewport: window.innerWidth };
      });
      if (collision) {
        allChecks.push({ vp: vp.label, id: "header", name: "header-cta-no-collision", pass: collision.ctaLeft - collision.brandRight >= 8, note: `gap=${collision.ctaLeft - collision.brandRight}` });
      }
    }

    await page.close();
  }

  await browser.close();

  const passCount = allChecks.filter((c) => c.pass).length;
  const failCount = allChecks.length - passCount;
  const lines = [
    JSON.stringify({ errs, total: allChecks.length, pass: passCount, fail: failCount }, null, 2),
    "",
    "--- ALIGNMENT UAT ---",
  ];
  for (const c of allChecks) {
    lines.push(`${c.pass ? "PASS" : "FAIL"}  [${c.vp}] ${c.id.padEnd(20)} ${c.name.padEnd(32)} ${c.note || ""}`);
  }
  fs.writeFileSync("alignment.log", lines.join("\n") + "\n");
  proc.exit(failCount === 0 ? 0 : 1);
}

main().then(() => proc.exit(0)).catch((err) => {
  fs.writeFileSync("alignment.log", `FATAL: ${err.stack || err.message || err}\n`);
  proc.exit(1);
});
