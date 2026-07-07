/**
 * QA 7: thin vertical progress rail with six act dots (desktop only).
 * Active dot is gold; clicking a dot scrolls to that act via Lenis.
 */
import { getFilmPinST } from "./film-sections.js?v=62";

const ACTS = [
  { trigger: "#act-leak", pinId: null },
  { trigger: "#machine-pin", pinId: "machine-pin" },
  { trigger: "#act-proof", pinId: "act-proof" },
  { trigger: "#act-method", pinId: "act-method" },
  { trigger: "#act-work", pinId: "act-work" },
];

function resolvePinScrollY(pinId) {
  const pinEl = document.getElementById(pinId);
  if (!pinEl) return null;

  let st = pinEl._filmPinST || getFilmPinST(pinId);
  if (!st && window.ScrollTrigger) {
    st = window.ScrollTrigger.getAll().find((s) => s.trigger === pinEl && s.pin);
  }
  if (!st) return null;

  return st.start + (st.end - st.start) * 0.05;
}

export function initProgressRail({ lenis } = {}) {
  const rail = document.getElementById("progress-rail");
  if (!rail || !window.ScrollTrigger) return () => {};
  const dots = Array.from(rail.querySelectorAll(".progress-tick"));
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
        const pinY = act.pinId ? resolvePinScrollY(act.pinId) : null;
        if (pinY != null && lenis) {
          lenis.scrollTo(pinY, { immediate: false });
          return;
        }
        const target = document.querySelector(act.trigger);
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
