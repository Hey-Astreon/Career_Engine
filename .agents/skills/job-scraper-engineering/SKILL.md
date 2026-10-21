---
name: job-scraper-engineering
description: >-
  Architectural laws, multi-engine scraping strategies (Playwright, Puppeteer, Selenium, direct API extraction),
  deduplication hashes, 48-hour rolling freshness, and circuit breakers for AstreWork's ingestion engine
  (src/lib/providers/). Use whenever building scrapers, debugging rate limits, fixing schema drift, or optimizing sync times.
---

# 🕷️ The Engineering of Job Scrapers: Laws, Resilience & Circuit Breakers

This skill codifies the architectural rules, deduplication mathematics, anti-bot bypass protocols, and database ingestion safeguards for AstreWork's job harvesting pipelines (`src/lib/providers/` and `.github/workflows/job-sync.yml`).

---

## 🏛️ 1. The Multi-Engine Scraping Hierarchy

Job sources present radically different anti-bot measures, dynamic hydration models, and API surfaces. We employ a strict priority hierarchy:

```
[Level 1: Private Internal API] --> (Preferred: 0 headless overhead, JSON payload)
         |
         v (If internal API is locked or obfuscated)
[Level 2: Lightweight HTTP / Cheerio] --> (Fast: fetch with spoofed UA & headers)
         |
         v (If heavily CSR hydrated / React SPA)
[Level 3: Headless Playwright / Puppeteer] --> (Full DOM execution, wait for selector)
         |
         v (If strict Enterprise Cloudflare / Akamai / Datadome)
[Level 4: Stealthed Automation / Selenium] --> (CDP evasions, randomized human delays)
```

### Engine Selection Rules
1. **Never use a browser where an HTTP fetch works:** Headless browsers consume ~250MB RAM per instance. If a platform exposes a mini-site or mobile API (e.g., `POST /swan/mini-sites/list` or GraphQL endpoint), reverse engineer the network request.
2. **Playwright Execution Bounds:** Always cap headless browser executions at `timeoutMs: 45000` with hard cleanup in `finally { await browser.close(); }` to prevent zombie Chromium instances from leaking memory on OCI VMs.
3. **User-Agent Spoofing:** Rotate modern Chrome desktop user-agents (`Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36...`) and maintain coherent `sec-ch-ua` headers.

---

## 🔄 2. Ingestion Pipeline & Deduplication Mathematics

Duplicate job postings and ghost listings pollute candidate recommendations. The ingestion engine enforces strict canonical normalization.

### Deduplication Hash Pipeline (`src/lib/providers/dedup.ts`)
1. **URL Normalization (`generateUrlHash`):**
   - Strip all tracking parameters (`utm_source`, `utm_medium`, `ref`, `gh_src`, `lever-source`).
   - Standardize protocol to lowercase `https://`.
   - Strip trailing slashes and hash anchors.
   - Compute SHA-256 hash of the canonical URL.
2. **Semantic Tuple Key (`computeDeduplicationKey`):**
   - If an employer posts the exact same role across 3 job boards with different tracking URLs:
   - Tuple: `slugify(companyName) + "::" + slugify(cleanTitle) + "::" + locationScope`
   - Example: `stripe::software-developer-backend::remote-us`
   - If a duplicate tuple appears within a 14-day window, mark as alternate occurrence rather than creating duplicate records.

---

## ⏳ 3. Freshness & The 48-Hour Rolling Window

Stale job postings destroy user trust. AstreWork enforces rigid time-decay thresholds:

```ts
export const STALE_OCCURRENCE_THRESHOLD_HOURS = 48;
export const MAX_POSTING_AGE_DAYS = 30;
```

### The Ingestion State Machine
- **Brand New Posting (< 24h old):** Scored with an Early-Bird multiplier (+15 points in match algorithm).
- **Active Posting (Seen within 48h):** `isActive = true`, `lastSeenAt = now()`.
- **Vanished Posting (Missing from 2 consecutive sync runs / > 48h):** Transitioned to `isActive = false` or marked as closed. Do not show on default dashboard feed.
- **Provider Sync State Upsert:** Every sync run updates `db.providerSyncState` with `lastSyncAt`, `durationMs`, `jobsDiscovered`, and `jobsRejected`.

---

## 🛑 4. Circuit Breakers & Self-Healing Guards

Automated scrapers inevitably face network partitions, CAPTCHAs, and provider HTML redesigns.

### The Zero-Discovery Circuit Breaker
If a previously reliable provider returns `jobsDiscovered === 0` or fails with status `5xx`:
1. **Do NOT wipe existing database records:** A failed scrape run must never purge existing active jobs from that provider.
2. **Consecutive Failure Trip:** If a provider fails 3 consecutive runs, automatically disable provider in `db.providerSyncState` and emit a high-priority diagnostic alert.
3. **Execution Isolation (`Promise.allSettled`):** In `runAllProviders()`, one catastrophic scraper failure (e.g. fatal Puppeteer crash) MUST NEVER bring down or abort the other 12 providers.
4. **Tuple Locks Mutex:** Prevent concurrent cron runs from overlapping and causing database deadlock in Turso LibSQL:
   ```ts
   if (isSyncRunning) {
     console.warn("Sync already in progress. Aborting overlapping run.");
     return;
   }
   ```

---

## 📋 5. Provider Quality Assurance Checklist

Before shipping a new provider in `src/lib/providers/`:
1. [ ] Does the provider implement the standard `JobSourceProvider` interface (`providerKey`, `fetch()`, `timeoutMs`)?
2. [ ] Are all raw strings sanitized (HTML tags stripped, entities decoded)?
3. [ ] Is `parseRemoteScope()` applied to accurately classify Remote vs Hybrid vs On-site?
4. [ ] Does the provider handle HTTP 429 (Too Many Requests) with exponential backoff rather than immediate aggressive retry?
5. [ ] Is timeout bounded by `Promise.race` with an explicit cancellation timer?
