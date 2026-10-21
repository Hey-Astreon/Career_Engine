import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { queryMultiProviderLLM } from "@/lib/ai/router";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import {
  generateDeterministicOutreach,
  OutreachTone,
} from "@/lib/outreachGenerator";
import { canAccessProfile } from "@/lib/authCandidate";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json(
        { success: false, error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const { jobPostingId, profileSlug, tone = "direct" } = body;

    if (!jobPostingId || !profileSlug) {
      return NextResponse.json(
        { success: false, error: "jobPostingId and profileSlug are required" },
        { status: 400 }
      );
    }

    // 1. Fetch Candidate Profile
    const profile = await db.profile.findUnique({
      where: { slug: profileSlug },
      include: { projects: true, virtualExps: true },
    });

    if (!profile) {
      return NextResponse.json(
        { success: false, error: "Candidate profile not found" },
        { status: 404 }
      );
    }

    // Allow outreach generation if user has authorized access (co-developers or profile owner)
    if (!canAccessProfile(session.user, profile)) {
      return NextResponse.json(
        { success: false, error: "Forbidden: You do not have permission to access this candidate profile" },
        { status: 403 }
      );
    }

    // 2. Fetch Job (support both JobPosting and Opportunity)
    let company = "Company";
    let title = "Software Engineer";
    let category = "Engineering";
    let rawDescription = "";

    const jobPosting = await db.jobPosting.findUnique({
      where: { id: jobPostingId },
    });

    if (jobPosting) {
      company = jobPosting.company;
      title = jobPosting.title;
      category = jobPosting.category;
      rawDescription = jobPosting.rawDescription;
    } else {
      const opportunity = await db.opportunity.findUnique({
        where: { id: jobPostingId },
      });
      if (opportunity) {
        company = opportunity.company;
        title = opportunity.title;
        category = opportunity.category;
        rawDescription = opportunity.rawDescription;
      } else {
        return NextResponse.json(
          { success: false, error: "Job posting not found" },
          { status: 404 }
        );
      }
    }

    const candidateName = profile.fullName;
    const candidateRole = profile.title;
    const topProject = profile.projects[0]?.title || "high-throughput cloud applications";
    const topProjectTech = profile.projects[0]?.techStack || "TypeScript, Next.js, and distributed services";

    const candidateContext = {
      fullName: candidateName,
      role: candidateRole,
      email: profile.email,
      phone: profile.phone,
      portfolioUrl: profile.portfolioUrl,
      githubUrl: profile.githubUrl,
      linkedinUrl: profile.linkedinUrl,
      topProject,
      topProjectTech,
    };

    const jobContext = {
      company,
      title,
      category,
      rawDescription,
    };

    const deterministic = generateDeterministicOutreach({
      job: jobContext,
      candidate: candidateContext,
      tone: tone as OutreachTone,
    });

    // Try AI generation via multi-LLM router
    try {
      const prompt = `You are an elite career outreach strategist. Draft high-converting cold outreach materials for a candidate applying to a remote role.

Target Company: ${company}
Target Role: ${title}
Job Summary: ${rawDescription.slice(0, 900)}

Candidate Profile:
Name: ${candidateName}
Headline: ${candidateRole}
Top Project: ${topProject} (${topProjectTech})
Email: ${profile.email}
Tone: ${tone} (Options: intern_referral = Summer 2026 student internship/co-op inquiry; new_grad = entry-level fast-ramping engineer; direct = engineering proof; executive = senior architecture alignment)

Return a valid JSON object strictly matching this schema:
{
  "coldEmailSubject": "A compelling 6-10 word subject line",
  "coldEmailBody": "A concise 3-paragraph cold email with a strong hook, project proof, and clear low-friction call-to-action",
  "linkedinConnectionNote": "Under 300 characters connection invitation note",
  "linkedinInMail": "A 100-150 word direct InMail message",
  "keyTalkingPoints": ["Point 1", "Point 2", "Point 3"]
}`;

      const aiResponse = await queryMultiProviderLLM(
        prompt,
        "You are an expert talent acquisition and career outreach copywriter. Return ONLY valid JSON."
      );

      if (aiResponse?.text) {
        const cleanJson = aiResponse.text.replace(/```json/gi, "").replace(/```/g, "").trim();
        const parsed = JSON.parse(cleanJson);

        return NextResponse.json({
          success: true,
          data: {
            company,
            jobTitle: title,
            recruiterSearchUrl: deterministic.recruiterSearchUrl,
            recruiterSearchQuery: deterministic.recruiterSearchQuery,
            coldEmailSubject: parsed.coldEmailSubject || deterministic.coldEmailSubject,
            coldEmailBody: parsed.coldEmailBody || deterministic.coldEmailBody,
            linkedinConnectionNote: (parsed.linkedinConnectionNote || deterministic.linkedinConnectionNote).slice(0, 300),
            linkedinInMail: parsed.linkedinInMail || deterministic.linkedinInMail,
            keyTalkingPoints: parsed.keyTalkingPoints || deterministic.keyTalkingPoints,
            tone,
          },
        });
      }
    } catch (llmError) {
      console.warn("LLM generation had an issue, using deterministic template fallback:", llmError);
    }

    // Return deterministic result
    return NextResponse.json({
      success: true,
      data: deterministic,
    });
  } catch (error) {
    console.error("Outreach generation error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to generate outreach materials" },
      { status: 500 }
    );
  }
}
