import { describe, it, expect } from "vitest";
import {
  detectComboboxTypeFromAttributes,
  resolveSemanticOptionMatch,
  SYNONYM_DICTIONARY,
  SemanticOption,
} from "@/lib/autopilot/comboboxEngine";

describe("Universal Combobox & Dropdown Engine (UCDE)", () => {
  describe("Combobox Framework Type Detection", () => {
    it("detects standard NATIVE select tags", () => {
      expect(detectComboboxTypeFromAttributes({ tagName: "SELECT" })).toBe("NATIVE");
    });

    it("detects React-Select from classes and IDs", () => {
      expect(
        detectComboboxTypeFromAttributes({
          tagName: "INPUT",
          className: "select__input",
        })
      ).toBe("REACT_SELECT");

      expect(
        detectComboboxTypeFromAttributes({
          tagName: "DIV",
          className: "select__control css-13cymwt-control",
        })
      ).toBe("REACT_SELECT");
    });

    it("detects Radix UI and Shadcn comboboxes", () => {
      expect(
        detectComboboxTypeFromAttributes({
          tagName: "BUTTON",
          role: "combobox",
          ariaHasPopup: "listbox",
          hasState: true,
        })
      ).toBe("RADIX");

      expect(
        detectComboboxTypeFromAttributes({
          tagName: "BUTTON",
          role: "combobox",
          hasRadixPortal: true,
        })
      ).toBe("RADIX");
    });

    it("detects Headless UI comboboxes", () => {
      expect(
        detectComboboxTypeFromAttributes({
          tagName: "INPUT",
          id: "headlessui-combobox-input-:r1:",
          className: "w-full border-none py-2",
        })
      ).toBe("HEADLESS_UI");
    });

    it("detects Workday promptboxes", () => {
      expect(
        detectComboboxTypeFromAttributes({
          tagName: "INPUT",
          dataAutomationId: "searchBox",
          id: "wd-input-12",
        })
      ).toBe("WORKDAY");

      expect(
        detectComboboxTypeFromAttributes({
          tagName: "DIV",
          dataAutomationId: "select-box",
        })
      ).toBe("WORKDAY");
    });

    it("defaults to WAI_ARIA for generic accessible comboboxes", () => {
      expect(
        detectComboboxTypeFromAttributes({
          tagName: "DIV",
          role: "combobox",
        })
      ).toBe("WAI_ARIA");
    });
  });

  describe("6-Stage Semantic Option Matcher", () => {
    it("Stage 1: Matches exact values and text", () => {
      const options: SemanticOption[] = [
        { text: "United States", value: "US" },
        { text: "Canada", value: "CA" },
        { text: "India", value: "IN" },
      ];

      expect(resolveSemanticOptionMatch(options, "India", "COUNTRY")).toEqual({
        text: "India",
        value: "IN",
      });
      expect(resolveSemanticOptionMatch(options, "CA", "COUNTRY")).toEqual({
        text: "Canada",
        value: "CA",
      });
    });

    it("Stage 2 Invariant: Protects Indian candidate from American Indian false match", () => {
      const options: SemanticOption[] = [
        { text: "American Indian or Alaska Native", value: "AI_AN" },
        { text: "Asian (not Hispanic or Latino)", value: "ASIAN" },
        { text: "Black or African American", value: "BLACK" },
        { text: "White", value: "WHITE" },
      ];

      // Indian candidate MUST resolve strictly to Asian, never American Indian!
      const match = resolveSemanticOptionMatch(options, "Asian", "RACE_ETHNICITY");
      expect(match).toEqual({ text: "Asian (not Hispanic or Latino)", value: "ASIAN" });

      const match2 = resolveSemanticOptionMatch(options, "Indian", "RACE_ETHNICITY");
      expect(match2).toEqual({ text: "Asian (not Hispanic or Latino)", value: "ASIAN" });
    });

    it("Stage 2 Invariant: Resolves BCA candidate degree across varying degree formats", () => {
      const options: SemanticOption[] = [
        { text: "High School Diploma", value: "HS" },
        { text: "Associate Degree", value: "AA" },
        { text: "Bachelor's Degree", value: "BS" },
        { text: "Master's Degree", value: "MS" },
        { text: "Doctorate / PhD", value: "PHD" },
      ];

      const match = resolveSemanticOptionMatch(
        options,
        "Bachelor of Computer Applications (BCA)",
        "DEGREE"
      );
      expect(match).toEqual({ text: "Bachelor's Degree", value: "BS" });
    });

    it("Stage 3: Resolves complex Work Authorization and Visa Sponsorship phrases", () => {
      const authOptions: SemanticOption[] = [
        { text: "Please select...", value: "" },
        { text: "I am legally authorized to work without restriction", value: "AUTH_YES" },
        { text: "I am not authorized to work in this location", value: "AUTH_NO" },
      ];

      const match = resolveSemanticOptionMatch(authOptions, "Yes", "WORK_AUTH");
      expect(match).toEqual({
        text: "I am legally authorized to work without restriction",
        value: "AUTH_YES",
      });

      const visaOptions: SemanticOption[] = [
        { text: "Will require sponsorship now or in the future", value: "SPONSOR_YES" },
        { text: "Will not require sponsorship", value: "SPONSOR_NO" },
      ];

      const noMatch = resolveSemanticOptionMatch(visaOptions, "No", "VISA");
      expect(noMatch).toEqual({
        text: "Will not require sponsorship",
        value: "SPONSOR_NO",
      });
    });

    it("Stage 3: Resolves Immediate Notice Period variations", () => {
      const options: SemanticOption[] = [
        { text: "Select timeframe", value: "" },
        { text: "Available immediately (0 - 2 weeks)", value: "IMMEDIATE" },
        { text: "1 Month Notice", value: "1M" },
        { text: "3 Months Notice", value: "3M" },
      ];

      const match = resolveSemanticOptionMatch(options, "Immediate", "NOTICE_PERIOD");
      expect(match).toEqual({
        text: "Available immediately (0 - 2 weeks)",
        value: "IMMEDIATE",
      });
    });

    it("Stage 5: Falls back gracefully to 'Other / Not Listed' when university is unlisted", () => {
      const schoolOptions: SemanticOption[] = [
        { text: "Harvard University", value: "1" },
        { text: "Stanford University", value: "2" },
        { text: "Massachusetts Institute of Technology", value: "3" },
        { text: "0 - Other / Not Listed", value: "OTHER" },
      ];

      // Amity University is not in this prestigious US list, must safely choose Other!
      const match = resolveSemanticOptionMatch(
        schoolOptions,
        "Amity University",
        "SCHOOL"
      );
      expect(match).toEqual({ text: "0 - Other / Not Listed", value: "OTHER" });
    });

    it("Stage 6: Selects first non-placeholder option for mandatory fields when no match", () => {
      const mysteryOptions: SemanticOption[] = [
        { text: "-- Please select an option --", value: "" },
        { text: "Option Alpha (Standard)", value: "ALPHA" },
        { text: "Option Beta (Alternative)", value: "BETA" },
      ];

      const match = resolveSemanticOptionMatch(mysteryOptions, "Unknown Custom Value", "CUSTOM");
      expect(match).toEqual({ text: "Option Alpha (Standard)", value: "ALPHA" });
    });
  });
});
