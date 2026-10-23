---
name: form-tracker-pipeline
description: >-
  System design, 2-stage state machines (autofill draft vs. human-in-the-loop submission confirmation),
  canonical URL deduplication, 4-in-1 spreadsheet export engine (CSV with UTF-8 BOM, styled Excel XML, semantic XML, TSV),
  and high-density Tier-1 workspace layout standards for the AstreWork Application Pipeline & AstrePilot Tracker
  (src/app/(workspace)/applications/, src/lib/exportEngine.ts, src/app/api/applications/, src/app/api/autopilot/).
  Use whenever modifying application tracking, export routines, submission confirmation states, or tracker UI.
---

# 📋 Application Pipeline & AstrePilot Form Tracker Architecture

This skill defines the end-to-end technical architecture, 2-stage state machine, canonical URL deduplication, multi-format spreadsheet export engine, and Tier-1 UI ergonomics for tracking remote job applications and AstrePilot form submissions across AstreWork (`src/app/(workspace)/applications/`, `src/lib/exportEngine.ts`, `src/app/api/applications/`, and `src/app/api/autopilot/`).

---

## 🏛️ 1. System Topology & Data Flow

The tracker bridges client-side browser automation with persistent server-side candidate intelligence:

```
+-----------------------------------------------------------------------------------+
| 🛸 AstrePilot Browser Extension (Client-Side Actuator)                             |
|  • Injects into ATS job application form (Workday, Greenhouse, Lever, etc.)       |
|  • Executes autofill using candidate context                                      |
|  • Dispatches telemetry event -> POST /api/autopilot/log                          |
|  • Renders inline confirmation button -> "[ 🎉 Mark as Submitted ]"               |
|  • On user click -> POST /api/autopilot/confirm                                   |
+------------------------------------------^----------------------------------------+
                                           | HTTP JSON Telemetry
+------------------------------------------v----------------------------------------+
| ⚙️ AstreWork Backend API Layer                                                    |
|  • /api/autopilot/log      -> Canonical deduplication & draft upsert (confirmed=0)|
|  • /api/autopilot/confirm  -> Human-in-the-loop submission timestamp (confirmed=1)|
|  • /api/applications       -> Enriched pipeline query with daysSilent computation |
|  • /api/applications/export-> 4-in-1 Universal Spreadsheet Generation Engine      |
+------------------------------------------^----------------------------------------+
                                           | Prisma 7 Client (@prisma/adapter-libsql)
+------------------------------------------v----------------------------------------+
| 💾 Persistent Storage (SQLite / Turso Distributed WAL)                            |
|  • Table: db.application                                                          |
|    - id, profileId, company, title, status, appliedAt, canonicalUrl, source       |
|    - confirmed (Boolean: 0=Draft Autofill, 1=Officially Submitted)                |
|    - fieldsFilled, fieldsTotal, hasAiAnswers, resumeVariantName, atsScore         |
+------------------------------------------^----------------------------------------+
                                           | Real-time React Query / Fetch
+------------------------------------------v----------------------------------------+
| 🖥️ AstreWork Workspace Tracker UI (/applications)                                |
|  • Segmented 5-Cell Telemetry Strip (Total, AstrePilot, In-Flight, Quiet, Offers) |
|  • Detailed Table Report (Spreadsheet precision, 24px avatars, interactive stages)|
|  • Visual Kanban Pipeline (Status columns, drag-and-drop / select transitions)    |
|  • Follow-up Studio (AI email generation for applications silent >= 5 days)       |
+-----------------------------------------------------------------------------------+
```

---

## ⚡ 2. The 2-Stage State Machine Invariant

### The Core Problem: "Form Filled" vs. "Form Submitted"
In browser automation, filling input fields is strictly distinct from submitting the form:
1. An ATS might have multiple multi-page steps (e.g., "Personal Info" $\rightarrow$ "Experience" $\rightarrow$ "Review" $\rightarrow$ "Submit").
2. The user might abort, close the tab, or change their mind after fields are filled.
3. Automatically marking a filled form as officially submitted creates phantom applications.
4. Conversely, waiting only for final submission can cause complete data loss if the tab crashes.

### The Two-Stage Solution
```
Stage 1: [Autofill Complete]
  │
  ├──> AstrePilot logs immediately via POST /api/autopilot/log
  ├──> Database stores: status = "APPLIED", confirmed = false
  └──> UI renders amber tag: [⚡ AstrePilot (Pending Review)] with [✓ Confirm] button
        │
Stage 2: [Human Confirmation]
  ├──> Option A: User clicks "[ 🎉 Mark as Submitted ]" in the AstrePilot HUD
  └──> Option B: User clicks "[ ✓ Confirm ]" in the AstreWork Table Report
        │
        └──> Calls POST /api/autopilot/confirm
        └──> Database updates: confirmed = true, status = "APPLIED"
```

---

## 🔒 3. Canonical URL Normalization & Deduplication Engine

ATS URLs frequently append dynamic tracking, referral, and session parameters that cause artificial duplicate records:
- `https://boards.greenhouse.io/stripe/jobs/12345?gh_src=linkedin&utm_source=feed`
- `https://boards.greenhouse.io/stripe/jobs/12345#app`
- `https://boards.greenhouse.io/stripe/jobs/12345?ref=newsletter`

### Canonical Normalizer (`src/lib/exportEngine.ts`)
```ts
export function normalizeApplicationUrl(rawUrl: string): string {
  if (!rawUrl || typeof rawUrl !== "string") return "";
  try {
    const url = new URL(rawUrl.trim());
    // Strip ephemeral hash anchors
    url.hash = "";
    
    // Tracking parameters to scrub
    const trackingParams = [
      "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
      "gh_src", "gh_jid", "lever-source", "lever-origin", "ref", "source",
      "fbclid", "gclid", "token", "session_id", "s"
    ];
    for (const param of trackingParams) {
      url.searchParams.delete(param);
    }
    
    // Clean trailing slashes
    let cleaned = url.toString();
    if (cleaned.endsWith("/") && url.pathname !== "/") {
      cleaned = cleaned.slice(0, -1);
    }
    return cleaned;
  } catch {
    return rawUrl.trim();
  }
}
```

### Multi-Signal Deduplication Key
When an autofill event occurs, the server checks:
1. Matching `(profileId, canonicalUrl)` where `canonicalUrl` is normalized.
2. Fallback matching `(profileId, company, title)` within a 48-hour window.
3. If an existing record exists, it updates telemetry (`fieldsFilled`, `atsScore`, `lastActive`) rather than inserting a duplicate row.

---

## 📊 4. The 4-in-1 Universal Spreadsheet Export Suite

Candidates and career advisors must be able to export their application tracker data into spreadsheets seamlessly without broken accents, formula injection vulnerabilities, or unformatted text blocks.

### 1. Universal CSV (`.csv`) with UTF-8 BOM & Formula Shield
- **Encoding:** Starts with `\uFEFF` (Byte Order Mark) so Microsoft Excel, Apple Numbers, and LibreOffice instantly recognize UTF-8 characters without broken glyphs.
- **Formula Injection Shield:** Any cell starting with `=, +, -, @` is prepended with `'` to neutralize executable spreadsheet macros.
- **RFC 4180 Escaping:** Wraps fields with double quotes if they contain commas, line breaks, or quotes.

### 2. Pre-Styled Microsoft Excel XML 2003 (`.xls` / SpreadsheetML)
- Requires zero heavy npm dependencies (no bloated xlsx packages).
- Renders native Microsoft Excel XML with:
  - AstreWork Navy header style (`#0071E3`), bold white font, center alignment.
  - Alternating zebra row shading (`#F8FAFC`).
  - Defined column widths (Sl No, Company, Title, Date, Form Link, Status, Days Silent).
  - Native `<ss:Comment>` cell metadata and clickable `<ss:HRef>` hyperlinks.

### 3. Semantic XML (`.xml`)
- High-structure data feed for programmatic downstream consumption.
- Fully typed XML elements with ISO 8601 timestamps and numeric metrics.

### 4. 1-Click Clipboard TSV (Tab-Separated Values)
- Generated on the fly and copied directly to the candidate's clipboard.
- Allows immediate `Ctrl+V` pasting into Google Sheets or active Excel workbooks with perfect row-and-column alignment.

---

## 🎨 5. Tier-1 Typography & Layout Standards (`applications/page.tsx`)

The Application Pipeline workspace enforces strict visual balance and high-density typography to maintain the Tier-1 Linear/Apple aesthetic:

### Typography Scale
| Element | Font & Weight | Size | Tracking | Semantic Color |
| :--- | :--- | :--- | :--- | :--- |
| **Eyebrow** | `font-mono`, 700 Bold | `9px` | `tracking-[.12em]` | `var(--blue)` |
| **Workspace Title** | `font-display`, 750 Bold | `22px–24px` | `tracking-[-.045em]` | `var(--ink)` |
| **Metric Micro-Eyebrow** | `font-mono`, 700 Bold | `8px` | `tracking-[.12em]` | `var(--muted)` |
| **Metric Number** | `font-display`, 750 Bold | `22px` | `tracking-[-.05em]` | `var(--ink)` |
| **Metric Subnote** | Inter, 400 Regular | `9px` | Normal | `var(--muted)` |
| **Filter Tab Pill** | Inter, 600 SemiBold | `11px` | Normal | Active: `#fff` / Inactive: `var(--ink)` |
| **Table Header (`thead`)** | `font-mono`, 700 Bold | `8px` | `tracking-[.12em]` | `var(--muted)` |
| **Table Body Cell** | Inter, 500 Medium | `11px–12px` | `tracking-[-.015em]` | `var(--ink)` |
| **Days Silent Chip** | `font-mono`, 700 Bold | `8px` | `tracking-[.03em]` | Normal: `var(--muted)` / Silent: `var(--amber)` |

### Architectural Layout Rules
1. **Never use isolated rainbow borders** (`border-blue-200`, `border-amber-200`) on dashboard KPI cards. Authority is achieved through a **unified 5-segment continuous bar** (`grid grid-cols-2 sm:grid-cols-5 divide-x divide-[var(--line)] border border-[var(--line)] rounded-lg bg-[var(--surface)]`).
2. **Never exceed 9px on uppercase tracking labels.** Any uppercase text at 10px or larger feels like shouting and disrupts visual hierarchy.
3. **Pills over Box Buttons:** Use `rounded-full px-3 py-1 text-[11px] font-medium` for quick filters.
4. **Zero Layout Shift Empty State:** The empty state must be compact (`py-14 px-6`), centered, with a soft 32px circular icon badge (`w-8 h-8 rounded-full bg-[var(--blue-soft)] text-[var(--blue)]`), avoiding giant gaping white boxes.

---

## ⏱️ 6. Days Silent Engine & Follow-up Studio

### Quiet Attention Threshold
```ts
const daysSilent = Math.max(0, Math.floor((Date.now() - new Date(app.appliedDate).getTime()) / 86400000));
const isNeedsAttention = app.status === "QUIET" || (app.status === "APPLIED" && daysSilent >= 5);
```
- If an application reaches $\ge 5$ days with no recruiter response, the tracker automatically elevates it to **Quiet Attention** (`ce-chip-amber`).
- Surfaces a 1-click **`[ ⚡ Nudge ]`** action button.

### Multi-Tone Follow-up Studio
Clicking follow-up opens the `.ce-drawer-backdrop` studio providing 3 calibrated tones:
1. **Gentle Nudge (`nudge`):** Friendly 1-week check-in confirming application receipt and re-affirming enthusiasm.
2. **Project Update (`project_update`):** Value-add email highlighting a newly shipped feature, open-source commit, or portfolio demo relevant to the role.
3. **Internal Referral Inquiry (`referral`):** Professional inquiry formulated for reaching out to team leads or internal developers on LinkedIn.
- Output features 1-click **Copy Full Draft** and **Open in Email App (`mailto:`)** with pre-encoded subject and body.

---

## 🔒 7. Multi-Tenant Privacy & Compliance Invariants

1. **Dual Founder Access Rule:** Only `playboxstation460@gmail.com` and `ayushi29507@gmail.com` can view and switch between Roushan and Ayushi application pipelines.
2. **Third-Party Isolation:** Any third-party user only ever sees and exports their own tracked applications (`profile.userId === session.user.id`). All `/api/applications/*` endpoints enforce `403 Forbidden` for unauthorized third-party cross-profile queries.
3. **BCA Candidate Title Law:** Master profiles and tracked applications strictly enforce Developer titles (**Software Developer**, **Full-Stack Developer**, **Backend Developer**, **Systems Architect**, **AI Developer**). The title "Engineer" is strictly prohibited under Amity University BCA compliance.
