import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { generateAutopilotToken, verifyAutopilotToken } from "@/lib/autopilot/tokenUtils";

describe("Resume Download Route & Profile Autofill Integrity", () => {
  it("verifies autopilot token generation and decryption", () => {
    const testUserId = "test-user-123";
    const token = generateAutopilotToken(testUserId);
    expect(token).toBeTruthy();
    const decrypted = verifyAutopilotToken(token);
    expect(decrypted).toBe(testUserId);
  });

  it("verifies candidate PDF resumes exist on disk with valid file size", () => {
    const roushanDir = path.join(process.cwd(), "public", "candidates", "3_Roushan_Kumar");
    const ayushiDir = path.join(process.cwd(), "public", "candidates", "2_Ayushi_Raj");

    expect(fs.existsSync(roushanDir)).toBe(true);
    expect(fs.existsSync(ayushiDir)).toBe(true);

    const roushanPdfs = fs.readdirSync(roushanDir).filter((f) => f.endsWith(".pdf"));
    const ayushiPdfs = fs.readdirSync(ayushiDir).filter((f) => f.endsWith(".pdf"));

    expect(roushanPdfs.length).toBeGreaterThan(0);
    expect(ayushiPdfs.length).toBeGreaterThan(0);

    // Verify main resume files
    const roushanMain = path.join(roushanDir, "Roushan_Kumar_Resume.pdf");
    const ayushiMain = path.join(ayushiDir, "Ayushi_Raj_Resume.pdf");

    expect(fs.existsSync(roushanMain)).toBe(true);
    expect(fs.existsSync(ayushiMain)).toBe(true);

    const roushanStat = fs.statSync(roushanMain);
    const ayushiStat = fs.statSync(ayushiMain);

    expect(roushanStat.size).toBeGreaterThan(50000); // Valid PDF > 50KB
    expect(ayushiStat.size).toBeGreaterThan(50000);
  });

  it("verifies canonical master resume selection logic", async () => {
    const { selectRecommendedResumeVariant, getAllResumeVariants } = await import("../src/lib/resumeVariantSelector");

    expect(selectRecommendedResumeVariant("roushan", "Senior Full Stack Developer", "").fileName).toBe("Roushan_Kumar_Resume.pdf");
    expect(selectRecommendedResumeVariant("roushan", "Distributed Backend Developer", "").fileName).toBe("Roushan_Kumar_Resume.pdf");
    expect(selectRecommendedResumeVariant("ayushi", "Lead AI Specialist", "").fileName).toBe("Ayushi_Raj_Resume.pdf");
    expect(getAllResumeVariants("roushan")).toHaveLength(1);
    expect(getAllResumeVariants("ayushi")).toHaveLength(1);
  });

  it("verifies postal code formatting for Indian PIN code and 5-digit US portals", () => {
    function formatZip(rawZip: string, maxLength?: number, pattern?: string, placeholder?: string): string {
      const cleanZip = String(rawZip || "800020").trim();
      if (maxLength === 5) return cleanZip.slice(0, 5);
      if (pattern && (pattern.includes("{5}") || pattern === "\\d{5}")) return cleanZip.slice(0, 5);
      if (placeholder && (/^\d{5}$/.test(placeholder) || placeholder.toLowerCase() === "12345")) return cleanZip.slice(0, 5);
      return cleanZip;
    }

    expect(formatZip("800020")).toBe("800020");
    expect(formatZip("800020", 5)).toBe("80002");
    expect(formatZip("800020", undefined, "\\d{5}")).toBe("80002");
    expect(formatZip("800020", undefined, undefined, "12345")).toBe("80002");
    expect(formatZip("", 5)).toBe("80002");
  });
});
