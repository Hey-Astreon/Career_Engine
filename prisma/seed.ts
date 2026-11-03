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
          "Creator & Lead Backend Developer: Built and run distributed scrapers on Oracle Cloud (OCI ARM64) that collect and deduplicate 14,000+ remote jobs daily across 7 platforms.",
          "Cloud Infrastructure: Deployed multi-stage Docker containers on OCI Ampere ARM64 behind Caddy HTTP/3 and Watchtower CI/CD, holding 99.9% uptime and sub-50ms API latency.",
          "Storage & Caching: Designed the data layer across Turso Cloud LibSQL (SQLite WAL) and Redis 7 LRU cache, cutting repeat query latency by 85%."
        ]),
      },
      {
        profileId: roushan.id,
        title: "Astra Vision — AI Code Sandbox & AST Dependency Engine",
        techStack: "FastAPI, Python, Tree-Sitter, ChromaDB",
        liveDemoUrl: "https://astra-frontend-mrfinklbba-uc.a.run.app/",
        githubUrl: "https://github.com/Hey-Astreon/Astra-Vision",
        architecture: "FastAPI microservice backend parsing full-stack dependency graphs via Tree-Sitter AST compilers.",
        bulletPoints: JSON.stringify([
          "Backend Service: Built a FastAPI code-analysis backend that parses multi-file repositories into syntax trees and call graphs before running untrusted code.",
          "Sandbox Isolation: Wrote a self-healing Python subprocess runner with syscall and socket guards to block unauthorized file and network access at runtime.",
          "AST & Vector Indexing: Wired Tree-Sitter AST parsers into ChromaDB vector search to resolve cross-file symbol references in under 200ms."
        ]),
      },
      {
        profileId: roushan.id,
        title: "Alyra Lock — Zero-Knowledge Encrypted Password Vault",
        techStack: "TypeScript, Express, MongoDB, Web Crypto",
        liveDemoUrl: "https://alyra-lock.vercel.app/",
        githubUrl: "https://github.com/Hey-Astreon/Zero-Knowledge-Password-Manager",
        architecture: "Client-side zero-knowledge architecture using AES-GCM 256-bit payload encryption.",
        bulletPoints: JSON.stringify([
          "Zero-Knowledge API: Built an Express.js and MongoDB sync backend that stores only ciphertext blobs and IVs so plaintext secrets never leave the client.",
          "Cryptographic Core: Implemented AES-GCM (256-bit) encryption and 100,000-iteration PBKDF2-SHA256 key derivation using the browser Web Crypto API.",
          "Auth & Sync Hardening: Added JWT session rotation, strict CORS rules, and atomic vault replication that finishes encrypted syncs in under 200ms."
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
          "Co-Developer & Lead Frontend Architect: Built AstreWork's client-side ATS match engine and Gemini-powered scoring studio in Next.js 16, grading live job posts in under a second.",
          "AstrePilot Chrome Extension (MV3): Created an isolated Shadow-DOM HUD with HMAC-SHA256 token auth that autofills Greenhouse, Lever, and Ashby forms in ~15 seconds.",
          "Workspace & Print Engine: Built the React 19 and Zustand workspace with live resume-audit checks and a single-page A4 print layout with zero layout shift."
        ]),
      },
      {
        profileId: ayushi.id,
        title: "Astra Vision — Interactive Code Sandbox & AST Visualizer",
        techStack: "React, Monaco, FastAPI, ChromaDB",
        liveDemoUrl: "https://astra-frontend-mrfinklbba-uc.a.run.app/",
        githubUrl: "https://github.com/Silenttears-cloud/Astra_vision",
        architecture: "Browser-based code analysis studio pairing Monaco Editor with interactive dependency-graph canvas.",
        bulletPoints: JSON.stringify([
          "In-Browser IDE: Built a browser-based code analysis studio pairing Monaco Editor with an interactive dependency-graph canvas for multi-file repos.",
          "Live AST Inspection: Connected streaming FastAPI and Tree-Sitter endpoints to highlight syntax nodes, call paths, and sandbox output in under 200ms.",
          "Semantic Code Search: Created a natural-language repository search UI backed by ChromaDB vector embeddings and isolated execution previews."
        ]),
      },
      {
        profileId: ayushi.id,
        title: "Alyra Lock — Client-Side Zero-Knowledge Password Vault",
        techStack: "React, TypeScript, Web Crypto, Express",
        liveDemoUrl: "https://alyra-lock.vercel.app/",
        githubUrl: "https://github.com/Silenttears-cloud/Zero-knowledge-password-manager-",
        architecture: "Zero-knowledge security vault with AES-GCM 256-bit payload encryption and client-side isolation.",
        bulletPoints: JSON.stringify([
          "Client-Side Vault UI: Built a zero-knowledge React password manager that derives master keys strictly in browser memory so raw credentials never hit the server.",
          "Memory-Safe Crypto State: Wired Web Crypto API (AES-GCM 256-bit, 100,000-iteration PBKDF2) into ephemeral React state that wipes decrypted keys on idle lock.",
          "Fast Encrypted Sync: Shipped instant client-side vault search, password strength checks, and JWT-authenticated Express sync completing in under 200ms."
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
