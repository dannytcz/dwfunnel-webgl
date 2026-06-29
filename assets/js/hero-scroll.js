import { FrameScrubber, mapScrollToFrame, scrollFx } from "./frame-scrub.js";

const BUILD_TAG = "scroll-video-v1";
const SCROLL_PIN = "+=280%";

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const preloader = document.getElementById("preloader");
const fill = preloader?.querySelector(".preloader__fill");
const pct = preloader?.querySelector(".preloader__pct");
const heroSection = document.getElementById("hero-scrub");
const canvas = document.getElementById("scrub-canvas");
const stars = document.getElementById("scrub-stars");
const vignette = document.getElementById("scrub-vignette");
const heroCopy = document.querySelector(".hero-copy");
const scrollHint = document.getElementById("scroll-hint");
const heroHud = document.getElementById("hero-hud");
const buildEl = document.getElementById("hero-build");

const CDN = window.DWF_CDN;
const frameUrls = CDN?.acts?.act0 ?? [];

function setBuild(text) {
  if (buildEl) buildEl.textContent = `Build: ${BUILD_TAG} — ${text}`;
}

async function runPreloader(scrubber) {
  await scrubber.load((p) => {
    const n = Math.round(p * 100);
    if (fill) fill.style.width = `${n}%`;
    if (pct) pct.textContent = `${n}%`;
  });
  preloader?.classList.add("is-done");
  heroHud?.classList.remove("is-hidden");
}

function applyFx(fx) {
  if (vignette) vignette.style.opacity = String(fx.vignette);
  if (heroCopy) {
    heroCopy.style.opacity = String(fx.copyOpacity);
    heroCopy.style.transform = `translateY(${fx.copyY}px)`;
  }
  if (scrollHint) scrollHint.style.opacity = String(fx.hintOpacity);
}

async function init() {
  document.documentElement.style.setProperty("--vh", `${window.innerHeight * 0.01}px`);
  setBuild("loading frames…");

  if (!frameUrls.length) {
    setBuild("error: no act0 frames in cdn-manifest.js");
    preloader?.classList.add("is-done");
    return;
  }

  const scrubber = new FrameScrubber(heroSection, canvas, frameUrls, {
    copyLayer: heroCopy?.parentElement,
    starsLayer: stars,
    parallaxCanvas: 0.055,
    reducedMotion,
  });

  scrubber.bindParallax();
  await runPreloader(scrubber);
  scrubber.resize();
  setBuild(`mode: scroll scrub (${frameUrls.length} frames)`);

  window.addEventListener("resize", () => {
    document.documentElement.style.setProperty("--vh", `${window.innerHeight * 0.01}px`);
    scrubber.resize();
  });

  if (!window.gsap?.ScrollTrigger) {
    scrubber.draw(0, scrollFx(0));
    return;
  }

  const { gsap, ScrollTrigger } = window;
  gsap.registerPlugin(ScrollTrigger);

  let lenis;
  if (!reducedMotion && typeof Lenis !== "undefined") {
    lenis = new Lenis({ duration: 1.15, smoothWheel: true, touchMultiplier: 1.4 });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
  }

  const pinEnd = reducedMotion ? "+=120%" : SCROLL_PIN;

  ScrollTrigger.create({
    trigger: heroSection,
    start: "top top",
    end: pinEnd,
    pin: true,
    anticipatePin: 1,
    scrub: reducedMotion ? false : 0.35,
    onUpdate: (self) => {
      const p = self.progress;
      const idx = mapScrollToFrame(p, scrubber.frames.length);
      const fx = scrollFx(p);
      scrubber.draw(idx, {
        scale: fx.scale,
        offsetX: fx.offsetX,
        offsetY: fx.offsetY,
      });
      applyFx(fx);
    },
  });

  // First frame + hint visible
  scrubber.draw(0, scrollFx(0));
  applyFx(scrollFx(0));

  // Act 2 content reveal after hero unpins
  gsap.from("#act2 .section__inner > *", {
    opacity: 0,
    y: 56,
    stagger: 0.08,
    scrollTrigger: { trigger: "#act2", start: "top 78%" },
  });
}

init();
