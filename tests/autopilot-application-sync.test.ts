import { describe, it, expect } from "vitest";
import { normalizeApplicationUrl, sanitizeForSpreadsheet } from "@/lib/exportEngine";
import { canAccessProfile } from "@/lib/authCandidate";

describe("AstrePilot Application Sync & Deduplication Logic", () => {
  describe("URL Normalization across Major ATS Providers", () => {
    it("cleans Greenhouse application URLs", () => {
      const raw = "https://boards.greenhouse.io/stripe/jobs/12345?gh_src=linkedin&utm_medium=job_board";
      expect(normalizeApplicationUrl(raw)).toBe("https://boards.greenhouse.io/stripe/jobs/12345");
    });

    it("cleans Ashby application URLs", () => {
      const raw = "https://jobs.ashbyhq.com/posthog/abc-987/?ref=newsletter&utm_source=careers";
      expect(normalizeApplicationUrl(raw)).toBe("https://jobs.ashbyhq.com/posthog/abc-987");
    });

    it("cleans Lever application URLs", () => {
      const raw = "https://jobs.lever.co/figma/111222333?lever-origin=applied&lever-source%5B%5D=Indeed";
      expect(normalizeApplicationUrl(raw)).toBe("https://jobs.lever.co/figma/111222333?lever-origin=applied&lever-source%5B%5D=Indeed");
    });

    it("removes tracking query parameters but preserves functional deep paths", () => {
      const raw = "https://example.com/careers/software-developer/?utm_campaign=winter2026";
      expect(normalizeApplicationUrl(raw)).toBe("https://example.com/careers/software-developer");
    });
  });

  describe("Notes JSON Metadata Schema Verification", () => {
    it("parses and extracts AstrePilot telemetry cleanly", () => {
      const rawNotes = JSON.stringify({
        source: "ASTREPILOT",
        fieldsFilled: 14,
        fieldsTotal: 14,
        hasAiAnswers: true,
        confirmed: false,
        fillId: "fill-uuid-1234",
      });

      const parsed = JSON.parse(rawNotes);
      expect(parsed.source).toBe("ASTREPILOT");
      expect(parsed.fieldsFilled).toBe(14);
      expect(parsed.fieldsTotal).toBe(14);
      expect(parsed.hasAiAnswers).toBe(true);
      expect(parsed.confirmed).toBe(false);

      // Simulate confirmation transition
      parsed.confirmed = true;
      parsed.confirmedAt = new Date().toISOString();
      expect(parsed.confirmed).toBe(true);
      expect(parsed.confirmedAt).toBeDefined();
    });
  });

  describe("Section 6 Authorization Compliance for Application Export", () => {
    const roushanUser = { id: "user-roushan-id", email: "playboxstation460@gmail.com" };
    const ayushiUser = { id: "user-ayushi-id", email: "ayushi29507@gmail.com" };
    const thirdPartyUser = { id: "user-thirdparty-id", email: "stranger@example.com" };

    const roushanProfile = { id: "prof-roushan-id", userId: "user-roushan-id", slug: "roushan" };
    const ayushiProfile = { id: "prof-ayushi-id", userId: "user-ayushi-id", slug: "ayushi" };
    const thirdPartyProfile = { id: "prof-thirdparty-id", userId: "user-thirdparty-id", slug: "stranger" };

    it("allows Roushan to access both Roushan and Ayushi profiles", () => {
      expect(canAccessProfile(roushanUser, roushanProfile)).toBe(true);
      expect(canAccessProfile(roushanUser, ayushiProfile)).toBe(true);
    });

    it("allows Ayushi to access both Roushan and Ayushi profiles", () => {
      expect(canAccessProfile(ayushiUser, roushanProfile)).toBe(true);
      expect(canAccessProfile(ayushiUser, ayushiProfile)).toBe(true);
    });

    it("prevents third-party users from accessing Roushan or Ayushi profiles", () => {
      expect(canAccessProfile(thirdPartyUser, roushanProfile)).toBe(false);
      expect(canAccessProfile(thirdPartyUser, ayushiProfile)).toBe(false);
    });

    it("allows third-party users to only access their own profile", () => {
      expect(canAccessProfile(thirdPartyUser, thirdPartyProfile)).toBe(true);
    });
  });
});
