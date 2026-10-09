import * as cheerio from "cheerio";

// ─── Keyword Lists ────────────────────────────────────────────────────────────

const SWE_TITLE_KEYWORDS = [
  "engineer", "developer", "architect", "software", "backend", "back-end",
  "full stack", "fullstack", "full-stack", "ai engineer", "machine learning",
  "systems", "frontend", "front-end", "platform", "infrastructure",
  "web developer", "python developer", "data engineer", "devops", "sre",
  "mobile developer", "ios developer", "android developer", "coder", "programmer",
  "intern", "internship", "trainee", "apprentice", "co-op", "coop", "fellow",
  "sde", "sdet", "react", "python", "golang", "rust", "node", "javascript",
  "typescript", "data scientist", "cloud engineer", "qa engineer", "tester",
];

const EXCLUDED_TITLES = [
  "account executive", "recruiter", "talent acquisition", "business development", "bde", "sdr", "bdr", "account manager", "growth manager", "deal strategist", "sales engineer", "sales representative", "sales associate", "sales manager", "sales consultant", "sales director",
  "product manager", "project manager", "program manager", "product owner", "scrum master", "agile coach",
  "designer", "ux", "ui designer", "product designer", "graphic designer", "content writer", "copywriter", "seo", "editor",
  "support engineer", "customer support", "technical support", "customer success", "support specialist", "helpdesk", "community manager", "social media", "operations analyst", "human resources", "hr ", "people ops", "office manager", "executive assistant", "admin",
  "legal", "counsel", "compliance", "accountant", "financial analyst", "payroll", "director", "vp ", "vice president", "chief ", "cto", "ceo", "cfo", "coo", "head of", "general manager", "solutions architect",
  "forward deployed", "field engineer", "technical account",
];

const ONSITE_KEYWORDS = [
  "on-site", "onsite", "in-office", "office only", "must relocate",
  "in office", "on site", "not remote", "hybrid", "hybride", "relocate",
  "relocation required", "in-person", "in person", "partially remote",
  "hybrid remote", "office-based", "office based", "on-location", "on location",
  "on-site only", "onsite only", "hybrid work", "hybrid position", "hybrid role",
];

const SENIOR_DESC_SIGNALS = [
  "staff-level", "staff level", "principal engineer", "staff engineer",
  "lead engineer", "tech lead", "engineering manager", "senior engineer",
  "5+ years", "6+ years", "7+ years", "8+ years", "10+ years", "12+ years", "15+ years",
  "minimum 5 years", "minimum 6 years", "minimum 7 years", "minimum 8 years",
  "at least 5 years", "at least 6 years", "at least 7 years", "at least 8 years",
  "5 to 8 years", "5-8 years",
  "you have led", "you have managed", "you will lead", "will manage a team",
  "manage engineers", "people manager",
];

export const EXCESSIVE_EXPERIENCE_REGEXES = [
  /\b(?:[3-9]|\d{2,})\s*\+\s*(?:years?|yrs?)\b/i,
  /\b(?:[3-9]|\d{2,})\s*(?:-|–|to)\s*(?:[4-9]|\d{2,})\s*(?:years?|yrs?)\b/i,
  /\b(?:at least|minimum of|minimum|required)\s*(?:[3-9]|\d{2,})\s*(?:years?|yrs?)\b/i,
  /(?<!\b(?:0|1|2)\s*(?:-|–|to)\s*)\b(?:[3-9]|\d{2,})\s*(?:years?|yrs?)\s+(?:of\s+)?(?:hands-on\s+|professional\s+|relevant\s+|commercial\s+|software\s+|engineering\s+)?experience\b/i,
  /\bmentor(?:ing)?\s+(?:junior|other|mid|team|engineers|developers)\b/i,
  /\b(?:lead|manage)\s+(?:a\s+team|engineers|developers)\b/i,
];

export function sanitizeRoleTitle(rawTitle: string, plainText: string = ""): string {
  let title = rawTitle.trim();

  // Strip common verbose introductory prefixes from title
  title = title
    .replace(/^https?:\/\/[^\s]+/i, "")
    .replace(/^remote\s*[-—–:]\s*/i, "")
    .replace(/^\(remote\)\s*[-—–:]\s*/i, "")
    .replace(/^we(?:'re|\s+are)\s+hiring\s+(?:engineers\s+to\s+join\s+our\s+distributed\s+engineering\s+team\s*[:\-—–]?\s*)?/i, "")
    .replace(/^hiring:\s*/i, "")
    .replace(/\s*\(remote\)\s*/i, "")
    .replace(/\s*\[remote\]\s*/i, "")
    .replace(/\s*[-—–]\s*remote\s*/i, "")
    .trim();

  // If title looks like a URL or starts with one, look for common role title in text
  if (/^https?:\/\//i.test(title)) {
    const roleMatch = plainText.match(
      /\b(Software Engineer|Backend Engineer|Frontend Engineer|Full[- ]?Stack Engineer|DevOps Engineer|Data Engineer|ML Engineer|AI Engineer|Systems Engineer|Platform Engineer|Web Developer|Software Developer|Site Reliability Engineer|Product Engineer)\b/i
    );
    title = roleMatch ? roleMatch[0] : "Software Engineer";
  }

  // If title still has long preamble with a colon (e.g. "team:- DevOps Engineer:"), take the last substantive role segment
  if (title.length > 60 && title.includes(":")) {
    const segments = title.split(":");
    const lastSeg = segments.pop()?.trim() || segments.pop()?.trim();
    if (lastSeg && lastSeg.length >= 4) {
      title = lastSeg;
    }
  }

  // Fallback if title became empty or too short
  if (!title || title.length < 3) {
    const roleMatch = plainText.match(
      /\b(Software Engineer|Backend Engineer|Frontend Engineer|Full[- ]?Stack Engineer|DevOps Engineer|Data Engineer|ML Engineer|AI Engineer|Systems Engineer|Platform Engineer|Web Developer|Software Developer)\b/i
    );
    title = roleMatch ? roleMatch[0] : "Software Engineer";
  }

  return title;
}

export function cleanCompanySlug(rawCompany: string): { company: string; companySlug: string } {
  if (!rawCompany) return { company: "Unknown Company", companySlug: "unknown-company" };

  const company = rawCompany
    .trim()
    .replace(/\b(Inc|LLC|Ltd|Corp|Corporation|Pte|Co|Group|Technologies|Software)\.?;?$/i, "")
    .trim();

  const companySlug = company
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  // Proper Title Case formatting
  const formattedCompany = company.length <= 4 && !/[aeiou]/i.test(company)
    ? company.toUpperCase()
    : company.charAt(0).toUpperCase() + company.slice(1);

  return { company: formattedCompany, companySlug };
}

export function cleanHtmlText(html: string): string {
  if (!html) return "";
  try {
    const $ = cheerio.load(html);
    $("br").replaceWith("\n");
    $("p, div, h1, h2, h3, h4").each((_, el) => {
      $(el).prepend("\n\n");
    });
    $("li").each((_, el) => {
      $(el).prepend("\n• ");
    });

    const rawText = $.text();
    return rawText
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\r\n/g, "\n")
      .replace(/\n\s*\n\s*\n+/g, "\n\n")
      .trim();
  } catch {
    return html
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<li[^>]*>/gi, "\n• ")
      .replace(/<[^>]*>?/gm, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }
}

function containsWord(text: string, word: string): boolean {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(?<![a-z])${escaped}(?![a-z])`, "i");
  return regex.test(text);
}

export function determineCategory(title: string, description: string = ""): string {
  const t = title.toLowerCase();
  const d = description.toLowerCase();

  if (t.includes("react")) return "React Developer";
  if (t.includes("python")) return "Python Developer";
  if (t.includes("machine learning") || t.includes("ml engineer") || t.includes("llm") || t.includes("ai engineer")) return "AI / ML Engineer";
  if (t.includes("data engineer") || t.includes("data pipeline")) return "Data Engineer";
  if (t.includes("security engineer") || t.includes("appsec") || t.includes("devsecops")) return "Security / DevSecOps Engineer";
  if (t.includes("site reliability") || t.includes("sre")) return "Site Reliability Engineer";
  if (t.includes("devops")) return "DevOps Engineer";
  if (t.includes("infrastructure") || t.includes("infra engineer") || t.includes("platform engineer")) return "Infrastructure / Platform Engineer";
  if (t.includes("fullstack") || t.includes("full stack") || t.includes("full-stack")) return "Full Stack Developer";
  if (t.includes("frontend") || t.includes("front-end") || t.includes("ui engineer") || t.includes("ui developer")) return "Frontend Developer";
  if (t.includes("backend") || t.includes("back-end") || t.includes("api engineer")) return "Backend Developer";
  if (t.includes("web developer") || t.includes("web dev")) return "Web Developer";
  if (t.includes("mobile") || t.includes("ios") || t.includes("android")) return "Mobile Developer";

  if (d.includes("react") || d.includes("react.js") || d.includes("reactjs")) return "React Developer";
  if (d.includes("python") && !d.includes("javascript")) return "Python Developer";
  if (d.includes("machine learning") || d.includes("llm") || d.includes("neural network")) return "AI / ML Engineer";
  if (d.includes("devops") || d.includes("ci/cd pipelines")) return "DevOps Engineer";

  return "Software Developer";
}

export function determineJobType(title: string, description: string = ""): string {
  const text = (title + " " + description).toLowerCase();

  if (
    containsWord(text, "internship") ||
    containsWord(text, "intern") ||
    containsWord(text, "trainee") ||
    containsWord(text, "co-op") ||
    containsWord(text, "coop")
  ) {
    return "Remote Internship";
  }

  if (
    containsWord(text, "contract") ||
    containsWord(text, "freelance") ||
    containsWord(text, "contractor")
  ) {
    return "Remote Contract";
  }

  return "Remote Full-Time";
}

export function determineExperienceLevel(title: string, description: string = ""): string {
  const t = title.toLowerCase();
  const d = description.toLowerCase();
  const fullText = (t + " " + d).trim();

  // 1. Senior / Staff Level in Title
  if (
    t.includes("staff") ||
    t.includes("principal") ||
    t.includes("tech lead") ||
    t.includes("lead engineer") ||
    t.includes("engineering manager") ||
    t.includes("senior") ||
    t.includes("sr.") ||
    /\bsr\b/.test(t) ||
    t.includes("manager") ||
    t.includes("director") ||
    t.includes("head of")
  ) {
    return "Senior / Staff Level (5+ Yrs)";
  }

  // 2. Explicit Senior Signals in Description / Numeric (5+ yrs, 6+ yrs, 7+ yrs, 8+ yrs, 10+ yrs)
  const hasSeniorDescSignal = SENIOR_DESC_SIGNALS.some((sig) => fullText.includes(sig));
  if (hasSeniorDescSignal || /\b(?:5\+|6\+|7\+|8\+|9\+|10\+|[5-9]-\d+|10-\d+)\s*(?:years?|yrs?)\b/i.test(fullText)) {
    return "Senior / Staff Level (5+ Yrs)";
  }

  // 3. Priority: Explicit Numeric Experience Requirements
  // Mid-Level / High Experience Numeric Patterns: 2-4, 3-4, 3-5, 4-5, 4-6, 4+, 3+ years
  if (
    /\b(?:2\s*-\s*4|3\s*-\s*4|3\s*-\s*5|4\s*-\s*5|4\s*-\s*6|4\+|3\+)\s*(?:years?|yrs?)\b/i.test(fullText) ||
    /\b(?:2\s+to\s+4|3\s+to\s+4|3\s+to\s+5|4\s+to\s+5)\s*(?:years?|yrs?)\b/i.test(fullText)
  ) {
    return "Mid-Level (2-4 Yrs)";
  }

  // Entry / Junior Numeric Patterns: 0-1, 0-2, 0-3, 1-2, 1-3, 2-3 years
  if (
    /\b(?:0\s*-\s*1|0\s*to\s*1|0-1)\s*(?:years?|yrs?)\b/i.test(fullText)
  ) {
    return "Fresher / Entry Level (0-1 Yr)";
  }

  if (
    /\b(?:0\s*-\s*2|0\s*to\s*2|0\s*-\s*3|0\s*to\s*3|1\s*-\s*2|1\s*to\s*2|1\s*-\s*3|1\s*to\s*3|2\s*-\s*3|2\s*to\s*3)\s*(?:years?|yrs?)\b/i.test(fullText)
  ) {
    return "Junior (1-3 Yrs)";
  }

  // 4. Textual Entry / Fresher Signals in Title or Description
  if (
    containsWord(fullText, "internship") ||
    containsWord(fullText, "intern") ||
    fullText.includes("fresher") ||
    fullText.includes("fresh graduate") ||
    fullText.includes("new grad") ||
    fullText.includes("recent graduate") ||
    fullText.includes("0-1 year") ||
    fullText.includes("0 to 1 year")
  ) {
    return "Fresher / Entry Level (0-1 Yr)";
  }

  if (
    fullText.includes("junior") ||
    fullText.includes("associate engineer") ||
    fullText.includes("1-2 year") ||
    fullText.includes("1-3 year") ||
    fullText.includes("entry level") ||
    fullText.includes("entry-level")
  ) {
    return "Junior (1-3 Yrs)";
  }

  // 5. Mid-Level Role Title or Explicit Role Description (NOT contextual mentions)
  if (t.includes("mid-level") || t.includes("mid level") || t.includes("intermediate")) {
    return "Mid-Level (2-4 Yrs)";
  }

  const isContextualMid = /\b(?:work with|mentored by|team of|alongside|reporting to|collaborate with|collaboration with|interact with|join a team of)\s+(?:[a-z0-9,]+\s+)*(?:senior\s+and\s+)?mid-level\b/i.test(d);
  const isRoleMid = (
    /\b(?:this is a|position is|role is|seeking a|hiring a|looking for a|seeking|hiring)\s+(?:a\s+)?mid-level\b/i.test(d) ||
    (/\bmid-level\s+(?:position|role|engineer|developer|candidate|level)\b/i.test(d) && !isContextualMid)
  );

  if (isRoleMid && !isContextualMid) {
    return "Mid-Level (2-4 Yrs)";
  }

  return "0-3 Years (Entry/Junior)";
}

import { RemoteScope } from "@prisma/client";
import { OpportunitySignal, ApplicationUrlType } from "./types";
import { isDirectAtsUrl } from "./dedup";

export function parseRemoteScope(location: string = "", description: string = ""): RemoteScope {
  const loc = location.toLowerCase();
  const desc = description.toLowerCase();

  // Extract inner content from parenthetical formats like "Remote (US Only)", "Remote (Global)", "Remote (India)"
  const parenMatch = loc.match(/\(([^)]+)\)/);
  const innerParen = parenMatch ? parenMatch[1].toLowerCase().trim() : "";
  const augmentedLoc = loc + " " + innerParen;
  const combined = augmentedLoc + " " + desc;

  // 1. Explicit Worldwide / Global
  if (
    loc.includes("worldwide") ||
    loc.includes("work anywhere") ||
    loc.includes("anywhere in the world") ||
    loc.includes("global remote") ||
    loc.includes("100% remote (worldwide)") ||
    innerParen === "global" ||
    innerParen === "worldwide" ||
    innerParen.includes("anywhere")
  ) {
    return RemoteScope.WORLDWIDE;
  }

  // 2. Explicit India
  if (
    loc.includes("india") ||
    loc.includes("bengaluru") ||
    loc.includes("bangalore") ||
    loc.includes("mumbai") ||
    loc.includes("delhi") ||
    loc.includes("hyderabad") ||
    loc.includes("pune") ||
    loc.includes("remote - india") ||
    loc.includes("remote, india") ||
    innerParen === "india" ||
    innerParen.includes("india")
  ) {
    return RemoteScope.INDIA;
  }

  // 3. Explicit APAC
  if (
    loc.includes("apac") ||
    loc.includes("asia pacific") ||
    loc.includes("singapore") ||
    loc.includes("japan") ||
    loc.includes("australia") ||
    innerParen === "apac" ||
    innerParen.includes("asia pacific")
  ) {
    return RemoteScope.APAC;
  }

  // 4. Explicit EMEA / Europe
  if (
    loc.includes("emea") ||
    loc.includes("europe") ||
    loc.includes("eu / uk") ||
    loc.includes("germany") ||
    loc.includes("france") ||
    innerParen === "emea" ||
    innerParen === "europe"
  ) {
    return RemoteScope.EMEA;
  }

  // 5. Explicit US / Americas restrictions
  if (
    loc.includes("us only") ||
    loc.includes("united states") ||
    loc.includes("us timezones") ||
    loc.includes("us-only") ||
    loc.includes("us remote") ||
    loc.includes("remote - us") ||
    loc.includes("remote (us)") ||
    combined.includes("w2 only") ||
    combined.includes("must reside in us") ||
    combined.includes("must reside in the united states") ||
    innerParen === "us" ||
    innerParen === "us only" ||
    innerParen === "us & canada" ||
    innerParen === "us and eu" ||
    innerParen.includes("us only")
  ) {
    return RemoteScope.US_ONLY;
  }

  if (
    loc.includes("americas") ||
    loc.includes("latam") ||
    loc.includes("north america") ||
    innerParen.includes("north america") ||
    innerParen.includes("americas")
  ) {
    return RemoteScope.AMERICAS;
  }

  if (
    loc.includes("eu only") ||
    loc.includes("uk only") ||
    loc.includes("uk remote") ||
    innerParen === "eu only" ||
    innerParen === "uk only" ||
    innerParen === "uk"
  ) {
    return RemoteScope.EU_UK_ONLY;
  }

  if (
    loc.includes("country specific") ||
    loc.includes("country-specific") ||
    loc.includes("single country") ||
    innerParen.includes("country specific") ||
    innerParen.includes("country-specific")
  ) {
    return RemoteScope.COUNTRY_SPECIFIC;
  }

  // 6. Conservative Fallback: Ambiguous locations remain UNKNOWN
  return RemoteScope.UNKNOWN;
}

export function formatRemoteScopeLabel(remoteScope?: RemoteScope | string | null, location?: string): string {
  const scopeStr = remoteScope ? String(remoteScope) : "";
  if (scopeStr === "WORLDWIDE" || scopeStr === RemoteScope.WORLDWIDE) return "Remote — Worldwide";
  if (scopeStr === "INDIA" || scopeStr === RemoteScope.INDIA) return "Remote — India";
  if (scopeStr === "US_ONLY" || scopeStr === RemoteScope.US_ONLY) return "Remote — US Only";
  if (scopeStr === "APAC" || scopeStr === RemoteScope.APAC) return "Remote — APAC";
  if (scopeStr === "EMEA" || scopeStr === RemoteScope.EMEA) return "Remote — EMEA";
  if (scopeStr === "AMERICAS" || scopeStr === RemoteScope.AMERICAS) return "Remote — Americas";
  if (scopeStr === "EU_UK_ONLY" || scopeStr === RemoteScope.EU_UK_ONLY) return "Remote — EU/UK Only";
  if (scopeStr === "COUNTRY_SPECIFIC" || scopeStr === RemoteScope.COUNTRY_SPECIFIC) return "Remote — Country Specific";

  if (location) {
    const parsed = parseRemoteScope(location, "");
    if (parsed !== RemoteScope.UNKNOWN) {
      return formatRemoteScopeLabel(parsed);
    }
    if (location.toLowerCase().includes("remote")) {
      return "Remote";
    }
  }

  return "Remote scope unknown";
}

/**
 * Derives truthful observable opportunity signals.
 * CRITICAL RULE: "FRESH" signal is assigned ONLY when genuine source postedAt is within last 24 hours.
 * If postedAt is null/missing, FRESH is NEVER assigned.
 */
export function determineOpportunitySignals(job: {
  postedAt?: Date | null;
  applicationUrlType?: ApplicationUrlType;
  canonicalAppUrl?: string;
  providerKey?: string;
  applicantCount?: number | null;
}): OpportunitySignal[] {
  const signals: OpportunitySignal[] = [];

  // FRESH Signal Rule: Genuine source postedAt exists AND is <= 24h ago
  if (job.postedAt && job.postedAt instanceof Date && !isNaN(job.postedAt.getTime())) {
    const ageMs = Date.now() - job.postedAt.getTime();
    if (ageMs >= 0 && ageMs <= 24 * 3600 * 1000) {
      signals.push("FRESH");
    }
  }

  // DIRECT_APPLICATION Signal Rule
  if (
    job.applicationUrlType === "DIRECT_ATS" ||
    (job.canonicalAppUrl && isDirectAtsUrl(job.canonicalAppUrl))
  ) {
    signals.push("DIRECT_APPLICATION");
  }

  // NICHE_SOURCE Signal Rule
  const nicheSources = ["HN_HIRING", "WEWORKREMOTELY", "JOBICY", "ARBEITNOW", "HIMALAYAS", "YC_JOBS"];
  if (job.providerKey && nicheSources.includes(job.providerKey)) {
    signals.push("NICHE_SOURCE");
  }

  // EXPLICIT_APPLICANT_COUNT Signal Rule
  if (typeof job.applicantCount === "number" && job.applicantCount > 0) {
    signals.push("EXPLICIT_APPLICANT_COUNT");
  }

  if (signals.length === 0) {
    signals.push("UNKNOWN");
  }

  return signals;
}

export const MAX_POSTING_AGE_DAYS = 21;
export const MAX_POSTING_AGE_MS = MAX_POSTING_AGE_DAYS * 24 * 60 * 60 * 1000;

export function isOlderThanMaxPostingAge(
  postedAt: Date | string | number | null | undefined,
  maxDays: number = MAX_POSTING_AGE_DAYS,
  nowMs: number = Date.now()
): boolean {
  if (!postedAt) return false;
  const postedDate = postedAt instanceof Date ? postedAt : new Date(postedAt);
  const postedMs = postedDate.getTime();
  if (isNaN(postedMs)) return false;
  const ageMs = nowMs - postedMs;
  return ageMs > maxDays * 24 * 60 * 60 * 1000;
}

export function isStrictlyRemoteDeveloperRole(
  title: string,
  location: string = "",
  description: string = "",
  postedAt?: Date | string | null
): boolean {
  const lowerTitle = title.toLowerCase();
  const lowerLoc = location.toLowerCase();
  const lowerDesc = description.toLowerCase();

  // 1. Exclude non-coding / non-developer titles explicitly
  const isNonCodingExcluded = EXCLUDED_TITLES.some((ex) => lowerTitle.includes(ex));
  if (isNonCodingExcluded) return false;

  // 2. MUST contain a software engineering / developer title keyword
  const isCodingRole = SWE_TITLE_KEYWORDS.some((kw) => lowerTitle.includes(kw));
  if (!isCodingRole) return false;

  // 3. Exclude On-Site / Hybrid jobs strictly
  const isOnSite = ONSITE_KEYWORDS.some((kw) => lowerTitle.includes(kw) || lowerLoc.includes(kw) || lowerDesc.includes(kw));
  if (isOnSite) return false;

  const REMOTE_KEYWORDS = ["remote", "telecommute", "anywhere", "wfh", "work from home", "home-based", "virtual", "work from anywhere", "worldwide", "global"];
  const locHasRemote = REMOTE_KEYWORDS.some((kw) => lowerLoc.includes(kw));
  const titleHasRemote = REMOTE_KEYWORDS.some((kw) => lowerTitle.includes(kw));

  // Physical Location Gate: If location string is present, it MUST explicitly contain a remote indicator
  // or title MUST contain a remote indicator. Description text alone CANNOT override a physical office location.
  if (lowerLoc && !locHasRemote && !titleHasRemote) {
    return false;
  }

  // 4. Exclude Senior / Staff / Principal / Lead by TITLE
  if (
    lowerTitle.includes("senior") ||
    lowerTitle.includes("sr.") ||
    /\bsr\b/.test(lowerTitle) ||
    lowerTitle.includes("staff") ||
    lowerTitle.includes("principal") ||
    /\blead\b/.test(lowerTitle) ||
    lowerTitle.includes("manager") ||
    lowerTitle.includes("director") ||
    lowerTitle.includes("head of")
  ) {
    return false;
  }

  // 5. Exclude Senior / Staff / Excessive Experience signals in DESCRIPTION body
  if (lowerDesc) {
    const hasSeniorDescSignal = SENIOR_DESC_SIGNALS.some((sig) => lowerDesc.includes(sig));
    if (hasSeniorDescSignal) return false;

    if (EXCESSIVE_EXPERIENCE_REGEXES.some((rx) => rx.test(lowerDesc))) {
      return false;
    }
  }

  // 6. Strict 21-day ceiling: Discard jobs posted more than 21 days (3 weeks) ago
  if (postedAt && isOlderThanMaxPostingAge(postedAt, MAX_POSTING_AGE_DAYS)) {
    return false;
  }

  return true;
}
