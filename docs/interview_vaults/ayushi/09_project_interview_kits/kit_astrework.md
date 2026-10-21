# Project Interview Kit: AstreWork (Career Engine & AstrePilot)

## 📌 Project Overview
- **Name:** AstreWork — Autonomous Career Platform & AstrePilot Extension
- **Role:** Co-Developer & Lead Frontend Architect
- **Live URL:** https://astrework.app | https://agent.astrework.app
- **Repository:** https://github.com/Hey-Astreon/Career_Engine
- **Stack:** Next.js 16, React 19, TypeScript, Google Gemini API / SDK, Chrome Extension Manifest V3, Turso LibSQL, Redis 7, TailwindCSS.

---

## 🏛️ System Architecture Deep Dive
1. **AstrePilot Chrome Extension (Manifest V3 Architecture):**
   - Engineered cross-browser extension operating across background service workers (`background.js`) and content scripts (`content.js`).
   - Encapsulated presentation layer inside an isolated Closed Shadow DOM boundary (`#astrepilot-hud-host` via `hud-ui.js`), preventing host page CSS bleeding.
   - Built a 6-stage HUD state machine (`IDLE` -> `DETECTING` -> `MATCHED` -> `AUTOFILLING` -> `REVIEW_REQUIRED` -> `SUBMITTED`).
   - Multi-ATS 18-type heuristic field classifier (First Name, Email, LinkedIn, Visa, Resume, Salary, etc.) with synthetic event dispatch (`InputEvent`, `change`, `blur`) for React/Vue reactive forms.
   - 90-day HMAC-SHA256 pairing token handshake for passwordless profile synchronization.
   - Mandatory `esc()` XSS sanitization preventing malicious text injection into the HUD.
2. **AI-Powered Client-Side ATS Match & Scoring Studio:**
   - Multi-provider LLM cascade in `src/lib/ai/router.ts`: Groq (500+ t/s) -> Gemini (1M context) -> Cerebras -> NVIDIA NIM.
   - Two-stage latency optimization: Stage 1 deterministic base match (0ms latency, zero tokens) -> Stage 2 LLM composite scoring for top-affinity roles.
   - Dynamic resume keyword rebalancing and Google XYZ bullet transformation.
3. **High-Density Responsive UI & Design System:**
   - Curated semantic design tokens (`--canvas: #f7f9fc`, `--surface: #ffffff`, `--ink: #142033`, `--blue: #1d5fd1`, `--green: #13875c`, `--red: #bd3b3b`, `--amber: #a96500`).
   - Strict A4 single-page print geometry with zero layout shift (`CLS < 0.02`).
   - AstreShield fraud detection UI: `.shield-badge`, `.shield-panel`, and `.shield-blocked-card` dimming states.

---

## 🎯 Common Interview Questions & Answers

### Q1: "How did you design the AstrePilot Chrome Extension to work reliably across different ATS platforms like Greenhouse, Lever, and Workday?"
**Answer:**
> "Modern ATS platforms use completely different DOM structures, dynamic SPAs, and aggressive styling. First, we isolated our heads-up display (HUD) inside a closed Shadow DOM boundary (`#astrepilot-hud-host`), ensuring the host page's CSS never distorts our interface and our styles never leak into their application. Second, to handle dynamic multi-step form hydration, we implemented a MutationObserver paired with a re-entrancy lock (`mountPromise`) so rapid user hotkeys (`Alt+Shift+A`) never create duplicate HUDs. Third, standard `input.value = x` assignments are ignored by reactive frameworks like React or Angular, so we dispatch synthetic `InputEvent`, `change`, and `blur` events using the native prototype setter. This allows candidates to autofill complex multi-page applications in ~15 seconds with 100% field accuracy."

### Q2: "How did you balance rich visual aesthetics with high-performance responsive metrics on the AstreWork dashboard?"
**Answer:**
> "Engineers require high data density without visual clutter or lag. In AstreWork, we established a fixed 242px sidebar rail paired with a fluid main workspace and a 540px slide-over JobDrawer. To eliminate layout shifts (`CLS < 0.02`), every loading skeleton precisely matches the final card dimensions. For our design tokens, we avoided generic primary colors in favor of curated HSL-tailored hex values (`--canvas: #f7f9fc`, `--ink: #142033`, `--blue: #1d5fd1`). We capped blur effects at `backdrop-filter: blur(16px)` to guarantee 60 FPS scrolling on mobile devices, and implemented responsive collapsing tiers at 1460px, 920px, and 620px where the sidebar gracefully transitions to a bottom dock."
