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
import {
  ExportableApplication,
  generateApplicationsCsv,
  generateApplicationsExcelXml,
  generateApplicationsSemanticXml,
  generateApplicationsTsv,
} from "@/lib/exportEngine";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const sessionUser = session?.user;
    const currentUserId = sessionUser?.id || null;

    if (!sessionUser || !currentUserId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const format = (searchParams.get("format") || "csv").toLowerCase();
    const filter = (searchParams.get("filter") || "all").toLowerCase();
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
      return NextResponse.json({ success: false, error: "Profile not found" }, { status: 404 });
    }

    const profile = await db.profile.findUnique({
      where: { slug: profileSlug },
    });

    if (!profile) {
      return NextResponse.json({ success: false, error: "Candidate profile not found" }, { status: 404 });
    }

    // Enforce Section 6 Developer Co-Ownership Privacy & Candidate Context Isolation
    if (!canAccessProfile(sessionUser, profile)) {
      return NextResponse.json(
        { success: false, error: "Forbidden: You do not have permission to export this candidate profile" },
        { status: 403 }
      );
    }

    const rawApplications = await db.application.findMany({
      where: { profileId: profile.id },
      include: { jobPosting: true, opportunity: true },
      orderBy: { createdAt: "desc" },
    });

    const now = Date.now();
    const mappedRecords: ExportableApplication[] = rawApplications.map((app, index) => {
      const baseDate = app.appliedAt || app.createdAt;
      const diffMs = now - new Date(baseDate).getTime();
      const daysSilent = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));

      let currentStatus: string = app.status;
      if (daysSilent >= 10 && app.status === ApplicationStatus.APPLIED) {
        currentStatus = "QUIET";
      }

      // Parse metadata from notes
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
      const source = parsedNotes.source || (app.jobPosting?.platform ? String(app.jobPosting.platform) : "Direct Portal");

      return {
        slNo: index + 1,
        company: companyName,
        position: jobTitle,
        appliedDate: new Date(baseDate).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
        appliedAtIso: new Date(baseDate).toISOString(),
        status: currentStatus,
        confirmed: parsedNotes.confirmed !== false,
        daysSilent,
        formUrl: url,
        source: source === "ASTREPILOT" ? "⚡ AstrePilot Autofill" : source,
        fieldsFilled: parsedNotes.fieldsFilled ?? null,
        fieldsTotal: parsedNotes.fieldsTotal ?? null,
        hasAiAnswers: Boolean(parsedNotes.hasAiAnswers),
        atsScore: app.atsExtractabilityScore ?? null,
      };
    });

    // Apply quick filters if specified
    const filteredRecords = mappedRecords.filter((r) => {
      if (filter === "astrepilot") {
        return r.source.includes("AstrePilot");
      }
      if (filter === "in_flight") {
        return ["SHORTLISTED", "APPLIED", "SCREENING", "TECHNICAL_ROUND"].includes(r.status);
      }
      if (filter === "quiet") {
        return r.status === "QUIET" || (r.status === "APPLIED" && r.daysSilent >= 5);
      }
      if (filter === "offer") {
        return r.status === "OFFER";
      }
      return true;
    });

    // Re-index slNo for filtered records
    const finalRecords = filteredRecords.map((r, i) => ({ ...r, slNo: i + 1 }));

    const dateSlug = new Date().toISOString().split("T")[0];
    const candidateSlug = profile.fullName.toLowerCase().replace(/[^a-z0-9]/g, "_");

    if (format === "csv") {
      const csvContent = generateApplicationsCsv(finalRecords);
      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${candidateSlug}_applications_${dateSlug}.csv"`,
          "Cache-Control": "no-store",
        },
      });
    }

    if (format === "xlsx" || format === "excel" || format === "xls") {
      const excelXml = generateApplicationsExcelXml(finalRecords, profile.fullName);
      return new NextResponse(excelXml, {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.ms-excel; charset=utf-8",
          "Content-Disposition": `attachment; filename="${candidateSlug}_applications_${dateSlug}.xls"`,
          "Cache-Control": "no-store",
        },
      });
    }

    if (format === "xml") {
      const xmlData = generateApplicationsSemanticXml(finalRecords, profile.fullName);
      return new NextResponse(xmlData, {
        status: 200,
        headers: {
          "Content-Type": "application/xml; charset=utf-8",
          "Content-Disposition": `attachment; filename="${candidateSlug}_applications_${dateSlug}.xml"`,
          "Cache-Control": "no-store",
        },
      });
    }

    if (format === "tsv") {
      const tsvContent = generateApplicationsTsv(finalRecords);
      return new NextResponse(tsvContent, {
        status: 200,
        headers: {
          "Content-Type": "text/tab-separated-values; charset=utf-8",
          "Content-Disposition": `attachment; filename="${candidateSlug}_applications_${dateSlug}.tsv"`,
          "Cache-Control": "no-store",
        },
      });
    }

    return NextResponse.json({ error: `Unsupported format: ${format}` }, { status: 400 });
  } catch (err) {
    console.error("[api/applications/export]", err);
    return NextResponse.json({ success: false, error: "Failed to generate application export" }, { status: 500 });
  }
}
