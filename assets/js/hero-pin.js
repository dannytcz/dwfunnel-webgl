const HERO_PIN_VH = 240;
const HERO_SCRUB = 0.2;
const START_FRAME = 0;

// Founder hero beat map (fractions of pin progress). The giant name owns the
// first half; at the midpoint it swaps to the headline, which holds to the end.
// Daphne (the scrub) never fades — no resolve/grid overlay covers her.
const NAME_HOLD_END = 0.48;
const NAME_OUT_END = 0.50;
const LINE1_IN = [0.52, 0.62];
const LINE2_IN = [0.62, 0.72];
const SUB_IN = [0.72, 0.79];
const ACTIONS_IN = [0.80, 0.88];
const COPY_EXIT = [1.01, 1.02];
const RESOLVE_START = 2;
const GRID_START = 2;

function band(p, [a, b]) {
  const t = Math.max(0, Math.min(1, (p - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

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
  const eyebrow = document.querySelector(".hero__copy .eyebrow");
  const line1 = document.getElementById("hero-line1");
  const line2 = document.getElementById("hero-line2");
  const sub = document.getElementById("hero-sub");
  const actions = document.getElementById("hero-actions");
  const title = document.getElementById("hero-title");
  const frameCount = scrubber.urls.length;

  if (title) title.style.opacity = "1";
  [eyebrow, line1, line2].forEach((el) => {
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

      if (name) {
        const out = p <= NAME_HOLD_END ? 0 : band(p, [NAME_HOLD_END, NAME_OUT_END]);
        if (p > 0.015) name.style.opacity = String(1 - out);
        name.style.transform = `scale(${1 - 0.06 * out})`;
      }

      const setIn = (el, bd) => {
        if (!el) return;
        const t = band(p, bd);
        el.style.opacity = String(t);
        el.style.transform = `translateY(${26 * (1 - t)}px)`;
      };
      setIn(eyebrow, LINE1_IN);
      setIn(line1, LINE1_IN);
      setIn(line2, LINE2_IN);
      setIn(sub, SUB_IN);
      setIn(actions, ACTIONS_IN);

      const leave = band(p, [0.90, 1.0]);
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

  scrubber.resumeTicker?.();

  window.__heroPinST = st;
  return st;
}
