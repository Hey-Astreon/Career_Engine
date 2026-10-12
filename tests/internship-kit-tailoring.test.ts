import { describe, it, expect } from "vitest";
import {
  formatFormalCoverLetter,
  generateRecruiterMessage,
  generateTailoredKit,
} from "../src/lib/ai/drafter";
import { CandidateContext } from "../src/lib/ai/scorer";

describe("Internship Application Kit Tailoring", () => {
  const mockCandidate: CandidateContext = {
    fullName: "Roushan Kumar",
    title: "Full Stack Developer",
    email: "roushan@example.com",
    phone: "+91 9876543210",
    location: "Remote",
    portfolioUrl: "https://roushan.dev",
    githubUrl: "https://github.com/roushankumar",
    masterProjects: [
      {
        title: "Astra Vision",
        techStack: "TypeScript, Tree-Sitter AST, Rust",
        architecture: "AST code-graph parsing engine and isolated runtime sandbox",
      },
      {
        title: "IDBI FinSync",
        techStack: "Node.js, Fastify, PostgreSQL",
        architecture: "AI-integrated wealth management engine with PostgreSQL ledgers",
      },
    ],
    virtualExps: [
      {
        company: "Astreon",
        roleTitle: "Software Engineering Fellow",
        outcome: "Engineered real-time distributed microservices and testing pipelines",
      },
    ],
  };

  const internshipTitle = "Software Engineer Intern (Full Stack)";
  const internshipCompany = "Formlabs";
  const internshipDescription = `We are looking for a Software Engineer Intern to join our web team.
You will write clean TypeScript, React, and Python code, build internal tools, and collaborate closely with senior engineers.
Requirements:
- Enrolled in Computer Science or related degree
- Familiarity with modern JavaScript/TypeScript, React, or Python
- Passion for 3D printing and rapid software iteration`;

  it("generates an internship-tailored formal cover letter without senior jargon", () => {
    const letter = formatFormalCoverLetter(
      mockCandidate,
      internshipCompany,
      internshipTitle,
      "",
      internshipDescription
    );

    expect(letter).toContain("Software Engineer Intern");
    expect(letter).toContain("Formlabs");
    expect(letter).toContain("internship opportunity");
    expect(letter).toContain("emerging software engineer");
    expect(letter).toContain("full-time remote hours to this internship");
    // Verify absence of senior corporate claims
    expect(letter).not.toContain("seasoned professional");
    expect(letter).not.toContain("multi-year enterprise management");
  });

  it("generates an authentic recruiter outreach message for an internship", () => {
    const recruiterMsg = generateRecruiterMessage(
      mockCandidate,
      internshipCompany,
      internshipTitle,
      internshipDescription
    );

    expect(recruiterMsg).toContain("Software Engineer Intern (Full Stack)");
    expect(recruiterMsg).toContain("Formlabs");
    expect(recruiterMsg).toContain("internship");
    expect(recruiterMsg).toContain("internship program");
    expect(recruiterMsg).toContain("Astra Vision");
  });

  it("generates a complete application kit with ATS alignment score >= 70", async () => {
    const kit = await generateTailoredKit(
      mockCandidate,
      internshipTitle,
      internshipCompany,
      internshipDescription
    );

    expect(kit).toBeDefined();
    expect(kit.tailoredSummary).toBeDefined();
    expect(kit.coverLetter).toContain("Formlabs");
    expect(kit.coverLetter).toContain("internship");
    expect(kit.recruiterMessage).toContain("Formlabs");
    expect(kit.atsReviewerScore).toBeGreaterThanOrEqual(70);
    expect(kit.tailoredProjects.length).toBeGreaterThanOrEqual(2);
  }, 15000);
});
