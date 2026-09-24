import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { queryMultiProviderLLM } from "@/lib/ai/router";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
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

    // 2. Fetch Job Posting
    const job = await db.jobPosting.findUnique({
      where: { id: jobPostingId },
    });

    if (!job) {
      return NextResponse.json(
        { success: false, error: "Job posting not found" },
        { status: 404 }
      );
    }

    const candidateName = profile.fullName;
    const candidateRole = profile.title;
    const topProject = profile.projects[0]?.title || "high-throughput cloud applications";
    const topProjectTech = profile.projects[0]?.techStack || "TypeScript, Next.js, and distributed services";

    const recruiterSearchQuery = `${job.company} ${job.category || "Engineering"} Recruiter OR Hiring Manager`;
    const recruiterSearchUrl = `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(
      recruiterSearchQuery
    )}`;

    // Fallback deterministic templates (rock solid)
    const fallbackColdEmailSubject = `Application for ${job.title} — ${candidateName}`;
    const fallbackColdEmailBody = `Hi Team at ${job.company},

I noticed your open ${job.title} position and wanted to reach out directly. 

As a ${candidateRole}, I specialize in building performant, resilient systems with ${topProjectTech}. Recently, I engineered ${topProject}, focusing on scalable architecture, clean API contracts, and high availability.

Given ${job.company}'s focus on innovation, I'm confident my background aligns well with the challenges your engineering team tackles.

I would love to learn more about the team's roadmap. Could we connect for a brief 10-minute chat this week?

Best regards,
${candidateName}
${profile.email} | ${profile.portfolioUrl || profile.githubUrl || ""}`;

    const fallbackLinkedinNote = `Hi! I noticed the ${job.title} role at ${job.company}. I'm a ${candidateRole} specializing in ${topProjectTech}. Would love to connect and follow ${job.company}'s work! — ${candidateName}`.slice(0, 298);

    const fallbackInMail = `Hi,

I came across the ${job.title} opening at ${job.company} and was immediately drawn to the technical scope. 

With deep hands-on experience in ${topProjectTech}, I recently developed ${topProject}. I have a proven track record of shipping production-grade code with high reliability.

Are you the right person to speak with regarding this position, or could you point me toward the hiring lead? 

Thanks for your time,
${candidateName}
${profile.linkedinUrl || ""}`;

    const fallbackTalkingPoints = [
      `Deep expertise in ${topProjectTech} directly relevant to ${job.company}`,
      `Production experience delivering ${topProject}`,
      `Immediate availability for remote full-time opportunities`,
    ];

    // Try AI generation via multi-LLM router
    try {
      const prompt = `You are an elite executive career strategist. Draft high-converting cold outreach materials for a candidate applying to a remote role.

Target Company: ${job.company}
Target Role: ${job.title}
Job Summary: ${job.rawDescription.slice(0, 900)}

Candidate Profile:
Name: ${candidateName}
Headline: ${candidateRole}
Top Project: ${topProject} (${topProjectTech})
Email: ${profile.email}
Tone: ${tone}

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
            company: job.company,
            jobTitle: job.title,
            recruiterSearchUrl,
            recruiterSearchQuery,
            coldEmailSubject: parsed.coldEmailSubject || fallbackColdEmailSubject,
            coldEmailBody: parsed.coldEmailBody || fallbackColdEmailBody,
            linkedinConnectionNote: (parsed.linkedinConnectionNote || fallbackLinkedinNote).slice(0, 300),
            linkedinInMail: parsed.linkedinInMail || fallbackInMail,
            keyTalkingPoints: parsed.keyTalkingPoints || fallbackTalkingPoints,
          },
        });
      }
    } catch (llmError) {
      console.warn("LLM generation had an issue, using deterministic template fallback:", llmError);
    }

    // Return deterministic result
    return NextResponse.json({
      success: true,
      data: {
        company: job.company,
        jobTitle: job.title,
        recruiterSearchUrl,
        recruiterSearchQuery,
        coldEmailSubject: fallbackColdEmailSubject,
        coldEmailBody: fallbackColdEmailBody,
        linkedinConnectionNote: fallbackLinkedinNote,
        linkedinInMail: fallbackInMail,
        keyTalkingPoints: fallbackTalkingPoints,
      },
    });
  } catch (error) {
    console.error("Outreach generation error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to generate outreach materials" },
      { status: 500 }
    );
  }
}
