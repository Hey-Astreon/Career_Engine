import dotenv from "dotenv";
dotenv.config();

import { runAllProviders, ingestNormalizedJobs } from "../src/lib/providers/registry";
import { db } from "../src/lib/db";
import { MAX_POSTING_AGE_DAYS, PROBATION_MAX_AGE_DAYS, determineEarlyCareerTier, calculateEarlyBirdScore, EarlyCareerTier } from "../src/lib/providers/normalize";
import { getEarlyCareerTierPresentation, getFreshnessBadgeInfo } from "../src/lib/jobPresentation";

async function main() {
  console.log("=================================================");
  console.log("  ASTREWORK ULTRA-FRESH INTERNSHIP SCRAPE TEST   ");
  console.log("=================================================");
  const startTime = Date.now();

  console.log("\n[1/3] Executing all providers with 7-day cutoff & internship prioritization...");
  const { providerResults, allJobs, totalDiscovered, totalRejected } = await runAllProviders();

  console.log(`\nDiscovered: ${totalDiscovered} total raw candidates.`);
  console.log(`Rejected: ${totalRejected} by strict remote developer role gate.`);
  console.log(`Accepted: ${allJobs.length} normalized jobs within 7-day limit.`);

  console.log("\n[2/3] Provider Breakdown:");
  for (const pr of providerResults) {
    console.log(` - ${pr.providerKey}: ${pr.jobs.length} accepted | ${pr.durationMs}ms | success: ${pr.success}${pr.error ? ` (Error: ${pr.error})` : ""}`);
  }

  console.log("\n[3/3] Ingesting into Turso database with Early Bird ranking...");
  const { insertedCount, updatedCount } = await ingestNormalizedJobs(allJobs);
  console.log(`Ingested: ${insertedCount} new jobs inserted, ${updatedCount} existing jobs updated.`);

  // Query active jobs from Turso
  const sevenDaysAgo = new Date(Date.now() - MAX_POSTING_AGE_DAYS * 86400000);
  const twoDaysAgo = new Date(Date.now() - PROBATION_MAX_AGE_DAYS * 86400000);

  const activeJobs = await db.jobPosting.findMany({
    where: {
      isExpired: false,
      OR: [
        { postedAt: { gte: sevenDaysAgo } },
        { postedAt: null, createdAt: { gte: twoDaysAgo } },
      ],
    },
    orderBy: [{ postedAt: "desc" }, { createdAt: "desc" }],
  });

  console.log(`\n=================================================`);
  console.log(`  ACTIVE FEED VALIDATION (${activeJobs.length} ACTIVE JOBS)  `);
  console.log(`=================================================`);

  const tierCounts: Record<string, number> = {
    "Tier 1: Internship": 0,
    "Tier 2: 0-Exp Entry": 0,
    "Tier 3: 0–1 Yr Junior": 0,
    "Early Career": 0,
  };

  const nowMs = Date.now();
  const scoredJobs = activeJobs.map((j) => {
    const tier = determineEarlyCareerTier(j.title, j.rawDescription);
    const tierPres = getEarlyCareerTierPresentation(j.title, j.rawDescription);
    const score = calculateEarlyBirdScore(tier, j.postedAt, nowMs);
    const freshness = getFreshnessBadgeInfo(j.postedAt ? j.postedAt.toISOString() : null, j.createdAt ? j.createdAt.toISOString() : null, nowMs);
    tierCounts[tierPres.label] = (tierCounts[tierPres.label] || 0) + 1;
    return {
      ...j,
      tier,
      tierPres,
      score,
      freshness,
    };
  });

  // Sort by Early Bird score descending
  scoredJobs.sort((a, b) => b.score - a.score);

  console.log("\nTier Breakdown:");
  for (const [tierLabel, count] of Object.entries(tierCounts)) {
    console.log(` - ${tierLabel}: ${count} jobs`);
  }

  console.log("\nTop 15 Feed Opportunities (Early Bird Order):");
  scoredJobs.slice(0, 15).forEach((j, idx) => {
    console.log(
      ` ${idx + 1}. [Score: ${j.score.toFixed(1)}] [${j.tierPres.label}] [${j.freshness.label}] "${j.title}" @ ${j.company} (${j.platform})`
    );
  });

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\nComplete in ${durationSec}s.`);
}

main().catch((err) => {
  console.error("Scrape test failed:", err);
  process.exit(1);
});
