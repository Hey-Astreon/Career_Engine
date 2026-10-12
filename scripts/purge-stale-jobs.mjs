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

async function main() {
  console.log("=== Purging Stale & Senior Roles from Turso Database ===");
  console.log(`Target: ${tursoUrl}`);

  const nowMs = Date.now();
  const sevenDaysAgoMs = nowMs - 7 * 24 * 60 * 60 * 1000;
  const threeDaysAgoMs = nowMs - 3 * 24 * 60 * 60 * 1000;
  const sevenDaysAgoIso = new Date(sevenDaysAgoMs).toISOString();
  const threeDaysAgoIso = new Date(threeDaysAgoMs).toISOString();

  console.log(`Current Time: ${new Date(nowMs).toISOString()}`);
  console.log(`7-day hard cutoff: ${sevenDaysAgoIso}`);
  console.log(`3-day probation cutoff: ${threeDaysAgoIso}`);

  // 1. Inspect sample dates to confirm storage format
  const sample = await client.execute(`SELECT id, title, postedAt, createdAt, isExpired FROM job_postings WHERE isExpired = 0 LIMIT 5`);
  console.log("\nSample active rows in job_postings:");
  for (const row of sample.rows) {
    console.log(` - [${row.id}] "${row.title}" | postedAt: ${row.postedAt} (${typeof row.postedAt}) | createdAt: ${row.createdAt}`);
  }

  // 2. Count active jobs in job_postings
  const totalActiveBefore = await client.execute(`SELECT COUNT(*) as cnt FROM job_postings WHERE isExpired = 0`);
  console.log(`\nActive jobs in job_postings before purge: ${totalActiveBefore.rows[0].cnt}`);

  // Fetch all active jobs to inspect and accurately filter
  const allActive = await client.execute(`SELECT id, title, rawDescription, postedAt, createdAt FROM job_postings WHERE isExpired = 0`);
  
  const seniorOrNumberedRegex = /\b(?:sde|swe|engineer|developer)\s*(?:[2-9]|ii|iii|iv|v)\b|\b(?:engineer|developer)\s+[2-9]\b|\b(?:senior|sr\.?|lead|staff|principal|director|vp|head\s+of|architect)\b/i;
  
  const idsToExpire = [];
  const reasons = {
    olderThan7Days: 0,
    nullPostedOlderThan3Days: 0,
    seniorOrHighExp: 0,
  };

  for (const job of allActive.rows) {
    const title = String(job.title || "");
    const desc = String(job.rawDescription || "");
    const id = String(job.id);
    
    // Check postedAt age
    let isStale = false;
    if (job.postedAt) {
      const pTime = typeof job.postedAt === "number" ? job.postedAt : new Date(job.postedAt).getTime();
      if (!Number.isNaN(pTime) && pTime < sevenDaysAgoMs) {
        idsToExpire.push(id);
        reasons.olderThan7Days++;
        isStale = true;
      }
    } else {
      // No postedAt -> check createdAt age (> 3 days probation)
      const cTime = typeof job.createdAt === "number" ? job.createdAt : new Date(job.createdAt).getTime();
      if (!Number.isNaN(cTime) && cTime < threeDaysAgoMs) {
        idsToExpire.push(id);
        reasons.nullPostedOlderThan3Days++;
        isStale = true;
      }
    }

    if (!isStale) {
      // Check title seniority violation
      if (seniorOrNumberedRegex.test(title)) {
        idsToExpire.push(id);
        reasons.seniorOrHighExp++;
      }
    }
  }

  console.log(`\nIdentified for expiration in job_postings:`);
  console.log(` - Posted > 7 days ago: ${reasons.olderThan7Days}`);
  console.log(` - Null postedAt > 3 days ago: ${reasons.nullPostedOlderThan3Days}`);
  console.log(` - Senior / Numbered levels (SDE II, Eng 4, etc.): ${reasons.seniorOrHighExp}`);
  console.log(` - Total to expire: ${idsToExpire.length}`);

  // Execute batch update for job_postings
  if (idsToExpire.length > 0) {
    const chunkSize = 100;
    for (let i = 0; i < idsToExpire.length; i += chunkSize) {
      const chunk = idsToExpire.slice(i, i + chunkSize);
      const placeholders = chunk.map(() => "?").join(",");
      await client.execute({
        sql: `UPDATE job_postings SET isExpired = 1 WHERE id IN (${placeholders})`,
        args: chunk,
      });
    }
    console.log(`✓ Successfully marked ${idsToExpire.length} stale/senior job_postings as expired.`);
  }

  // Also purge opportunities table
  const allActiveOpp = await client.execute(`SELECT id, title, postedAt, createdAt, firstSeenAt FROM opportunities WHERE isExpired = 0`);
  const oppIdsToExpire = [];
  for (const opp of allActiveOpp.rows) {
    const id = String(opp.id);
    const title = String(opp.title || "");
    let isStale = false;
    if (opp.postedAt) {
      const pTime = typeof opp.postedAt === "number" ? opp.postedAt : new Date(opp.postedAt).getTime();
      if (!Number.isNaN(pTime) && pTime < sevenDaysAgoMs) {
        oppIdsToExpire.push(id);
        isStale = true;
      }
    } else {
      const cTime = typeof opp.createdAt === "number" ? opp.createdAt : new Date(opp.createdAt).getTime();
      if (!Number.isNaN(cTime) && cTime < threeDaysAgoMs) {
        oppIdsToExpire.push(id);
        isStale = true;
      }
    }

    if (!isStale && seniorOrNumberedRegex.test(title)) {
      oppIdsToExpire.push(id);
    }
  }

  if (oppIdsToExpire.length > 0) {
    const chunkSize = 100;
    for (let i = 0; i < oppIdsToExpire.length; i += chunkSize) {
      const chunk = oppIdsToExpire.slice(i, i + chunkSize);
      const placeholders = chunk.map(() => "?").join(",");
      await client.execute({
        sql: `UPDATE opportunities SET isExpired = 1, expiredAt = CURRENT_TIMESTAMP WHERE id IN (${placeholders})`,
        args: chunk,
      });
    }
    console.log(`✓ Successfully marked ${oppIdsToExpire.length} stale/senior opportunities as expired.`);
  }

  // Final verification
  const totalActiveAfter = await client.execute(`SELECT COUNT(*) as cnt FROM job_postings WHERE isExpired = 0`);
  console.log(`\nRemaining fresh active jobs in job_postings: ${totalActiveAfter.rows[0].cnt}`);
  console.log("=== Purge complete ===");
}

main().catch((err) => {
  console.error("Purge failed:", err);
  process.exit(1);
});
