# DW Funnel WebGL

Hero-first rebuild. **Neon cyber visual** + **DW Funnel copy** from the archived scroll project.

## Status
- v0: WebGL hero prototype only (`index.html`)
- Archived predecessor: `../dwfunnel` (frame-scrub build)

## Run locally
```bash
python -m http.server 8766
```
Open http://localhost:8766

**Requires a local server** — ES modules + Three.js import map won't load from `file://`.

## Hero portrait (2.5D depth parallax)

1. Save AI portrait as `assets/images/cyborg-hero.webp`
2. Optional: `python scripts/generate-depth-map.py` → `cyborg-hero-depth.webp`
3. Hard refresh — shader displaces mesh by depth, mouse parallax + rim glow

## Stack
- Three.js + bloom post-processing
- Plain HTML/CSS (no framework)
- Copy reference: `docs/COPY.md`
