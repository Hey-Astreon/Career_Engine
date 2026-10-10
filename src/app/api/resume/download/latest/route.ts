import { NextResponse } from "next/server";
import { verifyAutopilotToken } from "@/lib/autopilot/tokenUtils";
import puppeteer from "puppeteer";
import { db } from "@/lib/db";

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

    // Launch headless browser
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    // Intercept requests to inject the Bearer token for auth
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      const headers = request.headers();
      // Only inject for API routes to avoid leaking
      if (request.url().includes('/api/')) {
        headers['authorization'] = `Bearer ${token}`;
      }
      request.continue({ headers });
    });

    // Emulate screen to avoid print media quirks if any, though we want print layout
    await page.emulateMediaType('print');

    // Get the base URL (useful for absolute URLs in Puppeteer)
    const protocol = req.headers.get("x-forwarded-proto") || "http";
    const host = req.headers.get("host") || "localhost:3000";
    const baseUrl = `${protocol}://${host}`;

    // Navigate to the resume builder in headless mode
    // mode=custom&loadSession=true will trigger the auto-fetch of the session and optimization
    await page.goto(`${baseUrl}/resume-builder?mode=custom&loadSession=true&headless=true`, {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    // Generate the PDF
    // We wait an extra second to ensure React finishes any last-minute DOM updates after network idle
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 }
    });

    await browser.close();

    // Grab company name for the filename
    const profile = await db.profile.findFirst({ where: { userId } });
    const session = profile ? await db.autopilotSession.findFirst({
      where: { profileId: profile.id },
      orderBy: { createdAt: "desc" }
    }) : null;
    
    const candidateName = profile?.fullName?.replace(/[^a-zA-Z0-9]/g, "_") || "Candidate";
    const company = session?.company?.replace(/[^a-zA-Z0-9]/g, "_") || "Company";
    const filename = `${candidateName}_Resume_${company}.pdf`;

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    });

  } catch (error) {
    console.error("PDF generation failed:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
