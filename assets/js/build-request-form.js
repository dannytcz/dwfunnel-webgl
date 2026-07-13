import { CONTACT_CONFIG } from "./contact-config.js";
import { getVisitSnapshot } from "./visit-analytics.js";

const TRAFFIC_OPTIONS = ["ADS", "CONTENT", "DMS", "REFERRALS", "OTHER"];
const BUDGET_OPTIONS = ["$1K–3K", "$3K–5K", "$5K–10K", "$10K+"];
const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"];
const UTM_STORAGE_KEY = "dwf_utm";

const STEP_FIELDS = {
  1: ["name", "contact", "businessBrand"],
  2: ["offer", "trafficSources"],
  3: ["conversionProblem", "currentPage"],
  4: ["estimatedBudget", "additionalNotes"],
};

const STEP_TITLES = {
  1: "About you",
  2: "Your offer",
  3: "What's broken",
  4: "Budget & send",
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
  form.querySelectorAll(".form-field.is-invalid").forEach(clearFieldError);
  form.querySelectorAll(".form-fieldset.is-invalid").forEach((fieldset) => {
    fieldset.classList.remove("is-invalid");
    const errorEl = fieldset.querySelector(".form-field__error");
    if (errorEl) {
      errorEl.textContent = "";
      errorEl.hidden = true;
    }
  });
  const formError = form.querySelector(".form-form__error");
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

export function collectPayload(form, formInitTime) {
  const trafficSources = TRAFFIC_OPTIONS.filter((key) => {
    const input = form.querySelector(`input[name="trafficSources"][value="${key}"]`);
    return input?.checked;
  });

  const budgetInput = form.querySelector('input[name="estimatedBudget"]:checked');

  return {
    name: getTrimmed(form, "name"),
    contact: getTrimmed(form, "contact"),
    businessBrand: getTrimmed(form, "businessBrand"),
    offer: getTrimmed(form, "offer"),
    trafficSources,
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
  contact: "Enter an email or WhatsApp number.",
  businessBrand: "Enter your business or brand name.",
  offer: "Tell us what you are selling.",
  conversionProblem: "Tell us what is not working.",
};

function validateRequiredText(form, names) {
  let valid = true;
  names.forEach((name) => {
    const field = form.querySelector(`.form-field[data-field="${name}"]`);
    if (!field) return;
    if (!getTrimmed(form, name)) {
      setFieldError(field, REQUIRED_TEXT[name]);
      valid = false;
    }
  });
  return valid;
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

export function validateStep(form, step) {
  clearAllErrors(form);
  let valid = true;

  if (step === 1) {
    valid = validateRequiredText(form, ["name", "contact", "businessBrand"]);
  } else if (step === 2) {
    valid = validateRequiredText(form, ["offer"]) && validateTraffic(form);
  } else if (step === 3) {
    valid = validateRequiredText(form, ["conversionProblem"]) && validateCurrentPage(form);
  } else if (step === 4) {
    valid = validateBudget(form);
  }

  return valid;
}

export function validateForm(form) {
  clearAllErrors(form);
  let valid = validateRequiredText(form, ["name", "contact", "businessBrand", "offer", "conversionProblem"]);
  valid = validateTraffic(form) && valid;
  valid = validateBudget(form) && valid;
  valid = validateCurrentPage(form) && valid;
  return valid;
}

export function bindFormInputClearing(form) {
  form.addEventListener("input", (event) => {
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
  });
}

export function showPageSuccess(wrap) {
  const ctaPanel = wrap.querySelector(".apply-cta-panel");
  const successPanel = wrap.querySelector(".apply-success");
  if (ctaPanel) ctaPanel.hidden = true;
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

export { TRAFFIC_OPTIONS, BUDGET_OPTIONS, STEP_FIELDS, STEP_TITLES };
