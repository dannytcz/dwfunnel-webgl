/**
 * Per-act frame cache + idle loop with handoff frame tracking.
 */

export class ActFrameCache {
  constructor(container, canvas, opts = {}) {
    this.container = container;
    this.canvas = canvas;
    this.reducedMotion = opts.reducedMotion ?? false;
    this.cache = new Map();
  }

  async loadAct(cdnKey, urls, onProgress) {
    if (this.cache.has(cdnKey)) return this.cache.get(cdnKey);
    const { FrameScrubber } = await import("./frame-scrub.js");
    const scrubber = new FrameScrubber(this.container, this.canvas, urls, {
      reducedMotion: this.reducedMotion,
      parallaxCanvas: 0,
    });
    await scrubber.load(onProgress);
    this.cache.set(cdnKey, scrubber);
    return scrubber;
  }

  getAct(cdnKey) {
    return this.cache.get(cdnKey) ?? null;
  }

  draw(cdnKey, index, fx = {}) {
    this.cache.get(cdnKey)?.draw(index, fx);
  }

  resizeAll() {
    for (const s of this.cache.values()) s.resize();
  }
}

export class IdleLayer {
  constructor(opts) {
    this.videoEl = opts.videoEl;
    this.cache = opts.cache;
    this.cdnKey = opts.cdnKey ?? "act0";
    this.loop = opts.loop ?? { start: 0, end: 40, fps: 10 };
    this.reducedMotion = opts.reducedMotion ?? false;
    this.mode = "webp";
    this.active = false;
    this.t = 0;
    this.currentFrame = this.loop.start;
    this._raf = 0;
    this.videoUrl = opts.videoUrl ?? null;
  }

  load(onProgress) {
    if (this.videoEl && this.videoUrl) {
      return new Promise((resolve) => {
        const v = this.videoEl;
        const done = (ok) => {
          this.mode = ok ? "video" : "webp";
          onProgress?.(1);
          resolve(this.mode);
        };
        v.muted = true;
        v.loop = true;
        v.playsInline = true;
        v.preload = "auto";
        v.src = this.videoUrl;
        v.oncanplaythrough = () => done(true);
        v.onerror = () => done(false);
        setTimeout(() => done(v.readyState >= 2), 10000);
      });
    }
    onProgress?.(1);
    return Promise.resolve("webp");
  }

  getCurrentFrame() {
    return this.currentFrame;
  }

  start() {
    if (this.reducedMotion) {
      this.currentFrame = this.loop.start;
      this.cache.draw(this.cdnKey, this.currentFrame, { scale: 1.02 });
      return;
    }
    this.active = true;
    if (this.mode === "video" && this.videoEl) {
      this.videoEl.style.opacity = "1";
      this.videoEl.play().catch(() => {
        this.mode = "webp";
        this._startWebpLoop();
      });
    } else {
      this._startWebpLoop();
    }
  }

  stop() {
    this.active = false;
    if (this._raf) cancelAnimationFrame(this._raf);
    this._raf = 0;
    if (this.videoEl) this.videoEl.pause();
  }

  setVideoOpacity(opacity) {
    if (!this.videoEl || this.mode !== "video") return;
    this.videoEl.style.opacity = String(opacity);
    if (opacity > 0.05 && this.videoEl.paused && this.active) {
      this.videoEl.play().catch(() => {});
    }
    if (opacity < 0.05) this.videoEl.pause();
  }

  applyParallax(x, y, amount = 0.045) {
    if (this.mode !== "video" || !this.videoEl) return;
    const cx = x * amount * 26;
    const cy = y * amount * 16;
    this.videoEl.style.transform = `translate(${cx}px, ${cy}px) scale(1.03)`;
  }

  _frameFromVideoTime() {
    const v = this.videoEl;
    if (!v?.duration) return this.loop.start;
    const span = this.loop.end - this.loop.start + 1;
    const ratio = (v.currentTime % v.duration) / v.duration;
    return this.loop.start + Math.floor(ratio * span) % span;
  }

  _startWebpLoop() {
    if (!this.active) return;
    let last = performance.now();
    const tick = (now) => {
      if (!this.active || this.mode !== "webp") return;
      const dt = (now - last) / 1000;
      last = now;
      this.t += dt;
      const span = this.loop.end - this.loop.start + 1;
      const idx = this.loop.start + Math.floor(this.t * this.loop.fps) % span;
      this.currentFrame = idx;
      const breath = 1 + Math.sin(this.t * 0.85) * 0.012;
      const driftY = Math.sin(this.t * 0.55) * 4;
      this.cache.draw(this.cdnKey, idx, { scale: breath, offsetY: driftY });
      this._raf = requestAnimationFrame(tick);
    };
    this._raf = requestAnimationFrame(tick);
  }

  /** Sync loop position when using video (for handoff). */
  syncFrameFromVideo() {
    if (this.mode === "video") this.currentFrame = this._frameFromVideoTime();
  }
}
