---
name: ai-agent-automation
description: >-
  The 4 specialized AI agents, multi-provider LLM routing cascade (Groq, Gemini, Cerebras, NVIDIA NIM),
  two-stage scoring latency optimization, and anti-hallucination guardrails for AstreWork (src/lib/ai/).
  Use whenever modifying AI prompt templates, LLM routing, resume tailoring models, or scoring algorithms.
---

# 🤖 The 4 AI Agents: Specialization, Routing & Automation Mastery

This skill defines the autonomous multi-agent architecture powering AstreWork (`src/lib/ai/router.ts`, `src/lib/ai/scorer.ts`, `src/lib/ai/tailorer.ts`, and `src/lib/ai/astreShield.ts`).

---

## 👥 1. The 4 Specialized AI Agents

AstreWork rejects monolithic AI prompts. Intelligence is partitioned into 4 distinct, highly specialized agents:

```
                          [Astrewave Master Orchestrator]
                                         |
     +-------------------+---------------+-------------------+-------------------+
     |                   |                                   |                   |
     v                   v                                   v                   v
[1. Opportunity]   [2. AstreShield]                   [3. Resume Tailoring] [4. Astrepilot]
[    Sentry    ]   [   Guardian   ]                   [      Engine       ] [   Copilot   ]
(Harvest & Parse)  (Detect Scam/Ghost)                (ATS Match & XYZ)     (Extension Autofill)
```

### Agent Roster & Missions
1. **Opportunity Sentry (Ingestion Intelligence):**
   - Extracts structured metadata from unstructured job descriptions (salary bands, remote eligibility, seniority levels, required stack).
   - Flags early-bird postings within minutes of appearance.
2. **AstreShield Guardian (Fraud & Scam Interceptor):**
   - Protects job seekers by analyzing employer reputation, recruitment fraud patterns (WhatsApp, Telegram, check scams, crypto, paid training).
   - Evaluates ghost postings (open > 90 days with no hiring intent).
3. **Resume Tailoring Engine (ATS Optimizer):**
   - Re-balances resume keywords against specific Job Descriptions.
   - Enforces the Google XYZ formula (`Accomplished [X] as measured by [Y] by doing [Z]`).
   - Strictly preserves candidate truth without hallucinating experiences or skills.
4. **Astrepilot Copilot (Browser Autopilot):**
   - Operates inside the Chrome extension (`extension/content.js`).
   - Maps candidate profiles to complex multi-step ATS application forms (Workday, Greenhouse, Lever, Taleo, Ashby) with 100% human-in-the-loop auditability.

---

## ⚡ 2. Universal Multi-Provider Routing Cascade (`src/lib/ai/router.ts`)

To guarantee zero-downtime, sub-second latency, and resilience against API provider rate limits, AstreWork executes an automatic failover cascade:

```
[1. Groq: openai/gpt-oss-120b] (500+ tokens/sec, ultra-fast 0.3s response)
              |  (On timeout / rate limit / missing key)
              v
[2. Google Gemini: gemini-3.8-flash] (1M token context, deep reasoning)
              |  (On failover)
              v
[3. Cerebras: qwen-3.8-27b] (High-throughput open weights)
              |  (On failover)
              v
[4. NVIDIA NIM: meta/llama-4-maverick] (Enterprise cloud inference)
              |  (On complete network partition)
              v
[5. Local Heuristic Fallback] (Regex extraction, TF-IDF keyword overlap, 0 cost)
```

### Routing Parameters
- **Temperature:** Hardcoded to `0.2` across all models to minimize variance and guarantee deterministic JSON schemas.
- **Timeout Limits:** Groq: `8,000ms`, Gemini: `12,000ms`, Cerebras: `8,000ms`, NVIDIA: `10,000ms`.
- **Response Format:** Enforce `{ type: "json_object" }` on capable providers.

---

## 🏎️ 3. Two-Stage Latency Optimization (0ms Base Scoring)

Calling an LLM on 2,000 incoming jobs per hour would cost thousands of dollars and introduce seconds of latency. We use a two-stage filter:

### Stage 1: Deterministic Base Match (0ms Latency, $0 Cost)
- Runs locally in Node.js runtime.
- Computes exact keyword intersection between Candidate Skills and Job Requirements.
- Evaluates hard constraints: Experience years, Location / Remote Scope, Minimum Salary requirement.
- Jobs scoring `< 45%` in Stage 1 are immediately shelved without LLM invocation.

### Stage 2: Composite Semantic Scoring (LLM Enhanced)
- Only triggered for jobs passing Stage 1 threshold or when a candidate clicks into the JobDrawer.
- Evaluates conceptual alignment, project domain relevance, and architectural depth.
- Returns comprehensive feedback: `strengths`, `gaps`, `customPitch`, and `tailoredScore`.

---

## 🛡️ 4. Anti-Hallucination & JSON Hygiene

Large language models frequently wrap responses in markdown or inject imagined credentials.

### The `cleanJsonResponse` Rule
Never pass raw LLM text into `JSON.parse()`. Always pipe through `cleanJsonResponse()`:
```ts
function cleanJsonResponse(rawText: string): string {
  if (!rawText) return "";
  let text = rawText.trim();
  if (text.startsWith("```")) {
    text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  }
  return text;
}
```

### The Candidate Truth Invariant
Prompts must contain this non-negotiable instruction:
> *"You are an expert resume optimizer. You must NEVER invent, fabricate, or hallucinate companies, degrees, tools, or metrics not present in the candidate's master profile. You may rephrase, quantify, and elevate existing achievements, but all facts must remain 100% grounded in truth."*
