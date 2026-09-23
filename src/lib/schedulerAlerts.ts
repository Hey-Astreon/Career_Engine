import { ProviderResult } from "./providers/types";
type IngestionMetrics = { insertedCount: number; updatedCount: number; discoveredCount?: number };
import { db } from "./db";

export type SchedulerAlert = {
  type: "PROVIDER_DOWN" | "DEGRADED_COVERAGE" | "STALE_FEED";
  severity: "high" | "medium" | "low";
  message: string;
  providerKey?: string;
};

export async function evaluateSchedulerAlerts(
  results: ProviderResult[],
  metrics: IngestionMetrics
): Promise<SchedulerAlert[]> {
  const alerts: SchedulerAlert[] = [];
  
  // 1. Check for Provider Down (3+ consecutive failures)
  for (const res of results) {
    if (!res.success) {
      // Find the sync state for this provider
      const syncState = await db.providerSyncState.findUnique({
        where: { providerKey: res.providerKey },
      });

      // Including current failure (handled upstream or 2+ consecutive failures before this run)
      if (syncState && syncState.consecutiveFailures >= 2) {
        alerts.push({
          type: "PROVIDER_DOWN",
          severity: "high",
          message: `${res.providerKey} has failed 3+ consecutive times.`,
          providerKey: res.providerKey,
        });
      }
    }
  }

  // 2. Degraded Coverage (less than 50% providers succeeded)
  const successCount = results.filter((r) => r.success).length;
  if (successCount < results.length / 2) {
    alerts.push({
      type: "DEGRADED_COVERAGE",
      severity: "high",
      message: `Only ${successCount}/${results.length} providers successfully fetched data.`,
    });
  }

  // 3. Stale Feed (0 new jobs inserted, let's say if we have a successful run but 0 insertions)
  // To avoid spamming, we might only alert if this happens over a large period, but for now:
  if (metrics.insertedCount === 0 && successCount > 0) {
    // Check if the last run also had 0 insertions
    const lastRun = await db.schedulerRun.findFirst({
      where: { status: "COMPLETED" },
      orderBy: { completedAt: "desc" },
    });
    
    if (lastRun && lastRun.totalInserted === 0) {
      alerts.push({
        type: "STALE_FEED",
        severity: "medium",
        message: "No new jobs discovered in the last two sync cycles.",
      });
    }
  }

  return alerts;
}
