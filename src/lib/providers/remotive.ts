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

export class RemotiveProvider implements JobSourceProvider {
  name = "Remotive Jobs";
  providerKey = PlatformSource.REMOTIVE;
  timeoutMs = 8000;

  async fetch(): Promise<ProviderResult> {
    const startTime = Date.now();
    const jobs: NormalizedJob[] = [];
    let discoveredCount = 0;
    let rejectedCount = 0;

    try {
      const apiUrl = "https://remotive.com/api/remote-jobs?limit=100";
      const res = await axios.get(apiUrl, {
        headers: {
          "User-Agent": "CareerAgent/2.0 (Job Discovery Engine; https://github.com/Hey-Astreon/CareerAgent)",
          "Accept": "application/json",
        },
        timeout: this.timeoutMs,
      });

      if (res.data && Array.isArray(res.data.jobs)) {
        for (const item of res.data.jobs) {
          discoveredCount++;
          const title = item.title || "";
          const companyName = item.company_name || "Remotive Company";
          const location = item.candidate_required_location || "Remote (Worldwide)";
          const rawDesc = cleanHtmlText(item.description || "");
          const discoveryUrl = item.url || `https://remotive.com/remote-jobs/${item.id}`;

          const postedAt = item.publication_date ? new Date(item.publication_date) : null;
          const validPostedAt = postedAt && !isNaN(postedAt.getTime()) ? postedAt : null;

          if (!isStrictlyRemoteDeveloperRole(title, location, rawDesc, validPostedAt)) {
            rejectedCount++;
            continue;
          }

          const { company, companySlug } = cleanCompanySlug(companyName);
          const remoteScope = parseRemoteScope(location, rawDesc);
          const opportunitySignals = determineOpportunitySignals({
            postedAt: validPostedAt,
            applicationUrlType: "DIRECT_EMPLOYER_SITE",
            canonicalAppUrl: discoveryUrl,
            providerKey: this.providerKey,
          });

          jobs.push({
            sourceJobId: String(item.id),
            providerKey: PlatformSource.REMOTIVE,
            company,
            companySlug,
            title,
            category: determineCategory(title, rawDesc),
            jobType: determineJobType(title, rawDesc),
            experienceLevel: determineExperienceLevel(title, rawDesc),
            location: location ? `Remote (${location})` : "Remote",
            isRemote: true,
            remoteRegion: location || "Worldwide",
            remoteScope,
            discoveryUrl,
            canonicalAppUrl: discoveryUrl,
            applicationUrlType: "DIRECT_EMPLOYER_SITE",
            verificationStatus: "VERIFIED_AGGREGATOR",
            postedAt: validPostedAt,
            opportunitySignals,
            rawDescription: rawDesc,
            hasFullText: rawDesc.length > 50,
          });
        }
      }
    } catch (err) {
      console.warn("[Remotive Provider Warning] Request failed:", (err as Error).message);
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
