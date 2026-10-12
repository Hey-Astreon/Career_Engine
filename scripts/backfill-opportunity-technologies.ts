import { db } from "../src/lib/db";
import { extractSkills } from "../src/lib/ai/scorer";

async function backfillTechnologies() {
  console.log("=== STARTING OPPORTUNITY TECHNOLOGIES BACKFILL ===");

  const opps = await db.opportunity.findMany({
    select: { id: true, title: true, rawDescription: true, technologies: true },
  });

  console.log(`Total opportunities in database: ${opps.length}`);

  let updatedCount = 0;
  for (const opp of opps) {
    // If technologies is empty or "[]" or not populated with found skills
    const skills = extractSkills(`${opp.title} ${opp.rawDescription || ""}`);
    const currentTech = opp.technologies || "[]";
    
    // Always sync with the authoritative extractSkills dictionary
    if (currentTech === "[]" || currentTech === "" || JSON.stringify(skills) !== currentTech) {
      await db.opportunity.update({
        where: { id: opp.id },
        data: { technologies: JSON.stringify(skills) },
      });
      updatedCount++;
    }
  }

  console.log(`Successfully backfilled/synced ${updatedCount} opportunities with structured technologies.`);

  // Verify sample of opportunities
  const sample = await db.opportunity.findMany({
    take: 5,
    select: { id: true, title: true, company: true, technologies: true },
  });
  console.log("Sample verified records:", JSON.stringify(sample, null, 2));
}

backfillTechnologies()
  .catch((err) => {
    console.error("Backfill failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
