import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const id = (await params).id;
    if (!id) return NextResponse.json({ success: false, error: "Missing id" }, { status: 400 });

    const variant = await db.resumeVariant.findUnique({ where: { id } });
    if (!variant) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });

    return NextResponse.json({
      success: true,
      variant: {
        ...variant,
        resumeData: JSON.parse(variant.resumeData),
      },
    });
  } catch (error) {
    console.error("GET variant/[id] error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch variant" }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const id = (await params).id;
    if (!id) return NextResponse.json({ success: false, error: "Missing id" }, { status: 400 });

    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });

    const { name, category, resumeData, atsScore } = body;
    
    const updateData: { name?: string; category?: string; atsScore?: number; resumeData?: string } = {};
    if (name !== undefined) updateData.name = name;
    if (category !== undefined) updateData.category = category;
    if (atsScore !== undefined) updateData.atsScore = atsScore;
    if (resumeData !== undefined) {
      updateData.resumeData = typeof resumeData === "string" ? resumeData : JSON.stringify(resumeData);
    }

    const variant = await db.resumeVariant.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ success: true, variant });
  } catch (error) {
    console.error("PATCH variant/[id] error:", error);
    return NextResponse.json({ success: false, error: "Failed to update variant" }, { status: 500 });
  }
}
