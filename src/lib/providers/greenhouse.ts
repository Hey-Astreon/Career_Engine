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
import { GREENHOUSE_BOARDS, classifyAtsResponse } from "./ats_directory";

export class GreenhouseProvider implements JobSourceProvider {
  name = "Greenhouse ATS";
  providerKey = PlatformSource.GREENHOUSE;
  timeoutMs = 12000;

  async fetch(): Promise<ProviderResult> {
    const startTime = Date.now();
    const jobs: NormalizedJob[] = [];
    let discoveredCount = 0;
    let rejectedCount = 0;

    const companyFetches = GREENHOUSE_BOARDS.map(async (board) => {
      try {
        const apiUrl = `https://boards-api.greenhouse.io/v1/boards/${board.slug}/jobs?content=true`;
        const res = await axios.get(apiUrl, { timeout: 4500, validateStatus: () => true });

        const status = classifyAtsResponse(res.status, !!(res.data && Array.isArray(res.data.jobs)), res.data?.jobs?.length || 0);

        if (status === "ACTIVE" && res.data && Array.isArray(res.data.jobs)) {
          const companyJobs: NormalizedJob[] = [];
          let companyDiscovered = 0;
          let companyRejected = 0;

          for (const item of res.data.jobs) {
            companyDiscovered++;
            const title = item.title || "";
            const locationName = item.location?.name || "";
            const rawContent = cleanHtmlText(item.content || "");
            const jobUrl = item.absolute_url;

            if (!isStrictlyRemoteDeveloperRole(title, locationName, rawContent)) {
              companyRejected++;
              continue;
            }

            const { company, companySlug: normSlug } = cleanCompanySlug(board.slug);
            const postedAtRaw = item.first_published || null;
            const postedAt = postedAtRaw ? new Date(postedAtRaw) : null;
            const validPostedAt = postedAt && !isNaN(postedAt.getTime()) ? postedAt : null;

            const remoteScope = parseRemoteScope(locationName, rawContent);
            const opportunitySignals = determineOpportunitySignals({
              postedAt: validPostedAt,
              applicationUrlType: "DIRECT_ATS",
              canonicalAppUrl: jobUrl,
              providerKey: this.providerKey,
            });

            companyJobs.push({
              sourceJobId: String(item.id),
              providerKey: PlatformSource.GREENHOUSE,
              company: board.name || company,
              companySlug: normSlug,
              title,
              category: determineCategory(title, rawContent),
              jobType: determineJobType(title, rawContent),
              experienceLevel: determineExperienceLevel(title, rawContent),
              location: locationName || "Remote",
              isRemote: true,
              remoteScope,
              discoveryUrl: jobUrl,
              canonicalAppUrl: jobUrl,
              applicationUrlType: "DIRECT_ATS",
              verificationStatus: "VERIFIED_DIRECT_ATS",
              postedAt: validPostedAt,
              opportunitySignals,
              rawDescription: rawContent,
              hasFullText: rawContent.length > 30,
            });
          }

          return { companyJobs, companyDiscovered, companyRejected };
        }
      } catch {
        // Ignore single board errors
      }
      return { companyJobs: [], companyDiscovered: 0, companyRejected: 0 };
    });

    const results = await Promise.all(companyFetches);
    for (const r of results) {
      jobs.push(...r.companyJobs);
      discoveredCount += r.companyDiscovered;
      rejectedCount += r.companyRejected;
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
