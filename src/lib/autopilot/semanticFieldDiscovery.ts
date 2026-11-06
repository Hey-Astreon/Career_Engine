/**
 * semanticFieldDiscovery.ts
 * -------------------------
 * AstrePilot V3: Universal Semantic Field Discovery (SFD) Engine.
 * 
 * Replaces brittle per-ATS hardcoded selector tables with a universal, 5-signal
 * semantic intent scoring engine that classifies any form field across any web portal
 * (Greenhouse, Lever, Workday, Ashby, iCIMS, Rippling, BambooHR, and arbitrary custom sites).
 */

import { createHash } from "crypto";

export type CanonicalFieldType =
  // Identity
  | "FIRST_NAME"
  | "LAST_NAME"
  | "FULL_NAME"
  | "PREFERRED_NAME"
  | "PRONOUNS"
  // Contact
  | "EMAIL"
  | "PHONE"
  | "PHONE_TYPE"
  | "PHONE_COUNTRY_CODE"
  | "WEBSITE"
  | "LINKEDIN"
  | "GITHUB"
  | "PORTFOLIO"
  // Location
  | "CITY"
  | "STATE"
  | "COUNTRY"
  | "ZIP_CODE"
  | "ADDRESS"
  | "LOCATION_AUTOCOMPLETE"
  // Legal & Auth
  | "WORK_AUTH"
  | "VISA"
  | "NOTICE_PERIOD"
  | "SALARY"
  | "SALARY_EXPECTED"
  | "PASSWORD"
  | "CONFIRM_PASSWORD"
  | "LOGIN_ID"
  // Education
  | "SCHOOL"
  | "DEGREE"
  | "DISCIPLINE"
  | "GRADUATION_YEAR"
  | "GPA"
  | "START_MONTH"
  | "START_YEAR"
  | "END_MONTH"
  | "END_YEAR"
  // Experience
  | "COMPANY"
  | "EMPLOYMENT_TITLE"
  | "START_DATE"
  | "END_DATE"
  | "CURRENT_ROLE"
  | "WORK_DESCRIPTION"
  | "EXP_COUNTRY"
  | "EXP_STATE"
  | "EXP_CITY"
  // Screening
  | "SCREENING"
  | "SCREENING_SELECT"
  | "COVER_LETTER"
  | "WHY_US"
  | "NOTE"
  | "STARTUP_PITCH"
  // Diversity & EEO
  | "GENDER"
  | "RACE_ETHNICITY"
  | "HISPANIC_LATINO"
  | "VETERAN"
  | "DISABILITY"
  // Upload
  | "RESUME"
  | "COVER_LETTER_FILE"
  // Logistics & Preferences
  | "HEAR_ABOUT"
  | "HEAR_ABOUT_DETAIL"
  | "REFERRAL"
  | "START_AVAILABLE"
  | "PREFERRED_LOCATION"
  | "WORKPLACE_TYPE"
  // Consent
  | "TEXT_CONSENT"
  | "PRIVACY_CONSENT"
  | "SMS_CONSENT"
  | "AI_CONSENT"
  | "UNKNOWN";

export interface ElementSignals {
  name?: string | null;
  id?: string | null;
  placeholder?: string | null;
  autocomplete?: string | null;
  dataAutomationId?: string | null;
  ariaLabel?: string | null;
  ariaDescribedBy?: string | null;
  tagName?: string;
  type?: string | null;
  role?: string | null;
  required?: boolean;
  labelText?: string | null;
  contextText?: string | null;
  proximityText?: string | null;
  optionsText?: string[] | null;
}

export interface SemanticDiscoveryResult {
  fieldType: CanonicalFieldType;
  confidence: number; // 0.0 - 1.0
  reasoning: string;
  signalsMatched: string[];
}

interface TaxonomyPattern {
  type: CanonicalFieldType;
  attributeKeywords: string[];
  labelKeywords: string[];
  contextKeywords?: string[];
  exactAutocompletes?: string[];
  requiredTags?: string[];
  forbiddenAttributes?: string[];
  baseConfidence: number;
}

/**
 * 45-Field Universal Taxonomy Rules
 */
const TAXONOMY_PATTERNS: TaxonomyPattern[] = [
  // Upload
  {
    type: "RESUME",
    attributeKeywords: ["resume", "cv", "curriculum", "resume_file", "attach_resume"],
    labelKeywords: ["resume", "cv", "curriculum vitae", "attach resume", "upload resume"],
    exactAutocompletes: [],
    baseConfidence: 0.98,
  },
  {
    type: "COVER_LETTER_FILE",
    attributeKeywords: ["coverletter_file", "cover_letter_upload", "cover_letter_file"],
    labelKeywords: ["cover letter file", "upload cover letter", "attach cover letter"],
    baseConfidence: 0.95,
  },

  // Identity
  {
    type: "FIRST_NAME",
    attributeKeywords: ["firstname", "first_name", "first-name", "fname", "givenname", "given_name"],
    labelKeywords: ["first name", "given name", "first name*"],
    exactAutocompletes: ["given-name", "first-name"],
    forbiddenAttributes: ["company", "referral", "contact", "emergency"],
    baseConfidence: 0.96,
  },
  {
    type: "LAST_NAME",
    attributeKeywords: ["lastname", "last_name", "last-name", "lname", "surname", "familyname", "family_name"],
    labelKeywords: ["last name", "surname", "family name", "last name*"],
    exactAutocompletes: ["family-name", "last-name"],
    forbiddenAttributes: ["company", "referral", "contact", "emergency"],
    baseConfidence: 0.96,
  },
  {
    type: "FULL_NAME",
    attributeKeywords: ["fullname", "full_name", "candidate_name", "your_name", "applicant_name"],
    labelKeywords: ["full name", "your name", "candidate name", "legal name"],
    exactAutocompletes: ["name"],
    forbiddenAttributes: ["first", "last", "company", "school", "emergency"],
    baseConfidence: 0.92,
  },
  {
    type: "PREFERRED_NAME",
    attributeKeywords: ["preferred_name", "preferredname", "nickname", "chosen_name"],
    labelKeywords: ["preferred name", "nickname", "what should we call you"],
    baseConfidence: 0.94,
  },
  {
    type: "PRONOUNS",
    attributeKeywords: ["pronoun", "pronouns", "gender_pronouns"],
    labelKeywords: ["pronouns", "preferred pronouns", "your pronouns"],
    baseConfidence: 0.95,
  },

  // Contact
  {
    type: "EMAIL",
    attributeKeywords: ["email", "e-mail", "email_address", "electronic_mail"],
    labelKeywords: ["email", "e-mail", "email address", "electronic mail", "email*"],
    exactAutocompletes: ["email"],
    forbiddenAttributes: ["referral", "referrer", "emergency"],
    baseConfidence: 0.98,
  },
  {
    type: "PHONE",
    attributeKeywords: [
      "phone",
      "phonenumber",
      "phone_number",
      "mobile",
      "telephone",
      "cellular",
      "cell",
      "cell_phone",
      "cellphone",
    ],
    labelKeywords: [
      "phone",
      "phone number",
      "mobile",
      "mobile number",
      "telephone",
      "cell",
      "cellular",
      "contact number",
    ],
    exactAutocompletes: ["tel", "mobile"],
    forbiddenAttributes: ["country", "code", "type", "emergency", "referral"],
    baseConfidence: 0.95,
  },
  {
    type: "PHONE_COUNTRY_CODE",
    attributeKeywords: ["phone_country_code", "country_code", "phonecode", "dialing_code"],
    labelKeywords: ["country code", "phone code", "dialing code", "prefix"],
    baseConfidence: 0.92,
  },
  {
    type: "PHONE_TYPE",
    attributeKeywords: ["phone_type", "phonetype", "phone_device_type"],
    labelKeywords: ["phone type", "device type", "type of phone"],
    baseConfidence: 0.93,
  },
  {
    type: "LINKEDIN",
    attributeKeywords: ["linkedin", "linkedin_url", "linkedin_profile", "linkedinurl"],
    labelKeywords: ["linkedin", "linkedin profile", "linkedin url", "linkedin.com"],
    baseConfidence: 0.98,
  },
  {
    type: "GITHUB",
    attributeKeywords: ["github", "github_url", "github_profile", "githuburl"],
    labelKeywords: ["github", "github profile", "github url", "github.com"],
    baseConfidence: 0.98,
  },
  {
    type: "PORTFOLIO",
    attributeKeywords: ["portfolio", "portfolio_url", "personal_website", "website_url"],
    labelKeywords: ["portfolio", "portfolio url", "personal website", "personal site", "showcase"],
    baseConfidence: 0.94,
  },
  {
    type: "WEBSITE",
    attributeKeywords: ["website", "other_website", "other_url", "web_url", "homepage"],
    labelKeywords: ["website", "other website", "url", "link"],
    forbiddenAttributes: ["linkedin", "github", "portfolio"],
    baseConfidence: 0.90,
  },

  // Location
  {
    type: "ZIP_CODE",
    attributeKeywords: ["zip", "postal", "pincode", "pin_code", "postcode", "zip_code", "postal_code"],
    labelKeywords: ["zip", "postal code", "zip code", "pin code", "pincode", "postal"],
    exactAutocompletes: ["postal-code"],
    baseConfidence: 0.95,
  },
  {
    type: "COUNTRY",
    attributeKeywords: ["country", "country_name", "candidate_country", "country_id"],
    labelKeywords: ["country", "country / region", "country/region", "nationality"],
    exactAutocompletes: ["country", "country-name"],
    forbiddenAttributes: ["code", "phone"],
    baseConfidence: 0.94,
  },
  {
    type: "STATE",
    attributeKeywords: ["state", "province", "region", "state_province"],
    labelKeywords: ["state", "province", "state / province", "region"],
    exactAutocompletes: ["address-level1"],
    baseConfidence: 0.92,
  },
  {
    type: "CITY",
    attributeKeywords: ["city", "town", "locality", "location_city"],
    labelKeywords: ["city", "town", "city / town", "location (city)"],
    exactAutocompletes: ["address-level2"],
    baseConfidence: 0.93,
  },
  {
    type: "LOCATION_AUTOCOMPLETE",
    attributeKeywords: ["job_application_location", "candidate_location", "location_search", "geo_location"],
    labelKeywords: ["location", "current location", "where are you located", "city, state, country"],
    baseConfidence: 0.91,
  },
  {
    type: "ADDRESS",
    attributeKeywords: ["address", "street", "street_address", "address_line_1"],
    labelKeywords: ["address", "street address", "address line 1", "residential address"],
    exactAutocompletes: ["street-address", "address-line1"],
    forbiddenAttributes: ["email", "ip"],
    baseConfidence: 0.93,
  },

  // Education
  {
    type: "SCHOOL",
    attributeKeywords: ["school", "university", "college", "institution", "school--0"],
    labelKeywords: ["school", "university", "college", "institution", "school / university", "college/university"],
    baseConfidence: 0.95,
  },
  {
    type: "DEGREE",
    attributeKeywords: ["degree", "degree--0", "education_level", "highest_education", "qualification"],
    labelKeywords: ["degree", "degree level", "highest degree", "qualification"],
    baseConfidence: 0.95,
  },
  {
    type: "DISCIPLINE",
    attributeKeywords: ["discipline", "major", "field_of_study", "discipline--0", "area_of_study"],
    labelKeywords: ["discipline", "major", "field of study", "specialization", "course"],
    baseConfidence: 0.96,
  },
  {
    type: "GRADUATION_YEAR",
    attributeKeywords: ["grad_year", "graduation_year", "gradyear", "year_of_graduation"],
    labelKeywords: ["graduation year", "year of graduation", "grad year", "expected graduation"],
    baseConfidence: 0.94,
  },
  {
    type: "GPA",
    attributeKeywords: ["gpa", "grade_point_average", "marks_cgpa", "cgpa"],
    labelKeywords: ["gpa", "cgpa", "grade point average"],
    baseConfidence: 0.95,
  },
  {
    type: "START_MONTH",
    attributeKeywords: ["start_month", "start-month", "start_date_month"],
    labelKeywords: ["start date month", "start month", "from month"],
    baseConfidence: 0.93,
  },
  {
    type: "START_YEAR",
    attributeKeywords: ["start_year", "start-year", "start_date_year"],
    labelKeywords: ["start date year", "start year", "from year"],
    baseConfidence: 0.93,
  },
  {
    type: "END_MONTH",
    attributeKeywords: ["end_month", "end-month", "end_date_month"],
    labelKeywords: ["end date month", "end month", "to month"],
    baseConfidence: 0.93,
  },
  {
    type: "END_YEAR",
    attributeKeywords: ["end_year", "end-year", "end_date_year"],
    labelKeywords: ["end date year", "end year", "to year"],
    baseConfidence: 0.93,
  },

  // Experience
  {
    type: "COMPANY",
    attributeKeywords: ["company_name", "employer", "organization", "work_company", "previous_company"],
    labelKeywords: ["company", "employer", "current company", "previous company", "organization"],
    exactAutocompletes: ["organization"],
    baseConfidence: 0.92,
  },
  {
    type: "EMPLOYMENT_TITLE",
    attributeKeywords: ["job_title", "role_title", "designation", "position_title", "current_title"],
    labelKeywords: ["job title", "title", "designation", "current role", "role"],
    exactAutocompletes: ["organization-title"],
    baseConfidence: 0.92,
  },
  {
    type: "CURRENT_ROLE",
    attributeKeywords: ["is_current", "currently_work_here", "current_role", "present_job"],
    labelKeywords: ["i currently work here", "current role", "presently working"],
    baseConfidence: 0.94,
  },
  {
    type: "WORK_DESCRIPTION",
    attributeKeywords: ["work_description", "job_description", "responsibilities", "duties"],
    labelKeywords: ["description", "responsibilities", "summary of work", "role description"],
    baseConfidence: 0.91,
  },

  // Legal & Work Auth
  {
    type: "WORK_AUTH",
    attributeKeywords: ["work_authorization", "authorized_to_work", "work_auth", "legally_authorized"],
    labelKeywords: ["authorized to work", "legally authorized", "work authorization", "right to work"],
    baseConfidence: 0.96,
  },
  {
    type: "VISA",
    attributeKeywords: ["visa_sponsorship", "require_sponsorship", "visa", "sponsorship_required"],
    labelKeywords: ["require sponsorship", "sponsorship", "visa sponsorship", "will you require sponsorship"],
    baseConfidence: 0.96,
  },
  {
    type: "SALARY",
    attributeKeywords: ["salary", "compensation", "expected_salary", "desired_salary", "hourly_rate"],
    labelKeywords: ["salary", "desired salary", "expected salary", "compensation", "salary expectation"],
    baseConfidence: 0.94,
  },
  {
    type: "NOTICE_PERIOD",
    attributeKeywords: ["notice_period", "availability_days", "notice", "start_availability"],
    labelKeywords: ["notice period", "how soon can you start", "availability to start", "days notice"],
    baseConfidence: 0.94,
  },

  // Auth / Portal Credentials
  {
    type: "LOGIN_ID",
    attributeKeywords: ["login", "username", "login_id", "user_name"],
    labelKeywords: ["login", "username", "login id", "user id"],
    exactAutocompletes: ["username"],
    baseConfidence: 0.94,
  },
  {
    type: "PASSWORD",
    attributeKeywords: ["password", "user_password", "passwd"],
    labelKeywords: ["password", "create password", "enter password"],
    exactAutocompletes: ["new-password", "current-password"],
    forbiddenAttributes: ["confirm", "verify", "reenter", "re-enter"],
    baseConfidence: 0.97,
  },
  {
    type: "CONFIRM_PASSWORD",
    attributeKeywords: ["confirm_password", "password_confirm", "reenter_password", "verify_password"],
    labelKeywords: ["confirm password", "re-enter password", "verify password", "retype password"],
    baseConfidence: 0.97,
  },

  // Diversity & EEO
  {
    type: "GENDER",
    attributeKeywords: ["gender", "gender_identity", "sex"],
    labelKeywords: ["gender", "gender identity", "what is your gender"],
    baseConfidence: 0.96,
  },
  {
    type: "RACE_ETHNICITY",
    attributeKeywords: ["race", "ethnicity", "race_ethnicity", "ethnic_background"],
    labelKeywords: ["race", "ethnicity", "race/ethnicity", "ethnic origin"],
    baseConfidence: 0.95,
  },
  {
    type: "HISPANIC_LATINO",
    attributeKeywords: ["hispanic", "latino", "hispanic_latino"],
    labelKeywords: ["hispanic", "latino", "hispanic or latino", "are you hispanic/latino"],
    baseConfidence: 0.96,
  },
  {
    type: "VETERAN",
    attributeKeywords: ["veteran", "veteran_status", "military_status"],
    labelKeywords: ["veteran", "veteran status", "military service", "protected veteran"],
    baseConfidence: 0.96,
  },
  {
    type: "DISABILITY",
    attributeKeywords: ["disability", "disability_status", "handicap"],
    labelKeywords: ["disability", "disability status", "do you have a disability"],
    baseConfidence: 0.96,
  },

  // Logistics & Preferences
  {
    type: "HEAR_ABOUT",
    attributeKeywords: ["hear_about", "how_did_you_hear", "referral_source", "source"],
    labelKeywords: ["how did you hear about us", "how did you hear", "source", "referral source"],
    baseConfidence: 0.95,
  },
  {
    type: "REFERRAL",
    attributeKeywords: ["referred_by", "referrer", "employee_referral"],
    labelKeywords: ["referred by", "employee referral", "who referred you"],
    baseConfidence: 0.94,
  },
  {
    type: "PREFERRED_LOCATION",
    attributeKeywords: ["preferred_location", "desired_location", "work_location"],
    labelKeywords: ["preferred location", "desired location", "preferred office", "location preference"],
    baseConfidence: 0.92,
  },
  {
    type: "WORKPLACE_TYPE",
    attributeKeywords: ["workplace_type", "work_mode", "remote_preference"],
    labelKeywords: ["workplace type", "remote / hybrid / onsite", "work preference", "work model"],
    baseConfidence: 0.93,
  },

  // Consent
  {
    type: "TEXT_CONSENT",
    attributeKeywords: ["sms_consent", "text_consent", "sms", "text_message"],
    labelKeywords: ["text message", "sms consent", "consent to receive text messages", "sms updates"],
    baseConfidence: 0.96,
  },
  {
    type: "PRIVACY_CONSENT",
    attributeKeywords: ["privacy_policy", "privacy_consent", "agree_terms", "terms_consent"],
    labelKeywords: ["privacy policy", "i agree to the privacy policy", "terms and conditions", "data processing consent"],
    baseConfidence: 0.96,
  },

  // Open-ended / Custom Screening
  {
    type: "COVER_LETTER",
    attributeKeywords: ["cover_letter", "coverletter", "letter_to_hiring_manager", "message_to_recruiter"],
    labelKeywords: ["cover letter", "message to hiring manager", "why should we hire you", "additional information"],
    baseConfidence: 0.93,
  },
  {
    type: "WHY_US",
    attributeKeywords: ["why_company", "why_us", "why_interested", "whyus"],
    labelKeywords: [
      "why do you want to work",
      "why do you want to work here",
      "why are you interested in this role",
      "why us",
      "why our company",
      "why our organization",
      "interest in company",
    ],
    baseConfidence: 0.94,
  },
];

/**
 * Universal Form Fingerprint generator.
 * Produces an immutable, privacy-safe SHA-256 fingerprint representing
 * the structural layout of a form regardless of domain or URL variations.
 */
export function generateFormFingerprint(elements: ElementSignals[]): string {
  const structuralTokens = elements.map((el) => {
    const tag = (el.tagName || "INPUT").toUpperCase();
    const type = (el.type || "").toLowerCase();
    const name = (el.name || "").toLowerCase().replace(/[0-9]+/g, "#");
    const id = (el.id || "").toLowerCase().replace(/[0-9]+/g, "#");
    const label = (el.labelText || "").toLowerCase().trim().slice(0, 40);
    return `${tag}|${type}|${name}|${id}|${label}`;
  });

  const raw = structuralTokens.join("||");
  return createHash("sha256").update(raw).digest("hex").slice(0, 32);
}

/**
 * Normalizes text for keyword matching.
 */
function clean(str: string | null | undefined): string {
  if (!str) return "";
  return str
    .toLowerCase()
    .replace(/[*:\(\)\[\]?#]+/g, " ")
    .replace(/[\s\-_]+/g, " ")
    .trim();
}

/**
 * Normalizes text removing all non-alphanumeric characters.
 */
function compact(str: string | null | undefined): string {
  if (!str) return "";
  return str.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Core 5-Signal Semantic Intent Engine.
 * Evaluates attributes, labels, structural context, role, and proximity.
 */
export function computeSemanticScore(signals: ElementSignals): SemanticDiscoveryResult {
  const rawAttr = `${signals.name || ""} ${signals.id || ""} ${signals.placeholder || ""} ${signals.autocomplete || ""} ${signals.dataAutomationId || ""} ${signals.ariaLabel || ""}`.toLowerCase();
  const cleanAttr = clean(rawAttr);
  const compactAttr = compact(rawAttr);

  const rawLabel = (signals.labelText || "").toLowerCase();
  const cleanLabel = clean(rawLabel);
  const compactLabel = compact(rawLabel);

  const contextSignal = clean(signals.contextText);
  const autoSignal = (signals.autocomplete || "").toLowerCase().trim();
  const roleSignal = clean(signals.role || signals.type);
  const tagName = (signals.tagName || "INPUT").toUpperCase();
  const isSelect = tagName === "SELECT" || roleSignal === "combobox" || (signals.optionsText && signals.optionsText.length > 0);
  const isTextarea = tagName === "TEXTAREA";
  const isFile = signals.type === "file";

  // Section awareness: detect if element is nested inside an Employment / Experience block
  const isEmploymentSection =
    contextSignal.includes("employment") ||
    contextSignal.includes("experience") ||
    contextSignal.includes("job history") ||
    cleanAttr.includes("employment") ||
    cleanAttr.includes("job history");

  // File Upload Fast Path
  if (isFile) {
    if (cleanAttr.includes("cover") || cleanLabel.includes("cover")) {
      return {
        fieldType: "COVER_LETTER_FILE",
        confidence: 0.98,
        reasoning: "File input matching cover letter tokens",
        signalsMatched: ["role:file", "label:cover"],
      };
    }
    return {
      fieldType: "RESUME",
      confidence: 0.99,
      reasoning: "File input recognized as resume/CV upload",
      signalsMatched: ["role:file", "intent:resume"],
    };
  }

  // Iterate over canonical patterns to find highest confidence match
  let bestMatch: SemanticDiscoveryResult = {
    fieldType: "UNKNOWN",
    confidence: 0.0,
    reasoning: "No semantic signal reached minimum threshold",
    signalsMatched: [],
  };

  for (const pattern of TAXONOMY_PATTERNS) {
    let score = 0.0;
    const matchedTokens: string[] = [];

    // Check forbidden attributes
    if (
      pattern.forbiddenAttributes &&
      pattern.forbiddenAttributes.some(
        (f) => cleanAttr.includes(f) || compactAttr.includes(f) || cleanLabel.includes(f)
      )
    ) {
      continue;
    }

    // 1. Exact Autocomplete Match (Highest weight: ~0.60)
    if (pattern.exactAutocompletes && pattern.exactAutocompletes.length > 0) {
      if (pattern.exactAutocompletes.some((ac) => autoSignal === ac || autoSignal.includes(ac))) {
        score += 0.60;
        matchedTokens.push(`autocomplete:${autoSignal}`);
      }
    }

    // 2. Label Text Match (Dominant signal in web forms: weight: ~0.55)
    if (cleanLabel) {
      for (const kw of pattern.labelKeywords) {
        const cleanKw = clean(kw);
        const compactKw = compact(kw);
        if (
          rawLabel.includes(kw) ||
          cleanLabel.includes(cleanKw) ||
          compactLabel.includes(compactKw)
        ) {
          score += 0.55;
          matchedTokens.push(`label:${kw}`);
          break;
        }
      }
    }

    // 3. Attribute Keywords Match (Weight: ~0.45)
    for (const kw of pattern.attributeKeywords) {
      const cleanKw = clean(kw);
      const compactKw = compact(kw);
      if (
        rawAttr.includes(kw) ||
        cleanAttr.includes(cleanKw) ||
        compactAttr.includes(compactKw)
      ) {
        score += 0.45;
        matchedTokens.push(`attribute:${kw}`);
        break;
      }
    }

    // 4. Structural Context Boost (Weight: ~0.20)
    if (contextSignal && pattern.contextKeywords) {
      for (const kw of pattern.contextKeywords) {
        if (contextSignal.includes(clean(kw))) {
          score += 0.20;
          matchedTokens.push(`context:${kw}`);
          break;
        }
      }
    }

    // 5. Employment section disambiguation (Country, State, City in Employment block)
    let assignedType = pattern.type;
    if (isEmploymentSection) {
      if (assignedType === "COUNTRY") assignedType = "EXP_COUNTRY";
      else if (assignedType === "STATE") assignedType = "EXP_STATE";
      else if (assignedType === "CITY") assignedType = "EXP_CITY";
    }

    // Normalize confidence
    const finalConfidence = Math.min(1.0, score * pattern.baseConfidence);

    if (finalConfidence > bestMatch.confidence && finalConfidence >= 0.40) {
      bestMatch = {
        fieldType: assignedType,
        confidence: Number(finalConfidence.toFixed(2)),
        reasoning: `Matched via ${matchedTokens.join(", ")}`,
        signalsMatched: matchedTokens,
      };
    }
  }

  // Fallback Heuristics for Unclassified Questions / Comboboxes / Textareas
  if (bestMatch.confidence < 0.70) {
    if (isSelect) {
      if (
        cleanLabel.includes("?") ||
        cleanLabel.includes("*") ||
        cleanLabel.includes("select") ||
        cleanAttr.includes("question") ||
        cleanAttr.includes("custom")
      ) {
        return {
          fieldType: "SCREENING_SELECT",
          confidence: 0.85,
          reasoning: "Custom dropdown/combobox identified as screening question",
          signalsMatched: ["role:select", "signal:question"],
        };
      }
    } else if (isTextarea) {
      if (
        cleanLabel.includes("why") ||
        cleanLabel.includes("describe") ||
        cleanLabel.includes("explain") ||
        cleanLabel.includes("tell us") ||
        cleanLabel.includes("?")
      ) {
        return {
          fieldType: "SCREENING",
          confidence: 0.88,
          reasoning: "Open-ended textarea identified as behavioral/technical screening prompt",
          signalsMatched: ["role:textarea", "prompt:question"],
        };
      }
      return {
        fieldType: "NOTE",
        confidence: 0.75,
        reasoning: "Multi-line text input identified as candidate note/pitch",
        signalsMatched: ["role:textarea"],
      };
    } else if (cleanAttr.includes("question") || cleanLabel.includes("?")) {
      return {
        fieldType: "SCREENING",
        confidence: 0.82,
        reasoning: "Single-line input identified as custom screening field",
        signalsMatched: ["signal:question"],
      };
    }
  }

  return bestMatch;
}

/**
 * Scans an entire list of structural element descriptors, returning
 * field classifications with confidence tiers.
 */
export function discoverFormFields(elements: ElementSignals[]): {
  fields: Array<ElementSignals & SemanticDiscoveryResult>;
  fingerprint: string;
  highConfidenceCount: number;
  ambiguousCount: number;
} {
  const fingerprint = generateFormFingerprint(elements);
  let highConfidenceCount = 0;
  let ambiguousCount = 0;

  const fields = elements.map((el) => {
    const res = computeSemanticScore(el);
    if (res.confidence >= 0.85) {
      highConfidenceCount++;
    } else {
      ambiguousCount++;
    }
    return {
      ...el,
      ...res,
    };
  });

  return {
    fields,
    fingerprint,
    highConfidenceCount,
    ambiguousCount,
  };
}
