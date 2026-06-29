# Cyborg hero asset

Drop your AI portrait here:

- **File:** `cyborg-hero.webp` or `cyborg-hero.png`
- **Size:** 2048px tall minimum (portrait 2:3 or 3:4)
- **Background:** solid `#030508` void (no room, no gradient)

The scene auto-loads this path and applies **2.5D depth parallax** (vertex displacement + mouse parallax + rim light). Until the file exists, the procedural robot placeholder is used.

## Depth map (optional but recommended)

| File | Purpose |
|------|---------|
| `cyborg-hero-depth.webp` | Grayscale depth — white = closer |

If missing, depth is **auto-generated** from the color image in the browser.

Generate locally:

```bash
python scripts/generate-depth-map.py
```

For best quality, use Leonardo/MiDaS depth on the same still and save as `cyborg-hero-depth.webp`.

## Tweak parallax

Edit `PORTRAIT_CFG` in `assets/js/hero-scene.js`:

- `displacement` — Z volume (default `0.38`)
- `parallax` — mouse UV shift (default `0.032`)
- `rimStrength` — green edge glow (default `0.6`)
