import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { verifyAutopilotToken, extractBearerToken } from "@/lib/autopilot/tokenUtils";
import { findBestVaultMatch, VaultEntry } from "@/lib/autopilot/qaVaultEngine";
import { extractKeywords } from "@/lib/autopilot/qaVaultEngine";
import {
  ROUSHAN_KUMAR_STARTER_VAULT,
  AYUSHI_RAJ_STARTER_VAULT,
  GENERIC_STARTER_VAULT,
} from "@/lib/autopilot/qaVaultSeed";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

async function resolveProfile(req: Request) {
  const bearerUserId = verifyAutopilotToken(
    extractBearerToken(req.headers.get("Authorization")) ?? ""
  );
  if (bearerUserId) {
    const profile = await db.profile.findFirst({
      where: { userId: bearerUserId },
    });
    if (profile) return profile;
  }

  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.id) {
      const profile = await db.profile.findFirst({
        where: { userId: session.user.id },
      });
      if (profile) return profile;

      if (session.user.email) {
        const emailProfile = await db.profile.findFirst({
          where: { email: session.user.email },
        });
        if (emailProfile) return emailProfile;
      }
    }
  } catch {
    // Outside request scope
  }

  return null;
}

async function ensureVaultSeeded(profileId: string, slug?: string, email?: string) {
  const count = await db.screeningQuestionVault.count({
    where: { profileId },
  });

  if (count > 0) return;

  let seedData = GENERIC_STARTER_VAULT;
  if (slug === "roushan" || email === "playboxstation460@gmail.com" || email === "roushanraut404@gmail.com") {
    seedData = ROUSHAN_KUMAR_STARTER_VAULT;
  } else if (slug === "ayushi" || email === "ayushi29507@gmail.com") {
    seedData = AYUSHI_RAJ_STARTER_VAULT;
  }

  for (const item of seedData) {
    const keywords = extractKeywords(item.questionPattern);
    await db.screeningQuestionVault.create({
      data: {
        profileId,
        category: item.category,
        questionPattern: item.questionPattern,
        keywords: JSON.stringify(keywords),
        answerText: item.answerText,
        isFavorite: item.isFavorite,
      },
    });
  }
}

/**
 * POST /api/autopilot/vault/match
 * Fast semantic lookup matching a screening question against the candidate's vault.
 */
export async function POST(req: Request) {
  try {
    const profile = await resolveProfile(req);
    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: CORS });
    }

    const body = await req.json();
    const { question, company, jobTitle } = body as {
      question: string;
      company?: string;
      jobTitle?: string;
    };

    if (!question?.trim()) {
      return NextResponse.json({ error: "question is required" }, { status: 400, headers: CORS });
    }

    await ensureVaultSeeded(profile.id, profile.slug, profile.email);

    // Fetch all vault entries for this candidate
    const dbEntries = await db.screeningQuestionVault.findMany({
      where: { profileId: profile.id },
    });

    const parsedEntries: VaultEntry[] = dbEntries.map((e) => {
      let keywords: string[] = [];
      try {
        keywords = JSON.parse(e.keywords);
      } catch {
        keywords = [];
      }
      return {
        id: e.id,
        profileId: e.profileId,
        category: e.category,
        questionPattern: e.questionPattern,
        keywords,
        answerText: e.answerText,
        isFavorite: e.isFavorite,
        timesUsed: e.timesUsed,
        lastUsedAt: e.lastUsedAt,
        companyContext: e.companyContext,
        roleContext: e.roleContext,
      };
    });

    // Execute fast deterministic + fuzzy matching
    const match = findBestVaultMatch(
      question,
      parsedEntries,
      { company, jobTitle },
      0.60 // 60% confidence threshold
    );

    // If matched, asynchronously increment usage telemetry
    if (match.matched && match.entry) {
      db.screeningQuestionVault
        .update({
          where: { id: match.entry.id },
          data: {
            timesUsed: { increment: 1 },
            lastUsedAt: new Date(),
          },
        })
        .catch(() => {});
    }

    return NextResponse.json(
      {
        matched: match.matched,
        confidence: match.confidence,
        answer: match.interpolatedAnswer,
        category: match.category,
        vaultId: match.entry?.id ?? null,
        overlapTokens: match.overlapTokens,
        source: match.source,
      },
      { headers: CORS }
    );
  } catch (err) {
    console.error("[autopilot/vault/match]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500, headers: CORS });
  }
}
