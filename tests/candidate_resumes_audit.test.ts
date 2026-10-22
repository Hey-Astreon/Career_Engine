import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const { PDFParse } = require("pdf-parse");

describe("Candidate Resumes Production Audit (Section 5 BCA Compliance & AstreWork Flagship)", () => {
  const candidates = [
    {
      name: "Roushan Kumar",
      dir: path.join(process.cwd(), "public", "candidates", "3_Roushan_Kumar"),
    },
    {
      name: "Ayushi Raj",
      dir: path.join(process.cwd(), "public", "candidates", "2_Ayushi_Raj"),
    },
  ];

  for (const candidate of candidates) {
    describe(`Auditing PDFs for ${candidate.name}`, () => {
      const pdfFiles = fs
        .readdirSync(candidate.dir)
        .filter((f) => f.toLowerCase().endsWith(".pdf"));

      it(`should have at least 8 PDF variants in ${candidate.name}`, () => {
        expect(pdfFiles.length).toBeGreaterThanOrEqual(8);
      });

      for (const fileName of pdfFiles) {
        it(`[${fileName}] must be single-page A4, contain AstreWork, and have zero Engineer titles`, async () => {
          const filePath = path.join(candidate.dir, fileName);
          const buf = fs.readFileSync(filePath);
          expect(buf.length).toBeGreaterThan(40000);

          const parser = new PDFParse(new Uint8Array(buf));
          const result = await parser.getText();
          const text = result.text || "";
          const pageCount = result.pages?.length || 1;

          // Assertion 1: Must be exactly 1 page
          expect(pageCount).toBe(1);

          // Assertion 2: Must contain flagship project AstreWork
          expect(text).toContain("AstreWork");

          // Assertion 3: Must NOT contain old IDBI FinSync project
          expect(text).not.toContain("IDBI FinSync");

          // Assertion 4: Must have ZERO occurrences of the forbidden title "engineer" or "engineers"
          const engineerMatches = text.match(/\bengineer\b|\bengineers\b/gi) || [];
          expect(
            engineerMatches.length,
            `Forbidden word 'engineer' found in ${fileName}: ${engineerMatches.join(", ")}`
          ).toBe(0);

          // Assertion 5: Must contain Developer or Specialist title
          const hasDeveloperTitle = text.includes("Developer") || text.includes("Specialist");
          expect(hasDeveloperTitle).toBe(true);
        });
      }
    });
  }
});
