/**
 * form-schema-cache.test.ts
 * -------------------------
 * Unit and integration tests for AstrePilot V3 Form Schema Cache & Telemetry Engine.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  sanitizeMappingsForStorage,
  extractDomainPattern,
  saveFormSchema,
  getCachedFormSchema,
  recordSchemaFeedback,
} from "@/lib/autopilot/formSchemaCache";
import { GET, POST } from "@/app/api/autopilot/schema-cache/route";
import { db } from "@/lib/db";

describe("AstrePilot V3 Form Schema Cache Engine", () => {
  const testFingerprint = "test_fp_" + Date.now();

  beforeEach(async () => {
    try {
      await db.formSchema.deleteMany({
        where: { fingerprint: { startsWith: "test_fp_" } },
      });
    } catch {}
  });

  describe("Sanitization & Domain Extraction", () => {
    it("strips personal data and normalizes field mappings", () => {
      const raw = [
        { id: "first_name", fieldType: "FIRST_NAME", confidence: 0.98, accidentalName: "Roushan" },
        { id: "email", fieldType: "EMAIL", confidence: 1.5, accidentalEmail: "test@example.com" },
        { id: "phone", fieldType: "PHONE", confidence: -0.2 },
        { invalid: true },
      ];

      const cleaned = sanitizeMappingsForStorage(raw);
      expect(cleaned.length).toBe(3);
      expect(cleaned[0].elementId).toBe("first_name");
      expect(cleaned[0].fieldType).toBe("FIRST_NAME");
      expect(cleaned[0].confidence).toBe(0.98);
      expect((cleaned[0] as any).accidentalName).toBeUndefined();

      // Confidence clamped
      expect(cleaned[1].confidence).toBe(1.0);
      expect(cleaned[2].confidence).toBe(0.0);
    });

    it("extracts root domain patterns accurately", () => {
      expect(extractDomainPattern("https://job-boards.greenhouse.io/astranis")).toBe("greenhouse.io");
      expect(extractDomainPattern("https://jobs.lever.co/company")).toBe("lever.co");
      expect(extractDomainPattern("https://wd5.myworkdayjobs.com/en-US/careers")).toBe("myworkdayjobs.com");
      expect(extractDomainPattern("customportal.org")).toBe("customportal.org");
    });
  });

  describe("Persistence & Feedback Lifecycle", () => {
    it("saves and retrieves a form schema correctly", async () => {
      const mappings = [
        { elementId: "first_name", fieldType: "FIRST_NAME" as const, confidence: 0.96 },
        { elementId: "last_name", fieldType: "LAST_NAME" as const, confidence: 0.96 },
        { elementId: "resume", fieldType: "RESUME" as const, confidence: 0.99 },
      ];

      const saved = await saveFormSchema("https://boards.greenhouse.io/test", testFingerprint, mappings);
      expect(saved).not.toBeNull();
      expect(saved?.fingerprint).toBe(testFingerprint);
      expect(saved?.domainPattern).toBe("greenhouse.io");
      expect(saved?.mappings.length).toBe(3);

      const retrieved = await getCachedFormSchema(testFingerprint);
      expect(retrieved).not.toBeNull();
      expect(retrieved?.fingerprint).toBe(testFingerprint);
      expect(retrieved?.mappings.length).toBe(3);
      expect(retrieved?.mappings[0].elementId).toBe("first_name");
    });

    it("records success feedback and auto-verifies after 3 successful runs", async () => {
      await saveFormSchema("greenhouse.io", testFingerprint, [
        { elementId: "email", fieldType: "EMAIL" as const, confidence: 0.98 },
      ]);

      const r1 = await recordSchemaFeedback(testFingerprint, true);
      expect(r1.success).toBe(true);

      const r2 = await recordSchemaFeedback(testFingerprint, true);
      expect(r2.success).toBe(true);
      expect(r2.verified).toBe(true); // Initial save has count=1, +2 calls = 3 total -> verified!
    });
  });

  describe("API Route Endpoints (GET & POST)", () => {
    it("handles GET request when schema is cached", async () => {
      await saveFormSchema("lever.co", testFingerprint, [
        { elementId: "name", fieldType: "FULL_NAME" as const, confidence: 0.95 },
      ]);

      const req = new Request(`http://localhost:3000/api/autopilot/schema-cache?fingerprint=${testFingerprint}`);
      const res = await GET(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.cached).toBe(true);
      expect(data.mappings.length).toBe(1);
    });

    it("returns cached: false for unseen fingerprint", async () => {
      const req = new Request("http://localhost:3000/api/autopilot/schema-cache?fingerprint=unknown_fp_999");
      const res = await GET(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.cached).toBe(false);
    });

    it("accepts telemetry feedback via POST", async () => {
      await saveFormSchema("workday.com", testFingerprint, [
        { elementId: "email", fieldType: "EMAIL" as const, confidence: 0.98 },
      ]);

      const req = new Request("http://localhost:3000/api/autopilot/schema-cache", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fingerprint: testFingerprint,
          feedback: { success: true },
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.feedbackRecorded).toBe(true);
    });
  });
});

