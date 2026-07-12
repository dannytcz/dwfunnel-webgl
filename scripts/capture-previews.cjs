/*
 * Selected Work preview capture.
 *
 * Records a short looping clip of each live demo and encodes it to an animated
 * WebP + static poster used by the Selected Work grid in cinema.html.
 *
 * Why animated WebP (not mp4 / webm): gallery cards must feel silky with many
 * cards on screen. Video elements open a hardware decoder each; 8 concurrent
 * H.264/VP9 players stutter beside Lenis + Three.js. Animated WebP is decoded
 * on the image path via <img>, same approach as motionsite.ai.
 *
 * Prereq: the local static server must be running on :8768
 *         (python -m http.server 8768   from the project root)
 * Also needs ffmpeg on PATH (libwebp_anim) and playwright chromium installed
 *         (npx playwright install chromium).
 *
 * Run all:   node scripts/capture-previews.cjs
 * Run some:  node scripts/capture-previews.cjs lexis,aurelia
 *
 * Output:    assets/demos/previews/<key>.webp         animated, ~640x400, 12fps
 *            assets/demos/previews/<key>-poster.webp  static first frame
 *
 * Each card is captured by its highest-value selling point:
 *  - cursor effects (lexis X-ray, kanevoss particles): scripted mouse sweep
 *  - interactions (verde spin+flavor, toybomb carousel): scripted clicks/drag
 *  - scroll reveals (harbour): load ?embed=1 so the built-in autoscroll drives it
 *  - hero holds (aurelia, auren, elowen): let the hero's own video/motion play
 *
 * IMPORTANT gotchas baked in here:
 *  - await document.fonts.ready before recording, and trim.start AFTER fonts apply,
 *    or the h1 renders in a fallback font (this bit Aurelia / Bebas Neue).
 *  - Playwright records the whole session, so trim a good window per recipe.
 *  - Keep loops short (about 3.5s) so animated WebP stays under ~600KB per card.
 */
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const BASE = 'http://localhost:8768';
const W = 1280, H = 800;
const OUT = path.join(__dirname, '..', 'assets', 'demos', 'previews');
// Card display size: match motionsite.ai (~640 wide). 12fps + short loop keeps
// animated WebP light while still reading as motion.
const SCALE = '640:400';
const FPS = 12;
const MAX_DUR = 3.5;
const WEBP_Q = 52;

const hold = (p, ms) => p.waitForTimeout(ms);
async function clickSel(p, sel) { try { const el = await p.$(sel); if (el) await el.click({ timeout: 800 }); } catch (e) {} }
async function sweep(page, loops) {
  const pts = [[W*0.25,H*0.55],[W*0.75,H*0.45],[W*0.6,H*0.65],[W*0.35,H*0.4],[W*0.7,H*0.55]];
  for (let l = 0; l < loops; l++) for (const [x,y] of pts) { await page.mouse.move(x,y,{steps:14}); await page.waitForTimeout(90); }
}
// Slow full-viewport orbit so particle / cursor demos leave visible frame diffs
// after WebP compression (Kane Voss starfield was nearly static at q52).
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

// key -> { url, wait(ms after fonts.ready), act, trim:{start,dur}, q? }
const RECIPES = {
  lexis:    { url:'/demos/lexis.html',           wait:2600, trim:{start:3.0,dur:6}, act: p => sweep(p,8) },
  kanevoss: { url:'/demos/kanevoss.html?preview=1', wait:1200, trim:{start:1.2,dur:5}, q:72, posterAt:2.2, act: p => orbit(p, 7) },
  verde:    { url:'/demos/verde.html',           wait:5000, trim:{start:1.5,dur:7}, act: async p => { await hold(p,1200); await spin(p,'#product-model'); await clickSel(p,'[data-flavor="blue"]'); await hold(p,1600); await spin(p,'#product-model'); await clickSel(p,'[data-flavor="classic"]'); await hold(p,1600);} },
  toybomb:  { url:'/demos/toybomb.html',          wait:1800, trim:{start:2.5,dur:6}, act: async p => { for (let i=0;i<3;i++){ await clickSel(p,'#nextButton'); await hold(p,1900);} } },
  harbour:  { url:'/demos/harbour.html?embed=1',  wait:1500, trim:{start:3.0,dur:7}, act: p => hold(p,9000) },
  aurelia:  { url:'/demos/aurelia.html',          wait:1500, trim:{start:3.5,dur:6}, act: p => hold(p,8000) },
  auren:    { url:'/demos/auren.html?embed=1',    wait:1800, trim:{start:3.0,dur:7}, act: p => hold(p,9000) },
  elowen:   { url:'/demos/elowen.html',           wait:1500, trim:{start:2.5,dur:6}, act: p => hold(p,6000) },
};

(async () => {
  const only = process.argv[2] ? process.argv[2].split(',') : Object.keys(RECIPES);
  fs.mkdirSync(OUT, { recursive: true });
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'dwprev-'));
  const browser = await chromium.launch({
    args: ['--autoplay-policy=no-user-gesture-required','--use-gl=angle','--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist']
  });
  for (const key of only) {
    const r = RECIPES[key]; if (!r) { console.log('no recipe:', key); continue; }
    const ctx = await browser.newContext({ viewport:{width:W,height:H}, recordVideo:{ dir:tmp, size:{width:W,height:H} } });
    const page = await ctx.newPage();
    await page.goto(BASE + r.url, { waitUntil:'load', timeout:20000 }).catch(e=>console.log('goto warn', e.message));
    await page.evaluate(() => document.fonts.ready).catch(()=>{});
    await page.waitForTimeout(r.wait);
    await r.act(page);
    const vid = page.video();
    await ctx.close();
    const webm = await vid.path();
    const anim = path.join(OUT, key + '.webp');
    const poster = path.join(OUT, key + '-poster.webp');
    const dur = Math.min(r.trim.dur, MAX_DUR);
    const q = r.q != null ? r.q : WEBP_Q;
    // Animated WebP: image-path decode, infinite loop, no video element needed.
    // Poster comes from the source webm: ffmpeg's webp demuxer cannot re-read
    // animated WebP (skips ANIM/ANMF), so do not extract from the anim file.
    execFileSync('ffmpeg', ['-y','-loglevel','error','-ss',String(r.trim.start),'-t',String(dur),'-i',webm,
      '-vf',`scale=${SCALE}:flags=lanczos,fps=${FPS}`,'-an',
      '-c:v','libwebp_anim','-lossless','0','-compression_level','6','-q:v',String(q),
      '-loop','0','-preset','default', anim]);
    execFileSync('ffmpeg', ['-y','-loglevel','error','-ss',String(r.trim.start + (r.posterAt || 0.4)),'-i',webm,
      '-vf',`scale=${SCALE}:flags=lanczos`,'-frames:v','1','-c:v','libwebp','-q:v','70', poster]);
    // Drop legacy mp4 if present so the grid never picks it up by mistake.
    const legacyMp4 = path.join(OUT, key + '.mp4');
    if (fs.existsSync(legacyMp4)) fs.unlinkSync(legacyMp4);
    console.log(`[${key}] ${(fs.statSync(anim).size/1024|0)}KB anim webp + poster`);
  }
  await browser.close();
  console.log('DONE ->', OUT);
})();
