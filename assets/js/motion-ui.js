const LOADER_CAP_MS = 2500;

/* Loader + hero intro. Returns the loader control API. */
export function initLoader() {
  const loader = document.getElementById("loader");
  const fill = document.getElementById("loader-fill");
  const pct = document.getElementById("loader-pct");
  const status = document.getElementById("loader-status");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const tasks = [];
  const stages = [
    [0.12, "Boot sequence"],
    [0.35, "Warming optics"],
    [0.62, "Loading frames"],
    [0.88, "Syncing motion"],
    [0.99, "Arming scroll"],
    [1, "Ready"],
  ];

  function setProgress(v) {
    const clamped = Math.max(0, Math.min(1, v));
    const n = Math.round(clamped * 100);
    if (fill) fill.style.width = `${n}%`;
    if (pct) pct.textContent = String(n).padStart(3, "0");
    if (status) {
      const stage = stages.find(([threshold]) => clamped <= threshold) || stages[stages.length - 1];
      status.textContent = stage[1];
    }
  }

  function track(fn) {
    tasks.push(fn);
  }

  async function finish() {
    await Promise.race([
      Promise.all(tasks.map((t) => t().catch(() => {}))),
      new Promise((r) => setTimeout(r, LOADER_CAP_MS)),
    ]);
    setProgress(1);
    loader?.classList.add("is-exiting");
    await new Promise((r) => setTimeout(r, 180));
    loader?.classList.add("is-done");
    loader?.setAttribute("aria-busy", "false");
    animateHeroIntro(reducedMotion);
  }

  document.fonts?.ready?.then(() => setProgress(0.1)).catch(() => {});

  return { setProgress, track, finish };
}

function animateHeroIntro(reducedMotion) {
  const title = document.getElementById("hero-title");
  const sub = document.getElementById("hero-sub");
  const heroProof = document.querySelector(".hero-proof");
  const actions = document.getElementById("hero-actions");
  const gsap = window.gsap;

  const showStatic = () => {
    if (title) {
      title.style.opacity = "1";
      title.querySelectorAll(".char").forEach((c) => {
        c.style.opacity = "1";
        c.style.transform = "none";
      });
    }
    [sub, heroProof, actions].forEach((el) => {
      if (el) {
        el.style.opacity = "1";
        el.style.transform = "none";
      }
    });
  };

  if (!gsap || reducedMotion || !window.SplitText || !title) {
    showStatic();
    return;
  }

  const name = document.getElementById("hero-name");
  const desktop = window.matchMedia("(min-width: 900px)").matches;

  if (desktop && name) {
    // Founder hero: the load moment belongs to the giant name. The h1
    // lines, sub, and actions enter later on scroll beats (hero-pin.js).
    gsap.set([title, sub, heroProof, actions], { opacity: 0 });
    const split = new window.SplitText(name, { type: "chars", charsClass: "char" });
    gsap.set(name, { opacity: 1 });
    gsap.set(split.chars, { opacity: 0, yPercent: 60 });
    gsap.to(split.chars, {
      opacity: 1,
      yPercent: 0,
      duration: 0.9,
      stagger: 0.05,
      ease: "power3.out",
    });
    return;
  }

  // Mobile: classic intro, full copy readable immediately.
  const split = new window.SplitText(title, {
    type: "words,chars",
    charsClass: "char",
    wordsClass: "word",
  });
  title.style.opacity = "1";
  gsap.set(split.chars, { opacity: 0, yPercent: 110 });
  const tl = gsap.timeline();
  tl.to(split.chars, {
    opacity: 1,
    yPercent: 0,
    duration: 0.8,
    stagger: 0.02,
    ease: "power3.out",
  });
  tl.to(
    ["#hero-sub", ".hero-proof", "#hero-actions"],
    { opacity: 1, y: 0, duration: 0.7, ease: "power2.out" },
    0.3
  );
}

/* Nav goes solid after the first viewport. Global (no motion cost). */
export function initNav() {
  const nav = document.getElementById("site-nav");
  if (!window.ScrollTrigger || !nav) return;
  window.ScrollTrigger.create({
    start: "100vh top",
    onEnter: () => nav.classList.add("is-solid"),
    onLeaveBack: () => nav.classList.remove("is-solid"),
  });
}

/* Phase 4.5: custom cursor via gsap.quickTo. Returns cleanup. */
export function initCursor() {
  const cursor = document.getElementById("cursor");
  const gsap = window.gsap;
  if (!cursor || !gsap) return () => {};
  const dot = cursor.querySelector(".cursor__dot");
  const ring = cursor.querySelector(".cursor__ring");

  const ringX = gsap.quickTo(ring, "left", { duration: 0.4, ease: "power3" });
  const ringY = gsap.quickTo(ring, "top", { duration: 0.4, ease: "power3" });

  const onMove = (e) => {
    if (dot) {
      dot.style.left = `${e.clientX}px`;
      dot.style.top = `${e.clientY}px`;
    }
    ringX(e.clientX);
    ringY(e.clientY);
  };
  window.addEventListener("mousemove", onMove);

  const hoverEls = Array.from(document.querySelectorAll("a, button, .btn"));
  const enter = () => cursor.classList.add("is-hover");
  const leave = () => cursor.classList.remove("is-hover");
  hoverEls.forEach((el) => {
    el.addEventListener("mouseenter", enter);
    el.addEventListener("mouseleave", leave);
  });

  return () => {
    window.removeEventListener("mousemove", onMove);
    hoverEls.forEach((el) => {
      el.removeEventListener("mouseenter", enter);
      el.removeEventListener("mouseleave", leave);
    });
  };
}

/* Phase 4.5: magnetic buttons via gsap.quickTo. Returns cleanup. */
export function initMagnetic() {
  const gsap = window.gsap;
  if (!gsap) return () => {};
  const cleanups = [];
  document.querySelectorAll("[data-magnetic]").forEach((btn) => {
    const xTo = gsap.quickTo(btn, "x", { duration: 0.4, ease: "power3" });
    const yTo = gsap.quickTo(btn, "y", { duration: 0.4, ease: "power3" });
    const move = (e) => {
      const r = btn.getBoundingClientRect();
      const dx = ((e.clientX - r.left) / r.width - 0.5) * 16;
      const dy = ((e.clientY - r.top) / r.height - 0.5) * 16;
      xTo(Math.max(-8, Math.min(8, dx)));
      yTo(Math.max(-8, Math.min(8, dy)));
    };
    const reset = () => {
      xTo(0);
      yTo(0);
    };
    btn.addEventListener("mousemove", move);
    btn.addEventListener("mouseleave", reset);
    cleanups.push(() => {
      btn.removeEventListener("mousemove", move);
      btn.removeEventListener("mouseleave", reset);
      gsap.set(btn, { x: 0, y: 0 });
    });
  });
  return () => cleanups.forEach((fn) => fn());
}

/**
 * Phase 4.2: sticky pill, plain trigger logic.
 * Show after the trust strip has scrolled past, hide when Act 06 enters.
 * With the #trust-strip negative-margin hack removed, positions resolve cleanly
 * without refreshPriority tricks or deferred creation. Returns the ScrollTrigger.
 */
export function initStickyPill() {
  const sticky = document.getElementById("sticky-cta");
  if (!window.ScrollTrigger || !sticky) return null;
  window.gsap.set(sticky, { autoAlpha: 0, y: 12 });

  const show = () => window.gsap.to(sticky, { autoAlpha: 1, y: 0, duration: 0.35, ease: "power2.out" });
  const hide = () => window.gsap.to(sticky, { autoAlpha: 0, y: 12, duration: 0.35, ease: "power2.out" });

  return window.ScrollTrigger.create({
    trigger: "#trust-strip",
    start: "bottom top",
    endTrigger: "#act-work",
    end: "top center",
    onToggle: (self) => (self.isActive ? show() : hide()),
  });
}
