import { NextRequest, NextResponse } from "next/server";
import { queryMultiProviderLLM } from "@/lib/ai/router";

export interface SolveQuestionInput {
  id: string;
  text: string;
  options: Array<{ key: string; text: string }>;
  traps?: {
    hasNegativeConstraint?: boolean;
    hasDualOptionTrap?: boolean;
  };
}

export interface SolveQuizPayload {
  courseTitle?: string;
  questions: SolveQuestionInput[];
}

const SYSTEM_ACADEMIC_PROMPT = `You are a distinguished Computer Science professor and academic tutor specializing in undergraduate BCA and MCA coursework (including Green Computing, Java OOP, DBMS, Computer Networks, and Operating Systems).

Your objective is to solve university multiple-choice quiz questions with 100% precision.

CRITICAL ACADEMIC DEDUCTION LAWS:
1. TRUTH TABLE DEDUCTION: Evaluate each option independently as True or False based on foundational computer science theory.
2. DUAL-OPTION TRAP: If multiple options are true and an option states 'Both of these', 'Both a and b', or 'All of the above', you MUST select that composite option.
3. NEGATIVE CONSTRAINT: If the question asks for 'NOT', 'EXCEPT', 'FALSE', or 'INCORRECT', select the option that is factually invalid.
4. FORMAT: Return strictly valid JSON with an 'answers' array. Each item must have:
   - "id": string (the exact question id provided)
   - "selectedKey": string (e.g. "a", "b", "c", or "d")
   - "confidence": number (between 0.0 and 1.0, e.g. 0.98)
   - "reasoning": string (concise 1-sentence conceptual explanation)

JSON Schema:
{
  "answers": [
    {
      "id": "question-1",
      "selectedKey": "d",
      "confidence": 0.98,
      "reasoning": "Both lockout economizers and humidity sensor calibration maintain datacenter efficiency."
    }
  ]
}`;

export async function POST(req: NextRequest) {
  try {
    const body: SolveQuizPayload = await req.json();

    if (!body || !Array.isArray(body.questions) || body.questions.length === 0) {
      return NextResponse.json(
        { error: "Invalid payload: 'questions' array is required." },
        { status: 400 }
      );
    }

    const courseContext = body.courseTitle || "Computer Science / Information Technology";

    const userPrompt = `Course Subject: ${courseContext}

Solve the following ${body.questions.length} quiz questions:
${JSON.stringify(body.questions, null, 2)}

Return strictly valid JSON matching the schema.`;

    const llmRes = await queryMultiProviderLLM(
      SYSTEM_ACADEMIC_PROMPT,
      userPrompt,
      true
    );

    let parsedResult;
    try {
      parsedResult = JSON.parse(llmRes.text);
    } catch {
      // Fallback clean
      const cleaned = llmRes.text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
      parsedResult = JSON.parse(cleaned);
    }

    const answers = Array.isArray(parsedResult)
      ? parsedResult
      : parsedResult.answers || [];

    return NextResponse.json({
      success: true,
      provider: llmRes.provider,
      courseTitle: courseContext,
      answers,
    });
  } catch (error: any) {
    console.error("[StudyPilot API] Error solving quiz questions:", error);
    return NextResponse.json(
      { error: "Failed to solve quiz questions", details: error.message },
      { status: 500 }
    );
  }
}
