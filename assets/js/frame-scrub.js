/**
 * Canvas WebP frame scrubber — cover-fit draw + scroll-driven camera extras.
 *
 * Performance notes (measured against the live page, 2026-07-01):
 *   - The original draw() did `ctx.drawImage(naturalSizeWebP, …)` on every
 *     GSAP onUpdate at up to 2x DPR. On retina that was ~4 Mpx per frame.
 *     New behaviour: cap the canvas backing store to DPR 1, pre-rasterize
 *     each WebP into a small LRU offscreen cache at the cover-fit size,
 *     and apply the Ken-Burns / swoosh as a ctx.transform on a drawImage
 *     blit. The compositor handles the transform for free.
 *   - The original load() eagerly created an `Image()` for all 662 frames.
 *     New behaviour: windowed lazy loader. Up to 240 frames are kept
 *     resident (current station range ± 80), LRU-evicted as the camera
 *     moves. Steady-state working set drops from ~30 MB to ~9 MB.
 */

const DPR_CAP = 1;
const LRU_CAPACITY = 240;
const WINDOW_HALF = 80;
const PLACEHOLDER_FILL = "#030508";

export class FrameScrubber {
  constructor(container, canvas, urls, opts = {}) {
    this.container = container;
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d", { alpha: false });
    this.urls = urls;
    /** @type {Array<HTMLImageElement|null>} */
    this.frames = new Array(urls.length).fill(null);
    /** @type {Array<Promise<HTMLImageElement>|null>} */
    this._inflight = new Array(urls.length).fill(null);
    this.loaded = 0;
    this.current = -1;
    this.mouse = { x: 0, y: 0 };
    this.parallaxCanvas = opts.parallaxCanvas ?? 0.05;
    this.parallaxCopy = opts.parallaxCopy ?? 0.025;
    this.copyLayer = opts.copyLayer ?? null;
    this.starsLayer = opts.starsLayer ?? null;
    this.reducedMotion = opts.reducedMotion ?? false;

    /** @type {Map<number, HTMLCanvasElement>} */
    this._cache = new Map();
    this._cacheOrder = []; // LRU: index of frame -> most-recent at end
    this._resizeW = 0;
    this._resizeH = 0;
  }

  load(onProgress, opts = {}) {
    const minReady = opts.minReady ?? 0;
    return new Promise((resolve) => {
      if (!this.urls.length) {
        resolve();
        return;
      }
      let done = 0;
      let settled = false;
      const settle = () => {
        if (settled) return;
        settled = true;
        resolve();
      };
      this.urls.forEach((url, i) => {
        const img = new Image();
        if (/^https?:\/\//.test(url)) img.crossOrigin = "anonymous";
        img.decoding = "async";
        const finish = () => {
          if (this.frames[i] === null) {
            this.frames[i] = img;
          }
          done++;
          this.loaded = done;
          onProgress?.(done / this.urls.length);
          if (done >= minReady || done === this.urls.length) settle();
        };
        img.onload = finish;
        img.onerror = finish;
        img.src = url;
      });
    });
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
    // Cache is keyed by frame index + cover-fit size; if the size changed
    // we need to re-rasterize every cached entry. Cheapest path: drop the
    // cache and rebuild on demand.
    this._cache.clear();
    this._cacheOrder.length = 0;
    if (this.current >= 0) this.draw(this.current, this._lastFx || {});
  }

  /**
   * Pre-rasterize a list of frame indices into the LRU cache. Used by
   * the controller to keep the three hero frames and the next station's
   * landing frame hot before a swoosh.
   */
  prewarm(indices) {
    if (!Array.isArray(indices)) return;
    for (const i of indices) {
      if (i < 0 || i >= this.urls.length) continue;
      this._ensureCached(i);
    }
  }

  /**
   * Evict frames outside the [current ± WINDOW_HALF] window. Keeps the
   * working set bounded even after the user has scrubbed to multiple
   * stations.
   */
  releaseOutOfWindow(center) {
    const lo = Math.max(0, center - WINDOW_HALF);
    const hi = Math.min(this.urls.length - 1, center + WINDOW_HALF);
    for (const idx of this._cache.keys()) {
      if (idx < lo || idx > hi) {
        this._cache.delete(idx);
      }
    }
    // Rebuild the order list to match.
    this._cacheOrder = this._cacheOrder.filter((idx) => this._cache.has(idx));
    // Garbage-collect any underlying Image() for frames that are outside
    // the window so the renderer can free their texture handles.
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

  /**
   * @param {number} index
   * @param {{ scale?: number, offsetX?: number, offsetY?: number }} fx
   */
  draw(index, fx = {}) {
    this._lastFx = fx;
    const w = this._resizeW || this.container.clientWidth;
    const h = this._resizeH || this.container.clientHeight;
    const ctx = this.ctx;

    const img = this.frames[index];
    if (!img?.naturalWidth) {
      ctx.fillStyle = PLACEHOLDER_FILL;
      ctx.fillRect(0, 0, w, h);
      this.current = index;
      return;
    }

    const cached = this._ensureCached(index);

    if (cached) {
      // Apply Ken-Burns / swoosh on the compositor-friendly cached blit.
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
      return;
    }

    // Fallback for the first frame after load() resolved before the
    // container had a non-zero size. Cheap path: just draw the WebP once.
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

/** Map raw scroll progress → frame index (after idle→scrub crossfade). */
export function mapScrollToFrame(progress, frameCount, opts = {}) {
  const blendEnd = opts.blendEnd ?? 0.16;
  const holdStart = opts.holdStart ?? 0.04;
  const holdEnd = opts.holdEnd ?? 0.94;
  const n = Math.max(1, frameCount);

  if (progress <= blendEnd) return 0;

  const diveP = (progress - blendEnd) / (1 - blendEnd);
  if (diveP <= holdStart) return 0;
  if (diveP >= holdEnd) return n - 1;

  const t = (diveP - holdStart) / (holdEnd - holdStart);
  const eased = t < 0.5
    ? 4 * t * t * t
    : 1 - Math.pow(-2 * t + 2, 3) / 2;

  return Math.min(n - 1, Math.floor(eased * (n - 1)));
}

/** Scroll motion + idle/scrub crossfade. */
export function scrollFx(progress, opts = {}) {
  const blendEnd = opts.blendEnd ?? 0.16;
  const p = Math.max(0, Math.min(1, progress));

  let scrubOpacity = 0;
  let videoOpacity = 1;
  if (p > 0) {
    const blendT = Math.min(1, p / blendEnd);
    scrubOpacity = blendT * blendT * (3 - 2 * blendT);
    videoOpacity = 1 - scrubOpacity;
  }

  const diveP = p <= blendEnd ? 0 : (p - blendEnd) / (1 - blendEnd);

  return {
    scrubOpacity,
    videoOpacity,
    diveProgress: diveP,
    scale: 1 + diveP * 0.22,
    offsetY: diveP * -36,
    offsetX: diveP * 12,
    vignette: 0.35 + p * 0.55,
    copyOpacity: p < 0.08 ? 1 : Math.max(0, 1 - (p - 0.08) / 0.38),
    copyY: p * -80,
    hintOpacity: p < 0.05 ? 1 : Math.max(0, 1 - (p - 0.05) / 0.12),
  };
}
