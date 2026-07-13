/**
 * Build Stack overlay — scroll-scrubbed environment routing over founder footage.
 *
 * Driven by the method section pin progress (0–1). Five acts:
 *   1  YOUR STACK          0.00–0.20
 *   2  Environments        0.20–0.45
 *   3  Route to core        0.45–0.65
 *   4  Conversion resolve  0.65–0.85
 *   5  Final state         0.85–1.00
 *
 * Reduced motion / static: CSS default is the resolved state; this module no-ops.
 */

const ENV_BANDS = {
  ghl: [0.2, 0.26],
  webflow: [0.26, 0.32],
  shopify: [0.32, 0.36],
  framer: [0.36, 0.4],
  clickfunnels: [0.4, 0.44],
  kajabi: [0.44, 0.48],
  wordpress: [0.48, 0.52],
  custom: [0.52, 0.56],
};

const ROUTE_BAND = [0.45, 0.65];
const CONVERSION_BAND = [0.65, 0.85];
const RESOLVE_BAND = [0.85, 1];

function smoothStep(p, a, b) {
  if (b <= a) return p >= b ? 1 : 0;
  const t = Math.max(0, Math.min(1, (p - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

function band(p, [a, b]) {
  return smoothStep(p, a, b);
}

function fadeOut(p, start, end) {
  return 1 - smoothStep(p, start, end);
}

export function initBuildStackOverlay(section, { reducedMotion = false, staticDraw = false } = {}) {
  const root = section?.querySelector(".stack-system");
  if (!root || reducedMotion || staticDraw) {
    if (root && section) initBuildStackStatic(section);
    return null;
  }

  const envs = Array.from(root.querySelectorAll(".stack-env"));
  const routes = Array.from(root.querySelectorAll(".stack-route"));
  const scan = root.querySelector(".stack-scan");
  const core = root.querySelector(".stack-core");
  const conversion = root.querySelector(".stack-conversion");
  const stages = Array.from(root.querySelectorAll(".stack-stage"));
  const seps = Array.from(root.querySelectorAll(".stack-conversion__sep"));
  const engineLine = section.querySelector(".stack-headline__line--engine");

  const routeLengths = new Map();
  routes.forEach((path) => {
    const len = path.getTotalLength();
    routeLengths.set(path, len);
    path.style.strokeDasharray = String(len);
    path.style.strokeDashoffset = String(len);
  });

  let engineGlitchFired = false;

  function apply(p) {
    root.style.setProperty("--stack-p", String(p));

    /* Act 1 — minimal scan labels */
    if (scan) {
      const scanV = band(p, [0.06, 0.14]) * fadeOut(p, 0.18, 0.24);
      scan.style.opacity = String(scanV * 0.42);
    }

    /* Act 2 — environments detected */
    envs.forEach((el) => {
      const key = el.dataset.env;
      const [a, b] = ENV_BANDS[key] || [0.2, 0.3];
      let v = band(p, [a, b]);
      if (p >= RESOLVE_BAND[0]) v *= fadeOut(p, 0.85, 0.94);
      el.style.opacity = String(v);
      el.style.transform = `translateY(${8 * (1 - v)}px)`;
    });

    /* Act 3 — routing lines toward core */
    const routeMaster = band(p, ROUTE_BAND);
    routes.forEach((path) => {
      const key = path.dataset.route;
      const envBand = ENV_BANDS[key];
      const envReady = envBand ? band(p, envBand) : 0;
      const t = routeMaster * envReady;
      const len = routeLengths.get(path) || 0;
      path.style.strokeDashoffset = String(len * (1 - t));
      path.style.opacity = String(0.22 + t * 0.55);
      if (p >= RESOLVE_BAND[0]) {
        path.style.opacity = String(parseFloat(path.style.opacity) * fadeOut(p, 0.86, 0.96));
      }
    });

    /* Core node */
    if (core) {
      const coreIn = band(p, [0.44, 0.52]);
      const coreOut = band(p, CONVERSION_BAND);
      let coreV = Math.max(coreIn, coreOut * 0.35);
      if (p >= CONVERSION_BAND[0]) coreV = Math.max(coreV, 1 - band(p, [0.72, 0.82]) * 0.85);
      if (p >= RESOLVE_BAND[0]) coreV *= fadeOut(p, 0.88, 0.96);
      core.style.opacity = String(coreV);
      core.classList.toggle("is-active", routeMaster > 0.35);
    }

    /* Headline glitch on engine reveal */
    if (engineLine && p >= 0.5 && !engineGlitchFired) {
      engineGlitchFired = true;
      engineLine.classList.add("is-glitching");
      window.setTimeout(() => engineLine.classList.remove("is-glitching"), 420);
    }
    if (engineLine && p < 0.45) engineGlitchFired = false;

    /* Act 4 — conversion path resolves from core */
    if (conversion) {
      const convMaster = band(p, CONVERSION_BAND);
      conversion.style.opacity = String(convMaster);
      const stageStep = 0.18;
      stages.forEach((stage, i) => {
        const a = CONVERSION_BAND[0] + i * stageStep;
        const b = a + 0.14;
        const v = band(p, [a, b]);
        stage.style.opacity = String(v);
        stage.style.transform = `translateY(${10 * (1 - v)}px)`;
      });
      seps.forEach((sep, i) => {
        const a = CONVERSION_BAND[0] + 0.08 + i * stageStep;
        const b = a + 0.1;
        sep.style.opacity = String(band(p, [a, b]));
      });
    }

    root.classList.toggle("is-routing", routeMaster > 0.2);
    root.classList.toggle("is-resolved", p >= RESOLVE_BAND[0]);
  }

  return { apply };
}

/** Static / reduced-motion: show the final resolved composition. */
export function initBuildStackStatic(section) {
  const root = section?.querySelector(".stack-system");
  if (!root) return;
  root.classList.add("is-static-mode");
  root.style.opacity = "1";
  root.querySelectorAll(".stack-route").forEach((path) => {
    path.style.strokeDashoffset = "0";
    path.style.opacity = "0.22";
  });
  root.querySelectorAll(".stack-env").forEach((el) => {
    el.style.opacity = "0.48";
    el.style.transform = "none";
  });
  const core = root.querySelector(".stack-core");
  if (core) {
    core.style.opacity = "0.55";
    core.classList.add("is-active");
  }
  const conversion = root.querySelector(".stack-conversion");
  if (conversion) conversion.style.opacity = "1";
  root.querySelectorAll(".stack-stage, .stack-conversion__sep").forEach((el) => {
    el.style.opacity = "1";
    el.style.transform = "none";
  });
}
