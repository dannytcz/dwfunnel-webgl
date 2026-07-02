// Post-cinematic GSAP — scrub-linked and stagger animations per section.

const prefersReducedMotion =
  typeof window !== "undefined" &&
  window.matchMedia &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function baseTrigger(section, start = "top 75%") {
  return {
    trigger: section,
    start,
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
  const bento = section.querySelector(".problem-bento");
  const head = section.querySelector(".problem-bento__head");
  const rows = section.querySelectorAll(".problem-bento__rows .cinema-system__row");
  const agitate = section.querySelector(".agitate-block");
  const agitateItems = section.querySelectorAll(".agitate-list__item");
  const cta = section.querySelector(".cinema-section__cta-mid");

  const tl = window.gsap.timeline({ scrollTrigger: baseTrigger(section) });
  if (bento) tl.to(bento, { clipPath: "inset(0% 0 0 0)", duration: 0.85, ease: "power3.out" }, 0);
  if (head) tl.from(head.children, { opacity: 0, y: 22, duration: 0.55, stagger: 0.08 }, 0.12);
  if (rows.length) tl.from(rows, { opacity: 0, x: -24, duration: 0.5, stagger: 0.1, ease: "power2.out" }, 0.35);
  if (agitate) tl.from(agitate, { opacity: 0, y: 20, duration: 0.55 }, 0.55);
  if (agitateItems.length) tl.from(agitateItems, { opacity: 0, x: -14, duration: 0.45, stagger: 0.08 }, 0.62);
  if (cta) tl.from(cta, { opacity: 0, y: 12, duration: 0.45 }, 0.78);

  if (agitate && !prefersReducedMotion) {
    window.gsap.to(agitate, {
      scrollTrigger: { trigger: agitate, start: "top 80%", toggleActions: "play none none reverse" },
      borderColor: "rgba(94, 234, 212, 0.55)",
      duration: 0.6,
      yoyo: true,
      repeat: 1,
    });
  }
}

function revealBuild(section) {
  const label = section.querySelector(".section-label");
  const eyebrow = section.querySelector(".cinema-copy__eyebrow");
  const h2 = section.querySelector("h2");
  const lead = section.querySelector(".cinema-section__lead");
  const cards = section.querySelectorAll(".build-card");
  const cta = section.querySelector(".cinema-section__cta-mid");

  const tl = window.gsap.timeline({ scrollTrigger: baseTrigger(section) });
  if (label) tl.from(label, { opacity: 0, y: 10, duration: 0.4 }, 0);
  if (eyebrow) tl.from(eyebrow, { opacity: 0, y: 12, duration: 0.45 }, 0.06);
  if (h2) tl.from(h2, { opacity: 0, y: 22, duration: 0.6 }, 0.12);
  if (lead) tl.from(lead, { opacity: 0, y: 18, duration: 0.55 }, 0.22);
  if (cards.length) tl.to(cards, { opacity: 1, scale: 1, duration: 0.55, stagger: 0.12, ease: "power2.out" }, 0.34);
  if (cta) tl.from(cta, { opacity: 0, y: 12, duration: 0.45 }, 0.62);
}

function revealTransform(section) {
  const panel = section.querySelector(".transform-panel");
  const items = section.querySelectorAll(".transform-list__item");
  const cta = section.querySelector(".cinema-section__cta-mid");

  window.ScrollTrigger.create({
    trigger: section,
    start: "top 85%",
    end: "top 35%",
    scrub: 0.5,
    onUpdate: (self) => {
      if (panel) panel.style.opacity = String(0.3 + self.progress * 0.7);
    },
  });

  const tl = window.gsap.timeline({ scrollTrigger: baseTrigger(section) });
  if (panel) tl.to(panel, { opacity: 1, y: 0, duration: 0.7, ease: "power2.out" }, 0);
  if (items.length) tl.to(items, { opacity: 1, x: 0, duration: 0.5, stagger: 0.1, ease: "power2.out" }, 0.25);
  if (cta) tl.from(cta, { opacity: 0, y: 12, duration: 0.45 }, 0.65);
}

function revealPlatforms(section) {
  const label = section.querySelector(".section-label");
  const eyebrow = section.querySelector(".cinema-copy__eyebrow");
  const h2 = section.querySelector("h2");
  const lead = section.querySelector(".cinema-section__lead");
  const items = section.querySelectorAll(".platforms-list__item");

  const tl = window.gsap.timeline({ scrollTrigger: baseTrigger(section) });
  if (label) tl.from(label, { opacity: 0, y: 10, duration: 0.4 }, 0);
  if (eyebrow) tl.from(eyebrow, { opacity: 0, y: 12, duration: 0.45 }, 0.06);
  if (h2) tl.from(h2, { opacity: 0, y: 22, duration: 0.6 }, 0.12);
  if (lead) tl.from(lead, { opacity: 0, y: 18, duration: 0.55 }, 0.22);
  if (items.length) {
    tl.to(items, { clipPath: "inset(0 0% 0 0)", duration: 0.55, stagger: 0.08, ease: "power2.out" }, 0.34);
    items.forEach((item, i) => {
      window.gsap.from(item.querySelector("strong"), {
        scrollTrigger: { trigger: item, start: "top 85%", once: true },
        color: "var(--text)",
        duration: 0.5,
        delay: i * 0.05,
      });
    });
  }
}

function revealHowItWorks(section) {
  const nodes = section.querySelectorAll(".timeline__node");
  const cta = section.querySelector(".cinema-section__cta-mid");

  window.ScrollTrigger.create({
    trigger: section,
    start: "top 75%",
    end: "bottom 40%",
    scrub: 0.5,
    onUpdate: (self) => {
      section.style.setProperty("--timeline-h", `${self.progress * 100}%`);
    },
    onEnter: () => section.setAttribute("data-revealed", "true"),
  });

  const tl = window.gsap.timeline({
    scrollTrigger: { trigger: section, start: "top 75%", once: true },
  });
  tl.from(section.querySelector(".section-label"), { opacity: 0, y: 10, duration: 0.4 }, 0);
  tl.from(section.querySelector(".cinema-copy__eyebrow"), { opacity: 0, y: 12, duration: 0.45 }, 0.06);
  tl.from(section.querySelector("h2"), { opacity: 0, y: 22, duration: 0.6 }, 0.12);
  tl.from(section.querySelector(".cinema-section__lead"), { opacity: 0, y: 18, duration: 0.55 }, 0.22);
  if (nodes.length) {
    tl.to(nodes, { opacity: 1, x: 0, duration: 0.45, stagger: 0.1, ease: "back.out(1.4)" }, 0.36);
  }
  if (cta) tl.from(cta, { opacity: 0, y: 12, duration: 0.45 }, 0.7);
}

function revealProcess(section) {
  const steps = section.querySelectorAll(".process-step");
  const nums = section.querySelectorAll(".process-step__num");

  window.ScrollTrigger.create({
    trigger: section,
    start: "top 70%",
    end: "bottom 50%",
    scrub: 0.4,
    onUpdate: (self) => {
      section.style.setProperty("--pipeline-w", String(self.progress));
    },
    onEnter: () => section.setAttribute("data-revealed", "true"),
  });

  const tl = window.gsap.timeline({ scrollTrigger: { trigger: section, start: "top 75%", once: true } });
  tl.from(section.querySelector(".section-label"), { opacity: 0, y: 10, duration: 0.4 }, 0);
  tl.from(section.querySelector("h2"), { opacity: 0, y: 22, duration: 0.6 }, 0.1);
  if (steps.length) tl.to(steps, { opacity: 1, y: 0, duration: 0.5, stagger: 0.1 }, 0.3);
  if (nums.length && !prefersReducedMotion) {
    nums.forEach((num) => {
      const target = parseInt(num.textContent, 10) || 0;
      const obj = { v: 0 };
      window.gsap.to(obj, {
        scrollTrigger: { trigger: num, start: "top 85%", once: true },
        v: target,
        duration: 0.8,
        ease: "power1.out",
        onUpdate: () => {
          num.textContent = String(Math.round(obj.v)).padStart(2, "0");
        },
      });
    });
  }
}

function revealProof(section) {
  const band = section.querySelector(".proof-stat-band");
  const cards = section.querySelectorAll(".proof-card");
  const cta = section.querySelector(".cinema-section__cta-mid");

  window.ScrollTrigger.create({
    trigger: band || section,
    start: "top 80%",
    once: true,
    onEnter: () => {
      section.querySelectorAll("[data-count]").forEach((c) => animateCounter(c));
    },
  });

  if (band && !prefersReducedMotion) {
    window.gsap.from(band, {
      scrollTrigger: { trigger: band, start: "top 90%", end: "top 60%", scrub: 0.6 },
      y: 24,
      ease: "none",
    });
  }

  const tl = window.gsap.timeline({ scrollTrigger: baseTrigger(section) });
  tl.from(section.querySelector(".section-label"), { opacity: 0, y: 10, duration: 0.4 }, 0);
  tl.from(section.querySelector("h2"), { opacity: 0, y: 22, duration: 0.6 }, 0.1);
  if (cards.length) tl.to(cards, { opacity: 1, scale: 1, y: 0, duration: 0.5, stagger: 0.1 }, 0.32);
  if (cta) tl.from(cta, { opacity: 0, y: 12, duration: 0.45 }, 0.58);
}

function revealTestimonials(section) {
  const cards = section.querySelectorAll(".testimonial");

  const tl = window.gsap.timeline({ scrollTrigger: baseTrigger(section) });
  tl.from(section.querySelector(".section-label"), { opacity: 0, y: 10, duration: 0.4 }, 0);
  tl.from(section.querySelector("h2"), { opacity: 0, y: 22, duration: 0.6 }, 0.08);
  if (cards.length) {
    tl.to(cards, { opacity: 1, y: 0, duration: 0.55, stagger: 0.15, ease: "power2.out" }, 0.28);
    cards.forEach((card) => {
      const quote = card.querySelector("blockquote p");
      if (quote) {
        window.gsap.from(quote, {
          scrollTrigger: { trigger: card, start: "top 85%", once: true },
          opacity: 0.4,
          duration: 0.6,
        });
      }
    });
  }
}

function revealWorkWithUs(section) {
  const call = section.querySelector(".contact-cta--call");
  const dm = section.querySelector(".contact-cta--dm");
  const urgency = section.querySelector(".contact-cta__urgency");

  const tl = window.gsap.timeline({ scrollTrigger: baseTrigger(section) });
  tl.from(section.querySelector(".section-label"), { opacity: 0, y: 10, duration: 0.4 }, 0);
  tl.from(section.querySelector("h2"), { opacity: 0, y: 22, duration: 0.6 }, 0.08);
  tl.from(section.querySelector(".cinema-section__lead"), { opacity: 0, y: 18, duration: 0.55 }, 0.18);
  if (call) tl.to(call, { opacity: 1, x: 0, duration: 0.55, ease: "power2.out" }, 0.34);
  if (dm) tl.to(dm, { opacity: 1, x: 0, duration: 0.55, ease: "power2.out" }, 0.42);
  if (urgency) tl.to(urgency, { opacity: 1, y: 0, duration: 0.5 }, 0.58);
}

function revealGeneric(section) {
  const eyebrow = section.querySelector(".cinema-copy__eyebrow");
  const h2 = section.querySelector("h2");
  const lead = section.querySelector(".cinema-section__lead, .cinema-copy__lede");
  const rows = section.querySelectorAll(
    ".cinema-system__row, .platforms-list__item, .testimonial, .contact-cta, .agitate-list__item, .transform-list__item, .build-card, .proof-card"
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
      s.style.setProperty("--pipeline-w", "1");
    });
    document.querySelectorAll("[data-count]").forEach((c) => {
      c.textContent = c.getAttribute("data-count") || "0";
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
