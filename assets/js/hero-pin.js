const HERO_PIN_VH = 240;
const HERO_SCRUB = 0.2;
const START_FRAME = 0;

// Founder hero beat map (fractions of pin progress). The giant name owns the
// first half; at the midpoint it swaps to the headline, which holds to the end.
// Daphne (the scrub) never fades — no resolve/grid overlay covers her.
const NAME_HOLD_END = 0.48; // giant name owns the first half
const NAME_OUT_END = 0.56; // name recedes as the headline arrives at midpoint
const LINE1_IN = [0.5, 0.6];
const LINE2_IN = [0.6, 0.7];
const SUB_IN = [0.72, 0.8];
const ACTIONS_IN = [0.78, 0.86];
const COPY_EXIT = [1.01, 1.02]; // effectively none: headline holds until the pin releases
const RESOLVE_START = 2; // disabled: never dim the founder film
const GRID_START = 2; // disabled

// Progress of p through the band [a, b], clamped 0..1, eased.
function band(p, [a, b]) {
  const t = Math.max(0, Math.min(1, (p - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

// Distribute the visible frame range evenly across the full pin (0->1).
function segmentToHeroFrame(local, frameCount) {
  const p = Math.max(0, Math.min(1, local));
  const endFrame = frameCount - 1;
  return START_FRAME + Math.round(p * (endFrame - START_FRAME));
}

export function initHeroPin({ scrubber, reducedMotion }) {
  const pin = document.getElementById("hero-pin");
  const canvas = document.getElementById("scrub-canvas");
  const poster = document.getElementById("hero-poster");
  const hint = document.getElementById("scroll-hint");
  const copy = document.querySelector(".hero__copy");
  const stage = document.querySelector(".hero__stage");
  const resolve = document.getElementById("hero-resolve");
  const grid = document.getElementById("hero-grid");
  const name = document.getElementById("hero-name");
  const line1 = document.getElementById("hero-line1");
  const line2 = document.getElementById("hero-line2");
  const sub = document.getElementById("hero-sub");
  const actions = document.getElementById("hero-actions");
  const title = document.getElementById("hero-title");
  const frameCount = scrubber.urls.length;

  // Scroll-controlled elements start hidden; the beat map reveals them.
  if (title) title.style.opacity = "1";
  [line1, line2].forEach((el) => {
    if (el) {
      el.style.opacity = "0";
      el.style.transform = "translateY(26px)";
    }
  });

  canvas?.classList.add("is-active");

  scrubber.setTargetFrame(START_FRAME);
  scrubber.setFx({ scale: 1, offsetY: 0, offsetX: 0 });
  scrubber.renderNow?.();
  console.info(
    `[hero] frame mapping — start ${START_FRAME}, end ${frameCount - 1}, ${frameCount} frames, pin ${HERO_PIN_VH}% (linear even across 0->1)`
  );

  const st = window.ScrollTrigger.create({
    trigger: pin,
    start: "top top",
    end: `+=${HERO_PIN_VH}%`,
    pin: true,
    scrub: reducedMotion ? false : HERO_SCRUB,
    anticipatePin: 1,
    onToggle: (self) => {
      if (self.isActive) {
        if (scrubber._released) {
          scrubber.reload().then(() => scrubber.resumeTicker());
        } else {
          scrubber.resumeTicker();
        }
      } else {
        scrubber.pauseTicker();
      }
    },
    onUpdate: (self) => {
      const p = self.progress;
      const frame = segmentToHeroFrame(p, frameCount);
      scrubber.setTargetFrame(frame);
      scrubber.setFx({ scale: 1 + p * 0.06, offsetY: -p * 18, offsetX: 0 });
      poster?.classList.toggle("is-hidden", p > 0.02);
      if (hint) hint.style.opacity = String(p < 0.05 ? 1 : Math.max(0, 1 - p / 0.08));

      // Beat 1: giant name holds, then recedes as the headline arrives.
      if (name) {
        const out = p <= NAME_HOLD_END ? 0 : band(p, [NAME_HOLD_END, NAME_OUT_END]);
        // Before the pin moves, the loader intro owns the name reveal.
        if (p > 0.015) name.style.opacity = String(1 - out);
        name.style.transform = `scale(${1 - 0.06 * out})`;
      }

      // Beats 2 to 4: headline lines, sub, and actions enter on their marks.
      const setIn = (el, bd) => {
        if (!el) return;
        const t = band(p, bd);
        el.style.opacity = String(t);
        el.style.transform = `translateY(${26 * (1 - t)}px)`;
      };
      setIn(line1, LINE1_IN);
      setIn(line2, LINE2_IN);
      setIn(sub, SUB_IN);
      setIn(actions, ACTIONS_IN);

      // Tail: dissolve the whole scene out so the trust strip lands softly.
      const leave = band(p, [0.84, 1.0]);
      if (stage) stage.style.opacity = String(1 - leave);
      if (copy) {
        const eased = Math.max(band(p, COPY_EXIT), leave);
        copy.style.opacity = String(1 - eased);
        copy.style.transform = `translateY(${-40 * eased}px)`;
      }

      if (resolve) {
        const re = p > RESOLVE_START ? (p - RESOLVE_START) / (1 - RESOLVE_START) : 0;
        resolve.style.opacity = String(re);
      }

      // Phase 2: the painting dissolves into the grid, landing exactly with resolve.
      if (grid) {
        const ge = p > GRID_START ? (p - GRID_START) / (1 - GRID_START) : 0;
        grid.style.opacity = String(ge);
      }

      if (p <= 0.015) {
        scrubber.setTargetFrame(START_FRAME);
        scrubber.setFx({ scale: 1, offsetY: 0, offsetX: 0 });
      }
    },
  });

  // Hero is active at the top on load: start its draw ticker now.
  scrubber.resumeTicker?.();

  window.__heroPinST = st;
  return st;
}
