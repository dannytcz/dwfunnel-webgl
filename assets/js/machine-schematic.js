/**
 * Phase 3: The Machine, rebuilt as a self-drawing SVG blueprint schematic.
 * The frame sequence / canvas scrubber is gone. During the 200vh pin the
 * funnel machine draws itself segment by segment (stroke-dashoffset scrub),
 * each chamber ignites as it completes, the text components sync to the
 * igniting chamber, and a sparse particle drift flows down the funnel path.
 */
const MACHINE_PIN_VH = 200;
const SEG_COUNT = 4; // 0 intake, 1-3 chambers (+ output on seg 3)
const MAX_PARTICLES = 40;

function collectDraws(svg) {
  const segs = Array.from({ length: SEG_COUNT }, () => []);
  svg.querySelectorAll(".schem-draw").forEach((p) => {
    const seg = parseInt(p.getAttribute("data-seg") || "0", 10);
    // pathLength="1" is set in markup so dash math is uniform for all shapes.
    p.style.strokeDasharray = "1";
    p.style.strokeDashoffset = "1";
    (segs[seg] || segs[0]).push(p);
  });
  return segs;
}

function setSegOffset(paths, offset) {
  for (const p of paths) p.style.strokeDashoffset = String(offset);
}

/** Fully drawn, statically lit — mobile + reduced motion. */
function drawStatic(svg) {
  svg.querySelectorAll(".schem-draw").forEach((p) => {
    p.style.strokeDasharray = "1";
    p.style.strokeDashoffset = "0";
  });
  svg.querySelectorAll(".schem-chamber[data-chamber]").forEach((c) => {
    if (parseInt(c.getAttribute("data-chamber"), 10) >= 0) {
      c.classList.add("is-lit");
      c.style.setProperty("--glow", "5px");
    }
  });
  document.querySelectorAll(".machine-component").forEach((el, i) => {
    el.classList.toggle("is-active", i === 2);
  });
}

function createParticles(canvas) {
  const ctx = canvas.getContext("2d");
  let dpr = Math.min(window.devicePixelRatio || 1, 2);
  let w = 0;
  let h = 0;
  const parts = [];

  function resize() {
    const r = canvas.getBoundingClientRect();
    w = r.width;
    h = r.height;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(w * dpr));
    canvas.height = Math.max(1, Math.round(h * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function spawn() {
    // Drift down the central funnel column with slight horizontal jitter.
    return {
      x: w * 0.5 + (Math.random() - 0.5) * w * 0.16,
      y: -Math.random() * h,
      v: 0.4 + Math.random() * 0.9,
      drift: (Math.random() - 0.5) * 0.25,
    };
  }

  resize();
  for (let i = 0; i < MAX_PARTICLES; i++) {
    const p = spawn();
    p.y = Math.random() * h;
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
      if (p.y > h + 4) Object.assign(p, spawn());
      ctx.beginPath();
      ctx.arc(p.x, p.y, 1, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  const onResize = () => resize();
  window.addEventListener("resize", onResize);

  return {
    start() {
      if (running) return;
      running = true;
      window.gsap.ticker.add(tick);
    },
    stop() {
      if (!running) return;
      running = false;
      window.gsap.ticker.remove(tick);
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
  const chambers = Array.from(svg.querySelectorAll(".schem-chamber[data-chamber]")).filter(
    (c) => parseInt(c.getAttribute("data-chamber"), 10) >= 0
  );

  if (reducedMotion || staticDraw) {
    drawStatic(svg);
    if (particlesCanvas) particlesCanvas.style.display = "none";
    return null;
  }

  const segs = collectDraws(svg);
  const litState = chambers.map(() => false);
  const particles = particlesCanvas ? createParticles(particlesCanvas) : null;

  function igniteChamber(i, lit) {
    if (litState[i] === lit) return;
    litState[i] = lit;
    const el = chambers[i];
    el.classList.toggle("is-lit", lit);
    if (lit) {
      const o = { g: 2 };
      window.gsap.to(o, {
        g: 16,
        duration: 0.22,
        repeat: 1,
        yoyo: true,
        ease: "sine.inOut",
        onUpdate: () => el.style.setProperty("--glow", o.g + "px"),
        onComplete: () => el.style.setProperty("--glow", "5px"),
      });
    } else {
      window.gsap.killTweensOf(el);
      el.style.setProperty("--glow", "0px");
    }
  }

  const st = window.ScrollTrigger.create({
    trigger: pin,
    start: "top top",
    end: `+=${MACHINE_PIN_VH}%`,
    pin: true,
    scrub: 0.2,
    anticipatePin: 1,
    onToggle: (self) => {
      if (self.isActive) particles?.start();
      else particles?.stop();
    },
    onUpdate: (self) => {
      const p = self.progress;
      // Segment i draws across its quarter of the pin.
      for (let i = 0; i < SEG_COUNT; i++) {
        const local = Math.max(0, Math.min(1, (p - i * 0.25) / 0.25));
        setSegOffset(segs[i], 1 - local);
      }
      // Chambers map to segments 1..3; ignite when their segment finishes.
      chambers.forEach((_, i) => {
        const local = Math.max(0, Math.min(1, (p - (i + 1) * 0.25) / 0.25));
        igniteChamber(i, local >= 0.98);
      });
      // Text components sync with the igniting chamber.
      const activeIdx = p < 0.25 ? 0 : Math.min(2, Math.floor((p - 0.25) / 0.25));
      components.forEach((el, i) => el.classList.toggle("is-active", i === activeIdx));
    },
  });

  return {
    kill: () => {
      st.kill();
      particles?.kill();
    },
  };
}
