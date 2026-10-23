import { describe, it, expect, beforeEach } from "vitest";
import { GET as getVault, POST as postVault } from "../src/app/api/autopilot/vault/route";
import { POST as matchVault } from "../src/app/api/autopilot/vault/match/route";
import { PATCH as patchVault, DELETE as deleteVault } from "../src/app/api/autopilot/vault/[id]/route";
import { generateAutopilotToken } from "@/lib/autopilot/tokenUtils";
import { db } from "@/lib/db";

describe("AstrePilot Q&A Vault API Endpoints", () => {
  let testProfile: { id: string; userId: string; slug: string; email: string };
  let authToken: string;

  beforeEach(async () => {
    // Locate or create test candidate profile
    let profile = await db.profile.findFirst({
      where: { slug: "roushan" },
      select: { id: true, userId: true, slug: true, email: true },
    });

    if (!profile) {
      profile = await db.profile.findFirst({
        select: { id: true, userId: true, slug: true, email: true },
      });
    }

    if (!profile) {
      const user = await db.user.create({
        data: {
          name: "Roushan Kumar",
          email: "test_roushan@astrework.app",
        },
      });
      profile = await db.profile.create({
        data: {
          slug: "roushan-test",
          fullName: "Roushan Kumar",
          title: "Full-Stack Developer",
          email: "test_roushan@astrework.app",
          location: "Patna, Bihar, India",
          masterResumePath: "public/candidates/3_Roushan_Kumar/Resume.pdf",
          userId: user.id,
        },
        select: { id: true, userId: true, slug: true, email: true },
      });
    }

    testProfile = profile as { id: string; userId: string; slug: string; email: string };
    authToken = generateAutopilotToken(testProfile.userId);
  });

  describe("Authentication & Security", () => {
    it("returns 401 when Authorization header is missing", async () => {
      const req = new Request("http://localhost:3000/api/autopilot/vault", {
        method: "GET",
      });
      const res = await getVault(req);
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toBe("Unauthorized");
    });

    it("returns 401 when an invalid Bearer token is provided", async () => {
      const req = new Request("http://localhost:3000/api/autopilot/vault", {
        method: "GET",
        headers: { Authorization: "Bearer invalid-junk-token" },
      });
      const res = await getVault(req);
      expect(res.status).toBe(401);
    });
  });

  describe("GET /api/autopilot/vault", () => {
    it("returns candidate's seeded vault entries", async () => {
      const req = new Request("http://localhost:3000/api/autopilot/vault", {
        method: "GET",
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const res = await getVault(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(Array.isArray(data.vault)).toBe(true);
      expect(data.vault.length).toBeGreaterThanOrEqual(1);

      // Verify keyword array parsing
      const first = data.vault[0];
      expect(Array.isArray(first.keywords)).toBe(true);
      expect(first.answerText).toBeDefined();
    });

    it("filters vault entries by category", async () => {
      const req = new Request("http://localhost:3000/api/autopilot/vault?category=LOGISTICS", {
        method: "GET",
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const res = await getVault(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      for (const item of data.vault) {
        expect(item.category).toBe("LOGISTICS");
      }
    });
  });

  describe("POST /api/autopilot/vault & Section 5 Title Law", () => {
    it("creates a new custom screening entry successfully", async () => {
      const req = new Request("http://localhost:3000/api/autopilot/vault", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          questionPattern: "How do you handle rate-limiting in web scrapers?",
          answerText:
            "I design exponential backoff curves and circuit breakers with jitter to prevent burst lockouts and socket exhaustion.",
          category: "TECHNICAL",
          isFavorite: true,
        }),
      });

      const res = await postVault(req);
      expect([200, 201]).toContain(res.status);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.entry.questionPattern).toContain("rate-limiting");
      expect(data.entry.isFavorite).toBe(true);
    });

    it("rejects prohibited engineer titles under Section 5 BCA Title Compliance", async () => {
      const req = new Request("http://localhost:3000/api/autopilot/vault", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          questionPattern: "What is your primary title?",
          answerText: "I am a Senior Software Engineer with 5 years experience.",
          category: "GENERAL",
        }),
      });

      const res = await postVault(req);
      expect(res.status).toBe(422);
      const data = await res.json();
      expect(data.error).toContain("Section 5 Compliance Violation");
    });
  });

  describe("POST /api/autopilot/vault/match", () => {
    it("matches a live question against the vault and interpolates company slots", async () => {
      const req = new Request("http://localhost:3000/api/autopilot/vault/match", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: "Why do you want to work at Vercel?",
          company: "Vercel",
          jobTitle: "Full-Stack Developer",
        }),
      });

      const res = await matchVault(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.matched).toBe(true);
      expect(data.confidence).toBeGreaterThanOrEqual(60);
      expect(data.answer).toContain("Vercel");
      expect(data.source).toBe("vault");
      expect(data.vaultId).toBeDefined();
    });
  });

  describe("PATCH & DELETE /api/autopilot/vault/[id]", () => {
    it("updates favorite status of an existing entry", async () => {
      // Create a temporary entry
      const item = await db.screeningQuestionVault.create({
        data: {
          profileId: testProfile.id,
          category: "LOGISTICS",
          questionPattern: "Temporary test question for patch?",
          keywords: JSON.stringify(["temporary", "test"]),
          answerText: "Temporary answer.",
          isFavorite: false,
        },
      });

      const patchReq = new Request(`http://localhost:3000/api/autopilot/vault/${item.id}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isFavorite: true }),
      });

      const patchRes = await patchVault(patchReq, { params: Promise.resolve({ id: item.id }) });
      expect(patchRes.status).toBe(200);
      const patchData = await patchRes.json();
      expect(patchData.entry.isFavorite).toBe(true);

      // Clean up via DELETE
      const deleteReq = new Request(`http://localhost:3000/api/autopilot/vault/${item.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${authToken}` },
      });

      const deleteRes = await deleteVault(deleteReq, { params: Promise.resolve({ id: item.id }) });
      expect(deleteRes.status).toBe(200);
      const deleteData = await deleteRes.json();
      expect(deleteData.success).toBe(true);
    });
  });
});
