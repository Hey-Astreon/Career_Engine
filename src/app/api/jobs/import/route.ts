import { NextResponse } from "next/server";
import { PlatformSource } from "@prisma/client";
import { ingestNormalizedJobs } from "@/lib/providers/registry";
import { NormalizedJob } from "@/lib/providers/types";
import {
  sanitizeRoleTitle,
  cleanCompanySlug,
  parseRemoteScope,
  determineCategory,
  determineJobType,
  determineExperienceLevel,
  isStrictlyRemoteDeveloperRole,
  determineOpportunitySignals,
} from "@/lib/providers/normalize";
import { cache } from "@/lib/cache/redis";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export interface IngestJobPayloadItem {
  title: string;
  company: string;
  location?: string;
  url: string;
  rawDescription?: string;
  salary?: string;
  tags?: string[];
  postedAt?: string | Date;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || !Array.isArray(body.jobs)) {
      return NextResponse.json(
        { success: false, error: "Invalid payload. 'jobs' array is required." },
        { status: 400, headers: CORS }
      );
    }

    const rawSource = (body.source || "WELLFOUND").toUpperCase();
    const providerKey =
      rawSource === "JOBRIGHT"
        ? PlatformSource.JOBRIGHT
        : PlatformSource.WELLFOUND;

    const rawJobs: IngestJobPayloadItem[] = body.jobs;
    const normalizedJobs: NormalizedJob[] = [];
    let rejectedCount = 0;

    for (const item of rawJobs) {
      if (!item.title || !item.company || !item.url) {
        rejectedCount++;
        continue;
      }

      const title = sanitizeRoleTitle(item.title);
      const { company, companySlug } = cleanCompanySlug(item.company);
      const location = item.location?.trim() || "Remote";
      const rawDesc = item.rawDescription?.trim() || "";

      // Quality gating: Must be developer role and remote
      const isRemoteDev = isStrictlyRemoteDeveloperRole(title, location, rawDesc);
      if (!isRemoteDev) {
        rejectedCount++;
        continue;
      }

      const experienceLevel = determineExperienceLevel(title, rawDesc);
      const earlyCareerLevels = [
        "Internship",
        "Fresher / Entry Level (0-1 Yr)",
        "Junior (1-3 Yrs)",
        "0-3 Years (Entry/Junior)",
      ];
      if (!earlyCareerLevels.includes(experienceLevel)) {
        rejectedCount++;
        continue;
      }

      const cleanUrl = item.url.split("?")[0].trim();
      const postedAt = item.postedAt ? new Date(item.postedAt) : new Date();

      const signals = determineOpportunitySignals({
        postedAt,
        applicationUrlType: "AGGREGATOR_PAGE",
        canonicalAppUrl: cleanUrl,
        providerKey,
      });

      const normalized: NormalizedJob = {
        providerKey,
        company,
        companySlug,
        title,
        category: determineCategory(title),
        jobType: determineJobType(title, rawDesc),
        experienceLevel,
        location,
        isRemote: true,
        remoteScope: parseRemoteScope(location, rawDesc),
        discoveryUrl: cleanUrl,
        canonicalAppUrl: cleanUrl,
        applicationUrlType: "AGGREGATOR_PAGE",
        verificationStatus: "VERIFIED_AGGREGATOR",
        postedAt,
        opportunitySignals: signals,
        rawDescription: rawDesc.length > 50 ? rawDesc : `${title} at ${company}. Harvested from ${rawSource}.`,
        hasFullText: rawDesc.length > 200,
        technologies: Array.isArray(item.tags) ? item.tags : [],
      };

      normalizedJobs.push(normalized);
    }

    if (normalizedJobs.length === 0) {
      return NextResponse.json(
        {
          success: true,
          received: rawJobs.length,
          normalized: 0,
          rejected: rejectedCount,
          inserted: 0,
          updated: 0,
          message: "No roles matched remote 0-3 YOE developer criteria.",
        },
        { headers: CORS }
      );
    }

    // Ingest into Opportunity and JobPosting tables
    const { insertedCount, updatedCount } = await ingestNormalizedJobs(normalizedJobs);

    // Invalidate active feed cache
    await cache.delPattern("feed:*");
    await cache.del("health:sources:v1");

    return NextResponse.json(
      {
        success: true,
        source: providerKey,
        received: rawJobs.length,
        normalized: normalizedJobs.length,
        rejected: rejectedCount,
        inserted: insertedCount,
        updated: updatedCount,
      },
      { headers: CORS }
    );
  } catch (error) {
    console.error("[api/jobs/import] Error ingesting jobs:", error);
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500, headers: CORS }
    );
  }
}
