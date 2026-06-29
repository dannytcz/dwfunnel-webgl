# DW Funnel WebGL

Hero-first rebuild. **Neon cyber visual** + **DW Funnel copy** from the archived scroll project.

## Status
- v0: WebGL hero prototype only (`index.html`)
- Archived predecessor: `../dwfunnel` (frame-scrub build)

## Run locally
```bash
python scripts/dev-server.py
```
Open http://localhost:8766

**Hard refresh:** `Ctrl+Shift+R` — check top-right badge says `Build: glb-v2 — mode: glb (real 3D mesh)`.

## Hero modes

Set `HERO_MODE` in `assets/js/hero-scene.js`:

| Mode | What you get |
|------|----------------|
| **`auto`** (default) | Real **GLB** mesh → fallback built-in 3D bust |
| `glb` | GLB only (`assets/models/cyborg-bust.glb`) |
| `mesh3d` | Built-in Three.js geometry bust |
| `portrait` | 2.5D AI still (legacy) |

Download GLB: `powershell -File scripts/download-hero-glb.ps1`

Hard refresh after changes. Skip intro to see the bust immediately.

## Stack
- Three.js + bloom post-processing
- Plain HTML/CSS (no framework)
- Copy reference: `docs/COPY.md`
