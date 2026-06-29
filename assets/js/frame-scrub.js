/**
 * Canvas WebP frame scrubber — cover-fit draw + scroll-driven camera extras.
 */

export class FrameScrubber {
  constructor(container, canvas, urls, opts = {}) {
    this.container = container;
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d", { alpha: false });
    this.urls = urls;
    this.frames = [];
    this.loaded = 0;
    this.current = -1;
    this.mouse = { x: 0, y: 0 };
    this.parallaxCanvas = opts.parallaxCanvas ?? 0.05;
    this.parallaxCopy = opts.parallaxCopy ?? 0.025;
    this.copyLayer = opts.copyLayer ?? null;
    this.starsLayer = opts.starsLayer ?? null;
    this.reducedMotion = opts.reducedMotion ?? false;
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
          this.frames[i] = img;
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
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.canvas.width = w * dpr;
    this.canvas.height = h * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.draw(this.current >= 0 ? this.current : 0, this._lastFx || {});
  }

  /**
   * @param {number} index
   * @param {{ scale?: number, offsetX?: number, offsetY?: number }} fx
   */
  draw(index, fx = {}) {
    this._lastFx = fx;
    const img = this.frames[index];
    if (!img?.naturalWidth) return;

    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    const baseScale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
    const scale = baseScale * (fx.scale ?? 1);
    const dw = img.naturalWidth * scale;
    const dh = img.naturalHeight * scale;
    const dx = (w - dw) / 2 + (fx.offsetX ?? 0);
    const dy = (h - dh) / 2 + (fx.offsetY ?? 0);

    this.ctx.fillStyle = "#030508";
    this.ctx.fillRect(0, 0, w, h);
    this.ctx.drawImage(img, dx, dy, dw, dh);
    this.current = index;
  }

  bindParallax(idleLayer = null) {
    if (this.reducedMotion) return;
    window.addEventListener("pointermove", (e) => {
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
