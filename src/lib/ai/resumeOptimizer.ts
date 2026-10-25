import { queryMultiProviderLLM } from "./router";
import { extractSkills } from "./scorer";
import { db } from "@/lib/db";
export * from "../resumeBaseline";
import {
  OptimizedResume,
  getMasterResumeBaseline,
} from "../resumeBaseline";

export const BANNED_AI_SLOP_REGEX = /\b(spearheaded|orchestrated|revolutionized|synergized|thrilled|passionate|cutting-edge|testament|rich tapestry|multifaceted|seamlessly|driving excellence|results-oriented|deep expertise in)\b/gi;

export function sanitizeAiSlop(text: string): string {
  return text
    .replace(/\b(?:spearheaded|orchestrated)\b/gi, "Engineered")
    .replace(/\b(?:revolutionized)\b/gi, "Restructured")
    .replace(/\b(?:synergized|leveraged)\b/gi, "Integrated")
    .replace(/\b(?:cutting-edge)\b/gi, "High-performance")
    .replace(/\b(?:rich tapestry|testament|multifaceted)\b/gi, "Core architecture")
    .replace(/\b(?:seamlessly)\b/gi, "Directly")
    .replace(/\b(?:passionate|thrilled)\b/gi, "Focused")
    .replace(/\b(?:driving excellence|results-oriented)\b/gi, "Reliability-focused")
    .replace(/\b(?:deep expertise in)\b/gi, "Experience with");
}

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
You operate on REVERSE-ENGINEERED RECRUITER PSYCHOLOGY: A human recruiter pattern-matches a resume in 6 seconds using an unconscious F-scan. Every sentence, title, and bullet must pass subconscious quality checks.

STRICT RECRUITER PSYCHOLOGY & ATS LAWS:
1. CAREER STAGE CALIBRATION & BCA TITLE LAW (CRITICAL MANDATE):
   - For BCA candidates (Roushan Kumar & Ayushi Raj), you are STRICTLY PROHIBITED from using the title "Engineer" anywhere in their headline, summary, or bullets (Indian academic & regulatory compliance).
   - MANDATORY ALLOWED TITLES: "Software Developer", "Backend Developer", "Full Stack Developer", "AI Developer", "Systems Architect", "Builder".
   - NEVER use corporate-tenure inflation words like "Senior Engineer", "Director", "Executive", "Expert", or "Seasoned".
   - Do NOT mention university or college in the summary. Recruiters evaluate proof of building, not academic gate checks, at the summary stage.
   - Do NOT downplay virtual simulations or structured engineering programs; treat them as real, verified engineering deliverables.

2. THE 6-SECOND F-SCAN & 7 PSYCHOLOGICAL KILL SWITCHES:
   - KILL SWITCH 1 (Passive Verbs): FORBIDDEN openers: "Responsible for", "Worked on", "Assisted with", "Helped". The first word of EVERY bullet must be a decisive past-tense technical verb (Architected, Engineered, Profiled, Hardened, Containerized, Accelerated, Decoupled, Deployed).
   - KILL SWITCH 2 (Wall of Text): Strict brevity cap: 18–28 words max per bullet. Crisp 2-line visual scan.
   - KILL SWITCH 3 (Uncategorized Skill Soup): All skills must be categorized into 6 named groups with colon labels. Never output an unbroken list.
   - KILL SWITCH 4 (Generic Fluff Summary): Summary must be clean narrative prose (WHO + WHAT THEY BUILD + WHY). NEVER dump comma-separated tech stacks in the summary.
   - KILL SWITCH 5 (Unquantified Claims): Every first bullet of a project must contain concrete, verifiable numbers (%, ms, count, uptime, or improvement ratio).
   - KILL SWITCH 6 (Title Misrepresentation): Zero occurrences of "Engineer" for BCA candidates.
   - KILL SWITCH 7 (Fake/Untraceable Projects): Anchor all bullet points strictly to the candidate's real production architectures, live URLs, and real institutional simulations.

3. TECH STACK SPECIFICITY & BROWSER AUTOMATION (PLAYWRIGHT & PUPPETEER):
   - Whenever scraping, headless automation, end-to-end testing, or browser extensions are relevant, explicitly prioritize and highlight **Playwright** and **Puppeteer** alongside Redis, Docker, and TypeScript.

4. PROFESSIONAL SUMMARY ARCHITECTURE (3 SENTENCES MAX):
   - Sentence 1: WHO the candidate is (professional identity and technical specialization).
   - Sentence 2: WHAT high-throughput, mission-critical systems they build and operate in production.
   - Sentence 3: WHY they are uniquely suited for ${jobTitle} at ${company} (architectural focus, scalability, reliability).
   - FORBIDDEN in summary: Comma-separated technology lists ("Proficient in React, Node, Python, Docker...").

5. GOOGLE XYZ POWER-VERB FORMULA FOR ALL BULLETS:
   - Structure: [Decisive Verb] [Specific System/Pipeline] using [Exact Tech Stack] to [Achieve concrete performance/reliability outcome].
   - Example: "Architected high-throughput job harvesting pipeline using Playwright, Puppeteer, and Redis 7, aggregating 14,000+ daily opportunities with 0% duplication."

6. SKILLS PRIMACY & ORDERING:
   - Front-load the exact matching keywords from the job description into position 1–2 of each relevant category.
   - Maintain 6 named categories with colon labels and comma separation. No internal bullet characters.

7. BAN ROBOTIC AI BUZZWORDS & FLUFF:
   - FORBIDDEN WORDS: "Seasoned", "Proven track record", "Passionate", "Driving excellence", "Results-oriented", "Spearheaded", "Orchestrated", "Synergized", "Revolutionized", "Cutting-edge", "Testament", "Rich tapestry", "Dynamic", "Adept at", "Systems-focused", "Deep expertise in".

Return ONLY a valid JSON object with keys:
- "targetHeadline": string (Punchy 1-line tailored professional title, mirroring the target role, e.g. "Full-Stack Developer | Distributed Systems & Cloud Infrastructure")
- "summary": string (3-sentence narrative prose summary. NO comma-separated tech lists. Describes WHO they are and WHAT they build, not WHICH tools they use.)
- "skills": array of 6 objects { "categoryName": string, "skillsText": string } (Front-load matching skills in each category. Comma-separated, e.g. "Skill 1, Skill 2, Skill 3". NO bullets.)
- "projects": array of 3 objects { "title": string, "techStack": string, "liveDemoUrl": string, "githubUrl": string, "bullets": [string, string, string] } (Google XYZ bullet points, 18-28 words each, starting with decisive technical verb)
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
1. Write a punchy headline and authoritative 3-sentence narrative Professional Summary tailored for ${jobTitle} at ${company} without fabricating fictitious domains or listing tech dumps.
2. Front-load relevant technical skills (including Playwright/Puppeteer where applicable) across the 6 categories.
3. Polish the 3 flagship projects into high-impact Google XYZ bullet points (18-28 words, first word decisive verb, concrete metrics).
`;

  try {
    const aiRes = await queryMultiProviderLLM(systemPrompt, userPrompt, true);
    if (aiRes.text) {
      const parsed = JSON.parse(aiRes.text);

      const tailoredHeadline = parsed.targetHeadline || baseline.header.targetHeadline;
      const tailoredSummary = sanitizeAiSlop(parsed.summary || baseline.summary);
      const rawSkills = Array.isArray(parsed.skills) && parsed.skills.length === 6 ? parsed.skills : baseline.skills;
      const tailoredSkills = rawSkills.map((s: { categoryName: string; skillsText: string }) => ({
        categoryName: s.categoryName.replace(/^[•\s\-\*]+/, "").trim(),
        skillsText: s.skillsText.replace(/•/g, ",").replace(/\s*,\s*/g, ", ").trim(),
      }));
      
      const rawProjects = Array.isArray(parsed.projects) && parsed.projects.length === 3 ? parsed.projects : baseline.projects;
      const tailoredProjects = rawProjects.map((p: { title: string; techStack: string; liveDemoUrl?: string; githubUrl?: string; bullets?: string[] }) => ({
        ...p,
        bullets: (p.bullets || []).map((b: string) => {
          const sanitized = sanitizeAiSlop(b);
          const words = sanitized.split(/\s+/);
          if (words.length > 28) {
            return words.slice(0, 28).join(" ") + ".";
          }
          return sanitized;
        }),
      }));

      const fullText = (tailoredSummary + " " + JSON.stringify(tailoredSkills) + " " + JSON.stringify(tailoredProjects)).toLowerCase();
      const finalMatched = targetSkills.filter((s) => fullText.includes(s.toLowerCase()));
      const finalMissing = targetSkills.filter((s) => !finalMatched.includes(s)).slice(0, 5);

      const atsRatio = targetSkills.length > 0 ? (finalMatched.length / targetSkills.length) : 0.9;
      const atsScore = Math.min(99, Math.max(65, Math.round(atsRatio * 100)));

      const result: OptimizedResume = {
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

      // FIRE & FORGET: Update AstrePilot Brain
      db.profile.findUnique({ where: { slug: profileSlug }, select: { id: true } })
        .then(prof => {
          if (prof) {
            db.autopilotSession.create({
              data: {
                profileId: prof.id,
                company,
                jobTitle,
                jdText: jobDescription,
                tailoredSummary,
                keySkills: JSON.stringify(finalMatched),
              }
            }).catch((e: Error) => console.error("Failed to save autopilot session:", e));
          }
        }).catch((e: Error) => console.error("Failed to find profile for session:", e));

      return result;
    }
  } catch (err) {
    console.warn("[Resume Optimizer Warning] AI generation failed, using dynamic recruiter fallback:", (err as Error).message);
  }

  // Dynamic Rule-Based Optimizer Fallback
  const fallbackResult = generateDynamicOptimizedFallback(baseline, jobTitle, company, targetSkills, matchedKeywords, missingKeywords);
  
  // FIRE & FORGET: Update AstrePilot Brain for Fallback
  db.profile.findUnique({ where: { slug: profileSlug }, select: { id: true } })
    .then(prof => {
      if (prof) {
        db.autopilotSession.create({
          data: {
            profileId: prof.id,
            company,
            jobTitle,
            jdText: jobDescription,
            tailoredSummary: fallbackResult.summary,
            keySkills: JSON.stringify(fallbackResult.matchedKeywords),
          }
        }).catch((e: Error) => console.error("Failed to save autopilot session fallback:", e));
      }
    }).catch((e: Error) => console.error("Failed to find profile for session fallback:", e));

  return fallbackResult;
}

function generateDynamicOptimizedFallback(
  baseline: OptimizedResume,
  jobTitle: string,
  company: string,
  targetSkills: string[],
  matchedKeywords: string[],
  missingKeywords: string[]
): OptimizedResume {
  const topSkillStr = targetSkills.length > 0 ? targetSkills.slice(0, 4).join(", ") : "REST APIs, distributed architecture, and AI-integrated tooling";

  const tailoredSummary = `Backend Developer with hands-on experience building production systems across ${topSkillStr} — work that has shipped to real users. Has contributed to structured engineering simulations at industry-grade organisations, working through actual codebases to deliver measurable outcomes. Focused on ${jobTitle} challenges at ${company}, particularly where system reliability, concurrency, and security intersect.`;

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
