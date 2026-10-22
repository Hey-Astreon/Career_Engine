import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyAutopilotToken, extractBearerToken } from "@/lib/autopilot/tokenUtils";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { normalizeApplicationUrl } from "@/lib/exportEngine";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

/**
 * POST /api/autopilot/confirm
 * Confirms an autofilled application submission (Pillar 1: 2-stage state machine).
 * Auth: Bearer token or NextAuth session
 */
export async function POST(req: Request) {
  try {
    let userId: string | null = null;

    // 1. Check Bearer token (AstrePilot Extension)
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      userId = verifyAutopilotToken(extractBearerToken(authHeader) ?? "");
    }

    // 2. Check NextAuth session (Workspace UI)
    if (!userId) {
      const session = await getServerSession(authOptions);
      userId = session?.user?.id ?? null;
    }

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: CORS });
    }

    const profile = await db.profile.findFirst({
      where: { userId },
      select: { id: true },
    });

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404, headers: CORS });
    }

    const body = await req.json();
    const { fillId, applicationId, siteUrl } = body as {
      fillId?: string;
      applicationId?: string;
      siteUrl?: string;
    };

    if (!fillId && !applicationId && !siteUrl) {
      return NextResponse.json({ error: "Missing identifier (fillId, applicationId, or siteUrl)" }, { status: 400, headers: CORS });
    }

    let targetApp = null;

    if (applicationId) {
      targetApp = await db.application.findFirst({
        where: { id: applicationId, profileId: profile.id },
      });
    }

    if (!targetApp && siteUrl) {
      const canonicalUrl = normalizeApplicationUrl(siteUrl);
      targetApp = await db.application.findFirst({
        where: {
          profileId: profile.id,
          OR: [
            { jobPosting: { url: canonicalUrl } },
            { opportunity: { canonicalAppUrl: canonicalUrl } },
          ],
        },
      });
    }

    if (!targetApp && fillId) {
      const apps = await db.application.findMany({
        where: { profileId: profile.id },
        orderBy: { updatedAt: "desc" },
        take: 20,
      });
      targetApp = apps.find((a) => a.notes && a.notes.includes(fillId)) || null;
    }

    if (!targetApp) {
      return NextResponse.json({ error: "Application record not found to confirm" }, { status: 404, headers: CORS });
    }

    // Parse and update notes
    let notesObj: Record<string, any> = {};
    if (targetApp.notes) {
      try {
        if (targetApp.notes.startsWith("{")) {
          notesObj = JSON.parse(targetApp.notes);
        }
      } catch {
        notesObj = { rawNotes: targetApp.notes };
      }
    }

    notesObj.confirmed = true;
    notesObj.confirmedAt = new Date().toISOString();

    const updated = await db.application.update({
      where: { id: targetApp.id },
      data: {
        appliedAt: new Date(),
        notes: JSON.stringify(notesObj),
      },
    });

    return NextResponse.json(
      {
        success: true,
        confirmed: true,
        applicationId: updated.id,
        appliedAt: updated.appliedAt,
      },
      { headers: CORS }
    );
  } catch (err) {
    console.error("[autopilot/confirm]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500, headers: CORS });
  }
}
