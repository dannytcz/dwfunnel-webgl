import {
  STEP_TITLES,
  bindFormInputClearing,
  clearAllErrors,
  collectPayload,
  showPageSuccess,
  submitBuildRequest,
  validateForm,
  validateStep,
} from "./build-request-form.js";
import { markReachedApply } from "./visit-analytics.js";

const TOTAL_STEPS = 4;
const DRAFT_KEY = "dwf_build_survey_draft";

let currentStep = 1;
let formInitTime = null;
let lastFocusedElement = null;

function getSurveyRoot() {
  return document.getElementById("build-survey");
}

function getForm() {
  return document.getElementById("build-request-form");
}

function getFocusableElements(container) {
  return Array.from(
    container.querySelectorAll(
      'button:not([disabled]):not([hidden]), input:not([disabled]):not([type="hidden"]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
    )
  ).filter((el) => el.offsetParent !== null || el === document.activeElement);
}

function isFormDirty(form) {
  return Array.from(form.elements).some((el) => {
    if (!("value" in el) || el.type === "hidden") return false;
    if (el.type === "checkbox" || el.type === "radio") return el.checked;
    return String(el.value).trim().length > 0;
  });
}

function saveDraft(form) {
  try {
    const data = new FormData(form);
    const draft = {};
    for (const [key, value] of data.entries()) {
      if (draft[key]) {
        if (!Array.isArray(draft[key])) draft[key] = [draft[key]];
        draft[key].push(value);
      } else {
        draft[key] = value;
      }
    }
    const traffic = form.querySelectorAll('input[name="trafficSources"]:checked');
    draft.trafficSources = Array.from(traffic).map((input) => input.value);
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // ignore
  }
}

function restoreDraft(form) {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    if (!raw) return;
    const draft = JSON.parse(raw);
    Object.entries(draft).forEach(([key, value]) => {
      if (key === "trafficSources" && Array.isArray(value)) {
        value.forEach((v) => {
          const input = form.querySelector(`input[name="trafficSources"][value="${v}"]`);
          if (input) input.checked = true;
        });
        return;
      }
      const el = form.elements.namedItem(key);
      if (el && "value" in el && !Array.isArray(value)) {
        el.value = value;
      } else if (el && el.type === "radio") {
        const radio = form.querySelector(`input[name="${key}"][value="${value}"]`);
        if (radio) radio.checked = true;
      }
    });
  } catch {
    // ignore
  }
}

function clearDraft() {
  try {
    sessionStorage.removeItem(DRAFT_KEY);
  } catch {
    // ignore
  }
}

function updateStepUI(root, form, step) {
  currentStep = step;

  root.querySelectorAll("[data-survey-step]").forEach((panel) => {
    const panelStep = Number(panel.dataset.surveyStep);
    const active = panelStep === step;
    panel.hidden = !active;
    panel.classList.toggle("is-active", active);
  });

  const stepLabel = root.querySelector("#build-survey-step-label");
  const title = root.querySelector("#build-survey-title");
  if (stepLabel) stepLabel.textContent = `Step ${step} of ${TOTAL_STEPS}`;
  if (title) title.textContent = STEP_TITLES[step] || "";

  const progress = root.querySelector("[data-survey-progress]");
  if (progress) progress.style.width = `${(step / TOTAL_STEPS) * 100}%`;

  const backBtn = root.querySelector("[data-survey-back]");
  const nextBtn = root.querySelector("[data-survey-next]");
  const submitBtn = root.querySelector("[data-survey-submit]");
  if (backBtn) backBtn.hidden = step === 1;
  if (nextBtn) nextBtn.hidden = step === TOTAL_STEPS;
  if (submitBtn) submitBtn.hidden = step !== TOTAL_STEPS;

  const firstInput = form.querySelector(`[data-survey-step="${step}"] input, [data-survey-step="${step}"] textarea`);
  if (firstInput) firstInput.focus();
}

function lockBodyScroll(lock) {
  document.documentElement.classList.toggle("is-survey-open", lock);
}

export function openSurvey(trigger) {
  const root = getSurveyRoot();
  const form = getForm();
  if (!root || !form) return;

  const success = root.querySelector(".build-survey__success");
  const surveyForm = root.querySelector(".build-survey__form");
  if (success && !success.hidden) {
    form.reset();
    clearAllErrors(form);
    success.hidden = true;
    if (surveyForm) surveyForm.hidden = false;
  }

  lastFocusedElement = trigger || document.activeElement;
  formInitTime = Date.now();
  currentStep = 1;
  markReachedApply();

  restoreDraft(form);
  updateStepUI(root, form, 1);

  root.hidden = false;
  root.setAttribute("aria-hidden", "false");
  lockBodyScroll(true);

  const frame = root.querySelector(".build-survey__frame");
  if (frame) frame.focus();
}

export function closeSurvey({ force = false } = {}) {
  const root = getSurveyRoot();
  const form = getForm();
  if (!root || root.hidden) return;

  if (!force && form && isFormDirty(form)) {
    const leave = window.confirm("Close this form? Your answers will stay saved for this session.");
    if (!leave) return;
  }

  if (form) saveDraft(form);

  root.hidden = true;
  root.setAttribute("aria-hidden", "true");
  lockBodyScroll(false);

  if (lastFocusedElement && typeof lastFocusedElement.focus === "function") {
    lastFocusedElement.focus();
  }
}

function showSurveySuccess(root) {
  const form = root.querySelector(".build-survey__form");
  const success = root.querySelector(".build-survey__success");
  if (form) form.hidden = true;
  if (success) {
    success.hidden = false;
    success.querySelector(".apply-success__heading")?.focus();
  }
}

function handleSubmit(form, wrap) {
  if (form.dataset.processing === "true") return;
  if (!validateForm(form)) return;

  const root = getSurveyRoot();
  const submitBtn = form.querySelector("[data-survey-submit]");
  const formError = form.querySelector(".form-form__error");
  const payload = collectPayload(form, formInitTime);

  form.dataset.processing = "true";
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.dataset.defaultLabel = submitBtn.dataset.defaultLabel || submitBtn.textContent;
    submitBtn.textContent = "Submitting…";
  }
  if (formError) formError.hidden = true;

  return submitBuildRequest(payload)
    .then(() => {
      clearDraft();
      showSurveySuccess(root);
      if (wrap) showPageSuccess(wrap);
    })
    .catch((err) => {
      if (formError) {
        formError.hidden = false;
        formError.textContent =
          err.message === "Build request endpoint is not configured."
            ? "Submission is not live yet. For urgent projects, use the WhatsApp link below."
            : "Something went wrong. Try again or message us on WhatsApp.";
      }
    })
    .finally(() => {
      form.dataset.processing = "false";
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = submitBtn.dataset.defaultLabel || "Submit build request";
      }
    });
}

export function initBuildRequestSurvey() {
  const root = getSurveyRoot();
  const form = getForm();
  const wrap = document.getElementById("apply-form-wrap");
  if (!root || !form) return;

  bindFormInputClearing(form);

  document.querySelectorAll("[data-open-build-survey]").forEach((btn) => {
    btn.addEventListener("click", () => openSurvey(btn));
  });

  root.querySelectorAll("[data-survey-close]").forEach((el) => {
    el.addEventListener("click", () => {
      const force = Boolean(el.closest(".build-survey__success"));
      closeSurvey({ force });
    });
  });

  root.querySelector("[data-survey-back]")?.addEventListener("click", () => {
    if (currentStep > 1) updateStepUI(root, form, currentStep - 1);
  });

  root.querySelector("[data-survey-next]")?.addEventListener("click", () => {
    if (!validateStep(form, currentStep)) return;
    saveDraft(form);
    if (currentStep < TOTAL_STEPS) updateStepUI(root, form, currentStep + 1);
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    handleSubmit(form, wrap);
  });

  form.addEventListener("input", () => saveDraft(form));
  form.addEventListener("change", () => saveDraft(form));

  document.addEventListener("keydown", (event) => {
    if (root.hidden) return;

    if (event.key === "Escape") {
      event.preventDefault();
      closeSurvey();
      return;
    }

    if (event.key !== "Tab") return;
    const frame = root.querySelector(".build-survey__frame");
    if (!frame) return;
    const focusable = getFocusableElements(frame);
    if (!focusable.length) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });
}
