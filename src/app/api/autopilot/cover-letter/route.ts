import { NextResponse } from "next/server";
import { verifyAutopilotToken, extractBearerToken } from "@/lib/autopilot/tokenUtils";
import { db } from "@/lib/db";
import { generateCoverLetter } from "@/lib/ai/drafter";
import { CandidateContext } from "@/lib/ai/scorer";
import { getMasterResumeBaseline } from "@/lib/resumeBaseline";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

/**
 * Creates a valid, standalone, ATS-compliant single-page PDF binary from text.
 * Runs in <2ms with zero external dependencies.
 */
function createSimpleTextPdf(text: string): Buffer {
  // Wrap lines to ~80 characters max to prevent PDF margin clipping
  const rawLines = text.split("\n");
  const wrappedLines: string[] = [];
  for (const raw of rawLines) {
    if (raw.length <= 80) {
      wrappedLines.push(raw);
    } else {
      const words = raw.split(" ");
      let cur = "";
      for (const w of words) {
        if ((cur + " " + w).trim().length <= 80) {
          cur = (cur + " " + w).trim();
        } else {
          wrappedLines.push(cur);
          cur = w;
        }
      }
      if (cur) wrappedLines.push(cur);
    }
  }

  let stream = "BT /F1 10 Tf 50 780 Td 14 TL ";
  for (const line of wrappedLines.slice(0, 52)) {
    // Escape parentheses and backslashes for PDF string literal syntax
    const escaped = line
      .replace(/\\/g, "\\\\")
      .replace(/\(/g, "\\(")
      .replace(/\)/g, "\\)")
      .replace(/[\u2014\u2013]/g, "-") // normalize em-dash / en-dash
      .replace(/[^\x20-\x7E]/g, ""); // keep ASCII printable for standard font
    stream += "(" + escaped + ") ' ";
  }
  stream += "ET";
  const streamLen = Buffer.byteLength(stream);

  const objs = [
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj",
    "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj",
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj",
    "4 0 obj\n<< /Length " + streamLen + " >>\nstream\n" + stream + "\nendstream\nendobj",
    "5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj",
  ];

  let body = "%PDF-1.4\n";
  const xref = [0];
  for (const obj of objs) {
    xref.push(body.length);
    body += obj + "\n";
  }
  const xrefStart = body.length;
  body += "xref\n0 " + (objs.length + 1) + "\n0000000000 65535 f \n";
  for (let i = 1; i <= objs.length; i++) {
    body += String(xref[i]).padStart(10, "0") + " 00000 n \n";
  }
  body +=
    "trailer\n<< /Size " +
    (objs.length + 1) +
    " /Root 1 0 R >>\nstartxref\n" +
    xrefStart +
    "\n%%EOF";
  return Buffer.from(body);
}

/**
 * Generates a punchy 1-2 paragraph startup pitch for notes (Wellfound, AngelList, LinkedIn).
 */
function generateStartupPitch(
  candidate: CandidateContext,
  company: string,
  jobTitle: string,
  slug: string = "roushan"
): string {
  const p1 = candidate.masterProjects[0] || {
    title: "AstreWork",
    architecture: "distributed scraping pipelines and career discovery engine",
  };
  const p2 = candidate.masterProjects[1] || {
    title: "Astra Vision",
    architecture: "isolated AST dependency graph execution",
  };

  const cleanP1 = p1.title.split(/\s+[—–-]\s+/)[0];
  const cleanP2 = p2.title.split(/\s+[—–-]\s+/)[0];
  const defaultGithub = slug === "ayushi" ? "https://github.com/Silenttears-cloud" : "https://github.com/Hey-Astreon";
  const defaultPortfolio = slug === "ayushi" ? "https://github.com/Silenttears-cloud" : "https://astreon.me";
  const portfolioLink = candidate.portfolioUrl || defaultPortfolio;
  const githubLink = candidate.githubUrl || defaultGithub;

  return `Hi ${company} Team,\n\nI saw your opening for ${jobTitle} and would love to contribute. I am a ${candidate.title} who builds zero-to-one systems with high velocity and production test rigor. Recently I've shipped ${cleanP1} (${p1.architecture}) and ${cleanP2} (${p2.architecture}).\n\nI have full-time remote availability and am excited about ${company}'s technical trajectory. Demos and code: ${portfolioLink} | ${githubLink}.\n\nBest,\n${candidate.fullName}`;
}

/**
 * POST /api/autopilot/cover-letter
 * Generates tailored cover letter text or synthetic PDF binary for AstrePilot.
 */
export async function POST(req: Request) {
  try {
    const token = extractBearerToken(req.headers.get("Authorization"));
    let userId: string | null = null;
    if (token) {
      userId = verifyAutopilotToken(token);
    }

    const body = await req.json().catch(() => ({}));
    const company = typeof body.company === "string" ? body.company.trim() : "Tech Company";
    const jobTitle = typeof body.jobTitle === "string" ? body.jobTitle.trim() : "Software Developer";
    const jobDescription = typeof body.jobDescription === "string" ? body.jobDescription : "";
    const requestedCandidate = typeof body.candidateId === "string" ? body.candidateId.trim().toLowerCase() : "";
    const format = body.format === "pdf" ? "pdf" : "text";

    let profile = null;
    if (requestedCandidate === "ayushi" || requestedCandidate === "roushan") {
      profile = await db.profile.findFirst({
        where: { slug: requestedCandidate },
        include: { projects: true, virtualExps: true },
      });
    }

    if (!profile && userId) {
      profile = await db.profile.findFirst({
        where: { userId },
        include: { projects: true, virtualExps: true },
      });
    }

    // Default to roushan if no profile found and no candidate requested
    if (!profile) {
      profile = await db.profile.findFirst({
        where: { slug: "roushan" },
        include: { projects: true, virtualExps: true },
      });
    }

    const slug = (profile?.slug || requestedCandidate || "roushan").toLowerCase();
    const baseline = getMasterResumeBaseline(slug);

    const candidateContext: CandidateContext = {
      fullName: profile?.fullName || baseline.header.fullName,
      title: profile?.title || baseline.header.targetHeadline,
      email: profile?.email || baseline.header.email,
      phone: profile?.phone || baseline.header.phone,
      location: profile?.location || baseline.header.location,
      portfolioUrl: profile?.portfolioUrl || baseline.header.portfolioUrl,
      githubUrl: profile?.githubUrl || baseline.header.githubUrl,
      linkedinUrl: profile?.linkedinUrl || baseline.header.linkedinUrl,
      masterProjects: (profile?.projects && profile.projects.length > 0)
        ? profile.projects.map((p) => ({
            title: p.title,
            techStack: p.techStack || "",
            architecture: p.architecture || p.bulletPoints || "",
          }))
        : baseline.projects.map((p) => ({
            title: p.title,
            techStack: p.techStack,
            architecture: p.bullets[0] || "",
          })),
      virtualExps: (profile?.virtualExps && profile.virtualExps.length > 0)
        ? profile.virtualExps.map((e) => ({
            company: e.company,
            roleTitle: e.roleTitle,
            outcome: e.outcome || "",
          }))
        : baseline.simulations.map((s) => ({
            company: s.company,
            roleTitle: s.roleTitle,
            outcome: s.engineeringOutcome,
          })),
    };

    const coverLetter = generateCoverLetter(
      candidateContext,
      company,
      jobTitle,
      jobDescription
    );

    const pitch = generateStartupPitch(candidateContext, company, jobTitle, slug);
    const safeCompany = company.replace(/[^a-zA-Z0-9]/g, "_");
    const safeName = candidateContext.fullName.replace(/[^a-zA-Z0-9]/g, "_");

    if (format === "pdf") {
      const pdfBuffer = createSimpleTextPdf(coverLetter);
      const filename = `${safeName}_Cover_Letter_${safeCompany}.pdf`;

      return NextResponse.json(
        {
          success: true,
          company,
          jobTitle,
          filename,
          fileName: filename,
          mimeType: "application/pdf",
          base64: pdfBuffer.toString("base64"),
          pdfBase64: pdfBuffer.toString("base64"),
          size: pdfBuffer.length,
          text: coverLetter,
          coverLetter,
          pitch,
          startupPitch: pitch,
        },
        { headers: CORS }
      );
    }

    return NextResponse.json(
      {
        success: true,
        company,
        jobTitle,
        filename: `${safeName}_Cover_Letter_${safeCompany}.txt`,
        fileName: `${safeName}_Cover_Letter_${safeCompany}.txt`,
        coverLetter,
        pitch,
        startupPitch: pitch,
      },
      { headers: CORS }
    );
  } catch (err: unknown) {
    console.error("[autopilot/cover-letter]", err);
    return NextResponse.json(
      { error: "Failed to generate tailored cover letter" },
      { status: 500, headers: CORS }
    );
  }
}
