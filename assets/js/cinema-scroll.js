import {
  CINEMA_SEGMENTS as BASE_SEGMENTS,
  globalToSegment,
  segmentToFrame,
  segmentFx,
  segmentUi,
  totalPinLength,
} from "./scroll-timeline.js";
import { ActFrameCache } from "./idle-layer.js";

const CINEMA_SEGMENTS = BASE_SEGMENTS.map((seg) =>
  seg.id === "bridge" ? { ...seg, contentReveal: "#problem" } : seg
);

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const loader = document.getElementById("loader");
const fill = loader?.querySelector(".cinema-loader__fill");
const pct = loader?.querySelector(".cinema-loader__pct");
const cinemaPin = document.getElementById("cinema-pin");
const cinema = document.getElementById("cinema");
const canvas = document.getElementById("scrub-canvas");
const idleImg = document.getElementById("cinema-idle");
const vignette = document.getElementById("cinema-vignette");
const scrollHint = document.getElementById("scroll-hint");
const scrollHintText = document.getElementById("scroll-hint-text");
const problemSection = document.getElementById("problem");

const CDN = window.DWF_CDN;
let scrollReady = false;

function setProgress(value) {
  const n = Math.round(value * 100);
  if (fill) fill.style.width = `${n}%`;
  if (pct) pct.textContent = `${n}%`;
}

function setCopyVisible(id, visible, opacity = 1, y = 0) {
  const el = document.getElementById(id);
  if (!el) return;
  el.style.opacity = visible ? String(opacity) : "0";
  el.style.visibility = visible && opacity > 0.02 ? "visible" : "hidden";
  el.style.transform = `translateY(${y}px)`;
}

function applyUi(segment, ui, fx) {
  if (vignette) vignette.style.opacity = String(fx.vignette);

  for (const seg of CINEMA_SEGMENTS) {
    if (!seg.copy) continue;
    const id = seg.copy.replace("#", "");
    if (seg.id === segment.id) {
      setCopyVisible(id, true, ui.copyOpacity, ui.copyY);
    } else {
      setCopyVisible(id, false);
    }
  }

  if (scrollHint) {
    scrollHint.style.opacity = String(ui.hintOpacity ?? 0);
    if (scrollHintText) {
      scrollHintText.textContent = scrollReady ? "Scroll to begin" : "Loading frames…";
      scrollHint.classList.toggle("is-waiting", !scrollReady);
    }
  }

  if (problemSection && ui.contentOpacity != null) {
    problemSection.style.opacity = String(ui.contentOpacity);
    problemSection.style.pointerEvents = ui.contentOpacity > 0.5 ? "auto" : "none";
  }
}

function applyRestState() {
  const entry = CINEMA_SEGMENTS[0];
  const ui = segmentUi(entry, 0, 0);
  const fx = segmentFx(entry, 0, 0);
  applyUi(entry, ui, fx);
  setCopyVisible("hero-copy-block", true, 1, 0);
  if (idleImg) idleImg.classList.remove("is-hidden");
  if (canvas) canvas.classList.remove("is-active");
}

async function init() {
  document.documentElement.style.setProperty("--vh", `${window.innerHeight * 0.01}px`);

  const acts = CDN?.acts ?? {};
  if (!acts.act0?.length) {
    if (scrollHintText) scrollHintText.textContent = "Missing frame manifest";
    loader?.classList.add("is-done");
    return;
  }

  const cache = new ActFrameCache(cinema, canvas, { reducedMotion });
  applyRestState();

  const weights = { act0: 0.45, act1: 0.3, act2: 0.25 };
  let progress = 0;

  const loadAct = (key) =>
    cache.loadAct(key, acts[key], (p) => {
      const base = key === "act0" ? 0 : key === "act1" ? weights.act0 : weights.act0 + weights.act1;
      const w = weights[key];
      setProgress(base + p * w);
    });

  await Promise.all([loadAct("act0"), loadAct("act1"), loadAct("act2")]);

  cache.resizeAll();
  scrollReady = true;
  loader?.classList.add("is-done");
  applyRestState();

  if (problemSection) {
    problemSection.style.opacity = "0";
    problemSection.style.pointerEvents = "none";
  }

  window.addEventListener("resize", () => {
    document.documentElement.style.setProperty("--vh", `${window.innerHeight * 0.01}px`);
    cache.resizeAll();
    if (!canvas?.classList.contains("is-active") && cache.getAct("act0")) {
      cache.draw("act0", 0);
    }
  });

  if (!window.gsap?.ScrollTrigger) return;

  const { gsap, ScrollTrigger } = window;
  gsap.registerPlugin(ScrollTrigger);

  if (!reducedMotion && typeof Lenis !== "undefined") {
    const lenis = new Lenis({ duration: 1.1, smoothWheel: true, touchMultiplier: 1.35 });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
  }

  ScrollTrigger.create({
    trigger: cinemaPin || cinema,
    start: "top top",
    end: reducedMotion ? "+=180%" : totalPinLength(),
    pin: true,
    anticipatePin: 1,
    scrub: reducedMotion ? false : 0.35,
    onUpdate: (self) => {
      const globalP = self.progress;

      if (globalP <= 0.001) {
        applyRestState();
        return;
      }

      if (idleImg) idleImg.classList.add("is-hidden");
      if (canvas) canvas.classList.add("is-active");

      const { segment, local } = globalToSegment(globalP);
      const act = cache.getAct(segment.cdnKey);
      if (!act?.frames?.length) return;

      const frameIdx = segmentToFrame(segment, local, act.frames.length, null);
      const fx = segmentFx(segment, local, globalP);
      const ui = segmentUi(segment, local, globalP);

      cache.draw(segment.cdnKey, frameIdx, fx);
      applyUi(segment, ui, fx);
    },
  });
}

init();
