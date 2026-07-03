const HERO_PIN_VH = 260;
const START_FRAME = 0;

// Choreography windows inside the pin timeline
const TEXT_EXIT_START = 0.8; // final 20%: text block resolves out
const RESOLVE_START = 0.85; // final 15%: overlay ramps to page background
const GRID_START = 0.9; // Phase 2: final 10%: blueprint grid dissolves in with resolve

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
  const resolve = document.getElementById("hero-resolve");
  const grid = document.getElementById("hero-grid");
  const frameCount = scrubber.urls.length;

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
    scrub: reducedMotion ? false : 0.12,
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

      if (copy) {
        const te = p > TEXT_EXIT_START ? (p - TEXT_EXIT_START) / (1 - TEXT_EXIT_START) : 0;
        const eased = te * te;
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
