import { queryMultiProviderLLM } from "./router";
import { EXCESSIVE_EXPERIENCE_REGEXES, EarlyCareerTier, determineEarlyCareerTier } from "../providers/normalize";

export interface CandidateContext {
  fullName: string;
  title: string;
  email?: string | null;
  phone?: string | null;
  location?: string | null;
  portfolioUrl?: string | null;
  githubUrl?: string | null;
  linkedinUrl?: string | null;
  masterProjects: Array<{
    title: string;
    techStack: string;
    architecture: string;
  }>;
  virtualExps: Array<{
    company: string;
    roleTitle: string;
    outcome: string;
  }>;
}

export interface HardEligibilityResult {
  eligible: boolean;
  reason?: string;
}

export interface DeterministicMatchSignals {
  skillOverlapScore: number;       // 0-100
  titleCategoryScore: number;      // 0-100
  recencyScore: number;            // 0-100
  sourceQualityScore: number;      // 0-100
  deterministicBaseScore: number; // 0-100
}

export interface CompositeMatchResult {
  finalScore: number;
  eligible: boolean;
  rejectionReason?: string;
  deterministicSignals: DeterministicMatchSignals;
  hardSkills: string[];
  missingSkills: string[];
  reasoning: string;
  version: string; // "v2.0-deterministic-ai"
  aiCallsCount: number;
  cached: boolean;
}

const NON_DEV_KEYWORDS = [
  "support engineer", "customer support", "technical support", "helpdesk",
  "account executive", "recruiter", "sales", "marketing"
];

function isSupportOrNonDevRole(jobTitle: string): boolean {
  const lower = jobTitle.toLowerCase();
  return NON_DEV_KEYWORDS.some((kw) => lower.includes(kw));
}

const TECH_DICTIONARY = [
  "python", "fastapi", "django", "flask", "c#", ".net", ".net core", "java", "spring", "spring boot",
  "node.js", "nodejs", "express", "fastify", "typescript", "javascript", "react", "next.js", "vue",
  "angular", "postgresql", "postgres", "mongodb", "redis", "sqlite", "supabase", "docker", "kubernetes",
  "k8s", "aws", "gcp", "azure", "ci/cd", "github actions", "tree-sitter", "ast", "chromadb", "web crypto api",
  "zod", "graphql", "rest api", "restful", "grpc", "microservices", "system design", "linux", "unix",
  "git", "xunit", "pytest", "jest", "golang", "go", "rust", "c++", "c", "kafka", "elasticsearch",
  "prometheus", "grafana", "tailwind", "css", "html", "webassembly", "llm", "ai", "machine learning", "vector search"
];

export function extractSkills(text: string): string[] {
  const lower = text.toLowerCase();
  const found: string[] = [];

  for (const skill of TECH_DICTIONARY) {
    if (!lower.includes(skill)) continue;

    const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(?<![a-z0-9])${escaped}(?![a-z0-9])`, "i");
    if (regex.test(lower)) {
      const displayMap: Record<string, string> = {
        "python": "Python",
        "fastapi": "FastAPI",
        "django": "Django",
        "flask": "Flask",
        "c#": "C#",
        ".net": ".NET",
        ".net core": ".NET Core",
        "java": "Java",
        "spring": "Spring",
        "spring boot": "Spring Boot",
        "node.js": "Node.js",
        "nodejs": "Node.js",
        "express": "Express.js",
        "fastify": "Fastify",
        "typescript": "TypeScript",
        "javascript": "JavaScript",
        "react": "React",
        "next.js": "Next.js",
        "vue": "Vue.js",
        "angular": "Angular",
        "postgresql": "PostgreSQL",
        "postgres": "PostgreSQL",
        "mongodb": "MongoDB",
        "redis": "Redis",
        "sqlite": "SQLite",
        "supabase": "Supabase",
        "docker": "Docker",
        "kubernetes": "Kubernetes",
        "k8s": "Kubernetes",
        "aws": "AWS",
        "gcp": "Google Cloud (GCP)",
        "azure": "Azure",
        "ci/cd": "CI/CD",
        "github actions": "GitHub Actions",
        "tree-sitter": "Tree-Sitter AST",
        "ast": "AST Parsing",
        "chromadb": "ChromaDB",
        "web crypto api": "Web Crypto API",
        "zod": "Zod Validation",
        "graphql": "GraphQL",
        "rest api": "REST APIs",
        "restful": "RESTful Architecture",
        "grpc": "gRPC",
        "microservices": "Microservices",
        "system design": "System Design",
        "linux": "Linux/Unix",
        "unix": "Linux/Unix",
        "git": "Git",
        "xunit": "xUnit",
        "pytest": "PyTest",
        "jest": "Jest",
        "golang": "Go",
        "go": "Go",
        "rust": "Rust",
        "c++": "C++",
        "c": "C",
        "kafka": "Apache Kafka",
        "elasticsearch": "Elasticsearch",
        "prometheus": "Prometheus",
        "grafana": "Grafana",
        "tailwind": "Tailwind CSS",
        "css": "CSS3",
        "html": "HTML5",
        "webassembly": "WebAssembly",
        "llm": "LLMs",
        "ai": "AI Engineering",
        "machine learning": "Machine Learning",
        "vector search": "Vector Databases",
      };
      found.push(displayMap[skill] || skill.toUpperCase());
    }
  }

  return Array.from(new Set(found));
}

// -----------------------------------------------------------------------------
// LAYER 1 — DETERMINISTIC HARD ELIGIBILITY
// -----------------------------------------------------------------------------
export function evaluateHardEligibility(
  candidate: CandidateContext,
  jobTitle: string,
  jobDescription: string,
  jobLocation: string = "",
  canonicalAppUrl: string = "http://valid.url"
): HardEligibilityResult {
  // 1. Valid Direct Application URL check
  if (!canonicalAppUrl || !canonicalAppUrl.startsWith("http")) {
    return { eligible: false, reason: "Ineligible: Missing valid direct application URL." };
  }

  // 2. Non-developer operational role check
  if (isSupportOrNonDevRole(jobTitle)) {
    return { eligible: false, reason: `Ineligible: "${jobTitle}" is an operational support or sales role.` };
  }

  // 3. Obvious Seniority Mismatch (Senior / Staff / Lead / Manager / Principal / Director / SDE II+ / Level 2+)
  const lowerTitle = jobTitle.toLowerCase();
  if (
    lowerTitle.includes("senior") ||
    lowerTitle.includes("sr.") ||
    /\bsr\b/.test(lowerTitle) ||
    lowerTitle.includes("staff") ||
    lowerTitle.includes("principal") ||
    lowerTitle.includes("tech lead") ||
    lowerTitle.includes("lead engineer") ||
    lowerTitle.includes("manager") ||
    lowerTitle.includes("director") ||
    /\b(?:sde|swe|engineer|developer)\s*(?:[2-9]|ii|iii|iv|v)\b/i.test(lowerTitle) ||
    /\b(?:level|lvl|grade)\s*(?:[2-9]|ii|iii|iv|v)\b/i.test(lowerTitle) ||
    /\b(?:engineer|developer)\s+[2-9]\b/i.test(lowerTitle)
  ) {
    return { eligible: false, reason: "Ineligible: Seniority mismatch (Senior/Staff/Lead role)." };
  }

  // 4. On-site or non-remote check
  if (jobLocation) {
    const lowerLoc = jobLocation.toLowerCase();
    if (lowerLoc.includes("on-site") || lowerLoc.includes("onsite") || lowerLoc.includes("in-office")) {
      return { eligible: false, reason: "Ineligible: Location mismatch (On-Site role)." };
    }
  }

  // 5. Excessive Experience Requirement Check (waived for Tier 1 Internships)
  const careerTier = determineEarlyCareerTier(jobTitle, jobDescription);
  const isInternship = careerTier === EarlyCareerTier.TIER_1_INTERNSHIP;

  if (jobDescription && !isInternship) {
    const lowerDesc = jobDescription.toLowerCase();
    if (EXCESSIVE_EXPERIENCE_REGEXES.some((rx) => rx.test(lowerDesc))) {
      return { eligible: false, reason: "Ineligible: Experience mismatch (Requires 3+ years / mid-to-senior experience)." };
    }
  }

  return { eligible: true };
}

// -----------------------------------------------------------------------------
// LAYER 2 — DETERMINISTIC MATCH SIGNALS
// -----------------------------------------------------------------------------
export function calculateDeterministicSignals(
  candidate: CandidateContext,
  jobTitle: string,
  jobDescription: string,
  postedAt?: Date | null,
  providerKey: string = "DIRECT_PORTAL"
): DeterministicMatchSignals {
  const candidateFullText = [
    candidate.title,
    ...candidate.masterProjects.map((p) => `${p.title} ${p.techStack} ${p.architecture}`),
    ...candidate.virtualExps.map((e) => `${e.company} ${e.roleTitle} ${e.outcome}`),
  ].join(" ");

  const candidateSkills = extractSkills(candidateFullText);
  const jobSkills = extractSkills(jobTitle + " " + jobDescription);

  const careerTier = determineEarlyCareerTier(jobTitle, jobDescription);
  const isEarlyCareer = careerTier === EarlyCareerTier.TIER_1_INTERNSHIP || careerTier === EarlyCareerTier.TIER_2_ZERO_EXPERIENCE;

  // 1. Skill Overlap Score (0-100)
  const matched = jobSkills.filter((s) => candidateSkills.some((cs) => cs.toLowerCase() === s.toLowerCase()));
  let skillOverlapScore = jobSkills.length > 0 ? Math.round((matched.length / jobSkills.length) * 100) : 50;
  if (isEarlyCareer && matched.length >= 2) {
    // For early career & internships, knowing 2+ foundational technologies demonstrates high skill alignment
    skillOverlapScore = Math.max(skillOverlapScore, 75);
  }

  // 2. Title Category Score (0-100)
  const lowerTitle = jobTitle.toLowerCase();
  const lowerCandTitle = candidate.title.toLowerCase();
  let titleCategoryScore = 50;

  if (
    (lowerTitle.includes("react") && lowerCandTitle.includes("react")) ||
    (lowerTitle.includes("python") && lowerCandTitle.includes("python")) ||
    (lowerTitle.includes("backend") && lowerCandTitle.includes("backend")) ||
    (lowerTitle.includes("frontend") && lowerCandTitle.includes("frontend")) ||
    (lowerTitle.includes("full stack") && lowerCandTitle.includes("full stack"))
  ) {
    titleCategoryScore = 100;
  } else if (lowerTitle.includes("intern") || lowerTitle.includes("internship")) {
    titleCategoryScore = 85;
  } else if (lowerTitle.includes("software") || lowerTitle.includes("engineer") || lowerTitle.includes("developer")) {
    titleCategoryScore = 80;
  }

  // 3. Recency Score (0-100)
  let recencyScore = 100;
  if (postedAt) {
    const ageDays = (Date.now() - new Date(postedAt).getTime()) / (1000 * 60 * 60 * 24);
    if (ageDays <= 1) recencyScore = 100;
    else if (ageDays <= 3) recencyScore = 85;
    else if (ageDays <= 7) recencyScore = 70;
    else if (ageDays <= 14) recencyScore = 50;
    else recencyScore = 30;
  }

  // 4. Source Quality Score (0-100)
  let sourceQualityScore = 80;
  const pKey = providerKey.toUpperCase();
  if (["GREENHOUSE", "LEVER", "ASHBY", "SIMPLIFY", "WORKABLE", "SMARTRECRUITERS", "RECRUITEE"].includes(pKey)) {
    sourceQualityScore = 100;
  } else if (["HIMALAYAS", "REMOTIVE", "LINKEDIN", "JOBICY", "BUILTIN"].includes(pKey)) {
    sourceQualityScore = 90;
  }

  // Deterministic Base Score = 50% Skill + 25% Title + 15% Recency + 10% Source Quality
  const deterministicBaseScore = Math.round(
    0.5 * skillOverlapScore + 0.25 * titleCategoryScore + 0.15 * recencyScore + 0.1 * sourceQualityScore
  );

  return {
    skillOverlapScore,
    titleCategoryScore,
    recencyScore,
    sourceQualityScore,
    deterministicBaseScore: Math.min(100, Math.max(0, deterministicBaseScore)),
  };
}

// -----------------------------------------------------------------------------
// LAYERS 3 & 4 — AI REASONING & TRANSPARENT COMPOSITE MATCH SCORE
// -----------------------------------------------------------------------------
export async function computeCompositeMatchScore(
  candidate: CandidateContext,
  jobTitle: string,
  jobDescription: string,
  jobLocation: string = "",
  canonicalAppUrl: string = "http://valid.url",
  postedAt?: Date | null,
  providerKey: string = "DIRECT_PORTAL",
  enableAiReasoning: boolean = true
): Promise<CompositeMatchResult> {
  // LAYER 1: Hard Eligibility Check
  const hardElig = evaluateHardEligibility(candidate, jobTitle, jobDescription, jobLocation, canonicalAppUrl);
  
  if (!hardElig.eligible) {
    const signals = calculateDeterministicSignals(candidate, jobTitle, jobDescription, postedAt, providerKey);
    return {
      finalScore: 0, // Capped at 0 for hard ineligible roles!
      eligible: false,
      rejectionReason: hardElig.reason,
      deterministicSignals: signals,
      hardSkills: [],
      missingSkills: ["Domain Eligibility"],
      reasoning: hardElig.reason || "Role failed hard eligibility constraints.",
      version: "v2.0-deterministic-ai",
      aiCallsCount: 0,
      cached: false,
    };
  }

  // LAYER 2: Deterministic Match Signals
  const signals = calculateDeterministicSignals(candidate, jobTitle, jobDescription, postedAt, providerKey);

  const candidateFullText = [
    candidate.title,
    ...candidate.masterProjects.map((p) => `${p.title} ${p.techStack} ${p.architecture}`),
    ...candidate.virtualExps.map((e) => `${e.company} ${e.roleTitle} ${e.outcome}`),
  ].join(" ");

  const candidateSkills = extractSkills(candidateFullText);
  const jobSkills = extractSkills(jobTitle + " " + jobDescription);

  const hardSkills = jobSkills.filter((skill) =>
    candidateSkills.some((cs) => cs.toLowerCase() === skill.toLowerCase())
  );
  const missingSkills = jobSkills.filter(
    (skill) => !candidateSkills.some((cs) => cs.toLowerCase() === skill.toLowerCase())
  );

  let aiCallsCount = 0;
  let aiSimilarityScore = signals.deterministicBaseScore;
  let reasoningText = `${candidate.fullName} matches ${hardSkills.length} out of ${jobSkills.length || 1} required technical skills for ${jobTitle}.`;

  // LAYER 3: AI Reasoning (Only executed if enableAiReasoning is true)
  if (enableAiReasoning) {
    aiCallsCount = 1;
    const systemPrompt = `You are a Staff Software Architect evaluating technical fit for a job posting. Return strictly valid JSON: {"score": 85, "hardSkills": ["Python", "FastAPI"], "missingSkills": ["Kubernetes"], "reasoning": "Candidate demonstrates strong backend skills matching the job requirements."}`;

    const userPrompt = `
CANDIDATE PROFILE:
Name: ${candidate.fullName}
Title: ${candidate.title}
Key Technical Stack & Projects: ${candidateSkills.join(", ")}
Flagship Projects:
${candidate.masterProjects.map((p) => `- ${p.title} (${p.techStack}): ${p.architecture}`).join("\n")}

JOB POSTING:
Title: ${jobTitle}
Required Technologies Detected: ${jobSkills.join(", ") || "General Software Engineering"}
Description Snippet: ${jobDescription.slice(0, 800)}

TASK:
1. Provide an accurate score from 0 to 100 based on technical match.
2. List overlapping hard skills present in candidate stack and job requirements.
3. List missing technologies requested in job description that candidate lacks.
4. Write a 2-sentence executive technical fit summary.
`;

    try {
      const llmRes = await queryMultiProviderLLM(systemPrompt, userPrompt, true);
      if (llmRes.text) {
        const parsed = JSON.parse(llmRes.text);
        const scoreNum = Number(parsed.score);
        if (!isNaN(scoreNum)) {
          aiSimilarityScore = Math.min(100, Math.max(0, scoreNum));
        }
        if (parsed.reasoning) {
          reasoningText = `${parsed.reasoning} (Engine: ${llmRes.provider.toUpperCase()})`;
        }
      }
    } catch (err) {
      console.warn("[AI Scorer Warning] Multi-provider query failed, falling back gracefully to deterministic base:", (err as Error).message);
    }
  }

  // LAYER 4: Final Transparent Match Score (60% Deterministic Base + 40% AI Similarity)
  const finalScore = Math.round(0.6 * signals.deterministicBaseScore + 0.4 * aiSimilarityScore);

  return {
    finalScore: Math.min(100, Math.max(0, finalScore)),
    eligible: true,
    deterministicSignals: signals,
    hardSkills,
    missingSkills,
    reasoning: reasoningText,
    version: "v2.0-deterministic-ai",
    aiCallsCount,
    cached: false,
  };
}

/**
 * Legacy compatibility export for existing API calls
 */
export async function evaluateJobMatch(
  candidate: CandidateContext,
  jobTitle: string,
  jobDescription: string
) {
  const result = await computeCompositeMatchScore(
    candidate,
    jobTitle,
    jobDescription,
    "",
    "http://valid.url",
    undefined,
    "DIRECT_PORTAL",
    true
  );

  return {
    score: result.finalScore,
    hardSkills: result.hardSkills,
    missingSkills: result.missingSkills,
    reasoning: result.reasoning,
  };
}
