import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";

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

  const candidatePaths = [
    `x:/Career_Engine/${folder}/14_final_documents/${safeFileName}`,
    `x:/Career_Engine/${folder}/${safeFileName}`,
    path.resolve(process.cwd(), "..", folder, "14_final_documents", safeFileName),
    path.resolve(process.cwd(), "..", folder, safeFileName),
    // Fallback to default master resume if a specific variant is missing
    `x:/Career_Engine/${folder}/14_final_documents/${defaultFileName}`,
    `x:/Career_Engine/${folder}/${defaultFileName}`,
    path.resolve(process.cwd(), "..", folder, "14_final_documents", defaultFileName),
  ];

  for (const candidate of candidatePaths) {
    if (fs.existsSync(candidate)) {
      return {
        resolvedPath: candidate.replace(/\\/g, "/"),
        fileName: path.basename(candidate),
      };
    }
  }

  return null;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const fileNameParam = searchParams.get("fileName") || searchParams.get("variant") || searchParams.get("file");
    const slugParam = searchParams.get("slug") || searchParams.get("profileSlug") || "roushan";
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
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
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
    const { searchParams } = new URL(req.url);
    const fileNameParam = searchParams.get("fileName") || searchParams.get("variant") || searchParams.get("file");
    const slugParam = searchParams.get("slug") || searchParams.get("profileSlug") || "roushan";

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
