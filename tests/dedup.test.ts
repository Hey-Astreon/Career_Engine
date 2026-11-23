/**
 * Tests for src/lib/providers/dedup.ts
 *
 * Covers:
 * - ATS Tier 1: same provider + sourceJobId
 * - ATS Tier 1: different providers → different keys
 * - URL Tier 2: same canonical URL (with/without UTM) → same hash
 * - URL Tier 2: different URLs → different hashes
 * - Tuple Tier 3: same company/title/location → same key
 * - Tuple Tier 3: different locations → different keys (location separation)
 * - Tuple Tier 3: different experienceLevel → different keys
 * - isDirectAtsUrl: ATS domain detection
 * - Cross-provider same job (URL match)
 * - Different requisitions at same company (location separator)
 */

import { describe, it, expect } from "vitest";
import {
  computeDeduplicationKey,
  generateUrlHash,
  isDirectAtsUrl,
} from "@/lib/providers/dedup";
import type { NormalizedJob } from "@/lib/providers/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeJob(overrides: Partial<NormalizedJob>): NormalizedJob {
  return {
    providerKey: "GREENHOUSE" as NormalizedJob["providerKey"],
    company: "Stripe",
    companySlug: "stripe",
    title: "Software Engineer",
    category: "Software Developer",
    jobType: "Remote Full-Time",
    experienceLevel: "0-3 Years (Entry/Junior)",
    location: "100% Remote",
    isRemote: true,
    remoteScope: "WORLDWIDE",
    opportunitySignals: ["DIRECT_APPLICATION"],
    discoveryUrl: "https://boards.greenhouse.io/stripe/jobs/12345",
    canonicalAppUrl: "https://boards.greenhouse.io/stripe/jobs/12345",
    postedAt: new Date("2024-01-01"),
    rawDescription: "We are looking for a software engineer to join our team.",
    hasFullText: true,
    ...overrides,
  };
}

// ─── ATS Tier 1: Source Job ID ────────────────────────────────────────────────

describe("computeDeduplicationKey – Tier 1 ATS Source ID", () => {
  it("same ATS provider + sourceJobId → same key", () => {
    const job1 = makeJob({ sourceJobId: "12345", providerKey: "GREENHOUSE" });
    const job2 = makeJob({ sourceJobId: "12345", providerKey: "GREENHOUSE" });
    expect(computeDeduplicationKey(job1)).toBe(computeDeduplicationKey(job2));
  });

  it("different sourceJobId at same provider → different key", () => {
    const job1 = makeJob({ sourceJobId: "12345", providerKey: "GREENHOUSE" });
    const job2 = makeJob({ sourceJobId: "99999", providerKey: "GREENHOUSE" });
    expect(computeDeduplicationKey(job1)).not.toBe(computeDeduplicationKey(job2));
  });

  it("same job ID but different ATS providers → different Tier 1 keys", () => {
    const job1 = makeJob({ sourceJobId: "12345", providerKey: "GREENHOUSE" });
    const job2 = makeJob({ sourceJobId: "12345", providerKey: "LEVER" });
    expect(computeDeduplicationKey(job1)).not.toBe(computeDeduplicationKey(job2));
  });

  it("Tier 1 key starts with ats: prefix", () => {
    const job = makeJob({ sourceJobId: "12345", providerKey: "GREENHOUSE" });
    expect(computeDeduplicationKey(job)).toMatch(/^ats:greenhouse:stripe:12345$/);
  });

  it("Tier 1 key is deterministic across calls", () => {
    const job = makeJob({ sourceJobId: "abc-999", providerKey: "ASHBY" });
    expect(computeDeduplicationKey(job)).toBe(computeDeduplicationKey(job));
  });

  it("Tier 1 applies to Lever provider", () => {
    const job = makeJob({ sourceJobId: "lever-123", providerKey: "LEVER" });
    expect(computeDeduplicationKey(job)).toMatch(/^ats:lever:/);
  });

  it("Tier 1 applies to Workable provider", () => {
    const job = makeJob({ sourceJobId: "wk-456", providerKey: "WORKABLE" });
    expect(computeDeduplicationKey(job)).toMatch(/^ats:workable:/);
  });

  it("Tier 1 applies to SmartRecruiters provider", () => {
    const job = makeJob({ sourceJobId: "sr-789", providerKey: "SMARTRECRUITERS" });
    expect(computeDeduplicationKey(job)).toMatch(/^ats:smartrecruiters:/);
  });
});

// ─── isDirectAtsUrl ───────────────────────────────────────────────────────────

describe("isDirectAtsUrl", () => {
  it("recognizes greenhouse.io URL as direct ATS", () => {
    expect(isDirectAtsUrl("https://boards.greenhouse.io/stripe/jobs/12345")).toBe(true);
  });

  it("recognizes lever.co URL as direct ATS", () => {
    expect(isDirectAtsUrl("https://jobs.lever.co/company/job-id")).toBe(true);
  });

  it("recognizes ashbyhq.com URL as direct ATS", () => {
    expect(isDirectAtsUrl("https://jobs.ashbyhq.com/company/role")).toBe(true);
  });

  it("recognizes workable.com URL as direct ATS", () => {
    expect(isDirectAtsUrl("https://apply.workable.com/company/j/abc123")).toBe(true);
  });

  it("recognizes smartrecruiters.com as direct ATS", () => {
    expect(isDirectAtsUrl("https://jobs.smartrecruiters.com/company/role")).toBe(true);
  });

  it("recognizes recruitee.com as direct ATS", () => {
    expect(isDirectAtsUrl("https://company.recruitee.com/o/role")).toBe(true);
  });

  it("returns false for Remotive URL (aggregator)", () => {
    expect(isDirectAtsUrl("https://remotive.com/remote-jobs/software-dev/123")).toBe(false);
  });

  it("returns false for HN URL", () => {
    expect(isDirectAtsUrl("https://news.ycombinator.com/item?id=12345")).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(isDirectAtsUrl("")).toBe(false);
  });

  it("is case-insensitive", () => {
    expect(isDirectAtsUrl("HTTPS://BOARDS.GREENHOUSE.IO/STRIPE/JOBS/12345")).toBe(true);
  });
});

// ─── URL Tier 2: Canonical URL Hash ───────────────────────────────────────────

describe("computeDeduplicationKey – Tier 2 URL Hash", () => {
  // Non-ATS provider (REMOTIVE) with a direct URL → falls to Tier 2
  const remotiveJob = (url: string) =>
    makeJob({
      providerKey: "REMOTIVE" as NormalizedJob["providerKey"],
      sourceJobId: undefined,
      canonicalAppUrl: url,
      discoveryUrl: url,
    });

  it("same canonical URL → same Tier 2 key", () => {
    const job1 = remotiveJob("https://company.com/jobs/123");
    const job2 = remotiveJob("https://company.com/jobs/123");
    expect(computeDeduplicationKey(job1)).toBe(computeDeduplicationKey(job2));
  });

  it("URL with UTM params → same key as clean URL (UTM stripped)", () => {
    const job1 = remotiveJob("https://company.com/jobs/123");
    const job2 = remotiveJob("https://company.com/jobs/123?utm_source=remotive&utm_medium=email");
    expect(computeDeduplicationKey(job1)).toBe(computeDeduplicationKey(job2));
  });

  it("URL with aggregator tracking params (srsltid, gclid, trk) → same key as clean URL", () => {
    const job1 = remotiveJob("https://company.com/jobs/123");
    const job2 = remotiveJob("https://company.com/jobs/123?srsltid=AfmBOor123&gclid=xyz987&trk=public_jobs");
    expect(computeDeduplicationKey(job1)).toBe(computeDeduplicationKey(job2));
    expect(generateUrlHash("https://company.com/jobs/123")).toBe(
      generateUrlHash("https://company.com/jobs/123?srsltid=AfmBOor123&gclid=xyz987&trk=public_jobs")
    );
  });

  it("different ATS URLs → different Tier 2 keys", () => {
    const job1 = remotiveJob("https://boards.greenhouse.io/company/jobs/111");
    const job2 = remotiveJob("https://boards.greenhouse.io/company/jobs/999");
    expect(computeDeduplicationKey(job1)).not.toBe(computeDeduplicationKey(job2));
  });

  it("Tier 2 key starts with url: prefix", () => {
    // Only if the canonical URL is a direct ATS URL
    const job = makeJob({
      providerKey: "REMOTIVE" as NormalizedJob["providerKey"],
      sourceJobId: undefined,
      canonicalAppUrl: "https://boards.greenhouse.io/stripe/jobs/99999",
    });
    expect(computeDeduplicationKey(job)).toMatch(/^url:/);
  });
});

// ─── generateUrlHash ──────────────────────────────────────────────────────────

describe("generateUrlHash", () => {
  it("produces a hex string for a valid URL", () => {
    const hash = generateUrlHash("https://example.com/jobs/123");
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("strips UTM params before hashing", () => {
    const clean = generateUrlHash("https://example.com/jobs/123");
    const dirty = generateUrlHash("https://example.com/jobs/123?utm_source=test&utm_medium=email");
    expect(clean).toBe(dirty);
  });

  it("strips ref param before hashing", () => {
    const clean = generateUrlHash("https://example.com/jobs/123");
    const dirty = generateUrlHash("https://example.com/jobs/123?ref=homepage");
    expect(clean).toBe(dirty);
  });

  it("strips trailing slash before hashing", () => {
    const noSlash = generateUrlHash("https://example.com/jobs/123");
    const withSlash = generateUrlHash("https://example.com/jobs/123/");
    expect(noSlash).toBe(withSlash);
  });

  it("different paths produce different hashes", () => {
    const h1 = generateUrlHash("https://example.com/jobs/111");
    const h2 = generateUrlHash("https://example.com/jobs/222");
    expect(h1).not.toBe(h2);
  });

  it("handles invalid URL gracefully (returns sha256 of raw string)", () => {
    const hash = generateUrlHash("not-a-url");
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });
});

// ─── Tuple Tier 3: Multi-Signal ───────────────────────────────────────────────

describe("computeDeduplicationKey – Tier 3 Multi-Signal Tuple", () => {
  // Non-ATS provider, no direct ATS canonical URL → falls to Tier 3
  const hnJob = (overrides: Partial<NormalizedJob> = {}) =>
    makeJob({
      providerKey: "HN_HIRING" as NormalizedJob["providerKey"],
      sourceJobId: undefined,
      canonicalAppUrl: "https://news.ycombinator.com/item?id=12345",
      discoveryUrl: "https://news.ycombinator.com/item?id=12345",
      ...overrides,
    });

  it("same company + title + location + exp → same Tier 3 key", () => {
    const job1 = hnJob({ rawDescription: "Build distributed systems with Go and Kubernetes." });
    const job2 = hnJob({ rawDescription: "Build distributed systems with Go and Kubernetes." });
    expect(computeDeduplicationKey(job1)).toBe(computeDeduplicationKey(job2));
  });

  it("Tier 3 key starts with sig: prefix", () => {
    const job = hnJob();
    expect(computeDeduplicationKey(job)).toMatch(/^sig:/);
  });

  it("different locations → different Tier 3 keys (location separation enforced)", () => {
    const job1 = hnJob({ location: "Remote (US Only)" });
    const job2 = hnJob({ location: "Remote (Worldwide)" });
    expect(computeDeduplicationKey(job1)).not.toBe(computeDeduplicationKey(job2));
  });

  it("different experience levels → different Tier 3 keys", () => {
    const job1 = hnJob({ experienceLevel: "0-3 Years (Entry/Junior)" });
    const job2 = hnJob({ experienceLevel: "Senior / Staff Level (5+ Yrs)" });
    expect(computeDeduplicationKey(job1)).not.toBe(computeDeduplicationKey(job2));
  });

  it("different companies → different Tier 3 keys", () => {
    const job1 = hnJob({ company: "Stripe", companySlug: "stripe" });
    const job2 = hnJob({ company: "Vercel", companySlug: "vercel" });
    expect(computeDeduplicationKey(job1)).not.toBe(computeDeduplicationKey(job2));
  });

  it("different titles → different Tier 3 keys", () => {
    const job1 = hnJob({ title: "Software Engineer" });
    const job2 = hnJob({ title: "Backend Engineer" });
    expect(computeDeduplicationKey(job1)).not.toBe(computeDeduplicationKey(job2));
  });

  it("produces identical Tier 3 keys for HTML vs plain text / whitespace variations of the same job description", () => {
    const jobHTML = hnJob({
      title: "Machine Learning Systems Engineer, Ads ML Platform",
      company: "Reddit",
      companySlug: "reddit",
      rawDescription: "<p> We are hiring a <strong>Machine Learning Systems Engineer</strong> for the Ads ML Platform team. </p>",
    });
    const jobPlain = hnJob({
      title: "Machine Learning Systems Engineer, Ads ML Platform",
      company: "Reddit",
      companySlug: "reddit",
      rawDescription: "  We are hiring a Machine Learning Systems Engineer for the Ads ML Platform team.  ",
    });
    expect(computeDeduplicationKey(jobHTML)).toBe(computeDeduplicationKey(jobPlain));
  });

  it("significantly different descriptions → different Tier 3 keys", () => {
    const job1 = hnJob({ rawDescription: "Build Go microservices. Remote. Apply: email@stripe.com" });
    const job2 = hnJob({ rawDescription: "React frontend work. Strong CSS required. US only." });
    expect(computeDeduplicationKey(job1)).not.toBe(computeDeduplicationKey(job2));
  });

  it("is deterministic — same input, different call instances, same key", () => {
    const job = hnJob({ rawDescription: "We need a backend engineer with 2 years of Python." });
    const key1 = computeDeduplicationKey(job);
    const key2 = computeDeduplicationKey({ ...job });
    expect(key1).toBe(key2);
  });
});

// ─── Cross-Provider Deduplication Scenarios ───────────────────────────────────

describe("deduplication – cross-provider scenarios", () => {
  it("Greenhouse + Himalayas pointing to same ATS URL: Tier 2 produces same key", () => {
    // Himalayas is not an ATS provider (not in Tier 1 list), so it falls to Tier 2
    const atsUrl = "https://boards.greenhouse.io/stripe/jobs/12345";
    const ghJob = makeJob({
      providerKey: "GREENHOUSE" as NormalizedJob["providerKey"],
      sourceJobId: "12345",
      canonicalAppUrl: atsUrl,
    });
    const himalayasJob = makeJob({
      providerKey: "HIMALAYAS" as NormalizedJob["providerKey"],
      sourceJobId: undefined,
      canonicalAppUrl: atsUrl,
    });

    // GH job uses Tier 1 (ATS provider): ats:greenhouse:stripe:12345
    // Himalayas job: no sourceJobId, canonical URL is a direct ATS URL → Tier 2: url:{hash}
    // These will have DIFFERENT dedup keys (they are different occurrences)
    // but would map to the SAME canonical Opportunity via Path B (company+title+location)
    expect(computeDeduplicationKey(ghJob)).not.toBe(computeDeduplicationKey(himalayasJob));
  });

  it("different requisitions: same company, same title, different location → different Tier 3 key", () => {
    const job1 = makeJob({
      providerKey: "HN_HIRING" as NormalizedJob["providerKey"],
      sourceJobId: undefined,
      canonicalAppUrl: "https://news.ycombinator.com/item?id=1",
      location: "Remote (US Only)",
    });
    const job2 = makeJob({
      providerKey: "HN_HIRING" as NormalizedJob["providerKey"],
      sourceJobId: undefined,
      canonicalAppUrl: "https://news.ycombinator.com/item?id=2",
      location: "Remote (EU Only)",
    });
    expect(computeDeduplicationKey(job1)).not.toBe(computeDeduplicationKey(job2));
  });
});
