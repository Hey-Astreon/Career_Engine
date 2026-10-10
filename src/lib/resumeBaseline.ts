/**
 * Browser-Safe Baseline Resume Definitions & Renderers
 * Pure data structures and string helpers with ZERO Node.js, ORM, or AI router dependencies.
 */

export interface ResumeHeader {
  fullName: string;
  targetHeadline: string;
  location: string;
  phone: string;
  email: string;
  portfolioUrl: string;
  githubUrl: string;
  linkedinUrl: string;
}

export interface ResumeSkillCategory {
  categoryName: string;
  skillsText: string;
}

export interface ResumeProject {
  title: string;
  techStack: string;
  liveDemoUrl: string;
  githubUrl: string;
  bullets: string[];
}

export interface ResumeSimulation {
  company: string;
  roleTitle: string;
  period: string;
  problemScope: string;
  actionTaken: string;
  engineeringOutcome: string;
}

export interface ResumeEducation {
  degree: string;
  university: string;
  period: string;
  coursework: string;
}

export interface OptimizedResume {
  header: ResumeHeader;
  summary: string;
  skills: ResumeSkillCategory[];
  projects: ResumeProject[];
  simulations: ResumeSimulation[];
  education: ResumeEducation;
  targetRole: string;
  targetCompany: string;
  atsScore: number;
  matchedKeywords: string[];
  missingKeywords: string[];
  tailoringNotes: string;
}

/**
 * Returns the candidate master baseline resume structure
 */
export function getMasterResumeBaseline(slug: string): OptimizedResume {
  const isAyushi = slug.toLowerCase() === "ayushi";

  if (isAyushi) {
    return {
      header: {
        fullName: "AYUSHI RAJ",
        targetHeadline: "AI-Powered Full Stack Software Developer | Backend & Systems Specialist",
        location: "Bihar, India",
        phone: "+91-8709852305",
        email: "ayushi29507@gmail.com",
        portfolioUrl: "https://ayushiraj.me",
        githubUrl: "https://github.com/Silenttears-cloud",
        linkedinUrl: "https://www.linkedin.com/in/alrya404/",
      },
      summary:
        "Full-Stack Developer with a strong focus on backend systems, cryptographic security, and AI-integrated web applications. Has independently shipped production-grade projects spanning financial platforms, zero-knowledge vaults, and code-parsing sandboxes — each built to solve a real engineering problem end-to-end. Brings hands-on experience from structured engineering simulations at Commonwealth Bank, YC (Shiptivity), and Walmart, and gravitates toward roles where system design and developer tooling intersect.",
      skills: [
        {
          categoryName: "Backend & Systems",
          skillsText: "Node.js • Express.js • Fastify • Python (FastAPI) • C# (.NET Core) • Java (Spring Boot) • REST APIs",
        },
        {
          categoryName: "Databases & Caching",
          skillsText: "Redis • PostgreSQL • MongoDB • SQLite • Supabase • Schema Design (3NF)",
        },
        {
          categoryName: "Languages",
          skillsText: "C • Rust • TypeScript • JavaScript • Python • C# • Java • SQL • HTML5 • CSS3",
        },
        {
          categoryName: "Frontend UI & Full Stack",
          skillsText: "React.js • Next.js • Express.js • Redux • Monaco Editor • TailwindCSS • Bootstrap",
        },
        {
          categoryName: "Testing & DevOps",
          skillsText: "Jest • PyTest • xUnit • Moq • JUnit 5 • Docker • CI/CD • GCP • Git • Vercel • Render",
        },
        {
          categoryName: "AI Gateway & Security",
          skillsText: "Multi-Model Routing • Prometheus Telemetry • Web Crypto API (AES-GCM) • PBKDF2 • JWT Auth",
        },
      ],
      projects: [
        {
          title: "IDBI FinSync - AI-Powered Wealth & Financial Management Engine (Next.js, React, Fastify, Gemini API)",
          techStack: "Next.js, React, Fastify, Gemini API, PostgreSQL, Prisma",
          liveDemoUrl: "https://idbi-fin-sync-web.vercel.app/",
          githubUrl: "https://github.com/Silenttears-cloud/IDBI-FinSync",
          bullets: [
            "Product Architecture: Co-developed an intelligent financial tracking dashboard in a TypeScript monorepo, connecting a Fastify backend API to a responsive React frontend client.",
            "AI Integration Challenge: Implemented application-side integration for 'Mitra' AI advisor using Gemini API to analyze balance and financial metrics, designing custom client-side parsing for streaming AI responses.",
            "Database & Concurrency: Structured PostgreSQL transaction ledgers with Prisma ORM and Fastify microservice endpoints to process concurrent balance updates reliably.",
          ],
        },
        {
          title: "Alyra Lock - Secure Zero-Knowledge Password Vault (React, TypeScript, Express, MongoDB)",
          techStack: "React, TypeScript, Express, MongoDB, Web Crypto API",
          liveDemoUrl: "https://alyra-lock.vercel.app/",
          githubUrl: "https://github.com/Silenttears-cloud/Zero-knowledge-password-manager-",
          bullets: [
            "Product Architecture: Engineered a client-side zero-knowledge password vault ensuring master encryption keys remain entirely isolated inside user browser memory, mitigating cloud database leak risks.",
            "Cryptographic Engineering: Implemented Web Crypto API primitives utilizing AES-GCM (256-bit) payload encryption and PBKDF2 key derivation over 100,000 hashing iterations for key security.",
            "Performance & Security: Developed high-throughput Express.js REST API sync endpoints with JWT authentication and strict CORS headers, keeping vault database sync latency under 200ms.",
          ],
        },
        {
          title: "Astra Vision - AI Sandbox & Code Parsing Platform (FastAPI, Python, Monaco, Tree-Sitter)",
          techStack: "FastAPI, Python, Monaco, Tree-Sitter, ChromaDB",
          liveDemoUrl: "https://astra-frontend-mrfinklbba-uc.a.run.app/",
          githubUrl: "https://github.com/Silenttears-cloud/Astra_vision",
          bullets: [
            "Product Architecture: Architected an automated code-parsing platform and browser sandbox that allows developers to safely execute untrusted code while visualizing full-stack repository dependency graphs.",
            "Sandbox Runtime Challenge: Built a self-healing Python execution engine with subprocess isolation and security checkpoints to intercept unauthorized OS file system calls and network socket requests in real time.",
            "Indexing Performance: Integrated Tree-Sitter AST compilers and ChromaDB vector search to parse repository syntax nodes, enabling instant code graph dependency analysis under 200ms.",
          ],
        },
      ],
      simulations: [
        {
          company: "Commonwealth Bank (CommBank)",
          roleTitle: "Software Engineering Virtual Simulation",
          period: "June 2026",
          problemScope: "Diagnosed and resolved silent data overwrite bugs across high-traffic C#/.NET Core financial API controllers handling MongoDB document updates across financial services endpoints.",
          actionTaken: "Extended C# Web API controllers with $set atomic operators for partial payload updates and modernized an interactive React/Redux Goal Manager UI component for banking clients.",
          engineeringOutcome: "Authored comprehensive automated test suites using xUnit and Moq, covering complex boundary conditions to guarantee high reliability and transactional consistency.",
        },
        {
          company: "Y Combinator (YC Startup - Shiptivity)",
          roleTitle: "Software Engineering Virtual Simulation",
          period: "June 2026",
          problemScope: "Fixed key constraint collisions and slow re-rendering performance on a real-time drag-and-drop Kanban workflow board used by engineering teams to track task state transitions.",
          actionTaken: "Architected dynamic SQLite priority reordering logic using atomic transactions to update priority ranks sequentially and integrated Dragula drag-and-drop state hooks in React.",
          engineeringOutcome: "Reduced UI component re-render cycles by 30% and patched OpenSSL compilation bottlenecks in legacy Node.js Webpack configurations to optimize runtime builds.",
        },
        {
          company: "Walmart USA",
          roleTitle: "Advanced Software Engineering Virtual Simulation",
          period: "May 2026",
          problemScope: "Solved indexing overhead and performance bottlenecks in high-volume retail inventory processing queues handling unnormalized data ingestion from legacy spreadsheets.",
          actionTaken: "Implemented a generic K-ary Max Heap structure in Java using fast bitwise shift operators (<<, >>>) and built 3NF database schemas with design pattern abstractions.",
          engineeringOutcome: "Accelerated queue indexing calculations by 35% and engineered automated Python ETL pipelines using csv and sqlite3 to clean and consolidate disparate spreadsheets.",
        },
      ],
      education: {
        degree: "Bachelor of Computer Applications (BCA)",
        university: "Amity University Noida",
        period: "Expected July 2028",
        coursework: "Data Structures & Algorithms (DSA) • Database Management Systems (DBMS) • Operating Systems (OS) • Computer Networks • Object-Oriented Programming (OOP)",
      },
      targetRole: "Full Stack Software Developer",
      targetCompany: "Global Remote",
      atsScore: 92,
      matchedKeywords: ["TypeScript", "React", "Node.js", "REST APIs", "PostgreSQL", "FastAPI"],
      missingKeywords: [],
      tailoringNotes: "Master Profile Baseline",
    };
  }

  // Roushan Kumar Baseline
  return {
    header: {
      fullName: "ROUSHAN KUMAR",
      targetHeadline: "Systems Developer | Backend Architect | AI Developer Tools Specialist",
      location: "Patna, Bihar, India",
      phone: "+91-9431483512",
      email: "roushanraut404@gmail.com",
      portfolioUrl: "https://astreon.me",
      githubUrl: "https://github.com/Hey-Astreon",
      linkedinUrl: "https://linkedin.com/in/astreon4547",
    },
    summary:
      "Backend-focused Developer with hands-on experience building production systems across distributed APIs, cryptographic security, and AI tooling — projects that have reached real users and solved real problems. Has contributed to engineering simulations for Commonwealth Bank, YC (Shiptivity), and Walmart, working through actual codebases and delivering measurable outcomes. Drawn to roles at the intersection of system reliability and developer experience, with a particular interest in how software handles scale, concurrency, and security at the infrastructure layer.",
    skills: [
      {
        categoryName: "Backend & Systems",
        skillsText: "C# (.NET Core Web API) • Java (Spring Boot) • Python (FastAPI) • Node.js • Fastify • Express.js • REST APIs",
      },
      {
        categoryName: "Databases & Caching",
        skillsText: "PostgreSQL • MongoDB • Redis • SQLite • Supabase • Schema Design (3NF)",
      },
      {
        categoryName: "Languages",
        skillsText: "C • Rust • C# • Java • Python • JavaScript • TypeScript • SQL • HTML5 • CSS3",
      },
      {
        categoryName: "Frontend UI & Full Stack",
        skillsText: "React.js • Next.js • Express.js • Redux • Monaco Editor • TailwindCSS • Bootstrap",
      },
      {
        categoryName: "Testing & DevOps",
        skillsText: "xUnit • Moq • JUnit 5 • PyTest • Jest • Docker • CI/CD • GCP • Git • Gradle • Vercel • Render",
      },
      {
        categoryName: "AI Tooling & Security",
        skillsText: "Gemini API • Tree-Sitter AST • Web Crypto API (AES-GCM) • PBKDF2 • JWT • Prompt Engineering",
      },
    ],
    projects: [
      {
        title: "Astra Vision - Developer Sandbox & Code Graph Parser (FastAPI, Python, Monaco, Tree-Sitter)",
        techStack: "FastAPI, Python, Monaco, Tree-Sitter, ChromaDB",
        liveDemoUrl: "https://astra-frontend-mrfinklbba-uc.a.run.app/",
        githubUrl: "https://github.com/Hey-Astreon/Astra-Vision",
        bullets: [
          "Product Architecture: Architected an automated code-parsing platform and browser sandbox that allows developers to safely execute untrusted code while visualizing full-stack repository dependency graphs.",
          "Sandbox Runtime Challenge: Built a self-healing Python execution engine with subprocess isolation and security checkpoints to intercept unauthorized OS file system calls and network socket requests in real time.",
          "Indexing Performance: Integrated Tree-Sitter AST compilers and ChromaDB vector search to parse repository syntax nodes, enabling instant code graph dependency analysis under 200ms.",
        ],
      },
      {
        title: "IDBI FinSync - AI-Powered Wealth & Financial Management Engine (Next.js, React, Fastify, Gemini API)",
        techStack: "Next.js, React, Fastify, Gemini API, PostgreSQL, Zod",
        liveDemoUrl: "https://idbi-fin-sync-web.vercel.app/",
        githubUrl: "https://github.com/Hey-Astreon/IDBI-FinSync",
        bullets: [
          "Product Architecture: Co-created an intelligent personal financial management web app in a monorepo that unifies bank ledgers, investment portfolios, and expense streams into a live interactive dashboard.",
          "AI Integration Challenge: Embedded \"Mitra,\" an interactive AI wealth consultant leveraging Gemini API to analyze spending habits, detect budget anomalies, and deliver personalized financial guidance.",
          "Database & Concurrency: Designed PostgreSQL transaction ledgers validated by Zod schemas and Fastify microservice endpoints, handling concurrent balance updates with zero data loss.",
        ],
      },
      {
        title: "Alyra Lock - Secure Zero-Knowledge Password Vault (React, TypeScript, Express, MongoDB)",
        techStack: "React, TypeScript, Express, MongoDB, Web Crypto API",
        liveDemoUrl: "https://alyra-lock.vercel.app/",
        githubUrl: "https://github.com/Hey-Astreon/Zero-Knowledge-Password-Manager",
        bullets: [
          "Product Architecture: Engineered a client-side zero-knowledge password vault ensuring master encryption keys remain entirely isolated inside user browser memory, mitigating cloud database leak risks.",
          "Cryptographic Engineering: Implemented Web Crypto API primitives utilizing AES-GCM (256-bit) payload encryption and PBKDF2 key derivation over 100,000 hashing iterations for key security.",
          "Performance & Security: Developed high-throughput Express.js REST API sync endpoints with JWT authentication and strict CORS headers, keeping vault database sync latency under 200ms.",
        ],
      },
    ],
    simulations: [
      {
        company: "Commonwealth Bank (CommBank)",
        roleTitle: "Software Engineering Virtual Simulation",
        period: "June 2026",
        problemScope: "Diagnosed and resolved silent data overwrite bugs across high-traffic C#/.NET Core financial API controllers handling MongoDB document updates across financial services endpoints.",
        actionTaken: "Extended C# Web API controllers with $set atomic operators for partial payload updates and modernized an interactive React/Redux Goal Manager UI component for banking clients.",
        engineeringOutcome: "Authored comprehensive automated test suites using xUnit and Moq, covering complex boundary conditions to guarantee high reliability and transactional consistency.",
      },
      {
        company: "Y Combinator (YC Startup - Shiptivity)",
        roleTitle: "Software Engineering Virtual Simulation",
        period: "June 2026",
        problemScope: "Fixed key constraint collisions and slow re-rendering performance on a real-time drag-and-drop Kanban workflow board used by engineering teams to track task state transitions.",
        actionTaken: "Architected dynamic SQLite priority reordering logic using atomic transactions to update priority ranks sequentially and integrated Dragula drag-and-drop state hooks in React.",
        engineeringOutcome: "Reduced UI component re-render cycles by 30% and patched OpenSSL compilation bottlenecks in legacy Node.js Webpack configurations to optimize runtime builds.",
      },
      {
        company: "Walmart USA",
        roleTitle: "Advanced Software Engineering Virtual Simulation",
        period: "May 2026",
        problemScope: "Solved indexing overhead and performance bottlenecks in high-volume retail inventory processing queues handling unnormalized data ingestion from legacy spreadsheets.",
        actionTaken: "Implemented a generic K-ary Max Heap structure in Java using fast bitwise shift operators (<<, >>>) and built 3NF database schemas with design pattern abstractions.",
        engineeringOutcome: "Accelerated queue indexing calculations by 35% and engineered automated Python ETL pipelines using csv and sqlite3 to clean and consolidate disparate spreadsheets.",
      },
    ],
    education: {
      degree: "Bachelor of Computer Applications (BCA)",
      university: "Amity University Noida",
      period: "Expected July 2028",
      coursework: "Data Structures & Algorithms (DSA) • Database Management Systems (DBMS) • Operating Systems (OS) • Computer Networks • Object-Oriented Programming (OOP)",
    },
    targetRole: "Systems & Backend Software Developer",
    targetCompany: "Global Remote",
    atsScore: 94,
    matchedKeywords: ["C#", "Java", "Python", "FastAPI", "PostgreSQL", "REST APIs", "Docker"],
    missingKeywords: [],
    tailoringNotes: "Master Profile Baseline",
  };
}

/**
 * Formats the optimized resume into clean Markdown matching the master resume files
 */
export function renderResumeMarkdown(resume: OptimizedResume): string {
  const { header, summary, skills, projects, simulations, education } = resume;

  return `# ${header.fullName}
**${header.targetHeadline}**
**${header.location} | ${header.phone} | ${header.email} | [${header.portfolioUrl.replace(/^https?:\/\//, "")}](${header.portfolioUrl}) | [${header.githubUrl.replace(/^https?:\/\//, "")}](${header.githubUrl}) | [${header.linkedinUrl.replace(/^https?:\/\//, "")}](${header.linkedinUrl})**

---

## PROFESSIONAL SUMMARY
${summary}

---

## TECHNICAL SKILLS
${skills.map((s) => `* **${s.categoryName}:** ${s.skillsText}`).join("\n")}

---

## TECHNICAL PROJECTS

${projects
  .map(
    (p) => `### **${p.title} (${p.techStack})** | [Live Demo](${p.liveDemoUrl}) | [GitHub](${p.githubUrl})
${p.bullets.map((b) => `* ${b}`).join("\n")}`
  )
  .join("\n\n")}

---

## TECHNICAL SIMULATIONS & VIRTUAL EXPERIENCES

${simulations
  .map(
    (s) => `### **${s.company} - ${s.roleTitle}** | ${s.period}
* **Problem & Scope:** ${s.problemScope}
* **Action Taken:** ${s.actionTaken}
* **Engineering Outcome:** ${s.engineeringOutcome}`
  )
  .join("\n\n")}

---

## EDUCATION
### **${education.degree}** - ${education.university} | ${education.period}
* **Relevant Coursework:** ${education.coursework}
`;
}

/**
 * Formats the resume into pure ATS-friendly ASCII plaintext
 */
export function renderResumePlaintext(resume: OptimizedResume): string {
  const { header, summary, skills, projects, simulations, education } = resume;

  return `${header.fullName.toUpperCase()}
${header.targetHeadline}
${header.location} | Phone: ${header.phone} | Email: ${header.email}
Portfolio: ${header.portfolioUrl} | GitHub: ${header.githubUrl} | LinkedIn: ${header.linkedinUrl}
================================================================================

PROFESSIONAL SUMMARY
--------------------------------------------------------------------------------
${summary}

TECHNICAL SKILLS
--------------------------------------------------------------------------------
${skills.map((s) => `${s.categoryName}: ${s.skillsText.replace(/•/g, ",")}`).join("\n")}

TECHNICAL PROJECTS
--------------------------------------------------------------------------------
${projects
  .map(
    (p) => `${p.title} (${p.techStack})
Demo: ${p.liveDemoUrl} | Code: ${p.githubUrl}
${p.bullets.map((b) => `- ${b}`).join("\n")}`
  )
  .join("\n\n")}

TECHNICAL SIMULATIONS & VIRTUAL EXPERIENCES
--------------------------------------------------------------------------------
${simulations
  .map(
    (s) => `${s.company} - ${s.roleTitle} (${s.period})
- Problem & Scope: ${s.problemScope}
- Action Taken: ${s.actionTaken}
- Engineering Outcome: ${s.engineeringOutcome}`
  )
  .join("\n\n")}

EDUCATION
--------------------------------------------------------------------------------
${education.degree} - ${education.university} (${education.period})
Coursework: ${education.coursework.replace(/•/g, ",")}
`;
}

/**
 * Injects a missing target keyword into the most appropriate technical skills category
 */
export function injectKeywordIntoResume(
  resume: OptimizedResume,
  keyword: string
): OptimizedResume {
  const kw = keyword.trim();
  if (!kw) return resume;

  const lower = kw.toLowerCase();
  let targetCategory = "Backend & Systems";

  if (
    lower.includes("sql") ||
    lower.includes("postgres") ||
    lower.includes("redis") ||
    lower.includes("mongo") ||
    lower.includes("sqlite") ||
    lower.includes("supabase") ||
    lower.includes("prisma") ||
    lower.includes("database") ||
    lower.includes("dynamo")
  ) {
    targetCategory = "Databases & Caching";
  } else if (
    ["rust", "python", "typescript", "javascript", "c#", "java", "c++", "c", "go", "golang", "ruby", "kotlin", "swift"].includes(lower)
  ) {
    targetCategory = "Languages";
  } else if (
    lower.includes("docker") ||
    lower.includes("k8s") ||
    lower.includes("kubernetes") ||
    lower.includes("ci/cd") ||
    lower.includes("git") ||
    lower.includes("gcp") ||
    lower.includes("aws") ||
    lower.includes("pytest") ||
    lower.includes("jest") ||
    lower.includes("xunit") ||
    lower.includes("junit") ||
    lower.includes("terraform") ||
    lower.includes("prometheus") ||
    lower.includes("grafana")
  ) {
    targetCategory = "Testing & DevOps";
  } else if (
    lower.includes("react") ||
    lower.includes("next") ||
    lower.includes("tailwind") ||
    lower.includes("redux") ||
    lower.includes("vue") ||
    lower.includes("frontend") ||
    lower.includes("css") ||
    lower.includes("html")
  ) {
    targetCategory = "Frontend UI & Full Stack";
  } else if (
    lower.includes("gemini") ||
    lower.includes("llm") ||
    lower.includes("ai") ||
    lower.includes("ast") ||
    lower.includes("crypto") ||
    lower.includes("jwt") ||
    lower.includes("security") ||
    lower.includes("encryption")
  ) {
    targetCategory = resume.skills.some((s) => s.categoryName.includes("AI Tooling"))
      ? "AI Tooling & Security"
      : "AI Gateway & Security";
  }

  const updatedSkills = resume.skills.map((cat) => {
    if (cat.categoryName.toLowerCase() === targetCategory.toLowerCase()) {
      if (!cat.skillsText.toLowerCase().includes(lower)) {
        return {
          ...cat,
          skillsText: `${cat.skillsText} • ${kw}`,
        };
      }
    }
    return cat;
  });

  const updatedMatched = Array.from(new Set([...resume.matchedKeywords, kw]));
  const updatedMissing = resume.missingKeywords.filter(
    (k) => k.toLowerCase() !== lower
  );

  const total = updatedMatched.length + updatedMissing.length;
  const atsRatio = total > 0 ? updatedMatched.length / total : 0.95;
  const atsScore = Math.min(99, Math.max(70, Math.round(atsRatio * 100)));

  return {
    ...resume,
    skills: updatedSkills,
    matchedKeywords: updatedMatched,
    missingKeywords: updatedMissing,
    atsScore,
  };
}

export interface ResumePreset {
  id: string;
  name: string;
  badge: string;
  roleTitle: string;
  description: string;
  resume: OptimizedResume;
}

export const RESUME_STARTER_PRESETS: ResumePreset[] = [
  {
    id: "systems_backend",
    name: "Systems & Backend Architect",
    badge: "TIER-1 CORE",
    roleTitle: "Systems & Backend Software Engineer",
    description: "Tailored for high-throughput microservices, C#/.NET Core, Java Spring, FastAPI, PostgreSQL, and low latency.",
    resume: getMasterResumeBaseline("roushan"),
  },
  {
    id: "ai_fullstack",
    name: "AI & Full-Stack Developer",
    badge: "AI-POWERED",
    roleTitle: "AI-Powered Full Stack Software Engineer",
    description: "Tailored for modern Next.js/React apps, Fastify/FastAPI backends, Gemini/LLM orchestration, and cryptography.",
    resume: getMasterResumeBaseline("ayushi"),
  },
  {
    id: "frontend_web",
    name: "Modern Frontend Engineer",
    badge: "WEB & UI",
    roleTitle: "Frontend & Web Applications Engineer",
    description: "Tailored for React 19, Next.js App Router, TypeScript, state architectures, Monaco Editor, and client-side performance.",
    resume: {
      header: {
        fullName: "ALEX CHEN",
        targetHeadline: "Senior Frontend Engineer | React 19 & Next.js UI Specialist",
        location: "San Francisco, CA (Open to Global Remote)",
        phone: "+1 (555) 234-5678",
        email: "alex.chen.dev@example.com",
        portfolioUrl: "https://alexchen.dev",
        githubUrl: "https://github.com/alexchen-dev",
        linkedinUrl: "https://linkedin.com/in/alexchen-frontend",
      },
      summary:
        "High-craft Frontend Software Engineer with 4+ years of expertise architecting high-performance web applications using React 19, Next.js App Router, TypeScript, and Tailwind CSS. Proven track record of eliminating client-side render bottlenecks, optimizing Core Web Vitals to 99+ scores, and designing responsive design systems with Monaco Editor code parsers and real-time WebSockets.",
      skills: [
        {
          categoryName: "Frontend UI & Frameworks",
          skillsText: "React 19 • Next.js (App Router) • TypeScript • JavaScript (ESNext) • Tailwind CSS • HTML5 • CSS3",
        },
        {
          categoryName: "State & Data Fetching",
          skillsText: "Zustand • Redux Toolkit • TanStack Query (React Query) • SWR • Context API",
        },
        {
          categoryName: "Backend & Full Stack Integration",
          skillsText: "Node.js • Express.js • REST APIs • GraphQL • tRPC • Server Actions • WebSockets",
        },
        {
          categoryName: "Databases & ORM",
          skillsText: "PostgreSQL • Supabase • Prisma ORM • SQLite • Redis Caching",
        },
        {
          categoryName: "Testing & Performance",
          skillsText: "Jest • React Testing Library • Vitest • Playwright • Lighthouse CI • Webpack • Vite",
        },
        {
          categoryName: "Tooling & Cloud",
          skillsText: "Git • Docker • Vercel • GitHub Actions CI/CD • Monaco Editor • Figma Design Tokens",
        },
      ],
      projects: [
        {
          title: "PulseFlow - Real-Time Collaborative Canvas (React 19, Next.js, WebSockets, Tailwind)",
          techStack: "React 19, Next.js, TypeScript, WebSockets, Tailwind CSS, Zustand",
          liveDemoUrl: "https://pulseflow-demo.vercel.app",
          githubUrl: "https://github.com/alexchen-dev/pulseflow",
          bullets: [
            "Product Architecture: Architected a multi-user collaborative workspace in Next.js 16 with custom canvas rendering, supporting 50+ concurrent users with zero visual stutter.",
            "Client Performance Challenge: Optimized virtualized DOM tree updates using React 19 Server Actions and memoized state selectors, decreasing input latency by 45% (under 16ms per frame).",
            "State & Synchronization: Built an optimistic UI state engine with Zustand and WebSocket sync protocols, guaranteeing reliable reconciliation during network disconnects.",
          ],
        },
        {
          title: "CodeScope - Interactive Web AST & Syntax Visualizer (Next.js, Monaco, TypeScript)",
          techStack: "Next.js, Monaco Editor, TypeScript, Tree-Sitter, Tailwind",
          liveDemoUrl: "https://codescope-ast.vercel.app",
          githubUrl: "https://github.com/alexchen-dev/codescope",
          bullets: [
            "Product Architecture: Built an in-browser code analyzer integrating Monaco Editor and WebAssembly syntax parsers to visualize live Abstract Syntax Trees in real time.",
            "Web Vitals Optimization: Reduced initial JavaScript bundle payload by 40% via dynamic chunk splitting and lazy-loaded WebAssembly modules, achieving a 99 Lighthouse Performance score.",
            "Responsive Design System: Designed 30+ accessible WCAG-compliant UI components with atomic Tailwind classes and keyboard-first navigation shortcuts.",
          ],
        },
        {
          title: "DesignGrid - High-Throughput Design Token Pipeline (Node.js, React, Tailwind)",
          techStack: "React, TypeScript, Node.js, GitHub API, Tailwind CSS",
          liveDemoUrl: "https://designgrid-tokens.vercel.app",
          githubUrl: "https://github.com/alexchen-dev/designgrid",
          bullets: [
            "Tooling Engineering: Created an automated token sync engine that transforms Figma JSON variables into TypeScript types and Tailwind CSS utility classes.",
            "Developer Experience: Cut design-to-code handoff time across 12 product squads from 3 days to under 15 minutes with automated GitHub pull requests.",
            "Quality Assurance: Authored automated end-to-end integration tests in Playwright and Vitest, reaching 94% test coverage across core token parsers.",
          ],
        },
      ],
      simulations: [
        {
          company: "Lyft",
          roleTitle: "Frontend Engineering Virtual Simulation",
          period: "May 2026",
          problemScope: "Addressed UI layout shift and sluggish dispatch map render cycles on high-density driver management dashboards during peak surge hours.",
          actionTaken: "Refactored map layer components to leverage WebGL hardware acceleration and implemented debounced spatial cluster filtering in React.",
          engineeringOutcome: "Boosted frame rates from 24 FPS to a smooth 60 FPS and eliminated cumulative layout shift (CLS to 0.00) across web dispatch surfaces.",
        },
        {
          company: "JPMorgan Chase & Co.",
          roleTitle: "Software Engineering Virtual Simulation",
          period: "April 2026",
          problemScope: "Built accessible real-time trade monitoring charts for institutional investors with strict sub-second data streaming latency requirements.",
          actionTaken: "Implemented streaming WebSocket feeds using Perspective.js and designed high-contrast accessible data tables with full keyboard accessibility.",
          engineeringOutcome: "Maintained continuous 100ms streaming updates without memory leaks across 8-hour continuous trading sessions.",
        },
      ],
      education: {
        degree: "Bachelor of Science in Computer Science",
        university: "University of California, Berkeley",
        period: "2022 - 2026",
        coursework: "Data Structures & Algorithms • User Interface Design • Web Architecture • Operating Systems • Computer Security",
      },
      targetRole: "Frontend Software Engineer",
      targetCompany: "Global Remote",
      atsScore: 96,
      matchedKeywords: ["React", "TypeScript", "Next.js", "Tailwind CSS", "Zustand", "Jest", "WebSockets"],
      missingKeywords: [],
      tailoringNotes: "Tier-1 Modern Frontend Blueprint",
    },
  },
  {
    id: "student_fresher",
    name: "CS Graduate / Fresher Engineer",
    badge: "ENTRY-LEVEL",
    roleTitle: "Associate Software Engineer / Graduate Developer",
    description: "Tailored for university graduates and freshers emphasizing core CS fundamentals, DSA, full-stack projects, and virtual simulations.",
    resume: {
      header: {
        fullName: "SAMANTHA PATEL",
        targetHeadline: "Computer Science Graduate | Associate Software Engineer | Backend & Full Stack",
        location: "Austin, TX (Open to Global Remote)",
        phone: "+1 (555) 345-6789",
        email: "samantha.patel.cs@example.com",
        portfolioUrl: "https://sampatel.dev",
        githubUrl: "https://github.com/sampatel-dev",
        linkedinUrl: "https://linkedin.com/in/samantha-patel-cs",
      },
      summary:
        "Driven Computer Science graduate with strong foundations in Data Structures & Algorithms, Object-Oriented Programming, and full-stack software development. Proficient in Python, Java, TypeScript, PostgreSQL, and Docker, with hands-on experience building distributed REST APIs, 3NF database schemas, and microservices through flagship projects and top-tier industry simulations.",
      skills: [
        {
          categoryName: "Languages",
          skillsText: "Python • Java • TypeScript • JavaScript • C++ • SQL • HTML5 • CSS3",
        },
        {
          categoryName: "Backend & Systems",
          skillsText: "FastAPI • Express.js • Node.js • Spring Boot • RESTful API Design • Microservices Architecture",
        },
        {
          categoryName: "Databases & Storage",
          skillsText: "PostgreSQL • MongoDB • SQLite • Redis Caching • Database Normalization (3NF)",
        },
        {
          categoryName: "Frontend & Full Stack",
          skillsText: "React.js • Next.js • Tailwind CSS • State Management • Responsive Design",
        },
        {
          categoryName: "DevOps & Tooling",
          skillsText: "Git • GitHub Actions CI/CD • Docker • Linux (Ubuntu/Debian) • Postman • VS Code",
        },
        {
          categoryName: "Core Fundamentals",
          skillsText: "Data Structures & Algorithms (DSA) • Object-Oriented Design (OOP) • System Design • Unit Testing (PyTest, Jest)",
        },
      ],
      projects: [
        {
          title: "CloudVault - Distributed File Sync & Metadata Indexer (Python FastAPI, PostgreSQL, Docker)",
          techStack: "Python FastAPI, PostgreSQL, Docker, Redis, PyTest",
          liveDemoUrl: "https://cloudvault-demo.onrender.com",
          githubUrl: "https://github.com/sampatel-dev/cloudvault",
          bullets: [
            "Product Architecture: Engineered a high-reliability distributed file indexing API handling chunked multi-part file uploads and metadata storage.",
            "Concurrency & Caching: Integrated Redis caching for frequent file queries and implemented asynchronous background upload tasks, speeding up response times by 38%.",
            "Data Integrity & Testing: Designed normalized 3NF PostgreSQL schemas with foreign key cascades and achieved 92% automated test coverage with PyTest.",
          ],
        },
        {
          title: "DevPulse - Developer Activity Aggregator & Metric Tracker (React, Node.js, Express, MongoDB)",
          techStack: "React, Node.js, Express, MongoDB, Tailwind CSS",
          liveDemoUrl: "https://devpulse-metrics.vercel.app",
          githubUrl: "https://github.com/sampatel-dev/devpulse",
          bullets: [
            "Product Architecture: Built a full-stack developer productivity dashboard integrating GitHub GraphQL APIs to analyze commit velocity and code review cycle times.",
            "REST API Development: Developed secure REST endpoints with JWT authentication, bcrypt password hashing, and rate-limiting middleware.",
            "Deployment & CI/CD: Automated build and testing workflows using GitHub Actions and deployed containerized microservices to cloud hosting.",
          ],
        },
        {
          title: "AlgoVisualizer - Interactive Algorithm & Graph Pathfinder (TypeScript, React, HTML5 Canvas)",
          techStack: "TypeScript, React, HTML5 Canvas, Algorithms",
          liveDemoUrl: "https://algovisualizer-path.vercel.app",
          githubUrl: "https://github.com/sampatel-dev/algovisualizer",
          bullets: [
            "Algorithm Implementation: Built interactive visual simulations for Dijkstra, A*, and BFS/DFS graph traversals with dynamic obstacle grid generation.",
            "Performance Optimization: Implemented custom requestAnimationFrame render loops, ensuring smooth 60 FPS animations across 1,000+ node grids.",
            "Documentation & Open Source: Documented algorithmic time and space complexities (Big-O) with comprehensive user guides and test cases.",
          ],
        },
      ],
      simulations: [
        {
          company: "Goldman Sachs",
          roleTitle: "Software Engineering Virtual Simulation",
          period: "March 2026",
          problemScope: "Analyzed security vulnerabilities and cryptographic integrity issues across legacy transaction validation pipelines.",
          actionTaken: "Implemented SHA-256 cryptographic hash checks and built automated password validation scripts in Python.",
          engineeringOutcome: "Patched critical boundary conditions and verified zero-defect compliance against banking security standards.",
        },
        {
          company: "Electronic Arts (EA)",
          roleTitle: "Software Engineering Virtual Simulation",
          period: "February 2026",
          problemScope: "Designed class hierarchies and data flow models for an in-game inventory system requiring fast O(1) item lookups.",
          actionTaken: "Authored object-oriented C++ classes with encapsulation, inheritance, and hash map indexing.",
          engineeringOutcome: "Reduced inventory search latency by 50% and authored unit tests validating inventory slot limits.",
        },
      ],
      education: {
        degree: "Bachelor of Science in Computer Science",
        university: "University of Texas at Austin",
        period: "2022 - 2026",
        coursework: "Data Structures & Algorithms • Database Systems • Operating Systems • Computer Networks • Software Engineering",
      },
      targetRole: "Associate Software Engineer",
      targetCompany: "Global Remote",
      atsScore: 95,
      matchedKeywords: ["Python", "FastAPI", "PostgreSQL", "Docker", "Git", "DSA", "OOP"],
      missingKeywords: [],
      tailoringNotes: "Tier-1 CS Graduate Blueprint",
    },
  },
  {
    id: "blank_canvas",
    name: "Blank Structured Canvas",
    badge: "CLEAN SLATE",
    roleTitle: "Custom Engineering Role",
    description: "A clean, pre-structured Tier-1 ATS single-column template ready for you to fill in your personalized details.",
    resume: {
      header: {
        fullName: "YOUR NAME",
        targetHeadline: "Target Role Title | Core Specialization | Industry Focus",
        location: "City, State / Country (Open to Remote)",
        phone: "+1 (555) 000-0000",
        email: "your.email@example.com",
        portfolioUrl: "https://yourportfolio.dev",
        githubUrl: "https://github.com/yourhandle",
        linkedinUrl: "https://linkedin.com/in/yourhandle",
      },
      summary:
        "Results-oriented Software Developer specializing in [Core Domain] with experience developing [Type of Applications / APIs]. Proficient in [Language 1], [Language 2], [Framework], and [Database], with a track record of optimizing systems for performance, scalability, and high reliability.",
      skills: [
        {
          categoryName: "Backend & Systems",
          skillsText: "Node.js • Python • RESTful APIs • Microservices • Caching",
        },
        {
          categoryName: "Databases & Storage",
          skillsText: "PostgreSQL • MongoDB • Redis • Schema Design (3NF)",
        },
        {
          categoryName: "Languages",
          skillsText: "TypeScript • JavaScript • Python • SQL • HTML5 • CSS3",
        },
        {
          categoryName: "Frontend UI & Web",
          skillsText: "React • Next.js • Tailwind CSS • Responsive UI",
        },
        {
          categoryName: "Testing & DevOps",
          skillsText: "Jest • PyTest • Docker • Git • CI/CD Pipelines",
        },
        {
          categoryName: "Tools & Architectures",
          skillsText: "System Architecture • Agile/Scrum • Cloud Platforms (GCP/AWS)",
        },
      ],
      projects: [
        {
          title: "Flagship Project One (Primary Tech Stack)",
          techStack: "Language, Framework, Database, Cloud",
          liveDemoUrl: "https://demo.example.com",
          githubUrl: "https://github.com/yourhandle/project-one",
          bullets: [
            "Product Architecture: Architected a full-stack web application that solves [specific problem] for [target audience].",
            "Technical Challenge & Solution: Implemented [specific feature/algorithm], optimizing system throughput and mitigating [specific risk].",
            "Quantifiable Outcome: Accelerated data processing times by 30% and authored automated unit tests ensuring 90%+ code coverage.",
          ],
        },
        {
          title: "Flagship Project Two (Secondary Tech Stack)",
          techStack: "Language, Backend, Storage",
          liveDemoUrl: "https://demo2.example.com",
          githubUrl: "https://github.com/yourhandle/project-two",
          bullets: [
            "System Engineering: Developed high-concurrency backend API services supporting secure authentication and database persistence.",
            "Performance Engineering: Integrated query indexing and caching mechanisms, keeping median response latency below 150ms.",
            "Quality & Deployment: Containerized the application with Docker and configured automated CI/CD deployment pipelines.",
          ],
        },
      ],
      simulations: [
        {
          company: "Enterprise Company / Simulation Org",
          roleTitle: "Software Engineering Simulation / Internship",
          period: "Month Year",
          problemScope: "Identified and analyzed system bottlenecks or architectural challenges within [specific domain].",
          actionTaken: "Designed and implemented [specific technical solution] utilizing best practices and design patterns.",
          engineeringOutcome: "Delivered verified solution improving performance by 25% and documented engineering specifications.",
        },
      ],
      education: {
        degree: "Bachelor of Science / Technology in Computer Science",
        university: "University Name",
        period: "Year - Year",
        coursework: "Data Structures & Algorithms • Database Management • Operating Systems • Computer Networks",
      },
      targetRole: "Software Engineer",
      targetCompany: "Global Remote",
      atsScore: 90,
      matchedKeywords: ["TypeScript", "Python", "React", "PostgreSQL", "Docker", "REST APIs"],
      missingKeywords: [],
      tailoringNotes: "Clean Blank Slate",
    },
  },
];

export interface AtsAuditResult {
  overallScore: number;
  grade: "Tier-1 (Elite)" | "Tier-2 (Strong)" | "Needs Tuning";
  metricCount: number;
  hasStandardHeaders: boolean;
  hasFullContactInfo: boolean;
  hasXyzBullets: boolean;
  checks: { title: string; passed: boolean; tip: string }[];
}

/**
 * Live ATS Scoring and Tier-1 Audit Matrix Calculator
 */
export function calculateAtsAudit(resume: OptimizedResume): AtsAuditResult {
  let score = 70;
  const checks: { title: string; passed: boolean; tip: string }[] = [];

  // Check 1: Contact details
  const header = resume.header;
  const hasContact = Boolean(
    header.fullName &&
    header.email &&
    header.phone &&
    header.location &&
    (header.githubUrl || header.linkedinUrl)
  );
  checks.push({
    title: "Complete ATS Contact Header",
    passed: hasContact,
    tip: hasContact ? "Full contact details present" : "Add Phone, Email, Location & GitHub/LinkedIn",
  });
  if (hasContact) score += 6;

  // Check 2: Professional Summary quality
  const summaryLength = resume.summary.trim().split(/\s+/).length;
  const hasGoodSummary = summaryLength >= 35 && summaryLength <= 90;
  checks.push({
    title: "Executive Summary Calibrated (35-90 words)",
    passed: hasGoodSummary,
    tip: hasGoodSummary ? `${summaryLength} words (optimal)` : `Currently ${summaryLength} words. Aim for 40-70 words.`,
  });
  if (hasGoodSummary) score += 6;

  // Check 3: Skills categories
  const hasCategories = resume.skills.length >= 4;
  checks.push({
    title: "Categorized Technical Skills (4+ groups)",
    passed: hasCategories,
    tip: hasCategories ? `${resume.skills.length} categories organized` : "Group skills into 4-6 clear categories",
  });
  if (hasCategories) score += 5;

  // Check 4: Quantifiable metrics count across bullets
  const allText = [
    resume.summary,
    ...resume.projects.flatMap((p) => p.bullets),
    ...resume.simulations.map((s) => `${s.problemScope} ${s.actionTaken} ${s.engineeringOutcome}`),
  ].join(" ");

  const metricRegex = /\b(\d+%\b|\d+ms\b|\d+k\b|\d+\+?\s*users|\d+x\b|\d+\s*FPS|\b3NF\b|\b256-bit\b|\b100,000\b|\b50\+\b|\b200ms\b|\b30%\b|\b35%\b|\b40%\b|\b45%\b|\b99\b|\b94%\b|\b92%\b|\b0\.00\b)/gi;
  const metricMatches = allText.match(metricRegex) || [];
  const metricCount = metricMatches.length;
  const hasSufficientMetrics = metricCount >= 6;

  checks.push({
    title: "Quantifiable Impact Metrics (XYZ formula)",
    passed: hasSufficientMetrics,
    tip: hasSufficientMetrics ? `${metricCount} metrics detected (Strong)` : `${metricCount} metrics detected. Add % improvements, latencies, user counts.`,
  });
  if (hasSufficientMetrics) score += 7;

  // Check 5: Project depth
  const hasProjects = resume.projects.length >= 2;
  checks.push({
    title: "Flagship Technical Projects (2-3 projects)",
    passed: hasProjects,
    tip: hasProjects ? `${resume.projects.length} projects documented` : "Include at least 2 detailed technical projects",
  });
  if (hasProjects) score += 3;

  // Check 6: Simulations / Experience
  const hasExp = resume.simulations.length >= 1;
  checks.push({
    title: "Simulations / Practical Work Experience",
    passed: hasExp,
    tip: hasExp ? `${resume.simulations.length} experiences included` : "Add virtual simulations or engineering roles",
  });
  if (hasExp) score += 3;

  const finalScore = Math.min(99, Math.max(65, score));
  let grade: "Tier-1 (Elite)" | "Tier-2 (Strong)" | "Needs Tuning" = "Tier-1 (Elite)";
  if (finalScore < 85) grade = "Needs Tuning";
  else if (finalScore < 93) grade = "Tier-2 (Strong)";

  return {
    overallScore: finalScore,
    grade,
    metricCount,
    hasStandardHeaders: true,
    hasFullContactInfo: hasContact,
    hasXyzBullets: hasSufficientMetrics,
    checks,
  };
}

