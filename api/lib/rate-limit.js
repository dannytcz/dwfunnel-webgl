import { createHash, randomUUID } from "node:crypto";
import { get, put } from "@vercel/blob";

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

function fingerprint(value) {
  return createHash("sha256").update(value).digest("hex").slice(0, 32);
}

function counterPath(email, day) {
  return `rate-limit/${day}/email/${fingerprint(email)}.json`;
}

function blobAuth() {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  return token ? { token } : {};
}

function hasBlobAuth() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN || process.env.VERCEL_OIDC_TOKEN);
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

async function bumpEmailCounter(email, limit = DEFAULT_LIMIT) {
  const day = utcDayKey();
  const pathname = counterPath(email, day);
  const current = await readCount(pathname);
  const next = current + 1;
  await writeCount(pathname, next);
  return {
    day,
    count: next,
    limit,
    remaining: Math.max(0, limit - next),
    shouldNotify: next <= limit,
  };
}

/**
 * Persist the full submission so overflow entries are still reviewable in Vercel Blob.
 */
export async function saveBuildRequestSubmission(payload, { notified, emailCount } = {}) {
  if (!hasBlobAuth()) {
    throw new Error("Blob storage is not configured.");
  }

  const day = utcDayKey();
  const email = normalizeEmail(payload.email);
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const pathname = `submissions/${day}/${stamp}-${fingerprint(email || randomUUID())}.json`;

  const body = {
    capturedAt: new Date().toISOString(),
    notified: Boolean(notified),
    emailCount: emailCount ?? null,
    payload,
  };

  const blob = await put(pathname, JSON.stringify(body, null, 2), {
    access: "private",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: false,
    ...blobAuth(),
  });

  return {
    pathname,
    url: blob.url,
  };
}

/**
 * Email-only daily limit. Always returns ok so we can still capture the payload.
 * `shouldNotify` is false once this email has already triggered 3 notify emails today.
 */
export async function trackEmailSubmission({ email, limit = DEFAULT_LIMIT } = {}) {
  if (!hasBlobAuth()) {
    return {
      ok: false,
      status: 503,
      error: "Rate limiting storage is not configured yet.",
      code: "RATE_LIMIT_UNAVAILABLE",
    };
  }

  const cleanEmail = normalizeEmail(email);
  if (!cleanEmail) {
    return {
      ok: true,
      shouldNotify: false,
      count: 0,
      remaining: 0,
      limit,
    };
  }

  const tracked = await bumpEmailCounter(cleanEmail, limit);
  return {
    ok: true,
    ...tracked,
  };
}

export { utcDayKey };
