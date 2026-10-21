---
name: ats-resume-maker
description: >-
  Expert guidance, typography rules, single-page A4 geometry laws, and ATS parseability optimization for
  the AstreWork Resume Maker and Builder. Use whenever modifying resume components, CSS sheet padding,
  hanging indent flexbox layouts, Google XYZ bullet metrics, AI slop avoidance, or BCA title compliance.
---

# 📄 AstreWork ATS Resume Maker & A4 Geometry Mastery

This skill governs the visual formatting, typography hierarchy, A4 page fitting, and ATS algorithm compliance for resumes generated within AstreWork (`/resume-maker` and `/resume-builder`).

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
5. **Bullet Length Budget:** Condense paragraphs into crisp 2-line bullets (~20–22 words).

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

## 🔗 3. Project Link Header Pinning & Title Length Budget

**The Defect:** Long project titles (e.g. 130 characters) squeeze the right column, forcing `Live Demo | GitHub` links to wrap vertically into two ugly lines:
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
    <a href={proj.liveDemoUrl} target="_blank" rel="noreferrer">Live Demo</a> |{" "}
    <a href={proj.githubUrl} target="_blank" rel="noreferrer">GitHub</a>
  </span>
</div>
```

---

## ✍️ 4. The Google XYZ Bullet Formula & Anti-AI Slop Rules

Every experience bullet must follow the **Google XYZ Metric Formula**:
> *"Accomplished [X], as measured by [Y], by doing [Z]"*

### Examples
- **Roushan (Backend):**
  > **Creator & Lead Backend Developer:** Engineered distributed scrapers on Oracle Cloud (OCI ARM64) aggregating 14,000+ remote opportunities daily across 7 platforms with 0% duplication.
- **Ayushi (Frontend):**
  > **Co-Developer & Lead Frontend Architect:** Engineered client-side ATS match engine and Gemini-powered scoring studio on Next.js 16, achieving sub-second evaluation across live postings.

### Banned AI Slop Words (Never Use)
- ❌ *Spearheaded, Utilized, Seasoned, Passionate, Dynamic, Leveraged, Synergized, Facilitated, Results-driven, Enthusiastic, Detail-oriented.*
- ✅ Use active engineering verbs: *Architected, Engineered, Implemented, Benchmarked, Profiled, Deployed, Automated, Decoupled, Containerized, Scaled.*

---

## ⚖️ 5. Inviolable BCA Candidate Title Regulation

Both Roushan Kumar and Ayushi Raj are pursuing a **Bachelor of Computer Applications (BCA)** at Amity University Noida. Under Indian regulatory standards:
- **FORBIDDEN:** *Software Engineer, Backend Engineer, Systems Engineer, AI Engineer, Full Stack Engineer.*
- **PERMITTED & ENFORCED:** **Software Developer, Backend Developer, Systems Architect, Full-Stack Developer, AI Developer, Creator, Co-Developer, Builder.**
- Course titles in Virtual Simulations retain their formal course name (e.g. *"Software Engineering Virtual Simulation"*), but the candidate's personal title must always be **Developer** or **Architect**.

---

## 🧪 6. ATS Parseability Validation Checklist

Before declaring any resume update complete:
- [ ] Sheet fits 100% within 297mm height with no vertical scrollbar or page 2 spill.
- [ ] Education section and Relevant Coursework bullet sit at least 15mm above the bottom edge.
- [ ] Technical Skills bullet dots are visible and wrapped text forms a clean hanging indent.
- [ ] Project links (`Live Demo | GitHub`) sit on a single horizontal line pinned to the top-right.
- [ ] Candidate titles strictly use "Developer" or "Architect" (0 occurrences of "Engineer").
- [ ] Run `npx vitest run tests/resume_optimizer.test.ts`.
