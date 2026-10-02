import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  getMasterResumeBaseline,
  optimizeResumeForJob,
  renderResumeMarkdown,
  renderResumePlaintext,
} from "@/lib/ai/resumeOptimizer";

export async function POST(req: Request) {
  try {
    let body: {
      profileSlug?: unknown;
      jobPostingId?: unknown;
      customJobTitle?: unknown;
      customJobCompany?: unknown;
      customJobDescription?: unknown;
    };

    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const {
      profileSlug,
      jobPostingId,
      customJobTitle,
      customJobCompany,
      customJobDescription,
    } = body || {};

    const slug = typeof profileSlug === "string" && profileSlug.trim() ? profileSlug.trim().toLowerCase() : "roushan";

    let jobTitle = "Full Stack Software Engineer";
    let company = "Global Remote";
    let jobDescription = "";

    if (typeof jobPostingId === "string" && jobPostingId.trim()) {
      const job = await db.jobPosting.findUnique({
        where: { id: jobPostingId.trim() },
      });

      if (job) {
        jobTitle = job.title;
        company = job.company;
        jobDescription = job.rawDescription || "";
      }
    } else if (typeof customJobTitle === "string" && customJobTitle.trim()) {
      jobTitle = customJobTitle.trim();
      company = typeof customJobCompany === "string" && customJobCompany.trim() ? customJobCompany.trim() : "Target Company";
      jobDescription = typeof customJobDescription === "string" ? customJobDescription.trim() : "";
    }

    let optimizedResume;
    if (jobDescription && jobDescription.length > 20) {
      optimizedResume = await optimizeResumeForJob(slug, jobTitle, company, jobDescription);
    } else {
      optimizedResume = getMasterResumeBaseline(slug);
      optimizedResume.targetRole = jobTitle;
      optimizedResume.targetCompany = company;
    }

    // FIRE & FORGET: Save AstrePilot session for the logged-in user
    // This is separate from the slug-based save in optimizeResumeForJob
    // because the slug lookup may fail; this uses the real auth session
    try {
      const authSession = await getServerSession(authOptions);
      if (authSession?.user?.id && jobDescription.length > 20) {
        const profile = await db.profile.findFirst({
          where: { userId: authSession.user.id },
          select: { id: true },
        });
        if (profile) {
          await db.autopilotSession.create({
            data: {
              profileId: profile.id,
              company,
              jobTitle,
              jdText: jobDescription,
              tailoredSummary: optimizedResume.summary,
              keySkills: JSON.stringify(optimizedResume.matchedKeywords ?? []),
            }
          });
        }
      }
    } catch (sessionErr) {
      console.error("[autopilot session save]", sessionErr);
      // Non-fatal — resume optimization still returns successfully
    }

    const markdown = renderResumeMarkdown(optimizedResume);
    const plaintext = renderResumePlaintext(optimizedResume);

    return NextResponse.json({
      success: true,
      resume: optimizedResume,
      markdown,
      plaintext,
    });
  } catch (error) {
    console.error("Resume Optimization API Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to optimize resume" },
      { status: 500 }
    );
  }
}


