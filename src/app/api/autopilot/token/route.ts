import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { generateAutopilotToken } from "@/lib/autopilot/tokenUtils";
import { isDeveloperEmail, getDeveloperDefaultSlug } from "@/lib/authCandidate";
import { db } from "@/lib/db";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

/**
 * GET /api/autopilot/token
 * Generates a personal AstrePilot extension token for the signed-in user.
 * Returns the connection token for the Manifest V3 Chrome Extension.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: CORS });
    }

    const userEmail = session.user.email?.toLowerCase();
    const isFounder = isDeveloperEmail(userEmail);

    let profile = await db.profile.findFirst({
      where: { userId: session.user.id },
      select: { id: true, userId: true },
    });

    // If profile not linked by userId yet, link by developer slug or email
    if (!profile && userEmail) {
      if (isFounder) {
        const ownSlug = getDeveloperDefaultSlug(userEmail);
        profile = await db.profile.findFirst({
          where: { slug: ownSlug },
          select: { id: true, userId: true },
        });
        if (profile) {
          await db.profile.update({
            where: { id: profile.id },
            data: { userId: session.user.id },
          }).catch(() => {});
        }
      } else {
        profile = await db.profile.findFirst({
          where: { email: userEmail },
          select: { id: true, userId: true },
        });
        if (profile) {
          await db.profile.update({
            where: { id: profile.id },
            data: { userId: session.user.id },
          }).catch(() => {});
        }
      }
    }

    // Founders always get a valid token even if DB profile seed is pending
    if (!profile && isFounder) {
      const token = generateAutopilotToken(session.user.id);
      return NextResponse.json({ token }, { headers: CORS });
    }

    if (!profile) {
      return NextResponse.json(
        { error: "No profile found. Complete onboarding first." },
        { status: 404, headers: CORS }
      );
    }

    const token = generateAutopilotToken(session.user.id);

    return NextResponse.json({ token }, { headers: CORS });
  } catch (err) {
    console.error("[autopilot/token]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500, headers: CORS });
  }
}
