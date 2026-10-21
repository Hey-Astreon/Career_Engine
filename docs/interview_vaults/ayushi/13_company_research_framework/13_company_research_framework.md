# Company Research Framework: Pre-Interview Prep
**Goal:** Tailor technical narratives and project demonstrations to the exact pain points, tech stack, and values of the target company in under 15 minutes.

---

## 1. Quick Research Workflow (15 Minutes)

### Phase A: Business & Product (5 Min)
*   **What problem does the company solve?** (B2B, B2C, Developer Tooling, SaaS).
*   **Who is their core customer?** (Engineers, enterprise admins, consumers).
*   **How do they make money?** (Subscription, usage-based APIs, licensing).

### Phase B: Tech Stack & System Needs (5 Min)
*   **Primary Technologies:** Check job descriptions or Wappalyzer. (e.g. React/Node/PostgreSQL vs. Python/FastAPI/ChromaDB).
*   **Engineering Constraints:** Are they focused on *real-time low-latency* (WebSockets, Redis caching), *data security* (encryption, isolation), or *scalability* (microservices, Docker)?
*   **Relevance Mapping:** Which of your projects (Coco AI, Alyra Lock, Astra Vision) uses the most similar architecture?

### Phase C: Cultural & Team Signals (5 Min)
*   **Funding & Size:** YC batch, seed-stage, Series A/B, or established product company. (For early startups: prioritize speed/autonomy. For mid-large: prioritize process/testing).
*   **Team Composition:** Find the team leads on LinkedIn. Note their past companies (ex-Google, ex-Stripe, etc.) to gauge their quality standards.

---

## 2. Interview Prep Worksheet (Template)
*Copy and fill this worksheet for each company that schedules a call.*

### Company Profile
*   **Company Name:**  
*   **Role Title:**  
*   **Platform Applied:**  
*   **Hiring Stage:** [Phone Screen / Technical Round / System Design / Culture Fit]

### Strategic Alignment Map
*   **Company Tech Stack:**  
*   **Primary Project to Highlight:** [Coco AI / Astra Vision / Alyra Lock]
*   **Why it aligns:** (e.g. *"Both their product and Coco AI rely on real-time streaming architectures and low-latency API connections."*)
*   **Core STAR Story to deploy:** [e.g. Security/Sandbox story from Astra Vision]

### Tactical Questions to Ask (The "Reverse Interview")
Prepare 3 high-signal engineering questions:
1.  *Architecture Question:* *"I noticed you use [tech]. In my project, [Coco AI/Astra Vision], I ran into constraints with [e.g. IPC latency / sandbox resource locking]. How does your team manage [similar constraint] at scale?"*
2.  *Product Velocity:* *"As an early-stage team, how do you balance the trade-offs between rapid prototyping and writing modular, highly-tested code (like JUnit/MockMvc coverage)?"*
3.  *Developer Culture:* *"What does the codebase review and onboarding workflow look like for engineers shipping code in a fully remote environment?"*
