import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "../src/app/api/resume/tailor/route";

// Mock next-auth
vi.mock("next-auth/next", () => ({
  getServerSession: vi.fn().mockResolvedValue({
    user: { id: "test-user-id", email: "test@example.com" },
  }),
}));

// Mock db
vi.mock("@/lib/db", () => ({
  db: {
    profile: {
      findFirst: vi.fn().mockResolvedValue({
        id: "profile-1",
        userId: "test-user-id",
        slug: "roushan",
        fullName: "Roushan Kumar",
        title: "Software Engineer",
        primarySkills: JSON.stringify(["TypeScript", "React", "Node.js", "Redis", "Docker"]),
        projects: [
          {
            title: "Astra Vision",
            bulletPoints: JSON.stringify([
              "Architected AST code-graph parsing engine in TypeScript processing 10k files/sec.",
              "Implemented Redis caching layer to reduce AST parsing latency by 60%.",
            ]),
          },
        ],
        virtualExps: [],
      }),
    },
  },
}));

// Mock multi-provider LLM fallback
vi.mock("@/lib/ai/router", () => ({
  queryMultiProviderLLM: vi.fn().mockResolvedValue({
    text: `### Key Technical Signals
- TypeScript
- Distributed Systems
- Redis
- Kafka
- Docker

### Tailored Bullet Points
- Architected high-throughput distributed microservices in TypeScript, reducing latency by 45%.
- Implemented robust Redis caching mechanisms to handle 50k concurrent requests.
- Engineered automated CI/CD container pipelines with Docker and GitHub Actions.

### ATS Match Assessment
Before: 65% | After: 92%
Summary: Integrated critical backend keywords and quantified operational achievements.`,
    provider: "gemini",
    latencyMs: 120,
  }),
}));

const mockAgentOutput = {
  tailored_output: `### Key Technical Signals
- TypeScript
- Microservices
- Redis
- Event Streams
- Docker

### Tailored Bullet Points
- Architected scalable microservices using TypeScript and Redis caching to process high-throughput event streams.
- Engineered automated deployment workflows via Docker containerization and GitHub Actions CI/CD pipelines.

### ATS Match Assessment
Before: 60% | After: 94%
Summary: Re-aligned technical verbs and matched microservices keywords.`,
  thoughts: ["Extracted core keywords", "Tailored bullets with STAR method"],
  success: true,
};


describe("POST /api/resume/tailor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockImplementation((url: string | URL | Request) => {
      const urlStr = url.toString();
      if (urlStr.includes("/tailor/bullets")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockAgentOutput),
        });
      }
      return Promise.reject(new Error("Network connection refused"));
    }) as unknown as typeof fetch;
  });

  it("returns 400 if jobDescription is missing or empty", async () => {
    const req = new Request("http://localhost:3000/api/resume/tailor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobDescription: "   " }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error).toContain("jobDescription is required");
  });

  it("successfully tailors resume bullets via Antigravity Agent", async () => {
    const req = new Request("http://localhost:3000/api/resume/tailor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jobDescription: "Seeking a Backend Engineer proficient in TypeScript, Redis caching, and microservices architecture.",
        profileSlug: "roushan",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.success).toBe(true);
    expect(data.source).toBe("antigravity-agent");
    expect(Array.isArray(data.tailoredBullets)).toBe(true);
    expect(data.tailoredBullets.length).toBeGreaterThan(0);
    expect(Array.isArray(data.technicalSignals)).toBe(true);
    expect(data.technicalSignals).toContain("TypeScript");
    expect(data.atsAssessment.before).toBe(60);
    expect(data.atsAssessment.after).toBe(94);
  });

  it("respects custom bullets if provided in request body", async () => {
    const custom = [
      "Built custom payment processor with Stripe and webhooks.",
      "Optimized SQL queries in PostgreSQL reducing slow logs.",
    ];

    const req = new Request("http://localhost:3000/api/resume/tailor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jobDescription: "Payment platform engineer needed for Stripe integration and database optimization.",
        customBullets: custom,
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.originalBullets).toEqual(custom);
    expect(data.tailoredBullets.length).toBeGreaterThan(0);
  });

  it("gracefully falls back to internal multi-provider LLM if agent gateway fails", async () => {
    // Force fetch to reject simulating gateway offline
    global.fetch = vi.fn().mockRejectedValue(new Error("Gateway connection refused"));

    const req = new Request("http://localhost:3000/api/resume/tailor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jobDescription: "Frontend React Engineer needed with Tailwind CSS experience.",
        profileSlug: "roushan",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.source).toBe("internal-fallback-llm");
    expect(Array.isArray(data.tailoredBullets)).toBe(true);
    expect(data.tailoredBullets.length).toBeGreaterThan(0);
  });
});

