import { FrameScrubber } from "./frame-scrub.js";

const PIN_VH = 400;
const MIN_READY = 36;
const ACT_KEYS = ["act0", "act1", "act2"];

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
const heroCopy = document.getElementById("hero-copy-block");
const midCopy = document.getElementById("act1-copy-block");
const problemSection = document.getElementById("problem");

/** One continuous film: B→A (act0) → A→C (act1) → C→D (act2) = 662 frames */
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

function setProgress(value) {
  const n = Math.round(value * 100);
  if (fill) fill.style.width = `${n}%`;
  if (pct) pct.textContent = `${n}%`;
}

function easeFilm(t) {
  const x = Math.max(0, Math.min(1, t));
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

function frameFromProgress(p, count) {
  const n = Math.max(1, count);
  return Math.min(n - 1, Math.floor(easeFilm(p) * (n - 1)));
}

function setCopy(el, visible, opacity = 1, y = 0) {
  if (!el) return;
  el.style.opacity = visible ? String(opacity) : "0";
  el.style.visibility = visible && opacity > 0.02 ? "visible" : "hidden";
  el.style.transform = `translateY(${y}px)`;
}

function applyCopyForProgress(p) {
  const heroOpacity = p < 0.14 ? 1 : Math.max(0, 1 - (p - 0.14) / 0.22);
  const heroY = p * -48;
  setCopy(heroCopy, true, heroOpacity, heroY);

  let midOpacity = 0;
  if (p > 0.32 && p < 0.58) midOpacity = 1;
  else if (p >= 0.26 && p <= 0.32) midOpacity = (p - 0.26) / 0.06;
  else if (p >= 0.58 && p <= 0.66) midOpacity = 1 - (p - 0.58) / 0.08;
  setCopy(midCopy, midOpacity > 0.02, midOpacity, (1 - p) * 16);

  if (scrollHint) {
    scrollHint.style.opacity = p < 0.04 ? "1" : String(Math.max(0, 1 - (p - 0.04) / 0.08));
  }

  if (problemSection) {
    const contentP = Math.max(0, Math.min(1, (p - 0.82) / 0.18));
    problemSection.style.opacity = String(contentP);
    problemSection.style.pointerEvents = contentP > 0.5 ? "auto" : "none";
  }

  if (vignette) vignette.style.opacity = String(0.35 + p * 0.4);
}

function showIdle() {
  if (idleImg) idleImg.classList.remove("is-hidden");
  if (canvas) canvas.classList.remove("is-active");
  applyCopyForProgress(0);
}

function showFilm() {
  if (idleImg) idleImg.classList.add("is-hidden");
  if (canvas) canvas.classList.add("is-active");
}

async function init() {
  document.documentElement.style.setProperty("--vh", `${window.innerHeight * 0.01}px`);

  const filmUrls = buildFilmUrls();
  if (!filmUrls.length) {
    if (scrollHintText) scrollHintText.textContent = "Frame manifest missing";
    loader?.classList.add("is-done");
    return;
  }

  showIdle();
  if (scrollHintText) scrollHintText.textContent = "Loading…";

  const scrubber = new FrameScrubber(cinema, canvas, filmUrls, { reducedMotion });
  await scrubber.load((p) => setProgress(p), { minReady: MIN_READY });

  scrubber.resize();
  loader?.classList.add("is-done");
  if (scrollHintText) scrollHintText.textContent = "Scroll to begin";
  applyCopyForProgress(0);

  if (problemSection) {
    problemSection.style.opacity = "0";
    problemSection.style.pointerEvents = "none";
  }

  window.addEventListener("resize", () => {
    document.documentElement.style.setProperty("--vh", `${window.innerHeight * 0.01}px`);
    scrubber.resize();
  });

  if (!window.gsap?.ScrollTrigger) return;

  const { gsap, ScrollTrigger } = window;
  gsap.registerPlugin(ScrollTrigger);

  if (!reducedMotion && typeof Lenis !== "undefined") {
    const lenis = new Lenis({ duration: 0.9, smoothWheel: true, touchMultiplier: 1.2 });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
  }

  ScrollTrigger.create({
    trigger: cinemaPin || cinema,
    start: "top top",
    end: reducedMotion ? "+=160%" : `+=${PIN_VH}%`,
    pin: true,
    anticipatePin: 1,
    scrub: reducedMotion ? false : 0.45,
    onUpdate: (self) => {
      const p = self.progress;

      if (p <= 0.001) {
        showIdle();
        return;
      }

      showFilm();
      const idx = frameFromProgress(p, filmUrls.length);
      const scale = 1 + p * 0.1;
      const offsetY = -p * 20;
      scrubber.draw(idx, { scale, offsetY });
      applyCopyForProgress(p);
    },
  });
}

init();
