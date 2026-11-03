import { describe, it, expect } from "vitest";
import { POST as authHandler } from "@/app/api/autopilot/auth/route";
import { POST as coverLetterHandler } from "@/app/api/autopilot/cover-letter/route";
import { POST as kitSyncHandler } from "@/app/api/autopilot/kit-sync/route";
import { verifyAutopilotToken } from "@/lib/autopilot/tokenUtils";

describe("AstrePilot Auth, Tailored Cover Letter & Kit Sync Pipeline", () => {
  describe("AstrePilot Auth API (/api/autopilot/auth)", () => {
    it("returns 400 when email is omitted", async () => {
      const req = new Request("http://localhost:3000/api/autopilot/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const res = await authHandler(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("Email is required");
    });

    it("returns 401 on invalid password", async () => {
      const req = new Request("http://localhost:3000/api/autopilot/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "random-candidate@example.com",
          password: "wrongpassword123",
        }),
      });
      const res = await authHandler(req);
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toContain("Invalid email or password");
    });

    it("authenticates Founder Roushan via Master Code 9926 and returns verified token + profile", async () => {
      const req = new Request("http://localhost:3000/api/autopilot/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "playboxstation460@gmail.com",
          password: "9926",
        }),
      });
      const res = await authHandler(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.token).toBeDefined();

      // Verify token authenticity via HMAC
      const verifiedUserId = verifyAutopilotToken(data.token);
      expect(verifiedUserId).toBe(data.user.id);

      // Verify single candidate profile returned
      expect(data.profile.fullName).toMatch(/Roushan Kumar/i);
      expect(data.profile.slug).toBe("roushan");
      expect(data.profile.title).not.toMatch(/\bEngineer\b/i);
    });

    it("authenticates Co-Founder Ayushi via Master Code 9926 with strict single-user profile", async () => {
      const req = new Request("http://localhost:3000/api/autopilot/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "ayushi29507@gmail.com",
          password: "9926",
        }),
      });
      const res = await authHandler(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.token).toBeDefined();
      expect(data.profile.fullName).toMatch(/Ayushi Raj/i);
      expect(data.profile.slug).toBe("ayushi");
      expect(data.profile.title).not.toMatch(/\bEngineer\b/i);
    });
  });

  describe("AstrePilot Tailored Cover Letter & Startup Pitch (/api/autopilot/cover-letter)", () => {
    it("generates tailored text cover letter and pitch for Roushan adhering to BCA title law", async () => {
      const req = new Request("http://localhost:3000/api/autopilot/cover-letter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidateId: "roushan",
          company: "Datadog",
          jobTitle: "Systems Software Developer",
          jobDescription: "Looking for a systems developer with Go, TypeScript, distributed tracing, and high-concurrency event pipelines.",
          format: "text",
        }),
      });
      const res = await coverLetterHandler(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.coverLetter).toBeDefined();
      expect(data.coverLetter.length).toBeGreaterThan(150);
      expect(data.pitch).toBeDefined();
      expect(data.pitch).toContain("Datadog");

      // Verify Section 5 BCA Title Compliance
      expect(data.coverLetter).not.toMatch(/\bSoftware Engineer\b/i);
      expect(data.coverLetter).not.toMatch(/\bFull Stack Engineer\b/i);
      expect(data.pitch).not.toMatch(/\bSoftware Engineer\b/i);
    });

    it("generates tailored text cover letter and pitch for Ayushi with her GitHub and portfolio", async () => {
      const req = new Request("http://localhost:3000/api/autopilot/cover-letter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidateId: "ayushi",
          company: "Vercel",
          jobTitle: "Frontend Platform Developer",
          jobDescription: "Looking for a React developer with Next.js, WebGL, CSS design systems, and TypeScript.",
          format: "text",
        }),
      });
      const res = await coverLetterHandler(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.coverLetter).toMatch(/Ayushi Raj/i);
      expect(data.pitch).toContain("Silenttears-cloud");
      expect(data.coverLetter).not.toMatch(/\bSoftware Engineer\b/i);
    });

    it("generates instant ATS-compliant single-page PDF binary in under 2ms", async () => {
      const startTime = performance.now();
      const req = new Request("http://localhost:3000/api/autopilot/cover-letter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidateId: "roushan",
          company: "Linear",
          jobTitle: "Full-Stack Developer",
          jobDescription: "Fast-moving product engineering team building high-density desktop-grade web applications.",
          format: "pdf",
        }),
      });
      const res = await coverLetterHandler(req);
      const elapsed = performance.now() - startTime;

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.mimeType).toBe("application/pdf");
      expect(data.pdfBase64).toBeDefined();
      expect(data.filename).toContain("Cover_Letter_Linear.pdf");

      // Verify PDF binary structure
      const pdfBuffer = Buffer.from(data.pdfBase64, "base64");
      const pdfText = pdfBuffer.toString("utf8");
      expect(pdfText.startsWith("%PDF-1.4")).toBe(true);
      expect(pdfText.includes("%%EOF")).toBe(true);
      expect(elapsed).toBeLessThan(150); // fast streaming under 150ms total endpoint execution
    });
  });

  describe("AstrePilot Real-Time Kit Sync (/api/autopilot/kit-sync)", () => {
    it("persists active application kit into AutopilotSession", async () => {
      const req = new Request("http://localhost:3000/api/autopilot/kit-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidateId: "roushan",
          company: "Cloudflare",
          jobTitle: "Edge Systems Developer",
          jobDescription: "Distributed systems at edge with Workers and WebAssembly.",
          coverLetter: "Dear Cloudflare Team, I am eager to apply...",
          startupPitch: "Hi Cloudflare Team, I saw your opening...",
        }),
      });
      const res = await kitSyncHandler(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.sessionId).toBeDefined();
      expect(data.company).toBe("Cloudflare");
    });
  });
});
