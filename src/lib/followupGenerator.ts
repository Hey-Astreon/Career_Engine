export type FollowupTone = "nudge" | "project_update" | "referral";

export interface FollowupCandidateContext {
  fullName: string;
  email: string;
  phone?: string | null;
  portfolioUrl?: string | null;
  githubUrl?: string | null;
  topProject?: string;
  topTech?: string;
}

export interface FollowupDraftResult {
  tone: FollowupTone;
  subject: string;
  body: string;
  fullDraft: string;
  mailtoUrl: string;
  company: string;
  title: string;
}

export function generateFollowupDraft(params: {
  company: string;
  title: string;
  candidate: FollowupCandidateContext;
  tone?: FollowupTone;
  daysSilent?: number;
}): FollowupDraftResult {
  const { company, title, candidate, tone = "nudge", daysSilent = 0 } = params;
  const fullName = candidate.fullName || "Candidate";
  const email = candidate.email || "";
  const phone = candidate.phone ? ` | ${candidate.phone}` : "";
  const link = candidate.portfolioUrl || candidate.githubUrl || "";
  const linkSuffix = link ? ` | ${link}` : "";
  const signature = `${fullName}\n${email}${phone}${linkSuffix}`;

  const topProject = candidate.topProject || "high-throughput cloud applications";
  const topTech = candidate.topTech || "TypeScript, Next.js, and distributed microservices";

  let subject = "";
  let body = "";

  switch (tone) {
    case "project_update":
      subject = `Application Update: ${title} — ${fullName}`;
      body = `Dear ${company} Engineering Team,

I hope this email finds you well.

Following up on my application for the ${title} position, I wanted to share a relevant technical update that directly connects with ${company}'s engineering focus.

I recently engineered ${topProject} using ${topTech}, focusing on high-throughput data processing, robust API contracts, and clean error handling. You can review the architecture and code here: ${link || "my portfolio"}.

I would welcome the opportunity to discuss how this hands-on engineering experience can add immediate value to ${company}'s technical roadmap.

Thank you for your time and consideration,

Best regards,
${signature}`;
      break;

    case "referral":
      subject = `Quick inquiry regarding ${title} opening — ${fullName}`;
      body = `Hi ${company} Team,

I recently applied for the ${title} opening and wanted to reach out directly to express my strong enthusiasm for joining ${company}.

With hands-on experience building performant systems in ${topTech}, I have been closely tracking your team's engineering growth.

Could you let me know who leads the hiring team for this role, or if there is someone on the engineering team I might connect with for a brief 10-minute technical chat?

Appreciate your guidance and time,

Best regards,
${signature}`;
      break;

    case "nudge":
    default:
      const timeContext = daysSilent >= 10 ? "submitted recently" : "submitted last week";
      subject = `Following up on application for ${title} — ${fullName}`;
      body = `Dear ${company} Hiring Team,

I hope you are having a productive week.

I wanted to briefly follow up on my application for the ${title} role ${timeContext}. I remain very enthusiastic about ${company}'s mission and the prospect of contributing to your engineering team.

I know you are reviewing many applications, so please let me know if you need any additional information, code samples, or references from my end.

Thank you again for your time and consideration, and I look forward to hearing from you.

Best regards,
${signature}`;
      break;
  }

  const fullDraft = `Subject: ${subject}\n\n${body}`;
  const mailtoUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  return {
    tone,
    subject,
    body,
    fullDraft,
    mailtoUrl,
    company,
    title,
  };
}
