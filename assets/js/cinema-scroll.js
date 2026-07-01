import { FrameScrubber } from "./frame-scrub.js";
import { StarField } from "./stars.js";
import { initPageNav } from "./page-nav.js";

const MIN_LOADER_MS = 3000;
const INTRO_MS = 4200;
const ACT_KEYS = ["act0", "act1", "act2"];
const AUTO_ENGAGE_MS = 2000;

// Station metadata is filled in at runtime by buildStations() once the
// per-act frame counts are known. The hero frame is the LAST frame of
// each act (the most composed shot), not a hard-coded index that would
// break when the master sequence is trimmed for delivery.
const STATIONS = [
  { id: "hero",       copyId: "hero-copy-block" },
  { id: "passage",    copyId: "passage-copy-block" },
  { id: "underworld", copyId: "underworld-copy-block" },
];

const SWOOSH_MS = 4000;
const WHEEL_THRESHOLD = 8;
const TOUCH_THRESHOLD = 30;
const DEBOUNCE_MS = 500;

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const loader = document.getElementById("loader");
const fill = loader?.querySelector(".cinema-loader__fill");
const pct = loader?.querySelector(".cinema-loader__pct");
const cinema = document.getElementById("cinema");
const stage = cinema?.querySelector(".cinema__stage");
const canvas = document.getElementById("scrub-canvas");
const idleImg = document.getElementById("cinema-idle");
const vignette = document.getElementById("cinema-vignette");
const flash = document.getElementById("cinema-flash");
const stationDots = []; // legacy — nav lives in #page-nav
const pageNavApi = {
  getCinemaStation: () => state.current,
  onCinemaStationChange: null,
  onCinemaUnlock: null,
  goToCinemaStation: (idx) => goToCinemaStation(idx),
  goToScrollSection: (sel) => goToScrollSection(sel),
};
const stationIndexEl = document.querySelector(".cinema-stations__current");
const stationTotalEl = document.querySelector(".cinema-stations__total");
const progressFill = document.querySelector(".cinema-progress__fill");
const enterBtn = document.getElementById("cinema-enter");
const starsLayer = () => document.querySelector(".cinema__stars");
const problemSection = document.getElementById("problem");

const state = {
  current: 0,
  playing: false,
  lastAdvanceAt: 0,
  activeTween: null,
  autoEngageTimer: null,
  // While true, wheel / touch / arrow keys advance stations instead of
  // native scroll. Flipped false in enterProblem() so the page scrolls
  // normally once we hand off to the post-cinematic sections.
  cinemaLocked: true,
};

function isCinemaLocked() {
  return state.cinemaLocked;
}

// Resting scrim opacity per station. Drives .cinema__stage::after opacity
// so the dark overlay always rides the same transition as the copy fade.
const STATION_SCRIM = [0.35, 1.0, 0.55];

function setScrim(targetOpacity, durationS = 0.45) {
  if (!stage) return;
  stage.style.setProperty("--scrim-opacity", String(targetOpacity));
  // The ::after already has `transition: opacity 0.45s ease`, so changing the
  // custom property triggers a smooth tween. durationS is informational for
  // coordination with copy fades.
}

function setProgressFill(ratio) {
  // Progress bar removed from DOM — kept as no-op so other call sites don't break.
  void ratio;
}

function updateStationIndex() {
  // 01/03 index removed from DOM — no-op.
  void 0;
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

// Derive per-station start / hero / end frame indices from the actual
// per-act frame counts. Hero = the last frame of each act (most composed).
function buildStations(filmUrls) {
  const acts = window.DWF_CDN?.acts ?? {};
  const counts = ACT_KEYS.map((a) => acts[a]?.length ?? 0);
  const offsets = [];
  let acc = 0;
  for (const c of counts) { offsets.push(acc); acc += c; }
  // The flat array length is filmUrls.length; offsets sum to that.
  return STATIONS.map((s, i) => {
    const start = offsets[i] ?? 0;
    const count = counts[i] ?? 0;
    const end = start + Math.max(0, count - 1);
    const hero = end;
    return { ...s, startFrame: start, heroFrame: hero, endFrame: end };
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
    if (on) {
      el.style.visibility = "visible";
      el.setAttribute("aria-hidden", "false");
    } else {
      el.setAttribute("aria-hidden", "true");
    }
  });

  // Underworld cards stagger in only when we land on the underworld.
  const cards = document.querySelectorAll(".underworld-card");
  cards.forEach((c) => c.classList.remove("is-revealed"));
  if (idx === 2) {
    cards.forEach((row, i) => {
      window.setTimeout(() => row.classList.add("is-revealed"), 350 + i * 220);
    });
  }
}

function updateStationDots() {
  if (cinema) {
    const id = STATIONS[state.current]?.id;
    cinema.setAttribute("data-station-active", id || "");
  }
  pageNavApi.onCinemaStationChange?.(state.current);
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

function prewarmFrameRange(from, to) {
  const lo = Math.min(from, to);
  const hi = Math.max(from, to);
  const ids = [];
  const step = Math.max(1, Math.floor((hi - lo) / 28));
  for (let i = lo; i <= hi; i += step) ids.push(i);
  if (!ids.includes(to)) ids.push(to);
  if (!ids.includes(from)) ids.push(from);
  window.__scrubber?.prewarm?.(ids);
}

function fadeOutCopy(idx, durationS = 0.45) {
  const el = document.getElementById(STATIONS[idx].copyId);
  if (!el) return Promise.resolve();
  const eyebrow = el.querySelector(".cinema-copy__eyebrow");
  const rule = el.querySelector(".cinema-copy__rule");
  const h1 = el.querySelector("h1, h2");
  const lede = el.querySelector(".cinema-copy__lede");
  const actions = el.querySelector(".cinema-copy__actions");
  const beats = el.querySelectorAll(".cinema-passage__beats li");
  el.style.transition = `opacity ${durationS}s ease, transform ${durationS}s ease`;
  el.style.opacity = "0";
  el.style.transform = "translateY(-12px)";
  [eyebrow, rule, h1, lede, actions, ...beats].forEach((c) => {
    if (!c) return;
    c.style.transition = "none";
    c.style.opacity = "";
    c.style.transform = "";
  });
  // Scrim ramps up to its peak during the fade-out window.
  setScrim(1.0, durationS);
  return new Promise((r) => setTimeout(r, durationS * 1000));
}

function fadeInCopy(idx, durationS = 0.65) {
  return new Promise((resolve) => {
    applyStationCopy(idx);
    const el = document.getElementById(STATIONS[idx].copyId);
    if (!el) return resolve();
    const eyebrow = el.querySelector(".cinema-copy__eyebrow");
    const rule = el.querySelector(".cinema-copy__rule");
    const h1 = el.querySelector("h1, h2");
    const lede = el.querySelector(".cinema-copy__lede");
    const actions = el.querySelector(".cinema-copy__actions");
    const beats = el.querySelectorAll(".cinema-passage__beats li");

    const block = durationS;
    const fade = (node, delayS) => {
      if (!node) return;
      node.style.transition = `opacity ${block}s ease ${delayS}s, transform ${block}s ease ${delayS}s`;
      node.style.opacity = "1";
      node.style.transform = "translateY(0)";
    };
    [eyebrow, rule, h1].forEach((n) => fade(n, 0));
    fade(lede, 0.15);
    beats.forEach((b, i) => fade(b, 0.22 + i * 0.07));
    fade(actions, 0.45);

    el.style.transition = `opacity ${block}s ease, transform ${block}s ease`;
    el.style.opacity = "1";
    el.style.transform = "translateY(0)";

    // Scrim eases down to this station's resting value while copy fades in.
    setScrim(STATION_SCRIM[idx] ?? 0.35, block);

    setTimeout(resolve, block * 1000);
  });
}

function swooshTo(target) {
  if (state.activeTween) state.activeTween.kill();
  const from = STATIONS[state.current].heroFrame;
  const to = STATIONS[target].heroFrame;
  state.playing = true;
  // Clear any pending auto-engage — a manual advance shouldn't be followed
  // by an automatic enterProblem a second later.
  if (state.autoEngageTimer) { clearTimeout(state.autoEngageTimer); state.autoEngageTimer = null; }
  if (cinema) cinema.classList.add("is-playing");

  // Keep the destination frame hot in the LRU cache so the swoosh lands on
  // a blit, not a WebP decode + upload. Prewarm the whole travel range so
  // backward navigation (Passage → Hero) does not paint black mid-swoosh.
  prewarmFrameRange(from, to);

  const tween = { t: 0 };
  const dur = reducedMotion ? 0.01 : SWOOSH_MS / 1000;

  // Fade the outgoing copy OUT before the camera moves. The incoming copy
  // fades IN only after the swoosh lands (handled by onComplete). The scrim
  // rides both transitions, so it never appears abruptly.
  fadeOutCopy(state.current, 0.45);

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
      updateStationDots();
      // Evict frames outside the [current ± 80] window.
      window.__scrubber?.releaseOutOfWindow?.(to);
      // Fade in the destination copy only after the camera lands.
      fadeInCopy(state.current, 0.65);
      // Progress bar advances to the next station (1/3 -> 2/3 -> 1).
      setProgressFill((state.current + 1) / STATIONS.length);
      // Auto-engage the post-cinematic scroll once we've landed on the last
      // (Underworld) station. Cancel any existing timer first so a fast user
      // doesn't double-fire enterProblem.
      if (state.autoEngageTimer) { clearTimeout(state.autoEngageTimer); state.autoEngageTimer = null; }
      if (state.current === STATIONS.length - 1) {
        state.autoEngageTimer = window.setTimeout(() => {
          state.autoEngageTimer = null;
          if (state.current === STATIONS.length - 1 && !state.playing) enterProblem();
        }, AUTO_ENGAGE_MS);
      }
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
  if (target < 0 || target >= STATIONS.length) return;
  if (target === state.current && !state.playing) return;
  if (state.autoEngageTimer) { clearTimeout(state.autoEngageTimer); state.autoEngageTimer = null; }
  // Allow dot-clicks to interrupt an in-flight intro / swoosh.
  if (state.activeTween) state.activeTween.kill();
  state.playing = false;
  if (cinema) cinema.classList.remove("is-playing");
  state.lastAdvanceAt = performance.now();
  showFilm();
  // Immediately hide the outgoing copy (no slow fade — it's a jump) and ramp
  // the scrim up so the destination's fade-in can ride it back down.
  const cur = document.getElementById(STATIONS[state.current].copyId);
  if (cur) {
    cur.style.transition = "none";
    cur.style.opacity = "0";
    cur.style.visibility = "hidden";
  }
  setScrim(1.0, 0);
  swooshTo(target);
}

function restoreCinemaVisual() {
  document.body.removeAttribute("data-cinema-leaving");
  cinema?.classList.remove("is-leaving");
  document.getElementById("cinema-pin")?.classList.remove("cinema-pin--retired");
  const fadeLayer = cinema?.querySelector(".cinema__media");
  const idleImgEl = document.getElementById("cinema-idle");
  if (window.gsap) {
    if (fadeLayer) gsap.set(fadeLayer, { opacity: 1 });
    if (idleImgEl) gsap.set(idleImgEl, { opacity: 1 });
  } else {
    if (fadeLayer) fadeLayer.style.opacity = "1";
    if (idleImgEl) idleImgEl.style.opacity = "1";
  }
  window.__stars?.start?.();
}

function goToCinemaStation(idx) {
  if (idx < 0 || idx >= STATIONS.length) return;
  restoreCinemaVisual();
  if (window.scrollY > 8 && window.gsap) {
    gsap.to(window, {
      duration: 0.75,
      ease: "power2.inOut",
      scrollTo: { y: 0, autoKill: true },
      onComplete: () => jumpTo(idx),
    });
  } else {
    jumpTo(idx);
  }
}

function unlockCinema({ scrollTarget = null, fadeMedia = true } = {}) {
  if (!window.gsap) return;
  state.cinemaLocked = false;
  if (state.autoEngageTimer) { clearTimeout(state.autoEngageTimer); state.autoEngageTimer = null; }
  if (state.activeTween) state.activeTween.kill();
  state.playing = false;
  const sl = starsLayer();
  if (sl) sl.style.opacity = "0";
  if (flash) flash.style.opacity = "0";
  cinema?.classList.add("is-leaving");
  document.body.setAttribute("data-cinema-leaving", "true");
  window.__stars?.stop?.();
  window.__scrubber?.releaseImagesOutsideWindow?.(STATIONS[2].heroFrame);
  pageNavApi.onCinemaUnlock?.();

  const fadeLayer = cinema?.querySelector(".cinema__media");
  const idleImgEl = document.getElementById("cinema-idle");
  const tl = gsap.timeline({ defaults: { ease: "power2.inOut" } });
  if (fadeMedia) {
    if (fadeLayer) tl.to(fadeLayer, { opacity: 0, duration: 0.4, ease: "power2.in" }, 0);
    if (idleImgEl) tl.to(idleImgEl, { opacity: 0, duration: 0.3, ease: "power2.in" }, 0);
  }
  if (scrollTarget) {
    tl.to(window, {
      duration: 0.9,
      ease: "power2.inOut",
      scrollTo: { y: scrollTarget, autoKill: true },
      onComplete: () => {
        document.getElementById("cinema-pin")?.classList.add("cinema-pin--retired");
        window.ScrollTrigger?.refresh?.();
      },
    }, fadeMedia ? 0.05 : 0);
  }
}

function goToScrollSection(selector) {
  if (isCinemaLocked()) {
    unlockCinema({ scrollTarget: selector, fadeMedia: true });
    return;
  }
  if (!window.gsap) {
    document.querySelector(selector)?.scrollIntoView({ behavior: "smooth" });
    return;
  }
  gsap.to(window, {
    duration: 0.9,
    ease: "power2.inOut",
    scrollTo: { y: selector, autoKill: true },
  });
}

function enterProblem() {
  if (!state.cinemaLocked) return;
  unlockCinema({ scrollTarget: "#problem", fadeMedia: true });
}

function isInteractiveTarget(t) {
  return !!(t && t.closest && t.closest("a, button, .cinema-btn, .cinema-stations__dot"));
}

function isWheelBlockedTarget(t) {
  if (!t || !t.closest) return false;
  return !!(t.closest(".page-nav__dot, .cinema-copy__actions"));
}

function bindInputs() {
  window.addEventListener(
    "wheel",
    (e) => {
      // After enterProblem(), let the browser handle scroll normally.
      if (!isCinemaLocked()) return;
      if (isWheelBlockedTarget(e.target)) return;
      if (Math.abs(e.deltaY) < WHEEL_THRESHOLD) return;
      // Swallow wheel only while we are actively hijacking it.
      e.preventDefault();
      if (state.playing) return;
      advance(e.deltaY > 0 ? +1 : -1);
    },
    { passive: false }
  );

  window.addEventListener("keydown", (e) => {
    if (!isCinemaLocked()) return;
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
    if (!isCinemaLocked()) return;
    if (e.touches.length === 1) touchStartY = e.touches[0].clientY;
  }, { passive: true });
  window.addEventListener("touchend", (e) => {
    if (!isCinemaLocked()) return;
    if (touchStartY == null) return;
    const endY = e.changedTouches[0]?.clientY ?? touchStartY;
    const delta = touchStartY - endY;
    touchStartY = null;
    if (Math.abs(delta) < TOUCH_THRESHOLD) return;
    if (state.playing) return;
    advance(delta > 0 ? +1 : -1);
  }, { passive: true });

  if (enterBtn) {
    enterBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      enterProblem();
    });
  }

  initPageNav(pageNavApi);
}

async function init() {
  document.documentElement.style.setProperty("--vh", `${window.innerHeight * 0.01}px`);

  let stars = null;
  if (stage) {
    stars = new StarField(stage, { reducedMotion });
    window.__stars = stars;
    stars.start();
  }

  const filmUrls = buildFilmUrls();
  if (!filmUrls.length) {
    loader?.classList.add("is-done");
    return;
  }
  // Replace the placeholder STATIONS with one filled from the actual
  // per-act frame counts. Hero is always the last frame of each act.
  for (let i = 0; i < STATIONS.length; i++) {
    const built = buildStations(filmUrls)[i];
    if (built) STATIONS[i] = built;
  }

  showIdle();

  const scrubber = new FrameScrubber(cinema, canvas, filmUrls, { reducedMotion });
  window.__scrubber = scrubber;

  const act0Len = window.DWF_CDN?.acts?.act0?.length ?? 0;
  const eagerIndices = [
    ...Array.from({ length: act0Len }, (_, i) => i),
    ...STATIONS.map((s) => s.heroFrame),
  ];

  const loadStart = performance.now();
  await scrubber.load((p) => setProgress(p), { eager: eagerIndices });
  const elapsed = performance.now() - loadStart;
  if (elapsed < MIN_LOADER_MS) {
    await new Promise((r) => setTimeout(r, MIN_LOADER_MS - elapsed));
  }

  scrubber.resize();
  scrubber.prewarm([...new Set(eagerIndices)]);

  setProgress(1);
  loader?.classList.add("is-done");
  // Hide all station copy initially; intro plays without any copy on screen.
  STATIONS.forEach((s) => {
    const el = document.getElementById(s.copyId);
    if (!el) return;
    el.style.transition = "none";
    el.style.opacity = "0";
    el.style.visibility = "hidden";
    el.setAttribute("aria-hidden", "true");
    const kids = el.querySelectorAll(
      ".cinema-copy__eyebrow, .cinema-copy__rule, h1, h2, .cinema-copy__lede, .cinema-copy__actions, .cinema-passage__beats li"
    );
    kids.forEach((k) => {
      k.style.transition = "none";
      k.style.opacity = "0";
      k.style.transform = "translateY(8px)";
    });
  });
  // Start scrim at 0 (no overlay during the intro) and progress at 0.
  setScrim(0, 0);
  setProgressFill(0);
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

  await playIntroReverse(scrubber);
  bindInputs();
}

// Wait for every act 0 frame to have a decoded bitmap (naturalWidth > 0).
// Without this, the intro paints a black canvas for the first ~1 s while
// the network-fetched WebPs are still being decoded off-thread.
async function waitForIntroFrames(scrubber, act0Len) {
  const deadline = performance.now() + 8000;
  while (performance.now() < deadline) {
    let ready = true;
    for (let i = 0; i < act0Len; i++) {
      const f = scrubber.frames[i];
      if (!f || !f.naturalWidth) { ready = false; break; }
    }
    if (ready) return true;
    await new Promise((r) => setTimeout(r, 50));
  }
  return false;
}

// Intro: "reverse the video" — sweep BACKWARD through ACT 0 (from the hero
// frame down to the establishing / wide shot), then land back on the hero
// for the user to read. The Ken-Burns (scale 1.08 -> 1.00, offsetY -22 -> 0)
// gives it the cinematic pull-back-and-resolve feel. Hero copy fades in
// 1.6 s in (already while the camera is still moving) so the user sees
// words faster.
async function playIntroReverse(scrubber) {
  const total = scrubber.frames?.length ?? 0;
  if (!total) return;
  // End of act 0 in the flat frame array.
  const act0Len = window.DWF_CDN?.acts?.act0?.length ?? 0;
  if (!act0Len) return;
  await waitForIntroFrames(scrubber, act0Len);
  const startIdx = 0;  // start of act 0 (the establishing / wide shot)
  const hero = STATIONS[0].heroFrame;  // end of act 0 (the hero)
  if (reducedMotion) {
    scrubber.draw(hero, { scale: 1.0, offsetY: 0 });
    state.current = 0;
    fadeInCopy(0, 0.9);
    return;
  }
  showFilm();
  if (cinema) cinema.classList.add("is-playing");
  const tween = { t: 0 };
  state.playing = true;
  state.activeTween = gsap.to(tween, {
    t: 1,
    duration: INTRO_MS / 1000,
    ease: "power2.inOut",
    onUpdate: () => {
      // Reverse sweep: start at hero frame, walk BACKWARDS to startIdx as
      // t increases.
      const e = easeInOutQuad(tween.t);
      const idx = Math.round(hero + (startIdx - hero) * e);
      // Ken-Burns: pull back from hero composition (1.08, -22) to wide shot.
      const scale = 1.08 - tween.t * 0.08;
      const offsetY = -22 + tween.t * 22;
      drawStation(idx, { scale, offsetY });
      if (flash) {
        const a = tween.t < 0.5 ? tween.t * 2 * 0.55 : (1 - tween.t) * 2 * 0.55;
        flash.style.opacity = String(a);
      }
      // Begin the hero copy reveal earlier (1.6 s in) so the user sees the
      // wording faster — they don't have to wait the full 4.2 s.
      const introElapsedMs = tween.t * INTRO_MS;
      if (introElapsedMs > 1600 && !state._introCopyFired) {
        state._introCopyFired = true;
        fadeInCopy(0, 0.9);
      }
    },
    onComplete: () => {
      state.playing = false;
      state.activeTween = null;
      if (cinema) cinema.classList.remove("is-playing");
      // Land on the hero frame, neutral Ken-Burns (composition held).
      drawStation(hero, { scale: 1.0, offsetY: 0 });
      if (flash) flash.style.opacity = "0";
      // Safety net: if the copy reveal never fired during the onUpdate
      // (e.g. reduced motion path skipped it), make sure it fires here.
      if (!state._introCopyFired) {
        state._introCopyFired = true;
        fadeInCopy(0, 0.9);
      }
      setProgressFill(1 / STATIONS.length);
    },
  });
}

init().catch((err) => {
  console.error("cinema init failed", err);
  loader?.classList.add("is-done");
});
