import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  isDeveloperEmail,
  isDeveloperProfileSlug,
  getDeveloperDefaultSlug,
} from "@/lib/authCandidate";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const sessionUser = session?.user;
    const currentUserId = sessionUser?.id || null;
    const userEmail = sessionUser?.email || null;

    if (!sessionUser || !currentUserId) {
      return NextResponse.json({
        success: true,
        profiles: [],
        currentUserId: null,
        userProfileSlug: null,
        isDeveloper: false,
      });
    }

    const isDev = isDeveloperEmail(userEmail);

    let rawProfiles;
    if (isDev) {
      // Co-developers (Roushan & Ayushi) are authorized to see both developer profiles
      rawProfiles = await db.profile.findMany({
        where: {
          OR: [
            { slug: { in: ["roushan", "ayushi"] } },
            { userId: currentUserId },
          ],
        },
        include: {
          projects: true,
          virtualExps: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      });
    } else {
      // Third-party users ONLY see their own profile, completely scrubbed of developer profiles
      rawProfiles = await db.profile.findMany({
        where: {
          userId: currentUserId,
          slug: { notIn: ["roushan", "ayushi"] },
        },
        include: {
          projects: true,
          virtualExps: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      });
    }

    let userProfileSlug: string | null = null;
    if (isDev) {
      userProfileSlug = getDeveloperDefaultSlug(userEmail);
    } else if (rawProfiles.length > 0) {
      userProfileSlug = rawProfiles[0].slug;
    }

    const profiles = rawProfiles.map((p) => {
      const isOwner = Boolean(currentUserId && p.userId === currentUserId);
      const isPartner = Boolean(isDev && isDeveloperProfileSlug(p.slug) && !isOwner);
      return {
        ...p,
        isOwner,
        isPartner,
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
      isDeveloper: isDev,
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
      careerStage,
      yearsOfExperience,
      workType,
      salaryRange,
      workAuthorized,
      requiresVisa,
      primarySkills,
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
        ...(careerStage !== undefined ? { careerStage: careerStage ? String(careerStage) : null } : {}),
        ...(yearsOfExperience !== undefined ? { yearsOfExperience: yearsOfExperience ? Number(yearsOfExperience) : null } : {}),
        ...(workType !== undefined ? { workType: workType ? String(workType) : null } : {}),
        ...(salaryRange !== undefined ? { salaryRange: salaryRange ? String(salaryRange) : null } : {}),
        ...(workAuthorized !== undefined ? { workAuthorized: Boolean(workAuthorized) } : {}),
        ...(requiresVisa !== undefined ? { requiresVisa: Boolean(requiresVisa) } : {}),
        ...(primarySkills !== undefined ? { primarySkills: primarySkills ? JSON.stringify(primarySkills) : null } : {}),
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
