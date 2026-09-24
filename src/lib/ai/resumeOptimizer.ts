import { queryMultiProviderLLM } from "./router";
import { extractSkills } from "./scorer";
export * from "../resumeBaseline";
import {
  OptimizedResume,
  getMasterResumeBaseline,
} from "../resumeBaseline";

/**
 * Optimizes and tailors the 1-page A4 resume for a specific target job using Big Tech Recruiter & Google XYZ standards
 */
export async function optimizeResumeForJob(
  profileSlug: string,
  jobTitle: string,
  company: string,
  jobDescription: string
): Promise<OptimizedResume> {
  const baseline = getMasterResumeBaseline(profileSlug);
  const targetSkills = extractSkills(jobDescription);

  const matchedKeywords = targetSkills.filter((sk) =>
    baseline.skills.some((cat) => cat.skillsText.toLowerCase().includes(sk.toLowerCase())) ||
    baseline.projects.some((p) => p.techStack.toLowerCase().includes(sk.toLowerCase())) ||
    baseline.summary.toLowerCase().includes(sk.toLowerCase())
  );

  const missingKeywords = targetSkills.filter((sk) => !matchedKeywords.includes(sk)).slice(0, 5);

  const systemPrompt = `You are a Senior Principal Recruiter and Hiring Director at a Tier-1 Big Tech MNC (Google, Meta, Stripe standard) tailoring an executive 1-page A4 resume for ${baseline.header.fullName} applying for '${jobTitle}' at '${company}'.

STRICT WRITING & RECRUITING RULES:
1. FACTUAL INTEGRITY (NO HALLUCINATIONS):
   - NEVER fabricate years of experience or enterprise domains the candidate never built (e.g. NEVER claim to be an SAP consultant, Salesforce developer, or 10-year veteran).
   - The candidate is a high-caliber Systems, Backend, and AI Full-Stack Engineer. Frame their real strengths (low-latency APIs, distributed microservices, database transactions, AST parsers, cryptographic security, automated testing) to demonstrate exceptional transferability for '${jobTitle}' at '${company}'.

2. BAN ROBOTIC AI BUZZWORDS & FLUFF:
   - FORBIDDEN WORDS: "Seasoned", "Proven track record", "Passionate", "Driving excellence", "Results-oriented", "Spearheaded", "Dynamic", "Adept at".
   - Use direct, authoritative, human technical statements.

3. GOOGLE XYZ POWER-VERB FORMULA FOR ALL BULLETS:
   - Structure: [Decisive Technical Verb] [Specific System Built/Optimized] using [Exact Tech Stack] to [Achieve concrete performance/reliability outcome].
   - Verbs to use: Architected, Engineered, Benchmarked, Streamlined, Hardened, Containerized, Decoupled, Orchestrated, Profiled, Accelerated.
   - Example: "Architected streaming financial analytics pipeline using Google Gemini SDK and Fastify microservices, slashing transaction anomaly detection latency by 35%."

4. ATS FORMATTING & GEOMETRY:
   - Strictly maintain the 6 standard sections (Header, Professional Summary, 6 Categorized Skill Groups, 3 Flagship Projects, 3 Virtual Simulations, Education).
   - Keep the summary to exactly 4 dense, impactful lines (no fluff).
   - Ensure standard capitalization: PostgreSQL, FastAPI, TypeScript, Node.js, xUnit, Web Crypto API (AES-GCM 256-bit), PBKDF2.
   - NEVER mention Coco AI.

Return ONLY a valid JSON object with keys:
- "targetHeadline": string (Punchy 1-line tailored professional title, e.g. "Software Engineer | Backend, Systems & Distributed Architecture")
- "summary": string (Dense, authoritative 4-line summary highlighting real systems strengths mapped to the role)
- "skills": array of 6 objects { "categoryName": string, "skillsText": string } (Front-load matching skills in each category)
- "projects": array of 3 objects { "title": string, "techStack": string, "liveDemoUrl": string, "githubUrl": string, "bullets": [string, string, string] } (Google XYZ bullet points)
`;

  const userPrompt = `
TARGET ROLE: ${jobTitle} at ${company}
JOB DESCRIPTION:
${jobDescription}

CANDIDATE FACTUAL BACKGROUND:
Candidate: ${baseline.header.fullName}
Headline: ${baseline.header.targetHeadline}
Education: ${baseline.education.degree}, ${baseline.education.university} (${baseline.education.period})
Summary: ${baseline.summary}
Skills:
${baseline.skills.map((s) => `- ${s.categoryName}: ${s.skillsText}`).join("\n")}
Projects:
${baseline.projects.map((p) => `### ${p.title} (${p.techStack})\n${p.bullets.join("\n")}`).join("\n\n")}

TASKS:
1. Write a punchy headline and authoritative 4-line Professional Summary tailored for ${jobTitle} at ${company} without fabricating fictitious domains.
2. Front-load relevant technical skills in the 6 categories.
3. Polish the 3 flagship projects into high-impact Google XYZ bullet points.
`;

  try {
    const aiRes = await queryMultiProviderLLM(systemPrompt, userPrompt, true);
    if (aiRes.text) {
      const parsed = JSON.parse(aiRes.text);

      const tailoredHeadline = parsed.targetHeadline || baseline.header.targetHeadline;
      const tailoredSummary = parsed.summary || baseline.summary;
      const tailoredSkills = Array.isArray(parsed.skills) && parsed.skills.length === 6 ? parsed.skills : baseline.skills;
      const tailoredProjects = Array.isArray(parsed.projects) && parsed.projects.length === 3 ? parsed.projects : baseline.projects;

      const fullText = (tailoredSummary + " " + JSON.stringify(tailoredSkills) + " " + JSON.stringify(tailoredProjects)).toLowerCase();
      const finalMatched = targetSkills.filter((s) => fullText.includes(s.toLowerCase()));
      const finalMissing = targetSkills.filter((s) => !finalMatched.includes(s)).slice(0, 5);

      const atsRatio = targetSkills.length > 0 ? (finalMatched.length / targetSkills.length) : 0.9;
      const atsScore = Math.min(99, Math.max(65, Math.round(atsRatio * 100)));

      return {
        header: {
          ...baseline.header,
          targetHeadline: tailoredHeadline,
        },
        summary: tailoredSummary,
        skills: tailoredSkills,
        projects: tailoredProjects,
        simulations: baseline.simulations,
        education: baseline.education,
        targetRole: jobTitle,
        targetCompany: company,
        atsScore,
        matchedKeywords: finalMatched,
        missingKeywords: finalMissing,
        tailoringNotes: `Tailored for ${jobTitle} at ${company} via Tier-1 Recruiter Engine (${aiRes.provider.toUpperCase()}).`,
      };
    }
  } catch (err) {
    console.warn("[Resume Optimizer Warning] AI generation failed, using dynamic recruiter fallback:", (err as Error).message);
  }

  // Dynamic Rule-Based Optimizer Fallback
  return generateDynamicOptimizedFallback(baseline, jobTitle, company, targetSkills, matchedKeywords, missingKeywords);
}

function generateDynamicOptimizedFallback(
  baseline: OptimizedResume,
  jobTitle: string,
  company: string,
  targetSkills: string[],
  matchedKeywords: string[],
  missingKeywords: string[]
): OptimizedResume {
  const topSkillStr = targetSkills.length > 0 ? targetSkills.slice(0, 4).join(", ") : "low-latency APIs, distributed microservices, and robust database design";

  const tailoredSummary = `Systems-focused Software Engineer with deep expertise in building high-throughput REST APIs, concurrent microservice architectures, and full-stack applications with emphasis on ${topSkillStr}. Demonstrated track record of architecting AST code-graph compilers, zero-knowledge cryptographic vaults, and AI-powered transaction ledgers. Proficient in database normalization (3NF), Redis caching, and automated testing (xUnit, Jest, PyTest) aligned with ${jobTitle} initiatives at ${company}.`;

  const tailoredSkills = baseline.skills.map((cat) => {
    const matching = targetSkills.filter((s) => cat.skillsText.toLowerCase().includes(s.toLowerCase()));
    if (matching.length > 0) {
      return {
        categoryName: cat.categoryName,
        skillsText: cat.skillsText,
      };
    }
    return cat;
  });

  const atsRatio = targetSkills.length > 0 ? (matchedKeywords.length / targetSkills.length) : 0.85;
  const atsScore = Math.min(98, Math.max(70, Math.round(atsRatio * 100)));

  return {
    ...baseline,
    header: {
      ...baseline.header,
      targetHeadline: `${jobTitle} | Backend, Systems & Full-Stack Specialist`,
    },
    summary: tailoredSummary,
    skills: tailoredSkills,
    targetRole: jobTitle,
    targetCompany: company,
    atsScore,
    matchedKeywords,
    missingKeywords,
    tailoringNotes: `Dynamic tailored resume calibrated for ${jobTitle} at ${company}.`,
  };
}
