# Super HD cyborg — do you need a 3D mesh tool?

**Short answer: No, not for a landing page hero like TechStack.**

## Recommended stack (what most premium funnels actually use)

```
VideoExpress / Midjourney / ChatGPT  →  one 2K–4K portrait PNG or short MP4
Three.js                             →  texture on a flat or slightly curved plane
Code                                 →  mouse look, glow, particles, bloom
```

No Blender. No rigging. No export pipeline.

| Approach | Mesh tool? | Quality | Mouse tracking |
|----------|------------|---------|----------------|
| **A. HD still on 3D plane** | No | Sharp at any screen size | Head tilt + eye glow in code |
| **B. HD video loop on plane** | No | Best if you get a good 6s loop | Overlay glow; optional depth parallax |
| **C. Depth map parallax** | No | 2.5D “almost 3D” from one image | MiDaS depth + shader shift |
| **D. Full 3D character mesh** | Yes (Blender, Meshy, RPM) | Overkill for one hero shot | Real head rotation, hardest path |

## What we have now

Procedural Three.js spheres — good for **prototype and layout**, not final art.

## What we do next (when you have VideoExpress output)

1. Export cyborg **2048×2048 minimum** (3840 if the tool allows).
2. Place as `TextureLoader` on a `PlaneGeometry` or subtle `SphereGeometry` (curved billboard).
3. Keep WebGL for: bloom, particles, grid, **eye emissive sprites** aligned to image eyes, head `lookAt` on mouse.
4. Optional: second layer — depth map for 1–2% parallax shift on hover.

## When you *would* use a 3D tool

- Full body walk cycle
- 360° product spin
- Game-style character

For “cyborg looks at my cursor on a funnel page” — **flat HD art + WebGL interaction wins.**
