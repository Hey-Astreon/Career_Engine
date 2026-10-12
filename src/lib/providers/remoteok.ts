import { PlatformSource } from "@prisma/client";
import { JobSourceProvider, ProviderResult, NormalizedJob } from "./types";
import {
  cleanCompanySlug,
  cleanHtmlText,
  determineCategory,
  determineExperienceLevel,
  determineJobType,
  isStrictlyRemoteDeveloperRole,
  parseRemoteScope,
  determineOpportunitySignals,
} from "./normalize";

interface RemoteOKItem {
  id: string | number;
  epoch?: number;
  date?: string;
  company?: string;
  position?: string;
  location?: string;
  url?: string;
  apply_url?: string;
  description?: string;
  tags?: string[];
}

export class RemoteOKProvider implements JobSourceProvider {
  name = "RemoteOK";
  providerKey = PlatformSource.REMOTEOK;
  timeoutMs = 8000;

  async fetch(): Promise<ProviderResult> {
    const startTime = Date.now();
    const jobs: NormalizedJob[] = [];
    let jobsDiscovered = 0;
    let jobsRejected = 0;

    try {
      const response = await fetch("https://remoteok.com/api", {
        headers: {
          "User-Agent": "CareerAgent/2.0 (Verified Job Discovery Engine)",
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

      const data = await response.json();
      const items: RemoteOKItem[] = Array.isArray(data) ? data : [];

      for (const item of items) {
        if (!item || !item.id || !item.position) continue;

        jobsDiscovered++;
        const title = item.position || "";
        const rawCompany = item.company || "Remote Company";
        const location = item.location || "Remote";
        const rawDesc = cleanHtmlText(item.description || "");
        const jobUrl = item.apply_url || item.url || `https://remoteok.com/remote-jobs/${item.id}`;

        const postedAtRaw = item.date ? new Date(item.date) : item.epoch ? new Date(item.epoch * 1000) : null;
        const validPostedAt = postedAtRaw && !isNaN(postedAtRaw.getTime()) ? postedAtRaw : null;

        if (!isStrictlyRemoteDeveloperRole(title, location, rawDesc, validPostedAt)) {
          jobsRejected++;
          continue;
        }

        const { company, companySlug } = cleanCompanySlug(rawCompany);

        const remoteScope = parseRemoteScope(location, rawDesc);
        const opportunitySignals = determineOpportunitySignals({
          postedAt: validPostedAt,
          applicationUrlType: "AGGREGATOR_PAGE",
          canonicalAppUrl: jobUrl,
          providerKey: this.providerKey,
        });

        jobs.push({
          sourceJobId: String(item.id),
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
          discoveryUrl: jobUrl,
          canonicalAppUrl: jobUrl,
          applicationUrlType: "AGGREGATOR_PAGE",
          verificationStatus: "VERIFIED_AGGREGATOR",
          postedAt: validPostedAt,
          opportunitySignals,
          rawDescription: rawDesc || `${title} at ${company}. Listed on RemoteOK.`,
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
