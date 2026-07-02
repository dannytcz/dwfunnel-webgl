/**
 * Multi-act scroll cinema timeline.
 * Global scroll progress → act segment → frame index.
 */

/** Last 10% of pin — handoff veil before #problem. */
export const BRIDGE_START = 0.9;

export const CINEMA_SEGMENTS = [
  {
    id: "hero",
    label: "Hero",
    cdnKey: "act0",
    share: 0.42,
    ease: "dive",
    useHandoff: false,
    holdShare: 0.12,
    rangeEnd: null,
    fx: { scaleMax: 0.08, driftY: -22 },
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
    cardRevealAt: 0.38,
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

  let diveLocal = localProgress;
  const hold = segment.holdShare ?? 0;
  if (hold > 0) {
    if (localProgress <= hold) return 0;
    diveLocal = (localProgress - hold) / (1 - hold);
  }

  const t = easeSegment(diveLocal, segment.ease);
  return Math.round(start + t * (end - start));
}

export function segmentFx(segment, localProgress, globalProgress) {
  const hold = segment.holdShare ?? 0;
  let diveLocal = localProgress;
  if (hold > 0 && localProgress <= hold) {
    return {
      scale: 1,
      offsetY: 0,
      offsetX: 0,
      vignette: 0.35 + globalProgress * 0.45,
    };
  }
  if (hold > 0) diveLocal = (localProgress - hold) / (1 - hold);

  const p = easeSegment(diveLocal, segment.ease);
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
  const ui = {
    copyOpacity: 0,
    copyY: 0,
    hintOpacity: 0,
    lockCopy: false,
    scrim: segment.scrim ?? 0.35,
    bridgeT: Math.max(0, Math.min(1, (globalProgress - BRIDGE_START) / (1 - BRIDGE_START))),
  };

  if (segment.id === "hero") {
    ui.copyOpacity = localProgress > 0.85 ? Math.max(0, 1 - (localProgress - 0.85) / 0.15) : 1;
    ui.copyY = 0;
    ui.scrim = 0.35 + Math.max(0, localProgress - (segment.holdShare ?? 0)) * 0.25;
    ui.hintOpacity = globalProgress < 0.08 ? 1 : Math.max(0, 1 - globalProgress / 0.12);
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
    ui.copyOpacity = localProgress < 0.08 ? localProgress / 0.08 : 1;
    ui.copyY = localProgress < 0.08 ? (1 - localProgress / 0.08) * 12 : 0;
    ui.lockCopy = localProgress >= 0.08;
    ui.scrim = 0.55;
  }

  return ui;
}

export function stationPinProgress(stationIndex, segments = CINEMA_SEGMENTS) {
  if (stationIndex <= 0) return 0;
  let acc = 0;
  for (let i = 0; i < stationIndex && i < segments.length; i++) {
    acc += segments[i].share;
  }
  const share = segments[stationIndex]?.share ?? 0;
  const mid = stationIndex === 1 ? 0.5 : 0.35;
  return acc + share * mid;
}

export function totalPinLength(segments = CINEMA_SEGMENTS, baseVh = 480) {
  return `+=${baseVh}%`;
}
