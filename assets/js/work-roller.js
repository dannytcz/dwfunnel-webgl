/* Studio Bench roller — exactly 3 visible cards, blob-warmed mp4, modulo loop. */
export function initWorkRoller(appState) {
  const roller = document.querySelector(".work-roller");
  const viewport = roller?.querySelector(".work-roller__viewport");
  const track = roller?.querySelector(".work-roller__track");
  if (!roller || !viewport || !track) return;

  const section = roller.closest("section") || roller;
  const cards = Array.from(track.querySelectorAll(".work-card"));
  const count = cards.length;
  if (!count) return;

  if (navigator.connection?.saveData) return;

  const gsap = window.gsap;
  if (!gsap) return;

  const prevBtn = roller.querySelector(".work-roller__nav--prev");
  const nextBtn = roller.querySelector(".work-roller__nav--next");

  let activeIndex = Math.floor(Math.random() * count);
  let animating = false;
  let workFocus = false;
  let lastDir = 1;
  let slideTween = null;
  let dragSuppressClick = false;

  const live = new Set();
  const blobCache = new Map();
  const blobPending = new Map();

  window.__workRollerSuppressClick = () => {
    const v = dragSuppressClick;
    dragSuppressClick = false;
    return v;
  };

  function videoFor(card) {
    return card.querySelector("video.ws-embed-preview");
  }

  function posterFor(card) {
    return videoFor(card)?.getAttribute("poster") || "";
  }

  function ensurePosterFallback(card) {
    const screen = card.querySelector(".work-card__screen");
    const poster = posterFor(card);
    if (!screen || !poster || screen.querySelector(".ws-embed-poster")) return;
    const img = document.createElement("img");
    img.className = "ws-embed-poster";
    img.src = poster;
    img.alt = "";
    img.decoding = "async";
    img.loading = "lazy";
    img.setAttribute("aria-hidden", "true");
    img.setAttribute("tabindex", "-1");
    screen.prepend(img);
  }

  cards.forEach(ensurePosterFallback);

  function warmVideo(src) {
    if (!src) return Promise.resolve("");
    const cached = blobCache.get(src);
    if (cached) return Promise.resolve(cached);
    const pending = blobPending.get(src);
    if (pending) return pending;

    const job = fetch(src)
      .then((res) => {
        if (!res.ok) throw new Error(`warm ${src} ${res.status}`);
        return res.blob();
      })
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        blobCache.set(src, url);
        blobPending.delete(src);
        return url;
      })
      .catch(() => {
        blobPending.delete(src);
        return src;
      });

    blobPending.set(src, job);
    return job;
  }

  function stopVideo(v) {
    if (!v) return;
    v.pause();
    if (v.getAttribute("src")) {
      v.removeAttribute("src");
      v.load();
    }
    v.classList.remove("is-playing");
    live.delete(v);
  }

  function startPlay(v) {
    live.add(v);
    const run = () => {
      if (!workFocus) return;
      v.play()
        .then(() => v.classList.add("is-playing"))
        .catch(() => v.classList.remove("is-playing"));
    };
    if (v.readyState >= 2) run();
    else v.addEventListener("canplay", run, { once: true });
  }

  function attachVideo(cardIndex) {
    const v = videoFor(cards[cardIndex]);
    if (!v) return;
    const src = v.getAttribute("data-src");
    if (!src) return;

    warmVideo(src).then((url) => {
      if (!workFocus) return;
      if (v.getAttribute("data-src") !== src) return;
      if (v.getAttribute("src") !== url) {
        v.src = url;
        v.load();
      }
      startPlay(v);
    });
  }

  function setScrubPaused(paused) {
    appState.scrubRecords.forEach((record) => {
      if (paused) record.scrubber.pauseTicker();
      else if (record.section._scrubST?.isActive) record.scrubber.resumeTicker();
    });
  }

  function setWorkFocus(on) {
    workFocus = on;
    document.documentElement.classList.toggle("is-work-focus", on);
    appState.atmosphere?.setPaused?.(on);
    setScrubPaused(on);
    syncMedia();
  }

  function liveIndices() {
    return [
      (activeIndex - 1 + count) % count,
      activeIndex,
      (activeIndex + 1) % count,
    ];
  }

  function warmVisible() {
    liveIndices().forEach((i) => {
      const src = videoFor(cards[i])?.getAttribute("data-src");
      if (src) warmVideo(src);
    });
    const nextI = (activeIndex + lastDir + count) % count;
    const nextSrc = videoFor(cards[nextI])?.getAttribute("data-src");
    if (nextSrc) warmVideo(nextSrc);
  }

  function syncMedia() {
    if (!workFocus) {
      cards.forEach((card) => stopVideo(videoFor(card)));
      return;
    }
    const playSet = new Set(liveIndices());
    cards.forEach((card, i) => {
      const v = videoFor(card);
      if (!v) return;
      if (playSet.has(i)) attachVideo(i);
      else stopVideo(v);
    });
    warmVisible();
  }

  function ringDist(a, b) {
    const d = Math.abs(a - b);
    return Math.min(d, count - d);
  }

  function updateCardStates() {
    const prevI = (activeIndex - 1 + count) % count;
    const nextI = (activeIndex + 1) % count;
    cards.forEach((card, i) => {
      const wrap = ringDist(i, activeIndex);
      const visible = wrap <= 1;
      card.hidden = !visible;
      card.style.order = i === prevI ? "0" : i === activeIndex ? "1" : i === nextI ? "2" : "";
      card.classList.toggle("is-center", i === activeIndex);
      card.classList.toggle("is-adjacent", wrap === 1);
      card.classList.toggle("is-left", i === prevI);
      card.classList.toggle("is-right", i === nextI);
      card.classList.toggle("is-off", wrap > 1);
    });
  }

  function snapTo(index, dir, { immediate = false, force = false } = {}) {
    const next = ((index % count) + count) % count;
    if (!immediate && !force && (animating || next === activeIndex)) return;
    if (dir) lastDir = dir;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    slideTween?.kill();

    const apply = () => {
      activeIndex = next;
      updateCardStates();
      gsap.set(track, { x: 0 });
      syncMedia();
    };

    if (immediate || reduced) {
      apply();
      animating = false;
      return;
    }

    animating = true;
    const nudge = dir > 0 ? -48 : dir < 0 ? 48 : 0;
    slideTween = gsap.fromTo(
      track,
      { x: nudge },
      {
        x: 0,
        duration: 0.48,
        ease: "power3.out",
        onStart: apply,
        onComplete: () => {
          animating = false;
        },
      }
    );
  }

  function goNext() {
    snapTo(activeIndex + 1, 1);
  }

  function goPrev() {
    snapTo(activeIndex - 1, -1);
  }

  prevBtn?.addEventListener("click", goPrev);
  nextBtn?.addEventListener("click", goNext);

  roller.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      goPrev();
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      goNext();
    }
  });

  let dragActive = false;
  let dragStartX = 0;
  let dragDistance = 0;

  track.addEventListener("pointerdown", (e) => {
    if (animating || e.button !== 0) return;
    if (e.target.closest(".work-card__link")) return;
    dragActive = true;
    dragDistance = 0;
    dragSuppressClick = false;
    dragStartX = e.clientX;
    viewport.classList.add("is-dragging");
    track.setPointerCapture(e.pointerId);
    slideTween?.kill();
    animating = false;
    gsap.set(track, { x: 0 });
  });

  track.addEventListener("pointermove", (e) => {
    if (!dragActive) return;
    const dx = e.clientX - dragStartX;
    dragDistance = Math.abs(dx);
    const max = viewport.clientWidth * 0.12;
    gsap.set(track, { x: Math.max(-max, Math.min(max, dx * 0.35)) });
  });

  function endDrag(e) {
    if (!dragActive) return;
    dragActive = false;
    viewport.classList.remove("is-dragging");
    try {
      track.releasePointerCapture(e.pointerId);
    } catch (err) {}

    if (dragDistance > 24) dragSuppressClick = true;

    const dx = e.clientX - dragStartX;
    const threshold = Math.min(72, viewport.clientWidth * 0.06);
    if (dx <= -threshold) goNext();
    else if (dx >= threshold) goPrev();
    else snapTo(activeIndex, lastDir, { force: true, immediate: true });
  }

  track.addEventListener("pointerup", endDrag);
  track.addEventListener("pointercancel", endDrag);

  let resizeTimer = 0;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => snapTo(activeIndex, lastDir, { immediate: true }), 120);
  });

  const onWarm = () => warmVisible();
  if ("requestIdleCallback" in window) requestIdleCallback(onWarm, { timeout: 2200 });
  else window.setTimeout(onWarm, 1200);

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setWorkFocus(true);
            warmVisible();
          } else {
            setWorkFocus(false);
          }
        });
      },
      { threshold: 0.12, rootMargin: "320px 0px" }
    ).observe(section);
  } else {
    setWorkFocus(true);
  }

  snapTo(activeIndex, 1, { immediate: true });
}
