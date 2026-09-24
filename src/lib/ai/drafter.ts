import { queryMultiProviderLLM } from "./router";
import { CandidateContext, extractSkills } from "./scorer";

export interface TailoredKitResult {
  tailoredSummary: string;
  tailoredProjects: Array<{
    title: string;
    techStack: string;
    bullets: string[];
  }>;
  coverLetter: string;
  recruiterMessage: string;
  coldEmail: string;
  followUpDraft: string;
  atsReviewerScore: number;
  reviewerFeedback: string;
}

/**
 * Pure Empirical Reviewer Alignment Calculator (0% to 100%).
 * Evaluates exact keyword overlap between tailored outreach materials and job requirements.
 */
function calculatePureReviewerScore(
  coverLetter: string,
  summary: string,
  jobDescription: string
): number {
  const fullText = (coverLetter + " " + summary).toLowerCase();
  const descWords = jobDescription
    .toLowerCase()
    .split(/[^a-z0-9+#]+/)
    .filter(
      (w) =>
        w.length >= 4 &&
        !["and", "the", "with", "that", "this", "your", "have", "will", "from", "their", "about"].includes(w)
    );

  const uniqueJobWords = Array.from(new Set(descWords));
  if (uniqueJobWords.length === 0) return 65;

  let matchedCount = 0;
  for (const word of uniqueJobWords) {
    if (fullText.includes(word)) {
      matchedCount++;
    }
  }

  const ratio = matchedCount / uniqueJobWords.length;
  const score = Math.round(ratio * 100);
  return Math.min(100, Math.max(25, score));
}

/**
 * Helper to select top matching skills from job description
 */
function getTopMatchedSkills(jobDescription: string, fallbackCount: number = 3): string[] {
  const extracted = extractSkills(jobDescription);
  if (extracted.length > 0) {
    return extracted.slice(0, fallbackCount);
  }
  return ["TypeScript", "REST APIs", "Modern Distributed Systems"];
}

/**
 * Formats cover letter body into standard formal business letter structure
 * using candidate contact details and tailored paragraphs.
 */
export function formatFormalCoverLetter(
  candidate: CandidateContext,
  company: string,
  jobTitle: string,
  rawLetter: string,
  jobDescription: string = ""
): string {
  const dateStr = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const locationStr = candidate.location || "Remote (Open to Global Remote)";
  const emailStr = candidate.email || "candidate@careeragent.local";
  const phoneStr = candidate.phone ? ` | Phone: ${candidate.phone}` : "";
  const portfolioStr = candidate.portfolioUrl ? ` | ${candidate.portfolioUrl.replace(/^https?:\/\//, "")}` : "";
  const githubStr = candidate.githubUrl ? ` | ${candidate.githubUrl.replace(/^https?:\/\//, "")}` : "";

  // Extract core body paragraphs, stripping pre-existing greetings or signoffs
  const bodyText = (rawLetter || "")
    .replace(/^Dear\s+[^,\n]+,?/gi, "")
    .replace(/^To\s+the\s+Hiring\s+Manager,?/gi, "")
    .replace(/Sincerely,[\s\S]*$/gi, "")
    .replace(/Best regards,[\s\S]*$/gi, "")
    .replace(/Thank you for your consideration\.?$/gi, "")
    .trim();

  const paragraphs = bodyText
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter((p) => p.length > 25);

  if (paragraphs.length < 3) {
    const topSkills = getTopMatchedSkills(jobDescription, 4);
    const skillList = topSkills.length > 0 ? topSkills.join(", ") : "low-latency APIs, distributed systems, and AI developer tooling";

    paragraphs.length = 0;
    paragraphs.push(
      `I am writing to express my enthusiastic interest in the ${jobTitle} position at ${company}. As a ${candidate.title}, I specialize in engineering resilient software architectures with a strong focus on ${skillList}. I have followed ${company}'s engineering initiatives with great admiration and am eager to contribute directly to your product roadmap.`
    );
    paragraphs.push(
      `Across my technical work, I have architected and shipped high-performance systems from the ground up. In Astra Vision, I built an AST code-graph parsing engine with subprocess sandbox isolation, parsing full-stack dependency trees under 200ms. In IDBI FinSync, I co-engineered an AI wealth management dashboard with Fastify microservices and PostgreSQL transaction ledgers, handling concurrent balance updates reliably. In Alyra Lock, I developed a zero-knowledge password vault using Web Crypto API primitives (AES-GCM 256-bit, PBKDF2), guaranteeing user data privacy through client-side encryption.`
    );
    paragraphs.push(
      `I operate with high autonomy, automated test discipline (xUnit, Jest, Pytest), and clean architectural design patterns. Because of my flexible schedule, I am available to commit full-time remote hours to ${company} without timezone or academic constraints, bringing immediate shipping velocity and rigorous code quality to your team.`
    );
    paragraphs.push(
      `Thank you for your time and consideration. I would welcome the opportunity to discuss how my technical competencies and project execution align with ${company}'s engineering priorities. You can review my live portfolio at ${candidate.portfolioUrl || "https://astreon.me"} and code repositories at ${candidate.githubUrl || "https://github.com"}.`
    );
  }

  const header = `${candidate.fullName}
${candidate.title}
${locationStr} | Email: ${emailStr}${phoneStr}${portfolioStr}${githubStr}

${dateStr}

Hiring Manager & Engineering Team
${company}

RE: Application for ${jobTitle}`;

  const salutation = `Dear ${company} Hiring Team,`;

  const signoff = `Sincerely,

${candidate.fullName}
${emailStr}${phoneStr}`;

  return `${header}\n\n${salutation}\n\n${paragraphs.join("\n\n")}\n\n${signoff}`;
}

/**
 * Generates tailored Recruiter LinkedIn InMail / DM (<150 words) with high response rate hook.
 */
export function generateRecruiterMessage(
  candidate: CandidateContext,
  company: string,
  jobTitle: string,
  jobDescription: string = ""
): string {
  const topSkills = getTopMatchedSkills(jobDescription, 3);
  const skillHighlight = topSkills.length > 0 ? ` (${topSkills.join(", ")})` : "";
  const portfolio = candidate.portfolioUrl || "portfolio";
  const github = candidate.githubUrl || "github";

  const p1 = candidate.masterProjects[0] || { title: "Astra Vision", architecture: "AST code-graph parsing engine and isolated runtime sandbox" };
  const p2 = candidate.masterProjects[1] || { title: "IDBI FinSync", architecture: "AI-integrated wealth management engine with PostgreSQL ledgers" };

  return `Hi [Recruiter Name],

I recently submitted my application for the ${jobTitle} role at ${company} and wanted to reach out directly.

I am a ${candidate.title} specializing in building high-performance systems and developer tooling${skillHighlight}. Key projects I've built and shipped:
* **${p1.title.split(" - ")[0]}:** ${p1.architecture}
* **${p2.title.split(" - ")[0]}:** ${p2.architecture}

I have full availability for global remote engineering roles and prioritize fast shipping velocity with automated test rigor. You can explore my live demos at ${portfolio} and code on GitHub (${github}).

Would you be open to a quick 10-minute chat this week to discuss how my background aligns with ${company}'s engineering roadmap?

Best regards,
${candidate.fullName}
${candidate.email || ""}`;
}

/**
 * Generates high-impact Cold Email for Startup Founders and CTOs with tailored subject line.
 */
export function generateColdEmail(
  candidate: CandidateContext,
  company: string,
  jobTitle: string,
  jobDescription: string = ""
): string {
  const topSkills = getTopMatchedSkills(jobDescription, 3);
  const skillSubject = topSkills.length > 0 ? topSkills.slice(0, 2).join(" / ") : "Systems & Full-Stack";
  const portfolio = candidate.portfolioUrl || "portfolio";
  const github = candidate.githubUrl || "github";

  const p1 = candidate.masterProjects[0] || { title: "Astra Vision", architecture: "AST code parsing with isolated runtime sandboxes under 200ms" };
  const p2 = candidate.masterProjects[1] || { title: "IDBI FinSync", architecture: "Fastify/PostgreSQL ledgers handling concurrent transactions safely" };
  const p3 = candidate.masterProjects[2] || { title: "Alyra Lock", architecture: "Client-side zero-knowledge vault utilizing Web Crypto AES-GCM (256-bit)" };

  return `Subject: ${jobTitle} (${skillSubject}) — ${candidate.fullName} (Portfolio & Systems Demos)

Hi [Founder / CTO Name],

I saw that ${company} is hiring for ${jobTitle}—I'm a big admirer of the engineering approach and product velocity you're building in this space.

I am a ${candidate.title}. I specialize in building zero-to-one systems rapidly, with clean architecture, low-latency APIs, and comprehensive test coverage.

Highlights of what I've engineered and shipped:
1. **${p1.title.split(" - ")[0]}:** ${p1.architecture}
2. **${p2.title.split(" - ")[0]}:** ${p2.architecture}
3. **${p3.title.split(" - ")[0]}:** ${p3.architecture}

I have 100% full-time availability for remote engineering initiatives with zero schedule conflicts.

Live Portfolio: ${portfolio}
GitHub: ${github}

Do you have 10 minutes for a brief introductory technical chat next week?

Best,
${candidate.fullName}
${candidate.email || ""}${candidate.phone ? ` | ${candidate.phone}` : ""}`;
}

/**
 * Generates value-additive 7-Day Follow-Up note.
 */
export function generateFollowUpDraft(
  candidate: CandidateContext,
  company: string,
  jobTitle: string,
  jobDescription: string = ""
): string {
  const topSkills = getTopMatchedSkills(jobDescription, 2);
  const skillStr = topSkills.length > 0 ? ` focused on ${topSkills.join(" and ")}` : "";
  const portfolio = candidate.portfolioUrl || "portfolio";
  const github = candidate.githubUrl || "github";

  return `Subject: Re: Application / Following Up: ${jobTitle} — ${candidate.fullName}

Hi [Hiring Manager / Recruiter Name],

I hope you're having a great week.

I submitted my application for the ${jobTitle} position at ${company} last week and wanted to follow up respectfully.

I remain deeply interested in ${company}'s engineering initiatives${skillStr}. With my hands-on background in low-latency APIs, zero-knowledge cryptographic architectures, and AI-powered tooling, I am confident I can contribute immediate value to your sprint cycle.

You can review my live interactive projects at ${portfolio} and review my open-source code repositories at ${github}.

Please let me know if I can provide any code samples, live demonstrations, or further details.

Thank you for your time,
${candidate.fullName}
${candidate.email || ""}${candidate.phone ? ` | ${candidate.phone}` : ""}`;
}

/**
 * Main Application Kit Generator with multi-provider AI drafting and complete outreach suite.
 */
export async function generateTailoredKit(
  candidate: CandidateContext,
  jobTitle: string,
  company: string,
  jobDescription: string
): Promise<TailoredKitResult> {
  const drafterSystemPrompt = `You are an elite Resume Architect, Technical Career Strategist, and High-Conversion Cold Outreach Copywriter tailoring an application kit for ${candidate.fullName} applying for '${jobTitle}' at '${company}'.
Your goal is to produce application materials with maximum response rates from Recruiters, Founders, and Engineering Leaders by directly mapping the candidate's real flagship projects, architectures, and technical competencies to the exact needs, stack, and domain challenges in the job description.
Return ONLY valid JSON with keys:
- "tailoredSummary": A 3-4 sentence high-impact professional summary tailored to this role and company stack.
- "tailoredProjects": Array of 3 objects { "title": string, "techStack": string, "bullets": [string, string, string] } with bullet points highlighting the architectural aspects relevant to the target job.
- "coverLetter": A formal 4-paragraph cover letter body addressing the hiring team at ${company}, citing specific technical needs from the JD, candidate's matching flagship implementations, and full-time remote availability.
- "recruiterMessage": A high-response LinkedIn Recruiter InMail (<150 words) starting with a strong hook about ${company}'s ${jobTitle} role, citing 2 matching technical projects with live links, and ending with a low-friction 10-min chat invite.
- "coldEmail": A high-conversion cold email for Startup Founders / CTOs / Engineering VPs with an engaging subject line (e.g. 'Subject: ...'), opening with technical respect for their stack/product, 2-3 impact-driven bullet points mapping candidate's systems to their roadmap, and a low-friction call invite.
- "followUpDraft": A thoughtful, value-additive 7-day follow-up note (including Subject line) that references the initial application, adds a relevant technical insight or code repository demonstration, and respectfully follows up.`;

  const drafterUserPrompt = `
TARGET ROLE: ${jobTitle} at ${company}
JOB DESCRIPTION:
${jobDescription}

CANDIDATE MASTER PROFILE:
Name: ${candidate.fullName}
Title: ${candidate.title}
Location: ${candidate.location || "Remote"}
Email: ${candidate.email || ""}
Phone: ${candidate.phone || ""}
Portfolio: ${candidate.portfolioUrl || ""}
GitHub: ${candidate.githubUrl || ""}
Flagship Projects:
${candidate.masterProjects.map((p) => `- ${p.title} (${p.techStack}): ${p.architecture}`).join("\n")}

TASKS:
1. Write a high-impact, 3-4 sentence Professional Summary specifically tailored to the technical requirements and mission of ${company}.
2. Rewrite 3 bullet points for each of the top 3 flagship projects emphasizing the technologies, architectural patterns, and performance metrics relevant to this ${jobTitle} role.
3. Write a bespoke 4-paragraph formal Cover Letter body addressed to ${company}.
4. Write a tailored LinkedIn Recruiter DM (<150 words) with high response rate potential.
5. Write a tailored Founder / CTO Cold Email with optimized Subject line and project proof points.
6. Write a tailored 7-Day Follow-Up note with Subject line adding fresh value and code demonstration.
`;

  try {
    const draftRes = await queryMultiProviderLLM(drafterSystemPrompt, drafterUserPrompt, true);
    if (draftRes.text) {
      const draft = JSON.parse(draftRes.text);

      const formattedLetter = formatFormalCoverLetter(
        candidate,
        company,
        jobTitle,
        draft.coverLetter || "",
        jobDescription
      );

      const dynamicScore = calculatePureReviewerScore(
        formattedLetter,
        draft.tailoredSummary || "",
        jobDescription
      );

      const recruiterMsg = draft.recruiterMessage && draft.recruiterMessage.length > 50
        ? draft.recruiterMessage
        : generateRecruiterMessage(candidate, company, jobTitle, jobDescription);

      const coldEmail = draft.coldEmail && draft.coldEmail.length > 50
        ? draft.coldEmail
        : generateColdEmail(candidate, company, jobTitle, jobDescription);

      const followUp = draft.followUpDraft && draft.followUpDraft.length > 50
        ? draft.followUpDraft
        : generateFollowUpDraft(candidate, company, jobTitle, jobDescription);

      return {
        tailoredSummary: draft.tailoredSummary || `Specialist ${candidate.title} focusing on high-velocity delivery for ${jobTitle} at ${company}.`,
        tailoredProjects: draft.tailoredProjects && draft.tailoredProjects.length > 0 ? draft.tailoredProjects : candidate.masterProjects.map(p => ({
          title: p.title,
          techStack: p.techStack,
          bullets: [
            `Product Architecture: Engineered ${p.title} utilizing ${p.techStack} to support high-throughput operations.`,
            `Engineering Challenge: Solved concurrency and latency bottlenecks with automated verification.`,
            `Performance & Security: Built zero-knowledge protocols and optimized response times under 200ms.`
          ]
        })),
        coverLetter: formattedLetter,
        recruiterMessage: recruiterMsg,
        coldEmail: coldEmail,
        followUpDraft: followUp,
        atsReviewerScore: dynamicScore,
        reviewerFeedback: `${dynamicScore}% keyword & architectural alignment for ${jobTitle} at ${company}. (AI Engine: ${draftRes.provider.toUpperCase()})`,
      };
    }
  } catch (err) {
    console.warn("[Drafter Agent Warning] Multi-provider query failed, using dynamic tailored fallback:", (err as Error).message);
  }

  // Fallback Rule-Based Dynamic Application Kit Drafter
  return generateFallbackKit(candidate, jobTitle, company, jobDescription);
}

function generateFallbackKit(
  candidate: CandidateContext,
  jobTitle: string,
  company: string,
  jobDescription: string
): TailoredKitResult {
  const topSkills = getTopMatchedSkills(jobDescription, 4);
  const skillString = topSkills.length > 0 ? topSkills.join(", ") : "low-latency REST APIs, concurrent microservices, and AI developer tooling";

  const summary = `${candidate.title} with hands-on expertise in building production-grade distributed systems and modern applications using ${skillString}. Proven track record of architecting AST code graph parsing sandboxes, AI-integrated financial ledgers, and zero-knowledge cryptographic vaults, tailored for high-impact ${jobTitle} initiatives at ${company}.`;

  const formattedLetter = formatFormalCoverLetter(
    candidate,
    company,
    jobTitle,
    "",
    jobDescription
  );

  const dynamicScore = calculatePureReviewerScore(formattedLetter, summary, jobDescription);

  return {
    tailoredSummary: summary,
    tailoredProjects: candidate.masterProjects.map((p) => ({
      title: p.title,
      techStack: p.techStack,
      bullets: [
        `Product Architecture: Architected a resilient system platform utilizing ${p.techStack} tailored for ${jobTitle} requirements at ${company}.`,
        `Engineering Challenge: Engineered low-latency API endpoints and database transaction safety, keeping response latencies under 200ms.`,
        `Performance & Security: Implemented comprehensive automated test coverage (xUnit/Jest/Pytest) and robust encryption protocols.`,
      ],
    })),
    coverLetter: formattedLetter,
    recruiterMessage: generateRecruiterMessage(candidate, company, jobTitle, jobDescription),
    coldEmail: generateColdEmail(candidate, company, jobTitle, jobDescription),
    followUpDraft: generateFollowUpDraft(candidate, company, jobTitle, jobDescription),
    atsReviewerScore: dynamicScore,
    reviewerFeedback: `Dynamic tailored application kit calculated at ${dynamicScore}% keyword density alignment for ${jobTitle} at ${company}.`,
  };
}
