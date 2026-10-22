import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { ApplicationStatus } from "@prisma/client";
import {
  canAccessProfile,
  isDeveloperEmail,
  getDeveloperDefaultSlug,
} from "@/lib/authCandidate";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const sessionUser = session?.user;
    const currentUserId = sessionUser?.id || null;

    if (!sessionUser || !currentUserId) {
      return NextResponse.json({ success: true, applications: [] });
    }

    const { searchParams } = new URL(req.url);
    let profileSlug = searchParams.get("profileSlug");

    if (!profileSlug) {
      if (isDeveloperEmail(sessionUser.email)) {
        profileSlug = getDeveloperDefaultSlug(sessionUser.email);
      } else {
        const userProf = await db.profile.findFirst({ where: { userId: currentUserId } });
        profileSlug = userProf?.slug || null;
      }
    }

    if (!profileSlug) {
      return NextResponse.json({ success: true, applications: [] });
    }

    const profile = await db.profile.findUnique({
      where: { slug: profileSlug },
    });

    if (!profile) {
      return NextResponse.json({ success: true, applications: [] });
    }

    // Allow reading applications if user has authorized access (co-developers or profile owner)
    if (!canAccessProfile(sessionUser, profile)) {
      return NextResponse.json({ success: false, error: "Forbidden: You do not have permission to access this candidate profile" }, { status: 403 });
    }

    const applications = await db.application.findMany({
      where: { profileId: profile.id },
      include: { jobPosting: true, opportunity: true },
      orderBy: { createdAt: "desc" },
    });

    const now = Date.now();
    const formattedApps = applications.map((app, index) => {
      const baseDate = app.appliedAt || app.createdAt;
      const diffMs = now - new Date(baseDate).getTime();
      const daysSilent = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));

      let currentStatus: string = app.status;
      if (daysSilent >= 10 && app.status === ApplicationStatus.APPLIED) {
        currentStatus = "QUIET";
      }

      let parsedNotes: {
        source?: string;
        fieldsFilled?: number;
        fieldsTotal?: number;
        hasAiAnswers?: boolean;
        confirmed?: boolean;
      } = {};

      if (app.notes) {
        try {
          if (app.notes.startsWith("{") && app.notes.endsWith("}")) {
            parsedNotes = JSON.parse(app.notes);
          } else if (app.notes.includes("AstrePilot")) {
            parsedNotes.source = "ASTREPILOT";
          }
        } catch {
          /* fallback */
        }
      }

      const companyName = app.opportunity?.company || app.jobPosting?.company || "Direct Portal";
      const jobTitle = app.opportunity?.title || app.jobPosting?.title || "Software Developer";
      const url = app.opportunity?.canonicalAppUrl || app.jobPosting?.url || "";
      const source = parsedNotes.source || (app.jobPosting?.platform ? String(app.jobPosting.platform) : "DIRECT_PORTAL");

      return {
        id: app.id,
        slNo: index + 1,
        company: companyName,
        title: jobTitle,
        status: currentStatus,
        confirmed: parsedNotes.confirmed !== false,
        source: source === "ASTREPILOT" ? "⚡ AstrePilot Autofill" : source,
        fieldsFilled: parsedNotes.fieldsFilled ?? null,
        fieldsTotal: parsedNotes.fieldsTotal ?? null,
        hasAiAnswers: Boolean(parsedNotes.hasAiAnswers),
        appliedDate: new Date(baseDate).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
        appliedDateFull: new Date(baseDate).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
        appliedAtIso: new Date(baseDate).toISOString(),
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
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { jobPostingId, company, title, url } = body;
    let { profileSlug } = body;

    if (!profileSlug) {
      if (isDeveloperEmail(session.user.email)) {
        profileSlug = getDeveloperDefaultSlug(session.user.email);
      } else {
        const userProf = await db.profile.findFirst({ where: { userId: session.user.id } });
        profileSlug = userProf?.slug || null;
      }
    }

    if (!profileSlug) {
      return NextResponse.json(
        { success: false, error: "Candidate profile not found. Please complete profile setup." },
        { status: 404 }
      );
    }

    const profile = await db.profile.findUnique({
      where: { slug: profileSlug },
    });

    if (!profile) {
      return NextResponse.json(
        { success: false, error: "Candidate profile not found" },
        { status: 404 }
      );
    }

    // Allow creating application if user has authorized access (co-developers or profile owner)
    if (!canAccessProfile(session.user, profile)) {
      return NextResponse.json({ success: false, error: "Forbidden: You do not have permission to access this candidate profile" }, { status: 403 });
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

    // Resolve canonical opportunityId if targetJobId belongs to a tracked opportunity
    let resolvedOpportunityId: string | undefined = undefined;
    if (targetJobId) {
      const occurrence = await db.jobOccurrence.findFirst({
        where: { sourceJobId: targetJobId },
        select: { opportunityId: true },
      });
      if (occurrence?.opportunityId) {
        resolvedOpportunityId = occurrence.opportunityId;
      }
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
          ...(resolvedOpportunityId && !existing.opportunityId ? { opportunityId: resolvedOpportunityId } : {}),
        },
        include: { jobPosting: true, opportunity: true },
      });
    } else {
      app = await db.application.create({
        data: {
          profileId: profile.id,
          jobPostingId: targetJobId,
          opportunityId: resolvedOpportunityId,
          status: ApplicationStatus.APPLIED,
          appliedAt: new Date(),
        },
        include: { jobPosting: true, opportunity: true },
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
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id, status, confirmed } = await req.json();

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Application id required" },
        { status: 400 }
      );
    }

    const existing = await db.application.findUnique({
      where: { id },
      include: { profile: true },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Application not found" },
        { status: 404 }
      );
    }

    if (!canAccessProfile(session.user, existing.profile)) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const updateData: Record<string, any> = {};

    if (status) {
      const prismaStatusMap: Record<string, ApplicationStatus> = {
        DISCOVERED: ApplicationStatus.DISCOVERED,
        SHORTLISTED: ApplicationStatus.SHORTLISTED,
        APPLIED: ApplicationStatus.APPLIED,
        SCREENING: ApplicationStatus.SCREENING,
        TECHNICAL_ROUND: ApplicationStatus.TECHNICAL_ROUND,
        OFFER: ApplicationStatus.OFFER,
        REJECTED: ApplicationStatus.REJECTED,
        QUIET: ApplicationStatus.QUIET,
      };
      updateData.status = prismaStatusMap[status] || ApplicationStatus.APPLIED;
    }

    if (confirmed !== undefined) {
      let notesObj: Record<string, any> = {};
      if (existing.notes) {
        try {
          if (existing.notes.startsWith("{")) {
            notesObj = JSON.parse(existing.notes);
          } else {
            notesObj = { rawNotes: existing.notes };
          }
        } catch {
          notesObj = { rawNotes: existing.notes };
        }
      }
      notesObj.confirmed = Boolean(confirmed);
      if (confirmed) {
        notesObj.confirmedAt = new Date().toISOString();
        updateData.appliedAt = new Date();
      }
      updateData.notes = JSON.stringify(notesObj);
    }

    const updated = await db.application.update({
      where: { id },
      data: updateData,
      include: { jobPosting: true, opportunity: true },
    });

    return NextResponse.json({ success: true, application: updated });
  } catch (error) {
    console.error("Error updating application status:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update application status" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Application id required" },
        { status: 400 }
      );
    }

    const app = await db.application.findUnique({
      where: { id },
      include: { profile: true },
    });

    if (!app) {
      return NextResponse.json({ success: false, error: "Application not found" }, { status: 404 });
    }

    if (app.profile.userId !== session.user.id) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
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

