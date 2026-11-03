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
      title: "Software Developer — Backend & Cloud",
      email: "roushanraut404@gmail.com",
      phone: "+91-9431483512",
      location: "Patna, Bihar, India (Open to Remote)",
      portfolioUrl: "https://astreon.me",
      githubUrl: "https://github.com/Hey-Astreon",
      linkedinUrl: "https://linkedin.com/in/astreon4547",
      masterResumePath: "/candidates/3_Roushan_Kumar/Roushan_Kumar_Resume.pdf",
    },
    create: {
      slug: "roushan",
      fullName: "ROUSHAN KUMAR",
      title: "Software Developer — Backend & Cloud",
      email: "roushanraut404@gmail.com",
      phone: "+91-9431483512",
      location: "Patna, Bihar, India (Open to Remote)",
      portfolioUrl: "https://astreon.me",
      githubUrl: "https://github.com/Hey-Astreon",
      linkedinUrl: "https://linkedin.com/in/astreon4547",
      masterResumePath: "/candidates/3_Roushan_Kumar/Roushan_Kumar_Resume.pdf",
    },

  });

  await db.project.deleteMany({ where: { profileId: roushan.id } });
  await db.project.createMany({
    data: [
      {
        profileId: roushan.id,
        title: "AstreWork — Autonomous Career Engine & Distributed Harvester",
        techStack: "Next.js 16, Python, OCI, Docker, Redis",
        liveDemoUrl: "https://astrework.app",
        githubUrl: "https://github.com/Hey-Astreon/Career_Engine",
        architecture: "Distributed multi-provider job harvesting engine on Oracle Cloud running containerized headless scrapers with Redis caching and Turso LibSQL WAL persistence.",
        bulletPoints: JSON.stringify([
          "Creator & Lead Backend Developer: Engineered distributed scrapers on Oracle Cloud (OCI ARM64) aggregating 14,000+ remote opportunities daily across 7 platforms with 0% duplication.",
          "Cloud Infrastructure: Deployed multi-stage Docker containers on OCI Ampere ARM64 with Watchtower CI/CD and Caddy HTTP/3 reverse proxy, maintaining 99.9% uptime and sub-50ms API latency.",
          "Distributed Persistence: Architected data storage across Turso Cloud LibSQL (SQLite WAL) and Redis 7 LRU caching, cutting repeated query latency by 85%."
        ]),
      },
      {
        profileId: roushan.id,
        title: "Astra Vision — AI Sandbox & Code Graph Parser",
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
        title: "Alyra Lock — Zero-Knowledge Password Vault",
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
        roleTitle: "Software Development Virtual Simulation",
        period: "June 2026",
        problemScope: "Diagnosed and resolved silent data overwrite bugs across high-traffic C#/.NET Core financial API controllers handling MongoDB document updates.",
        actionTaken: "Extended C# Web API controllers with $set atomic operators for partial payload updates and modernized an interactive React/Redux Goal Manager UI component.",
        outcome: "Authored comprehensive automated test suites using xUnit and Moq, covering complex boundary conditions to guarantee high reliability.",
      },
      {
        profileId: roushan.id,
        company: "Y Combinator (YC Startup - Shiptivity)",
        roleTitle: "Software Development Virtual Simulation",
        period: "June 2026",
        problemScope: "Fixed key constraint collisions and slow re-rendering performance on a real-time drag-and-drop Kanban workflow board.",
        actionTaken: "Architected SQLite priority reordering logic using atomic transactions to update priority ranks sequentially.",
        outcome: "Reduced UI component re-render cycles by 30% and patched OpenSSL compilation bottlenecks in legacy Node.js Webpack configurations.",
      },
      {
        profileId: roushan.id,
        company: "Walmart USA",
        roleTitle: "Advanced Software Development Virtual Simulation",
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
      title: "Software Developer — Full-Stack & AI",
      email: "ayushi29507@gmail.com",
      phone: "+91-8709852305",
      location: "Bihar, India (Open to Remote)",
      portfolioUrl: "https://ayushiraj.me",
      githubUrl: "https://github.com/Silenttears-cloud",
      linkedinUrl: "https://www.linkedin.com/in/alrya404/",
      masterResumePath: "/candidates/2_Ayushi_Raj/Ayushi_Raj_Resume.pdf",
    },
    create: {
      slug: "ayushi",
      fullName: "AYUSHI RAJ",
      title: "Software Developer — Full-Stack & AI",
      email: "ayushi29507@gmail.com",
      phone: "+91-8709852305",
      location: "Bihar, India (Open to Remote)",
      portfolioUrl: "https://ayushiraj.me",
      githubUrl: "https://github.com/Silenttears-cloud",
      linkedinUrl: "https://www.linkedin.com/in/alrya404/",
      masterResumePath: "/candidates/2_Ayushi_Raj/Ayushi_Raj_Resume.pdf",
    },

  });

  await db.project.deleteMany({ where: { profileId: ayushi.id } });
  await db.project.createMany({
    data: [
      {
        profileId: ayushi.id,
        title: "AstreWork — AI Career Platform & AstrePilot Extension",
        techStack: "Next.js 16, React 19, Chrome MV3, Gemini API",
        liveDemoUrl: "https://astrework.app",
        githubUrl: "https://github.com/Silenttears-cloud/Career_Engine",
        architecture: "Intelligent candidate matching engine and AstrePilot Chrome Extension (MV3) with isolated Shadow DOM HUD and HMAC-SHA256 authorization.",
        bulletPoints: JSON.stringify([
          "Co-Developer & Lead Frontend Architect: Engineered the client-side ATS match engine and Gemini-powered scoring studio on Next.js 16, evaluating live postings in under a second.",
          "AstrePilot Chrome Extension (MV3): Built an isolated Shadow-DOM HUD with HMAC-SHA256 token auth that autofills Greenhouse, Lever, and Ashby applications in ~15 seconds.",
          "Reactive UI Architecture: Engineered a responsive React 19 and Next.js 16 workspace with Zustand state management, live ATS audit checklists, and print-perfect A4 rendering."
        ]),
      },
      {
        profileId: ayushi.id,
        title: "Alyra Lock — Zero-Knowledge Password Vault",
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
        title: "Astra Vision — AI Sandbox & Code Parsing Platform",
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
        roleTitle: "Software Development Virtual Simulation",
        period: "June 2026",
        problemScope: "Diagnosed and resolved silent data overwrite bugs across high-traffic C#/.NET Core financial API controllers handling MongoDB document updates.",
        actionTaken: "Extended C# Web API controllers with $set atomic operators for partial payload updates and modernized an interactive React/Redux Goal Manager UI component.",
        outcome: "Authored comprehensive automated test suites using xUnit and Moq, covering complex boundary conditions to guarantee high reliability.",
      },
      {
        profileId: ayushi.id,
        company: "Y Combinator (YC Startup - Shiptivity)",
        roleTitle: "Software Development Virtual Simulation",
        period: "June 2026",
        problemScope: "Fixed key constraint collisions and slow re-rendering performance on a real-time drag-and-drop Kanban workflow board.",
        actionTaken: "Architected SQLite priority reordering logic using atomic transactions to update priority ranks sequentially.",
        outcome: "Reduced UI component re-render cycles by 30% and patched OpenSSL compilation bottlenecks in legacy Node.js Webpack configurations.",
      },
      {
        profileId: ayushi.id,
        company: "Walmart USA",
        roleTitle: "Advanced Software Development Virtual Simulation",
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
