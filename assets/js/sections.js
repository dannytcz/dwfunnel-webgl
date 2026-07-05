export function initSections({ reducedMotion }) {
  if (!window.gsap || !window.ScrollTrigger) return;

  const start = reducedMotion ? "top 90%" : "top 75%";

  if (reducedMotion) {
    document.querySelectorAll(".leak-card, .method-item, .platform-card, .work-path, .founder-moment").forEach((el) => {
      el.style.opacity = "1";
      el.style.transform = "none";
    });
    document.querySelectorAll(".machine-component").forEach((el) => el.classList.add("is-active"));
    document.querySelectorAll(".method-step").forEach((el) => el.classList.add("is-lit"));
    document.querySelectorAll(".stat").forEach((el) => el.classList.add("is-drawn"));
    return;
  }

  revealLeakHeading();
  revealLeakCards(start);
  revealMethod(start);
  revealPlatforms(start);
  revealWork(start);
  initStats();
  initWatermarks();
}

/* Phase 2.1: subtle parallax drift on the giant act watermark numerals */
function initWatermarks() {
  document.querySelectorAll(".act-watermark").forEach((el) => {
    const sec = el.closest(".act");
    if (!sec) return;
    window.gsap.fromTo(
      el,
      { y: 40 },
      {
        y: -40,
        ease: "none",
        scrollTrigger: { trigger: sec, start: "top bottom", end: "bottom top", scrub: true },
      }
    );
  });
}

/* Phase 4.4: h2 line reveal with masking via GSAP SplitText. */
function revealLeakHeading() {
  const h2 = document.querySelector("#act-leak .split-lines");
  if (!h2) return;
  if (!window.SplitText) {
    h2.style.opacity = "1";
    return;
  }
  const split = new window.SplitText(h2, { type: "lines", mask: "lines", linesClass: "st-line" });
  window.gsap.set(split.lines, { yPercent: 110 });
  window.gsap.to(split.lines, {
    yPercent: 0,
    duration: 0.7,
    stagger: 0.08,
    ease: "power3.out",
    scrollTrigger: { trigger: "#act-leak", start: "top 75%", once: true },
  });
}

function revealLeakCards(start) {
  window.gsap.fromTo(
    ".leak-card",
    { opacity: 0, y: 24 },
    {
      scrollTrigger: { trigger: ".leak-cards", start, once: true },
      opacity: 1,
      y: 0,
      duration: 0.6,
      stagger: 0.12,
      ease: "power2.out",
      clearProps: "transform",
    }
  );
}

function revealMethod(start) {
  window.gsap.fromTo(
    ".method-item",
    { opacity: 0, y: 20 },
    {
      scrollTrigger: { trigger: ".method-grid", start, once: true },
      opacity: 1,
      y: 0,
      duration: 0.55,
      stagger: 0.08,
      ease: "power2.out",
      clearProps: "transform",
    }
  );

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
      clearProps: "transform",
    }
  );
  window.gsap.fromTo(
    ".platform-card",
    { opacity: 0, y: 20 },
    {
      scrollTrigger: { trigger: ".platform-grid", start, once: true },
      opacity: 1,
      y: 0,
      duration: 0.5,
      stagger: 0.08,
      ease: "power2.out",
      clearProps: "transform",
    }
  );
}

function revealWork(start) {
  window.gsap.fromTo(
    ".work-path",
    { opacity: 0, y: 20 },
    {
      scrollTrigger: { trigger: ".work-paths", start, once: true },
      opacity: 1,
      y: 0,
      duration: 0.55,
      stagger: 0.1,
      ease: "power2.out",
      clearProps: "transform",
    }
  );
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
      // Phase 4.1: draw each instrument readout underline on entry.
      row.querySelectorAll(".stat").forEach((el) => el.classList.add("is-drawn"));
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
