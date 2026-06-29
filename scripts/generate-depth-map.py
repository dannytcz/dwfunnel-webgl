#!/usr/bin/env python3
"""Generate cyborg-hero-depth.webp from cyborg-hero.png/webp.

Uses PIL only (no ML). For sharper depth, replace output with MiDaS / Leonardo depth pass.
"""
from __future__ import annotations

import math
import sys
from pathlib import Path

try:
    from PIL import Image, ImageFilter
except ImportError:
    print("Install Pillow: pip install pillow", file=sys.stderr)
    sys.exit(1)

ROOT = Path(__file__).resolve().parents[1]
IMAGES = ROOT / "assets" / "images"


def find_color_source() -> Path | None:
    for name in ("cyborg-hero.png", "cyborg-hero.webp", "cyborg-hero.jpg"):
        p = IMAGES / name
        if p.exists():
            return p
    return None


def generate_depth(img: Image.Image) -> Image.Image:
    w, h = img.size
    rgb = img.convert("RGB")
    px = rgb.load()
    out = Image.new("L", (w, h))
    opx = out.load()

    cx, cy = w * 0.5, h * 0.42
    max_r = math.hypot(cx, cy)

    for y in range(h):
        for x in range(w):
            r, g, b = px[x, y]
            if r < 15 and g < 15 and b < 15:
                opx[x, y] = 0
                continue

            lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255.0
            green = max(0.0, (g - max(r, b)) / 255.0) * 0.35
            center = 1.0 - math.hypot(x - cx, y - cy) / max_r
            center_w = max(0.0, center) ** 0.55
            depth = min(1.0, lum * 0.55 + green + center_w * 0.45)
            depth = depth ** 1.15
            opx[x, y] = int(depth * 255)

    return out.filter(ImageFilter.GaussianBlur(radius=2))


def main() -> int:
    src = find_color_source()
    if not src:
        print(f"No cyborg-hero image in {IMAGES}", file=sys.stderr)
        return 1

    img = Image.open(src)
    depth = generate_depth(img)
    out = IMAGES / "cyborg-hero-depth.webp"
    depth.save(out, "WEBP", quality=92)
    print(f"Wrote {out} ({depth.size[0]}x{depth.size[1]}) from {src.name}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
