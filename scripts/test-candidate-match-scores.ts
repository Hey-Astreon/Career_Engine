import { db } from "../src/lib/db";
import {
  evaluateHardEligibility,
  calculateDeterministicSignals,
  CandidateContext,
} from "../src/lib/ai/scorer";
import { determineEarlyCareerTier, EarlyCareerTier } from "../src/lib/providers/normalize";

async function testCandidateMatchScores() {
  console.log("=== CANDIDATE MATCH SCORING EVALUATION ===");

  const profiles = await db.profile.findMany({
    include: {
      projects: true,
      virtualExps: true,
    },
  });

  if (profiles.length === 0) {
    console.error("No profiles found in database!");
    return;
  }

  // Active opportunities (not expired)
  const activeOpportunities = await db.opportunity.findMany({
    where: { isExpired: false },
    take: 30,
    orderBy: { postedAt: "desc" },
    include: { occurrences: true },
  });

  console.log(`Found ${profiles.length} profiles and ${activeOpportunities.length} sample active opportunities.`);

  for (const prof of profiles) {
    console.log(`\n======================================================`);
    console.log(`EVALUATING CANDIDATE: ${prof.fullName} (${prof.title})`);
    console.log(`======================================================`);

    const candidateContext: CandidateContext = {
      fullName: prof.fullName,
      title: prof.title,
      email: prof.email,
      phone: prof.phone,
      location: prof.location,
      portfolioUrl: prof.portfolioUrl,
      githubUrl: prof.githubUrl,
      linkedinUrl: prof.linkedinUrl,
      masterProjects: prof.projects.map((p) => ({
        title: p.title,
        techStack: p.techStack,
        architecture: p.architecture,
      })),
      virtualExps: prof.virtualExps.map((v) => ({
        company: v.company,
        roleTitle: v.roleTitle,
        outcome: v.outcome,
      })),
    };

    let eligibleCount = 0;
    let highFitCount = 0; // >= 75
    let moderateFitCount = 0; // 60-74
    let lowFitCount = 0; // < 60
    let ineligibleCount = 0;

    const scoredJobs: Array<{
      title: string;
      company: string;
      tier: string;
      score: number;
      skillsOverlap: number;
      provider: string;
    }> = [];

    for (const opp of activeOpportunities) {
      const eligibility = evaluateHardEligibility(
        candidateContext,
        opp.title,
        opp.rawDescription,
        opp.location,
        opp.canonicalAppUrl
      );

      const tier = determineEarlyCareerTier(opp.title, opp.rawDescription);
      const provider = opp.occurrences[0]?.providerKey || "DIRECT";

      if (!eligibility.eligible) {
        ineligibleCount++;
        continue;
      }

      eligibleCount++;
      const signals = calculateDeterministicSignals(
        candidateContext,
        opp.title,
        opp.rawDescription,
        opp.postedAt,
        provider
      );

      const score = signals.deterministicBaseScore;
      if (score >= 75) highFitCount++;
      else if (score >= 60) moderateFitCount++;
      else lowFitCount++;

      scoredJobs.push({
        title: opp.title,
        company: opp.company,
        tier,
        score,
        skillsOverlap: signals.skillOverlapScore,
        provider,
      });
    }

    scoredJobs.sort((a, b) => b.score - a.score);

    console.log(`Eligible Roles:     ${eligibleCount}/${activeOpportunities.length}`);
    console.log(`High Fit (75-100%):  ${highFitCount}`);
    console.log(`Moderate (60-74%):  ${moderateFitCount}`);
    console.log(`Ineligible Roles:   ${ineligibleCount}`);
    console.log(`\nTop Matched Opportunities for ${prof.fullName}:`);
    for (const j of scoredJobs.slice(0, 5)) {
      console.log(`  [${j.score}%] [${j.tier}] ${j.title} @ ${j.company} (Provider: ${j.provider}, Skill: ${j.skillsOverlap}%)`);
    }
  }
}

testCandidateMatchScores()
  .catch(console.error)
  .finally(async () => await db.$disconnect());
