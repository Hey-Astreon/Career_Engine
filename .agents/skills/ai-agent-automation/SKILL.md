---
name: ai-agent-automation
description: >-
  The 4 specialized AI agents, multi-provider LLM routing cascade (Groq, Gemini, Cerebras, NVIDIA NIM),
  two-stage deterministic + semantic scoring (scorer.ts, batchScorer.ts), resume tailoring & skill front-loading
  (resumeOptimizer.ts), cover letter/outreach drafting (drafter.ts), anti-AI slop sanitization, and the 4-tier
  AstreShield fraud & ghost-job detection pipeline (astreShield.ts, astreShield.dict.ts) for AstreWork (src/lib/ai/).
---

# 🤖 AI Agent Automation, Two-Stage Scoring & AstreShield Fraud Detection Mastery

This unified skill governs the entire `src/lib/ai/` intelligence layer: multi-LLM failover routing (`router.ts`), 2-stage ATS scoring (`scorer.ts`, `batchScorer.ts`), semantic resume optimization (`resumeOptimizer.ts`), cover letter & outreach drafting (`drafter.ts`, `outreachGenerator.ts`), screener Q&A (`screeningHelper.ts`), and 4-tier fraud/ghost-job interception (`astreShield.ts`, `astreShield.dict.ts`).

---

## 👥 PART 1: THE 4 SPECIALIZED AI AGENTS & MULTI-LLM ROUTING CASCADE

AstreWork partitions intelligence into 4 specialized agents backed by a 5-stage automatic failover cascade (`src/lib/ai/router.ts`):

```
[1. Groq: openai/gpt-oss-120b] ---------> (500+ tokens/sec, ~0.3s latency, 8,000ms timeout)
              |
              v (On rate limit / timeout / missing key)
[2. Google Gemini: gemini-3.8-flash] ---> (1M token context, deep reasoning, 12,000ms timeout)
              |
              v (On failover)
[3. Cerebras: qwen-3.8-27b] ------------> (Wafer-scale inference, 8,000ms timeout)
              |
              v (On failover)
[4. NVIDIA NIM: meta/llama-4-maverick] -> (Enterprise cloud fallback, 10,000ms timeout)
              |
              v (On complete network partition / offline mode)
[5. Local Deterministic Fallback] ------> (0ms latency, $0 cost, candidate-aware heuristics)
```

- **Temperature:** `0.2` across all providers for deterministic JSON structure.
- **Mandatory JSON Sanitizer (`cleanJsonResponse`):** Always strip markdown code fences (` ```json ... ``` `) before calling `JSON.parse()`.

---

## 🏎️ PART 2: TWO-STAGE SCORING & TITLE/SKILL MATCHING (`scorer.ts` & `batchScorer.ts`)

### 1. Stage 1: Deterministic Base Match (0ms Latency, \$0 Cost)
- Computes exact keyword overlap against `TECH_DICTIONARY` (`src/lib/ai/scorer.ts`), which includes modern stack keywords (`playwright`, `puppeteer`, `selenium`, `prisma`, `turso`, `libsql`, `zustand`, `redux`, `monaco`, `vitest`, `typescript`, `react`, `nextjs`, `nodejs`, `python`, `csharp`, `docker`, `redis`, etc.).
- **Display Label Law:** Map `"ai"` to `"AI Development"` (never `"AI Engineering"`).
- **Hyphenated & Style B Title Matching Law (`calculateDeterministicSignals`):**
  - Candidate headlines use Style B formatting (`"Software Developer — Backend & Cloud"`, `"Software Developer — Full-Stack & AI"`).
  - Title alignment checks MUST match `/full[- ]?stack/i` (both `"full stack"` and `"full-stack"`), `cloud`, `ai`, `frontend`, and `backend` so matching roles receive the full `100` title alignment score instead of dropping to `65`.

### 2. Stage 2: Composite Semantic Scoring (LLM Enhanced)
- Triggered for high-affinity postings or when inspecting a job in the drawer/match studio, returning grounded `strengths`, `gaps`, `pitch`, and composite score.

---

## ✍️ PART 3: RESUME OPTIMIZER, DRAFTER & ANTI-SLOP LAWS (`resumeOptimizer.ts` & `drafter.ts`)

### 1. Anti-AI Slop Sanitization (`BANNED_AI_SLOP_REGEX`)
- `resumeOptimizer.ts` enforces `BANNED_AI_SLOP_REGEX` and `sanitizeAiSlop()`, banning and auto-replacing:
  - `utilize` / `utilizing` $\rightarrow$ `use` / `using`
  - `spearheaded` $\rightarrow$ `built` / `led`
  - `leveraged` / `leveraging` $\rightarrow$ `used` / `using`
  - `passionate` / `dynamic` / `synergized` / `testament` / `self-healing` (in project bullets).
- **Candidate-Aware Fallbacks (`generateDynamicOptimizedFallback`):** Checks `isAyushi` (`profile.slug === "ayushi"` or `/ayushi/i.test(profile.name)`) so offline fallback summaries and bullets preserve Ayushi Bhabhi's Full-Stack/UI/AstrePilot domain vs. Brother Roushan's Backend/Cloud/Scraper domain.
- **Skill Front-Loading:** In `generateDynamicOptimizedFallback`, matched job keywords present in a skill category's `skillsText` are sorted to the front of that comma-separated list (Positions 1–2) to maximize recruiter F-scan primacy.

### 2. Typographic Delimiter Resilience in Cover Letters (`drafter.ts`)
- Project titles use typographic em-dashes (`"AstreWork — Autonomous Career Discovery & Application Platform (OCI, Docker, Redis)"`).
- Always split project titles with `.split(/\s+[—–-]\s+/)[0].trim()` (never literal `.split(" - ")[0]`) so only the clean project name (`"AstreWork"`) is interpolated into cover letter prose.
- Never reference retired projects (`IDBI`, `FinSync`, `Axiom Gateway`, `Coco AI`) or prohibited `"Engineer"` candidate titles in `drafter.ts`, `outreachGenerator.ts`, or `screeningHelper.ts`.

---

## 🛡️ PART 4: ASTRESHIELD 4-TIER FRAUD & GHOST JOB DETECTION (`astreShield.ts` & `astreShield.dict.ts`)

```
[Job Posting Ingestion]
         │
         ▼
[Layer 1: Lexical Integrity] ------> (Typo density, Cyrillic/Greek homoglyphs, ALL CAPS abuse)
         │
         ▼
[Layer 2: Semantic Red Flags] -----> (PII harvesting, advance fee/check scams, crypto/MLM, @telegram/WhatsApp)
         │
         ▼
[Layer 3: Structural Credibility] -> (Trusted ATS domain bonuses vs. suspicious .xyz/.top TLDs & vague JDs)
         │
         ▼ (If borderline AMBER: 40–74)
[Layer 4: AI Intent Analysis] -----> (LLM deep contextual legitimacy audit)
         │
         ▼
[Final Trust Verdict: GREEN (75–100) | AMBER (40–74) | RED (< 40)]
```

### 1. The Asymmetric Cost Function & Two-Signal Corroboration Law
$$\text{Damage}(\text{False Red}) \gg \text{Damage}(\text{False Green})$$
- Flagging a legitimate employer as a scam (`False Red`) inflicts $10\times$ more career damage than a cautious `AMBER` warning.
- **The Two-Signal Law:** Every job starts at `100` Trust Points. A single signal from any single layer can **NEVER** produce a `RED` (`< 40`) verdict on its own; `RED` requires at least **2 independent corroborating signals** across patterns.

### 2. Ghost Job Heuristics & UI Transparency
- Detects zombie postings active `> 90 days`, repetitive re-posting cycles, and nebulous JDs with unrealistic salary spreads (`\$40k–\$240k`).
- Every `ShieldFlag` cites its exact `signalId`, `label`, `impact`, `layer`, and `evidence` snippet. `RED` cards are visually dimmed (`.shield-blocked-card`), never silently deleted.
