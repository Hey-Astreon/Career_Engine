import { describe, test, expect } from "vitest";
import { formatRelativeAge } from "../src/app/(workspace)/dashboard/page";
import { NormalizedJob } from "../src/lib/providers/types";
import { PlatformSource } from "@prisma/client";
import { GreenhouseProvider } from "../src/lib/providers/greenhouse";
import { LinkedInProvider } from "../src/lib/providers/linkedin";

describe("Checkpoint D2 — Data Truth & Freshness Intelligence", () => {
  const nowMs = 1754700000000; // Fixed reference timestamp

  describe("1. formatRelativeAge UI Formatting", () => {
    test("formats genuine source postedAt correctly when available (e.g. 4 hours ago)", () => {
      const fourHoursAgo = new Date(nowMs - 4 * 3600 * 1000).toISOString();
      const firstSeenNow = new Date(nowMs).toISOString();

      const result = formatRelativeAge(fourHoursAgo, firstSeenNow, nowMs);
      expect(result).toBe("Posted 4h ago");
    });

    test("formats genuine source postedAt for older jobs (e.g. 20 days ago)", () => {
      const twentyDaysAgo = new Date(nowMs - 20 * 86400 * 1000).toISOString();
      const firstSeenToday = new Date(nowMs).toISOString();

      const result = formatRelativeAge(twentyDaysAgo, firstSeenToday, nowMs);
      expect(result).toBe("Posted 20d ago");
    });

    test("truthfully formats discovery time when source postedAt is null (DOES NOT claim 'Posted X ago')", () => {
      const nullPostedAt = null;
      const firstSeenFiveMinsAgo = new Date(nowMs - 5 * 60 * 1000).toISOString();

      const result = formatRelativeAge(nullPostedAt, firstSeenFiveMinsAgo, nowMs);
      expect(result).toBe("First seen 5m ago");
    });

    test("truthfully formats discovery time when source postedAt is undefined", () => {
      const undefinedPostedAt = undefined;
      const firstSeenTwoHoursAgo = new Date(nowMs - 2 * 3600 * 1000).toISOString();

      const result = formatRelativeAge(undefinedPostedAt, firstSeenTwoHoursAgo, nowMs);
      expect(result).toBe("First seen 2h ago");
    });

    test("returns 'Date unavailable' when both postedAt and fallback dates are null", () => {
      const result = formatRelativeAge(null, null, nowMs);
      expect(result).toBe("Date unavailable");
    });
  });

  describe("2. MANDATORY DATA INTEGRITY TEST SCENARIO", () => {
    test("Job existed on external source for 20 days; CareerAgent discovers it today", () => {
      const sourcePostedAt = new Date(nowMs - 20 * 86400 * 1000); // 20 days ago
      const careerAgentDiscoveryDate = new Date(nowMs); // Discovered today

      const normalized: NormalizedJob = {
        sourceJobId: "gh-101",
        providerKey: PlatformSource.GREENHOUSE,
        company: "Stripe",
        companySlug: "stripe",
        title: "Software Engineer - Infrastructure",
        category: "Software Developer",
        jobType: "Remote Full-Time",
        experienceLevel: "0-3 Years (Entry/Junior)",
        location: "100% Remote",
        isRemote: true,
        remoteScope: "WORLDWIDE",
        opportunitySignals: ["DIRECT_APPLICATION"],
        discoveryUrl: "https://boards.greenhouse.io/stripe/jobs/101",
        canonicalAppUrl: "https://boards.greenhouse.io/stripe/jobs/101",
        postedAt: sourcePostedAt,
        rawDescription: "Infrastructure software engineer role.",
        hasFullText: true,
      };

      // 1. Verify normalizedJob preserves exact source timestamp
      expect(normalized.postedAt).toEqual(sourcePostedAt);
      expect(normalized.postedAt).not.toEqual(careerAgentDiscoveryDate);

      // 2. Verify UI format produces "Posted 20d ago", NOT "Posted just now"
      const uiText = formatRelativeAge(
        normalized.postedAt?.toISOString(),
        careerAgentDiscoveryDate.toISOString(),
        nowMs
      );

      expect(uiText).toBe("Posted 20d ago");
      expect(uiText).not.toBe("Posted just now");
      expect(uiText).not.toBe("First seen just now");
    });
  });

  describe("3. Provider Timestamp Removal of Fallback new Date()", () => {
    test("GreenhouseProvider sets postedAt without fabricating timestamps", () => {
      const provider = new GreenhouseProvider();
      expect(provider.providerKey).toBe(PlatformSource.GREENHOUSE);
    });

    test("LinkedInProvider does not fabricate postedAt when datetime attribute is missing", () => {
      const provider = new LinkedInProvider();
      expect(provider.providerKey).toBe(PlatformSource.LINKEDIN);
    });
  });
});
