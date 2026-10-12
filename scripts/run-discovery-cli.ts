import dotenv from "dotenv";
dotenv.config();

import { runAllProviders, ingestNormalizedJobs } from "../src/lib/providers/registry";
import { pruneStaleJobs } from "../src/lib/scheduler";
import { db } from "../src/lib/db";

async function main() {
  console.log("=================================================");
  console.log("🚀 AstreWork Autonomous Discovery Engine (CLI)");
  console.log("=================================================");
  const start = Date.now();

  console.log("[1/3] Executing concurrent scrapes across discovery providers...");
  const { providerResults, allJobs, totalDiscovered } = await runAllProviders(undefined, { persistSyncState: true });

  const successful = providerResults.filter((p) => p.success).length;
  console.log(`\nProviders Succeeded: ${successful}/${providerResults.length}`);
  console.log(`Total Discovered: ${totalDiscovered} | Total Valid Developer Jobs: ${allJobs.length}`);

  console.log("\n[2/3] Ingesting normalized opportunities into Turso Cloud...");
  const metrics = await ingestNormalizedJobs(allJobs, 100);
  console.log(`Ingestion Complete: ${metrics.insertedCount} new inserted, ${metrics.updatedCount} refreshed.`);

  console.log("\n[3/3] Pruning stale and non-internship senior postings...");
  const pruneMetrics = await pruneStaleJobs(db);
  console.log(`Pruning Complete: ${pruneMetrics.expiredJobsCount} legacy jobs, ${pruneMetrics.expiredOppsCount} opportunities marked expired.`);

  const durationSec = ((Date.now() - start) / 1000).toFixed(2);
  console.log(`\n✨ Discovery & Pruning Cycle Completed in ${durationSec}s!`);
  process.exit(0);
}

main().catch((err) => {
  console.error("FATAL Scraping Error:", err);
  process.exit(1);
});
