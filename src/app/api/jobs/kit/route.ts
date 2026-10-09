import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { generateTailoredKit } from "@/lib/ai/drafter";
import { validatePDFExtractability } from "@/lib/ai/ats_validator";
import { selectRecommendedResumeVariant } from "@/lib/resumeVariantSelector";

/**
 * Validates and sanitizes a file path to prevent path traversal attacks.
 */
function sanitizeFilePath(inputPath?: string | null): string {
  if (!inputPath || typeof inputPath !== "string") {
    return "/resumes/master.pdf";
  }
  const clean = inputPath.replace(/\0/g, "").trim();
  if (clean.includes("..") || clean.includes("/..") || clean.includes("\\..")) {
    const basename = clean.split(/[/\\]/).pop() || "master.pdf";
    const safeName = basename.replace(/[^a-zA-Z0-9_.-]/g, "_");
    return `/resumes/${safeName}`;
  }
  return clean;
}

/**
 * Sanitizes user-facing text to prevent XSS.
 */
function sanitizeText(inputText?: string | null): string {
  if (!inputText || typeof inputText !== "string") return "";
  return inputText.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "").trim();
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    let body: { profileSlug?: unknown; jobPostingId?: unknown };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const { profileSlug, jobPostingId } = body || {};

    if (
      typeof profileSlug !== "string" ||
      !profileSlug.trim() ||
      typeof jobPostingId !== "string" ||
      !jobPostingId.trim()
    ) {
      return NextResponse.json(
        { success: false, error: "profileSlug and jobPostingId are required strings" },
        { status: 400 }
      );
    }

    const sanitizedSlug = profileSlug.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");

    const profile = await db.profile.findUnique({
      where: { slug: sanitizedSlug },
      include: { projects: true, virtualExps: true },
    });

    const job = await db.jobPosting.findUnique({
      where: { id: jobPostingId.trim() },
    });

    if (!profile || !job) {
      return NextResponse.json(
        { success: false, error: "Profile or JobPosting not found" },
        { status: 404 }
      );
    }

    // Allow generating kit if user owns the profile OR if it is a template/benchmark profile
    if (profile.userId && profile.userId !== session.user.id) {
      return NextResponse.json(
        { success: false, error: "Forbidden: You do not own this profile" },
        { status: 403 }
      );
    }

    // Determine the optimal resume variant for this candidate and target role
    const recommendedVariant = selectRecommendedResumeVariant(
      profile.slug,
      job.title,
      job.rawDescription,
      job.company,
      job.platform
    );

    const safeCvPath = sanitizeFilePath(recommendedVariant.pdfPath || profile.masterResumePath);

    // Run Drafter Agent with full candidate context
    const kit = await generateTailoredKit(
      {
        fullName: profile.fullName,
        title: profile.title,
        email: profile.email,
        phone: profile.phone,
        location: profile.location,
        portfolioUrl: profile.portfolioUrl,
        githubUrl: profile.githubUrl,
        linkedinUrl: profile.linkedinUrl,
        masterProjects: profile.projects.map((p) => ({
          title: p.title,
          techStack: p.techStack,
          architecture: p.architecture,
        })),
        virtualExps: profile.virtualExps.map((e) => ({
          company: e.company,
          roleTitle: e.roleTitle,
          outcome: e.outcome,
        })),
      },
      job.title,
      job.company,
      job.rawDescription
    );

    // Validate PDF extractability score dynamically for this job
    const atsCheck = await validatePDFExtractability(safeCvPath, job.title, job.rawDescription);
    const safeCoverLetter = sanitizeText(kit.coverLetter);

    return NextResponse.json({
      success: true,
      kit: {
        tailoredSummary: kit.tailoredSummary,
        tailoredProjects: kit.tailoredProjects,
        coverLetter: safeCoverLetter,
        recruiterMessage: sanitizeText(kit.recruiterMessage),
        coldEmail: sanitizeText(kit.coldEmail),
        followUpDraft: sanitizeText(kit.followUpDraft),
        recommendedResumeVariant: recommendedVariant,
        atsReviewerScore: kit.atsReviewerScore,
        reviewerFeedback: kit.reviewerFeedback,
        atsExtractabilityScore: atsCheck.extractabilityScore,
        pdfPath: safeCvPath,
      },
    });
  } catch (error) {
    console.error("Application Kit Generator API Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to generate application kit" },
      { status: 500 }
    );
  }
}
