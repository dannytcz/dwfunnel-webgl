#!/usr/bin/env python3
"""Patch cdn-manifest.js act0-2 URLs from GHL upload manifest.json files."""
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FRAMES = ROOT / "assets" / "frames" / "cinema"
MANIFEST = ROOT / "assets" / "js" / "cdn-manifest.js"


def load_cdn_manifest(path: Path) -> dict:
    text = path.read_text(encoding="utf-8")
    start = text.index("{")
    end = text.rindex("}") + 1
    raw = text[start:end]
    raw = re.sub(r"\btrue\b", "True", raw)
    raw = re.sub(r"\bfalse\b", "False", raw)
    raw = re.sub(r"\bnull\b", "None", raw)
    return eval(raw)  # noqa: S307


def main() -> None:
    data = load_cdn_manifest(MANIFEST)
    for act in ("act0", "act1", "act2"):
        path = FRAMES / act / "manifest.json"
        if not path.is_file():
            raise SystemExit(f"Missing {path} — run GHL upload first.")
        m = json.loads(path.read_text(encoding="utf-8-sig"))
        urls = [f["url"] for f in m.get("frames", []) if f.get("url")]
        if not urls:
            raise SystemExit(f"No URLs in {path}")
        data["acts"][act] = urls
        print(f"{act}: {len(urls)} CDN URLs")

    data["heroIdle"] = {
        "still": "assets/images/still-B-surface-4k.png",
        "mode": "still",
        "note": "Static B poster at rest. Scroll drives WebP cinema on GHL CDN.",
    }

    MANIFEST.write_text(
        "/* Auto-generated — GHL CDN upload + patch-cdn-from-ghl.py */\n"
        f"window.DWF_CDN = {json.dumps(data, indent=2)};\n",
        encoding="utf-8",
    )
    print(f"Patched {MANIFEST}")


if __name__ == "__main__":
    main()
