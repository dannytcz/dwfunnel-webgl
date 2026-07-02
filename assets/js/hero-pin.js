import { easeSegment } from "./scroll-timeline.js";

const HERO_PIN_VH = 300;
const HOLD_SHARE = 0.12;

function segmentToHeroFrame(local, frameCount) {
  let dive = local;
  if (local <= HOLD_SHARE) return 0;
  dive = (local - HOLD_SHARE) / (1 - HOLD_SHARE);
  const t = easeSegment(dive, "dive");
  return Math.round(t * (frameCount - 1));
}

export function initHeroPin({ scrubber, reducedMotion }) {
  const pin = document.getElementById("hero-pin");
  const canvas = document.getElementById("scrub-canvas");
  const poster = document.getElementById("hero-poster");
  const hint = document.getElementById("scroll-hint");
  const frameCount = scrubber.urls.length;

  canvas?.classList.add("is-active");

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
      scrubber.prewarm([frame - 1, frame, frame + 1]);
      scrubber.draw(frame, { scale: 1 + p * 0.06, offsetY: -p * 18 });
      poster?.classList.toggle("is-hidden", p > 0.02);
      if (hint) hint.style.opacity = String(p < 0.05 ? 1 : Math.max(0, 1 - p / 0.08));
      if (p <= 0.015) scrubber.draw(0, { scale: 1, offsetY: 0 });
    },
  });

  window.__heroPinST = st;
  scrubber.draw(0, { scale: 1, offsetY: 0 });
}
