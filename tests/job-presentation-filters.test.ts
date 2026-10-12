import { describe, expect, it } from "vitest";
import { DEFAULT_HERO_FILTERS, inferRequiredExperienceYears, isWithinPostingWindow, matchesCareerSearch, matchesExperienceFilter, matchesExperienceRange, matchesPostingWindowFilter, matchesRemoteRoleView, paginateCareerFeed, sortCareerJobs } from "@/lib/jobPresentation";

describe("job presentation hero filters", () => {
  it("starts discovery from the full active feed and applies experience/date limits only when selected", () => {
    expect(DEFAULT_HERO_FILTERS).toEqual({ experienceRange: "ANY", maximumPostedDays: "ANY", remoteRoleView: "ALL" });
    expect(matchesExperienceFilter("Senior Engineer", "", "ANY")).toBe(true);
    expect(matchesPostingWindowFilter(null, "ANY")).toBe(true);
  });

  it("keeps stated early-career requirements within their selected maximum", () => {
    expect(inferRequiredExperienceYears("Software Engineer Intern")).toBe(0);
    expect(matchesExperienceRange("Junior Backend Engineer", "Requires 2 years of experience", 2)).toBe(true);
    expect(matchesExperienceRange("Junior Backend Engineer", "Requires 2 years of experience", 1)).toBe(false);
    expect(matchesExperienceRange("Senior Engineer", "", 3)).toBe(false);
  });

  it("separates internships from remote jobs without changing the stored feed", () => {
    expect(matchesRemoteRoleView("Frontend Intern", "", "INTERNSHIPS")).toBe(true);
    expect(matchesRemoteRoleView("Frontend Intern", "", "JOBS")).toBe(false);
    expect(matchesRemoteRoleView("Frontend Engineer", "", "JOBS")).toBe(true);
  });

  it("uses only a provider-supplied posting date for maximum-age filtering", () => {
    const now = new Date("2026-08-26T12:00:00.000Z").getTime();
    expect(isWithinPostingWindow("2026-08-20T12:00:00.000Z", 7, now)).toBe(true);
    expect(isWithinPostingWindow("2026-08-18T12:00:00.000Z", 7, now)).toBe(false);
    expect(isWithinPostingWindow(null, 7, now)).toBe(false);
  });

  it("uses role-title-only matching for seniority searches while retaining skill search", () => {
    const earlyCareerRole = {
      title: "Application Engineer Refrigeration India",
      company: "Example Systems",
      rawDescription: "Partner with senior engineers and technical leads on customer projects.",
    };

    expect(matchesCareerSearch(earlyCareerRole, "senior")).toBe(false);
    expect(matchesCareerSearch({ ...earlyCareerRole, title: "Senior Application Engineer" }, "senior")).toBe(true);
    expect(matchesCareerSearch(earlyCareerRole, "technical")).toBe(true);
  });

  it("returns a bounded page window instead of rendering every role in a large feed", () => {
    const roles = Array.from({ length: 125 }, (_, index) => `role-${index + 1}`);
    const thirdPage = paginateCareerFeed(roles, 3, 50);

    expect(thirdPage.totalPages).toBe(3);
    expect(thirdPage.currentPage).toBe(3);
    expect(thirdPage.items).toHaveLength(25);
    expect(thirdPage.items[0]).toBe("role-101");
    expect(paginateCareerFeed(roles, 99, 50).currentPage).toBe(3);
  });

  it("sorts jobs by recently posted, match score, company, title, and oldest posted", () => {
    const sampleJobs = [
      { id: "1", title: "React Developer", company: "Zeta Corp", postedAt: "2026-08-20T00:00:00.000Z" },
      { id: "2", title: "Backend Engineer", company: "Alpha Labs", postedAt: "2026-08-28T00:00:00.000Z" },
      { id: "3", title: "Full Stack Engineer", company: "Beta Inc", postedAt: "2026-08-25T00:00:00.000Z" },
    ];

    const scoresMap = {
      "1": { score: 92, eligible: true },
      "2": { score: 65, eligible: true },
      "3": { score: 85, eligible: true },
    };

    // RECENT
    const recent = sortCareerJobs(sampleJobs, "RECENT");
    expect(recent.map((j) => j.id)).toEqual(["2", "3", "1"]);

    // OLDEST
    const oldest = sortCareerJobs(sampleJobs, "OLDEST");
    expect(oldest.map((j) => j.id)).toEqual(["1", "3", "2"]);

    // MATCH_SCORE
    const scoreSorted = sortCareerJobs(sampleJobs, "MATCH_SCORE", scoresMap);
    expect(scoreSorted.map((j) => j.id)).toEqual(["1", "3", "2"]);

    // COMPANY_ASC
    const companySorted = sortCareerJobs(sampleJobs, "COMPANY_ASC");
    expect(companySorted.map((j) => j.company)).toEqual(["Alpha Labs", "Beta Inc", "Zeta Corp"]);

    // EARLY_BIRD (Internship > 0-Exp > 0-1 Exp with freshness multiplier)
    const tieredJobs = [
      { id: "10", title: "Junior Backend Engineer", company: "Company A", postedAt: new Date(Date.now() - 5 * 3600000).toISOString() },
      { id: "20", title: "Software Engineer Intern", company: "Company B", postedAt: new Date(Date.now() - 20 * 3600000).toISOString() },
      { id: "30", title: "Entry Level Developer", company: "Company C", postedAt: new Date(Date.now() - 2 * 3600000).toISOString() },
    ];
    // Tier 1 Internship (20): 1000 * 3 = 3000
    // Tier 2 Entry Level (30): 750 * 3 = 2250
    // Tier 3 Junior (10): 500 * 3 = 1500
    const earlyBird = sortCareerJobs(tieredJobs, "EARLY_BIRD");
    expect(earlyBird.map((j) => j.id)).toEqual(["20", "30", "10"]);
  });
});

