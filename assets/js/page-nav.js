/**
 * Full-page section rail — one dot per scene/section.
 * Clicks scroll or jump; scroll-spy keeps the active dot in sync.
 */

const PAGE_NAV = [
  { id: "hero", mode: "cinema", station: 0, label: "Hero" },
  { id: "passage", mode: "cinema", station: 1, label: "Passage" },
  { id: "underworld", mode: "cinema", station: 2, label: "Underworld" },
  { id: "problem", mode: "scroll", target: "#problem", label: "Problem" },
  { id: "build", mode: "scroll", target: "#build", label: "Build" },
  { id: "platforms", mode: "scroll", target: "#platforms", label: "Platforms" },
  { id: "how-it-works", mode: "scroll", target: "#how-it-works", label: "How it works" },
  { id: "proof", mode: "scroll", target: "#proof", label: "Proof" },
  { id: "testimonials", mode: "scroll", target: "#testimonials", label: "Testimonials" },
  { id: "work-with-us", mode: "scroll", target: "#work-with-us", label: "Work with us" },
];

export function initPageNav(api) {
  const nav = document.getElementById("page-nav");
  if (!nav) return;

  const dots = Array.from(nav.querySelectorAll(".page-nav__dot"));
  let activeId = "hero";
  let spyEnabled = false;

  function setActive(id) {
    if (id === activeId) return;
    activeId = id;
    dots.forEach((dot) => {
      dot.classList.toggle("is-active", dot.dataset.navId === id);
    });
  }

  function scrollToTarget(target, duration = 0.9) {
    if (!window.gsap || !target) return;
    window.gsap.to(window, {
      duration,
      ease: "power2.inOut",
      scrollTo: { y: target, autoKill: true },
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

  function enableSpy() {
    if (spyEnabled || !window.ScrollTrigger) return;
    spyEnabled = true;

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
  }

  api.onCinemaStationChange = (stationIdx) => {
    const item = PAGE_NAV.find((n) => n.mode === "cinema" && n.station === stationIdx);
    if (item && window.scrollY < window.innerHeight * 0.85) {
      setActive(item.id);
    }
  };

  api.onCinemaUnlock = () => {
    enableSpy();
  };

  window.addEventListener(
    "scroll",
    () => {
      if (window.scrollY < window.innerHeight * 0.35) {
        const item = PAGE_NAV.find((n) => n.mode === "cinema" && n.station === api.getCinemaStation());
        if (item) setActive(item.id);
      }
    },
    { passive: true }
  );

  setActive("hero");
}

export { PAGE_NAV };