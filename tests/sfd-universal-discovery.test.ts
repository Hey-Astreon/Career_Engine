/**
 * sfd-universal-discovery.test.ts
 * -------------------------------
 * Unit tests for AstrePilot V3 Universal Semantic Field Discovery (SFD) Engine.
 * Verifies universal form field classification across standard and non-standard ATS portals.
 */

import { describe, it, expect } from "vitest";
import {
  computeSemanticScore,
  discoverFormFields,
  generateFormFingerprint,
  ElementSignals,
} from "@/lib/autopilot/semanticFieldDiscovery";

describe("AstrePilot V3 Universal Semantic Field Discovery (SFD)", () => {
  describe("Greenhouse Embed Form Elements", () => {
    it("correctly classifies standard Greenhouse applicant inputs", () => {
      const inputs: ElementSignals[] = [
        { id: "first_name", name: "first_name", labelText: "First Name*", tagName: "INPUT", type: "text" },
        { id: "last_name", name: "last_name", labelText: "Last Name*", tagName: "INPUT", type: "text" },
        { id: "email", name: "email", labelText: "Email*", tagName: "INPUT", type: "email", autocomplete: "email" },
        { id: "phone", name: "phone", labelText: "Phone*", tagName: "INPUT", type: "tel" },
        { id: "job_application_location", name: "location", labelText: "Location (City)*", tagName: "INPUT", type: "text" },
        { id: "resume", name: "resume", labelText: "Resume/CV*", tagName: "INPUT", type: "file" },
        { id: "school--0", name: "school", labelText: "School", tagName: "INPUT", role: "combobox" },
        { id: "degree--0", name: "degree", labelText: "Degree", tagName: "INPUT", role: "combobox" },
        { id: "discipline--0", name: "discipline", labelText: "Discipline", tagName: "INPUT", role: "combobox" },
        { id: "start-month--0", name: "start_month", labelText: "Start date month", tagName: "INPUT", role: "combobox" },
      ];

      const { fields, highConfidenceCount } = discoverFormFields(inputs);

      // Diagnostic print
      // console.log(fields.map(f => `${f.fieldType}: ${f.confidence} (${f.reasoning})`));

      expect(fields[0].fieldType).toBe("FIRST_NAME");
      expect(fields[0].confidence).toBeGreaterThanOrEqual(0.85);

      expect(fields[1].fieldType).toBe("LAST_NAME");
      expect(fields[1].confidence).toBeGreaterThanOrEqual(0.85);

      expect(fields[2].fieldType).toBe("EMAIL");
      expect(fields[2].confidence).toBeGreaterThanOrEqual(0.95);

      expect(fields[3].fieldType).toBe("PHONE");
      expect(fields[3].confidence).toBeGreaterThanOrEqual(0.85);

      expect(fields[4].fieldType).toBe("LOCATION_AUTOCOMPLETE");
      expect(fields[4].confidence).toBeGreaterThanOrEqual(0.85);

      expect(fields[5].fieldType).toBe("RESUME");
      expect(fields[5].confidence).toBeGreaterThanOrEqual(0.95);

      expect(fields[6].fieldType).toBe("SCHOOL");
      expect(fields[7].fieldType).toBe("DEGREE");
      expect(fields[8].fieldType).toBe("DISCIPLINE");
      expect(fields[9].fieldType).toBe("START_MONTH");

      expect(highConfidenceCount).toBe(inputs.length);
    });
  });

  describe("Lever Form Elements", () => {
    it("correctly identifies Lever candidate inputs without hardcoded maps", () => {
      const inputs: ElementSignals[] = [
        { name: "name", labelText: "Full name", placeholder: "Your name", tagName: "INPUT", type: "text" },
        { name: "email", labelText: "Email", tagName: "INPUT", type: "email" },
        { name: "phone", labelText: "Phone", tagName: "INPUT", type: "text" },
        { name: "org", labelText: "Current company", placeholder: "Company name", tagName: "INPUT", type: "text" },
        { name: "urls[LinkedIn]", labelText: "LinkedIn URL", tagName: "INPUT", type: "url" },
        { name: "urls[GitHub]", labelText: "GitHub URL", tagName: "INPUT", type: "url" },
        { name: "urls[Portfolio]", labelText: "Portfolio URL", tagName: "INPUT", type: "url" },
        { name: "resume", labelText: "Attach resume", tagName: "INPUT", type: "file" },
      ];

      const { fields } = discoverFormFields(inputs);

      expect(fields[0].fieldType).toBe("FULL_NAME");
      expect(fields[1].fieldType).toBe("EMAIL");
      expect(fields[2].fieldType).toBe("PHONE");
      expect(fields[3].fieldType).toBe("COMPANY");
      expect(fields[4].fieldType).toBe("LINKEDIN");
      expect(fields[5].fieldType).toBe("GITHUB");
      expect(fields[6].fieldType).toBe("PORTFOLIO");
      expect(fields[7].fieldType).toBe("RESUME");
    });
  });

  describe("Workday Enterprise Form Elements", () => {
    it("correctly maps Workday data-automation-id attributes", () => {
      const inputs: ElementSignals[] = [
        { dataAutomationId: "legalNameSection_firstName", labelText: "First Name", tagName: "INPUT" },
        { dataAutomationId: "legalNameSection_lastName", labelText: "Last Name", tagName: "INPUT" },
        { dataAutomationId: "addressSection_postalCode", labelText: "Postal Code", tagName: "INPUT" },
        { dataAutomationId: "addressSection_city", labelText: "City", tagName: "INPUT" },
        { dataAutomationId: "email", labelText: "Email Address", tagName: "INPUT" },
        { dataAutomationId: "phone-number", labelText: "Phone Number", tagName: "INPUT" },
        { dataAutomationId: "file-upload-input-drop-zone", labelText: "Quick Apply / Upload Resume", tagName: "INPUT", type: "file" },
      ];

      const { fields } = discoverFormFields(inputs);

      expect(fields[0].fieldType).toBe("FIRST_NAME");
      expect(fields[1].fieldType).toBe("LAST_NAME");
      expect(fields[2].fieldType).toBe("ZIP_CODE");
      expect(fields[3].fieldType).toBe("CITY");
      expect(fields[4].fieldType).toBe("EMAIL");
      expect(fields[5].fieldType).toBe("PHONE");
      expect(fields[6].fieldType).toBe("RESUME");
    });
  });

  describe("Completely Unknown Custom Corporate Career Portals", () => {
    it("successfully classifies non-standard ASP.NET and custom corporate portals", () => {
      const inputs: ElementSignals[] = [
        { id: "ctl00_txtCandidateGivenName", name: "ctl00$txtCandidateGivenName", labelText: "Candidate Given Name", tagName: "INPUT" },
        { id: "ctl00_txtCandidateFamilyName", name: "ctl00$txtCandidateFamilyName", labelText: "Candidate Surname", tagName: "INPUT" },
        { id: "ctl00_txtElectronicMail", name: "ctl00$txtElectronicMail", labelText: "Electronic Mail Address", tagName: "INPUT" },
        { id: "ctl00_txtCellularNumber", name: "ctl00$txtCellularNumber", labelText: "Mobile / Cellular Telephone", tagName: "INPUT" },
        { id: "ctl00_ddlHighestQualification", name: "ctl00$ddlHighestQualification", labelText: "Highest Degree Earned", tagName: "SELECT" },
        { id: "ctl00_fupCurriculumVitae", name: "ctl00$fupCurriculumVitae", labelText: "Attach Curriculum Vitae (CV)", tagName: "INPUT", type: "file" },
        { id: "ctl00_txtLinkedInProfile", name: "ctl00$txtLinkedInProfile", labelText: "LinkedIn Profile URL", tagName: "INPUT" },
        { id: "ctl00_ddlWorkAuthorization", name: "ctl00$ddlWorkAuthorization", labelText: "Are you legally authorized to work in India?", tagName: "SELECT" },
        { id: "ctl00_txtWhyUsStatement", name: "ctl00$txtWhyUsStatement", labelText: "Why do you want to work at our organization?", tagName: "TEXTAREA" },
      ];

      const { fields, highConfidenceCount } = discoverFormFields(inputs);

      // Diagnostic print
      // console.log(fields.map(f => `${f.fieldType}: ${f.confidence} (${f.reasoning})`));

      expect(fields[0].fieldType).toBe("FIRST_NAME");
      expect(fields[1].fieldType).toBe("LAST_NAME");
      expect(fields[2].fieldType).toBe("EMAIL");
      expect(fields[3].fieldType).toBe("PHONE");
      expect(fields[4].fieldType).toBe("DEGREE");
      expect(fields[5].fieldType).toBe("RESUME");
      expect(fields[6].fieldType).toBe("LINKEDIN");
      expect(fields[7].fieldType).toBe("WORK_AUTH");
      expect(fields[8].fieldType).toBe("WHY_US");

      expect(highConfidenceCount).toBe(inputs.length);
    });
  });

  describe("Form Fingerprint Generator", () => {
    it("generates deterministic and immutable hashes for identical forms", () => {
      const formA: ElementSignals[] = [
        { id: "first_name", tagName: "INPUT", type: "text", labelText: "First Name" },
        { id: "last_name", tagName: "INPUT", type: "text", labelText: "Last Name" },
        { id: "email", tagName: "INPUT", type: "email", labelText: "Email" },
      ];

      const formB: ElementSignals[] = [
        { id: "first_name", tagName: "INPUT", type: "text", labelText: "First Name" },
        { id: "last_name", tagName: "INPUT", type: "text", labelText: "Last Name" },
        { id: "email", tagName: "INPUT", type: "email", labelText: "Email" },
      ];

      const formC: ElementSignals[] = [
        { id: "applicant_name", tagName: "INPUT", type: "text", labelText: "Full Name" },
        { id: "email", tagName: "INPUT", type: "email", labelText: "Email" },
      ];

      const hashA = generateFormFingerprint(formA);
      const hashB = generateFormFingerprint(formB);
      const hashC = generateFormFingerprint(formC);

      expect(hashA).toBe(hashB);
      expect(hashA).not.toBe(hashC);
      expect(hashA.length).toBe(32);
    });
  });
});
