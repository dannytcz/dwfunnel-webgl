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

  let baseProgress = 0.15;
  let assetProgress = 0.15;
  const start = performance.now();
  const tasks = [];

  function setProgress(v) {
    assetProgress = Math.max(assetProgress, Math.min(1, v));
    const n = Math.round(assetProgress * 100);
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
    if (!window.gsap || reducedMotion) {
      document.querySelectorAll(".hero__title .char").forEach((c) => {
        c.style.opacity = "1";
        c.style.transform = "none";
      });
      const sub = document.getElementById("hero-sub");
      const actions = document.getElementById("hero-actions");
      if (sub) { sub.style.opacity = "1"; sub.style.transform = "none"; }
      if (actions) { actions.style.opacity = "1"; actions.style.transform = "none"; }
      return;
    }
    const title = document.getElementById("hero-title");
    if (title && !title.querySelector(".char")) {
      const text = title.textContent;
      title.textContent = "";
      text.split("").forEach((ch) => {
        const span = document.createElement("span");
        span.className = "char";
        span.textContent = ch === " " ? "\u00a0" : ch;
        title.appendChild(span);
      });
    }
    const tl = window.gsap.timeline();
    tl.to(".hero__title .char", {
      opacity: 1,
      y: 0,
      duration: 0.8,
      stagger: 0.02,
      ease: "power3.out",
    });
    tl.to(["#hero-sub", "#hero-actions"], {
      opacity: 1,
      y: 0,
      duration: 0.7,
      ease: "power2.out",
    }, 0.3);
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
    window.ScrollTrigger.create({
      start: "100vh top",
      onEnter: () => nav.classList.add("is-solid"),
      onLeaveBack: () => nav.classList.remove("is-solid"),
    });
    window.ScrollTrigger.create({
      trigger: "#act-leak",
      start: "bottom 80%",
      onEnter: () => sticky.classList.add("is-visible"),
      onLeaveBack: () => sticky.classList.remove("is-visible"),
    });
    window.ScrollTrigger.create({
      trigger: "#act-work",
      start: "top 85%",
      end: "bottom top",
      onEnter: () => sticky.classList.add("is-hidden"),
      onLeave: () => sticky.classList.remove("is-hidden"),
      onEnterBack: () => sticky.classList.add("is-hidden"),
      onLeaveBack: () => sticky.classList.remove("is-hidden"),
    });
  }

  document.fonts?.ready?.then(() => setProgress(0.25)).catch(() => {});

  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      const id = a.getAttribute("href");
      if (!id || id.length < 2) return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      if (window.gsap?.to) {
        window.gsap.to(window, {
          duration: 1,
          ease: "power2.inOut",
          scrollTo: { y: target, autoKill: true },
        });
      } else {
        target.scrollIntoView({ behavior: "smooth" });
      }
    });
  });

  return { setProgress, track, finish, baseProgress };
}
