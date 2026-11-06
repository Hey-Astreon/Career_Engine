/**
 * AstreWork Autonomous Screening & Procedural Question Helper
 * -------------------------------------------------------------
 * Intercepts compliance, nepotism/relatives, and conditional follow-up
 * questions so form fields receive clean, human "N/A" / "None" inputs
 * instead of robotic, third-person LLM essays.
 */

/**
 * Detects procedural, compliance, relative, or conditional screening questions
 * that should return direct answers (e.g. "N/A" or "None") rather than AI-generated essays.
 */
export function detectProceduralAnswer(question: string): string | null {
  if (!question || typeof question !== "string") return null;
  const q = question.toLowerCase().trim();

  // 1. Relatives or family members employed at the company
  if (
    q.includes("relative") ||
    q.includes("family member") ||
    /related\s*to\s*(?:any)?\s*(?:employee|person|someone)/i.test(q)
  ) {
    if (
      q.includes("type \"na\"") ||
      q.includes("type 'na'") ||
      q.includes("type na") ||
      q.includes("if not applicable") ||
      q.includes("if none")
    ) {
      return "N/A";
    }
    return "None";
  }

  // 2. Explicit "Type NA if not applicable" / "Type N/A"
  if (
    /(?:type|enter|write|put)\s*["']?n\/?a["']?\s*(?:if\s*(?:not\s*applicable|none))?/i.test(q) ||
    /if\s*(?:none|not\s*applicable),?\s*(?:type|enter|write)\s*["']?n\/?a["']?/i.test(q)
  ) {
    return "N/A";
  }

  // 3. Conditional follow-ups where candidate answered "No"
  // e.g. "If "Yes", please give full name during employment"
  if (
    /if\s*["']?yes["']?,?\s*please\s*(?:give|provide|state|list|explain)/i.test(q) ||
    /if\s*applicable,?\s*please\s*(?:give|provide|state|list|explain)/i.test(q)
  ) {
    return "N/A";
  }

  // 4. Conflicts of interest / Non-compete agreements
  if (
    q.includes("conflict of interest") ||
    q.includes("non-compete") ||
    q.includes("noncompete") ||
    q.includes("restrictive covenant")
  ) {
    return "None";
  }

  // 5. Criminal record / disciplinary actions / security clearance not held
  if (
    q.includes("criminal conviction") ||
    q.includes("felony conviction") ||
    q.includes("disciplinary action") ||
    q.includes("pending charges")
  ) {
    return "None";
  }

  // 6. Former employee at this company
  if (
    (/worked\s*for\s*(?:this|the|any)?\s*(?:company|affiliate|subsidiary)\s*before/i.test(q) ||
     /previous(?:ly)?\s*employed\s*by/i.test(q)) &&
    !q.includes("why")
  ) {
    return "No";
  }

  return null;
}

/**
 * Builds a strict first-person prompt that forbids third-person robotic meta-language
 */
export function buildScreeningSystemPrompt(candidateName: string, candidateTitle: string, location: string): string {
  const isBca = /roushan|ayushi/i.test(candidateName);
  const bcaLaw = isBca
    ? `\n- BCA TITLE LAW (MANDATORY): For ${candidateName}, NEVER refer to yourself as an "Engineer" (e.g. Software Engineer, Backend Engineer, Full Stack Engineer). Strictly use "Software Developer", "Backend Developer", "Full-Stack Developer", or "Systems Architect".`
    : "";
  return `You are answering a job application screening question directly as the candidate (${candidateName}, a ${candidateTitle} based in ${location}).

CRITICAL INSTRUCTIONS:
- Write strictly in the FIRST PERSON ("I", "my").
- NEVER refer to the applicant in the third person. NEVER say "After reviewing the information for ${candidateName}...", "Based on the candidate's profile...", or "The candidate has...".
- Be concise, direct, and human. Limit response to 2-3 natural sentences.
- Sound authentic, not like a corporate AI robot or a formal cover letter template.
- NEVER start answers with "Architected" or formulaic verb openings like "Architected and built...". Use natural, varied verbs like "Building and shipping...", "I developed...", "I led the development of...", etc.
- NEVER stack corporate AI buzzwords (e.g. "autonomous career operating system", "multi-provider LLM failover cascade", "distributed high-concurrency background engine"). Speak about real code, architecture, and tangible outcomes with human clarity and humility.
- When answering multiple questions for the same candidate, never repeat the same project, identical sentence structures, or identical word counts.
- Never invent past job titles, years of experience, certifications, or employers not present in the provided candidate context.
- Never start with sycophantic openers like "I am thrilled to apply..." or "I am excited to..." or use AI slop like "passionate", "spearheaded", or "utilizing".${bcaLaw}
- If the question asks a simple yes/no or procedural question, reply directly with 1 phrase or word (e.g. "N/A" or "Yes").
- Return ONLY the exact answer text with no surrounding quotes or meta-chatter.`;
}

export interface CandidateProjectContext {
  title: string;
  description: string;
  techStack?: string | null;
}

/**
 * Computes semantic relevance between projects and target question / JD,
 * ranking the top 3 most relevant projects for prompt context grounding.
 */
export function rankProjectsForContext(
  projects: CandidateProjectContext[],
  question: string,
  jobDescription: string = ""
): CandidateProjectContext[] {
  if (!projects || projects.length === 0) return [];
  if (projects.length === 1) return projects;

  const targetTokens = (question + " " + jobDescription.slice(0, 5000))
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2);

  const tokenSet = new Set(targetTokens);

  const scored = projects.map((p) => {
    const pTokens = (p.title + " " + p.description + " " + (p.techStack || ""))
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/);

    let matchCount = 0;
    for (const t of pTokens) {
      if (tokenSet.has(t)) matchCount++;
    }

    return { project: p, score: matchCount };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 3).map((s) => s.project);
}

/**
 * Sanitizes screening question responses by stripping AI slop buzzwords
 * and enforcing BCA Title compliance (Developer instead of Engineer).
 */
export function sanitizeScreeningText(text: string, isBca: boolean = true): string {
  if (!text) return "";

  let cleaned = text
    .replace(/\b(?:spearheaded|orchestrated)\b/gi, "built")
    .replace(/\b(?:revolutionized)\b/gi, "restructured")
    .replace(/\b(?:synergized|leveraged)\b/gi, "integrated")
    .replace(/\b(?:utilizing)\b/gi, "using")
    .replace(/\b(?:utilized)\b/gi, "used")
    .replace(/\b(?:utilize)\b/gi, "use")
    .replace(/\b(?:cutting-edge)\b/gi, "high-performance")
    .replace(/\b(?:rich tapestry|testament|multifaceted)\b/gi, "core architecture")
    .replace(/\b(?:seamlessly)\b/gi, "directly")
    .replace(/\b(?:passionate|thrilled)\b/gi, "focused")
    .replace(/\b(?:driving excellence|results-oriented)\b/gi, "reliability-focused");

  if (isBca) {
    cleaned = cleaned
      .replace(/\bSoftware Engineers?\b/gi, "Software Developer")
      .replace(/\bBackend Engineers?\b/gi, "Backend Developer")
      .replace(/\bFull-?Stack Engineers?\b/gi, "Full-Stack Developer")
      .replace(/\bSystems Engineers?\b/gi, "Systems Architect")
      .replace(/\bAI Engineers?\b/gi, "AI Developer")
      .replace(/\bas an engineer\b/gi, "as a developer")
      .replace(/\bEngineering\b/gi, "Development");
  }

  return cleaned.trim();
}
