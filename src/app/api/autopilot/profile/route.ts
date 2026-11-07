import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyAutopilotToken, extractBearerToken } from "@/lib/autopilot/tokenUtils";
import { isDeveloperEmail, getDeveloperDefaultSlug } from "@/lib/authCandidate";
import { getMasterResumeBaseline } from "@/lib/resumeBaseline";

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

    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true },
    });

    const url = new URL(req.url);
    const requestedSlug = (url.searchParams.get("slug") || url.searchParams.get("candidate") || "").toLowerCase().trim();

    let profile = await db.profile.findFirst({
      where: { userId },
      include: { projects: true, virtualExps: true },
    });

    if (!profile) {
      const targetSlug = (requestedSlug === "roushan" || requestedSlug === "ayushi")
        ? requestedSlug
        : isDeveloperEmail(user?.email)
          ? getDeveloperDefaultSlug(user?.email)
          : null;

      if (targetSlug) {
        profile = await db.profile.findFirst({
          where: { slug: targetSlug },
          include: { projects: true, virtualExps: true },
        });

        if (!profile) {
          const baseline = getMasterResumeBaseline(targetSlug as "roushan" | "ayushi");
          profile = {
            id: "founder-" + targetSlug,
            slug: targetSlug,
            fullName: baseline.header.fullName,
            title: baseline.header.targetHeadline,
            email: baseline.header.email,
            phone: baseline.header.phone,
            location: baseline.header.location,
            linkedinUrl: (baseline.header as any).linkedinUrl || (baseline.header as any).linkedin || "",
            githubUrl: (baseline.header as any).githubUrl || (baseline.header as any).github || "",
            portfolioUrl: (baseline.header as any).portfolioUrl || (baseline.header as any).portfolio || "",
            highestEducation: (Array.isArray(baseline.education) ? (baseline.education as any[])[0]?.degree : (baseline.education as any)?.degree) || "Bachelor of Computer Applications (BCA)",
            streetAddress: "Patna, Bihar",
            apartment: "",
            zipCode: "800024",
            noticePeriod: "Immediate",
            willingnessToRelocate: true,
            gender: targetSlug === "ayushi" ? "Female" : "Male",
            pronouns: targetSlug === "ayushi" ? "She/Her" : "He/Him",
            careerStage: "early_career",
            yearsOfExperience: 2,
            workType: "remote",
            salaryRange: "$70k-$100k",
            workAuthorized: true,
            requiresVisa: targetSlug === "roushan",
            targetCountries: "[\"United States\",\"Remote\",\"India\"]",
            primarySkills: JSON.stringify(baseline.skills.flatMap(s => s.skillsText.split(",").map(x => x.trim()))),
            projects: baseline.projects.map(p => ({
              id: "proj-" + p.title,
              title: p.title,
              techStack: Array.isArray(p.techStack) ? p.techStack.join(", ") : (p.techStack || ""),
              architecture: Array.isArray(p.bullets) ? p.bullets.join(". ") : "",
            })),
            virtualExps: (baseline.simulations || []).map(s => ({
              id: "sim-" + s.company,
              company: s.company,
              roleTitle: s.roleTitle,
              actionTaken: s.actionTaken || "",
              outcome: s.engineeringOutcome || "",
            })),
          } as any;
        }
      }
    }

    if (!profile) {
      return NextResponse.json(
        { error: "Profile not found. Please complete onboarding at astrework.app/onboard" },
        { status: 404, headers: CORS }
      );
    }

    // Split full name into first/last for granular form filling
    const nameParts = profile.fullName.trim().split(/\s+/);
    const formatName = (s: string) => s && s === s.toUpperCase() && s.length > 1 ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : s;
    const firstName = formatName(nameParts[0] ?? "");
    const lastName = formatName((nameParts.slice(1).join(" ") || nameParts[0]) ?? "");
    const displayFullName = `${firstName} ${lastName}`.trim();

    // Build professional summary from profile context
    const projectNames = profile.projects.map((p) => p.title.split(/\s+[—–-]\s+/)[0]).slice(0, 3).join(", ");
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

    const isKnownFounder = profile.slug === "roushan" || profile.slug === "ayushi";
    const professionalSummary = isKnownFounder
      ? getMasterResumeBaseline(profile.slug).summary
      : profile.virtualExps.length > 0
        ? `${profile.title} with hands-on experience as ${experienceLines}. Built ${projectNames} using ${techStacks}. Focused on remote software development and delivering reliable production systems.`
        : `${profile.title} who has built ${projectNames} using ${techStacks}. Focused on writing clean, performant code and shipping products that solve real problems.`;

    // Parse granular location parts (strip parenthetical notes like "(Open to Remote)" first)
    let city = "";
    let state = "";
    let country = "";
    if (profile.location) {
      const cleanLoc = profile.location.replace(/\s*\([^)]*\)/g, "").trim();
      const locParts = cleanLoc.split(",").map((s) => s.trim()).filter(Boolean);
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
        fullName: displayFullName || profile.fullName,
        firstName,
        lastName,
        title: profile.title,
        email: profile.email,
        phone: profile.phone ?? "",
        phoneType: "Mobile",
        location: profile.location,
        preferredLocation: "Remote",
        workplacePreference: "Remote",
        city,
        state,
        country,
        streetAddress: profile.streetAddress ?? "",
        apartment: profile.apartment ?? "",
        zipCode: profile.zipCode ?? "800024",
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
        // Education fields
        school: "Amity University",
        degree: profile.highestEducation ?? "Bachelor of Computer Applications (BCA)",
        discipline: "Computer Science / Applications",
        startMonth: "July",
        startYear: "2025",
        endMonth: "July",
        endYear: "2028",
        graduationYear: "2028",
        // Employment fields
        company: profile.virtualExps[0]?.company ?? "AstreWork",
        employmentTitle: profile.virtualExps[0]?.roleTitle ?? profile.title ?? "Full-Stack Developer",
        workDescription: profile.virtualExps[0]
          ? `${profile.virtualExps[0].actionTaken}. ${profile.virtualExps[0].outcome}`
          : (profile.projects[0]?.architecture ?? professionalSummary),
        currentRole: true,
        // Standard ATS compliance & screening answers
        is18OrOlder: "Yes",
        previouslyEmployed: "No",
        privacyConsent: "Yes",
        aiConsent: "Yes",
        aiUsage: "I use generative AI and developer copilots daily to maximize development throughput and code reliability.",
        governmentOfficial: "No",
        relativeGovernmentOfficial: "No",
        conflictOfInterest: "No",
        referredByLeader: "No",
        hispanicLatino: "No",
        veteranStatus: "I am not a protected veteran",
        disabilityStatus: "No, I don't have a disability",
        race: "Asian",
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
