import { describe, it, expect } from "vitest";
import {
  getMasterResumeBaseline,
  optimizeResumeForJob,
  renderResumeMarkdown,
  renderResumePlaintext,
  injectKeywordIntoResume,
} from "../src/lib/ai/resumeOptimizer";

describe("ATS Resume Optimizer & 1-Page Builder", () => {
  describe("1. Master Baseline Integrity", () => {
    it("returns complete 6-section baseline for Roushan Kumar", () => {
      const roushan = getMasterResumeBaseline("roushan");

      expect(roushan.header.fullName).toBe("ROUSHAN KUMAR");
      expect(roushan.header.email).toBe("roushanraut404@gmail.com");
      expect(roushan.header.portfolioUrl).toBe("https://astreon.me");
      expect(roushan.header.githubUrl).toBe("https://github.com/Hey-Astreon");

      // 6 skill categories
      expect(roushan.skills.length).toBe(6);

      // 3 flagship projects
      expect(roushan.projects.length).toBe(3);
      const titles = roushan.projects.map((p) => p.title);
      expect(titles.some((t) => t.includes("Astra Vision"))).toBe(true);
      expect(titles.some((t) => t.includes("AstreWork"))).toBe(true);
      expect(titles.some((t) => t.includes("Alyra Lock"))).toBe(true);

      // 3 technical simulations
      expect(roushan.simulations.length).toBe(3);
      const simCompanies = roushan.simulations.map((s) => s.company);
      expect(simCompanies.some((c) => c.includes("Commonwealth Bank"))).toBe(true);
      expect(simCompanies.some((c) => c.includes("Y Combinator"))).toBe(true);
      expect(simCompanies.some((c) => c.includes("Walmart"))).toBe(true);

      // Education
      expect(roushan.education.degree).toContain("Bachelor of Computer Applications (BCA)");
      expect(roushan.education.university).toContain("Amity University");

      // Verify zero mentions of prohibited terms
      const jsonStr = JSON.stringify(roushan).toLowerCase();
      expect(jsonStr).not.toContain("coco ai");
    });

    it("returns complete 6-section baseline for Ayushi Raj", () => {
      const ayushi = getMasterResumeBaseline("ayushi");

      expect(ayushi.header.fullName).toBe("AYUSHI RAJ");
      expect(ayushi.header.email).toBe("ayushi29507@gmail.com");
      expect(ayushi.header.portfolioUrl).toBe("https://ayushiraj.me");
      expect(ayushi.header.githubUrl).toBe("https://github.com/Silenttears-cloud");
      expect(ayushi.header.linkedinUrl).toBe("https://www.linkedin.com/in/alrya404/");

      expect(ayushi.skills.length).toBe(6);
      expect(ayushi.projects.length).toBe(3);
      expect(ayushi.projects.map((p) => p.title).some((t) => t.includes("AstreWork"))).toBe(true);
      expect(ayushi.simulations.length).toBe(3);
      expect(ayushi.education.degree).toContain("Bachelor of Computer Applications (BCA)");

      const jsonStr = JSON.stringify(ayushi).toLowerCase();
      expect(jsonStr).not.toContain("coco ai");
    });
  });

  describe("2. Job-Tailored Optimization", () => {
    it("optimizes resume for a backend / distributed systems role", async () => {
      const jobTitle = "Backend Distributed Systems Engineer";
      const company = "Supabase";
      const jobDesc = `
        We are looking for a Backend Engineer proficient in PostgreSQL, Python FastAPI, REST APIs,
        Docker, and low-latency concurrent systems.
      `;

      const optimized = await optimizeResumeForJob("roushan", jobTitle, company, jobDesc);

      expect(optimized).toBeDefined();
      expect(optimized.targetRole).toBe(jobTitle);
      expect(optimized.targetCompany).toBe(company);
      expect(optimized.atsScore).toBeGreaterThanOrEqual(70);
      expect(optimized.matchedKeywords.length).toBeGreaterThan(0);

      // Summary must mention target company or role or stack
      expect(optimized.summary.length).toBeGreaterThan(100);

      // Must preserve all 6 skill categories and 3 projects
      expect(optimized.skills.length).toBe(6);
      expect(optimized.projects.length).toBe(3);
      expect(optimized.simulations.length).toBe(3);
    }, 60000);
  });

  describe("3. Markdown & Plaintext Export Renderers", () => {
    it("renders clean markdown containing all 6 resume sections", () => {
      const baseline = getMasterResumeBaseline("roushan");
      const md = renderResumeMarkdown(baseline);

      expect(md).toContain("# ROUSHAN KUMAR");
      expect(md).toContain("## PROFESSIONAL SUMMARY");
      expect(md).toContain("## TECHNICAL SKILLS");
      expect(md).toContain("## TECHNICAL PROJECTS");
      expect(md).toContain("## TECHNICAL SIMULATIONS & VIRTUAL EXPERIENCES");
      expect(md).toContain("## EDUCATION");
      expect(md).toContain("Astra Vision");
      expect(md).toContain("AstreWork");
      expect(md).toContain("Alyra Lock");
    });

    it("renders plain ASCII text with clean headers", () => {
      const baseline = getMasterResumeBaseline("ayushi");
      const plain = renderResumePlaintext(baseline);

      expect(plain).toContain("AYUSHI RAJ");
      expect(plain).toContain("PROFESSIONAL SUMMARY");
      expect(plain).toContain("TECHNICAL SKILLS");
      expect(plain).toContain("TECHNICAL PROJECTS");
      expect(plain).toContain("TECHNICAL SIMULATIONS & VIRTUAL EXPERIENCES");
      expect(plain).toContain("EDUCATION");
    });
  });

  describe("4. 1-Click Keyword Injector Engine", () => {
    it("injects database keyword into Databases & Caching category and updates matched lists", () => {
      const baseline = getMasterResumeBaseline("roushan");
      baseline.missingKeywords = ["DynamoDB", "Terraform"];
      baseline.matchedKeywords = ["Docker"];

      const updated = injectKeywordIntoResume(baseline, "DynamoDB");

      const dbCategory = updated.skills.find((s) => s.categoryName === "Databases & Caching");
      expect(dbCategory?.skillsText).toContain("DynamoDB");
      expect(updated.matchedKeywords).toContain("DynamoDB");
      expect(updated.missingKeywords).not.toContain("DynamoDB");
      expect(updated.atsScore).toBeGreaterThanOrEqual(70);
    });

    it("injects DevOps keyword into appropriate category", () => {
      const baseline = getMasterResumeBaseline("ayushi");
      baseline.missingKeywords = ["Terraform"];
      baseline.matchedKeywords = ["Docker"];

      const updated = injectKeywordIntoResume(baseline, "Terraform");

      const devopsCategory = updated.skills.find((s) => s.categoryName.includes("Cloud") || s.categoryName.includes("Security") || s.categoryName.includes("DevOps"));
      expect(devopsCategory?.skillsText).toContain("Terraform");
      expect(updated.matchedKeywords).toContain("Terraform");
      expect(updated.missingKeywords).not.toContain("Terraform");
    });

    it("injects Playwright into Autonomous Web Scraping / Browser Automation category", () => {
      const baseline = getMasterResumeBaseline("roushan");
      baseline.missingKeywords = ["Playwright", "Puppeteer"];
      baseline.matchedKeywords = ["Docker"];

      const updated = injectKeywordIntoResume(baseline, "Playwright");

      const scrapingCat = updated.skills.find((s) => s.categoryName.includes("Web Scraping") || s.categoryName.includes("Automation"));
      expect(scrapingCat?.skillsText).toContain("Playwright");
      expect(updated.matchedKeywords).toContain("Playwright");
      expect(updated.missingKeywords).not.toContain("Playwright");
    });
  });

  describe("5. Recruiter Psychology & Tech Stack Verification", () => {
    it("verifies Playwright and Puppeteer are present in core baselines", () => {
      const roushan = getMasterResumeBaseline("roushan");
      const ayushi = getMasterResumeBaseline("ayushi");

      const roushanSkills = roushan.skills.map((s) => s.skillsText).join(" ");
      expect(roushanSkills).toContain("Playwright");
      expect(roushanSkills).toContain("Puppeteer");

      const ayushiSkills = ayushi.skills.map((s) => s.skillsText).join(" ");
      expect(ayushiSkills).toContain("Playwright");
      expect(ayushiSkills).toContain("Puppeteer");
    });
  });
});

