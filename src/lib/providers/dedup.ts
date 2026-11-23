import crypto from "crypto";
import { NormalizedJob } from "./types";

const TRACKING_PARAMS = new Set([
  "gh_src",
  "lk",
  "srsltid",
  "gclid",
  "fbclid",
  "msclkid",
  "mc_cid",
  "mc_eid",
  "trk",
  "trackingid",
  "source",
  "sub_id",
  "_hsenc",
  "_hsmi",
  "session_id",
  "candidate_id",
]);

/**
 * Normalizes job posting URLs and produces a deterministic SHA-256 hash.
 */
export function generateUrlHash(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl);
    const cleanParams = new URLSearchParams();
    parsed.searchParams.forEach((val, key) => {
      const lowerKey = key.toLowerCase();
      if (
        !lowerKey.startsWith("utm_") &&
        !lowerKey.startsWith("ref") &&
        !TRACKING_PARAMS.has(lowerKey)
      ) {
        cleanParams.append(key, val);
      }
    });
    parsed.search = cleanParams.toString();
    const cleanUrl = parsed.toString().toLowerCase().replace(/\/$/, "");
    return crypto.createHash("sha256").update(cleanUrl).digest("hex");
  } catch {
    return crypto.createHash("sha256").update(rawUrl.toLowerCase().trim()).digest("hex");
  }
}

/**
 * Determines whether a URL is a direct ATS link (Greenhouse, Lever, Ashby, Workable, SmartRecruiters, Recruitee, or official domain).
 */
export function isDirectAtsUrl(url: string): boolean {
  if (!url) return false;
  const lower = url.toLowerCase();
  return (
    lower.includes("greenhouse.io") ||
    lower.includes("lever.co") ||
    lower.includes("ashbyhq.com") ||
    lower.includes("workable.com") ||
    lower.includes("smartrecruiters.com") ||
    lower.includes("recruitee.com")
  );
}

/**
 * Normalizes description text by stripping HTML, decoding HTML entities,
 * collapsing whitespace, lowercasing, and trimming.
 */
export function cleanTextForDedup(text: string): string {
  if (!text) return "";
  return text
    .replace(/<[^>]*>?/gm, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .toLowerCase()
    .trim();
}

/**
 * Computes a deterministic multi-signal deduplication key using:
 * 1. ATS Source Job ID + Provider Key (Exact ATS match)
 * 2. Canonical Application URL Hash (Exact Link match)
 * 3. Multi-signal tuple: companySlug + title + location + experienceLevel + remoteScope + normalized description MD5 snippet
 */
export function computeDeduplicationKey(job: NormalizedJob): string {
  // Signal 1: ATS Provider + Source Job ID
  if (
    job.sourceJobId &&
    ["GREENHOUSE", "LEVER", "ASHBY", "WORKABLE", "SMARTRECRUITERS", "RECRUITEE"].includes(job.providerKey)
  ) {
    return `ats:${job.providerKey.toLowerCase()}:${job.companySlug}:${job.sourceJobId}`;
  }

  // Signal 2: Direct Canonical Application URL Hash
  if (job.canonicalAppUrl && isDirectAtsUrl(job.canonicalAppUrl)) {
    const cleanUrl = generateUrlHash(job.canonicalAppUrl);
    return `url:${cleanUrl}`;
  }

  // Signal 3: Multi-Signal Tuple (Company + Title + Location + Experience + Clean Description MD5)
  const normCompany = (job.companySlug || job.company || "").toLowerCase().trim();
  const normTitle = (job.title || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const normLocation = (job.location || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const normExp = (job.experienceLevel || "").toLowerCase().replace(/[^a-z0-9]/g, "");

  const cleanedDesc = cleanTextForDedup(job.rawDescription || "");
  const descSnippet = cleanedDesc.slice(0, 200).replace(/[^a-z0-9]/g, "");
  const descHash = crypto.createHash("md5").update(descSnippet).digest("hex").slice(0, 8);

  return `sig:${normCompany}:${normTitle}:${normLocation}:${normExp}:${descHash}`;
}
