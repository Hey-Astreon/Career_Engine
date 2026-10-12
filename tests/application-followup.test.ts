import { describe, it, expect } from "vitest";
import { generateFollowupDraft, FollowupTone } from "../src/lib/followupGenerator";

describe("Application Followup Draft Generator", () => {
  const candidate = {
    fullName: "Roushan Kumar",
    email: "roushan@example.com",
    phone: "+1 555-0199",
    portfolioUrl: "https://roushan.dev",
    githubUrl: "https://github.com/roushan",
    topProject: "Distributed Cache Engine",
    topTech: "Go, Redis, and gRPC",
  };

  it("generates a gentle check-in nudge for recent applications", () => {
    const result = generateFollowupDraft({
      company: "Stripe",
      title: "Backend Engineer",
      candidate,
      tone: "nudge",
      daysSilent: 3,
    });

    expect(result.subject).toContain("Following up on application for Backend Engineer — Roushan Kumar");
    expect(result.body).toContain("Stripe Hiring Team");
    expect(result.body).toContain("submitted last week");
    expect(result.mailtoUrl).toContain("mailto:?subject=");
    expect(result.mailtoUrl).toContain(encodeURIComponent(result.subject));
    expect(result.fullDraft).toContain(`Subject: ${result.subject}`);
  });

  it("adjusts time context for applications quiet 10+ days", () => {
    const result = generateFollowupDraft({
      company: "Vercel",
      title: "Platform Engineer",
      candidate,
      tone: "nudge",
      daysSilent: 12,
    });

    expect(result.body).toContain("submitted recently");
  });

  it("generates a project update draft highlighting candidate projects and tech stack", () => {
    const result = generateFollowupDraft({
      company: "Figma",
      title: "Software Engineer",
      candidate,
      tone: "project_update",
    });

    expect(result.subject).toContain("Application Update: Software Engineer — Roushan Kumar");
    expect(result.body).toContain("Distributed Cache Engine");
    expect(result.body).toContain("Go, Redis, and gRPC");
    expect(result.body).toContain("https://roushan.dev");
  });

  it("generates a referral / internal inquiry draft", () => {
    const result = generateFollowupDraft({
      company: "Datadog",
      title: "Cloud Infrastructure Intern",
      candidate,
      tone: "referral",
    });

    expect(result.subject).toContain("Quick inquiry regarding Cloud Infrastructure Intern opening — Roushan Kumar");
    expect(result.body).toContain("who leads the hiring team for this role");
    expect(result.body).toContain("Go, Redis, and gRPC");
  });
});
