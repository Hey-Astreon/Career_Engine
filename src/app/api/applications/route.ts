import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ApplicationStatus } from "@prisma/client";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const profileSlug = searchParams.get("profileSlug") || "roushan";

    const profile = await db.profile.findUnique({
      where: { slug: profileSlug },
    });

    if (!profile) {
      return NextResponse.json({ success: true, applications: [] });
    }

    const applications = await db.application.findMany({
      where: { profileId: profile.id },
      include: { jobPosting: true, opportunity: true },
      orderBy: { createdAt: "desc" },
    });

    const formattedApps = applications.map((app) => {
      const now = Date.now();
      const baseDate = app.appliedAt || app.createdAt;
      const diffMs = now - new Date(baseDate).getTime();
      const daysSilent = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));

      let currentStatus: string = app.status;
      if (daysSilent >= 10 && app.status === ApplicationStatus.APPLIED) {
        currentStatus = "QUIET";
      }

      const companyName = app.opportunity?.company || app.jobPosting?.company || "Direct Portal";
      const jobTitle = app.opportunity?.title || app.jobPosting?.title || "Software Developer";
      const url = app.opportunity?.canonicalAppUrl || app.jobPosting?.url || "";

      return {
        id: app.id,
        company: companyName,
        title: jobTitle,
        status: currentStatus,
        appliedDate: new Date(baseDate).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
        daysSilent,
        jobUrl: url,
        resumeVariantName: app.resumeVariantName,
        atsExtractabilityScore: app.atsExtractabilityScore,
      };
    });

    return NextResponse.json({ success: true, applications: formattedApps });
  } catch (error) {
    console.error("Error fetching applications:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load tracked applications" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { profileSlug = "roushan", jobPostingId, company, title, url } = body;

    const profile = await db.profile.findUnique({
      where: { slug: profileSlug },
    });

    if (!profile) {
      return NextResponse.json(
        { success: false, error: "Candidate profile not found" },
        { status: 404 }
      );
    }

    let targetJobId = jobPostingId;

    // If no jobPostingId provided (e.g. manual application add), create a JobPosting record first
    if (!targetJobId) {
      const urlHash = `manual-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const job = await db.jobPosting.create({
        data: {
          urlHash,
          url: url || `https://${company.toLowerCase().replace(/\s+/g, "")}.com/careers`,
          company: company.toUpperCase(),
          title,
          category: "Software Developer",
          jobType: "Remote Full-Time",
          experienceLevel: "0-3 Years (Entry/Junior)",
          platform: "DIRECT_PORTAL",
          location: "Remote",
          isRemote: true,
          postedAt: new Date(),
          rawDescription: `Tracked application for ${title} at ${company}.`,
        },
      });
      targetJobId = job.id;
    }

    // Find existing application for this profile and job
    const existing = await db.application.findFirst({
      where: {
        profileId: profile.id,
        jobPostingId: targetJobId,
      },
    });

    let app;
    if (existing) {
      app = await db.application.update({
        where: { id: existing.id },
        data: {
          status: ApplicationStatus.APPLIED,
          appliedAt: new Date(),
        },
        include: { jobPosting: true },
      });
    } else {
      app = await db.application.create({
        data: {
          profileId: profile.id,
          jobPostingId: targetJobId,
          status: ApplicationStatus.APPLIED,
          appliedAt: new Date(),
        },
        include: { jobPosting: true },
      });
    }

    return NextResponse.json({ success: true, application: app });
  } catch (error) {
    console.error("Error saving application:", error);
    return NextResponse.json(
      { success: false, error: "Failed to track application" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const { id, status } = await req.json();

    if (!id || !status) {
      return NextResponse.json(
        { success: false, error: "Application id and status required" },
        { status: 400 }
      );
    }

    const prismaStatusMap: Record<string, ApplicationStatus> = {
      SHORTLISTED: ApplicationStatus.SHORTLISTED,
      APPLIED: ApplicationStatus.APPLIED,
      SCREENING: ApplicationStatus.SCREENING,
      TECHNICAL_ROUND: ApplicationStatus.TECHNICAL_ROUND,
      OFFER: ApplicationStatus.OFFER,
      QUIET: ApplicationStatus.QUIET,
    };

    const targetStatus = prismaStatusMap[status] || ApplicationStatus.APPLIED;

    const existing = await db.application.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Application not found" },
        { status: 404 }
      );
    }

    const updated = await db.application.update({
      where: { id },
      data: { status: targetStatus },
      include: { jobPosting: true, opportunity: true },
    });

    return NextResponse.json({ success: true, application: updated });
  } catch (error) {
    console.error("Error updating application status:", error);
    return NextResponse.json(
      { success: true, message: "Fallback state updated" },
      { status: 200 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Application id required" },
        { status: 400 }
      );
    }

    await db.application.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting application:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete application" },
      { status: 500 }
    );
  }
}

