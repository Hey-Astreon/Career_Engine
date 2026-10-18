import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import { runAllProviders, ingestNormalizedJobs } from "@/lib/providers/registry";
import { parseRemoteScope, MAX_POSTING_AGE_DAYS, PROBATION_MAX_AGE_DAYS, determineEarlyCareerTier, calculateEarlyBirdScore } from "@/lib/providers/normalize";
import { buildProviderEndpointRunInserts } from "@/lib/providerEndpointTelemetry";
import { cache } from "@/lib/cache/redis";

function interleavePlatforms<T extends { platform: string }>(jobsList: T[]): T[] {
  const groups: Record<string, T[]> = {};
  for (const item of jobsList) {
    const key = item.platform || "OTHER";
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
  }

  const keys = Object.keys(groups);
  const result: T[] = [];
  let added = true;
  let idx = 0;

  while (added) {
    added = false;
    for (const k of keys) {
      if (idx < groups[k].length) {
        result.push(groups[k][idx]);
        added = true;
      }
    }
    idx++;
  }

  return result;
}

function interleaveEarlyBirdFeed<
  T extends {
    platform: string;
    title: string;
    rawDescription?: string | null;
    postedAt?: Date | string | null;
    createdAt?: Date | string | null;
  }
>(jobsList: T[]): T[] {
  const now = Date.now();

  const scored = jobsList.map((job) => {
    const tier = determineEarlyCareerTier(job.title, job.rawDescription || "");
    const score = calculateEarlyBirdScore(tier, job.postedAt, now);
    return { job, tier, score };
  });

  // Sort within bracket by score desc, then date desc
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const timeA = a.job.postedAt ? new Date(a.job.postedAt).getTime() : 0;
    const timeB = b.job.postedAt ? new Date(b.job.postedAt).getTime() : 0;
    return timeB - timeA;
  });

  // Partition into priority brackets
  const brackets: T[][] = [[], [], [], []];
  for (const item of scored) {
    if (item.score >= 2000) brackets[0].push(item.job); // Ultra-Fresh Internships (<48h) & Ultra-Fresh 0-Exp (<24h)
    else if (item.score >= 1000) brackets[1].push(item.job); // Active Internships & Fresh 0-Exp
    else if (item.score >= 500) brackets[2].push(item.job); // Fresh 0-1 Exp & Active 0-Exp
    else brackets[3].push(item.job); // General Early Career
  }

  const result: T[] = [];
  for (const bracket of brackets) {
    if (bracket.length > 0) {
      result.push(...interleavePlatforms(bracket));
    }
  }

  return result;
}

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const scrapeRunId = randomUUID();
    console.log("[Discovery Engine Phase 1] Running provider registry concurrently...");
    
    // Execute all providers with bounded timeouts & failure isolation
    const { providerResults, allJobs, totalDiscovered, totalRejected } = await runAllProviders();

    // Dual-ingest into Opportunity/Occurrence and JobPosting
    const { insertedCount, updatedCount } = await ingestNormalizedJobs(allJobs);

    const endpointRunRows = buildProviderEndpointRunInserts(scrapeRunId, providerResults);
    if (endpointRunRows.length) {
      await db.providerEndpointRun.createMany({ data: endpointRunRows }).catch((error) => {
        console.warn("[ProviderEndpointTelemetry] Failed to persist endpoint telemetry:", error.message);
      });
    }

    const sevenDaysAgo = new Date(Date.now() - MAX_POSTING_AGE_DAYS * 86400000);
    const twoDaysAgo = new Date(Date.now() - PROBATION_MAX_AGE_DAYS * 86400000);
    const rawActive = await db.jobPosting.findMany({
      where: {
        isExpired: false,
        OR: [
          { postedAt: { gte: sevenDaysAgo } },
          { postedAt: null, createdAt: { gte: twoDaysAgo } },
        ],
      },
      orderBy: [{ postedAt: "desc" }, { createdAt: "desc" }],
    });

    const populatedActive = rawActive.map((j) => {
      let scope = j.remoteScope;
      if (!scope || scope === "UNKNOWN") {
        scope = parseRemoteScope(j.location || "", j.rawDescription || "");
      }
      return { ...j, remoteScope: scope };
    });

    const mixedJobs = interleaveEarlyBirdFeed(populatedActive);

    // Invalidate and refresh active feed cache
    await cache.delPattern("feed:*");
    await cache.del("health:sources:v1");
    await cache.set("feed:active:v1", mixedJobs, 300);

    return NextResponse.json({
      success: true,
      scrapeRunId,
      providerSummary: providerResults.map((p) => ({
        provider: p.providerKey,
        success: p.success,
        durationMs: p.durationMs,
        discovered: p.jobsDiscovered,
        error: p.error,
        diagnostics: p.diagnostics ?? null,
        endpointTelemetry: p.endpointTelemetry ?? null,
        endpointTelemetrySummary: p.endpointTelemetrySummary ?? null,
      })),
      totalDiscovered,
      totalRejected,
      newJobsInserted: insertedCount,
      jobsUpdated: updatedCount,
      jobs: mixedJobs,
    });
  } catch (error) {
    console.error("Scraper Pipeline Error:", error);
    return NextResponse.json(
      { success: false, error: "Scraping pipeline failed" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const mixedJobs = await cache.getOrSet("feed:active:v1", 300, async () => {
      const sevenDaysAgo = new Date(Date.now() - MAX_POSTING_AGE_DAYS * 86400000);
      const twoDaysAgo = new Date(Date.now() - PROBATION_MAX_AGE_DAYS * 86400000);
      const rawActive = await db.jobPosting.findMany({
        where: {
          isExpired: false,
          OR: [
            { postedAt: { gte: sevenDaysAgo } },
            { postedAt: null, createdAt: { gte: twoDaysAgo } },
          ],
        },
        orderBy: [{ postedAt: "desc" }, { createdAt: "desc" }],
      });

      const populatedActive = rawActive.map((j) => {
        let scope = j.remoteScope;
        if (!scope || scope === "UNKNOWN") {
          scope = parseRemoteScope(j.location || "", j.rawDescription || "");
        }
        return { ...j, remoteScope: scope };
      });

      return interleaveEarlyBirdFeed(populatedActive);
    });

    return NextResponse.json({ success: true, jobs: mixedJobs });
  } catch (error) {
    console.error("Error fetching jobs:", error);
    return NextResponse.json(
      { success: false, error: "Failed to retrieve job postings" },
      { status: 500 }
    );
  }
}
