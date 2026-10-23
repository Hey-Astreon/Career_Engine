import { describe, it, expect } from "vitest";
import {
  classifyCurrentStep,
  isNextStepButton,
  isSubmitApplicationButton,
  findNextStepButton,
  createDefaultNavSession,
  recordStepCompletion,
  serializeNavSession,
  deserializeNavSession,
  STEP_CATEGORY_LABELS,
} from "@/lib/autopilot/multiStepEngine";

describe("Pillar C: ATS Multi-Step Form State Machine & Navigational Memory", () => {
  describe("Step Classification Heuristics", () => {
    it("classifies step from URL keywords", () => {
      expect(classifyCurrentStep("https://workday.com/apply/experience").category).toBe("EXPERIENCE");
      expect(classifyCurrentStep("https://workday.com/apply/education").category).toBe("EDUCATION");
      expect(classifyCurrentStep("https://boards.greenhouse.io/job/eeo-compliance").category).toBe("EEO_COMPLIANCE");
      expect(classifyCurrentStep("https://ashbyhq.com/app/review").category).toBe("REVIEW_SUBMIT");
    });

    it("classifies step from breadcrumbs or DOM step indicators", () => {
      const step1 = classifyCurrentStep("https://workday.com/step1", "Personal Contact Information");
      expect(step1.category).toBe("CONTACT_INFO");
      expect(step1.label).toBe(STEP_CATEGORY_LABELS.CONTACT_INFO);

      const step2 = classifyCurrentStep("https://workday.com/step2", "Work History and Past Employment");
      expect(step2.category).toBe("EXPERIENCE");

      const step3 = classifyCurrentStep("https://workday.com/step3", "Voluntary Self-Identification / EEO");
      expect(step3.category).toBe("EEO_COMPLIANCE");
    });

    it("falls back to field distribution when URL and breadcrumbs are generic", () => {
      const contactFields = ["FIRST_NAME", "LAST_NAME", "EMAIL", "PHONE", "RESUME"];
      expect(classifyCurrentStep("https://generic-ats.com/apply", "", contactFields).category).toBe("CONTACT_INFO");

      const expFields = ["COMPANY", "EMPLOYMENT_TITLE", "START_YEAR", "END_YEAR"];
      expect(classifyCurrentStep("https://generic-ats.com/apply", "", expFields).category).toBe("EXPERIENCE");

      const eeoFields = ["GENDER", "VETERAN", "DISABILITY", "RACE_ETHNICITY"];
      expect(classifyCurrentStep("https://generic-ats.com/apply", "", eeoFields).category).toBe("EEO_COMPLIANCE");
    });
  });

  describe("Next-Step vs Submit Button Disambiguation", () => {
    it("recognizes multi-step next navigation buttons", () => {
      expect(isNextStepButton({ innerText: "Next" })).toBe(true);
      expect(isNextStepButton({ innerText: "Save & Continue" })).toBe(true);
      expect(isNextStepButton({ innerText: "Save and Continue" })).toBe(true);
      expect(isNextStepButton({ innerText: "Next Step" })).toBe(true);
      expect(isNextStepButton({ innerText: "Proceed" })).toBe(true);
      expect(isNextStepButton({ innerText: "Review Application" })).toBe(true);
      expect(isNextStepButton({ getAttribute: (attr) => (attr === "data-automation-id" ? "bottom-navigation-next-button" : null) })).toBe(true);
    });

    it("strictly rejects final submission buttons from being treated as Next buttons", () => {
      expect(isNextStepButton({ innerText: "Submit Application" })).toBe(false);
      expect(isNextStepButton({ innerText: "Submit" })).toBe(false);
      expect(isNextStepButton({ innerText: "Apply Now" })).toBe(false);
      expect(isNextStepButton({ innerText: "Complete Application" })).toBe(false);
    });

    it("correctly identifies final submission actions", () => {
      expect(isSubmitApplicationButton({ innerText: "Submit Application" })).toBe(true);
      expect(isSubmitApplicationButton({ innerText: "Submit" })).toBe(true);
      expect(isSubmitApplicationButton({ innerText: "Apply Now" })).toBe(true);
      expect(isSubmitApplicationButton({ innerText: "Next" })).toBe(false);
      expect(isSubmitApplicationButton({ innerText: "Save & Continue" })).toBe(false);
    });

    it("locates the next-step button in a mock container", () => {
      const mockButtons = [
        { innerText: "Cancel", getAttribute: () => null },
        { innerText: "Previous", getAttribute: () => null },
        { innerText: "Save & Continue", getAttribute: () => null },
      ];

      const mockRoot = {
        querySelectorAll: () => mockButtons,
      };

      const found = findNextStepButton(mockRoot);
      expect(found).toBeDefined();
      expect(found.innerText).toBe("Save & Continue");
    });
  });

  describe("Navigational Memory & Cumulative Progress State", () => {
    it("creates an empty initial session", () => {
      const session = createDefaultNavSession("https://boards.greenhouse.io/job/123", "Acme Corp", "Full-Stack Developer");
      expect(session.sessionId).toContain("nav_");
      expect(session.currentStepIndex).toBe(0);
      expect(session.cumulativeFieldsFilled).toBe(0);
      expect(session.cumulativeFieldsTotal).toBe(0);
      expect(session.stepHistory).toEqual([]);
      expect(session.isFinalStep).toBe(false);
    });

    it("records step completions and accumulates field statistics", () => {
      let session = createDefaultNavSession("https://workday.com/apply", "Stripe", "Software Developer");

      // Step 0: Contact Info (5 of 5 filled)
      session = recordStepCompletion(session, "CONTACT_INFO", "Contact Information", 5, 5, true);
      expect(session.currentStepIndex).toBe(1);
      expect(session.cumulativeFieldsTotal).toBe(5);
      expect(session.cumulativeFieldsFilled).toBe(5);
      expect(session.stepHistory.length).toBe(1);

      // Step 1: Work Experience (8 of 8 filled)
      session = recordStepCompletion(session, "EXPERIENCE", "Work Experience", 8, 8, true);
      expect(session.currentStepIndex).toBe(2);
      expect(session.cumulativeFieldsTotal).toBe(13);
      expect(session.cumulativeFieldsFilled).toBe(13);
      expect(session.stepHistory.length).toBe(2);

      // Step 2: Self-ID / EEO (4 of 4 filled, final step reached)
      session = recordStepCompletion(session, "EEO_COMPLIANCE", "Voluntary Self-ID", 4, 4, false);
      expect(session.currentStepIndex).toBe(2); // does not advance on final step
      expect(session.cumulativeFieldsTotal).toBe(17);
      expect(session.cumulativeFieldsFilled).toBe(17);
      expect(session.isFinalStep).toBe(true);
      expect(session.cumulativeFieldsFilled).toBeLessThanOrEqual(session.cumulativeFieldsTotal);
    });

    it("serializes and deserializes session state accurately", () => {
      const initial = createDefaultNavSession("https://ashbyhq.com/job/456", "Vercel", "Frontend Developer");
      const updated = recordStepCompletion(initial, "CONTACT_INFO", "Contact", 4, 4, true);

      const serialized = serializeNavSession(updated);
      expect(typeof serialized).toBe("string");

      const hydrated = deserializeNavSession(serialized);
      expect(hydrated).not.toBeNull();
      expect(hydrated?.sessionId).toBe(updated.sessionId);
      expect(hydrated?.currentStepIndex).toBe(1);
      expect(hydrated?.cumulativeFieldsFilled).toBe(4);
      expect(hydrated?.stepHistory.length).toBe(1);
    });

    it("gracefully returns null for invalid or null session strings", () => {
      expect(deserializeNavSession(null)).toBeNull();
      expect(deserializeNavSession("")).toBeNull();
      expect(deserializeNavSession("invalid-json{")).toBeNull();
      expect(deserializeNavSession("{}")).toBeNull();
    });
  });
});
