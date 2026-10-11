import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { cache } from "@/lib/cache/redis";

export async function GET() {
  try {
    const formattedStates = await cache.getOrSet("health:sources:v1", 60, async () => {
      const [syncStates, providerJobs] = await Promise.all([
        db.providerSyncState.findMany({ orderBy: { providerKey: "asc" } }),
        db.jobPosting.groupBy({ by: ["platform", "isExpired"], _count: { _all: true } }),
      ]);

      const jobCounts = new Map<string, { activeJobs: number; staleJobs: number }>();
      for (const row of providerJobs) {
        const current = jobCounts.get(row.platform) ?? { activeJobs: 0, staleJobs: 0 };
        if (row.isExpired) current.staleJobs += row._count._all;
        else current.activeJobs += row._count._all;
        jobCounts.set(row.platform, current);
      }

      return syncStates.map((state) => ({
        provider: state.providerKey,
        status: state.status,
        lastSyncAttemptAt: state.lastSyncAttemptAt ? state.lastSyncAttemptAt.toISOString() : null,
        lastSuccessfulSyncAt: state.lastSuccessfulSyncAt ? state.lastSuccessfulSyncAt.toISOString() : null,
        lastFailedSyncAt: state.lastFailedSyncAt ? state.lastFailedSyncAt.toISOString() : null,
        consecutiveFailures: state.consecutiveFailures,
        lastError: state.lastError,
        totalJobsSeen: state.totalJobsSeen,
        activeJobs: jobCounts.get(state.providerKey)?.activeJobs ?? 0,
        staleJobs: jobCounts.get(state.providerKey)?.staleJobs ?? 0,
      }));
    });

    return NextResponse.json({
      success: true,
      sources: formattedStates,
    });
  } catch (error) {
    console.error("Error fetching source health:", error);
    return NextResponse.json(
      { success: false, error: "Failed to retrieve source health metrics" },
      { status: 500 }
    );
  }
}
