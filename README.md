<div align="center">

# ✨ AstreWork
### Autonomous Remote Career Intelligence & Application Operating System

[![Next.js 16](https://img.shields.io/badge/Next.js-16.3.0%20(Turbopack)-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React 19](https://img.shields.io/badge/React-19.0.0-blue?style=for-the-badge&logo=react)](https://react.dev/)
[![TypeScript 5.9](https://img.shields.io/badge/TypeScript-5.9%20(Strict)-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Prisma 7](https://img.shields.io/badge/Prisma-7%20(LibSQL)-2D3748?style=for-the-badge&logo=prisma)](https://www.prisma.io/)
[![Provider Health](https://img.shields.io/badge/Providers-19%2F19%20HEALTHY-brightgreen?style=for-the-badge)](https://astrework.app/api/sources/health)
[![Job Sync Engine](https://img.shields.io/badge/Job%20Sync-100%25%20PASSING-brightgreen?style=for-the-badge&logo=githubactions)](https://github.com/Hey-Astreon/Career_Engine/actions/workflows/job-sync.yml)
[![Live Production](https://img.shields.io/badge/Live%20Production-astrework.app-success?style=for-the-badge)](https://astrework.app)

**AstreWork** is an autonomous, high-density AI Career Operating System engineered to streamline remote job discovery, multi-signal deduplication, deep 2-stage fit scoring, tailored application kit generation, and background auto-sync scheduling.

🌐 **Live Production Deployment:** [https://astrework.app](https://astrework.app)

</div>

---

## 🌟 Core System Pillars

### 1. 🌐 21-Source Remote Discovery Pipeline (100% Operational)
A resilient, concurrent scraping engine executing via `Promise.allSettled()` with bounded watchdog timeouts and failure isolation across 21 global tech platforms:
- **Direct ATS Portals:** Greenhouse, Ashby, Lever, Recruitee, SmartRecruiters, Workable
- **Developer, Open Source & Student Fellowships:** Linux Foundation LFX Mentorship (CNCF), Simplify (Summer Internships & New Grad), HackerNews Who is Hiring, Arc.dev, BuiltIn, LinkedIn, Micro1
- **Curated Remote Boards:** NoDesk Remote, Himalayas, WeWorkRemotely, Jobicy, RemoteOK, Remotive, Arbeitnow, HiringCafe

### 2. 🎯 Match Studio & 2-Stage AI Scoring
- **Stage 1 (Deterministic Fast Filter):** Evaluates experience bounds, posting recency, and keyword overlap in **< 10ms** across entire feeds.
- **Stage 2 (Deep Composite Evaluation):** Analyzes role alignment, technical stack depth, and seniority fit using an ultra-fast multi-provider LLM router:
  - **Primary:** Groq (`openai/gpt-oss-120b`, ~500 tokens/sec JSON evaluation).
  - **Secondary:** Google Cloud Native Gemini (`gemini-3.8-flash`, 1M context GA).
  - **Fallbacks:** Cerebras (`qwen-3.8-27b`) & NVIDIA NIM (`meta/llama-4-maverick`).
- **Sub-5ms Caching:** Evaluated scores are persisted in LibSQL/SQLite for instant retrieval on subsequent visits.

### 3. 👤 Candidate Profile & Targeted Asset Synchronization
- **Candidate Profiles:** Seamlessly switch between **Roushan Kumar** and **Ayushi Raj** via the header `ProfileSwitcher`.
- **Locked Resume Variant Selector:** Maps job descriptions directly to specialized resume variants in candidate disk repositories (`2_Ayushi_Raj` & `3_Roushan_Kumar`):
  - AI Engineer / GenAI Specialist
  - AI Training & Benchmark Specialist (RLHF, Scale AI)
  - Backend & Systems Engineer (.NET, C#, Spring Boot, Java)
  - Full Stack Engineer (React, Next.js, Node.js)
  - Product Engineer & Startup Software Engineer
- **Empirical ATS Parseability:** Real-time PDF text layer extractability verification scoring 78,000+ characters directly from disk buffers (`isParseable: true`).
  - **1-Click PDF Variant Downloader & Previewer (`/api/resume/download`):**
    - High-speed streaming route handler with path traversal security (`path.basename()`), supporting inline viewing (`view=inline`) and direct download (`view=attachment`).
    - **Match Studio Integration:** 1-Click "Download Tailored PDF" button, "Preview PDF" button, and collapsible catalog explorer for all candidate variants.
    - **Quick Apply Toolkit:** Integrated tailored PDF card inside `QuickApplyDrawer` with dynamic variant pre-selection, instant download, and preview.

### 4. 🚀 AstrePilot (Autonomous Form Autofill & AI Injector)
- **Native Chrome Extension (Manifest V3):** Packaged browser extension featuring a clean light glass action popup, background service worker, automatic ATS portal detection badge (`boards.greenhouse.io`, `jobs.lever.co`, `myworkdayjobs.com`, `ashbyhq.com`, etc.), and global keyboard shortcut (`Alt+Shift+A`).
- **Shadow DOM HUD:** Draggable, collapsible overlay (full card ↔ pill) rendered in a closed Shadow DOM so host-page CSS cannot interfere. Shows real-time field classification and profile previews, with a working Settings shortcut to the AstreWork settings page. All dynamic text is HTML-escaped before rendering.
- **Zero-Hallucination AI Screening:** Automatically intercepts unknown `<textarea>` screening questions and queries the AstreWork multi-LLM backend (`/api/autopilot/answer`) to generate contextually accurate, non-hallucinated answers on the fly based on the active session's tailored resume.
- **1-Click ZIP Download & Distribution:** Built directly into the AstreWork workspace settings (`astrepilot-extension.zip`) with instant token generation.

### 5. 🔒 Enterprise-Grade API Security & Multi-Tenant Isolation
- **Pipeline Lockdown:** Complete session-based verification enforcing `CRON_SECRET` and `getServerSession` boundaries over expensive data sync and scrape pipeline triggers.
- **Strict Data Isolation:** All resume matching, kit generation, application tracking, and AI reasoning endpoints enforce strict `userId` alignment, eliminating cross-tenant spoofing and data leaks.
- **Ownership Checks (IDOR-safe):** Resume variant read/update/compare and follow-up draft routes require a session **and** verify the record belongs to the caller; non-owners receive `404` so IDs cannot be probed. Scheduler history and source health require login.
- **Safe Maintenance Scripts:** `cleanup_test_users.mjs` is a dry run by default and only deletes with `--confirm`.
  - **Resume Variants Sidebar:** Dual-tab workspace ("Locked PDFs" vs "Saved Drafts") with 1-click preview and download for all official disk variants.
  - **Complete Application Kit / Resume Builder:** Header modal providing full catalog inspection and instant downloads.

### 4. 📝 1-Click Application Kit & Outreach Suite
- Generates tailored application materials for every opportunity:
  - Role-targeted resume bullet point suggestions
  - Custom Cover Letters incorporating candidate STAR stories
  - Recruiter InMails & Cold Emails
  - Automated 5-day Follow-Up drafts
- Application status pipeline (Discovered → Shortlisted → Applied → Screening → Technical Round → Offer).

### 5. ⏰ Autonomous Background Sync Scheduler & Alert Engine
- **Autonomous GitHub Actions Runner (`.github/workflows/job-sync.yml`):** Runs on automated cron schedule `0 */3 * * *` (8 runs daily) and manual dispatch, directly executing `scripts/run-discovery-cli.ts` on dedicated Ubuntu VM runners with direct connection to Turso Cloud, completely decoupling heavy web scraping from cloud gateway timeouts.
- **DiscoveryScheduler & Concurrency:** Singleton engine with concurrent `BATCH_SIZE = 20` LibSQL insertion batches and non-blocking bulk freshness queries.
- **Telemetry:** Real-time provider health dashboard tracking per-endpoint latency, error codes, and insertion yields.
- **UI Integration:** Live pulse status indicators in the Sidebar and one-click "Enable Auto-Sync" / "Pause Sync" controls on the Dashboard.

### 6. 🤖 Google Antigravity Autonomous Agent Core (`python_agents/`)
Engineered with the official **Google Antigravity Python SDK (`google-antigravity`)**, running as high-autonomy background daemons:
- **AI Screening Question Oracle API (`oracle_service.py`):** Multi-step reasoning agent synthesizing candidate profiles, technical architectures, and JD requirements into grounded 2-4 sentence form answers. Exposed via `/api/autopilot/oracle` with resilient fallback to internal multi-provider LLM.
- **Self-Healing Scraper Daemon (`self_healer.py`):** Automatically detects scraper failures, parses broken response payloads, inspects live HTML DOM selectors, and drafts code patches for drifted job board schemas.
- **Autonomous Headless Form Applier (`headless_applier.py`):** Playwright-powered autonomous form fill engine with human-in-the-loop review-only mode and full-page visual screenshot verification audits (`scratch/`).
- **Deep Resume Tailorer & ATS Optimizer (`resume_tailorer.py`):** Generates high-impact STAR and Google X-Y-Z formula resume bullet points tailored to target job requirements.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | Next.js 16 (App Router + Turbopack), React 19, Tailwind CSS v4, Lucide Icons |
| **Backend** | Next.js Server Components, API Route Handlers, Node.js v26 |
| **Database & ORM**| LibSQL / SQLite (WAL mode), Prisma 7 (`@prisma/adapter-libsql`) |
| **AI / LLM** | Groq API, Google Gemini 2.5 Flash, Cerebras, NVIDIA NIM |
| **Autonomous Agents** | Google Antigravity Python SDK (`google-antigravity`), FastAPI, Playwright, Pydantic |
| **State Management**| Zustand, React Context, SWR / Fetch |
| **PDF & Document Parsing**| Native binary text extraction, PDF-Parse, Cheerio |

---

## 🚀 Quick Start Runbook

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/Hey-Astreon/Career_Engine.git
cd Career_Engine/1_RCMS
npm install
```

### 2. Environment Configuration
Create a `.env` file in `1_RCMS`:
```env
DATABASE_URL="file:./prisma/dev.db"
NEXTAUTH_SECRET="your-nextauth-secret"
NEXTAUTH_URL="http://localhost:3000"

# AI Provider Keys
GROQ_API_KEY="your-groq-api-key"
GEMINI_API_KEY="your-gemini-api-key"
NVIDIA_NIM_API_KEY="your-nvidia-nim-api-key"
CEREBRAS_API_KEY="your-cerebras-api-key"
```

### 3. Initialize Database & Seed Profiles
```bash
npx prisma db push --skip-generate
npx tsx prisma/seed.ts
```

### 4. Launch Development Server
```bash
npm run dev
# Or execute ./launch.bat on Windows
```
Visit **[http://localhost:3000](http://localhost:3000)** in your browser.

### 5. Launch Google Antigravity Agent Core
The autonomous Python agents run in an isolated environment (`python_agents/.venv`) on Python 3.12+:
```bash
# Setup Python virtualenv and install dependencies
cd python_agents
python -m venv .venv
# Windows: .venv\Scripts\activate | Unix: source .venv/bin/activate
pip install -r requirements.txt
playwright install chromium
cd ..

# Start the Agent Gateway daemon (FastAPI on port 8000)
npm run agent:gateway

# Or trigger standalone autonomous agent tasks:
npm run agent:heal ASTRA          # Diagnose/heal broken scraper selectors
npm run agent:apply -- <URL>      # Run headless Playwright form applier (review-only)
npm run agent:tailor              # Generate STAR/Google X-Y-Z tailored resume bullets

# Deploy Agent Core to Cloud (Heroku Container via GitHub Student Credits):
npm run deploy:agent:heroku
```

### 6. Production Validation & Testing
```bash
# Run unit & integration test suite (30 test files / 317 tests)
npm test

# Typecheck
npx tsc --noEmit

# Production Build (Turbopack)
npm run build
```

---

## ☁️ Autonomous Production Deployment (LIVE)

AstreWork is officially live in production at **[https://astrework.app](https://astrework.app)** running on Oracle Cloud Always-Free ARM Ampere A1 (4 OCPUs, 24 GB RAM) with Caddy reverse proxy (automated Let's Encrypt SSL/TLS & HTTP/3), Turso LibSQL Cloud, and automated Watchtower continuous deployment.

### 1. Production Architecture
- **Dedicated Hardware:** Oracle Cloud `VM.Standard.A1.Flex` (4 ARM64 OCPUs, 24 GB RAM in Mumbai `ap-mumbai-1`)
- **Reverse Proxy & SSL:** Caddy (`caddy:alpine`) with automatic HTTPS & TLS-ALPN-01 certificates for `astrework.app` and `agent.astrework.app`
- **Container Mesh (`docker-compose.prod.yml`):**
  - `astrepilot_web`: Next.js 16 standalone web application (:3000)
  - `astrework_agent`: Antigravity Python Agent Core gateway (:8000)
  - `astrework_redis`: Redis 7 LRU cache
  - `caddy`: Dual reverse proxy & automated TLS
  - `watchtower`: Continuous deployment watcher auto-reloading containers on new GHCR image pushes
- **CD Automation:** GitHub Actions ARM64 buildx pushes both `career_engine:latest` and `career_engine-agent:latest` to GHCR on `git push origin main`
- **Live Production URLs:**
  - Web Application: [https://astrework.app](https://astrework.app)
  - Antigravity Agent Core: [https://agent.astrework.app](https://agent.astrework.app)

### 2. Configure Production Environment Variables (`.env`)
In your production `.env` file on the Oracle Cloud server, configure the following keys:

| Variable | Description |
| :--- | :--- |
| `TURSO_DATABASE_URL` | Remote Turso LibSQL connection (`libsql://...`) |
| `TURSO_AUTH_TOKEN` | Turso database JWT auth token |
| `GROQ_API_KEY` | Primary LLM inference key (`openai/gpt-oss-120b`, ~500 t/s) |
| `GEMINI_API_KEY` | Google Cloud Gemini 3.8 Flash API key for Next.js & Antigravity Agents |
| `CEREBRAS_API_KEY` | Cerebras fast fallback API key (`qwen-3.8-27b`) |
| `NVIDIA_NIM_API_KEY` | NVIDIA NIM enterprise reasoning key (`meta/llama-4-maverick`) |
| `NEXTAUTH_SECRET` | NextAuth session encryption secret |
| `NEXTAUTH_URL` | Production deployment URL (`https://astrework.app`) |
| `AGENT_GATEWAY_URL` | Internal Docker agent URL (`http://agent:8000` or `https://agent.astrework.app`) |

### 3. Synchronize Cloud Database Anytime
Whenever new opportunities or candidate updates are made locally, sync them to Turso Cloud in one command:
```bash
npm run db:sync:turso
```

---

## 🏛️ Directory Structure

```text
Career_Engine/
├── 1_RCMS/                                  # Primary Next.js 16 Web Application
│   ├── src/
│   │   ├── app/                            # App Router (45 production routes)
│   │   │   ├── (workspace)/                # Protected dashboard, match, builder, outreach
│   │   │   └── api/                        # Scrapers, match scoring, kits, scheduler, health
│   │   ├── components/                     # High-density UI tokens, ProfileSwitcher, Sidebar
│   │   ├── lib/
│   │   │   ├── providers/                  # 19 Job source providers & normalization engine
│   │   │   ├── ai/                         # Multi-LLM router, scorer, ATS validator, drafter
│   │   │   └── scheduler.ts                # DiscoveryScheduler singleton engine
│   │   └── store/                          # Zustand candidate context store
│   ├── python_agents/                      # Google Antigravity Python Agent Core (SDK)
│   │   ├── services/                       # Oracle, Self-Healer, Headless Applier, Resume Tailorer
│   │   ├── config.py                       # Antigravity SDK Agent configurations
│   │   ├── main.py                         # FastAPI Agent Gateway (:8000)
│   │   └── requirements.txt                # Python SDK dependencies
│   ├── extension/                          # AstrePilot MV3 extension (popup, HUD, background worker)
│   ├── scripts/dev-patches/                # Archived one-off patch scripts (not shipped)
│   └── prisma/                             # Database schema & candidate seed data
├── 2_Ayushi_Raj/                            # Ayushi Raj Master Profile & Document Vault
│   └── 14_final_documents/                 # Locked tailored PDF resume variants
└── 3_Roushan_Kumar/                         # Roushan Kumar Master Profile & Document Vault
    └── 14_final_documents/                 # Locked tailored PDF resume variants
```

---

## 👨‍💻 Founders & Core Architects

- **Roushan Kumar** ([@Hey-Astreon](https://github.com/Hey-Astreon)) — *Lead Systems Architect & Core Developer*
- **Ayushi Raj** ([@Silenttears-cloud](https://github.com/Silenttears-cloud)) — *AI Systems & Product Developer*

---

<div align="center">
  <sub>Built with precision, brotherhood, and relentless dedication for the modern remote software engineer.</sub>
</div>
