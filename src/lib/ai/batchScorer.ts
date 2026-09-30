import {
  CandidateContext,
  evaluateHardEligibility,
  extractSkills,
} from "./scorer";
import { evaluateTrust, type TrustVerdict, type TrustTier } from "./astreShield";

export type FeedScoreType = "BASE_MATCH" | "FINAL_MATCH" | "INELIGIBLE" | "SHIELD_BLOCKED";

export interface FeedItemScoreResult {
  jobId: string;
  score: number;
  scoreType: FeedScoreType;
  displayLabel: string;
  eligible: boolean;
  rejectionReason?: string;
  cached: boolean;
  hardSkills?: string[];
  missingSkills?: string[];
  /** AstreShield trust audit result — present for all non-cached jobs */
  trustVerdict?: TrustVerdict;
  /** Convenience alias: trust tier for UI rendering without parsing full verdict */
  trustTier?: TrustTier;
}

export interface MinimalJobPostingInput {
  id: string;
  title: string;
  rawDescription: string;
  location?: string | null;
  url?: string | null;
  postedAt?: Date | null;
  platform?: string | null;
}

export interface CachedScoreItem {
  score: number;
  hardSkills?: string | null;
  missingSkills?: string | null;
  reasoning?: string | null;
}

/**
 * Pure, lightweight batch scoring utility for Discovery Feed items.
 * Evaluates Layer 1 (Hard Eligibility) and Layer 2 (Deterministic Match Signals),
 * while using cached Layer 4 final AI match scores when available.
 *
 * ZERO LLM calls are executed in this function.
 */
export function computeBatchFeedScores(
  candidate: CandidateContext,
  jobs: MinimalJobPostingInput[],
  cachedScoresMap: Map<string, CachedScoreItem> = new Map()
): Map<string, FeedItemScoreResult> {
  const resultMap = new Map<string, FeedItemScoreResult>();

  // Pre-extract candidate skills once for all jobs in batch
  const candidateFullText = [
    candidate.title,
    ...candidate.masterProjects.map((p) => `${p.title} ${p.techStack} ${p.architecture}`),
    ...candidate.virtualExps.map((e) => `${e.company} ${e.roleTitle} ${e.outcome}`),
  ].join(" ");

  const candidateSkills = extractSkills(candidateFullText);

  for (const job of jobs) {
    if (!job || !job.id) continue;

    // 0. 🛡️ ASTRESHIELD — Scam/Fraud Detection (Runs BEFORE eligibility scoring)
    // RED-tier jobs are immediately flagged and save all downstream compute.
    // AMBER/GREEN verdicts are forwarded to the feed card for badge rendering.
    const trustVerdict = evaluateTrust({
      jobId: job.id,
      title: job.title,
      rawDescription: job.rawDescription,
      canonicalAppUrl: job.url,
      providerKey: job.platform,
    });

    if (trustVerdict.tier === "RED") {
      resultMap.set(job.id, {
        jobId: job.id,
        score: 0,
        scoreType: "SHIELD_BLOCKED",
        displayLabel: "⚠️ AstreShield Alert",
        eligible: false,
        rejectionReason: trustVerdict.headline,
        cached: false,
        hardSkills: [],
        missingSkills: [],
        trustVerdict,
        trustTier: "RED",
      });
      continue;
    }

    // 1. MANDATORY CACHE SAFETY RULE: Always evaluate Layer 1 Hard Eligibility FIRST.
    // An old cached AI evaluation MUST NOT override a current hard eligibility failure.
    const hardElig = evaluateHardEligibility(
      candidate,
      job.title,
      job.rawDescription,
      job.location || "",
      job.url || "http://valid.url"
    );

    if (!hardElig.eligible) {
      resultMap.set(job.id, {
        jobId: job.id,
        score: 0,
        scoreType: "INELIGIBLE",
        displayLabel: "Ineligible",
        eligible: false,
        rejectionReason: hardElig.reason || "Ineligible for candidate constraints",
        cached: false,
        hardSkills: [],
        missingSkills: ["Domain Eligibility"],
        trustVerdict,
        trustTier: trustVerdict.tier,
      });
      continue;
    }

    // 2. If CURRENT job is hard-eligible, reuse cached final AI evaluation if available
    const cachedItem = cachedScoresMap.get(job.id);
    if (cachedItem) {
      resultMap.set(job.id, {
        jobId: job.id,
        score: cachedItem.score,
        scoreType: "FINAL_MATCH",
        displayLabel: `${cachedItem.score}% Match`,
        eligible: true,
        cached: true,
        hardSkills: cachedItem.hardSkills ? JSON.parse(cachedItem.hardSkills) : [],
        missingSkills: cachedItem.missingSkills ? JSON.parse(cachedItem.missingSkills) : [],
        // Note: trust verdict is NOT cached — re-evaluated fresh every time
        trustVerdict,
        trustTier: trustVerdict.tier,
      });
      continue;
    }

    // 3. Evaluate Layer 2 Deterministic Match Signals
    const jobSkills = extractSkills(`${job.title} ${job.rawDescription}`);

    // Compute deterministic signals inline without repeating extractSkills
    const matched = jobSkills.filter((s) => candidateSkills.some((cs) => cs.toLowerCase() === s.toLowerCase()));
    const skillOverlapScore = jobSkills.length > 0 ? Math.round((matched.length / jobSkills.length) * 100) : 50;

    const lowerTitle = job.title.toLowerCase();
    const lowerCandTitle = candidate.title.toLowerCase();
    let titleCategoryScore = 50;

    if (
      (lowerTitle.includes("react") && lowerCandTitle.includes("react")) ||
      (lowerTitle.includes("python") && lowerCandTitle.includes("python")) ||
      (lowerTitle.includes("backend") && lowerCandTitle.includes("backend")) ||
      (lowerTitle.includes("frontend") && lowerCandTitle.includes("frontend")) ||
      (lowerTitle.includes("full stack") && lowerCandTitle.includes("full stack"))
    ) {
      titleCategoryScore = 100;
    } else if (lowerTitle.includes("software") || lowerTitle.includes("engineer") || lowerTitle.includes("developer")) {
      titleCategoryScore = 80;
    }

    let recencyScore = 100;
    if (job.postedAt) {
      const ageDays = (Date.now() - new Date(job.postedAt).getTime()) / (1000 * 60 * 60 * 24);
      if (ageDays <= 1) recencyScore = 100;
      else if (ageDays <= 3) recencyScore = 85;
      else if (ageDays <= 7) recencyScore = 70;
      else if (ageDays <= 14) recencyScore = 50;
      else recencyScore = 30;
    }

    let sourceQualityScore = 80;
    const pKey = (job.platform || "DIRECT_PORTAL").toUpperCase();
    if (["GREENHOUSE", "LEVER", "ASHBY", "WORKABLE", "SMARTRECRUITERS", "RECRUITEE"].includes(pKey)) {
      sourceQualityScore = 100;
    } else if (pKey === "HIMALAYAS" || pKey === "REMOTIVE") {
      sourceQualityScore = 90;
    }

    const baseScore = Math.min(
      100,
      Math.max(
        0,
        Math.round(
          0.5 * skillOverlapScore + 0.25 * titleCategoryScore + 0.15 * recencyScore + 0.1 * sourceQualityScore
        )
      )
    );

    const hardSkills = matched;
    const missingSkills = jobSkills.filter(
      (s) => !candidateSkills.some((cs) => cs.toLowerCase() === s.toLowerCase())
    );

    resultMap.set(job.id, {
      jobId: job.id,
      score: baseScore,
      scoreType: "BASE_MATCH",
      displayLabel: `${baseScore}% Base Match`,
      eligible: true,
      cached: false,
      hardSkills,
      missingSkills,
      trustVerdict,
      trustTier: trustVerdict.tier,
    });
  }

  return resultMap;
}
