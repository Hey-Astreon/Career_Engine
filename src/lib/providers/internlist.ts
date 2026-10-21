import axios from "axios";
import { PlatformSource, RemoteScope } from "@prisma/client";
import {
  JobSourceProvider,
  NormalizedJob,
  ProviderEndpointTelemetry,
  ProviderResult,
  ProviderStageDiagnostics,
} from "./types";
import {
  cleanCompanySlug,
  cleanHtmlText,
  determineCategory,
  determineJobType,
  determineExperienceLevel,
  determineOpportunitySignals,
  isOlderThanMaxPostingAge,
  MAX_POSTING_AGE_DAYS,
  isStrictlyRemoteDeveloperRole,
  parseRemoteScope,
  sanitizeRoleTitle,
} from "./normalize";

const BASE_URL = "https://www.intern-list.com";
const SWAN_API_URL = "https://jobright.ai/swan/mini-sites/list";
const REQUEST_TIMEOUT_MS = 10000;
const HEADERS = {
  "User-Agent":
    "CareerAgent/2.0 (Job Discovery Engine; https://github.com/Hey-Astreon/CareerAgent)",
  Accept: "application/json, text/plain, */*",
  "Content-Type": "application/json",
};

export const INTERN_LIST_CATEGORIES = [
  { key: "intern_us_swe", category: "intern:us:swe", label: "Software Engineering (US)" },
  { key: "intern_us_ml_ai", category: "intern:us:ml_ai", label: "AI & Machine Learning" },
  { key: "intern_us_da", category: "intern:us:data_analysis", label: "Data Analysis" },
  { key: "intern_us_cyber", category: "intern:us:cyber_security", label: "Cybersecurity" },
  { key: "intern_ca_swe", category: "intern:ca:swe", label: "Software Engineering (Canada)" },
  { key: "newgrad_us_swe", category: "newgrad:us:swe", label: "New Grad Software Engineering" },
  { key: "newgrad_us_da", category: "newgrad:us:data_analysis", label: "New Grad Data Analysis" },
];

export interface InternListMinisiteJob {
  jobId: string;
  tabCategory?: string[];
  properties: {
    title: string;
    company: string;
    location?: string;
    salary?: string;
    workModel?: string;
    industry?: string[];
    companySize?: string;
    qualifications?: string;
    expLevel?: string | null;
    jobFunction?: string | null;
    h1bSponsored?: string;
    isNewGrad?: boolean;
    roleType?: string | null;
    hireTime?: string;
    graduateTime?: string;
  };
  postedAt?: number;
}

// Legacy Webflow types & functions preserved for full backwards-compatibility
export interface ListEntry {
  title: string;
  company: string;
  postedAt: Date | null;
  slug: string;
}

export function parseInternListPage(html: string): ListEntry[] {
  const entries: ListEntry[] = [];
  const chunks = html.split(/<div role="listitem" class="collection-item-\d+ w-dyn-item">/i).slice(1);
  for (const raw of chunks) {
    const slug = /href="([^"]+)"/i.exec(raw)?.[1];
    const title = /class="jobtitle">([\s\S]*?)<\/p>/i.exec(raw)?.[1];
    const company = /class="companyname_list">([\s\S]*?)<\/p>/i.exec(raw)?.[1];
    const date = /class="blogtag">([\s\S]*?)<\/p>/i.exec(raw)?.[1];
    if (!slug || !title) continue;
    const parsed = date ? new Date(date.trim()) : null;
    entries.push({
      slug,
      title: cleanHtmlText(title.trim()),
      company: cleanHtmlText((company ?? "").trim()),
      postedAt: parsed && !isNaN(parsed.getTime()) ? parsed : null,
    });
  }
  return entries;
}

export interface InternListDetail {
  workplaceType: string | null;
  location: string;
  applyUrl: string | null;
  description: string;
}

export function parseInternListDetail(html: string): InternListDetail {
  const workplaceType = /class="text-block-47">(Onsite|Remote|Hybrid)</i.exec(html)?.[1] ?? null;
  const titleTag = /<title>([\s\S]*?)<\/title>/i.exec(html)?.[1] ?? "";
  const pipe = titleTag.lastIndexOf("|");
  const location = pipe !== -1 ? cleanHtmlText(titleTag.substring(pipe + 1).trim()) : "";

  const applyRaw = /<a[^>]*href="([^"]+)"[^>]*class="link-2"/i.exec(html)?.[1] ?? null;
  let applyUrl: string | null = null;
  if (applyRaw) {
    try {
      const u = new URL(applyRaw.replace(/&amp;/g, "&"));
      u.search = "";
      applyUrl = u.toString();
    } catch {
      applyUrl = null;
    }
  }

  const paragraphs = [...html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)]
    .map((m) => cleanHtmlText(m[1].replace(/<[^>]+>/g, "").trim()))
    .filter((t) => t.length > 40)
    .slice(0, 3);

  return { workplaceType, location, applyUrl, description: paragraphs.join("\n\n") };
}

export class InternListProvider implements JobSourceProvider {
  name = "Intern-List (Tech Internships)";
  providerKey = PlatformSource.INTERN_LIST;
  timeoutMs = 25000;

  async fetch(): Promise<ProviderResult> {
    const startTime = Date.now();
    const jobs: NormalizedJob[] = [];
    const telemetry: ProviderEndpointTelemetry[] = [];
    let discoveredCount = 0;
    let rejectedCount = 0;

    const diagnostics: ProviderStageDiagnostics = {
      rawCandidates: 0,
      missingTitle: 0,
      invalidUrl: 0,
      roleGateRejected: 0,
      accepted: 0,
      instrumented: true,
    };

    const seenJobIds = new Set<string>();

    for (const cat of INTERN_LIST_CATEGORIES) {
      const endpointUrl = `${SWAN_API_URL}?position=0&count=50`;
      const t0 = Date.now();
      try {
        const res = await axios.post<{
          success: boolean;
          errorCode?: number;
          result?: { total: number; jobList: InternListMinisiteJob[] };
        }>(
          endpointUrl,
          {
            category: cat.category,
            workModel: [2], // 2 = Remote only
          },
          { headers: HEADERS, timeout: REQUEST_TIMEOUT_MS }
        );

        const latencyMs = Date.now() - t0;
        const jobList = res.data?.result?.jobList || [];

        telemetry.push({
          endpointKey: cat.key,
          endpoint: endpointUrl,
          latencyMs,
          attempts: 1,
          success: true,
          statusCode: res.status,
        });

        for (const item of jobList) {
          discoveredCount++;
          diagnostics.rawCandidates++;

          if (!item.jobId) {
            diagnostics.invalidUrl++;
            rejectedCount++;
            continue;
          }

          if (seenJobIds.has(item.jobId)) {
            continue;
          }
          seenJobIds.add(item.jobId);

          const rawTitle = item.properties?.title;
          if (!rawTitle) {
            diagnostics.missingTitle++;
            rejectedCount++;
            continue;
          }

          const title = sanitizeRoleTitle(rawTitle);
          const rawCompany = item.properties?.company || "Tech Startup";
          const { company, companySlug } = cleanCompanySlug(rawCompany);

          // Build clean location string with explicit Remote marker
          const rawLoc = item.properties?.location?.trim();
          const location = rawLoc ? `Remote (${rawLoc})` : "Remote";

          // Format description from qualifications, industry, and salary
          const qualifications = item.properties?.qualifications || "";
          const salary = item.properties?.salary ? `Compensation: ${item.properties.salary}` : "";
          const industries = item.properties?.industry?.length
            ? `Industry: ${item.properties.industry.join(", ")}`
            : "";
          const rawDescription = [
            `${title} at ${company}.`,
            salary,
            industries,
            qualifications ? `Qualifications:\n${qualifications}` : "",
          ]
            .filter(Boolean)
            .join("\n\n");

          const postedAt = item.postedAt ? new Date(item.postedAt) : new Date();

          // Role gate verification: must be remote developer / tech role
          if (!isStrictlyRemoteDeveloperRole(title, location, rawDescription, postedAt)) {
            diagnostics.roleGateRejected++;
            rejectedCount++;
            continue;
          }

          // Strict max age verification
          if (isOlderThanMaxPostingAge(postedAt, MAX_POSTING_AGE_DAYS)) {
            rejectedCount++;
            continue;
          }

          const isInternship =
            cat.category.startsWith("intern:") ||
            title.toLowerCase().includes("intern") ||
            determineJobType(title, rawDescription) === "Remote Internship";

          const jobType = isInternship ? "Remote Internship" : "Remote Full-Time";
          const experienceLevel = isInternship
            ? "Fresher / Entry Level (0-1 Yr)"
            : determineExperienceLevel(title, rawDescription);

          const canonicalAppUrl = `https://jobright.ai/jobs/info/${item.jobId}?utm_source=intern-list`;
          const discoveryUrl = `${BASE_URL}/`;
          const remoteScope: RemoteScope = parseRemoteScope(location, rawDescription);

          jobs.push({
            sourceJobId: `intern-list-${item.jobId}`,
            providerKey: PlatformSource.INTERN_LIST,
            company,
            companySlug,
            title,
            category: determineCategory(title, rawDescription),
            jobType,
            experienceLevel,
            location,
            isRemote: true,
            remoteScope,
            discoveryUrl,
            canonicalAppUrl,
            applicationUrlType: "AGGREGATOR_PAGE",
            verificationStatus: "VERIFIED_AGGREGATOR",
            postedAt,
            applicantCount: null,
            opportunitySignals: determineOpportunitySignals({
              postedAt,
              applicationUrlType: "AGGREGATOR_PAGE",
              canonicalAppUrl,
              providerKey: PlatformSource.INTERN_LIST,
            }),
            rawDescription,
            hasFullText: rawDescription.length > 80,
            metadata: {
              salary: item.properties?.salary,
              graduateTime: item.properties?.graduateTime,
              industry: item.properties?.industry,
              h1bSponsored: item.properties?.h1bSponsored,
            },
          });
          diagnostics.accepted++;
        }
      } catch (err: unknown) {
        telemetry.push({
          endpointKey: cat.key,
          endpoint: endpointUrl,
          latencyMs: Date.now() - t0,
          attempts: 1,
          success: false,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    const failed = telemetry.filter((t) => !t.success);
    return {
      providerKey: PlatformSource.INTERN_LIST,
      jobs,
      success: failed.length < telemetry.length,
      error: failed.length === telemetry.length ? failed[0]?.error : undefined,
      durationMs: Date.now() - startTime,
      jobsDiscovered: discoveredCount,
      jobsRejected: rejectedCount,
      diagnostics,
      endpointTelemetry: telemetry,
      endpointTelemetrySummary: {
        totalEndpoints: telemetry.length,
        successfulEndpoints: telemetry.length - failed.length,
        failedEndpoints: failed.length,
        failureRatePercent: telemetry.length
          ? Math.round((failed.length / telemetry.length) * 100)
          : 0,
        averageLatencyMs: telemetry.length
          ? Math.round(telemetry.reduce((a, t) => a + t.latencyMs, 0) / telemetry.length)
          : 0,
      },
    };
  }
}
