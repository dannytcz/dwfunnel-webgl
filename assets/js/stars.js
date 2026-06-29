/**
 * Twinkling star canvas — 200 ambient stars behind the film, with
 * pointer parallax and reduced-motion fallback. Always-on, paint-only.
 */

const STAR_COUNT = 220;
const PARALLAX_PX = 8;

const mulberry32 = (seed) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

export class StarField {
  constructor(stage, opts = {}) {
    this.stage = stage;
    this.reducedMotion = opts.reducedMotion ?? false;
    this.canvas = document.createElement("canvas");
    this.canvas.className = "cinema__stars";
    this.ctx = this.canvas.getContext("2d");
    this.stars = [];
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.mouseX = 0;
    this.mouseY = 0;
    this.started = 0;
    this.rafId = 0;

    const media = stage.querySelector(".cinema__media") ?? stage;
    media.appendChild(this.canvas);

    this.resize();
    this._onResize = this.resize.bind(this);
    this._onPointer = this._onPointer.bind(this);
    window.addEventListener("resize", this._onResize, { passive: true });
    window.addEventListener("pointermove", this._onPointer, { passive: true });
  }

  _onPointer(e) {
    this.mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
    this.mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
  }

  resize() {
    const w = this.stage.clientWidth;
    const h = this.stage.clientHeight;
    this.canvas.width = w * this.dpr;
    this.canvas.height = h * this.dpr;
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    const rng = mulberry32(0xc0ffee);
    this.stars = Array.from({ length: STAR_COUNT }, () => ({
      x: rng() * w,
      y: rng() * h,
      r: 0.4 + rng() * 1.4,
      base: 0.25 + rng() * 0.55,
      phase: rng() * Math.PI * 2,
      speed: 0.6 + rng() * 1.6,
      flicker: rng() < 0.04 ? 0 : -1,
      flickerUntil: 0,
    }));
  }

  start() {
    this.started = performance.now();
    this._tick();
  }

  stop() {
    cancelAnimationFrame(this.rafId);
    this.rafId = 0;
    window.removeEventListener("resize", this._onResize);
    window.removeEventListener("pointermove", this._onPointer);
    this.canvas.remove();
  }

  _tick() {
    const t = (performance.now() - this.started) / 1000;
    const { ctx, canvas, stars, dpr } = this;
    const w = canvas.width / dpr;
    const h = canvas.height / dpr;
    const ox = -this.mouseX * PARALLAX_PX;
    const oy = -this.mouseY * PARALLAX_PX;

    ctx.clearRect(0, 0, w, h);

    for (const s of stars) {
      let alpha = s.base;
      if (!this.reducedMotion) {
        alpha *= 0.45 + 0.55 * Math.sin(t * s.speed + s.phase);
        if (s.flickerUntil === 0 && Math.random() < 0.003) {
          s.flickerUntil = t + 0.18 + Math.random() * 0.18;
        }
        if (s.flickerUntil > 0) {
          if (t < s.flickerUntil) {
            const k = 1 - (s.flickerUntil - t) / 0.36;
            alpha = Math.min(1, alpha + k * 0.8);
          } else {
            s.flickerUntil = 0;
          }
        }
      }
      alpha = Math.max(0, Math.min(1, alpha));

      ctx.beginPath();
      ctx.fillStyle = `rgba(232, 244, 255, ${alpha})`;
      ctx.arc(s.x + ox, s.y + oy, s.r, 0, Math.PI * 2);
      ctx.fill();

      if (s.r > 1.0 && alpha > 0.5) {
        ctx.beginPath();
        ctx.fillStyle = `rgba(94, 234, 212, ${alpha * 0.35})`;
        ctx.arc(s.x + ox, s.y + oy, s.r * 2.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    this.rafId = requestAnimationFrame(this._tick.bind(this));
  }
}
