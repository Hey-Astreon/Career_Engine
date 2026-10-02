import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyAutopilotToken, extractBearerToken } from "@/lib/autopilot/tokenUtils";
import { queryMultiProviderLLM } from "@/lib/ai/router";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

/**
 * POST /api/autopilot/answer
 * AI-generates a screening question answer using the candidate's profile context.
 * Auth: Bearer token
 */
export async function POST(req: Request) {
  try {
    const userId = verifyAutopilotToken(extractBearerToken(req.headers.get("Authorization")) ?? "");
    if (!userId) {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 401, headers: CORS });
    }

    const body = await req.json();
    const { question, company, jobTitle, context } = body as {
      question: string;
      company?: string;
      jobTitle?: string;
      context?: string | {
        projects?: Array<{ title: string; techStack: string; architecture?: string }>;
        virtualExps?: Array<{ company: string; role: string; outcome?: string }>;
      };
    };

    if (!question?.trim()) {
      return NextResponse.json({ error: "question is required" }, { status: 400, headers: CORS });
    }

    // Fetch profile for system prompt context
    const profile = await db.profile.findFirst({
      where: { userId },
      select: { fullName: true, title: true, location: true },
    });

    let contextString = "";
    if (typeof context === "string") {
      contextString = context;
    } else {
      const projectsText = context?.projects
        ?.map((p) => `- ${p.title} (${p.techStack})${p.architecture ? ": " + p.architecture : ""}`)
        .join("\n") ?? "";

      const expsText = context?.virtualExps
        ?.map((e) => `- ${e.role} at ${e.company}${e.outcome ? ": " + e.outcome : ""}`)
        .join("\n") ?? "";

      if (projectsText || expsText) {
        contextString = `CANDIDATE PROJECTS:\n${projectsText || "Various software projects"}\n\nCANDIDATE EXPERIENCE:\n${expsText || "Virtual simulations and hands-on project work"}`;
      }
    }

    const systemPrompt = `You are answering a job application screening question on behalf of ${profile?.fullName ?? "a software developer"}, a ${profile?.title ?? "developer"} based in ${profile?.location ?? "India"}.

${contextString}

RULES FOR YOUR ANSWER:
- Write in first person as the candidate
- Keep it to 2-4 sentences maximum (form fields have character limits)
- Be specific and genuine — reference real projects or experiences when relevant
- Never start with "I am excited to..." or sycophantic openers
- Do not fabricate companies, certifications, or experiences not mentioned above
- ${company ? `Tailor the answer to ${company} and their engineering culture` : "Tailor to the role"}
- Sound human, not like a cover letter template`;

    const userPrompt = `Answer this job application screening question:\n\n"${question}"${jobTitle ? `\n\nRole being applied to: ${jobTitle}` : ""}${company ? `\nCompany: ${company}` : ""}`;

    const response = await queryMultiProviderLLM(systemPrompt, userPrompt, false);

    return NextResponse.json(
      {
        answer: response.text.trim(),
        wordCount: response.text.trim().split(/\s+/).length,
      },
      { headers: CORS }
    );
  } catch (err) {
    console.error("[autopilot/answer]", err);
    return NextResponse.json({ error: "AI generation failed" }, { status: 500, headers: CORS });
  }
}
