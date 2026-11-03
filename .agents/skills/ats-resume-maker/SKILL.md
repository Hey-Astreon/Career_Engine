---
name: ats-resume-maker
description: >-
  Expert guidance, typography rules, single-page A4 geometry laws (210mm x 297mm, 8.5pt floor, 4-Tier Vertical Rhythm),
  6-second recruiter F-scan psychology, Style B headlines, dark non-underlined 600 semi-bold links, Google XYZ bullets,
  anti-AI slop rules, BCA title compliance, and canonical PDF generation for AstreWork (/resume-maker, /resume-builder, src/lib/resumeBaseline.ts).
---

# 📄 AstreWork ATS Resume Maker — Recruiter Psychology & Single-Page A4 Geometry Mastery

This skill governs the visual formatting, typographical hierarchy, single-page A4 geometry, recruiter cognitive psychology, ATS parser compliance, and master baseline synchronization across `/resume-maker`, `/resume-builder`, `src/lib/resumeBaseline.ts`, `scripts/generate-all-candidate-resumes.mjs`, and `scripts/sync-master-profiles.cjs`.

---

## 👁️ 1. The 6-Second Recruiter Psychology Law (The F-Pattern Cognitive Model)

> **CORE PRINCIPLE:** A human recruiter’s brain **does not read** a technical resume linearly. It **pattern-matches** it in under 6 seconds using an unconscious F-scan.

```
┌────────────────────────────────────────────────────────────────────────┐
│ The Recruiter's 6-Second F-Scan Mental Model                          │
│                                                                        │
│  Eye Movement:  1. TOP → RIGHT (Full Name + Style B Target Headline)   │
│                 2. DOWN LEFT (Section Headers: Skills, Projects)       │
│                 3. ACROSS LEFT (First 4 words of each bullet point)    │
│                 4. RIGHT (Company/Brand Halo & Quantified Metrics)     │
│                                                                        │
│  Subconscious Kill Switches (Instant Disqualification):                │
│  • Dense paragraph blocks (>3 lines)           → Visual Fatigue / SKIP │
│  • Bullets starting with "Responsible for..."  → JUNIOR SIGNAL / REJECT│
│  • Zero metrics in the first 3 bullets         → UNVERIFIABLE CLAIM    │
│  • Comma-separated tech list inside summary    → AI SLOP / RESUME JUNK │
│  • Underlined or blue links cutting descenders → DATED 1990s DESIGN    │
│  • Prohibited title ("Engineer" for BCA)       → REGULATORY VIOLATION  │
│  • Consumer job-hunting framing in summary     → FLIGHT-RISK ANXIETY   │
└────────────────────────────────────────────────────────────────────────┘
```

### Recruiter Psychology Laws
1. **Style B Target Role Headlines:**
   - **Roushan Kumar:** `Software Developer — Backend & Cloud`
   - **Ayushi Raj:** `Software Developer — Full-Stack & AI`
   - Satisfies the recruiter's role classification check in `< 0.8s` without multi-pipe keyword stuffing.
2. **Enterprise Data-Pipeline Framing (Zero Flight-Risk Anxiety):**
   - Never describe AstreWork in consumer job-seeker language (*"scrapes remote jobs to apply faster"*), which triggers HR flight-risk suspicion.
   - Frame it strictly as high-volume distributed data engineering:
     > *"where Dockerized Playwright and Puppeteer pipelines harvest and deduplicate 14,000+ high-volume career listings daily using Turso SQLite and Redis."*
3. **Zero Plagiarism / Co-Founder Domain Separation:**
   - **Roushan (Creator & Lead Backend Developer):** Owns OCI ARM64 distributed Playwright/Puppeteer scrapers, Turso SQLite WAL + Redis caching, and C#/.NET + Python/FastAPI backend architecture.
   - **Ayushi (Co-Developer & Lead Frontend Architect):** Owns Next.js 16 / React 19 UI studio, Gemini ATS scoring studio, Chrome MV3 AstrePilot extension (`#astrepilot-hud-host`), and Web Crypto (`AES-GCM`, `PBKDF2`) security UX.
   - **Zero Shared Project or Simulation Bullets:** Every bullet across all 3 projects (`AstreWork`, `CodeVanta`, `CipherVault`) and all 3 simulations (`CommBank`, `Shiptivity`, `Walmart USA`) must be 100% distinct between Roushan and Ayushi (`sharedBullets === 0`).

---

## 📐 2. Single-Page A4 Arithmetic Law (`210mm x 297mm`) & 4-Tier Vertical Rhythm

Every resume must fit strictly inside a single **210mm × 297mm** A4 page (`overflow: false`, bottom gap `9mm–15mm` above the bottom edge) while respecting human visual chunking:

```css
/* src/app/globals.css — 8.5pt Readability Floor + 4-Tier Vertical Rhythm */
.ats-a4-sheet {
  width: 210mm;
  height: 297mm;
  min-height: 297mm;
  max-height: 297mm;
  padding: 7.5mm 9.0mm 6.5mm;
  background: #ffffff;
  color: #111827;
  font-family: var(--font-inter), Arial, Helvetica, sans-serif;
  font-size: 8.5pt;
  line-height: 1.29;
  overflow: hidden;
  box-sizing: border-box;
}
```

### The 4-Tier Human Cognitive Line-Spacing Hierarchy
| Tier | Scope | CSS Value | Purpose |
| :--- | :--- | :--- | :--- |
| **Font Floor** | Body & Bullets | `8.5pt` (`h1` `17.0pt`, Headline `9.5pt`, Contact `8.3pt`, `h2` `9.6pt`, `h3` `9.0pt`) | Eliminates squinting; passes 100% human readability. |
| **Tier 1** | Intra-line Leading | `line-height: 1.29` (bullets), `1.32` (left-aligned summary; never `justify`), `1.28` (skills) | Clean character breathing room without uneven word rivers. |
| **Tier 2** | Inter-bullet Gap | `li { margin-bottom: 1.5pt; }`, `.ats-skill-row { margin-bottom: 1.6pt; }` | $>2\times$ intra-line gap so wrapped 2-line bullets visually chunk. |
| **Tier 3** | Inter-entity Gap | `margin-top: 3.6pt` between Projects and between Simulations | Clearly separates Project #1, Project #2, and Project #3. |
| **Tier 4** | Macro Section Divider | `hr { margin: 3.2pt 0 2.2pt; }`, `h2 { margin-bottom: 1.6pt; }` | Distinct structural separation across all 5 resume sections. |

---

## 🎯 3. Two-Column Flexbox Hanging Indent & 1-Line De-Hoarded Skills

### 1. Isolated Two-Column Flexbox Gutter
Wrapped lines in Technical Skills must align underneath the category label (`Column 2`), never underneath the bullet dot (`Column 1`):
```tsx
<div className="ats-skill-row" style={{ display: "flex", alignItems: "flex-start", fontSize: "8.5pt", lineHeight: "1.28", marginBottom: "1.6pt" }}>
  <span style={{ width: "10pt", flexShrink: 0, fontWeight: 700, color: "#0f172a", userSelect: "none" }}>•</span>
  <div style={{ flex: 1, minWidth: 0 }}>
    <b>{s.categoryName}:</b> {s.skillsText}
  </div>
</div>
```

### 2. The 1-Line De-Hoarded Skills Law (`maxSkillLines === 1`)
- Organize skills into **6 colon-labeled categories** with **5–6 high-signal items per category** so every category fits on **1 single line** (`maxSkillLines === 1`).
- Never use internal bullet dots (`•`) inside `skillsText`; use standard commas (`, `) for clean ATS tokenization.
- **Playwright & Puppeteer** must always appear in the Web Scraping / Browser Automation category.
- **Primacy Ordering (`resumeOptimizer.ts`):** Always front-load exact job-matched skills to Positions 1–2 of the category string.

---

## 🔗 4. Link Typography & Header Pinning Law

> **INVIOLABLE FOUNDER DIRECTIVE:** **NO BLUE AND NO UNDERLINE ON RESUME LINKS.**

1. **Dark Ink Semi-Bold Link Affordance:**
   - All links inside `.ats-a4-sheet a` and `scripts/generate-all-candidate-resumes.mjs` use `color: inherit` (`#0f172a`), `text-decoration: none !important`, and `font-weight: 600`.
   - Underlines are strictly forbidden because they cut across letter descenders (`g`, `y`, `p`, `q`) and pollute visual scanning.
2. **Single-Line Project Header Pinning (`maxH3Lines === 1`):**
   - Keep project titles + parenthetical tech stacks concise (`<= 85 characters`) and pin the right-hand `Live Demo | GitHub` container with `whiteSpace: "nowrap"` and `flexShrink: 0` so links never wrap onto two vertical lines.

---

## ✍️ 5. Google XYZ Bullet Formula, Anti-AI Slop & Education Format

### 1. Google XYZ Formula & Concrete Engineering Verbs
Every project and simulation bullet must follow *"Accomplished [X], as measured by [Y], by doing [Z]"* in **18–26 words** (strictly $\le 2$ lines on A4).
- **BANNED AI SLOP WORDS:** `utilize`, `utilizing`, `passionate`, `dynamic`, `spearhead`, `spearheaded`, `leverage`, `leveraged`, `synergize`, `testament`, `self-healing` (in project bullets), `orchestrated` (overuse).
- **REQUIRED VERBS:** *Built, Engineered, Designed, Implemented, Automated, Containerized, Reduced, Replaced, Verified, Hardened, Tuned.*

### 2. Clean Education Section (No Redundant Availability Clutter)
- Format: `Bachelor of Computer Applications (BCA) — Amity University Noida | Expected Graduation: 2027`
- Sub-line: `2nd Year Undergraduate | Relevant Coursework: ...`
- Do **not** append `"Full-Time Remote Available"` in Education (since `"Open to Work"` is already in the header).

---

## 🔄 6. Canonical Synchronization Pipeline (4-Point Atomic Sync)

Whenever any resume text, skill, project, or simulation is updated, you MUST synchronize all 4 storage layers atomically:
1. [`scripts/generate-all-candidate-resumes.mjs`](file:///x:/Career_Engine/scripts/generate-all-candidate-resumes.mjs) $\rightarrow$ Run `node scripts/generate-all-candidate-resumes.mjs` to regenerate `public/candidates/3_Roushan_Kumar/Roushan_Kumar_Resume.pdf` & `public/candidates/2_Ayushi_Raj/Ayushi_Raj_Resume.pdf` and verify Chromium DOM geometry (`overflow: false`, `maxSkillLines: 1`, `maxBulletLines: 2`).
2. [`src/lib/resumeBaseline.ts`](file:///x:/Career_Engine/src/lib/resumeBaseline.ts) $\rightarrow$ Update `ROUSHAN_MASTER_RESUME_BASELINE` and `AYUSHI_MASTER_RESUME_BASELINE`.
3. [`prisma/seed.ts`](file:///x:/Career_Engine/prisma/seed.ts) & [`scripts/seed-candidate-profiles.ts`](file:///x:/Career_Engine/scripts/seed-candidate-profiles.ts) $\rightarrow$ Keep local SQLite seeders aligned.
4. [`scripts/sync-master-profiles.cjs`](file:///x:/Career_Engine/scripts/sync-master-profiles.cjs) $\rightarrow$ Run `node scripts/sync-master-profiles.cjs` to sync profiles, 6 projects, and 6 virtual experiences directly to Turso Cloud LibSQL.
