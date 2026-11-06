/**
 * analyze-form/route.ts
 * ---------------------
 * AstrePilot V3: AI Form Oracle Endpoint.
 *
 * Receives an anonymized structural DOM snapshot from any web portal (no PII),
 * evaluates high-speed 5-signal Semantic Field Discovery (SFD) locally,
 * and passes ambiguous/unmapped fields to the multi-provider LLM cascade
 * (Groq -> Gemini -> Cerebras -> NVIDIA NIM) for sub-second intent classification.
 */

import { NextResponse } from "next/server";
import {
  discoverFormFields,
  computeSemanticScore,
  CanonicalFieldType,
  ElementSignals,
} from "@/lib/autopilot/semanticFieldDiscovery";
import { queryMultiProviderLLM } from "@/lib/ai/router";
import { verifyAutopilotToken, extractBearerToken } from "@/lib/autopilot/tokenUtils";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

interface AnalyzeFormPayload {
  pageUrl?: string;
  pageTitle?: string;
  domSnapshot?: ElementSignals[];
  ambiguousOnly?: boolean;
}

/**
 * Strips markdown code fences from LLM JSON responses.
 */
function cleanJsonOutput(text: string): string {
  return text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

export async function POST(req: Request) {
  try {
    // Optional token validation (allows standalone mode fallback for offline developer profile)
    const authHeader = req.headers.get("Authorization");
    const token = extractBearerToken(authHeader);
    const userId = token ? verifyAutopilotToken(token) : null;

    const body: AnalyzeFormPayload = await req.json();
    const { domSnapshot = [], pageUrl = "", pageTitle = "", ambiguousOnly = false } = body;

    if (!Array.isArray(domSnapshot) || domSnapshot.length === 0) {
      return NextResponse.json(
        { error: "domSnapshot array is required and must not be empty" },
        { status: 400, headers: CORS }
      );
    }

    // Step 1: Run Universal Semantic Field Discovery (SFD) at 0ms latency
    const discovery = discoverFormFields(domSnapshot);

    // Filter fields that require AI Oracle resolution (confidence < 0.85)
    const ambiguousFields = discovery.fields.filter(
      (f) => f.confidence < 0.85 && f.fieldType !== "UNKNOWN" ? f.confidence < 0.70 : f.confidence < 0.85
    );

    // If all fields are already confidently classified or no LLM needed
    if (ambiguousFields.length === 0) {
      return NextResponse.json(
        {
          success: true,
          fingerprint: discovery.fingerprint,
          fields: discovery.fields,
          summary: {
            total: discovery.fields.length,
            highConfidence: discovery.highConfidenceCount,
            aiResolved: 0,
            source: "sfd_local",
          },
        },
        { headers: CORS }
      );
    }

    // Step 2: Route ambiguous fields to Multi-Provider LLM Oracle
    const structuralPayload = ambiguousFields.map((f, idx) => ({
      index: idx,
      id: f.id || `el_${idx}`,
      name: f.name || "",
      tagName: f.tagName || "INPUT",
      type: f.type || "text",
      labelText: f.labelText || "",
      placeholder: f.placeholder || "",
      contextText: f.contextText || "",
      options: (f.optionsText || []).slice(0, 10), // truncate long option lists to save tokens
    }));

    const systemPrompt = `You are AstrePilot's Universal Form Field Classifier.
Classify each ambiguous form field into exactly ONE canonical type from this list:
[FIRST_NAME, LAST_NAME, FULL_NAME, PREFERRED_NAME, PRONOUNS, EMAIL, PHONE, PHONE_COUNTRY_CODE, WEBSITE, LINKEDIN, GITHUB, PORTFOLIO, CITY, STATE, COUNTRY, ZIP_CODE, ADDRESS, LOCATION_AUTOCOMPLETE, WORK_AUTH, VISA, NOTICE_PERIOD, SALARY, SALARY_EXPECTED, PASSWORD, CONFIRM_PASSWORD, LOGIN_ID, SCHOOL, DEGREE, DISCIPLINE, GRADUATION_YEAR, GPA, START_MONTH, START_YEAR, END_MONTH, END_YEAR, COMPANY, EMPLOYMENT_TITLE, START_DATE, END_DATE, CURRENT_ROLE, WORK_DESCRIPTION, EXP_COUNTRY, EXP_STATE, EXP_CITY, SCREENING, SCREENING_SELECT, COVER_LETTER, WHY_US, NOTE, GENDER, RACE_ETHNICITY, HISPANIC_LATINO, VETERAN, DISABILITY, RESUME, COVER_LETTER_FILE, HEAR_ABOUT, REFERRAL, PREFERRED_LOCATION, WORKPLACE_TYPE, TEXT_CONSENT, PRIVACY_CONSENT, UNKNOWN].

Return ONLY a strict JSON array of objects with format:
[
  { "id": string, "fieldType": CanonicalFieldType, "confidence": number (0.0 to 1.0), "reasoning": string }
]`;

    const userPrompt = `Page Context: "${pageTitle}" (${pageUrl.slice(0, 80)})
Ambiguous Form Elements:
${JSON.stringify(structuralPayload, null, 2)}`;

    let aiResults: Array<{ id: string; fieldType: CanonicalFieldType; confidence: number; reasoning: string }> = [];

    try {
      const llmResponse = await queryMultiProviderLLM(
        systemPrompt,
        userPrompt,
        true
      );

      const cleaned = cleanJsonOutput(llmResponse.text);
      aiResults = JSON.parse(cleaned);
    } catch (llmErr) {
      console.warn("[AstrePilot Oracle] LLM Classification fallback triggered:", llmErr);
    }

    // Step 3: Merge AI resolutions back into field mappings
    const aiMap = new Map<string, { fieldType: CanonicalFieldType; confidence: number; reasoning: string }>();
    if (Array.isArray(aiResults)) {
      aiResults.forEach((item) => {
        if (item && item.id && item.fieldType) {
          aiMap.set(item.id, item);
        }
      });
    }

    let aiResolvedCount = 0;
    const mergedFields = discovery.fields.map((field, idx) => {
      const lookupId = field.id || `el_${idx}`;
      const aiResolution = aiMap.get(lookupId);

      if (aiResolution && aiResolution.confidence > field.confidence) {
        aiResolvedCount++;
        return {
          ...field,
          fieldType: aiResolution.fieldType,
          confidence: Number(aiResolution.confidence.toFixed(2)),
          reasoning: `AI Oracle: ${aiResolution.reasoning || "Classified via multi-LLM cascade"}`,
          signalsMatched: [...field.signalsMatched, "source:ai_oracle"],
        };
      }
      return field;
    });

    return NextResponse.json(
      {
        success: true,
        fingerprint: discovery.fingerprint,
        fields: mergedFields,
        summary: {
          total: mergedFields.length,
          highConfidence: mergedFields.filter((f) => f.confidence >= 0.85).length,
          aiResolved: aiResolvedCount,
          source: aiResolvedCount > 0 ? "sfd_hybrid_oracle" : "sfd_local",
        },
      },
      { headers: CORS }
    );
  } catch (err: any) {
    console.error("[AstrePilot Oracle] Analyze form error:", err);
    return NextResponse.json(
      { error: err?.message || "Internal form analysis error" },
      { status: 500, headers: CORS }
    );
  }
}
