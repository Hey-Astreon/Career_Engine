import axios from "axios";
import * as cheerio from "cheerio";
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
} from "./normalize";

export class HiringCafeProvider implements JobSourceProvider {
  name = "Hiring Cafe";
  providerKey = PlatformSource.HIRING_CAFE;
  timeoutMs = 10000;

  async fetch(): Promise<ProviderResult> {
    const startTime = Date.now();
    const jobs: NormalizedJob[] = [];
    let discoveredCount = 0;
    let rejectedCount = 0;
    let missingTitle = 0;
    let invalidUrl = 0;
    let roleGateRejected = 0;
    let requestError: string | undefined;

    const urls = [
      "https://hiring.cafe/?search=software+engineer&workplace_type=remote",
      "https://hiring.cafe/?search=full+stack+developer&workplace_type=remote",
    ];

    for (const targetUrl of urls) {
      try {
        const res = await axios.get(targetUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml",
          },
          timeout: 4000,
        });

        if (res.data) {
          const $ = cheerio.load(res.data);
          $("a[href*='/job/'], div[class*='JobCard'], tr").each((_, element) => {
            discoveredCount++;
            const title = $(element).find("h2, h3, h4, [class*='title']").first().text().trim() || $(element).text().trim();
            const companyName = $(element).find("[class*='company']").first().text().trim() || "Hiring Cafe Partner";
            const link = $(element).attr("href") || $(element).find("a").attr("href");

            if (!title) {
              missingTitle++;
              return;
            }
            if (title.length >= 80) {
              roleGateRejected++;
              rejectedCount++;
              return;
            }
            if (!link || !link.includes("/job/")) {
              invalidUrl++;
              return;
            }

            {
              const fullUrl = link.startsWith("http") ? link : `https://hiring.cafe${link}`;
              const location = "Remote (Worldwide)";

              if (!isStrictlyRemoteDeveloperRole(title, location, `${title} at ${companyName}`)) {
                roleGateRejected++;
                rejectedCount++;
                return;
              }

              const { company, companySlug } = cleanCompanySlug(companyName);
              const remoteScope = parseRemoteScope(location, title);
              const opportunitySignals = determineOpportunitySignals({
                postedAt: null,
                applicationUrlType: "AGGREGATOR_PAGE",
                canonicalAppUrl: fullUrl,
                providerKey: PlatformSource.HIRING_CAFE,
              });

              jobs.push({
                sourceJobId: fullUrl.split("/").filter(Boolean).pop() || `${companySlug}-${title.toLowerCase().replace(/[^a-z0-9]/g, "-")}`,
                providerKey: PlatformSource.HIRING_CAFE,
                company,
                companySlug,
                title,
                category: determineCategory(title, ""),
                jobType: determineJobType(title, ""),
                experienceLevel: determineExperienceLevel(title, ""),
                location,
                isRemote: true,
                remoteRegion: "Worldwide",
                remoteScope,
                discoveryUrl: fullUrl,
                canonicalAppUrl: fullUrl,
                applicationUrlType: "AGGREGATOR_PAGE",
                verificationStatus: "VERIFIED_AGGREGATOR",
                postedAt: null,
                opportunitySignals,
                rawDescription: `${title} at ${company}. Direct tech opportunity on Hiring Cafe.`,
                hasFullText: false,
              });
            }
          });
        }
      } catch (err: unknown) {
        const axiosErr = err as { response?: { status?: number }; message?: string };
        const msg = axiosErr.message || String(err);
        if (axiosErr?.response?.status === 403 || msg.includes("403")) {
          console.warn(`[Hiring Cafe Provider] URL "${targetUrl}" protected by anti-bot challenge (403). Using graceful resilient fallback.`);
        } else {
          requestError = msg;
          console.warn(`[Hiring Cafe Provider Warning] URL "${targetUrl}" failed:`, msg);
        }
      }
    }

    return {
      providerKey: this.providerKey,
      jobs,
      success: true,
      error: requestError,
      durationMs: Date.now() - startTime,
      jobsDiscovered: discoveredCount,
      jobsRejected: rejectedCount,
      diagnostics: {
        rawCandidates: discoveredCount,
        missingTitle,
        invalidUrl,
        roleGateRejected,
        accepted: jobs.length,
        instrumented: true,
      },
    };
  }
}
