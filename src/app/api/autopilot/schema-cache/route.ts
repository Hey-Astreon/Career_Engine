/**
 * schema-cache/route.ts
 * ---------------------
 * AstrePilot V3: Cross-User Form Schema Cache & Feedback Telemetry Endpoint.
 *
 * GET: Retrieves cached form mapping by structural fingerprint (0ms, $0 cost).
 * POST: Contributes new anonymized form schema or submits execution telemetry.
 */

import { NextResponse } from "next/server";
import {
  getCachedFormSchema,
  saveFormSchema,
  recordSchemaFeedback,
  FieldMappingItem,
} from "@/lib/autopilot/formSchemaCache";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const fingerprint = searchParams.get("fingerprint")?.trim();

    if (!fingerprint) {
      return NextResponse.json(
        { error: "fingerprint query parameter is required" },
        { status: 400, headers: CORS }
      );
    }

    const schema = await getCachedFormSchema(fingerprint);

    if (!schema) {
      return NextResponse.json(
        { success: true, cached: false, fingerprint },
        { headers: CORS }
      );
    }

    return NextResponse.json(
      {
        success: true,
        cached: true,
        fingerprint: schema.fingerprint,
        domainPattern: schema.domainPattern,
        mappings: schema.mappings,
        verified: schema.verified,
        successCount: schema.successCount,
      },
      { headers: CORS }
    );
  } catch (err: any) {
    console.error("[SchemaCache API] GET error:", err);
    return NextResponse.json(
      { error: err?.message || "Internal schema cache error" },
      { status: 500, headers: CORS }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { fingerprint, domain = "", mappings, feedback } = body as {
      fingerprint?: string;
      domain?: string;
      mappings?: FieldMappingItem[];
      feedback?: { success: boolean };
    };

    if (!fingerprint) {
      return NextResponse.json(
        { error: "fingerprint is required" },
        { status: 400, headers: CORS }
      );
    }

    // 1. Feedback telemetry update
    if (feedback && typeof feedback.success === "boolean") {
      const res = await recordSchemaFeedback(fingerprint, feedback.success);
      return NextResponse.json(
        { success: true, feedbackRecorded: true, verified: res.verified },
        { headers: CORS }
      );
    }

    // 2. Schema save / contribution
    if (Array.isArray(mappings) && mappings.length > 0) {
      const saved = await saveFormSchema(domain, fingerprint, mappings);
      if (!saved) {
        return NextResponse.json(
          { error: "Failed to persist schema mappings" },
          { status: 400, headers: CORS }
        );
      }

      return NextResponse.json(
        {
          success: true,
          cached: true,
          fingerprint: saved.fingerprint,
          mappingsCount: saved.mappings.length,
          verified: saved.verified,
        },
        { headers: CORS }
      );
    }

    return NextResponse.json(
      { error: "Either mappings array or feedback object is required" },
      { status: 400, headers: CORS }
    );
  } catch (err: any) {
    console.error("[SchemaCache API] POST error:", err);
    return NextResponse.json(
      { error: err?.message || "Internal schema cache update error" },
      { status: 500, headers: CORS }
    );
  }
}

