import { NextResponse } from "next/server";
import { queryMultiProviderLLM } from "@/lib/ai/router";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdf = require("pdf-parse");
    const formData = await req.formData();
    const file = formData.get("resume") as File;

    if (!file) {
      return NextResponse.json({ error: "No resume file provided" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Parse PDF
    const pdfData = await pdf(buffer);
    const rawText = pdfData.text;

    if (!rawText || rawText.length < 50) {
      return NextResponse.json({ error: "Could not extract sufficient text from PDF." }, { status: 400 });
    }

    const systemPrompt = `You are a professional resume parser. Extract structured data from the raw resume text provided.

CRITICAL RULES — follow strictly to avoid hallucinations:
1. ONLY extract information that is explicitly present in the resume text.
2. If a field cannot be determined with HIGH confidence, output null for that field.
3. For careerStage detection: use concrete evidence ONLY (graduation year, job titles, years of experience listed). 
   - "student" = currently enrolled in college/university, no full-time jobs listed
   - "fresher" = graduated within last 1 year, 0-1 years of experience or internships only
   - "junior" = 1-3 years of professional experience
   - "mid" = 3-7 years of professional experience
   - "senior" = 7+ years of professional experience or "Senior", "Lead", "Principal" in title
   - If unclear, return null — NEVER guess.
4. For yearsOfExperience: Calculate from work history dates if present. Return integer. Null if not determinable.
5. For primarySkills: Extract only explicitly listed technical skills (languages, frameworks, tools). Max 10.
6. For salaryRange: Return null unless explicitly stated in resume.
7. For workType: Return null unless explicitly mentioned ("remote", "hybrid", "onsite" preference).

OUTPUT (strict JSON, no markdown):
{
  "header": {
    "fullName": "string or null",
    "targetHeadline": "string or null",
    "location": "string or null",
    "phone": "string or null",
    "email": "string or null",
    "portfolioUrl": "string or null",
    "githubUrl": "string or null",
    "linkedinUrl": "string or null"
  },
  "career": {
    "careerStage": "student|fresher|junior|mid|senior or null",
    "yearsOfExperience": "integer or null",
    "primarySkills": ["skill1", "skill2"] or [],
    "workType": "remote|hybrid|onsite or null",
    "salaryRange": "string or null",
    "workAuthorized": true
  }
}`;

    const userPrompt = `Resume text:\n\n${rawText}`;

    const result = await queryMultiProviderLLM(systemPrompt, userPrompt, true);

    if (!result.text) {
      return NextResponse.json({ error: "AI failed to extract data." }, { status: 500 });
    }

    let parsedData;
    try {
      // Strip markdown code fences if present
      const cleaned = result.text.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
      parsedData = JSON.parse(cleaned);
    } catch {
      return NextResponse.json({ error: "AI returned malformed data. Please try again." }, { status: 422 });
    }

    return NextResponse.json(parsedData);
  } catch (error: unknown) {
    console.error("[Onboarding Extract Error]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

