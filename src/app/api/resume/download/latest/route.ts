import { NextResponse } from "next/server";
import { verifyAutopilotToken } from "@/lib/autopilot/tokenUtils";
import puppeteer from "puppeteer";
import { db } from "@/lib/db";

// Allow execution to take up to 30 seconds (if hosted on environments that read this)
export const maxDuration = 30;

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");

    if (!token) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const userId = verifyAutopilotToken(token);
    if (!userId) {
      return new NextResponse("Invalid or expired token", { status: 401 });
    }

    // Launch headless browser using standard puppeteer.
    // In Docker, it uses the system chromium via ENV variable.
    // Locally, it uses the auto-downloaded Chromium.
    const browser = await puppeteer.launch({
      headless: true,
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
    });

    const page = await browser.newPage();

    // Intercept requests to inject the Bearer token for auth
    await page.setRequestInterception(true);
    page.on("request", (request) => {
      const headers = request.headers();
      if (request.url().includes("/api/")) {
        headers["authorization"] = `Bearer ${token}`;
      }
      request.continue({ headers });
    });

    // Emulate print media
    await page.emulateMediaType("print");

    const protocol = req.headers.get("x-forwarded-proto") || "http";
    const host = req.headers.get("host") || "localhost:3000";
    const baseUrl = `${protocol}://${host}`;

    // Navigate to the resume builder in headless mode
    await page.goto(`${baseUrl}/resume-builder?mode=custom&loadSession=true&headless=true`, {
      waitUntil: "networkidle0",
      timeout: 30000,
    });

    // Wait an extra second for React to finish rendering
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    });

    await browser.close();

    const profile = await db.profile.findFirst({ where: { userId } });
    const session = profile
      ? await db.autopilotSession.findFirst({
          where: { profileId: profile.id },
          orderBy: { createdAt: "desc" },
        })
      : null;

    const candidateName = profile?.fullName?.replace(/[^a-zA-Z0-9]/g, "_") || "Candidate";
    const company = session?.company?.replace(/[^a-zA-Z0-9]/g, "_") || "Company";
    const filename = `${candidateName}_Resume_${company}.pdf`;

    return new NextResponse(pdfBuffer as any, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("PDF generation failed:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
