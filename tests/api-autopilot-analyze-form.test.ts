/**
 * api-autopilot-analyze-form.test.ts
 * ----------------------------------
 * Unit tests for POST /api/autopilot/analyze-form API endpoint.
 * Tests local high-confidence bypass and payload validation.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/autopilot/analyze-form/route";

vi.mock("@/lib/ai/router", () => ({
  queryMultiProviderLLM: vi.fn().mockResolvedValue({
    text: JSON.stringify([
      { id: "q1", fieldType: "SCREENING", confidence: 0.9, reasoning: "Identified custom question" },
    ]),
    provider: "groq",
  }),
}));

describe("POST /api/autopilot/analyze-form", () => {
  it("rejects empty or invalid payloads with 400", async () => {
    const req = new Request("http://localhost:3000/api/autopilot/analyze-form", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ domSnapshot: [] }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBeDefined();
  });

  it("resolves high-confidence standard fields locally with 0 LLM calls", async () => {
    const req = new Request("http://localhost:3000/api/autopilot/analyze-form", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pageUrl: "https://boards.greenhouse.io/astranis/jobs/123",
        pageTitle: "Job Application",
        domSnapshot: [
          { id: "first_name", name: "first_name", labelText: "First Name*", tagName: "INPUT", type: "text" },
          { id: "last_name", name: "last_name", labelText: "Last Name*", tagName: "INPUT", type: "text" },
          { id: "email", name: "email", labelText: "Email*", tagName: "INPUT", type: "email", autocomplete: "email" },
          { id: "resume", name: "resume", labelText: "Resume*", tagName: "INPUT", type: "file" },
        ],
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.success).toBe(true);
    expect(data.fingerprint).toBeDefined();
    expect(data.fields.length).toBe(4);
    expect(data.summary.source).toBe("sfd_local");
    expect(data.summary.highConfidence).toBe(4);
    expect(data.summary.aiResolved).toBe(0);
  });

  it("invokes AI Oracle cascade for ambiguous/unrecognized custom fields", async () => {
    const req = new Request("http://localhost:3000/api/autopilot/analyze-form", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pageUrl: "https://unknown-startup.ai/careers/apply",
        pageTitle: "Custom Form",
        domSnapshot: [
          { id: "first_name", name: "first_name", labelText: "First Name*", tagName: "INPUT", type: "text" },
          { id: "q1", name: "custom_input_xyz", labelText: "", tagName: "INPUT", type: "text" },
        ],
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.success).toBe(true);
    expect(data.fields.length).toBe(2);
    expect(data.summary.total).toBe(2);
  });
});
