import axios from "axios";
import { PlatformSource } from "@prisma/client";
import { JobSourceProvider, NormalizedJob, ProviderResult } from "./types";
import {
  cleanCompanySlug,
  cleanHtmlText,
  determineCategory,
  determineJobType,
  determineExperienceLevel,
  isStrictlyRemoteDeveloperRole,
  parseRemoteScope,
  determineOpportunitySignals,
} from "./normalize";

export class HimalayasProvider implements JobSourceProvider {
  name = "Himalayas Remote";
  providerKey = PlatformSource.HIMALAYAS;
  timeoutMs = 10000;

  private static readonly MAX_PAGES = 3;
  private static readonly PAGE_SIZE = 25;

  async fetch(): Promise<ProviderResult> {
    const startTime = Date.now();
    const jobs: NormalizedJob[] = [];
    let discoveredCount = 0;
    let rejectedCount = 0;

    try {
      const pageIndices = Array.from({ length: HimalayasProvider.MAX_PAGES }, (_, i) => i);
      await Promise.all(
        pageIndices.map(async (page) => {
          const offset = page * HimalayasProvider.PAGE_SIZE;
          const apiUrl = `https://himalayas.app/jobs/api?limit=${HimalayasProvider.PAGE_SIZE}&offset=${offset}`;

          try {
            const res = await axios.get(apiUrl, {
              headers: {
                "User-Agent": "CareerAgent/2.0 (Job Discovery Engine; https://github.com/Hey-Astreon/CareerAgent)",
                "Accept": "application/json",
              },
              timeout: 6000,
            });

            if (!res.data || !Array.isArray(res.data.jobs) || res.data.jobs.length === 0) {
              return;
            }

            for (const item of res.data.jobs) {
              discoveredCount++;
              const title = item.title || "";
              const companyName = item.companyName || "Himalayas Startup";
              const rawLocStr = item.locationRestrictions && item.locationRestrictions.length > 0 ? item.locationRestrictions.join(", ") : "";
              const location = rawLocStr ? (rawLocStr.toLowerCase().includes("remote") ? rawLocStr : `Remote (${rawLocStr})`) : "Remote (Worldwide)";
              const rawDesc = cleanHtmlText(item.description || item.excerpt || "");
              const discoveryUrl = item.applicationLink || item.url || `https://himalayas.app/jobs/${item.slug}`;
              const canonicalAppUrl = item.applicationLink || discoveryUrl;

              if (!isStrictlyRemoteDeveloperRole(title, location, rawDesc)) {
                rejectedCount++;
                continue;
              }

              const { company, companySlug } = cleanCompanySlug(companyName);
              const postedAt = item.pubDate ? new Date(item.pubDate * 1000) : null;
              const validPostedAt = postedAt && !isNaN(postedAt.getTime()) ? postedAt : null;
              const remoteScope = parseRemoteScope(location, rawDesc);
              const opportunitySignals = determineOpportunitySignals({
                postedAt: validPostedAt,
                applicationUrlType: "DIRECT_EMPLOYER_SITE",
                canonicalAppUrl,
                providerKey: PlatformSource.HIMALAYAS,
              });

              jobs.push({
                sourceJobId: item.id ? String(item.id) : item.slug,
                providerKey: PlatformSource.HIMALAYAS,
                company,
                companySlug,
                title,
                category: determineCategory(title, rawDesc),
                jobType: determineJobType(title, rawDesc),
                experienceLevel: determineExperienceLevel(title, rawDesc),
                location,
                isRemote: true,
                remoteRegion: rawLocStr.includes("Worldwide") || !rawLocStr ? "Worldwide" : rawLocStr,
                remoteScope,
                discoveryUrl,
                canonicalAppUrl,
                applicationUrlType: "DIRECT_EMPLOYER_SITE",
                verificationStatus: "VERIFIED_AGGREGATOR",
                postedAt: validPostedAt,
                opportunitySignals,
                rawDescription: rawDesc || `${title} at ${company}. Remote position listed on Himalayas.`,
                hasFullText: rawDesc.length > 50,
              });
            }
          } catch {
            // Silently continue if single page fails
          }
        })
      );
    } catch (err) {
      console.warn("[Himalayas Provider Warning] Request failed:", (err as Error).message);
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
