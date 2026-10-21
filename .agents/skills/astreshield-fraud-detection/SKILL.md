---
name: astreshield-fraud-detection
description: >-
  System design, 4-tier fraud detection pipeline, asymmetric cost functions, scam taxonomy dictionaries,
  and ghost job algorithms for AstreShield (src/lib/ai/astreShield.ts & astreShield.dict.ts).
  Use whenever modifying fraud detection heuristics, tuning trust score algorithms, updating scam dictionaries, or auditing alert badges.
---

# 🛡️ Deep Engineering & System Design of AstreShield: Fraud & Ghost Job Interception

This skill codifies the architectural principles, multi-tiered detection pipeline, asymmetric cost mathematics, and fraud taxonomy behind AstreShield (`src/lib/ai/astreShield.ts` and `src/lib/ai/astreShield.dict.ts`).

---

## 🏛️ 1. The 4-Tier Detection Pipeline

AstreShield shields candidates from phishing, fake remote checks, identity theft, and ghost job listings without blocking genuine opportunities:

```
[Job Posting Ingestion]
         |
         v
[Layer 1: Lexical Integrity] ------> (Typo density, homoglyphs, ALL CAPS abuse)
         |
         v
[Layer 2: Semantic Red Flags] -----> (PII harvesting, fee demands, crypto/MLM traps, Telegram interviews)
         |
         v
[Layer 3: Structural Credibility] -> (Trusted ATS domains, URL sanity, JD completeness, salary realism)
         |
         v (If Trust Score lands in borderline AMBER: 40-74)
[Layer 4: AI Intent Analysis] ------> (LLM deep evaluation of contextual legitimacy)
         |
         v
[Final Trust Score: GREEN (75-100) | AMBER (40-74) | RED (<40)]
```

---

## ⚖️ 2. The Asymmetric Cost Function & "Innocent Until Proven Guilty"

In recruitment threat analysis, classification errors carry radically different costs:

$$\text{Damage}(\text{False Red}) \gg \text{Damage}(\text{False Green})$$

### The Real-World Impact
- **False Positive (False RED - 10x Damage):** Flagging a genuine startup or enterprise listing as a scam destroys candidate career opportunities, alienates employers, and discredits AstreWork.
- **False Negative (False GREEN - 5x Damage):** Missing a subtle phishing attempt poses risk, but candidates exercise natural human caution on external platforms.
- **The System Bias:** AstreShield is biased toward **measured caution**, not blanket blocking.

### The Two-Signal Law
- Every posting starts with **100 Trust Points**.
- Deductions are applied per triggered signal.
- **Law:** A single signal from any layer CAN NEVER trigger a `RED` verdict on its own.
- To produce a `RED` rating (Trust Score `< 40`), the posting must trigger **at least 2 independent corroborating signals across different layers** (e.g. an unverified personal Gmail domain + an advance equipment check demand).

---

## 📚 3. Scam Taxonomy & Dictionary Architecture (`astreShield.dict.ts`)

AstreShield maintains specialized detection dictionaries targeting known recruitment fraud vectors:

### 1. Advance Fee & Check Schemes (`ADVANCE_FEE_PATTERNS`)
- *"Send money for home office equipment"*
- *"We will send you a cashier's check to purchase software"*
- *"Pay for background check verification upfront"*

### 2. PII & Identity Harvesting (`PII_HARVESTING_PATTERNS`)
- Unsolicited requests for Social Security Numbers (SSN), passport copies, or bank account routing numbers prior to an initial interview.

### 3. Untraceable Communication Channels (`PERSONAL_CONTACT_PATTERNS`)
- Directing candidates away from corporate ATS systems to unverified personal channels:
- *"Message our hiring manager on Telegram (@...) or WhatsApp (+1...)"*
- Free personal email domains used for fortune 500 hiring (e.g. `google-careers@gmail.com`).

### 4. MLM, Crypto & Reshipping Mules (`MLM_CRYPTO_PATTERNS`, `RESHIPPING_MULE_PATTERNS`)
- Multi-level marketing recruitment, cryptocurrency wallet setup requirements, or "package forwarding/re-shipping assistant" parcel mule schemes.

---

## 👻 4. Ghost Job Heuristics & Zombie Postings

Many corporate postings are "ghost jobs"—roles with no actual hiring intent kept open for PR, investor signaling, or talent pooling.

### Ghost Detection Signals
- **Stale Active Lifespan:** Posting has remained continuously active on job boards for `> 90 days` without status transitions.
- **Repetitive Re-posting Cycles:** Role closes and immediately reopens every 7 or 14 days with identical text.
- **The Ambiguity Matrix:** Extremely generic job descriptions lacking specific team, project, or technical deliverables, coupled with wide compensation spreads (`$40k - $240k`).

---

## 🎨 5. UI Alert Hierarchy & Transparency

AstreShield NEVER shows an opaque or unexplained warning badge. Every flag must cite specific evidence:

```tsx
export interface ShieldFlag {
  signalId: ShieldSignalId;
  label: string;       // Human explanation shown in UI
  impact: number;      // Numerical deduction (-25)
  layer: 1 | 2 | 3;    // Originating layer
  evidence?: string;   // Exact offending text snippet from JD
}
```

### Visual Tiers
- **Verified Safe (`.shield-panel--green` / Score 75-100):** Clean slate/emerald badge indicating legitimate ATS or trusted board origin.
- **Caution / Unverified (`.shield-panel--amber` / Score 40-74):** Amber badge warning candidates to verify domain and avoid sharing sensitive financial data.
- **Threat Detected (`.shield-panel--red` / Score < 40):** Crimson banner detailing the exact corroborating scam patterns with an immediate warning modal before application redirection.
