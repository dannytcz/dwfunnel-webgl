import {
  CINEMA_SEGMENTS,
  globalToSegment,
  segmentToFrame,
  segmentFx,
  segmentUi,
  totalPinLength,
} from "./scroll-timeline.js";
import { ActFrameCache, IdleLayer } from "./idle-layer.js";

const BUILD_TAG = "cinema-anime-v1";

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const preloader = document.getElementById("preloader");
const fill = preloader?.querySelector(".preloader__fill");
const pct = preloader?.querySelector(".preloader__pct");
const cinemaPin = document.getElementById("cinema-pin");
const heroSection = document.getElementById("hero-scrub");
const canvas = document.getElementById("scrub-canvas");
const idleVideo = document.getElementById("idle-video");
const stars = document.getElementById("scrub-stars");
const vignette = document.getElementById("scrub-vignette");
const scrollHint = document.getElementById("scroll-hint");
const heroHud = document.getElementById("hero-hud");
const buildEl = document.getElementById("hero-build");
const act2Section = document.getElementById("act2");

const CDN = window.DWF_CDN;
const idleCfg = CDN?.heroIdle ?? {};
const webpLoop = idleCfg.webpLoop ?? { start: 0, end: 139, fps: 12 };
const idleMode = idleCfg.mode ?? "webp";

/** Frame captured when user leaves idle — scroll continues from here, not frame 0. */
const handoff = { frame: null, engaged: false };

function setBuild(text) {
  if (buildEl) buildEl.textContent = `Build: ${BUILD_TAG} — ${text}`;
}

function setPreloadProgress(value) {
  const n = Math.round(value * 100);
  if (fill) fill.style.width = `${n}%`;
  if (pct) pct.textContent = `${n}%`;
}

function applyUi(segment, ui, fx) {
  if (vignette) vignette.style.opacity = String(fx.vignette);

  for (const seg of CINEMA_SEGMENTS) {
    if (!seg.copy) continue;
    const el = document.querySelector(seg.copy);
    if (!el) continue;
    if (seg.id === segment.id) {
      el.style.opacity = String(ui.copyOpacity);
      el.style.transform = `translateY(${ui.copyY}px)`;
      el.style.visibility = ui.copyOpacity > 0.02 ? "visible" : "hidden";
    } else {
      el.style.opacity = "0";
      el.style.visibility = "hidden";
    }
  }

  if (scrollHint) scrollHint.style.opacity = String(ui.hintOpacity ?? 0);

  if (act2Section && ui.contentOpacity != null) {
    act2Section.style.opacity = String(ui.contentOpacity);
    act2Section.style.pointerEvents = ui.contentOpacity > 0.5 ? "auto" : "none";
  }
}

function setCanvasMode(idle, scrubOpacity) {
  if (!canvas) return;
  canvas.style.opacity = idle.mode === "video" ? String(scrubOpacity) : "1";
}

function bindParallax(idle) {
  if (reducedMotion) return;
  window.addEventListener("pointermove", (e) => {
    const mx = (e.clientX / window.innerWidth - 0.5) * 2;
    const my = (e.clientY / window.innerHeight - 0.5) * 2;
    const cx = mx * 0.055 * 28;
    const cy = my * 0.055 * 18;
    canvas.style.transform = `translate(${cx}px, ${cy}px) scale(1.02)`;
    idle.applyParallax(mx, my);
    if (stars) {
      stars.style.transform = `translate(${mx * 4}px, ${my * 3}px)`;
    }
  });
}

async function prefetchActs(cache, keys) {
  await Promise.all(
    keys.map(async (key) => {
      const urls = CDN?.acts?.[key];
      if (urls?.length) await cache.loadAct(key, urls);
    })
  );
}

async function init() {
  document.documentElement.style.setProperty("--vh", `${window.innerHeight * 0.01}px`);
  setBuild("loading act 0…");

  const act0 = CDN?.acts?.act0 ?? [];
  if (!act0.length) {
    setBuild("error: act0 frames missing");
    preloader?.classList.add("is-done");
    return;
  }

  const cache = new ActFrameCache(heroSection, canvas, { reducedMotion });
  const idle = new IdleLayer({
    videoEl: idleVideo,
    cache,
    cdnKey: "act0",
    videoUrl: idleMode === "video" ? (idleCfg.url || null) : null,
    stillUrl: idleCfg.still || null,
    mode: idleMode,
    loop: webpLoop,
    reducedMotion,
  });

  const revealHero = () => {
    cache.resizeAll();
    bindParallax(idle);
    preloader?.classList.add("is-done");
    heroHud?.classList.remove("is-hidden");
    setBuild(`anime cinema · ${idle.mode} idle · ${totalPinLength()}`);
    if (idle.mode === "video") setCanvasMode(idle, 0);
    else if (idle.mode === "still") {
      canvas.style.opacity = "1";
      if (idleVideo) idleVideo.style.opacity = "0";
    }
    idle.start();
    if (act2Section) {
      act2Section.style.opacity = "0";
      act2Section.style.pointerEvents = "none";
    }
  };

  if (idleMode === "still") {
    await idle.load((p) => setPreloadProgress(p * 0.35));
    revealHero();
    cache.loadAct("act0", act0, (p) => setPreloadProgress(0.35 + p * 0.65)).catch(() => {});
    prefetchActs(cache, ["act1", "act2"]).catch(() => {});
  } else {
    let loadP = 0;
    await Promise.all([
      cache.loadAct("act0", act0, (p) => {
        loadP = p * 0.88;
        setPreloadProgress(loadP);
      }),
      idle.load((p) => {
        setPreloadProgress(loadP + p * 0.12);
      }),
    ]);
    revealHero();
    prefetchActs(cache, ["act1", "act2"]).catch(() => {});
  }

  window.addEventListener("resize", () => {
    document.documentElement.style.setProperty("--vh", `${window.innerHeight * 0.01}px`);
    cache.resizeAll();
  });

  if (!window.gsap?.ScrollTrigger) return;

  const { gsap, ScrollTrigger } = window;
  gsap.registerPlugin(ScrollTrigger);

  if (!reducedMotion && typeof Lenis !== "undefined") {
    const lenis = new Lenis({ duration: 1.15, smoothWheel: true, touchMultiplier: 1.4 });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
  }

  const pinTarget = cinemaPin || heroSection;
  const pinEnd = reducedMotion ? "+=180%" : totalPinLength();

  ScrollTrigger.create({
    trigger: pinTarget,
    start: "top top",
    end: pinEnd,
    pin: true,
    anticipatePin: 1,
    scrub: reducedMotion ? false : 0.4,
    onUpdate: (self) => {
      const globalP = self.progress;

      if (globalP <= 0.001) {
        if (handoff.engaged) {
          handoff.engaged = false;
          handoff.frame = null;
          idle.start();
          if (idle.mode === "video") setCanvasMode(idle, 0);
        }
        return;
      }

      if (!handoff.engaged) {
        handoff.engaged = true;
        idle.syncFrameFromVideo();
        handoff.frame = idle.getCurrentFrame();
        idle.stop();
      }

      const { segment, local } = globalToSegment(globalP);
      const act = cache.getAct(segment.cdnKey);
      if (!act?.frames?.length) return;

      const handoffFrame = segment.useHandoff ? handoff.frame : null;
      const frameIdx = segmentToFrame(segment, local, act.frames.length, handoffFrame);
      const fx = segmentFx(segment, local, globalP);
      const ui = segmentUi(segment, local, globalP);

      const blend = idle.mode === "still" ? 1 : Math.min(1, globalP / 0.08);
      const scrubOpacity = idle.mode === "video" ? blend : 1;
      idle.setVideoOpacity(1 - scrubOpacity);
      setCanvasMode(idle, scrubOpacity);

      cache.draw(segment.cdnKey, frameIdx, fx);
      applyUi(segment, ui, fx);

      document.querySelectorAll("[data-cinema-label]").forEach((el) => {
        el.textContent = segment.label;
        el.style.opacity = local > 0.05 && local < 0.95 ? "0.55" : "0.2";
      });
    },
  });
}

init();
