/**
 * Bitmap frame scrubber — preload via createImageBitmap, draw on gsap.ticker.
 *
 * Phase 3 (frame pipeline diet):
 *  - decode width is a resolution tier chosen by the caller (960 / 1280 / 1440)
 *    so decoded memory scales with the viewport.
 *  - the gsap.ticker draw callback is paused when the owning pin is inactive
 *    (resumeTicker / pauseTicker, driven by ScrollTrigger onToggle).
 *  - releaseBitmaps()/reload() let the app keep only the active sequence decoded.
 */

const PLACEHOLDER_FILL = "#061018";
const DEFAULT_DECODE_W = 1280;
const DPR_CAP = 1.5;
// Hard cap on the canvas backing-store width so 4K/5K displays never allocate a
// huge canvas. Height follows proportionally so the drawn frame stays cover-fit.
const MAX_BACKING_W = 3200;
const RESIZE_DEBOUNCE_MS = 200;

export class FrameScrubber {
  constructor(container, canvas, urls, opts = {}) {
    this.container = container;
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d", { alpha: false });
    this.urls = urls;
    /** @type {(ImageBitmap|HTMLImageElement|null)[]} */
    this.bitmaps = new Array(urls.length).fill(null);
    this.targetFrame = 0;
    this.lastDrawnFrame = -1;
    this.fx = { scale: 1, offsetY: 0, offsetX: 0 };
    this.reducedMotion = opts.reducedMotion ?? false;
    this.decodeWidth = opts.decodeWidth ?? DEFAULT_DECODE_W;
    this.priorityIndex = opts.priorityIndex ?? 0;
    this._onProgress = null;
    this._tickerActive = false;
    this._resizeTimer = null;
    this._clientW = 0;
    this._clientH = 0;
    this._lastFx = {};
    this._released = false;
    this._loaded = false;
    this._pending = new Map();
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
          resizeWidth: this.decodeWidth,
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

  requestFrame(index) {
    if (!this.urls.length || this._released) return Promise.resolve();
    const i = Math.max(0, Math.min(this.urls.length - 1, Math.round(index)));
    if (this.bitmaps[i]) return Promise.resolve(this.bitmaps[i]);
    if (this._pending.has(i)) return this._pending.get(i);

    const promise = this._fetchBitmap(this.urls[i])
      .then((bitmap) => {
        this._pending.delete(i);
        if (this._released) {
          if (bitmap && typeof bitmap.close === "function") bitmap.close();
          return null;
        }
        this.bitmaps[i] = bitmap;
        if (i === this.targetFrame) this.renderNow();
        return bitmap;
      })
      .catch(() => {
        this._pending.delete(i);
        return null;
      });
    this._pending.set(i, promise);
    return promise;
  }

  requestTargetNeighborhood(index = this.targetFrame) {
    this.requestFrame(index);
    this.requestFrame(index - 1);
    this.requestFrame(index + 1);
  }

  /** Preload every frame; loader progress tied to decode count. */
  async load(onProgress) {
    this._onProgress = onProgress ?? this._onProgress;
    if (!this.urls.length) return;
    this._released = false;

    const total = this.urls.length;

    // Decode the first visible frame first, then paint immediately so the scene
    // is never a black void while the rest of the sequence streams in.
    const priority = Math.max(0, Math.min(total - 1, this.priorityIndex ?? 0));
    await this.requestFrame(priority);
    this.resize();
    this.renderNow();

    let done = 1;
    this._onProgress?.(done / total);

    const concurrency = 6;
    let next = 0;

    const worker = async () => {
      while (next < total) {
        const i = next++;
        if (i === priority) continue;
        if (this._released) return;
        await this.requestFrame(i);
        done++;
        this._onProgress?.(done / total);
      }
    };

    await Promise.all(Array.from({ length: Math.min(concurrency, total) }, () => worker()));
    this._loaded = true;
    this.resize();
    this.renderNow();
  }

  /** Re-decode after a releaseBitmaps() (re-fetch is cheap from HTTP cache). */
  async reload(onProgress) {
    if (!this._released && this._loaded) return;
    await this.load(onProgress);
  }

  /** Free decoded memory for the inactive sequence. */
  releaseBitmaps() {
    if (this._released) return;
    this._released = true;
    this._loaded = false;
    this.pauseTicker();
    for (let i = 0; i < this.bitmaps.length; i++) {
      const b = this.bitmaps[i];
      if (b && typeof b.close === "function") b.close();
      this.bitmaps[i] = null;
    }
    this._pending.clear();
    this.lastDrawnFrame = -1;
    this._lastPaintKey = null;
  }

  /** Sum of decoded pixels * 4 bytes for currently held bitmaps. */
  decodedBytes() {
    let bytes = 0;
    for (const b of this.bitmaps) {
      if (!b) continue;
      const w = b.width || b.naturalWidth || 0;
      const h = b.height || b.naturalHeight || 0;
      bytes += w * h * 4;
    }
    return bytes;
  }

  /** @deprecated use setTargetFrame in scroll callbacks */
  draw(index, fx = {}) {
    this.setTargetFrame(index);
    this.setFx(fx);
  }

  setTargetFrame(index) {
    if (!this.urls.length) return;
    this.targetFrame = Math.max(0, Math.min(this.urls.length - 1, Math.round(index)));
    this.requestTargetNeighborhood(this.targetFrame);
  }

  setFx(fx = {}) {
    this.fx = { ...this.fx, ...fx };
    this._lastFx = this.fx;
  }

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

  resumeTicker() {
    if (this._tickerActive || !this.urls.length || !window.gsap) return;
    this._tickerActive = true;
    window.gsap.ticker.add(this._renderTick);
    this.renderNow();
  }

  pauseTicker() {
    if (!this._tickerActive || !window.gsap) return;
    this._tickerActive = false;
    window.gsap.ticker.remove(this._renderTick);
  }

  _renderTick = () => {
    if (!this.urls.length) return;
    const target = this.targetFrame;
    const bmp = this._nearestBitmap(target);
    if (!bmp) {
      this.requestTargetNeighborhood(target);
      return;
    }

    const fxKey = `${target}|${this.fx.scale}|${this.fx.offsetY}|${this.fx.offsetX}`;
    if (fxKey === this._lastPaintKey) return;

    this._paint(bmp);
    this.lastDrawnFrame = target;
    this._lastPaintKey = fxKey;
  };

  _paint(bmp) {
    const ctx = this.ctx;
    // Work in device pixels (the backing store) so the frame always covers the
    // full canvas regardless of devicePixelRatio or the 3200px width cap.
    const cw = this.canvas.width;
    const ch = this.canvas.height;
    if (!cw || !ch) return;

    const bw = bmp.width || bmp.naturalWidth;
    const bh = bmp.height || bmp.naturalHeight;
    if (!bw || !bh) return;

    const fx = this.fx;
    const userScale = fx.scale ?? 1;
    // fx offsets are authored in CSS pixels; convert to backing pixels.
    const rs = this._clientW ? cw / this._clientW : 1;
    const ox = (fx.offsetX ?? 0) * rs;
    const oy = (fx.offsetY ?? 0) * rs;

    // Cover fit: scale so the frame fills the canvas on both axes, center crop.
    const cover = Math.max(cw / bw, ch / bh) * userScale;
    const dw = bw * cover;
    const dh = bh * cover;
    const dx = (cw - dw) / 2 + ox;
    const dy = (ch - dh) / 2 + oy;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = PLACEHOLDER_FILL;
    ctx.fillRect(0, 0, cw, ch);
    ctx.drawImage(bmp, dx, dy, dw, dh);
    this._lastPaintFx = { ...fx };
  }

  resize() {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    if (!w || !h) return;
    const dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP);
    // Cap backing width at 3200; scale height by the same factor to preserve the
    // element's aspect ratio so cover-fit drawing has no letterboxing.
    let renderScale = dpr;
    if (w * renderScale > MAX_BACKING_W) renderScale = MAX_BACKING_W / w;
    this._clientW = w;
    this._clientH = h;
    this.canvas.width = Math.max(1, Math.round(w * renderScale));
    this.canvas.height = Math.max(1, Math.round(h * renderScale));
    // Draw in identity space; _paint computes everything in backing pixels.
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this._pending.clear();
    this.lastDrawnFrame = -1;
    this._lastPaintKey = null;
  }

  bindResize() {
    if (this._resizeBound) return;
    this._resizeBound = true;
    window.addEventListener("resize", () => {
      clearTimeout(this._resizeTimer);
      this._resizeTimer = setTimeout(() => {
        this.resize();
        this.renderNow();
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

/** Viewport resolution tier for decode width (Phase 3.2). */
export function decodeTierWidth(vw = window.innerWidth) {
  if (vw < 900) return 960;
  if (vw < 1440) return 1280;
  // 1600 requested for large screens, but 120 frames * 1600x900x4B ~= 691MB
  // exceeds the 600MB decoded-memory budget; 1440 keeps one sequence ~560MB.
  return 1440;
}
