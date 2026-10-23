import { describe, it, expect } from "vitest";
import {
  normalizeQuestion,
  extractKeywords,
  inferQuestionCategory,
  calculateSimilarity,
  interpolateTemplateSlots,
  findBestVaultMatch,
  VaultEntry,
} from "../src/lib/autopilot/qaVaultEngine";
import { ROUSHAN_KUMAR_STARTER_VAULT } from "../src/lib/autopilot/qaVaultSeed";

describe("AstrePilot Q&A Vault Engine", () => {
  describe("normalizeQuestion()", () => {
    it("lowercases, removes punctuation, and standardizes technical abbreviations", () => {
      const q = "What is your experience with React.js, TS, and PostgreSQL???";
      const normalized = normalizeQuestion(q);
      expect(normalized).toContain("react");
      expect(normalized).toContain("typescript");
      expect(normalized).toContain("postgres");
      expect(normalized).not.toContain("?");
    });

    it("handles compensation and salary synonyms", () => {
      expect(normalizeQuestion("What is your expected CTC / compensation?")).toContain("salary");
    });
  });

  describe("extractKeywords()", () => {
    it("filters common English stop words and duplicates", () => {
      const keywords = extractKeywords("Why do you want to work at our company and join the team?");
      expect(keywords).toContain("work");
      expect(keywords).toContain("company");
      expect(keywords).toContain("join");
      expect(keywords).toContain("team");
      expect(keywords).not.toContain("do");
      expect(keywords).not.toContain("you");
      expect(keywords).not.toContain("the");
    });
  });

  describe("inferQuestionCategory()", () => {
    it("correctly infers MOTIVATION questions", () => {
      expect(inferQuestionCategory("Why do you want to work here?")).toBe("MOTIVATION");
      expect(inferQuestionCategory("What attracted you to our company mission?")).toBe("MOTIVATION");
    });

    it("correctly infers TECHNICAL questions", () => {
      expect(inferQuestionCategory("Describe a challenging technical problem you solved.")).toBe("TECHNICAL");
      expect(inferQuestionCategory("What experience do you have with distributed systems and APIs?")).toBe("TECHNICAL");
    });

    it("correctly infers LOGISTICS questions", () => {
      expect(inferQuestionCategory("What is your notice period?")).toBe("LOGISTICS");
      expect(inferQuestionCategory("When is your earliest possible start date?")).toBe("LOGISTICS");
      expect(inferQuestionCategory("Are you open to remote or hybrid work?")).toBe("LOGISTICS");
    });

    it("correctly infers COMPENSATION questions", () => {
      expect(inferQuestionCategory("What are your salary expectations?")).toBe("COMPENSATION");
      expect(inferQuestionCategory("What is your desired annual compensation?")).toBe("COMPENSATION");
    });

    it("correctly infers BEHAVIORAL questions", () => {
      expect(inferQuestionCategory("Tell us about a time you handled a disagreement with a team member.")).toBe("BEHAVIORAL");
    });

    it("falls back to GENERAL for unclassified open-ended questions", () => {
      expect(inferQuestionCategory("Tell us something interesting that is not on your resume.")).toBe("GENERAL");
    });
  });

  describe("calculateSimilarity()", () => {
    it("returns 1.0 for identical questions", () => {
      const { score } = calculateSimilarity(
        "Why do you want to work at Stripe?",
        "Why do you want to work at Stripe?"
      );
      expect(score).toBe(1.0);
    });

    it("returns a high similarity score for semantic variations of the same intent", () => {
      const { score, overlapTokens } = calculateSimilarity(
        "Why are you interested in joining our team?",
        "Why do you want to work at our company?",
        ["why", "want", "work", "company", "team"]
      );
      expect(score).toBeGreaterThanOrEqual(0.65);
      expect(overlapTokens).toContain("team");
    });

    it("returns a low score for completely unrelated questions", () => {
      const { score } = calculateSimilarity(
        "What is your salary expectation?",
        "Describe a time you handled a conflict in your team."
      );
      expect(score).toBeLessThan(0.35);
    });
  });

  describe("interpolateTemplateSlots()", () => {
    it("interpolates {{COMPANY}} and {{ROLE}} placeholders", () => {
      const template = "I am excited to join {{COMPANY}} as a {{ROLE}} to build scalable systems.";
      const result = interpolateTemplateSlots(template, {
        company: "Stripe",
        jobTitle: "Full-Stack Developer",
      });
      expect(result).toBe("I am excited to join Stripe as a Full-Stack Developer to build scalable systems.");
    });

    it("provides clean fallbacks when company or role is omitted", () => {
      const template = "I want to bring my skills to {{COMPANY}} for {{ROLE}}.";
      const result = interpolateTemplateSlots(template, {});
      expect(result).toBe("I want to bring my skills to your team for this role.");
    });
  });

  describe("findBestVaultMatch()", () => {
    const mockVault: VaultEntry[] = ROUSHAN_KUMAR_STARTER_VAULT.map((entry, idx) => ({
      id: `vault-${idx}`,
      profileId: "profile-roushan",
      category: entry.category,
      questionPattern: entry.questionPattern,
      keywords: extractKeywords(entry.questionPattern),
      answerText: entry.answerText,
      isFavorite: entry.isFavorite,
      timesUsed: 0,
    }));

    it("finds a high-confidence match for motivation question and interpolates company", () => {
      const match = findBestVaultMatch(
        "Why do you want to join Figma?",
        mockVault,
        { company: "Figma", jobTitle: "Systems Architect" }
      );

      expect(match.matched).toBe(true);
      expect(match.confidence).toBeGreaterThanOrEqual(70);
      expect(match.interpolatedAnswer).toContain("Figma");
      expect(match.source).toBe("vault");
      expect(match.category).toBe("MOTIVATION");
    });

    it("finds a high-confidence match for technical challenge", () => {
      const match = findBestVaultMatch(
        "Describe a challenging technical problem you have solved in the past.",
        mockVault,
        { company: "Linear" }
      );

      expect(match.matched).toBe(true);
      expect(match.interpolatedAnswer).toContain("AstreWork");
      expect(match.interpolatedAnswer).toContain("19+ distinct ATS feeds");
      expect(match.category).toBe("TECHNICAL");
    });

    it("finds a high-confidence match for notice period", () => {
      const match = findBestVaultMatch(
        "What is your notice period / earliest possible start date?",
        mockVault
      );

      expect(match.matched).toBe(true);
      expect(match.interpolatedAnswer?.toLowerCase()).toContain("immediate (0 to 14 days)");
      expect(match.category).toBe("LOGISTICS");
    });

    it("returns matched=false when question is completely outside vault scope", () => {
      const match = findBestVaultMatch(
        "What is your favorite culinary dish and how do you prepare it?",
        mockVault
      );

      expect(match.matched).toBe(false);
      expect(match.confidence).toBeLessThan(50);
      expect(match.interpolatedAnswer).toBeNull();
    });

    it("handles empty vault gracefully", () => {
      const match = findBestVaultMatch("Why do you want to work here?", []);
      expect(match.matched).toBe(false);
      expect(match.confidence).toBe(0);
    });
  });
});
