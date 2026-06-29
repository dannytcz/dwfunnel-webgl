/**
 * Idle background — looping MP4 or cycling WebP frames with subtle drift.
 */

export class IdleLayer {
  /**
   * @param {{
   *   videoEl: HTMLVideoElement | null,
   *   scrubber: import('./frame-scrub.js').FrameScrubber,
   *   videoUrl?: string | null,
   *   loop?: { start: number; end: number; fps: number },
   *   reducedMotion?: boolean,
   * }} opts
   */
  constructor(opts) {
    this.videoEl = opts.videoEl;
    this.scrubber = opts.scrubber;
    this.loop = opts.loop ?? { start: 0, end: 28, fps: 10 };
    this.reducedMotion = opts.reducedMotion ?? false;
    this.mode = "none"; // "video" | "webp" | "none"
    this.active = false;
    this.t = 0;
    this._raf = 0;
    this._videoOk = false;
    this.videoUrl = opts.videoUrl ?? null;
  }

  load(onProgress) {
    const tasks = [];

    if (this.videoEl && this.videoUrl) {
      tasks.push(
        new Promise((resolve) => {
          const v = this.videoEl;
          const done = (ok) => {
            this._videoOk = ok;
            onProgress?.(1);
            resolve(ok);
          };
          v.muted = true;
          v.loop = true;
          v.playsInline = true;
          v.preload = "auto";
          v.src = this.videoUrl;
          v.oncanplaythrough = () => done(true);
          v.onerror = () => done(false);
          setTimeout(() => done(v.readyState >= 2), 10000);
        })
      );
    } else {
      onProgress?.(1);
    }

    return Promise.all(tasks).then((results) => {
      this.mode = results[0] ? "video" : "webp";
      return this.mode;
    });
  }

  start() {
    if (this.reducedMotion) {
      this.scrubber.draw(this.loop.start, { scale: 1.02 });
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
    const cx = x * amount * 26;
    const cy = y * amount * 16;
    const breath = this.mode === "video" ? 1.03 : 1;
    const transform = `translate(${cx}px, ${cy}px) scale(${breath})`;
    if (this.videoEl && this.mode === "video") {
      this.videoEl.style.transform = transform;
    }
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
      const breath = 1 + Math.sin(this.t * 0.85) * 0.014;
      const driftY = Math.sin(this.t * 0.55) * 5;
      this.scrubber.draw(idx, { scale: breath, offsetY: driftY });
      this._raf = requestAnimationFrame(tick);
    };
    this._raf = requestAnimationFrame(tick);
  }
}
