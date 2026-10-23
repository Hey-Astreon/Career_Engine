import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import type { ScreeningQuestionVault } from "@prisma/client";
import { verifyAutopilotToken, extractBearerToken } from "@/lib/autopilot/tokenUtils";
import { extractKeywords, inferQuestionCategory } from "@/lib/autopilot/qaVaultEngine";
import {
  ROUSHAN_KUMAR_STARTER_VAULT,
  AYUSHI_RAJ_STARTER_VAULT,
  GENERIC_STARTER_VAULT,
} from "@/lib/autopilot/qaVaultSeed";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

/**
 * Resolves the authenticated profile using either Bearer token (extension)
 * or NextAuth session (workspace dashboard).
 */
async function resolveProfile(req: Request) {
  // 1. Try Bearer token
  const bearerUserId = verifyAutopilotToken(
    extractBearerToken(req.headers.get("Authorization")) ?? ""
  );
  if (bearerUserId) {
    const profile = await db.profile.findFirst({
      where: { userId: bearerUserId },
    });
    if (profile) return profile;
  }

  // 2. Try NextAuth session
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.id) {
      const profile = await db.profile.findFirst({
        where: { userId: session.user.id },
      });
      if (profile) return profile;

      // Check founder email association
      if (session.user.email) {
        const emailProfile = await db.profile.findFirst({
          where: { email: session.user.email },
        });
        if (emailProfile) return emailProfile;
      }
    }
  } catch {
    // Outside request scope (e.g. test environments)
  }

  return null;
}

/**
 * Auto-seeds starter ammunition if the candidate's vault is currently empty
 */
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
 * GET /api/autopilot/vault
 * Returns candidate's saved screening questions & answers.
 */
export async function GET(req: Request) {
  try {
    const profile = await resolveProfile(req);
    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: CORS });
    }

    await ensureVaultSeeded(profile.id, profile.slug, profile.email);

    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const query = searchParams.get("q");

    const where: { profileId: string; category?: string } = { profileId: profile.id };
    if (category && category !== "ALL") {
      where.category = category.toUpperCase();
    }

    let items = await db.screeningQuestionVault.findMany({
      where,
      orderBy: [{ isFavorite: "desc" }, { timesUsed: "desc" }, { updatedAt: "desc" }],
    });

    if (query && query.trim()) {
      const qLower = query.toLowerCase().trim();
      items = items.filter(
        (i) =>
          i.questionPattern.toLowerCase().includes(qLower) ||
          i.answerText.toLowerCase().includes(qLower) ||
          i.category.toLowerCase().includes(qLower)
      );
    }

    const parsedItems = items.map((i) => {
      let keywords: string[] = [];
      try {
        keywords = JSON.parse(i.keywords);
      } catch {
        keywords = [];
      }
      return {
        ...i,
        keywords,
      };
    });

    return NextResponse.json(
      {
        success: true,
        vault: parsedItems,
        total: parsedItems.length,
      },
      { headers: CORS }
    );
  } catch (err) {
    console.error("[autopilot/vault GET]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500, headers: CORS });
  }
}

/**
 * POST /api/autopilot/vault
 * Saves or updates a screening question & answer in the candidate's vault.
 */
export async function POST(req: Request) {
  try {
    const profile = await resolveProfile(req);
    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: CORS });
    }

    const body = await req.json();
    const {
      questionPattern,
      answerText,
      category,
      companyContext,
      roleContext,
      isFavorite,
    } = body as {
      questionPattern: string;
      answerText: string;
      category?: string;
      companyContext?: string;
      roleContext?: string;
      isFavorite?: boolean;
    };

    if (!questionPattern?.trim() || !answerText?.trim()) {
      return NextResponse.json(
        { error: "questionPattern and answerText are required" },
        { status: 400, headers: CORS }
      );
    }

    // Section 5 Title Compliance: Bar prohibited engineer titles in saved answers
    const forbiddenTitleRegex = /\b(?:software|systems|backend|full[\s-]?stack|frontend|ai)\s+engineer\b/i;
    if (forbiddenTitleRegex.test(answerText) || forbiddenTitleRegex.test(roleContext || "")) {
      return NextResponse.json(
        {
          error:
            "Section 5 Compliance Violation: Indian BCA candidate title must be 'Developer', 'Architect', or 'Builder', never 'Engineer'.",
        },
        { status: 422, headers: CORS }
      );
    }

    const inferredCategory = category || inferQuestionCategory(questionPattern);
    const keywords = extractKeywords(questionPattern);

    // Check if an entry with an identical pattern already exists for this candidate
    const existing = await db.screeningQuestionVault.findFirst({
      where: {
        profileId: profile.id,
        questionPattern: questionPattern.trim(),
      },
    });

    let entry;
    if (existing) {
      entry = await db.screeningQuestionVault.update({
        where: { id: existing.id },
        data: {
          answerText: answerText.trim(),
          category: inferredCategory,
          keywords: JSON.stringify(keywords),
          companyContext: companyContext ?? existing.companyContext,
          roleContext: roleContext ?? existing.roleContext,
          isFavorite: isFavorite !== undefined ? Boolean(isFavorite) : existing.isFavorite,
        },
      });
    } else {
      entry = await db.screeningQuestionVault.create({
        data: {
          profileId: profile.id,
          questionPattern: questionPattern.trim(),
          answerText: answerText.trim(),
          category: inferredCategory,
          keywords: JSON.stringify(keywords),
          companyContext: companyContext || null,
          roleContext: roleContext || null,
          isFavorite: Boolean(isFavorite),
        },
      });
    }

    return NextResponse.json(
      {
        success: true,
        entry: {
          ...entry,
          keywords,
        },
      },
      { status: existing ? 200 : 201, headers: CORS }
    );
  } catch (err) {
    console.error("[autopilot/vault POST]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500, headers: CORS });
  }
}
