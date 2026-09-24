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

export class JobicyProvider implements JobSourceProvider {
  name = "Jobicy Remote";
  providerKey = PlatformSource.JOBICY;
  timeoutMs = 10000;

  async fetch(): Promise<ProviderResult> {
    const startTime = Date.now();
    const jobs: NormalizedJob[] = [];
    let discoveredCount = 0;
    let rejectedCount = 0;

    const tags = ["dev", "backend", "frontend", "full-stack", "python", "react"];

    await Promise.all(
      tags.map(async (tag) => {
        try {
          const apiUrl = `https://jobicy.com/api/v2/remote-jobs?tag=${tag}&count=30`;
          const res = await axios.get(apiUrl, {
            headers: {
              "User-Agent": "CareerAgent/2.0 (Job Discovery Engine; https://github.com/Hey-Astreon/CareerAgent)",
              "Accept": "application/json",
            },
            timeout: 5000,
          });

          const rawJobs = res.data?.jobs;
          if (Array.isArray(rawJobs)) {
            for (const item of rawJobs) {
              discoveredCount++;
              const title = item.jobTitle || "";
              const companyName = item.companyName || "Jobicy Company";
              const rawGeo = item.jobGeo || "";
              const location = rawGeo ? (rawGeo.toLowerCase().includes("remote") ? rawGeo : `Remote (${rawGeo})`) : "Remote (Worldwide)";
              const rawDesc = cleanHtmlText(item.jobDescription || item.jobExcerpt || "");
              const discoveryUrl = item.url || item.jobUrl || "https://jobicy.com";
              const canonicalAppUrl = discoveryUrl;

              if (!isStrictlyRemoteDeveloperRole(title, location, rawDesc)) {
                rejectedCount++;
                continue;
              }

              const { company, companySlug } = cleanCompanySlug(companyName);
              const postedAt = item.pubDate ? new Date(item.pubDate) : null;
              const validPostedAt = postedAt && !isNaN(postedAt.getTime()) ? postedAt : null;
              const remoteScope = parseRemoteScope(location, rawDesc);
              const opportunitySignals = determineOpportunitySignals({
                postedAt: validPostedAt,
                applicationUrlType: "AGGREGATOR_PAGE",
                canonicalAppUrl,
                providerKey: PlatformSource.JOBICY,
              });

              jobs.push({
                sourceJobId: item.id ? String(item.id) : `${companySlug}-${title.toLowerCase().replace(/[^a-z0-9]/g, "-")}`,
                providerKey: PlatformSource.JOBICY,
                company,
                companySlug,
                title,
                category: determineCategory(title, rawDesc),
                jobType: determineJobType(title, rawDesc),
                experienceLevel: determineExperienceLevel(title, rawDesc),
                location,
                isRemote: true,
                remoteRegion: rawGeo || "Worldwide",
                remoteScope,
                discoveryUrl,
                canonicalAppUrl,
                applicationUrlType: "AGGREGATOR_PAGE",
                verificationStatus: "VERIFIED_AGGREGATOR",
                postedAt: validPostedAt,
                opportunitySignals,
                rawDescription: rawDesc || `${title} at ${company}. Remote developer position on Jobicy.`,
                hasFullText: rawDesc.length > 50,
              });
            }
          }
        } catch (err) {
          console.warn(`[Jobicy Provider Warning] Tag "${tag}" failed:`, (err as Error).message);
        }
      })
    );

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
