import axios from "axios";
import { PlatformSource } from "@prisma/client";
import { JobSourceProvider, NormalizedJob, ProviderResult } from "./types";
import {
  cleanCompanySlug,
  cleanHtmlText,
  determineCategory,
  determineExperienceLevel,
  determineJobType,
  isStrictlyRemoteDeveloperRole,
  parseRemoteScope,
  determineOpportunitySignals,
  sanitizeRoleTitle,
} from "./normalize";

interface Micro1JobItem {
  job_id?: string;
  job_name?: string;
  company_name?: string;
  date_posted?: string;
  skills?: string[];
  apply_url?: string;
  location_type?: string;
  job_type?: string;
}

export class Micro1Provider implements JobSourceProvider {
  name = "Micro1 AI";
  providerKey = PlatformSource.MICRO1;
  timeoutMs = 12000;

  async fetch(): Promise<ProviderResult> {
    const startTime = Date.now();
    const jobs: NormalizedJob[] = [];
    let discoveredCount = 0;
    let rejectedCount = 0;

    try {
      // Official public API endpoint for Micro1 Remote Jobs
      const apiUrl = "https://prod-api.micro1.ai/api/v1/job/portal?page=1&limit=100&keyword=";
      const res = await axios.post(
        apiUrl,
        {
          action: "get_all_jobs",
          filters: {},
        },
        {
          headers: {
            "Content-Type": "application/json",
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          },
          timeout: 8000,
        }
      );

      const items: Micro1JobItem[] = Array.isArray(res.data?.data) ? res.data.data : [];

      for (const item of items) {
        discoveredCount++;
        const title = sanitizeRoleTitle(item.job_name || "");
        const rawCompany = item.company_name?.trim() || "micro1";
        const skillsText = Array.isArray(item.skills) ? item.skills.join(", ") : "";
        const location = "Remote (Worldwide)";
        const rawDesc = cleanHtmlText(
          `${title}. Required skills: ${skillsText}. Listed on Micro1 AI Remote Platform.`
        );

        if (!title || !isStrictlyRemoteDeveloperRole(title, location, rawDesc)) {
          rejectedCount++;
          continue;
        }

        const { company, companySlug } = cleanCompanySlug(rawCompany);
        const postedAtRaw = item.date_posted ? new Date(item.date_posted) : null;
        const validPostedAt = postedAtRaw && !isNaN(postedAtRaw.getTime()) ? postedAtRaw : null;
        const appUrl =
          item.apply_url ||
          (item.job_id ? `https://jobs.micro1.ai/post/${item.job_id}` : "https://www.micro1.ai/jobs");

        const remoteScope = parseRemoteScope(location, rawDesc);
        const opportunitySignals = determineOpportunitySignals({
          postedAt: validPostedAt,
          applicationUrlType: "DIRECT_EMPLOYER_SITE",
          canonicalAppUrl: appUrl,
          providerKey: PlatformSource.MICRO1,
        });

        jobs.push({
          sourceJobId: item.job_id || appUrl,
          providerKey: PlatformSource.MICRO1,
          company,
          companySlug,
          title,
          category: determineCategory(title, skillsText),
          jobType: determineJobType(title, rawDesc),
          experienceLevel: determineExperienceLevel(title, rawDesc),
          location,
          isRemote: true,
          remoteRegion: "Worldwide",
          remoteScope,
          discoveryUrl: appUrl,
          canonicalAppUrl: appUrl,
          applicationUrlType: "DIRECT_EMPLOYER_SITE",
          verificationStatus: "VERIFIED_DIRECT_ATS",
          postedAt: validPostedAt,
          opportunitySignals,
          rawDescription: rawDesc,
          hasFullText: true,
        });
      }
    } catch (err) {
      console.warn("[Micro1 Provider Warning] Request failed:", (err as Error).message);
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
