import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { computeResumeDiff } from "@/lib/resumeDiff";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });

    const { variantIdA, variantIdB } = body;

    if (!variantIdA || !variantIdB) {
      return NextResponse.json({ success: false, error: "variantIdA and variantIdB required" }, { status: 400 });
    }

    const [variantA, variantB] = await Promise.all([
      db.resumeVariant.findUnique({ where: { id: variantIdA }, include: { profile: { select: { userId: true } } } }),
      db.resumeVariant.findUnique({ where: { id: variantIdB }, include: { profile: { select: { userId: true } } } }),
    ]);

    // Non-owners get the same response as a missing variant
    if (
      !variantA || !variantB ||
      variantA.profile.userId !== session.user.id ||
      variantB.profile.userId !== session.user.id
    ) {
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
