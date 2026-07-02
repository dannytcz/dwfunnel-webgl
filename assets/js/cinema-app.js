import { FrameScrubber } from "./frame-scrub.js?v=31";
import { initHeroPin } from "./hero-pin.js?v=31";
import { initMachinePin } from "./machine-pin.js?v=31";
import { initMotionUi } from "./motion-ui.js?v=31";
import { initSections } from "./sections.js?v=31";

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const isMobile = window.matchMedia("(max-width: 767px)").matches;

export const appState = {
  reducedMotion,
  isMobile,
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
  const lenis = new window.Lenis({ autoRaf: false });
  window.lenis = lenis;
  appState.lenis = lenis;
  lenis.on("scroll", window.ScrollTrigger.update);
  window.gsap.ticker.add((time) => {
    lenis.raf(time * 1000);
  });
  window.gsap.ticker.lagSmoothing(0);
  return lenis;
}

function bindAnchorScroll(lenis) {
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      const id = a.getAttribute("href");
      if (!id || id.length < 2) return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      if (lenis) {
        lenis.scrollTo(target, { offset: 0 });
      } else {
        target.scrollIntoView({ behavior: "smooth" });
      }
    });
  });
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
    scrubber.bindResize();
    loaderApi.track(async () => {
      await scrubber.load((p) => loaderApi.setProgress(0.1 + p * 0.85));
      scrubber.setTargetFrame(0);
    });
  } else {
    loaderApi.setProgress(0.5);
  }

  await loaderApi.finish();

  const lenis = initLenis();
  bindAnchorScroll(lenis);

  if (!reducedMotion && !isMobile && appState.scrubber) {
    initHeroPin(appState);
  } else {
    document.getElementById("hero-poster")?.classList.remove("is-hidden");
    document.getElementById("scrub-canvas")?.classList.remove("is-active");
  }

  initSections(appState);

  if (act2Urls.length && machineCanvas) {
    const machineScrubber = new FrameScrubber(
      document.getElementById("act-machine"),
      machineCanvas,
      act2Urls,
      { reducedMotion, debugLabel: "machine" }
    );
    appState.machineScrubber = machineScrubber;
    machineScrubber.bindResize();
    console.info(
      `[machine-canvas] act2 frames: ${act2Urls.length}, path: assets/frames/cinema/act2/, sample: frame_00001.webp`
    );
    machineScrubber
      .load()
      .then(() => {
        machineScrubber.setTargetFrame(0);
        machineScrubber.renderNow?.();
        if (!reducedMotion && !isMobile) initMachinePin(appState);
        window.ScrollTrigger.refresh();
      })
      .catch((err) => console.warn("machine preload failed", err));
  } else {
    machineCanvas?.setAttribute("aria-hidden", "true");
    if (machineCanvas) machineCanvas.style.visibility = "hidden";
    document.getElementById("act-machine")?.insertAdjacentHTML(
      "beforeend",
      "<!-- [PLACEHOLDER] machine section frame sequence not yet produced. Unhide and wire when frames are added. -->"
    );
  }

  await document.fonts.ready;
  window.ScrollTrigger.refresh();
}

init().catch((err) => {
  console.error("cinema-app init failed", err);
  document.getElementById("loader")?.classList.add("is-done");
});
