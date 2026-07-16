# DW Funnel showcase reel, shot list + posting kit

**File:** `marketing/reels/dwfunnel-showcase-reel.mp4`
**Poster:** `marketing/reels/dwfunnel-showcase-poster.jpg`
**Format:** 1080x1920 (9:16), 30fps, 36.2s, H.264 + silent AAC track
**Built by:** `scripts/build-showcase-reel.py` (rerun any time to regenerate after the grid changes)

Goal of this cut: stop the scroll with a real pain point, prove range and quality fast with the Studio Bench work, back it with the site's own tracked numbers, then push straight into a low friction lead capture (DM or bio link), not a generic "visit our website."

## Shot list (source of every clip is already shipped in this repo, nothing was invented)

| # | Time | Visual source | On screen text |
|---|------|----------------|-----------------|
| 1 | 0:00 to 0:02.0 | Hero cinematic frames (`assets/frames/cinema/act0`) | TRAFFIC GETS THERE. |
| 2 | 0:02.0 to 0:04.0 | Hero cinematic frames, red tint | THE PAGE LOSES IT. |
| 3 | 0:04.0 to 0:07.6 | LionTech demo preview, darkened | VAGUE OFFER. / PROOF TOO LATE. / UNCLEAR NEXT STEP. |
| 4 | 0:07.6 to 0:08.6 | Hero frame, held + slow zoom | SO WE BUILD IT DIFFERENTLY. |
| 5 to 15 | 0:08.6 to 0:24.0 | 11 Studio Bench preview clips (AUREN, Harbour Smile, Aurelia, Kane Voss, Sable Yacht Club, Reverie, Autonex, Valence, Lumenix, TOYBOMB, Tarismo) | 28 BRANDS. ONE STUDIO. + brand/category per clip |
| 16 | 0:24.0 to 0:28.0 | Proof of Work frame sequence (`assets/frames/sections/proof`) | $2.4M tracked pipeline / 38% lift in booked calls / 21 days brief to first call |
| 17 | 0:28.0 to 0:31.2 | Hero frame, darkened + zoom | "38 booked calls in the first 30 days." Cindy Fox, Book Author |
| 18 | 0:31.2 to 0:35.8 | Hero frame, darkened, fade to black | DW FUNNEL / Apply for a build window. / DM "BUILD" or tap the link in bio |

Every stat, quote, and section headline reuses copy that is already live on `cinema.html` (`Conversion Leak`, `Proof Of Work`, `Client Logs`, hero stat strip). Nothing new was fabricated for the reel.

## Suggested voiceover (optional, captions already carry the reel on their own)

> Traffic gets there. The page loses it. Vague offer, proof too late, unclear next step, that is the leak. So we build it differently. Twenty eight brands, one studio. Two point four million tracked in pipeline. Thirty eight percent more booked calls. Twenty one days, brief to first call. One client told us thirty eight booked calls in the first thirty days. If your page is bleeding traffic, apply for a build window. DM the word build, or tap the link in bio.

## Post caption (Instagram Reels / TikTok / YouTube Shorts)

```
Your ads are working. Your page is the leak.

28 brands. One studio. Real tracked numbers: $2.4M in pipeline, 38% more booked calls, 21 days from brief to first call.

If your landing page looks fine but books nothing, that is fixable.

DM "BUILD" and we will tell you exactly where your page is losing people, free.

#landingpagedesign #webdesign #conversionrateoptimization #funnelbuilder #smallbusinessmarketing #websitedesign #cro #leadgeneration #digitalmarketing #dwfunnel
```

Short alt version for a tighter caption:

```
28 brands. One studio. $2.4M tracked pipeline. 38% more booked calls.

Your page is either making you money or quietly losing it. DM "BUILD" and find out which.
```

## Posting notes

- **Audio:** the export is intentionally silent (a mute AAC track is included only so every platform accepts the file). Add a trending sound inside Instagram/TikTok/CapCut before publishing, this reel is captioned so it reads with sound off, but native trending audio meaningfully helps reach. Pick something moody/tech for the first 8s, then a beat drop right as the Studio Bench montage starts at 0:08.6, that lines up with the hard cuts.
- **Hook retention:** the first 2 seconds carry zero brand name, just the pain line, on purpose. Do not add an intro logo sting before it.
- **CTA mechanics:** "DM BUILD" is the primary conversion path (keeps people in platform, higher reply rate than a bio link tap, and gives Danny a qualified opener to move into the WhatsApp build request flow). Set up an IG/TikTok auto reply or saved reply for the word "BUILD" that sends the WhatsApp link (`https://wa.me/60189621022`) or the `/#apply` build request form.
- **Pin a comment** with the same "DM BUILD" instruction right after posting, first comment gets more visibility than the caption on some feeds.
- **Cross post** the same file to Reels, TikTok, and Shorts as is, 9:16 at 1080x1920 meets all three platforms' specs natively.
- **Cover frame:** use `dwfunnel-showcase-poster.jpg` (grabbed at 1.5s, mid hook) as the custom cover/thumbnail on platforms that allow one, it reads clearly even as a static thumbnail.

## Regenerating this reel

The whole thing is built from assets already in the repo (hero + proof frame sequences, `assets/demos/previews/*.mp4`), no live browser capture needed:

```
python scripts/build-showcase-reel.py
```

Swap which cards appear in the montage by editing the `montage` list in that script; add a new Studio Bench card's preview key/brand/category and it drops right in.
