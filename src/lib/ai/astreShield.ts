/**
 * AstreShield — Job Legitimacy Audit Engine
 * ──────────────────────────────────────────
 * Tiered scam detection system that protects job seekers from fake
 * postings while NEVER blocking genuine remote opportunities.
 *
 * Architecture: 3 deterministic layers + 1 optional AI layer
 *
 *   Layer 1 · Lexical Integrity     (typo density, homoglyphs, caps abuse)
 *   Layer 2 · Semantic Red Flags    (PII harvesting, fee demands, MLM traps)
 *   Layer 3 · Structural Credibility (source trust, URL sanity, JD completeness)
 *   Layer 4 · AI Intent Analysis    (OPTIONAL — only for borderline AMBER cases)
 *
 * CORE PRINCIPLE: "Innocent Until Proven Guilty"
 *   Every job starts at 100 trust points.
 *   Signals subtract; trust bonuses add.
 *   A SINGLE signal alone can NEVER produce a RED verdict.
 *   Only 2+ independent corroborating signals from different layers
 *   can push a job below 40 (the RED threshold).
 *
 * ASYMMETRIC COST FUNCTION:
 *   Blocking a real job (FALSE RED)     → 10x damage  (catastrophic UX)
 *   Passing a scam as safe (FALSE GREEN) → 5x damage  (user still aware)
 *   Therefore: System is biased toward CAUTION, not BLOCKING.
 */

import {
  TECH_TYPO_MAP,
  HOMOGLYPH_SUSPICIOUS_RANGES,
  PII_HARVESTING_PATTERNS,
  ADVANCE_FEE_PATTERNS,
  UNREALISTIC_COMP_PATTERNS,
  HIGH_PRESSURE_PATTERNS,
  PERSONAL_CONTACT_PATTERNS,
  RESHIPPING_MULE_PATTERNS,
  MLM_CRYPTO_PATTERNS,
  VAGUE_NO_WORK_PATTERNS,
  TRUSTED_ATS_PLATFORMS,
  NICHE_TRUSTED_BOARDS,
  SUSPICIOUS_URL_PATTERNS,
  TRUST_THRESHOLDS,
  SIGNAL_WEIGHTS,
  type ShieldSignalId,
} from "./astreShield.dict";

// ─── Public Types ─────────────────────────────────────────────────────────────

export type TrustTier = "GREEN" | "AMBER" | "RED";

export interface ShieldFlag {
  /** The signal identifier that fired */
  signalId: ShieldSignalId;
  /** Human-readable explanation shown to the user */
  label: string;
  /** Score impact (negative = deduction, positive = bonus) */
  impact: number;
  /** Which detection layer raised this flag */
  layer: 1 | 2 | 3;
  /** Snippet from the JD that triggered this flag (for transparency) */
  evidence?: string;
}

export interface TrustVerdict {
  /** Final trust score: 0-100 (higher = more trustworthy) */
  score: number;
  /** Tiered verdict for UI rendering */
  tier: TrustTier;
  /** All signals that fired (both deductions and bonuses) */
  flags: ShieldFlag[];
  /** User-facing summary headline */
  headline: string;
  /** Detailed user-facing explanation */
  detail: string;
  /** Whether AI Layer 4 analysis should be invoked */
  requiresAiAnalysis: boolean;
  /** True if this verdict was computed in under 1ms (pure deterministic) */
  isDeterministic: true;
}

export interface ShieldInput {
  jobId: string;
  title: string;
  rawDescription: string;
  company?: string | null;
  canonicalAppUrl?: string | null;
  providerKey?: string | null;
}

// ─── Internal Helpers ─────────────────────────────────────────────────────────

/**
 * Counts how many tech-specific typos appear in a block of text.
 * Returns { count, variants } where variants is the list of found typos.
 *
 * SAFETY: We only check technical terms — this prevents false-positives
 * from non-native English speakers who may use informal grammar.
 */
function detectTechTypos(text: string): { count: number; variants: string[] } {
  const lower = text.toLowerCase();
  const found: string[] = [];

  for (const [_correct, misspellings] of Object.entries(TECH_TYPO_MAP)) {
    for (const typo of misspellings) {
      // Word-boundary aware match — "debase" should not match "databse"
      const escaped = typo.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const rx = new RegExp(`(?<![a-z])${escaped}(?![a-z])`, "i");
      if (rx.test(lower)) {
        found.push(typo);
        break; // Only count each correct term once, even if multiple variants match
      }
    }
  }

  return { count: found.length, variants: found };
}

/**
 * Counts emojis in a string using Unicode property escapes.
 * Falls back to a heuristic range check for older Node environments.
 */
function countEmojis(text: string): number {
  try {
    // Modern emoji detection via Unicode property escapes
    const matches = text.match(/\p{Emoji}/gu);
    return matches ? matches.length : 0;
  } catch {
    // Fallback: count common emoji code point ranges
    let count = 0;
    for (const char of text) {
      const cp = char.codePointAt(0) ?? 0;
      if (
        (cp >= 0x1F600 && cp <= 0x1F64F) || // Emoticons
        (cp >= 0x1F300 && cp <= 0x1F5FF) || // Misc symbols & pictographs
        (cp >= 0x1F680 && cp <= 0x1F6FF) || // Transport & map
        (cp >= 0x2600 && cp <= 0x27BF)       // Misc symbols
      ) count++;
    }
    return count;
  }
}

/**
 * Detects ALL-CAPS ratio in a text body.
 * Legitimate JDs may have occasional headings in caps, but
 * a high ratio (>30%) is a strong signal of low-quality / scam content.
 */
function measureCapsRatio(text: string): number {
  const words = text.split(/\s+/).filter((w) => w.length > 2);
  if (words.length === 0) return 0;
  const capsWords = words.filter((w) => w === w.toUpperCase() && /[A-Z]/.test(w));
  return capsWords.length / words.length;
}

/**
 * Checks whether the same phrase (5+ words) is repeated 3+ times,
 * which indicates a low-effort copy-paste scam template.
 */
function detectRepetition(text: string): boolean {
  const sentences = text
    .split(/[.!?\n]+/)
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.split(/\s+/).length >= 5);

  const seen = new Map<string, number>();
  for (const sentence of sentences) {
    const count = (seen.get(sentence) ?? 0) + 1;
    seen.set(sentence, count);
    if (count >= 3) return true;
  }
  return false;
}

/**
 * Extracts a short evidence snippet around the first match of a pattern.
 * Truncated to 80 chars for clean UI display.
 */
function extractEvidence(text: string, pattern: RegExp): string | undefined {
  const match = text.match(pattern);
  if (!match || match.index === undefined) return undefined;
  const start = Math.max(0, match.index - 20);
  const end = Math.min(text.length, match.index + match[0].length + 40);
  const raw = text.slice(start, end).replace(/\s+/g, " ").trim();
  return `"…${raw}…"`;
}

// ─── Anti-Hallucination Safety Clamps ────────────────────────────────────────

/**
 * Enforces the "Innocent Until Proven Guilty" constraint:
 * A SINGLE signal alone can NEVER push a score below 40 (AMBER floor).
 * RED requires 2+ distinct-layer signals.
 *
 * This is the primary safeguard against the system "hallucinating" RED
 * verdicts from a single minor signal (e.g., one typo = blocked).
 */
function applyCorroborationGuard(
  rawScore: number,
  flags: ShieldFlag[]
): number {
  const deductionFlags = flags.filter((f) => f.impact < 0);
  const uniqueLayers = new Set(deductionFlags.map((f) => f.layer));

  // If only 1 unique layer has fired deductions, clamp score to AMBER floor
  if (uniqueLayers.size <= 1 && rawScore < TRUST_THRESHOLDS.AMBER_MIN) {
    return TRUST_THRESHOLDS.AMBER_MIN;
  }

  return rawScore;
}

// ─── Layer 1: Lexical Integrity ───────────────────────────────────────────────

function runLayer1(
  title: string,
  description: string
): ShieldFlag[] {
  const flags: ShieldFlag[] = [];
  const fullText = `${title} ${description}`;

  // 1a. Tech-specific typo analysis in TITLE
  const titleTypos = detectTechTypos(title);
  if (titleTypos.count >= 1) {
    flags.push({
      signalId: "TITLE_HAS_TYPO",
      label: `Misspelled tech term in job title: "${titleTypos.variants[0]}"`,
      impact: SIGNAL_WEIGHTS.TITLE_HAS_TYPO,
      layer: 1,
      evidence: `Title: "${title}"`,
    });
  }

  // 1b. Tech-specific typo density in DESCRIPTION
  const descTypos = detectTechTypos(description);
  if (descTypos.count >= 4) {
    flags.push({
      signalId: "TYPO_DENSITY_HIGH",
      label: `High density of misspelled tech terms (${descTypos.count} found): ${descTypos.variants.slice(0, 3).join(", ")}`,
      impact: SIGNAL_WEIGHTS.TYPO_DENSITY_HIGH,
      layer: 1,
      evidence: descTypos.variants.slice(0, 3).join(", "),
    });
  } else if (descTypos.count >= 2) {
    flags.push({
      signalId: "TYPO_DENSITY_LOW",
      label: `Minor tech term misspellings detected: ${descTypos.variants.join(", ")}`,
      impact: SIGNAL_WEIGHTS.TYPO_DENSITY_LOW,
      layer: 1,
      evidence: descTypos.variants.join(", "),
    });
  }

  // 1c. Unicode homoglyph detection
  const homoglyphHits = HOMOGLYPH_SUSPICIOUS_RANGES.some((rx) => rx.test(fullText));
  if (homoglyphHits) {
    flags.push({
      signalId: "UNICODE_HOMOGLYPHS",
      label: "Non-Latin Unicode characters detected (possible company name spoofing)",
      impact: SIGNAL_WEIGHTS.UNICODE_HOMOGLYPHS,
      layer: 1,
    });
  }

  // 1d. Excessive ALL-CAPS usage (>30% of words)
  const capsRatio = measureCapsRatio(description);
  if (capsRatio > 0.30) {
    flags.push({
      signalId: "EXCESSIVE_CAPS",
      label: `${Math.round(capsRatio * 100)}% of description is in ALL CAPS`,
      impact: SIGNAL_WEIGHTS.EXCESSIVE_CAPS,
      layer: 1,
    });
  }

  // 1e. Emoji spam (>5 emojis in body)
  const emojiCount = countEmojis(description);
  if (emojiCount > 5) {
    flags.push({
      signalId: "EMOJI_SPAM",
      label: `${emojiCount} emojis in job description (professional postings rarely use emojis)`,
      impact: SIGNAL_WEIGHTS.EMOJI_SPAM,
      layer: 1,
    });
  }

  return flags;
}

// ─── Layer 2: Semantic Red Flags ─────────────────────────────────────────────

function runLayer2(
  description: string,
  title: string
): ShieldFlag[] {
  const flags: ShieldFlag[] = [];

  // 2a. PII Harvesting
  for (const pattern of PII_HARVESTING_PATTERNS) {
    if (pattern.test(description)) {
      flags.push({
        signalId: "PII_HARVESTING",
        label: "Job description requests personal identity or financial data before an interview",
        impact: SIGNAL_WEIGHTS.PII_HARVESTING,
        layer: 2,
        evidence: extractEvidence(description, pattern),
      });
      break; // Only one PII flag per JD
    }
  }

  // 2b. Advance Fee / Upfront Payment
  for (const pattern of ADVANCE_FEE_PATTERNS) {
    if (pattern.test(description)) {
      flags.push({
        signalId: "ADVANCE_FEE",
        label: "Job requires upfront payment or financial investment from candidate",
        impact: SIGNAL_WEIGHTS.ADVANCE_FEE,
        layer: 2,
        evidence: extractEvidence(description, pattern),
      });
      break;
    }
  }

  // 2c. Unrealistic Compensation Claims
  for (const pattern of UNREALISTIC_COMP_PATTERNS) {
    if (pattern.test(description)) {
      flags.push({
        signalId: "UNREALISTIC_COMP",
        label: "Compensation claims are unrealistic for a legitimate junior/mid role",
        impact: SIGNAL_WEIGHTS.UNREALISTIC_COMP,
        layer: 2,
        evidence: extractEvidence(description, pattern),
      });
      break;
    }
  }

  // 2d. Reshipping / Money Mule (CRITICAL — extremely dangerous)
  for (const pattern of RESHIPPING_MULE_PATTERNS) {
    if (pattern.test(description)) {
      flags.push({
        signalId: "RESHIPPING_MULE",
        label: "Job involves receiving/forwarding packages or money — a common financial crime scheme",
        impact: SIGNAL_WEIGHTS.RESHIPPING_MULE,
        layer: 2,
        evidence: extractEvidence(description, pattern),
      });
      break;
    }
  }

  // 2e. MLM / Crypto / Pyramid Trap
  for (const pattern of MLM_CRYPTO_PATTERNS) {
    if (pattern.test(description)) {
      flags.push({
        signalId: "MLM_CRYPTO_TRAP",
        label: "Job description contains network marketing or cryptocurrency scheme language",
        impact: SIGNAL_WEIGHTS.MLM_CRYPTO_TRAP,
        layer: 2,
        evidence: extractEvidence(description, pattern),
      });
      break;
    }
  }

  // 2f. High-Pressure Language (context-aware: only flag if 2+ pressure patterns hit)
  const pressureHits = HIGH_PRESSURE_PATTERNS.filter((p) => p.test(description) || p.test(title));
  if (pressureHits.length >= 2) {
    flags.push({
      signalId: "HIGH_PRESSURE",
      label: "Multiple high-pressure urgency signals detected (common in scam postings)",
      impact: SIGNAL_WEIGHTS.HIGH_PRESSURE,
      layer: 2,
      evidence: extractEvidence(description, pressureHits[0]),
    });
  }

  // 2g. Personal Contact Channels
  for (const pattern of PERSONAL_CONTACT_PATTERNS) {
    if (pattern.test(description)) {
      flags.push({
        signalId: "PERSONAL_CONTACT",
        label: "Application directs candidates to personal messaging apps or consumer email addresses",
        impact: SIGNAL_WEIGHTS.PERSONAL_CONTACT,
        layer: 2,
        evidence: extractEvidence(description, pattern),
      });
      break;
    }
  }

  // 2h. No Real Work Described (SUPPORTING signal only — very low weight)
  const vagueHits = VAGUE_NO_WORK_PATTERNS.filter((p) => p.test(description));
  const wordCount = description.trim().split(/\s+/).length;
  if (vagueHits.length >= 2 && wordCount < 150) {
    flags.push({
      signalId: "NO_REAL_WORK",
      label: "Job description contains vague language with no concrete technical responsibilities",
      impact: SIGNAL_WEIGHTS.NO_REAL_WORK,
      layer: 2,
      evidence: extractEvidence(description, vagueHits[0]),
    });
  }

  return flags;
}

// ─── Layer 3: Structural Credibility ─────────────────────────────────────────

function runLayer3(
  rawDescription: string,
  canonicalAppUrl: string | null | undefined,
  providerKey: string | null | undefined
): ShieldFlag[] {
  const flags: ShieldFlag[] = [];

  const pKey = (providerKey ?? "UNKNOWN").toUpperCase();

  // 3a. Trusted ATS Source (BONUS — strong positive signal)
  if (TRUSTED_ATS_PLATFORMS.has(pKey)) {
    flags.push({
      signalId: "TRUSTED_ATS_SOURCE",
      label: `Job sourced from verified enterprise ATS: ${pKey}`,
      impact: SIGNAL_WEIGHTS.TRUSTED_ATS_SOURCE, // +12
      layer: 3,
    });
  }
  // 3b. Niche Trusted Board (BONUS — moderate positive signal)
  else if (NICHE_TRUSTED_BOARDS.has(pKey)) {
    flags.push({
      signalId: "NICHE_BOARD_SOURCE",
      label: `Job sourced from trusted niche remote board: ${pKey}`,
      impact: SIGNAL_WEIGHTS.NICHE_BOARD_SOURCE, // +6
      layer: 3,
    });
  }

  // 3c. Suspicious Application URL
  if (canonicalAppUrl) {
    const urlHasSuspiciousPattern = SUSPICIOUS_URL_PATTERNS.some((p) =>
      p.test(canonicalAppUrl)
    );
    if (urlHasSuspiciousPattern) {
      flags.push({
        signalId: "SUSPICIOUS_URL",
        label: "Application link routes to a public form builder (Google Forms, Typeform, etc.) instead of a company ATS",
        impact: SIGNAL_WEIGHTS.SUSPICIOUS_URL,
        layer: 3,
        evidence: `URL: ${canonicalAppUrl.slice(0, 60)}`,
      });
    }
  }

  // 3d. JD Too Short (< 80 words — barely any real information)
  const wordCount = rawDescription.trim().split(/\s+/).filter(Boolean).length;
  if (wordCount < 80) {
    flags.push({
      signalId: "JD_TOO_SHORT",
      label: `Job description is unusually short (${wordCount} words). Real postings typically have 150+ words.`,
      impact: SIGNAL_WEIGHTS.JD_TOO_SHORT,
      layer: 3,
    });
  }

  // 3e. Repetitive Content
  if (detectRepetition(rawDescription)) {
    flags.push({
      signalId: "JD_TOO_REPETITIVE",
      label: "Job description contains repeated identical sentences — likely a copy-paste template",
      impact: SIGNAL_WEIGHTS.JD_TOO_REPETITIVE,
      layer: 3,
    });
  }

  return flags;
}

// ─── Verdict Builder ──────────────────────────────────────────────────────────

function buildVerdict(rawScore: number, flags: ShieldFlag[]): TrustVerdict {
  // Apply corroboration guard BEFORE clamping
  const guardedScore = applyCorroborationGuard(rawScore, flags);

  // Hard clamp: score must be 0-100
  const score = Math.min(100, Math.max(0, guardedScore));

  let tier: TrustTier;
  let headline: string;
  let detail: string;

  const deductionFlags = flags.filter((f) => f.impact < 0);
  const bonusFlags = flags.filter((f) => f.impact > 0);
  const flagCount = deductionFlags.length;

  if (score >= TRUST_THRESHOLDS.GREEN_MIN) {
    tier = "GREEN";
    headline = "AstreShield: Verified Safe";
    detail =
      bonusFlags.length > 0
        ? `This posting passed all integrity checks and shows positive trust signals (${bonusFlags.map((f) => f.label).join("; ")}).`
        : "This posting passed all integrity checks. No suspicious patterns detected.";
  } else if (score >= TRUST_THRESHOLDS.AMBER_MIN) {
    tier = "AMBER";
    headline = "AstreShield: Verify This Posting";
    const flagSummary = deductionFlags
      .slice(0, 2)
      .map((f) => f.label)
      .join("; ");
    detail = `This posting has ${flagCount} concern${flagCount !== 1 ? "s" : ""}: ${flagSummary}. Review carefully before sharing personal information or applying.`;
  } else {
    tier = "RED";
    headline = "AstreShield: Likely Fraudulent";
    const criticalFlags = deductionFlags
      .sort((a, b) => a.impact - b.impact)
      .slice(0, 3);
    detail = `This posting raised ${flagCount} red flags: ${criticalFlags.map((f) => f.label).join("; ")}. AstreWork strongly recommends not applying or sharing personal information.`;
  }

  // Determine if AI Layer 4 should be invoked for borderline cases
  const requiresAiAnalysis =
    score >= TRUST_THRESHOLDS.AI_ANALYSIS_MIN &&
    score <= TRUST_THRESHOLDS.AI_ANALYSIS_MAX &&
    deductionFlags.length >= TRUST_THRESHOLDS.AI_ANALYSIS_MIN_FLAGS;

  return {
    score,
    tier,
    flags,
    headline,
    detail,
    requiresAiAnalysis,
    isDeterministic: true,
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Evaluates a job posting's legitimacy using 3 deterministic layers.
 *
 * This function is:
 *   ✅ Synchronous (no async/await needed for Layers 1-3)
 *   ✅ Zero LLM calls (pure rule-based, instant execution)
 *   ✅ Browser-safe (no Node.js-only dependencies)
 *   ✅ Idempotent (same input always produces same output)
 *
 * @param input - Job posting data to evaluate
 * @returns TrustVerdict with score, tier, flags, and user-facing messaging
 */
export function evaluateTrust(input: ShieldInput): TrustVerdict {
  const {
    title,
    rawDescription,
    canonicalAppUrl,
    providerKey,
  } = input;

  // Guard: empty descriptions start at 100 — don't penalize missing data
  if (!rawDescription || rawDescription.trim().length === 0) {
    return buildVerdict(100, []);
  }

  const layer1Flags = runLayer1(title, rawDescription);
  const layer2Flags = runLayer2(rawDescription, title);
  const layer3Flags = runLayer3(rawDescription, canonicalAppUrl, providerKey);

  const allFlags = [...layer1Flags, ...layer2Flags, ...layer3Flags];

  // Sum all impacts (deductions are negative, bonuses are positive)
  const totalImpact = allFlags.reduce((sum, f) => sum + f.impact, 0);
  const rawScore = 100 + totalImpact;

  return buildVerdict(rawScore, allFlags);
}

/**
 * Batch evaluates an array of job postings.
 * Returns a Map<jobId, TrustVerdict> for O(1) lookup in the feed renderer.
 *
 * Safe to call for every job in the discovery feed — zero API cost.
 */
export function evaluateTrustBatch(
  inputs: ShieldInput[]
): Map<string, TrustVerdict> {
  const resultMap = new Map<string, TrustVerdict>();
  for (const input of inputs) {
    if (!input?.jobId) continue;
    resultMap.set(input.jobId, evaluateTrust(input));
  }
  return resultMap;
}

/**
 * Utility: returns true if a TrustVerdict should prevent rendering
 * the job card in the main feed.
 *
 * Currently: only RED tier verdicts are "blocked" (greyed out).
 * AMBER and GREEN both render normally (AMBER shows a warning badge).
 */
export function isTrustBlocked(verdict: TrustVerdict): boolean {
  return verdict.tier === "RED";
}

/**
 * Utility: converts a TrustTier to a CSS-safe class name suffix.
 * For use in UI components: `shield-badge--green`, etc.
 */
export function tierToCssClass(tier: TrustTier): string {
  return `shield-badge--${tier.toLowerCase()}`;
}
