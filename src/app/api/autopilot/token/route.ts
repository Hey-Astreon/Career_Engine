import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { generateAutopilotToken } from "@/lib/autopilot/tokenUtils";
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
 * Generates a personal AstrePilot bookmarklet token for the signed-in user.
 * Returns the token + the ready-to-use bookmarklet href.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: CORS });
    }

    let profile = await db.profile.findFirst({
      where: { userId: session.user.id },
      select: { id: true },
    });

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
