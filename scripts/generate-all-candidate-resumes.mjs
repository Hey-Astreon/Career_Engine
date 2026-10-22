import { chromium } from "playwright";
import { createRequire } from "module";
import fs from "fs";
import path from "path";

const require = createRequire(import.meta.url);
const { PDFParse } = require("pdf-parse");

function buildResumeHtml(resume) {
  const { header, summary, skills, projects, simulations, education } = resume;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
  @page {
    size: A4 portrait;
    margin: 0;
  }
  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }
  body {
    background: #ffffff;
    color: #111827;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .ats-a4-sheet {
    width: 210mm;
    height: 297mm;
    min-height: 297mm;
    max-height: 297mm;
    padding: 5.2mm 8.2mm 4.2mm;
    box-sizing: border-box;
    overflow: hidden;
  }
  .ats-a4-sheet h1 {
    font-size: 15.2pt;
    font-weight: 800;
    letter-spacing: -0.02em;
    margin: 0;
    line-height: 1.05;
    color: #0f172a;
    text-transform: uppercase;
    text-align: center;
  }
  .ats-a4-sheet .headline {
    font-size: 8.35pt;
    font-weight: 700;
    color: #1d4ed8;
    margin-top: 1.2pt;
    text-align: center;
    letter-spacing: 0.01em;
  }
  .ats-a4-sheet .contact-bar {
    margin-top: 1.4pt;
    font-size: 7.35pt;
    color: #334155;
    text-align: center;
    line-height: 1.15;
    font-weight: 500;
  }
  .ats-a4-sheet .contact-bar a {
    color: #1d4ed8;
    text-decoration: underline;
  }
  .ats-a4-sheet hr {
    border: 0;
    border-top: 0.75pt solid #cbd5e1;
    margin: 1.8pt 0 1.5pt;
  }
  .ats-a4-sheet h2 {
    font-size: 8.65pt;
    font-weight: 800;
    letter-spacing: 0.04em;
    margin: 0;
    color: #0f172a;
    text-transform: uppercase;
    line-height: 1.15;
  }
  .ats-a4-sheet .summary-text {
    margin-top: 1.0pt;
    font-size: 7.65pt;
    color: #1e293b;
    text-align: justify;
    line-height: 1.22;
  }
  .ats-a4-sheet .skills-container {
    margin-top: 1.0pt;
  }
  .ats-skill-row {
    font-size: 7.55pt;
    line-height: 1.20;
    color: #1e293b;
    margin-bottom: 0.9pt;
    display: flex;
    align-items: flex-start;
  }
  .ats-skill-bullet {
    width: 8pt;
    flex-shrink: 0;
    font-weight: 700;
    color: #0f172a;
    line-height: 1.20;
  }
  .ats-skill-text {
    flex: 1;
  }
  .ats-skill-text b {
    font-weight: 700;
    color: #0f172a;
  }
  .project-item {
    margin-top: 1.8pt;
  }
  .project-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 6pt;
    font-size: 7.85pt;
  }
  .project-title {
    font-weight: 750;
    color: #0f172a;
    flex: 1;
  }
  .project-tech {
    font-weight: 500;
    color: #334155;
  }
  .project-links {
    font-size: 7.2pt;
    color: #1d4ed8;
    white-space: nowrap;
    flex-shrink: 0;
  }
  .project-links a {
    color: #1d4ed8;
    text-decoration: underline;
  }
  .ats-bullets {
    list-style-type: disc;
    padding-left: 11.5pt;
    margin-top: 0.8pt;
  }
  .ats-bullets li {
    font-size: 7.4pt;
    line-height: 1.20;
    color: #1e293b;
    margin-bottom: 0.75pt;
  }
  .ats-bullets li b {
    font-weight: 700;
    color: #0f172a;
  }
  .simulation-header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    font-size: 7.75pt;
    margin-top: 1.8pt;
  }
  .simulation-title {
    font-weight: 750;
    color: #0f172a;
  }
  .simulation-period {
    font-size: 7.2pt;
    color: #475569;
    font-weight: 500;
  }
  .education-header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    font-size: 7.75pt;
    margin-top: 1.0pt;
  }
  .education-title {
    font-weight: 750;
    color: #0f172a;
  }
  .education-period {
    font-size: 7.2pt;
    color: #475569;
    font-weight: 500;
  }
  .education-coursework {
    font-size: 7.35pt;
    color: #1e293b;
    margin-top: 0.7pt;
    line-height: 1.18;
  }
  .education-coursework b {
    font-weight: 700;
    color: #0f172a;
  }
</style>
</head>
<body>
<div class="ats-a4-sheet">
  <h1>${header.fullName}</h1>
  <div class="headline">${header.targetHeadline}</div>
  <div class="contact-bar">
    ${header.location} | ${header.phone} | ${header.email} | <a href="${header.portfolioUrl}">${header.portfolioUrl.replace(/^https?:\/\//, "")}</a> | <a href="${header.githubUrl}">${header.githubUrl.replace(/^https?:\/\//, "")}</a> | <a href="${header.linkedinUrl}">${header.linkedinUrl.replace(/^https?:\/\//, "")}</a>
  </div>

  <hr>

  <h2>PROFESSIONAL SUMMARY</h2>
  <div class="summary-text">
    ${summary}
  </div>

  <hr>

  <h2>TECHNICAL SKILLS</h2>
  <div class="skills-container">
    ${skills
      .map(
        (s) => `<div class="ats-skill-row">
      <span class="ats-skill-bullet">•</span>
      <div class="ats-skill-text"><b>${s.categoryName}:</b> ${s.skillsText}</div>
    </div>`
      )
      .join("")}
  </div>

  <hr>

  <h2>TECHNICAL PROJECTS</h2>
  ${projects
    .map(
      (p) => `<div class="project-item">
    <div class="project-header">
      <div class="project-title">${p.title} <span class="project-tech">(${p.techStack})</span></div>
      <div class="project-links"><a href="${p.liveDemoUrl}">Live Demo</a> | <a href="${p.githubUrl}">GitHub</a></div>
    </div>
    <ul class="ats-bullets">
      ${p.bullets.map((b) => `<li>${b}</li>`).join("")}
    </ul>
  </div>`
    )
    .join("")}

  <hr>

  <h2>TECHNICAL SIMULATIONS &amp; VIRTUAL EXPERIENCES</h2>
  ${simulations
    .map(
      (sim) => `<div class="simulation-header">
    <div class="simulation-title">${sim.company} - ${sim.roleTitle}</div>
    <div class="simulation-period">${sim.period}</div>
  </div>
  <ul class="ats-bullets">
    <li><b>Problem &amp; Scope:</b> ${sim.problemScope}</li>
    <li><b>Action Taken:</b> ${sim.actionTaken}</li>
    <li><b>Key Outcome:</b> ${sim.engineeringOutcome}</li>
  </ul>`
    )
    .join("")}

  <hr>

  <h2>EDUCATION</h2>
  <div class="education-header">
    <div class="education-title">${education.degree} - ${education.university}</div>
    <div class="education-period">${education.period}</div>
  </div>
  <div class="education-coursework">
    <b>Relevant Coursework:</b> ${education.coursework}
  </div>
</div>
</body>
</html>`;
}

// -----------------------------------------------------------------------------
// CANDIDATE 1: ROUSHAN KUMAR
// -----------------------------------------------------------------------------
const roushanEducation = {
  degree: "Bachelor of Computer Applications (BCA)",
  university: "Amity University Noida",
  period: "Expected July 2028",
  coursework: "Data Structures & Algorithms (DSA) • Database Management Systems (DBMS) • Operating Systems (OS) • Computer Networks • Object-Oriented Programming (OOP)",
};

const roushanSimulations = [
  {
    company: "Commonwealth Bank (CommBank)",
    roleTitle: "Software Development Virtual Simulation",
    period: "June 2026",
    problemScope: "Diagnosed and resolved silent data overwrite bugs across high-traffic C#/.NET Core financial API controllers handling MongoDB document updates across financial services endpoints.",
    actionTaken: "Extended C# Web API controllers with $set atomic operators for partial payload updates and modernized an interactive React/Redux Goal Manager UI component for banking clients.",
    engineeringOutcome: "Authored comprehensive automated test suites using xUnit and Moq, covering complex boundary conditions to guarantee high reliability and transactional consistency.",
  },
  {
    company: "Y Combinator (YC Startup - Shiptivity)",
    roleTitle: "Software Development Virtual Simulation",
    period: "June 2026",
    problemScope: "Fixed key constraint collisions and slow re-rendering performance on a real-time drag-and-drop Kanban workflow board used by engineering teams to track task state transitions.",
    actionTaken: "Architected dynamic SQLite priority reordering logic using atomic transactions to update priority ranks sequentially and integrated Dragula drag-and-drop state hooks in React.",
    engineeringOutcome: "Reduced UI component re-render cycles by 30% and patched OpenSSL compilation bottlenecks in legacy Node.js Webpack configurations to optimize runtime builds.",
  },
  {
    company: "Walmart USA",
    roleTitle: "Advanced Software Development Virtual Simulation",
    period: "May 2026",
    problemScope: "Solved indexing overhead and performance bottlenecks in high-volume retail inventory processing queues handling unnormalized data ingestion from legacy spreadsheets.",
    actionTaken: "Implemented a generic K-ary Max Heap structure in Java using fast bitwise shift operators (<<, >>>) and built 3NF database schemas with design pattern abstractions.",
    engineeringOutcome: "Accelerated queue indexing calculations by 35% and engineered automated Python ETL pipelines using csv and sqlite3 to clean and consolidate disparate spreadsheets.",
  },
];

const roushanProjects = [
  {
    title: "AstreWork — Autonomous Career Intelligence Engine & Distributed Harvester",
    techStack: "OCI, Docker, Redis",
    liveDemoUrl: "https://astrework.app",
    githubUrl: "https://github.com/Hey-Astreon/Career_Engine",
    bullets: [
      "<b>Creator & Lead Backend Developer:</b> Engineered distributed scrapers on Oracle Cloud (OCI ARM64) aggregating 14,000+ remote opportunities daily across 7 platforms with 0% duplication.",
      "<b>Cloud Infrastructure & Microservices:</b> Deployed on Oracle Cloud (OCI Ampere ARM64) within multi-stage Docker containers managed by Watchtower CI/CD and Caddy HTTP/3 reverse proxy with automated SSL, maintaining 99.9% uptime and sub-50ms global API latency.",
      "<b>Distributed Caching & Concurrency:</b> Architected data persistence across Turso Cloud LibSQL (distributed SQLite WAL) and Redis 7 LRU caching, cutting duplicate job ingestion to 0% and reducing repeated query latency by 85%.",
    ],
  },
  {
    title: "Astra Vision - Developer Sandbox & Code Graph Parser",
    techStack: "FastAPI, Python, Monaco, Tree-Sitter",
    liveDemoUrl: "https://astra-frontend-mrfinklbba-uc.a.run.app/",
    githubUrl: "https://github.com/Hey-Astreon/Astra-Vision",
    bullets: [
      "<b>Product Architecture:</b> Architected an automated code-parsing platform and browser sandbox that allows developers to safely execute untrusted code while visualizing full-stack repository dependency graphs.",
      "<b>Sandbox Runtime Challenge:</b> Built a self-healing Python execution engine with subprocess isolation and security checkpoints to intercept unauthorized OS file system calls and network socket requests in real time.",
      "<b>Indexing Performance:</b> Integrated Tree-Sitter AST compilers and ChromaDB vector search to parse repository syntax nodes, enabling instant code graph dependency analysis under 200ms.",
    ],
  },
  {
    title: "Alyra Lock - Secure Zero-Knowledge Password Vault",
    techStack: "React, TypeScript, Express, MongoDB",
    liveDemoUrl: "https://alyra-lock.vercel.app/",
    githubUrl: "https://github.com/Hey-Astreon/Zero-Knowledge-Password-Manager",
    bullets: [
      "<b>Product Architecture:</b> Engineered a client-side zero-knowledge password vault ensuring master encryption keys remain entirely isolated inside user browser memory, mitigating cloud database leak risks.",
      "<b>Cryptographic Architecture:</b> Implemented Web Crypto API primitives utilizing AES-GCM (256-bit) payload encryption and PBKDF2 key derivation over 100,000 hashing iterations for key security.",
      "<b>Performance & Security:</b> Developed high-throughput Express.js REST API sync endpoints with JWT authentication and strict CORS headers, keeping vault database sync latency under 200ms.",
    ],
  },
];

const roushanSkills = [
  {
    categoryName: "System Design & Distributed Architecture",
    skillsText: "High-Throughput Pipelines, Concurrency & Rate Limiting, Microservices, Event-Driven Systems, REST APIs, System Reliability",
  },
  {
    categoryName: "Autonomous AI Agents & Web Scraping",
    skillsText: "Autonomous Scraper Agents, Multi-Agent Routing, Playwright, Puppeteer, Selenium, Stealth HTTP/3 Headers, Anti-Bot Bypasses, Circuit Breakers",
  },
  {
    categoryName: "Cloud Infrastructure & DevOps",
    skillsText: "Oracle Cloud (OCI ARM64), Docker, Docker Compose, Caddy (HTTP/3), GitHub Actions CI/CD, Watchtower, Google Cloud SDK, Linux/Bash",
  },
  {
    categoryName: "Databases & Caching",
    skillsText: "Turso Cloud LibSQL (WAL), Redis 7 (LRU), PostgreSQL, MongoDB, SQLite, Prisma ORM, Relational Schema Design (3NF)",
  },
  {
    categoryName: "Languages & Core Runtimes",
    skillsText: "TypeScript, JavaScript, Python (FastAPI), C# (.NET Core), Java (Spring Boot), C, Rust, SQL",
  },
  {
    categoryName: "Frontend, Testing & Security",
    skillsText: "Next.js 16 (App Router), React 19, Google GenAI / Agent SDK, Web Crypto API (AES-GCM, PBKDF2), HMAC-SHA256 Auth, Vitest, PyTest, xUnit",
  },
];

const roushanHeaderBase = {
  fullName: "ROUSHAN KUMAR",
  location: "Patna, Bihar, India",
  phone: "+91-9431483512",
  email: "roushanraut404@gmail.com",
  portfolioUrl: "https://astreon.me",
  githubUrl: "https://github.com/Hey-Astreon",
  linkedinUrl: "https://linkedin.com/in/astreon4547",
};

// Roushan Variants definition:
const roushanVariants = [
  {
    fileNames: ["Roushan_Kumar_Resume.pdf"],
    targetHeadline: "Full-Stack Developer | Distributed Systems & Cloud Infrastructure",
    summary:
      "Full-Stack Software Developer and Creator of AstreWork, with hands-on experience designing and operating distributed web scrapers, cloud infrastructure, and developer automation tools. Operates a live production platform on Oracle Cloud running containerized headless browser pipelines that process tens of thousands of postings daily. Approaches software development with a focus on high-throughput reliability, data pipeline concurrency, and pragmatic systems architecture.",
    skills: roushanSkills,
    projects: roushanProjects,
  },
  {
    fileNames: ["Roushan_Kumar_Full_Stack_Developer_Resume.pdf", "Roushan_Kumar_Full_Stack_Engineer_Resume.pdf"],
    targetHeadline: "Full-Stack Developer | React, Next.js, Node.js & TypeScript Specialist",
    summary:
      "Full-Stack Software Developer and Creator of AstreWork, skilled in building end-to-end web products, modular API backends, and responsive user interfaces across modern cloud architectures. Proven ability to bridge scalable Node.js/C# API services with modern React.js and Next.js frontends, state management hooks, and AI integrations. Experienced in optimizing client-side render performance, enforcing strict zero-knowledge security protocols, and shipping production-ready web platforms with low latency.",
    skills: [
      {
        categoryName: "Frontend UI & Full Stack",
        skillsText: "React.js, Next.js 16 (App Router), TypeScript, JavaScript (ESNext), Redux, Tailwind CSS, HTML5/CSS3",
      },
      {
        categoryName: "Backend & Microservices",
        skillsText: "Node.js, Express.js, Fastify, C# (.NET Core), Python (FastAPI), REST APIs, Server Actions",
      },
      {
        categoryName: "Databases & Caching",
        skillsText: "Turso Cloud LibSQL (WAL), Redis 7 (LRU), PostgreSQL, MongoDB, SQLite, Prisma ORM",
      },
      {
        categoryName: "Cloud & DevOps",
        skillsText: "Oracle Cloud (OCI ARM64), Docker, Docker Compose, Caddy (HTTP/3), GitHub Actions CI/CD, Watchtower, Vercel",
      },
      {
        categoryName: "Languages & Runtimes",
        skillsText: "TypeScript, JavaScript, Python, C#, Java, C, Rust, SQL",
      },
      {
        categoryName: "AI & Security",
        skillsText: "Gemini API, Web Crypto API, AES-GCM, PBKDF2, HMAC-SHA256, JWT Auth, Zod Validation, Vitest, xUnit",
      },
    ],
    projects: roushanProjects,
  },
  {
    fileNames: ["Roushan_Kumar_Backend_Developer_Resume.pdf", "Roushan_Kumar_Backend_Engineer_Resume.pdf"],
    targetHeadline: "Backend Developer | Distributed Systems, Cloud Architecture & High-Concurrency APIs",
    summary:
      "Backend Software Developer and Creator of AstreWork, specializing in high-throughput distributed architectures, microservices, and database optimization. Experienced in operating live production infrastructure on Oracle Cloud with sub-50ms API response times. Expert in resilient multi-threaded job harvesters, distributed caching with Redis 7, relational database design in 3NF, and automated testing across C#/.NET Core and Node.js.",
    skills: roushanSkills,
    projects: roushanProjects,
  },
  {
    fileNames: ["Roushan_Kumar_AI_Developer_Resume.pdf", "Roushan_Kumar_AI_Engineer_Resume.pdf"],
    targetHeadline: "AI Developer | Autonomous Agents, LLM Integration & Code Analysis",
    summary:
      "AI Software Developer and Creator of AstreWork, specializing in autonomous scraper agents, multi-agent LLM routing, and AST code graph compilers. Architected real-time vector search indexers with ChromaDB and Tree-Sitter AST parsers for developer sandboxes. Skilled in prompt optimization, multi-provider LLM failover cascades, and high-throughput data extraction with headless browser automation.",
    skills: [
      {
        categoryName: "AI & Autonomous Agents",
        skillsText: "Autonomous Browser Agents, Multi-Agent Routing, Google Gemini API, Groq, Tree-Sitter AST Parsers, ChromaDB Vector Search",
      },
      {
        categoryName: "Web Automation & Scraping",
        skillsText: "Playwright, Puppeteer, Selenium, Stealth HTTP/3 Headers, Anti-Bot Bypasses, Multi-Signal Deduplication, Circuit Breakers",
      },
      {
        categoryName: "Backend & Systems",
        skillsText: "Python (FastAPI), Node.js, Express.js, C# (.NET Core), REST APIs, Subprocess Isolation Sandboxes",
      },
      {
        categoryName: "Databases & Caching",
        skillsText: "Turso Cloud LibSQL (WAL), Redis 7 (LRU), PostgreSQL, MongoDB, SQLite, Vector Embeddings",
      },
      {
        categoryName: "Cloud & Infrastructure",
        skillsText: "Oracle Cloud (OCI ARM64), Docker, Docker Compose, Caddy (HTTP/3), GitHub Actions CI/CD, Linux/Bash",
      },
      {
        categoryName: "Languages & Testing",
        skillsText: "Python, TypeScript, JavaScript, C#, SQL, PyTest, Vitest, xUnit, Unit & Integration Testing",
      },
    ],
    projects: roushanProjects,
  },
  {
    fileNames: ["Roushan_Kumar_Python_Developer_Resume.pdf"],
    targetHeadline: "Python Developer | FastAPI Microservices, Autonomous Automation & Data Pipelines",
    summary:
      "Python Software Developer and Creator of AstreWork, specializing in FastAPI microservice architectures, automated headless browser pipelines, and AST parser sandboxes. Proven ability to build self-healing execution engines with subprocess isolation, intercepting unauthorized system calls in real time. Experienced in distributed data extraction, high-efficiency bitwise algorithms, and robust testing with PyTest.",
    skills: [
      {
        categoryName: "Python Core & Frameworks",
        skillsText: "Python 3.12+, FastAPI, Uvicorn, Asyncio, Subprocess Isolation, Tree-Sitter AST, ChromaDB, PyTest",
      },
      {
        categoryName: "Data Pipelines & Automation",
        skillsText: "Playwright, Puppeteer, Selenium, Automated Scraper Pipelines, CSV/JSON Processing, SQLite Ingestion, Data Transformation",
      },
      {
        categoryName: "Backend & Distributed Systems",
        skillsText: "RESTful API Design, Microservices, Redis 7 (LRU), Turso LibSQL, PostgreSQL, MongoDB, Docker",
      },
      {
        categoryName: "Cloud Infrastructure",
        skillsText: "Oracle Cloud (OCI ARM64), Docker Compose, Caddy Reverse Proxy, GitHub Actions CI/CD, Linux Systems",
      },
      {
        categoryName: "Languages & Web",
        skillsText: "Python, TypeScript, JavaScript, C#, Java, SQL, React, HTML5/CSS3",
      },
      {
        categoryName: "Security & Testing",
        skillsText: "PyTest, Vitest, xUnit, Web Crypto API, JWT Authentication, Zod/Pydantic Validation, Code Quality",
      },
    ],
    projects: [
      roushanProjects[1], // Astra Vision first
      roushanProjects[0], // AstreWork
      roushanProjects[2], // Alyra Lock
    ],
  },
  {
    fileNames: ["Roushan_Kumar_Product_Developer_Resume.pdf", "Roushan_Kumar_Product_Engineer_Resume.pdf"],
    targetHeadline: "Product Developer | Full-Stack Web Applications & High-Craft User Interfaces",
    summary:
      "Product-focused Software Developer and Creator of AstreWork, experienced in turning complex user problems into intuitive, high-velocity web platforms. Bridges robust backend services and cloud automation with accessible, responsive user interfaces. Focused on sub-second evaluation feedback, zero-knowledge privacy architecture, and measurable user conversion.",
    skills: roushanSkills,
    projects: roushanProjects,
  },
  {
    fileNames: ["Roushan_Kumar_Software_Developer_Resume.pdf", "Roushan_Kumar_Software_Engineer_Resume.pdf"],
    targetHeadline: "Software Developer | Distributed Systems & Full-Stack Applications",
    summary:
      "Full-Stack Software Developer and Creator of AstreWork, with hands-on experience designing and operating distributed web scrapers, cloud infrastructure, and developer automation tools. Operates a live production platform on Oracle Cloud running containerized headless browser pipelines that process tens of thousands of postings daily. Approaches software development with a focus on high-throughput reliability, data pipeline concurrency, and pragmatic systems architecture.",
    skills: roushanSkills,
    projects: roushanProjects,
  },
  {
    fileNames: ["Roushan_Kumar_Startup_Developer_Resume.pdf", "Roushan_Kumar_Startup_Software_Engineer_Resume.pdf"],
    targetHeadline: "Startup Software Developer | Rapid Prototyping, Systems Architecture & Low-Latency Products",
    summary:
      "Startup-oriented Full-Stack Developer and Creator of AstreWork, thriving in high-velocity, autonomous execution environments. Built and deployed a live distributed career platform from scratch on Oracle Cloud with 99.9% uptime and zero data loss. Passionate about rapid iteration, end-to-end product ownership, resilient systems architecture, and shipping production software that solves real user pain points.",
    skills: roushanSkills,
    projects: roushanProjects,
  },
  {
    fileNames: ["Roushan_Kumar_AI_Training_Specialist_Resume.pdf", "Roushan_Kumar_AI_Training_Engineer_Resume.pdf"],
    targetHeadline: "AI Training & Code Evaluation Specialist | AST Compilers, Test Automation & Code Quality",
    summary:
      "Technical Developer and Code Evaluation Specialist, experienced in Abstract Syntax Tree (AST) compilation, automated testing suites, and synthetic code benchmark validation. Built automated code-parsing engines and sandboxes intercepting unauthorized system calls. Skilled in analyzing code execution correctness, authoring boundary test cases in xUnit and PyTest, and evaluating LLM code outputs.",
    skills: [
      {
        categoryName: "Code Evaluation & Analysis",
        skillsText: "AST Syntax Trees, Tree-Sitter Parsers, ChromaDB Vector Search, Code Benchmark Verification, RLHF Evaluation",
      },
      {
        categoryName: "Test Automation & Quality",
        skillsText: "xUnit, Moq, PyTest, Vitest, Boundary Condition Coverage, Transactional Consistency, Regression Testing",
      },
      {
        categoryName: "Languages & Core Systems",
        skillsText: "Python, TypeScript, JavaScript, C# (.NET Core), Java, C, Rust, SQL",
      },
      {
        categoryName: "Autonomous Tooling",
        skillsText: "Playwright, Headless Browser Extraction, Subprocess Isolation Sandboxes, Docker Isolation",
      },
      {
        categoryName: "Databases & Persistence",
        skillsText: "Turso LibSQL, SQLite, PostgreSQL, MongoDB, Redis 7",
      },
      {
        categoryName: "Cloud & DevOps",
        skillsText: "Oracle Cloud (OCI), Docker, GitHub Actions CI/CD, Linux/Bash",
      },
    ],
    projects: [
      roushanProjects[1], // Astra Vision first
      roushanProjects[0], // AstreWork
      roushanProjects[2], // Alyra Lock
    ],
  },
];

// -----------------------------------------------------------------------------
// CANDIDATE 2: AYUSHI RAJ
// -----------------------------------------------------------------------------
const ayushiEducation = {
  degree: "Bachelor of Computer Applications (BCA)",
  university: "Amity University Noida",
  period: "Expected July 2028",
  coursework: "Data Structures & Algorithms (DSA) • Database Management Systems (DBMS) • Operating Systems (OS) • Computer Networks • Object-Oriented Programming (OOP)",
};

const ayushiSimulations = [
  {
    company: "Commonwealth Bank (CommBank)",
    roleTitle: "Software Development Virtual Simulation",
    period: "June 2026",
    problemScope: "Diagnosed and resolved silent data overwrite bugs across high-traffic C#/.NET Core financial API controllers handling MongoDB document updates across financial services endpoints.",
    actionTaken: "Extended C# Web API controllers with $set atomic operators for partial payload updates and modernized an interactive React/Redux Goal Manager UI component for banking clients.",
    engineeringOutcome: "Authored comprehensive automated test suites using xUnit and Moq, covering complex boundary conditions to guarantee high reliability and transactional consistency.",
  },
  {
    company: "Y Combinator (YC Startup - Shiptivity)",
    roleTitle: "Software Development Virtual Simulation",
    period: "June 2026",
    problemScope: "Fixed key constraint collisions and slow re-rendering performance on a real-time drag-and-drop Kanban workflow board used by engineering teams to track task state transitions.",
    actionTaken: "Architected dynamic SQLite priority reordering logic using atomic transactions to update priority ranks sequentially and integrated Dragula drag-and-drop state hooks in React.",
    engineeringOutcome: "Reduced UI component re-render cycles by 30% and patched OpenSSL compilation bottlenecks in legacy Node.js Webpack configurations to optimize runtime builds.",
  },
  {
    company: "Walmart USA",
    roleTitle: "Advanced Software Development Virtual Simulation",
    period: "May 2026",
    problemScope: "Solved indexing overhead and performance bottlenecks in high-volume retail inventory processing queues handling unnormalized data ingestion from legacy spreadsheets.",
    actionTaken: "Implemented a generic K-ary Max Heap structure in Java using fast bitwise shift operators (<<, >>>) and built 3NF database schemas with design pattern abstractions.",
    engineeringOutcome: "Accelerated queue indexing calculations by 35% and engineered automated Python ETL pipelines using csv and sqlite3 to clean and consolidate disparate spreadsheets.",
  },
];

const ayushiProjects = [
  {
    title: "AstreWork — Autonomous Career Platform & AstrePilot Extension",
    techStack: "Next.js 16, Chrome MV3, Gemini API",
    liveDemoUrl: "https://astrework.app",
    githubUrl: "https://github.com/Silenttears-cloud/Career_Engine",
    bullets: [
      "<b>Co-Developer & Lead Frontend Architect:</b> Engineered client-side ATS match engine and Gemini-powered scoring studio on Next.js 16, achieving sub-second evaluation across live postings.",
      "<b>AstrePilot Chrome Extension (Manifest V3):</b> Built a cross-browser extension with an isolated glassmorphic Shadow-DOM HUD and HMAC-SHA256 token authorization, executing 1-click ATS application autofill across Greenhouse, Lever, and Ashby in ~15 seconds per application.",
      "<b>High-Density Reactive UI Architecture:</b> Engineered a responsive, accessible workspace in Next.js 16 App Router and React 19 with Zustand state management, real-time ATS audit checklists, and print-perfect A4 CSS layout rendering with zero layout shift.",
    ],
  },
  {
    title: "Alyra Lock - Secure Zero-Knowledge Password Vault",
    techStack: "React, TypeScript, Express, MongoDB",
    liveDemoUrl: "https://alyra-lock.vercel.app/",
    githubUrl: "https://github.com/Silenttears-cloud/Zero-knowledge-password-manager-",
    bullets: [
      "<b>Product Architecture:</b> Engineered a client-side zero-knowledge password vault ensuring master encryption keys remain entirely isolated inside user browser memory, mitigating cloud database leak risks.",
      "<b>Cryptographic Architecture:</b> Implemented Web Crypto API primitives utilizing AES-GCM (256-bit) payload encryption and PBKDF2 key derivation over 100,000 hashing iterations for key security.",
      "<b>Performance & Security:</b> Developed high-throughput Express.js REST API sync endpoints with JWT authentication and strict CORS headers, keeping vault database sync latency under 200ms.",
    ],
  },
  {
    title: "Astra Vision - AI Sandbox & Code Parsing Platform",
    techStack: "FastAPI, Python, Monaco, Tree-Sitter",
    liveDemoUrl: "https://astra-frontend-mrfinklbba-uc.a.run.app/",
    githubUrl: "https://github.com/Silenttears-cloud/Astra_vision",
    bullets: [
      "<b>Product Architecture:</b> Architected an automated code-parsing platform and browser sandbox that allows developers to safely execute untrusted code while visualizing full-stack repository dependency graphs.",
      "<b>Sandbox Runtime Challenge:</b> Built a self-healing Python execution engine with subprocess isolation and security checkpoints to intercept unauthorized OS file system calls and network socket requests in real time.",
      "<b>Indexing Performance:</b> Integrated Tree-Sitter AST compilers and ChromaDB vector search to parse repository syntax nodes, enabling instant code graph dependency analysis under 200ms.",
    ],
  },
];

const ayushiSkills = [
  {
    categoryName: "Autonomous AI Agents & Intelligent Systems",
    skillsText: "Autonomous Browser Agents, Google GenAI SDK, Multi-Model LLM Routing (Groq/Gemini), Dynamic Job-Tailoring Algorithms, ATS Scoring Systems",
  },
  {
    categoryName: "System Design & Full-Stack Architecture",
    skillsText: "Next.js 16 (App Router), React 19, Server Components (RSC), Server Actions, RESTful APIs, State Machines (Zustand), Turso LibSQL, Redis 7 Caching",
  },
  {
    categoryName: "Browser Automation & Extensions",
    skillsText: "Chrome Extensions (Manifest V3), Shadow DOM Injection, Content Script Orchestration, Playwright, Puppeteer, DOM Parsing, Web Workers",
  },
  {
    categoryName: "Languages & Core Runtimes",
    skillsText: "TypeScript, JavaScript, Python, C# (.NET Core), Java (Spring Boot), Node.js, Fastify, SQL",
  },
  {
    categoryName: "UI Engineering & Design Systems",
    skillsText: "Tailwind CSS, Vanilla CSS (Glassmorphism & Design Tokens), Monaco Editor, Lucide Icons, Print-Perfect A4 Layouts, Responsive Design",
  },
  {
    categoryName: "Security, Testing & Cloud",
    skillsText: "Web Crypto API (AES-GCM, PBKDF2), HMAC-SHA256, JWT, Vitest, Jest, PyTest, Oracle Cloud (OCI), Docker, Git/GitHub",
  },
];

const ayushiHeaderBase = {
  fullName: "AYUSHI RAJ",
  location: "Bihar, India",
  phone: "+91-8709852305",
  email: "ayushi29507@gmail.com",
  portfolioUrl: "https://ayushiraj.me",
  githubUrl: "https://github.com/Silenttears-cloud",
  linkedinUrl: "https://www.linkedin.com/in/alrya404/",
};

// Ayushi Variants definition:
const ayushiVariants = [
  {
    fileNames: ["Ayushi_Raj_Resume.pdf"],
    targetHeadline: "Full-Stack Developer | AI Systems & Interactive Web Applications",
    summary:
      "Full-Stack Software Developer and Co-Developer of AstreWork, specializing in AI-integrated web applications, autonomous browser extensions, and high-craft user interfaces. Architected AstreWork's client-side ATS optimization engine, Gemini-powered scoring algorithms, and the AstrePilot Chrome Extension. Combines deep attention to frontend performance and design systems with robust backend APIs, secure state management, and real-world developer tooling.",
    skills: ayushiSkills,
    projects: ayushiProjects,
  },
  {
    fileNames: ["Ayushi_Raj_AI_Product_Developer_Resume.pdf"],
    targetHeadline: "AI Product Developer | Full-Stack Applications & Intelligent Agents",
    summary:
      "AI Product Developer and Co-Developer of AstreWork, specializing in building intelligent browser extensions, multi-model AI workflows, and high-conversion web interfaces. Engineered AstrePilot (Chrome Manifest V3) with isolated Shadow DOM HUD and 1-click ATS application autofill. Combines Google Gemini API orchestration with sub-second client-side ATS scoring and reactive React 19 / Next.js frontends.",
    skills: ayushiSkills,
    projects: ayushiProjects,
  },
  {
    fileNames: ["Ayushi_Raj_Full_Stack_Developer_Resume.pdf", "Ayushi_Raj_Full_Stack_Engineer_Resume.pdf"],
    targetHeadline: "Full-Stack Developer | React 19, Next.js & Modern Web Applications",
    summary:
      "Full-Stack Software Developer and Co-Developer of AstreWork, specializing in React 19, Next.js 16 App Router, TypeScript, and performant backend services. Designed high-density workspaces with Zustand state management, real-time client-side ATS audit matrices, and zero-knowledge cryptography. Passionate about responsive design systems, accessibility, and clean architecture.",
    skills: ayushiSkills,
    projects: ayushiProjects,
  },
  {
    fileNames: ["Ayushi_Raj_Backend_Developer_Resume.pdf", "Ayushi_Raj_Backend_Engineer_Resume.pdf"],
    targetHeadline: "Backend Developer | Secure APIs, Cryptography & Database Systems",
    summary:
      "Backend Software Developer and Co-Developer of AstreWork, experienced in designing secure RESTful microservices, zero-knowledge cryptographic vaults, and distributed data caching. Implemented Web Crypto API primitives (AES-GCM, PBKDF2) over 100,000 hashing iterations and managed transactional databases across Turso LibSQL, PostgreSQL, and MongoDB.",
    skills: ayushiSkills,
    projects: [
      ayushiProjects[1], // Alyra Lock first
      ayushiProjects[0], // AstreWork
      ayushiProjects[2], // Astra Vision
    ],
  },
  {
    fileNames: ["Ayushi_Raj_AI_Developer_Resume.pdf", "Ayushi_Raj_AI_Engineer_Resume.pdf"],
    targetHeadline: "AI Developer | Autonomous Browser Agents & LLM Applications",
    summary:
      "AI Developer and Co-Developer of AstreWork, specializing in Chrome extensions (Manifest V3), Google Gemini API orchestration, and client-side ATS scoring models. Designed isolated Shadow-DOM HUD interfaces with token authorization, delivering seamless 1-click browser automation across complex web forms.",
    skills: ayushiSkills,
    projects: ayushiProjects,
  },
  {
    fileNames: ["Ayushi_Raj_Python_Developer_Resume.pdf"],
    targetHeadline: "Python Developer | FastAPI, Browser Automation & API Architecture",
    summary:
      "Python Software Developer and Co-Developer of AstreWork, experienced in FastAPI microservices, headless browser orchestration with Playwright/Puppeteer, and Tree-Sitter AST syntax tree parsing. Implemented subprocess isolation sandboxes to execute untrusted code safely while visualizing code dependency graphs.",
    skills: ayushiSkills,
    projects: [
      ayushiProjects[2], // Astra Vision first
      ayushiProjects[0], // AstreWork
      ayushiProjects[1], // Alyra Lock
    ],
  },
  {
    fileNames: ["Ayushi_Raj_Product_Developer_Resume.pdf", "Ayushi_Raj_Product_Engineer_Resume.pdf"],
    targetHeadline: "Product Developer | High-Craft User Interfaces & Web Systems",
    summary:
      "Product Developer and Co-Developer of AstreWork, passionate about crafting seamless user experiences, responsive design systems, and fast interactive applications. Built client-side ATS audit tools with real-time visual feedback, heatmaps, and zero layout shift across viewports.",
    skills: ayushiSkills,
    projects: ayushiProjects,
  },
  {
    fileNames: ["Ayushi_Raj_Software_Developer_Resume.pdf", "Ayushi_Raj_Software_Engineer_Resume.pdf"],
    targetHeadline: "Software Developer | Full-Stack Systems & Web Applications",
    summary:
      "Software Developer and Co-Developer of AstreWork, specializing in modern full-stack web applications, secure client-side cryptography, and autonomous browser automation. Combines clean frontend design with reliable backend APIs, thorough automated testing, and agile iteration.",
    skills: ayushiSkills,
    projects: ayushiProjects,
  },
  {
    fileNames: ["Ayushi_Raj_Startup_Developer_Resume.pdf", "Ayushi_Raj_Startup_Software_Engineer_Resume.pdf"],
    targetHeadline: "Startup Software Developer | Zero-to-One Product Velocity & Modern Web Systems",
    summary:
      "Fast-moving Startup Developer and Co-Developer of AstreWork, excelling in zero-to-one product engineering, rapid prototyping, and shipping production web applications. Built and scaled AstreWork's core frontend suite and browser extension with high autonomy, craft, and speed.",
    skills: ayushiSkills,
    projects: ayushiProjects,
  },
  {
    fileNames: ["Ayushi_Raj_AI_Training_Specialist_Resume.pdf", "Ayushi_Raj_AI_Training_Engineer_Resume.pdf"],
    targetHeadline: "AI Training & Code Evaluation Specialist | AST Compilers & Code Quality Benchmarks",
    summary:
      "Technical Developer and Code Evaluation Specialist, experienced in Abstract Syntax Tree (AST) parsing, automated test generation, and code quality evaluation. Skilled in assessing code logic, identifying runtime edge cases, and authoring automated test suites in xUnit, PyTest, and Vitest.",
    skills: ayushiSkills,
    projects: [
      ayushiProjects[2], // Astra Vision first
      ayushiProjects[0], // AstreWork
      ayushiProjects[1], // Alyra Lock
    ],
  },
];

// -----------------------------------------------------------------------------
// MAIN GENERATOR
// -----------------------------------------------------------------------------
async function main() {
  console.log("=== STARTING FULL REGENERATION OF CANDIDATE RESUME PDFS ===");
  const browser = await chromium.launch({ headless: true });

  const tasks = [
    {
      candidate: "Roushan Kumar",
      folder: path.join(process.cwd(), "public", "candidates", "3_Roushan_Kumar"),
      headerBase: roushanHeaderBase,
      education: roushanEducation,
      simulations: roushanSimulations,
      variants: roushanVariants,
    },
    {
      candidate: "Ayushi Raj",
      folder: path.join(process.cwd(), "public", "candidates", "2_Ayushi_Raj"),
      headerBase: ayushiHeaderBase,
      education: ayushiEducation,
      simulations: ayushiSimulations,
      variants: ayushiVariants,
    },
  ];

  let totalFilesWritten = 0;
  const auditReport = [];

  for (const t of tasks) {
    console.log(`\nProcessing candidate: ${t.candidate} -> ${t.folder}`);
    if (!fs.existsSync(t.folder)) {
      fs.mkdirSync(t.folder, { recursive: true });
    }

    for (const v of t.variants) {
      const resume = {
        header: {
          ...t.headerBase,
          targetHeadline: v.targetHeadline,
        },
        summary: v.summary,
        skills: v.skills,
        projects: v.projects,
        simulations: t.simulations,
        education: t.education,
      };

      const html = buildResumeHtml(resume);
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: "networkidle" });
      const pdfBuffer = await page.pdf({
        format: "A4",
        printBackground: true,
        margin: { top: "0mm", bottom: "0mm", left: "0mm", right: "0mm" },
      });
      await page.close();

      // Audit with pdf-parse
      const parser = new PDFParse(new Uint8Array(pdfBuffer));
      const textResult = await parser.getText();
      const pageCount = textResult.pages?.length || 1;
      const text = textResult.text || "";

      // Strict assertions:
      const engineerMatches = text.match(/\bengineer\b|\bengineers\b/gi) || [];
      const hasAstreWork = text.includes("AstreWork");
      const isSinglePage = pageCount === 1;

      for (const fileName of v.fileNames) {
        const destPath = path.join(t.folder, fileName);
        fs.writeFileSync(destPath, pdfBuffer);
        totalFilesWritten++;
        console.log(`  -> Wrote [${fileName}] (${pdfBuffer.length} bytes, ${pageCount} page(s))`);
      }

      auditReport.push({
        candidate: t.candidate,
        headline: v.targetHeadline,
        fileCount: v.fileNames.length,
        isSinglePage,
        hasAstreWork,
        engineerCount: engineerMatches.length,
      });

      if (!isSinglePage) {
        console.error(`  [FAIL] ${v.targetHeadline} overflowed to ${pageCount} pages!`);
      }
      if (!hasAstreWork) {
        console.error(`  [FAIL] ${v.targetHeadline} missing AstreWork project!`);
      }
      if (engineerMatches.length > 0) {
        console.error(`  [FAIL] ${v.targetHeadline} contains forbidden word 'engineer': ${engineerMatches.join(", ")}`);
      }
    }
  }

  await browser.close();

  console.log("\n=======================================================");
  console.log(`TOTAL CANDIDATE PDFS REGENERATED AND WRITTEN: ${totalFilesWritten}`);
  console.log("=======================================================");
  console.table(auditReport);

  const allPassed = auditReport.every((r) => r.isSinglePage && r.hasAstreWork && r.engineerCount === 0);
  if (!allPassed) {
    console.error("FATAL: Some resumes failed single-page, AstreWork, or Engineer audit checks!");
    process.exit(1);
  } else {
    console.log("SUCCESS: 100% of candidate resumes passed single-page, AstreWork, and Title audits!");
  }
}

main().catch((err) => {
  console.error("Fatal generator error:", err);
  process.exit(1);
});
