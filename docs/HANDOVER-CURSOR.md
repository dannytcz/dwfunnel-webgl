# DW Funnel cinema.html, handover

You are taking over a cinematic landing page for DW Funnel, a funnel design studio led by founder Daphne Wong. The live product is `cinema.html`. Read it plus `assets/js/cinema-app.js`, `assets/js/film-sections.js`, `assets/js/hero-pin.js`, `assets/js/machine-schematic.js`, and `assets/css/cinema.css` before touching anything.

## How to run and deploy
- Local: `python -m http.server 8767` then open `http://127.0.0.1:8767/cinema.html`. Hard refresh after edits.
- Deploy: `npx vercel deploy --prod --yes`. Production is `https://dwfunnel-webgl.vercel.app`.
- Bump the `?v=NN` query on every CSS or JS change (currently v=57), in `cinema.html`, `cinema-app.js`, and the import inside `film-sections.js`. This is the cache buster.
- Verify in a real Chrome window, not just by reading code. The embedded preview throttles animation timing and cannot screenshot.

## What we decided
The page is a founder centric cinematic scroll. Every filmed section is a pinned scroll scrub (a WebP frame sequence drawn on canvas, driven by scroll position) with copy that reveals in beats over the top. The visual world is gold on near black. Founder is Daphne Wong; all clips star an AI generated likeness of her, produced via OpenRouter (Google Nano Banana for stills, Kling v3 Pro for the video, since ByteDance Seedance refuses real faces).

Sections in order: hero (Daphne orbit, giant DW/FUNNEL name that swaps to the headline at half scroll, then fades as it leaves), trust strip, Act 01 Leak, Act 02 Machine (self drawing SVG funnel schematic with a live CALLS BOOKED counter), Act 03 Proof (big numbers strip over her interview clip, testimonials reveal one by one below), Act 04 Method (builder clip of her typing, platforms reveal one by one, six parts and five step timeline in a detail block below), Act 06 Work (the walk into a hero stance, centered mega headline "Ready For A Page That Actually Sells?" then booking CTAs).

## What we abandoned
- The original painterly fantasy pagoda hero. Replaced entirely.
- A gold gate/arch still hero (the Deconstruction concept). Rejected: scrubbing slow AI drift is boring.
- Scroll scrubbed video as pure ambient backdrop. Rejected: it read as wallpaper.
- Rotating slot copy, where testimonials and steps swapped in place over the film. Rejected as clunky (swapped too fast, cramped). Now: short iconic copy stays over the film, long form content lives in full width detail sections below each pin.
- Act 05 "Where It Lives" as a standalone section. Merged: platforms now reveal over the builder clip.
- Load posters. Removed; frames preload a viewport ahead instead.

## Architecture notes
- `film-sections.js` is the reusable pinned scrub module. Each `.film-pin` has `data-film-frames` (key), `data-film-count` (frame count), `data-film-vh` (pin length), optional `data-film-decode` (decode width). Frames live in `assets/frames/sections/<key>/`. They decode once when the section approaches and are kept (do not reintroduce release on leave; it caused incomplete scrubs). Beats are `.film-beat` elements with `data-beat-in="a,b"` and optional `data-beat-out="a,b"` as fractions of pin progress.
- Hero uses `hero-pin.js` and `frame-scrub.js`, frames in `assets/frames/cinema/act0/`.
- Do not put SVG filters on ancestors of animated stroke paths (past main thread freeze). Keep loops fixed count.
- Copy is locked brand copy. Do not change wording without the founder Danny approving. No dashes or em dashes anywhere, including comments.

## The open problem
Danny still feels the page is clunky. The likely culprits: the beat timing of copy over the scrubs still feels off in rhythm, the transitions between pinned sections may be abrupt, and the overall pacing has a lot of pins back to back. Focus a design pass on scroll rhythm and transitions, not on adding features.

## Remaining work
Real content is still placeholder: client logos, testimonials, stats, Daphne's portrait, the cal.com embed, the WhatsApp number (search `[PLACEHOLDER]`). Hero frames still served from Vercel static, not the GHL CDN. A parked "dive into the machine" Seedance concept for Act 02 was never built.
