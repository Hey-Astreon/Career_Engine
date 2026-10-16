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
  determineOpportunitySignals,
  isOlderThanMaxPostingAge,
  MAX_POSTING_AGE_DAYS,
  isStrictlyRemoteDeveloperRole,
  parseRemoteScope,
  sanitizeRoleTitle,
} from "./normalize";

const BASE_URL = "https://www.intern-list.com";
const LIST_PAGES = [
  { key: "intern_list_swe", path: "/swe-intern-list" },
  { key: "intern_list_da", path: "/da-intern-list" },
];
const REQUEST_TIMEOUT_MS = 6000;
const DETAIL_CONCURRENCY = 10;
const HEADERS = {
  "User-Agent":
    "CareerAgent/2.0 (Job Discovery Engine; https://github.com/Hey-Astreon/CareerAgent)",
  Accept: "text/html",
};

interface ListEntry {
  title: string;
  company: string;
  postedAt: Date | null;
  slug: string;
}

/** Parses the Webflow collection list rendered server-side on each intern-list page. */
export function parseInternListPage(html: string): ListEntry[] {
  const entries: ListEntry[] = [];
  // Split (not matchAll) so adjacent items are never skipped by a consumed delimiter.
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

/** Extracts workplace type (Remote/Onsite/Hybrid), location, apply link and summary from a detail page. */
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

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const i = cursor++;
      results[i] = await fn(items[i]);
    }
  });
  await Promise.all(workers);
  return results;
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

    const entries: (ListEntry & { category: string })[] = [];
    const seenSlugs = new Set<string>();

    for (const page of LIST_PAGES) {
      const url = `${BASE_URL}${page.path}`;
      const t0 = Date.now();
      try {
        const res = await axios.get<string>(url, { headers: HEADERS, timeout: REQUEST_TIMEOUT_MS });
        telemetry.push({ endpointKey: page.key, endpoint: url, latencyMs: Date.now() - t0, attempts: 1, success: true, statusCode: res.status });
        for (const e of parseInternListPage(res.data)) {
          if (seenSlugs.has(e.slug)) continue;
          seenSlugs.add(e.slug);
          entries.push({ ...e, category: page.key });
        }
      } catch (err: unknown) {
        telemetry.push({
          endpointKey: page.key,
          endpoint: url,
          latencyMs: Date.now() - t0,
          attempts: 1,
          success: false,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    discoveredCount = entries.length;
    diagnostics.rawCandidates = entries.length;

    // Drop stale entries before spending a request on their detail page.
    const fresh = entries.filter((e) => {
      if (e.postedAt && isOlderThanMaxPostingAge(e.postedAt, MAX_POSTING_AGE_DAYS)) {
        rejectedCount++;
        return false;
      }
      return true;
    });

    const details = await mapWithConcurrency(fresh, DETAIL_CONCURRENCY, async (e) => {
      try {
        const res = await axios.get<string>(`${BASE_URL}${e.slug}`, { headers: HEADERS, timeout: REQUEST_TIMEOUT_MS });
        return parseInternListDetail(res.data);
      } catch {
        return null;
      }
    });

    fresh.forEach((entry, i) => {
      const detail = details[i];
      if (!detail) {
        diagnostics.invalidUrl++;
        rejectedCount++;
        return;
      }

      // STRICT: remote only. Onsite, Hybrid and unknown workplace types are rejected.
      if (!detail.workplaceType || detail.workplaceType.toLowerCase() !== "remote") {
        diagnostics.roleGateRejected++;
        rejectedCount++;
        return;
      }

      const title = sanitizeRoleTitle(entry.title);
      const location = detail.location ? `Remote (${detail.location})` : "Remote";
      const desc = detail.description || `${entry.title} at ${entry.company}`;

      if (!isStrictlyRemoteDeveloperRole(title, location, desc, entry.postedAt)) {
        diagnostics.roleGateRejected++;
        rejectedCount++;
        return;
      }

      const discoveryUrl = `${BASE_URL}${entry.slug}`;
      const canonicalAppUrl = detail.applyUrl ?? discoveryUrl;
      const { company, companySlug } = cleanCompanySlug(entry.company || "Unknown");
      const remoteScope: RemoteScope = parseRemoteScope(location, desc);

      jobs.push({
        sourceJobId: `intern-list-${entry.slug.split("/").pop()}`,
        providerKey: PlatformSource.INTERN_LIST,
        company,
        companySlug,
        title,
        category: determineCategory(title, desc),
        jobType: "Remote Internship",
        experienceLevel: "Fresher / Entry Level (0-1 Yr)",
        location,
        isRemote: true,
        remoteScope,
        discoveryUrl,
        canonicalAppUrl,
        applicationUrlType: "AGGREGATOR_PAGE",
        verificationStatus: "VERIFIED_AGGREGATOR",
        postedAt: entry.postedAt,
        applicantCount: null,
        opportunitySignals: determineOpportunitySignals({
          postedAt: entry.postedAt,
          applicationUrlType: "AGGREGATOR_PAGE",
          canonicalAppUrl,
          providerKey: PlatformSource.INTERN_LIST,
        }),
        rawDescription: desc,
        hasFullText: desc.length > 100,
      });
      diagnostics.accepted++;
    });

    const failed = telemetry.filter((t) => !t.success);
    return {
      providerKey: PlatformSource.INTERN_LIST,
      jobs,
      // Zero remote roles on a given day is a valid outcome; only fail if no list page loaded.
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
        failureRatePercent: telemetry.length ? Math.round((failed.length / telemetry.length) * 100) : 0,
        averageLatencyMs: telemetry.length
          ? Math.round(telemetry.reduce((a, t) => a + t.latencyMs, 0) / telemetry.length)
          : 0,
      },
    };
  }
}
