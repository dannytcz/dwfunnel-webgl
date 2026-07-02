import { splitLinesWords } from "./text-split.js?v=40";

export function initSections({ reducedMotion, isMobile }) {
  if (!window.gsap || !window.ScrollTrigger) return;

  const start = reducedMotion ? "top 90%" : "top 75%";

  if (reducedMotion) {
    document.querySelectorAll(".leak-card, .method-item, .platform-card, .work-path, .founder-moment").forEach((el) => {
      el.style.opacity = "1";
      el.style.transform = "none";
    });
    document.querySelectorAll(".machine-component").forEach((el) => el.classList.add("is-active"));
    return;
  }

  splitLinesWords(document.querySelector("#act-leak .split-lines"));
  revealLeakCards(start);
  revealMethod(start);
  revealPlatforms(start);
  revealWork(start);
  initStats();
}

function revealLeakCards(start) {
  window.gsap.to("#act-leak .line-inner", {
    scrollTrigger: { trigger: "#act-leak", start: "top 75%", once: true },
    y: 0,
    duration: 0.7,
    stagger: 0.08,
    ease: "power3.out",
  });
  window.gsap.to(".leak-card", {
    scrollTrigger: { trigger: ".leak-cards", start, once: true },
    opacity: 1,
    y: 0,
    duration: 0.6,
    stagger: 0.12,
    ease: "power2.out",
  });
}

function revealMethod(start) {
  window.gsap.to(".method-item", {
    scrollTrigger: { trigger: ".method-grid", start, once: true },
    opacity: 1,
    y: 0,
    duration: 0.55,
    stagger: 0.08,
    ease: "power2.out",
  });

  const timeline = document.getElementById("method-timeline");
  if (!timeline) return;
  window.ScrollTrigger.create({
    trigger: timeline,
    start: "top 80%",
    end: "bottom 60%",
    scrub: 0.5,
    onUpdate: (self) => {
      timeline.style.setProperty("--timeline-progress", String(self.progress));
      const steps = timeline.querySelectorAll(".method-step");
      const lit = Math.floor(self.progress * steps.length);
      steps.forEach((s, i) => s.classList.toggle("is-lit", i <= lit));
    },
  });
}

function revealPlatforms(start) {
  window.gsap.fromTo(
    ".platform-featured",
    { opacity: 0, scale: 0.96 },
    {
      scrollTrigger: { trigger: "#act-platforms", start, once: true },
      opacity: 1,
      scale: 1,
      duration: 0.6,
      ease: "power2.out",
    }
  );
  window.gsap.to(".platform-card", {
    scrollTrigger: { trigger: ".platform-grid", start, once: true },
    opacity: 1,
    y: 0,
    duration: 0.5,
    stagger: 0.08,
    ease: "power2.out",
  });
}

function revealWork(start) {
  window.gsap.to(".work-path", {
    scrollTrigger: { trigger: ".work-paths", start, once: true },
    opacity: 1,
    y: 0,
    duration: 0.55,
    stagger: 0.1,
    ease: "power2.out",
  });
  window.gsap.to(".founder-moment", {
    scrollTrigger: { trigger: ".founder-moment", start: "top 80%", once: true },
    opacity: 1,
    y: 0,
    duration: 0.6,
    ease: "power2.out",
  });
}

function initStats() {
  const row = document.getElementById("stat-row");
  if (!row) return;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduced) return;

  window.ScrollTrigger.create({
    trigger: row,
    start: "top 60%",
    once: true,
    onEnter: () => {
      row.querySelectorAll("[data-count]").forEach((el) => {
        const target = parseFloat(el.getAttribute("data-count"));
        const suffix = el.getAttribute("data-suffix") || "";
        const decimals = parseInt(el.getAttribute("data-decimal") || "0", 10);
        const obj = { v: 0 };
        window.gsap.to(obj, {
          v: target,
          duration: 1.6,
          ease: "expo.out",
          onUpdate: () => {
            el.textContent = (decimals ? obj.v.toFixed(decimals) : String(Math.round(obj.v))) + suffix;
          },
        });
      });
    },
  });
}
