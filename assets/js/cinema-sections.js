// Post-cinematic GSAP ScrollTriggers.
// Each .cinema-section reveals its editorial stack (eyebrow -> h2 -> lede ->
// body rows) when its top hits ~80% of the viewport, then settles.
function initPostCinemaSections() {
  if (!window.gsap || !window.ScrollTrigger) return;

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reducedMotion) return;

  const sections = Array.from(document.querySelectorAll(".cinema-section"));
  if (!sections.length) return;

  sections.forEach((sec) => {
    const eyebrow = sec.querySelector(".cinema-copy__eyebrow");
    const h2 = sec.querySelector("h2");
    const lead = sec.querySelector(".cinema-section__lead, .cinema-copy__lede");
    const rows = sec.querySelectorAll(
      ".cinema-system__row, .cinema-card, .platforms-list__item, .process-step, .testimonial, .contact-cta"
    );
    const midCta = sec.querySelector(".cinema-section__cta-mid");
    const urgency = sec.querySelector(".contact-cta__urgency");

    gsap.set([eyebrow, h2, lead, ...rows, midCta, urgency].filter(Boolean), {
      opacity: 0,
      y: 24,
    });

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: sec,
        start: "top 82%",
        once: true,
      },
    });
    if (eyebrow) tl.to(eyebrow, { opacity: 1, y: 0, duration: 0.6, ease: "power2.out" }, 0);
    if (h2) tl.to(h2, { opacity: 1, y: 0, duration: 0.8, ease: "power2.out" }, 0.12);
    if (lead) tl.to(lead, { opacity: 1, y: 0, duration: 0.7, ease: "power2.out" }, 0.28);
    if (rows.length) {
      rows.forEach((row, i) => {
        tl.to(row, { opacity: 1, y: 0, duration: 0.6, ease: "power2.out" }, 0.4 + i * 0.08);
      });
    }
    if (midCta) tl.to(midCta, { opacity: 1, y: 0, duration: 0.6, ease: "power2.out" }, 0.6);
    if (urgency) tl.to(urgency, { opacity: 1, y: 0, duration: 0.6, ease: "power2.out" }, 0.7);
  });

  // Smooth-scroll for every `.cinema-section__cta-mid` and any direct
  // anchor inside .cinema-section__bridge that points to #work-with-us.
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    const id = a.getAttribute("href");
    if (!id || id === "#" || id.length < 2) return;
    a.addEventListener("click", (e) => {
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      gsap.to(window, {
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
      gsap.registerPlugin(window.ScrollTrigger, window.ScrollToPlugin);
      initPostCinemaSections();
    }
  });
} else {
  if (window.gsap) {
    gsap.registerPlugin(window.ScrollTrigger, window.ScrollToPlugin);
    initPostCinemaSections();
  } else {
    document.addEventListener("DOMContentLoaded", initPostCinemaSections);
  }
}
