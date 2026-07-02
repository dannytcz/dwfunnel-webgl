/**
 * Full-page section rail — progress-driven spy from pin + scroll sections.
 */

const PAGE_NAV = [
  { id: "hero", mode: "cinema", station: 0, label: "Hero" },
  { id: "passage", mode: "cinema", station: 1, label: "Passage" },
  { id: "underworld", mode: "cinema", station: 2, label: "Underworld" },
  { id: "problem", mode: "scroll", target: "#problem", label: "Problem" },
  { id: "build", mode: "scroll", target: "#build", label: "Build" },
  { id: "transform", mode: "scroll", target: "#transform", label: "Transform" },
  { id: "platforms", mode: "scroll", target: "#platforms", label: "Platforms" },
  { id: "how-it-works", mode: "scroll", target: "#how-it-works", label: "How it works" },
  { id: "process", mode: "scroll", target: "#process", label: "Process" },
  { id: "proof", mode: "scroll", target: "#proof", label: "Proof" },
  { id: "testimonials", mode: "scroll", target: "#testimonials", label: "Testimonials" },
  { id: "work-with-us", mode: "scroll", target: "#work-with-us", label: "Work with us" },
];

export function initPageNav(api) {
  const nav = document.getElementById("page-nav");
  if (!nav) return;

  const dots = Array.from(nav.querySelectorAll(".page-nav__dot"));
  let activeId = "hero";
  let pinReleased = false;
  let activeScrollId = null;

  function setActive(id) {
    if (id === activeId) return;
    activeId = id;
    dots.forEach((dot) => {
      dot.classList.toggle("is-active", dot.dataset.navId === id);
    });
  }

  dots.forEach((dot) => {
    dot.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const id = dot.dataset.navId;
      const item = PAGE_NAV.find((n) => n.id === id);
      if (!item) return;

      if (item.mode === "cinema") {
        if (item.station === 0) {
          window.scrollTo({ top: 0, behavior: "smooth" });
        } else {
          api.goToCinemaStation(item.station);
        }
        setActive(id);
        return;
      }

      api.goToScrollSection(item.target);
      setActive(id);
    });
  });

  api.onProgress = (globalP, stationIdx) => {
    pinReleased = globalP >= 0.995;
    if (!pinReleased) {
      const item = PAGE_NAV.find((n) => n.mode === "cinema" && n.station === stationIdx);
      if (item) setActive(item.id);
    } else if (activeScrollId) {
      setActive(activeScrollId);
    }
  };

  if (window.ScrollTrigger) {
    PAGE_NAV.filter((n) => n.mode === "scroll").forEach((item) => {
      const el = document.querySelector(item.target);
      if (!el) return;
      window.ScrollTrigger.create({
        trigger: el,
        start: "top 55%",
        end: "bottom 45%",
        onEnter: () => {
          activeScrollId = item.id;
          if (pinReleased) setActive(item.id);
        },
        onEnterBack: () => {
          activeScrollId = item.id;
          if (pinReleased) setActive(item.id);
        },
      });
    });
  }

  setActive("hero");
}

export { PAGE_NAV };
