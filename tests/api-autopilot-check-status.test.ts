import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST, OPTIONS } from "@/app/api/autopilot/check-status/route";
import { db } from "@/lib/db";
import { generateAutopilotToken } from "@/lib/autopilot/tokenUtils";

vi.mock("@/lib/db", () => ({
  db: {
    profile: {
      findFirst: vi.fn(),
    },
    application: {
      findFirst: vi.fn(),
    },
  },
}));

vi.mock("next-auth/next", () => ({
  getServerSession: vi.fn().mockResolvedValue(null),
}));

describe("POST /api/autopilot/check-status", () => {
  const validToken = generateAutopilotToken("user-dev-123");

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("handles OPTIONS preflight request with 204 and CORS", async () => {
    const res = await OPTIONS();
    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });

  it("returns 401 Unauthorized without credentials", async () => {
    const req = new Request("http://localhost:3000/api/autopilot/check-status", {
      method: "POST",
      body: JSON.stringify({ siteUrl: "https://stripe.com/jobs/1" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns exists: false when no prior application exists", async () => {
    vi.mocked(db.profile.findFirst).mockResolvedValueOnce({ id: "profile-123" } as any);
    vi.mocked(db.application.findFirst).mockResolvedValueOnce(null);

    const req = new Request("http://localhost:3000/api/autopilot/check-status", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${validToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        siteUrl: "https://boards.greenhouse.io/stripe/jobs/fresh-role",
        company: "Stripe",
        jobTitle: "Software Developer",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.exists).toBe(false);
    expect(data.application).toBeNull();
  });

  it("returns exists: true with application summary when canonical URL matches", async () => {
    vi.mocked(db.profile.findFirst).mockResolvedValueOnce({ id: "profile-123" } as any);
    const twoDaysAgo = new Date(Date.now() - 2 * 86400000);

    vi.mocked(db.application.findFirst).mockResolvedValueOnce({
      id: "app-found-1",
      status: "APPLIED",
      appliedAt: twoDaysAgo,
      createdAt: twoDaysAgo,
      notes: JSON.stringify({ confirmed: true, source: "ASTREPILOT" }),
      jobPosting: {
        company: "Stripe",
        title: "Software Developer",
        platform: "GREENHOUSE",
      },
      opportunity: null,
    } as any);

    const req = new Request("http://localhost:3000/api/autopilot/check-status", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${validToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        siteUrl: "https://boards.greenhouse.io/stripe/jobs/12345?gh_src=linkedin",
        company: "Stripe",
        jobTitle: "Software Developer",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.exists).toBe(true);
    expect(data.application).toBeDefined();
    expect(data.application.id).toBe("app-found-1");
    expect(data.application.company).toBe("Stripe");
    expect(data.application.daysAgo).toBe(2);
    expect(data.application.confirmed).toBe(true);
  });
});
