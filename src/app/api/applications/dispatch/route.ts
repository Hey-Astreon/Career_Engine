import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateTailoredKit } from "@/lib/ai/drafter";
import { validatePDFExtractability } from "@/lib/ai/ats_validator";
import { selectRecommendedResumeVariant } from "@/lib/resumeVariantSelector";
import { ApplicationStatus } from "@prisma/client";

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

function sanitizeText(inputText?: string | null): string {
  if (!inputText || typeof inputText !== "string") return "";
  return inputText.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "").trim();
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    
    if (!body) {
      return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
    }

    const { profileSlug, jobPostingId, opportunityId } = body;

    if (
      typeof profileSlug !== "string" || !profileSlug.trim() ||
      (typeof jobPostingId !== "string" && typeof opportunityId !== "string")
    ) {
      return NextResponse.json(
        { success: false, error: "profileSlug and either jobPostingId or opportunityId are required" },
        { status: 400 }
      );
    }

    const sanitizedSlug = profileSlug.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");

    const profile = await db.profile.findUnique({
      where: { slug: sanitizedSlug },
      include: { projects: true, virtualExps: true },
    });

    if (!profile) {
      return NextResponse.json({ success: false, error: "Profile not found" }, { status: 404 });
    }

    let jobTarget;
    if (jobPostingId) {
      jobTarget = await db.jobPosting.findUnique({ where: { id: jobPostingId.trim() } });
    }
    
    // If opportunityId is provided and no jobPosting is found, we might want to support Opportunities directly, 
    // but the Drafter kit mostly uses title/company/description.
    if (!jobTarget && opportunityId) {
       const opp = await db.opportunity.findUnique({ where: { id: opportunityId.trim() } });
       if (opp) {
           jobTarget = {
               id: opp.id,
               title: opp.title,
               company: opp.company,
               rawDescription: opp.rawDescription,
               platform: "DIRECT_PORTAL"
           };
       }
    }

    if (!jobTarget) {
      return NextResponse.json({ success: false, error: "Target job not found" }, { status: 404 });
    }

    const recommendedVariant = selectRecommendedResumeVariant(
      profile.slug,
      jobTarget.title,
      jobTarget.rawDescription,
      jobTarget.company,
      jobTarget.platform
    );

    const safeCvPath = sanitizeFilePath(recommendedVariant.pdfPath || profile.masterResumePath);

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
      jobTarget.title,
      jobTarget.company,
      jobTarget.rawDescription
    );

    const atsCheck = await validatePDFExtractability(safeCvPath, jobTarget.title, jobTarget.rawDescription);
    const safeCoverLetter = sanitizeText(kit.coverLetter);
    const safeColdEmail = sanitizeText(kit.coldEmail);
    const safeRecruiterDm = sanitizeText(kit.recruiterMessage);

    const isOpportunity = !!opportunityId && !jobPostingId;

    const findWhere = isOpportunity 
        ? { profileId: profile.id, opportunityId: jobTarget.id }
        : { profileId: profile.id, jobPostingId: jobTarget.id };

    const existingApp = await db.application.findFirst({
        where: findWhere,
    });

    const updateData = {
        status: ApplicationStatus.APPLIED,
        appliedAt: new Date(),
        dispatchedAt: new Date(),
        tailoredCvPath: safeCvPath,
        tailoredCoverLetter: safeCoverLetter,
        coldEmailDraft: safeColdEmail,
        recruiterDmDraft: safeRecruiterDm,
        atsExtractabilityScore: atsCheck.extractabilityScore,
        resumeVariantName: recommendedVariant.variantName,
    };

    let appRecord;
    if (existingApp) {
        appRecord = await db.application.update({
            where: { id: existingApp.id },
            data: updateData,
            include: { jobPosting: true, opportunity: true },
        });
    } else {
        appRecord = await db.application.create({
            data: {
                profileId: profile.id,
                ...(isOpportunity ? { opportunityId: jobTarget.id } : { jobPostingId: jobTarget.id }),
                ...updateData
            },
            include: { jobPosting: true, opportunity: true },
        });
    }

    return NextResponse.json({
      success: true,
      application: appRecord,
      kit: {
        coverLetter: safeCoverLetter,
        coldEmail: safeColdEmail,
        recruiterMessage: safeRecruiterDm,
        atsScore: atsCheck.extractabilityScore,
        resumeVariant: recommendedVariant.variantName,
        pdfPath: safeCvPath,
      },
    });
  } catch (error) {
    console.error("Dispatcher API Error:", error);
    return NextResponse.json({ success: false, error: "Failed to dispatch application" }, { status: 500 });
  }
}
