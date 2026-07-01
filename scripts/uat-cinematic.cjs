// UAT: native scroll cinema — pin/scrub through acts, then post-cinematic sections.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const URL = process.env.UAT_URL || 'https://dwfunnel-webgl.vercel.app/cinema.html?v=23';
const OUT = path.resolve(__dirname, '..', 'previews');

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push('console.error: ' + m.text());
  });

  console.log('navigating ->', URL);
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(3500);

  const sample = await page.evaluate(() => ({
    loaderDone: !!document.getElementById('loader')?.classList.contains('is-done'),
    pinTrigger: !!window.__cinemaPinST,
    scrubber: window.__scrubber ? {
      total: window.__scrubber.frames?.length ?? 0,
      lastDrawn: window.__scrubber._lastDrawnIndex ?? null,
    } : null,
    heroCopyVisible: (() => {
      const el = document.querySelector('#hero-copy-block');
      if (!el) return null;
      return parseFloat(getComputedStyle(el).opacity) > 0.5;
    })(),
    problemRows: document.querySelectorAll('#problem-system .cinema-system__row').length,
    transformItems: document.querySelectorAll('.transform-list__item').length,
    processSteps: document.querySelectorAll('#process .cinema-system__row').length,
  }));
  console.log('cinematic sample:', JSON.stringify(sample, null, 2));

  await page.screenshot({ path: path.join(OUT, 'uat-01-hero.png') });

  // Scroll through pin (passage + underworld)
  await page.evaluate(() => window.scrollTo({ top: window.innerHeight * 2.5, behavior: 'instant' }));
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(OUT, 'uat-02-mid-pin.png') });

  const sections = ['problem', 'build', 'transform', 'platforms', 'how-it-works', 'process', 'proof', 'testimonials', 'work-with-us'];
  for (const id of sections) {
    await page.evaluate((sid) => {
      const el = document.getElementById(sid);
      if (el) el.scrollIntoView({ behavior: 'instant', block: 'start' });
    }, id);
    await page.waitForTimeout(900);
    const data = await page.evaluate((sid) => {
      const el = document.getElementById(sid);
      if (!el) return null;
      const h2 = el.querySelector('h2');
      const lead = el.querySelector('.cinema-section__lead');
      return {
        h2: h2?.innerText?.slice(0, 80) ?? null,
        lead: lead?.innerText?.slice(0, 80) ?? null,
        rows: el.querySelectorAll('.cinema-system__row, .transform-list__item, .agitate-list__item').length,
      };
    }, id);
    console.log(`section ${id}:`, JSON.stringify(data));
    await page.screenshot({ path: path.join(OUT, `uat-${id}.png`) });
  }

  // Scroll back up to hero
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await page.waitForTimeout(800);
  const backTop = await page.evaluate(() => ({
    scrollY: window.scrollY,
    heroVisible: parseFloat(getComputedStyle(document.querySelector('#hero-copy-block')).opacity) > 0.3,
  }));
  console.log('scroll back to top:', backTop);

  await browser.close();

  if (errors.length) {
    console.error('ERRORS:', errors);
    process.exit(1);
  }
  if (!sample.pinTrigger) {
    console.error('FAIL: ScrollTrigger pin not initialized');
    process.exit(1);
  }
  if (sample.problemRows < 3) {
    console.error('FAIL: problem section missing rows');
    process.exit(1);
  }
  console.log('UAT passed');
})();
