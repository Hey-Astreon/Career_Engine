import { NextResponse } from "next/server";
import { verifyAutopilotToken, extractBearerToken } from "@/lib/autopilot/tokenUtils";
import { db } from "@/lib/db";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

/**
 * POST /api/autopilot/kit-sync
 * Synchronizes the candidate's active application kit (extracted JD, company, role,
 * tailored cover letter, pitch, and screening Q&A) into the AstreWork database in real time.
 */
export async function POST(req: Request) {
  try {
    const token = extractBearerToken(req.headers.get("Authorization"));
    let userId: string | null = null;
    if (token) {
      userId = verifyAutopilotToken(token);
    }

    const body = await req.json().catch(() => ({}));
    const company = typeof body.company === "string" ? body.company.trim() : "";
    const jobTitle = typeof body.jobTitle === "string" ? body.jobTitle.trim() : "";
    const jdText = typeof body.jobDescription === "string" ? body.jobDescription.trim() : "";
    const coverLetter = typeof body.coverLetter === "string" ? body.coverLetter.trim() : "";
    const pitch = typeof body.pitch === "string" ? body.pitch.trim() : "";

    let profile = null;
    if (userId) {
      profile = await db.profile.findFirst({
        where: { userId },
      });
    }

    if (!profile) {
      profile = await db.profile.findFirst({
        where: { slug: "roushan" },
      });
    }

    if (!profile) {
      return NextResponse.json(
        { error: "Profile not found" },
        { status: 404, headers: CORS }
      );
    }

    // 1. Create or refresh active AutopilotSession
    const session = await db.autopilotSession.create({
      data: {
        profileId: profile.id,
        company: company || "Job Target",
        jobTitle: jobTitle || "Software Developer",
        jdText: jdText || "Job application tracked from browser extension.",
        tailoredSummary: pitch || coverLetter.slice(0, 300) || profile.title,
      },
    });

    return NextResponse.json(
      {
        success: true,
        sessionId: session.id,
        company: session.company,
        jobTitle: session.jobTitle,
        message: "Application kit synchronized in real time with AstreWork.",
      },
      { headers: CORS }
    );
  } catch (err: unknown) {
    console.error("[autopilot/kit-sync]", err);
    return NextResponse.json(
      { error: "Failed to synchronize application kit" },
      { status: 500, headers: CORS }
    );
  }
}
