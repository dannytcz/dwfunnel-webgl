/**
 * Phase 3: The Machine, rebuilt as a self-drawing SVG blueprint schematic.
 * The frame sequence / canvas scrubber is gone. During the 200vh pin the
 * funnel machine draws itself segment by segment (stroke-dashoffset scrub),
 * each chamber ignites as it completes, the text components sync to the
 * igniting chamber, and a sparse particle drift flows down the funnel path.
 *
 * PERF NOTES (main-thread safety):
 * - No distance-accumulation loops (for d += step) anywhere. Every loop has a
 *   fixed iteration count, so a zero/invalid path length can never infinite-loop.
 * - Path geometry is measured once at init (diagnostic only, guarded against 0).
 * - No SVG filter is applied to elements whose strokeDashoffset changes during
 *   scrub. An ancestor filter (e.g. drop-shadow) would force the whole group to
 *   re-rasterize every frame and lock the main thread; ignite is done with a
 *   pure stroke change instead.
 * - Particles are a fixed pool of 40, recycled (never allocated per frame),
 *   the tick is added to gsap.ticker exactly once and removed when the pin is
 *   inactive, and it is created lazily only after the canvas is laid out.
 */
const MACHINE_PIN_VH = 200;
const SEG_COUNT = 4; // 0 intake, 1-3 chambers (+ output on seg 3)
const MAX_PARTICLES = 40;

function collectDraws(svg) {
  const segs = Array.from({ length: SEG_COUNT }, () => []);
  const lengths = [];
  svg.querySelectorAll(".schem-draw").forEach((p, idx) => {
    const seg = parseInt(p.getAttribute("data-seg") || "0", 10);
    // Diagnostic measurement, once. pathLength="1" makes the dash math uniform
    // regardless of geometry, so we never divide by this. A zero/invalid length
    // just means the path is not laid out or degenerate: skip its draw.
    let len = 0;
    try {
      len = p.getTotalLength();
    } catch {
      len = 0;
    }
    lengths.push(Math.round(len));
    if (!isFinite(len) || len <= 0) {
      console.warn(`[schematic] path #${idx} (seg ${seg}) length ${len} — skipping its draw`);
      p.style.strokeDasharray = "none";
      p.style.strokeDashoffset = "0";
      return;
    }
    p.style.strokeDasharray = "1";
    p.style.strokeDashoffset = "1";
    p._last = 1;
    (segs[seg] || segs[0]).push(p);
  });
  console.info(`[schematic] measured path lengths (px): ${lengths.join(", ")}`);
  return segs;
}

function setSegOffset(paths, offset) {
  const clamped = offset < 0 ? 0 : offset > 1 ? 1 : offset;
  const rounded = Math.round(clamped * 1000) / 1000;
  for (const p of paths) {
    if (p._last === rounded) continue; // skip redundant style writes / repaints
    p._last = rounded;
    p.style.strokeDashoffset = String(rounded);
  }
}

/** Fully drawn, statically lit — mobile + reduced motion. */
function drawStatic(svg) {
  svg.querySelectorAll(".schem-draw").forEach((p) => {
    p.style.strokeDasharray = "1";
    p.style.strokeDashoffset = "0";
  });
  svg.querySelectorAll(".schem-chamber[data-chamber]").forEach((c) => {
    if (parseInt(c.getAttribute("data-chamber"), 10) >= 0) c.classList.add("is-lit");
  });
  document.querySelectorAll(".machine-component").forEach((el, i) => {
    el.classList.toggle("is-active", i === 2);
  });
}

function createParticles(canvas) {
  const ctx = canvas.getContext("2d");
  // DPR 1 on purpose: this canvas is full-viewport and cleared every frame;
  // 2px dots do not need a higher backing store, and DPR 2 would quadruple the
  // per-frame clear/fill cost for no visible benefit.
  const dpr = 1;
  let w = 0;
  let h = 0;
  const parts = [];

  function resize() {
    const r = canvas.getBoundingClientRect();
    w = r.width;
    h = r.height;
    canvas.width = Math.max(1, Math.round(w * dpr));
    canvas.height = Math.max(1, Math.round(h * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function spawn() {
    const cw = w > 0 ? w : 1;
    const ch = h > 0 ? h : 1;
    return {
      x: cw * 0.5 + (Math.random() - 0.5) * cw * 0.16,
      y: -Math.random() * ch,
      v: 0.4 + Math.random() * 0.9,
      drift: (Math.random() - 0.5) * 0.25,
    };
  }

  resize();
  // Fixed pool, allocated once.
  for (let i = 0; i < MAX_PARTICLES; i++) {
    const p = spawn();
    p.y = Math.random() * (h > 0 ? h : 1);
    parts.push(p);
  }

  let running = false;
  const tick = () => {
    if (!running) return;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "rgba(216, 177, 92, 0.3)";
    for (const p of parts) {
      p.y += p.v;
      p.x += p.drift;
      if (p.y > h + 4) Object.assign(p, spawn()); // recycle, no new allocation
      ctx.beginPath();
      ctx.arc(p.x, p.y, 1, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  const onResize = () => resize();
  window.addEventListener("resize", onResize);

  return {
    start() {
      if (running) return; // guard: never stack ticker callbacks
      running = true;
      window.gsap.ticker.add(tick);
    },
    stop() {
      if (!running) return;
      running = false;
      window.gsap.ticker.remove(tick); // removed, not just flagged
      ctx.clearRect(0, 0, w, h);
    },
    kill() {
      this.stop();
      window.removeEventListener("resize", onResize);
    },
  };
}

export function initMachineSchematic({ reducedMotion = false, staticDraw = false } = {}) {
  const pin = document.getElementById("machine-pin");
  const svg = document.getElementById("machine-schematic");
  const particlesCanvas = document.getElementById("machine-particles");
  if (!pin || !svg) return null;

  const components = Array.from(document.querySelectorAll(".machine-component"));
  const stat = document.getElementById("machine-stat");
  const chambers = Array.from(svg.querySelectorAll(".schem-chamber[data-chamber]")).filter(
    (c) => parseInt(c.getAttribute("data-chamber"), 10) >= 0
  );

  if (reducedMotion || staticDraw) {
    drawStatic(svg);
    if (stat) stat.textContent = "120";
    if (particlesCanvas) particlesCanvas.style.display = "none";
    return null;
  }

  const segs = collectDraws(svg);
  const litState = chambers.map(() => false);

  // Particles are created lazily on first pin activation, only once the canvas
  // is confirmed laid out (width > 0), with a single next-frame retry.
  let particles = null;
  let particlesResolved = false;
  function ensureParticles(allowRetry = true) {
    if (particles || particlesResolved || !particlesCanvas) return;
    const width = particlesCanvas.getBoundingClientRect().width;
    if (!(width > 0)) {
      if (allowRetry) {
        requestAnimationFrame(() => ensureParticles(false));
      } else {
        console.warn("[schematic] particle canvas not laid out (width 0) — particles disabled");
        particlesResolved = true;
      }
      return;
    }
    particles = createParticles(particlesCanvas);
    particlesResolved = true;
    particles.start();
  }

  function igniteChamber(i, lit) {
    if (litState[i] === lit) return;
    litState[i] = lit;
    chambers[i].classList.toggle("is-lit", lit); // pure class toggle, no filter
  }

  const st = window.ScrollTrigger.create({
    trigger: pin,
    start: "top top",
    end: `+=${MACHINE_PIN_VH}%`,
    pin: true,
    scrub: 0.2,
    anticipatePin: 1,
    onToggle: (self) => {
      if (self.isActive) {
        ensureParticles();
        particles?.start();
      } else {
        particles?.stop();
      }
    },
    onUpdate: (self) => {
      const p = self.progress;
      // Fixed 4-iteration loop; each segment draws across its quarter of the pin.
      for (let i = 0; i < SEG_COUNT; i++) {
        const local = (p - i * 0.25) / 0.25; // constant divisor, never zero
        setSegOffset(segs[i], 1 - local);
      }
      // Chambers map to segments 1..3; ignite when their segment finishes.
      for (let i = 0; i < chambers.length; i++) {
        const local = (p - (i + 1) * 0.25) / 0.25;
        igniteChamber(i, local >= 0.98);
      }
      // Text components sync with the igniting chamber.
      const activeIdx = p < 0.25 ? 0 : Math.min(2, Math.floor((p - 0.25) / 0.25));
      for (let i = 0; i < components.length; i++) {
        components[i].classList.toggle("is-active", i === activeIdx);
      }

      // Live stat: the booked counter fills as the last chamber completes.
      if (stat) {
        const t = Math.max(0, Math.min(1, (p - 0.7) / 0.28));
        stat.textContent = String(Math.round(t * 120));
      }
    },
  });

  return {
    kill: () => {
      st.kill();
      particles?.kill();
    },
  };
}
