import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const currentUserId = session?.user?.id || null;

    const rawProfiles = await db.profile.findMany({
      include: {
        projects: true,
        virtualExps: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    let userProfileSlug: string | null = null;

    const profiles = rawProfiles.map((p) => {
      const isOwner = Boolean(currentUserId && p.userId === currentUserId);
      if (isOwner) {
        userProfileSlug = p.slug;
      }
      return {
        ...p,
        isOwner,
        isTemplate: !p.userId,
      };
    });

    if (userProfileSlug) {
      profiles.sort((a, b) => (a.slug === userProfileSlug ? -1 : b.slug === userProfileSlug ? 1 : 0));
    }

    return NextResponse.json({
      success: true,
      profiles,
      currentUserId,
      userProfileSlug,
    });
  } catch (error) {
    console.error("Error fetching profiles:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch candidate profiles" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const {
      fullName,
      title,
      location,
      phone,
      email,
      linkedinUrl,
      portfolioUrl,
      githubUrl,
    } = body;

    const existing = await db.profile.findFirst({
      where: { userId: session.user.id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Profile not found for this user" },
        { status: 404 }
      );
    }

    const updatedProfile = await db.profile.update({
      where: { id: existing.id },
      data: {
        ...(fullName ? { fullName: String(fullName).trim() } : {}),
        ...(title ? { title: String(title).trim() } : {}),
        ...(location !== undefined ? { location: String(location).trim() } : {}),
        ...(phone !== undefined ? { phone: phone ? String(phone).trim() : null } : {}),
        ...(email !== undefined ? { email: String(email).trim() } : {}),
        ...(linkedinUrl !== undefined ? { linkedinUrl: linkedinUrl ? String(linkedinUrl).trim() : null } : {}),
        ...(portfolioUrl !== undefined ? { portfolioUrl: portfolioUrl ? String(portfolioUrl).trim() : null } : {}),
        ...(githubUrl !== undefined ? { githubUrl: githubUrl ? String(githubUrl).trim() : null } : {}),
      },
      include: {
        projects: true,
        virtualExps: true,
      },
    });

    return NextResponse.json({
      success: true,
      profile: {
        ...updatedProfile,
        isOwner: true,
        isTemplate: false,
      },
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update profile" },
      { status: 500 }
    );
  }
}
