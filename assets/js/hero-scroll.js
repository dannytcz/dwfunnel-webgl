import { FrameScrubber, mapScrollToFrame, scrollFx } from "./frame-scrub.js";
import { IdleLayer } from "./idle-layer.js";

const BUILD_TAG = "scroll-video-v2";
const SCROLL_PIN = "+=280%";
const BLEND_END = 0.16;

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const preloader = document.getElementById("preloader");
const fill = preloader?.querySelector(".preloader__fill");
const pct = preloader?.querySelector(".preloader__pct");
const heroSection = document.getElementById("hero-scrub");
const canvas = document.getElementById("scrub-canvas");
const idleVideo = document.getElementById("idle-video");
const stars = document.getElementById("scrub-stars");
const vignette = document.getElementById("scrub-vignette");
const heroCopy = document.querySelector(".hero-copy");
const scrollHint = document.getElementById("scroll-hint");
const heroHud = document.getElementById("hero-hud");
const buildEl = document.getElementById("hero-build");

const CDN = window.DWF_CDN;
const frameUrls = CDN?.acts?.act0 ?? [];
const idleCfg = CDN?.heroIdle ?? {};
const webpLoop = idleCfg.webpLoop ?? { start: 0, end: 28, fps: 10 };

let scrollActive = false;

function setBuild(text) {
  if (buildEl) buildEl.textContent = `Build: ${BUILD_TAG} — ${text}`;
}

function setPreloadProgress(value) {
  const n = Math.round(value * 100);
  if (fill) fill.style.width = `${n}%`;
  if (pct) pct.textContent = `${n}%`;
}

function applyFx(fx) {
  if (vignette) vignette.style.opacity = String(fx.vignette);
  if (heroCopy) {
    heroCopy.style.opacity = String(fx.copyOpacity);
    heroCopy.style.transform = `translateY(${fx.copyY}px)`;
  }
  if (scrollHint) scrollHint.style.opacity = String(fx.hintOpacity);
}

function setCanvasOpacity(idle, opacity) {
  if (!canvas) return;
  canvas.style.opacity = String(opacity);
}

async function init() {
  document.documentElement.style.setProperty("--vh", `${window.innerHeight * 0.01}px`);
  setBuild("loading hero…");

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

  const idle = new IdleLayer({
    videoEl: idleVideo,
    scrubber,
    videoUrl: idleCfg.url || null,
    loop: webpLoop,
    reducedMotion,
  });

  let frameProgress = 0;
  let idleProgress = 0;
  const updateLoad = () => setPreloadProgress(frameProgress * 0.82 + idleProgress * 0.18);

  await Promise.all([
    scrubber.load((p) => {
      frameProgress = p;
      updateLoad();
    }),
    idle.load((p) => {
      idleProgress = p;
      updateLoad();
    }),
  ]);

  scrubber.bindParallax(idle);
  scrubber.resize();

  preloader?.classList.add("is-done");
  heroHud?.classList.remove("is-hidden");

  const modeLabel = idle.mode === "video" ? "idle video + scroll scrub" : "idle webp loop + scroll scrub";
  setBuild(`${modeLabel} (${frameUrls.length} frames)`);

  if (idle.mode === "video") {
    setCanvasOpacity(idle, 0);
  }
  idle.start();

  window.addEventListener("resize", () => {
    document.documentElement.style.setProperty("--vh", `${window.innerHeight * 0.01}px`);
    scrubber.resize();
  });

  if (!window.gsap?.ScrollTrigger) {
    applyFx(scrollFx(0));
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
      const fx = scrollFx(p, { blendEnd: BLEND_END });

      if (p <= 0.002) {
        if (scrollActive) {
          scrollActive = false;
          idle.start();
          if (idle.mode === "video") setCanvasOpacity(idle, 0);
        }
        applyFx(scrollFx(0, { blendEnd: BLEND_END }));
        return;
      }

      if (!scrollActive) {
        scrollActive = true;
        idle.stop();
      }

      idle.setVideoOpacity(fx.videoOpacity);
      setCanvasOpacity(idle, idle.mode === "video" ? fx.scrubOpacity : 1);

      const idx = mapScrollToFrame(p, scrubber.frames.length, { blendEnd: BLEND_END });
      scrubber.draw(idx, {
        scale: fx.scale,
        offsetX: fx.offsetX,
        offsetY: fx.offsetY,
      });
      applyFx(fx);
    },
  });

  applyFx(scrollFx(0, { blendEnd: BLEND_END }));

  gsap.from("#act2 .section__inner > *", {
    opacity: 0,
    y: 56,
    stagger: 0.08,
    scrollTrigger: { trigger: "#act2", start: "top 78%" },
  });
}

init();
