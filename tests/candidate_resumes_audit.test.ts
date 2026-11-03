import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { createRequire } from "module";
import { getMasterResumeBaseline } from "../src/lib/resumeBaseline";

const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");

async function extractPdfInfo(buffer: Buffer): Promise<{ numpages: number; text: string }> {
  if (typeof pdfParse === "function") {
    return await pdfParse(buffer);
  }
  if (pdfParse.PDFParse) {
    const parser = new pdfParse.PDFParse({ data: buffer });
    const info = await parser.getText();
    await parser.destroy();
    return { numpages: info.total, text: info.text };
  }
  throw new Error("Unsupported pdf-parse API");
}

describe("Candidate Master Resumes — Single-Page A4, Anti-Slop & BCA Compliance Audit", () => {
  const roushanDir = path.resolve(process.cwd(), "public", "candidates", "3_Roushan_Kumar");
  const ayushiDir = path.resolve(process.cwd(), "public", "candidates", "2_Ayushi_Raj");

  it("ensures all redundant static variant PDFs and usecase.md files are removed, leaving strictly 1 Master PDF per candidate", () => {
    const roushanFiles = fs.readdirSync(roushanDir);
    const ayushiFiles = fs.readdirSync(ayushiDir);

    const roushanPdfs = roushanFiles.filter((f) => f.endsWith(".pdf"));
    const ayushiPdfs = ayushiFiles.filter((f) => f.endsWith(".pdf"));

    expect(roushanPdfs).toEqual(["Roushan_Kumar_Resume.pdf"]);
    expect(ayushiPdfs).toEqual(["Ayushi_Raj_Resume.pdf"]);
    expect(roushanFiles.includes("usecase.md")).toBe(false);
    expect(ayushiFiles.includes("usecase.md")).toBe(false);
  });

  it("verifies 100% project bullet uniqueness between Roushan and Ayushi (zero shared bullets)", () => {
    const roushan = getMasterResumeBaseline("roushan");
    const ayushi = getMasterResumeBaseline("ayushi");

    const roushanBullets = roushan.projects.flatMap((p) => p.bullets);
    const ayushiBullets = ayushi.projects.flatMap((p) => p.bullets);

    const shared = roushanBullets.filter((b) => ayushiBullets.includes(b));
    expect(shared).toEqual([]);
  });

  it("verifies 100% simulation bullet uniqueness between Roushan and Ayushi (zero shared bullets)", () => {
    const roushan = getMasterResumeBaseline("roushan");
    const ayushi = getMasterResumeBaseline("ayushi");

    const roushanSimBullets = roushan.simulations.flatMap((s) => [s.problemScope, s.actionTaken, s.engineeringOutcome]);
    const ayushiSimBullets = ayushi.simulations.flatMap((s) => [s.problemScope, s.actionTaken, s.engineeringOutcome]);

    const shared = roushanSimBullets.filter((b) => ayushiSimBullets.includes(b));
    expect(shared).toEqual([]);
  });

  it("verifies Roushan_Kumar_Resume.pdf has Style B headline, clean education date, AstreWork, 0 'Engineer' titles, and 0 AI slop words", async () => {
    const pdfPath = path.join(roushanDir, "Roushan_Kumar_Resume.pdf");
    const buf = fs.readFileSync(pdfPath);
    const parsed = await extractPdfInfo(buf);

    expect(parsed.numpages).toBe(1);
    expect(parsed.text).toContain("ROUSHAN KUMAR");
    expect(parsed.text).toContain("Software Developer — Backend & Cloud");
    expect(parsed.text).toContain("2025 – 2028");
    expect(parsed.text).not.toContain("Full-Time Remote Available");
    expect(parsed.text).toContain("AstreWork");
    expect(parsed.text).toContain("Astra Vision");
    expect(parsed.text).toContain("Alyra Lock");
    expect(parsed.text).not.toContain("IDBI");
    expect(parsed.text).not.toContain("FinSync");
    expect(parsed.text).not.toMatch(/\bengineer(s)?\b/i);
    expect(parsed.text).not.toMatch(/\b(dynamic|utiliz\w*|passionate|spearhead\w*|leverag\w*)\b/i);
  });

  it("verifies Ayushi_Raj_Resume.pdf has Style B headline, clean education date, AstreWork, 0 'Engineer' titles, and 0 AI slop words", async () => {
    const pdfPath = path.join(ayushiDir, "Ayushi_Raj_Resume.pdf");
    const buf = fs.readFileSync(pdfPath);
    const parsed = await extractPdfInfo(buf);

    expect(parsed.numpages).toBe(1);
    expect(parsed.text).toContain("AYUSHI RAJ");
    expect(parsed.text).toContain("Software Developer — Full-Stack & AI");
    expect(parsed.text).toContain("2025 – 2028");
    expect(parsed.text).not.toContain("Full-Time Remote Available");
    expect(parsed.text).toContain("AstreWork");
    expect(parsed.text).toContain("Alyra Lock");
    expect(parsed.text).toContain("Astra Vision");
    expect(parsed.text).not.toContain("IDBI");
    expect(parsed.text).not.toContain("FinSync");
    expect(parsed.text).not.toMatch(/\bengineer(s)?\b/i);
    expect(parsed.text).not.toMatch(/\b(dynamic|utiliz\w*|passionate|spearhead\w*|leverag\w*)\b/i);
  });
});
