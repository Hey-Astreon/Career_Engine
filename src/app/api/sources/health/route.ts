import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { cache } from "@/lib/cache/redis";
import { ACTIVE_PROVIDERS } from "@/lib/providers/registry";

export async function GET() {
  try {
    const formattedStates = await cache.getOrSet("health:sources:v2", 60, async () => {
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

      const activeProviderKeys = new Set(ACTIVE_PROVIDERS.map((p) => p.name.toUpperCase()));

      const mapState = (state: (typeof syncStates)[number]) => ({
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
      });

      const existingActiveKeys = new Set(
        syncStates.map((s) => s.providerKey.toUpperCase())
      );

      // Ensure every active provider appears in the health table even if sync state is uninitialized
      const defaultActiveStates = ACTIVE_PROVIDERS.filter(
        (p) => !existingActiveKeys.has(p.name.toUpperCase())
      ).map((p) => ({
        provider: p.name.toUpperCase(),
        status: "HEALTHY",
        lastSyncAttemptAt: null,
        lastSuccessfulSyncAt: null,
        lastFailedSyncAt: null,
        consecutiveFailures: 0,
        lastError: null,
        totalJobsSeen: 0,
        activeJobs: jobCounts.get(p.name.toUpperCase())?.activeJobs ?? 0,
        staleJobs: jobCounts.get(p.name.toUpperCase())?.staleJobs ?? 0,
      }));

      const activeStates = [
        ...syncStates
          .filter((state) => activeProviderKeys.has(state.providerKey.toUpperCase()))
          .map(mapState),
        ...defaultActiveStates,
      ];

      const archivedStates = syncStates
        .filter((state) => !activeProviderKeys.has(state.providerKey.toUpperCase()))
        .map(mapState);

      return {
        sources: activeStates,
        archivedSources: archivedStates,
      };

    });

    return NextResponse.json({
      success: true,
      sources: formattedStates.sources,
      archivedSources: formattedStates.archivedSources,
    });
  } catch (error) {
    console.error("Error fetching source health:", error);
    return NextResponse.json(
      { success: false, error: "Failed to retrieve source health metrics" },
      { status: 500 }
    );
  }
}

