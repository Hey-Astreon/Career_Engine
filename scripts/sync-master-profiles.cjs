// scripts/sync-master-profiles.cjs
const { createClient } = require('@libsql/client');
const { randomUUID } = require('crypto');
require('dotenv').config();

function resolveTursoCredentials() {
  const inputs = [
    process.env.TURSO_DATABASE_URL,
    process.env.TURSO_AUTH_TOKEN,
    process.env.DATABASE_URL
  ].filter(Boolean);

  let url = null;
  let token = null;

  for (const item of inputs) {
    let str = String(item).trim().replace(/^[A-Za-z0-9_]+=\s*/, '').replace(/^['"`]+|['"`]+$/g, '').trim();

    if (!url && !str.startsWith('eyJ') && !/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/.test(str)) {
      const match = str.match(/(?:libsql|https?):\/\/[^\s"'`]+/);
      if (match) {
        let clean = match[0];
        if (clean.startsWith('https://')) clean = 'libsql://' + clean.slice(8);
        if (clean.startsWith('http://')) clean = 'libsql://' + clean.slice(7);
        url = clean;
      } else {
        const tursoMatch = str.match(/[a-zA-Z0-9_.-]+\.turso\.io[^\s"'`]*/);
        if (tursoMatch) url = 'libsql://' + tursoMatch[0];
        else if (str.startsWith('libsql://') || str.startsWith('wss://')) url = str;
      }
    }

    if (!token) {
      const jwtMatch = str.match(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/);
      if (jwtMatch) token = jwtMatch[0];
      else if (!str.includes('.turso.io') && !str.startsWith('libsql://') && !str.startsWith('http')) token = str;
    }
  }

  return { url, token };
}

async function run() {
  const { url, token } = resolveTursoCredentials();
  if (!url || !token) {
    console.error('Missing Turso credentials. Check TURSO_DATABASE_URL and TURSO_AUTH_TOKEN in environment.');
    process.exit(1);
  }

  console.log(`Connecting to Turso: ${url.replace(/:\/\/.*@/, '://***@')}`);
  const client = createClient({ url, authToken: token });

  // 1. Update Roushan Profile
  console.log('Syncing Roushan Kumar profile...');
  await client.execute({
    sql: `UPDATE profiles 
          SET title = ?, fullName = ?, location = ?, streetAddress = ?, apartment = ?, zipCode = ?,
              highestEducation = ?, gender = ?, pronouns = ?, careerStage = ?, workType = ?,
              noticePeriod = ?, willingnessToRelocate = ?
          WHERE slug = ?`,
    args: [
      'Software Developer — Backend & Cloud',
      'ROUSHAN KUMAR',
      'Patna, Bihar, India (Open to Remote)',
      'Indrapuri, North Patel Nagar, Patna, Bihar',
      '',
      '800024',
      'Bachelor of Computer Applications (BCA)',
      'Male',
      'He/Him',
      'student',
      'remote',
      'Immediate',
      1,
      'roushan'
    ]
  });

  const roushanRow = await client.execute({
    sql: `SELECT id FROM profiles WHERE slug = ?`,
    args: ['roushan']
  });

  if (roushanRow.rows.length > 0) {
    const roushanId = roushanRow.rows[0].id;
    // Clean and sync all 3 flagship projects for Roushan
    await client.execute({
      sql: `DELETE FROM projects WHERE profileId = ?`,
      args: [roushanId]
    });

    const roushanProjects = [
      {
        title: "AstreWork — Autonomous Career Engine & Distributed Harvester",
        techStack: "Next.js 16, Python, OCI, Docker, Redis",
        liveDemoUrl: "https://astrework.app",
        githubUrl: "https://github.com/Hey-Astreon/Career_Engine",
        architecture: "Distributed multi-provider job harvesting engine on Oracle Cloud running containerized headless scrapers with Redis caching and Turso LibSQL WAL persistence.",
        bullets: [
          "Creator & Lead Backend Developer: Built and run distributed scrapers on Oracle Cloud (OCI ARM64) that harvest and deduplicate 14,000+ career listings daily across 7 platforms.",
          "Cloud Infrastructure: Deployed multi-stage Docker containers on OCI Ampere ARM64 behind Caddy HTTP/3 and Watchtower CI/CD, holding 99.9% uptime and sub-50ms API latency.",
          "Storage & Caching: Designed the data layer across Turso Cloud LibSQL (SQLite WAL) and Redis 7 LRU cache, cutting repeat query latency by 85%."
        ]
      },
      {
        title: "Astra Vision — AI Code Sandbox & AST Dependency Engine",
        techStack: "FastAPI, Python, Tree-Sitter, ChromaDB",
        liveDemoUrl: "https://astra-frontend-mrfinklbba-uc.a.run.app/",
        githubUrl: "https://github.com/Hey-Astreon/Astra-Vision",
        architecture: "FastAPI microservice backend parsing full-stack dependency graphs via Tree-Sitter AST compilers.",
        bullets: [
          "Backend Service: Built a FastAPI code-analysis backend that parses multi-file repositories into syntax trees and call graphs before running untrusted code.",
          "Sandbox Isolation: Wrote a sandboxed Python subprocess runner with syscall and socket guards to intercept unauthorized file and network access and safely terminate rogue processes.",
          "AST & Vector Indexing: Wired Tree-Sitter AST parsers into ChromaDB vector search to resolve cross-file symbol references in under 200ms."
        ]
      },
      {
        title: "Alyra Lock — Zero-Knowledge Encrypted Password Vault",
        techStack: "TypeScript, Express, MongoDB, Web Crypto",
        liveDemoUrl: "https://alyra-lock.vercel.app/",
        githubUrl: "https://github.com/Hey-Astreon/Zero-Knowledge-Password-Manager",
        architecture: "Client-side zero-knowledge architecture using AES-GCM 256-bit payload encryption.",
        bullets: [
          "Zero-Knowledge API: Built an Express.js and MongoDB sync backend that stores only ciphertext blobs and IVs so plaintext secrets never leave the client.",
          "Cryptographic Core: Implemented AES-GCM (256-bit) encryption and 100,000-iteration PBKDF2-SHA256 key derivation using the browser Web Crypto API.",
          "Auth & Sync Hardening: Added JWT session rotation, strict CORS rules, and atomic document versioning that completes encrypted syncs in under 200ms."
        ]
      }
    ];

    for (const proj of roushanProjects) {
      await client.execute({
        sql: `INSERT INTO projects (id, profileId, title, techStack, liveDemoUrl, githubUrl, architecture, bulletPoints, createdAt)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
        args: [
          randomUUID(),
          roushanId,
          proj.title,
          proj.techStack,
          proj.liveDemoUrl,
          proj.githubUrl,
          proj.architecture,
          JSON.stringify(proj.bullets)
        ]
      });
    }

    // Clean and sync virtual experiences for Roushan
    await client.execute({
      sql: `DELETE FROM virtual_experiences WHERE profileId = ?`,
      args: [roushanId]
    });

    const roushanSimulations = [
      {
        company: "Commonwealth Bank (CommBank)",
        roleTitle: "Software Development Virtual Simulation",
        period: "June 2026",
        problemScope: "Diagnosed and resolved silent data-overwrite bugs across high-traffic C#/.NET Core financial API controllers backed by MongoDB.",
        actionTaken: "Refactored C# Web API endpoints with $set atomic operators for partial document updates and patched concurrency race conditions.",
        outcome: "Authored backend unit test suites using xUnit and Moq covering boundary conditions to guarantee transactional consistency.",
      },
      {
        company: "Y Combinator (YC Startup - Shiptivity)",
        roleTitle: "Software Development Virtual Simulation",
        period: "June 2026",
        problemScope: "Fixed priority-key collisions and transaction rollbacks during high-frequency task reordering in an embedded SQLite database.",
        actionTaken: "Architected SQLite sequential priority re-indexing using atomic transaction blocks and patched OpenSSL compilation bottlenecks.",
        outcome: "Reduced database write lock contention by 40% and improved Node.js build pipeline stability across legacy environments.",
      },
      {
        company: "Walmart USA",
        roleTitle: "Advanced Software Development Virtual Simulation",
        period: "May 2026",
        problemScope: "Solved indexing overhead and latency spikes in high-volume retail inventory processing queues fed by disparate data sources.",
        actionTaken: "Implemented a generic K-ary Max Heap in Java using bitwise shift operators (<<, >>>) for rapid O(log n) priority retrieval.",
        outcome: "Accelerated priority queue indexing by 35% and built automated Python ETL scripts (csv, sqlite3) for batch database loading.",
      },
    ];

    for (const sim of roushanSimulations) {
      await client.execute({
        sql: `INSERT INTO virtual_experiences (id, profileId, company, roleTitle, period, problemScope, actionTaken, outcome, createdAt)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
        args: [
          randomUUID(),
          roushanId,
          sim.company,
          sim.roleTitle,
          sim.period,
          sim.problemScope,
          sim.actionTaken,
          sim.outcome
        ]
      });
    }

    console.log('✅ Roushan Kumar profile, 3 differentiated projects, and 3 simulations synced in Turso Cloud.');
  }

  // 2. Update Ayushi Profile
  console.log('Syncing Ayushi Raj profile...');
  await client.execute({
    sql: `UPDATE profiles 
          SET title = ?, fullName = ?, location = ?, streetAddress = ?, apartment = ?, zipCode = ?,
              highestEducation = ?, gender = ?, pronouns = ?, careerStage = ?, workType = ?,
              noticePeriod = ?, willingnessToRelocate = ?, requiresVisa = ?
          WHERE slug = ?`,
    args: [
      'Software Developer — Full-Stack & AI',
      'AYUSHI RAJ',
      'Bihar, India (Open to Remote)',
      'Mirzapur, Nawada, Bihar',
      '',
      '805110',
      'Bachelor of Computer Applications (BCA)',
      'Female',
      'She/Her',
      'student',
      'remote',
      'Immediate',
      1,
      0,
      'ayushi'
    ]
  });

  const ayushiRow = await client.execute({
    sql: `SELECT id FROM profiles WHERE slug = ?`,
    args: ['ayushi']
  });

  if (ayushiRow.rows.length > 0) {
    const ayushiId = ayushiRow.rows[0].id;
    // Clean and sync all 3 flagship projects for Ayushi
    await client.execute({
      sql: `DELETE FROM projects WHERE profileId = ?`,
      args: [ayushiId]
    });

    const ayushiProjects = [
      {
        title: "AstreWork — AI Career Platform & AstrePilot Extension",
        techStack: "Next.js 16, React 19, Chrome MV3, Gemini API",
        liveDemoUrl: "https://astrework.app",
        githubUrl: "https://github.com/Silenttears-cloud/Career_Engine",
        architecture: "Intelligent candidate matching engine and AstrePilot Chrome Extension (MV3) with isolated Shadow DOM HUD and HMAC-SHA256 authorization.",
        bullets: [
          "Co-Developer & Lead Frontend Architect: Built AstreWork's client-side ATS match engine and Gemini-powered scoring studio in Next.js 16, grading live job posts in under a second.",
          "AstrePilot Chrome Extension (MV3): Created an isolated Shadow-DOM HUD with HMAC-SHA256 token auth that autofills Greenhouse, Lever, and Ashby forms in ~15 seconds.",
          "Workspace & Print Engine: Built the React 19 and Zustand workspace with live resume-audit checks and a single-page A4 print layout with zero layout shift."
        ]
      },
      {
        title: "Astra Vision — Interactive Code Sandbox & AST Visualizer",
        techStack: "React, Monaco, FastAPI, ChromaDB",
        liveDemoUrl: "https://astra-frontend-mrfinklbba-uc.a.run.app/",
        githubUrl: "https://github.com/Silenttears-cloud/Astra_vision",
        architecture: "Browser-based code analysis studio pairing Monaco Editor with interactive dependency-graph canvas.",
        bullets: [
          "In-Browser IDE: Built a browser-based code analysis studio pairing Monaco Editor with an interactive dependency-graph canvas for multi-file repos.",
          "Live AST Inspection: Connected streaming FastAPI and Tree-Sitter endpoints to highlight syntax nodes, call paths, and sandbox output in under 200ms.",
          "Semantic Code Search: Created a natural-language repository search UI backed by ChromaDB vector embeddings and isolated execution previews."
        ]
      },
      {
        title: "Alyra Lock — Client-Side Zero-Knowledge Password Vault",
        techStack: "React, TypeScript, Web Crypto, Express",
        liveDemoUrl: "https://alyra-lock.vercel.app/",
        githubUrl: "https://github.com/Silenttears-cloud/Zero-knowledge-password-manager-",
        architecture: "Zero-knowledge security vault with AES-GCM 256-bit payload encryption and client-side isolation.",
        bullets: [
          "Client-Side Vault UI: Built a zero-knowledge React password manager that derives master keys strictly in browser memory so raw credentials never hit the server.",
          "Memory-Safe Crypto State: Wired Web Crypto API (AES-GCM 256-bit, 100,000-iteration PBKDF2) into ephemeral React state that wipes decrypted keys on idle lock.",
          "Fast Encrypted Sync: Shipped instant client-side vault search, password strength checks, and JWT-authenticated Express sync completing in under 200ms."
        ]
      }
    ];

    for (const proj of ayushiProjects) {
      await client.execute({
        sql: `INSERT INTO projects (id, profileId, title, techStack, liveDemoUrl, githubUrl, architecture, bulletPoints, createdAt)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
        args: [
          randomUUID(),
          ayushiId,
          proj.title,
          proj.techStack,
          proj.liveDemoUrl,
          proj.githubUrl,
          proj.architecture,
          JSON.stringify(proj.bullets)
        ]
      });
    }

    // Clean and sync virtual experiences for Ayushi
    await client.execute({
      sql: `DELETE FROM virtual_experiences WHERE profileId = ?`,
      args: [ayushiId]
    });

    const ayushiSimulations = [
      {
        company: "Commonwealth Bank (CommBank)",
        roleTitle: "Software Development Virtual Simulation",
        period: "June 2026",
        problemScope: "Resolved UI state desynchronization and unvalidated input payloads on the CommBank Goal Manager dashboard.",
        actionTaken: "Modernized the React/Redux Goal Manager UI with debounced form handlers and strict client-side financial validation schemas.",
        outcome: "Built automated component integration tests covering state resets, ensuring 0% layout shift across mobile and desktop viewports.",
      },
      {
        company: "Y Combinator (YC Startup - Shiptivity)",
        roleTitle: "Software Development Virtual Simulation",
        period: "June 2026",
        problemScope: "Fixed dropped drag events, key-constraint warnings, and sluggish re-rendering on a real-time Kanban workflow board.",
        actionTaken: "Integrated Dragula drag-and-drop state hooks in React and memoized card components to eliminate redundant rendering cycles.",
        outcome: "Cut UI component re-render overhead by 30%, ensuring smooth 60 FPS card dragging across 500+ active task items.",
      },
      {
        company: "Walmart USA",
        roleTitle: "Advanced Software Development Virtual Simulation",
        period: "May 2026",
        problemScope: "Solved data entry bottlenecks and inconsistent record structures caused by unnormalized retail inventory spreadsheets.",
        actionTaken: "Designed a normalized 3NF relational schema in SQLite and built automated Python validation scripts to clean corrupted CSV feeds.",
        outcome: "Eliminated 100% of duplicate inventory SKUs and structured raw retail records into query-ready database tables.",
      },
    ];

    for (const sim of ayushiSimulations) {
      await client.execute({
        sql: `INSERT INTO virtual_experiences (id, profileId, company, roleTitle, period, problemScope, actionTaken, outcome, createdAt)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
        args: [
          randomUUID(),
          ayushiId,
          sim.company,
          sim.roleTitle,
          sim.period,
          sim.problemScope,
          sim.actionTaken,
          sim.outcome
        ]
      });
    }

    console.log('✅ Ayushi Raj profile, 3 differentiated projects, and 3 simulations synced in Turso Cloud.');
  }

  // Verification count
  const pCount = await client.execute(`SELECT count(*) as count FROM projects`);
  const sCount = await client.execute(`SELECT count(*) as count FROM virtual_experiences`);
  console.log(`🎉 Master Profile Sync Verified! Total project rows: ${pCount.rows[0].count}, Total virtual experience rows: ${sCount.rows[0].count}`);
}

run().catch((err) => {
  console.error('Error during profile sync:', err);
  process.exit(1);
});
