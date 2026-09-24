# Career Engine / RCMS (Autonomous Remote Career Intelligence & Application Engine)

Career Engine (formerly CareerAgent) is an autonomous, high-density AI Career Operating System designed to automate job discovery, match evaluation, resume tailoring, and cold outreach.

## 🚀 Features

- **Multi-Provider Scraper Infrastructure:** 17+ discovery scrapers (LinkedIn, Greenhouse, Lever, Ashby, YC, Wellfound, etc.) feeding into a single, canonical, deduplicated opportunity stream.
- **Match Studio & 2-Stage Scorer:** Deterministic base scoring mixed with deep composite AI match scoring (powered by a multi-LLM fallback router: Groq -> NVIDIA NIM -> Cerebras -> Gemini).
- **Tier-1 ATS Resume Maker:** Custom client-side resume canvas at `/resume-maker` with real-time audit score calculation and strict A4 print geometry.
- **Application Kit:** One-click tailoring of Resumes, Cover Letters, and Cold Outreach drafts perfectly aligned to the specific job description.
- **SQLite / LibSQL WAL:** Lightning-fast local database operations via Prisma 7 and `@prisma/adapter-libsql`.

## 🛠️ Tech Stack

- **Framework:** Next.js 16 (App Router + Turbopack) & React 19
- **Language:** TypeScript 5.9 (Strict)
- **Database:** SQLite (LibSQL) with Prisma ORM
- **UI:** Tailwind CSS v4, Lucide React, Glassmorphic UI Tokens
- **State:** Zustand & React Query

## 🚀 Getting Started

First, install dependencies:
```bash
npm install
```

Configure your `.env`:
- Database URL (Turso / LibSQL)
- API Keys (Groq, NVIDIA, Cerebras, Gemini)

Push the database schema:
```bash
npx prisma db push
```

Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## 🛡️ Telemetry & Reliability

- **Provider Endpoint Telemetry:** Tracks scrape latency, HTTP status codes, and timeouts per provider endpoint.
- **Zero-Lint Codebase:** Enforced by strict React Hooks and TypeScript configuration.

## 👨‍💻 Founders

- Roushan Kumar ([@Hey-Astreon](https://github.com/Hey-Astreon))
- Ayushi Raj ([@Silenttears-cloud](https://github.com/Silenttears-cloud))
