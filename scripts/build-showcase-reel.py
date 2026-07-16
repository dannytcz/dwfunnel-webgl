#!/usr/bin/env python3
"""
DW Funnel, vertical showcase reel builder.

Assembles a 1080x1920 (9:16) lead gen reel entirely from assets already
shipped in this repo: the cinema.html hero frame sequence, the Proof Of
Work frame sequence, and the Studio Bench preview clips in
assets/demos/previews/. No live browser capture needed, everything is
pre rendered.

Output:
  marketing/reels/dwfunnel-showcase-reel.mp4   (final vertical reel, ~40s)
  marketing/reels/dwfunnel-showcase-poster.jpg (thumbnail, frame at 1.5s)

Prereqs: ffmpeg on PATH, Python 3, fonttools (for the one time woff2 to
ttf font conversion, see FONT_DIR below).

Run from the project root:
  python scripts/build-showcase-reel.py
"""
import json
import os
import subprocess
import sys
import shutil

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TMP = os.path.join(os.environ.get("TEMP", r"C:\Windows\Temp"), "dwf-reel")
SEG_DIR = os.path.join(TMP, "seg")
TXT_DIR = os.path.join(TMP, "txt")
FONT_DIR = os.path.join(TMP, "fonts")
OUT_DIR = os.path.join(ROOT, "marketing", "reels")

W, H = 1080, 1920
FPS = 30

FONT_HEAD = os.path.join(FONT_DIR, "space-grotesk-700.ttf")
FONT_HEAD_MED = os.path.join(FONT_DIR, "space-grotesk-500.ttf")
FONT_MONO = os.path.join(FONT_DIR, "space-mono-700.ttf")
FONT_MONO_REG = os.path.join(FONT_DIR, "space-mono-400.ttf")

INK = "0xe6ded2"
RED = "0xf04a2a"
GOLD = "0xf2a84a"

FRAMES_ACT0 = os.path.join(ROOT, "assets", "frames", "cinema", "act0")
FRAMES_PROOF = os.path.join(ROOT, "assets", "frames", "sections", "proof")
PREVIEWS = os.path.join(ROOT, "assets", "demos", "previews")

COVER_CROP = f"scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H}"


def sh(args, cwd=None):
    proc = subprocess.run(args, cwd=cwd, capture_output=True, text=True)
    if proc.returncode != 0:
        print("CMD:", " ".join(args))
        print(proc.stdout[-4000:])
        print(proc.stderr[-4000:])
        raise SystemExit(f"ffmpeg failed (exit {proc.returncode})")
    return proc


def write_text(name, text):
    os.makedirs(TXT_DIR, exist_ok=True)
    p = os.path.join(TXT_DIR, name)
    with open(p, "w", encoding="utf-8") as f:
        f.write(text)
    return os.path.relpath(p, TMP).replace("\\", "/")


def rel(p):
    return os.path.relpath(p, TMP).replace("\\", "/")


class Caption:
    """One drawtext layer, timed with enable=between(t,start,end)."""

    def __init__(self, text, font=FONT_HEAD, size=64, color=INK, y="h*0.74",
                 x="(w-text_w)/2", start=0.0, end=999, box=True,
                 boxcolor="black@0.46", boxborderw=26, alpha_in=0.18, key=None):
        self.text = text
        self.font = font
        self.size = size
        self.color = color
        self.y = y
        self.x = x
        self.start = start
        self.end = end
        self.box = box
        self.boxcolor = boxcolor
        self.boxborderw = boxborderw
        self.alpha_in = alpha_in
        self.key = key or text

    def filter(self, idx):
        fname = f"cap_{idx}_{abs(hash(self.key)) % 100000}.txt"
        tf = write_text(fname, self.text)
        fontfile = rel(self.font)
        box = f":box=1:boxcolor={self.boxcolor}:boxborderw={self.boxborderw}" if self.box else ""
        # fade the caption's alpha in over alpha_in seconds after `start`
        alpha = (f"if(lt(t,{self.start}),0,"
                 f"if(lt(t,{self.start + self.alpha_in}),(t-{self.start})/{self.alpha_in},1))")
        return (f"drawtext=fontfile='{fontfile}':textfile='{tf}':fontsize={self.size}:"
                f"fontcolor={self.color}:alpha='{alpha}':x={self.x}:y={self.y}"
                f"{box}:enable='between(t,{self.start},{self.end})'")


def render_frames(name, frame_dir, start_frame, count, dur, captions,
                   still=False, eq=None, flash=0.0, fade_in=0.0, fade_out=0.0,
                   zoom=False):
    """Render a segment from a numbered webp frame sequence (or a single held still)."""
    out = os.path.join(SEG_DIR, name + ".mp4")
    args = ["ffmpeg", "-y", "-loglevel", "error"]
    if still:
        args += ["-loop", "1", "-i", os.path.join(frame_dir, f"frame_{start_frame:05d}.webp"), "-t", str(dur)]
    else:
        fps_in = max(1, round(count / dur))
        args += ["-start_number", str(start_frame), "-framerate", str(fps_in),
                  "-i", os.path.join(frame_dir, "frame_%05d.webp"), "-frames:v", str(count), "-t", str(dur)]

    vf = [COVER_CROP]
    if zoom:
        vf.append(f"zoompan=z='min(zoom+0.0012,1.12)':d={int(dur*FPS)}:s={W}x{H}:fps={FPS}")
    if eq:
        vf.append(eq)
    if flash > 0:
        vf.append(f"fade=t=in:st=0:d={flash}:color=white")
    if fade_in > 0:
        vf.append(f"fade=t=in:st=0:d={fade_in}:color=black")
    if fade_out > 0:
        vf.append(f"fade=t=out:st={dur - fade_out}:d={fade_out}:color=black")
    for i, cap in enumerate(captions):
        vf.append(cap.filter(i))
    vf_str = ",".join(vf)

    args += ["-vf", vf_str, "-r", str(FPS), "-an", "-c:v", "libx264", "-crf", "18",
             "-preset", "medium", "-pix_fmt", "yuv420p", out]
    sh(args, cwd=TMP)
    print("  seg:", name, dur, "s")
    return out


def render_video(name, src_key, trim_start, dur, captions, eq=None, flash=0.0):
    """Render a segment from an existing Studio Bench preview mp4, cover cropped
    to fill the vertical frame (same zoom + center crop model the site's own
    grid previews use, keeps fast cut montages clean instead of a blurry
    double exposure letterbox)."""
    src = os.path.join(PREVIEWS, f"{src_key}.mp4")
    out = os.path.join(SEG_DIR, name + ".mp4")
    args = ["ffmpeg", "-y", "-loglevel", "error", "-ss", str(trim_start), "-t", str(dur), "-i", src]

    chain = f"[0:v]{COVER_CROP}[base]"
    last = "[base]"

    steps = [chain]
    node = last
    if eq:
        steps.append(f"{node}eq={eq}[eqd]")
        node = "[eqd]"
    for i, cap in enumerate(captions):
        nxt = f"[c{i}]"
        steps.append(f"{node}{cap.filter(i)}{nxt}")
        node = nxt
    if flash > 0:
        nxt = "[fl]"
        steps.append(f"{node}fade=t=in:st=0:d={flash}:color=white{nxt}")
        node = nxt

    filter_complex = ";".join(steps)
    args += ["-filter_complex", filter_complex, "-map", node, "-r", str(FPS),
             "-an", "-c:v", "libx264", "-crf", "18", "-preset", "medium",
             "-pix_fmt", "yuv420p", out]
    sh(args, cwd=TMP)
    print("  seg:", name, dur, "s")
    return out


def main():
    if os.path.isdir(SEG_DIR):
        shutil.rmtree(SEG_DIR)
    os.makedirs(SEG_DIR, exist_ok=True)
    os.makedirs(OUT_DIR, exist_ok=True)

    for f in [FONT_HEAD, FONT_HEAD_MED, FONT_MONO, FONT_MONO_REG]:
        if not os.path.isfile(f):
            sys.exit(f"Missing converted font: {f}\nSee docs/HANDOVER-CURSOR.md build notes, "
                     f"convert the woff2 fonts with fonttools first.")

    segs = []

    # 1) Hook part 1: "Traffic gets there."
    segs.append(render_frames(
        "01_hook1", FRAMES_ACT0, 1, 60, 2.0,
        [Caption("TRAFFIC GETS THERE.", font=FONT_HEAD, size=72, color=INK,
                  y="h*0.76", start=0.15, end=2.0)],
        fade_in=0.25,
    ))

    # 2) Hook part 2: "The page loses it."
    segs.append(render_frames(
        "02_hook2", FRAMES_ACT0, 61, 60, 2.0,
        [Caption("THE PAGE LOSES IT.", font=FONT_HEAD, size=76, color=RED,
                  y="h*0.76", start=0.0, end=2.0, alpha_in=0.05)],
        eq="eq=saturation=0.9:brightness=-0.03", flash=0.08,
    ))

    # 3) Problem breakdown, three leaks (matches the live Conversion Leak copy)
    segs.append(render_video(
        "03_problem", "liontech", 0.2, 3.6,
        [
            Caption("VAGUE OFFER.", font=FONT_MONO, size=58, color=INK,
                    y="h*0.5", start=0.0, end=1.2),
            Caption("PROOF TOO LATE.", font=FONT_MONO, size=58, color=INK,
                    y="h*0.5", start=1.2, end=2.4),
            Caption("UNCLEAR NEXT STEP.", font=FONT_MONO, size=58, color=INK,
                    y="h*0.5", start=2.4, end=3.6),
            Caption("WHY MOST PAGES LEAK CLIENTS", font=FONT_MONO_REG, size=32,
                    color="0x9d9388", y="h*0.5-110", start=0.0, end=3.6,
                    box=True, boxcolor="black@0.35", alpha_in=0.3),
        ],
        eq="saturation=0.4:brightness=-0.22", flash=0.08,
    ))

    # 4) Turn: still hold + slow zoom
    segs.append(render_frames(
        "04_turn", FRAMES_ACT0, 1, 30, 1.0,
        [Caption("SO WE BUILD IT DIFFERENTLY.", font=FONT_HEAD, size=58, color=INK,
                  y="h*0.76", start=0.0, end=1.0, alpha_in=0.05)],
        still=True, zoom=True, flash=0.08,
    ))

    # 5) Studio Bench montage, one clip per brand
    montage = [
        ("auren", "AUREN", "Haute Horlogerie"),
        ("harbour", "HARBOUR SMILE", "Cosmetic Dentistry"),
        ("aurelia", "AURELIA", "Luxury Real Estate"),
        ("kanevoss", "KANE VOSS", "Discipline Coaching"),
        ("sable", "SABLE YACHT CLUB", "Luxury Lifestyle"),
        ("reverie", "REVERIE", "Immersive Storyworld"),
        ("autonex", "AUTONEX", "Industrial Automation"),
        ("valence", "VALENCE", "AI Automation Agency"),
        ("lumenix", "LUMENIX", "3D Motion Studio"),
        ("toybomb", "TOYBOMB", "Designer Collectibles"),
        ("tarismo", "TARISMO", "Transport"),
    ]
    for i, (key, brand, cat) in enumerate(montage, start=5):
        segs.append(render_video(
            f"{i:02d}_work_{key}", key, 0.5, 1.4,
            [
                Caption("28 BRANDS. ONE STUDIO.", font=FONT_MONO_REG, size=30, color="0xe6ded2",
                        y="h*0.09", start=0.0, end=1.4, box=True, boxcolor="black@0.4", alpha_in=0.05),
                Caption(brand, font=FONT_HEAD, size=46, color=INK, x="w*0.08",
                        y="h*0.84", start=0.0, end=1.4, box=True, boxcolor="black@0.55"),
                Caption(cat, font=FONT_MONO_REG, size=28, color=GOLD, x="w*0.08",
                        y="h*0.895", start=0.05, end=1.4, box=True, boxcolor="black@0.55"),
            ],
            eq="saturation=1.05:brightness=-0.02",
        ))

    # 6) Proof of work stats
    segs.append(render_frames(
        "17_stats", FRAMES_PROOF, 1, 120, 4.0,
        [
            Caption("PROOF OF WORK", font=FONT_MONO_REG, size=32, color="0x9d9388",
                    y="h*0.14", start=0.0, end=4.0, box=False, alpha_in=0.2),
            Caption("$2.4M  TRACKED PIPELINE", font=FONT_HEAD, size=54, color=INK,
                    y="h*0.5", start=0.0, end=1.4),
            Caption("38%  LIFT IN BOOKED CALLS", font=FONT_HEAD, size=54, color=GOLD,
                    y="h*0.5", start=1.4, end=2.7),
            Caption("21 DAYS  BRIEF TO FIRST CALL", font=FONT_HEAD, size=50, color=INK,
                    y="h*0.5", start=2.7, end=4.0),
        ],
    ))

    # 7) Testimonial flash
    segs.append(render_frames(
        "18_testimonial", FRAMES_ACT0, 90, 30, 3.2,
        [
            Caption('"38 BOOKED CALLS IN THE', font=FONT_HEAD_MED, size=46, color=INK,
                    y="h*0.46", start=0.0, end=3.2),
            Caption('FIRST 30 DAYS."', font=FONT_HEAD_MED, size=46, color=INK,
                    y="h*0.53", start=0.0, end=3.2),
            Caption("CINDY FOX, BOOK AUTHOR", font=FONT_MONO_REG, size=30, color=GOLD,
                    y="h*0.62", start=0.4, end=3.2, box=False),
        ],
        still=True, eq="eq=brightness=-0.30:saturation=0.7", zoom=True, flash=0.08,
    ))

    # 8) CTA end card
    segs.append(render_frames(
        "19_cta", FRAMES_ACT0, 120, 30, 4.6,
        [
            Caption("DW FUNNEL", font=FONT_HEAD, size=84, color=INK, y="h*0.40",
                    start=0.0, end=4.6, box=False),
            Caption("CINEMATIC PAGES. SALES ENGINE WIRED IN.", font=FONT_MONO_REG, size=30,
                    color="0x9d9388", y="h*0.47", start=0.2, end=4.6, box=False),
            Caption("APPLY FOR A BUILD WINDOW.", font=FONT_HEAD, size=48, color=GOLD,
                    y="h*0.58", start=0.6, end=4.6),
            Caption("DM \"BUILD\" OR TAP THE LINK IN BIO", font=FONT_MONO_REG, size=30,
                    color=INK, y="h*0.66", start=1.0, end=4.6, box=False),
        ],
        still=True, eq="eq=brightness=-0.45:saturation=0.65", fade_out=0.6,
    ))

    # concat
    listfile = os.path.join(TMP, "concat.txt")
    with open(listfile, "w", encoding="utf-8") as f:
        for s in segs:
            f.write(f"file '{s.replace(os.sep, '/')}'\n")

    final = os.path.join(OUT_DIR, "dwfunnel-showcase-reel.mp4")
    sh(["ffmpeg", "-y", "-loglevel", "error",
        "-f", "concat", "-safe", "0", "-i", listfile,
        "-f", "lavfi", "-i", "anullsrc=r=44100:cl=stereo",
        "-c:v", "libx264", "-crf", "18", "-preset", "medium", "-pix_fmt", "yuv420p",
        "-shortest", "-c:a", "aac", "-b:a", "64k", final])

    poster = os.path.join(OUT_DIR, "dwfunnel-showcase-poster.jpg")
    sh(["ffmpeg", "-y", "-loglevel", "error", "-ss", "1.5", "-i", final,
        "-frames:v", "1", poster])

    dur_p = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                             "-of", "csv=p=0", final], capture_output=True, text=True)
    print("\nDONE ->", final)
    print("duration:", dur_p.stdout.strip())


if __name__ == "__main__":
    main()
