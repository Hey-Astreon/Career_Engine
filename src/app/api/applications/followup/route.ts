import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { applicationId } = await req.json();

    if (!applicationId) {
      return NextResponse.json(
        { success: false, error: "applicationId is required" },
        { status: 400 }
      );
    }

    const application = await db.application.findUnique({
      where: { id: applicationId },
      include: { profile: true, jobPosting: true },
    });

    // Non-owners get the same response as a missing application
    if (!application || application.profile.userId !== session.user.id) {
      return NextResponse.json(
        { success: false, error: "Application not found" },
        { status: 404 }
      );
    }

    const company = application.jobPosting?.company || "Company";
    const title = application.jobPosting?.title || "Software Engineer";

    const draft = `Subject: Following up regarding ${title} position - ${application.profile.fullName}

Dear Hiring Team at ${company},

I hope this email finds you well.

I am writing to express my continued enthusiasm for the ${title} role. I submitted my application recently and remain very interested in contributing to ${company}'s engineering initiatives.

Given my background in building low-latency REST APIs, concurrent microservices, and zero-knowledge cryptographic architectures, I would welcome the opportunity to discuss how my skill set aligns with your team's goals.

Please let me know if there are any additional details or work samples I can provide. Thank you for your time and consideration.

Best regards,

${application.profile.fullName}
${application.profile.email} | ${application.profile.phone || ""}
${application.profile.portfolioUrl || ""}`;

    return NextResponse.json({
      success: true,
      followupDraft: draft,
      company,
      title,
    });
  } catch (error) {
    console.error("Follow-up draft generation API error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to generate follow-up draft" },
      { status: 500 }
    );
  }
}
