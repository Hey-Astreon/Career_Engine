import { PlatformSource } from "@prisma/client";
import { db } from "../src/lib/db";
import { runAllProviders } from "../src/lib/providers/registry";
import { generateUrlHash } from "../src/lib/providers/dedup";

async function main() {
  console.log("[Seed] Syncing candidate profiles and ingesting real live remote postings...");

  // 1. Roushan Kumar Profile
  const roushan = await db.profile.upsert({
    where: { slug: "roushan" },
    update: {
      fullName: "ROUSHAN KUMAR",
      title: "Full-Stack Developer | Distributed Systems & Cloud Infrastructure",
      email: "roushanraut404@gmail.com",
      phone: "+91-9431483512",
      location: "Patna, Bihar, India",
      portfolioUrl: "https://astreon.me",
      githubUrl: "https://github.com/Hey-Astreon",
      linkedinUrl: "https://linkedin.com/in/astreon4547",
      masterResumePath: "x:/Career_Engine/3_Roushan_Kumar/Roushan_Kumar_Resume.pdf",
    },
    create: {
      slug: "roushan",
      fullName: "ROUSHAN KUMAR",
      title: "Full-Stack Developer | Distributed Systems & Cloud Infrastructure",
      email: "roushanraut404@gmail.com",
      phone: "+91-9431483512",
      location: "Patna, Bihar, India",
      portfolioUrl: "https://astreon.me",
      githubUrl: "https://github.com/Hey-Astreon",
      linkedinUrl: "https://linkedin.com/in/astreon4547",
      masterResumePath: "x:/Career_Engine/3_Roushan_Kumar/Roushan_Kumar_Resume.pdf",
    },
  });

  await db.project.deleteMany({ where: { profileId: roushan.id } });
  await db.project.createMany({
    data: [
      {
        profileId: roushan.id,
        title: "AstreWork — Autonomous Career Intelligence Engine & Distributed Harvester",
        techStack: "Next.js 16, TypeScript, Python, Playwright, Puppeteer, Selenium, Turso LibSQL, Redis 7, Oracle Cloud (OCI), Docker, Caddy",
        liveDemoUrl: "https://astrework.app",
        githubUrl: "https://github.com/Hey-Astreon/Career_Engine",
        architecture: "Distributed multi-provider job harvesting engine on Oracle Cloud running containerized headless scrapers with Redis caching and Turso LibSQL WAL persistence.",
        bulletPoints: JSON.stringify([
          "Creator & Lead Backend Developer: Conceived and engineered the distributed harvesting engine and containerized infrastructure operating live on Oracle Cloud (https://astrework.app), aggregating 14,000+ remote opportunities daily across 7 platforms with 0% duplication.",
          "Cloud Infrastructure & Microservices: Deployed on Oracle Cloud (OCI Ampere ARM64) within multi-stage Docker containers managed by Watchtower CI/CD and Caddy HTTP/3 reverse proxy with automated SSL, maintaining 99.9% uptime and sub-50ms global API latency.",
          "Distributed Caching & Concurrency: Architected data persistence across Turso Cloud LibSQL (distributed SQLite WAL) and Redis 7 LRU caching, cutting duplicate job ingestion to 0% and reducing repeated query latency by 85%."
        ]),
      },
      {
        profileId: roushan.id,
        title: "Astra Vision - Developer Sandbox & Code Graph Parser",
        techStack: "FastAPI, Python, Monaco, Tree-Sitter, ChromaDB",
        liveDemoUrl: "https://astra-frontend-mrfinklbba-uc.a.run.app/",
        githubUrl: "https://github.com/Hey-Astreon/Astra-Vision",
        architecture: "FastAPI microservice backend parsing full-stack dependency graphs via Tree-Sitter AST compilers.",
        bulletPoints: JSON.stringify([
          "Product Architecture: Architected an automated code-parsing platform and browser sandbox that allows developers to safely execute untrusted code while visualizing full-stack repository dependency graphs.",
          "Sandbox Runtime Challenge: Built a self-healing Python execution engine with subprocess isolation and security checkpoints to intercept unauthorized OS file system calls and network socket requests in real time.",
          "Indexing Performance: Integrated Tree-Sitter AST compilers and ChromaDB vector search to parse repository syntax nodes, enabling instant code graph dependency analysis under 200ms."
        ]),
      },
      {
        profileId: roushan.id,
        title: "Alyra Lock - Secure Zero-Knowledge Password Vault",
        techStack: "React, TypeScript, Express, MongoDB, Web Crypto API",
        liveDemoUrl: "https://alyra-lock.vercel.app/",
        githubUrl: "https://github.com/Hey-Astreon/Zero-Knowledge-Password-Manager",
        architecture: "Client-side zero-knowledge architecture using AES-GCM 256-bit payload encryption.",
        bulletPoints: JSON.stringify([
          "Product Architecture: Engineered a client-side zero-knowledge password vault ensuring master encryption keys remain entirely isolated inside user browser memory, mitigating cloud database leak risks.",
          "Cryptographic Engineering: Implemented Web Crypto API primitives utilizing AES-GCM (256-bit) payload encryption and PBKDF2 key derivation over 100,000 hashing iterations for key security.",
          "Performance & Security: Developed high-throughput Express.js REST API sync endpoints with JWT authentication and strict CORS headers, keeping vault database sync latency under 200ms."
        ]),
      },
    ],
  });

  await db.virtualExperience.deleteMany({ where: { profileId: roushan.id } });
  await db.virtualExperience.createMany({
    data: [
      {
        profileId: roushan.id,
        company: "Commonwealth Bank (CommBank)",
        roleTitle: "Software Engineering Virtual Simulation",
        period: "June 2026",
        problemScope: "Diagnosed and resolved silent data overwrite bugs across high-traffic C#/.NET Core financial API controllers handling MongoDB document updates.",
        actionTaken: "Extended C# Web API controllers with $set atomic operators for partial payload updates and modernized an interactive React/Redux Goal Manager UI component.",
        outcome: "Authored comprehensive automated test suites using xUnit and Moq, covering complex boundary conditions to guarantee high reliability.",
      },
      {
        profileId: roushan.id,
        company: "Y Combinator (YC Startup - Shiptivity)",
        roleTitle: "Software Engineering Virtual Simulation",
        period: "June 2026",
        problemScope: "Fixed key constraint collisions and slow re-rendering performance on a real-time drag-and-drop Kanban workflow board.",
        actionTaken: "Architected dynamic SQLite priority reordering logic using atomic transactions to update priority ranks sequentially.",
        outcome: "Reduced UI component re-render cycles by 30% and patched OpenSSL compilation bottlenecks in legacy Node.js Webpack configurations.",
      },
      {
        profileId: roushan.id,
        company: "Walmart USA",
        roleTitle: "Advanced Software Engineering Virtual Simulation",
        period: "May 2026",
        problemScope: "Solved indexing overhead and performance bottlenecks in high-volume retail inventory processing queues.",
        actionTaken: "Implemented a generic K-ary Max Heap structure in Java using fast bitwise shift operators (<<, >>>) and built 3NF database schemas.",
        outcome: "Accelerated queue indexing calculations by 35% and engineered automated Python ETL pipelines using csv and sqlite3.",
      },
    ],
  });

  // 2. Ayushi Raj Profile
  const ayushi = await db.profile.upsert({
    where: { slug: "ayushi" },
    update: {
      fullName: "AYUSHI RAJ",
      title: "Full-Stack Developer | AI Systems & Interactive Web Applications",
      email: "ayushi29507@gmail.com",
      phone: "+91-8709852305",
      location: "Bihar, India",
      portfolioUrl: "https://ayushiraj.me",
      githubUrl: "https://github.com/Silenttears-cloud",
      linkedinUrl: "https://www.linkedin.com/in/alrya404/",
      masterResumePath: "x:/Career_Engine/2_Ayushi_Raj/Ayushi_Raj_Resume.pdf",
    },
    create: {
      slug: "ayushi",
      fullName: "AYUSHI RAJ",
      title: "Full-Stack Developer | AI Systems & Interactive Web Applications",
      email: "ayushi29507@gmail.com",
      phone: "+91-8709852305",
      location: "Bihar, India",
      portfolioUrl: "https://ayushiraj.me",
      githubUrl: "https://github.com/Silenttears-cloud",
      linkedinUrl: "https://www.linkedin.com/in/alrya404/",
      masterResumePath: "x:/Career_Engine/2_Ayushi_Raj/Ayushi_Raj_Resume.pdf",
    },
  });

  await db.project.deleteMany({ where: { profileId: ayushi.id } });
  await db.project.createMany({
    data: [
      {
        profileId: ayushi.id,
        title: "AstreWork — Autonomous Remote Career Platform & AstrePilot Extension",
        techStack: "Next.js 16, React 19, TypeScript, Google Gemini API, Chrome Extension (Manifest V3), Turso LibSQL, Redis 7, TailwindCSS",
        liveDemoUrl: "https://astrework.app",
        githubUrl: "https://github.com/Silenttears-cloud/Career_Engine",
        architecture: "Intelligent candidate matching engine and AstrePilot Chrome Extension (MV3) with isolated Shadow DOM HUD and HMAC-SHA256 authorization.",
        bulletPoints: JSON.stringify([
          "Co-Developer & Lead Frontend Architect: Co-developed the production career platform operating live on Oracle Cloud (https://astrework.app), architecting the client-side ATS optimization engine and Gemini-powered scoring algorithms with sub-second matching latency.",
          "AstrePilot Chrome Extension (Manifest V3): Built a cross-browser extension with an isolated glassmorphic Shadow-DOM HUD and HMAC-SHA256 token authorization, executing 1-click ATS application autofill across Greenhouse, Lever, and Ashby in ~15 seconds per application.",
          "High-Density Reactive UI Architecture: Engineered a responsive, accessible workspace in Next.js 16 App Router and React 19 with Zustand state management, real-time ATS audit checklists, and print-perfect A4 CSS layout rendering with zero layout shift."
        ]),
      },
      {
        profileId: ayushi.id,
        title: "Alyra Lock - Secure Zero-Knowledge Password Vault",
        techStack: "React, TypeScript, Express, MongoDB, Web Crypto API",
        liveDemoUrl: "https://alyra-lock.vercel.app/",
        githubUrl: "https://github.com/Silenttears-cloud/Zero-knowledge-password-manager-",
        architecture: "Zero-knowledge security vault with AES-GCM 256-bit payload encryption and client-side isolation.",
        bulletPoints: JSON.stringify([
          "Product Architecture: Engineered a client-side zero-knowledge password vault ensuring master encryption keys remain entirely isolated inside user browser memory, mitigating cloud database leak risks.",
          "Cryptographic Engineering: Implemented Web Crypto API primitives utilizing AES-GCM (256-bit) payload encryption and PBKDF2 key derivation over 100,000 hashing iterations for key security.",
          "Performance & Security: Developed high-throughput Express.js REST API sync endpoints with JWT authentication and strict CORS headers, keeping vault database sync latency under 200ms."
        ]),
      },
      {
        profileId: ayushi.id,
        title: "Astra Vision - AI Sandbox & Code Parsing Platform",
        techStack: "FastAPI, Python, Monaco, Tree-Sitter, ChromaDB",
        liveDemoUrl: "https://astra-frontend-mrfinklbba-uc.a.run.app/",
        githubUrl: "https://github.com/Silenttears-cloud/Astra_vision",
        architecture: "Automated code-parsing platform and browser sandbox with AST tree compilation.",
        bulletPoints: JSON.stringify([
          "Product Architecture: Architected an automated code-parsing platform and browser sandbox that allows developers to safely execute untrusted code while visualizing full-stack repository dependency graphs.",
          "Sandbox Runtime Challenge: Built a self-healing Python execution engine with subprocess isolation and security checkpoints to intercept unauthorized OS file system calls and network socket requests in real time.",
          "Indexing Performance: Integrated Tree-Sitter AST compilers and ChromaDB vector search to parse repository syntax nodes, enabling instant code graph dependency analysis under 200ms."
        ]),
      },
    ],
  });

  await db.virtualExperience.deleteMany({ where: { profileId: ayushi.id } });
  await db.virtualExperience.createMany({
    data: [
      {
        profileId: ayushi.id,
        company: "Commonwealth Bank (CommBank)",
        roleTitle: "Software Engineering Virtual Simulation",
        period: "June 2026",
        problemScope: "Diagnosed and resolved silent data overwrite bugs across high-traffic C#/.NET Core financial API controllers handling MongoDB document updates.",
        actionTaken: "Extended C# Web API controllers with $set atomic operators for partial payload updates and modernized an interactive React/Redux Goal Manager UI component.",
        outcome: "Authored comprehensive automated test suites using xUnit and Moq, covering complex boundary conditions to guarantee high reliability.",
      },
      {
        profileId: ayushi.id,
        company: "Y Combinator (YC Startup - Shiptivity)",
        roleTitle: "Software Engineering Virtual Simulation",
        period: "June 2026",
        problemScope: "Fixed key constraint collisions and slow re-rendering performance on a real-time drag-and-drop Kanban workflow board.",
        actionTaken: "Architected dynamic SQLite priority reordering logic using atomic transactions to update priority ranks sequentially.",
        outcome: "Reduced UI component re-render cycles by 30% and patched OpenSSL compilation bottlenecks in legacy Node.js Webpack configurations.",
      },
      {
        profileId: ayushi.id,
        company: "Walmart USA",
        roleTitle: "Advanced Software Engineering Virtual Simulation",
        period: "May 2026",
        problemScope: "Solved indexing overhead and performance bottlenecks in high-volume retail inventory processing queues.",
        actionTaken: "Implemented a generic K-ary Max Heap structure in Java using fast bitwise shift operators (<<, >>>) and built 3NF database schemas.",
        outcome: "Accelerated queue indexing calculations by 35% and engineered automated Python ETL pipelines using csv and sqlite3.",
      },
    ],
  });

  // 3. Multi-platform Provider Ingestion
  console.log("[Seed] Ingesting multi-platform remote developer postings...");
  const syncResult = await runAllProviders();

  let insertedCount = 0;
  for (const job of syncResult.allJobs) {
    try {
      const urlHash = generateUrlHash(job.canonicalAppUrl || job.discoveryUrl);
      await db.jobPosting.upsert({
        where: { urlHash },
        update: {
          isRemote: true,
          location: job.location,
          rawDescription: job.rawDescription,
          lastSeenAt: new Date(),
        },
        create: {
          urlHash,
          url: job.canonicalAppUrl || job.discoveryUrl,
          platform: job.providerKey as PlatformSource,
          company: job.company,
          title: job.title,
          category: job.category,
          jobType: job.jobType,
          experienceLevel: job.experienceLevel,
          location: job.location,
          isRemote: true,
          remoteScope: job.remoteScope,
          opportunitySignals: JSON.stringify(job.opportunitySignals || []),
          postedAt: job.postedAt,
          rawDescription: job.rawDescription,
          hasFullText: job.hasFullText,
        },
      });
      insertedCount++;
    } catch (err) {
      console.warn("[Seed Error] Failed to upsert job:", (err as Error).message);
    }
  }

  const finalCount = await db.jobPosting.count();
  console.log(`[Seed Complete] Profiles ready (Roushan: ${roushan.id}, Ayushi: ${ayushi.id}). Processed: ${insertedCount}. Active postings in SQLite: ${finalCount}`);
}

main()
  .catch((e) => {
    console.error("Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
