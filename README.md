<div align="center">

# ✨ AstreWork
### Autonomous Remote Career Intelligence & Application Operating System

[![Next.js 16](https://img.shields.io/badge/Next.js-16.3.0%20(Turbopack)-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React 19](https://img.shields.io/badge/React-19.0.0-blue?style=for-the-badge&logo=react)](https://react.dev/)
[![TypeScript 5.9](https://img.shields.io/badge/TypeScript-5.9%20(Strict)-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Prisma 7](https://img.shields.io/badge/Prisma-7%20(LibSQL)-2D3748?style=for-the-badge&logo=prisma)](https://www.prisma.io/)
[![Provider Health](https://img.shields.io/badge/Providers-19%2F19%20HEALTHY-brightgreen?style=for-the-badge)](http://localhost:3000/api/sources/health)

**AstreWork** is an autonomous, high-density AI Career Operating System engineered to streamline remote job discovery, multi-signal deduplication, deep 2-stage fit scoring, tailored application kit generation, and background auto-sync scheduling.

</div>

---

## 🌟 Core System Pillars

### 1. 🌐 19-Source Remote Discovery Pipeline (100% Operational)
A resilient, concurrent scraping engine executing via `Promise.allSettled()` with bounded watchdog timeouts and failure isolation across 19 global tech platforms:
- **Direct ATS Portals:** Greenhouse, Ashby, Lever, Recruitee, SmartRecruiters, Workable
- **Developer & Tech Communities:** HackerNews Who is Hiring, Simplify (New Grad & Internships), Arc.dev, BuiltIn, LinkedIn, Micro1
- **Curated Remote Boards:** Himalayas, WeWorkRemotely, Jobicy, RemoteOK, Remotive, Arbeitnow, HiringCafe

### 2. 🎯 Match Studio & 2-Stage AI Scoring
- **Stage 1 (Deterministic Fast Filter):** Evaluates experience bounds, posting recency, and keyword overlap in **< 10ms** across entire feeds.
- **Stage 2 (Deep Composite Evaluation):** Analyzes role alignment, technical stack depth, and seniority fit using an ultra-fast multi-provider LLM router:
  - **Primary:** Groq (`openai/gpt-oss-120b`, ~500 tokens/sec JSON evaluation).
  - **Secondary:** Google Cloud Native Gemini (`gemini-2.5-flash`).
  - **Fallbacks:** Cerebras (`gpt-oss-120b` / `qwen-3.8-27b`) & NVIDIA NIM (`meta/llama-3.2-11b-vision-instruct`).
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
- **DiscoveryScheduler:** Global singleton managing 1-hour recurring auto-scrapes with execution locks (`isExecuting`).
- **Telemetry:** Real-time provider health dashboard tracking per-endpoint latency, error codes, and insertion yields.
- **UI Integration:** Live pulse status indicators in the Sidebar and one-click "Enable Auto-Sync" / "Pause Sync" controls on the Dashboard.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | Next.js 16 (App Router + Turbopack), React 19, Tailwind CSS v4, Lucide Icons |
| **Backend** | Next.js Server Components, API Route Handlers, Node.js v26 |
| **Database & ORM**| LibSQL / SQLite (WAL mode), Prisma 7 (`@prisma/adapter-libsql`) |
| **AI / LLM** | Groq API, Google Gemini 2.5 Flash, Cerebras, NVIDIA NIM |
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

### 5. Production Validation
```bash
# Typecheck
npx tsc --noEmit

# Production Build (Turbopack)
npm run build
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
