import { FrameScrubber } from "./frame-scrub.js";
import { StarField } from "./stars.js";

const PIN_VH = 600;
const MIN_READY = 36;
const ACT_KEYS = ["act0", "act1", "act2"];

const STATIONS = {
  hero:      { start: 0.00, peak: 0.22, end: 0.34 },
  passage:   { start: 0.38, peak: 0.54, end: 0.68 },
  underworld:{ start: 0.72, peak: 0.88, end: 1.00 },
};

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
const passageCopy = document.getElementById("passage-copy-block");
const underworldCopy = document.getElementById("underworld-copy-block");
const problemSection = document.getElementById("problem");

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

function stationOpacity(station, p) {
  const { start, end } = STATIONS[station];
  const fadeIn = 0.06;
  const fadeOut = 0.08;
  if (p <= start - fadeIn) return 0;
  if (p >= end + fadeOut) return 0;
  if (p < start) return Math.max(0, (p - (start - fadeIn)) / fadeIn);
  if (p > end) return Math.max(0, 1 - (p - end) / fadeOut);
  return 1;
}

function setCopy(el, opacity) {
  if (!el) return;
  const visible = opacity > 0.02;
  el.style.opacity = String(opacity);
  el.style.visibility = visible ? "visible" : "hidden";
  el.style.transform = `translateY(${(1 - opacity) * 18}px)`;
}

function applyCopyForProgress(p) {
  const heroOp = stationOpacity("hero", p);
  const passOp = stationOpacity("passage", p);
  const undOp  = stationOpacity("underworld", p);

  const yHero = p * -28;
  setCopy(heroCopy, heroOp);
  if (heroCopy) heroCopy.style.transform = `translateY(${yHero}px)`;

  setCopy(passageCopy, passOp);
  setCopy(underworldCopy, undOp);

  if (scrollHint) {
    scrollHint.style.opacity = heroOp > 0.1 ? "1" : "0";
  }

  if (problemSection) {
    const contentP = Math.max(0, Math.min(1, (p - 0.92) / 0.08));
    problemSection.style.opacity = String(contentP);
    problemSection.style.pointerEvents = contentP > 0.5 ? "auto" : "none";
  }

  if (vignette) {
    const stars = document.querySelector(".cinema__stars");
    const v = 0.32 + p * 0.42;
    vignette.style.opacity = String(v);
    if (stars) stars.style.opacity = String(0.55 + p * 0.4);
  }
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

function frameForProgress(p, count) {
  const n = Math.max(1, count);
  const x = Math.max(0, Math.min(1, p));
  const eased = x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  return Math.min(n - 1, Math.floor(eased * (n - 1)));
}

async function init() {
  document.documentElement.style.setProperty("--vh", `${window.innerHeight * 0.01}px`);

  const stage = cinema?.querySelector(".cinema__stage");
  let stars = null;
  if (stage) {
    stars = new StarField(stage, { reducedMotion });
    stars.start();
  }

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

  setProgress(1);
  loader?.classList.add("is-done");
  if (scrollHintText) scrollHintText.textContent = "Scroll to descend";
  applyCopyForProgress(0);

  if (problemSection) {
    problemSection.style.opacity = "0";
    problemSection.style.pointerEvents = "none";
  }

  window.addEventListener("resize", () => {
    document.documentElement.style.setProperty("--vh", `${window.innerHeight * 0.01}px`);
    scrubber.resize();
  });

  if (!window.gsap || !window.ScrollTrigger) {
    console.error("cinema: GSAP or ScrollTrigger failed to load");
    return;
  }

  const { gsap, ScrollTrigger } = window;
  gsap.registerPlugin(ScrollTrigger);

  ScrollTrigger.create({
    trigger: cinemaPin || cinema,
    start: "top top",
    end: reducedMotion ? "+=220%" : `+=${PIN_VH}%`,
    pin: true,
    pinSpacing: true,
    anticipatePin: 1,
    scrub: reducedMotion ? false : 0.35,
    invalidateOnRefresh: true,
    onUpdate: (self) => {
      const p = self.progress;

      if (p <= 0.002) {
        showIdle();
        return;
      }

      showFilm();
      const idx = frameForProgress(p, filmUrls.length);

      let scale = 1;
      let offsetY = 0;
      if (p < 0.40) {
        const t = p / 0.40;
        scale = 1 + t * 0.04;
        offsetY = -t * 8;
      } else if (p < 0.70) {
        const t = (p - 0.40) / 0.30;
        scale = 1.04 + t * 0.04;
        offsetY = -8 - t * 14;
      } else {
        const t = (p - 0.70) / 0.30;
        scale = 1.08 + t * 0.10;
        offsetY = -22 - t * 12;
      }

      scrubber.draw(idx, { scale, offsetY });
      applyCopyForProgress(p);
    },
  });

  ScrollTrigger.refresh();
}

init().catch((err) => {
  console.error("cinema init failed", err);
  loader?.classList.add("is-done");
});
