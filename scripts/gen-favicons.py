from pathlib import Path
import io
import struct

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
BRAND = ROOT / "assets" / "images" / "brand"
BRAND.mkdir(parents=True, exist_ok=True)

SVG = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" role="img" aria-label="DW Funnel">
  <rect width="32" height="32" rx="7" fill="#050505"/>
  <path fill="#F2EDE4" d="M5.2 7.4h5.05c3.9 0 6.35 2.05 6.35 5.35 0 3.35-2.4 5.4-6.35 5.4H8V24.6H5.2V7.4zm2.8 2.35v6.05h2.05c2.05 0 3.25-1.05 3.25-3 0-1.95-1.2-3.05-3.25-3.05H8z"/>
  <path fill="#F2EDE4" d="M17.05 7.4h2.85l1.35 9.55L22.7 7.4h2.9l2.35 17.2h-2.85l-1.2-10.05-1.85 10.05h-2.55l-1.9-10.05-1.15 10.05h-2.85L17.05 7.4z"/>
  <rect x="5.2" y="26.2" width="21.6" height="2" rx="1" fill="#F04A2A"/>
</svg>
"""
(BRAND / "favicon.svg").write_text(SVG, encoding="utf-8")


def font_for(size: int):
    candidates = [
        r"C:\Windows\Fonts\arialbd.ttf",
        r"C:\Windows\Fonts\segoeuib.ttf",
        r"C:\Windows\Fonts\bahnschrift.ttf",
        r"C:\Windows\Fonts\arial.ttf",
    ]
    for path in candidates:
        p = Path(path)
        if p.exists():
            return ImageFont.truetype(str(p), size)
    return ImageFont.load_default()


def make_icon(size: int, radius_ratio: float = 0.22) -> Image.Image:
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    r = max(2, int(size * radius_ratio))
    draw.rounded_rectangle([0, 0, size - 1, size - 1], radius=r, fill=(5, 5, 5, 255))

    if size <= 20:
        pad = max(2, size // 8)
        stem_w = max(2, size // 6)
        bottom = size - pad - max(2, size // 5)
        draw.rectangle([pad + 1, pad, pad + 1 + stem_w, bottom], fill=(242, 237, 228, 255))
        bowl = [pad + 1 + stem_w - 1, pad, size - pad, bottom]
        draw.pieslice(bowl, start=270, end=90, fill=(242, 237, 228, 255))
        inset = max(2, size // 6)
        inner = [bowl[0] + inset, bowl[1] + inset, bowl[2] - max(2, size // 8), bowl[3] - inset]
        if inner[2] > inner[0] and inner[3] > inner[1]:
            draw.pieslice(inner, start=270, end=90, fill=(5, 5, 5, 255))
    else:
        font = font_for(max(10, int(size * 0.46)))
        text = "DW"
        bbox = draw.textbbox((0, 0), text, font=font)
        tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
        x = (size - tw) / 2 - bbox[0]
        y = (size - th) / 2 - bbox[1] - size * 0.08
        draw.text((x, y), text, font=font, fill=(242, 237, 228, 255))

    bar_h = max(2, int(size * 0.07))
    bar_w = int(size * 0.66)
    bx = (size - bar_w) // 2
    by = int(size * 0.80)
    draw.rounded_rectangle(
        [bx, by, bx + bar_w, by + bar_h],
        radius=max(1, bar_h // 2),
        fill=(240, 74, 42, 255),
    )
    return img


def save_png_ico(path: Path, images: list) -> None:
    """Write a PNG-compressed multi-size ICO (reliable in modern browsers)."""
    blobs = []
    for im in images:
        buf = io.BytesIO()
        im.save(buf, format="PNG")
        blobs.append((im.width, im.height, buf.getvalue()))

    header = struct.pack("<HHH", 0, 1, len(blobs))
    offset = 6 + 16 * len(blobs)
    entries = []
    data = bytearray()
    for w, h, png in blobs:
        wb = 0 if w >= 256 else w
        hb = 0 if h >= 256 else h
        entries.append(struct.pack("<BBBBHHII", wb, hb, 0, 0, 1, 32, len(png), offset))
        offset += len(png)
        data.extend(png)
    path.write_bytes(header + b"".join(entries) + bytes(data))


png16 = make_icon(16)
png32 = make_icon(32)
png48 = make_icon(48)
png180 = make_icon(180, radius_ratio=0.2)

png16.save(BRAND / "favicon-16.png", optimize=True)
png32.save(BRAND / "favicon-32.png", optimize=True)
png180.save(BRAND / "apple-touch-icon.png", optimize=True)
png180.save(ROOT / "apple-touch-icon.png", optimize=True)

ico_path = ROOT / "favicon.ico"
save_png_ico(ico_path, [png16, png32, png48])
(BRAND / "favicon.ico").write_bytes(ico_path.read_bytes())

print("ok", ico_path.stat().st_size, "sizes", int.from_bytes(ico_path.read_bytes()[4:6], "little"))
for p in [
    BRAND / "favicon.svg",
    BRAND / "favicon-16.png",
    BRAND / "favicon-32.png",
    BRAND / "apple-touch-icon.png",
    ROOT / "apple-touch-icon.png",
    ico_path,
]:
    print(p.relative_to(ROOT), p.stat().st_size)
