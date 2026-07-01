import { FrameScrubber } from "./frame-scrub.js";
import { StarField } from "./stars.js";
import { initPageNav } from "./page-nav.js";
import {
  CINEMA_SEGMENTS,
  globalToSegment,
  segmentFx,
  segmentToFrame,
  segmentUi,
  stationPinProgress,
  totalPinLength,
} from "./scroll-timeline.js";

const MIN_LOADER_MS = 3000;
const ACT_KEYS = ["act0", "act1", "act2"];

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const loader = document.getElementById("loader");
const fill = loader?.querySelector(".cinema-loader__fill");
const pct = loader?.querySelector(".cinema-loader__pct");
const cinema = document.getElementById("cinema");
const stage = cinema?.querySelector(".cinema__stage");
const canvas = document.getElementById("scrub-canvas");
const idleImg = document.getElementById("cinema-idle");
const flash = document.getElementById("cinema-flash");
const starsLayer = () => document.querySelector(".cinema__stars");

const state = {
  currentStation: 0,
  pinTrigger: null,
};

const pageNavApi = {
  getCinemaStation: () => state.currentStation,
  onCinemaStationChange: null,
  scrollToPinProgress: (progress) => scrollToPinProgress(progress),
  goToCinemaStation: (idx) => goToCinemaStation(idx),
  goToScrollSection: (sel) => goToScrollSection(sel),
};

function setScrim(targetOpacity) {
  if (!stage) return;
  stage.style.setProperty("--scrim-opacity", String(targetOpacity));
}

function buildFilmUrls() {
  const acts = window.DWF_CDN?.acts ?? {};
  const local =
    location.hostname === "localhost" ||
    location.hostname === "127.0.0.1" ||
    location.port === "8766";

  return ACT_KEYS.flatMap((act) => {
    const count = acts[act]?.length ?? 0;
    if (!count) return [];
    if (local) {
      return Array.from(
        { length: count },
        (_, i) => `assets/frames/cinema/${act}/frame_${String(i + 1).padStart(5, "0")}.webp`
      );
    }
    return acts[act];
  });
}

function getActOffsets() {
  const acts = window.DWF_CDN?.acts ?? {};
  const offsets = {};
  let acc = 0;
  for (const key of ACT_KEYS) {
    offsets[key] = acc;
    acc += acts[key]?.length ?? 0;
  }
  return offsets;
}

function segmentToFlatFrame(segment, localProgress) {
  const acts = window.DWF_CDN?.acts ?? {};
  const frameCount = acts[segment.cdnKey]?.length ?? 1;
  const localFrame = segmentToFrame(segment, localProgress, frameCount, null);
  const offsets = getActOffsets();
  return (offsets[segment.cdnKey] ?? 0) + localFrame;
}

function setProgress(value) {
  const n = Math.round(value * 100);
  if (fill) fill.style.width = `${n}%`;
  if (pct) pct.textContent = `${n}%`;
}

function showIdle() {
  if (idleImg) idleImg.classList.remove("is-hidden");
  if (canvas) canvas.classList.remove("is-active");
}

function showFilm() {
  if (idleImg) idleImg.classList.add("is-hidden");
  if (canvas) canvas.classList.add("is-active");
}

function applyUi(segment, ui, fx) {
  for (const seg of CINEMA_SEGMENTS) {
    if (!seg.copy) continue;
    const el = document.querySelector(seg.copy);
    if (!el) continue;
    if (seg.id === segment.id) {
      el.style.opacity = String(ui.copyOpacity);
      el.style.transform = `translateY(${ui.copyY}px)`;
      el.style.visibility = ui.copyOpacity > 0.02 ? "visible" : "hidden";
      el.setAttribute("aria-hidden", ui.copyOpacity > 0.02 ? "false" : "true");
    } else {
      el.style.opacity = "0";
      el.style.visibility = "hidden";
      el.setAttribute("aria-hidden", "true");
    }
  }

  setScrim(ui.scrim ?? 0.35);

  if (segment.contentReveal && ui.contentOpacity != null) {
    document.querySelectorAll(segment.contentReveal).forEach((card) => {
      card.style.opacity = String(ui.contentOpacity);
      card.classList.toggle("is-revealed", ui.contentOpacity > 0.4);
    });
  }

  if (flash) flash.style.opacity = "0";

  const sl = starsLayer();
  if (sl) {
    const starP = Math.min(1, fx.vignette ?? 0.5);
    sl.style.opacity = String(0.45 + starP * 0.35);
  }
}

function updateStationFromProgress(globalP) {
  const { index } = globalToSegment(globalP);
  if (index !== state.currentStation) {
    state.currentStation = index;
    pageNavApi.onCinemaStationChange?.(index);
    if (cinema) {
      cinema.setAttribute("data-station-active", CINEMA_SEGMENTS[index]?.id || "");
    }
  }
}

function scrollToPinProgress(progress) {
  const st = state.pinTrigger;
  if (!st || !window.gsap) return;
  const p = Math.max(0, Math.min(1, progress));
  const y = st.start + p * (st.end - st.start);
  window.gsap.to(window, {
    duration: reducedMotion ? 0.01 : 0.85,
    ease: "power2.inOut",
    scrollTo: { y, autoKill: true },
  });
}

function goToCinemaStation(idx) {
  scrollToPinProgress(stationPinProgress(idx));
}

function goToScrollSection(selector) {
  if (!window.gsap) {
    document.querySelector(selector)?.scrollIntoView({ behavior: "smooth" });
    return;
  }
  window.gsap.to(window, {
    duration: 0.9,
    ease: "power2.inOut",
    scrollTo: { y: selector, autoKill: true },
  });
}

function prefetchActs(scrubber) {
  const acts = window.DWF_CDN?.acts ?? {};
  const offsets = getActOffsets();
  const act1Len = acts.act1?.length ?? 0;
  const act2Len = acts.act2?.length ?? 0;
  if (act1Len) {
    scrubber.prefetchRange(offsets.act1, offsets.act1 + act1Len - 1).catch(() => {});
  }
  if (act2Len) {
    window.requestIdleCallback?.(
      () => {
        scrubber.prefetchRange(offsets.act2, offsets.act2 + act2Len - 1).catch(() => {});
      },
      { timeout: 4000 }
    ) ??
      window.setTimeout(() => {
        scrubber.prefetchRange(offsets.act2, offsets.act2 + act2Len - 1).catch(() => {});
      }, 1200);
  }
}

function bindParallax(scrubber) {
  if (reducedMotion) return;
  window.addEventListener("pointermove", (e) => {
    const rect = cinema?.getBoundingClientRect();
    if (!rect || rect.bottom < 0 || rect.top > window.innerHeight) return;
    const mx = (e.clientX / window.innerWidth - 0.5) * 2;
    const my = (e.clientY / window.innerHeight - 0.5) * 2;
    const cx = mx * 0.055 * 28;
    const cy = my * 0.055 * 18;
    if (canvas) canvas.style.transform = `translate(${cx}px, ${cy}px) scale(1.02)`;
    if (starsLayer()) {
      starsLayer().style.transform = `translate(${mx * 4}px, ${my * 3}px)`;
    }
    void scrubber;
  });
}

async function init() {
  document.documentElement.style.setProperty("--vh", `${window.innerHeight * 0.01}px`);

  if (stage) {
    const stars = new StarField(stage, { reducedMotion });
    window.__stars = stars;
    stars.start();
  }

  const filmUrls = buildFilmUrls();
  if (!filmUrls.length) {
    loader?.classList.add("is-done");
    return;
  }

  showIdle();

  const scrubber = new FrameScrubber(cinema, canvas, filmUrls, { reducedMotion });
  window.__scrubber = scrubber;

  const act0Len = window.DWF_CDN?.acts?.act0?.length ?? 0;
  const eagerIndices = Array.from({ length: act0Len }, (_, i) => i);

  const loadStart = performance.now();
  await scrubber.load((p) => setProgress(p), { eager: eagerIndices });
  const elapsed = performance.now() - loadStart;
  if (elapsed < MIN_LOADER_MS) {
    await new Promise((r) => setTimeout(r, MIN_LOADER_MS - elapsed));
  }

  scrubber.resize();
  scrubber.prewarm(eagerIndices);
  prefetchActs(scrubber);

  setProgress(1);
  loader?.classList.add("is-done");

  // Land on hero frame; copy fades in on load.
  const heroFrame = act0Len > 0 ? act0Len - 1 : 0;
  showFilm();
  scrubber.draw(heroFrame, { scale: 1, offsetY: 0 });

  CINEMA_SEGMENTS.forEach((seg) => {
    const el = document.querySelector(seg.copy);
    if (!el) return;
    el.style.opacity = "0";
    el.style.visibility = "hidden";
    el.setAttribute("aria-hidden", "true");
  });

  const heroEl = document.querySelector("#hero-copy-block");
  if (heroEl) {
    heroEl.style.transition = "opacity 0.8s ease, transform 0.8s ease";
    heroEl.style.visibility = "visible";
    heroEl.style.opacity = "1";
    heroEl.setAttribute("aria-hidden", "false");
  }
  setScrim(0.35);

  window.addEventListener("resize", () => {
    document.documentElement.style.setProperty("--vh", `${window.innerHeight * 0.01}px`);
    scrubber.resize();
    window.ScrollTrigger?.refresh?.();
  });

  if (!window.gsap || !window.ScrollTrigger) {
    console.error("cinema: GSAP ScrollTrigger failed to load");
    return;
  }

  const { gsap, ScrollTrigger } = window;
  gsap.registerPlugin(ScrollTrigger, window.ScrollToPlugin);

  bindParallax(scrubber);
  initPageNav(pageNavApi);

  const pinTarget = document.getElementById("cinema-pin");
  const pinEnd = reducedMotion ? "+=180%" : totalPinLength();

  state.pinTrigger = ScrollTrigger.create({
    trigger: pinTarget,
    start: "top top",
    end: pinEnd,
    pin: true,
    anticipatePin: 1,
    scrub: reducedMotion ? false : 0.55,
    onUpdate: (self) => {
      const globalP = self.progress;

      if (globalP <= 0.001) {
        showFilm();
        scrubber.draw(heroFrame, { scale: 1, offsetY: 0 });
        applyUi(CINEMA_SEGMENTS[0], segmentUi(CINEMA_SEGMENTS[0], 0, 0), segmentFx(CINEMA_SEGMENTS[0], 0, 0));
        updateStationFromProgress(0);
        return;
      }

      showFilm();

      const { segment, local } = globalToSegment(globalP);
      const flatIdx = segmentToFlatFrame(segment, local);
      const fx = segmentFx(segment, local, globalP);
      const ui = segmentUi(segment, local, globalP);

      scrubber.prewarm([
        flatIdx - 2,
        flatIdx - 1,
        flatIdx,
        flatIdx + 1,
        flatIdx + 2,
      ]);
      scrubber.draw(flatIdx, fx);
      applyUi(segment, ui, fx);
      updateStationFromProgress(globalP);

      // Prefetch next act as user approaches boundary.
      if (segment.id === "hero" && local > 0.55) {
        const offsets = getActOffsets();
        const act1Len = window.DWF_CDN?.acts?.act1?.length ?? 0;
        if (act1Len) scrubber.prefetchRange(offsets.act1, offsets.act1 + act1Len - 1).catch(() => {});
      }
      if (segment.id === "passage" && local > 0.55) {
        const offsets = getActOffsets();
        const act2Len = window.DWF_CDN?.acts?.act2?.length ?? 0;
        if (act2Len) scrubber.prefetchRange(offsets.act2, offsets.act2 + act2Len - 1).catch(() => {});
      }
    },
  });

  window.__cinemaPinST = state.pinTrigger;
}

init().catch((err) => {
  console.error("cinema init failed", err);
  loader?.classList.add("is-done");
});
