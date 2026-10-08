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
export async function POST(req: Request) {
  try {
    const userId = verifyAutopilotToken(extractBearerToken(req.headers.get("Authorization")) ?? "");
    if (!userId) {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 401, headers: CORS });
    }

    const body = await req.json();
    const { siteUrl, company, jobTitle, fieldsTotal, fieldsFilled, hasAiAnswers } = body as {
      siteUrl: string;
      company?: string;
      jobTitle?: string;
      fieldsTotal: number;
      fieldsFilled: number;
      hasAiAnswers?: boolean;
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

    let profile = await db.profile.findFirst({
      where: { userId },
      select: { id: true },
    });

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404, headers: CORS });
    }

    const fill = await db.autopilotFill.create({
      data: {
        profileId: profile.id,
        siteUrl: siteUrl.slice(0, 500), // cap URL length
        company: company?.slice(0, 100) ?? null,
        jobTitle: jobTitle?.slice(0, 150) ?? null,
        fieldsTotal,
        fieldsFilled,
        hasAiAnswers: hasAiAnswers ?? false,
      },
    });

    return NextResponse.json({ success: true, id: fill.id }, { headers: CORS });
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

    let profile = await db.profile.findFirst({
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
