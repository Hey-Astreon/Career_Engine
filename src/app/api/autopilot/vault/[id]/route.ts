import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { verifyAutopilotToken, extractBearerToken } from "@/lib/autopilot/tokenUtils";
import { extractKeywords } from "@/lib/autopilot/qaVaultEngine";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "PATCH, DELETE, OPTIONS",
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

/**
 * PATCH /api/autopilot/vault/[id]
 * Updates a vault entry (toggles favorite, edits answer text, updates category).
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const profile = await resolveProfile(req);
    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: CORS });
    }

    const { id } = await params;
    const existing = await db.screeningQuestionVault.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Vault item not found" }, { status: 404, headers: CORS });
    }

    // Candidate ownership isolation (Section 6)
    if (existing.profileId !== profile.id) {
      return NextResponse.json({ error: "Forbidden: Not your vault entry" }, { status: 403, headers: CORS });
    }

    const body = await req.json();
    const { isFavorite, answerText, category, questionPattern } = body as {
      isFavorite?: boolean;
      answerText?: string;
      category?: string;
      questionPattern?: string;
    };

    // Section 5 Title Compliance
    if (answerText) {
      const forbiddenTitleRegex = /\b(?:software|systems|backend|full[\s-]?stack|frontend|ai)\s+engineer\b/i;
      if (forbiddenTitleRegex.test(answerText)) {
        return NextResponse.json(
          {
            error:
              "Section 5 Compliance Violation: Indian BCA candidate title must be 'Developer', 'Architect', or 'Builder', never 'Engineer'.",
          },
          { status: 422, headers: CORS }
        );
      }
    }

    const updateData: Record<string, unknown> = {};
    if (isFavorite !== undefined) updateData.isFavorite = Boolean(isFavorite);
    if (answerText !== undefined) updateData.answerText = answerText.trim();
    if (category !== undefined) updateData.category = category.trim().toUpperCase();
    if (questionPattern !== undefined) {
      updateData.questionPattern = questionPattern.trim();
      updateData.keywords = JSON.stringify(extractKeywords(questionPattern));
    }

    const updated = await db.screeningQuestionVault.update({
      where: { id },
      data: updateData,
    });

    let keywords: string[] = [];
    try {
      keywords = JSON.parse(updated.keywords);
    } catch {
      keywords = [];
    }

    return NextResponse.json(
      {
        success: true,
        entry: {
          ...updated,
          keywords,
        },
      },
      { headers: CORS }
    );
  } catch (err) {
    console.error("[autopilot/vault/[id] PATCH]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500, headers: CORS });
  }
}

/**
 * DELETE /api/autopilot/vault/[id]
 * Deletes a vault entry.
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const profile = await resolveProfile(req);
    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: CORS });
    }

    const { id } = await params;
    const existing = await db.screeningQuestionVault.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Vault item not found" }, { status: 404, headers: CORS });
    }

    if (existing.profileId !== profile.id) {
      return NextResponse.json({ error: "Forbidden: Not your vault entry" }, { status: 403, headers: CORS });
    }

    await db.screeningQuestionVault.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, deletedId: id }, { headers: CORS });
  } catch (err) {
    console.error("[autopilot/vault/[id] DELETE]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500, headers: CORS });
  }
}
