import { FrameScrubber, decodeTierWidth } from "./frame-scrub.js?v=67";

const SECTION_DECODE_W = 900;
const KEEP_DECODED_DISTANCE = 1;
const SCRAMBLE_CHARS = "01アイウエオカキクケコ代入乱码数据系统追踪构建";

export const appState = {
  hero: null,
  scrubbers: [],
  scrubRecords: [],
  lenis: null,
  atmosphere: null,
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
  return window.DWF_CDN?.acts?.act0 || [];
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
  const lenis = new window.Lenis({
    autoRaf: false,
    duration: 1.15,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
  });
  appState.lenis = lenis;
  window.lenis = lenis;
  lenis.on("scroll", window.ScrollTrigger.update);
  window.gsap.ticker.add((time) => lenis.raf(time * 1000));
  window.gsap.ticker.lagSmoothing(0);
  return lenis;
}

function initGlobalProgress() {
  const fill = document.getElementById("scroll-progress-fill");
  if (!fill) return;
  window.gsap.to(fill, {
    width: "100%",
    ease: "none",
    scrollTrigger: {
      trigger: document.body,
      start: "top top",
      end: "bottom bottom",
      scrub: 0.18,
    },
  });
}

function initMagneticCards() {
  document
    .querySelectorAll(".diagnostic-grid article, .proof-grid article, .method-grid article, .fit-card, .apply-card, .proof-feature")
    .forEach((card) => {
      card.addEventListener("pointermove", (event) => {
        const rect = card.getBoundingClientRect();
        card.style.setProperty("--mx", `${event.clientX - rect.left}px`);
        card.style.setProperty("--my", `${event.clientY - rect.top}px`);
      });
    });
}

function initReveals() {
  window.gsap.utils.toArray(".section-meta, .section-title, .final-title, .final-sub, .reveal-panel").forEach((el) => {
    window.gsap.fromTo(
      el,
      { autoAlpha: 0, y: 28 },
      {
        autoAlpha: 1,
        y: 0,
        duration: 0.75,
        ease: "power3.out",
        scrollTrigger: { trigger: el, start: "top 86%", once: true },
      }
    );
  });

  window.gsap.utils.toArray(".reveal-group").forEach((group) => {
    window.gsap.fromTo(
      Array.from(group.children),
      { autoAlpha: 0, y: 34 },
      {
        autoAlpha: 1,
        y: 0,
        duration: 0.75,
        stagger: 0.08,
        ease: "power3.out",
        scrollTrigger: { trigger: group, start: "top 84%", once: true },
      }
    );
  });
}

function scrambleTo(el, finalText, { duration = 0.65 } = {}) {
  if (!window.gsap || !finalText) return;
  const chars = SCRAMBLE_CHARS;
  const state = { progress: 0 };
  window.gsap.to(state, {
    progress: 1,
    duration,
    ease: "power3.out",
    onUpdate: () => {
      const settled = Math.floor(finalText.length * state.progress);
      let next = "";
      for (let i = 0; i < finalText.length; i++) {
        const ch = finalText[i];
        if (ch === " ") {
          next += " ";
        } else if (i < settled) {
          next += ch;
        } else {
          next += chars[Math.floor(Math.random() * chars.length)];
        }
      }
      el.textContent = next;
    },
    onComplete: () => {
      el.textContent = finalText;
    },
  });
}

function initScrambleText() {
  document.querySelectorAll("[data-scramble]").forEach((el) => {
    const finalText = el.textContent.trim();
    el.dataset.finalText = finalText;
    el.addEventListener("mouseenter", () => scrambleTo(el, finalText, { duration: 0.42 }));
    el.addEventListener("focus", () => scrambleTo(el, finalText, { duration: 0.42 }));
  });

  document.querySelectorAll(".glitch").forEach((el) => {
    el.addEventListener("mouseenter", () => {
      el.classList.add("is-glitching");
      window.setTimeout(() => el.classList.remove("is-glitching"), 420);
    });
  });
}

function initHeroMotion() {
  window.gsap.fromTo(
    ".hero-copy > *",
    { autoAlpha: 0, y: 24 },
    { autoAlpha: 1, y: 0, duration: 0.95, stagger: 0.08, ease: "power3.out", delay: 0.2 }
  );
  window.gsap.to(".site-nav", {
    autoAlpha: 0.42,
    y: -12,
    ease: "none",
    scrollTrigger: { trigger: "#hero-pin", start: "top top", end: "bottom top", scrub: true },
  });
}

function initThreeAtmosphere({ reduced, mobile, saveData }) {
  const canvas = document.getElementById("webgl-atmosphere");
  if (!canvas || reduced || mobile || saveData || !window.THREE) return null;

  const THREE = window.THREE;
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 100);
  camera.position.z = 6;

  const count = 180;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const gold = new THREE.Color(0xd9a84d);
  const red = new THREE.Color(0xc9442d);
  for (let i = 0; i < count; i++) {
    const ix = i * 3;
    positions[ix] = (Math.random() - 0.5) * 12;
    positions[ix + 1] = (Math.random() - 0.5) * 7;
    positions[ix + 2] = (Math.random() - 0.5) * 5;
    const c = i % 5 === 0 ? red : gold;
    colors[ix] = c.r;
    colors[ix + 1] = c.g;
    colors[ix + 2] = c.b;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  const material = new THREE.PointsMaterial({
    size: 0.025,
    vertexColors: true,
    transparent: true,
    opacity: 0.72,
    depthWrite: false,
  });
  const points = new THREE.Points(geometry, material);
  scene.add(points);

  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  }
  resize();
  window.addEventListener("resize", resize);

  const clock = new THREE.Clock();
  function tick() {
    const t = clock.getElapsedTime();
    points.rotation.y = t * 0.045;
    points.rotation.x = Math.sin(t * 0.2) * 0.045;
    renderer.render(scene, camera);
  }
  window.gsap.ticker.add(tick);

  const atmosphere = {
    setIntensity(value) {
      material.opacity = 0.38 + Math.max(0, Math.min(1, value)) * 0.34;
    },
    destroy() {
      window.gsap.ticker.remove(tick);
      window.removeEventListener("resize", resize);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    },
  };
  appState.atmosphere = atmosphere;
  return atmosphere;
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
  const index = appState.scrubRecords.length;

  let loaded = false;
  let loading = false;
  let loadPromise = null;
  let loadGeneration = 0;
  const load = async (onProgress) => {
    if (loaded) return;
    if (loading && loadPromise) return loadPromise;
    loading = true;
    const generation = loadGeneration;
    loadPromise = scrubber
      .load(onProgress)
      .then(() => {
        if (generation !== loadGeneration) return;
        loaded = true;
        scrubber.setTargetFrame(0);
        scrubber.renderNow();
      })
      .finally(() => {
        if (generation === loadGeneration) loading = false;
      });
    return loadPromise;
  };
  const release = () => {
    loadGeneration++;
    loaded = false;
    loading = false;
    loadPromise = null;
    scrubber.releaseBitmaps();
  };

  const record = { section, scrubber, load, release, index };
  appState.scrubRecords.push(record);

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
        manageScrubMemory(index);
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
      appState.atmosphere?.setIntensity(isHero ? p : 0.45 + p * 0.35);
    },
  });

  section._scrubST = pinST;
  if (loadST.isActive || eager) load();

  return () => {
    loadST.kill();
    pinST.kill();
    release();
  };
}

function manageScrubMemory(activeIndex) {
  appState.scrubRecords.forEach((record) => {
    if (Math.abs(record.index - activeIndex) > KEEP_DECODED_DISTANCE) {
      record.release();
    }
  });
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
      onStart: () => {
        el.classList.add("is-glitching");
      },
      onUpdate: () => {
        const value = `${decimals ? obj.value.toFixed(decimals) : Math.round(obj.value)}${suffix}`;
        if (Math.random() > 0.72 && obj.value < target * 0.92) {
          const noise = Array.from({ length: Math.max(2, value.length) }, () => SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)]).join("");
          el.textContent = noise;
        } else {
          el.textContent = value;
        }
      },
      onComplete: () => {
        el.classList.remove("is-glitching");
        el.textContent = `${decimals ? target.toFixed(decimals) : Math.round(target)}${suffix}`;
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
  initMagneticCards();
  initScrambleText();

  if (reduced || mobile || saveData) {
    loader.setProgress(0.5);
    sections.forEach(setStaticAct);
    await loader.finish();
    bindAnchors(null);
    initStats();
    initGlobalProgress();
    initReveals();
    window.ScrollTrigger.refresh();
    return;
  }

  initThreeAtmosphere({ reduced, mobile, saveData });
  const hero = document.getElementById("hero-pin");
  sections.forEach((section) => initScrub(section, { loader, eager: section === hero }));

  await loader.finish();
  const lenis = initLenis(reduced);
  bindAnchors(lenis);
  initStats();
  initGlobalProgress();
  initHeroMotion();
  initReveals();
  await document.fonts.ready;
  window.ScrollTrigger.refresh();
}

init().catch((err) => {
  console.error("cinema-app init failed", err);
  document.getElementById("loader")?.classList.add("is-done");
});
