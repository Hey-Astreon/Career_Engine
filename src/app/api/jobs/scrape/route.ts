import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import { runAllProviders, ingestNormalizedJobs } from "@/lib/providers/registry";
import { parseRemoteScope, MAX_POSTING_AGE_DAYS } from "@/lib/providers/normalize";
import { buildProviderEndpointRunInserts } from "@/lib/providerEndpointTelemetry";

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

    const twentyOneDaysAgo = new Date(Date.now() - MAX_POSTING_AGE_DAYS * 86400000);
    const rawActive = await db.jobPosting.findMany({
      where: {
        isExpired: false,
        OR: [
          { postedAt: { gte: twentyOneDaysAgo } },
          { postedAt: null, createdAt: { gte: twentyOneDaysAgo } },
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

    const mixedJobs = interleavePlatforms(populatedActive);

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
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const twentyOneDaysAgo = new Date(Date.now() - MAX_POSTING_AGE_DAYS * 86400000);
    const rawActive = await db.jobPosting.findMany({
      where: {
        isExpired: false,
        OR: [
          { postedAt: { gte: twentyOneDaysAgo } },
          { postedAt: null, createdAt: { gte: twentyOneDaysAgo } },
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

    const mixedJobs = interleavePlatforms(populatedActive);

    return NextResponse.json({ success: true, jobs: mixedJobs });
  } catch (error) {
    console.error("Error fetching jobs:", error);
    return NextResponse.json(
      { success: false, error: "Failed to retrieve job postings" },
      { status: 500 }
    );
  }
}
