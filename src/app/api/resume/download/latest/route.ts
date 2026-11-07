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
    try {
      if (userId) {
        profile = await db.profile.findFirst({ where: { userId } });
      }

      // Graceful founder fallback: allow verified founder profiles if unlinked in database
      if (!profile && (candidateSlug === "roushan" || candidateSlug === "ayushi")) {
        profile = await db.profile.findFirst({ where: { slug: candidateSlug } });
      }

      // Default to roushan if no profile found
      if (!profile) {
        profile = await db.profile.findFirst({ where: { slug: "roushan" } });
      }
    } catch (dbErr) {
      console.warn("[Resume Download] Database lookup error, using founder fallback:", dbErr);
    }

    let session = null;
    try {
      if (profile) {
        session = await db.autopilotSession.findFirst({
          where: { profileId: profile.id },
          orderBy: { createdAt: "desc" },
        });
      }
    } catch (sessionErr) {
      console.warn("[Resume Download] Session lookup error:", sessionErr);
    }

    const normalizedSlug = (profile?.slug || candidateSlug || "roushan").toLowerCase();
    const folder = normalizedSlug === "ayushi" ? "2_Ayushi_Raj" : "3_Roushan_Kumar";
    const defaultFileName = normalizedSlug === "ayushi" ? "Ayushi_Raj_Resume.pdf" : "Roushan_Kumar_Resume.pdf";

    // Auto-select specialized resume variant based on the primed job session using the 8-variant recommendation engine
    const recommended = selectRecommendedResumeVariant(
      normalizedSlug,
      session?.jobTitle || "",
      session?.jdText || "",
      session?.company || ""
    );
    const targetFileName = recommended.fileName || defaultFileName;

    // Robust multi-path resolution across dev, standalone build, and Docker ARM64 container
    const possibleBasePaths = [
      path.join(process.cwd(), "public", "candidates", folder),
      path.join(process.cwd(), ".next", "standalone", "public", "candidates", folder),
      path.resolve(process.cwd(), "..", "public", "candidates", folder),
    ];

    let resolvedPath = "";
    for (const bp of possibleBasePaths) {
      if (fs.existsSync(bp)) {
        const candidateFile = path.join(bp, targetFileName);
        if (fs.existsSync(candidateFile)) {
          resolvedPath = candidateFile;
          break;
        }
        const defaultFile = path.join(bp, defaultFileName);
        if (fs.existsSync(defaultFile)) {
          resolvedPath = defaultFile;
          break;
        }
        const anyPdf = fs.readdirSync(bp).find((f) => f.toLowerCase().endsWith(".pdf"));
        if (anyPdf) {
          resolvedPath = path.join(bp, anyPdf);
          break;
        }
      }
    }

    if (!resolvedPath || !fs.existsSync(resolvedPath)) {
      console.error(`[Resume Download] File not found on disk for folder: ${folder}`);
      return new NextResponse(JSON.stringify({ error: "Resume file not found on disk" }), {
        status: 404,
        headers: {
          ...CORS_HEADERS,
          "Content-Type": "application/json",
        },
      });
    }

    const fileBuffer = await fs.promises.readFile(resolvedPath);
    const candidateName = profile?.fullName?.replace(/[^a-zA-Z0-9]/g, "_") || (normalizedSlug === "ayushi" ? "AYUSHI_RAJ" : "ROUSHAN_KUMAR");
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
