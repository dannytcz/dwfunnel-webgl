# Super HD cyborg — image, video, background, scroll

**Short answer: No Blender. You need one great asset + WebGL code for motion — not 580 frame scrubs.**

---

## Do you need 4K?

| Resolution | When |
|------------|------|
| **1920×1080** | Minimum acceptable for laptop hero |
| **2048×2048 still** | Sweet spot — sharp on most screens, small file |
| **3840×2160 (4K)** | Large monitors, “super HD” feel — optional, bigger load |

You do **not** need 4K unless you’re full-bleed on big displays. A **2K portrait** on a WebGL plane at native DPR already beats the old 720p frame scrub.

---

## How does she move? (three layers)

Motion comes from **different sources stacked** — not one thing.

```
Layer 1 — AI asset     subtle life (optional): blink, breath, hair glow loop
Layer 2 — WebGL code   mouse look, float, bloom, particles, grid (always)
Layer 3 — Scroll       GSAP: scale, slide, camera, fade into section 2 (always)
```

### Option A — Still image only (simplest)

1. One **2K PNG/WebP** cyborg on void background.
2. Three.js: texture on plane + head `lookAt` mouse + hover glow.
3. Scroll: cyborg **shrinks, slides right, dims** as section 2 enters (GSAP ScrollTrigger).

**Movement = code.** No video export needed.

### Option B — Still + micro video loop (TechStack feel)

1. **Hero still** for sharp first paint (2K PNG).
2. Optional **3–6s loop** (VideoExpress i2v): only subtle motion — eyes pulse, visor flicker, shoulder breathe.
3. WebGL + scroll same as Option A.

You do **not** render the whole page to video. One small loop on a plane.

### Option C — Depth parallax (2.5D)

1. One still + AI **depth map** (same prompt, or MiDaS on the still).
2. Shader shifts layers on mouse/scroll.

Still no full character video required.

---

## “Do we need image → video?”

**Only if you want organic micro-motion** (breathing, blink, LED flicker). Otherwise **no**.

| Need | Use |
|------|-----|
| Sharp face, mouse tracking | **Still** |
| Subtle “alive” feel | **Short loop** from still (i2v) |
| Scroll section transition | **GSAP** (not video) |
| Particles, grid, glow | **WebGL** (separate from character) |

Never do: full hero as 30s video, or video → WebP frame scrub (old pipeline).

---

## What about the background?

This is the key constraint for video loops.

### Rule: **character and background are separate layers**

```
[ WebGL scene ]
  ├─ Particles + grid + fog     ← code (always moves)
  ├─ Cyborg plane               ← your PNG or MP4
  └─ Bloom / vignette           ← post-process
```

### If you use a video loop for the cyborg

Generate with a **locked void background** in the prompt:

> Cyborg portrait, front view, solid flat background **#030508**, no room, no city, no bokeh, no gradient, same color edge to edge. Neon green accents. 16:9 or 1:1.

Then:
- Video **background matches page** → loop is invisible at edges.
- WebGL **particles/grid sit behind** the plane — they keep moving independently.
- You are **not** trying to remove a busy background in post.

### If the AI adds a messy background

- Regenerate with stricter prompt, or
- Use **still only** + cutout (remove.bg) on PNG → transparent PNG on plane (harder in WebGL, but doable), or
- Stick with **still on void** — safest.

**Do not** bake stars/grid into the AI video — those stay in WebGL so scroll and parallax stay flexible.

---

## Scroll to section 2 — premium robot animation

When user scrolls from Act 1 (hero) to section 2 (e.g. Problem):

| Effect | How |
|--------|-----|
| Cyborg scales down ~40%, moves to right edge | GSAP ScrollTrigger scrub |
| Head rotates toward section 2 headline | `lookAt` target lerps from mouse → section 2 |
| Bloom dims, particles drift upward | uniform / material tween |
| Hero copy fades out, section 2 fades in | CSS + ScrollTrigger |
| Optional pin | Hero pins briefly while cyborg “hands off” to content |

This is **ScrollTrigger + Three.js** — no new AI asset. Same cyborg, choreographed exit.

Example story: *“She tracked you in the hero. As you scroll, she steps aside and the problem section takes over.”* That ties motion to meaning (unlike old Act 1–4 scrubs).

---

## Recommended pipeline for DW Funnel WebGL

1. **VideoExpress:** 1× cyborg still, 2048px, void `#030508`.
2. **Optional:** 1× 6s i2v loop from that still (same void bg), for blink/breathe only.
3. **We wire:** texture plane + mouse + scroll exit to section 2.
4. **Section 2+:** plain HTML sections (problem cards, comparison) — robot not in every section.

---

## When you *would* use a 3D mesh tool

Full body walk, 360° spin, game avatar — **not** for this funnel.

For TechStack-style: **HD still (+ optional tiny loop) + WebGL + scroll choreography.**
