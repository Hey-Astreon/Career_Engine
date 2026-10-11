import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { computeBatchFeedScores, CachedScoreItem } from "@/lib/ai/batchScorer";
import { cache } from "@/lib/cache/redis";

const MAX_BATCH_SIZE = 150;

export async function POST(req: Request) {
  const startTime = Date.now();

  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    let body: { profileSlug?: unknown; jobPostingIds?: unknown };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const { profileSlug = "roushan", jobPostingIds } = body || {};

    // 1. Input Validation: profileSlug
    if (typeof profileSlug !== "string" || !profileSlug.trim() || profileSlug.length > 50) {
      return NextResponse.json(
        { success: false, error: "Invalid or missing profileSlug" },
        { status: 400 }
      );
    }

    const sanitizedSlug = profileSlug.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");

    // 2. Candidate Profile Lookup (Security Isolation)
    const profile = await db.profile.findUnique({
      where: { slug: sanitizedSlug },
      include: {
        projects: true,
        virtualExps: true,
      },
    });

    if (!profile) {
      return NextResponse.json(
        { success: false, error: "Candidate profile not found" },
        { status: 404 }
      );
    }

    // Allow evaluation if user owns the profile OR if it is a template/benchmark profile (no owner userId)
    if (profile.userId && profile.userId !== session.user.id) {
      return NextResponse.json(
        { success: false, error: "Forbidden: You do not own this profile" },
        { status: 403 }
      );
    }

    // 3. Input Validation: jobPostingIds
    if (!Array.isArray(jobPostingIds)) {
      return NextResponse.json(
        { success: false, error: "jobPostingIds must be an array of strings" },
        { status: 400 }
      );
    }

    // Filter valid non-empty string IDs and deduplicate
    const validJobIds = Array.from(
      new Set(
        jobPostingIds
          .filter((id): id is string => typeof id === "string" && id.trim().length > 0)
          .map((id) => id.trim())
      )
    );

    if (validJobIds.length === 0) {
      return NextResponse.json({
        success: true,
        scores: {},
        meta: {
          totalRequested: 0,
          totalEvaluated: 0,
          cachedCount: 0,
          deterministicCount: 0,
          ineligibleCount: 0,
          latencyMs: Date.now() - startTime,
        },
      });
    }

    // Cap batch size to MAX_BATCH_SIZE (150)
    const cappedJobIds = validJobIds.slice(0, MAX_BATCH_SIZE);

    const dbQueryStartTime = Date.now();

    // 4. Check Redis Cache for Match Scores (Sub-1ms Lookups)
    const redisKeys = cappedJobIds.map((id) => `match:${profile.id}:${id}`);
    const redisResults = await cache.mget<CachedScoreItem>(redisKeys);

    const cachedScoresMap = new Map<string, CachedScoreItem>();
    const missingScoreJobIds: string[] = [];

    cappedJobIds.forEach((jobId, idx) => {
      const item = redisResults[idx];
      if (item) {
        cachedScoresMap.set(jobId, item);
      } else {
        missingScoreJobIds.push(jobId);
      }
    });

    // Bulk DB Queries: Only query MatchScores for missing IDs
    const [jobs, dbScoresList] = await Promise.all([
      db.jobPosting.findMany({
        where: { id: { in: cappedJobIds } },
        select: {
          id: true,
          title: true,
          rawDescription: true,
          location: true,
          url: true,
          postedAt: true,
          platform: true,
        },
      }),
      missingScoreJobIds.length > 0
        ? db.matchScore.findMany({
            where: {
              profileId: profile.id,
              jobPostingId: { in: missingScoreJobIds },
            },
            select: {
              jobPostingId: true,
              score: true,
              hardSkills: true,
              missingSkills: true,
              reasoning: true,
            },
          })
        : Promise.resolve([]),
    ]);

    const dbTimeMs = Date.now() - dbQueryStartTime;

    // Seed Redis cache with any scores found in DB
    if (dbScoresList.length > 0) {
      const itemsToCache: { key: string; value: CachedScoreItem; ttlSeconds: number }[] = [];
      for (const item of dbScoresList) {
        if (item.jobPostingId) {
          const scoreItem: CachedScoreItem = {
            score: item.score,
            hardSkills: item.hardSkills,
            missingSkills: item.missingSkills,
            reasoning: item.reasoning,
          };
          cachedScoresMap.set(item.jobPostingId, scoreItem);
          itemsToCache.push({
            key: `match:${profile.id}:${item.jobPostingId}`,
            value: scoreItem,
            ttlSeconds: 86400, // 24 hours
          });
        }
      }
      cache.mset(itemsToCache).catch(() => {});
    }

    // 5. Construct Isolated Candidate Context
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

    const scoringStartTime = Date.now();

    // 6. Execute Zero-LLM Batch Scoring
    const scoreResultsMap = computeBatchFeedScores(candidateContext, jobs, cachedScoresMap);

    const scoringTimeMs = Date.now() - scoringStartTime;

    // 7. Format Output Response Map
    const scoresOutput: Record<string, unknown> = {};
    let cachedCount = 0;
    let deterministicCount = 0;
    let ineligibleCount = 0;
    let shieldBlockedCount = 0;

    scoreResultsMap.forEach((res, jobId) => {
      scoresOutput[jobId] = {
        jobId: res.jobId,
        score: res.score,
        scoreType: res.scoreType,
        displayLabel: res.displayLabel,
        eligible: res.eligible,
        rejectionReason: res.rejectionReason || undefined,
        cached: res.cached,
        hardSkills: res.hardSkills || [],
        missingSkills: res.missingSkills || [],
        // 🛡️ AstreShield trust audit — serialized subset needed by the UI
        trustTier: res.trustTier ?? "GREEN",
        trustScore: res.trustVerdict?.score ?? 100,
        trustHeadline: res.trustVerdict?.headline,
        trustDetail: res.trustVerdict?.detail,
        trustFlags: (res.trustVerdict?.flags ?? []).map((f) => ({
          signalId: f.signalId,
          label: f.label,
          impact: f.impact,
          layer: f.layer,
          evidence: f.evidence,
        })),
      };

      if (res.scoreType === "SHIELD_BLOCKED") shieldBlockedCount++;
      else if (res.cached) cachedCount++;
      else if (!res.eligible) ineligibleCount++;
      else deterministicCount++;
    });

    const totalLatencyMs = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      scores: scoresOutput,
      meta: {
        totalRequested: jobPostingIds.length,
        totalEvaluated: jobs.length,
        cachedCount,
        deterministicCount,
        ineligibleCount,
        shieldBlockedCount,
        dbTimeMs,
        scoringTimeMs,
        latencyMs: totalLatencyMs,
      },
    });
  } catch (error) {
    console.error("[Feed Scores API Error]:", error);
    return NextResponse.json(
      { success: false, error: "Failed to score feed items" },
      { status: 500 }
    );
  }
}
