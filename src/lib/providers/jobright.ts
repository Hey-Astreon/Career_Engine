import axios from "axios";
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
  sanitizeRoleTitle,
} from "./normalize";

export class JobrightProvider implements JobSourceProvider {
  name = "Jobright AI";
  providerKey = PlatformSource.JOBRIGHT;
  timeoutMs = 15000;

  async fetch(): Promise<ProviderResult> {
    const startTime = Date.now();
    const jobs: NormalizedJob[] = [];
    let discoveredCount = 0;
    let rejectedCount = 0;

    // Check if the Python AI Agent Gateway is available on port 8000
    const agentGatewayUrl = process.env.AGENT_GATEWAY_URL || "http://localhost:8000";

    try {
      const res = await axios.post(
        `${agentGatewayUrl}/scraper/harvest`,
        {
          source: "jobright",
          query: "software engineer intern",
          remoteOnly: true,
          maxJobs: 25,
        },
        { timeout: 12000 }
      );

      if (res.data && Array.isArray(res.data.jobs)) {
        for (const item of res.data.jobs) {
          discoveredCount++;
          const title = sanitizeRoleTitle(item.title || "");
          const { company, companySlug } = cleanCompanySlug(item.company || "Tech Company");
          const location = item.location || "Remote";
          const rawDesc = item.rawDescription || "";
          const url = item.url ? item.url.split("?")[0] : `https://jobright.ai/jobs`;

          if (!isStrictlyRemoteDeveloperRole(title, location, rawDesc)) {
            rejectedCount++;
            continue;
          }

          const experienceLevel = determineExperienceLevel(title, rawDesc);
          const earlyCareerLevels = ["Internship", "Fresher / Entry Level (0-1 Yr)", "Junior (1-3 Yrs)"];
          if (!earlyCareerLevels.includes(experienceLevel)) {
            rejectedCount++;
            continue;
          }

          const postedAt = item.postedAt ? new Date(item.postedAt) : new Date();
          const signals = determineOpportunitySignals({
            postedAt,
            applicationUrlType: "AGGREGATOR_PAGE",
            canonicalAppUrl: url,
            providerKey: this.providerKey,
          });

          jobs.push({
            providerKey: this.providerKey,
            company,
            companySlug,
            title,
            category: determineCategory(title),
            jobType: determineJobType(title, rawDesc),
            experienceLevel,
            location,
            isRemote: true,
            remoteScope: parseRemoteScope(location, rawDesc),
            discoveryUrl: url,
            canonicalAppUrl: url,
            applicationUrlType: "AGGREGATOR_PAGE",
            verificationStatus: "VERIFIED_AGGREGATOR",
            postedAt,
            opportunitySignals: signals,
            rawDescription: rawDesc || `${title} at ${company}. Harvested from Jobright AI.`,
            hasFullText: rawDesc.length > 200,
            technologies: item.tags || [],
          });
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
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Agent Gateway Offline";
      return {
        providerKey: this.providerKey,
        jobs: [],
        success: true,
        error: `Agent Core standby: ${errorMessage}`,
        durationMs: Date.now() - startTime,
        jobsDiscovered: 0,
        jobsRejected: 0,
      };
    }
  }
}
