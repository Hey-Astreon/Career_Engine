import { describe, it, expect, vi, afterEach } from "vitest";
import axios from "axios";
import { PlatformSource } from "@prisma/client";
import {
  InternListProvider,
  INTERN_LIST_CATEGORIES,
  parseInternListPage,
  parseInternListDetail,
} from "@/lib/providers/internlist";

const today = new Date();
const fmt = today.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

const listItem = (slug: string, title: string, company: string) =>
  `<div role="listitem" class="collection-item-8 w-dyn-item"><a href="${slug}" class="w-inline-block"></a><a href="${slug}" class="flex-block-27 w-inline-block"><div class="w-layout-hflex joblist"><p class="jobtitle">${title}</p><p class="blogtag">${fmt}</p></div><p class="companyname_list">${company}</p></a></div>`;

const LIST_HTML =
  listItem("/swe-intern-list/remote_one", "Software Engineering Intern", "Acme") +
  listItem("/swe-intern-list/onsite_one", "Software Engineering Intern", "Globex") +
  listItem("/swe-intern-list/hybrid_one", "Backend Developer Intern", "Initech");

const detailHtml = (type: string, loc: string) =>
  `<html><head><title>Software Engineering Intern at X | ${loc}</title></head><body>` +
  `<div class="text-block-47">${type}</div>` +
  `<p>This internship builds backend services and APIs for a distributed platform used by thousands of customers.</p>` +
  `<a href="https://jobright.ai/jobs/info/abc123?utm_source=1111&amp;utm_campaign=x" class="link-2">Apply Now</a></body></html>`;

describe("intern-list parsers (legacy Webflow)", () => {
  it("parses list entries", () => {
    const entries = parseInternListPage(LIST_HTML);
    expect(entries.length).toBe(3);
    expect(entries[0].company).toBe("Acme");
    expect(entries[0].slug).toBe("/swe-intern-list/remote_one");
  });

  it("parses workplace type, location and clean apply url", () => {
    const d = parseInternListDetail(detailHtml("Remote", "United States"));
    expect(d.workplaceType).toBe("Remote");
    expect(d.location).toBe("United States");
    expect(d.applyUrl).toBe("https://jobright.ai/jobs/info/abc123");
    expect(d.description.length).toBeGreaterThan(40);
  });
});

describe("InternListProvider", () => {
  afterEach(() => vi.restoreAllMocks());

  it("initializes correctly with defined categories", () => {
    const p = new InternListProvider();
    expect(p.providerKey).toBe(PlatformSource.INTERN_LIST);
    expect(INTERN_LIST_CATEGORIES.length).toBeGreaterThanOrEqual(5);
  });

  it("keeps remote internships and strictly filters non-developer roles", async () => {
    const mockJobs = [
      {
        jobId: "remote_swe_1",
        properties: {
          title: "Software Engineer Intern",
          company: "Acme Cloud",
          location: "United States",
          salary: "$45-$50/hr",
          workModel: "Remote",
          qualifications: "Experience with TypeScript, React, and REST APIs.",
        },
        postedAt: Date.now() - 3600000,
      },
      {
        jobId: "non_dev_role",
        properties: {
          title: "Account Executive Intern",
          company: "SalesCorp",
          location: "United States",
          salary: "$25/hr",
          workModel: "Remote",
          qualifications: "Cold calling and lead generation.",
        },
        postedAt: Date.now() - 3600000,
      },
      {
        jobId: "senior_role",
        properties: {
          title: "Senior Staff Engineering Manager",
          company: "MegaCorp",
          location: "United States",
          salary: "$200,000",
          workModel: "Remote",
          qualifications: "Manage 20+ engineers.",
        },
        postedAt: Date.now() - 3600000,
      },
    ];

    vi.spyOn(axios, "post").mockImplementation(async (url: string) => {
      if (url.includes("swan/mini-sites/list")) {
        return {
          status: 200,
          data: {
            success: true,
            result: {
              total: mockJobs.length,
              jobList: mockJobs,
            },
          },
        };
      }
      return { status: 404, data: {} };
    });

    const result = await new InternListProvider().fetch();
    expect(result.success).toBe(true);
    expect(result.jobs.length).toBe(1);
    expect(result.jobs[0].company).toBe("Acme Cloud");
    expect(result.jobs[0].title).toBe("Software Engineer Intern");
    expect(result.jobs[0].isRemote).toBe(true);
    expect(result.jobs[0].jobType).toBe("Remote Internship");
    expect(result.jobs[0].canonicalAppUrl).toBe(
      "https://jobright.ai/jobs/info/remote_swe_1?utm_source=intern-list"
    );
    expect(result.jobs[0].opportunitySignals).toContain("NICHE_SOURCE");
    expect(result.jobs[0].metadata?.salary).toBe("$45-$50/hr");
    expect(result.diagnostics!.accepted).toBe(1);
  });

  it("live fetch returns verified remote jobs with valid structure", async () => {
    const result = await new InternListProvider().fetch();
    expect(result.success).toBe(true);
    expect(result.endpointTelemetry!.length).toBeGreaterThan(0);
    expect(result.jobs.length).toBeGreaterThan(0);
    for (const job of result.jobs) {
      expect(job.isRemote).toBe(true);
      expect(job.location.toLowerCase()).toContain("remote");
      expect(job.providerKey).toBe(PlatformSource.INTERN_LIST);
      expect(job.canonicalAppUrl).toContain("jobright.ai/jobs/info/");
    }
  }, 35000);
});
