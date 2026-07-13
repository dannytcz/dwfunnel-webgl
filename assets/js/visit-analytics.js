const STORAGE = {
  visitorId: "dwf_visitor_id",
  visitCount: "dwf_visit_count",
  firstVisit: "dwf_first_visit",
  lastVisit: "dwf_last_visit",
  landingUrl: "dwf_landing_url",
  firstUtm: "dwf_first_utm",
};

const SESSION = {
  start: "dwf_session_start",
  maxScroll: "dwf_max_scroll",
  reachedApply: "dwf_reached_apply",
  previousVisit: "dwf_previous_visit",
};

let scrollListener = null;
let applyObserver = null;

function readStorage(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // ignore quota / private mode
  }
}

function readSession(key) {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeSession(key, value) {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

function persistFirstTouchUtm() {
  if (readStorage(STORAGE.firstUtm)) return;

  const params = new URLSearchParams(location.search);
  const utm = {};
  for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"]) {
    const value = params.get(key);
    if (value) utm[key.replace("utm_", "")] = value;
  }

  if (Object.keys(utm).length) {
    writeStorage(STORAGE.firstUtm, JSON.stringify(utm));
  }
}

function readFirstUtm() {
  const raw = readStorage(STORAGE.firstUtm);
  if (!raw) return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

function daysBetween(fromIso, toDate = new Date()) {
  if (!fromIso) return undefined;
  const from = new Date(fromIso);
  if (Number.isNaN(from.getTime())) return undefined;
  const diff = toDate.getTime() - from.getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

function updateScrollDepth() {
  const doc = document.documentElement;
  const scrollTop = window.scrollY || doc.scrollTop || 0;
  const height = Math.max(doc.scrollHeight - window.innerHeight, 1);
  const pct = Math.min(100, Math.round((scrollTop / height) * 100));
  const prev = parseInt(readSession(SESSION.maxScroll) || "0", 10);
  if (pct > prev) writeSession(SESSION.maxScroll, String(pct));
}

function watchApplySection() {
  const apply = document.getElementById("apply");
  if (!apply || applyObserver) return;

  applyObserver = new IntersectionObserver(
    (entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        writeSession(SESSION.reachedApply, "1");
        applyObserver.disconnect();
        applyObserver = null;
      }
    },
    { threshold: 0.2 }
  );

  applyObserver.observe(apply);
}

function recordVisit() {
  const now = new Date().toISOString();
  let visitorId = readStorage(STORAGE.visitorId);

  if (!visitorId) {
    visitorId = crypto.randomUUID();
    writeStorage(STORAGE.visitorId, visitorId);
  }

  const previousVisitAt = readStorage(STORAGE.lastVisit);
  const visitCount = parseInt(readStorage(STORAGE.visitCount) || "0", 10) + 1;
  writeStorage(STORAGE.visitCount, String(visitCount));

  if (!readStorage(STORAGE.firstVisit)) {
    writeStorage(STORAGE.firstVisit, now);
    writeStorage(STORAGE.landingUrl, location.href);
    persistFirstTouchUtm();
  }

  writeStorage(STORAGE.lastVisit, now);

  if (previousVisitAt) {
    writeSession(SESSION.previousVisit, previousVisitAt);
  }

  if (!readSession(SESSION.start)) {
    writeSession(SESSION.start, String(Date.now()));
  }

  return { visitorId, visitCount, previousVisitAt };
}

export function markReachedApply() {
  writeSession(SESSION.reachedApply, "1");
}

export function initVisitAnalytics() {
  recordVisit();
  updateScrollDepth();
  watchApplySection();

  if (!scrollListener) {
    scrollListener = () => updateScrollDepth();
    window.addEventListener("scroll", scrollListener, { passive: true });
    window.addEventListener("resize", scrollListener, { passive: true });
  }
}

export function getVisitSnapshot() {
  const visitCount = parseInt(readStorage(STORAGE.visitCount) || "1", 10);
  const firstVisitAt = readStorage(STORAGE.firstVisit);
  const sessionStart = parseInt(readSession(SESSION.start) || String(Date.now()), 10);
  const sessionDurationSec = Math.max(0, Math.round((Date.now() - sessionStart) / 1000));
  const scrollDepthPct = parseInt(readSession(SESSION.maxScroll) || "0", 10);
  const reachedApply = readSession(SESSION.reachedApply) === "1";
  const firstUtm = readFirstUtm();

  return {
    visitorId: readStorage(STORAGE.visitorId),
    visitCount,
    isReturningVisitor: visitCount > 1,
    firstVisitAt: firstVisitAt || undefined,
    previousVisitAt: readSession(SESSION.previousVisit) || undefined,
    daysSinceFirstVisit: daysBetween(firstVisitAt),
    sessionDurationSec,
    scrollDepthPct,
    reachedApply,
    landingUrl: readStorage(STORAGE.landingUrl) || undefined,
    firstTouchUtm: firstUtm,
  };
}
