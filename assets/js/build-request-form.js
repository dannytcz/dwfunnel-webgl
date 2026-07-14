import { CONTACT_CONFIG } from "./contact-config.js";
import { getVisitSnapshot } from "./visit-analytics.js";

const TRAFFIC_OPTIONS = ["ADS", "CONTENT", "DMS", "REFERRALS", "OTHER"];
const BUDGET_OPTIONS = ["$1K–3K", "$3K–5K", "$5K–10K", "$10K+"];
const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"];
const UTM_STORAGE_KEY = "dwf_utm";
const OVERALL_STEPS = 5;

const STEP_TITLES = {
  1: "Your offer",
  2: "What's broken",
  3: "Budget",
  4: "Check & send",
};

const STEP_RETENTION = {
  1: "Good start. Now tell us what you're selling.",
  2: "Halfway there. This is where we look for the leak.",
  3: "Almost done — last few questions.",
  4: "Last one. Check everything looks right, then send it.",
};

/**
 * Submit a build request to the configured backend.
 * @param {object} payload
 * @returns {Promise<object>}
 */
export async function submitBuildRequest(payload) {
  const endpoint = CONTACT_CONFIG.buildRequestEndpoint;
  if (!endpoint) {
    throw new Error("Build request endpoint is not configured.");
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Submission failed (${response.status}).`);
  }

  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return response.json();
  }
  return { ok: true };
}

export function isValidUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function setFieldError(field, message) {
  field.classList.add("is-invalid");
  const errorEl = field.querySelector(".form-field__error");
  if (errorEl) {
    errorEl.textContent = message;
    errorEl.hidden = false;
  }
}

export function clearFieldError(field) {
  field.classList.remove("is-invalid");
  const errorEl = field.querySelector(".form-field__error");
  if (errorEl) {
    errorEl.textContent = "";
    errorEl.hidden = true;
  }
}

export function clearAllErrors(form) {
  document.querySelectorAll(".form-field.is-invalid").forEach(clearFieldError);
  document.querySelectorAll(".form-fieldset.is-invalid").forEach((fieldset) => {
    fieldset.classList.remove("is-invalid");
    const errorEl = fieldset.querySelector(".form-field__error");
    if (errorEl) {
      errorEl.textContent = "";
      errorEl.hidden = true;
    }
  });
  const formError = form?.querySelector(".form-form__error");
  if (formError) {
    formError.hidden = true;
    formError.textContent = "";
  }
}

export function getTrimmed(form, name) {
  const el = form.elements.namedItem(name);
  return el && "value" in el ? String(el.value).trim() : "";
}

function persistUtmParams() {
  try {
    const params = new URLSearchParams(location.search);
    const utm = {};
    UTM_KEYS.forEach((key) => {
      const value = params.get(key);
      if (value) utm[key.replace("utm_", "")] = value;
    });
    if (Object.keys(utm).length) {
      sessionStorage.setItem(UTM_STORAGE_KEY, JSON.stringify(utm));
    }
  } catch {
    // ignore storage failures
  }
}

function readUtmParams() {
  try {
    const stored = sessionStorage.getItem(UTM_STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {
    // ignore parse failures
  }

  try {
    const params = new URLSearchParams(location.search);
    const utm = {};
    UTM_KEYS.forEach((key) => {
      const value = params.get(key);
      if (value) utm[key.replace("utm_", "")] = value;
    });
    return Object.keys(utm).length ? utm : undefined;
  } catch {
    return undefined;
  }
}

function getDeviceType() {
  const width = window.innerWidth;
  if (width < 768) return "mobile";
  if (width < 1024) return "tablet";
  return "desktop";
}

export function collectClientMeta(formInitTime) {
  let clientTimezone = "";
  try {
    clientTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
  } catch {
    clientTimezone = "";
  }

  return {
    ...getVisitSnapshot(),
    clientTimezone,
    clientSubmittedAt: new Date().toISOString(),
    clientLocale: navigator.language || "",
    referrer: document.referrer || "",
    pageUrl: location.href,
    device: getDeviceType(),
    screenWidth: window.innerWidth,
    utm: readUtmParams(),
    formDurationSec: formInitTime ? Math.round((Date.now() - formInitTime) / 1000) : undefined,
  };
}

function getTrafficSources(form) {
  return TRAFFIC_OPTIONS.filter((key) => {
    const input = form.querySelector(`input[name="trafficSources"][value="${key}"]`);
    return input?.checked;
  });
}

export function collectPayload(form, formInitTime) {
  const budgetInput = form.querySelector('input[name="estimatedBudget"]:checked');

  return {
    name: getTrimmed(form, "name"),
    email: getTrimmed(form, "email"),
    whatsapp: getTrimmed(form, "whatsapp"),
    businessBrand: getTrimmed(form, "businessBrand"),
    offer: getTrimmed(form, "offer"),
    trafficSources: getTrafficSources(form),
    conversionProblem: getTrimmed(form, "conversionProblem"),
    currentPage: getTrimmed(form, "currentPage"),
    estimatedBudget: budgetInput ? budgetInput.value : "",
    additionalNotes: getTrimmed(form, "additionalNotes"),
    meta: {
      client: collectClientMeta(formInitTime),
    },
  };
}

const REQUIRED_TEXT = {
  name: "Enter your name.",
  email: "Enter your email address.",
  businessBrand: "Enter your business or brand name.",
  offer: "Tell us what you are selling.",
  conversionProblem: "Tell us what is not working.",
};

function validateRequiredText(form, names) {
  let valid = true;
  names.forEach((name) => {
    const field = document.querySelector(`.form-field[data-field="${name}"]`);
    if (!field) return;
    if (!getTrimmed(form, name)) {
      setFieldError(field, REQUIRED_TEXT[name]);
      valid = false;
    }
  });
  return valid;
}

function validateEmail(form) {
  const field = document.querySelector('.form-field[data-field="email"]');
  const email = getTrimmed(form, "email");
  if (!field) return true;
  if (!email) {
    setFieldError(field, REQUIRED_TEXT.email);
    return false;
  }
  if (!isValidEmail(email)) {
    setFieldError(field, "Enter a valid email address.");
    return false;
  }
  return true;
}

function validateTraffic(form) {
  const trafficFieldset = form.querySelector('.form-fieldset[data-field="trafficSources"]');
  const trafficChecked = form.querySelectorAll('input[name="trafficSources"]:checked').length;
  if (!trafficChecked && trafficFieldset) {
    trafficFieldset.classList.add("is-invalid");
    const errorEl = trafficFieldset.querySelector(".form-field__error");
    if (errorEl) {
      errorEl.textContent = "Select at least one traffic source.";
      errorEl.hidden = false;
    }
    return false;
  }
  return true;
}

function validateBudget(form) {
  const budgetFieldset = form.querySelector('.form-fieldset[data-field="estimatedBudget"]');
  const budgetChecked = form.querySelector('input[name="estimatedBudget"]:checked');
  if (!budgetChecked && budgetFieldset) {
    budgetFieldset.classList.add("is-invalid");
    const errorEl = budgetFieldset.querySelector(".form-field__error");
    if (errorEl) {
      errorEl.textContent = "Select a budget range.";
      errorEl.hidden = false;
    }
    return false;
  }
  return true;
}

function validateCurrentPage(form) {
  const currentPage = getTrimmed(form, "currentPage");
  const pageField = form.querySelector('.form-field[data-field="currentPage"]');
  if (currentPage && pageField && !isValidUrl(currentPage)) {
    setFieldError(pageField, "Enter a valid URL starting with https://");
    return false;
  }
  return true;
}

export function validatePageStep(form) {
  clearAllErrors(form);
  let valid = validateRequiredText(form, ["name", "businessBrand"]);
  valid = validateEmail(form) && valid;
  return valid;
}

export function validateStep(form, step) {
  clearAllErrors(form);
  let valid = true;

  if (step === 1) {
    valid = validateRequiredText(form, ["offer"]) && validateTraffic(form);
  } else if (step === 2) {
    valid = validateRequiredText(form, ["conversionProblem"]) && validateCurrentPage(form);
  } else if (step === 3) {
    valid = validateBudget(form);
  }

  return valid;
}

export function validateForm(form) {
  clearAllErrors(form);
  let valid = validatePageStep(form);
  valid = validateRequiredText(form, ["offer", "conversionProblem"]) && valid;
  valid = validateTraffic(form) && valid;
  valid = validateBudget(form) && valid;
  valid = validateCurrentPage(form) && valid;
  return valid;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function reviewRow(label, value) {
  return `<div class="build-survey__review-row"><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value || "—")}</dd></div>`;
}

export function renderReviewSummary(form) {
  const payload = collectPayload(form, null);
  const traffic = payload.trafficSources.length ? payload.trafficSources.join(", ") : "—";

  return `
    <section class="build-survey__review-block">
      <div class="build-survey__review-head">
        <h3>You</h3>
        <button type="button" class="build-survey__review-edit" data-review-edit="page">Edit</button>
      </div>
      <dl class="build-survey__review-list">
        ${reviewRow("Name", payload.name)}
        ${reviewRow("Email", payload.email)}
        ${reviewRow("WhatsApp", payload.whatsapp || "Not provided")}
        ${reviewRow("Business / brand", payload.businessBrand)}
      </dl>
    </section>
    <section class="build-survey__review-block">
      <div class="build-survey__review-head">
        <h3>Your offer</h3>
        <button type="button" class="build-survey__review-edit" data-review-edit="1">Edit</button>
      </div>
      <dl class="build-survey__review-list">
        ${reviewRow("What you're selling", payload.offer)}
        ${reviewRow("Where is your traffic usually come from?", traffic)}
      </dl>
    </section>
    <section class="build-survey__review-block">
      <div class="build-survey__review-head">
        <h3>What's broken</h3>
        <button type="button" class="build-survey__review-edit" data-review-edit="2">Edit</button>
      </div>
      <dl class="build-survey__review-list">
        ${reviewRow("Problem", payload.conversionProblem)}
        ${reviewRow("Current page", payload.currentPage || "Not provided")}
      </dl>
    </section>
    <section class="build-survey__review-block">
      <div class="build-survey__review-head">
        <h3>Budget</h3>
        <button type="button" class="build-survey__review-edit" data-review-edit="3">Edit</button>
      </div>
      <dl class="build-survey__review-list">
        ${reviewRow("Estimated budget", payload.estimatedBudget)}
        ${reviewRow("Anything else", payload.additionalNotes || "Not provided")}
      </dl>
    </section>`;
}

export function bindFormInputClearing(form) {
  const clearHandler = (event) => {
    const field = event.target.closest(".form-field");
    if (field) clearFieldError(field);

    const fieldset = event.target.closest(".form-fieldset");
    if (fieldset) {
      fieldset.classList.remove("is-invalid");
      const errorEl = fieldset.querySelector(".form-field__error");
      if (errorEl) {
        errorEl.hidden = true;
        errorEl.textContent = "";
      }
    }
  };

  form.addEventListener("input", clearHandler);
  form.addEventListener("change", clearHandler);

  document.getElementById("apply-page-step")?.addEventListener("input", clearHandler);
  document.getElementById("apply-page-step")?.addEventListener("change", clearHandler);
}

export function showPageSuccess(wrap) {
  const pageStep = wrap.querySelector(".apply-page-step");
  const successPanel = wrap.querySelector(".apply-success");
  if (pageStep) pageStep.hidden = true;
  if (successPanel) {
    successPanel.hidden = false;
    successPanel.querySelector(".apply-success__heading")?.focus();
  }
}

function bindWhatsAppLinks() {
  document.querySelectorAll("[data-whatsapp-link]").forEach((link) => {
    const isDeadline =
      link.dataset.whatsappVariant === "deadline" || Boolean(link.closest(".apply-deadline"));
    link.href = isDeadline ? CONTACT_CONFIG.whatsAppDeadlineUrl : CONTACT_CONFIG.whatsAppUrl;
  });
}

export function initBuildRequestForm() {
  persistUtmParams();
  bindWhatsAppLinks();
}

export {
  TRAFFIC_OPTIONS,
  BUDGET_OPTIONS,
  STEP_TITLES,
  STEP_RETENTION,
  OVERALL_STEPS,
};
