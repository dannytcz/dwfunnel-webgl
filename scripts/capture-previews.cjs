/*
 * Selected Work preview capture.
 *
 * Records a short looping clip of each live demo and encodes a smooth H.264
 * preview mp4 + static poster for the Selected Work grid in cinema.html.
 *
 * Model (getlayers.ai): dedicated preview.mp4 files, real 24fps H.264, about
 * 960px wide, proper bitrate. The grid plays ALL visible previews together.
 * Page smoothness comes from freezing Three.js while the gallery is focused,
 * not from starving frame rate or playing only one card.
 *
 * Prereq: the local static server must be running on :8768
 *         (python -m http.server 8768   from the project root)
 * Also needs ffmpeg on PATH and playwright chromium installed
 *         (npx playwright install chromium).
 *
 * Run all:   node scripts/capture-previews.cjs
 * Run some:  node scripts/capture-previews.cjs lexis,aurelia
 *
 * Output:    assets/demos/previews/<key>.mp4          ~960x600, 24fps, h264
 *            assets/demos/previews/<key>-poster.webp  static poster frame
 */
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const BASE = 'http://localhost:8768';
const W = 1280, H = 800;
const OUT = path.join(__dirname, '..', 'assets', 'demos', 'previews');
const SCALE = '960:600';
const FPS = 24;
const MAX_DUR = 4;
const CRF = 21;

const hold = (p, ms) => p.waitForTimeout(ms);
async function clickSel(p, sel) { try { const el = await p.$(sel); if (el) await el.click({ timeout: 800 }); } catch (e) {} }
async function sweep(page, loops) {
  const pts = [[W*0.25,H*0.55],[W*0.75,H*0.45],[W*0.6,H*0.65],[W*0.35,H*0.4],[W*0.7,H*0.55]];
  for (let l = 0; l < loops; l++) for (const [x,y] of pts) { await page.mouse.move(x,y,{steps:14}); await page.waitForTimeout(90); }
}
async function orbit(page, seconds) {
  const cx = W * 0.5, cy = H * 0.48, rx = W * 0.32, ry = H * 0.28;
  const steps = Math.max(24, Math.floor(seconds * 18));
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * Math.PI * 2;
    await page.mouse.move(cx + Math.cos(t) * rx, cy + Math.sin(t) * ry, { steps: 3 });
    await page.waitForTimeout(Math.floor((seconds * 1000) / steps));
  }
}
async function spin(page, sel) {
  try {
    const el = await page.$(sel); if (!el) return;
    const b = await el.boundingBox(); if (!b) return;
    const cy = b.y + b.height*0.45;
    await page.mouse.move(b.x + b.width*0.35, cy); await page.mouse.down();
    for (let i=0;i<=20;i++){ await page.mouse.move(b.x + b.width*(0.35+0.5*i/20), cy, {steps:2}); await page.waitForTimeout(40); }
    await page.mouse.up();
  } catch (e) {}
}

const RECIPES = {
  lexis:    { url:'/demos/lexis.html',              wait:2600, trim:{start:3.0,dur:6}, act: p => sweep(p,8) },
  kanevoss: { url:'/demos/kanevoss.html?preview=1', wait:1200, trim:{start:1.2,dur:5}, posterAt:2.2, act: p => orbit(p, 7) },
  ecogreen: { url:'/demos/ecogreen.html?embed=1&preview=1', wait:4500, trim:{start:3.2,dur:5}, posterAt:3.0, act: async p => {
    try {
      await p.waitForSelector('video', { timeout: 12000 });
      await p.evaluate(() => {
        const v = document.querySelector('video');
        if (!v) return;
        v.muted = true;
        return v.play();
      });
      await hold(p, 2500);
      await p.evaluate(() => window.scrollTo(0, 0));
      await hold(p, 1500);
      await sweep(p, 5);
      await hold(p, 4500);
    } catch (e) {
      await hold(p, 8000);
    }
  }},
  toybomb:  { url:'/demos/toybomb.html',             wait:1800, trim:{start:2.5,dur:6}, act: async p => { for (let i=0;i<3;i++){ await clickSel(p,'#nextButton'); await hold(p,1900);} } },
  harbour:  { url:'/demos/harbour.html?embed=1',     wait:1500, trim:{start:3.0,dur:7}, act: p => hold(p,9000) },
  aurelia:  { url:'/demos/aurelia.html',             wait:1500, trim:{start:3.5,dur:6}, act: p => hold(p,8000) },
  auren:    { url:'/demos/auren.html?embed=1',       wait:1800, trim:{start:3.0,dur:7}, act: p => hold(p,9000) },
  supabot:  { url:'/demos/supabot.html',             wait:2000, trim:{start:2.5,dur:6}, act: p => hold(p,6000) },
  thebrew:  { url:'/demos/thebrew.html?embed=1',     wait:2000, trim:{start:3.0,dur:7}, act: p => hold(p,9000) },
  unwritten:{ url:'/demos/unwritten.html?embed=1',  wait:2200, trim:{start:2.5,dur:7}, act: p => hold(p,10000) },
  kairo:    { url:'/demos/kairo.html?embed=1',      wait:2000, trim:{start:2.5,dur:7}, act: p => hold(p,9000) },
  valence:  { url:'/demos/valence.html?embed=1',    wait:2200, trim:{start:2.5,dur:7}, act: p => hold(p,10000) },
  elyra:    { url:'/demos/elyra.html?embed=1',      wait:2000, trim:{start:2.5,dur:7}, act: p => hold(p,9000) },
  alzer:    { url:'/demos/alzer.html?embed=1',      wait:1800, trim:{start:2.0,dur:6}, act: p => hold(p,8000) },
  petalform:{ url:'/demos/petalform.html?embed=1', wait:2200, trim:{start:2.0,dur:6}, viewport:{width:1680,height:1050}, act: p => hold(p,8000) },
  geneevo:  { url:'/demos/geneevo.html?embed=1',   wait:1800, trim:{start:2.0,dur:6}, act: p => hold(p,8000) },
  arcfield: { url:'/demos/arcfield.html?embed=1&preview=1', wait:3500, trim:{start:2.0,dur:6}, posterAt:1.5, act: p => hold(p,7000) },
  malleepaw:{ url:'/demos/malleepaw.html?embed=1', wait:2000, trim:{start:2.0,dur:6}, act: p => hold(p,8000) },
  lumenix:  { url:'/demos/lumenix.html?embed=1&preview=1', wait:3800, trim:{start:2.2,dur:6}, posterAt:1.8, act: p => hold(p,10000) },
  reverie:  { url:'/demos/reverie.html?embed=1&preview=1', wait:4200, trim:{start:2.8,dur:6}, posterAt:2.4, act: p => hold(p,12000) },
  stretch:  { url:'/demos/stretch.html?embed=1',  wait:2000, trim:{start:2.0,dur:6}, act: p => hold(p,9000) },
  webpal:   { url:'/demos/webpal.html?embed=1',   wait:2200, trim:{start:2.0,dur:6}, act: p => hold(p,8000) },
  picocore: { url:'/demos/picocore.html?embed=1', wait:2200, trim:{start:2.0,dur:6}, act: p => hold(p,8000) },
  liontech:{ url:'/demos/liontech.html?embed=1', wait:2000, trim:{start:2.0,dur:6}, act: p => hold(p,9000) },
  tarismo:  { url:'/demos/tarismo.html?embed=1',  wait:2200, trim:{start:2.0,dur:6}, act: p => hold(p,8000) },
  enermax:  { url:'/demos/enermax.html?embed=1&preview=1', wait:3200, trim:{start:2.0,dur:6}, posterAt:2.2, act: p => hold(p,12000) },
  autonex:  { url:'/demos/autonex.html?embed=1&preview=1', wait:7000, trim:{start:6.5,dur:6}, posterAt:1.0, act: async p => {
    // Sweep the cursor so the Spline robot arm visibly tracks it.
    await hold(p, 1500);
    await sweep(p, 6);
    await hold(p, 1500);
  }},
  sable:    { url:'/demos/sable.html?embed=1&lightbox=1&preview=1', wait:2500, trim:{start:1.5,dur:6}, posterAt:0.8, act: async p => {
    // Hold the lightbox-scaled hero so the trim lands on properly sized type.
    await hold(p, 4500);
    await clickSel(p, '.sm-toggle');
    await hold(p, 800);
    const fleet = p.locator('.sm-panel-itemList a, .sm-panel-itemList button, .staggered-menu-panel a, .staggered-menu-panel button').filter({ hasText: /Our Fleet/i });
    if (await fleet.count()) { await fleet.first().click(); await hold(p, 1800); }
    await p.mouse.move(720, 420, { steps: 12 });
    await hold(p, 2000);
    await p.mouse.move(1100, 420, { steps: 12 });
    await hold(p, 1600);
  }},
};

(async () => {
  const only = process.argv[2] ? process.argv[2].split(',') : Object.keys(RECIPES);
  fs.mkdirSync(OUT, { recursive: true });
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'dwprev-'));
  const browser = await chromium.launch({
    channel: 'chrome',
    args: ['--autoplay-policy=no-user-gesture-required','--ignore-gpu-blocklist']
  });
  for (const key of only) {
    const r = RECIPES[key]; if (!r) { console.log('no recipe:', key); continue; }
    const vw = (r.viewport && r.viewport.width) || W;
    const vh = (r.viewport && r.viewport.height) || H;
    const ctx = await browser.newContext({
      viewport: { width: vw, height: vh },
      deviceScaleFactor: 1,
      recordVideo: { dir: tmp, size: { width: vw, height: vh } }
    });
    const page = await ctx.newPage();
    await page.goto(BASE + r.url, { waitUntil:'load', timeout:20000 }).catch(e=>console.log('goto warn', e.message));
    await page.evaluate(() => document.fonts.ready).catch(()=>{});
    await page.waitForTimeout(r.wait);
    await r.act(page);
    const vid = page.video();
    // Detach heavy WebGL pages before closing the video context.
    try { await page.goto('about:blank', { waitUntil: 'domcontentloaded', timeout: 5000 }); } catch (e) {}
    await ctx.close();
    const webm = await vid.path();
    const mp4 = path.join(OUT, key + '.mp4');
    const poster = path.join(OUT, key + '-poster.webp');
    const dur = Math.min(r.trim.dur, MAX_DUR);
    // Cover-scale then center-crop so non-default viewports never stretch.
    const vf = `scale=${SCALE}:force_original_aspect_ratio=increase,crop=${SCALE},fps=${FPS}`;
    const vfPoster = `scale=${SCALE}:force_original_aspect_ratio=increase,crop=${SCALE}`;
    execFileSync('ffmpeg', ['-y','-loglevel','error','-ss',String(r.trim.start),'-t',String(dur),'-i',webm,
      '-vf',vf,'-an',
      '-c:v','libx264','-crf',String(CRF),'-preset','slow','-pix_fmt','yuv420p','-movflags','+faststart', mp4]);
    execFileSync('ffmpeg', ['-y','-loglevel','error','-ss',String(r.trim.start + (r.posterAt || 0.5)),'-i',webm,
      '-vf',vfPoster,'-frames:v','1','-c:v','libwebp','-q:v','72', poster]);
    console.log(`[${key}] ${(fs.statSync(mp4).size/1024|0)}KB mp4 + poster`);
  }
  await browser.close();
  console.log('DONE ->', OUT);
})();
