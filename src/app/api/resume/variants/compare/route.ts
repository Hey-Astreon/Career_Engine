import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { computeResumeDiff } from "@/lib/resumeDiff";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });

    const { variantIdA, variantIdB } = body;

    if (!variantIdA || !variantIdB) {
      return NextResponse.json({ success: false, error: "variantIdA and variantIdB required" }, { status: 400 });
    }

    const [variantA, variantB] = await Promise.all([
      db.resumeVariant.findUnique({ where: { id: variantIdA } }),
      db.resumeVariant.findUnique({ where: { id: variantIdB } }),
    ]);

    if (!variantA || !variantB) {
      return NextResponse.json({ success: false, error: "One or both variants not found" }, { status: 404 });
    }

    const resumeA = JSON.parse(variantA.resumeData);
    const resumeB = JSON.parse(variantB.resumeData);

    const diff = computeResumeDiff(resumeA, resumeB);

    return NextResponse.json({
      success: true,
      diff,
      variantA: { id: variantA.id, name: variantA.name },
      variantB: { id: variantB.id, name: variantB.name }
    });
  } catch (error) {
    console.error("Compare API error:", error);
    return NextResponse.json({ success: false, error: "Failed to compare variants" }, { status: 500 });
  }
}
