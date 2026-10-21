import fs from "node:fs";
import path from "node:path";
import { describe, it, expect, vi, afterEach } from "vitest";
import axios from "axios";
import { PlatformSource, RemoteScope } from "@prisma/client";
import {
  AstraProvider,
  parseAstraListingPage,
  parseAstraJobPostingJsonLd,
} from "@/lib/providers/astra";

const FIXTURES_DIR = path.join(__dirname, "fixtures", "astra");

function loadFixture(name: string, vars: Record<string, string> = {}): string {
  let content = fs.readFileSync(path.join(FIXTURES_DIR, name), "utf8");
  for (const [k, v] of Object.entries(vars)) {
    content = content.replaceAll(`{{${k}}}`, v);
  }
  return content;
}

const freshIso = new Date().toISOString();
const staleIso = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

describe("astra parsers", () => {
  it("1. parses listing page -> correct detail URLs, deduped", () => {
    const html = loadFixture("listing.html");
    const urls = parseAstraListingPage(html);
    expect(urls).toEqual([
      "https://useastra.in/jobs/glean-application-security-engineer-13154",
      "https://useastra.in/jobs/acme-onsite-software-engineer-13200",
      "https://useastra.in/jobs/globex-hybrid-backend-engineer-13201",
      "https://useastra.in/jobs/initech-stale-frontend-engineer-13202",
      "https://useastra.in/jobs/broken-malformed-jsonld-13203",
      "https://useastra.in/internships/drivetrain-engineering-intern-gen-ai-for-fp-a-platform-1832",
    ]);
  });

  it("2. parses JSON-LD -> correct field mapping", () => {
    const html = loadFixture("detail-remote.html", { FRESH_DATE: freshIso });
    const parsed = parseAstraJobPostingJsonLd(html);
    expect(parsed).not.toBeNull();
    expect(parsed!.title).toBe("Application Security Engineer");
    expect(parsed!.company).toBe("Glean");
    expect(parsed!.jobLocationType).toBe("TELECOMMUTE");
    expect(parsed!.applicantLocationRequirements).toBe("India");
    expect(parsed!.employmentType).toBe("FULL_TIME");
    expect(parsed!.identifier).toBe("13154");
    expect(parsed!.datePosted?.toISOString()).toBe(freshIso);
    expect(parsed!.description).toContain("Glean is the Work AI platform");
  });

  it("6. malformed / missing JSON-LD -> returns null, no throw", () => {
    const malformedHtml = loadFixture("detail-malformed.html");
    expect(() => parseAstraJobPostingJsonLd(malformedHtml)).not.toThrow();
    expect(parseAstraJobPostingJsonLd(malformedHtml)).toBeNull();
    expect(parseAstraJobPostingJsonLd("<html><body>No scripts here</body></html>")).toBeNull();
    expect(parseAstraJobPostingJsonLd("")).toBeNull();
  });
});

describe("AstraProvider", () => {
  afterEach(() => vi.restoreAllMocks());

  it("initializes correctly", () => {
    const p = new AstraProvider();
    expect(p.providerKey).toBe(PlatformSource.ASTRA);
  });

  it("3. TELECOMMUTE job kept and applicantLocationRequirements mapped via parseRemoteScope", async () => {
    const remoteJobHtml = loadFixture("detail-remote.html", { FRESH_DATE: freshIso });
    const remoteInternHtml = loadFixture("detail-remote-internship.html", {
      FRESH_DATE: freshIso,
    });

    vi.spyOn(axios, "get").mockImplementation(async (url: string) => {
      if (url.endsWith("/jobs/location/remote")) {
        return {
          status: 200,
          data: `<a href="/jobs/glean-application-security-engineer-13154">Glean</a>`,
        };
      }
      if (url.endsWith("/internships/browse?region=global")) {
        return {
          status: 200,
          data: `<script>self.__next_f.push([1,"{\\"company_internship_role_name\\":\\"Intern\\",\\"work_mode\\":\\"Remote\\",\\"publicSlug\\":\\"drivetrain-engineering-intern-gen-ai-for-fp-a-platform-1832\\"}"])</script>`,
        };
      }
      if (url.endsWith("/internships/browse?region=india")) {
        return { status: 200, data: "<html></html>" };
      }
      if (url.endsWith("glean-application-security-engineer-13154")) {
        return { status: 200, data: remoteJobHtml };
      }
      if (url.endsWith("drivetrain-engineering-intern-gen-ai-for-fp-a-platform-1832")) {
        return { status: 200, data: remoteInternHtml };
      }
      throw new Error(`Unexpected URL: ${url}`);
    });

    const result = await new AstraProvider().fetch();
    expect(result.success).toBe(true);
    expect(result.jobs).toHaveLength(2);
    expect(result.diagnostics?.accepted).toBe(2);

    const gleanJob = result.jobs.find((j) => j.company === "Glean")!;
    expect(gleanJob.isRemote).toBe(true);
    expect(gleanJob.remoteScope).toBe(RemoteScope.INDIA);
    expect(gleanJob.opportunitySignals).toContain("NICHE_SOURCE");

    const drivetrainIntern = result.jobs.find((j) => j.company === "Drivetrain")!;
    expect(drivetrainIntern.isRemote).toBe(true);
    expect(drivetrainIntern.remoteScope).toBe(RemoteScope.WORLDWIDE);
    expect(drivetrainIntern.jobType).toBe("Remote Internship");
  });

  it("4. onsite job (no jobLocationType) dropped", async () => {
    const onsiteHtml = loadFixture("detail-onsite.html", { FRESH_DATE: freshIso });

    vi.spyOn(axios, "get").mockImplementation(async (url: string) => {
      if (url.endsWith("/jobs/location/remote")) {
        return {
          status: 200,
          data: `<a href="/jobs/acme-onsite-software-engineer-13200">Acme</a>`,
        };
      }
      if (url.includes("/internships/browse")) {
        return { status: 200, data: "<html></html>" };
      }
      if (url.endsWith("acme-onsite-software-engineer-13200")) {
        return { status: 200, data: onsiteHtml };
      }
      throw new Error(`Unexpected URL: ${url}`);
    });

    const result = await new AstraProvider().fetch();
    expect(result.jobs).toHaveLength(0);
    expect(result.jobsRejected).toBe(1);
    expect(result.diagnostics?.roleGateRejected).toBe(1);
  });

  it("5. hybrid in title with TELECOMMUTE -> dropped", async () => {
    const hybridHtml = loadFixture("detail-hybrid.html", { FRESH_DATE: freshIso });

    vi.spyOn(axios, "get").mockImplementation(async (url: string) => {
      if (url.endsWith("/jobs/location/remote")) {
        return {
          status: 200,
          data: `<a href="/jobs/globex-hybrid-backend-engineer-13201">Globex</a>`,
        };
      }
      if (url.includes("/internships/browse")) {
        return { status: 200, data: "<html></html>" };
      }
      if (url.endsWith("globex-hybrid-backend-engineer-13201")) {
        return { status: 200, data: hybridHtml };
      }
      throw new Error(`Unexpected URL: ${url}`);
    });

    const result = await new AstraProvider().fetch();
    expect(result.jobs).toHaveLength(0);
    expect(result.jobsRejected).toBe(1);
    expect(result.diagnostics?.roleGateRejected).toBe(1);
  });

  it("6b. malformed / missing JSON-LD in provider fetch -> dropped, no throw", async () => {
    const malformedHtml = loadFixture("detail-malformed.html");

    vi.spyOn(axios, "get").mockImplementation(async (url: string) => {
      if (url.endsWith("/jobs/location/remote")) {
        return {
          status: 200,
          data: `<a href="/jobs/broken-malformed-jsonld-13203">Broken</a>`,
        };
      }
      if (url.includes("/internships/browse")) {
        return { status: 200, data: "<html></html>" };
      }
      if (url.endsWith("broken-malformed-jsonld-13203")) {
        return { status: 200, data: malformedHtml };
      }
      throw new Error(`Unexpected URL: ${url}`);
    });

    const result = await new AstraProvider().fetch();
    expect(result.jobs).toHaveLength(0);
    expect(result.jobsRejected).toBe(1);
    expect(result.diagnostics?.invalidUrl).toBe(1);
  });

  it("7. stale posting dropped", async () => {
    const staleHtml = loadFixture("detail-remote.html", { FRESH_DATE: staleIso });

    vi.spyOn(axios, "get").mockImplementation(async (url: string) => {
      if (url.endsWith("/jobs/location/remote")) {
        return {
          status: 200,
          data: `<a href="/jobs/initech-stale-frontend-engineer-13202">Initech</a>`,
        };
      }
      if (url.includes("/internships/browse")) {
        return { status: 200, data: "<html></html>" };
      }
      if (url.endsWith("initech-stale-frontend-engineer-13202")) {
        return { status: 200, data: staleHtml };
      }
      throw new Error(`Unexpected URL: ${url}`);
    });

    const result = await new AstraProvider().fetch();
    expect(result.jobs).toHaveLength(0);
    expect(result.jobsRejected).toBe(1);
    expect(result.diagnostics?.roleGateRejected).toBe(1);
  });

  it("8. one network endpoint failing -> provider still returns others + telemetry records failure", async () => {
    const remoteInternHtml = loadFixture("detail-remote-internship.html", {
      FRESH_DATE: freshIso,
    });

    vi.spyOn(axios, "get").mockImplementation(async (url: string) => {
      if (url.endsWith("/jobs/location/remote")) {
        throw new Error("ECONNRESET: network timeout");
      }
      if (url.endsWith("/internships/browse?region=global")) {
        return {
          status: 200,
          data: `<script>self.__next_f.push([1,"{\\"company_internship_role_name\\":\\"Intern\\",\\"publicSlug\\":\\"drivetrain-engineering-intern-gen-ai-for-fp-a-platform-1832\\"}"])</script>`,
        };
      }
      if (url.endsWith("/internships/browse?region=india")) {
        return { status: 200, data: "<html></html>" };
      }
      if (url.endsWith("drivetrain-engineering-intern-gen-ai-for-fp-a-platform-1832")) {
        return { status: 200, data: remoteInternHtml };
      }
      throw new Error(`Unexpected URL: ${url}`);
    });

    const result = await new AstraProvider().fetch();
    expect(result.success).toBe(true);
    expect(result.jobs.length).toBe(1);
    expect(result.jobs[0].company).toBe("Drivetrain");

    expect(result.endpointTelemetry).toHaveLength(3);
    const failedEndpoint = result.endpointTelemetry!.find(
      (t) => t.endpointKey === "astra_jobs_remote"
    );
    expect(failedEndpoint).toBeDefined();
    expect(failedEndpoint!.success).toBe(false);
    expect(failedEndpoint!.error).toContain("ECONNRESET");

    expect(result.endpointTelemetrySummary!.totalEndpoints).toBe(3);
    expect(result.endpointTelemetrySummary!.successfulEndpoints).toBe(2);
    expect(result.endpointTelemetrySummary!.failedEndpoints).toBe(1);
  });

  it("9. live fetch never returns non-remote jobs", async () => {
    const result = await new AstraProvider().fetch();
    expect(result.endpointTelemetry!.length).toBe(3);
    for (const job of result.jobs) {
      expect(job.isRemote).toBe(true);
      expect(job.location.toLowerCase()).toContain("remote");
      expect(job.title.toLowerCase()).not.toMatch(/\b(hybrid|onsite|on-site|in-office)\b/);
    }
  }, 60000);
});
