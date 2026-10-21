# Project Interview Kit: AstreWork (Career Engine & AstrePilot)

## 📌 Project Overview
- **Name:** AstreWork — Autonomous Career Intelligence Engine & Distributed Harvester
- **Role:** Creator & Lead Backend Developer
- **Live URL:** https://astrework.app | https://agent.astrework.app
- **Repository:** https://github.com/Hey-Astreon/Career_Engine
- **Stack:** Next.js 16, TypeScript, Python 3.11, Playwright, Puppeteer, Selenium, Turso LibSQL, Redis 7, Oracle Cloud (OCI Ampere ARM64), Docker, Caddy (HTTP/3 QUIC).

---

## 🏛️ System Architecture Deep Dive
1. **Distributed Multi-Engine Harvester (`src/lib/providers/`):**
   - Ingests opportunities across 13 active remote providers (LinkedIn, Simplify, Himalayas, Jobicy, BuiltIn, HackerNews, Ashby, LFX, NoDesk, InternList via JobRight API, Astra, Wellfound, Jobright).
   - Enforces a strict multi-engine hierarchy: Direct Internal Mini-Site API -> Lightweight HTTP -> Playwright / Puppeteer -> Stealth Selenium.
   - Enforces `STALE_OCCURRENCE_THRESHOLD_HOURS = 48` rolling freshness window. Zero-discovery circuit breaker (`jobsDiscovered === 0`) prevents transient scraper failures from purging active jobs.
2. **Distributed Persistence & Concurrency:**
   - Turso Cloud LibSQL (distributed SQLite with Write-Ahead Logging) eliminates write contention across concurrent cron jobs and web clients.
   - In-memory `tupleLocks` mutex prevents race conditions on canonical tuple keys (`slugify(company)::slugify(title)::location`).
3. **Cloud Infrastructure & High Availability:**
   - Dedicated Oracle Cloud Infrastructure (OCI Always-Free Ampere A1 ARM64 VM: 4 OCPUs, 24GB RAM, Mumbai region).
   - Docker container isolation (`astrepilot_web`, `astrework_agent`, `astrework_redis`).
   - Caddy reverse proxy providing automated Let's Encrypt TLS issuance, HTTP/3 (QUIC) enablement, and enterprise security headers.
   - Watchtower continuous deployment daemon polling every 60s with automatic dangling image cleanup (`--cleanup`).

---

## 🎯 Common Interview Questions & Answers

### Q1: "Walk me through how you handle anti-bot measures and scraper rate-limiting in AstreWork."
**Answer:**
> "In AstreWork, we ingest over 14,000 opportunities daily across 13 platforms. Rather than relying solely on heavy headless browsers that consume ~250MB per instance, we reverse engineer private internal APIs wherever possible—such as JobRight's embedded mini-site JSON endpoints (`/swan/mini-sites/list`), which reduced batch latency from 12 seconds to ~300ms with zero bot challenges. When headless execution is mandatory, we run Playwright Chromium instances bounded by strict `timeoutMs: 45000` wrappers with explicit `finally { await browser.close(); }` cleanup to prevent zombie processes on our OCI ARM64 VM. For rate limiting, we use exponential backoff with jitter and isolate provider executions with `Promise.allSettled`, guaranteeing that a rate limit or DOM shift on one platform never halts discovery across the other 12."

### Q2: "How do you guarantee single-page A4 resume compliance in your ATS engine?"
**Answer:**
> "Standard web pages scroll infinitely, but physical resumes face an unyielding 297mm A4 ceiling. If a candidate adds an extra technical skill or verbose bullet, it often pushes the Education section onto an ugly second page. In AstreWork, we engineered an exact 60-point space budget: reducing container padding to 6.0mm top / 5.0mm bottom (saving ~28pt), tightening section dividers (`<hr />`) to 1.5pt margins, and enforcing a two-column hanging indent flexbox gutter (`10pt` bullet column + `flex: 1` content column) so wrapped lines wrap parallel to the category title without sliding under the bullet point. Finally, we enforce the Google XYZ formula to keep achievement bullets condensed to 20–25 words without sacrificing quantified impact."
