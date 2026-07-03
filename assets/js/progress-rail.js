/**
 * QA 7: thin vertical progress rail with six act dots (desktop only).
 * Active dot is gold; clicking a dot scrolls to that act via Lenis.
 */
const ACTS = [
  { trigger: "#act-leak", target: "#act-leak" },
  { trigger: "#machine-pin", target: "#act-machine" },
  { trigger: "#act-proof", target: "#act-proof" },
  { trigger: "#act-method", target: "#act-method" },
  { trigger: "#act-platforms", target: "#act-platforms" },
  { trigger: "#act-work", target: "#act-work" },
];

export function initProgressRail({ lenis } = {}) {
  const rail = document.getElementById("progress-rail");
  if (!rail || !window.ScrollTrigger) return () => {};
  const dots = Array.from(rail.querySelectorAll(".progress-dot"));
  const sts = [];
  const clickHandlers = [];

  const setActive = (i) => dots.forEach((d, j) => d.classList.toggle("is-active", j === i));

  ACTS.forEach((act, i) => {
    const trigEl = document.querySelector(act.trigger);
    if (trigEl) {
      sts.push(
        window.ScrollTrigger.create({
          trigger: trigEl,
          start: "top center",
          end: "bottom center",
          onToggle: (self) => {
            if (self.isActive) setActive(i);
          },
        })
      );
    }
    const dot = dots[i];
    if (dot) {
      const onClick = () => {
        const target = document.querySelector(act.target);
        if (!target) return;
        if (lenis) lenis.scrollTo(target, { offset: 0 });
        else target.scrollIntoView({ behavior: "smooth" });
      };
      dot.addEventListener("click", onClick);
      clickHandlers.push([dot, onClick]);
    }
  });

  rail.removeAttribute("hidden");

  return () => {
    sts.forEach((s) => s.kill());
    clickHandlers.forEach(([dot, fn]) => dot.removeEventListener("click", fn));
    rail.setAttribute("hidden", "");
  };
}
