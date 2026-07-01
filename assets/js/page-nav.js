/**
 * Full-page section rail — one dot per scene/section.
 * Clicks scroll to pin progress (cinema) or section (post-cinematic).
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
        api.goToCinemaStation(item.station);
        setActive(id);
        return;
      }

      api.goToScrollSection(item.target);
      setActive(id);
    });
  });

  api.onCinemaStationChange = (stationIdx) => {
    const item = PAGE_NAV.find((n) => n.mode === "cinema" && n.station === stationIdx);
    if (item) setActive(item.id);
  };

  if (window.ScrollTrigger) {
    PAGE_NAV.filter((n) => n.mode === "scroll").forEach((item) => {
      const el = document.querySelector(item.target);
      if (!el) return;
      window.ScrollTrigger.create({
        trigger: el,
        start: "top 55%",
        end: "bottom 45%",
        onEnter: () => setActive(item.id),
        onEnterBack: () => setActive(item.id),
      });
    });

    const pin = document.getElementById("cinema-pin");
    if (pin) {
      window.ScrollTrigger.create({
        trigger: pin,
        start: "top top",
        end: "bottom top",
        onLeave: () => {
          const last = PAGE_NAV.find((n) => n.id === "underworld");
          if (last && window.scrollY > window.innerHeight * 0.5) setActive("problem");
        },
        onEnterBack: () => {
          const st = api.getCinemaStation?.() ?? 2;
          const item = PAGE_NAV.find((n) => n.mode === "cinema" && n.station === st);
          if (item) setActive(item.id);
        },
      });
    }
  }

  setActive("hero");
}

export { PAGE_NAV };
