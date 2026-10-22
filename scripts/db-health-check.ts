import { db } from "../src/lib/db";

async function main() {
  console.log("=== DB HEALTH CHECK ===");
  try {
    const profiles = await db.profile.findMany({
      include: { projects: true, virtualExps: true },
    });
    console.log(`Profiles found: ${profiles.length}`);
    for (const p of profiles) {
      console.log(`- Slug: ${p.slug} | Name: ${p.fullName} | Title: ${p.title}`);
      console.log(`  Email: ${p.email} | Phone: ${p.phone}`);
      console.log(`  Location: ${p.location}`);
      console.log(`  Projects count: ${p.projects.length} | VirtualExps count: ${p.virtualExps.length}`);
    }

    const postingCount = await db.jobPosting.count();
    console.log(`\nTotal JobPostings in DB: ${postingCount}`);

    const opportunityCount = await db.opportunity.count();
    console.log(`Total Opportunities in DB: ${opportunityCount}`);

    const syncStates = await db.providerSyncState.findMany({ orderBy: { providerKey: "asc" } });
    console.log(`\nProvider Sync States: ${syncStates.length}`);
    for (const s of syncStates) {
      console.log(`  - [${s.status}] ${s.providerKey} | Total Seen: ${s.totalJobsSeen} | Failures: ${s.consecutiveFailures} ${s.lastError ? `| Error: ${s.lastError.slice(0, 80)}` : ""}`);
    }

    const appCount = await db.application.count();
    console.log(`\nTotal Applications in DB: ${appCount}`);

    const sessions = await db.autopilotSession.findMany({ take: 3, orderBy: { createdAt: "desc" } });
    console.log(`Recent Autopilot Sessions: ${sessions.length}`);
    for (const s of sessions) {
      console.log(`  Session ID: ${s.id} | Job: ${s.jobTitle} at ${s.company} | Created: ${s.createdAt}`);
    }
    console.log("\nDB Health Check complete: OK");
  } catch (err) {
    console.error("DB Health Check error:", err);
  } finally {
    process.exit(0);
  }
}

main();
