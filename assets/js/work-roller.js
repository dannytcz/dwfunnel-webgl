/* Studio Bench roller — 3-up fit, 3 live mp4 decoders, modulo infinite loop. */
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

  let activeIndex = 0;
  let animating = false;
  let workFocus = false;
  let lastDir = 1;
  let slideTween = null;
  let dragSuppressClick = false;

  const live = new Set();
  let prefetchSrc = "";

  window.__workRollerSuppressClick = () => {
    const v = dragSuppressClick;
    dragSuppressClick = false;
    return v;
  };

  function videoFor(card) {
    return card.querySelector("video.ws-embed-preview");
  }

  function stopVideo(v) {
    if (!v) return;
    v.pause();
    if (v.getAttribute("src")) {
      v.removeAttribute("src");
      v.load();
    }
    live.delete(v);
  }

  function startPlay(v) {
    live.add(v);
    const run = () => {
      if (!workFocus) return;
      if (v.paused) v.play().catch(() => {});
    };
    if (v.readyState >= 2) run();
    else v.addEventListener("canplay", run, { once: true });
  }

  function attachVideo(cardIndex, play) {
    const v = videoFor(cards[cardIndex]);
    if (!v) return;
    const src = v.getAttribute("data-src");
    if (!src) return;
    if (v.getAttribute("src") !== src) {
      v.src = src;
      v.load();
    }
    if (play) startPlay(v);
    else v.pause();
  }

  function prefetchNext(src) {
    if (!src || src === prefetchSrc) return;
    prefetchSrc = src;
    const link = document.createElement("link");
    link.rel = "prefetch";
    link.as = "video";
    link.href = src;
    document.head.appendChild(link);
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

  function syncMedia() {
    if (!workFocus) {
      cards.forEach((card) => stopVideo(videoFor(card)));
      return;
    }
    const playSet = new Set(liveIndices());
    cards.forEach((card, i) => {
      const v = videoFor(card);
      if (!v) return;
      if (playSet.has(i)) attachVideo(i, true);
      else stopVideo(v);
    });
    const nextI = (activeIndex + lastDir + count) % count;
    prefetchNext(videoFor(cards[nextI])?.getAttribute("data-src"));
  }

  function gapPx() {
    return parseFloat(getComputedStyle(track).gap) || 0;
  }

  function trackXForIndex(index) {
    const gap = gapPx();
    let lead = 0;
    for (let i = 0; i < index; i++) lead += cards[i].offsetWidth + gap;
    const w = cards[index].offsetWidth;
    return viewport.clientWidth / 2 - (lead + w / 2);
  }

  function ringDist(a, b) {
    const d = Math.abs(a - b);
    return Math.min(d, count - d);
  }

  function updateCardStates() {
    cards.forEach((card, i) => {
      const wrap = ringDist(i, activeIndex);
      card.classList.toggle("is-center", i === activeIndex);
      card.classList.toggle("is-adjacent", wrap === 1);
      card.classList.toggle("is-off", wrap > 1);
    });
  }

  function snapTo(index, dir, { immediate = false, force = false } = {}) {
    const next = ((index % count) + count) % count;
    if (!immediate && !force && (animating || next === activeIndex)) return;
    if (dir) lastDir = dir;
    activeIndex = next;
    updateCardStates();
    syncMedia();

    const x = trackXForIndex(activeIndex);
    slideTween?.kill();
    if (immediate) {
      gsap.set(track, { x });
      animating = false;
      return;
    }
    animating = true;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    slideTween = gsap.to(track, {
      x,
      duration: reduced ? 0.01 : 0.46,
      ease: "power3.out",
      onComplete: () => {
        animating = false;
      },
    });
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
  let dragStartTrackX = 0;
  let dragDistance = 0;

  track.addEventListener("pointerdown", (e) => {
    if (animating || e.button !== 0) return;
    if (e.target.closest(".work-card__link")) return;
    dragActive = true;
    dragDistance = 0;
    dragSuppressClick = false;
    dragStartX = e.clientX;
    dragStartTrackX = gsap.getProperty(track, "x") || 0;
    viewport.classList.add("is-dragging");
    track.setPointerCapture(e.pointerId);
    slideTween?.kill();
    animating = false;
  });

  track.addEventListener("pointermove", (e) => {
    if (!dragActive) return;
    dragDistance = Math.abs(e.clientX - dragStartX);
    gsap.set(track, { x: dragStartTrackX + (e.clientX - dragStartX) });
  });

  function endDrag(e) {
    if (!dragActive) return;
    dragActive = false;
    viewport.classList.remove("is-dragging");
    try {
      track.releasePointerCapture(e.pointerId);
    } catch (err) {}

    if (dragDistance > 24) dragSuppressClick = true;
    if (dragDistance < 10) return;

    const dx = e.clientX - dragStartX;
    const step = cards[activeIndex].offsetWidth + gapPx();
    const threshold = Math.min(90, step * 0.14);
    if (dx <= -threshold) goNext();
    else if (dx >= threshold) goPrev();
    else snapTo(activeIndex, lastDir, { force: true });
  }

  track.addEventListener("pointerup", endDrag);
  track.addEventListener("pointercancel", endDrag);

  let resizeTimer = 0;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => snapTo(activeIndex, lastDir, { immediate: true }), 120);
  });

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(
      (entries) => entries.forEach((e) => setWorkFocus(e.isIntersecting)),
      { threshold: 0.15 }
    ).observe(section);
  } else {
    setWorkFocus(true);
  }

  snapTo(0, 1, { immediate: true });
}
