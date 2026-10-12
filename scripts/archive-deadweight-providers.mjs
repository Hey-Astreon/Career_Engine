import { createClient } from "@libsql/client";
import dotenv from "dotenv";
dotenv.config();

const tursoUrl = process.env.TURSO_DATABASE_URL;
const tursoToken = process.env.TURSO_AUTH_TOKEN;

if (!tursoUrl || !tursoToken) {
  console.error("Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN");
  process.exit(1);
}

const client = createClient({
  url: tursoUrl,
  authToken: tursoToken,
});

const DECOMMISSIONED_PROVIDERS = [
  "MICRO1",
  "ARC_DEV",
  "REMOTEOK",
  "ARBEITNOW",
  "REMOTIVE",
  "HIRING_CAFE",
  "GREENHOUSE",
  "LEVER",
  "WORKABLE",
  "SMARTRECRUITERS",
  "RECRUITEE",
  "WEWORKREMOTELY",
];

async function main() {
  console.log("=== Archiving Deadweight Providers in Turso Database ===");
  console.log(`Target: ${tursoUrl}`);

  const placeholders = DECOMMISSIONED_PROVIDERS.map(() => "?").join(",");

  // 1. Check how many active jobs exist from these providers
  const activeJobs = await client.execute({
    sql: `SELECT platform, COUNT(*) as cnt FROM job_postings WHERE isExpired = 0 AND platform IN (${placeholders}) GROUP BY platform`,
    args: DECOMMISSIONED_PROVIDERS,
  });

  console.log("\nActive jobs before archival:");
  let totalActiveToArchive = 0;
  for (const r of activeJobs.rows) {
    console.log(` - ${r.platform}: ${r.cnt} active`);
    totalActiveToArchive += Number(r.cnt);
  }
  console.log(`Total active jobs from decommissioned providers: ${totalActiveToArchive}`);

  // 2. Mark active job_postings as expired
  if (totalActiveToArchive > 0) {
    const res = await client.execute({
      sql: `UPDATE job_postings SET isExpired = 1 WHERE isExpired = 0 AND platform IN (${placeholders})`,
      args: DECOMMISSIONED_PROVIDERS,
    });
    console.log(`✓ Marked ${res.rowsAffected} job_postings as expired.`);
  }

  // 3. Mark occurrences and opportunities as expired
  const occurrencesRes = await client.execute({
    sql: `SELECT id, opportunityId FROM job_occurrences WHERE providerKey IN (${placeholders})`,
    args: DECOMMISSIONED_PROVIDERS,
  });
  console.log(`Found ${occurrencesRes.rows.length} occurrences for decommissioned providers.`);

  if (occurrencesRes.rows.length > 0) {
    const oppIds = Array.from(new Set(occurrencesRes.rows.map((r) => r.opportunityId)));
    const oppPlaceholders = oppIds.map(() => "?").join(",");
    await client.execute({
      sql: `UPDATE opportunities SET isExpired = 1, expiredAt = CURRENT_TIMESTAMP WHERE id IN (${oppPlaceholders})`,
      args: oppIds,
    });
    console.log(`✓ Marked ${oppIds.length} related opportunities as expired.`);
  }

  // 4. Update provider_sync_states to DISABLED
  const syncStateRes = await client.execute({
    sql: `UPDATE provider_sync_states SET status = 'DISABLED' WHERE providerKey IN (${placeholders})`,
    args: DECOMMISSIONED_PROVIDERS,
  });
  console.log(`✓ Updated ${syncStateRes.rowsAffected} provider sync states to DISABLED.`);

  // 5. Verification of active feed
  const activeRemaining = await client.execute(`SELECT platform, COUNT(*) as cnt FROM job_postings WHERE isExpired = 0 GROUP BY platform`);
  console.log("\n=== Active Feed Remaining by Platform ===");
  let activeTotal = 0;
  for (const r of activeRemaining.rows) {
    console.log(` - ${r.platform}: ${r.cnt}`);
    activeTotal += Number(r.cnt);
  }
  console.log(`Total active postings remaining: ${activeTotal}`);
  console.log("=== Archival Complete ===");
}

main().catch((err) => {
  console.error("Archival failed:", err);
  process.exit(1);
});
