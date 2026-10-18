import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "../src/app/api/diagnostics/heal/route";

// Mock next-auth
vi.mock("next-auth/next", () => ({
  getServerSession: vi.fn().mockResolvedValue({
    user: { id: "test-user-id", email: "test@example.com" },
  }),
}));

const mockAgentDiagnose = {
  provider: "SIMPLIFY",
  endpoint: "https://raw.githubusercontent.com/SimplifyJobs/New-Grad-Positions/dev/.github/scripts/listings.json",
  status_code: 200,
  healthy: true,
  content_preview_len: 250000,
};

const mockAgentHeal = {
  provider: "ASTRA",
  status: "PATCHED",
  message: "Antigravity Agent diagnosed timeout and generated fallback selector schema.",
  changes: ["Updated location query param to /location/remote"],
};

describe("POST /api/diagnostics/heal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockImplementation((url: string | URL | Request) => {
      const urlStr = url.toString();
      if (urlStr.includes("/healer/diagnose")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockAgentDiagnose),
        });
      }
      if (urlStr.includes("/healer/heal")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockAgentHeal),
        });
      }
      return Promise.reject(new Error("Network connection refused"));
    }) as unknown as typeof fetch;
  });

  it("returns 400 if provider is missing or empty", async () => {
    const req = new Request("http://localhost:3000/api/diagnostics/heal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider: "   " }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error).toContain("provider is required");
  });

  it("successfully routes diagnose requests to Antigravity Agent", async () => {
    const req = new Request("http://localhost:3000/api/diagnostics/heal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider: "SIMPLIFY", action: "diagnose" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.success).toBe(true);
    expect(data.source).toBe("antigravity-agent");
    expect(data.data.healthy).toBe(true);
    expect(data.data.status_code).toBe(200);
  });

  it("successfully routes heal requests to Antigravity Agent", async () => {
    const req = new Request("http://localhost:3000/api/diagnostics/heal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider: "ASTRA", action: "heal", dryRun: false }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.success).toBe(true);
    expect(data.source).toBe("antigravity-agent");
    expect(data.data.status).toBe("PATCHED");
    expect(data.data.changes).toContain("Updated location query param to /location/remote");
  });

  it("falls back to internal diagnostic probe if agent gateway fails", async () => {
    // Make fetch simulate gateway failure then successful direct probe
    global.fetch = vi.fn().mockImplementation((url: string | URL | Request) => {
      const urlStr = url.toString();
      if (urlStr.includes("8000") || urlStr.includes("agent.astrework.app")) {
        return Promise.reject(new Error("Agent Gateway offline"));
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        text: () => Promise.resolve("OK"),
      });
    }) as unknown as typeof fetch;

    const req = new Request("http://localhost:3000/api/diagnostics/heal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider: "NODESK", action: "diagnose" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.success).toBe(true);
    expect(data.source).toBe("internal-fallback");
    expect(data.data.healthy).toBe(true);
    expect(data.data.statusCode).toBe(200);
  });
});
