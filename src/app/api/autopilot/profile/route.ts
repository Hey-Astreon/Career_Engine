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
 * Returns the autofill payload for AstrePilot.
 * Auth: Bearer token (from AstrePilot Extension)
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
      return NextResponse.json(
        { error: "Profile not found. Please complete onboarding at astrework.app/onboard" },
        { status: 404, headers: CORS }
      );
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

    // Parse granular location parts
    let city = "";
    let state = "";
    let country = "";
    if (profile.location) {
      const locParts = profile.location.split(",").map((s) => s.trim()).filter(Boolean);
      if (locParts.length >= 3) {
        city = locParts[0];
        state = locParts[1];
        country = locParts[locParts.length - 1];
      } else if (locParts.length === 2) {
        city = locParts[0];
        state = locParts[1];
        country = locParts[1];
      } else {
        city = locParts[0] || "";
      }
    }

    return NextResponse.json(
      {
        profileId: profile.id,
        fullName: profile.fullName,
        firstName,
        lastName,
        title: profile.title,
        email: profile.email,
        phone: profile.phone ?? "",
        phoneType: "Mobile",
        location: profile.location,
        city,
        state,
        country,
        streetAddress: profile.streetAddress ?? (city ? `${city}, ${state}` : ""),
        apartment: profile.apartment ?? "",
        zipCode: profile.zipCode ?? "800020",
        noticePeriod: profile.noticePeriod ?? "Immediate",
        willingnessToRelocate: profile.willingnessToRelocate ?? true,
        highestEducation: profile.highestEducation ?? "Bachelor of Computer Applications (BCA)",
        gender: profile.gender ?? "Male",
        pronouns: profile.pronouns ?? "He/Him",
        referralSource: "LinkedIn",
        linkedinUrl: profile.linkedinUrl ?? "",
        githubUrl: profile.githubUrl ?? "",
        portfolioUrl: profile.portfolioUrl ?? "",
        professionalSummary,
        // AstrePilot brain fields
        careerStage: profile.careerStage ?? null,
        yearsOfExperience: profile.yearsOfExperience ?? null,
        workType: profile.workType ?? "remote",
        salaryRange: profile.salaryRange ?? null,
        workAuthorized: profile.workAuthorized ?? true,
        requiresVisa: profile.requiresVisa ?? false,
        targetCountries: (() => { try { return profile.targetCountries ? JSON.parse(profile.targetCountries) : []; } catch { return []; } })(),
        primarySkills: (() => { try { return profile.primarySkills ? JSON.parse(profile.primarySkills) : []; } catch { return []; } })(),
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
