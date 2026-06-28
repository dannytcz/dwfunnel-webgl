# Cyborg hero — AI image prompt pack

Use for **VideoExpress**, ChatGPT, Midjourney, or Leonardo still generation.  
Save output as `assets/images/cyborg-hero.webp` (2048px+ tall).

---

## Master still prompt (copy-paste)

```
Hero subject: stunning female cyborg portrait, front-facing, shoulders and head visible, centered in frame. Late 20s appearance, confident calm expression, slight knowing smile not exaggerated. Synthetic beauty: smooth obsidian-black skin panels #0A0F0C with subtle matte ceramic texture, thin neon green #39FF14 circuit lines tracing jawline, cheekbones, and neck like bioluminescent HUD wiring. Glowing vivid green eyes with soft bloom, catchlight facing camera. Sleek futuristic visor band across brow — dark glass with faint green LED readout lines, not bulky sci-fi goggles. High-collar armored neck piece in dark gunmetal with green edge lighting. Small ear-piece tech detail, no large headphones. Hair: short geometric cut or tight ponytail, dark with faint green highlight streaks.

Environment: absolutely nothing behind her — pure flat void background solid color #030508 edge to edge, no gradient, no stars, no city, no bokeh, no floor, no studio backdrop seams. Subject floats in empty digital void.

Lighting: cinematic premium key light from upper left 45 degrees, soft green rim light on right cheek and shoulder, subtle fill so face reads clearly. Low-key mood, high contrast but face not crushed to black. Specular highlights on skin panels and visor glass. Subtle film grain, 8K render quality, ultra sharp focus on eyes and face.

Camera: straight-on portrait, eye level, 85mm lens feel, head and upper chest fill 70% of frame height, centered horizontally with 15% headroom. 3:4 portrait crop or 2:3 vertical. No dutch angle, no wide distortion.

Mood: premium tech luxury, TechStack cyber funnel energy, confident AI concierge watching the visitor, powerful but approachable, not horror, not cartoon, not anime.

Composition: safe zone center 80% for mobile crop. Leave slight negative space on left third for website copy overlay.

AVOID: male, child, cartoon, anime, pixar, plastic doll, horror, zombie, exposed wires gore, messy cables, busy background, city skyline, server room, white background, blue or purple neon, pink hair, red eyes, text, logos, watermarks, UI screenshots, low resolution, blurry, jpeg artifacts, extra fingers, deformed face, side profile, looking away from camera, full body tiny in frame, smartphone, microphone boom, stock photo office.
```

---

## Negative prompt (if tool supports separate field)

```
busy background, gradient background, white background, blue neon, purple neon, anime, cartoon, horror, gore, wires everywhere, low quality, blurry, text, logo, watermark, side view, looking away, full body wide shot, multiple people, male, deformed hands, extra limbs
```

---

## Technical export checklist

| Spec | Value |
|------|--------|
| Format | PNG or WebP |
| Min size | **2048px** on long edge |
| Ideal | 2048×2560 or 2160×3840 portrait |
| Background | Flat `#030508` only |
| Framing | Front face, shoulders up, centered |
| Eyes | Clearly visible, symmetric, green glow |

---

## Optional: image-to-video micro-loop (VideoExpress)

After still is approved, animate **same void background**:

```
Animate subtle life only: slow breathing chest rise, one slow eye blink at 3 seconds, faint green visor HUD flicker, micro head tilt 2 degrees left then return. Camera locked static front view. No background change, no zoom, no new objects, no hair whip, no talking mouth. Seamless loop 6 seconds. Background stays solid #030508 throughout every frame.
```

Export 1080p or 4K MP4 — we can swap video plane later; still is enough for v1.

---

## After you generate

1. Save to `assets/images/cyborg-hero.webp`
2. Hard refresh localhost
3. If eye glow misaligned, tell us — we tweak `PORTRAIT_CFG.eyes` in `hero-scene.js`

---

## ChatGPT edit prompt (if first gen close but not perfect)

Upload your near-miss image:

```
Edit this image only. Keep exact pose, framing, and void #030508 background.

Improve: brighter green eye glow, sharper face panels, cleaner visor HUD lines, more premium cinematic lighting, remove any background detail if present.

Do NOT: change angle, add environment, add text, change gender, zoom out.
```
