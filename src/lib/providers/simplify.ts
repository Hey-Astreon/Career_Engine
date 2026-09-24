import axios, { type AxiosResponse } from "axios";
import { PlatformSource } from "@prisma/client";
import { JobSourceProvider, NormalizedJob, ProviderEndpointTelemetry, ProviderResult } from "./types";
import {
  cleanCompanySlug,
  determineCategory,
  determineJobType,
  determineExperienceLevel,
  isStrictlyRemoteDeveloperRole,
  parseRemoteScope,
  determineOpportunitySignals,
} from "./normalize";

interface SimplifyListing {
  id?: string;
  title?: string;
  company_name?: string;
  active?: boolean;
  date_posted?: number;
  url?: string;
  locations?: string[];
  company_url?: string;
}

interface SimplifyEndpointResult {
  response: AxiosResponse<SimplifyListing[]> | null;
  telemetry: ProviderEndpointTelemetry;
}

const ENDPOINT_TIMEOUT_MS = 6_000;
const MAX_ATTEMPTS = 1;
const BASE_RETRY_DELAY_MS = 300;
const MAX_RETRY_AFTER_MS = 3_500;
const RETRYABLE_HTTP_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function describeRequestError(error: unknown): { message: string; statusCode?: number; retryDelayMs?: number } {
  if (!axios.isAxiosError(error)) {
    return { message: error instanceof Error ? error.message : String(error) };
  }

  const statusCode = error.response?.status;
  const retryAfterHeader = error.response?.headers?.["retry-after"];
  const retryAfterSeconds = typeof retryAfterHeader === "string" ? Number(retryAfterHeader) : Number.NaN;
  const retryDelayMs = Number.isFinite(retryAfterSeconds) && retryAfterSeconds >= 0
    ? Math.round(retryAfterSeconds * 1_000)
    : undefined;

  return {
    message: error.message,
    ...(statusCode ? { statusCode } : {}),
    ...(retryDelayMs !== undefined ? { retryDelayMs } : {}),
  };
}

function shouldRetry(error: unknown): boolean {
  if (!axios.isAxiosError(error)) return true;
  return !error.response || RETRYABLE_HTTP_STATUS.has(error.response.status);
}

export class SimplifyProvider implements JobSourceProvider {
  name = "Simplify Jobs";
  providerKey = PlatformSource.SIMPLIFY;
  timeoutMs = 12000;

  private async fetchEndpoint(endpointKey: string, endpoint: string): Promise<SimplifyEndpointResult> {
    const startedAt = Date.now();
    let lastError: ReturnType<typeof describeRequestError> | undefined;
    let attempts = 0;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      attempts = attempt;
      try {
        const response = await axios.get<SimplifyListing[]>(endpoint, {
          headers: {
            "User-Agent": "CareerAgent/2.0 (Job Discovery Engine; https://github.com/Hey-Astreon/CareerAgent)",
            "Accept": "application/json",
          },
          timeout: ENDPOINT_TIMEOUT_MS,
        });
        const telemetry: ProviderEndpointTelemetry = {
          endpointKey,
          endpoint,
          latencyMs: Date.now() - startedAt,
          attempts: attempt,
          success: true,
          statusCode: response.status,
        };
        console.info("[ProviderEndpointTelemetry]", JSON.stringify({ provider: this.providerKey, ...telemetry }));
        return { response, telemetry };
      } catch (error) {
        lastError = describeRequestError(error);
        const retryAfterMs = lastError.retryDelayMs;
        const delayMs = retryAfterMs ?? BASE_RETRY_DELAY_MS * 2 ** (attempt - 1);
        const canRetry = attempt < MAX_ATTEMPTS && shouldRetry(error) && delayMs <= MAX_RETRY_AFTER_MS;

        if (!canRetry) break;
        await sleep(delayMs);
      }
    }

    const telemetry: ProviderEndpointTelemetry = {
      endpointKey,
      endpoint,
      latencyMs: Date.now() - startedAt,
      attempts,
      success: false,
      ...(lastError?.statusCode ? { statusCode: lastError.statusCode } : {}),
      ...(lastError?.retryDelayMs !== undefined ? { retryAfterMs: lastError.retryDelayMs } : {}),
      error: lastError?.message || "Endpoint request failed",
    };
    console.info("[ProviderEndpointTelemetry]", JSON.stringify({ provider: this.providerKey, ...telemetry }));
    return { response: null, telemetry };
  }

  async fetch(): Promise<ProviderResult> {
    const startTime = Date.now();
    const jobs: NormalizedJob[] = [];
    let discoveredCount = 0;
    let rejectedCount = 0;

    const dataEndpoints = [
      { key: "new_grad_positions", url: "https://raw.githubusercontent.com/SimplifyJobs/New-Grad-Positions/dev/.github/scripts/listings.json" },
      { key: "summer_2026_internships", url: "https://raw.githubusercontent.com/SimplifyJobs/Summer2026-Internships/dev/.github/scripts/listings.json" },
      { key: "summer_2025_internships", url: "https://raw.githubusercontent.com/SimplifyJobs/Summer2025-Internships/dev/.github/scripts/listings.json" },
    ];

    const endpointResults = await Promise.all(dataEndpoints.map(({ key, url }) => this.fetchEndpoint(key, url)));
    const endpointTelemetry = endpointResults.map((result) => result.telemetry);
    const failedEndpoints = endpointTelemetry.filter((endpoint) => !endpoint.success);
    const endpointTelemetrySummary = {
      totalEndpoints: endpointTelemetry.length,
      successfulEndpoints: endpointTelemetry.length - failedEndpoints.length,
      failedEndpoints: failedEndpoints.length,
      failureRatePercent: endpointTelemetry.length ? Math.round((failedEndpoints.length / endpointTelemetry.length) * 100) : 0,
      averageLatencyMs: endpointTelemetry.length
        ? Math.round(endpointTelemetry.reduce((total, endpoint) => total + endpoint.latencyMs, 0) / endpointTelemetry.length)
        : 0,
    };

    for (const { response, telemetry } of endpointResults) {
      if (!response) {
        console.warn(`[Simplify Provider Warning] Endpoint "${telemetry.endpoint}" failed:`, telemetry.error);
        continue;
      }

      if (Array.isArray(response.data)) {
        for (const item of response.data) {
            // Skip inactive positions
            if (item.active === false) continue;

            discoveredCount++;
            const titleRaw = item.title || "";
            const companyRaw = item.company_name || "Simplify Tech";
            const discoveryUrl = item.url || item.company_url || "https://simplify.jobs";

            const rawLocs = item.locations && item.locations.length > 0 ? item.locations.join(", ") : "";
            const isExplicitlyRemote = rawLocs.toLowerCase().includes("remote") || rawLocs.toLowerCase().includes("anywhere") || rawLocs.toLowerCase().includes("worldwide") || titleRaw.toLowerCase().includes("remote");

            // Strictly exclude non-remote Simplify jobs (e.g. San Francisco, CA or New York, NY on-site)
            if (!isExplicitlyRemote) {
              rejectedCount++;
              continue;
            }

            const location = rawLocs ? (rawLocs.toLowerCase().includes("remote") ? rawLocs : `Remote (${rawLocs})`) : "Remote (Worldwide)";

            if (!isStrictlyRemoteDeveloperRole(titleRaw, location, `${titleRaw} at ${companyRaw}`)) {
              rejectedCount++;
              continue;
            }

            const { company, companySlug } = cleanCompanySlug(companyRaw);
            const postedAt = item.date_posted ? new Date(item.date_posted * 1000) : null;
            const validPostedAt = postedAt && !isNaN(postedAt.getTime()) ? postedAt : null;
            const remoteScope = parseRemoteScope(location, titleRaw);
            const opportunitySignals = determineOpportunitySignals({
              postedAt: validPostedAt,
              applicationUrlType: "DIRECT_ATS",
              canonicalAppUrl: discoveryUrl,
              providerKey: PlatformSource.SIMPLIFY,
            });

            jobs.push({
              sourceJobId: item.id || `${companySlug}-${titleRaw.toLowerCase().replace(/[^a-z0-9]/g, "-")}`,
              providerKey: PlatformSource.SIMPLIFY,
              company,
              companySlug,
              title: titleRaw,
              category: determineCategory(titleRaw, ""),
              jobType: determineJobType(titleRaw, ""),
              experienceLevel: determineExperienceLevel(titleRaw, ""),
              location,
              isRemote: true,
              remoteRegion: rawLocs.includes("Worldwide") || !rawLocs ? "Worldwide" : rawLocs,
              remoteScope,
              discoveryUrl,
              canonicalAppUrl: discoveryUrl,
              applicationUrlType: "DIRECT_ATS",
              verificationStatus: "VERIFIED_DIRECT_ATS",
              postedAt: validPostedAt,
              opportunitySignals,
              rawDescription: `${titleRaw} at ${company}. Direct early-career software engineering opportunity listed on Simplify.`,
              hasFullText: true,
            });

            // Limit per repository endpoint to prevent memory overload
            if (jobs.length >= 100) break;
        }
      }
    }

    return {
      providerKey: this.providerKey,
      jobs,
      success: failedEndpoints.length < endpointTelemetry.length,
      ...(failedEndpoints.length === endpointTelemetry.length
        ? { error: `All Simplify endpoints failed: ${failedEndpoints.map((endpoint) => endpoint.error).join("; ")}` }
        : {}),
      durationMs: Date.now() - startTime,
      jobsDiscovered: discoveredCount,
      jobsRejected: rejectedCount,
      endpointTelemetry,
      endpointTelemetrySummary,
    };
  }
}
