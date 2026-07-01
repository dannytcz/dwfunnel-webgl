// Post-cinematic GSAP ScrollTriggers — fade-up reveals per section.

const prefersReducedMotion =
  typeof window !== "undefined" &&
  window.matchMedia &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function animateCounter(el) {
  const target = parseInt(el.getAttribute("data-count"), 10) || 0;
  if (!target) return;
  if (prefersReducedMotion || !window.gsap) {
    el.textContent = String(target);
    return;
  }
  const obj = { v: 0 };
  window.gsap.to(obj, {
    v: target,
    duration: 1.4,
    ease: "power2.out",
    onUpdate: () => {
      el.textContent = String(Math.round(obj.v));
    },
  });
}

function buildSectionTimeline(section) {
  if (!window.gsap) return;
  const eyebrow = section.querySelector(".cinema-copy__eyebrow");
  const h2 = section.querySelector("h2");
  const lead = section.querySelector(".cinema-section__lead, .cinema-copy__lede");
  const rows = section.querySelectorAll(
    ".cinema-system__row, .cinema-card, .platforms-list__item, .process-step, .testimonial, .contact-cta, .agitate-list__item, .transform-list__item"
  );
  const midCta = section.querySelector(".cinema-section__cta-mid");
  const urgency = section.querySelector(".contact-cta__urgency");

  const tl = window.gsap.timeline({
    scrollTrigger: {
      trigger: section,
      start: "top 82%",
      once: true,
    },
  });

  if (eyebrow) tl.from(eyebrow, { opacity: 0, y: 12, duration: 0.5, ease: "power2.out" }, 0);
  if (h2) tl.from(h2, { opacity: 0, y: 22, duration: 0.65, ease: "power2.out" }, 0.06);
  if (lead) tl.from(lead, { opacity: 0, y: 18, duration: 0.6, ease: "power2.out" }, 0.22);
  if (rows.length) {
    tl.from(
      rows,
      { opacity: 0, y: 24, duration: 0.55, ease: "power2.out", stagger: 0.08 },
      0.34
    );
  }
  if (midCta) tl.from(midCta, { opacity: 0, y: 12, duration: 0.55, ease: "power2.out" }, 0.52);
  if (urgency) tl.from(urgency, { opacity: 0, y: 10, duration: 0.55, ease: "power2.out" }, 0.62);

  if (section.querySelector("[data-count]")) {
    window.ScrollTrigger.create({
      trigger: section,
      start: "top 82%",
      once: true,
      onEnter: () => {
        section.querySelectorAll("[data-count]").forEach((c) => animateCounter(c));
      },
    });
  }
}

function initPostCinemaSections() {
  if (!window.gsap || !window.ScrollTrigger) return;

  const sections = Array.from(document.querySelectorAll(".cinema-section"));
  if (!sections.length) return;

  sections.forEach((sec) => buildSectionTimeline(sec));

  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    const id = a.getAttribute("href");
    if (!id || id === "#" || id.length < 2) return;
    a.addEventListener("click", (e) => {
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      window.gsap.to(window, {
        duration: 1.1,
        ease: "power2.inOut",
        scrollTo: { y: target, autoKill: false },
      });
    });
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    if (window.gsap) {
      window.gsap.registerPlugin(window.ScrollTrigger, window.ScrollToPlugin);
      initPostCinemaSections();
    }
  });
} else if (window.gsap) {
  window.gsap.registerPlugin(window.ScrollTrigger, window.ScrollToPlugin);
  initPostCinemaSections();
} else {
  document.addEventListener("DOMContentLoaded", initPostCinemaSections);
}
