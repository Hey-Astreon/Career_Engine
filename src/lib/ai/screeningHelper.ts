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
  return `You are answering a job application screening question directly as the candidate (${candidateName}, a ${candidateTitle} based in ${location}).

CRITICAL INSTRUCTIONS:
- Write strictly in the FIRST PERSON ("I", "my").
- NEVER refer to the applicant in the third person. NEVER say "After reviewing the information for ${candidateName}...", "Based on the candidate's profile...", or "The candidate has...".
- Be concise, direct, and human. Limit response to 2-3 natural sentences.
- Sound authentic, not like a corporate AI robot or a formal cover letter template.
- Never invent past job titles, years of experience, certifications, or employers not present in the provided candidate context.
- Never start with sycophantic openers like "I am thrilled to apply..." or "I am excited to...".
- If the question asks a simple yes/no or procedural question, reply directly with 1 phrase or word (e.g. "N/A" or "Yes").
- Return ONLY the exact answer text with no surrounding quotes or meta-chatter.`;
}
