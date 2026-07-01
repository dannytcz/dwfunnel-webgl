// Quick UAT: load live DW Funnel site, wait past the 3s loader, sample the
// cinematic state, then scroll through every section and capture a
// viewport-sized PNG. Saves to ./previews/uat-<section>.png for review.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const URL = process.env.UAT_URL || 'https://dwfunnel-webgl.vercel.app';
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
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 45000 });

  // Loader caps at 3s. Wait past it so the intro has played.
  await page.waitForTimeout(5200);

  // Sample scrubber / cinematic state.
  const sample = await page.evaluate(() => ({
    loaderDone: !!document.getElementById('loader')?.classList.contains('is-done'),
    cinemaLeaving: document.body.getAttribute('data-cinema-leaving'),
    scrubber: window.__scrubber ? {
      total: window.__scrubber.frames?.length ?? 0,
      drawn: window.__scrubber.frame ?? null,
      readyCount: window.__scrubber.frames?.filter(f => f && f.naturalWidth).length ?? 0,
    } : null,
    h1Text: document.querySelector('.cinema-copy--hero h1')?.innerText ?? null,
    h1Visible: (() => {
      const el = document.querySelector('.cinema-copy--hero h1');
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const op = parseFloat(getComputedStyle(el).opacity);
      return { rect: { x: r.x, y: r.y, w: r.width, h: r.height }, opacity: op };
    })(),
  }));
  console.log('cinematic sample @5s:', JSON.stringify(sample, null, 2));

  // Capture hero (cinematic) snapshot.
  await page.screenshot({ path: path.join(OUT, 'uat-01-hero.png') });

  // Scroll through each section and capture.
  const sections = ['problem', 'build', 'platforms', 'how-it-works', 'proof', 'testimonials', 'work-with-us'];
  for (const id of sections) {
    await page.evaluate((sid) => {
      const el = document.getElementById(sid);
      if (!el) return;
      el.scrollIntoView({ behavior: 'instant', block: 'start' });
    }, id);
    await page.waitForTimeout(1100); // let scrollTrigger reveal + counters tick
    const data = await page.evaluate((sid) => {
      const el = document.getElementById(sid);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const h2 = el.querySelector('h2');
      const lead = el.querySelector('.cinema-section__lead, .cinema-copy__lede');
      return {
        rect: { x: r.x, y: r.y, w: r.width, h: r.height },
        h2: h2?.innerText?.slice(0, 80) ?? null,
        h2Y: h2?.getBoundingClientRect()?.y ?? null,
        lead: lead?.innerText?.slice(0, 80) ?? null,
      };
    }, id);
    console.log(`section ${id}:`, JSON.stringify(data));
    await page.screenshot({ path: path.join(OUT, `uat-${id}.png`) });
  }

  // Mobile viewport test.
  await ctx.close();
  const mctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const mpage = await mctx.newPage();
  mpage.on('pageerror', (e) => errors.push('m-pageerror: ' + e.message));
  await mpage.goto(URL, { waitUntil: 'networkidle', timeout: 45000 });
  await mpage.waitForTimeout(5200);
  await mpage.screenshot({ path: path.join(OUT, 'uat-mobile-hero.png'), fullPage: false });

  await browser.close();

  console.log('\n--- errors ---');
  if (errors.length === 0) console.log('(none)');
  errors.forEach((e) => console.log(e));
  console.log('\npreviews saved to', OUT);
})().catch((e) => { console.error(e); process.exit(1); });