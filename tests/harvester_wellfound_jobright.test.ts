import { describe, it, expect, afterAll } from "vitest";
import path from "path";
import { PrismaClient, PlatformSource, RemoteScope } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { WellfoundProvider } from "@/lib/providers/wellfound";
import { JobrightProvider } from "@/lib/providers/jobright";
import { ingestNormalizedJobs } from "@/lib/providers/registry";
import {
  isStrictlyRemoteDeveloperRole,
  determineExperienceLevel,
  cleanCompanySlug,
  parseRemoteScope,
  determineCategory,
  determineJobType,
  determineOpportunitySignals,
  sanitizeRoleTitle,
} from "@/lib/providers/normalize";
import { NormalizedJob } from "@/lib/providers/types";

import { db } from "@/lib/db";

describe("Wellfound & Jobright Harvester Normalization", () => {
  it("correctly identifies remote early-career developer roles for Wellfound", () => {
    const rawRole = {
      title: "Junior Backend Engineer (Node/Postgres)",
      company: "Supabase Partner",
      location: "Remote (Worldwide)",
      rawDescription: "Looking for an early career or junior engineer with 1 year experience.",
    };

    const title = sanitizeRoleTitle(rawRole.title);
    const isDev = isStrictlyRemoteDeveloperRole(title, rawRole.location, rawRole.rawDescription);
    const exp = determineExperienceLevel(title, rawRole.rawDescription);

    expect(isDev).toBe(true);
    expect(["Fresher / Entry Level (0-1 Yr)", "Junior (1-3 Yrs)"]).toContain(exp);
  });

  it("admits general developer roles defaulting to 0-3 Years (Entry/Junior) in earlyCareerLevels", () => {
    const rawRole = {
      title: "Full Stack Engineer (TypeScript/React)",
      company: "Modern Startup",
      location: "Remote",
      rawDescription: "Build cutting-edge user interfaces and microservices.",
    };

    const title = sanitizeRoleTitle(rawRole.title);
    const isDev = isStrictlyRemoteDeveloperRole(title, rawRole.location, rawRole.rawDescription);
    const exp = determineExperienceLevel(title, rawRole.rawDescription);

    expect(isDev).toBe(true);
    expect(exp).toBe("0-3 Years (Entry/Junior)");

    const earlyCareerLevels = [
      "Internship",
      "Fresher / Entry Level (0-1 Yr)",
      "Junior (1-3 Yrs)",
      "0-3 Years (Entry/Junior)",
    ];
    expect(earlyCareerLevels).toContain(exp);
  });

  it("rejects non-developer or senior roles", () => {
    const seniorRole = {
      title: "Staff Principal Architect (10+ YOE)",
      location: "Remote",
      rawDescription: "Must have 10 years of distributed systems experience.",
    };

    const exp = determineExperienceLevel(seniorRole.title, seniorRole.rawDescription);
    expect(["Fresher / Entry Level (0-1 Yr)", "Junior (1-3 Yrs)"]).not.toContain(exp);

    const nonDevRole = {
      title: "Customer Support Specialist",
      location: "Remote",
      rawDescription: "Handle inbound tickets.",
    };

    const isDev = isStrictlyRemoteDeveloperRole(nonDevRole.title, nonDevRole.location, nonDevRole.rawDescription);
    expect(isDev).toBe(false);
  });

  it("normalizes Jobright AI internship into valid NormalizedJob", () => {
    const title = sanitizeRoleTitle("Software Engineering Intern - Summer 2026");
    const { company, companySlug } = cleanCompanySlug("Vercel Ecosystem Labs");
    const location = "Remote - US";
    const rawDesc = "Join our platform infrastructure team for a 12-week remote internship.";
    const cleanUrl = "https://jobright.ai/jobs/test-intern-123";
    const postedAt = new Date();

    const signals = determineOpportunitySignals({
      postedAt,
      applicationUrlType: "AGGREGATOR_PAGE",
      canonicalAppUrl: cleanUrl,
      providerKey: PlatformSource.JOBRIGHT,
    });

    const normalized: NormalizedJob = {
      providerKey: PlatformSource.JOBRIGHT,
      company,
      companySlug,
      title,
      category: determineCategory(title),
      jobType: determineJobType(title, rawDesc),
      experienceLevel: determineExperienceLevel(title, rawDesc),
      location,
      isRemote: true,
      remoteScope: parseRemoteScope(location, rawDesc),
      discoveryUrl: cleanUrl,
      canonicalAppUrl: cleanUrl,
      applicationUrlType: "AGGREGATOR_PAGE",
      verificationStatus: "VERIFIED_AGGREGATOR",
      postedAt,
      opportunitySignals: signals,
      rawDescription: rawDesc,
      hasFullText: false,
      technologies: ["TypeScript", "Next.js"],
    };

    expect(normalized.providerKey).toBe("JOBRIGHT");
    expect(normalized.experienceLevel).toBe("Fresher / Entry Level (0-1 Yr)");
    expect(normalized.isRemote).toBe(true);
  });
});

describe("WellfoundProvider & JobrightProvider Execution", () => {
  it("WellfoundProvider completes safely and returns valid ProviderResult", async () => {
    const provider = new WellfoundProvider();
    const result = await provider.fetch();

    expect(result.providerKey).toBe(PlatformSource.WELLFOUND);
    expect(result.success).toBe(true);
    expect(Array.isArray(result.jobs)).toBe(true);
  }, 30000);

  it("JobrightProvider completes safely and returns valid ProviderResult", async () => {
    const provider = new JobrightProvider();
    const result = await provider.fetch();

    expect(result.providerKey).toBe(PlatformSource.JOBRIGHT);
    expect(result.success).toBe(true);
    expect(Array.isArray(result.jobs)).toBe(true);
  }, 30000);
});

describe("Database Bulk Ingestion & Deduplication", () => {
  const testJobUrl = "https://wellfound.com/jobs/test-harvest-dedup-101";

  afterAll(async () => {
    await db.jobPosting.deleteMany({
      where: { url: testJobUrl },
    });
    await db.opportunity.deleteMany({
      where: { canonicalAppUrl: testJobUrl },
    });
  });

  it("ingests a harvested Wellfound role and deduplicates on second ingestion", async () => {
    const { company, companySlug } = cleanCompanySlug("Acme AI Startup");
    const testJob: NormalizedJob = {
      providerKey: PlatformSource.WELLFOUND,
      company,
      companySlug,
      title: "Junior Cloud Developer",
      category: "BACKEND",
      jobType: "FULL_TIME",
      experienceLevel: "Junior (1-3 Yrs)",
      location: "Remote",
      isRemote: true,
      remoteScope: RemoteScope.WORLDWIDE,
      discoveryUrl: testJobUrl,
      canonicalAppUrl: testJobUrl,
      applicationUrlType: "AGGREGATOR_PAGE",
      verificationStatus: "VERIFIED_AGGREGATOR",
      postedAt: new Date(),
      opportunitySignals: ["FRESH"],
      rawDescription: "Junior Cloud Developer at Acme AI Startup.",
      hasFullText: false,
      technologies: ["Python", "AWS"],
    };

    // First ingestion: Should insert
    const run1 = await ingestNormalizedJobs([testJob]);
    expect(run1.insertedCount).toBe(1);

    const count1 = await db.jobPosting.count({ where: { url: testJobUrl } });
    expect(count1).toBe(1);

    // Second ingestion: Upsert should update existing record without creating a duplicate
    const run2 = await ingestNormalizedJobs([testJob]);
    expect(run2.insertedCount).toBe(1);

    const count2 = await db.jobPosting.count({ where: { url: testJobUrl } });
    expect(count2).toBe(1);
  });
});
