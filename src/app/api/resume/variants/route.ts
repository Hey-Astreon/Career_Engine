import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { getAllResumeVariants } from "@/lib/resumeVariantSelector";

const MAX_VARIANTS = 20;

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const profileSlug = searchParams.get("profileSlug");

    if (!profileSlug) {
      return NextResponse.json({ success: false, error: "profileSlug required" }, { status: 400 });
    }

    const profile = await db.profile.findUnique({
      where: { slug: profileSlug },
    });

    if (!profile) {
      return NextResponse.json({ success: false, error: "Profile not found" }, { status: 404 });
    }

    // Allow reading variants if user owns the profile OR if it is a template/benchmark profile
    if (profile.userId && profile.userId !== session.user.id) {
      return NextResponse.json({ success: false, error: "Forbidden: You do not own this profile" }, { status: 403 });
    }

    const variants = await db.resumeVariant.findMany({
      where: { profileId: profile.id },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        name: true,
        category: true,
        atsScore: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const officialVariants = getAllResumeVariants(profileSlug);

    return NextResponse.json({ success: true, variants, officialVariants });
  } catch (error) {
    console.error("GET variants error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch variants" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });

    const { profileSlug, name, category = "General", resumeData, atsScore = 0 } = body;

    if (!profileSlug || !name || !resumeData) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    const profile = await db.profile.findUnique({ where: { slug: profileSlug } });
    if (!profile) {
      return NextResponse.json({ success: false, error: "Profile not found" }, { status: 404 });
    }
    
    if (profile.userId !== session.user.id) {
      return NextResponse.json({ success: false, error: "Forbidden: You do not own this profile" }, { status: 403 });
    }

    const existingCount = await db.resumeVariant.count({
      where: { profileId: profile.id },
    });

    // Enforce max 20 variants limit
    if (existingCount >= MAX_VARIANTS) {
      // Find oldest variant to replace
      const oldest = await db.resumeVariant.findFirst({
        where: { profileId: profile.id },
        orderBy: { createdAt: "asc" },
      });
      if (oldest) {
        await db.resumeVariant.delete({ where: { id: oldest.id } });
      }
    }

    const stringifiedData = typeof resumeData === "string" ? resumeData : JSON.stringify(resumeData);

    const variant = await db.resumeVariant.upsert({
      where: {
        profileId_name: {
          profileId: profile.id,
          name,
        },
      },
      update: {
        category,
        resumeData: stringifiedData,
        atsScore,
      },
      create: {
        profileId: profile.id,
        name,
        category,
        resumeData: stringifiedData,
        atsScore,
      },
    });

    return NextResponse.json({ success: true, variant: { id: variant.id, name: variant.name } });
  } catch (error) {
    console.error("POST variant error:", error);
    return NextResponse.json({ success: false, error: "Failed to save variant" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "Variant id required" }, { status: 400 });
    }

    const variant = await db.resumeVariant.findUnique({
      where: { id },
      include: { profile: true },
    });

    if (!variant) {
      return NextResponse.json({ success: false, error: "Variant not found" }, { status: 404 });
    }

    if (variant.profile.userId !== session.user.id) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    await db.resumeVariant.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE variant error:", error);
    return NextResponse.json({ success: false, error: "Failed to delete variant" }, { status: 500 });
  }
}
