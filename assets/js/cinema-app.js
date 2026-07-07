import { FrameScrubber, decodeTierWidth } from "./frame-scrub.js?v=64";

const SECTION_DECODE_W = 900;

export const appState = {
  hero: null,
  scrubbers: [],
  lenis: null,
};

window.__cinemaState = appState;

function halve(arr) {
  return arr.filter((_, i) => i % 2 === 0);
}

function connectionSaveData() {
  const c = navigator.connection || navigator.webkitConnection || navigator.mozConnection;
  if (!c) return false;
  if (c.saveData) return true;
  const et = String(c.effectiveType || "");
  return et === "slow-2g" || et === "2g" || et === "3g";
}

function heroUrls() {
  return halve(window.DWF_CDN?.acts?.act0 || []);
}

function sectionUrls(key, count) {
  return Array.from(
    { length: count },
    (_, i) => `assets/frames/sections/${key}/frame_${String(i + 1).padStart(5, "0")}.webp`
  );
}

function initLoader() {
  const loader = document.getElementById("loader");
  const fill = document.getElementById("loader-fill");
  const pct = document.getElementById("loader-pct");
  const tasks = [];

  function setProgress(v) {
    const n = Math.round(Math.max(0, Math.min(1, v)) * 100);
    if (fill) fill.style.width = `${n}%`;
    if (pct) pct.textContent = `${n}%`;
  }

  function track(fn) {
    tasks.push(fn);
  }

  async function finish() {
    await Promise.race([
      Promise.all(tasks.map((fn) => fn().catch(() => {}))),
      new Promise((resolve) => setTimeout(resolve, 2600)),
    ]);
    setProgress(1);
    loader?.classList.add("is-done");
    loader?.setAttribute("aria-busy", "false");
  }

  return { setProgress, track, finish };
}

function initLenis(reduced) {
  if (reduced || !window.Lenis) return null;
  const lenis = new window.Lenis({ autoRaf: false });
  appState.lenis = lenis;
  window.lenis = lenis;
  lenis.on("scroll", window.ScrollTrigger.update);
  window.gsap.ticker.add((time) => lenis.raf(time * 1000));
  window.gsap.ticker.lagSmoothing(0);
  return lenis;
}

function bindAnchors(lenis) {
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (event) => {
      const href = a.getAttribute("href");
      if (!href || href.length < 2) return;
      const target = document.querySelector(href);
      if (!target) return;
      event.preventDefault();
      if (lenis) lenis.scrollTo(target, { offset: 0 });
      else target.scrollIntoView({ behavior: "smooth" });
    });
  });
}

function setStaticAct(section) {
  const stage = section.querySelector(".scrub-stage");
  const canvas = section.querySelector(".scrub-canvas");
  const cdnKey = section.dataset.cdnKey;
  const filmKey = section.dataset.filmFrames;
  let url = "";
  if (cdnKey) url = window.DWF_CDN?.acts?.[cdnKey]?.[0] || "";
  if (filmKey) url = `assets/frames/sections/${filmKey}/frame_00001.webp`;
  if (stage && url) stage.style.backgroundImage = `url(${url})`;
  canvas?.classList.remove("is-active");
  section.classList.add("is-static");
}

function buildUrls(section) {
  if (section.dataset.cdnKey) return heroUrls();
  const key = section.dataset.filmFrames;
  const count = parseInt(section.dataset.filmCount || "0", 10);
  if (!key || !count) return [];
  return sectionUrls(key, count);
}

function initScrub(section, { loader, eager = false } = {}) {
  const stage = section.querySelector(".scrub-stage");
  const canvas = section.querySelector(".scrub-canvas");
  const urls = buildUrls(section);
  if (!stage || !canvas || !urls.length) return () => {};

  const isHero = section.id === "hero-pin";
  const decodeWidth = isHero ? decodeTierWidth() : parseInt(section.dataset.filmDecode || "", 10) || SECTION_DECODE_W;
  const scrubber = new FrameScrubber(stage, canvas, urls, {
    decodeWidth,
    priorityIndex: 0,
    debugLabel: section.id || section.dataset.filmFrames || "scrub",
  });
  scrubber.bindResize();
  canvas.classList.add("is-active");
  appState.scrubbers.push(scrubber);
  if (isHero) appState.hero = scrubber;

  let loaded = false;
  let loading = false;
  let loadPromise = null;
  const load = async (onProgress) => {
    if (loaded) return;
    if (loading && loadPromise) return loadPromise;
    loading = true;
    loadPromise = scrubber
      .load(onProgress)
      .then(() => {
        loaded = true;
        scrubber.setTargetFrame(0);
        scrubber.renderNow();
      })
      .finally(() => {
        loading = false;
      });
    return loadPromise;
  };

  if (eager) {
    loader?.track(() => load((p) => loader.setProgress(0.1 + p * 0.85)));
  }

  const loadST = window.ScrollTrigger.create({
    trigger: section,
    start: "top bottom+=80%",
    end: "bottom top",
    onEnter: () => load(),
    onEnterBack: () => load(),
  });

  const pinST = window.ScrollTrigger.create({
    trigger: section,
    start: "top top",
    end: `+=${parseInt(section.dataset.vh || "180", 10)}%`,
    pin: true,
    scrub: isHero ? 0.2 : 0.12,
    anticipatePin: 1,
    invalidateOnRefresh: true,
    onToggle: (self) => {
      if (self.isActive) {
        load().then(() => scrubber.resumeTicker());
      } else {
        scrubber.pauseTicker();
      }
    },
    onUpdate: (self) => {
      const p = self.progress;
      scrubber.setTargetFrame(Math.round(p * (urls.length - 1)));
      scrubber.setFx({ scale: 1 + p * (isHero ? 0.04 : 0.012), offsetY: isHero ? -p * 12 : 0, offsetX: 0 });
      section.style.setProperty("--progress", String(p));
    },
  });

  section._scrubST = pinST;
  if (loadST.isActive || eager) load();

  return () => {
    loadST.kill();
    pinST.kill();
    scrubber.releaseBitmaps();
  };
}

function initStats() {
  document.querySelectorAll("[data-count]").forEach((el) => {
    const target = parseFloat(el.getAttribute("data-count"));
    if (!isFinite(target)) return;
    const suffix = el.getAttribute("data-suffix") || "";
    const decimals = parseInt(el.getAttribute("data-decimal") || "0", 10);
    const obj = { value: 0 };
    window.gsap.to(obj, {
      value: target,
      duration: 1.2,
      ease: "power3.out",
      scrollTrigger: { trigger: el, start: "top 85%", once: true },
      onUpdate: () => {
        el.textContent = `${decimals ? obj.value.toFixed(decimals) : Math.round(obj.value)}${suffix}`;
      },
    });
  });
}

async function init() {
  if (!window.gsap || !window.ScrollTrigger) {
    console.error("GSAP ScrollTrigger required");
    return;
  }

  window.gsap.registerPlugin(window.ScrollTrigger, window.ScrollToPlugin);

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const mobile = window.matchMedia("(max-width: 899px)").matches;
  const saveData = connectionSaveData();
  const loader = initLoader();
  const sections = Array.from(document.querySelectorAll("[data-scrub]"));

  if (reduced || mobile || saveData) {
    loader.setProgress(0.5);
    sections.forEach(setStaticAct);
    await loader.finish();
    bindAnchors(null);
    initStats();
    window.ScrollTrigger.refresh();
    return;
  }

  const hero = document.getElementById("hero-pin");
  sections.forEach((section) => initScrub(section, { loader, eager: section === hero }));

  await loader.finish();
  const lenis = initLenis(reduced);
  bindAnchors(lenis);
  initStats();
  await document.fonts.ready;
  window.ScrollTrigger.refresh();
}

init().catch((err) => {
  console.error("cinema-app init failed", err);
  document.getElementById("loader")?.classList.add("is-done");
});
