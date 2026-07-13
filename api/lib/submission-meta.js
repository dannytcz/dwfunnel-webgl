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

  return {
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
  const utm = meta?.client?.utm;
  if (!utm) return "None";
  return Object.entries(utm)
    .map(([key, value]) => `${key}: ${value}`)
    .join(" · ");
}

export function formatMetaTextBlock(meta) {
  const client = meta?.client || {};
  const server = meta?.server || {};
  const lines = [
    "SUBMISSION CONTEXT",
    "------------------",
    `Visitor time: ${formatClientSubmittedDisplay(meta)}`,
    `Studio time: ${server.studioLocalTime || "—"} MYT`,
    `Location: ${formatLocationDisplay(meta)}`,
    `Device: ${client.device || "—"}${client.screenWidth ? ` (${client.screenWidth}px)` : ""}`,
    `Locale: ${client.clientLocale || "—"}`,
    `Referrer: ${client.referrer || "Direct / none"}`,
    `Page: ${client.pageUrl || "—"}`,
    `UTM: ${formatUtmDisplay(meta)}`,
  ];

  if (client.formDurationSec != null) {
    lines.push(`Form time: ${client.formDurationSec}s`);
  }

  return lines.join("\n");
}
