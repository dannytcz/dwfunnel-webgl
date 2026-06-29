# Scroll WebP hero pipeline

Hero mode is **scroll-driven WebP frame scrub** — baked cinematic motion from video, scrubbed on scroll with extra dolly/zoom layered in code.

## Quick start

```powershell
python scripts/dev-server.py
# http://localhost:8766 — hard refresh after updates
```

Frames load from `assets/js/cdn-manifest.js` → `DWF_CDN.acts.act0` (~146 orbital hero frames on GHL CDN).

## Replace with your own clips

### Idle loop (background)
`assets/videos/hero-idle.mp4` — subtle character motion at rest. See `assets/videos/README.md`.

### Scroll dive (on scroll)
1. **Generate video** (Seedance / Kling / Runway / etc.) — camera **flies into the scene**:
   - orbital wide → dolly through neon corridor → push into subject
   - 4–6 seconds, 24fps, 1280×720 minimum (1920×1080 preferred)

2. **Extract WebP sequence**

```bash
ffmpeg -i hero-dive.mp4 -vf "fps=24,scale=1920:1080" -q:v 78 frames/hero/frame_%04d.webp
```

3. **Upload** — reuse archived script from `dwfunnel`:

```powershell
powershell -ExecutionPolicy Bypass -File ..\dwfunnel\scripts\ghl-upload-frames.ps1 -FramesDir "assets\frames\hero"
python ..\dwfunnel\scripts\generate-cdn-manifest.py
```

4. Copy generated manifest act0 URLs into `assets/js/cdn-manifest.js` or point `hero-scroll.js` at a new key.

## Tuning scroll feel

| File | What to tweak |
|------|----------------|
| `assets/js/hero-scroll.js` | `SCROLL_PIN` (`+=280%` = long scroll), Lenis duration |
| `assets/js/frame-scrub.js` | `mapScrollToFrame()` hold/acceleration, `scrollFx()` zoom drift |

## Legacy 3D

`assets/js/hero-scene.js` + GLB path kept in repo but **not loaded** by default. Switch back only if needed.
