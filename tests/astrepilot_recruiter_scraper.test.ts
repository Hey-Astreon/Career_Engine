import { describe, it, expect, beforeEach, afterAll } from "vitest";
import * as cheerio from "cheerio";
import path from "path";
import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const devDbPath = path.join(process.cwd(), "prisma", "dev.db");
const adapter = new PrismaLibSql({ url: `file:${devDbPath.replace(/\\/g, "/")}` });
const testDb = new PrismaClient({ adapter });

// Helper recreating the content.js DOM extraction logic on Cheerio / DOM node
function parseRecruiterFromHtml(html: string) {
  const $ = cheerio.load(html);

  // 1. LinkedIn Job View Hiring Team Card Selectors
  const hirerCard = $(
    ".hirer-card__hirer-information, [data-view-name='job-details-hiring-team'], .jobs-poster, .job-details-jobs-unified-top-card__hiring-team, .hirer-card"
  ).first();

  if (hirerCard.length > 0) {
    const linkEl = hirerCard.find("a[href*='/in/'], a[href*='linkedin.com/in/']").first();
    const nameEl = hirerCard.find(".jobs-poster__name, .hirer-card__hirer-information a, .inline-show-more-text, strong, h3").first();
    const titleEl = hirerCard.find(".jobs-poster__title, .hirer-card__job-poster-headline, .jobs-poster__headline, .linked-area").first();

    let profileUrl = linkEl.attr("href") || null;
    if (profileUrl) {
      profileUrl = profileUrl.split("?")[0].replace(/\/+$/, "");
    }

    const rawName = nameEl.text().trim() || null;
    const rawTitle = titleEl.text().trim() || "Recruiter / Hiring Lead";

    let linkedinId: string | null = null;
    if (profileUrl) {
      const match = profileUrl.match(/\/in\/([a-zA-Z0-9_%-]+)/);
      if (match) linkedinId = decodeURIComponent(match[1]);
    }

    if (profileUrl || rawName) {
      return {
        name: rawName || "Hiring Lead",
        title: rawTitle,
        profileUrl,
        linkedinId,
      };
    }
  }

  // 2. Generic ATS Link Scans
  const genericLink = $("a[href*='linkedin.com/in/']:not([href*='linkedin.com/company/'])").first();
  if (genericLink.length > 0) {
    let profileUrl = (genericLink.attr("href") || "").split("?")[0].replace(/\/+$/, "");
    let linkedinId: string | null = null;
    const match = profileUrl.match(/\/in\/([a-zA-Z0-9_%-]+)/);
    if (match) linkedinId = decodeURIComponent(match[1]);
    const name = genericLink.text().trim() || "Hiring Lead";
    return {
      name,
      title: "Hiring Lead",
      profileUrl,
      linkedinId,
    };
  }

  return null;
}

describe("AstrePilot Recruiter Scraper", () => {
  it("extracts recruiter name, title, profile URL, and LinkedIn ID from LinkedIn hirer card", () => {
    const mockLinkedInHtml = `
      <div class="job-view-layout">
        <div class="hirer-card__hirer-information">
          <a href="https://www.linkedin.com/in/sarah-jenkins-tech-recruiter?trk=job_view">
            <h3 class="jobs-poster__name">Sarah Jenkins</h3>
          </a>
          <div class="hirer-card__job-poster-headline">Senior Technical Recruiter at Figma</div>
        </div>
      </div>
    `;

    const result = parseRecruiterFromHtml(mockLinkedInHtml);
    expect(result).not.toBeNull();
    expect(result?.name).toBe("Sarah Jenkins");
    expect(result?.title).toBe("Senior Technical Recruiter at Figma");
    expect(result?.profileUrl).toBe("https://www.linkedin.com/in/sarah-jenkins-tech-recruiter");
    expect(result?.linkedinId).toBe("sarah-jenkins-tech-recruiter");
  });

  it("handles encoded special characters in LinkedIn handle cleanly", () => {
    const mockHtml = `
      <div class="job-details-jobs-unified-top-card__hiring-team">
        <a href="https://www.linkedin.com/in/alex%2Dchen%2Ddev">
          <strong>Alex Chen</strong>
        </a>
        <span class="jobs-poster__title">Engineering Manager</span>
      </div>
    `;

    const result = parseRecruiterFromHtml(mockHtml);
    expect(result).not.toBeNull();
    expect(result?.name).toBe("Alex Chen");
    expect(result?.title).toBe("Engineering Manager");
    expect(result?.linkedinId).toBe("alex-chen-dev");
  });

  it("extracts hiring manager link from generic ATS career pages", () => {
    const mockGreenhouseHtml = `
      <div class="job-page">
        <div class="team-section">
          <p>Questions? Reach out to our hiring manager:</p>
          <a href="https://www.linkedin.com/in/marcus-aurelius-lead/">Marcus Aurelius</a>
        </div>
      </div>
    `;

    const result = parseRecruiterFromHtml(mockGreenhouseHtml);
    expect(result).not.toBeNull();
    expect(result?.name).toBe("Marcus Aurelius");
    expect(result?.profileUrl).toBe("https://www.linkedin.com/in/marcus-aurelius-lead");
    expect(result?.linkedinId).toBe("marcus-aurelius-lead");
  });

  it("returns null when no recruiter or hiring team card exists", () => {
    const mockCleanHtml = `
      <div class="job-description">
        <h1>Software Engineer</h1>
        <p>We are looking for a developer to join our platform team.</p>
      </div>
    `;

    const result = parseRecruiterFromHtml(mockCleanHtml);
    expect(result).toBeNull();
  });
});

describe("AutopilotSession Recruiter DB Persistence", () => {
  let testProfileId: string;

  beforeEach(async () => {
    const existing = await testDb.profile.findFirst({ select: { id: true } });
    if (existing) {
      testProfileId = existing.id;
    } else {
      const created = await testDb.profile.create({
        data: {
          slug: "test-recruiter-engineer",
          fullName: "Test Engineer",
          email: "test.engineer@example.com",
          title: "Fullstack Engineer",
          location: "Remote",
          masterResumePath: "resumes/test.pdf",
        },
      });
      testProfileId = created.id;
    }
  });

  it("persists recruiter fields to AutopilotSession schema", async () => {
    const session = await testDb.autopilotSession.create({
      data: {
        profileId: testProfileId,
        company: "Stripe",
        jobTitle: "Software Engineer",
        jdText: "Building scalable financial infrastructure.",
        tailoredSummary: "Experienced engineer ready to scale Stripe APIs.",
        keySkills: JSON.stringify(["TypeScript", "Go", "PostgreSQL"]),
        recruiterName: "Elena Rostova",
        recruiterTitle: "Principal Tech Recruiter",
        recruiterLinkedInUrl: "https://www.linkedin.com/in/elena-rostova-talent",
        recruiterId: "elena-rostova-talent",
      },
    });

    expect(session.id).toBeDefined();
    expect(session.recruiterName).toBe("Elena Rostova");
    expect(session.recruiterTitle).toBe("Principal Tech Recruiter");
    expect(session.recruiterLinkedInUrl).toBe("https://www.linkedin.com/in/elena-rostova-talent");
    expect(session.recruiterId).toBe("elena-rostova-talent");

    // Clean up test session
    await testDb.autopilotSession.delete({ where: { id: session.id } });
  });

  afterAll(async () => {
    await testDb.$disconnect();
  });
});
