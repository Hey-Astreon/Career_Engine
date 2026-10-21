import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { computeCompositeMatchScore } from "@/lib/ai/scorer";
import { selectRecommendedResumeVariant } from "@/lib/resumeVariantSelector";
import { cache } from "@/lib/cache/redis";
import { canAccessProfile } from "@/lib/authCandidate";

export async function POST(req: Request) {
  const startTime = Date.now();
  try {
    const session = await getServerSession(authOptions);
    const currentUserId = session?.user?.id || null;

    const { profileSlug, jobPostingId, forceRefresh } = await req.json();

    if (!profileSlug || !jobPostingId) {
      return NextResponse.json(
        { success: false, error: "profileSlug and jobPostingId are required" },
        { status: 400 }
      );
    }

    const profile = await db.profile.findUnique({
      where: { slug: profileSlug },
      include: { projects: true, virtualExps: true },
    });

    const job = await db.jobPosting.findUnique({
      where: { id: jobPostingId },
    });

    if (!profile || !job) {
      return NextResponse.json(
        { success: false, error: "Profile or JobPosting not found" },
        { status: 404 }
      );
    }

    // Allow evaluation if user has authorized access (co-developers or profile owner)
    if (!canAccessProfile(session?.user, profile)) {
      return NextResponse.json(
        { success: false, error: "Forbidden: You do not have permission to access this candidate profile" },
        { status: 403 }
      );
    }

    const cacheKey = `match:${profile.id}:${job.id}`;

    // Cache Check: If forceRefresh is false, look up cached match in Redis then DB
    if (!forceRefresh) {
      const cachedRedis = await cache.get<{ score: number; hardSkills: string[]; missingSkills: string[]; reasoning: string }>(cacheKey);
      if (cachedRedis) {
        return NextResponse.json({
          success: true,
          matchScore: {
            score: cachedRedis.score,
            hardSkills: cachedRedis.hardSkills,
            missingSkills: cachedRedis.missingSkills,
            reasoning: cachedRedis.reasoning,
            cached: true,
            latencyMs: Date.now() - startTime,
          },
        });
      }

      const cachedRecord = await db.matchScore.findUnique({
        where: {
          profileId_jobPostingId: {
            profileId: profile.id,
            jobPostingId: job.id,
          },
        },
      });

      if (cachedRecord) {
        const hardSkills = JSON.parse(cachedRecord.hardSkills || "[]");
        const missingSkills = JSON.parse(cachedRecord.missingSkills || "[]");
        await cache.set(cacheKey, {
          score: cachedRecord.score,
          hardSkills,
          missingSkills,
          reasoning: cachedRecord.reasoning,
        }, 86400);

        return NextResponse.json({
          success: true,
          matchScore: {
            score: cachedRecord.score,
            hardSkills,
            missingSkills,
            reasoning: cachedRecord.reasoning,
            cached: true,
            latencyMs: Date.now() - startTime,
          },
        });
      }
    } else {
      await cache.del(cacheKey);
    }

    // Execute 4-Layer Match Pipeline
    const candidateContext = {
      fullName: profile.fullName,
      title: profile.title,
      masterProjects: profile.projects.map((p) => ({
        title: p.title,
        techStack: p.techStack,
        architecture: p.architecture,
      })),
      virtualExps: profile.virtualExps.map((e) => ({
        company: e.company,
        roleTitle: e.roleTitle,
        outcome: e.outcome,
      })),
    };

    const result = await computeCompositeMatchScore(
      candidateContext,
      job.title,
      job.rawDescription,
      job.location,
      job.url || "http://valid.url",
      job.postedAt || undefined,
      job.platform,
      true // Enable AI for single job match API
    );

    // Save/Update match score record in SQLite
    const matchRecord = await db.matchScore.upsert({
      where: {
        profileId_jobPostingId: {
          profileId: profile.id,
          jobPostingId: job.id,
        },
      },
      update: {
        score: result.finalScore,
        hardSkills: JSON.stringify(result.hardSkills),
        missingSkills: JSON.stringify(result.missingSkills),
        reasoning: result.reasoning,
      },
      create: {
        profileId: profile.id,
        jobPostingId: job.id,
        score: result.finalScore,
        hardSkills: JSON.stringify(result.hardSkills),
        missingSkills: JSON.stringify(result.missingSkills),
        reasoning: result.reasoning,
      },
    });

    // Determine the recommended resume variant
    const recommendedVariant = selectRecommendedResumeVariant(
      profile.slug,
      job.title,
      job.rawDescription,
      job.company,
      job.platform
    );

    // Seed Redis cache with newly evaluated score
    await cache.set(cacheKey, {
      score: matchRecord.score,
      hardSkills: result.hardSkills,
      missingSkills: result.missingSkills,
      reasoning: result.reasoning,
    }, 86400);

    return NextResponse.json({
      success: true,
      matchScore: {
        score: matchRecord.score,
        eligible: result.eligible,
        rejectionReason: result.rejectionReason,
        deterministicSignals: result.deterministicSignals,
        hardSkills: result.hardSkills,
        missingSkills: result.missingSkills,
        reasoning: result.reasoning,
        recommendedResumeVariant: recommendedVariant,
        version: result.version,
        cached: false,
        aiCallsCount: result.aiCallsCount,
        latencyMs: Date.now() - startTime,
      },
    });
  } catch (error) {
    console.error("Job Match Evaluation API Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to evaluate job match" },
      { status: 500 }
    );
  }
}
