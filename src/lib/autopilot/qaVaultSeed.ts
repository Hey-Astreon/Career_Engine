/**
 * AstreWork Screening Q&A Vault - Starter Ammunition
 * -------------------------------------------------------------
 * Verified, high-impact, BCA-Title-compliant screening question responses
 * pre-seeded for candidate profiles.
 *
 * NOTE: Strictly adheres to Section 5 BCA Candidate Title Laws:
 * Uses "Software Developer", "Full-Stack Developer", "Systems Architect", "Builder".
 * FORBIDDEN: "Engineer".
 */

export interface StarterVaultEntry {
  category: "MOTIVATION" | "TECHNICAL" | "BEHAVIORAL" | "LOGISTICS" | "COMPENSATION" | "GENERAL";
  questionPattern: string;
  answerText: string;
  isFavorite: boolean;
}

export const ROUSHAN_KUMAR_STARTER_VAULT: StarterVaultEntry[] = [
  {
    category: "MOTIVATION",
    questionPattern: "Why do you want to work at {{COMPANY}}?",
    answerText:
      "I am drawn to {{COMPANY}} because of your relentless focus on engineering rigor, velocity, and building scalable products that solve deep, high-impact problems. As a Systems Architect and Full-Stack Developer who specializes in high-throughput data extraction and distributed resilience, I thrive in environments where autonomous ownership and performance are valued. I want to bring my background in high-concurrency systems and resilient APIs to accelerate the team's mission at {{COMPANY}}.",
    isFavorite: true,
  },
  {
    category: "TECHNICAL",
    questionPattern: "Describe a challenging technical problem you solved.",
    answerText:
      "While architecting AstreWork's autonomous discovery engine, I had to orchestrate high-throughput scraping across 19+ distinct ATS feeds without triggering anti-bot circuit breakers or suffering data loss. I solved this by building a distributed pipeline utilizing stealth HTTP/3 headless automation, rolling 48-hour freshness windows to eliminate transient drop-offs, and Turso Cloud LibSQL distributed WAL persistence paired with Redis 7 LRU caching. This reduced sync latency by 74% and ensured 99.9% ingestion reliability.",
    isFavorite: true,
  },
  {
    category: "TECHNICAL",
    questionPattern: "What is your experience with distributed systems, databases, and APIs?",
    answerText:
      "I have extensive hands-on experience building production full-stack systems using Next.js 16 App Router, TypeScript, Prisma ORM, and LibSQL distributed SQLite. On the backend, I design resilient event loops, automated schema migrations, and RESTful architectures behind Caddy HTTP/3 QUIC reverse proxies on Oracle Cloud Infrastructure (ARM64), maintaining sub-50ms query responses and zero-leak memory footprints.",
    isFavorite: true,
  },
  {
    category: "LOGISTICS",
    questionPattern: "What is your notice period and earliest start date?",
    answerText:
      "My notice period is immediate (0 to 14 days). I am fully prepared to onboard rapidly and contribute from day one.",
    isFavorite: true,
  },
  {
    category: "LOGISTICS",
    questionPattern: "Are you comfortable working in a remote or hybrid distributed team?",
    answerText:
      "Yes, absolutely. I am completely self-directed, communicate with clarity and asynchronous documentation rigor, and have built production-grade distributed applications collaborating across remote timezones.",
    isFavorite: false,
  },
  {
    category: "COMPENSATION",
    questionPattern: "What are your salary or compensation expectations?",
    answerText:
      "My compensation expectations are flexible and aligned with market rates for high-velocity software developers. I prioritize impactful technical challenges, high-autonomy teams, and long-term value creation.",
    isFavorite: true,
  },
  {
    category: "BEHAVIORAL",
    questionPattern: "Tell us about a time you handled a disagreement or technical conflict in a team.",
    answerText:
      "During an architectural decision on database synchronization, my co-developer and I differed between an eager sync versus a background WAL queue. Instead of debating theoretically, I stood up isolated benchmark testbenches for both patterns measuring write amplification, memory footprint, and lock contention. The empirical telemetry demonstrated the WAL queue prevented socket starvation under burst load, which led to an immediate consensus grounded in facts.",
    isFavorite: false,
  },
];

export const AYUSHI_RAJ_STARTER_VAULT: StarterVaultEntry[] = [
  {
    category: "MOTIVATION",
    questionPattern: "Why do you want to join {{COMPANY}}?",
    answerText:
      "{{COMPANY}}'s commitment to user-centric elegance and high-performance product execution deeply resonates with me. As an AI-Powered Full-Stack Software Developer who specializes in autonomous browser automation and modern UI micro-interactions, I love bridging complex AI models into seamless, delightful candidate experiences. I am eager to contribute my expertise in reactive interfaces and multi-provider AI routing to {{COMPANY}}.",
    isFavorite: true,
  },
  {
    category: "TECHNICAL",
    questionPattern: "Describe a complex technical challenge you solved.",
    answerText:
      "While building the AstrePilot Chrome Extension (Manifest V3), I solved the challenge of injecting a zero-CSS-leakage floating copilot HUD across hostile third-party ATS platforms. I architected a closed Shadow DOM boundary with strict event isolation, synthesized W3C DataTransfer binary resume uploads bypassing CORS/CSP, and engineered a multi-stage ARIA combobox state machine that resolves custom React-Select and Radix UI dropdowns with 100% reliability.",
    isFavorite: true,
  },
  {
    category: "LOGISTICS",
    questionPattern: "What is your notice period and earliest start date?",
    answerText:
      "Immediate (0 to 14 days). Ready to integrate and deliver value immediately.",
    isFavorite: true,
  },
  {
    category: "COMPENSATION",
    questionPattern: "What are your salary expectations?",
    answerText:
      "I am open to market-standard compensation for an AI-focused Full-Stack Developer role and prioritize working on mission-driven, high-velocity engineering teams.",
    isFavorite: true,
  },
];

export const GENERIC_STARTER_VAULT: StarterVaultEntry[] = [
  {
    category: "MOTIVATION",
    questionPattern: "Why do you want to work at {{COMPANY}}?",
    answerText:
      "I am excited by {{COMPANY}}'s mission, rapid growth, and culture of engineering excellence. I am looking for a role where I can take ownership, ship clean code, and deliver measurable product value.",
    isFavorite: true,
  },
  {
    category: "LOGISTICS",
    questionPattern: "What is your notice period?",
    answerText: "Immediate (0 to 14 days).",
    isFavorite: true,
  },
  {
    category: "COMPENSATION",
    questionPattern: "What is your expected compensation?",
    answerText: "Open to competitive market compensation commensurate with the responsibilities of the role.",
    isFavorite: false,
  },
];
