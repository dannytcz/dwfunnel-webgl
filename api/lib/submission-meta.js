const STUDIO_TZ = "Asia/Kuala_Lumpur";

function formatDateTime(date, timeZone) {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      timeZone,
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);
  } catch {
    return date.toISOString();
  }
}

export function extractServerMeta(req) {
  const headers = req.headers || {};
  const forwarded = headers["x-forwarded-for"] || "";
  const ip =
    (typeof forwarded === "string" ? forwarded.split(",")[0] : "").trim() ||
    headers["x-real-ip"] ||
    "";

  let city = headers["x-vercel-ip-city"] || "";
  try {
    city = decodeURIComponent(city);
  } catch {
    // keep raw value
  }

  const receivedAt = new Date();

  return {
    ip: ip || "Unknown",
    country: headers["x-vercel-ip-country"] || "Unknown",
    city,
    region: headers["x-vercel-ip-country-region"] || "",
    serverReceivedAt: receivedAt.toISOString(),
    studioLocalTime: formatDateTime(receivedAt, STUDIO_TZ),
    studioTimezone: STUDIO_TZ,
  };
}

function sanitizeUtm(utm) {
  if (!utm || typeof utm !== "object") return undefined;
  const clean = {};
  for (const key of ["source", "medium", "campaign", "term", "content"]) {
    const value = utm[key];
    if (typeof value === "string" && value.trim()) {
      clean[key] = value.trim().slice(0, 120);
    }
  }
  return Object.keys(clean).length ? clean : undefined;
}

function sanitizeNumber(value, { min = 0, max = Number.MAX_SAFE_INTEGER, round = true } = {}) {
  const num = Number(value);
  if (!Number.isFinite(num)) return undefined;
  const next = round ? Math.round(num) : num;
  return Math.min(max, Math.max(min, next));
}

function sanitizeBoolean(value) {
  if (value === true || value === "true" || value === 1 || value === "1") return true;
  if (value === false || value === "false" || value === 0 || value === "0") return false;
  return undefined;
}

export function sanitizeClientMeta(meta) {
  if (!meta || typeof meta !== "object") return {};

  const pick = (key, max = 500) => {
    const value = meta[key];
    if (value == null) return undefined;
    const trimmed = String(value).trim().slice(0, max);
    return trimmed || undefined;
  };

  const screenWidth = Number(meta.screenWidth);
  const formDurationSec = Number(meta.formDurationSec);
  const visitCount = sanitizeNumber(meta.visitCount, { min: 1, max: 10000 });
  const daysSinceFirstVisit = sanitizeNumber(meta.daysSinceFirstVisit, { min: 0, max: 3650 });
  const sessionDurationSec = sanitizeNumber(meta.sessionDurationSec, { min: 0, max: 86400 });
  const scrollDepthPct = sanitizeNumber(meta.scrollDepthPct, { min: 0, max: 100 });

  return {
    visitorId: pick("visitorId", 40),
    visitCount,
    isReturningVisitor: sanitizeBoolean(meta.isReturningVisitor),
    firstVisitAt: pick("firstVisitAt", 40),
    previousVisitAt: pick("previousVisitAt", 40),
    daysSinceFirstVisit,
    sessionDurationSec,
    scrollDepthPct,
    reachedApply: sanitizeBoolean(meta.reachedApply),
    landingUrl: pick("landingUrl", 500),
    firstTouchUtm: sanitizeUtm(meta.firstTouchUtm),
    clientTimezone: pick("clientTimezone", 80),
    clientSubmittedAt: pick("clientSubmittedAt", 40),
    clientLocale: pick("clientLocale", 20),
    referrer: pick("referrer", 500),
    pageUrl: pick("pageUrl", 500),
    device: pick("device", 20),
    screenWidth: Number.isFinite(screenWidth) ? Math.round(screenWidth) : undefined,
    formDurationSec: Number.isFinite(formDurationSec) ? Math.max(0, Math.round(formDurationSec)) : undefined,
    utm: sanitizeUtm(meta.utm),
  };
}

export function mergeSubmissionMeta(clientMeta, serverMeta) {
  return {
    client: clientMeta || {},
    server: serverMeta || {},
  };
}

export function formatClientSubmittedDisplay(meta) {
  const client = meta?.client || {};
  const iso = client.clientSubmittedAt;
  const tz = client.clientTimezone || "UTC";
  if (!iso) return "Unknown";
  try {
    const label = formatDateTime(new Date(iso), tz);
    return `${label} — ${tz}`;
  } catch {
    return iso;
  }
}

export function formatLocationDisplay(meta) {
  const server = meta?.server || {};
  const parts = [server.city, server.region, server.country].filter(Boolean);
  const location = parts.length ? parts.join(", ") : server.country || "Unknown";
  return server.ip && server.ip !== "Unknown" ? `${location} · ${server.ip}` : location;
}

export function formatUtmDisplay(meta) {
  const utm = meta?.client?.utm || meta?.client?.firstTouchUtm;
  if (!utm) return "None";
  return Object.entries(utm)
    .map(([key, value]) => `${key}: ${value}`)
    .join(" · ");
}

function formatDuration(seconds) {
  if (seconds == null) return "—";
  if (seconds < 60) return `${seconds} seconds`;
  const minutes = Math.round(seconds / 60);
  return minutes === 1 ? "1 minute" : `${minutes} minutes`;
}

function formatVisitLine(client) {
  const count = client.visitCount;
  if (!count) return "Visit count unknown.";
  if (count === 1) return "First visit on this device.";
  return `Back for visit #${count} on this device.`;
}

function formatDaysLine(client) {
  if (client.daysSinceFirstVisit == null) return "";
  if (client.daysSinceFirstVisit === 0) return "Found the site today.";
  if (client.daysSinceFirstVisit === 1) return "First found the site yesterday.";
  return `First found the site ${client.daysSinceFirstVisit} days ago.`;
}

function formatScrollLine(client) {
  if (client.scrollDepthPct == null) return "";
  if (client.scrollDepthPct >= 95) return "Read almost the whole page.";
  return `Scrolled about ${client.scrollDepthPct}% down the page.`;
}

function formatTrafficSources(sources) {
  if (!sources?.length) return "not specified";
  return sources.join(", ");
}

export function buildEmailSummary(payload) {
  const client = payload.meta?.client || {};
  const server = payload.meta?.server || {};
  const name = payload.name || "Someone";
  const brand = payload.businessBrand || "unknown brand";
  const budget = payload.estimatedBudget || "budget not given";
  const traffic = formatTrafficSources(payload.trafficSources);

  const locationParts = [server.city, server.country].filter(Boolean);
  const location = locationParts.length ? locationParts.join(", ") : server.country || "unknown location";

  const headline = `${name} from ${brand} wants to build. Budget: ${budget}. Traffic: ${traffic}.`;

  const bullets = [
    formatVisitLine(client),
    formatDaysLine(client),
    client.sessionDurationSec != null
      ? `Spent ${formatDuration(client.sessionDurationSec)} on the site before submitting.`
      : "",
    formatScrollLine(client),
    client.reachedApply === true ? "Reached the apply section." : client.reachedApply === false ? "Did not reach the apply section." : "",
    client.formDurationSec != null ? `Took ${formatDuration(client.formDurationSec)} to fill in the form.` : "",
    `From ${location}.`,
    client.referrer ? `Came from: ${client.referrer || "direct"}.` : "",
    formatUtmDisplay(payload.meta) !== "None" ? `Ad / campaign tag: ${formatUtmDisplay(payload.meta)}.` : "",
  ].filter(Boolean);

  return { headline, bullets };
}

export function formatMetaTextBlock(meta) {
  const client = meta?.client || {};
  const server = meta?.server || {};
  const lines = [
    "HOW THEY FOUND YOU",
    "------------------",
    `Their time: ${formatClientSubmittedDisplay(meta)}`,
    `Your time (MYT): ${server.studioLocalTime || "—"}`,
    `Where they are: ${formatLocationDisplay(meta)}`,
    `Device: ${client.device || "—"}${client.screenWidth ? ` (${client.screenWidth}px)` : ""}`,
    `Language: ${client.clientLocale || "—"}`,
    `Referrer: ${client.referrer || "Direct / none"}`,
    `Page submitted from: ${client.pageUrl || "—"}`,
    `Ad / campaign tag: ${formatUtmDisplay(meta)}`,
    "",
    "SITE BEHAVIOUR (THIS DEVICE)",
    "----------------------------",
    client.visitCount != null ? `Visits on this device: ${client.visitCount}` : "",
    client.isReturningVisitor === true ? "Returning visitor: Yes" : client.isReturningVisitor === false ? "Returning visitor: No" : "",
    client.firstVisitAt ? `First visit: ${client.firstVisitAt}` : "",
    client.previousVisitAt ? `Previous visit: ${client.previousVisitAt}` : "",
    client.daysSinceFirstVisit != null ? `Days since first visit: ${client.daysSinceFirstVisit}` : "",
    client.sessionDurationSec != null ? `Time on site: ${formatDuration(client.sessionDurationSec)}` : "",
    client.scrollDepthPct != null ? `Scroll depth: ${client.scrollDepthPct}%` : "",
    client.reachedApply === true ? "Saw apply section: Yes" : client.reachedApply === false ? "Saw apply section: No" : "",
    client.formDurationSec != null ? `Time on form: ${formatDuration(client.formDurationSec)}` : "",
    client.landingUrl ? `First landing page: ${client.landingUrl}` : "",
    client.visitorId ? `Visitor ID: ${client.visitorId}` : "",
  ].filter(Boolean);

  return lines.join("\n");
}
