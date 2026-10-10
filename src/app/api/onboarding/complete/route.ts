import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

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
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      fullName, targetHeadline, location, email, phone,
      linkedinUrl, portfolioUrl, githubUrl,
      // New AstrePilot brain fields
      careerStage, yearsOfExperience, workType, salaryRange,
      workAuthorized, requiresVisa, targetCountries, primarySkills,
      // Demographics and Logistics
      noticePeriod, willingnessToRelocate, highestEducation,
      gender, pronouns,
      streetAddress, apartment, zipCode,
    } = body;

    if (!fullName || !targetHeadline) {
      return NextResponse.json(
        { message: "Full Name and Target Headline are required" },
        { status: 400 }
      );
    }

    const profileData = {
      fullName,
      title: targetHeadline,
      location: location || "Remote",
      email: email || session.user.email || "",
      phone: phone || null,
      linkedinUrl: linkedinUrl || null,
      portfolioUrl: portfolioUrl || null,
      githubUrl: githubUrl || null,
      // AstrePilot brain fields
      careerStage: careerStage || null,
      yearsOfExperience: yearsOfExperience ? Number(yearsOfExperience) : null,
      workType: workType || null,
      salaryRange: salaryRange || null,
      workAuthorized: workAuthorized !== false, // default true
      requiresVisa: requiresVisa === true,
      targetCountries: targetCountries ? JSON.stringify(targetCountries) : null,
      primarySkills: primarySkills ? JSON.stringify(primarySkills) : null,
      noticePeriod: noticePeriod || null,
      willingnessToRelocate: willingnessToRelocate === true,
      highestEducation: highestEducation || null,
      gender: gender || null,
      pronouns: pronouns || null,
      streetAddress: streetAddress || null,
      apartment: apartment || null,
      zipCode: zipCode || null,
    };

    const existingProfile = await db.profile.findUnique({
      where: { userId: session.user.id },
    });

    if (existingProfile) {
      const updatedProfile = await db.profile.update({
        where: { userId: session.user.id },
        data: profileData,
      });
      return NextResponse.json({ profile: updatedProfile });
    }

    const newProfile = await db.profile.create({
      data: {
        userId: session.user.id,
        slug: generateSlug(fullName),
        masterResumePath: "/resumes/placeholder.pdf",
        ...profileData,
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
