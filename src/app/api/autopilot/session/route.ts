import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyAutopilotToken, extractBearerToken } from "@/lib/autopilot/tokenUtils";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function GET(req: Request) {
  try {
    let userId: string | undefined;

    // 1. Try NextAuth (Web App)
    const sessionAuth = await getServerSession(authOptions);
    if (sessionAuth?.user?.id) {
      userId = sessionAuth.user.id;
    } else {
      // 2. Try Bearer Token (Extension)
      userId = verifyAutopilotToken(extractBearerToken(req.headers.get("authorization")) ?? "");
    }

    if (!userId) {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 401, headers: CORS });
    }

    // Find profile for this user
    const profile = await db.profile.findFirst({
      where: { userId },
      select: { id: true },
    });

    if (!profile) {
      return NextResponse.json({ session: null }, { headers: CORS });
    }

    // Get the most recent session within the last 24 hours
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const session = await db.autopilotSession.findFirst({
      where: {
        profileId: profile.id,
        createdAt: { gte: yesterday }
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        company: true,
        jobTitle: true,
        tailoredSummary: true,
        keySkills: true,
        jdText: true,
        salaryRange: true,
        workType: true,
        createdAt: true,
      }
    });

    return NextResponse.json({ session }, { headers: CORS });
  } catch (error) {
    console.error("Autopilot session GET error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500, headers: CORS });
  }
}

export async function POST(req: Request) {
  try {
    // Internal API call from resumeOptimizer (or direct POST from the frontend)
    // Here we'll expect profileId and session data in the body
    const body = await req.json();
    const { profileId, company, jobTitle, jdText, tailoredSummary, keySkills, workType, salaryRange } = body;

    if (!profileId || !jdText || !tailoredSummary) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const session = await db.autopilotSession.create({
      data: {
        profileId,
        company,
        jobTitle,
        jdText,
        tailoredSummary,
        keySkills: JSON.stringify(keySkills || []),
        workType,
        salaryRange
      }
    });

    return NextResponse.json({ session });
  } catch (error) {
    console.error("Autopilot session POST error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
