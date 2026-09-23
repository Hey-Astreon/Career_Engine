import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

function generateSlug(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "") + "-" + Math.random().toString(36).substring(2, 6);
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { fullName, targetHeadline, location, email, phone, linkedinUrl, portfolioUrl, githubUrl } = body;

    // Validate required fields
    if (!fullName || !targetHeadline) {
      return NextResponse.json(
        { message: "Full Name and Target Headline are required" },
        { status: 400 }
      );
    }

    // Check if user already has a profile
    const existingProfile = await db.profile.findUnique({
      where: { userId: session.user.id },
    });

    if (existingProfile) {
      // Update existing profile
      const updatedProfile = await db.profile.update({
        where: { userId: session.user.id },
        data: {
          fullName,
          title: targetHeadline,
          location: location || "Remote",
          email: email || session.user.email || "",
          phone: phone || null,
          linkedinUrl: linkedinUrl || null,
          portfolioUrl: portfolioUrl || null,
          githubUrl: githubUrl || null,
        },
      });

      return NextResponse.json({ profile: updatedProfile });
    }

    // Create new profile
    const newProfile = await db.profile.create({
      data: {
        userId: session.user.id,
        slug: generateSlug(fullName),
        fullName,
        title: targetHeadline,
        location: location || "Remote",
        email: email || session.user.email || "",
        phone: phone || null,
        linkedinUrl: linkedinUrl || null,
        portfolioUrl: portfolioUrl || null,
        githubUrl: githubUrl || null,
        masterResumePath: "/resumes/placeholder.pdf", // Placeholder for now
      },
    });

    return NextResponse.json({ profile: newProfile });

  } catch (error) {
    console.error("Onboarding complete error:", error);
    return NextResponse.json(
      { message: "An error occurred while saving your profile" },
      { status: 500 }
    );
  }
}
