const { chromium } = require('playwright');

const BASE = process.env.BASE_URL || 'http://127.0.0.1:4173';
const checks = [
  {
    name: 'thebrew',
    url: `${BASE}/demos/thebrew.html/?embed=1&lightbox=1`,
    run: async (page) => {
      await page.waitForTimeout(3500);
      const data = await page.evaluate(() => {
        const hero = document.querySelector('.hero');
        const footer = document.querySelector('.footer');
        const heroRect = hero?.getBoundingClientRect();
        const vh = window.innerHeight;
        return {
          heroH: heroRect?.height || 0,
          vh,
          fill: heroRect ? heroRect.height / vh : 0,
          footerDisplay: footer ? getComputedStyle(footer).display : 'missing',
          bodyBg: getComputedStyle(document.body).backgroundColor,
        };
      });
      if (data.fill < 0.92) throw new Error(`hero fill ${data.fill.toFixed(2)} < 0.92`);
      if (data.footerDisplay !== 'none') throw new Error(`footer visible: ${data.footerDisplay}`);
      return data;
    },
  },
  {
    name: 'elyra',
    url: `${BASE}/demos/elyra.html/?embed=1&lightbox=1`,
    run: async (page) => {
      await page.waitForTimeout(3500);
      const data = await page.evaluate(() => {
        const home = document.querySelector('#home');
        const wedge = document.querySelector('.app-hero-wrapper > .absolute.bottom-0');
        const rect = home?.getBoundingClientRect();
        const vh = window.innerHeight;
        const bottomSample = document.elementFromPoint(window.innerWidth * 0.5, vh * 0.85);
        return {
          homeH: rect?.height || 0,
          vh,
          fill: rect ? rect.height / vh : 0,
          wedgeDisplay: wedge ? getComputedStyle(wedge).display : 'missing',
          bottomTag: bottomSample?.tagName || 'none',
          bottomClass: bottomSample?.className || '',
        };
      });
      if (data.fill < 0.92) throw new Error(`home fill ${data.fill.toFixed(2)} < 0.92`);
      if (data.wedgeDisplay !== 'none') throw new Error('black wedge still visible');
      return data;
    },
  },
];

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 880 } });
  let failed = 0;
  for (const check of checks) {
    try {
      await page.goto(check.url, { waitUntil: 'networkidle', timeout: 30000 });
      const data = await check.run(page);
      console.log(`OK ${check.name}`, JSON.stringify(data));
    } catch (err) {
      failed += 1;
      console.error(`FAIL ${check.name}:`, err.message);
    }
  }
  await browser.close();
  process.exit(failed ? 1 : 0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
