# Scroll cinema timeline

One **continuous scroll film** — not separate idle + restart-from-zero.

## The problem you described

> Idle loops frames 1–140. User scrolls at frame 50. How does it stay connected into section 2?

**Answer:** capture the **current idle frame** when scroll starts, then map scroll progress from **frame 50 → end of act**, through act 1, then a **bridge** into HTML section 2. No jump back to frame 0.

## Three beats (config in `scroll-timeline.js`)

| Beat | Scroll share | CDN frames | Feel |
|------|--------------|------------|------|
| **Act 0 — Entry** | 42% | `act0` | Wow dive — uses **handoff frame** |
| **Act 1 — Drift** | 28% | `act1` | Slower ambient movement |
| **Act 2 — Bridge** | 30% | `act2` (first ~72 frames) | Transition burst → `#act2` content fades in |

Total pin: **~520vh** of scroll (`totalPinLength()`).

## Idle loop

- WebP: cycles `heroIdle.webpLoop` (default act0 frames **0–139**)
- MP4: optional `assets/videos/hero-idle.mp4` — handoff uses **video time → frame index**

When scroll begins:

```
handoffFrame = idle.getCurrentFrame()  // e.g. 50
entry scroll: frame 50 → act0 end (not 0 → end)
```

Scroll back to top → idle resumes, handoff resets.

## Production pipeline (recommended)

Export **one master clip** per act from the same Seedance/Kling project so colors/framing match:

1. **act0-entry.mp4** — wide → dive (146 frames)
2. **act1-drift.mp4** — gentle orbit / hold (~100 frames)
3. **act2-bridge.mp4** — whip pan / fly-through into UI (~72 frames used)

```bash
ffmpeg -i act0-entry.mp4 -vf "fps=24,scale=1920:1080" -q:v 78 frames/act0/frame_%04d.webp
```

Idle loop = **same act0 source**, frames 0–139 as loop OR separate 4s `hero-idle.mp4` that matches frame 0.

## Tuning

- `CINEMA_SEGMENTS` in `assets/js/scroll-timeline.js` — shares, easing, bridge length
- `heroIdle.webpLoop` in `cdn-manifest.js` — idle range
- `bridge.contentRevealAt` — when `#act2` copy appears (0.62 = late in bridge)
