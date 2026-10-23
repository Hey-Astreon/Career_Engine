import { describe, it, expect } from "vitest";
import { ICIMS_EXACT_MAP, isIcimsEnvironment } from "@/lib/autopilot/atsDrivers";

describe("Modular ATS Drivers: iCIMS / Cotiviti Engine", () => {
  describe("Environment Detection", () => {
    it("detects iCIMS by hostname", () => {
      expect(isIcimsEnvironment("careers-cotiviti.icims.com")).toBe(true);
      expect(isIcimsEnvironment("https://cotiviti.icims.com/jobs/123/apply")).toBe(true);
      expect(isIcimsEnvironment("microsoft-vendor.icims.com")).toBe(true);
    });

    it("detects iCIMS by embedded DOM iframe or table signals", () => {
      expect(isIcimsEnvironment("https://careers.cotiviti.com/job/123", "id='icims_content_iframe'")).toBe(true);
      expect(isIcimsEnvironment("https://example.com/apply", "PersonProfileFields.FirstName")).toBe(true);
    });

    it("rejects non-iCIMS portals", () => {
      expect(isIcimsEnvironment("https://boards.greenhouse.io/stripe/jobs/123")).toBe(false);
      expect(isIcimsEnvironment("https://jobs.lever.co/netflix")).toBe(false);
      expect(isIcimsEnvironment("https://workday.com/apply")).toBe(false);
    });
  });

  describe("Deterministic Selector Coverage for Cotiviti / iCIMS Ground Truth", () => {
    // 38 elements extracted from live Cotiviti #icims_content_iframe
    const sampleCotivitiDomIds = [
      "PortalProfileFields.Resume_File",
      "PersonProfileFields.Login",
      "PersonProfileFields.Password",
      "PersonProfileFields.Password_Confirm",
      "PersonProfileFields.FirstName",
      "PersonProfileFields.LastName",
      "PersonProfileFields.Email",
      "rcf2039",
      "-1_PersonProfileFields.PhoneType",
      "-1_PersonProfileFields.PhoneNumber",
      "rcf3553",
      "-1_PersonProfileFields.AddressType",
      "-1_PersonProfileFields.AddressStreet1",
      "-1_PersonProfileFields.AddressStreet2",
      "-1_PersonProfileFields.AddressCity",
      "-1_PersonProfileFields.AddressZip",
      "-1_PersonProfileFields.AddressCountry",
      "-1_PersonProfileFields.AddressState",
      "rcf3048",
      "rcf3049",
      "-1_PersonProfileFields.rcf3212",
      "-1_PersonProfileFields.rcf3217",
      "-1_PersonProfileFields.rcf3213",
      "-1_PersonProfileFields.rcf3214_Month",
      "-1_PersonProfileFields.rcf3214_Date",
      "-1_PersonProfileFields.rcf3214_Year",
      "-1_PersonProfileFields.rcf3215_Month",
      "-1_PersonProfileFields.rcf3215_Date",
      "-1_PersonProfileFields.rcf3215_Year",
      "-1_PersonProfileFields.rcf3219",
      "-1_PersonProfileFields.rcf3268"
    ];

    it("maps all 31 critical application fields to their canonical types", () => {
      const typeMap: Record<string, string> = {
        "PortalProfileFields.Resume_File": "RESUME",
        "PersonProfileFields.Login": "LOGIN_ID",
        "PersonProfileFields.Password": "PASSWORD",
        "PersonProfileFields.Password_Confirm": "CONFIRM_PASSWORD",
        "PersonProfileFields.FirstName": "FIRST_NAME",
        "PersonProfileFields.LastName": "LAST_NAME",
        "PersonProfileFields.Email": "EMAIL",
        "rcf2039": "PREFERRED_NAME",
        "-1_PersonProfileFields.PhoneType": "PHONE_TYPE",
        "-1_PersonProfileFields.PhoneNumber": "PHONE",
        "rcf3553": "TEXT_CONSENT",
        "-1_PersonProfileFields.AddressType": "ADDRESS_TYPE",
        "-1_PersonProfileFields.AddressStreet1": "ADDRESS",
        "-1_PersonProfileFields.AddressStreet2": "APT",
        "-1_PersonProfileFields.AddressCity": "CITY",
        "-1_PersonProfileFields.AddressZip": "ZIP",
        "-1_PersonProfileFields.AddressCountry": "COUNTRY",
        "-1_PersonProfileFields.AddressState": "STATE",
        "rcf3048": "HEAR_ABOUT",
        "rcf3049": "HEAR_ABOUT_DETAIL",
        "-1_PersonProfileFields.rcf3212": "COMPANY",
        "-1_PersonProfileFields.rcf3217": "EXP_STATE",
        "-1_PersonProfileFields.rcf3213": "EMPLOYMENT_TITLE",
        "-1_PersonProfileFields.rcf3214_Month": "START_MONTH",
        "-1_PersonProfileFields.rcf3214_Date": "START_DAY",
        "-1_PersonProfileFields.rcf3214_Year": "START_YEAR",
        "-1_PersonProfileFields.rcf3215_Month": "END_MONTH",
        "-1_PersonProfileFields.rcf3215_Date": "END_DAY",
        "-1_PersonProfileFields.rcf3215_Year": "END_YEAR",
        "-1_PersonProfileFields.rcf3219": "WORK_DESCRIPTION",
        "-1_PersonProfileFields.rcf3268": "REASON_FOR_LEAVING"
      };

      for (const [id, expectedType] of Object.entries(typeMap)) {
        const mapping = ICIMS_EXACT_MAP.find(m => m.type === expectedType);
        expect(mapping, `Mapping for ${expectedType} should exist`).toBeDefined();

        // Verify at least one selector in mapping matches this ID
        const matchesId = mapping!.selectors.some(sel => {
          const cleanSel = sel.replace(/\\/g, '');
          return cleanSel.includes(id) || sel.includes(id);
        });
        expect(matchesId, `Selector for ${expectedType} must match element ID: ${id}`).toBe(true);
      }
    });

    it("strictly differentiates Start Year and End Year text inputs", () => {
      const startYear = ICIMS_EXACT_MAP.find(m => m.type === "START_YEAR");
      const endYear = ICIMS_EXACT_MAP.find(m => m.type === "END_YEAR");

      expect(startYear).toBeDefined();
      expect(endYear).toBeDefined();
      expect(startYear!.selectors.some(s => s.includes("rcf3214_Year"))).toBe(true);
      expect(endYear!.selectors.some(s => s.includes("rcf3215_Year"))).toBe(true);
    });

    it("strictly maps Experience Role Title and Reason for Leaving", () => {
      const roleTitle = ICIMS_EXACT_MAP.find(m => m.type === "EMPLOYMENT_TITLE");
      const reasonLeaving = ICIMS_EXACT_MAP.find(m => m.type === "REASON_FOR_LEAVING");

      expect(roleTitle!.selectors.some(s => s.includes("rcf3213"))).toBe(true);
      expect(reasonLeaving!.selectors.some(s => s.includes("rcf3268"))).toBe(true);
    });
  });
});
