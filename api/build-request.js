import { buildEmailHtml, buildEmailText } from "./lib/email-template.js";
import { enforceBuildRequestRateLimit } from "./lib/rate-limit.js";
import {
  extractServerMeta,
  mergeSubmissionMeta,
  sanitizeClientMeta,
} from "./lib/submission-meta.js";

const BUDGET_OPTIONS = new Set(["$1K–3K", "$3K–5K", "$5K–10K", "$10K+"]);
const TRAFFIC_OPTIONS = new Set(["ADS", "CONTENT", "DMS", "REFERRALS", "OTHER"]);
const TO_EMAIL = process.env.BUILD_REQUEST_TO_EMAIL || "drdannytan@gmail.com";
const FROM_EMAIL = process.env.RESEND_FROM || "DW Funnel <build@deedaptech.com>";
const RATE_LIMIT_PER_DAY = 3;

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  if (status === 429 && body?.retryAfterSec) {
    res.setHeader("Retry-After", String(Math.ceil(body.retryAfterSec)));
  }
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
      if (data.length > 1_000_000) {
        reject(new Error("Payload too large"));
        req.destroy();
      }
    });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

function trim(value) {
  return typeof value === "string" ? value.trim() : "";
}

function isValidUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function validatePayload(body) {
  const errors = {};
  const name = trim(body.name);
  const email = trim(body.email);
  const whatsapp = trim(body.whatsapp);
  const businessBrand = trim(body.businessBrand);
  const offer = trim(body.offer);
  const conversionProblem = trim(body.conversionProblem);
  const currentPage = trim(body.currentPage);
  const estimatedBudget = trim(body.estimatedBudget);
  const additionalNotes = trim(body.additionalNotes);
  const trafficSources = Array.isArray(body.trafficSources)
    ? body.trafficSources.filter((item) => TRAFFIC_OPTIONS.has(item))
    : [];

  if (!name) errors.name = "Enter your name.";
  if (!email) errors.email = "Enter your email address.";
  if (email && !isEmail(email)) errors.email = "Enter a valid email address.";
  if (!businessBrand) errors.businessBrand = "Enter your business or brand name.";
  if (!offer) errors.offer = "Tell us what you are selling.";
  if (!conversionProblem) errors.conversionProblem = "Tell us what is not working.";
  if (!trafficSources.length) errors.trafficSources = "Select at least one traffic source.";
  if (!BUDGET_OPTIONS.has(estimatedBudget)) errors.estimatedBudget = "Select a budget range.";
  if (currentPage && !isValidUrl(currentPage)) errors.currentPage = "Enter a valid URL starting with https://";

  if (Object.keys(errors).length) {
    return { ok: false, errors };
  }

  const clientMeta = sanitizeClientMeta(body.meta?.client || body.meta);

  return {
    ok: true,
    payload: {
      name,
      email,
      whatsapp,
      businessBrand,
      offer,
      trafficSources,
      conversionProblem,
      currentPage,
      estimatedBudget,
      additionalNotes,
      meta: mergeSubmissionMeta(clientMeta, {}),
    },
  };
}

async function sendEmail(payload) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not configured.");
  }

  const subject = `Build request — ${payload.businessBrand} · ${payload.estimatedBudget} (${payload.name})`;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [TO_EMAIL],
      subject,
      html: buildEmailHtml(payload),
      text: buildEmailText(payload),
      reply_to: isEmail(payload.email) ? payload.email : undefined,
    }),
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = result?.message || result?.error || "Email delivery failed.";
    throw new Error(message);
  }

  return result;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== "POST") {
    json(res, 405, { error: "Method not allowed." });
    return;
  }

  try {
    const raw = await readBody(req);
    const body = raw ? JSON.parse(raw) : {};
    const validated = validatePayload(body);

    if (!validated.ok) {
      json(res, 400, { error: "Validation failed.", fields: validated.errors });
      return;
    }

    const serverMeta = extractServerMeta(req);
    const rate = await enforceBuildRequestRateLimit({
      ip: serverMeta.ip,
      email: validated.payload.email,
      limit: RATE_LIMIT_PER_DAY,
    });

    if (!rate.ok) {
      json(res, rate.status || 429, {
        error: rate.error,
        code: rate.code,
        limit: rate.limit ?? RATE_LIMIT_PER_DAY,
        retryAfterSec: rate.retryAfterSec,
      });
      return;
    }

    const payload = {
      ...validated.payload,
      meta: mergeSubmissionMeta(validated.payload.meta.client, serverMeta),
    };

    const emailResult = await sendEmail(payload);
    json(res, 200, {
      ok: true,
      id: emailResult?.id || null,
      remainingToday: rate.remaining,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error.";
    const status = message.includes("RESEND_API_KEY") ? 503 : 500;
    json(res, status, { error: message });
  }
}
