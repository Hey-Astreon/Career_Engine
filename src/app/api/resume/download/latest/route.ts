import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { verifyAutopilotToken, extractBearerToken } from "@/lib/autopilot/tokenUtils";
import { db } from "@/lib/db";
import { selectRecommendedResumeVariant } from "@/lib/resumeVariantSelector";

export const dynamic = "force-dynamic";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
  "Access-Control-Expose-Headers": "Content-Disposition, X-Resume-Filename, X-Resume-Variant",
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const token =
      url.searchParams.get("token") ||
      extractBearerToken(req.headers.get("authorization"));

    let userId: string | null = null;
    if (token) {
      userId = verifyAutopilotToken(token);
    }

    if (!userId) {
      try {
        const session = await getServerSession(authOptions);
        if (session?.user?.id) {
          userId = session.user.id;
        }
      } catch {
        /* ignore session parse error in non-browser context */
      }
    }

    const candidateSlug = (url.searchParams.get("slug") || url.searchParams.get("candidate") || "").toLowerCase().trim();

    let profile = null;
    if (userId) {
      profile = await db.profile.findFirst({ where: { userId } });
    }

    // Graceful offline fallback: allow verified founder profiles if un-paired or direct download
    if (!profile && (candidateSlug === "roushan" || candidateSlug === "ayushi")) {
      profile = await db.profile.findFirst({ where: { slug: candidateSlug } });
    }

    // Default to roushan if no profile found and no token provided
    if (!profile && !userId) {
      profile = await db.profile.findFirst({ where: { slug: "roushan" } });
    }

    if (!profile) {
      return new NextResponse("Candidate profile not found", { status: 404, headers: CORS_HEADERS });
    }

    const session = await db.autopilotSession.findFirst({
      where: { profileId: profile.id },
      orderBy: { createdAt: "desc" },
    });

    const normalizedSlug = (profile.slug || "roushan").toLowerCase();
    const folder = normalizedSlug === "ayushi" ? "2_Ayushi_Raj" : "3_Roushan_Kumar";
    const defaultFileName = normalizedSlug === "ayushi" ? "Ayushi_Raj_Resume.pdf" : "Roushan_Kumar_Resume.pdf";

    // Auto-select specialized resume variant based on the primed job session using the 8-variant recommendation engine
    const recommended = selectRecommendedResumeVariant(
      normalizedSlug,
      session?.jobTitle || "",
      session?.jdText || "",
      session?.company || ""
    );
    let targetFileName = recommended.fileName || defaultFileName;

    const basePath = path.join(process.cwd(), "public", "candidates", folder);
    let resolvedPath = path.join(basePath, targetFileName);

    if (!fs.existsSync(resolvedPath)) {
      resolvedPath = path.join(basePath, defaultFileName);
    }

    // Secondary fallback: find any PDF in candidate folder
    if (!fs.existsSync(resolvedPath)) {
      if (fs.existsSync(basePath)) {
        const anyPdf = fs.readdirSync(basePath).find((f) => f.toLowerCase().endsWith(".pdf"));
        if (anyPdf) {
          resolvedPath = path.join(basePath, anyPdf);
        }
      }
    }

    if (!fs.existsSync(resolvedPath)) {
      console.error(`[Resume Download] File not found on disk at: ${resolvedPath}`);
      return new NextResponse("Resume file not found on disk", { status: 404 });
    }

    const fileBuffer = await fs.promises.readFile(resolvedPath);
    const candidateName = profile.fullName?.replace(/[^a-zA-Z0-9]/g, "_") || "Candidate";
    const company = session?.company?.replace(/[^a-zA-Z0-9]/g, "_") || "Job";
    const downloadFileName = `${candidateName}_Resume_${company}.pdf`;

    return new Response(fileBuffer, {
      status: 200,
      headers: {
        ...CORS_HEADERS,
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${downloadFileName}"`,
        "Content-Length": fileBuffer.length.toString(),
        "Cache-Control": "private, max-age=3600",
        "X-Resume-Filename": downloadFileName,
        "X-Resume-Variant": targetFileName,
      },
    });
  } catch (error) {
    console.error("[Resume Download Error]:", error);
    return new NextResponse("Internal Server Error", { status: 500, headers: CORS_HEADERS });
  }
}
