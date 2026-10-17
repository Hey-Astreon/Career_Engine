import https from "node:https";
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
  determineExperienceLevel,
  determineJobType,
  determineOpportunitySignals,
  isOlderThanMaxPostingAge,
  MAX_POSTING_AGE_DAYS,
  isStrictlyRemoteDeveloperRole,
  parseRemoteScope,
  sanitizeRoleTitle,
} from "./normalize";

const BASE_URL = "https://useastra.in";
const LIST_PAGES = [
  { key: "astra_jobs_remote", path: "/jobs/location/remote" },
  { key: "astra_internships_global", path: "/internships/browse?region=global" },
  { key: "astra_internships_india", path: "/internships/browse?region=india" },
];
const REQUEST_TIMEOUT_MS = 6000;
const DETAIL_CONCURRENCY = 8;
const HTTPS_AGENT = new https.Agent({ family: 4, keepAlive: false });
const HEADERS = {
  "User-Agent":
    "CareerAgent/2.0 (Job Discovery Engine; https://github.com/Hey-Astreon/CareerAgent)",
  Accept: "text/html",
};

const HYBRID_ONSITE_RE = /\b(hybrid|onsite|on-site|in-office)\b/i;

/**
 * Extracts deduplicated detail page URLs (https://useastra.in/jobs/<slug> or
 * https://useastra.in/internships/<slug>) from an Astra listing page.
 * Supports both server-rendered `<a href="/jobs/...">` links and Next.js RSC
 * payload `publicSlug` items (used on internship browse pages).
 */
export function parseAstraListingPage(html: string): string[] {
  if (!html) return [];
  const seen = new Set<string>();
  const urls: string[] = [];

  const addPath = (path: string) => {
    const clean = path.split("?")[0].split("#")[0].trim();
    if (!/^\/(?:jobs|internships)\/[a-z0-9-]+-\d+$/i.test(clean)) return;
    const full = `${BASE_URL}${clean}`;
    if (!seen.has(full)) {
      seen.add(full);
      urls.push(full);
    }
  };

  // 1. Standard anchor hrefs (e.g. sr-only nav on /jobs/location/remote or direct links)
  for (const m of html.matchAll(/href=["'](?:https?:\/\/useastra\.in)?(\/(?:jobs|internships)\/[a-z0-9-]+-\d+)["']/gi)) {
    addPath(m[1]);
  }

  // 2. Next.js RSC flight payload `publicSlug` entries (used on /internships/browse)
  const unescaped = html.replace(/\\"/g, '"');
  const isInternPage =
    (unescaped.includes('"company_internship_role_name"') ||
      unescaped.includes('"/internships/browse"')) &&
    !unescaped.includes('"company_hiring_role_name"');
  const defaultPrefix = isInternPage ? "/internships/" : "/jobs/";

  for (const m of unescaped.matchAll(/"publicSlug"\s*:\s*"([a-z0-9-]+-\d+)"/gi)) {
    const slug = m[1];
    const idx = m.index ?? 0;
    const context = unescaped.slice(Math.max(0, idx - 650), idx + 120);
    // If the RSC item explicitly declares a non-remote work_mode (e.g. "On-site", "Onsite", "Hybrid"),
    // skip fetching its detail page unless it was already linked via <a href>.
    const workModeMatch = context.match(/"work_mode"\s*:\s*"([^"]*)"/i);
    if (workModeMatch && workModeMatch[1].trim().toLowerCase() !== "remote") {
      continue;
    }
    let prefix = defaultPrefix;
    if (context.includes("company_internship_") || context.includes('"internship_')) {
      prefix = "/internships/";
    } else if (context.includes("company_hiring_") || context.includes('"hiring_')) {
      prefix = "/jobs/";
    }
    addPath(`${prefix}${slug}`);
  }

  return urls;
}

export interface AstraJobPosting {
  title: string;
  company: string;
  description: string;
  datePosted: Date | null;
  jobLocationType: string | null;
  applicantLocationRequirements: string;
  addressLocality: string;
  employmentType: string | null;
  identifier: string | null;
  applyUrl: string | null;
}

function extractApplicantLocationName(raw: unknown): string {
  if (!raw) return "";
  if (typeof raw === "string") return raw.trim();
  if (Array.isArray(raw)) {
    return raw.map(extractApplicantLocationName).filter(Boolean).join(", ");
  }
  if (typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    if (typeof obj.name === "string") return obj.name.trim();
    if (typeof obj.addressCountry === "string") return obj.addressCountry.trim();
  }
  return "";
}

function extractAddressLocality(jobLocation: unknown): string {
  if (!jobLocation) return "";
  if (Array.isArray(jobLocation)) {
    return jobLocation.map(extractAddressLocality).filter(Boolean).join(", ");
  }
  if (typeof jobLocation === "object") {
    const loc = jobLocation as Record<string, unknown>;
    const addr = loc.address as Record<string, unknown> | undefined;
    if (addr) {
      const parts = [addr.addressLocality, addr.addressRegion, addr.addressCountry]
        .filter((p): p is string => typeof p === "string" && p.trim().length > 0)
        .map((p) => p.trim());
      return parts.join(", ");
    }
  }
  return "";
}

/**
 * Parses `<script type="application/ld+json">` blocks in an Astra detail page
 * and returns the normalized `JobPosting` node, or `null` if absent/malformed.
 */
export function parseAstraJobPostingJsonLd(html: string): AstraJobPosting | null {
  if (!html) return null;

  const scripts = [
    ...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi),
  ];

  for (const match of scripts) {
    const rawJson = match[1]?.trim();
    if (!rawJson) continue;

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawJson);
    } catch {
      continue;
    }

    const candidates: Record<string, unknown>[] = [];
    if (Array.isArray(parsed)) {
      for (const item of parsed) {
        if (item && typeof item === "object") candidates.push(item as Record<string, unknown>);
      }
    } else if (parsed && typeof parsed === "object") {
      const root = parsed as Record<string, unknown>;
      candidates.push(root);
      if (Array.isArray(root["@graph"])) {
        for (const node of root["@graph"]) {
          if (node && typeof node === "object") candidates.push(node as Record<string, unknown>);
        }
      }
    }

    const posting = candidates.find((c) => c["@type"] === "JobPosting");
    if (!posting) continue;

    const title = typeof posting.title === "string" ? cleanHtmlText(posting.title.trim()) : "";
    const org = posting.hiringOrganization as Record<string, unknown> | undefined;
    const company =
      org && typeof org.name === "string" ? cleanHtmlText(org.name.trim()) : "";
    const description =
      typeof posting.description === "string" ? cleanHtmlText(posting.description.trim()) : "";

    let datePosted: Date | null = null;
    if (typeof posting.datePosted === "string" && posting.datePosted.trim()) {
      const d = new Date(posting.datePosted.trim());
      if (!isNaN(d.getTime())) datePosted = d;
    }

    const jobLocationType =
      typeof posting.jobLocationType === "string" ? posting.jobLocationType.trim() : null;

    const applicantLocationRequirements = extractApplicantLocationName(
      posting.applicantLocationRequirements
    );
    const addressLocality = extractAddressLocality(posting.jobLocation);

    const employmentType =
      typeof posting.employmentType === "string" ? posting.employmentType.trim() : null;

    let identifier: string | null = null;
    if (typeof posting.identifier === "string") {
      identifier = posting.identifier.trim();
    } else if (posting.identifier && typeof posting.identifier === "object") {
      const idObj = posting.identifier as Record<string, unknown>;
      if (typeof idObj.value === "string" || typeof idObj.value === "number") {
        identifier = String(idObj.value).trim();
      }
    }

    let applyUrl: string | null = null;
    const rawUrlCandidate =
      (typeof posting.applyUrl === "string" && posting.applyUrl) ||
      (typeof posting.applicationUrl === "string" && posting.applicationUrl) ||
      (typeof posting.url === "string" && posting.url) ||
      null;
    if (rawUrlCandidate && /^https?:\/\//i.test(rawUrlCandidate.trim())) {
      applyUrl = rawUrlCandidate.trim();
    }

    return {
      title,
      company,
      description,
      datePosted,
      jobLocationType,
      applicantLocationRequirements,
      addressLocality,
      employmentType,
      identifier,
      applyUrl,
    };
  }

  return null;
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

export class AstraProvider implements JobSourceProvider {
  name = "Astra (useastra.in)";
  providerKey = PlatformSource.ASTRA;
  timeoutMs = 40000;

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

    const detailUrls: string[] = [];
    const seenUrls = new Set<string>();

    const listResults = await Promise.all(
      LIST_PAGES.map(async (page) => {
        const url = `${BASE_URL}${page.path}`;
        const t0 = Date.now();
        try {
          const res = await axios.get<string>(url, {
            headers: HEADERS,
            timeout: REQUEST_TIMEOUT_MS,
            signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
            httpsAgent: HTTPS_AGENT,
          });
          return {
            telemetry: {
              endpointKey: page.key,
              endpoint: url,
              latencyMs: Date.now() - t0,
              attempts: 1,
              success: true,
              statusCode: res.status,
            } as ProviderEndpointTelemetry,
            urls: parseAstraListingPage(res.data),
          };
        } catch (err: unknown) {
          return {
            telemetry: {
              endpointKey: page.key,
              endpoint: url,
              latencyMs: Date.now() - t0,
              attempts: 1,
              success: false,
              error: err instanceof Error ? err.message : String(err),
            } as ProviderEndpointTelemetry,
            urls: [] as string[],
          };
        }
      })
    );

    for (const lr of listResults) {
      telemetry.push(lr.telemetry);
      for (const detailUrl of lr.urls) {
        if (seenUrls.has(detailUrl)) continue;
        seenUrls.add(detailUrl);
        detailUrls.push(detailUrl);
      }
    }

    discoveredCount = detailUrls.length;
    diagnostics.rawCandidates = detailUrls.length;

    const details = await mapWithConcurrency(detailUrls, DETAIL_CONCURRENCY, async (detailUrl) => {
      try {
        const res = await axios.get<string>(detailUrl, {
          headers: HEADERS,
          timeout: REQUEST_TIMEOUT_MS,
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
          httpsAgent: HTTPS_AGENT,
        });
        return parseAstraJobPostingJsonLd(res.data);
      } catch {
        return null;
      }
    });

    detailUrls.forEach((detailUrl, i) => {
      const posting = details[i];
      if (!posting) {
        diagnostics.invalidUrl++;
        rejectedCount++;
        return;
      }

      if (!posting.title) {
        diagnostics.missingTitle++;
        rejectedCount++;
        return;
      }

      // STRICT REMOTE GATE (NON-NEGOTIABLE):
      // 1. JSON-LD jobLocationType === "TELECOMMUTE" (case-insensitive)
      if (!posting.jobLocationType || posting.jobLocationType.toUpperCase() !== "TELECOMMUTE") {
        diagnostics.roleGateRejected++;
        rejectedCount++;
        return;
      }

      // 2. Title/description do not contain "hybrid", "onsite", "on-site", "in-office"
      if (
        HYBRID_ONSITE_RE.test(posting.title) ||
        HYBRID_ONSITE_RE.test(posting.description)
      ) {
        diagnostics.roleGateRejected++;
        rejectedCount++;
        return;
      }

      // 3. Not older than MAX_POSTING_AGE_DAYS via isOlderThanMaxPostingAge
      if (posting.datePosted && isOlderThanMaxPostingAge(posting.datePosted, MAX_POSTING_AGE_DAYS)) {
        diagnostics.roleGateRejected++;
        rejectedCount++;
        return;
      }

      const title = sanitizeRoleTitle(posting.title, posting.description);
      const regionHint = posting.applicantLocationRequirements || posting.addressLocality;
      const location = regionHint ? `Remote (${regionHint})` : "Remote";
      const desc =
        posting.description || `${posting.title} at ${posting.company || "Unknown"}`;

      // 4. Passes isStrictlyRemoteDeveloperRole
      if (!isStrictlyRemoteDeveloperRole(title, location, desc, posting.datePosted)) {
        diagnostics.roleGateRejected++;
        rejectedCount++;
        return;
      }

      const canonicalAppUrl = posting.applyUrl ?? detailUrl;
      const { company, companySlug } = cleanCompanySlug(posting.company || "Unknown");
      const remoteScope: RemoteScope = parseRemoteScope(
        posting.applicantLocationRequirements
          ? `Remote (${posting.applicantLocationRequirements})`
          : location,
        desc
      );

      const isInternship =
        detailUrl.includes("/internships/") ||
        posting.employmentType?.toUpperCase() === "INTERN" ||
        determineJobType(title, desc) === "Remote Internship";

      const jobType = isInternship ? "Remote Internship" : determineJobType(title, desc);
      const experienceLevel = isInternship
        ? "Fresher / Entry Level (0-1 Yr)"
        : determineExperienceLevel(title, desc);

      const slugTail = detailUrl.split("/").pop() || "";
      const sourceJobId = `astra-${posting.identifier || slugTail}`;

      const signals = determineOpportunitySignals({
        postedAt: posting.datePosted,
        applicationUrlType: "AGGREGATOR_PAGE",
        canonicalAppUrl,
        providerKey: PlatformSource.ASTRA,
      });
      if (!signals.includes("NICHE_SOURCE")) {
        const unknownIdx = signals.indexOf("UNKNOWN");
        if (unknownIdx !== -1) signals.splice(unknownIdx, 1);
        signals.push("NICHE_SOURCE");
      }

      jobs.push({
        sourceJobId,
        providerKey: PlatformSource.ASTRA,
        company,
        companySlug,
        title,
        category: determineCategory(title, desc),
        jobType,
        experienceLevel,
        location,
        isRemote: true,
        remoteScope,
        discoveryUrl: detailUrl,
        canonicalAppUrl,
        applicationUrlType: "AGGREGATOR_PAGE",
        verificationStatus: "VERIFIED_AGGREGATOR",
        postedAt: posting.datePosted,
        applicantCount: null,
        opportunitySignals: signals,
        rawDescription: desc,
        hasFullText: desc.length > 100,
      });
      diagnostics.accepted++;
    });

    const failed = telemetry.filter((t) => !t.success);
    return {
      providerKey: PlatformSource.ASTRA,
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
