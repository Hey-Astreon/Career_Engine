import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyAutopilotToken, extractBearerToken } from "@/lib/autopilot/tokenUtils";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

/**
 * POST /api/autopilot/log
 * Records a completed autofill event to the autopilot_fills table.
 * Auth: Bearer token
 */
import { ApplicationStatus, PlatformSource } from "@prisma/client";
import { normalizeApplicationUrl } from "@/lib/exportEngine";

export async function POST(req: Request) {
  try {
    const userId = verifyAutopilotToken(extractBearerToken(req.headers.get("Authorization")) ?? "");
    if (!userId) {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 401, headers: CORS });
    }

    const body = await req.json();
    const { siteUrl, company, jobTitle, fieldsTotal, fieldsFilled, hasAiAnswers, isGatekeeper } = body as {
      siteUrl: string;
      company?: string;
      jobTitle?: string;
      fieldsTotal: number;
      fieldsFilled: number;
      hasAiAnswers?: boolean;
      isGatekeeper?: boolean;
    };

    if (!siteUrl || fieldsTotal == null || fieldsFilled == null) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400, headers: CORS });
    }
    if (
      !Number.isInteger(fieldsTotal) ||
      !Number.isInteger(fieldsFilled) ||
      fieldsTotal < 0 ||
      fieldsFilled < 0 ||
      fieldsFilled > fieldsTotal
    ) {
      return NextResponse.json({ error: "Invalid field counts" }, { status: 400, headers: CORS });
    }

    const profile = await db.profile.findFirst({
      where: { userId },
      select: { id: true },
    });

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404, headers: CORS });
    }

    const canonicalUrl = normalizeApplicationUrl(siteUrl);

    // Clean company & position (enforce BCA Title compliance: Developer, never Engineer)
    let cleanCompany = company?.trim() || "";
    let cleanTitle = jobTitle?.trim() || "";

    if (!cleanCompany) {
      try {
        const parsed = new URL(canonicalUrl);
        const parts = parsed.hostname.split(".");
        cleanCompany = parts.length > 2 ? parts[parts.length - 2] : parts[0];
        cleanCompany = cleanCompany.charAt(0).toUpperCase() + cleanCompany.slice(1);
      } catch {
        cleanCompany = "Direct Portal";
      }
    }

    if (!cleanTitle) {
      cleanTitle = "Software Developer";
    } else {
      cleanTitle = cleanTitle.replace(/\bEngineer\b/gi, "Developer");
    }

    // Detect ATS platform from URL
    let detectedPlatform: PlatformSource = PlatformSource.DIRECT_PORTAL;
    const lowerUrl = canonicalUrl.toLowerCase();
    if (lowerUrl.includes("greenhouse.io")) detectedPlatform = PlatformSource.GREENHOUSE;
    else if (lowerUrl.includes("lever.co")) detectedPlatform = PlatformSource.LEVER;
    else if (lowerUrl.includes("ashbyhq.com")) detectedPlatform = PlatformSource.ASHBY;
    else if (lowerUrl.includes("workable.com")) detectedPlatform = PlatformSource.WORKABLE;
    else if (lowerUrl.includes("smartrecruiters.com")) detectedPlatform = PlatformSource.SMARTRECRUITERS;
    else if (lowerUrl.includes("recruitee.com")) detectedPlatform = PlatformSource.RECRUITEE;

    // 1. Record raw fill telemetry
    const fill = await db.autopilotFill.create({
      data: {
        profileId: profile.id,
        siteUrl: canonicalUrl.slice(0, 500),
        company: cleanCompany.slice(0, 100),
        jobTitle: cleanTitle.slice(0, 150),
        fieldsTotal,
        fieldsFilled,
        hasAiAnswers: hasAiAnswers ?? false,
      },
    });

    // Gatekeeper & Single-Field Authentication Guard:
    // If this fill was on a gatekeeper/login step or only filled 1-2 scalar auth fields without AI/resume,
    // do NOT upsert to db.application as APPLIED. This prevents false duplicate alerts and phantom drafts.
    const isGatekeeperStep = Boolean(isGatekeeper) || (fieldsFilled <= 1 && fieldsTotal <= 2 && !hasAiAnswers);
    if (isGatekeeperStep) {
      return NextResponse.json(
        {
          success: true,
          id: fill.id,
          fillId: fill.id,
          applicationId: null,
          isGatekeeper: true,
        },
        { headers: CORS }
      );
    }

    // 2. Canonical Deduplication & Auto-Upsert in Application Pipeline
    // Look for existing application by URL or (company + title) for this profile
    const existingApp = await db.application.findFirst({
      where: {
        profileId: profile.id,
        OR: [
          { jobPosting: { url: canonicalUrl } },
          { opportunity: { canonicalAppUrl: canonicalUrl } },
          {
            AND: [
              { jobPosting: { company: cleanCompany } },
              { jobPosting: { title: cleanTitle } },
            ],
          },
        ],
      },
      include: { jobPosting: true },
    });

    let appRecord;
    const notesPayload = JSON.stringify({
      source: "ASTREPILOT",
      fieldsFilled,
      fieldsTotal,
      hasAiAnswers: Boolean(hasAiAnswers),
      confirmed: false, // 2-stage state machine: pending confirmation
      fillId: fill.id,
    });

    if (existingApp) {
      appRecord = await db.application.update({
        where: { id: existingApp.id },
        data: {
          status: ApplicationStatus.APPLIED,
          appliedAt: new Date(),
          notes: notesPayload,
        },
      });
    } else {
      // Create lightweight JobPosting representation
      const urlHash = `ap-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const job = await db.jobPosting.create({
        data: {
          urlHash,
          url: canonicalUrl,
          company: cleanCompany,
          title: cleanTitle,
          category: "Software Developer",
          jobType: "Remote Full-Time",
          experienceLevel: "0-3 Years (Entry/Junior)",
          platform: detectedPlatform,
          location: "Remote",
          isRemote: true,
          postedAt: new Date(),
          rawDescription: `Tracked application via AstrePilot for ${cleanTitle} at ${cleanCompany}.`,
        },
      });

      appRecord = await db.application.create({
        data: {
          profileId: profile.id,
          jobPostingId: job.id,
          status: ApplicationStatus.APPLIED,
          appliedAt: new Date(),
          notes: notesPayload,
        },
      });
    }

    return NextResponse.json(
      {
        success: true,
        id: fill.id,
        fillId: fill.id,
        applicationId: appRecord.id,
      },
      { headers: CORS }
    );
  } catch (err) {
    console.error("[autopilot/log]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500, headers: CORS });
  }
}

/**
 * GET /api/autopilot/log
 * Returns the autofill history for the settings page stats.
 * Auth: Bearer token
 */
export async function GET(req: Request) {
  try {
    const userId = verifyAutopilotToken(extractBearerToken(req.headers.get("Authorization")) ?? "");
    if (!userId) {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 401, headers: CORS });
    }

    const profile = await db.profile.findFirst({
      where: { userId },
      select: { id: true },
    });

    if (!profile) {
      return NextResponse.json({ stats: { fills: 0, fields: 0, hoursSaved: 0 }, history: [] }, { headers: CORS });
    }

    // History is capped for display, but stats must cover ALL fills.
    const [fills, totals] = await Promise.all([
      db.autopilotFill.findMany({
        where: { profileId: profile.id },
        orderBy: { filledAt: "desc" },
        take: 50,
      }),
      db.autopilotFill.aggregate({
        where: { profileId: profile.id },
        _count: { _all: true },
        _sum: { fieldsFilled: true },
      }),
    ]);

    const totalFills = totals._count._all;
    const totalFields = totals._sum.fieldsFilled ?? 0;
    // Each field fill saves ~1.5 min (avg job form takes 12-15 min, ~10 fields)
    const hoursSaved = Math.round((totalFields * 1.5) / 60 * 10) / 10;

    return NextResponse.json(
      {
        stats: { fills: totalFills, fields: totalFields, hoursSaved },
        history: fills.map((f) => ({
          id: f.id,
          company: f.company,
          jobTitle: f.jobTitle,
          siteUrl: f.siteUrl,
          fieldsFilled: f.fieldsFilled,
          fieldsTotal: f.fieldsTotal,
          hasAiAnswers: f.hasAiAnswers,
          filledAt: f.filledAt,
        })),
      },
      { headers: CORS }
    );
  } catch (err) {
    console.error("[autopilot/log GET]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500, headers: CORS });
  }
}
