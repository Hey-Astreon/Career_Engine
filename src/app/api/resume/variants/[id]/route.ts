import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * Loads a variant only if it belongs to the signed-in user.
 * Non-owners get the same "not found" as a missing id so ids cannot be probed.
 */
async function getOwnedVariant(id: string, userId: string) {
  const variant = await db.resumeVariant.findUnique({
    where: { id },
    include: { profile: { select: { userId: true } } },
  });
  if (!variant || variant.profile.userId !== userId) return null;
  return variant;
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const id = (await params).id;
    if (!id) return NextResponse.json({ success: false, error: "Missing id" }, { status: 400 });

    const owned = await getOwnedVariant(id, session.user.id);
    if (!owned) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { profile, ...variant } = owned;
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
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const id = (await params).id;
    if (!id) return NextResponse.json({ success: false, error: "Missing id" }, { status: 400 });

    const owned = await getOwnedVariant(id, session.user.id);
    if (!owned) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });

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
