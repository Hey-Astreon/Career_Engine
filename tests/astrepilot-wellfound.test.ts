import { describe, it, expect } from "vitest";
import {
  detectAtsEngine,
  wellfoundDriver,
  WELLFOUND_EXACT_MAP,
} from "@/lib/autopilot/atsDrivers";

describe("AstrePilot Wellfound (AngelList Talent) Driver Specifications", () => {
  it("correctly identifies Wellfound URLs as WELLFOUND ATS engine", () => {
    const urls = [
      "https://wellfound.com/jobs/312456-full-stack-developer",
      "https://wellfound.com/company/stripe/jobs/9912-software-developer",
      "https://wellfound.com/jobs?role=developer",
    ];

    for (const url of urls) {
      expect(detectAtsEngine(url)).toBe("WELLFOUND");
    }
  });

  it("correctly identifies Wellfound from HTML snippet signature", () => {
    const engine = detectAtsEngine(
      "https://jobs.startup.io/apply",
      '<div data-test="JobApplicationModalSubmitButton">Apply via Wellfound</div>'
    );
    expect(engine).toBe("WELLFOUND");
  });

  it("validates that WELLFOUND_EXACT_MAP contains COVER_LETTER for userNote and screening notes", () => {
    const coverLetterMapping = WELLFOUND_EXACT_MAP.find((m) => m.type === "COVER_LETTER");
    expect(coverLetterMapping).toBeDefined();
    expect(coverLetterMapping?.selectors).toContain('textarea[name="userNote"]');
    expect(coverLetterMapping?.selectors).toContain("textarea#userNote");
  });

  it("validates that WELLFOUND_EXACT_MAP contains all required candidate fields", () => {
    const types = WELLFOUND_EXACT_MAP.map((m) => m.type);
    expect(types).toContain("COVER_LETTER");
    expect(types).toContain("RESUME");
    expect(types).toContain("PHONE");
    expect(types).toContain("CITY");
    expect(types).toContain("LINKEDIN");
    expect(types).toContain("GITHUB");
    expect(types).toContain("PORTFOLIO");
  });

  it("validates wellfoundDriver submission and field map properties", () => {
    expect(wellfoundDriver.engine).toBe("WELLFOUND");
    expect(wellfoundDriver.submitButtonSelector).toContain("JobApplicationModalSubmitButton");
    expect(wellfoundDriver.mappingList).toBe(WELLFOUND_EXACT_MAP);
    expect(wellfoundDriver.fieldMap["TEXTAREA#userNote"]).toBe("COVER_LETTER");
    expect(wellfoundDriver.fieldMap['TEXTAREA[name="userNote"]']).toBe("COVER_LETTER");
  });
});
