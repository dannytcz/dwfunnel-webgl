/**
 * Pinned film sections: scroll-scrubbed founder clips with beat-staged copy.
 *
 * Each `.film-pin` owns a canvas frame sequence (reusing FrameScrubber) and a
 * left rail of `.film-beat` elements. During a pin the scroll drives the frame
 * and each beat fades+rises in over its own scroll band (data-beat-in) and may
 * exit over data-beat-out. Frames decode once when the section first approaches
 * (a full viewport ahead of the pin) and are kept: three light 720px sequences
 * plus the hero stay well under the decode budget, and re-decoding on scroll-back
 * caused visible scrub stutter.
 *
 * Scene graph: stage gets a short exit dissolve only (tail 6%). Beats are driven
 * solely by their own in/out bands so late CTAs are not dimmed by a global fade.
 */

import { FrameScrubber } from "./frame-scrub.js?v=62";
import { runStatsCount } from "./sections.js?v=62";

const FILM_SCRUB = 0.12;
const EXIT_BAND = [0.94, 1];

const SECTION_DECODE_W = 720;

function smoothBand(p, a, b) {
  if (b <= a) return p >= b ? 1 : 0;
  const t = Math.max(0, Math.min(1, (p - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

function parseBand(attr) {
  if (!attr) return null;
  const [a, b] = attr.split(",").map((n) => parseFloat(n.trim()));
  if (!isFinite(a) || !isFinite(b)) return null;
  return [a, b];
}

function initOne(pin) {
  const key = pin.dataset.filmFrames;
  const count = parseInt(pin.dataset.filmCount || "0", 10);
  const vh = parseInt(pin.dataset.filmVh || "200", 10);
  const canvas = pin.querySelector(".film-canvas");
  const stage = pin.querySelector(".film-stage");
  if (!key || !count || !canvas || !stage) return () => {};

  const urls = Array.from(
    { length: count },
    (_, i) => `assets/frames/sections/${key}/frame_${String(i + 1).padStart(5, "0")}.webp`
  );

  const decodeW = parseInt(pin.dataset.filmDecode || "", 10) || SECTION_DECODE_W;
  const scrubber = new FrameScrubber(stage, canvas, urls, {
    decodeWidth: decodeW,
    priorityIndex: 0,
    debugLabel: key,
  });
  scrubber.bindResize();
  canvas.classList.add("is-active");

  const beats = Array.from(pin.querySelectorAll(".film-beat")).map((el) => ({
    el,
    in: parseBand(el.dataset.beatIn) || [0, 0.08],
    out: parseBand(el.dataset.beatOut),
  }));
  beats.forEach((b) => {
    b.el.style.opacity = "0";
    b.el.style.transform = "translateY(6px)";
  });

  const statRowBeat = pin.id === "act-proof" ? beats.find((b) => b.el.id === "stat-row") : null;

  let loaded = false;
  let loading = false;
  function ensureLoaded() {
    if (loaded) {
      scrubber.resumeTicker();
      return;
    }
    if (loading) return;
    loading = true;
    scrubber
      .load()
      .then(() => {
        loaded = true;
        loading = false;
        scrubber.setTargetFrame(0);
        scrubber.renderNow();
      })
      .catch(() => {
        loading = false;
      });
  }

  function applyPinState(p) {
    scrubber.setTargetFrame(Math.round(p * (count - 1)));
    scrubber.setFx({ scale: 1 + p * 0.015 });

    const leave = smoothBand(p, EXIT_BAND[0], EXIT_BAND[1]);
    const sceneOut = 1 - leave;
    if (stage) stage.style.opacity = String(sceneOut);

    for (let i = 0; i < beats.length; i++) {
      const b = beats[i];
      let v = smoothBand(p, b.in[0], b.in[1]);
      if (b.out) v *= 1 - smoothBand(p, b.out[0], b.out[1]);
      v *= sceneOut;
      b.el.style.opacity = String(v);
      b.el.style.transform = `translateY(${6 * (1 - v)}px)`;
    }

    if (statRowBeat) {
      const rowV = smoothBand(p, statRowBeat.in[0], statRowBeat.in[1]);
      if (rowV >= 0.5) runStatsCount();
    }
  }

  const loadST = window.ScrollTrigger.create({
    trigger: pin,
    start: "top bottom+=100%",
    end: "bottom top",
    onEnter: ensureLoaded,
    onEnterBack: ensureLoaded,
  });

  const pinST = window.ScrollTrigger.create({
    trigger: pin,
    start: "top top",
    end: `+=${vh}%`,
    pin: true,
    scrub: FILM_SCRUB,
    anticipatePin: 1,
    invalidateOnRefresh: true,
    onToggle: (self) => {
      if (self.isActive) {
        ensureLoaded();
        scrubber.resumeTicker();
        applyPinState(self.progress);
      } else {
        scrubber.pauseTicker();
      }
    },
    onEnter: () => applyPinState(pinST.progress),
    onEnterBack: () => applyPinState(pinST.progress),
    onUpdate: (self) => applyPinState(self.progress),
  });

  pin._filmPinST = pinST;

  if (loadST.isActive) ensureLoaded();

  return () => {
    pinST.kill();
    loadST.kill();
    delete pin._filmPinST;
    scrubber.releaseBitmaps();
  };
}

export function initFilmSections() {
  const pins = document.querySelectorAll(".film-pin");
  if (!pins.length) return () => {};
  const cleanups = Array.from(pins, initOne);
  return () => cleanups.forEach((fn) => fn?.());
}

/** Reduced motion / mobile: show the poster frame and reveal all copy,
    un-stacking any rotating slots so every beat is readable in flow. */
export function initFilmSectionsStatic() {
  document.querySelectorAll(".film-pin").forEach((pin) => {
    const key = pin.dataset.filmFrames;
    const stage = pin.querySelector(".film-stage");
    if (stage && key) {
      stage.style.backgroundImage = `url(assets/frames/sections/${key}/frame_00001.webp)`;
    }
    pin.classList.add("is-static");
    pin.querySelectorAll(".film-beat").forEach((el) => {
      el.style.opacity = "1";
      el.style.transform = "none";
    });
  });
}

/** Resolve the pinned ScrollTrigger for a film section id (used by progress rail). */
export function getFilmPinST(id) {
  const pin = document.getElementById(id);
  return pin?._filmPinST || null;
}
