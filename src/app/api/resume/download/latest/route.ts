import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { verifyAutopilotToken } from "@/lib/autopilot/tokenUtils";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");

    if (!token) {
      return new NextResponse("Unauthorized: Token missing", { status: 401 });
    }

    const userId = verifyAutopilotToken(token);
    if (!userId) {
      return new NextResponse("Unauthorized: Invalid or expired token", { status: 401 });
    }

    const profile = await db.profile.findFirst({ where: { userId } });
    if (!profile) {
      return new NextResponse("Candidate profile not found", { status: 404 });
    }

    const session = await db.autopilotSession.findFirst({
      where: { profileId: profile.id },
      orderBy: { createdAt: "desc" },
    });

    const normalizedSlug = (profile.slug || "roushan").toLowerCase();
    const folder = normalizedSlug === "ayushi" ? "2_Ayushi_Raj" : "3_Roushan_Kumar";
    const defaultFileName = normalizedSlug === "ayushi" ? "Ayushi_Raj_Resume.pdf" : "Roushan_Kumar_Resume.pdf";

    // Auto-select specialized resume variant based on extracted job requirements
    let targetFileName = defaultFileName;
    const jobTitle = (session?.jobTitle || "").toLowerCase();

    if (normalizedSlug === "roushan") {
      if (jobTitle.includes("full stack") || jobTitle.includes("frontend") || jobTitle.includes("web")) {
        targetFileName = "Roushan_Kumar_Full_Stack_Developer_Resume.pdf";
      } else if (jobTitle.includes("backend") || jobTitle.includes("distributed") || jobTitle.includes("system") || jobTitle.includes("cloud")) {
        targetFileName = "Roushan_Kumar_Backend_Developer_Resume.pdf";
      } else if (jobTitle.includes("ai") || jobTitle.includes("machine learning") || jobTitle.includes("llm") || jobTitle.includes("deep learning")) {
        targetFileName = "Roushan_Kumar_AI_Developer_Resume.pdf";
      } else if (jobTitle.includes("python")) {
        targetFileName = "Roushan_Kumar_Python_Developer_Resume.pdf";
      }
    } else if (normalizedSlug === "ayushi") {
      if (jobTitle.includes("ai") || jobTitle.includes("product") || jobTitle.includes("machine learning")) {
        targetFileName = "Ayushi_Raj_AI_Product_Developer_Resume.pdf";
      } else if (jobTitle.includes("full stack") || jobTitle.includes("frontend")) {
        targetFileName = "Ayushi_Raj_Full_Stack_Developer_Resume.pdf";
      } else if (jobTitle.includes("backend")) {
        targetFileName = "Ayushi_Raj_Backend_Developer_Resume.pdf";
      }
    }

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
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${downloadFileName}"`,
        "Content-Length": fileBuffer.length.toString(),
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error) {
    console.error("[Resume Download Error]:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
