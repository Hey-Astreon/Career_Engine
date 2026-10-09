/**
 * Tests for src/lib/providers/normalize.ts
 *
 * Covers:
 * - Valid developer roles
 * - Non-developer roles (excluded)
 * - Remote vs on-site/hybrid
 * - Seniority handling
 * - 0-3 year target cases
 * - Remote region/location handling
 * - Category classification
 * - Experience level classification
 * - Company slug cleaning
 */

import { describe, it, expect } from "vitest";
import {
  isStrictlyRemoteDeveloperRole,
  determineCategory,
  determineExperienceLevel,
  determineJobType,
  cleanCompanySlug,
  isOlderThanMaxPostingAge,
  MAX_POSTING_AGE_DAYS,
  sanitizeRoleTitle,
} from "@/lib/providers/normalize";

// ─── isStrictlyRemoteDeveloperRole ───────────────────────────────────────────

describe("isStrictlyRemoteDeveloperRole – valid developer roles", () => {
  it("accepts Software Engineer (remote)", () => {
    expect(isStrictlyRemoteDeveloperRole("Software Engineer", "Remote", "")).toBe(true);
  });

  it("accepts Backend Developer (remote)", () => {
    expect(isStrictlyRemoteDeveloperRole("Backend Developer", "Remote Worldwide", "")).toBe(true);
  });

  it("accepts Frontend Developer (remote)", () => {
    expect(isStrictlyRemoteDeveloperRole("Frontend Developer", "Work from home", "")).toBe(true);
  });

  it("accepts Full Stack Developer (remote)", () => {
    expect(isStrictlyRemoteDeveloperRole("Full Stack Developer", "100% Remote", "")).toBe(true);
  });

  it("accepts React Developer (remote)", () => {
    expect(isStrictlyRemoteDeveloperRole("React Developer", "Remote", "")).toBe(true);
  });

  it("accepts AI Engineer (remote)", () => {
    expect(isStrictlyRemoteDeveloperRole("AI Engineer", "Remote", "")).toBe(true);
  });

  it("accepts DevOps Engineer (remote)", () => {
    expect(isStrictlyRemoteDeveloperRole("DevOps Engineer", "Remote (Worldwide)", "")).toBe(true);
  });

  it("accepts Mobile Developer (remote)", () => {
    expect(isStrictlyRemoteDeveloperRole("Mobile Developer", "Remote", "")).toBe(true);
  });

  it("accepts Machine Learning Engineer (remote)", () => {
    expect(isStrictlyRemoteDeveloperRole("Machine Learning Engineer", "Remote", "")).toBe(true);
  });

  it("accepts Platform Engineer (remote)", () => {
    expect(isStrictlyRemoteDeveloperRole("Platform Engineer", "Remote", "")).toBe(true);
  });

  it("accepts SRE (remote)", () => {
    expect(isStrictlyRemoteDeveloperRole("Site Reliability Engineer", "Telecommute", "")).toBe(true);
  });
});

describe("isStrictlyRemoteDeveloperRole – non-developer roles excluded", () => {
  it("rejects Account Executive", () => {
    expect(isStrictlyRemoteDeveloperRole("Account Executive", "Remote", "")).toBe(false);
  });

  it("rejects Recruiter", () => {
    expect(isStrictlyRemoteDeveloperRole("Recruiter", "Remote", "")).toBe(false);
  });

  it("rejects Product Manager", () => {
    expect(isStrictlyRemoteDeveloperRole("Product Manager", "Remote", "")).toBe(false);
  });

  it("rejects UX Designer", () => {
    expect(isStrictlyRemoteDeveloperRole("UX Designer", "Remote", "")).toBe(false);
  });

  it("rejects Sales Engineer", () => {
    expect(isStrictlyRemoteDeveloperRole("Sales Engineer", "Remote", "")).toBe(false);
  });

  it("rejects Customer Support Engineer", () => {
    expect(isStrictlyRemoteDeveloperRole("Customer Support Engineer", "Remote", "")).toBe(false);
  });

  it("rejects Copywriter", () => {
    expect(isStrictlyRemoteDeveloperRole("Copywriter", "Remote", "")).toBe(false);
  });

  it("rejects VP of Engineering (director-level exclusion)", () => {
    expect(isStrictlyRemoteDeveloperRole("VP of Engineering", "Remote", "")).toBe(false);
  });

  it("rejects Head of Product", () => {
    expect(isStrictlyRemoteDeveloperRole("Head of Product", "Remote", "")).toBe(false);
  });
});

describe("isStrictlyRemoteDeveloperRole – on-site and hybrid exclusion", () => {
  it("rejects on-site role (onsite keyword in location)", () => {
    expect(isStrictlyRemoteDeveloperRole("Software Engineer", "Onsite - San Francisco", "")).toBe(false);
  });

  it("rejects in-office role", () => {
    expect(isStrictlyRemoteDeveloperRole("Backend Developer", "In-office, NYC", "")).toBe(false);
  });

  it("rejects hybrid role", () => {
    expect(isStrictlyRemoteDeveloperRole("Frontend Developer", "Hybrid - 3 days in office", "")).toBe(false);
  });

  it("rejects when on-site keyword appears in description (not location)", () => {
    expect(
      isStrictlyRemoteDeveloperRole("Software Engineer", "Remote", "This is an onsite position in Austin")
    ).toBe(false);
  });

  it("rejects role with no remote keyword in location", () => {
    expect(isStrictlyRemoteDeveloperRole("Software Engineer", "New York, NY", "")).toBe(false);
  });

  it("accepts worldwide remote (no explicit 'remote' needed in desc if location has it)", () => {
    expect(isStrictlyRemoteDeveloperRole("Software Engineer", "Worldwide", "")).toBe(true);
  });

  it("accepts work from anywhere", () => {
    expect(isStrictlyRemoteDeveloperRole("Backend Developer", "Work from anywhere", "")).toBe(true);
  });
});

describe("isStrictlyRemoteDeveloperRole – seniority exclusion", () => {
  it("rejects Senior Software Engineer by title", () => {
    expect(isStrictlyRemoteDeveloperRole("Senior Software Engineer", "Remote", "")).toBe(false);
  });

  it("rejects Sr. Software Engineer by title (sr. abbreviation)", () => {
    expect(isStrictlyRemoteDeveloperRole("Sr. Software Engineer", "Remote", "")).toBe(false);
  });

  it("rejects Staff Engineer by title", () => {
    expect(isStrictlyRemoteDeveloperRole("Staff Engineer", "Remote", "")).toBe(false);
  });

  it("rejects Principal Engineer by title", () => {
    expect(isStrictlyRemoteDeveloperRole("Principal Engineer", "Remote", "")).toBe(false);
  });

  it("rejects Engineering Manager by title", () => {
    expect(isStrictlyRemoteDeveloperRole("Engineering Manager", "Remote", "")).toBe(false);
  });

  it("rejects Lead Engineer by title", () => {
    expect(isStrictlyRemoteDeveloperRole("Lead Engineer", "Remote", "")).toBe(false);
  });

  it("rejects Director of Engineering by title", () => {
    expect(isStrictlyRemoteDeveloperRole("Director of Engineering", "Remote", "")).toBe(false);
  });

  it("rejects role when description contains 5+ years requirement", () => {
    const desc = "You will need 5+ years of hands-on backend experience with distributed systems.";
    expect(isStrictlyRemoteDeveloperRole("Software Engineer", "Remote", desc)).toBe(false);
  });

  it("rejects role when description contains 8+ years requirement", () => {
    const desc = "We require 8+ years of experience in software development.";
    expect(isStrictlyRemoteDeveloperRole("Software Engineer", "Remote", desc)).toBe(false);
  });

  it("rejects role when description contains 3+ years requirement (like Coinbase Product Security Engineer)", () => {
    const desc = "3+ years of experience in application security, penetration testing, or offensive security.";
    expect(isStrictlyRemoteDeveloperRole("Product Security Engineer", "Remote", desc)).toBe(false);
  });

  it("rejects role when description requires mentoring junior engineers", () => {
    const desc = "Mentor junior security engineers on integrating AI into offensive security workflows.";
    expect(isStrictlyRemoteDeveloperRole("Product Security Engineer", "Remote", desc)).toBe(false);
  });

  it("accepts plain Software Engineer with 1–3 years requirement in description", () => {
    const desc = "1-3 years of experience with React and Node.js. Entry-level friendly team.";
    expect(isStrictlyRemoteDeveloperRole("Software Engineer", "Remote", desc)).toBe(true);
  });
});

describe("isStrictlyRemoteDeveloperRole – 0-3 year target cases", () => {
  it("accepts Junior Developer title (remote)", () => {
    expect(isStrictlyRemoteDeveloperRole("Junior Software Developer", "Remote", "")).toBe(true);
  });

  it("accepts intern role (title has 'intern' as word boundary)", () => {
    // intern contains 'intern' keyword — but title must also match a SWE keyword
    // 'Software Developer Intern' should pass (has 'developer')
    expect(isStrictlyRemoteDeveloperRole("Software Developer Intern", "Remote", "")).toBe(true);
  });

  it("accepts entry-level with engineer title", () => {
    const desc = "This is an entry-level position for new graduates.";
    expect(isStrictlyRemoteDeveloperRole("Software Engineer", "Remote", desc)).toBe(true);
  });

  it("accepts junior backend developer", () => {
    expect(isStrictlyRemoteDeveloperRole("Junior Backend Developer", "Remote", "")).toBe(true);
  });
});

describe("isStrictlyRemoteDeveloperRole – 21-day posting age ceiling", () => {
  it("accepts jobs posted within 21 days (e.g. 5 days ago)", () => {
    const fiveDaysAgo = new Date(Date.now() - 5 * 86400 * 1000);
    expect(isOlderThanMaxPostingAge(fiveDaysAgo, 21)).toBe(false);
    expect(isStrictlyRemoteDeveloperRole("Software Engineer", "Remote", "", fiveDaysAgo)).toBe(true);
  });

  it("accepts jobs posted exactly 21 days ago", () => {
    const twentyOneDaysAgo = new Date(Date.now() - 20.95 * 86400 * 1000);
    expect(isOlderThanMaxPostingAge(twentyOneDaysAgo, 21)).toBe(false);
    expect(isStrictlyRemoteDeveloperRole("Software Engineer", "Remote", "", twentyOneDaysAgo)).toBe(true);
  });

  it("rejects and discards jobs posted more than 21 days ago (e.g. 22 days ago)", () => {
    const twentyTwoDaysAgo = new Date(Date.now() - 22 * 86400 * 1000);
    expect(isOlderThanMaxPostingAge(twentyTwoDaysAgo, 21)).toBe(true);
    expect(isStrictlyRemoteDeveloperRole("Software Engineer", "Remote", "", twentyTwoDaysAgo)).toBe(false);
  });

  it("rejects jobs posted 60 days ago", () => {
    const sixtyDaysAgo = new Date(Date.now() - 60 * 86400 * 1000);
    expect(isOlderThanMaxPostingAge(sixtyDaysAgo, 21)).toBe(true);
    expect(isStrictlyRemoteDeveloperRole("Software Engineer", "Remote", "", sixtyDaysAgo)).toBe(false);
  });
});

// ─── determineExperienceLevel ─────────────────────────────────────────────────

describe("determineExperienceLevel", () => {
  it("classifies 'Senior' in title as Senior / Staff Level", () => {
    expect(determineExperienceLevel("Senior Software Engineer")).toBe("Senior / Staff Level (5+ Yrs)");
  });

  it("classifies 'Staff Engineer' as Senior / Staff Level", () => {
    expect(determineExperienceLevel("Staff Engineer")).toBe("Senior / Staff Level (5+ Yrs)");
  });

  it("classifies 'intern' in description as Fresher / Entry Level", () => {
    expect(determineExperienceLevel("Software Engineer", "This is an internship position for students.")).toBe(
      "Fresher / Entry Level (0-1 Yr)"
    );
  });

  it("classifies 'fresher' in description as Fresher / Entry Level", () => {
    expect(determineExperienceLevel("Software Engineer", "Open to freshers and new graduates.")).toBe(
      "Fresher / Entry Level (0-1 Yr)"
    );
  });

  it("classifies 'junior' in description as Junior (1-3 Yrs)", () => {
    expect(determineExperienceLevel("Software Engineer", "Looking for a junior engineer with 1-2 years.")).toBe(
      "Junior (1-3 Yrs)"
    );
  });

  it("does NOT classify contextual mention 'work with mid-level engineers' as Mid-Level", () => {
    expect(
      determineExperienceLevel(
        "Software Engineer",
        "You will work with mid-level engineers and senior mentors to build backend APIs."
      )
    ).not.toBe("Mid-Level (2-4 Yrs)");
  });

  it("classifies explicit mid-level position description as Mid-Level", () => {
    expect(
      determineExperienceLevel(
        "Software Engineer",
        "This is a mid-level position requiring 2-4 years of experience."
      )
    ).toBe("Mid-Level (2-4 Yrs)");
  });

  it("prioritizes explicit numeric experience 1-3 years as Junior", () => {
    expect(determineExperienceLevel("Software Engineer", "Requires 1-3 years of experience.")).toBe("Junior (1-3 Yrs)");
  });

  it("classifies '3+ years' in description as Mid-Level", () => {
    expect(determineExperienceLevel("Software Engineer", "You have 3+ years of backend experience.")).toBe(
      "Mid-Level (2-4 Yrs)"
    );
  });

  it("classifies 5+ years as Senior", () => {
    expect(determineExperienceLevel("Software Engineer", "Requires 5+ years of experience in distributed systems.")).toBe(
      "Senior / Staff Level (5+ Yrs)"
    );
  });

  it("defaults to 0-3 Years when no signal found", () => {
    expect(determineExperienceLevel("Software Engineer", "")).toBe("0-3 Years (Entry/Junior)");
  });
});

// ─── determineCategory ───────────────────────────────────────────────────────

describe("determineCategory", () => {
  it("classifies React developer by title", () => {
    expect(determineCategory("React Developer")).toBe("React Developer");
  });

  it("classifies Python developer by title", () => {
    expect(determineCategory("Python Developer")).toBe("Python Developer");
  });

  it("classifies AI/ML Engineer by title", () => {
    expect(determineCategory("Machine Learning Engineer")).toBe("AI / ML Engineer");
  });

  it("classifies DevOps by title", () => {
    expect(determineCategory("DevOps Engineer")).toBe("DevOps Engineer");
  });

  it("classifies Full Stack by title", () => {
    expect(determineCategory("Full Stack Developer")).toBe("Full Stack Developer");
  });

  it("classifies Backend Developer by title", () => {
    expect(determineCategory("Backend Developer")).toBe("Backend Developer");
  });

  it("classifies Frontend Developer by title", () => {
    expect(determineCategory("Frontend Developer")).toBe("Frontend Developer");
  });

  it("falls back to Software Developer for generic title", () => {
    expect(determineCategory("Software Engineer", "")).toBe("Software Developer");
  });

  it("classifies by description when title is generic (react in desc)", () => {
    expect(determineCategory("Software Engineer", "You will build React components and use React hooks.")).toBe(
      "React Developer"
    );
  });
});

// ─── determineJobType ─────────────────────────────────────────────────────────

describe("determineJobType", () => {
  it("classifies internship by title keyword", () => {
    expect(determineJobType("Software Engineer Intern")).toBe("Remote Internship");
  });

  it("classifies contract by title keyword", () => {
    expect(determineJobType("Software Engineer (Contract)")).toBe("Remote Contract");
  });

  it("classifies full-time by default", () => {
    expect(determineJobType("Software Engineer")).toBe("Remote Full-Time");
  });

  it("classifies freelance as contract", () => {
    expect(determineJobType("Freelance Developer")).toBe("Remote Contract");
  });
});

// ─── cleanCompanySlug ─────────────────────────────────────────────────────────

describe("cleanCompanySlug", () => {
  it("strips Inc. suffix", () => {
    const { companySlug } = cleanCompanySlug("Acme Inc.");
    expect(companySlug).not.toContain("inc");
  });

  it("strips LLC suffix", () => {
    const { companySlug } = cleanCompanySlug("Widgets LLC");
    expect(companySlug).not.toContain("llc");
  });

  it("produces lowercase hyphenated slug", () => {
    const { companySlug } = cleanCompanySlug("Stripe Inc.");
    expect(companySlug).toBe("stripe");
  });

  it("handles empty input gracefully", () => {
    const { company, companySlug } = cleanCompanySlug("");
    expect(company).toBe("Unknown Company");
    expect(companySlug).toBe("unknown-company");
  });

  it("preserves company name with proper casing", () => {
    const { company } = cleanCompanySlug("github");
    expect(company).toBe("Github");
  });

  it("handles multi-word companies", () => {
    const { companySlug } = cleanCompanySlug("Hacker News Hiring");
    expect(companySlug).toBe("hacker-news-hiring");
  });
});

// ─── sanitizeRoleTitle ────────────────────────────────────────────────────────

describe("sanitizeRoleTitle", () => {
  it("removes Remote prefix", () => {
    expect(sanitizeRoleTitle("Remote - Software Engineer")).toBe("Software Engineer");
    expect(sanitizeRoleTitle("Remote: Backend Developer")).toBe("Backend Developer");
    expect(sanitizeRoleTitle("(Remote) Frontend Engineer")).toBe("Frontend Engineer");
    expect(sanitizeRoleTitle("Remote — Full Stack Developer")).toBe("Full Stack Developer");
  });

  it("removes Hiring prefix", () => {
    expect(sanitizeRoleTitle("Hiring: Data Engineer")).toBe("Data Engineer");
    expect(sanitizeRoleTitle("We're hiring engineers to join our distributed engineering team: DevOps Engineer")).toBe("DevOps Engineer");
  });

  it("removes URLs at the start", () => {
    expect(sanitizeRoleTitle("https://jobs.lever.co/company Software Engineer")).toBe("Software Engineer");
  });

  it("extracts role from plain text if title is a URL", () => {
    expect(sanitizeRoleTitle("https://jobs.lever.co/company/1234", "We are looking for a Senior Backend Engineer to join us")).toBe("Backend Engineer");
  });

  it("takes the last segment if title is too long and contains a colon", () => {
    const longTitle = "ACME Corporation is hiring engineers to join our distributed engineering team: DevOps Engineer";
    expect(sanitizeRoleTitle(longTitle)).toBe("DevOps Engineer");
  });

  it("removes [Remote] tags anywhere", () => {
    expect(sanitizeRoleTitle("Software Engineer [Remote]")).toBe("Software Engineer");
    expect(sanitizeRoleTitle("Software Engineer (Remote)")).toBe("Software Engineer");
    expect(sanitizeRoleTitle("Software Engineer - Remote")).toBe("Software Engineer");
  });
});
