---
name: ats-resume-maker
description: >-
  Expert guidance, typography rules, single-page A4 geometry laws, recruiter psychology, and ATS parseability
  optimization for the AstreWork Resume Maker and Builder. Use whenever modifying resume components, CSS sheet padding,
  hanging indent flexbox layouts, Google XYZ bullet metrics, AI slop avoidance, BCA title compliance, or link typography.
---

# 📄 AstreWork ATS Resume Maker — Recruiter Psychology & A4 Geometry Mastery

This skill governs the visual formatting, typographical hierarchy, A4 page fitting, recruiter cognitive psychology, and ATS algorithm compliance for resumes generated within AstreWork (`/resume-maker` and `/resume-builder`).

---

## 👁️ 0. The 6-Second Recruiter Psychology Law (The F-Pattern Cognitive Model)

> **CORE PRINCIPLE:** A human recruiter’s brain **does not read** a technical resume. It **pattern-matches** it in under 6 seconds using an unconscious F-scan.

```
┌────────────────────────────────────────────────────────────────────────┐
│ The Recruiter's 6-Second F-Scan Mental Model                          │
│                                                                        │
│  Eye Movement:  1. TOP → RIGHT (Full Name + Target Role Headline)      │
│                 2. DOWN LEFT (Section Headers: Skills, Projects)       │
│                 3. ACROSS LEFT (First 4 words of each bullet point)    │
│                 4. RIGHT (Company/Brand Halo & Performance Metrics)    │
│                                                                        │
│  Subconscious Kill Switches (Instant Disqualification):                │
│  • Dense paragraph blocks (>3 lines)           → Visual Fatigue / SKIP │
│  • Bullets starting with "Responsible for..."  → JUNIOR SIGNAL / REJECT│
│  • Zero metrics in the first 3 bullets         → UNVERIFIABLE CLAIM    │
│  • Comma-separated tech list inside summary    → AI SLOP / RESUME JUNK │
│  • Underlined links cluttering descenders      → DATED 1990s DESIGN    │
│  • Prohibited title ("Engineer" for BCA)       → REGULATORY VIOLATION  │
│                                                                        │
│  Subconscious Green Flags (Instant Shortlist / Callback):              │
│  • Exact JD role title mirrored in Candidate Headline                  │
│  • First word of every bullet is a decisive past-tense technical verb  │
│  • High-credibility brand halo (Fortune 500 & Top Tier Simulations)   │
│  • Clean 2-column hanging indent with zero visual jitter               │
│  • Crisp, non-underlined, color-differentiated hyperlinked anchors     │
└────────────────────────────────────────────────────────────────────────┘
```

### Laws Derived from Recruiter Cognitive Psychology
1. **The First 4 Words Law:** A recruiter only registers the first 4 words of a bullet before deciding whether to read the rest. The first word **must be a decisive past-tense technical action verb** (e.g. *Architected, Engineered, Benchmarked, Hardened, Containerized*). Never start with passive verbs (*"Assisted in", "Worked on", "Responsible for", "Helped"*).
2. **The Target Headline Mirror:** The candidate's headline must mirror the exact role title from the Job Description (e.g., `Full-Stack Developer | Distributed Systems & Cloud Infrastructure`). This satisfies the recruiter's internal keyword search query in 0.8 seconds.
3. **The Executive Summary Rule (3 Sentences Max):**
   - Sentence 1: **WHO** the candidate is (professional identity, core domain).
   - Sentence 2: **WHAT** kind of mission-critical systems they build and operate in production.
   - Sentence 3: **WHY** they are worth reading further (architectural focus, scaling interest).
   - **ZERO TECH DUMPS:** Do not list comma-separated technologies in the summary. Technologies belong exclusively in the Skills and Projects sections.

---

## 📐 1. The Single-Page A4 Arithmetic Law (297mm Ceiling)

A single-page technical resume must fit within a rigid **210mm x 297mm** bounding box with **zero vertical overflow** and **zero clipping** of the bottom `EDUCATION` section.

```css
/* src/app/globals.css */
.ats-a4-sheet {
  width: 210mm;
  height: 297mm;
  min-height: 297mm;
  max-height: 297mm;
  padding: 6.0mm 8.5mm 5.0mm; /* Reduced top/bottom padding reclaims ~28pt */
  background: #ffffff;
  color: #111827;
  font-family: var(--font-inter), Arial, Helvetica, sans-serif;
  font-size: 8.8pt;
  line-height: 1.25;
  box-shadow: 0 18px 45px rgba(0, 0, 0, 0.14), 0 2px 8px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  box-sizing: border-box;
}
```

### The 60-Point Space Budget Breakdown
When content threatens to push Education into the bottom margin, apply these arithmetic space savers:
1. **Sheet Top/Bottom Padding:** `6.0mm` top, `5.0mm` bottom (saves ~28pt over default 10.5mm).
2. **Horizontal Dividers (`<hr />`):** `margin: 1.5pt 0 1.2pt` (saves ~11.5pt across 5 dividers).
3. **List Spacing:** `ul { margin: 1.0pt 0 1.6pt; padding-left: 11.0pt; }`, `li { margin-bottom: 1.0pt; line-height: 1.23; }` (saves ~10pt across 12 bullets).
4. **Section & Project Margins:** Project/Simulation container `marginBottom: 2.0pt`, section header `marginTop: 1.5pt` (saves ~8pt).
5. **Bullet Length Budget:** Condense paragraphs into crisp 2-line bullets (~18–28 words).

---

## 🎯 2. Two-Column Flexbox Gutter (The Hanging Indent Law)

**The Defect:** When a bullet dot is rendered inside the text string (`• Skills: ...`), wrapped lines fall directly underneath the bullet point, breaking the left margin alignment of recruiter F-scans. If the bullet is removed, the section looks unfinished.

**The Solution:** Use an isolated two-column flex layout where Column 1 holds the bullet dot and Column 2 holds the text block:

```tsx
<div
  className="ats-skill-row"
  style={{
    display: "flex",
    alignItems: "flex-start",
    fontSize: "8.35pt",
    lineHeight: "1.28",
    color: "#1e293b",
    marginBottom: "1.4pt",
  }}
>
  {/* Column 1: Fixed Gutter */}
  <span
    style={{
      width: "10pt",
      flexShrink: 0,
      fontWeight: 700,
      color: "#0f172a",
      userSelect: "none",
      lineHeight: "1.28",
    }}
  >
    •
  </span>

  {/* Column 2: Content Block (Wraps Parallel to Category Title) */}
  <div style={{ flex: 1, minWidth: 0 }}>
    <b>{s.categoryName}:</b> {s.skillsText}
  </div>
</div>
```

---

## 🔗 3. Link Typography & Anti-Underline Aesthetics Law

> **MANDATORY DESIGN RULE:** **NEVER USE UNDERLINES IN RESUME LINKS.**  
> Underlines (`text-decoration: underline`) in GitHub, Portfolio, LinkedIn, Live Demo, or Code links create severe typographical pollution.

### Why Underlines Ruin Executive Technical Resumes
1. **Vertical Scan Interference:** Underlines intersect letter descenders (`g`, `y`, `p`, `q`, `j`), creating visual noise that trips the recruiter's eye during rapid scanning.
2. **Aesthetic Immaturity:** Underlines signal default 1990s browser styling rather than an intentional, modern design system.
3. **ATS Parser Neutrality:** ATS parsers read the `href` attribute or plain URL text string directly from the PDF stream; underlines add zero semantic value to parsers.

### The Correct Link Styling Specification
```css
/* src/app/globals.css */
.ats-a4-sheet a {
  color: #1d5fd1;
  text-decoration: none; /* Inviolable: Zero underline */
  font-weight: 500;
}

.ats-a4-sheet a:hover {
  text-decoration: none; /* Keep clean even on interactive hover */
  color: #1447a1;
}
```

```tsx
/* In Header: */
<a href={header.portfolioUrl} target="_blank" rel="noreferrer" className="no-underline text-blue-700">
  {header.portfolioUrl.replace(/^https?:\/\//, "")}
</a>

/* In Projects: */
<span style={{ fontSize: "7.8pt", color: "#475569", whiteSpace: "nowrap", flexShrink: 0 }}>
  <a href={proj.liveDemoUrl} target="_blank" rel="noreferrer" className="no-underline text-blue-700">Live Demo</a> |{" "}
  <a href={proj.githubUrl} target="_blank" rel="noreferrer" className="no-underline text-blue-700">GitHub</a>
</span>
```

---

## 📌 4. Project Link Header Pinning & Title Length Budget

**The Defect:** Long project titles (e.g. 130 characters) squeeze the right column, forcing `Live Demo | GitHub` links to wrap vertically into two lines:
```text
Live Demo |
GitHub
```

**The Solution:**
1. **Title Length Cap:** Limit parenthetical tech stacks to ~90 characters:
   - ✅ `AstreWork — Autonomous Career Intelligence Engine & Distributed Harvester (OCI, Docker, Redis)` (92 chars)
   - ❌ `AstreWork — Autonomous Career Intelligence Engine & Distributed Harvester (Next.js 16, TypeScript, Turso LibSQL, Redis, OCI, Docker)` (130 chars)
2. **Flex Container Constraints:**
```tsx
<div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8pt" }}>
  <h3 style={{ fontSize: "8.75pt", margin: 0, flex: 1 }}>
    <b>{proj.title}</b>
  </h3>
  <span style={{ fontSize: "7.8pt", color: "#475569", whiteSpace: "nowrap", flexShrink: 0, marginTop: "1pt" }}>
    <a href={proj.liveDemoUrl} target="_blank" rel="noreferrer" style={{ textDecoration: "none", color: "#1d5fd1" }}>Live Demo</a> |{" "}
    <a href={proj.githubUrl} target="_blank" rel="noreferrer" style={{ textDecoration: "none", color: "#1d5fd1" }}>GitHub</a>
  </span>
</div>
```

---

## ✍️ 5. The Google XYZ Bullet Formula & Anti-AI Slop Rules

Every experience bullet must follow the **Google XYZ Metric Formula**:
> *"Accomplished [X], as measured by [Y], by doing [Z]"*

### Examples
- **Roushan (Backend & Systems):**
  > **Creator & Lead Backend Developer:** Engineered distributed scrapers on Oracle Cloud (OCI ARM64) aggregating 14,000+ remote opportunities daily across 7 platforms with 0% duplication.
- **Ayushi (AI & Frontend):**
  > **Co-Developer & Lead Frontend Architect:** Engineered client-side ATS match engine and Gemini-powered scoring studio on Next.js 16, achieving sub-second evaluation across live postings.

### Banned AI Slop Words (Never Use Anywhere in Resumes)
- ❌ *Spearheaded, Utilized, Seasoned, Passionate, Dynamic, Leveraged, Synergized, Facilitated, Results-driven, Enthusiastic, Detail-oriented, Testament, Rich tapestry, Multifaceted, Driving excellence.*
- ✅ Use active engineering verbs: *Architected, Engineered, Implemented, Benchmarked, Profiled, Deployed, Automated, Decoupled, Containerized, Scaled, Hardened, Calibrated.*

---

## ⚖️ 6. Inviolable BCA Candidate Title Regulation (Developer Only, Never Engineer)

Both Roushan Kumar and Ayushi Raj are pursuing a **Bachelor of Computer Applications (BCA)** at Amity University Noida. Under Indian regulatory, academic, and corporate compliance standards:
- **FORBIDDEN TITLES:** *Software Engineer, Systems Engineer, Backend Engineer, Full Stack Engineer, AI Engineer.*
- **MANDATORY PERMITTED TITLES:** **Software Developer, Full-Stack Developer, Backend Developer, Systems Architect, AI Developer, Creator, Co-Developer, Builder.**
- **Virtual Simulation Rule:** Course titles in Virtual Simulations retain their formal course name (e.g. *"Software Development Virtual Simulation"* or *"Software Engineering Virtual Simulation"*), but the candidate's personal title must always be **Developer** or **Architect**.

---

## ⏳ 7. The Recruiter's Cognitive Hierarchy (Time Allocation Breakdown)

During the 6-second review, a Senior Technical Recruiter evaluates elements in this precise chronological order:

```
1. Target Headline / Role Title       [1.2 sec] — Does this person directly match the open requisition?
2. Brand Halo / Recognizable Names    [0.8 sec] — CommBank, Y Combinator, Walmart, Oracle Cloud.
3. First Bullet of Project #1         [1.5 sec] — Did they build a real system with real numbers?
4. Skills Category #1 (First 3 items) [0.5 sec] — Immediate keyword confirmation (e.g. TypeScript, React).
5. Education Line                     [0.3 sec] — Degree gate check (BCA, Amity University Noida).
6. Remainder of Document              [1.7 sec] — Secondary verification if shortlist criteria passed.
```

### Strategic Implications
- **Brand Halo Capitalization:** Virtual simulations from globally recognized enterprises (Commonwealth Bank, Y Combinator startup, Walmart USA) trigger the *halo effect*, lending enterprise-grade credibility to student/early-career developers.
- **Left-To-Right Primacy:** Recruiters stop reading a line after 3–4 items. Place the most critical keywords at the **start** of each skill category.
- **Education Placement:** Keep Education strictly at the bottom. It is a credential verification check, not a differentiator for high-output builders.

---

## 🚫 8. The 7 Psychological Kill Switches (Subconscious Rejection Triggers)

| # | Subconscious Rejection Pattern | Recruiter Mental Reaction | AstreWork Engineered Solution |
|:-:|:---|:---|:---|
| **1** | Passive opening verbs (*"Worked on", "Responsible for"*) | *"Junior mindset; was told what to do; lacks initiative."* | Mandatory active verb opener (*Architected, Engineered, Profiled*). |
| **2** | Wall-of-text bullets (>28 words, >3 lines) | *"Cannot communicate concisely; lacks architectural clarity."* | Strict 18–28 word cap per bullet; 2 lines max on A4. |
| **3** | Uncategorized skill soup (`TypeScript, React, Docker...`) | *"Keyword stuffing; probably doesn't know any of these deeply."* | Strict 6 colon-labeled categories; 4–8 curated items each. |
| **4** | Generic template summary (*"Passionate developer seeking..."*) | *"Generic applicant; copied from LinkedIn template."* | Narrative prose describing WHO they are + WHAT they build. |
| **5** | Zero quantitative metrics in top 3 bullets | *"Vague claims; no evidence of real production impact."* | Mandatory metrics in every project opener (%, ms, count, uptime). |
| **6** | Title violation (*"Engineer"* for BCA candidate in India) | *"Academic/legal misrepresentation; credential risk."* | Strict *Software Developer / Systems Architect* compliance. |
| **7** | Untraceable projects with dead links or generic code | *"Tutorial project; did they actually build this themselves?"* | Live Demo URLs + GitHub repositories + production architecture. |

---

## 🌟 9. The Positive Psychological Triggers (What Earns the Callback)

1. **The Credibility Cascade:** Recognizable institutions (even structured virtual simulations) make recruiters subconsciously assume high baseline engineering discipline.
2. **The Specificity Signal:** Precise engineering figures (*14,000+ daily opportunities, 0% duplication, sub-50ms API latency, 100,000 PBKDF2 iterations*) convey senior-level engineering rigor.
3. **The Scarcity Indicator:** Operating a live production platform on cloud infrastructure (OCI Ampere ARM64, Caddy HTTP/3, Docker, Turso LibSQL WAL) separates the candidate from 99% of student developers who only deploy static sites on free tiers.
4. **The Volume Signal:** 3 flagship projects × 3 bullets each = 9 concrete pieces of engineering evidence. 9 verified points overwhelm doubt.
5. **The Precision Headline Formula:** `Full-Stack Developer | Distributed Systems & Cloud Infrastructure` is infinitely stronger than `Student Developer` or `Software Developer`.

---

## 🤖 10. The ATS Parser Machine Model & Vulnerabilities

Applicant Tracking Systems (Greenhouse, Ashby, Lever, Workday, Taleo) do not read resumes like humans—they parse text streams into tokens.

```
ATS Parsing Pipeline:
[File Ingestion] → [Text Stream Extraction] → [Section Header Classification] → [Keyword Extraction] → [Score Matching]
```

### Architectural ATS Rules:
- **Single-Column Flow Only:** Multi-column grid templates cause text interleaving when parsed sequentially. AstreWork enforces a strict single-column flow with flexbox gutters.
- **Pure CSS Geometry (Zero Tables / Zero Canvas):** Never use HTML `<table>` or HTML `<canvas>` elements for resume layout. ATS engines often skip table content or scramble column orders.
- **Standard Semantic Section Headers:** Always use unambiguous headers:
  - `PROFESSIONAL SUMMARY`
  - `TECHNICAL SKILLS`
  - `TECHNICAL PROJECTS`
  - `TECHNICAL SIMULATIONS & VIRTUAL EXPERIENCES`
  - `EDUCATION`
- **Contextual Keyword Anchoring:** An isolated keyword in the Skills section yields low ATS scoring weight in modern semantic engines. Every critical skill in the Skills section **must appear at least once** in the context of a project or simulation bullet.

---

## 🛠️ 11. The Optimal 6-Category Skills Architecture

To pass both ATS parsing and recruiter cognitive scanning, skills must be organized into exactly 6 colon-labeled categories:

```text
Frontend UI & Full Stack: React.js, Next.js 16 (App Router), TypeScript, JavaScript (ESNext), Tailwind CSS, Vanilla CSS Design Tokens, Responsive A4 Layouts
Backend & Microservices: Node.js, Express.js, Fastify, C# (.NET Core), Python (FastAPI), RESTful APIs, Concurrency & Rate Limiting
Autonomous AI Agents & Web Scraping: Playwright, Puppeteer, Selenium, Autonomous Scraper Agents, Multi-Agent Routing, Stealth HTTP/3 Headers, Anti-Bot Bypasses
Databases & Caching: Turso Cloud LibSQL (WAL), Redis 7 (LRU), PostgreSQL, MongoDB, SQLite, Prisma ORM, Relational Schema Design (3NF)
Cloud Infrastructure & DevOps: Oracle Cloud (OCI ARM64), Docker, Docker Compose, Caddy (HTTP/3), GitHub Actions CI/CD, Watchtower, Linux/Bash
Languages, Security & Testing: TypeScript, Python, C#, Java, C, Rust, SQL, Web Crypto API (AES-GCM, PBKDF2), HMAC-SHA256 Auth, Vitest, PyTest, xUnit
```

### Mandatory Rules for Skills:
1. **Include Playwright & Puppeteer:** For any backend, full-stack, or automation candidate, **Playwright and Puppeteer** must be explicitly included in the Autonomous Agents / Web Scraping or Developer Tooling category.
2. **Colon-Labeled Categories:** Each category starts with `<b>Category Name:</b>` followed by comma-separated skills.
3. **No Internal Bullets:** Never use bullet dots (`•`) between skills inside a category. Use standard commas `, ` for clean ATS tokenization.
4. **4 to 8 Skills per Category:** Avoid exhaustive 20-tool lists. Curate the top 4–8 most commercially relevant skills.

---

## 🔀 12. Skill Ordering Intelligence Law (Primacy Anchoring)

Recruiters read skills left-to-right and stop scanning after the 3rd or 4th item. The AI Optimizer and manual builders must order items within each category as follows:

```
[Position 1]: Exact matching skill demanded by target Job Description (ATS keyword anchor)
[Position 2]: Flagship production skill (the primary tool used in Project #1)
[Position 3–5]: Supporting architectural tools providing enterprise credibility
[Position 6+]: Secondary runtimes or complementary libraries
```

---

## 📋 13. Pre-Submission Quality Gate (18-Point Verification Checklist)

Before releasing or exporting any resume from AstreWork:

### A. Recruiter Psychology Checks
- [ ] Candidate headline mirrors the target role title from the Job Description.
- [ ] Summary is exactly 3 sentences of narrative prose (WHO + WHAT THEY BUILD + WHY).
- [ ] Summary contains ZERO comma-separated lists of technologies.
- [ ] First word of EVERY project bullet is a decisive past-tense technical verb.
- [ ] At least one quantified metric (%, ms, count, ratio) exists in the first 3 bullets.
- [ ] Every bullet is between 18 and 28 words (crisp 2-line visual weight).

### B. Typography & Aesthetics
- [ ] **Zero underlines on links:** GitHub, Portfolio, LinkedIn, and Live Demo links have `text-decoration: none`.
- [ ] Links use consistent brand color (`#1d5fd1` or `text-blue-700`) without visual clutter.
- [ ] Technical Skills bullet dots form an isolated hanging indent (Column 1 = dot, Column 2 = text).
- [ ] Project titles keep tech stacks under 90 characters to prevent link wrap.

### C. ATS & Machine Compliance
- [ ] Entire sheet fits strictly within 297mm height with zero scrollbar or overflow.
- [ ] Education sits at least 15mm above the sheet bottom margin.
- [ ] Exactly 6 categorized skill groups with colon labels and comma separation.
- [ ] **Playwright & Puppeteer** are present in the automation/scraping stack.
- [ ] Standard section headers used (PROFESSIONAL SUMMARY, TECHNICAL SKILLS, etc.).

### D. BCA Candidate Compliance (Indian Regulatory Standard)
- [ ] Zero occurrences of "Engineer" in candidate target headline.
- [ ] Zero occurrences of "Engineer" in candidate professional summary.
- [ ] Zero occurrences of "Engineer" when referring to the candidate's personal title.
- [ ] Permitted titles strictly applied: **Software Developer, Full-Stack Developer, Backend Developer, Systems Architect, AI Developer, Builder**.
