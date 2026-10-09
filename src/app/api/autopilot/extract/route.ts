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

export async function POST(req: Request) {
  try {
    const userId = verifyAutopilotToken(extractBearerToken(req.headers.get("Authorization")) ?? "");
    if (!userId) {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 401, headers: CORS });
    }

    const body = await req.json();
    const { pageText, pageUrl } = body;

    if (!pageText || typeof pageText !== "string") {
      return NextResponse.json({ error: "pageText is required" }, { status: 400, headers: CORS });
    }

    // Find profile for this user
    const profile = await db.profile.findFirst({
      where: { userId },
      select: { id: true, fullName: true, title: true, location: true },
    });

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404, headers: CORS });
    }

    // Limit pageText to avoid token overflow
    const truncatedText = pageText.substring(0, 15000);

    const systemPrompt = `You are an AI assistant specialized in extracting job details from web pages.
The user will provide the raw text of a webpage. Your task is to identify if it is a job posting and extract the company name, the job title, and the core job description/requirements.

Respond ONLY with a valid JSON object in the following format:
{
  "isJobPosting": boolean,
  "company": "Company Name (or null if not found)",
  "jobTitle": "Job Title (or null if not found)",
  "description": "The full text of the job description, responsibilities, and requirements. Exclude unrelated website navigation text. (or null if not found)",
  "keySkills": ["skill1", "skill2"]
}`;

    const userPrompt = `Page URL: ${pageUrl || 'unknown'}\n\nPage Text:\n${truncatedText}`;

    const response = await queryMultiProviderLLM(systemPrompt, userPrompt, true);
    
    let extractedData;
    try {
      // The router might have already cleaned the JSON block
      const cleaned = response.text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
      extractedData = JSON.parse(cleaned);
    } catch (e) {
      console.error("Failed to parse LLM extraction response:", response.text);
      return NextResponse.json({ error: "Failed to parse extracted data" }, { status: 500, headers: CORS });
    }

    if (!extractedData.isJobPosting || !extractedData.company || !extractedData.jobTitle) {
      return NextResponse.json(
        { error: "Could not identify a clear job posting on this page", extractedData }, 
        { status: 400, headers: CORS }
      );
    }

    // Quick tailored summary (could be better if we ran a second LLM call, but we'll keep it fast)
    const tailoredSummary = `Highly motivated professional applying for the ${extractedData.jobTitle} position at ${extractedData.company}. Experienced in ${extractedData.keySkills?.slice(0, 3).join(", ") || "relevant technologies"}.`;

    // Save to AutopilotSession
    const session = await db.autopilotSession.create({
      data: {
        profileId: profile.id,
        company: extractedData.company,
        jobTitle: extractedData.jobTitle,
        jdText: extractedData.description || "",
        tailoredSummary,
        keySkills: JSON.stringify(extractedData.keySkills || []),
      }
    });

    return NextResponse.json(
      {
        success: true,
        company: extractedData.company,
        jobTitle: extractedData.jobTitle,
        session: session.id
      },
      { headers: CORS }
    );
  } catch (err) {
    console.error("[autopilot/extract] Error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500, headers: CORS });
  }
}
