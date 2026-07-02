import { easeSegment } from "./scroll-timeline.js?v=31";

const HERO_PIN_VH = 300;
const HOLD_SHARE = 0.12;
// First frame where the scene is clearly visible. act0 frame 0 is the open sky
// and is already visible, so scroll position zero starts here.
const START_FRAME = 0;

// Choreography windows inside the pin timeline
const TEXT_EXIT_START = 0.8; // final 20%: text block resolves out
const RESOLVE_START = 0.9; // final 10%: overlay ramps to page background

function segmentToHeroFrame(local, frameCount) {
  if (local <= HOLD_SHARE) return START_FRAME;
  const dive = (local - HOLD_SHARE) / (1 - HOLD_SHARE);
  const t = easeSegment(dive, "dive");
  return START_FRAME + Math.round(t * (frameCount - 1 - START_FRAME));
}

export function initHeroPin({ scrubber, reducedMotion }) {
  const pin = document.getElementById("hero-pin");
  const canvas = document.getElementById("scrub-canvas");
  const poster = document.getElementById("hero-poster");
  const hint = document.getElementById("scroll-hint");
  const copy = document.querySelector(".hero__copy");
  const resolve = document.getElementById("hero-resolve");
  const frameCount = scrubber.urls.length;

  canvas?.classList.add("is-active");

  // CHANGE 3: draw the first visible frame immediately, before any scroll.
  scrubber.setTargetFrame(START_FRAME);
  scrubber.setFx({ scale: 1, offsetY: 0, offsetX: 0 });
  scrubber.renderNow?.();
  console.info(`[hero] scene start frame index: ${START_FRAME}`);

  const st = window.ScrollTrigger.create({
    trigger: pin,
    start: "top top",
    end: `+=${HERO_PIN_VH}%`,
    pin: true,
    scrub: reducedMotion ? false : 0.12,
    anticipatePin: 1,
    onUpdate: (self) => {
      const p = self.progress;
      const frame = segmentToHeroFrame(p, frameCount);
      scrubber.setTargetFrame(frame);
      scrubber.setFx({ scale: 1 + p * 0.06, offsetY: -p * 18, offsetX: 0 });
      poster?.classList.toggle("is-hidden", p > 0.02);
      if (hint) hint.style.opacity = String(p < 0.05 ? 1 : Math.max(0, 1 - p / 0.08));

      // CHANGE 4.1: text block resolves out over the final 20% (power2.in).
      if (copy) {
        const te = p > TEXT_EXIT_START ? (p - TEXT_EXIT_START) / (1 - TEXT_EXIT_START) : 0;
        const eased = te * te;
        copy.style.opacity = String(1 - eased);
        copy.style.transform = `translateY(${-40 * eased}px)`;
      }

      // CHANGE 4.2: overlay ramps to page background over the final 10% (power1.in / linear).
      if (resolve) {
        const re = p > RESOLVE_START ? (p - RESOLVE_START) / (1 - RESOLVE_START) : 0;
        resolve.style.opacity = String(re);
      }

      if (p <= 0.015) {
        scrubber.setTargetFrame(START_FRAME);
        scrubber.setFx({ scale: 1, offsetY: 0, offsetX: 0 });
      }
    },
  });

  window.__heroPinST = st;
}
