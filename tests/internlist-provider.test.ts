import { describe, it, expect, vi, afterEach } from "vitest";
import axios from "axios";
import { PlatformSource } from "@prisma/client";
import {
  InternListProvider,
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

describe("intern-list parsers", () => {
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

  it("initializes correctly", () => {
    const p = new InternListProvider();
    expect(p.providerKey).toBe(PlatformSource.INTERN_LIST);
  });

  it("keeps remote internships and strictly rejects onsite and hybrid", async () => {
    vi.spyOn(axios, "get").mockImplementation(async (url: string) => {
      if (url.endsWith("/swe-intern-list") || url.endsWith("/da-intern-list")) {
        return { status: 200, data: url.endsWith("/swe-intern-list") ? LIST_HTML : "" };
      }
      if (url.includes("remote_one")) return { status: 200, data: detailHtml("Remote", "United States") };
      if (url.includes("onsite_one")) return { status: 200, data: detailHtml("Onsite", "Atlanta, GA") };
      return { status: 200, data: detailHtml("Hybrid", "Austin, TX") };
    });

    const result = await new InternListProvider().fetch();
    expect(result.success).toBe(true);
    expect(result.jobs.length).toBe(1);
    expect(result.jobs[0].company).toBe("Acme");
    expect(result.jobs[0].isRemote).toBe(true);
    expect(result.jobs[0].jobType).toBe("Remote Internship");
    expect(result.jobs[0].canonicalAppUrl).toBe("https://jobright.ai/jobs/info/abc123");
    expect(result.jobs[0].opportunitySignals).toContain("NICHE_SOURCE");
    expect(result.jobsRejected).toBe(2);
  });

  it("live fetch never returns non-remote jobs", async () => {
    const result = await new InternListProvider().fetch();
    expect(result.endpointTelemetry!.length).toBe(2);
    for (const job of result.jobs) {
      expect(job.isRemote).toBe(true);
      expect(job.location.toLowerCase()).toContain("remote");
    }
  }, 30000);
});
