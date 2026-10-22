import { PlatformSource } from "@prisma/client";
import { JobSourceProvider, ProviderResult, NormalizedJob } from "./types";
import {
  isStrictlyRemoteDeveloperRole,
  determineCategory,
  determineExperienceLevel,
  determineJobType,
  parseRemoteScope,
  determineOpportunitySignals,
} from "./normalize";

interface ArbeitnowItem {
  slug: string;
  company_name: string;
  title: string;
  description: string;
  remote: boolean;
  url: string;
  location: string;
  created_at: number;
}

export class ArbeitnowProvider implements JobSourceProvider {
  name = "Arbeitnow";
  providerKey = PlatformSource.ARBEITNOW;
  timeoutMs = 15000;

  async fetch(): Promise<ProviderResult> {
    const startTime = Date.now();
    const jobs: NormalizedJob[] = [];
    let jobsDiscovered = 0;
    let jobsRejected = 0;

    try {
      const response = await fetch("https://www.arbeitnow.com/api/job-board-api", {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(this.timeoutMs),
      });

      if (!response.ok) {
        return {
          providerKey: this.providerKey,
          jobs: [],
          success: false,
          error: `HTTP ${response.status}`,
          durationMs: Date.now() - startTime,
          jobsDiscovered: 0,
          jobsRejected: 0,
        };
      }

      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("json")) {
        return {
          providerKey: this.providerKey,
          jobs: [],
          success: false,
          error: `Arbeitnow returned non-JSON payload (${contentType.slice(0, 30)})`,
          durationMs: Date.now() - startTime,
          jobsDiscovered: 0,
          jobsRejected: 0,
        };
      }

      let data: any;
      try {
        data = await response.json();
      } catch (jsonErr: any) {
        return {
          providerKey: this.providerKey,
          jobs: [],
          success: false,
          error: `Failed to parse Arbeitnow JSON: ${jsonErr.message}`,
          durationMs: Date.now() - startTime,
          jobsDiscovered: 0,
          jobsRejected: 0,
        };
      }

      const items: ArbeitnowItem[] = data.data || [];

      for (const item of items) {
        jobsDiscovered++;
        if (!item.remote) {
          jobsRejected++;
          continue;
        }

        const title = item.title;
        const company = item.company_name;
        const location = item.location || "Remote";
        const rawDesc = (item.description || "").replace(/<[^>]*>?/gm, " ").trim();

        const postedAt = item.created_at ? new Date(item.created_at * 1000) : null;
        const validPostedAt = postedAt && !isNaN(postedAt.getTime()) ? postedAt : null;

        if (!isStrictlyRemoteDeveloperRole(title, location, rawDesc, validPostedAt)) {
          jobsRejected++;
          continue;
        }

        const companySlug = company.toLowerCase().replace(/[^a-z0-9]/g, "");

        const remoteScope = parseRemoteScope(location, rawDesc);
        const opportunitySignals = determineOpportunitySignals({
          postedAt: validPostedAt,
          applicationUrlType: "DIRECT_EMPLOYER_SITE",
          canonicalAppUrl: item.url,
          providerKey: this.providerKey,
        });

        jobs.push({
          sourceJobId: item.slug,
          providerKey: this.providerKey,
          company,
          companySlug,
          title,
          category: determineCategory(title, rawDesc),
          jobType: determineJobType(title, rawDesc),
          experienceLevel: determineExperienceLevel(title, rawDesc),
          location,
          isRemote: true,
          remoteScope,
          discoveryUrl: item.url,
          canonicalAppUrl: item.url,
          applicationUrlType: "DIRECT_EMPLOYER_SITE",
          verificationStatus: "VERIFIED_AGGREGATOR",
          postedAt: validPostedAt,
          opportunitySignals,
          rawDescription: rawDesc || `${title} at ${company}. Listed on Arbeitnow.`,
          hasFullText: rawDesc.length > 50,
        });
      }

      return {
        providerKey: this.providerKey,
        jobs,
        success: true,
        durationMs: Date.now() - startTime,
        jobsDiscovered,
        jobsRejected,
      };
    } catch (err) {
      return {
        providerKey: this.providerKey,
        jobs: [],
        success: false,
        error: (err as Error).message,
        durationMs: Date.now() - startTime,
        jobsDiscovered: 0,
        jobsRejected: 0,
      };
    }
  }
}
