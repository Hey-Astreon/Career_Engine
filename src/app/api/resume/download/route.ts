import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  canAccessProfile,
  isDeveloperEmail,
  getDeveloperDefaultSlug,
} from "@/lib/authCandidate";

export const dynamic = "force-dynamic";

/**
 * Resolves the absolute path of a candidate's locked PDF resume on disk.
 * Strictly prevents path traversal attacks and checks multiple workspace locations.
 */
function resolveCandidatePdf(slug: string, rawFileName?: string | null): { resolvedPath: string; fileName: string } | null {
  const normalizedSlug = (slug || "roushan").toLowerCase();
  const folder = normalizedSlug === "ayushi" ? "2_Ayushi_Raj" : "3_Roushan_Kumar";
  const defaultFileName = normalizedSlug === "ayushi" ? "Ayushi_Raj_Resume.pdf" : "Roushan_Kumar_Resume.pdf";

  // Sanitize fileName to prevent directory traversal
  let safeFileName = defaultFileName;
  if (rawFileName && typeof rawFileName === "string") {
    const base = path.basename(rawFileName.trim());
    if (base.toLowerCase().endsWith(".pdf")) {
      safeFileName = base;
    }
  }

  const candidateBasePath = path.join(process.cwd(), "public", "candidates", folder);

  // 1. Try exact requested fileName
  const targetPath = path.join(candidateBasePath, safeFileName);
  if (fs.existsSync(/*turbopackIgnore: true*/ targetPath)) {
    return {
      resolvedPath: targetPath.replace(/\\/g, "/"),
      fileName: safeFileName,
    };
  }

  // 2. Try Developer alias if Engineer was requested
  if (safeFileName.includes("_Engineer_")) {
    const devAlias = safeFileName.replace("_Engineer_", "_Developer_");
    const devPath = path.join(candidateBasePath, devAlias);
    if (fs.existsSync(/*turbopackIgnore: true*/ devPath)) {
      return {
        resolvedPath: devPath.replace(/\\/g, "/"),
        fileName: devAlias,
      };
    }
  }

  // 3. Fallback to default canonical resume
  const fallbackPath = path.join(candidateBasePath, defaultFileName);
  if (fs.existsSync(/*turbopackIgnore: true*/ fallbackPath)) {
    return {
      resolvedPath: fallbackPath.replace(/\\/g, "/"),
      fileName: defaultFileName,
    };
  }

  return null;
}


export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const sessionUser = session?.user;
    if (!sessionUser || !sessionUser.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const fileNameParam = searchParams.get("fileName") || searchParams.get("variant") || searchParams.get("file");
    let slugParam = searchParams.get("slug") || searchParams.get("profileSlug");

    if (!slugParam) {
      if (isDeveloperEmail(sessionUser.email)) {
        slugParam = getDeveloperDefaultSlug(sessionUser.email);
      } else {
        const userProf = await db.profile.findFirst({ where: { userId: sessionUser.id } });
        slugParam = userProf?.slug || null;
      }
    }

    if (!slugParam) {
      return NextResponse.json(
        { success: false, error: "Candidate profile not found" },
        { status: 404 }
      );
    }

    const profile = await db.profile.findUnique({
      where: { slug: slugParam },
    });

    if (!profile) {
      return NextResponse.json(
        { success: false, error: "Candidate profile not found" },
        { status: 404 }
      );
    }

    if (!canAccessProfile(sessionUser, profile)) {
      return NextResponse.json(
        { success: false, error: "Forbidden: You do not have permission to access this candidate's resume" },
        { status: 403 }
      );
    }

    const isInline = searchParams.get("view") === "inline" || searchParams.get("preview") === "true";
    const resolved = resolveCandidatePdf(slugParam, fileNameParam);

    if (!resolved) {
      return NextResponse.json(
        { success: false, error: "Resume PDF file not found on disk" },
        { status: 404 }
      );
    }

    const fileBuffer = await fs.promises.readFile(resolved.resolvedPath);
    const dispositionType = isInline ? "inline" : "attachment";

    return new Response(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${dispositionType}; filename="${resolved.fileName}"`,
        "Content-Length": fileBuffer.length.toString(),
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error) {
    console.error("[Resume Download Error]:", error);
    return NextResponse.json(
      { success: false, error: "Failed to read or stream resume PDF" },
      { status: 500 }
    );
  }
}

export async function HEAD(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const sessionUser = session?.user;
    if (!sessionUser || !sessionUser.id) {
      return new Response(null, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const fileNameParam = searchParams.get("fileName") || searchParams.get("variant") || searchParams.get("file");
    let slugParam = searchParams.get("slug") || searchParams.get("profileSlug");

    if (!slugParam) {
      if (isDeveloperEmail(sessionUser.email)) {
        slugParam = getDeveloperDefaultSlug(sessionUser.email);
      } else {
        const userProf = await db.profile.findFirst({ where: { userId: sessionUser.id } });
        slugParam = userProf?.slug || null;
      }
    }

    if (!slugParam) {
      return new Response(null, { status: 404 });
    }

    const profile = await db.profile.findUnique({
      where: { slug: slugParam },
    });

    if (!profile || !canAccessProfile(sessionUser, profile)) {
      return new Response(null, { status: 403 });
    }

    const resolved = resolveCandidatePdf(slugParam, fileNameParam);

    if (!resolved) {
      return new Response(null, { status: 404 });
    }

    const stats = await fs.promises.stat(resolved.resolvedPath);

    return new Response(null, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Length": stats.size.toString(),
        "Last-Modified": stats.mtime.toUTCString(),
      },
    });
  } catch {
    return new Response(null, { status: 500 });
  }
}
