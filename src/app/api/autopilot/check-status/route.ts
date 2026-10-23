import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyAutopilotToken, extractBearerToken } from "@/lib/autopilot/tokenUtils";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { normalizeApplicationUrl } from "@/lib/exportEngine";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

/**
 * POST /api/autopilot/check-status
 * Pre-flight check verifying if candidate has already applied to a job.
 * Guards against duplicate submissions and multi-tab race conditions.
 * Auth: Bearer token (AstrePilot) or NextAuth session (Workspace UI)
 */
export async function POST(req: Request) {
  try {
    let userId: string | null = null;

    // 1. Check Bearer token (AstrePilot Extension)
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      userId = verifyAutopilotToken(extractBearerToken(authHeader) ?? "");
    }

    // 2. Check NextAuth session (Workspace UI) with defensive try/catch
    if (!userId) {
      try {
        const session = await getServerSession(authOptions);
        userId = session?.user?.id ?? null;
      } catch {
        userId = null;
      }
    }

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: CORS });
    }

    const profile = await db.profile.findFirst({
      where: { userId },
      select: { id: true },
    });

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404, headers: CORS });
    }

    const body = await req.json().catch(() => ({}));
    const { siteUrl, company, jobTitle } = body as {
      siteUrl?: string;
      company?: string;
      jobTitle?: string;
    };

    if (!siteUrl && !company) {
      return NextResponse.json({ exists: false, application: null }, { headers: CORS });
    }

    const canonicalUrl = normalizeApplicationUrl(siteUrl || "");
    const cleanCompany = (company || "").trim();
    const cleanTitle = (jobTitle || "").trim().replace(/\bengineer\b/gi, "Developer");

    const orConditions: any[] = [];

    if (canonicalUrl && canonicalUrl.length > 10 && !canonicalUrl.includes("localhost") && !canonicalUrl.includes("testbench")) {
      orConditions.push({ jobPosting: { url: canonicalUrl } });
      orConditions.push({ opportunity: { canonicalAppUrl: canonicalUrl } });
    }

    if (cleanCompany) {
      const companyConditions: any[] = [{ jobPosting: { company: cleanCompany } }];
      if (cleanTitle) {
        companyConditions.push({ jobPosting: { title: cleanTitle } });
      }
      orConditions.push({ AND: companyConditions });
    }

    if (orConditions.length === 0) {
      return NextResponse.json({ exists: false, application: null }, { headers: CORS });
    }

    const existingApp = await db.application.findFirst({
      where: {
        profileId: profile.id,
        OR: orConditions,
      },
      include: {
        jobPosting: true,
        opportunity: true,
      },
      orderBy: { createdAt: "desc" },
    });

    if (!existingApp) {
      return NextResponse.json({ exists: false, application: null }, { headers: CORS });
    }

    const appDate = existingApp.appliedAt || existingApp.createdAt;
    const diffMs = Date.now() - new Date(appDate).getTime();
    const daysAgo = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));

    let parsedNotes: Record<string, any> = {};
    if (existingApp.notes) {
      try {
        if (existingApp.notes.startsWith("{")) {
          parsedNotes = JSON.parse(existingApp.notes);
        }
      } catch {
        /* fallback */
      }
    }

    const companyName = existingApp.opportunity?.company || existingApp.jobPosting?.company || cleanCompany || "Company";
    const titleName = existingApp.opportunity?.title || existingApp.jobPosting?.title || cleanTitle || "Software Developer";

    return NextResponse.json(
      {
        exists: true,
        application: {
          id: existingApp.id,
          company: companyName,
          title: titleName,
          status: existingApp.status,
          confirmed: parsedNotes.confirmed !== false,
          appliedAt: appDate.toISOString(),
          daysAgo,
          source: parsedNotes.source || (existingApp.jobPosting?.platform ? String(existingApp.jobPosting.platform) : "DIRECT_PORTAL"),
        },
      },
      { headers: CORS }
    );
  } catch (err) {
    console.error("[autopilot/check-status]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500, headers: CORS });
  }
}
