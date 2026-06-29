# DW Funnel WebGL

Hero-first landing page. **Scroll-driven cinematic WebP** + **DW Funnel copy**.

## Status
- **Active:** scroll frame scrub hero (`hero-scroll.js`) — pin + dive into scene on scroll
- **Legacy:** Three.js GLB bust (`hero-scene.js`) — kept, not loaded by default
- Archived predecessor: `../dwfunnel` (full 5-act scrub build)

## Run locally
```bash
python scripts/dev-server.py
```
Open http://localhost:8766 — hard refresh (`Ctrl+Shift+R`). Badge: `scroll-video-v1`.

## Hero video
Frames: `assets/js/cdn-manifest.js` → `act0` (GHL CDN WebPs from Seedance orbital clip).

Replace with your own clip: see **`docs/VIDEO-SCROLL.md`**.

## Stack
- Canvas WebP scrub + GSAP ScrollTrigger + Lenis smooth scroll
- Plain HTML/CSS (no framework)
- Copy reference: `docs/COPY.md`
