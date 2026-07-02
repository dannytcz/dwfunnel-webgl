import { FrameScrubber } from "./frame-scrub.js";
import { initHeroPin } from "./hero-pin.js";
import { initMachinePin } from "./machine-pin.js";
import { initMotionUi } from "./motion-ui.js";
import { initSections } from "./sections.js";

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const isMobile = window.matchMedia("(max-width: 767px)").matches;
const saveData = navigator.connection?.saveData;
const slowNet = ["slow-2g", "2g", "3g"].includes(navigator.connection?.effectiveType);

export const appState = {
  reducedMotion,
  isMobile,
  saveData,
  slowNet,
  scrubber: null,
  machineScrubber: null,
  lenis: null,
};

function buildAct0Urls() {
  const acts = window.DWF_CDN?.acts ?? {};
  const count = acts.act0?.length ?? 0;
  const local =
    location.hostname === "localhost" ||
    location.hostname === "127.0.0.1" ||
    location.port === "8766";

  if (!count) return [];
  if (local) {
    return Array.from(
      { length: count },
      (_, i) => `assets/frames/cinema/act0/frame_${String(i + 1).padStart(5, "0")}.webp`
    );
  }
  return acts.act0;
}

function buildAct2Urls() {
  const acts = window.DWF_CDN?.acts ?? {};
  const count = acts.act2?.length ?? 0;
  const local =
    location.hostname === "localhost" ||
    location.hostname === "127.0.0.1" ||
    location.port === "8766";
  if (!count) return [];
  if (local) {
    return Array.from(
      { length: count },
      (_, i) => `assets/frames/cinema/act2/frame_${String(i + 1).padStart(5, "0")}.webp`
    );
  }
  return acts.act2;
}

function initLenis() {
  if (reducedMotion || !window.Lenis) return null;
  const lenis = new window.Lenis({ lerp: 0.08, smoothWheel: true });
  appState.lenis = lenis;
  lenis.on("scroll", () => window.ScrollTrigger?.update());
  window.gsap?.ticker.add((time) => lenis.raf(time * 1000));
  window.gsap?.ticker.lagSmoothing(0);
  return lenis;
}

async function init() {
  if (!window.gsap || !window.ScrollTrigger) {
    console.error("GSAP ScrollTrigger required");
    return;
  }
  window.gsap.registerPlugin(window.ScrollTrigger, window.ScrollToPlugin);

  const heroCanvas = document.getElementById("scrub-canvas");
  const machineCanvas = document.getElementById("machine-canvas");
  const hero = document.getElementById("hero");
  const act0Urls = buildAct0Urls();
  const act2Urls = buildAct2Urls();

  const loaderApi = initMotionUi();

  if (act0Urls.length && heroCanvas && hero) {
    const scrubber = new FrameScrubber(hero, heroCanvas, act0Urls, { reducedMotion });
    appState.scrubber = scrubber;
    scrubber.resize();
    loaderApi.track(async () => {
      await scrubber.load((p) => loaderApi.setProgress(0.2 + p * 0.65), { eager: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10] });
      scrubber.draw(0, { scale: 1, offsetY: 0 });
    });
  } else {
    loaderApi.setProgress(0.5);
  }

  if (act2Urls.length && machineCanvas) {
    const machineScrubber = new FrameScrubber(
      document.getElementById("act-machine"),
      machineCanvas,
      act2Urls,
      { reducedMotion }
    );
    appState.machineScrubber = machineScrubber;
    machineScrubber.resize();
    machineScrubber.prefetchRange(0, Math.min(20, act2Urls.length - 1)).catch(() => {});
  }

  await loaderApi.finish();

  initLenis();

  if (!reducedMotion && !isMobile && appState.scrubber) {
    initHeroPin(appState);
  } else {
    document.getElementById("hero-poster")?.classList.remove("is-hidden");
    document.getElementById("scrub-canvas")?.classList.remove("is-active");
  }

  if (!reducedMotion && !isMobile && appState.machineScrubber) {
    initMachinePin(appState);
  }

  initSections(appState);
  window.ScrollTrigger.refresh();
}

init().catch((err) => {
  console.error("cinema-app init failed", err);
  document.getElementById("loader")?.classList.add("is-done");
});
