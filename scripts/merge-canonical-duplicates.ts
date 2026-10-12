import { db } from "../src/lib/db";

async function mergeCanonicalDuplicates() {
  console.log("=== STARTING CANONICAL OPPORTUNITY DEDUPLICATION ===");

  // 1. Find all duplicate tuples
  const duplicates = await db.opportunity.groupBy({
    by: ["companySlug", "title", "location"],
    _count: { id: true },
    having: { id: { _count: { gt: 1 } } },
  });

  console.log(`Found ${duplicates.length} duplicate opportunity groups to resolve.`);

  let mergedGroups = 0;
  let deletedSecondaryCount = 0;

  for (const group of duplicates) {
    const records = await db.opportunity.findMany({
      where: {
        companySlug: group.companySlug,
        title: group.title,
        location: group.location,
      },
      include: {
        occurrences: true,
        matchScores: true,
        applications: true,
      },
      orderBy: [
        { hasFullText: "desc" },
        { postedAt: "desc" },
        { createdAt: "asc" },
      ],
    });

    if (records.length <= 1) continue;

    const primary = records[0];
    const secondaries = records.slice(1);

    for (const secondary of secondaries) {
      // Re-link occurrences
      await db.jobOccurrence.updateMany({
        where: { opportunityId: secondary.id },
        data: { opportunityId: primary.id },
      });

      // Re-link or clean matchScores (preserve primary if conflict)
      for (const score of secondary.matchScores) {
        const primaryHasScore = primary.matchScores.some((s) => s.profileId === score.profileId);
        if (primaryHasScore) {
          await db.matchScore.delete({ where: { id: score.id } });
        } else {
          await db.matchScore.update({
            where: { id: score.id },
            data: { opportunityId: primary.id },
          });
        }
      }

      // Re-link or clean applications
      for (const app of secondary.applications) {
        const primaryHasApp = primary.applications.some((a) => a.profileId === app.profileId);
        if (primaryHasApp) {
          await db.application.delete({ where: { id: app.id } });
        } else {
          await db.application.update({
            where: { id: app.id },
            data: { opportunityId: primary.id },
          });
        }
      }

      // Delete secondary duplicate
      await db.opportunity.delete({ where: { id: secondary.id } });
      deletedSecondaryCount++;
    }

    mergedGroups++;
  }

  // 2. Prune orphaned opportunities (no occurrences and no applications)
  const orphanedDelete = await db.opportunity.deleteMany({
    where: {
      occurrences: { none: {} },
      applications: { none: {} },
    },
  });

  console.log(`Successfully merged ${mergedGroups} duplicate groups (${deletedSecondaryCount} duplicate rows removed).`);
  console.log(`Pruned ${orphanedDelete.count} orphaned opportunities.`);
  console.log("=== CANONICAL DEDUPLICATION COMPLETE ===");
}

mergeCanonicalDuplicates()
  .catch(console.error)
  .finally(async () => await db.$disconnect());
