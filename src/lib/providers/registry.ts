import { db } from "@/lib/db";
import { SyncStatus, PlatformSource } from "@prisma/client";
import { JobSourceProvider, NormalizedJob, ProviderResult } from "./types";
import { GreenhouseProvider } from "./greenhouse";
import { AshbyProvider } from "./ashby";
import { HimalayasProvider } from "./himalayas";
import { LinkedInProvider } from "./linkedin";
import { HackerNewsProvider } from "./hackernews";
import { WeWorkRemotelyProvider } from "./weworkremotely";
import { JobicyProvider } from "./jobicy";
import { RemoteOKProvider } from "./remoteok";
import { Micro1Provider } from "./micro1";
import { SimplifyProvider } from "./simplify";
import { ArcDevProvider } from "./arcdev";
import { BuiltInProvider } from "./builtin";
import { ArbeitnowProvider } from "./arbeitnow";
import { RemotiveProvider } from "./remotive";
import { LeverProvider } from "./lever";
import { RecruiteeProvider } from "./recruitee";
import { SmartRecruitersProvider } from "./smartrecruiters";
import { WorkableProvider } from "./workable";
import { HiringCafeProvider } from "./hiringcafe";
import { generateUrlHash, computeDeduplicationKey, isDirectAtsUrl } from "./dedup";
import { parseRemoteScope, isOlderThanMaxPostingAge, MAX_POSTING_AGE_DAYS } from "./normalize";
import { isValidHttpUrl } from "@/lib/urlValidator";
import { logProviderDiagnostics } from "./diagnostic";

export const ACTIVE_PROVIDERS: JobSourceProvider[] = [
  new GreenhouseProvider(),
  new AshbyProvider(),
  new SimplifyProvider(),
  new ArcDevProvider(),
  new BuiltInProvider(),
  new HimalayasProvider(),
  new HackerNewsProvider(),
  new LinkedInProvider(),
  new WeWorkRemotelyProvider(),
  new JobicyProvider(),
  new Micro1Provider(),
  new RemoteOKProvider(),
  new ArbeitnowProvider(),
  new RemotiveProvider(),
  new LeverProvider(),
  new RecruiteeProvider(),
  new SmartRecruitersProvider(),
  new WorkableProvider(),
  new HiringCafeProvider(),
];

export interface ProviderRunOptions {
  /** Production discovery persists sync state and evaluates freshness. Diagnostics must opt out. */
  persistSyncState?: boolean;
}

/**
 * Executes a single provider with hard timeout via Promise.race and AbortSignal.
 */
async function executeProviderWithTimeout(provider: JobSourceProvider): Promise<ProviderResult> {
  const startTime = Date.now();
  let timeoutId: NodeJS.Timeout | null = null;

  const timeoutPromise = new Promise<ProviderResult>((resolve) => {
    timeoutId = setTimeout(() => {
      resolve({
        providerKey: provider.providerKey,
        jobs: [],
        success: false,
        error: `Provider execution timed out after ${provider.timeoutMs}ms`,
        durationMs: provider.timeoutMs,
        jobsDiscovered: 0,
        jobsRejected: 0,
      });
    }, provider.timeoutMs);
  });

  try {
    const result = await Promise.race([provider.fetch(), timeoutPromise]);
    return result;
  } catch (err) {
    return {
      providerKey: provider.providerKey,
      jobs: [],
      success: false,
      error: (err as Error).message,
      durationMs: Date.now() - startTime,
      jobsDiscovered: 0,
      jobsRejected: 0,
    };
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

/**
 * Runs all configured providers concurrently via Promise.allSettled() with failure isolation.
 */
export async function runAllProviders(
  providers: JobSourceProvider[] = ACTIVE_PROVIDERS,
  options: ProviderRunOptions = {}
): Promise<{
  providerResults: ProviderResult[];
  allJobs: NormalizedJob[];
  totalDiscovered: number;
  totalRejected: number;
}> {
  const persistSyncState = options.persistSyncState ?? true;
  const settled = await Promise.allSettled(
    providers.map((p) => executeProviderWithTimeout(p))
  );

  const providerResults: ProviderResult[] = [];
  const allJobs: NormalizedJob[] = [];
  let totalDiscovered = 0;
  let totalRejected = 0;

  for (let i = 0; i < settled.length; i++) {
    const res = settled[i];
    const provider = providers[i];

    if (res.status === "fulfilled") {
      const result = res.value;
      providerResults.push(result);
      if (result.success && result.jobs.length > 0) {
        allJobs.push(...result.jobs);
      }
      // Compute diagnostics for this provider (always log, even if 0 jobs)
      logProviderDiagnostics(provider.providerKey, result);
      totalDiscovered += result.jobsDiscovered;
      totalRejected += result.jobsRejected;

      if (persistSyncState) {
        // Update ProviderSyncState in DB only for production discovery runs.
        await db.providerSyncState.upsert({
          where: { providerKey: provider.providerKey },
          update: {
            status: result.success ? SyncStatus.HEALTHY : SyncStatus.DEGRADED,
            lastSyncAttemptAt: new Date(),
            ...(result.success ? { lastSuccessfulSyncAt: new Date(), consecutiveFailures: 0 } : { lastFailedSyncAt: new Date(), lastError: result.error }),
            totalJobsSeen: { increment: result.jobsDiscovered },
          },
          create: {
            providerKey: provider.providerKey,
            status: result.success ? SyncStatus.HEALTHY : SyncStatus.DEGRADED,
            lastSyncAttemptAt: new Date(),
            lastSuccessfulSyncAt: result.success ? new Date() : null,
            lastFailedSyncAt: result.success ? null : new Date(),
            lastError: result.error,
            totalJobsSeen: result.jobsDiscovered,
          },
        }).catch((err) => console.warn(`[SyncState Warning] Failed to update ${provider.providerKey}:`, err.message));

        // Freshness pruning is also production-only; a diagnostics run must never expire live roles.
        if (result.success) {
          await evaluateJobFreshness(provider.providerKey).catch((err) =>
            console.warn(`[Freshness Warning] Failed to evaluate freshness for ${provider.providerKey}:`, err.message)
          );
        }
      }
    } else {
      const errorMsg = res.reason?.message || "Execution error";
      providerResults.push({
        providerKey: provider.providerKey,
        jobs: [],
        success: false,
        error: errorMsg,
        durationMs: 0,
        jobsDiscovered: 0,
        jobsRejected: 0,
      });
    }
  }

  return {
    providerResults,
    allJobs,
    totalDiscovered,
    totalRejected,
  };
}

/**
 * Phase 2 Freshness Engine: Prunes occurrences missed during a successful sync and updates Opportunity expiry.
 * Runs in a Prisma transaction and re-queries live active occurrences count from DB.
 */
export async function evaluateJobFreshness(providerKey: string): Promise<{
  prunedOccurrences: number;
  expiredOpportunities: number;
}> {
  const syncState = await db.providerSyncState.findUnique({
    where: { providerKey },
  });

  if (!syncState || !syncState.lastSuccessfulSyncAt) {
    return { prunedOccurrences: 0, expiredOpportunities: 0 };
  }

  const cutoffTime = syncState.lastSuccessfulSyncAt;

  return await db.$transaction(async (tx) => {
    // 1. Find stale occurrences for this provider
    const staleOccurrences = await tx.jobOccurrence.findMany({
      where: {
        providerKey,
        lastSeenAt: { lt: cutoffTime },
      },
      select: { id: true, opportunityId: true },
    });

    if (staleOccurrences.length === 0) {
      return { prunedOccurrences: 0, expiredOpportunities: 0 };
    }

    const staleIds = staleOccurrences.map((o) => o.id);
    const affectedOppIds = Array.from(new Set(staleOccurrences.map((o) => o.opportunityId)));

    // 2. Bulk delete stale occurrences
    const deleteResult = await tx.jobOccurrence.deleteMany({
      where: { id: { in: staleIds } },
    });

    let expiredCount = 0;

    // 3. Re-query live DB count for each affected Opportunity
    for (const oppId of affectedOppIds) {
      const activeCount = await tx.jobOccurrence.count({
        where: { opportunityId: oppId },
      });

      if (activeCount === 0) {
        await tx.opportunity.update({
          where: { id: oppId },
          data: {
            isExpired: true,
            expiredAt: new Date(),
          },
        });
        expiredCount++;
      }
    }

    // 4. Mark stale JobPostings for this provider as expired
    await tx.jobPosting.updateMany({
      where: {
        platform: providerKey as PlatformSource,
        lastSeenAt: { lt: cutoffTime },
        isExpired: false,
      },
      data: {
        isExpired: true,
      },
    });

    // 5. Hard 21-day ceiling: Expire any job posted more than 21 days (3 weeks) ago
    const twentyOneDaysAgo = new Date(Date.now() - MAX_POSTING_AGE_DAYS * 86400000);
    await tx.jobPosting.updateMany({
      where: {
        postedAt: { lt: twentyOneDaysAgo },
        isExpired: false,
      },
      data: {
        isExpired: true,
      },
    });

    return { prunedOccurrences: deleteResult.count, expiredOpportunities: expiredCount };
  });
}

/**
 * Ingests normalized jobs into database:
 * 1. Upserts Opportunity & JobOccurrence (Phase 1/2 Multi-Signal Deduplication & Provenance Architecture)
 * 2. Upserts JobPosting for backward compatibility with existing API consumers
 */
export async function ingestNormalizedJobs(jobs: NormalizedJob[]): Promise<{ insertedCount: number; updatedCount: number }> {
  let insertedCount = 0;
  let updatedCount = 0;

  // Ensure ProviderSyncState rows exist for all provider keys in this batch before JobOccurrence upserts
  const providerKeys = Array.from(new Set(jobs.map((j) => j.providerKey)));
  for (const pk of providerKeys) {
    await db.providerSyncState.upsert({
      where: { providerKey: pk },
      update: {},
      create: {
        providerKey: pk,
        status: SyncStatus.HEALTHY,
        totalJobsSeen: 0,
      },
    }).catch(() => {});
  }

  for (const job of jobs) {
    // Strict 21-day ceiling: Discard jobs posted more than 21 days (3 weeks) ago
    if (job.postedAt && isOlderThanMaxPostingAge(job.postedAt, MAX_POSTING_AGE_DAYS)) {
      continue;
    }

    const validAppUrl = job.canonicalAppUrl && isValidHttpUrl(job.canonicalAppUrl) ? job.canonicalAppUrl : null;
    const validDiscoveryUrl = job.discoveryUrl && isValidHttpUrl(job.discoveryUrl) ? job.discoveryUrl : null;
    const primaryUrl = validAppUrl || validDiscoveryUrl;

    if (!primaryUrl) {
      // Skip job record if neither application URL nor discovery URL is a valid HTTP/HTTPS URL
      continue;
    }

    job.canonicalAppUrl = primaryUrl;
    job.discoveryUrl = validDiscoveryUrl || primaryUrl;

    const urlHash = generateUrlHash(job.canonicalAppUrl || job.discoveryUrl);

    const resolvedRemoteScope = (job.remoteScope && job.remoteScope !== "UNKNOWN")
      ? job.remoteScope
      : parseRemoteScope(job.location || "", job.rawDescription || "");

    // 1. Ingest into JobPosting model for backward compatibility
    const existingJobPosting = await db.jobPosting.findUnique({
      where: { urlHash },
    });

    if (existingJobPosting) {
      await db.jobPosting.update({
        where: { id: existingJobPosting.id },
        data: {
          lastSeenAt: new Date(),
          isExpired: false,
          rawDescription: job.rawDescription || existingJobPosting.rawDescription,
          hasFullText: job.hasFullText,
          remoteScope: resolvedRemoteScope !== "UNKNOWN" ? resolvedRemoteScope : (existingJobPosting.remoteScope || "UNKNOWN"),
        },
      });
      updatedCount++;
    } else {
      await db.jobPosting.create({
        data: {
          urlHash,
          url: job.canonicalAppUrl || job.discoveryUrl,
          company: job.company,
          title: job.title,
          category: job.category || "Software Developer",
          jobType: job.jobType || "Remote Full-Time",
          experienceLevel: job.experienceLevel || "0-3 Years (Entry/Junior)",
          platform: job.providerKey,
          location: job.location,
          isRemote: job.isRemote,
          remoteScope: resolvedRemoteScope,
          opportunitySignals: JSON.stringify(job.opportunitySignals || []),
          postedAt: job.postedAt,
          rawDescription: job.rawDescription || `${job.title} at ${job.company}`,
          hasFullText: job.hasFullText,
          lastSeenAt: new Date(),
          isExpired: false,
        },
      });
      insertedCount++;
    }

    // 2. Ingest into Opportunity & JobOccurrence model (Canonical Deduplication Architecture)
    try {
      const dedupKey = computeDeduplicationKey(job);

      const existingOpp = await db.opportunity.findFirst({
        where: {
          companySlug: job.companySlug,
          title: job.title,
          location: job.location,
        },
      });

      let oppId: string;
      if (existingOpp) {
        oppId = existingOpp.id;
        const upgradeDirectUrl = isDirectAtsUrl(job.canonicalAppUrl) && !isDirectAtsUrl(existingOpp.canonicalAppUrl);
        const upgradeDescription = job.hasFullText && !existingOpp.hasFullText;
        const upgradePostedAt = !existingOpp.postedAt && job.postedAt;

        await db.opportunity.update({
          where: { id: oppId },
          data: {
            lastSeenAt: new Date(),
            isExpired: false,
            remoteScope: resolvedRemoteScope !== "UNKNOWN" ? resolvedRemoteScope : existingOpp.remoteScope,
            opportunitySignals: JSON.stringify(job.opportunitySignals || []),
            ...(upgradePostedAt ? { postedAt: job.postedAt } : {}),
            ...(upgradeDirectUrl ? { canonicalAppUrl: job.canonicalAppUrl } : {}),
            ...(upgradeDescription ? { rawDescription: job.rawDescription, hasFullText: true } : {}),
          },
        });
      } else {
        const newOpp = await db.opportunity.create({
          data: {
            company: job.company,
            companySlug: job.companySlug,
            title: job.title,
            category: job.category || "Software Developer",
            jobType: job.jobType || "Remote Full-Time",
            experienceLevel: job.experienceLevel || "0-3 Years (Entry/Junior)",
            location: job.location,
            isRemote: job.isRemote,
            remoteRegion: job.remoteRegion || "Worldwide",
            remoteScope: resolvedRemoteScope,
            opportunitySignals: JSON.stringify(job.opportunitySignals || []),
            canonicalAppUrl: job.canonicalAppUrl || job.discoveryUrl,
            rawDescription: job.rawDescription || `${job.title} at ${job.company}`,
            hasFullText: job.hasFullText,
            postedAt: job.postedAt,
            lastSeenAt: new Date(),
            isExpired: false,
          },
        });
        oppId = newOpp.id;
      }

      // Record source occurrence for provenance
      const occurrenceKey = job.sourceJobId || dedupKey;
      await db.jobOccurrence.upsert({
        where: {
          providerKey_sourceJobId: {
            providerKey: job.providerKey,
            sourceJobId: occurrenceKey,
          },
        },
        update: {
          lastSeenAt: new Date(),
          applicationUrl: job.canonicalAppUrl,
        },
        create: {
          opportunityId: oppId,
          providerKey: job.providerKey,
          sourceJobId: occurrenceKey,
          discoveryUrl: job.discoveryUrl,
          applicationUrl: job.canonicalAppUrl,
          postedAt: job.postedAt,
          lastSeenAt: new Date(),
        },
      });
    } catch (err) {
      console.warn(`[Opportunity Ingestion Warning] Failed for ${job.title} at ${job.company}:`, (err as Error).message);
    }
  }

  return { insertedCount, updatedCount };
}
