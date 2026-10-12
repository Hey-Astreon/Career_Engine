import axios from "axios";
import { PlatformSource } from "@prisma/client";
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
  isStrictlyRemoteDeveloperRole,
  parseRemoteScope,
  determineOpportunitySignals,
  sanitizeRoleTitle,
} from "./normalize";
import { isValidHttpUrl } from "@/lib/urlValidator";

const ENDPOINT_TIMEOUT_MS = 6000;

export class NoDeskProvider implements JobSourceProvider {
  name = "NoDesk Remote";
  providerKey = PlatformSource.NODESK;
  timeoutMs = 12000;

  async fetch(): Promise<ProviderResult> {
    const startTime = Date.now();
    const jobs: NormalizedJob[] = [];
    let discoveredCount = 0;
    let rejectedCount = 0;

    const endpoint = "https://nodesk.co/remote-jobs/index.xml";
    const endpointKey = "nodesk_rss_feed";
    const reqStart = Date.now();
    let xmlContent = "";
    let statusCode = 200;
    let fetchError: string | undefined;

    try {
      const res = await axios.get<string>(endpoint, {
        headers: {
          "User-Agent":
            "CareerAgent/2.0 (Job Discovery Engine; https://github.com/Hey-Astreon/CareerAgent)",
          Accept: "application/rss+xml, application/xml, text/xml",
        },
        timeout: ENDPOINT_TIMEOUT_MS,
      });
      xmlContent = res.data;
      statusCode = res.status;
    } catch (err: unknown) {
      fetchError = err instanceof Error ? err.message : String(err);
    }

    const endpointTelemetry: ProviderEndpointTelemetry = {
      endpointKey,
      endpoint,
      latencyMs: Date.now() - reqStart,
      attempts: 1,
      success: !fetchError && Boolean(xmlContent),
      statusCode: fetchError ? undefined : statusCode,
      error: fetchError,
    };

    const diagnostics: ProviderStageDiagnostics = {
      rawCandidates: 0,
      missingTitle: 0,
      invalidUrl: 0,
      roleGateRejected: 0,
      accepted: 0,
      instrumented: true,
    };

    if (xmlContent) {
      const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
      let match: RegExpExecArray | null;

      while ((match = itemRegex.exec(xmlContent)) !== null) {
        discoveredCount++;
        diagnostics.rawCandidates++;

        const rawItem = match[1];
        const titleMatch = /<title>([\s\S]*?)<\/title>/i.exec(rawItem);
        const linkMatch = /<link>([\s\S]*?)<\/link>/i.exec(rawItem);
        const pubDateMatch = /<pubDate>([\s\S]*?)<\/pubDate>/i.exec(rawItem);
        const descMatch = /<description>([\s\S]*?)<\/description>/i.exec(rawItem);

        const rawTitle = titleMatch ? titleMatch[1].trim() : "";
        const rawLink = linkMatch ? linkMatch[1].trim() : "";
        const rawDesc = descMatch ? cleanHtmlText(descMatch[1].trim()) : "";

        if (!rawTitle) {
          diagnostics.missingTitle++;
          rejectedCount++;
          continue;
        }

        if (!isValidHttpUrl(rawLink)) {
          diagnostics.invalidUrl++;
          rejectedCount++;
          continue;
        }

        // Parse title format: "Role Title at Company Name"
        let title = rawTitle;
        let companyName = "Remote Company";

        const atIndex = rawTitle.lastIndexOf(" at ");
        if (atIndex !== -1) {
          title = rawTitle.substring(0, atIndex).trim();
          companyName = rawTitle.substring(atIndex + 4).trim();
        }

        title = sanitizeRoleTitle(title);
        const location = "Remote";

        const postedAt = pubDateMatch ? new Date(pubDateMatch[1].trim()) : null;
        const validPostedAt =
          postedAt && !isNaN(postedAt.getTime()) ? postedAt : null;

        // Role criteria gate
        if (!isStrictlyRemoteDeveloperRole(title, location, rawDesc, validPostedAt)) {
          diagnostics.roleGateRejected++;
          rejectedCount++;
          continue;
        }

        const { company, companySlug } = cleanCompanySlug(companyName);
        const remoteScope = parseRemoteScope(location, rawDesc);
        const opportunitySignals = determineOpportunitySignals({
          postedAt: validPostedAt,
          applicationUrlType: "AGGREGATOR_PAGE",
          canonicalAppUrl: rawLink,
          providerKey: PlatformSource.NODESK,
        });

        const slugifiedTitle = title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .slice(0, 50);

        jobs.push({
          sourceJobId: `nodesk-${companySlug}-${slugifiedTitle}`,
          providerKey: PlatformSource.NODESK,
          company,
          companySlug,
          title,
          category: determineCategory(title, rawDesc),
          jobType: determineJobType(title, rawDesc),
          experienceLevel: determineExperienceLevel(title, rawDesc),
          location,
          isRemote: true,
          remoteScope,
          discoveryUrl: rawLink,
          canonicalAppUrl: rawLink,
          applicationUrlType: "AGGREGATOR_PAGE",
          verificationStatus: "VERIFIED_AGGREGATOR",
          postedAt: validPostedAt,
          applicantCount: null,
          opportunitySignals,
          rawDescription: rawDesc,
          hasFullText: rawDesc.length > 100,
        });

        diagnostics.accepted++;
      }
    }

    const endpointTelemetrySummary = {
      totalEndpoints: 1,
      successfulEndpoints: endpointTelemetry.success ? 1 : 0,
      failedEndpoints: endpointTelemetry.success ? 0 : 1,
      failureRatePercent: endpointTelemetry.success ? 0 : 100,
      averageLatencyMs: endpointTelemetry.latencyMs,
    };

    return {
      providerKey: PlatformSource.NODESK,
      jobs,
      success: !fetchError,
      error: fetchError,
      durationMs: Date.now() - startTime,
      jobsDiscovered: discoveredCount,
      jobsRejected: rejectedCount,
      diagnostics,
      endpointTelemetry: [endpointTelemetry],
      endpointTelemetrySummary,
    };
  }
}
