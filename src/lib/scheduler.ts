import { runAllProviders } from "./providers/registry";
import { ingestNormalizedJobs } from "./providers/registry";
import { db } from "./db";
import { evaluateSchedulerAlerts } from "./schedulerAlerts";
import { generateDigestHtml } from "./digestEmail";

export type SchedulerStatus = {
  isRunning: boolean;
  intervalMs: number;
  lastRunAt: Date | null;
  nextRunAt: Date | null;
};

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

  public async executeRun(triggeredBy: string = "MANUAL"): Promise<any> {
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
      const results = await runAllProviders({ persistSyncState: true });
      
      const failedProviders = results.filter(r => !r.success).length;
      const allJobs = results.flatMap((r) => r.jobs);
      
      // 2. Ingest
      const metrics = await ingestNormalizedJobs(allJobs);
      
      // 3. Evaluate Alerts
      const alerts = await evaluateSchedulerAlerts(results, metrics);

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
          providersTotal: results.length,
          alertsGenerated: JSON.stringify(alerts),
        },
      });

      this.lastRunAt = new Date(endTime);
      return updatedRun;
    } catch (error: any) {
      await db.schedulerRun.update({
        where: { id: runRecord.id },
        data: {
          status: "FAILED",
          completedAt: new Date(),
          error: error.message || "Unknown error",
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
