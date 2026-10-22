import { describe, it, expect } from "vitest";
import {
  ExportableApplication,
  generateApplicationsCsv,
  generateApplicationsExcelXml,
  generateApplicationsSemanticXml,
  generateApplicationsTsv,
  normalizeApplicationUrl,
  sanitizeForSpreadsheet,
  escapeCsvCell,
} from "@/lib/exportEngine";

describe("Application Export Engine & Multi-Format Suite", () => {
  const mockApplications: ExportableApplication[] = [
    {
      slNo: 1,
      company: "Stripe",
      position: "Full-Stack Developer",
      appliedDate: "Oct 23, 2026, 03:00 AM",
      appliedAtIso: "2026-10-23T03:00:00.000Z",
      status: "APPLIED",
      confirmed: true,
      daysSilent: 0,
      formUrl: "https://boards.greenhouse.io/stripe/jobs/12345",
      source: "⚡ AstrePilot Autofill",
      fieldsFilled: 14,
      fieldsTotal: 14,
      hasAiAnswers: true,
      atsScore: 92,
    },
    {
      slNo: 2,
      company: "Figma",
      position: "Backend Developer",
      appliedDate: "Oct 20, 2026, 02:15 PM",
      appliedAtIso: "2026-10-20T14:15:00.000Z",
      status: "SCREENING",
      confirmed: false,
      daysSilent: 3,
      formUrl: "https://jobs.ashbyhq.com/figma/67890",
      source: "⚡ AstrePilot Autofill",
      fieldsFilled: 12,
      fieldsTotal: 15,
      hasAiAnswers: false,
      atsScore: 88,
    },
    {
      slNo: 3,
      company: "=MALICIOUS_INC",
      position: "+SENIOR_DEVELOPER",
      appliedDate: "Oct 15, 2026, 10:00 AM",
      appliedAtIso: "2026-10-15T10:00:00.000Z",
      status: "QUIET",
      confirmed: true,
      daysSilent: 8,
      formUrl: "https://careers.example.com/apply?utm_source=linkedin&ref=tracker",
      source: "Direct Portal",
      fieldsFilled: null,
      fieldsTotal: null,
      hasAiAnswers: false,
      atsScore: null,
    },
  ];

  describe("Formula Injection Shielding & Escaping", () => {
    it("neutralizes spreadsheet formulas starting with =, +, -, @", () => {
      expect(sanitizeForSpreadsheet("=SUM(A1:A10)")).toBe("'=SUM(A1:A10)");
      expect(sanitizeForSpreadsheet("+123456")).toBe("'+123456");
      expect(sanitizeForSpreadsheet("-100")).toBe("'-100");
      expect(sanitizeForSpreadsheet("@admin")).toBe("'@admin");
      expect(sanitizeForSpreadsheet("Normal Company")).toBe("Normal Company");
    });

    it("escapes CSV cells containing commas, quotes, and newlines per RFC 4180", () => {
      expect(escapeCsvCell('Hello, "World"')).toBe('"Hello, ""World"""');
      expect(escapeCsvCell("Simple")).toBe("Simple");
      expect(escapeCsvCell("=Dangerous, Formula")).toBe("\"'=Dangerous, Formula\"");
    });
  });

  describe("URL Normalization", () => {
    it("strips marketing & tracking parameters while preserving canonical path", () => {
      const raw = "https://boards.greenhouse.io/stripe/jobs/12345/?utm_source=linkedin&utm_medium=cpc&ref=xyz";
      const clean = normalizeApplicationUrl(raw);
      expect(clean).toBe("https://boards.greenhouse.io/stripe/jobs/12345");
    });

    it("handles URLs without trailing slashes and without tracking parameters", () => {
      const raw = "https://jobs.ashbyhq.com/posthog/abc-123";
      expect(normalizeApplicationUrl(raw)).toBe("https://jobs.ashbyhq.com/posthog/abc-123");
    });
  });

  describe("CSV Generation", () => {
    it("prepends UTF-8 BOM (\\uFEFF) to guarantee Excel character fidelity", () => {
      const csv = generateApplicationsCsv(mockApplications);
      expect(csv.startsWith("\uFEFF")).toBe(true);
    });

    it("includes proper column headers and escaped row values", () => {
      const csv = generateApplicationsCsv(mockApplications);
      expect(csv).toContain("Sl No.,Company Name,Position,Date of Apply,Status,Confirmation");
      expect(csv).toContain("Stripe,Full-Stack Developer");
      expect(csv).toContain("Confirmed Applied");
      expect(csv).toContain("Pending Review");
      expect(csv).toContain("14/14");
      // Verify formula injection protection in CSV row
      expect(csv).toContain("'=MALICIOUS_INC");
    });
  });

  describe("Excel XML Spreadsheet 2003 (.xls) Generation", () => {
    it("generates valid XML with Microsoft SpreadsheetML namespace and styles", () => {
      const xml = generateApplicationsExcelXml(mockApplications, "Roushan Kumar");
      expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(xml).toContain('progid="Excel.Sheet"');
      expect(xml).toContain('xmlns="urn:schemas-microsoft-com:office:spreadsheet"');
      expect(xml).toContain('ss:ID="HeaderStyle"');
      expect(xml).toContain('ss:Color="#0071E3"'); // AstreWork Navy header style
      expect(xml).toContain('<Worksheet ss:Name="Applications">');
      expect(xml).toContain('<Data ss:Type="String">Stripe</Data>');
      expect(xml).toContain('ss:HRef="https://boards.greenhouse.io/stripe/jobs/12345"');
    });
  });

  describe("Semantic XML Data Generation", () => {
    it("generates structured XML with correct entity escaping and attributes", () => {
      const xml = generateApplicationsSemanticXml(mockApplications, "Roushan Kumar");
      expect(xml).toContain('<applications candidate="Roushan Kumar"');
      expect(xml).toContain("<slNo>1</slNo>");
      expect(xml).toContain("<company>Stripe</company>");
      expect(xml).toContain("<position>Full-Stack Developer</position>");
      expect(xml).toContain("<confirmed>true</confirmed>");
      expect(xml).toContain("<hasAiAnswers>true</hasAiAnswers>");
      expect(xml).toContain("</applications>");
    });
  });

  describe("TSV Generation", () => {
    it("generates tab-separated text for instant clipboard pasting", () => {
      const tsv = generateApplicationsTsv(mockApplications);
      const lines = tsv.split("\n");
      expect(lines.length).toBe(4); // Header + 3 rows
      expect(lines[0].split("\t")[1]).toBe("Company Name");
      expect(lines[1].split("\t")[1]).toBe("Stripe");
      expect(lines[2].split("\t")[1]).toBe("Figma");
    });
  });
});
