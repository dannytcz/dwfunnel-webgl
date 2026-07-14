import { createHash } from "node:crypto";
import { get, put } from "@vercel/blob";

const DAY_MS = 86_400_000;
export const DEFAULT_LIMIT = 3;

function utcDayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export function normalizeEmail(email) {
  return String(email || "")
    .trim()
    .toLowerCase()
    .slice(0, 254);
}

export function normalizeIp(ip) {
  const raw = String(ip || "")
    .trim()
    .toLowerCase();
  if (!raw || raw === "unknown") return "";
  return raw.split(",")[0].trim().slice(0, 64);
}

function fingerprint(value) {
  return createHash("sha256").update(value).digest("hex").slice(0, 32);
}

function counterPath(kind, value, day) {
  return `rate-limit/${day}/${kind}/${fingerprint(value)}.json`;
}

function secondsUntilUtcMidnight(date = new Date()) {
  const next = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1);
  return Math.max(1, (next - date.getTime()) / 1000);
}

function blobAuth() {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  return token ? { token } : {};
}

async function readCount(pathname) {
  try {
    const result = await get(pathname, { access: "private", ...blobAuth() });
    if (!result || result.statusCode === 404 || !result.stream) return 0;
    const text = await new Response(result.stream).text();
    if (!text) return 0;
    const parsed = JSON.parse(text);
    const count = Number(parsed?.count);
    return Number.isFinite(count) && count > 0 ? Math.floor(count) : 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/not found|404/i.test(message)) return 0;
    throw error;
  }
}

async function writeCount(pathname, count) {
  await put(
    pathname,
    JSON.stringify({
      count,
      updatedAt: new Date().toISOString(),
    }),
    {
      access: "private",
      contentType: "application/json",
      addRandomSuffix: false,
      allowOverwrite: true,
      ...blobAuth(),
    }
  );
}

async function bumpCounter(pathname) {
  const current = await readCount(pathname);
  const next = current + 1;
  await writeCount(pathname, next);
  return next;
}

/**
 * Enforce max submissions per UTC day for both IP and email.
 * Either key hitting the limit blocks the request.
 */
export async function enforceBuildRequestRateLimit({ ip, email, limit = DEFAULT_LIMIT } = {}) {
  if (!process.env.BLOB_READ_WRITE_TOKEN && !process.env.VERCEL_OIDC_TOKEN) {
    return {
      ok: false,
      status: 503,
      error: "Rate limiting is not configured yet.",
      code: "RATE_LIMIT_UNAVAILABLE",
    };
  }

  const day = utcDayKey();
  const cleanEmail = normalizeEmail(email);
  const cleanIp = normalizeIp(ip);
  const paths = [];

  if (cleanIp) paths.push(counterPath("ip", cleanIp, day));
  if (cleanEmail) paths.push(counterPath("email", cleanEmail, day));

  if (!paths.length) {
    return {
      ok: false,
      status: 429,
      error: "Too many build requests. Try again tomorrow.",
      code: "RATE_LIMITED",
      retryAfterSec: Math.ceil(secondsUntilUtcMidnight()),
    };
  }

  const counts = [];
  for (const pathname of paths) {
    counts.push(await bumpCounter(pathname));
  }

  const highest = Math.max(...counts);
  if (highest > limit) {
    return {
      ok: false,
      status: 429,
      error: "Too many build requests from this email or network today. Try again tomorrow.",
      code: "RATE_LIMITED",
      limit,
      count: highest,
      retryAfterSec: Math.ceil(secondsUntilUtcMidnight()),
    };
  }

  return {
    ok: true,
    limit,
    count: highest,
    remaining: Math.max(0, limit - highest),
  };
}

export { utcDayKey, DAY_MS };
