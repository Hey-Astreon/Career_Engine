export type OutreachTone = "intern_referral" | "new_grad" | "direct" | "executive";

export interface OutreachCandidateContext {
  fullName: string;
  role: string;
  email: string;
  phone?: string | null;
  portfolioUrl?: string | null;
  githubUrl?: string | null;
  linkedinUrl?: string | null;
  topProject?: string;
  topProjectTech?: string;
}

export interface OutreachJobContext {
  company: string;
  title: string;
  category?: string;
  rawDescription?: string;
}

export interface OutreachMaterials {
  company: string;
  jobTitle: string;
  recruiterSearchUrl: string;
  recruiterSearchQuery: string;
  coldEmailSubject: string;
  coldEmailBody: string;
  linkedinConnectionNote: string;
  linkedinInMail: string;
  keyTalkingPoints: string[];
  tone: OutreachTone;
}

export function generateDeterministicOutreach(params: {
  job: OutreachJobContext;
  candidate: OutreachCandidateContext;
  tone?: OutreachTone;
}): OutreachMaterials {
  const { job, candidate, tone = "direct" } = params;

  const candidateName = candidate.fullName || "Candidate";
  const candidateRole = candidate.role || "Software Engineer";
  const topProject = candidate.topProject || "high-throughput cloud applications";
  const topProjectTech = candidate.topProjectTech || "TypeScript, Next.js, and distributed services";
  const link = candidate.portfolioUrl || candidate.githubUrl || "";
  const linkSignature = link ? ` | ${link}` : "";

  const recruiterSearchQuery = `${job.company} ${job.category || "Engineering"} Recruiter OR Hiring Manager`;
  const recruiterSearchUrl = `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(
    recruiterSearchQuery
  )}`;

  let coldEmailSubject = "";
  let coldEmailBody = "";
  let linkedinConnectionNote = "";
  let linkedinInMail = "";
  let keyTalkingPoints: string[] = [];

  switch (tone) {
    case "intern_referral":
      coldEmailSubject = `Summer 2026 Internship Inquiry: ${job.title} at ${job.company} — ${candidateName}`;
      coldEmailBody = `Hi Team at ${job.company},

I noticed your open ${job.title} position and wanted to reach out directly.

As an aspiring Software Engineer, I focus on building performant software with ${topProjectTech}. Recently, I engineered ${topProject}, implementing scalable architecture, clean API patterns, and reliable systems.

I am actively looking for a Summer 2026 internship / co-op where I can contribute to production-grade engineering while learning from senior mentors on the ${job.company} team.

Could you point me to the recruiter or engineering manager overseeing the 2026 intern cohort?

Best regards,
${candidateName}
${candidate.email}${linkSignature}`;

      linkedinConnectionNote = `Hi! I saw the ${job.title} role at ${job.company}. I'm a student engineer specializing in ${topProjectTech} and recently built ${topProject}. Would love to connect regarding internship opportunities! — ${candidateName}`.slice(
        0,
        298
      );

      linkedinInMail = `Hi,

I came across the ${job.title} opening at ${job.company} and was excited by the team's engineering scope.

As a student engineer with hands-on experience in ${topProjectTech}, I recently shipped ${topProject}. I am actively seeking a Summer 2026 software engineering internship / co-op.

Could you point me toward the right recruiter or engineering lead managing the internship program?

Thanks for your time,
${candidateName}
${candidate.linkedinUrl || link || ""}`;

      keyTalkingPoints = [
        `Immediate availability for Summer 2026 remote internship / co-op`,
        `Demonstrated production engineering through ${topProject}`,
        `Strong fundamentals in ${topProjectTech}`,
      ];
      break;

    case "new_grad":
      coldEmailSubject = `New Grad Software Engineer: ${job.title} — ${candidateName}`;
      coldEmailBody = `Hi Team at ${job.company},

I noticed the open ${job.title} role and wanted to introduce myself directly.

As an early-career engineer specializing in ${topProjectTech}, I recently shipped ${topProject}. Throughout my work, I have prioritized strong software engineering fundamentals: test coverage, clean modular code, and reliable deployments.

I am seeking an entry-level / new-grad opportunity where I can make an immediate engineering impact from day one.

Could we connect for a brief 10-minute technical chat regarding the role?

Best regards,
${candidateName}
${candidate.email}${linkSignature}`;

      linkedinConnectionNote = `Hi! I noticed the ${job.title} opening at ${job.company}. I'm an entry-level engineer specializing in ${topProjectTech} and recently built ${topProject}. Would love to connect! — ${candidateName}`.slice(
        0,
        298
      );

      linkedinInMail = `Hi,

I came across the ${job.title} position at ${job.company} and was immediately drawn to the technical scope.

With deep hands-on experience in ${topProjectTech}, I recently engineered ${topProject}. I bring high execution velocity and a passion for production-grade code.

Are you the right person to speak with regarding entry-level engineering roles, or could you point me to the hiring lead?

Thanks for your time,
${candidateName}
${candidate.linkedinUrl || link || ""}`;

      keyTalkingPoints = [
        `Zero-ramp-up execution capability in ${topProjectTech}`,
        `Proven project delivery with ${topProject}`,
        `Immediate availability for remote full-time positions`,
      ];
      break;

    case "executive":
      coldEmailSubject = `${job.title} Alignment — ${candidateName}`;
      coldEmailBody = `Hi Team at ${job.company},

I came across the ${job.title} opportunity and wanted to reach out to share how my background aligns with your team's technical roadmap.

Throughout my work engineering ${topProject} with ${topProjectTech}, my focus has been on architectural clarity, resilient data pipelines, and scalable velocity.

I would welcome the opportunity to discuss how this experience can accelerate ${job.company}'s engineering objectives.

Best regards,
${candidateName}
${candidate.email}${linkSignature}`;

      linkedinConnectionNote = `Hi! I saw the ${job.title} role at ${job.company}. I focus on scalable architectures in ${topProjectTech} and recently shipped ${topProject}. Would love to connect! — ${candidateName}`.slice(
        0,
        298
      );

      linkedinInMail = `Hi,

I noticed the ${job.title} opening at ${job.company} and wanted to reach out regarding technical scope.

With a strong track record in ${topProjectTech} and architecture like ${topProject}, I focus on high-impact, reliable systems.

Would you be open to a brief conversation regarding the team's roadmap and upcoming milestones?

Best regards,
${candidateName}
${candidate.linkedinUrl || link || ""}`;

      keyTalkingPoints = [
        `Architectural clarity and scalable system design with ${topProjectTech}`,
        `Proven ownership delivering ${topProject}`,
        `Cross-functional collaboration and rapid execution`,
      ];
      break;

    case "direct":
    default:
      coldEmailSubject = `Application for ${job.title} — ${candidateName}`;
      coldEmailBody = `Hi Team at ${job.company},

I noticed your open ${job.title} position and wanted to reach out directly.

As a ${candidateRole}, I specialize in building performant, resilient systems with ${topProjectTech}. Recently, I engineered ${topProject}, focusing on scalable architecture, clean API contracts, and high availability.

Given ${job.company}'s focus on innovation, I'm confident my background aligns well with the challenges your engineering team tackles.

I would love to learn more about the team's roadmap. Could we connect for a brief 10-minute chat this week?

Best regards,
${candidateName}
${candidate.email}${linkSignature}`;

      linkedinConnectionNote = `Hi! I noticed the ${job.title} role at ${job.company}. I'm a ${candidateRole} specializing in ${topProjectTech}. Would love to connect and follow ${job.company}'s work! — ${candidateName}`.slice(
        0,
        298
      );

      linkedinInMail = `Hi,

I came across the ${job.title} opening at ${job.company} and was immediately drawn to the technical scope.

With deep hands-on experience in ${topProjectTech}, I recently developed ${topProject}. I have a proven track record of shipping production-grade code with high reliability.

Are you the right person to speak with regarding this position, or could you point me toward the hiring lead?

Thanks for your time,
${candidateName}
${candidate.linkedinUrl || link || ""}`;

      keyTalkingPoints = [
        `Deep expertise in ${topProjectTech} directly relevant to ${job.company}`,
        `Production experience delivering ${topProject}`,
        `Immediate availability for remote full-time opportunities`,
      ];
      break;
  }

  return {
    company: job.company,
    jobTitle: job.title,
    recruiterSearchUrl,
    recruiterSearchQuery,
    coldEmailSubject,
    coldEmailBody,
    linkedinConnectionNote,
    linkedinInMail,
    keyTalkingPoints,
    tone,
  };
}
