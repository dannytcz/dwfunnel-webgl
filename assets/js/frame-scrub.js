/**
 * Windowed WebP loader — only decodes frames on demand instead of all 662
 * at once (which was saturating the main thread and causing scroll jank).
 */

const DPR_CAP = 1;
const LRU_CAPACITY = 120;
const WINDOW_HALF = 60;
const PLACEHOLDER_FILL = "#030508";

export class FrameScrubber {
  constructor(container, canvas, urls, opts = {}) {
    this.container = container;
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d", { alpha: false });
    this.urls = urls;
    /** @type {Array<HTMLImageElement|null>} */
    this.frames = new Array(urls.length).fill(null);
    /** @type {Array<Promise<HTMLImageElement|null>|null>} */
    this._inflight = new Array(urls.length).fill(null);
    this.loaded = 0;
    this._decoded = 0;
    this.current = -1;
    this.mouse = { x: 0, y: 0 };
    this.parallaxCanvas = opts.parallaxCanvas ?? 0.05;
    this.parallaxCopy = opts.parallaxCopy ?? 0.025;
    this.copyLayer = opts.copyLayer ?? null;
    this.starsLayer = opts.starsLayer ?? null;
    this.reducedMotion = opts.reducedMotion ?? false;
    this._onProgress = null;

    /** @type {Map<number, HTMLCanvasElement>} */
    this._cache = new Map();
    this._cacheOrder = [];
    this._resizeW = 0;
    this._resizeH = 0;
    this._lastDrawnIndex = -1;
  }

  _loadFrame(i) {
    if (i < 0 || i >= this.urls.length) return Promise.resolve(null);
    const existing = this.frames[i];
    if (existing?.naturalWidth) return Promise.resolve(existing);
    if (this._inflight[i]) return this._inflight[i];

    this._inflight[i] = new Promise((resolve) => {
      const url = this.urls[i];
      const img = new Image();
      if (/^https?:\/\//.test(url)) img.crossOrigin = "anonymous";
      img.decoding = "async";
      const markReady = () => {
        if (!this.frames[i]?.naturalWidth) {
          this.frames[i] = img;
          this._decoded++;
          this.loaded = this._decoded;
          this._onProgress?.(this._decoded / this.urls.length);
        }
        resolve(img);
      };
      const onError = () => {
        if (!this.frames[i]) this.frames[i] = img;
        this._decoded++;
        resolve(img);
      };
      if (img.decode) {
        img.decode().then(markReady, () => {
          if (img.complete) markReady();
          else img.addEventListener("load", markReady, { once: true });
        });
      } else {
        img.addEventListener("load", markReady, { once: true });
      }
      img.addEventListener("error", onError, { once: true });
      img.src = url;
    });

    return this._inflight[i];
  }

  /** Eager-load only the indices needed for intro + hero landings. */
  load(onProgress, opts = {}) {
    this._onProgress = onProgress;
    const eager = opts.eager ?? [];
    const unique = [...new Set(eager)].filter((i) => i >= 0 && i < this.urls.length);
    if (!unique.length) return Promise.resolve();
    return Promise.all(unique.map((i) => this._loadFrame(i)));
  }

  resize() {
    const dpr = DPR_CAP;
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.canvas.width = w * dpr;
    this.canvas.height = h * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this._resizeW = w;
    this._resizeH = h;
    this._cache.clear();
    this._cacheOrder.length = 0;
    if (this.current >= 0) this.draw(this.current, this._lastFx || {});
  }

  prewarm(indices) {
    if (!Array.isArray(indices)) return;
    for (const i of indices) {
      if (i < 0 || i >= this.urls.length) continue;
      this._loadFrame(i).then(() => this._ensureCached(i));
    }
  }

  /** Background-decode a contiguous frame range (e.g. one act). */
  prefetchRange(lo, hi, batchSize = 8) {
    const start = Math.max(0, lo);
    const end = Math.min(this.urls.length - 1, hi);
    if (start > end) return Promise.resolve();

    let cursor = start;
    const pump = () => {
      const batch = [];
      while (cursor <= end && batch.length < batchSize) {
        batch.push(this._loadFrame(cursor++));
      }
      if (!batch.length) return Promise.resolve();
      return Promise.all(batch).then(pump);
    };
    return pump();
  }

  releaseOutOfWindow(center) {
    const lo = Math.max(0, center - WINDOW_HALF);
    const hi = Math.min(this.urls.length - 1, center + WINDOW_HALF);
    for (const idx of this._cache.keys()) {
      if (idx < lo || idx > hi) this._cache.delete(idx);
    }
    this._cacheOrder = this._cacheOrder.filter((idx) => this._cache.has(idx));
  }

  releaseImagesOutsideWindow(center) {
    const lo = Math.max(0, center - WINDOW_HALF);
    const hi = Math.min(this.urls.length - 1, center + WINDOW_HALF);
    this.releaseOutOfWindow(center);
    for (let i = 0; i < this.frames.length; i++) {
      if ((i < lo || i > hi) && this.frames[i] && !this._inflight[i]) {
        this.frames[i] = null;
        this._inflight[i] = null;
      }
    }
  }

  _touchCache(idx) {
    const pos = this._cacheOrder.indexOf(idx);
    if (pos !== -1) this._cacheOrder.splice(pos, 1);
    this._cacheOrder.push(idx);
    while (this._cacheOrder.length > LRU_CAPACITY) {
      const evict = this._cacheOrder.shift();
      this._cache.delete(evict);
    }
  }

  _ensureCached(idx) {
    if (this._cache.has(idx)) {
      this._touchCache(idx);
      return this._cache.get(idx);
    }
    const img = this.frames[idx];
    if (!img?.naturalWidth) return null;
    const w = this._resizeW;
    const h = this._resizeH;
    if (!w || !h) return null;
    const baseScale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
    const dw = img.naturalWidth * baseScale;
    const dh = img.naturalHeight * baseScale;
    const dx = (w - dw) / 2;
    const dy = (h - dh) / 2;
    const off = document.createElement("canvas");
    off.width = w;
    off.height = h;
    const octx = off.getContext("2d", { alpha: false });
    octx.fillStyle = PLACEHOLDER_FILL;
    octx.fillRect(0, 0, w, h);
    octx.drawImage(img, dx, dy, dw, dh);
    this._cache.set(idx, off);
    this._touchCache(idx);
    return off;
  }

  draw(index, fx = {}) {
    this._lastFx = fx;
    const w = this._resizeW || this.container.clientWidth;
    const h = this._resizeH || this.container.clientHeight;
    const ctx = this.ctx;

    const img = this.frames[index];
    if (!img?.naturalWidth) {
      this._loadFrame(index);
      if (this._lastDrawnIndex >= 0 && this._lastDrawnIndex !== index) {
        this.draw(this._lastDrawnIndex, fx);
        return;
      }
      ctx.fillStyle = PLACEHOLDER_FILL;
      ctx.fillRect(0, 0, w, h);
      this.current = index;
      return;
    }

    const cached = this._ensureCached(index);

    if (cached) {
      const scale = fx.scale ?? 1;
      const ox = fx.offsetX ?? 0;
      const oy = fx.offsetY ?? 0;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = PLACEHOLDER_FILL;
      ctx.fillRect(0, 0, w, h);
      ctx.save();
      ctx.translate(w / 2 + ox, h / 2 + oy);
      ctx.scale(scale, scale);
      ctx.translate(-w / 2, -h / 2);
      ctx.drawImage(cached, 0, 0);
      ctx.restore();
      this.current = index;
      this._lastDrawnIndex = index;
      return;
    }

    const baseScale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
    const scale = baseScale * (fx.scale ?? 1);
    const dw = img.naturalWidth * scale;
    const dh = img.naturalHeight * scale;
    const dx = (w - dw) / 2 + (fx.offsetX ?? 0);
    const dy = (h - dh) / 2 + (fx.offsetY ?? 0);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = PLACEHOLDER_FILL;
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, dx, dy, dw, dh);
    this.current = index;
    this._lastDrawnIndex = index;
  }

  bindParallax(idleLayer = null) {
    if (this.reducedMotion) return;
    let lastPush = 0;
    window.addEventListener("pointermove", (e) => {
      const now = performance.now();
      if (now - lastPush < 32) return;
      lastPush = now;
      const rect = this.container.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > window.innerHeight) return;
      this.mouse.x = (e.clientX / window.innerWidth - 0.5) * 2;
      this.mouse.y = (e.clientY / window.innerHeight - 0.5) * 2;
      const cx = this.mouse.x * this.parallaxCanvas * 28;
      const cy = this.mouse.y * this.parallaxCanvas * 18;
      this.canvas.style.transform = `translate(${cx}px, ${cy}px) scale(1.03)`;
      idleLayer?.applyParallax(this.mouse.x, this.mouse.y);
      if (this.starsLayer) {
        const sx = this.mouse.x * 0.12 * 36;
        const sy = this.mouse.y * 0.12 * 24;
        this.starsLayer.style.transform = `translate(${sx}px, ${sy}px)`;
      }
      if (this.copyLayer) {
        const px = this.mouse.x * this.parallaxCopy * 14;
        const py = this.mouse.y * this.parallaxCopy * 10;
        this.copyLayer.style.transform = `translate(${px}px, ${py}px)`;
      }
    });
  }
}

export function scrollFx(progress, opts = {}) {
  const p = Math.max(0, Math.min(1, progress));
  const scale = 1 + p * (opts.scaleDelta ?? 0.08);
  const offsetY = -p * (opts.offsetY ?? 22);
  return { scale, offsetY };
}
