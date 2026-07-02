import { splitHeadlineWords } from "./text-split.js?v=31";

const LOADER_CAP_MS = 2500;

export function initMotionUi() {
  const loader = document.getElementById("loader");
  const fill = document.getElementById("loader-fill");
  const pct = document.getElementById("loader-pct");
  const nav = document.getElementById("site-nav");
  const sticky = document.getElementById("sticky-cta");
  const cursor = document.getElementById("cursor");
  const finePointer = window.matchMedia("(pointer: fine)").matches;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
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
      Promise.all(tasks.map((t) => t().catch(() => {}))),
      new Promise((r) => setTimeout(r, LOADER_CAP_MS)),
    ]);
    setProgress(1);
    loader?.classList.add("is-done");
    loader?.setAttribute("aria-busy", "false");
    animateHeroIntro();
  }

  function animateHeroIntro() {
    const title = document.getElementById("hero-title");
    const sub = document.getElementById("hero-sub");
    const actions = document.getElementById("hero-actions");

    if (title) splitHeadlineWords(title);

    if (!window.gsap || reducedMotion) {
      document.querySelectorAll(".hero__title .char").forEach((c) => {
        c.style.opacity = "1";
        c.style.transform = "none";
      });
      if (sub) {
        sub.style.opacity = "1";
        sub.style.transform = "none";
      }
      if (actions) {
        actions.style.opacity = "1";
        actions.style.transform = "none";
      }
      return;
    }

    window.gsap.set(".hero__title .char", { opacity: 0, y: "1.1em" });
    const tl = window.gsap.timeline();
    tl.to(".hero__title .char", {
      opacity: 1,
      y: 0,
      duration: 0.8,
      stagger: 0.02,
      ease: "power3.out",
    });
    tl.to(
      ["#hero-sub", "#hero-actions"],
      {
        opacity: 1,
        y: 0,
        duration: 0.7,
        ease: "power2.out",
      },
      0.3
    );
  }

  if (finePointer && !reducedMotion && cursor) {
    const dot = cursor.querySelector(".cursor__dot");
    const ring = cursor.querySelector(".cursor__ring");
    let mx = 0;
    let my = 0;
    let rx = 0;
    let ry = 0;
    window.addEventListener("mousemove", (e) => {
      mx = e.clientX;
      my = e.clientY;
      if (dot) {
        dot.style.left = `${mx}px`;
        dot.style.top = `${my}px`;
      }
    });
    const tick = () => {
      rx += (mx - rx) * 0.15;
      ry += (my - ry) * 0.15;
      if (ring) {
        ring.style.left = `${rx}px`;
        ring.style.top = `${ry}px`;
      }
      requestAnimationFrame(tick);
    };
    tick();
    document.querySelectorAll("a, button, .btn").forEach((el) => {
      el.addEventListener("mouseenter", () => cursor.classList.add("is-hover"));
      el.addEventListener("mouseleave", () => cursor.classList.remove("is-hover"));
    });
  }

  if (finePointer && !reducedMotion) {
    document.querySelectorAll("[data-magnetic]").forEach((btn) => {
      btn.addEventListener("mousemove", (e) => {
        const r = btn.getBoundingClientRect();
        const dx = ((e.clientX - r.left) / r.width - 0.5) * 16;
        const dy = ((e.clientY - r.top) / r.height - 0.5) * 16;
        btn.style.transform = `translate(${Math.max(-8, Math.min(8, dx))}px, ${Math.max(-8, Math.min(8, dy))}px)`;
      });
      btn.addEventListener("mouseleave", () => {
        btn.style.transform = "";
      });
    });
  }

  if (window.ScrollTrigger && sticky && nav) {
    window.gsap.set(sticky, { autoAlpha: 0, y: 12 });

    window.ScrollTrigger.create({
      start: "100vh top",
      onEnter: () => nav.classList.add("is-solid"),
      onLeaveBack: () => nav.classList.remove("is-solid"),
    });

    const showPill = () => {
      window.gsap.to(sticky, { autoAlpha: 1, y: 0, duration: 0.35, ease: "power2.out" });
    };
    const hidePill = () => {
      window.gsap.to(sticky, { autoAlpha: 0, y: 12, duration: 0.35, ease: "power2.out" });
    };

    // CHANGE 5: single trigger from top of trust strip to top of Act 06.
    window.ScrollTrigger.create({
      trigger: "#trust-strip",
      start: "top 85%",
      endTrigger: "#act-work",
      end: "top 85%",
      onEnter: showPill,
      onLeave: hidePill,
      onEnterBack: showPill,
      onLeaveBack: hidePill,
    });
  }

  document.fonts?.ready?.then(() => setProgress(0.1)).catch(() => {});

  return { setProgress, track, finish };
}
