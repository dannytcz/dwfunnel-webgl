/**
 * Bitmap frame scrubber — preload via createImageBitmap, draw on gsap.ticker only.
 */

const PLACEHOLDER_FILL = "#061018";
const BITMAP_MAX_W = 1600;
const DPR_CAP = 1.5;
const RESIZE_DEBOUNCE_MS = 200;

export class FrameScrubber {
  constructor(container, canvas, urls, opts = {}) {
    this.container = container;
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d", { alpha: false });
    this.urls = urls;
    /** @type {(ImageBitmap|null)[]} */
    this.bitmaps = new Array(urls.length).fill(null);
    this.targetFrame = 0;
    this.lastDrawnFrame = -1;
    this.fx = { scale: 1, offsetY: 0, offsetX: 0 };
    this.reducedMotion = opts.reducedMotion ?? false;
    this._onProgress = null;
    this._tickerActive = false;
    this._resizeTimer = null;
    this._clientW = 0;
    this._clientH = 0;
    this._lastFx = {};
    this.debugLabel = opts.debugLabel ?? "";
  }

  get frameCount() {
    return this.urls.length;
  }

  async _fetchBitmap(url) {
    try {
      const res = await fetch(url, { mode: "cors", credentials: "omit" });
      if (!res.ok) throw new Error(`fetch ${url}`);
      const blob = await res.blob();
      try {
        return await createImageBitmap(blob, {
          resizeWidth: BITMAP_MAX_W,
          resizeQuality: "high",
        });
      } catch {
        return await createImageBitmap(blob);
      }
    } catch {
      // Fallback: some CDNs omit CORS headers, which fails fetch/createImageBitmap.
      // An <img> element can still be drawn to canvas (we never read pixels back).
      return await this._loadImageElement(url);
    }
  }

  _loadImageElement(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.decoding = "async";
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`img ${url}`));
      img.src = url;
    });
  }

  /** Preload every frame; loader progress tied to decode count. */
  async load(onProgress) {
    this._onProgress = onProgress;
    if (!this.urls.length) return;

    const total = this.urls.length;

    // Decode the first visible frame first, then paint immediately so the scene
    // is never a black void while the rest of the sequence streams in.
    const priority = Math.max(0, Math.min(total - 1, this.priorityIndex ?? 0));
    try {
      this.bitmaps[priority] = await this._fetchBitmap(this.urls[priority]);
    } catch {
      this.bitmaps[priority] = null;
    }
    this.resize();
    this._ensureTicker();
    // Paint the first frame synchronously so the scene shows immediately,
    // without waiting on the next rAF tick.
    this.renderNow();

    let done = 1;
    this._onProgress?.(done / total);

    const concurrency = 6;
    let next = 0;

    const worker = async () => {
      while (next < total) {
        const i = next++;
        if (i === priority) continue;
        try {
          this.bitmaps[i] = await this._fetchBitmap(this.urls[i]);
        } catch {
          this.bitmaps[i] = null;
        }
        done++;
        this._onProgress?.(done / total);
      }
    };

    await Promise.all(Array.from({ length: Math.min(concurrency, total) }, () => worker()));
    this.resize();
    this.renderNow();
  }

  /** @deprecated use setTargetFrame in scroll callbacks */
  draw(index, fx = {}) {
    this.setTargetFrame(index);
    this.setFx(fx);
  }

  setTargetFrame(index) {
    if (!this.urls.length) return;
    this.targetFrame = Math.max(0, Math.min(this.urls.length - 1, Math.round(index)));
  }

  setFx(fx = {}) {
    this.fx = { ...this.fx, ...fx };
    this._lastFx = this.fx;
  }

  /** No-op — all frames preloaded in load(). */
  prewarm() {}
  prefetchRange() {
    return Promise.resolve();
  }

  _nearestBitmap(index) {
    if (this.bitmaps[index]) return this.bitmaps[index];
    for (let d = 1; d < this.bitmaps.length; d++) {
      if (this.bitmaps[index - d]) return this.bitmaps[index - d];
      if (this.bitmaps[index + d]) return this.bitmaps[index + d];
    }
    return null;
  }

  /** Force an immediate synchronous paint of the current target frame. */
  renderNow() {
    this._renderTick();
  }

  _ensureTicker() {
    if (this._tickerActive || !this.urls.length || !window.gsap) return;
    this._tickerActive = true;
    window.gsap.ticker.add(this._renderTick);
  }

  _renderTick = () => {
    if (!this.urls.length) return;
    const target = this.targetFrame;
    const bmp = this._nearestBitmap(target);
    if (!bmp) return;

    const fxKey = `${target}|${this.fx.scale}|${this.fx.offsetY}|${this.fx.offsetX}`;
    if (fxKey === this._lastPaintKey) return;

    this._paint(bmp);
    this.lastDrawnFrame = target;
    this._lastPaintKey = fxKey;

    if (this.debugLabel && window.__DEBUG_MACHINE) {
      console.log(`[${this.debugLabel}] frames=${this.urls.length} target=${target} drawn=${this.lastDrawnFrame}`);
    }
  };

  _paint(bmp) {
    const w = this._clientW || this.container.clientWidth;
    const h = this._clientH || this.container.clientHeight;
    if (!w || !h) return;

    const ctx = this.ctx;
    const fx = this.fx;
    const scale = fx.scale ?? 1;
    const ox = fx.offsetX ?? 0;
    const oy = fx.offsetY ?? 0;

    const bw = bmp.width || bmp.naturalWidth;
    const bh = bmp.height || bmp.naturalHeight;
    if (!bw || !bh) return;
    const baseScale = Math.max(w / bw, h / bh);
    const drawScale = baseScale * scale;
    const dw = bw * drawScale;
    const dh = bh * drawScale;
    const dx = (w - dw) / 2 + ox;
    const dy = (h - dh) / 2 + oy;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = PLACEHOLDER_FILL;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.drawImage(bmp, dx, dy, dw, dh);
    this._lastPaintFx = { ...fx };
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP);
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    if (!w || !h) return;
    this._clientW = w;
    this._clientH = h;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.lastDrawnFrame = -1;
    // Resizing clears the canvas backing store; invalidate the paint key so the
    // next render repaints instead of being skipped by the equality guard.
    this._lastPaintKey = null;
  }

  bindResize() {
    if (this._resizeBound) return;
    this._resizeBound = true;
    window.addEventListener("resize", () => {
      clearTimeout(this._resizeTimer);
      this._resizeTimer = setTimeout(() => {
        this.resize();
        window.ScrollTrigger?.refresh?.();
      }, RESIZE_DEBOUNCE_MS);
    });
  }
}

export function scrollFx(progress, opts = {}) {
  const p = Math.max(0, Math.min(1, progress));
  return {
    scale: 1 + p * (opts.scaleDelta ?? 0.08),
    offsetY: -p * (opts.offsetY ?? 22),
  };
}
