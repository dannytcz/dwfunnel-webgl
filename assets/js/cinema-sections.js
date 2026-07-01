// Post-cinematic GSAP ScrollTriggers.
// Each .cinema-section reveals its editorial stack (eyebrow -> h2 -> lede ->
// body rows) when its top hits ~80% of the viewport, then settles.
// Section-specific choreography: clip-path word reveal on h2s, stat counters
// on the proof block, staggered cards/rows, testimonial lift.
//
// `gsap` is loaded globally by cinema.html before this script.

const prefersReducedMotion =
  typeof window !== "undefined" &&
  window.matchMedia &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Animate a counter from 0 -> end whenever the trigger scrolls into view.
function animateCounter(el) {
  const target = parseInt(el.getAttribute("data-count"), 10) || 0;
  if (!target) return;
  if (prefersReducedMotion || !window.gsap) { el.textContent = String(target); return; }
  const obj = { v: 0 };
  window.gsap.to(obj, {
    v: target,
    duration: 1.4,
    ease: "power2.out",
    onUpdate: () => { el.textContent = String(Math.round(obj.v)); },
  });
}

function buildSectionTimeline(section) {
  if (!window.gsap) return;
  const eyebrow = section.querySelector(".cinema-copy__eyebrow");
  const h2 = section.querySelector("h2");
  const lead = section.querySelector(".cinema-section__lead, .cinema-copy__lede");
  const rows = section.querySelectorAll(
    ".cinema-system__row, .cinema-card, .platforms-list__item, .process-step, .testimonial, .contact-cta"
  );
  const midCta = section.querySelector(".cinema-section__cta-mid");
  const urgency = section.querySelector(".contact-cta__urgency");
  const counters = section.querySelectorAll("[data-count]");

  const tl = window.gsap.timeline({
    scrollTrigger: {
      trigger: section,
      start: "top 82%",
      once: true,
    },
  });

  if (eyebrow) tl.from(eyebrow, { opacity: 0, y: 12, duration: 0.5, ease: "power2.out" }, 0);
  if (h2) {
    // Skip the word reveal if this h2 is empty (or has no real words).
    const hasWords = h2.textContent.trim().length > 0;
    if (hasWords) {
      // Capture counters BEFORE we wipe innerHTML, then re-inject them as
      // their own word span so the counter animation can still find them.
      const counterEls = Array.from(h2.querySelectorAll("[data-count]"));
      const counterValues = counterEls.map((c) => ({
        count: c.getAttribute("data-count"),
        text: c.textContent,
      }));

      // Tokenise the visible text, preserving <br> boundaries.
      const tokens = h2.innerHTML.split(/(<br\s*\/?>)/i);
      const wordSpans = [];

      // Reset the H2, then re-stream tokens.
      h2.innerHTML = "";
      let counterIdx = 0;

      const wrapWord = (text) => {
        const span = document.createElement("span");
        span.className = "cinema-word";
        span.style.display = "inline-block";
        span.style.overflow = "hidden";
        span.style.verticalAlign = "bottom";
        span.style.lineHeight = "1.05";
        const inner = document.createElement("span");
        inner.className = "cinema-word__inner";
        inner.style.display = "inline-block";
        inner.style.transform = "translateY(110%)";
        inner.style.willChange = "transform";
        // If the text starts with a numeric placeholder that matches a
        // counter, render it as a counter span instead of plain text.
        const matched = counterValues[counterIdx];
        if (matched && text.trim() === matched.text) {
          inner.setAttribute("data-count", matched.count);
          inner.textContent = "0";
          counterIdx++;
        } else {
          inner.textContent = text;
        }
        span.appendChild(inner);
        h2.appendChild(span);
        return inner;
      };

      tokens.forEach((tok) => {
        if (!tok) return;
        if (/<br\s*\/?>/i.test(tok)) {
          h2.appendChild(document.createElement("br"));
          return;
        }
        // Split by whitespace, keep separators.
        const parts = tok.split(/(\s+)/);
        parts.forEach((p) => {
          if (p === "") return;
          if (/^\s+$/.test(p)) {
            h2.appendChild(document.createTextNode(p));
            return;
          }
          wordSpans.push(wrapWord(p));
        });
      });

      tl.to(
        wordSpans,
        { yPercent: 0, duration: 0.7, ease: "power3.out", stagger: 0.04 },
        0.08
      );
    }
  }
  if (lead) tl.from(lead, { opacity: 0, y: 18, duration: 0.6, ease: "power2.out" }, 0.28);
  if (rows.length) {
    tl.from(
      rows,
      { opacity: 0, y: 24, duration: 0.55, ease: "power2.out", stagger: 0.08 },
      0.4
    );
  }
  if (midCta) tl.from(midCta, { opacity: 0, y: 12, duration: 0.55, ease: "power2.out" }, 0.6);
  if (urgency) tl.from(urgency, { opacity: 0, y: 10, duration: 0.55, ease: "power2.out" }, 0.7);

  // Stat counters ride the same trigger; they count once visible.
  if (counters.length) {
    ScrollTrigger.create({
      trigger: section,
      start: "top 82%",
      once: true,
      onEnter: () => counters.forEach((c) => animateCounter(c)),
    });
  }
}

function initPostCinemaSections() {
  if (!window.gsap || !window.ScrollTrigger) return;

  const sections = Array.from(document.querySelectorAll(".cinema-section"));
  if (!sections.length) return;

  sections.forEach((sec) => buildSectionTimeline(sec));

  // Smooth-scroll for every anchor href="#…" inside any .cinema-section.
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
} else {
  if (window.gsap) {
    window.gsap.registerPlugin(window.ScrollTrigger, window.ScrollToPlugin);
    initPostCinemaSections();
  } else {
    document.addEventListener("DOMContentLoaded", initPostCinemaSections);
  }
}