import { NextResponse } from "next/server";
import { queryMultiProviderLLM } from "@/lib/ai/router";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { questions, jobDescription, tailoredResume } = await req.json();

    if (!questions || !jobDescription || !tailoredResume) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: questions, jobDescription, tailoredResume" },
        { status: 400 }
      );
    }

    const systemPrompt = `You are an elite technical recruiter and career strategist. 
Your task is to answer job application screener questions for a candidate using their Tailored Resume and the Job Description.

CAREER STAGE CALIBRATION (CRITICAL):
Before answering, analyze the dates and roles in the candidate's resume to determine their true career stage:
- If they are currently a student (graduation date in the future), adopt the tone of a high-potential, hungry student/intern. DO NOT use senior-level corporate jargon (e.g., "proven expertise", "seasoned professional"). Frame their skills through the lens of academic rigor and impressive side projects.
- If they are a new graduate or junior (0-2 years), frame them as a driven junior engineer with a strong foundation.
- If they are mid-level or senior, adopt a confident, authoritative tone.

RULES:
1. ONLY use facts, metrics, skills, and experience present in the provided Tailored Resume. 
2. DO NOT hallucinate, invent, or assume any skills or experiences that are not explicitly written in the resume.
3. Your answers must be professional, concise, and directly address the questions asked.
4. If a question asks for a salary expectation and it is not obvious, state a generic professional response (e.g., "Negotiable based on total compensation package").
5. Format your response cleanly using Markdown. Use bolding for the questions and standard text for your answers.
6. Answer the questions naturally, from the first-person perspective ("I").`;

    const userPrompt = `--- JOB DESCRIPTION ---
${jobDescription}

--- TAILORED RESUME ---
${tailoredResume}

--- APPLICATION QUESTIONS TO ANSWER ---
${questions}`;

    // responseJson=false because we want markdown output, not JSON
    const llmResult = await queryMultiProviderLLM(systemPrompt, userPrompt, false);

    return NextResponse.json({
      success: true,
      answers: llmResult.text,
      provider: llmResult.provider
    });
  } catch (error: any) {
    console.error("Screener QA Generation Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to generate answers" },
      { status: 500 }
    );
  }
}
