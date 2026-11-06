import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyAutopilotToken, extractBearerToken } from "@/lib/autopilot/tokenUtils";
import { queryMultiProviderLLM } from "@/lib/ai/router";
import { getMasterResumeBaseline } from "@/lib/resumeBaseline";
import {
  detectProceduralAnswer,
  buildScreeningSystemPrompt,
  rankProjectsForContext,
  sanitizeScreeningText,
} from "@/lib/ai/screeningHelper";

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

    // 1. Fetch Candidate Profile & Projects for deep grounding (with offline baseline fallback)
    let profile: any = null;
    try {
      profile = await db.profile.findFirst({
        where: { userId },
        include: { projects: true, virtualExps: true },
      });
    } catch (dbErr) {
      console.warn("[autopilot/oracle] Database profile lookup fallback:", dbErr);
    }

    if (!profile) {
      const isAyushi = userId.toLowerCase().includes("ayushi");
      const fallbackBaseline = getMasterResumeBaseline(isAyushi ? "ayushi" : "roushan");
      profile = {
        fullName: fallbackBaseline.header.fullName,
        title: fallbackBaseline.header.targetHeadline,
        location: fallbackBaseline.header.location,
        primarySkills: JSON.stringify(fallbackBaseline.skills.flatMap((s) => s.skillsText.split(",").map((x) => x.trim()))),
        projects: fallbackBaseline.projects.map((p) => ({
          title: p.title,
          architecture: Array.isArray(p.bullets) ? p.bullets.join(". ") : "",
          bulletPoints: Array.isArray(p.bullets) ? p.bullets.join(". ") : "",
          techStack: typeof p.techStack === "string" ? p.techStack : Array.isArray(p.techStack) ? (p.techStack as string[]).join(", ") : "",
        })),
        virtualExps: (fallbackBaseline.simulations || []).map((e) => ({
          company: e.company,
          roleTitle: e.roleTitle,
          outcome: e.engineeringOutcome || e.actionTaken || "",
        })),
      };
    }

    let skillsList: string[] = [];
    if (profile?.primarySkills) {
      try {
        skillsList = JSON.parse(profile.primarySkills);
      } catch {
        skillsList = profile.primarySkills.split(",").map((s: string) => s.trim());
      }
    }

    const rawProjects = profile?.projects?.map((p: any) => ({
      title: p.title,
      description: p.architecture || p.bulletPoints || "",
      techStack: p.techStack,
    })) || [];

    // AstrePilot V3: RAG Project Relevance Ranking based on target question & JD
    const rankedProjects = rankProjectsForContext(rawProjects, question, jobDescription || "");

    const profileContext = profile ? {
      fullName: profile.fullName,
      title: profile.title,
      skills: skillsList,
      projects: rankedProjects,
      experiences: profile.virtualExps.map((e: any) => ({
        company: e.company,
        role: e.roleTitle,
        outcome: e.outcome,
      })),
    } : null;

    const isBca = Boolean(profile && /roushan|ayushi/i.test(profile.fullName));

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
        const cleanAnswer = sanitizeScreeningText(agentData.answer || "", isBca);
        return NextResponse.json({
          answer: cleanAnswer,
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

    // High-conviction project grounding if offline or LLM network unavailable
    if (!answer && profileContext && profileContext.projects.length > 0) {
      const topProj = profileContext.projects[0];
      answer = `As a ${profileContext.title || "Full-Stack Developer"}, I architected ${topProj.title} using ${topProj.techStack || "TypeScript, React 19, and cloud services"}. ${topProj.description || "I designed scalable distributed systems and high-reliability software architectures."}`;
    }

    const cleanFallbackAnswer = sanitizeScreeningText(answer, isBca);

    return NextResponse.json({
      answer: cleanFallbackAnswer || "N/A",
      source: "internal-fallback-llm",
      thoughts: [],
    }, { headers: CORS });

  } catch (err) {
    console.error("[autopilot/oracle]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500, headers: CORS });
  }
}
