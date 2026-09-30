/**
 * AstreShield Detection Dictionary
 * ─────────────────────────────────
 * All pattern data for the scam detection engine.
 * Separated from logic so this file can grow independently as we
 * encounter new scam variants — "training the AstreWork brain on big data."
 *
 * DESIGN PHILOSOPHY:
 *   • Tech-term-only typo checking → avoids penalizing non-native English
 *   • Semantic patterns are INTENT-based → not just keyword matching
 *   • Trusted sources get trust BONUSES → compensate for minor signals
 */

// ─── Layer 1: Lexical Integrity ──────────────────────────────────────────────

/**
 * Tech-specific typo variants commonly found in scam JDs.
 * Key = correct term (lowercase). Values = known misspellings.
 * We ONLY check technical terms — general English typos are ignored.
 */
export const TECH_TYPO_MAP: Record<string, string[]> = {
  computer:      ["copmuter", "compter", "computor", "compuiter", "computter", "computre"],
  software:      ["sofware", "softwear", "sottware", "softwere", "sofware", "sotfware"],
  developer:     ["develper", "devloper", "developor", "develope", "devloper", "develoer"],
  engineer:      ["engneer", "enginear", "enginner", "engineeer", "enginer", "ingineer"],
  javascript:    ["javscript", "javasript", "javascrpt", "javascipt", "javascrip", "javasript"],
  typescript:    ["typscript", "typesript", "typescirpt", "typecsript"],
  python:        ["pyhton", "pythn", "pthon", "pyton", "phyton"],
  database:      ["databse", "datbase", "databass", "dtabase", "daabase"],
  application:   ["aplication", "applicaton", "applcation", "appilcation", "applicaion"],
  experience:    ["experiance", "expereince", "experence", "exprience", "experiece"],
  requirements:  ["requirments", "requiremnts", "requirments", "rquirements", "requiremens"],
  opportunity:   ["opportinity", "oportunity", "oppurtunity", "opprotunity", "opportunty"],
  management:    ["managment", "managemnt", "manegement", "mangement"],
  programming:   ["porgramming", "programing", "programmin", "progrmming"],
  development:   ["deveopment", "develpoment", "developement", "develpment"],
  technology:    ["technolgy", "technoloy", "techonolgy", "tecnology"],
  communication: ["comunication", "communicaion", "commmunication", "communcation"],
  professional:  ["profesional", "proffessional", "professioanl", "proffesional"],
  certificate:   ["certifcate", "sertificate", "certifacte", "certficate"],
  organization:  ["organziation", "organiztion", "oragnization", "orgainzation"],
};

/**
 * Unicode homoglyph characters used to impersonate real companies.
 * Scammers use Cyrillic or similar Unicode chars that look identical
 * to Latin letters. e.g., "Gооgle" uses Cyrillic "о" not Latin "o".
 */
export const HOMOGLYPH_SUSPICIOUS_RANGES = [
  // Cyrillic block (common Latin lookalikes: а е о р с х у)
  /[\u0430\u0435\u043E\u0440\u0441\u0445\u0443]/g,
  // Fullwidth Latin (Ａ-Ｚ, ａ-ｚ)
  /[\uFF21-\uFF3A\uFF41-\uFF5A]/g,
  // Greek lookalikes (Α Β Ε Ζ Η Ι Κ Μ Ν Ο Ρ Τ Υ Χ)
  /[\u0391\u0392\u0395\u0396\u0397\u0399\u039A\u039C\u039D\u039F\u03A1\u03A4\u03A5\u03A7]/g,
];

// ─── Layer 2: Semantic Red Flags ─────────────────────────────────────────────

/**
 * PII Harvesting — asking for personal identity or financial data
 * before an interview or offer has been made.
 * Match in DESCRIPTION body, not in ATS application forms.
 */
export const PII_HARVESTING_PATTERNS: RegExp[] = [
  /\b(social\s+security\s+number|ssn)\b/i,
  /\b(bank\s+account\s+(number|details|info(rmation)?))\b/i,
  /\b(routing\s+number)\b/i,
  /\b(government[\s-]issued\s+(id|photo\s+id|identification))\b/i,
  /\b(passport\s+(number|copy|scan|photo))\b/i,
  /\b(date\s+of\s+birth|dob)\b/i,
  /\b(national\s+id|national\s+identification)\b/i,
  /\bsend\s+(your|us|me).{0,40}(id|identification|passport|birth\s+certificate)\b/i,
  /\b(provide|submit|upload|send).{0,40}(bank|financial|payment)\s+(details|info|information)\b/i,
  /\b(copy|scan|photo)\s+of\s+(your\s+)?(id|passport|license|birth)\b/i,
];

/**
 * Advance Fee Fraud — any upfront payment required by the candidate
 * BEFORE a formal offer has been signed.
 */
export const ADVANCE_FEE_PATTERNS: RegExp[] = [
  /\b(pay|payment|fee|deposit|charge).{0,60}(training|onboarding|background\s+check|equipment|starter\s+kit|materials)\b/i,
  /\b(background\s+check\s+fee|screening\s+fee)\b/i,
  /\b(refundable)\s+(deposit|fee|payment)\b/i,
  /\b(purchase|buy|acquire).{0,40}(equipment|laptop|tools|materials|kit)\b/i,
  /\$\d+.{0,30}(refundable|deposit|fee|upfront|required)\b/i,
  /\b(invest\s+(in|your)|investment\s+required)\b/i,
  /\b(starter\s+kit|startup\s+kit|welcome\s+kit).{0,50}(pay|purchase|fee|cost)\b/i,
];

/**
 * Unrealistic Compensation — income claims that defy market reality.
 * These are carefully tuned to avoid flagging legitimate high-comp
 * senior roles (which are already filtered out by eligibility checks).
 */
export const UNREALISTIC_COMP_PATTERNS: RegExp[] = [
  // Weekly earnings above $3K (legit junior devs don't earn this weekly)
  /\$\s*[3-9],?\d{3}\s*(?:\/|\s+per\s+)week/i,
  /\$\s*\d{1,2},?\d{3}\s*(?:\/|\s+per\s+)week/i,
  // Monthly earnings phrased in scam style ("earn X per month from home")
  /earn.{0,30}\$\s*[5-9],?\d{3}.{0,20}(month|monthly)/i,
  /earn.{0,30}\$\s*\d{2},?\d{3}.{0,20}(month|monthly)/i,
  // Suspiciously vague but large income claims
  /\b(make|earn|income|salary)\s+(of\s+)?\$\d+k?\+?\s*(?:\/|\s*per\s*)?\s*(week|month|hour)\b/i,
  // Classic MLM pattern: "up to X" or "as much as"
  /\b(up\s+to|as\s+much\s+as)\s+\$[5-9],?\d{3}/i,
  /\b(unlimited\s+earning|unlimited\s+income|unlimited\s+commission)\b/i,
  // Commission-only disguised as salary
  /\b(100%\s+commission|commission[\s-]only)\b/i,
];

/**
 * High-Pressure Language — urgency combined with vagueness.
 * One "URGENT" alone is NOT a red flag (real recruiters say urgent too).
 * These patterns capture the COMBINATION of urgency + lack of substance.
 */
export const HIGH_PRESSURE_PATTERNS: RegExp[] = [
  /\b(urgent|urgently)\s+(hiring|opening|position|vacancy|needed|required)\b/i,
  /\b(immediate(ly)?|instant(ly)?)\s+(start|hire|joining|earn)\b/i,
  /\bstart\s+(today|tomorrow|immediately|right\s+away)\b/i,
  /\b(limited\s+(spots|seats|positions|openings)|positions?\s+(filling|fill)\s+fast)\b/i,
  /\bapply\s+(now|today|immediately)\s*[!]{2,}/i,
  /[!]{3,}/,  // Three or more consecutive exclamation marks
  /\b(don't\s+miss|do\s+not\s+miss)\s+(this|out|your)\b/i,
];

/**
 * Personal / Informal Contact Channels — legitimate companies use
 * corporate email and ATS systems, not personal messaging apps.
 */
export const PERSONAL_CONTACT_PATTERNS: RegExp[] = [
  // WhatsApp / Telegram
  /\b(whatsapp|telegram|wechat|line\s+app)\b/i,
  // Personal email providers in a business context
  /contact\s+(us|me|hr|at).{0,60}@(gmail|yahoo|hotmail|outlook|protonmail|yandex)\.com/i,
  // Direct phone or WhatsApp numbers for applications
  /\b(call|whatsapp|text|message)\s+(us|me|hr|recruiter|team)\s+at\s+\+?\d[\d\s\-()]{7,}/i,
  // Explicit "send CV to personal email"
  /send\s+(your\s+)?(cv|resume|application).{0,40}@(gmail|yahoo|hotmail)\./i,
];

/**
 * Reshipping / Money Mule — the most dangerous scam category.
 * These jobs recruit victims into illegal financial operations.
 */
export const RESHIPPING_MULE_PATTERNS: RegExp[] = [
  /\b(reship|re-ship|reshipping|package\s+forwarding|parcel\s+forwarding)\b/i,
  /\b(receive\s+(packages?|parcels?|shipments?)\s+(at\s+home|and\s+(forward|reship|send)))\b/i,
  /\b(transfer\s+(funds|money|payments?)\s+(to|on\s+behalf))\b/i,
  /\b(forward\s+(payments?|funds|money|wire\s+transfers?))\b/i,
  /\b(money\s+(transfer|mule|laundering))\b/i,
  /\b(cryptocurrency|crypto|bitcoin|ethereum).{0,60}(send|receive|transfer|wallet|payment)\b/i,
];

/**
 * MLM / Pyramid Scheme / Crypto Trap patterns.
 * Disguised as tech jobs to target software developers.
 */
export const MLM_CRYPTO_PATTERNS: RegExp[] = [
  /\b(passive\s+income|financial\s+freedom|be\s+your\s+own\s+boss)\b/i,
  /\b(multi[\s-]?level\s+marketing|mlm|network\s+marketing|pyramid)\b/i,
  /\b(referral\s+(bonus|commission|income|earning))\b/i,
  /\b(downline|upline|recruit\s+others|build\s+(your\s+)?(team|network))\b/i,
  /\b(trading\s+(platform|bot|signals?|algo))\b/i,
  /\b(forex\s+trading|binary\s+options)\b/i,
  /\b(invest\s+with\s+us|guaranteed\s+(return|profit|income))\b/i,
];

/**
 * No Real Work Described — the JD is entirely vague with no
 * concrete responsibilities, technical requirements, or actual duties.
 * Used as a supporting signal ONLY (low weight, needs corroboration).
 */
export const VAGUE_NO_WORK_PATTERNS: RegExp[] = [
  /\b(great\s+opportunity|amazing\s+opportunity|fantastic\s+opportunity)\b/i,
  /\b(work\s+from\s+(home|anywhere).{0,20}(earn|make|income))\b/i,
  /\b(no\s+(experience|skills?|qualifications?)\s+(needed|required|necessary))\b/i,
  /\b(easy\s+(work|job|money|income))\b/i,
  /\b(anyone\s+can\s+do\s+(this|it)|suitable\s+for\s+everyone)\b/i,
];

// ─── Layer 3: Structural Credibility ─────────────────────────────────────────

/**
 * Trusted ATS platforms — jobs sourced through these platforms have
 * a very high baseline legitimacy (company paid for enterprise software).
 */
export const TRUSTED_ATS_PLATFORMS = new Set([
  "GREENHOUSE", "LEVER", "ASHBY", "WORKABLE", "SMARTRECRUITERS",
  "RECRUITEE", "BREEZY", "BAMBOOHR", "WORKDAY", "ICIMS", "TALEO",
  "SUCCESSFACTORS", "PERSONIO",
]);

/**
 * Niche remote job boards — curated communities with human moderation.
 * Less authoritative than ATS, but still meaningful.
 */
export const NICHE_TRUSTED_BOARDS = new Set([
  "HIMALAYAS", "REMOTIVE", "WEWORKREMOTELY", "JOBICY", "ARBEITNOW",
  "HN_HIRING", "YC_JOBS", "REMOTECO", "JUSTREMOTE",
]);

/**
 * Suspicious application URL patterns — legitimate jobs don't route
 * applications through public form builders or personal sites.
 */
export const SUSPICIOUS_URL_PATTERNS: RegExp[] = [
  /\bdocs\.google\.com\/forms\b/i,
  /\bforms\.gle\b/i,
  /\btypeform\.com\b/i,
  /\bsurveymonkey\.com\b/i,
  /\bjotform\.com\b/i,
  /\bairtable\.com\/shr/i,
  /\bbit\.ly\b/i,
  /\btinyurl\.com\b/i,
  /\bgoo\.gl\b/i,
];

// ─── Score Thresholds ─────────────────────────────────────────────────────────

export const TRUST_THRESHOLDS = {
  /** Minimum score for a GREEN (verified safe) verdict */
  GREEN_MIN: 75,
  /** Minimum score for AMBER (proceed with caution) verdict */
  AMBER_MIN: 40,
  /** Scores below this are RED (likely fraudulent) */
  RED_MAX: 39,
  /** Score range that triggers optional AI Layer 4 analysis */
  AI_ANALYSIS_MIN: 40,
  AI_ANALYSIS_MAX: 62,
  /** Minimum number of flags required to trigger AI Layer 4 */
  AI_ANALYSIS_MIN_FLAGS: 2,
} as const;

// ─── Signal Deductions ────────────────────────────────────────────────────────

/**
 * Point deductions per signal. These are the "weights" that define
 * how much each detection signal moves the trust needle.
 *
 * Positive values = trust BONUSES (rewarding strong legitimacy signals)
 * Negative values = trust DEDUCTIONS (penalizing scam signals)
 */
export const SIGNAL_WEIGHTS = {
  // Layer 1 — Lexical
  TYPO_DENSITY_HIGH:    -15,
  TYPO_DENSITY_LOW:      -5,
  TITLE_HAS_TYPO:       -12,
  UNICODE_HOMOGLYPHS:   -20,
  EXCESSIVE_CAPS:        -8,
  EMOJI_SPAM:           -10,

  // Layer 2 — Semantic
  PII_HARVESTING:       -25,
  ADVANCE_FEE:          -30,
  UNREALISTIC_COMP:     -20,
  HIGH_PRESSURE:        -10,
  PERSONAL_CONTACT:     -12,
  RESHIPPING_MULE:      -35,
  MLM_CRYPTO_TRAP:      -25,
  NO_REAL_WORK:         -10,
  FAKE_COMPANY_SIGNAL:   -8,
  EXCESSIVE_BENEFITS:    -8,

  // Layer 3 — Structural (bonuses are POSITIVE)
  TRUSTED_ATS_SOURCE:   +12,
  NICHE_BOARD_SOURCE:    +6,
  SUSPICIOUS_URL:       -10,
  NO_COMPANY_WEBSITE:    -8,
  JD_TOO_SHORT:         -12,
  JD_TOO_REPETITIVE:     -8,
} as const;

export type ShieldSignalId = keyof typeof SIGNAL_WEIGHTS;
