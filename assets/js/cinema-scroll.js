import { FrameScrubber } from "./frame-scrub.js";
import { StarField } from "./stars.js";

const MIN_READY = 36;
const ACT_KEYS = ["act0", "act1", "act2"];

const STATIONS = [
  { id: "hero",       copyId: "hero-copy-block",      startFrame: 0,   heroFrame: 100, endFrame: 200 },
  { id: "passage",    copyId: "passage-copy-block",   startFrame: 200, heroFrame: 300, endFrame: 420 },
  { id: "underworld", copyId: "underworld-copy-block",startFrame: 420, heroFrame: 540, endFrame: 661 },
];

const SWOOSH_MS = 2000;
const WHEEL_THRESHOLD = 8;
const TOUCH_THRESHOLD = 30;
const DEBOUNCE_MS = 350;

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const loader = document.getElementById("loader");
const fill = loader?.querySelector(".cinema-loader__fill");
const pct = loader?.querySelector(".cinema-loader__pct");
const cinema = document.getElementById("cinema");
const canvas = document.getElementById("scrub-canvas");
const idleImg = document.getElementById("cinema-idle");
const vignette = document.getElementById("cinema-vignette");
const flash = document.getElementById("cinema-flash");
const scrollHint = document.getElementById("scroll-hint");
const scrollHintText = document.getElementById("scroll-hint-text");
const stationDots = Array.from(document.querySelectorAll(".cinema-stations__dot"));
const modeToggle = document.getElementById("cinema-mode-toggle");
const enterBtn = document.getElementById("cinema-enter");
const starsLayer = () => document.querySelector(".cinema__stars");
const problemSection = document.getElementById("problem");

const state = {
  current: 0,
  playing: false,
  freeScroll: true,
  lastAdvanceAt: 0,
  activeTween: null,
};

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

function applyStationCopy(idx) {
  STATIONS.forEach((s, i) => {
    const el = document.getElementById(s.copyId);
    if (!el) return;
    const on = i === idx;
    el.style.opacity = on ? "1" : "0";
    el.style.visibility = on ? "visible" : "hidden";
    el.style.transform = on ? "translateY(0)" : "translateY(18px)";
    el.setAttribute("aria-hidden", on ? "false" : "true");
  });

  // System cards stagger in only when we land on the underworld.
  const systemCards = document.querySelectorAll(".cinema-system__card");
  systemCards.forEach((c) => c.classList.remove("is-revealed"));
  if (idx === 2) {
    systemCards.forEach((card, i) => {
      window.setTimeout(() => card.classList.add("is-revealed"), 350 + i * 180);
    });
  }

  if (scrollHint) {
    scrollHint.style.opacity = idx === 0 ? "1" : "0";
  }
  if (scrollHintText) {
    if (idx === 0) scrollHintText.textContent = "Click anywhere to descend";
    else if (idx === STATIONS.length - 1) scrollHintText.textContent = "Final scene";
    else scrollHintText.textContent = "Click to continue";
  }
  if (vignette) {
    const base = 0.32 + idx * 0.12;
    vignette.style.opacity = String(base);
  }
}

function updateStationDots() {
  stationDots.forEach((dot, i) => {
    dot.classList.toggle("is-active", i === state.current);
  });
}

function showIdle() {
  if (idleImg) idleImg.classList.remove("is-hidden");
  if (canvas) canvas.classList.remove("is-active");
  if (cinema) cinema.classList.remove("is-playing");
}

function showFilm() {
  if (idleImg) idleImg.classList.add("is-hidden");
  if (canvas) canvas.classList.add("is-active");
}

function drawStation(id, fx = {}) {
  if (!window.__scrubber) return;
  window.__scrubber.draw(id, fx);
}

function easeInOutQuad(t) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function swooshTo(target) {
  if (state.activeTween) state.activeTween.kill();
  const from = STATIONS[state.current].heroFrame;
  const to = STATIONS[target].heroFrame;
  state.playing = true;
  if (cinema) cinema.classList.add("is-playing");

  const tween = { t: 0 };
  const dur = reducedMotion ? 0.01 : SWOOSH_MS / 1000;

  state.activeTween = gsap.to(tween, {
    t: 1,
    duration: dur,
    ease: "power2.inOut",
    onUpdate: () => {
      const t = tween.t;
      const e = easeInOutQuad(t);
      const idx = Math.round(from + (to - from) * e);
      const scale = 1.02 + t * 0.06;
      const offsetY = -t * 18;
      drawStation(idx, { scale, offsetY });
      if (flash) {
        const a = t < 0.5 ? t * 2 * 0.55 : (1 - t) * 2 * 0.55;
        flash.style.opacity = String(a);
      }
      const sl = starsLayer();
      if (sl) sl.style.opacity = String(0.55 + t * 0.4);
    },
    onComplete: () => {
      state.current = target;
      state.playing = false;
      state.activeTween = null;
      if (cinema) cinema.classList.remove("is-playing");
      drawStation(to, { scale: 1.08, offsetY: -18 });
      if (flash) flash.style.opacity = "0";
      const sl = starsLayer();
      if (sl) sl.style.opacity = String(0.55 + state.current * 0.2);
      applyStationCopy(state.current);
      updateStationDots();
    },
  });
}

function advance(dir) {
  if (state.playing) return;
  const now = performance.now();
  if (now - state.lastAdvanceAt < DEBOUNCE_MS) return;
  const next = state.current + dir;
  if (next < 0 || next >= STATIONS.length) {
    if (next >= STATIONS.length && dir > 0) {
      enterProblem();
    }
    return;
  }
  state.lastAdvanceAt = now;
  showFilm();
  swooshTo(next);
}

function jumpTo(target) {
  if (state.playing) return;
  if (target < 0 || target >= STATIONS.length) return;
  if (target === state.current) return;
  state.lastAdvanceAt = performance.now();
  showFilm();
  swooshTo(target);
}

function enterProblem() {
  if (!window.gsap) return;
  if (state.activeTween) state.activeTween.kill();
  state.playing = false;
  const sl = starsLayer();
  if (sl) sl.style.opacity = "0";
  if (flash) flash.style.opacity = "0";
  cinema?.classList.add("is-leaving");
  gsap.to(window, { duration: 1.4, ease: "power2.inOut", scrollTo: { y: "#problem", autoKill: false } });
}

function isInteractiveTarget(t) {
  return !!(t && t.closest && t.closest("a, button, .cinema-btn, .cinema-stations__dot, .cinema-mode-toggle"));
}

function isWheelBlockedTarget(t) {
  if (!t || !t.closest) return false;
  // Block wheel-advance only when the user is actively interacting with controls
  // (the station dots, the mode toggle, the CTA buttons). Plain buttons inside
  // the cinema copy are not blocking — wheel still advances.
  return !!(t.closest(".cinema-stations__dot, .cinema-mode-toggle, .cinema-copy__actions"));
}

function bindInputs() {
  document.addEventListener("click", (e) => {
    if (isInteractiveTarget(e.target)) return;
    advance(+1);
  });

  window.addEventListener(
    "wheel",
    (e) => {
      if (isWheelBlockedTarget(e.target)) return;
      if (Math.abs(e.deltaY) < WHEEL_THRESHOLD) return;
      e.preventDefault();
      if (state.playing) return;
      if (!state.freeScroll) return;
      advance(e.deltaY > 0 ? +1 : -1);
    },
    { passive: false }
  );

  window.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown" || e.key === " " || e.key === "Enter" || e.key === "PageDown") {
      e.preventDefault();
      advance(+1);
    } else if (e.key === "ArrowUp" || e.key === "PageUp") {
      e.preventDefault();
      advance(-1);
    } else if (e.key === "Home") {
      jumpTo(0);
    } else if (e.key === "End") {
      jumpTo(STATIONS.length - 1);
    }
  });

  let touchStartY = null;
  window.addEventListener("touchstart", (e) => {
    if (e.touches.length === 1) touchStartY = e.touches[0].clientY;
  }, { passive: true });
  window.addEventListener("touchend", (e) => {
    if (touchStartY == null) return;
    const endY = e.changedTouches[0]?.clientY ?? touchStartY;
    const delta = touchStartY - endY;
    touchStartY = null;
    if (Math.abs(delta) < TOUCH_THRESHOLD) return;
    if (state.playing) return;
    if (!state.freeScroll) return;
    advance(delta > 0 ? +1 : -1);
  }, { passive: true });

  stationDots.forEach((dot, i) => {
    dot.addEventListener("click", (e) => {
      e.stopPropagation();
      jumpTo(i);
    });
  });

  if (modeToggle) {
    modeToggle.addEventListener("click", (e) => {
      e.stopPropagation();
      state.freeScroll = !state.freeScroll;
      modeToggle.setAttribute("aria-pressed", String(state.freeScroll));
      const label = modeToggle.querySelector(".cinema-mode-toggle__label");
      if (label) label.textContent = state.freeScroll ? "Free scroll" : "Click only";
    });
  }

  if (enterBtn) {
    enterBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      enterProblem();
    });
  }
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
  window.__scrubber = scrubber;
  await scrubber.load((p) => setProgress(p), { minReady: MIN_READY });

  scrubber.resize();

  setProgress(1);
  loader?.classList.add("is-done");
  applyStationCopy(0);
  updateStationDots();
  if (starsLayer()) starsLayer().style.opacity = "0.55";

  window.addEventListener("resize", () => {
    document.documentElement.style.setProperty("--vh", `${window.innerHeight * 0.01}px`);
    scrubber.resize();
  });

  if (!window.gsap) {
    console.error("cinema: GSAP failed to load");
    return;
  }
  gsap.registerPlugin(window.ScrollTrigger, window.ScrollToPlugin);

  bindInputs();
}

init().catch((err) => {
  console.error("cinema init failed", err);
  loader?.classList.add("is-done");
});
