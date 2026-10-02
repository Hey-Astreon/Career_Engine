import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const token = authHeader.split(" ")[1];

    // Verify token structure
    const [userId, profileId] = Buffer.from(token, "base64").toString().split(":");
    if (!userId || !profileId) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    // Get the most recent session for this profile within the last 24 hours
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const session = await db.autopilotSession.findFirst({
      where: {
        profileId,
        createdAt: {
          gte: yesterday
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    if (!session) {
      return NextResponse.json({ session: null }, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        }
      });
    }

    return NextResponse.json({ session }, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      }
    });
  } catch (error) {
    console.error("Autopilot session GET error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
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
