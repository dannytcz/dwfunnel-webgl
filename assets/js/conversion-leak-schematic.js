/**
 * Conversion leak diagnostic schematic — scroll-scrubbed signal path animation.
 * Sequence: traffic → spine → stage → leak branch → (repeat) → action node.
 * Spine segments after each leak use reduced opacity / dashed stroke (CSS).
 */

const STEPS = [
  { paths: [], lit: 1 },
  { paths: [0], lit: 2 },
  { paths: [5], lit: 3 },
  { paths: [1], lit: 4 },
  { paths: [6], lit: 5 },
  { paths: [2], lit: 6 },
  { paths: [7], lit: 7 },
  { paths: [3], lit: 7 },
  { paths: [4], lit: 8 },
  { paths: [8], lit: 9 },
];

const LIT_CLASSES = [
  "is-lit",
  "is-lit-stage-1",
  "is-lit-leak-1",
  "is-lit-stage-2",
  "is-lit-leak-2",
  "is-lit-stage-3",
  "is-lit-leak-3",
  "is-lit-action",
  "is-complete",
];

function setLitState(diagnostic, level) {
  diagnostic.classList.toggle("is-lit", level >= 1);
  diagnostic.classList.toggle("is-lit-stage-1", level >= 2);
  diagnostic.classList.toggle("is-lit-leak-1", level >= 3);
  diagnostic.classList.toggle("is-lit-stage-2", level >= 4);
  diagnostic.classList.toggle("is-lit-leak-2", level >= 5);
  diagnostic.classList.toggle("is-lit-stage-3", level >= 6);
  diagnostic.classList.toggle("is-lit-leak-3", level >= 7);
  diagnostic.classList.toggle("is-lit-action", level >= 8);
  diagnostic.classList.toggle("is-complete", level >= 9);
}

function collectSegPaths(svg) {
  const bySeg = {};
  svg.querySelectorAll(".leak-path").forEach((p) => {
    const seg = parseInt(p.getAttribute("data-seg") || "0", 10);
    p.style.strokeDasharray = "1";
    p.style.strokeDashoffset = "1";
    if (!bySeg[seg]) bySeg[seg] = [];
    bySeg[seg].push(p);
  });
  return bySeg;
}

function setSegDraw(bySeg, seg, amount) {
  const clamped = amount < 0 ? 0 : amount > 1 ? 1 : amount;
  const paths = bySeg[seg] || [];
  for (const p of paths) {
    p.style.strokeDashoffset = String(1 - clamped);
  }
}

function drawAllStatic(svg, diagnostic) {
  svg.querySelectorAll(".leak-path").forEach((p) => {
    p.style.strokeDashoffset = "0";
  });
  diagnostic.classList.add("is-static", ...LIT_CLASSES);
}

function applyProgress(diagnostic, bySeg, progress) {
  const p = progress < 0 ? 0 : progress > 1 ? 1 : progress;
  const stepCount = STEPS.length;
  const unit = 1 / stepCount;
  let litLevel = 0;

  for (let s = 0; s < stepCount; s++) {
    const step = STEPS[s];
    const start = s * unit;
    const local = (p - start) / unit;

    for (const seg of step.paths) {
      if (local <= 0) {
        setSegDraw(bySeg, seg, 0);
      } else if (local >= 1) {
        setSegDraw(bySeg, seg, 1);
      } else {
        setSegDraw(bySeg, seg, local);
      }
    }

    if (local > 0) litLevel = Math.max(litLevel, step.lit - (local >= 1 ? 0 : 1));
    if (local >= 1) litLevel = Math.max(litLevel, step.lit);
  }

  if (p > 0) litLevel = Math.max(litLevel, 1);
  setLitState(diagnostic, litLevel);
}

export function initConversionLeakSchematic({ reducedMotion = false, staticDraw = false } = {}) {
  const diagnostic = document.getElementById("leak-diagnostic");
  const svg = diagnostic?.querySelector(".leak-diagnostic__svg");
  if (!diagnostic || !svg) return null;

  if (reducedMotion || staticDraw) {
    drawAllStatic(svg, diagnostic);
    return null;
  }

  const bySeg = collectSegPaths(svg);

  window.ScrollTrigger.create({
    trigger: "#problem",
    start: "top 72%",
    end: "bottom 35%",
    scrub: 0.35,
    onUpdate: (self) => applyProgress(diagnostic, bySeg, self.progress),
  });

  return { diagnostic, bySeg };
}
