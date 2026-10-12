import { db } from "../src/lib/db";
import { cache } from "../src/lib/cache/redis";
import { computeBatchFeedScores, CachedScoreItem } from "../src/lib/ai/batchScorer";

async function verifyWarming() {
  console.log("=== VERIFYING REDIS CACHE WARMING FOR FOUNDERS ===");
  const profiles = await db.profile.findMany({
    where: { slug: { in: ["roushan", "ayushi"] } },
    include: { projects: true, virtualExps: true },
  });
  console.log("Found profiles:", profiles.map(p => ({ id: p.id, name: p.fullName, slug: p.slug })));

  const activeJobs = await db.jobPosting.findMany({
    where: { isExpired: false },
    select: { id: true, title: true, rawDescription: true, location: true, url: true, postedAt: true, platform: true },
    take: 10,
  });
  console.log("Active jobs sampled for test:", activeJobs.length);

  for (const profile of profiles) {
    const candidateContext = {
      fullName: profile.fullName,
      title: profile.title,
      masterProjects: profile.projects.map(p => ({ title: p.title, techStack: p.techStack, architecture: p.architecture })),
      virtualExps: profile.virtualExps.map(e => ({ company: e.company, roleTitle: e.roleTitle, outcome: e.outcome })),
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
      console.log(`Successfully warmed ${cacheItems.length} keys for ${profile.fullName}`);
    }

    const keys = cacheItems.map(c => c.key);
    const retrieved = await cache.mget<CachedScoreItem>(keys);
    console.log(`Retrieved cached count: ${retrieved.filter(Boolean).length} out of ${keys.length}`);
    if (retrieved[0]) {
      console.log(`Sample retrieved item for ${profile.fullName}: Score ${retrieved[0].score}, reasoning: ${retrieved[0].reasoning}`);
    }
  }
}

verifyWarming()
  .then(() => {
    console.log("=== WARMING VERIFICATION SUCCESSFUL ===");
    process.exit(0);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
