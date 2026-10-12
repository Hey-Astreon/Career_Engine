import axios from "axios";
import * as cheerio from "cheerio";
import { PlatformSource } from "@prisma/client";
import { JobSourceProvider, NormalizedJob, ProviderResult } from "./types";
import {
  cleanCompanySlug,
  determineCategory,
  determineJobType,
  determineExperienceLevel,
  isStrictlyRemoteDeveloperRole,
  parseRemoteScope,
  determineOpportunitySignals,
} from "./normalize";

export class ArcDevProvider implements JobSourceProvider {
  name = "Arc.dev";
  providerKey = PlatformSource.ARC_DEV;
  timeoutMs = 15000;

  async fetch(): Promise<ProviderResult> {
    const startTime = Date.now();
    const jobs: NormalizedJob[] = [];
    let discoveredCount = 0;
    let rejectedCount = 0;

    const targetUrls = [
      "https://arc.dev/remote-jobs/software-engineer",
      "https://arc.dev/remote-jobs/frontend-developer",
      "https://arc.dev/remote-jobs/backend-developer",
      "https://arc.dev/remote-jobs/full-stack-developer",
    ];

    for (const targetUrl of targetUrls) {
      try {
        const res = await axios.get(targetUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml",
          },
          timeout: 8000,
        });

        if (res.data) {
          const $ = cheerio.load(res.data);
          const nextDataScript = $("#__NEXT_DATA__").html();

          if (nextDataScript) {
            const parsedData = JSON.parse(nextDataScript);
            const pageProps = parsedData?.props?.pageProps;
            const rawItems = [
              ...(pageProps?.externalJobs || []),
              ...(pageProps?.arcJobs || []),
            ];

            for (const item of rawItems) {
              discoveredCount++;
              const title = item.title || "";
              const companyName = item.company?.name || "Arc.dev Client";
              const countries = Array.isArray(item.requiredCountries) && item.requiredCountries.length > 0
                ? item.requiredCountries.join(", ")
                : "Worldwide";
              const location = countries.toLowerCase().includes("remote") ? countries : `Remote (${countries})`;

              const jobPath = item.urlString ? `https://arc.dev/remote-jobs/${item.urlString}` : targetUrl;
              const canonicalAppUrl = jobPath;

              const postedAt = item.postedAt ? new Date(item.postedAt * 1000) : null;
              const validPostedAt = postedAt && !isNaN(postedAt.getTime()) ? postedAt : null;

              if (!isStrictlyRemoteDeveloperRole(title, location, `${title} at ${companyName}`, validPostedAt)) {
                rejectedCount++;
                continue;
              }

              const { company, companySlug } = cleanCompanySlug(companyName);
              const remoteScope = parseRemoteScope(location, title);
              const opportunitySignals = determineOpportunitySignals({
                postedAt: validPostedAt,
                applicationUrlType: "AGGREGATOR_PAGE",
                canonicalAppUrl,
                providerKey: PlatformSource.ARC_DEV,
              });

              jobs.push({
                sourceJobId: item.randomKey || item.urlString || `${companySlug}-${title.toLowerCase().replace(/[^a-z0-9]/g, "-")}`,
                providerKey: PlatformSource.ARC_DEV,
                company,
                companySlug,
                title,
                category: determineCategory(title, ""),
                jobType: determineJobType(title, ""),
                experienceLevel: determineExperienceLevel(title, ""),
                location,
                isRemote: true,
                remoteRegion: countries,
                remoteScope,
                discoveryUrl: jobPath,
                canonicalAppUrl,
                applicationUrlType: "AGGREGATOR_PAGE",
                verificationStatus: "VERIFIED_AGGREGATOR",
                postedAt: validPostedAt,
                opportunitySignals,
                rawDescription: `${title} at ${company}. Direct remote developer role listed on Arc.dev.`,
                hasFullText: false,
              });
            }
          }
        }
      } catch (err) {
        console.warn(`[Arc.dev Provider Warning] URL "${targetUrl}" failed:`, (err as Error).message);
      }
    }

    return {
      providerKey: this.providerKey,
      jobs,
      success: true,
      durationMs: Date.now() - startTime,
      jobsDiscovered: discoveredCount,
      jobsRejected: rejectedCount,
    };
  }
}
