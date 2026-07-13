import { CONTACT_CONFIG } from "./contact-config.js";

const TRAFFIC_OPTIONS = ["ADS", "CONTENT", "DMS", "REFERRALS", "OTHER"];
const BUDGET_OPTIONS = ["$1K–3K", "$3K–5K", "$5K–10K", "$10K+"];
const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"];
const UTM_STORAGE_KEY = "dwf_utm";

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

function isValidUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function setFieldError(field, message) {
  field.classList.add("is-invalid");
  const errorEl = field.querySelector(".form-field__error");
  if (errorEl) {
    errorEl.textContent = message;
    errorEl.hidden = false;
  }
}

function clearFieldError(field) {
  field.classList.remove("is-invalid");
  const errorEl = field.querySelector(".form-field__error");
  if (errorEl) {
    errorEl.textContent = "";
    errorEl.hidden = true;
  }
}

function clearAllErrors(form) {
  form.querySelectorAll(".form-field.is-invalid").forEach(clearFieldError);
  const groupErrors = form.querySelectorAll(".form-fieldset.is-invalid");
  groupErrors.forEach((fieldset) => {
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

function getTrimmed(form, name) {
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

function collectClientMeta(formInitTime) {
  let clientTimezone = "";
  try {
    clientTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
  } catch {
    clientTimezone = "";
  }

  return {
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

function collectPayload(form, formInitTime) {
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

function validateForm(form) {
  clearAllErrors(form);
  let valid = true;

  const requiredText = [
    ["name", "Enter your name."],
    ["contact", "Enter an email or WhatsApp number."],
    ["businessBrand", "Enter your business or brand name."],
    ["offer", "Tell us what you are selling."],
    ["conversionProblem", "Tell us what is not working."],
  ];

  requiredText.forEach(([name, message]) => {
    const field = form.querySelector(`.form-field[data-field="${name}"]`);
    if (!field) return;
    if (!getTrimmed(form, name)) {
      setFieldError(field, message);
      valid = false;
    }
  });

  const trafficFieldset = form.querySelector('.form-fieldset[data-field="trafficSources"]');
  const trafficChecked = form.querySelectorAll('input[name="trafficSources"]:checked').length;
  if (!trafficChecked && trafficFieldset) {
    trafficFieldset.classList.add("is-invalid");
    const errorEl = trafficFieldset.querySelector(".form-field__error");
    if (errorEl) {
      errorEl.textContent = "Select at least one traffic source.";
      errorEl.hidden = false;
    }
    valid = false;
  }

  const budgetFieldset = form.querySelector('.form-fieldset[data-field="estimatedBudget"]');
  const budgetChecked = form.querySelector('input[name="estimatedBudget"]:checked');
  if (!budgetChecked && budgetFieldset) {
    budgetFieldset.classList.add("is-invalid");
    const errorEl = budgetFieldset.querySelector(".form-field__error");
    if (errorEl) {
      errorEl.textContent = "Select a budget range.";
      errorEl.hidden = false;
    }
    valid = false;
  }

  const currentPage = getTrimmed(form, "currentPage");
  const pageField = form.querySelector('.form-field[data-field="currentPage"]');
  if (currentPage && pageField && !isValidUrl(currentPage)) {
    setFieldError(pageField, "Enter a valid URL starting with https://");
    valid = false;
  }

  return valid;
}

function showSuccess(wrap) {
  const formPanel = wrap.querySelector(".apply-form-panel");
  const successPanel = wrap.querySelector(".apply-success");
  if (formPanel) formPanel.hidden = true;
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

  const form = document.getElementById("build-request-form");
  const wrap = document.getElementById("apply-form-wrap");
  if (!form || !wrap) return;

  const formInitTime = Date.now();

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

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (form.dataset.processing === "true") return;

    if (!validateForm(form)) return;

    const submitBtn = form.querySelector('[type="submit"]');
    const formError = form.querySelector(".form-form__error");
    const payload = collectPayload(form, formInitTime);

    form.dataset.processing = "true";
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.dataset.defaultLabel = submitBtn.dataset.defaultLabel || submitBtn.textContent;
      submitBtn.textContent = "Submitting…";
    }
    if (formError) formError.hidden = true;

    try {
      await submitBuildRequest(payload);
      showSuccess(wrap);
    } catch (err) {
      if (formError) {
        formError.hidden = false;
        formError.textContent =
          err.message === "Build request endpoint is not configured."
            ? "Submission is not live yet. For urgent projects, use the WhatsApp link below."
            : "Something went wrong. Try again or message us on WhatsApp.";
      }
    } finally {
      form.dataset.processing = "false";
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = submitBtn.dataset.defaultLabel || "Submit build request";
      }
    }
  });
}

export { TRAFFIC_OPTIONS, BUDGET_OPTIONS };
