import { chromium } from "playwright";
import path from "path";
import fs from "fs";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");

// ============================================================================
// BASE TEMPLATE BUILDER (Single-Page A4 297mm Strict Geometry + 4-Tier Rhythm)
// ============================================================================
function buildResumeHtml({
  name,
  headline,
  contactHtml,
  summaryHtml,
  skills,
  projects,
  simulations,
  educationHtml,
}) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${name} - Resume</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    @page {
      size: A4 portrait;
      margin: 0;
    }
    html, body {
      width: 210mm;
      height: 297mm;
      max-height: 297mm;
      background: #ffffff;
      color: #111827;
      font-family: 'Inter', Arial, Helvetica, sans-serif;
      font-size: 8.5pt;
      line-height: 1.34;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      overflow: hidden;
    }
    .sheet {
      width: 210mm;
      height: 297mm;
      max-height: 297mm;
      padding: 7.5mm 9.0mm 6.5mm;
      display: flex;
      flex-direction: column;
      justify-content: flex-start;
      overflow: hidden;
    }
    .header {
      text-align: center;
      margin-bottom: 1.5pt;
    }
    h1 {
      font-size: 17.0pt;
      font-weight: 800;
      letter-spacing: -0.02em;
      color: #0f172a;
      text-transform: uppercase;
      line-height: 1.08;
    }
    .headline {
      font-size: 9.5pt;
      font-weight: 700;
      color: #1e293b;
      margin-top: 1.5pt;
      line-height: 1.25;
    }
    .contact {
      font-size: 8.3pt;
      font-weight: 500;
      color: #334155;
      margin-top: 1.5pt;
      line-height: 1.25;
    }
    a {
      color: #0f172a;
      text-decoration: none !important;
      font-weight: 600;
    }
    hr {
      border: 0;
      border-top: 0.75pt solid #cbd5e1;
      margin: 3.2pt 0 2.2pt;
    }
    h2 {
      font-size: 9.6pt;
      font-weight: 800;
      letter-spacing: 0.04em;
      color: #0f172a;
      text-transform: uppercase;
      line-height: 1.2;
      margin-bottom: 1.6pt;
    }
    .summary {
      font-size: 8.5pt;
      line-height: 1.32;
      color: #1e293b;
      text-align: left;
    }
    .skill-row {
      display: flex;
      align-items: flex-start;
      font-size: 8.5pt;
      line-height: 1.28;
      color: #1e293b;
      margin-bottom: 1.6pt;
    }
    .skill-bullet {
      width: 9pt;
      flex-shrink: 0;
      font-weight: 700;
      color: #0f172a;
    }
    .skill-text {
      flex: 1;
    }
    .item-block {
      margin-top: 3.6pt;
    }
    .item-block:first-of-type {
      margin-top: 1.0pt;
    }
    .item-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: 6pt;
      margin-bottom: 1.0pt;
    }
    h3 {
      font-size: 9.0pt;
      font-weight: 700;
      color: #0f172a;
      line-height: 1.2;
    }
    .tech-stack {
      font-weight: 600;
      color: #334155;
    }
    .item-links, .item-date {
      font-size: 8.2pt;
      color: #0f172a;
      white-space: nowrap;
      flex-shrink: 0;
      font-weight: 600;
    }
    .item-date {
      color: #475569;
    }
    ul {
      margin: 0.8pt 0 0;
      padding-left: 11.5pt;
      list-style-type: disc;
    }
    li {
      font-size: 8.5pt;
      line-height: 1.29;
      color: #1e293b;
      margin-bottom: 1.5pt;
    }
    li:last-child {
      margin-bottom: 0;
    }
    b, strong {
      font-weight: 700;
      color: #0f172a;
    }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="header">
      <h1>${name}</h1>
      <div class="headline">${headline}</div>
      <div class="contact">${contactHtml}</div>
    </div>

    <hr />

    <div>
      <h2>PROFESSIONAL SUMMARY</h2>
      <div class="summary">${summaryHtml}</div>
    </div>

    <hr />

    <div>
      <h2>TECHNICAL SKILLS</h2>
      <div>
        ${skills
          .map(
            ([cat, val]) => `
        <div class="skill-row">
          <span class="skill-bullet">•</span>
          <div class="skill-text"><b>${cat}:</b> ${val}</div>
        </div>`
          )
          .join("")}
      </div>
    </div>

    <hr />

    <div>
      <h2>TECHNICAL PROJECTS</h2>
      <div>
        ${projects
          .map(
            (p) => `
        <div class="item-block">
          <div class="item-header">
            <h3><b>${p.title}</b>${p.techStack ? ` <span class="tech-stack">(${p.techStack})</span>` : ""}</h3>
            <span class="item-links">${p.linksHtml}</span>
          </div>
          <ul>
            ${p.bullets.map((b) => `<li>${b}</li>`).join("")}
          </ul>
        </div>`
          )
          .join("")}
      </div>
    </div>

    <hr />

    <div>
      <h2>TECHNICAL SIMULATIONS & VIRTUAL EXPERIENCES</h2>
      <div>
        ${simulations
          .map(
            (s) => `
        <div class="item-block">
          <div class="item-header">
            <h3><b>${s.title}</b></h3>
            <span class="item-date">${s.date}</span>
          </div>
          <ul>
            ${s.bullets.map((b) => `<li>${b}</li>`).join("")}
          </ul>
        </div>`
          )
          .join("")}
      </div>
    </div>

    <hr />

    <div class="education-section">
      <h2>EDUCATION</h2>
      ${educationHtml}
    </div>
  </div>
</body>
</html>`;
}

// ============================================================================
// DIFFERENTIATED SIMULATIONS & EDUCATION
// ============================================================================
const ROUSHAN_SIMULATIONS = [
  {
    title: "Commonwealth Bank (CommBank) — Software Development Virtual Simulation",
    date: "June 2026",
    bullets: [
      `<b>Problem & Scope:</b> Diagnosed and resolved silent data-overwrite bugs across high-traffic C#/.NET Core financial API controllers backed by MongoDB.`,
      `<b>Action Taken:</b> Refactored C# Web API endpoints with $set atomic operators for partial document updates and patched concurrency race conditions.`,
      `<b>Engineering Outcome:</b> Authored backend unit test suites using xUnit and Moq covering boundary conditions to guarantee transactional consistency.`,
    ],
  },
  {
    title: "Y Combinator (YC Startup - Shiptivity) — Software Development Virtual Simulation",
    date: "June 2026",
    bullets: [
      `<b>Problem & Scope:</b> Fixed priority-key collisions and transaction rollbacks during high-frequency task reordering in an embedded SQLite database.`,
      `<b>Action Taken:</b> Architected SQLite sequential priority re-indexing using atomic transaction blocks and patched OpenSSL compilation bottlenecks.`,
      `<b>Engineering Outcome:</b> Reduced database write lock contention by 40% and improved Node.js build pipeline stability across legacy environments.`,
    ],
  },
  {
    title: "Walmart USA — Advanced Software Development Virtual Simulation",
    date: "May 2026",
    bullets: [
      `<b>Problem & Scope:</b> Solved indexing overhead and latency spikes in high-volume retail inventory processing queues fed by disparate data sources.`,
      `<b>Action Taken:</b> Implemented a generic K-ary Max Heap in Java using bitwise shift operators (&lt;&lt;, &gt;&gt;&gt;) for rapid O(log n) priority retrieval.`,
      `<b>Engineering Outcome:</b> Accelerated priority queue indexing by 35% and built automated Python ETL scripts (csv, sqlite3) for batch database loading.`,
    ],
  },
];

const AYUSHI_SIMULATIONS = [
  {
    title: "Commonwealth Bank (CommBank) — Software Development Virtual Simulation",
    date: "June 2026",
    bullets: [
      `<b>Problem & Scope:</b> Resolved UI state desynchronization and unvalidated input payloads on the CommBank Goal Manager dashboard.`,
      `<b>Action Taken:</b> Modernized the React/Redux Goal Manager UI with debounced form handlers and strict client-side financial validation schemas.`,
      `<b>Engineering Outcome:</b> Built automated component integration tests covering state resets, ensuring 0% layout shift across mobile and desktop viewports.`,
    ],
  },
  {
    title: "Y Combinator (YC Startup - Shiptivity) — Software Development Virtual Simulation",
    date: "June 2026",
    bullets: [
      `<b>Problem & Scope:</b> Fixed dropped drag events, key-constraint warnings, and sluggish re-rendering on a real-time Kanban workflow board.`,
      `<b>Action Taken:</b> Integrated Dragula drag-and-drop state hooks in React and memoized card components to eliminate redundant rendering cycles.`,
      `<b>Engineering Outcome:</b> Cut UI component re-render overhead by 30%, ensuring smooth 60 FPS card dragging across 500+ active task items.`,
    ],
  },
  {
    title: "Walmart USA — Advanced Software Development Virtual Simulation",
    date: "May 2026",
    bullets: [
      `<b>Problem & Scope:</b> Solved data entry bottlenecks and inconsistent record structures caused by unnormalized retail inventory spreadsheets.`,
      `<b>Action Taken:</b> Designed a normalized 3NF relational schema in SQLite and built automated Python validation scripts to clean corrupted CSV feeds.`,
      `<b>Engineering Outcome:</b> Eliminated 100% of duplicate inventory SKUs and structured raw retail records into query-ready database tables.`,
    ],
  },
];

const SHARED_EDUCATION_HTML = `
  <div class="item-block">
    <div class="item-header">
      <h3><b>Bachelor of Computer Applications (BCA)</b> — Amity University Noida</h3>
      <span class="item-date">2025 – 2028</span>
    </div>
    <ul>
      <li><b>Relevant Coursework:</b> Data Structures & Algorithms (DSA) • Database Management Systems (DBMS) • Operating Systems (OS) • Computer Networks • Object-Oriented Programming (OOP)</li>
    </ul>
  </div>
`;

// ============================================================================
// 1. ROUSHAN KUMAR — CANONICAL MASTER RESUME
// ============================================================================
const ROUSHAN_CONTACT = `Patna, Bihar, India (Open to Remote) | +91-9431483512 | <a href="mailto:roushanraut404@gmail.com">roushanraut404@gmail.com</a> | <a href="https://astreon.me">astreon.me</a> | <a href="https://github.com/Hey-Astreon">github.com/Hey-Astreon</a> | <a href="https://linkedin.com/in/astreon4547">linkedin.com/in/astreon4547</a>`;

const ROUSHAN_PROJECTS = [
  {
    title: "AstreWork — Autonomous Career Engine & Distributed Harvester",
    techStack: "Next.js 16, Python, OCI, Docker, Redis",
    linksHtml: `<a href="https://astrework.app">Live Demo</a> | <a href="https://github.com/Hey-Astreon/Career_Engine">GitHub</a>`,
    bullets: [
      `<b>Creator & Lead Backend Developer:</b> Built and run distributed scrapers on Oracle Cloud (OCI ARM64) that harvest and deduplicate 14,000+ career listings daily across 7 platforms.`,
      `<b>Cloud Infrastructure:</b> Deployed multi-stage Docker containers on OCI Ampere ARM64 behind Caddy HTTP/3 and Watchtower CI/CD, holding 99.9% uptime and sub-50ms API latency.`,
      `<b>Storage & Caching:</b> Designed the data layer across Turso Cloud LibSQL (SQLite WAL) and Redis 7 LRU cache, cutting repeat query latency by 85%.`,
    ],
  },
  {
    title: "Astra Vision — AI Code Sandbox & AST Dependency Engine",
    techStack: "FastAPI, Python, Tree-Sitter, ChromaDB",
    linksHtml: `<a href="https://astra-frontend-mrfinklbba-uc.a.run.app/">Live Demo</a> | <a href="https://github.com/Hey-Astreon/Astra-Vision">GitHub</a>`,
    bullets: [
      `<b>Backend Service:</b> Built a FastAPI code-analysis backend that parses multi-file repositories into syntax trees and call graphs before running untrusted code.`,
      `<b>Sandbox Isolation:</b> Wrote a sandboxed Python subprocess runner with syscall and socket guards to intercept unauthorized file and network access and safely terminate rogue processes.`,
      `<b>AST & Vector Indexing:</b> Wired Tree-Sitter AST parsers into ChromaDB vector search to resolve cross-file symbol references in under 200ms.`,
    ],
  },
  {
    title: "Alyra Lock — Zero-Knowledge Encrypted Password Vault",
    techStack: "TypeScript, Express, MongoDB, Web Crypto",
    linksHtml: `<a href="https://alyra-lock.vercel.app/">Live Demo</a> | <a href="https://github.com/Hey-Astreon/Zero-Knowledge-Password-Manager">GitHub</a>`,
    bullets: [
      `<b>Zero-Knowledge API:</b> Built an Express.js and MongoDB sync backend that stores only ciphertext blobs and IVs so plaintext secrets never leave the client.`,
      `<b>Cryptographic Core:</b> Implemented AES-GCM (256-bit) encryption and 100,000-iteration PBKDF2-SHA256 key derivation using the browser Web Crypto API.`,
      `<b>Auth & Sync Hardening:</b> Added JWT session rotation, strict CORS rules, and atomic document versioning that completes encrypted syncs in under 200ms.`,
    ],
  },
];

const AYUSHI_CONTACT = `Bihar, India (Open to Remote) | +91-8709852305 | <a href="mailto:ayushi29507@gmail.com">ayushi29507@gmail.com</a> | <a href="https://ayushiraj.me">ayushiraj.me</a> | <a href="https://github.com/Silenttears-cloud">github.com/Silenttears-cloud</a> | <a href="https://www.linkedin.com/in/alrya404/">linkedin.com/in/alrya404</a>`;

const AYUSHI_PROJECTS = [
  {
    title: "AstreWork — AI Career Platform & AstrePilot Extension",
    techStack: "Next.js 16, React 19, Chrome MV3, Gemini API",
    linksHtml: `<a href="https://astrework.app">Live Demo</a> | <a href="https://github.com/Silenttears-cloud/Career_Engine">GitHub</a>`,
    bullets: [
      `<b>Co-Developer & Lead Frontend Architect:</b> Built AstreWork's client-side ATS match engine and Gemini-powered scoring studio in Next.js 16, grading live job posts in under a second.`,
      `<b>AstrePilot Chrome Extension (MV3):</b> Created an isolated Shadow-DOM HUD with HMAC-SHA256 token auth that autofills Greenhouse, Lever, and Ashby forms in ~15 seconds.`,
      `<b>Workspace & Print Engine:</b> Built the React 19 and Zustand workspace with live resume-audit checks and a single-page A4 print layout with zero layout shift.`,
    ],
  },
  {
    title: "Astra Vision — Interactive Code Sandbox & AST Visualizer",
    techStack: "React, Monaco, FastAPI, ChromaDB",
    linksHtml: `<a href="https://astra-frontend-mrfinklbba-uc.a.run.app/">Live Demo</a> | <a href="https://github.com/Silenttears-cloud/Astra_vision">GitHub</a>`,
    bullets: [
      `<b>In-Browser IDE:</b> Built a browser-based code analysis studio pairing Monaco Editor with an interactive dependency-graph canvas for multi-file repos.`,
      `<b>Live AST Inspection:</b> Connected streaming FastAPI and Tree-Sitter endpoints to highlight syntax nodes, call paths, and sandbox output in under 200ms.`,
      `<b>Semantic Code Search:</b> Created a natural-language repository search UI backed by ChromaDB vector embeddings and isolated execution previews.`,
    ],
  },
  {
    title: "Alyra Lock — Client-Side Zero-Knowledge Password Vault",
    techStack: "React, TypeScript, Web Crypto, Express",
    linksHtml: `<a href="https://alyra-lock.vercel.app/">Live Demo</a> | <a href="https://github.com/Silenttears-cloud/Zero-knowledge-password-manager-">GitHub</a>`,
    bullets: [
      `<b>Client-Side Vault UI:</b> Built a zero-knowledge React password manager that derives master keys strictly in browser memory so raw credentials never hit the server.`,
      `<b>Memory-Safe Crypto State:</b> Wired Web Crypto API (AES-GCM 256-bit, 100,000-iteration PBKDF2) into ephemeral React state that wipes decrypted keys on idle lock.`,
      `<b>Fast Encrypted Sync:</b> Shipped instant client-side vault search, password strength checks, and JWT-authenticated Express sync completing in under 200ms.`,
    ],
  },
];

const MASTER_RESUMES = [
  {
    candidateFolder: "3_Roushan_Kumar",
    file: "Roushan_Kumar_Resume.pdf",
    name: "ROUSHAN KUMAR",
    headline: "Software Developer — Backend & Cloud",
    contactHtml: ROUSHAN_CONTACT,
    summaryHtml: `Backend and Full-Stack Developer who builds web scrapers, APIs, and cloud services in Python and TypeScript. Created and runs <b>AstreWork</b> (astrework.app) on Oracle Cloud, where Dockerized Playwright and Puppeteer pipelines harvest and deduplicate 14,000+ high-volume career listings daily using Turso SQLite and Redis. Enjoys solving hard concurrency, caching, and infrastructure problems.`,
    skills: [
      ["Languages", "TypeScript, JavaScript, Python, Java, C#, SQL, Bash"],
      ["Backend & APIs", "FastAPI, Node.js, Express.js, .NET Core Web API, REST APIs, Microservices"],
      ["Frontend & Web", "Next.js 16 (App Router), React 19, Redux, Tailwind CSS, HTML5/CSS3"],
      ["Automation & AI", "Playwright, Puppeteer, Selenium, Tree-Sitter AST, Google GenAI SDK, ChromaDB"],
      ["Databases & Caching", "Turso LibSQL (SQLite WAL), PostgreSQL, MongoDB, Redis 7, Prisma ORM"],
      ["Cloud, Security & Testing", "Oracle Cloud (OCI ARM64), Docker, Caddy, GitHub Actions, Web Crypto API, Vitest, PyTest, xUnit"],
    ],
    projects: ROUSHAN_PROJECTS,
    simulations: ROUSHAN_SIMULATIONS,
  },
  {
    candidateFolder: "2_Ayushi_Raj",
    file: "Ayushi_Raj_Resume.pdf",
    name: "AYUSHI RAJ",
    headline: "Software Developer — Full-Stack & AI",
    contactHtml: AYUSHI_CONTACT,
    summaryHtml: `Full-Stack Developer building web applications, browser extensions, and AI tools with React, Next.js, TypeScript, and Python. Co-built <b>AstreWork</b> (astrework.app), shipping its live resume-scoring studio and the <b>AstrePilot</b> Chrome extension (Manifest V3) for one-click job application autofill. Cares about clean UI, fast page loads, and practical security.`,
    skills: [
      ["Languages", "TypeScript, JavaScript, Python, Java, C#, SQL, HTML5/CSS3"],
      ["Frontend & UI", "React 19, Next.js 16 (App Router), Redux, Zustand, Tailwind CSS, Monaco Editor"],
      ["AI & Browser Automation", "Google GenAI SDK, Multi-LLM Routing, Chrome Extensions (MV3), Shadow DOM, Playwright, Puppeteer"],
      ["Backend & APIs", "Node.js, Express.js, FastAPI, .NET Core Web API, REST APIs"],
      ["Databases & Caching", "Turso LibSQL, SQLite, PostgreSQL, MongoDB, Redis 7, Prisma ORM, ChromaDB"],
      ["Security, Testing & Cloud", "Web Crypto API (AES-GCM, PBKDF2), HMAC-SHA256, JWT, Vitest, PyTest, xUnit, Docker, Git"],
    ],
    projects: AYUSHI_PROJECTS,
    simulations: AYUSHI_SIMULATIONS,
  },
];

// ============================================================================
// MAIN GENERATOR & REAL DOM GEOMETRY GATE
// ============================================================================
async function main() {
  console.log("🚀 Launching Chromium to generate Canonical Master Resumes (Roushan & Ayushi)...");
  
  // Project Bullet Uniqueness Gate between candidates
  const roushanBullets = ROUSHAN_PROJECTS.flatMap((p) => p.bullets);
  const ayushiBullets = AYUSHI_PROJECTS.flatMap((p) => p.bullets);
  const sharedBullets = roushanBullets.filter((b) => ayushiBullets.includes(b));
  if (sharedBullets.length > 0) {
    throw new Error(`❌ SHARED PROJECT BULLETS DETECTED between Roushan and Ayushi: ${JSON.stringify(sharedBullets)}`);
  }
  console.log("✅ Verified 100% project bullet uniqueness between Roushan and Ayushi (0 shared bullets).");

  // Simulation Bullet Uniqueness Gate between candidates
  const roushanSimBullets = ROUSHAN_SIMULATIONS.flatMap((s) => s.bullets);
  const ayushiSimBullets = AYUSHI_SIMULATIONS.flatMap((s) => s.bullets);
  const sharedSimBullets = roushanSimBullets.filter((b) => ayushiSimBullets.includes(b));
  if (sharedSimBullets.length > 0) {
    throw new Error(`❌ SHARED SIMULATION BULLETS DETECTED between Roushan and Ayushi: ${JSON.stringify(sharedSimBullets)}`);
  }
  console.log("✅ Verified 100% simulation bullet uniqueness between Roushan and Ayushi (0 shared bullets).");

  const browser = await chromium.launch({
    headless: true,
    executablePath:
      process.env.PUPPETEER_EXECUTABLE_PATH ||
      process.env.CHROME_PATH ||
      (fs.existsSync("C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe")
        ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
        : undefined),
  });
  const page = await browser.newPage();

  for (const r of MASTER_RESUMES) {
    const outDir = path.resolve(process.cwd(), "public", "candidates", r.candidateFolder);
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }

    const html = buildResumeHtml({
      name: r.name,
      headline: r.headline,
      contactHtml: r.contactHtml,
      summaryHtml: r.summaryHtml,
      skills: r.skills,
      projects: r.projects,
      simulations: r.simulations,
      educationHtml: SHARED_EDUCATION_HTML,
    });

    await page.setContent(html, { waitUntil: "networkidle" });

    // Real Chromium DOM Geometry & Readability Gate
    const metrics = await page.evaluate(() => {
      const sheet = document.querySelector(".sheet");
      const last = document.querySelector(".education-section");
      const sheetRect = sheet.getBoundingClientRect();
      const lastRect = last.getBoundingClientRect();
      const pxPerMm = sheetRect.height / 297;
      const bottomGapMm = (sheetRect.bottom - lastRect.bottom) / pxPerMm;

      const skillLines = [...document.querySelectorAll(".skill-text")].map((el) => {
        const lh = parseFloat(getComputedStyle(el).lineHeight);
        return Math.round(el.getBoundingClientRect().height / lh);
      });

      const h3Lines = [...document.querySelectorAll("h3")].map((el) => {
        const lh = parseFloat(getComputedStyle(el).lineHeight);
        return Math.round(el.getBoundingClientRect().height / lh);
      });
      const bulletLines = [...document.querySelectorAll("li")].map((el) => {
        const lh = parseFloat(getComputedStyle(el).lineHeight);
        return Math.round(el.getBoundingClientRect().height / lh);
      });

      return {
        overflow: sheet.scrollHeight > sheet.clientHeight + 1,
        scrollHeight: sheet.scrollHeight,
        clientHeight: sheet.clientHeight,
        bottomGapMm: Number(bottomGapMm.toFixed(2)),
        maxSkillLines: Math.max(...skillLines),
        maxH3Lines: Math.max(...h3Lines),
        skillLines,
        maxBulletLines: Math.max(...bulletLines),
        bulletLines,
      };
    });

    console.log(`📐 [${r.file}] Geometry Metrics:`, JSON.stringify(metrics));

    if (metrics.overflow) {
      throw new Error(`❌ OVERFLOW DETECTED in ${r.file}: scrollHeight (${metrics.scrollHeight}) > clientHeight (${metrics.clientHeight})`);
    }
    if (metrics.bottomGapMm < 6 || metrics.bottomGapMm > 22) {
      throw new Error(`❌ BOTTOM GAP OUT OF RANGE in ${r.file}: ${metrics.bottomGapMm}mm (expected 6mm–22mm)`);
    }
    if (metrics.maxH3Lines > 1) {
      throw new Error(`❌ PROJECT/ITEM HEADER WRAPPING DETECTED in ${r.file}: maxH3Lines = ${metrics.maxH3Lines}`);
    }
    if (metrics.maxSkillLines > 1) {
      throw new Error(`❌ SKILL WRAPPING DETECTED in ${r.file}: skillLines = ${JSON.stringify(metrics.skillLines)} (must be strictly 1 line each)`);
    }
    if (metrics.maxBulletLines > 2) {
      throw new Error(`❌ 3-LINE BULLET DETECTED in ${r.file}: maxBulletLines = ${metrics.maxBulletLines}`);
    }

    const pdfPath = path.join(outDir, r.file);
    await page.pdf({
      path: pdfPath,
      format: "A4",
      printBackground: true,
      margin: { top: "0mm", right: "0mm", bottom: "0mm", left: "0mm" },
    });

    // Render high-DPI screenshot to artifact directory for visual inspection
    const artifactDir = "C:\\Users\\playb\\.gemini\\antigravity\\brain\\aac1ae76-3afb-41f1-b191-e45a37b73b21";
    if (fs.existsSync(artifactDir)) {
      const pngName = r.candidateFolder.includes("Roushan") ? "roushan_master_resume_v3.png" : "ayushi_master_resume_v3.png";
      const sheetEl = await page.$(".sheet");
      if (sheetEl) {
        await sheetEl.screenshot({ path: path.join(artifactDir, pngName) });
      }
    }

    const dataBuffer = fs.readFileSync(pdfPath);
    let numPages = 1;
    let textContent = "";
    if (typeof pdfParse === "function") {
      const parsed = await pdfParse(dataBuffer);
      numPages = parsed.numpages;
      textContent = parsed.text || "";
    } else if (pdfParse.PDFParse) {
      const parser = new pdfParse.PDFParse({ data: dataBuffer });
      const info = await parser.getText();
      numPages = info.total;
      textContent = info.text || "";
      await parser.destroy();
    }

    // Check BCA Title Regulation & Anti-Slop
    const engineerMatches = textContent.match(/\bengineer(s)?\b/gi);
    if (engineerMatches) {
      throw new Error(`❌ FORBIDDEN TITLE 'Engineer' found in ${r.file}: ${engineerMatches.join(", ")}`);
    }
    const slopMatches = textContent.match(/\b(dynamic|utiliz\w*|passionate|spearhead\w*|leverag\w*)\b/gi);
    if (slopMatches) {
      throw new Error(`❌ AI SLOP WORDS found in ${r.file}: ${slopMatches.join(", ")}`);
    }

    console.log(
      `✅ [${r.candidateFolder}/${r.file}] -> Pages: ${numPages} | Bottom Gap: ${metrics.bottomGapMm}mm | Max Skill Lines: ${metrics.maxSkillLines} | Max Bullet Lines: ${metrics.maxBulletLines} | Size: ${(dataBuffer.length / 1024).toFixed(1)} KB`
    );

    // Also sync to .next/standalone/public/candidates if standalone build exists
    const standaloneDir = path.resolve(process.cwd(), ".next", "standalone", "public", "candidates", r.candidateFolder);
    if (fs.existsSync(standaloneDir)) {
      fs.copyFileSync(pdfPath, path.join(standaloneDir, r.file));
    }
  }

  await browser.close();
  console.log("\n🎉 Both Canonical Master Resumes generated and verified with 100% geometry & compliance gates!");
}

main().catch((err) => {
  console.error("❌ Error generating resumes:", err);
  process.exit(1);
});
