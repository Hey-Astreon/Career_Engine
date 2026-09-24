import { NextResponse } from "next/server";
import { queryMultiProviderLLM } from "@/lib/ai/router";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdf = require("pdf-parse");

export async function POST(req: Request) {
  try {
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

    // AI Extraction System Prompt
    const systemPrompt = `You are a professional resume parser. You will receive the raw text of a candidate's resume.
Your task is to extract the data into a strict JSON format matching our OptimizedResume schema.
Extract their Full Name, current or target Job Title, Location, Email, Phone, and URLs.
Do NOT invent information. If something is missing, leave it as an empty string.

REQUIRED JSON SCHEMA:
{
  "header": {
    "fullName": "Extracted Name",
    "targetHeadline": "Extracted Title",
    "location": "Extracted Location",
    "phone": "Extracted Phone",
    "email": "Extracted Email",
    "portfolioUrl": "Extracted Portfolio URL",
    "githubUrl": "Extracted Github URL",
    "linkedinUrl": "Extracted Linkedin URL"
  }
}`;

    const userPrompt = `Here is the raw resume text:\n\n${rawText}`;

    // Use existing multi-provider router
    const result = await queryMultiProviderLLM(systemPrompt, userPrompt, true);

    if (!result.text) {
      return NextResponse.json({ error: "AI failed to extract data." }, { status: 500 });
    }

    let parsedData;
    try {
      parsedData = JSON.parse(result.text);
    } catch {
      return NextResponse.json({ error: "AI returned malformed data. Please try again." }, { status: 422 });
    }

    return NextResponse.json(parsedData);
  } catch (error: unknown) {
    console.error("[Onboarding Extract Error]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
