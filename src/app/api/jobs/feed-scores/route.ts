import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { computeBatchFeedScores, CachedScoreItem } from "@/lib/ai/batchScorer";

const MAX_BATCH_SIZE = 150;

export async function POST(req: Request) {
  const startTime = Date.now();

  try {
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

    // 4. Bulk DB Queries (High Performance: 2 Queries Total)
    const [jobs, cachedScoresList] = await Promise.all([
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
      db.matchScore.findMany({
        where: {
          profileId: profile.id,
          jobPostingId: { in: cappedJobIds },
        },
        select: {
          jobPostingId: true,
          score: true,
          hardSkills: true,
          missingSkills: true,
          reasoning: true,
        },
      }),
    ]);

    const dbTimeMs = Date.now() - dbQueryStartTime;

    // Create lookup map for cached scores
    const cachedScoresMap = new Map<string, CachedScoreItem>();
    for (const item of cachedScoresList) {
      if (item.jobPostingId) {
        cachedScoresMap.set(item.jobPostingId, {
          score: item.score,
          hardSkills: item.hardSkills,
          missingSkills: item.missingSkills,
          reasoning: item.reasoning,
        });
      }
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
