---
name: job-scraper-engineering
description: >-
  Architectural laws, 4-level multi-engine scraping strategies (Internal APIs, Cheerio HTTP, Playwright, Puppeteer, Selenium),
  SHA-256 URL & semantic tuple deduplication, 48-hour rolling freshness window, zero-discovery circuit breakers,
  and 13 active production providers for AstreWork (src/lib/providers/ & scripts/run-discovery-cli.ts).
---

# 🕷️ Job Scraper Engineering: Multi-Engine Harvesters, Deduplication & Circuit Breakers

This skill codifies the architectural rules, deduplication mathematics, title normalization laws, anti-bot bypass protocols, and database ingestion safeguards for AstreWork's job harvesting pipelines (`src/lib/providers/`, `scripts/run-discovery-cli.ts`, and `.github/workflows/job-sync.yml`).

---

## 🏛️ 1. The 4-Level Multi-Engine Scraping Hierarchy

```
[Level 1: Private Internal REST / GraphQL API] --> (Preferred: 0 headless overhead, structured JSON)
         |
         v (If internal API is locked)
[Level 2: Lightweight HTTP / Cheerio] -----------> (Fast fetch with rotated Chrome UA & sec-ch-ua headers)
         |
         v (If CSR hydrated / React SPA)
[Level 3: Headless Playwright / Puppeteer] ------> (Full DOM execution, 45s timeout, system Chromium on ARM64)
         |
         v (If strict Cloudflare / Datadome)
[Level 4: Stealthed Automation / Selenium] ------> (CDP evasions, randomized human delays)
```

### Engine Laws
1. **Never use a headless browser where an HTTP request works:** Headless Chromium consumes ~250MB RAM per instance. Always inspect network traffic for JSON/GraphQL endpoints first (e.g. `/swan/mini-sites/list`).
2. **ARM64 Chromium Compliance:** On Oracle Cloud Ampere ARM64, Puppeteer/Playwright must use system Chromium via `process.env.PUPPETEER_EXECUTABLE_PATH` and close browsers in `finally { await browser.close(); }` within `timeoutMs: 45000`.
3. **Deterministic Unit Tests:** Provider unit tests (`tests/*-provider.test.ts`) must mock external `axios` / `fetch` calls so the test suite passes 100% deterministically in offline sandboxed environments.

---

## 🌐 2. The 13 Active Production Providers (`src/lib/providers/registry.ts`)

| # | Provider Key (`PlatformSource`) | Source Name | Extraction Strategy |
| :-: | :--- | :--- | :--- |
| **1** | `LINKEDIN` | LinkedIn Jobs | Guest search endpoint with stealth User-Agent rotation. |
| **2** | `SIMPLIFY` | Simplify | Curated New Grad & Internship opportunity extractor. |
| **3** | `HIMALAYAS` | Himalayas | Direct JSON API parsing verified remote positions worldwide. |
| **4** | `JOBICY` | Jobicy | REST API query with remote developer tag filtering. |
| **5** | `BUILTIN` | BuiltIn | Venture-backed startup scraper with remote US/Global flags. |
| **6** | `HACKERNEWS` | Hacker News ("Who is hiring?") | Monthly community thread parser with regex contact & salary extraction. |
| **7** | `ASHBY` | Ashby ATS Directory | Multi-tenant ATS job board scanner targeting developer roles. |
| **8** | `LFX_MENTORSHIP` | Linux Foundation (LFX) | Open-source mentorship internship harvester with stipend tracking. |
| **9** | `NODESK` | NoDesk | Direct feed extractor filtering 100% remote software positions. |
| **10** | `INTERN_LIST` | Intern-List.com | High-speed batch queries against embedded mini-site API. |
| **11** | `ASTRA` | Astra Security / Dev | Remote cybersecurity and software developer stream harvester. |
| **12** | `WELLFOUND` | Wellfound (AngelList) | Startup remote opportunity harvester parsing equity & salary bands. |
| **13** | `JOBRIGHT` | JobRight AI Minisites | High-throughput JSON batch querying across remote engineering boards. |

---

## 🔄 3. Deduplication Mathematics & Normalization (`src/lib/providers/dedup.ts` & `normalize.ts`)

1. **Canonical URL Hash (`generateUrlHash`):**
   - Strips tracking parameters (`utm_source`, `utm_medium`, `ref`, `gh_src`, `lever-source`, `fbclid`, `gclid`), normalizes protocol to `https://`, removes trailing slashes/hashes, and computes SHA-256.
2. **Semantic Tuple Key (`computeDeduplicationKey`):**
   - `slugify(companyName) + "::" + slugify(cleanTitle) + "::" + locationScope` (e.g. `stripe::software-developer-backend::remote-us`).
   - Prevents duplicate listings when the same role is syndicated across multiple boards within a 14-day window.
3. **Title Colon-Truncation Rule (`sanitizeRoleTitle` in `normalize.ts`):**
   - Titles longer than 60 characters containing a colon (`:`) are truncated to the segment *after* the last colon to strip verbose prefix metadata. Ensure synthetic or scraped role titles place the core developer role keyword (`Software Developer`, `Backend Intern`, etc.) after the colon or use parentheses/hyphens if > 60 chars so `isStrictlyRemoteDeveloperRole` accepts them cleanly.

---

## ⏳ 4. The 48-Hour Rolling Freshness Window & Circuit Breakers

- **48-Hour Rolling Window (`STALE_OCCURRENCE_THRESHOLD_HOURS = 48`):** Jobs `< 24h` receive an Early-Bird match boost (`+15`). Jobs missing across sync runs for `> 48h` transition to `isActive = false`.
- **Zero-Discovery Circuit Breaker:** If a provider returns `jobsDiscovered === 0` or errors out, **freshness pruning for that provider is aborted completely**. Transient network blocks or DOM shifts must NEVER wipe active jobs from the database.
- **Fault Isolation (`Promise.allSettled`):** In `runAllProviders()`, a crash in one scraper never aborts the remaining 12 providers, and `isSyncRunning` / `tupleLocks` prevent overlapping cron write collisions.
