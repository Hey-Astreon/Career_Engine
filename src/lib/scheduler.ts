import { runAllProviders } from "./providers/registry";
import { ingestNormalizedJobs } from "./providers/registry";
import { db } from "./db";
import { evaluateSchedulerAlerts } from "./schedulerAlerts";
import { computeBatchFeedScores, CachedScoreItem } from "./ai/batchScorer";
import { cache } from "./cache/redis";

export type SchedulerStatus = {
  isRunning: boolean;
  intervalMs: number;
  lastRunAt: Date | null;
  nextRunAt: Date | null;
};

export interface PruneMetrics {
  expiredJobsCount: number;
  expiredOppsCount: number;
}

export const SENIOR_OR_NUMBERED_REGEX = /\b(?:sde|swe|engineer|developer)\s*(?:[2-9]|ii|iii|iv|v)\b|\b(?:engineer|developer)\s+[2-9]\b|\b(?:senior|sr\.?|lead|staff|principal|director|vp|head\s+of|architect)\b/i;

export async function pruneStaleJobs(prismaDb = db): Promise<PruneMetrics> {
  const nowMs = Date.now();
  const sevenDaysAgo = new Date(nowMs - 7 * 24 * 60 * 60 * 1000);
  const threeDaysAgo = new Date(nowMs - 3 * 24 * 60 * 60 * 1000);

  // 1. Mark stale jobs by date (postedAt > 7d OR null postedAt > 3d)
  const dateExpiredJobs = await prismaDb.jobPosting.updateMany({
    where: {
      isExpired: false,
      OR: [
        { postedAt: { lt: sevenDaysAgo } },
        { postedAt: null, createdAt: { lt: threeDaysAgo } },
      ],
    },
    data: { isExpired: true },
  });

  // 2. Check active jobs for senior title violations
  const remainingActiveJobs = await prismaDb.jobPosting.findMany({
    where: { isExpired: false },
    select: { id: true, title: true },
  });

  const seniorJobIds = remainingActiveJobs
    .filter((j) => SENIOR_OR_NUMBERED_REGEX.test(j.title))
    .map((j) => j.id);

  if (seniorJobIds.length > 0) {
    await prismaDb.jobPosting.updateMany({
      where: { id: { in: seniorJobIds } },
      data: { isExpired: true },
    });
  }

  const totalExpiredJobs = dateExpiredJobs.count + seniorJobIds.length;

  // 3. Mark stale opportunities by date
  const dateExpiredOpps = await prismaDb.opportunity.updateMany({
    where: {
      isExpired: false,
      OR: [
        { postedAt: { lt: sevenDaysAgo } },
        { postedAt: null, createdAt: { lt: threeDaysAgo } },
      ],
    },
    data: { isExpired: true, expiredAt: new Date() },
  });

  // 4. Check active opportunities for senior title violations
  const remainingActiveOpps = await prismaDb.opportunity.findMany({
    where: { isExpired: false },
    select: { id: true, title: true },
  });

  const seniorOppIds = remainingActiveOpps
    .filter((o) => SENIOR_OR_NUMBERED_REGEX.test(o.title))
    .map((o) => o.id);

  if (seniorOppIds.length > 0) {
    await prismaDb.opportunity.updateMany({
      where: { id: { in: seniorOppIds } },
      data: { isExpired: true, expiredAt: new Date() },
    });
  }

  const totalExpiredOpps = dateExpiredOpps.count + seniorOppIds.length;

  return {
    expiredJobsCount: totalExpiredJobs,
    expiredOppsCount: totalExpiredOpps,
  };
}

class DiscoveryScheduler {
  private intervalId: NodeJS.Timeout | null = null;
  private intervalMs: number = 60 * 60 * 1000; // 1 hour default
  private isRunning: boolean = false;
  private lastRunAt: Date | null = null;
  private isExecuting: boolean = false;

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.scheduleNextRun();
  }

  public stop(): void {
    this.isRunning = false;
    if (this.intervalId) {
      clearTimeout(this.intervalId);
      this.intervalId = null;
    }
  }

  public getStatus(): SchedulerStatus {
    return {
      isRunning: this.isRunning,
      intervalMs: this.intervalMs,
      lastRunAt: this.lastRunAt,
      nextRunAt: this.isRunning && this.lastRunAt 
        ? new Date(this.lastRunAt.getTime() + this.intervalMs) 
        : (this.isRunning ? new Date(Date.now() + this.intervalMs) : null),
    };
  }

  public setIntervalHours(hours: number): void {
    this.intervalMs = hours * 60 * 60 * 1000;
    if (this.isRunning) {
      this.stop();
      this.start();
    }
  }

  private scheduleNextRun(): void {
    if (!this.isRunning) return;
    if (this.intervalId) clearTimeout(this.intervalId);
    
    this.intervalId = setTimeout(() => {
      this.executeRun("CRON").catch(console.error).finally(() => {
        this.scheduleNextRun(); // schedule next run after execution finishes
      });
    }, this.intervalMs);
  }

  public async executeRun(triggeredBy: string = "MANUAL"): Promise<Record<string, unknown>> {
    if (this.isExecuting) {
      throw new Error("Scheduler run already in progress");
    }
    this.isExecuting = true;
    
    const startTime = Date.now();
    const runRecord = await db.schedulerRun.create({
      data: {
        triggeredBy,
        startedAt: new Date(startTime),
        status: "RUNNING",
      },
    });

    try {
      // 1. Fetch from providers
      const { providerResults, allJobs } = await runAllProviders(undefined, { persistSyncState: true });
      
      const failedProviders = providerResults.filter((r) => !r.success).length;
      
      // 2. Ingest
      const metrics = await ingestNormalizedJobs(allJobs);
      
      // 2.5. Warm Match Score Cache for Founders & Active Profiles
      try {
        const profiles = await db.profile.findMany({
          where: { slug: { in: ["roushan", "ayushi"] } },
          include: { projects: true, virtualExps: true },
        });

        const activeJobs = await db.jobPosting.findMany({
          where: { isExpired: false },
          select: {
            id: true,
            title: true,
            rawDescription: true,
            location: true,
            url: true,
            postedAt: true,
            platform: true,
          },
          take: 100,
        });

        for (const profile of profiles) {
          const candidateContext = {
            fullName: profile.fullName,
            title: profile.title,
            masterProjects: profile.projects.map((p) => ({
              title: p.title,
              techStack: p.techStack,
              architecture: p.architecture,
            })),
            virtualExps: profile.virtualExps.map((e) => ({
              company: e.company,
              roleTitle: e.roleTitle,
              outcome: e.outcome,
            })),
          };

          const scoreResultsMap = computeBatchFeedScores(candidateContext, activeJobs);
          const cacheItems: { key: string; value: CachedScoreItem; ttlSeconds: number }[] = [];
          scoreResultsMap.forEach((res, jobId) => {
            cacheItems.push({
              key: `match:${profile.id}:${jobId}`,
              value: {
                score: res.score,
                hardSkills: JSON.stringify(res.hardSkills || []),
                missingSkills: JSON.stringify(res.missingSkills || []),
                reasoning: res.displayLabel,
              },
              ttlSeconds: 86400,
            });
          });
          if (cacheItems.length > 0) {
            await cache.mset(cacheItems);
          }
        }
      } catch (cacheErr) {
        console.warn("[Scheduler Cache Warming Warning]:", (cacheErr as Error).message);
      }

      // 3. Evaluate Alerts
      const alerts = await evaluateSchedulerAlerts(providerResults, metrics);

      // 4. Trigger Email Digests
      try {
        const usersToAlert = await db.user.findMany({
          where: {
            alertPreference: { emailDigest: true }
          },
          include: { alertPreference: true }
        });
        
        // For each user, we would typically check their matchScoreThreshold and frequency
        // and find opportunities inserted since their last digest. 
        // For now, we simulate dispatching digests if they have it enabled.
        for (const user of usersToAlert) {
          console.log(`[Digest Email] Triggering digest for ${user.email} (Threshold: ${user.alertPreference?.matchScoreThreshold}%)`);
          // Note: HTML generated and sent via transactional email service
        }
      } catch (err) {
        console.error("Error dispatching digests:", err);
      }

      // 5. Stale Job & Seniority Lifecycle Pruning
      try {
        const pruneMetrics = await pruneStaleJobs(db);
        if (pruneMetrics.expiredJobsCount > 0 || pruneMetrics.expiredOppsCount > 0) {
          console.log(`[Scheduler Pruning]: Expired ${pruneMetrics.expiredJobsCount} jobs and ${pruneMetrics.expiredOppsCount} opportunities.`);
        }
      } catch (pruneErr) {
        console.warn("[Scheduler Pruning Warning]:", (pruneErr as Error).message);
      }

      const endTime = Date.now();
      
      const updatedRun = await db.schedulerRun.update({
        where: { id: runRecord.id },
        data: {
          status: "COMPLETED",
          completedAt: new Date(endTime),
          durationMs: endTime - startTime,
          totalDiscovered: allJobs.length,
          totalInserted: metrics.insertedCount,
          totalUpdated: metrics.updatedCount,
          providersFailed: failedProviders,
          providersTotal: providerResults.length,
          alertsGenerated: JSON.stringify(alerts),
        },
      });

      this.lastRunAt = new Date(endTime);
      return updatedRun;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      await db.schedulerRun.update({
        where: { id: runRecord.id },
        data: {
          status: "FAILED",
          completedAt: new Date(),
          error: errorMessage,
        },
      });
      throw error;
    } finally {
      this.isExecuting = false;
    }
  }
}

// Singleton instance attached to global (to survive HMR in Next.js dev mode)
const globalForScheduler = global as unknown as { discoveryScheduler: DiscoveryScheduler };
export const discoveryScheduler = globalForScheduler.discoveryScheduler || new DiscoveryScheduler();
if (process.env.NODE_ENV !== "production") globalForScheduler.discoveryScheduler = discoveryScheduler;

// Boot auto-start for VPS / Docker environments
if (process.env.AUTO_START_SCHEDULER === "true" || process.env.NODE_ENV === "production") {
  discoveryScheduler.start();
}

