# Project Interview Kit: IDBI FinSync
**Project:** IDBI FinSync – AI Personal Wealth Management Platform  
**Live Demo:** [idbi-fin-sync-web.vercel.app](https://idbi-fin-sync-web.vercel.app/)  
**GitHub:** [github.com/Hey-Astreon/IDBI-FinSync](https://github.com/Hey-Astreon/IDBI-FinSync)  
**Tech Stack:** Next.js, React.js, Node.js, Fastify, PostgreSQL, Gemini API

---

## 1. Project Summary
IDBI FinSync is an AI-powered financial management platform providing automated expense tracking, systematic investment planning (SIP), and contextual AI financial advice.

## 2. Technical Architecture
*   **TypeScript Monorepo:** Connected Fastify REST APIs to a React/Next.js frontend.
*   **AI Financial Advisor ("Mitra"):** Wired Google Gemini API handlers to process user financial ledgers and stream advice.
*   **Database & Validation:** PostgreSQL database managed via Prisma ORM with Zod schema parameter validation and JWT session checks.
