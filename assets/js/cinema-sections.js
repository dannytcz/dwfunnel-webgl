// Post-cinematic GSAP — per-section choreography.

const prefersReducedMotion =
  typeof window !== "undefined" &&
  window.matchMedia &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function baseTrigger(section) {
  return {
    trigger: section,
    start: "top 82%",
    once: true,
    onEnter: () => section.setAttribute("data-revealed", "true"),
  };
}

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

function revealProblem(section) {
  const inner = section.querySelector(".cinema-section__inner");
  const eyebrow = section.querySelector(".cinema-copy__eyebrow");
  const h2 = section.querySelector("h2");
  const lead = section.querySelector(".cinema-section__lead");
  const rows = section.querySelectorAll(".cinema-system__row");
  const agitate = section.querySelectorAll(".agitate-list__item");
  const cta = section.querySelector(".cinema-section__cta-mid");

  const tl = window.gsap.timeline({ scrollTrigger: baseTrigger(section) });
  if (inner) tl.to(inner, { clipPath: "inset(0% 0 0 0)", duration: 0.85, ease: "power3.out" }, 0);
  if (eyebrow) tl.from(eyebrow, { opacity: 0, y: 14, duration: 0.45 }, 0.12);
  if (h2) tl.from(h2, { opacity: 0, y: 28, duration: 0.65 }, 0.2);
  if (lead) tl.from(lead, { opacity: 0, y: 20, duration: 0.55 }, 0.32);
  if (rows.length) tl.from(rows, { opacity: 0, x: -20, duration: 0.5, stagger: 0.09, ease: "power2.out" }, 0.42);
  if (agitate.length) {
    tl.from(agitate, { opacity: 0, x: -12, duration: 0.45, stagger: 0.08 }, 0.62);
  }
  if (cta) tl.from(cta, { opacity: 0, y: 12, duration: 0.45 }, 0.78);
}

function revealBuild(section) {
  const eyebrow = section.querySelector(".cinema-copy__eyebrow");
  const h2 = section.querySelector("h2");
  const lead = section.querySelector(".cinema-section__lead");
  const rows = section.querySelectorAll(".cinema-system__row");
  const cta = section.querySelector(".cinema-section__cta-mid");

  const tl = window.gsap.timeline({ scrollTrigger: baseTrigger(section) });
  if (eyebrow) tl.from(eyebrow, { opacity: 0, y: 12, duration: 0.45 }, 0);
  if (h2) tl.from(h2, { opacity: 0, y: 22, duration: 0.6 }, 0.08);
  if (lead) tl.from(lead, { opacity: 0, y: 18, duration: 0.55 }, 0.2);
  if (rows.length) tl.to(rows, { opacity: 1, x: 0, duration: 0.55, stagger: 0.1, ease: "power2.out" }, 0.34);
  if (cta) tl.from(cta, { opacity: 0, y: 12, duration: 0.45 }, 0.58);
}

function revealTransform(section) {
  const eyebrow = section.querySelector(".cinema-copy__eyebrow");
  const h2 = section.querySelector("h2");
  const lead = section.querySelector(".cinema-section__lead");
  const items = section.querySelectorAll(".transform-list__item");
  const cta = section.querySelector(".cinema-section__cta-mid");

  const tl = window.gsap.timeline({ scrollTrigger: baseTrigger(section) });
  if (eyebrow) tl.from(eyebrow, { opacity: 0, y: 12, duration: 0.45 }, 0);
  if (h2) tl.from(h2, { opacity: 0, y: 22, duration: 0.6 }, 0.08);
  if (lead) tl.from(lead, { opacity: 0, y: 18, duration: 0.55 }, 0.2);
  if (items.length) tl.to(items, { opacity: 1, x: 0, duration: 0.5, stagger: 0.12, ease: "power2.out" }, 0.32);
  if (cta) tl.from(cta, { opacity: 0, y: 12, duration: 0.45 }, 0.72);
}

function revealPlatforms(section) {
  const eyebrow = section.querySelector(".cinema-copy__eyebrow");
  const h2 = section.querySelector("h2");
  const lead = section.querySelector(".cinema-section__lead");
  const items = section.querySelectorAll(".platforms-list__item");

  const tl = window.gsap.timeline({ scrollTrigger: baseTrigger(section) });
  if (eyebrow) tl.from(eyebrow, { opacity: 0, y: 12, duration: 0.45 }, 0);
  if (h2) tl.from(h2, { opacity: 0, y: 22, duration: 0.6 }, 0.08);
  if (lead) tl.from(lead, { opacity: 0, y: 18, duration: 0.55 }, 0.2);
  if (items.length) {
    tl.to(items, { clipPath: "inset(0 0% 0 0)", duration: 0.55, stagger: 0.08, ease: "power2.out" }, 0.34);
  }
}

function revealHowItWorks(section) {
  const eyebrow = section.querySelector(".cinema-copy__eyebrow");
  const h2 = section.querySelector("h2");
  const lead = section.querySelector(".cinema-section__lead");
  const rows = section.querySelectorAll(".cinema-system__row");
  const cta = section.querySelector(".cinema-section__cta-mid");

  window.ScrollTrigger.create({
    ...baseTrigger(section),
    onEnter: () => {
      section.setAttribute("data-revealed", "true");
      section.style.setProperty("--timeline-h", "100%");
    },
  });

  const tl = window.gsap.timeline({
    scrollTrigger: { trigger: section, start: "top 82%", once: true },
  });
  if (eyebrow) tl.from(eyebrow, { opacity: 0, y: 12, duration: 0.45 }, 0);
  if (h2) tl.from(h2, { opacity: 0, y: 22, duration: 0.6 }, 0.08);
  if (lead) tl.from(lead, { opacity: 0, y: 18, duration: 0.55 }, 0.2);
  if (rows.length) tl.from(rows, { opacity: 0, x: -16, duration: 0.5, stagger: 0.08 }, 0.36);
  if (cta) tl.from(cta, { opacity: 0, y: 12, duration: 0.45 }, 0.65);
}

function revealProcess(section) {
  const eyebrow = section.querySelector(".cinema-copy__eyebrow");
  const h2 = section.querySelector("h2");
  const lead = section.querySelector(".cinema-section__lead");
  const rows = section.querySelectorAll(".cinema-system__row");

  const tl = window.gsap.timeline({ scrollTrigger: baseTrigger(section) });
  if (eyebrow) tl.from(eyebrow, { opacity: 0, y: 12, duration: 0.45 }, 0);
  if (h2) tl.from(h2, { opacity: 0, y: 22, duration: 0.6 }, 0.08);
  if (lead) tl.from(lead, { opacity: 0, y: 18, duration: 0.55 }, 0.2);
  if (rows.length) {
    tl.from(rows, { opacity: 0, y: 24, duration: 0.5, stagger: 0.1 }, 0.34);
  }
}

function revealProof(section) {
  const eyebrow = section.querySelector(".cinema-copy__eyebrow");
  const h2 = section.querySelector("h2");
  const lead = section.querySelector(".cinema-section__lead");
  const rows = section.querySelectorAll(".cinema-system__row");
  const cta = section.querySelector(".cinema-section__cta-mid");

  const tl = window.gsap.timeline({ scrollTrigger: baseTrigger(section) });
  if (eyebrow) tl.from(eyebrow, { opacity: 0, y: 12, duration: 0.45 }, 0);
  if (h2) tl.from(h2, { opacity: 0, y: 22, duration: 0.65 }, 0.08);
  if (lead) tl.from(lead, { opacity: 0, y: 18, duration: 0.55 }, 0.22);
  if (rows.length) tl.from(rows, { opacity: 0, scale: 0.98, y: 20, duration: 0.5, stagger: 0.08 }, 0.38);
  if (cta) tl.from(cta, { opacity: 0, y: 12, duration: 0.45 }, 0.62);

  window.ScrollTrigger.create({
    trigger: section,
    start: "top 82%",
    once: true,
    onEnter: () => {
      section.querySelectorAll("[data-count]").forEach((c) => animateCounter(c));
    },
  });
}

function revealTestimonials(section) {
  const eyebrow = section.querySelector(".cinema-copy__eyebrow");
  const h2 = section.querySelector("h2");
  const lead = section.querySelector(".cinema-section__lead");
  const cards = section.querySelectorAll(".testimonial");

  const tl = window.gsap.timeline({ scrollTrigger: baseTrigger(section) });
  if (eyebrow) tl.from(eyebrow, { opacity: 0, y: 12, duration: 0.45 }, 0);
  if (h2) tl.from(h2, { opacity: 0, y: 22, duration: 0.6 }, 0.08);
  if (lead) tl.from(lead, { opacity: 0, y: 18, duration: 0.55 }, 0.2);
  if (cards.length) tl.to(cards, { opacity: 1, y: 0, duration: 0.55, stagger: 0.12, ease: "power2.out" }, 0.34);
}

function revealWorkWithUs(section) {
  const eyebrow = section.querySelector(".cinema-copy__eyebrow");
  const h2 = section.querySelector("h2");
  const lead = section.querySelector(".cinema-section__lead");
  const call = section.querySelector(".contact-cta--call");
  const dm = section.querySelector(".contact-cta--dm");
  const urgency = section.querySelector(".contact-cta__urgency");

  const tl = window.gsap.timeline({ scrollTrigger: baseTrigger(section) });
  if (eyebrow) tl.from(eyebrow, { opacity: 0, y: 12, duration: 0.45 }, 0);
  if (h2) tl.from(h2, { opacity: 0, y: 22, duration: 0.6 }, 0.08);
  if (lead) tl.from(lead, { opacity: 0, y: 18, duration: 0.55 }, 0.2);
  if (call) tl.to(call, { opacity: 1, x: 0, duration: 0.55, ease: "power2.out" }, 0.36);
  if (dm) tl.to(dm, { opacity: 1, x: 0, duration: 0.55, ease: "power2.out" }, 0.44);
  if (urgency) tl.to(urgency, { opacity: 1, y: 0, duration: 0.5 }, 0.58);
}

function revealGeneric(section) {
  const eyebrow = section.querySelector(".cinema-copy__eyebrow");
  const h2 = section.querySelector("h2");
  const lead = section.querySelector(".cinema-section__lead, .cinema-copy__lede");
  const rows = section.querySelectorAll(
    ".cinema-system__row, .platforms-list__item, .testimonial, .contact-cta, .agitate-list__item, .transform-list__item"
  );
  const midCta = section.querySelector(".cinema-section__cta-mid");

  const tl = window.gsap.timeline({ scrollTrigger: baseTrigger(section) });
  if (eyebrow) tl.from(eyebrow, { opacity: 0, y: 12, duration: 0.5 }, 0);
  if (h2) tl.from(h2, { opacity: 0, y: 22, duration: 0.65 }, 0.06);
  if (lead) tl.from(lead, { opacity: 0, y: 18, duration: 0.6 }, 0.22);
  if (rows.length) tl.from(rows, { opacity: 0, y: 24, duration: 0.55, stagger: 0.08 }, 0.34);
  if (midCta) tl.from(midCta, { opacity: 0, y: 12, duration: 0.55 }, 0.52);
}

const SECTION_HANDLERS = {
  problem: revealProblem,
  build: revealBuild,
  transform: revealTransform,
  platforms: revealPlatforms,
  "how-it-works": revealHowItWorks,
  process: revealProcess,
  proof: revealProof,
  testimonials: revealTestimonials,
  "work-with-us": revealWorkWithUs,
};

function initPostCinemaSections() {
  if (!window.gsap || !window.ScrollTrigger) return;

  if (prefersReducedMotion) {
    document.querySelectorAll(".cinema-section").forEach((s) => {
      s.setAttribute("data-revealed", "true");
      s.style.setProperty("--timeline-h", "100%");
    });
    return;
  }

  document.querySelectorAll(".cinema-section").forEach((section) => {
    const handler = SECTION_HANDLERS[section.id] ?? revealGeneric;
    handler(section);
  });

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
