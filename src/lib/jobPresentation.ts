/**
 * Browser-safe display helpers for the AstreWork UI.
 *
 * These functions deliberately contain no provider, ORM, HTML-parser, or Node
 * dependencies. Backend normalization remains in src/lib/providers/normalize.ts.
 */
export function determineCategory(title: string, description: string = ""): string {
  const text = `${title} ${description}`.toLowerCase();
  if (title.toLowerCase().includes("react")) return "React Developer";
  if (title.toLowerCase().includes("python")) return "Python Developer";
  if (/machine learning|ml engineer|llm|ai engineer/.test(text)) return "AI / ML Engineer";
  if (/data engineer|data pipeline/.test(text)) return "Data Engineer";
  if (/security engineer|appsec|devsecops/.test(text)) return "Security / DevSecOps Engineer";
  if (/site reliability|\bsre\b/.test(text)) return "Site Reliability Engineer";
  if (/devops/.test(text)) return "DevOps Engineer";
  if (/infrastructure|infra engineer|platform engineer/.test(text)) return "Infrastructure / Platform Engineer";
  if (/fullstack|full stack|full-stack/.test(text)) return "Full Stack Developer";
  if (/frontend|front-end|ui engineer|ui developer/.test(text)) return "Frontend Developer";
  if (/backend|back-end|api engineer/.test(text)) return "Backend Developer";
  if (/web developer|web dev/.test(text)) return "Web Developer";
  if (/mobile|ios|android/.test(text)) return "Mobile Developer";
  return "Software Developer";
}

export function determineExperienceLevel(title: string, description: string = ""): string {
  const text = `${title} ${description}`.toLowerCase();
  if (/\b(senior|staff|principal|lead|manager|director|head of)\b|\b[5-9]\+\s*(years?|yrs?)\b/.test(text)) return "Senior / Staff Level (5+ Yrs)";
  if (/\b(2\s*-\s*4|3\s*-\s*4|3\+|4\+)\s*(years?|yrs?)\b|\b(mid-level|mid level|intermediate)\b/.test(text)) return "Mid-Level (2-4 Yrs)";
  if (/\b(intern(ship)?|fresher|fresh graduate|new grad|recent graduate|entry[ -]?level)\b|\b0\s*(?:-|to)\s*1\s*(years?|yrs?)\b/.test(text)) return "Fresher / Entry Level (0-1 Yr)";
  if (/\b(junior|associate engineer)\b|\b(?:0\s*(?:-|to)\s*[2-3]|1\s*(?:-|to)\s*[2-3]|2\s*(?:-|to)\s*3)\s*(years?|yrs?)\b/.test(text)) return "Junior (1-3 Yrs)";
  return "Entry / Early Career";
}

export type ExperienceRangeYears = 1 | 2 | 3;
export type ExperienceFilter = ExperienceRangeYears | "ANY";
export type PostingWindowFilter = 7 | 14 | 21 | "ANY";
export type RemoteRoleView = "ALL" | "JOBS" | "INTERNSHIPS";

/** Start with the full active source inventory; all narrowing controls are explicit and opt-in. */
export const DEFAULT_HERO_FILTERS: {
  experienceRange: ExperienceFilter;
  maximumPostedDays: PostingWindowFilter;
  remoteRoleView: RemoteRoleView;
} = {
  experienceRange: "ANY",
  maximumPostedDays: "ANY",
  remoteRoleView: "ALL",
};

export interface CareerSearchTarget {
  title: string;
  company: string;
  rawDescription?: string | null;
}

const SENIORITY_SEARCH_TERMS = new Set(["senior", "staff", "principal", "lead"]);

function tokenizeSearchQuery(query: string): string[] {
  return query.trim().toLowerCase().split(/\s+/).filter(Boolean);
}

/**
 * Match ordinary searches against title, company, and source description. When
 * the query explicitly asks for a seniority tier, constrain it to role titles
 * so background mentions (for example, "report to a senior engineer") cannot
 * make an early-career role look like a senior-role result.
 */
export function matchesCareerSearch(target: CareerSearchTarget, query: string): boolean {
  const terms = tokenizeSearchQuery(query);
  if (!terms.length) return true;

  const title = target.title.toLowerCase();
  if (terms.some((term) => SENIORITY_SEARCH_TERMS.has(term))) {
    return terms.every((term) => title.includes(term));
  }

  const searchable = `${target.title} ${target.company} ${target.rawDescription || ""}`.toLowerCase();
  return terms.every((term) => searchable.includes(term));
}

export interface PaginationWindow<T> {
  items: T[];
  totalItems: number;
  totalPages: number;
  currentPage: number;
  startIndex: number;
  endIndexExclusive: number;
}

/** Return a bounded page window so large feeds do not render every role card at once. */
export function paginateCareerFeed<T>(items: readonly T[], requestedPage: number, pageSize: number): PaginationWindow<T> {
  const safePageSize = Math.max(1, Math.floor(pageSize));
  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / safePageSize));
  const currentPage = Math.min(totalPages, Math.max(1, Math.floor(requestedPage) || 1));
  const startIndex = totalItems ? (currentPage - 1) * safePageSize : 0;
  const endIndexExclusive = Math.min(totalItems, startIndex + safePageSize);

  return { items: items.slice(startIndex, endIndexExclusive), totalItems, totalPages, currentPage, startIndex, endIndexExclusive };
}

export function isInternshipRole(title: string, description: string = ""): boolean {
  return /\b(intern|internship|co-op|apprentice(ship)?)\b/i.test(`${title} ${description}`);
}

export function inferRequiredExperienceYears(title: string, description: string = ""): number | null {
  const text = `${title} ${description}`.toLowerCase();
  if (isInternshipRole(title, description) || /\b(fresher|new grad|recent graduate|entry[ -]?level)\b/.test(text)) return 0;
  if (/\b(senior|staff|principal|lead|manager|director|head of)\b/.test(text)) return 5;

  const range = text.match(/\b(\d+)\s*(?:-|–|to)\s*(\d+)\s*(?:years?|yrs?)\b/);
  if (range) return Number(range[2]);
  const plus = text.match(/\b(\d+)\s*\+\s*(?:years?|yrs?)\b/);
  if (plus) return Number(plus[1]);
  const explicit = text.match(/\b(?:at least|minimum of|minimum|required)\s*(\d+)\s*(?:years?|yrs?)\b|\b(\d+)\s*(?:years?|yrs?)\s+(?:of\s+)?experience\b/);
  if (explicit) return Number(explicit[1] || explicit[2]);
  if (/\b(junior|associate engineer)\b/.test(text)) return 3;
  return null;
}

export function matchesExperienceRange(title: string, description: string, maximumYears: ExperienceRangeYears): boolean {
  const requiredYears = inferRequiredExperienceYears(title, description);
  return requiredYears !== null && requiredYears <= maximumYears;
}

export function matchesExperienceFilter(title: string, description: string, filter: ExperienceFilter): boolean {
  return filter === "ANY" || matchesExperienceRange(title, description, filter);
}

export function matchesRemoteRoleView(title: string, description: string, view: RemoteRoleView): boolean {
  if (view === "ALL") return true;
  const internship = isInternshipRole(title, description);
  return view === "INTERNSHIPS" ? internship : !internship;
}

export function isWithinPostingWindow(postedAt: string | null | undefined, maximumDays: number, nowMs: number = Date.now()): boolean {
  if (!postedAt) return false;
  const postedMs = new Date(postedAt).getTime();
  if (!Number.isFinite(postedMs) || postedMs > nowMs) return false;
  return nowMs - postedMs <= maximumDays * 86_400_000;
}

export function matchesPostingWindowFilter(postedAt: string | null | undefined, filter: PostingWindowFilter, nowMs: number = Date.now()): boolean {
  return filter === "ANY" || isWithinPostingWindow(postedAt, filter, nowMs);
}

export function formatRemoteScopeLabel(remoteScope?: string | null, location?: string): string {
  const scope = remoteScope?.toUpperCase();
  const labels: Record<string, string> = {
    WORLDWIDE: "Remote — Worldwide",
    INDIA: "Remote — India",
    US_ONLY: "Remote — US Only",
    APAC: "Remote — APAC",
    EMEA: "Remote — EMEA",
    AMERICAS: "Remote — Americas",
    EU_UK_ONLY: "Remote — EU/UK Only",
    COUNTRY_SPECIFIC: "Remote — Country Specific",
  };
  if (scope && labels[scope]) return labels[scope];
  if (location?.toLowerCase().includes("remote")) return "Remote";
  return location || "Remote scope unavailable";
}

export type JobSortCriteria =
  | "RECENT"
  | "MATCH_SCORE"
  | "COMPANY_ASC"
  | "TITLE_ASC"
  | "OLDEST";

export function sortCareerJobs<T extends { id: string; title: string; company: string; postedAt?: string | null; firstSeenAt?: string | null; createdAt?: string | null }>(
  jobs: readonly T[],
  criteria: JobSortCriteria,
  scoresMap?: Record<string, { score: number; eligible?: boolean }>
): T[] {
  return [...jobs].sort((a, b) => {
    if (criteria === "RECENT") {
      const timeA = a.postedAt ? new Date(a.postedAt).getTime() : (a.firstSeenAt ? new Date(a.firstSeenAt).getTime() : 0);
      const timeB = b.postedAt ? new Date(b.postedAt).getTime() : (b.firstSeenAt ? new Date(b.firstSeenAt).getTime() : 0);
      return timeB - timeA;
    }
    if (criteria === "OLDEST") {
      const timeA = a.postedAt ? new Date(a.postedAt).getTime() : (a.firstSeenAt ? new Date(a.firstSeenAt).getTime() : 0);
      const timeB = b.postedAt ? new Date(b.postedAt).getTime() : (b.firstSeenAt ? new Date(b.firstSeenAt).getTime() : 0);
      return timeA - timeB;
    }
    if (criteria === "MATCH_SCORE") {
      const scoreA = scoresMap?.[a.id]?.score ?? 0;
      const scoreB = scoresMap?.[b.id]?.score ?? 0;
      if (scoreB !== scoreA) return scoreB - scoreA;
      const timeA = a.postedAt ? new Date(a.postedAt).getTime() : 0;
      const timeB = b.postedAt ? new Date(b.postedAt).getTime() : 0;
      return timeB - timeA;
    }
    if (criteria === "COMPANY_ASC") {
      return a.company.localeCompare(b.company);
    }
    if (criteria === "TITLE_ASC") {
      return a.title.localeCompare(b.title);
    }
    return 0;
  });
}
