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
import { RECRUITEE_BOARDS, classifyAtsResponse } from "./ats_directory";

export class RecruiteeProvider implements JobSourceProvider {
  name = "Recruitee ATS";
  providerKey = PlatformSource.RECRUITEE;
  timeoutMs = 15000;

  async fetch(): Promise<ProviderResult> {
    const startTime = Date.now();
    const jobs: NormalizedJob[] = [];
    let discoveredCount = 0;
    let rejectedCount = 0;

    const companyFetches = RECRUITEE_BOARDS.map(async (board) => {
      try {
        const apiUrl = `https://${board.slug}.recruitee.com/api/offers/`;
        const res = await axios.get(apiUrl, { timeout: 5000, validateStatus: () => true });

        const status = classifyAtsResponse(res.status, !!(res.data && Array.isArray(res.data.offers)), res.data?.offers?.length || 0);

        if (status === "ACTIVE" && res.data && Array.isArray(res.data.offers)) {
          const companyJobs: NormalizedJob[] = [];
          let companyDiscovered = 0;
          let companyRejected = 0;

          for (const item of res.data.offers) {
            companyDiscovered++;
            const title = item.title || "";
            const location = item.location ? (item.remote ? `Remote (${item.location})` : item.location) : "Remote";
            const rawContent = cleanHtmlText(item.description || item.requirements || "");
            const jobUrl = item.careers_url || `https://${board.slug}.recruitee.com/o/${item.slug}`;

            const postedAt = item.created_at ? new Date(item.created_at) : null;
            const validPostedAt = postedAt && !isNaN(postedAt.getTime()) ? postedAt : null;

            if (!isStrictlyRemoteDeveloperRole(title, location, rawContent, validPostedAt)) {
              companyRejected++;
              continue;
            }

            const { company, companySlug: normSlug } = cleanCompanySlug(board.slug);

            const remoteScope = parseRemoteScope(location, rawContent);
            const opportunitySignals = determineOpportunitySignals({
              postedAt: validPostedAt,
              applicationUrlType: "DIRECT_ATS",
              canonicalAppUrl: jobUrl,
              providerKey: this.providerKey,
            });

            companyJobs.push({
              sourceJobId: String(item.id),
              providerKey: PlatformSource.RECRUITEE,
              company: board.name || company,
              companySlug: normSlug,
              title,
              category: determineCategory(title, rawContent),
              jobType: determineJobType(title, rawContent),
              experienceLevel: determineExperienceLevel(title, rawContent),
              location,
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
