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

## Hero modes

Set `HERO_MODE` in `assets/js/hero-scene.js`:

| Mode | What you get |
|------|----------------|
| **`mesh3d`** (default) | Real Three.js geometry — lathe head, shoulder plates, tube circuits, PBR + env reflections |
| `glb` | External `assets/models/cyborg-bust.glb` — best for photoreal |
| `portrait` | 2.5D AI still + depth parallax (legacy — feels flat) |

Hard refresh after changes. Skip intro to see the bust immediately.

## Stack
- Three.js + bloom post-processing
- Plain HTML/CSS (no framework)
- Copy reference: `docs/COPY.md`
