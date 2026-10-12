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
import { generateUrlHash } from "./dedup";

export class WeWorkRemotelyProvider implements JobSourceProvider {
  name = "We Work Remotely";
  providerKey = PlatformSource.WEWORKREMOTELY;
  timeoutMs = 8000;

  async fetch(): Promise<ProviderResult> {
    const startTime = Date.now();
    const jobs: NormalizedJob[] = [];
    let jobsDiscovered = 0;
    let jobsRejected = 0;

    const feeds = [
      "https://weworkremotely.com/categories/remote-programming-jobs.rss",
      "https://weworkremotely.com/categories/remote-front-end-programming-jobs.rss",
      "https://weworkremotely.com/categories/remote-back-end-programming-jobs.rss",
      "https://weworkremotely.com/categories/remote-full-stack-programming-jobs.rss",
      "https://weworkremotely.com/categories/remote-devops-sysadmin-jobs.rss",
    ];

    for (const feedUrl of feeds) {
      try {
        const response = await fetch(feedUrl, {
          headers: {
            "User-Agent": "CareerAgent/2.0 (Verified Job Discovery Engine)",
          },
          signal: AbortSignal.timeout(this.timeoutMs),
        });

        if (!response.ok) continue;

        const xmlText = await response.text();
        const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
        let match: RegExpExecArray | null;

      while ((match = itemRegex.exec(xmlText)) !== null) {
        jobsDiscovered++;
        const itemXml = match[1];

        const titleMatch = /<title><!\[CDATA\[(.*?)\]\]><\/title>/i.exec(itemXml) || /<title>(.*?)<\/title>/i.exec(itemXml);
        const linkMatch = /<link>(.*?)<\/link>/i.exec(itemXml) || /<guid.*?>(.*?)<\/guid>/i.exec(itemXml);
        const pubDateMatch = /<pubDate>(.*?)<\/pubDate>/i.exec(itemXml);
        const descMatch = /<description><!\[CDATA\[(.*?)\]\]><\/description>/i.exec(itemXml) || /<description>(.*?)<\/description>/i.exec(itemXml);

        if (!titleMatch || !linkMatch) {
          jobsRejected++;
          continue;
        }

        const rawTitle = titleMatch[1].trim();
        const rawUrl = linkMatch[1].trim();
        const rawPubDate = pubDateMatch ? pubDateMatch[1].trim() : null;
        const rawDesc = descMatch ? descMatch[1].trim().replace(/<[^>]*>?/gm, " ").trim() : "";

        // Title format is usually "Company: Role Title"
        let company = "WeWorkRemotely Employer";
        let title = rawTitle;
        if (rawTitle.includes(":")) {
          const parts = rawTitle.split(":");
          company = parts[0].trim();
          title = parts.slice(1).join(":").trim();
        }

        const postedAt = rawPubDate ? new Date(rawPubDate) : null;
        const validPostedAt = postedAt && !isNaN(postedAt.getTime()) ? postedAt : null;

        if (!isStrictlyRemoteDeveloperRole(title, "Worldwide", rawDesc, validPostedAt)) {
          jobsRejected++;
          continue;
        }

        const companySlug = company.toLowerCase().replace(/[^a-z0-9]/g, "");

        const remoteScope = parseRemoteScope("Worldwide", rawDesc);
        const opportunitySignals = determineOpportunitySignals({
          postedAt: validPostedAt,
          applicationUrlType: "DIRECT_EMPLOYER_SITE",
          canonicalAppUrl: rawUrl,
          providerKey: this.providerKey,
        });

        jobs.push({
          sourceJobId: generateUrlHash(rawUrl),
          providerKey: this.providerKey,
          company,
          companySlug,
          title,
          category: determineCategory(title, rawDesc),
          jobType: determineJobType(title, rawDesc),
          experienceLevel: determineExperienceLevel(title, rawDesc),
          location: "Remote",
          isRemote: true,
          remoteScope,
          discoveryUrl: rawUrl,
          canonicalAppUrl: rawUrl,
          applicationUrlType: "DIRECT_EMPLOYER_SITE",
          verificationStatus: "VERIFIED_AGGREGATOR",
          postedAt: validPostedAt,
          opportunitySignals,
          rawDescription: rawDesc || `${title} at ${company}. Discovered on WeWorkRemotely.`,
          hasFullText: rawDesc.length > 50,
        });
      }
    } catch (err) {
      console.warn(`[WeWorkRemotely Provider Warning] Feed "${feedUrl}" failed:`, (err as Error).message);
    }
  }

  return {
    providerKey: this.providerKey,
    jobs,
    success: true,
    durationMs: Date.now() - startTime,
    jobsDiscovered,
    jobsRejected,
  };
}
}
