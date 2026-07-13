/**
 * Conversion leak diagnostic schematic — scroll-scrubbed signal path.
 *
 * The schematic is plain document flow (traffic → wire → stage → leak branch
 * → wire → ... → action), so the reveal order is simply DOM order. CSS holds
 * the final visible state; this module builds one scrubbed timeline that
 * hides everything and reveals it sequentially as the section scrolls in:
 * wires grow downward, stages fade up, leak branches extend sideways.
 *
 * Reduced motion / static mode: do nothing — the CSS default is the complete
 * schematic.
 */

export function initConversionLeakSchematic({ reducedMotion = false, staticDraw = false } = {}) {
  const root = document.getElementById("leak-diagnostic");
  if (!root) return null;

  if (reducedMotion || staticDraw) return null;

  const gsap = window.gsap;
  const items = Array.from(root.querySelectorAll("[data-anim]"));
  if (!items.length) return null;

  const tl = gsap.timeline({
    defaults: { ease: "none" },
    scrollTrigger: {
      trigger: root,
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
      const line = el.querySelector(".leak-branch__line");
      const text = el.querySelector(".leak-branch__text");
      tl.fromTo(line, { scaleX: 0, transformOrigin: "left center" }, { scaleX: 1, duration: 0.45 });
      tl.fromTo(
        text,
        { autoAlpha: 0, x: -8 },
        { autoAlpha: 1, x: 0, duration: 0.35, ease: "power1.out" },
        "-=0.12"
      );
    } else if (kind === "stage") {
      tl.fromTo(
        el,
        { autoAlpha: 0, y: 14 },
        { autoAlpha: 1, y: 0, duration: 0.55, ease: "power1.out" }
      );
    } else {
      // node: TRAFFIC label and the ACTION endpoint
      tl.fromTo(
        el,
        { autoAlpha: 0, y: 8 },
        { autoAlpha: 1, y: 0, duration: 0.4, ease: "power1.out" }
      );
    }
  }

  return tl;
}
