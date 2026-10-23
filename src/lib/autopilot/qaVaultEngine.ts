/**
 * AstreWork Autonomous Screening Q&A Vault Engine
 * -------------------------------------------------------------
 * Deterministic and fuzzy semantic matching engine for AstrePilot
 * screening questions with slot interpolation ({{COMPANY}}, {{ROLE}}),
 * category inference, and candidate-scoped persistence.
 */

export type QuestionCategory =
  | "MOTIVATION"
  | "TECHNICAL"
  | "BEHAVIORAL"
  | "LOGISTICS"
  | "COMPENSATION"
  | "GENERAL";

export interface VaultEntry {
  id: string;
  profileId: string;
  category: string;
  questionPattern: string;
  keywords: string[];
  answerText: string;
  isFavorite?: boolean;
  timesUsed?: number;
  lastUsedAt?: Date | string | null;
  companyContext?: string | null;
  roleContext?: string | null;
}

export interface VaultMatchResult {
  matched: boolean;
  confidence: number; // 0 to 100
  entry: VaultEntry | null;
  interpolatedAnswer: string | null;
  category: QuestionCategory;
  overlapTokens: string[];
  source: "vault" | "none";
}

// Stop words that do NOT carry semantic question intent (kept 'why', 'how', 'what' intentionally out)
const STOP_WORDS = new Set([
  "a", "about", "above", "after", "again", "against", "all", "am", "an", "and", "any", "are",
  "as", "at", "be", "because", "been", "before", "being", "below", "between", "both", "but",
  "by", "can", "cannot", "could", "did", "do", "does", "doing", "down", "during", "each",
  "few", "for", "from", "further", "had", "has", "have", "having", "he", "her", "here",
  "hers", "herself", "him", "himself", "his", "i", "if", "in", "into", "is", "it",
  "its", "itself", "me", "more", "most", "my", "myself", "no", "nor", "not", "of", "off",
  "on", "once", "only", "or", "other", "ought", "our", "ours", "ourselves", "out", "over",
  "own", "same", "she", "should", "so", "some", "such", "than", "that", "the", "their",
  "theirs", "them", "themselves", "then", "there", "these", "they", "this", "those", "through",
  "to", "too", "under", "until", "up", "very", "was", "we", "were", "with", "would", "you",
  "your", "yours", "yourself", "yourselves", "please", "tell", "describe", "explain", "give",
  "share", "provide"
]);

const SYNONYM_MAP: Record<string, string> = {
  "reactjs": "react",
  "react.js": "react",
  "nextjs": "next",
  "next.js": "next",
  "nodejs": "node",
  "node.js": "node",
  "postgresql": "postgres",
  "typescript": "typescript",
  "ts": "typescript",
  "javascript": "javascript",
  "js": "javascript",
  "python": "python",
  "py": "python",
  "golang": "go",
  "k8s": "kubernetes",
  "compensation": "salary",
  "pay": "salary",
  "ctc": "salary",
  "remuneration": "salary",
  "relocation": "relocate",
  "availability": "notice",
  "startdate": "notice",
  "interested": "interest",
  "attracted": "interest",
};

/**
 * Normalizes question text for uniform tokenization and matching
 */
export function normalizeQuestion(text: string): string {
  if (!text) return "";
  let clean = text
    .toLowerCase()
    .replace(/\{\{\s*company\s*\}\}/gi, "company")
    .replace(/\{\{\s*role\s*\}\}/gi, "role")
    .replace(/[^\w\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // Standardize common token abbreviations and synonyms
  for (const [syn, standard] of Object.entries(SYNONYM_MAP)) {
    const regex = new RegExp(`\\b${syn.replace(".", "\\.")}\\b`, "g");
    clean = clean.replace(regex, standard);
  }

  return clean;
}

/**
 * Extracts high-information keywords from question text
 */
export function extractKeywords(text: string): string[] {
  const norm = normalizeQuestion(text);
  if (!norm) return [];

  const rawTokens = norm.split(/\s+/).filter(Boolean);
  const keywords: string[] = [];

  for (const token of rawTokens) {
    if (token.length <= 1) continue;
    if (STOP_WORDS.has(token)) continue;
    if (!keywords.includes(token)) {
      keywords.push(token);
    }
  }

  return keywords;
}

/**
 * Automatically infers the screening question category
 */
export function inferQuestionCategory(question: string): QuestionCategory {
  const q = question.toLowerCase();

  // Compensation
  if (
    /salary|compensation|expected\s*(?:ctc|pay|rate)|hourly\s*rate|desired\s*salary|annual\s*compensation/i.test(q)
  ) {
    return "COMPENSATION";
  }

  // Logistics & Availability
  if (
    /notice\s*period|start\s*date|when\s*can\s*you\s*start|earliest\s*(?:start|date)|relocate|relocation|hybrid|remote|shift|timezone|hours\s*per\s*week/i.test(q)
  ) {
    return "LOGISTICS";
  }

  // Motivation & Culture
  if (
    /why\s*(?:are\s*you\s*)?interest|why\s*(?:do\s*you\s*)?(?:want|wish)|why\s*(?:us|join|apply|work)|what\s*(?:attracted|excites|motivates)\s*you|\binterest(?:ed)?\s+in\b/i.test(q)
  ) {
    return "MOTIVATION";
  }

  // Technical Competency & Architecture
  if (
    /experience\s*with|tech(?:nical)?\s*(?:stack|challenge|problem)|system\s*architecture|how\s*did\s*you\s*(?:build|scale|solve|design)|concurrency|database|api|performance\s*optimization/i.test(q)
  ) {
    return "TECHNICAL";
  }

  // Behavioral & Teamwork
  if (
    /time\s*(?:when|you)|conflict|disagreement|mistake|failure|teamwork|leadership|cross-functional|greatest\s*strength|weakness/i.test(q)
  ) {
    return "BEHAVIORAL";
  }

  return "GENERAL";
}

/**
 * Computes semantic similarity between candidate input and stored pattern
 */
export function calculateSimilarity(
  inputQuestion: string,
  patternQuestion: string,
  patternKeywords?: string[]
): { score: number; overlapTokens: string[] } {
  const inputTokens = extractKeywords(inputQuestion);
  const targetTokens =
    patternKeywords && patternKeywords.length > 0
      ? patternKeywords
      : extractKeywords(patternQuestion);

  if (inputTokens.length === 0 || targetTokens.length === 0) {
    return { score: 0, overlapTokens: [] };
  }

  const inputSet = new Set(inputTokens);
  const targetSet = new Set(targetTokens);

  const overlapTokens: string[] = [];
  for (const token of inputSet) {
    if (targetSet.has(token)) {
      overlapTokens.push(token);
    }
  }

  // Jaccard similarity coefficient
  const unionSize = new Set([...inputTokens, ...targetTokens]).size;
  const jaccard = unionSize > 0 ? overlapTokens.length / unionSize : 0;

  // Overlap ratio relative to target question length
  const targetCoverage = overlapTokens.length / targetTokens.length;

  // Composite base score (weighted coverage and jaccard)
  let score = targetCoverage * 0.65 + jaccard * 0.35;

  const normInput = normalizeQuestion(inputQuestion);
  const normPattern = normalizeQuestion(patternQuestion);

  if (normInput === normPattern) {
    return { score: 1.0, overlapTokens };
  }

  if (normInput.includes(normPattern) || normPattern.includes(normInput)) {
    score = Math.max(score, 0.88);
  }

  // Same category bonus
  const catInput = inferQuestionCategory(inputQuestion);
  const catPattern = inferQuestionCategory(patternQuestion);
  if (catInput === catPattern && catInput !== "GENERAL") {
    score += 0.15;

    // Cross-token motivation synonyms: join / work / team / company
    if (catInput === "MOTIVATION") {
      const motivationTokens = ["work", "join", "team", "company", "interest", "role", "mission"];
      const hasInputMotiv = inputTokens.some(t => motivationTokens.includes(t));
      const hasTargetMotiv = targetTokens.some(t => motivationTokens.includes(t));
      if (hasInputMotiv && hasTargetMotiv) {
        score += 0.15;
      }
    }
  }

  // Key phrase exact matching boosters
  const KEY_PHRASES = [
    "why do you want to",
    "why are you interest",
    "why do you want",
    "why work",
    "notice period",
    "start date",
    "earliest start",
    "salary expectation",
    "technical challenge",
    "technical problem",
    "years of experience",
    "distributed systems",
    "disagreement",
    "conflict"
  ];

  for (const phrase of KEY_PHRASES) {
    if (normInput.includes(phrase) && normPattern.includes(phrase)) {
      score = Math.max(score, 0.85);
      break;
    }
  }

  score = Math.min(1.0, Math.max(0.0, score));
  return { score: Number(score.toFixed(3)), overlapTokens };
}

/**
 * Interpolates contextual dynamic slots ({{COMPANY}}, {{ROLE}}) into answer text
 */
export function interpolateTemplateSlots(
  template: string,
  context: { company?: string | null; jobTitle?: string | null } = {}
): string {
  if (!template) return "";

  const company = (context.company || "").trim() || "your team";
  const role = (context.jobTitle || "").trim() || "this role";

  return template
    .replace(/\{\{\s*company\s*\}\}/gi, company)
    .replace(/\{\{\s*role\s*\}\}/gi, role)
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Finds the highest-confidence matching vault entry for a given screening question
 */
export function findBestVaultMatch(
  rawQuestion: string,
  vaultEntries: VaultEntry[],
  context: { company?: string | null; jobTitle?: string | null } = {},
  threshold = 0.60
): VaultMatchResult {
  const inferredCat = inferQuestionCategory(rawQuestion);

  if (!rawQuestion || !vaultEntries || vaultEntries.length === 0) {
    return {
      matched: false,
      confidence: 0,
      entry: null,
      interpolatedAnswer: null,
      category: inferredCat,
      overlapTokens: [],
      source: "none",
    };
  }

  let bestEntry: VaultEntry | null = null;
  let highestScore = 0;
  let bestOverlap: string[] = [];

  for (const entry of vaultEntries) {
    const { score, overlapTokens } = calculateSimilarity(
      rawQuestion,
      entry.questionPattern,
      entry.keywords
    );

    if (score > highestScore) {
      highestScore = score;
      bestEntry = entry;
      bestOverlap = overlapTokens;
    }
  }

  const confidencePct = Math.round(highestScore * 100);

  if (bestEntry && highestScore >= threshold) {
    const interpolated = interpolateTemplateSlots(bestEntry.answerText, context);
    return {
      matched: true,
      confidence: confidencePct,
      entry: bestEntry,
      interpolatedAnswer: interpolated,
      category: (bestEntry.category as QuestionCategory) || inferredCat,
      overlapTokens: bestOverlap,
      source: "vault",
    };
  }

  return {
    matched: false,
    confidence: confidencePct,
    entry: null,
    interpolatedAnswer: null,
    category: inferredCat,
    overlapTokens: bestOverlap,
    source: "none",
  };
}
