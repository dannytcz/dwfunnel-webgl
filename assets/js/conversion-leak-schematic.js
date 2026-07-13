/**
 * Conversion leak diagnostic — scroll-scrubbed signal path.
 *
 * Sequence per stage: stage → No branch (right) → Yes label → Yes wire (down).
 * ACTION terminal sits page-centered below the split layout.
 */

export function initConversionLeakSchematic({ reducedMotion = false, staticDraw = false } = {}) {
  const root = document.getElementById("leak-diagnostic");
  if (!root) return null;

  // Reduced-motion / static: keep CSS-visible complete schematic.
  if (reducedMotion || staticDraw) return null;

  const gsap = window.gsap;
  const section = root.closest(".plain-section--leak") || root;
  const items = [
    ...root.querySelectorAll("[data-anim]"),
    ...section.querySelectorAll(":scope > .leak-action[data-anim]"),
  ];
  if (!items.length) return null;

  const tl = gsap.timeline({
    defaults: { ease: "none" },
    scrollTrigger: {
      trigger: section,
      start: "top 78%",
      end: "bottom 78%",
      scrub: 0.4,
    },
  });

  for (const el of items) {
    const kind = el.getAttribute("data-anim");

    if (kind === "wire") {
      tl.fromTo(el, { scaleY: 0 }, { scaleY: 1, duration: 0.5 });
    } else if (kind === "branch") {
      const line = el.closest(".leak-decision")?.querySelector(".leak-decision__branch");
      if (line) {
        tl.fromTo(
          line,
          { scaleX: 0, transformOrigin: "left center" },
          { scaleX: 1, duration: 0.45 }
        );
      }
      tl.fromTo(
        el,
        { autoAlpha: 0, x: -8 },
        { autoAlpha: 1, x: 0, duration: 0.35 },
        "-=0.12"
      );
    } else if (kind === "yes") {
      tl.fromTo(
        el,
        { autoAlpha: 0, y: -4 },
        { autoAlpha: 1, y: 0, duration: 0.28 }
      );
    } else if (kind === "stage") {
      tl.fromTo(
        el,
        { autoAlpha: 0, y: 12 },
        { autoAlpha: 1, y: 0, duration: 0.5 }
      );
    } else if (kind === "action") {
      tl.fromTo(
        el,
        { autoAlpha: 0, y: 10 },
        { autoAlpha: 1, y: 0, duration: 0.5 }
      );
    } else {
      tl.fromTo(
        el,
        { autoAlpha: 0, y: 8 },
        { autoAlpha: 1, y: 0, duration: 0.35 }
      );
    }
  }

  return tl;
}
