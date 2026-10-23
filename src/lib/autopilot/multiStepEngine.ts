/**
 * multiStepEngine.ts
 * -----------------------------------------------------------------------------
 * AstrePilot Pillar C: ATS Multi-Step Form State Machine & Navigational Memory
 *
 * Implements:
 * 1. Step Category classification heuristics based on URLs, DOM indicators, & fields
 * 2. Next-Step vs Final Submit button discovery and disambiguation
 * 3. Navigational Session state serialization, hydration, and cumulative accounting
 * 4. Step progression transitions and cumulative telemetry tracking
 * -----------------------------------------------------------------------------
 */

export type StepCategory =
  | "CONTACT_INFO"
  | "EXPERIENCE"
  | "EDUCATION"
  | "EEO_COMPLIANCE"
  | "SCREENING"
  | "REVIEW_SUBMIT"
  | "GENERIC_STEP";

export interface StepRecord {
  stepIndex: number;
  stepCategory: StepCategory;
  stepName: string;
  fieldsTotal: number;
  fieldsFilled: number;
  completedAt: number;
}

export interface AstrePilotNavSession {
  sessionId: string;
  siteUrl: string;
  jobTitle?: string;
  company?: string;
  currentStepIndex: number;
  stepName: string;
  stepCategory: StepCategory;
  stepHistory: StepRecord[];
  cumulativeFieldsTotal: number;
  cumulativeFieldsFilled: number;
  activeFillId?: string | null;
  activeApplicationId?: string | null;
  isFinalStep: boolean;
  lastUpdated: number;
}

export const STEP_CATEGORY_LABELS: Record<StepCategory, string> = {
  CONTACT_INFO: "Contact Information",
  EXPERIENCE: "Work Experience",
  EDUCATION: "Education & Academics",
  EEO_COMPLIANCE: "Voluntary Self-ID / EEO",
  SCREENING: "Screening & Questions",
  REVIEW_SUBMIT: "Review & Submit",
  GENERIC_STEP: "Application Step",
};

export const NEXT_STEP_REGEX =
  /^(next|continue|save\s*&\s*continue|save\s*and\s*continue|next\s*step|proceed|review(?:\s*application)?|go\s*to\s*next\s*step|continue\s*to\s*next\s*step|step\s*\d+\s*->)$/i;

export const SUBMIT_APPLICATION_REGEX =
  /^(submit|submit\s*application|complete\s*application|apply|apply\s*now|send\s*application|finish\s*and\s*submit)$/i;

/**
 * Classifies the active ATS form step using URL keywords, DOM step indicators,
 * and current visible field types.
 */
export function classifyCurrentStep(
  url = "",
  stepIndicatorsText = "",
  fieldTypes: string[] = []
): { category: StepCategory; label: string } {
  const urlLower = (url || "").toLowerCase();
  const indicatorLower = (stepIndicatorsText || "").toLowerCase();
  const combinedSignals = `${urlLower} ${indicatorLower}`;

  // 1. Explicit Review / Submit Step Check
  if (
    combinedSignals.includes("review") ||
    combinedSignals.includes("confirm") ||
    combinedSignals.includes("summary") ||
    combinedSignals.includes("final")
  ) {
    return { category: "REVIEW_SUBMIT", label: STEP_CATEGORY_LABELS.REVIEW_SUBMIT };
  }

  // 2. Explicit Self-ID / EEO Compliance Check
  if (
    combinedSignals.includes("eeo") ||
    combinedSignals.includes("diversity") ||
    combinedSignals.includes("self-id") ||
    combinedSignals.includes("voluntary") ||
    combinedSignals.includes("demographic")
  ) {
    return { category: "EEO_COMPLIANCE", label: STEP_CATEGORY_LABELS.EEO_COMPLIANCE };
  }

  // 3. Explicit Experience Check
  if (
    combinedSignals.includes("experience") ||
    combinedSignals.includes("employment") ||
    combinedSignals.includes("work_history") ||
    combinedSignals.includes("job_history")
  ) {
    return { category: "EXPERIENCE", label: STEP_CATEGORY_LABELS.EXPERIENCE };
  }

  // 4. Explicit Education Check
  if (
    combinedSignals.includes("education") ||
    combinedSignals.includes("academic") ||
    combinedSignals.includes("school")
  ) {
    return { category: "EDUCATION", label: STEP_CATEGORY_LABELS.EDUCATION };
  }

  // 5. Explicit Contact / Personal Info Check
  if (
    combinedSignals.includes("contact") ||
    combinedSignals.includes("personal") ||
    combinedSignals.includes("candidate_info") ||
    combinedSignals.includes("profile")
  ) {
    return { category: "CONTACT_INFO", label: STEP_CATEGORY_LABELS.CONTACT_INFO };
  }

  // 6. Field-Type Distribution Heuristic (when URL & breadcrumbs lack explicit step names)
  if (fieldTypes && fieldTypes.length > 0) {
    const counts: Record<string, number> = {};
    for (const t of fieldTypes) {
      counts[t] = (counts[t] || 0) + 1;
    }

    const contactKeys = ["FIRST_NAME", "LAST_NAME", "FULL_NAME", "EMAIL", "PHONE", "ADDRESS", "CITY", "STATE", "ZIP", "RESUME", "LINKEDIN", "GITHUB"];
    const expKeys = ["COMPANY", "EMPLOYMENT_TITLE", "START_MONTH", "START_YEAR", "END_MONTH", "END_YEAR", "CURRENT_ROLE"];
    const eduKeys = ["SCHOOL", "DEGREE", "DISCIPLINE"];
    const eeoKeys = ["GENDER", "PRONOUNS", "VETERAN", "DISABILITY", "RACE_ETHNICITY", "HISPANIC_LATINO"];
    const screenKeys = ["SCREENING", "SCREENING_SELECT", "COVER_LETTER", "WORK_AUTH", "VISA", "SALARY", "NOTICE_PERIOD"];

    const scoreContact = contactKeys.reduce((acc, k) => acc + (counts[k] || 0), 0);
    const scoreExp = expKeys.reduce((acc, k) => acc + (counts[k] || 0), 0);
    const scoreEdu = eduKeys.reduce((acc, k) => acc + (counts[k] || 0), 0);
    const scoreEeo = eeoKeys.reduce((acc, k) => acc + (counts[k] || 0), 0);
    const scoreScreen = screenKeys.reduce((acc, k) => acc + (counts[k] || 0), 0);

    const max = Math.max(scoreContact, scoreExp, scoreEdu, scoreEeo, scoreScreen);
    if (max > 0) {
      if (max === scoreContact) return { category: "CONTACT_INFO", label: STEP_CATEGORY_LABELS.CONTACT_INFO };
      if (max === scoreExp) return { category: "EXPERIENCE", label: STEP_CATEGORY_LABELS.EXPERIENCE };
      if (max === scoreEdu) return { category: "EDUCATION", label: STEP_CATEGORY_LABELS.EDUCATION };
      if (max === scoreEeo) return { category: "EEO_COMPLIANCE", label: STEP_CATEGORY_LABELS.EEO_COMPLIANCE };
      if (max === scoreScreen) return { category: "SCREENING", label: STEP_CATEGORY_LABELS.SCREENING };
    }
  }

  return { category: "GENERIC_STEP", label: STEP_CATEGORY_LABELS.GENERIC_STEP };
}

export interface ButtonCandidate {
  innerText?: string;
  textContent?: string;
  value?: string;
  type?: string;
  getAttribute?: (attr: string) => string | null;
  [key: string]: any;
}

/**
 * Searches a document or container for a multi-step progression button ("Next", "Save & Continue", etc.).
 * Strictly distinguishes from final "Submit Application" buttons.
 */
export function isNextStepButton(btn: ButtonCandidate): boolean {
  if (!btn) return false;
  const txt = (btn.innerText || btn.textContent || btn.value || "").trim();
  const ariaLabel = (btn.getAttribute ? btn.getAttribute("aria-label") : "") || "";
  const automationId = (btn.getAttribute ? btn.getAttribute("data-automation-id") : "") || "";

  const combined = `${txt} ${ariaLabel} ${automationId}`.trim();

  // If matches final submit, it is NOT an intermediate next button
  if (SUBMIT_APPLICATION_REGEX.test(txt)) return false;

  if (NEXT_STEP_REGEX.test(txt)) return true;
  if (automationId.toLowerCase().includes("next") || automationId.toLowerCase().includes("continue")) return true;
  if (ariaLabel && NEXT_STEP_REGEX.test(ariaLabel)) return true;

  return false;
}

/**
 * Determines whether a button is the final submission action.
 */
export function isSubmitApplicationButton(btn: ButtonCandidate): boolean {
  if (!btn) return false;
  const txt = (btn.innerText || btn.textContent || btn.value || "").trim();
  const ariaLabel = (btn.getAttribute ? btn.getAttribute("aria-label") : "") || "";
  const automationId = (btn.getAttribute ? btn.getAttribute("data-automation-id") : "") || "";

  if (SUBMIT_APPLICATION_REGEX.test(txt)) return true;
  if (automationId.toLowerCase().includes("submit") || automationId.toLowerCase().includes("apply-button")) return true;
  if (ariaLabel && SUBMIT_APPLICATION_REGEX.test(ariaLabel)) return true;

  return false;
}

/**
 * Finds the primary Next-Step button in a document or container.
 */
export function findNextStepButton(root: { querySelectorAll?: (sel: string) => any } | null): any {
  if (!root || typeof root.querySelectorAll !== "function") return null;

  const selectors = [
    'button[data-automation-id*="next"]',
    'button[data-automation-id*="continue"]',
    'button[data-automation-id="bottom-navigation-next-button"]',
    'input[type="submit"][value*="Next" i]',
    'input[type="button"][value*="Next" i]',
    'button:not([disabled])',
    'input[type="submit"]:not([disabled])',
    'a[role="button"]:not([disabled])',
  ].join(", ");

  const elements = root.querySelectorAll(selectors);
  for (let i = 0; i < elements.length; i++) {
    const el = elements[i];
    if (isNextStepButton(el)) {
      return el;
    }
  }
  return null;
}

/**
 * Creates a clean default navigational session state.
 */
export function createDefaultNavSession(siteUrl: string, company?: string, jobTitle?: string): AstrePilotNavSession {
  return {
    sessionId: "nav_" + Math.random().toString(36).slice(2, 9),
    siteUrl: siteUrl || "",
    company: company || "",
    jobTitle: jobTitle || "",
    currentStepIndex: 0,
    stepName: STEP_CATEGORY_LABELS.CONTACT_INFO,
    stepCategory: "CONTACT_INFO",
    stepHistory: [],
    cumulativeFieldsTotal: 0,
    cumulativeFieldsFilled: 0,
    activeFillId: null,
    activeApplicationId: null,
    isFinalStep: false,
    lastUpdated: Date.now(),
  };
}

/**
 * Records completion of an individual step into the ongoing navigational session.
 */
export function recordStepCompletion(
  session: AstrePilotNavSession,
  stepCategory: StepCategory,
  stepName: string,
  fieldsTotal: number,
  fieldsFilled: number,
  hasNextStep = true
): AstrePilotNavSession {
  const currentStep = session.currentStepIndex;
  const history = [...session.stepHistory];

  const existingIdx = history.findIndex((s) => s.stepIndex === currentStep);
  const record: StepRecord = {
    stepIndex: currentStep,
    stepCategory,
    stepName,
    fieldsTotal,
    fieldsFilled,
    completedAt: Date.now(),
  };

  if (existingIdx >= 0) {
    history[existingIdx] = record;
  } else {
    history.push(record);
  }

  // Compute cumulative counters safely
  const cumTotal = history.reduce((sum, h) => sum + h.fieldsTotal, 0);
  const cumFilled = history.reduce((sum, h) => sum + h.fieldsFilled, 0);

  return {
    ...session,
    currentStepIndex: hasNextStep ? currentStep + 1 : currentStep,
    stepCategory,
    stepName,
    stepHistory: history,
    cumulativeFieldsTotal: cumTotal,
    cumulativeFieldsFilled: cumFilled,
    isFinalStep: !hasNextStep,
    lastUpdated: Date.now(),
  };
}

/**
 * Serializes the session state for sessionStorage.
 */
export function serializeNavSession(session: AstrePilotNavSession): string {
  return JSON.stringify(session);
}

/**
 * Hydrates the session state from sessionStorage string.
 */
export function deserializeNavSession(raw: string | null): AstrePilotNavSession | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.currentStepIndex === "number" && Array.isArray(parsed.stepHistory)) {
      return parsed as AstrePilotNavSession;
    }
    return null;
  } catch (e) {
    return null;
  }
}
