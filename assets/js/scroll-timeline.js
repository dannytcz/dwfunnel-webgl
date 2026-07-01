/**
 * Multi-act scroll cinema timeline.
 * Global scroll progress → act segment → frame index.
 */

export const CINEMA_SEGMENTS = [
  {
    id: "hero",
    label: "Hero",
    cdnKey: "act0",
    share: 0.42,
    ease: "dive",
    useHandoff: false,
    rangeEnd: null,
    fx: { scaleMax: 0.2, driftY: -32 },
    copy: "#hero-copy-block",
    scrim: 0.35,
  },
  {
    id: "passage",
    label: "Passage",
    cdnKey: "act1",
    share: 0.28,
    ease: "drift",
    useHandoff: false,
    rangeEnd: null,
    fx: { scaleMax: 0.06, driftY: -8 },
    copy: "#passage-copy-block",
    scrim: 1.0,
  },
  {
    id: "underworld",
    label: "Underworld",
    cdnKey: "act2",
    share: 0.3,
    ease: "burst",
    useHandoff: false,
    rangeEnd: null,
    fx: { scaleMax: 0.28, driftY: -48 },
    copy: "#underworld-copy-block",
    scrim: 0.55,
    contentReveal: ".underworld-card",
    contentRevealAt: 0.55,
  },
];

export function globalToSegment(globalProgress, segments = CINEMA_SEGMENTS) {
  const p = Math.max(0, Math.min(1, globalProgress));
  let acc = 0;
  for (const seg of segments) {
    const next = acc + seg.share;
    if (p <= next || seg === segments[segments.length - 1]) {
      const local = seg.share > 0 ? Math.min(1, (p - acc) / seg.share) : 0;
      return { segment: seg, local, index: segments.indexOf(seg), acc };
    }
    acc = next;
  }
  const last = segments[segments.length - 1];
  return { segment: last, local: 1, index: segments.length - 1, acc: 1 - last.share };
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
    case "dive":
      return easeDive(x);
    case "burst":
      return easeBurst(x);
    default:
      return easeDrift(x);
  }
}

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
  const ui = { copyOpacity: 0, copyY: 0, hintOpacity: 0, contentOpacity: null, scrim: segment.scrim ?? 0.35 };

  if (segment.id === "hero") {
    if (globalProgress <= 0.008) {
      ui.copyOpacity = 1;
      ui.copyY = 0;
    } else {
      ui.copyOpacity =
        localProgress < 0.1 ? localProgress / 0.1 : localProgress > 0.82 ? Math.max(0, 1 - (localProgress - 0.82) / 0.15) : 1;
      ui.copyY = (1 - localProgress) * 12;
    }
    ui.hintOpacity = globalProgress < 0.04 ? 1 : Math.max(0, 1 - globalProgress / 0.08);
  }

  if (segment.id === "passage") {
    ui.copyOpacity =
      localProgress < 0.1
        ? localProgress / 0.1
        : localProgress > 0.78
          ? Math.max(0, 1 - (localProgress - 0.78) / 0.18)
          : 1;
    ui.copyY = (1 - localProgress) * 16;
  }

  if (segment.id === "underworld") {
    ui.copyOpacity =
      localProgress < 0.08
        ? localProgress / 0.08
        : localProgress > 0.92
          ? Math.max(0, 1 - (localProgress - 0.92) / 0.08)
          : 1;
    ui.copyY = (1 - localProgress) * 10;
  }

  if (segment.contentReveal && segment.contentRevealAt != null) {
    const t = (localProgress - segment.contentRevealAt) / (1 - segment.contentRevealAt);
    ui.contentOpacity = Math.max(0, Math.min(1, t));
  }

  return ui;
}

/** Pin scroll progress for each cinematic station (mid-segment). */
export function stationPinProgress(stationIndex, segments = CINEMA_SEGMENTS) {
  let acc = 0;
  for (let i = 0; i < stationIndex && i < segments.length; i++) {
    acc += segments[i].share;
  }
  const share = segments[stationIndex]?.share ?? 0;
  return acc + share * 0.42;
}

export function totalPinLength(segments = CINEMA_SEGMENTS, baseVh = 480) {
  return `+=${baseVh}%`;
}
