/**
 * comboboxEngine.ts
 * -----------------
 * The Universal Combobox & Dropdown Engine (UCDE) for AstrePilot & AstreWork.
 * Provides framework detection, 6-stage semantic option resolution,
 * candidate compliance invariants, and synonym dictionaries.
 */

export type ComboboxType =
  | "NATIVE"
  | "REACT_SELECT"
  | "RADIX"
  | "HEADLESS_UI"
  | "WORKDAY"
  | "WAI_ARIA";

export interface SemanticOption {
  text: string;
  value?: string;
  disabled?: boolean;
}

export interface ComboboxAttributes {
  tagName?: string;
  role?: string | null;
  ariaHasPopup?: string | null;
  className?: string | null;
  id?: string | null;
  dataAutomationId?: string | null;
  hasState?: boolean;
  hasRadixPortal?: boolean;
}

/**
 * Detects which framework or standard powers a given combobox/dropdown element.
 */
export function detectComboboxTypeFromAttributes(attrs: ComboboxAttributes): ComboboxType {
  const tag = (attrs.tagName || "").toUpperCase();
  const role = (attrs.role || "").toLowerCase();
  const cls = (attrs.className || "").toLowerCase();
  const id = (attrs.id || "").toLowerCase();
  const autoId = (attrs.dataAutomationId || "").toLowerCase();
  const ariaHasPopup = (attrs.ariaHasPopup || "").toLowerCase();

  if (tag === "SELECT") return "NATIVE";

  if (
    autoId.includes("select-box") ||
    autoId.includes("promptoption") ||
    autoId.includes("searchbox") ||
    cls.includes("workday") ||
    id.includes("wd-")
  ) {
    return "WORKDAY";
  }

  if (
    cls.includes("select__control") ||
    cls.includes("select__input") ||
    cls.includes("select-shell") ||
    cls.includes("react-select") ||
    id.includes("react-select")
  ) {
    return "REACT_SELECT";
  }

  if (
    attrs.hasRadixPortal ||
    attrs.hasState ||
    cls.includes("radix") ||
    id.includes("radix") ||
    (role === "combobox" && (cls.includes("popper") || (attrs.ariaHasPopup === "listbox" && tag === "BUTTON")))
  ) {
    return "RADIX";
  }

  if (cls.includes("headlessui") || id.includes("headlessui") || id.includes("headlessui-combobox")) {
    return "HEADLESS_UI";
  }

  if (role === "combobox" || ariaHasPopup === "listbox") {
    return "WAI_ARIA";
  }

  return "WAI_ARIA";
}

/**
 * Rich synonym & phrase mappings across common job application ATS questions.
 */
export const SYNONYM_DICTIONARY: Record<string, string[]> = {
  male: ["man", "m", "he/him", "he/him/his"],
  female: ["woman", "f", "she/her", "she/her/hers"],
  "he/him": ["he / him", "he/him/his", "male", "man"],
  "she/her": ["she / her", "she/her/hers", "female", "woman"],
  mobile: ["cell", "cellular", "personal", "primary", "mobile phone", "direct"],
  india: ["in", "ind", "republic of india"],
  "united states": ["usa", "us", "u.s.", "united states of america"],
  linkedin: [
    "job board",
    "online job board",
    "social network",
    "social media",
    "internet",
    "company website",
    "other",
  ],
  yes: [
    "confirmed",
    "confirm",
    "agree",
    "i agree",
    "i confirm",
    "true",
    "1",
    "yes, i am",
    "yes, i do",
    "yes, i have",
    "authorized",
    "authorized to work",
    "legally authorized",
    "us citizen or permanent resident",
    "authorized without restriction",
  ],
  no: [
    "false",
    "0",
    "i disagree",
    "no, i am not",
    "no, i do not",
    "no, i have not",
    "no, i don't",
    "not required",
    "no sponsorship required",
    "will not require",
    "decline",
  ],
  immediate: [
    "immediately",
    "now",
    "0 weeks",
    "1 week",
    "2 weeks",
    "available immediately",
    "immediate",
    "< 2 weeks",
    "less than 2 weeks",
  ],
  "bachelor of computer applications (bca)": [
    "bachelor of computer applications",
    "bachelor",
    "bachelors",
    "bachelor's",
    "bachelor's degree",
    "undergraduate",
    "bca",
    "computer applications",
    "b.c.a",
    "b.c.a.",
  ],
  "i am not a protected veteran": [
    "not a protected veteran",
    "not a veteran",
    "i am not a veteran",
    "no",
    "i identify as one or more of the classifications of protected veteran: no",
  ],
  "no, i don't have a disability": [
    "no, i do not have a disability",
    "no, i don't have",
    "i do not have a disability",
    "no disability",
    "no",
    "i do not have a physical or mental impairment",
  ],
  asian: [
    "asian (not hispanic or latino)",
    "asian / pacific islander",
    "south asian",
    "asian - non hispanic",
    "asian (all)",
  ],
  "amity university": [
    "amity university noida",
    "amity university, noida",
    "amity university uttar pradesh",
    "amity",
  ],
  "computer science / applications": [
    "computer science",
    "computer applications",
    "information technology",
    "software engineering",
    "computing",
  ],
};

const PLACEHOLDER_REGEX = /^(select|choose|placeholder|optional|none|--|—|select an option|please select)/i;
const OTHER_FALLBACK_REGEX = /^(0\s*-\s*other|other\b|not listed\b|unlisted\b|not applicable\b|other institution\b|other school\b)/i;

/**
 * The 6-Stage Semantic Option Matcher
 * Resolves the optimal option element or data object from candidate profile values.
 */
export function resolveSemanticOptionMatch<T extends SemanticOption>(
  options: T[],
  targetVal: string | null | undefined,
  fieldType: string = ""
): T | null {
  if (!options || options.length === 0 || !targetVal) return null;

  const targetLower = String(targetVal).trim().toLowerCase();
  if (!targetLower) return null;

  // Filter out completely disabled options if possible
  const validOptions = options.filter((o) => !o.disabled);
  const pool = validOptions.length > 0 ? validOptions : options;

  // -------------------------------------------------------------
  // STAGE 1: Exact Text / Value Match
  // -------------------------------------------------------------
  for (const opt of pool) {
    const text = (opt.text || "").trim().toLowerCase();
    const val = (opt.value || "").trim().toLowerCase();
    if (text === targetLower || val === targetLower) {
      return opt;
    }
  }

  // -------------------------------------------------------------
  // STAGE 2: Candidate Invariants & Compliance Rules
  // -------------------------------------------------------------
  // Invariant A: Indian Candidate -> Asian (NEVER American Indian or Alaska Native)
  if (
    targetLower === "asian" ||
    targetLower === "indian" ||
    targetLower === "india" ||
    fieldType === "RACE_ETHNICITY"
  ) {
    const asianMatch = pool.find((o) => {
      const t = (o.text || "").trim().toLowerCase();
      return (t === "asian" || t.startsWith("asian")) && !t.includes("american indian") && !t.includes("alaska native");
    });
    if (asianMatch) return asianMatch;
  }

  // Invariant B: BCA / Education Candidate Rules
  if (
    fieldType === "DEGREE" ||
    fieldType === "EDUCATION" ||
    targetLower.includes("bca") ||
    targetLower.includes("computer applications")
  ) {
    const bcaSyns = SYNONYM_DICTIONARY["bachelor of computer applications (bca)"] || [];
    for (const syn of bcaSyns) {
      const match = pool.find((o) => {
        const t = (o.text || "").trim().toLowerCase();
        return t === syn || t.includes(syn);
      });
      if (match) return match;
    }
  }

  // Invariant C: Protected Veteran Compliance
  if (fieldType === "VETERAN" || targetLower.includes("veteran")) {
    const vetMatch = pool.find((o) => {
      const t = (o.text || "").trim().toLowerCase();
      return (
        t.includes("not a protected veteran") ||
        t.includes("not a veteran") ||
        t.includes("i am not a protected") ||
        (t === "no" && !t.includes("yes"))
      );
    });
    if (vetMatch) return vetMatch;
  }

  // Invariant D: Disability Compliance
  if (fieldType === "DISABILITY" || targetLower.includes("disability")) {
    const disMatch = pool.find((o) => {
      const t = (o.text || "").trim().toLowerCase();
      return (
        t.includes("no, i don't have") ||
        t.includes("no, i do not have") ||
        t.includes("no disability") ||
        (t === "no" && !t.includes("yes"))
      );
    });
    if (disMatch) return disMatch;
  }

  // -------------------------------------------------------------
  // STAGE 3: Rich Semantic Synonyms Dictionary
  // -------------------------------------------------------------
  const synList = SYNONYM_DICTIONARY[targetLower] || [];
  for (const syn of synList) {
    for (const opt of pool) {
      const t = (opt.text || "").trim().toLowerCase();
      const v = (opt.value || "").trim().toLowerCase();
      if (t === syn || v === syn || t.includes(syn) || v.includes(syn)) {
        if (targetLower === "asian" && t.includes("american indian")) continue;
        return opt;
      }
    }
  }

  // -------------------------------------------------------------
  // STAGE 4: Fuzzy Substring & Word Boundary Match
  // -------------------------------------------------------------
  for (const opt of pool) {
    const t = (opt.text || "").trim().toLowerCase();
    const v = (opt.value || "").trim().toLowerCase();
    if (PLACEHOLDER_REGEX.test(t)) continue;

    if (t.includes(targetLower) || targetLower.includes(t) || v.includes(targetLower)) {
      if (targetLower === "asian" && t.includes("american indian")) continue;
      return opt;
    }
  }

  // -------------------------------------------------------------
  // STAGE 5: "Other / Not Listed" Fallbacks for School, Degree, etc.
  // -------------------------------------------------------------
  if (
    fieldType === "SCHOOL" ||
    fieldType === "DEGREE" ||
    fieldType === "DISCIPLINE" ||
    fieldType === "HEAR_ABOUT" ||
    targetLower.includes("university") ||
    targetLower.includes("college")
  ) {
    const otherOpt = pool.find((o) => {
      const t = (o.text || "").trim().toLowerCase();
      return OTHER_FALLBACK_REGEX.test(t);
    });
    if (otherOpt) return otherOpt;
  }

  // -------------------------------------------------------------
  // STAGE 6: First Non-Placeholder Fallback for Mandatory Fields
  // -------------------------------------------------------------
  const firstValid = pool.find((o) => {
    const t = (o.text || "").trim().toLowerCase();
    const v = (o.value || "").trim().toLowerCase();
    return t && !PLACEHOLDER_REGEX.test(t) && v !== "" && v !== "0";
  });

  return firstValid || pool[0] || null;
}
