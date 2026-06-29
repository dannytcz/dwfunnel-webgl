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

  drawStill(img) {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    if (!w || !h || !img?.naturalWidth) return;
    const ctx = this.canvas.getContext("2d", { alpha: false });
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = w * dpr;
    this.canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const baseScale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
    const dw = img.naturalWidth * baseScale;
    const dh = img.naturalHeight * baseScale;
    const dx = (w - dw) / 2;
    const dy = (h - dh) / 2;
    ctx.fillStyle = "#030508";
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, dx, dy, dw, dh);
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
    this.stillUrl = opts.stillUrl ?? null;
    this.mode = opts.mode === "still" ? "still" : "webp";
    this.active = false;
    this.t = 0;
    this.currentFrame = 0;
    this._raf = 0;
    this.videoUrl = opts.videoUrl ?? null;
    this._stillImg = null;
  }

  load(onProgress) {
    if (this.mode === "still" && this.stillUrl) {
      return new Promise((resolve) => {
        const img = new Image();
        img.decoding = "async";
        img.onload = () => {
          this._stillImg = img;
          this.mode = "still";
          onProgress?.(1);
          resolve("still");
        };
        img.onerror = () => {
          this.mode = "webp";
          onProgress?.(1);
          resolve("webp");
        };
        img.src = this.stillUrl;
      });
    }
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
    return this.mode === "still" ? 0 : this.currentFrame;
  }

  start() {
    if (this.reducedMotion) {
      this.currentFrame = this.mode === "still" ? 0 : this.loop.start;
      if (this.mode === "still") this._drawStill();
      else this.cache.draw(this.cdnKey, this.currentFrame, { scale: 1.02 });
      return;
    }
    this.active = true;
    if (this.mode === "still") {
      this._drawStill();
      return;
    }
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
    if (this.mode === "still") {
      this.currentFrame = 0;
      return;
    }
    if (this.mode === "video") this.currentFrame = this._frameFromVideoTime();
  }

  _drawStill() {
    if (this._stillImg?.naturalWidth) {
      this.cache.drawStill(this._stillImg);
      return;
    }
    this.cache.draw(this.cdnKey, 0, { scale: 1 });
  }
}
