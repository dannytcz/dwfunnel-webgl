import {
  OVERALL_STEPS,
  STEP_RETENTION,
  STEP_TITLES,
  bindFormInputClearing,
  clearAllErrors,
  collectPayload,
  renderReviewSummary,
  showPageSuccess,
  submitBuildRequest,
  validateForm,
  validatePageStep,
  validateStep,
} from "./build-request-form.js";
import { markReachedApply } from "./visit-analytics.js";

const MODAL_STEPS = 4;
const DRAFT_KEY = "dwf_build_survey_draft";
const CONTINUE_LABEL = 'Continue <span class="btn__arrow" aria-hidden="true">→</span>';
const SUBMIT_LABEL = 'Submit build request <span class="btn__arrow" aria-hidden="true">→</span>';

let currentStep = 1;
let formInitTime = null;
let lastFocusedElement = null;
let surveyScrollBlockers = null;

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
  const hasValue = (el) => {
    if (!("value" in el) || el.type === "hidden") return false;
    if (el.type === "checkbox" || el.type === "radio") return el.checked;
    return String(el.value).trim().length > 0;
  };

  const pageInputs = document.querySelectorAll("#apply-page-step input");
  if (Array.from(pageInputs).some(hasValue)) return true;
  return Array.from(form.elements).some(hasValue);
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

    document.querySelectorAll("#apply-page-step input").forEach((input) => {
      if (input.name) draft[input.name] = input.value;
    });

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

      const pageInput = document.querySelector(`#apply-page-step [name="${key}"]`);
      if (pageInput && "value" in pageInput && !Array.isArray(value)) {
        pageInput.value = value;
        return;
      }

      const radio = form.querySelector(`input[name="${key}"][value="${value}"]`);
      if (radio) {
        radio.checked = true;
        return;
      }

      const el = form.elements.namedItem(key);
      if (el && "value" in el && !Array.isArray(value)) {
        el.value = value;
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

function renderReview(form) {
  const reviewEl = document.querySelector("[data-survey-review]");
  if (reviewEl) reviewEl.innerHTML = renderReviewSummary(form);
}

function updateStepUI(root, form, step) {
  currentStep = step;
  const overallStep = step + 1;

  root.querySelectorAll("[data-survey-step]").forEach((panel) => {
    const panelStep = Number(panel.dataset.surveyStep);
    const active = panelStep === step;
    panel.hidden = !active;
    panel.classList.toggle("is-active", active);
  });

  const stepLabel = root.querySelector("#build-survey-step-label");
  const title = root.querySelector("#build-survey-title");
  const retention = root.querySelector("#build-survey-retention");
  if (stepLabel) stepLabel.textContent = "Build request";
  if (title) title.textContent = STEP_TITLES[step] || "";
  if (retention) retention.textContent = STEP_RETENTION[step] || "";

  const progressFill = root.querySelector("[data-survey-progress]");
  if (progressFill) progressFill.style.width = `${(overallStep / OVERALL_STEPS) * 100}%`;

  const progressBar = root.querySelector("#build-survey-progress");
  if (progressBar) progressBar.setAttribute("aria-valuenow", String(overallStep));

  const nextBtn = root.querySelector("[data-survey-next]");
  if (nextBtn) {
    nextBtn.innerHTML = step === MODAL_STEPS ? SUBMIT_LABEL : CONTINUE_LABEL;
  }

  if (step === MODAL_STEPS) {
    renderReview(form);
    const reviewFocus = root.querySelector(".build-survey__review-edit");
    if (reviewFocus) reviewFocus.focus();
  } else {
    const firstInput = form.querySelector(
      `[data-survey-step="${step}"] input:not([type="checkbox"]):not([type="radio"]), [data-survey-step="${step}"] textarea`
    );
    if (firstInput) firstInput.focus();
  }
}

function isSurveyScrollTarget(target) {
  const root = getSurveyRoot();
  if (!root || !target || !(target instanceof Node)) return false;
  const body = root.querySelector(".build-survey__body");
  if (body && body.contains(target)) return true;
  const el = target instanceof Element ? target : target.parentElement;
  return Boolean(el?.closest?.(".build-survey__body, .build-survey__success"));
}

function bindSurveyScrollLock() {
  if (surveyScrollBlockers) return;
  const block = (event) => {
    if (isSurveyScrollTarget(event.target)) return;
    event.preventDefault();
  };
  surveyScrollBlockers = { block };
  window.addEventListener("wheel", block, { passive: false });
  window.addEventListener("touchmove", block, { passive: false });
}

function unbindSurveyScrollLock() {
  if (!surveyScrollBlockers) return;
  window.removeEventListener("wheel", surveyScrollBlockers.block);
  window.removeEventListener("touchmove", surveyScrollBlockers.block);
  surveyScrollBlockers = null;
}

function lockBodyScroll(lock) {
  document.documentElement.classList.toggle("is-survey-open", lock);
  if (lock) {
    window.lenis?.stop?.();
    bindSurveyScrollLock();
    return;
  }
  unbindSurveyScrollLock();
  window.lenis?.start?.();
}

function focusPageStep() {
  const nameInput = document.getElementById("br-name");
  if (nameInput) nameInput.focus();
}

export function openSurvey(trigger) {
  const root = getSurveyRoot();
  const form = getForm();
  if (!root || !form) return;

  if (!validatePageStep(form)) {
    focusPageStep();
    return;
  }

  const success = root.querySelector(".build-survey__success");
  const surveyForm = root.querySelector(".build-survey__form");
  if (success && !success.hidden) {
    form.reset();
    clearAllErrors(form);
    success.hidden = true;
    if (surveyForm) surveyForm.hidden = false;
  }

  lastFocusedElement = trigger || document.activeElement;
  if (!formInitTime) formInitTime = Date.now();
  markReachedApply();

  saveDraft(form);
  restoreDraft(form);
  updateStepUI(root, form, 1);

  root.hidden = false;
  root.setAttribute("aria-hidden", "false");
  lockBodyScroll(true);

  const frame = root.querySelector(".build-survey__frame");
  if (frame) frame.focus();
}

export function closeSurvey({ force = false, focusPage = false } = {}) {
  const root = getSurveyRoot();
  const form = getForm();
  if (!root || root.hidden) return;

  // Skip confirm when returning to the page step to edit — that is not abandoning the form.
  if (!force && !focusPage && form && isFormDirty(form)) {
    const leave = window.confirm("Close this form? Your answers will stay saved for this session.");
    if (!leave) return;
  }

  if (form) saveDraft(form);

  root.hidden = true;
  root.setAttribute("aria-hidden", "true");
  lockBodyScroll(false);

  if (focusPage) {
    focusPageStep();
    return;
  }

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
  const nextBtn = root.querySelector("[data-survey-next]");
  const formError = form.querySelector(".form-form__error");
  const payload = collectPayload(form, formInitTime);

  form.dataset.processing = "true";
  if (nextBtn) {
    nextBtn.disabled = true;
    nextBtn.dataset.defaultHtml = nextBtn.dataset.defaultHtml || nextBtn.innerHTML;
    nextBtn.textContent = "Submitting…";
  }
  if (formError) formError.hidden = true;

  return submitBuildRequest(payload)
    .then(() => {
      clearDraft();
      formInitTime = null;
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
      if (nextBtn) {
        nextBtn.disabled = false;
        nextBtn.innerHTML = nextBtn.dataset.defaultHtml || SUBMIT_LABEL;
      }
    });
}

function goToStep(root, form, step) {
  updateStepUI(root, form, step);
}

export function initBuildRequestSurvey() {
  const root = getSurveyRoot();
  const form = getForm();
  const wrap = document.getElementById("apply-form-wrap");
  if (!root || !form) return;

  bindFormInputClearing(form);
  restoreDraft(form);

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
    if (currentStep > 1) {
      goToStep(root, form, currentStep - 1);
      return;
    }
    closeSurvey({ focusPage: true });
  });

  root.querySelector("[data-survey-next]")?.addEventListener("click", () => {
    if (currentStep === MODAL_STEPS) {
      handleSubmit(form, wrap);
      return;
    }
    if (!validateStep(form, currentStep)) return;
    saveDraft(form);
    goToStep(root, form, currentStep + 1);
  });

  root.addEventListener("click", (event) => {
    const editBtn = event.target.closest("[data-review-edit]");
    if (!editBtn) return;

    event.preventDefault();
    event.stopPropagation();

    const target = editBtn.dataset.reviewEdit;
    if (target === "page") {
      closeSurvey({ force: true, focusPage: true });
      return;
    }

    const step = Number(target);
    if (step >= 1 && step <= 3) {
      goToStep(root, form, step);
    }
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (currentStep === MODAL_STEPS) handleSubmit(form, wrap);
  });

  form.addEventListener("input", () => saveDraft(form));
  form.addEventListener("change", () => saveDraft(form));

  document.getElementById("apply-page-step")?.addEventListener("input", () => saveDraft(form));
  document.getElementById("apply-page-step")?.addEventListener("change", () => saveDraft(form));

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
