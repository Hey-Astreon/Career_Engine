import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { generateFollowupDraft, FollowupTone } from "@/lib/followupGenerator";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const currentUserId = session?.user?.id || null;

    const body = await req.json().catch(() => null);
    if (!body || !body.applicationId) {
      return NextResponse.json(
        { success: false, error: "applicationId is required" },
        { status: 400 }
      );
    }

    const { applicationId, tone = "nudge" } = body;

    const application = await db.application.findUnique({
      where: { id: applicationId },
      include: {
        profile: {
          include: {
            projects: true,
          },
        },
        jobPosting: true,
        opportunity: true,
      },
    });

    if (!application) {
      return NextResponse.json(
        { success: false, error: "Application not found" },
        { status: 404 }
      );
    }

    // Allow followup generation if user owns the profile OR if it is a template/benchmark profile
    if (application.profile.userId && application.profile.userId !== currentUserId) {
      return NextResponse.json(
        { success: false, error: "Forbidden: You do not own this application" },
        { status: 403 }
      );
    }

    const company = application.opportunity?.company || application.jobPosting?.company || "Company";
    const title = application.opportunity?.title || application.jobPosting?.title || "Software Engineer";

    const now = Date.now();
    const baseDate = application.appliedAt || application.createdAt;
    const diffMs = now - new Date(baseDate).getTime();
    const daysSilent = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));

    const result = generateFollowupDraft({
      company,
      title,
      candidate: {
        fullName: application.profile.fullName,
        email: application.profile.email,
        phone: application.profile.phone,
        portfolioUrl: application.profile.portfolioUrl,
        githubUrl: application.profile.githubUrl,
        topProject: application.profile.projects?.[0]?.title,
        topTech: application.profile.projects?.[0]?.techStack,
      },
      tone: tone as FollowupTone,
      daysSilent,
    });

    return NextResponse.json({
      success: true,
      followupDraft: result.fullDraft,
      subject: result.subject,
      body: result.body,
      mailtoUrl: result.mailtoUrl,
      tone: result.tone,
      company: result.company,
      title: result.title,
      daysSilent,
    });
  } catch (error) {
    console.error("Follow-up draft generation API error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to generate follow-up draft" },
      { status: 500 }
    );
  }
}
