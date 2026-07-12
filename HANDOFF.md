# DW Funnel flagship site, project handoff

You are taking over an in progress build. Read this whole file before touching anything, then confirm you understand the current state and ask what to work on next.

## 1. What this project is

`cinema.html` is DW Funnel's flagship marketing site, a single page cinematic landing page for a funnel design studio. The bar is Awwwards / motionsites standard, it should feel like a 50,000 USD build. The owner is Danny Tan (a dentist turned funnel studio founder). Studio voice is always "we".

Live: **https://dwfunnel-webgl.vercel.app** (the root rewrites to `cinema.html`).

The most active surface right now is the **Selected Work** section, a grid of concept builds. Each card is a small looping video preview of a real, self hosted demo site, and clicking a card opens that live demo in a new tab. Danny keeps sending purchased HTML templates that you "make ours" and add to the grid.

## 2. Environment and setup

- OS: Windows 11. You have Git Bash (POSIX sh) and PowerShell 5.1. `bc` is NOT installed in Git Bash, do arithmetic in awk/python.
- Node v22, npm. Python 3.12 with Pillow (PIL) and Playwright installed. ffmpeg on PATH (Gyan build). Playwright Chromium is installed under the repo `node_modules`.
- No build step. It is plain static HTML, CSS, and JS. There is no framework for the main site.

**Run locally** (from project root):
```
python -m http.server 8768
```
Then open `http://localhost:8768/cinema.html`. This matches `.claude/launch.json` (config name `cinema`). The server serves the working directory as is, so edits are live on refresh. (The README mentions `scripts/dev-server.py` on 8766, that is older, use 8768.)

**Deploy to production**:
```
npx vercel deploy --prod --yes
```
Run it from the project root. Vercel deploys the working directory and is independent of git, so a deploy ships whatever is on disk, committed or not. After deploy, verify with curl against the live URL.

## 3. Repo structure (the parts that matter)

```
cinema.html                     the product (the flagship page)
index.html                      redirect to cinema.html
legal.html                      privacy + terms (noindex, shares cinema.css)
vercel.json                     rewrites "/" -> "/cinema.html"
assets/css/cinema.css           all styles for cinema.html
assets/js/cinema-app.js         main JS (loader, scrub, reveals, initWorkGrid, etc)
assets/js/*.js                  supporting modules (frame scrub, atmosphere, etc)
assets/fonts/                   self hosted Space Grotesk + Space Mono woff2
assets/images/hero/             hero poster + scrub frames
demos/<key>.html                each live concept demo (self contained)
assets/demos/<key>/             that demo's self hosted assets (webp, mp4, fonts, glb)
assets/demos/previews/          grid preview clips: <key>.mp4 30fps H.264 + <key>-poster.webp
scripts/capture-previews.cjs    Playwright tool that records + encodes getlayers-style preview mp4s
scripts/*.cjs, *.py             older UAT / capture helpers (use as reference)
```

The main page loads: self hosted Space Grotesk/Mono, Google Fonts (Cinzel, Orbitron), GSAP + ScrollTrigger + SplitText, Lenis smooth scroll, and a pinned Three.js atmosphere (pin to three **0.160.1**, other builds 404). Do not "upgrade" those blindly.

## 4. Cache versioning (do not skip)

`cinema.css` and `cinema-app.js` are loaded with `?v=NN`. **Whenever you change either file, bump its version** in `cinema.html` (currently both at `v=89`). The HTML itself is not cache busted, so in the local browser add a throwaway `&cb=NN` to force fresh HTML while testing.

## 5. The Selected Work grid, how it works

Section id is around the "Selected Work" heading, class `.work-grid`. It is **4 columns** on desktop (steps to 3 at <=1200px, 2 at <=900px, 1 at <=560px). There are currently **12 cards**, all live demos.

Each live card is:
```html
<figure class="work-card">
  <a class="work-card__link" href="/demos/<key>.html" target="_blank" rel="noopener" aria-label="Open the <Brand> live demo in a new tab">
    <div class="work-card__screen ws--embed">
      <span class="ws-chrome"><i></i><i></i><i></i></span>
      <span class="work-card__live">Live site</span>
      <video class="ws-embed-preview" poster="/assets/demos/previews/<key>-poster.webp"
             data-src="/assets/demos/previews/<key>.mp4"
             muted loop playsinline preload="none" width="960" height="600"
             tabindex="-1" aria-hidden="true"></video>
    </div>
  </a>
  <figcaption><strong><Brand></strong><span>Sector &middot; Deliverable</span><em>One line hook.</em></figcaption>
</figure>
```

Performance model (this is deliberate, keep it): getlayers-style smooth H.264 preview mp4s at 30fps. Cards start on a poster, then EVERY visible card plays its loop together while Selected Work is on screen. Three.js + the testimonial wall freeze via `html.is-work-focus` so concurrent videos stay silky. Offscreen cards unload back to posters. Data-saver leaves posters forever.

The 8 live demos and what each replaced:
- **AUREN** haute horlogerie (luxury watch), replaced Aurum
- **Harbour Smile** cosmetic dentistry (React/Tailwind, masked card reveal), replaced Vela. Danny created this brand himself, keep it.
- **Aurelia** luxury real estate (GSAP + Lenis, Bebas Neue), replaced Form
- **Kane Voss** discipline coaching (canvas particle field), replaced Pulse
- **Verde** botanical soda (model-viewer 3D cans), original
- **TOYBOMB** designer collectibles (carousel), original
- **Elowen** boutique stays (ambient video hero), original
- **LEXIS** performance footwear (Vite storefront, cursor X-ray), replaced Orbit
- **The Brew** fine dining reservations (`/demos/thebrew.html`), replaced the Ember placeholder.
- **Unwritten** immersive storyworlds (`/demos/unwritten.html`), scroll-driven portal experience.
- **Kairo** fintech consumer app landing (`/demos/kairo.html`), product video hero.
- **Valence** AI automation agency (`/demos/valence.html`), rebranded from Cognitra.

## 6. How to add a new demo ("make it ours")

Danny hands you a purchased single file template. The recipe, proven 5 times:

1. **Inspect for external dependencies and author fingerprints.** Grep for `https?://` (skip w3.org), `import.meta.url`, `base64`, and known tells: `cloudfront.net/user_...` (template author account), `images.higgs.ai` (proxy), `onlinewebfonts.com` (demands a CC BY credit), `strvid...digitaloceanspaces.com/motionsite` (a stock hero video used by more than one template).
2. **Self host every brand asset.** Images to webp (PIL, keep dimensions if any canvas math depends on them). Video compressed with ffmpeg (`scale=1280, crf 30, -an, +faststart`). Fonts: if the source used an attribution heavy host, self host the real OFL font instead (Fontsource on jsdelivr, e.g. `cdn.jsdelivr.net/fontsource/fonts/<font>@latest/latin-400-normal.woff2`). Put assets in `assets/demos/<key>/`.
3. **Keep library CDNs** (gsap, lenis, lucide, react, tailwind, Google Fonts). Only brand assets get self hosted.
4. **Rebrand only when the name is a real person or real business risk.** Fabricated concept brands (Aurelia, AUREN) are fine to keep. A personal name (the original "Marcus Vance") got renamed to a fabricated one (Kane Voss). If Danny says he made the brand, preserve it and his logo.
5. **House style pass:** remove dashes used as punctuation (see rules below), add `<meta name="robots" content="noindex">`, add a "Concept build by DW Funnel" credit (footer for scroll sites, small fixed badge for single screen ones) linking to `/`.
6. **Wire a card** (replace a placeholder) and **capture a preview clip** (section 8).

## 7. Hard rules (these are Danny's, follow exactly)

- **No dashes or em dashes as punctuation** in any copy, comment, or deliverable text (including this file). Use commas, colons, parentheses, `&middot;` as a separator, and "to" for numeric ranges (`US 5 to 13`, not `5-13`). Compound word hyphens (`self-discipline`, `30-day`, `X-ray`) are fine, they are not punctuation.
- **Do not change page copy unless explicitly instructed.** "Make it ours" authorizes the asset and branding work plus the dash cleanup, not a rewrite. Keep any `[PLACEHOLDER]` markers.
- **Proof is fabricated and placeholder marked.** Do not invent real client numbers, logos, phone numbers, or remove the markers.
- **Git:** work on `master` (that is the pattern here), never force push it. End commit messages with:
  `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`
  Avoid `(` `)` and `"` inside bash or PowerShell here string commit messages, they have broken commits here before.
- **Secret:** an image generation API key lives at `C:/Users/User/.openrouter_key`. Never print, paste, or commit it.
- **Never ship the original branded template file** into the repo. Rebranded output only.
- **PowerShell 5.1 mangles UTF-8** on `Get-Content -Raw` + `Set-Content`. For file rewrites prefer Python or Git Bash; if you must use .NET, use `[System.IO.File]::ReadAllText/WriteAllText` with `UTF8Encoding($false)` for no BOM.

## 8. Capturing grid preview clips

Preview clips are produced with `scripts/capture-previews.cjs` (Playwright headless Chromium, which works even though the in app Browser pane screenshot tool is currently wedged). With the dev server running on 8768:
```
node scripts/capture-previews.cjs            # all cards
node scripts/capture-previews.cjs lexis,auren  # some
```
It records a webm per recipe, then ffmpeg trims and encodes to an animated `assets/demos/previews/<key>.webp` (640x400, 12fps, libwebp_anim, about 3.5s loop) plus a static poster webp pulled from the source recording. Each recipe picks the card's highest value moment: scripted cursor sweeps for cursor effects, clicks or drags for interactions, `?embed=1` autoscroll for scroll reveals, and a hero hold for pages whose hero is the point. Two lessons are baked in: `await document.fonts.ready` before recording and start the trim after fonts apply (otherwise the h1 renders in a fallback font), and hold the hero rather than autoscrolling past it when the headline is the selling point.

To add a new card's clip, add a recipe to the `RECIPES` map in that script and run it.

## 9. Verifying your work (the screenshot tool is wedged)

The `mcp__Claude_Browser__*` screenshot / `computer` actions time out this whole environment, do not depend on them. Instead:
- **Functional checks:** `curl` for HTTP 200 and content, or Playwright `page.evaluate` to read DOM, computed styles, video `readyState`, console errors.
- **Visual checks:** drive a page with Playwright and `page.screenshot(...)`, or extract a frame from a clip with `ffmpeg -ss <t> -i clip.mp4 -frames:v 1 frame.png`, then open the PNG. This is how everything visual has been verified.
- The Browser pane can still be opened with `preview_start({url:"http://localhost:8768/..."})` and then `navigate` / `read_page` / `javascript_tool` work. A plain `navigate` to a localhost URL is sometimes denied, `preview_start` with the url gets around it.

## 10. Current state and what is likely next

- Grid is 4 wide, 12 live demos, H.264 30fps preview mp4s + posters. Cache at v=89+. Push after each iteration.
- **The obvious next task:** next template Danny sends, same make-ours recipe; optional grid pagination when the set grows.
- Deferred by Danny or still open: pagination or a "see more" second page for when the grid gets large (video previews keep it light for now, so not urgent); optional seamless looping of clips (boomerang); favicon and OG image; real content on the main page (a real WhatsApp number, real stats, a real founder portrait, currently placeholders); custom domain and analytics (Danny maps these himself later).
- Code protection question came up: you cannot truly stop front end copying, disabling right click is not real protection and hurts UX. The agreed direction if pursued is minify plus obfuscate the demo code, a copyright and terms page, not right click blocking.

## 11. Deeper history

If you are running on Danny's machine, there is persistent Claude memory at
`C:\Users\User\.claude\projects\C--Users-User-Projects-dwfunnel-webgl\memory\`
with `MEMORY.md` (index), `dwfunnel-project-state.md` (a detailed running log of every change and gotcha), and `danny-working-style.md`. Read those for the full backstory. If you are on a different machine you will not have them, this file is meant to stand alone.

When in doubt, act like Danny does: plain language, verify in a browser before claiming done, keep the copy locked, and move one clear step at a time.
