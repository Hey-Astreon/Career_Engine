import { describe, it, expect } from "vitest";
import { generateDeterministicOutreach, OutreachTone } from "../src/lib/outreachGenerator";

describe("Outreach Generator", () => {
  const candidate = {
    fullName: "Roushan Kumar",
    role: "Full-Stack Software Engineer",
    email: "roushan@example.com",
    portfolioUrl: "https://roushan.dev",
    linkedinUrl: "https://linkedin.com/in/roushan",
    topProject: "Distributed Pipeline Engine",
    topProjectTech: "Node.js, TypeScript, Kafka",
  };

  const job = {
    company: "Linear",
    title: "Software Engineer Intern",
    category: "Engineering",
  };

  it("generates student / summer 2026 internship referral materials", () => {
    const result = generateDeterministicOutreach({
      job,
      candidate,
      tone: "intern_referral",
    });

    expect(result.coldEmailSubject).toContain("Summer 2026 Internship Inquiry");
    expect(result.coldEmailSubject).toContain("Linear");
    expect(result.coldEmailBody).toContain("Summer 2026 internship / co-op");
    expect(result.coldEmailBody).toContain("Distributed Pipeline Engine");
    expect(result.coldEmailBody).toContain("Node.js, TypeScript, Kafka");
    expect(result.linkedinConnectionNote.length).toBeLessThanOrEqual(300);
    expect(result.linkedinConnectionNote).toContain("internship opportunities");
    expect(result.keyTalkingPoints[0]).toContain("Summer 2026");
    expect(result.recruiterSearchQuery).toContain("Linear");
    expect(result.recruiterSearchUrl).toContain("linkedin.com/search/results/people");
  });

  it("generates early-career / new grad immediate impact materials", () => {
    const result = generateDeterministicOutreach({
      job: { company: "Airbnb", title: "New Grad Backend Engineer" },
      candidate,
      tone: "new_grad",
    });

    expect(result.coldEmailSubject).toContain("New Grad Software Engineer: New Grad Backend Engineer — Roushan Kumar");
    expect(result.coldEmailBody).toContain("entry-level / new-grad opportunity");
    expect(result.linkedinConnectionNote.length).toBeLessThanOrEqual(300);
    expect(result.linkedinConnectionNote).toContain("entry-level engineer");
  });

  it("generates direct engineering proof materials", () => {
    const result = generateDeterministicOutreach({
      job: { company: "Vercel", title: "Platform Engineer" },
      candidate,
      tone: "direct",
    });

    expect(result.coldEmailSubject).toContain("Application for Platform Engineer — Roushan Kumar");
    expect(result.coldEmailBody).toContain("performant, resilient systems with Node.js, TypeScript, Kafka");
    expect(result.linkedinConnectionNote.length).toBeLessThanOrEqual(300);
  });

  it("generates executive / strategic alignment materials", () => {
    const result = generateDeterministicOutreach({
      job: { company: "Shopify", title: "Senior Systems Engineer" },
      candidate,
      tone: "executive",
    });

    expect(result.coldEmailSubject).toContain("Senior Systems Engineer Alignment — Roushan Kumar");
    expect(result.coldEmailBody).toContain("architectural clarity, resilient data pipelines");
    expect(result.linkedinConnectionNote.length).toBeLessThanOrEqual(300);
  });
});
