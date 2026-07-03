import { FrameScrubber, decodeTierWidth } from "./frame-scrub.js?v=42";
import { initHeroPin } from "./hero-pin.js?v=42";
import { initMachinePin } from "./machine-pin.js?v=42";
import { initLoader, initNav, initCursor, initMagnetic, initStickyPill } from "./motion-ui.js?v=42";
import { initSections } from "./sections.js?v=42";
import { initMobileLite } from "./mobile-lite.js?v=42";
import { initProgressRail } from "./progress-rail.js?v=42";

const DECODED_BUDGET_MB = 600;

export const appState = {
  scrubber: null,
  machineScrubber: null,
  lenis: null,
};

// Debug/QA hook: inspect decoded-memory + scrubber state from the console.
window.__cinemaState = appState;

/* Phase 3.1: use every second frame (halve the sequence). */
function halve(arr) {
  return arr.filter((_, i) => i % 2 === 0);
}

function isLocal() {
  return (
    location.hostname === "localhost" ||
    location.hostname === "127.0.0.1" ||
    location.port === "8766"
  );
}

function buildUrls(actKey, localDir) {
  const acts = window.DWF_CDN?.acts ?? {};
  const count = acts[actKey]?.length ?? 0;
  if (!count) return [];
  const full = isLocal()
    ? Array.from(
        { length: count },
        (_, i) => `assets/frames/cinema/${localDir}/frame_${String(i + 1).padStart(5, "0")}.webp`
      )
    : acts[actKey];
  return halve(full);
}

function connectionSaveData() {
  const c = navigator.connection || navigator.webkitConnection || navigator.mozConnection;
  if (!c) return false;
  if (c.saveData) return true;
  const et = String(c.effectiveType || "");
  return et === "slow-2g" || et === "2g" || et === "3g";
}

function logDecodedMemory(label = "") {
  const bytes =
    (appState.scrubber?.decodedBytes?.() || 0) + (appState.machineScrubber?.decodedBytes?.() || 0);
  const mb = bytes / (1024 * 1024);
  console.info(
    `[frames] decoded memory ${mb.toFixed(0)}MB / budget ${DECODED_BUDGET_MB}MB${label ? " — " + label : ""}`
  );
}

function initLenis(reduce) {
  if (reduce || !window.Lenis) return null;
  const lenis = new window.Lenis({ autoRaf: false });
  window.lenis = lenis;
  appState.lenis = lenis;
  lenis.on("scroll", window.ScrollTrigger.update);
  window.gsap.ticker.add((time) => lenis.raf(time * 1000));
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
      if (lenis) lenis.scrollTo(target, { offset: 0 });
      else target.scrollIntoView({ behavior: "smooth" });
    });
  });
}

function setStatsFinal() {
  document.querySelectorAll("[data-count]").forEach((el) => {
    const target = parseFloat(el.getAttribute("data-count"));
    const suffix = el.getAttribute("data-suffix") || "";
    const decimals = parseInt(el.getAttribute("data-decimal") || "0", 10);
    el.textContent = (decimals ? target.toFixed(decimals) : String(Math.round(target))) + suffix;
  });
}

async function init() {
  if (!window.gsap || !window.ScrollTrigger) {
    console.error("GSAP ScrollTrigger required");
    return;
  }
  window.gsap.registerPlugin(window.ScrollTrigger, window.ScrollToPlugin);
  if (window.SplitText) window.gsap.registerPlugin(window.SplitText);

  const heroCanvas = document.getElementById("scrub-canvas");
  const machineCanvas = document.getElementById("machine-canvas");
  const hero = document.getElementById("hero");

  const heroUrls = buildUrls("act0", "act0");
  const machineUrls = buildUrls("act2", "act2");
  const tier = decodeTierWidth();

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const mobile = window.matchMedia("(max-width: 899px)").matches;
  const saveData = connectionSaveData();

  const loader = initLoader();
  initNav();

  // Phase 3.3: the hero sequence loads immediately and gates the loader
  // (desktop only; mobile-lite/reduced use static keyframes/posters).
  const wantFullHero = !reduce && !mobile && heroCanvas && hero && heroUrls.length;
  if (wantFullHero) {
    const scrubber = new FrameScrubber(hero, heroCanvas, heroUrls, {
      decodeWidth: tier,
      priorityIndex: 0,
    });
    appState.scrubber = scrubber;
    scrubber.bindResize();
    loader.track(async () => {
      await scrubber.load((p) => loader.setProgress(0.1 + p * 0.85));
      scrubber.setTargetFrame(0);
      logDecodedMemory("hero loaded");
    });
  } else {
    loader.setProgress(0.5);
  }

  await loader.finish();

  const lenis = initLenis(reduce);
  bindAnchorScroll(lenis);

  // Phase 4.3: a single gsap.matchMedia() block, three contexts.
  const mm = window.gsap.matchMedia();
  mm.add(
    {
      desktop: "(min-width: 900px) and (prefers-reduced-motion: no-preference)",
      mobileCtx: "(max-width: 899px) and (prefers-reduced-motion: no-preference)",
      reduced: "(prefers-reduced-motion: reduce)",
    },
    (ctx) => {
      const { desktop, mobileCtx, reduced } = ctx.conditions;

      if (reduced) {
        document.getElementById("hero-poster")?.classList.remove("is-hidden");
        document.getElementById("scrub-canvas")?.classList.remove("is-active");
        initSections({ reducedMotion: true });
        setStatsFinal();
        return () => {};
      }

      if (mobileCtx) {
        const liteCleanup = initMobileLite({ heroUrls, machineUrls, saveData });
        initSections({ reducedMotion: false });
        const pill = initStickyPill();
        window.ScrollTrigger.refresh();
        return () => {
          liteCleanup?.();
          pill?.kill?.();
        };
      }

      if (desktop) {
        if (appState.scrubber) {
          initHeroPin({ scrubber: appState.scrubber, reducedMotion: false });
        } else {
          document.getElementById("hero-poster")?.classList.remove("is-hidden");
        }
        initSections({ reducedMotion: false });
        const pill = initStickyPill();
        const railCleanup = initProgressRail({ lenis });
        const cursorCleanup = initCursor();
        const magneticCleanup = initMagnetic();
        const machineCtl = setupMachineLazy(machineUrls, machineCanvas, tier);
        window.ScrollTrigger.refresh();
        return () => {
          pill?.kill?.();
          railCleanup?.();
          cursorCleanup?.();
          magneticCleanup?.();
          machineCtl?.kill?.();
        };
      }

      return () => {};
    }
  );

  await document.fonts.ready;
  window.ScrollTrigger.refresh();
}

/**
 * Phase 3.3/3.4: machine sequence loads only when Act 01 enters the viewport.
 * On load, the hero sequence bitmaps are released first so only one full
 * sequence is decoded at rest (kept under the 600MB budget). Scrolling back up
 * above the machine pin releases the machine and the hero pin re-decodes.
 */
function setupMachineLazy(machineUrls, machineCanvas, tier) {
  if (!machineCanvas || !machineUrls.length) {
    machineCanvas?.setAttribute("aria-hidden", "true");
    if (machineCanvas) machineCanvas.style.visibility = "hidden";
    return null;
  }

  let started = false;
  let machineST = null;
  let releaseST = null;

  const loadTrigger = window.ScrollTrigger.create({
    trigger: "#act-leak",
    start: "top bottom",
    onEnter: () => {
      if (started) return;
      started = true;
      // Free the hero sequence first so we never hold both decoded.
      appState.scrubber?.releaseBitmaps?.();
      logDecodedMemory("hero released, machine loading");

      const scrubber = new FrameScrubber(
        document.getElementById("act-machine"),
        machineCanvas,
        machineUrls,
        { decodeWidth: tier, priorityIndex: 0, debugLabel: "machine" }
      );
      appState.machineScrubber = scrubber;
      scrubber.bindResize();
      console.info(
        `[machine-canvas] lazy load begins at Act 01, ${machineUrls.length} frames (halved), tier ${tier}px`
      );
      scrubber
        .load()
        .then(() => {
          scrubber.setTargetFrame(0);
          scrubber.renderNow?.();
          machineST = initMachinePin({ machineScrubber: scrubber, reducedMotion: false });
          logDecodedMemory("machine loaded");
          window.ScrollTrigger.refresh();

          // Release machine when scrolling back up above its pin; the hero pin's
          // onToggle re-decodes the hero as it re-enters.
          releaseST = window.ScrollTrigger.create({
            trigger: "#machine-pin",
            start: "top bottom",
            onLeaveBack: () => {
              appState.machineScrubber?.releaseBitmaps?.();
              logDecodedMemory("machine released (scrolled back to hero)");
            },
          });
        })
        .catch((err) => console.warn("machine preload failed", err));
    },
  });

  return {
    kill: () => {
      loadTrigger.kill();
      machineST?.kill?.();
      releaseST?.kill?.();
    },
  };
}

init().catch((err) => {
  console.error("cinema-app init failed", err);
  document.getElementById("loader")?.classList.add("is-done");
});
