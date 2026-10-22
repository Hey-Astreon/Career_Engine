import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyAutopilotToken, extractBearerToken } from "@/lib/autopilot/tokenUtils";
import { queryMultiProviderLLM } from "@/lib/ai/router";
import { detectProceduralAnswer, buildScreeningSystemPrompt } from "@/lib/ai/screeningHelper";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

/**
 * POST /api/autopilot/oracle
 * Routes question answering to the Antigravity Python Agent Gateway (http://127.0.0.1:8000),
 * with graceful fallback to the multi-LLM router if the agent daemon is offline.
 */
export async function POST(req: Request) {
  try {
    const userId = verifyAutopilotToken(extractBearerToken(req.headers.get("Authorization")) ?? "");
    if (!userId) {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 401, headers: CORS });
    }

    const body = await req.json();
    const { question, company, jobTitle, jobDescription, maxLength } = body as {
      question: string;
      company?: string;
      jobTitle?: string;
      jobDescription?: string;
      maxLength?: number;
    };

    if (!question?.trim()) {
      return NextResponse.json({ error: "question is required" }, { status: 400, headers: CORS });
    }

    // 0. Procedural / Compliance fast-path (e.g. relatives, conflicts, "Type NA")
    const proceduralAnswer = detectProceduralAnswer(question);
    if (proceduralAnswer) {
      return NextResponse.json({
        answer: proceduralAnswer,
        source: "procedural-guardrail",
        thoughts: ["Procedural/compliance question intercepted with direct standard input."],
      }, { headers: CORS });
    }

    // 1. Fetch Candidate Profile & Projects for deep grounding
    const profile = await db.profile.findFirst({
      where: { userId },
      include: { projects: true, virtualExps: true },
    });

    let skillsList: string[] = [];
    if (profile?.primarySkills) {
      try {
        skillsList = JSON.parse(profile.primarySkills);
      } catch {
        skillsList = profile.primarySkills.split(",").map((s) => s.trim());
      }
    }

    const profileContext = profile ? {
      fullName: profile.fullName,
      title: profile.title,
      skills: skillsList,
      projects: profile.projects.map((p) => ({
        title: p.title,
        description: p.architecture || p.bulletPoints,
        techStack: p.techStack,
      })),
      experiences: profile.virtualExps.map((e) => ({
        company: e.company,
        role: e.roleTitle,
        outcome: e.outcome,
      })),
    } : null;

    // 2. Attempt to query Antigravity Python Agent Gateway
    try {
      const gatewayUrl = (process.env.AGENT_GATEWAY_URL || "http://127.0.0.1:8000").replace(/\/$/, "");
      const agentRes = await fetch(`${gatewayUrl}/oracle/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          company,
          jobTitle,
          jobDescription,
          profileContext,
          maxLength,
        }),
        signal: AbortSignal.timeout(12000), // 12 second agent timeout
      });

      if (agentRes.ok) {
        const agentData = await agentRes.json();
        return NextResponse.json({
          answer: agentData.answer,
          source: "antigravity-agent",
          thoughts: agentData.thoughts || [],
        }, { headers: CORS });
      }
    } catch {
      // Gateway unreachable or timed out -> proceed to fallback
    }

    // 3. Graceful Fallback: Internal Multi-Provider LLM with Strict First-Person Prompt
    const candidateName = profile?.fullName ?? "Applicant";
    const candidateTitle = profile?.title ?? "Full-Stack Developer";
    const location = profile?.location ?? "Patna, Bihar, India";

    const systemPrompt = buildScreeningSystemPrompt(candidateName, candidateTitle, location);
    const userPrompt = `Answer this job application screening question directly as ${candidateName}:
Question: "${question}"
${jobTitle ? `Target Role: ${jobTitle}` : ""}
${company ? `Target Company: ${company}` : ""}
${profileContext ? `Relevant Projects & Experience Context:\n${JSON.stringify(profileContext)}` : ""}`;

    const fallbackResponse = await queryMultiProviderLLM(
      systemPrompt,
      userPrompt,
      false
    );

    let answer = (fallbackResponse.text || "").trim();
    // Strip accidental third-person meta-chatter if LLM hallucinates opener
    if (answer.toLowerCase().startsWith("after reviewing") || answer.toLowerCase().startsWith("based on")) {
      answer = answer.replace(/^(?:after reviewing|based on)[^.]*\.\s*/i, "").trim();
    }

    return NextResponse.json({
      answer: answer || "N/A",
      source: "internal-fallback-llm",
      thoughts: [],
    }, { headers: CORS });

  } catch (err) {
    console.error("[autopilot/oracle]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500, headers: CORS });
  }
}
