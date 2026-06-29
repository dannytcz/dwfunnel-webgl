# Hero idle loop video

Place a **short looping MP4** here for subtle background motion while the user is idle at the top of the page.

**Filename:** `hero-idle.mp4` (referenced in `assets/js/cdn-manifest.js` → `heroIdle.url`)

## Specs
- **3–6 seconds**, seamless loop
- **Subtle motion only** — breathing, blink, hair, neon pulse, slow orbit
- Same character / lighting as your scroll-dive clip’s **first frame**
- 1920×1080 or 1280×720, H.264, muted

## Prompt idea
*“Cyberpunk female bust, front 3/4, minimal camera movement, slow breathing, neon circuit pulse, seamless loop, 4 seconds”*

## Fallback
If the file is missing, the hero uses **act0 WebP frames 0–28** as a cycling idle loop until you scroll (then full scrub dive).

## Scroll handoff
On scroll, idle video **crossfades** into the **act0 frame scrub** (dive animation). Match frame 0 of the scrub to the last frame of the idle loop for a seamless blend.
