import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyAutopilotToken, extractBearerToken } from "@/lib/autopilot/tokenUtils";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

/**
 * GET /api/autopilot/profile
 * Returns the autofill payload for the bookmarklet.
 * Auth: Bearer token (from bookmarklet)
 */
export async function GET(req: Request) {
  try {
    const userId = verifyAutopilotToken(extractBearerToken(req.headers.get("Authorization")) ?? "");
    if (!userId) {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 401, headers: CORS });
    }

    const profile = await db.profile.findFirst({
      where: { userId },
      include: { projects: true, virtualExps: true },
    });

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404, headers: CORS });
    }

    // Split full name into first/last for granular form filling
    const nameParts = profile.fullName.trim().split(/\s+/);
    const firstName = nameParts[0] ?? "";
    const lastName = (nameParts.slice(1).join(" ") || nameParts[0]) ?? "";

    // Build professional summary from profile context
    const projectNames = profile.projects.map((p) => p.title).slice(0, 3).join(", ");
    const techStacks = [
      ...new Set(
        profile.projects.flatMap((p) =>
          p.techStack.split(/[,|/\s]+/).map((t) => t.trim()).filter(Boolean)
        )
      ),
    ].slice(0, 6).join(", ");

    const experienceLines = profile.virtualExps
      .slice(0, 2)
      .map((e) => `${e.roleTitle} at ${e.company}`)
      .join("; ");

    const professionalSummary = profile.virtualExps.length > 0
      ? `${profile.title} with hands-on experience as ${experienceLines}. Built ${projectNames} using ${techStacks}. Passionate about remote-first engineering and delivering impact at scale.`
      : `${profile.title} who has built ${projectNames} using ${techStacks}. Focused on writing clean, performant code and shipping products that solve real problems.`;

    return NextResponse.json(
      {
        profileId: profile.id,
        fullName: profile.fullName,
        firstName,
        lastName,
        title: profile.title,
        email: profile.email,
        phone: profile.phone ?? "",
        location: profile.location,
        linkedinUrl: profile.linkedinUrl ?? "",
        githubUrl: profile.githubUrl ?? "",
        portfolioUrl: profile.portfolioUrl ?? "",
        professionalSummary,
        workAuthorized: true,
        requiresVisa: false,
        // Raw context for AI answer generation
        _context: {
          projects: profile.projects.map((p) => ({
            title: p.title,
            techStack: p.techStack,
            architecture: p.architecture,
          })),
          virtualExps: profile.virtualExps.map((e) => ({
            company: e.company,
            role: e.roleTitle,
            outcome: e.outcome,
          })),
        },
      },
      { headers: CORS }
    );
  } catch (err) {
    console.error("[autopilot/profile]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500, headers: CORS });
  }
}
