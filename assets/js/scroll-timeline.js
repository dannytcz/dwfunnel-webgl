/**
 * Multi-act scroll cinema timeline.
 * One global scroll progress → act segment → frame index (with idle handoff).
 */

export const CINEMA_SEGMENTS = [
  {
    id: "entry",
    label: "Act 0 — Entry",
    cdnKey: "act0",
    share: 0.42,
    ease: "dive",
    useHandoff: true,
    rangeEnd: null,
    fx: { scaleMax: 0.2, driftY: -32 },
    copy: "#hero-copy-block",
    hint: "#scroll-hint",
  },
  {
    id: "ambient",
    label: "Act 1 — Drift",
    cdnKey: "act1",
    share: 0.28,
    ease: "drift",
    useHandoff: false,
    rangeEnd: null,
    fx: { scaleMax: 0.06, driftY: -8 },
    copy: "#act1-copy-block",
    hint: null,
  },
  {
    id: "bridge",
    label: "Act 2 — Bridge",
    cdnKey: "act2",
    share: 0.3,
    ease: "burst",
    useHandoff: false,
    rangeEnd: 72,
    fx: { scaleMax: 0.28, driftY: -48 },
    copy: null,
    contentReveal: "#act2",
    contentRevealAt: 0.62,
  },
];

export function globalToSegment(globalProgress, segments = CINEMA_SEGMENTS) {
  const p = Math.max(0, Math.min(1, globalProgress));
  let acc = 0;
  for (const seg of segments) {
    const next = acc + seg.share;
    if (p <= next || seg === segments[segments.length - 1]) {
      const local = seg.share > 0 ? Math.min(1, (p - acc) / seg.share) : 0;
      return { segment: seg, local, index: segments.indexOf(seg) };
    }
    acc = next;
  }
  const last = segments[segments.length - 1];
  return { segment: last, local: 1, index: segments.length - 1 };
}

function easeDive(t) {
  if (t < 0.5) return 4 * t * t * t;
  return 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function easeDrift(t) {
  return t * t * (3 - 2 * t);
}

function easeBurst(t) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

export function easeSegment(t, type = "drift") {
  const x = Math.max(0, Math.min(1, t));
  switch (type) {
    case "dive": return easeDive(x);
    case "burst": return easeBurst(x);
    default: return easeDrift(x);
  }
}

/**
 * Map segment-local progress → frame index.
 * @param {object} segment
 * @param {number} localProgress 0–1 within segment
 * @param {number} frameCount
 * @param {number | null} handoffFrame — captured from idle loop at scroll start (entry only)
 */
export function segmentToFrame(segment, localProgress, frameCount, handoffFrame = null) {
  const n = Math.max(1, frameCount);
  let start = 0;
  let end = segment.rangeEnd ?? n - 1;
  end = Math.min(end, n - 1);

  if (segment.useHandoff && handoffFrame !== null) {
    start = Math.min(handoffFrame, end);
  }

  const t = easeSegment(localProgress, segment.ease);
  return Math.round(start + t * (end - start));
}

export function segmentFx(segment, localProgress, globalProgress) {
  const p = easeSegment(localProgress, segment.ease);
  const fx = segment.fx ?? {};
  const scaleMax = fx.scaleMax ?? 0.1;
  const driftY = fx.driftY ?? -16;

  return {
    scale: 1 + p * scaleMax,
    offsetY: p * driftY,
    offsetX: p * 8,
    vignette: 0.35 + globalProgress * 0.45,
  };
}

export function segmentUi(segment, localProgress, globalProgress) {
  const ui = { copyOpacity: 0, copyY: 0, hintOpacity: 0, contentOpacity: null };

  if (segment.id === "entry") {
    ui.copyOpacity = localProgress < 0.12 ? 1 : Math.max(0, 1 - (localProgress - 0.12) / 0.35);
    ui.copyY = localProgress * -60;
    ui.hintOpacity = globalProgress < 0.02 ? 1 : Math.max(0, 1 - globalProgress / 0.06);
  }

  if (segment.id === "ambient") {
    ui.copyOpacity = localProgress < 0.08
      ? localProgress / 0.08
      : localProgress > 0.75
        ? Math.max(0, 1 - (localProgress - 0.75) / 0.2)
        : 1;
    ui.copyY = (1 - localProgress) * 20;
  }

  if (segment.contentReveal && segment.contentRevealAt != null) {
    const t = (localProgress - segment.contentRevealAt) / (1 - segment.contentRevealAt);
    ui.contentOpacity = Math.max(0, Math.min(1, t));
  }

  return ui;
}

export function totalPinLength(segments = CINEMA_SEGMENTS, baseVh = 520) {
  return `+=${baseVh}%`;
}
