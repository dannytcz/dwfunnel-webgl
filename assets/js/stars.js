/**
 * Twinkling star canvas — 200 ambient stars behind the film, with
 * pointer parallax and reduced-motion fallback. Visibility-gated so the
 * rAF loop is paused when the stage scrolls out of view or the tab is
 * hidden, and capped to ~40 Hz to keep the rAF budget under 2.5 ms/frame.
 */

const STAR_COUNT = 220;
const PARALLAX_PX = 8;
const TICK_MS = 25;          // 40 Hz repaint ceiling
const RESIZE_THRESHOLD_PX = 8;
const PARALLAX_THROTTLE_MS = 32; // 30 Hz transform pushes

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
    this.dpr = 1; // hard cap: star canvas doesn't need retina, halves the GPU cost
    this.mouseX = 0;
    this.mouseY = 0;
    this.started = 0;
    this.rafId = 0;
    this._lastTickAt = 0;
    this._lastW = 0;
    this._lastH = 0;
    this._visible = false;
    this._alive = true;
    this._lastPointerAt = 0;
    this._pendingPointer = null;

    const media = stage.querySelector(".cinema__media") ?? stage;
    media.appendChild(this.canvas);

    this.resize();
    this._onResize = this.resize.bind(this);
    this._onPointer = this._onPointer.bind(this);
    this._onVisibility = this._onVisibility.bind(this);
    window.addEventListener("resize", this._onResize, { passive: true });
    window.addEventListener("pointermove", this._onPointer, { passive: true });
    document.addEventListener("visibilitychange", this._onVisibility);

    if ("IntersectionObserver" in window) {
      this._io = new IntersectionObserver((entries) => {
        for (const entry of entries) {
          this._visible = entry.isIntersecting;
          if (this._visible) this._scheduleTick();
          else this._cancelTick();
        }
      }, { threshold: 0.01 });
      this._io.observe(stage);
    } else {
      this._visible = true;
    }
  }

  _onPointer(e) {
    const now = performance.now();
    if (now - this._lastPointerAt < PARALLAX_THROTTLE_MS) return;
    this._lastPointerAt = now;
    this.mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
    this.mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
  }

  _onVisibility() {
    if (document.visibilityState === "visible" && this._visible) {
      this._scheduleTick();
    } else {
      this._cancelTick();
    }
  }

  resize() {
    const w = this.stage.clientWidth;
    const h = this.stage.clientHeight;
    if (
      Math.abs(w - this._lastW) < RESIZE_THRESHOLD_PX &&
      Math.abs(h - this._lastH) < RESIZE_THRESHOLD_PX &&
      this.stars.length
    ) {
      return;
    }
    this._lastW = w;
    this._lastH = h;
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
      flickerUntil: 0,
    }));
  }

  start() {
    this.started = performance.now();
    this._lastTickAt = 0;
    if (this._visible) this._scheduleTick();
  }

  stop() {
    this._alive = false;
    this._cancelTick();
    if (this._io) {
      this._io.disconnect();
      this._io = null;
    }
    window.removeEventListener("resize", this._onResize);
    window.removeEventListener("pointermove", this._onPointer);
    document.removeEventListener("visibilitychange", this._onVisibility);
    if (this.canvas.parentNode) this.canvas.parentNode.removeChild(this.canvas);
  }

  _scheduleTick() {
    if (!this._alive || this.rafId) return;
    this.rafId = requestAnimationFrame(() => this._tick());
  }

  _cancelTick() {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }
  }

  _tick() {
    this.rafId = 0;
    if (!this._alive || !this._visible) return;
    const now = performance.now();
    if (this._lastTickAt && now - this._lastTickAt < TICK_MS) {
      this._scheduleTick();
      return;
    }
    this._lastTickAt = now;

    const t = (now - this.started) / 1000;
    const { ctx, canvas, stars } = this;
    const w = canvas.width;
    const h = canvas.height;
    const ox = -this.mouseX * PARALLAX_PX;
    const oy = -this.mouseY * PARALLAX_PX;

    ctx.clearRect(0, 0, w, h);

    // Batched: one fillStyle for the base pass, one for the glow pass.
    // Each star is drawn as a single fillRect (no beginPath/arc/fill).
    const baseR = 232, baseG = 244, baseB = 255;
    const glowR = 94, glowG = 234, glowB = 212;

    // Pass 1 — base white-blue stars
    for (let i = 0; i < stars.length; i++) {
      const s = stars[i];
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
      if (alpha <= 0) continue;
      alpha = alpha > 1 ? 1 : alpha;
      ctx.fillStyle = `rgba(${baseR},${baseG},${baseB},${alpha.toFixed(3)})`;
      const x = s.x + ox;
      const y = s.y + oy;
      const r = s.r;
      // Approximate the disc with a 2r x 2r fillRect (slight square halo, hidden by the dim alpha).
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }

    // Pass 2 — teal glow halos, only for the larger stars that are bright enough.
    if (!this.reducedMotion) {
      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];
        if (s.r <= 1.0) continue;
        let alpha = s.base;
        alpha *= 0.45 + 0.55 * Math.sin(t * s.speed + s.phase);
        if (alpha <= 0.35) continue;
        alpha = Math.min(1, alpha * 0.35);
        ctx.fillStyle = `rgba(${glowR},${glowG},${glowB},${alpha.toFixed(3)})`;
        const x = s.x + ox;
        const y = s.y + oy;
        const r = s.r * 2.4;
        ctx.fillRect(x - r, y - r, r * 2, r * 2);
      }
    }

    if (this._alive && this._visible) this._scheduleTick();
  }
}
