import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyAutopilotToken, extractBearerToken } from "@/lib/autopilot/tokenUtils";
import { queryMultiProviderLLM } from "@/lib/ai/router";
import { detectProceduralAnswer } from "@/lib/ai/screeningHelper";

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

    // 0. Procedural / Compliance fast-path (e.g. relatives, conflicts, "Type NA")
    const proceduralAnswer = detectProceduralAnswer(question);
    if (proceduralAnswer) {
      return NextResponse.json(
        {
          answer: proceduralAnswer,
          wordCount: 1,
        },
        { headers: CORS }
      );
    }

    // Fetch profile with projects and simulations for system prompt context
    const profile = await db.profile.findFirst({
      where: { userId },
      include: { projects: true, virtualExps: true },
    });

    let contextString = "";
    if (typeof context === "string" && context.trim()) {
      contextString = context;
    } else {
      const projectsList =
        context && typeof context === "object" && Array.isArray(context.projects) && context.projects.length > 0
          ? context.projects.map((p) => `- ${p.title} (${p.techStack})${p.architecture ? ": " + p.architecture : ""}`)
          : (profile?.projects ?? []).map((p) => `- ${p.title} (${p.techStack}): ${p.architecture}`);

      const expsList =
        context && typeof context === "object" && Array.isArray(context.virtualExps) && context.virtualExps.length > 0
          ? context.virtualExps.map((e) => `- ${e.role} at ${e.company}${e.outcome ? ": " + e.outcome : ""}`)
          : (profile?.virtualExps ?? []).map((e) => `- ${e.roleTitle} at ${e.company}: ${e.outcome}`);

      const projectsText = projectsList.join("\n");
      const expsText = expsList.join("\n");

      if (projectsText || expsText) {
        contextString = `CANDIDATE PROJECTS:\n${projectsText || "Various software projects"}\n\nCANDIDATE EXPERIENCE:\n${expsText || "Virtual simulations and hands-on project work"}`;
      }
    }

    const isBca = /roushan|ayushi/i.test(profile?.fullName ?? "");
    const bcaRule = isBca
      ? `\n- BCA TITLE LAW (MANDATORY): NEVER refer to yourself as an "Engineer" (e.g. Software Engineer, Backend Engineer). Strictly use "Software Developer", "Backend Developer", "Full-Stack Developer", or "Systems Architect".`
      : "";

    const systemPrompt = `You are answering a job application screening question on behalf of ${profile?.fullName ?? "a software developer"}, a ${profile?.title ?? "Software Developer"} based in ${profile?.location ?? "India"}.

${contextString}

RULES FOR YOUR ANSWER:
- CRITICAL: Write strictly in the FIRST PERSON ("I", "my"). NEVER refer to the candidate by name or in the third person.
- NEVER start with "After reviewing the information for...", "Based on the candidate's profile...", or similar third-person meta-phrases.
- Keep it to 2-3 sentences maximum (concise, direct, authentic).
- Be specific and genuine — reference real projects or experiences when relevant.
- CRITICAL: Do NOT hallucinate. If you lack specific experience for the question, answer truthfully by focusing on transferable skills and eagerness to learn.
- Never invent past job titles, years of experience, certifications, or company names not provided in the context.
- Never start with "I am excited to..." or sycophantic openers, and avoid AI buzzwords ("passionate", "spearheaded", "utilizing").${bcaRule}
- If the question asks a simple procedural or yes/no question, reply directly with 1 phrase or word (e.g. "N/A" or "Yes").
- Sound human, natural, and confident.`;

    const userPrompt = `Answer this job application screening question directly as ${profile?.fullName ?? "the candidate"}:\n\n"${question}"${jobTitle ? `\n\nRole being applied to: ${jobTitle}` : ""}${company ? `\nCompany: ${company}` : ""}`;

    const response = await queryMultiProviderLLM(systemPrompt, userPrompt, false);

    let answer = response.text.trim();
    if (answer.toLowerCase().startsWith("after reviewing") || answer.toLowerCase().startsWith("based on")) {
      answer = answer.replace(/^(?:after reviewing|based on)[^.]*\.\s*/i, "").trim();
    }

    return NextResponse.json(
      {
        answer: answer || "N/A",
        wordCount: answer.split(/\s+/).length,
      },
      { headers: CORS }
    );
  } catch (err) {
    console.error("[autopilot/answer]", err);
    return NextResponse.json({ error: "AI generation failed" }, { status: 500, headers: CORS });
  }
}
