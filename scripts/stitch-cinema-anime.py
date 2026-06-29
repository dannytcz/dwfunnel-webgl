#!/usr/bin/env python3
"""Stitch anime hero clips → master MP4 + per-act WebP sequences for scroll scrub."""
from __future__ import annotations

import json
import re
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FFMPEG = Path(
    r"C:\Users\User\AppData\Local\Microsoft\WinGet\Packages"
    r"\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe"
    r"\ffmpeg-8.1.2-full_build\bin\ffmpeg.exe"
)
DOWNLOADS = Path.home() / "Downloads"

# B→A (Envato, forward — frame 0 ≈ idle still B)
V1 = DOWNLOADS / "d318325d-1545-4908-8556-f58ccf7a672f-2026-06-29.mp4"
# A→C dive (trim first 2s to skip redundant zoom-in)
V2 = DOWNLOADS / "2cc90d7c-1e53-49cb-83d8-77598a2b9e14.mp4"
# C→D emerge
V3 = DOWNLOADS / "978947f3-9cbd-4a78-9e03-035862dda833.mp4"

V2_TRIM_SEC = 2.0
FPS = 30
SCALE = "1920:1080"
WEBP_Q = 78

OUT_VIDEO = ROOT / "assets" / "videos" / "cinema-anime-master.mp4"
WORK = ROOT / "assets" / "videos" / "_cinema_build"
FRAMES_ROOT = ROOT / "assets" / "frames" / "cinema"


def run(cmd: list[str], label: str) -> None:
    print(f"\n=== {label} ===")
    print(" ".join(str(c) for c in cmd))
    proc = subprocess.run(cmd, capture_output=True, text=True)
    if proc.returncode != 0:
        print(proc.stderr, file=sys.stderr)
        raise RuntimeError(f"{label} failed ({proc.returncode})")


def ff(*args: str) -> list[str]:
    return [str(FFMPEG), "-hide_banner", "-loglevel", "error", "-y", *args]


def main() -> None:
    if not FFMPEG.is_file():
        sys.exit(f"ffmpeg not found: {FFMPEG}")
    for src in (V1, V2, V3):
        if not src.is_file():
            sys.exit(f"Missing source video: {src}")

    WORK.mkdir(parents=True, exist_ok=True)
    OUT_VIDEO.parent.mkdir(parents=True, exist_ok=True)

    v1 = WORK / "01-b-to-a.mp4"
    v2 = WORK / "02-a-to-c-trimmed.mp4"
    v3 = WORK / "03-c-to-d.mp4"
    concat_list = WORK / "concat.txt"
    master = WORK / "master.mp4"

    run(
        ff("-i", str(V1), "-an", "-c:v", "libx264", "-crf", "18", "-pix_fmt", "yuv420p", str(v1)),
        "Normalize V1 (B to A)",
    )
    run(
        ff("-ss", str(V2_TRIM_SEC), "-i", str(V2), "-an", "-c:v", "libx264", "-crf", "18", "-pix_fmt", "yuv420p", str(v2)),
        f"Normalize V2 (trim {V2_TRIM_SEC}s)",
    )
    run(
        ff("-i", str(V3), "-an", "-c:v", "libx264", "-crf", "18", "-pix_fmt", "yuv420p", str(v3)),
        "Normalize V3 (C to D)",
    )

    concat_list.write_text(
        "\n".join(f"file '{p.as_posix()}'" for p in (v1, v2, v3)) + "\n",
        encoding="utf-8",
    )
    run(
        ff("-f", "concat", "-safe", "0", "-i", str(concat_list), "-c", "copy", str(master)),
        "Concat master",
    )
    shutil.copy2(master, OUT_VIDEO)

    acts = [
        ("act0", v1, "B to A pull back"),
        ("act1", v2, "A to C dive"),
        ("act2", v3, "C to D underworld"),
    ]

    manifest_acts: dict[str, list[str]] = {}
    frame_counts: dict[str, int] = {}

    for act_key, clip, _label in acts:
        out_dir = FRAMES_ROOT / act_key
        if out_dir.exists():
            for f in out_dir.glob("*.webp"):
                f.unlink()
        out_dir.mkdir(parents=True, exist_ok=True)
        pattern = str(out_dir / "frame_%05d.webp")

        run(
            ff(
                "-i", str(clip),
                "-vf", f"fps={FPS},scale={SCALE}",
                "-c:v", "libwebp",
                "-quality", str(WEBP_Q),
                "-f", "image2",
                pattern,
            ),
            f"Export WebP {act_key}",
        )

        frames = sorted(out_dir.glob("frame_*.webp"))
        frame_counts[act_key] = len(frames)
        urls = [f"assets/frames/cinema/{act_key}/{f.name}" for f in frames]
        manifest_acts[act_key] = urls

        act_manifest = {
            "act": act_key,
            "source": clip.name,
            "fps": FPS,
            "frameCount": len(frames),
            "frames": [{"file": f.name, "url": u} for f, u in zip(frames, urls)],
        }
        (out_dir / "manifest.json").write_text(json.dumps(act_manifest, indent=2), encoding="utf-8")
        print(f"  {act_key}: {len(frames)} frames")

    summary = {
        "master": str(OUT_VIDEO.relative_to(ROOT)),
        "fps": FPS,
        "v2TrimSec": V2_TRIM_SEC,
        "sources": {
            "v1": V1.name,
            "v2": V2.name,
            "v3": V3.name,
        },
        "frameCounts": frame_counts,
        "totalFrames": sum(frame_counts.values()),
        "durationSec": round(sum(frame_counts.values()) / FPS, 2),
    }
    (FRAMES_ROOT / "cinema-summary.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")

    patch_cdn_manifest(manifest_acts)
    print("\nDone.")
    print(json.dumps(summary, indent=2))


def load_cdn_manifest(path: Path) -> dict:
    text = path.read_text(encoding="utf-8")
    start = text.index("{")
    end = text.rindex("}") + 1
    raw = text[start:end]
    raw = re.sub(r"\btrue\b", "True", raw)
    raw = re.sub(r"\bfalse\b", "False", raw)
    raw = re.sub(r"\bnull\b", "None", raw)
    return eval(raw)  # noqa: S307 — repo-owned manifest file


def patch_cdn_manifest(acts: dict[str, list[str]]) -> None:
    """Replace act0–act2 URLs in cdn-manifest.js with local frame paths."""
    manifest_path = ROOT / "assets" / "js" / "cdn-manifest.js"
    data = load_cdn_manifest(manifest_path)

    for key, urls in acts.items():
        data["acts"][key] = urls

    data["heroIdle"] = {
        "still": "assets/images/still-B-surface-4k.png",
        "mode": "still",
        "note": "Static B poster at rest. Scroll drives WebP cinema (anime B-A-C-D).",
    }

    out = (
        "/* Auto-generated cinema — run: python scripts/stitch-cinema-anime.py */\n"
        f"window.DWF_CDN = {json.dumps(data, indent=2)};\n"
    )
    manifest_path.write_text(out, encoding="utf-8")
    print(f"Patched {manifest_path}")


if __name__ == "__main__":
    main()
