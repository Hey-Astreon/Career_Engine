---
name: astreshield-fraud-detection
description: >-
  System design, 4-tier fraud detection pipeline, asymmetric cost functions, scam taxonomy dictionaries (astreShield.dict.ts),
  and ghost job algorithms for AstreShield (src/lib/ai/astreShield.ts).
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

## 📚 3. Scam Taxonomy & Dictionary Architecture (`src/lib/ai/astreShield.dict.ts`)

AstreShield maintains 13 specialized pattern dictionaries targeting known recruitment fraud vectors:

1. **`TECH_TYPO_MAP`:** High-frequency developer misspellings used by automated scraper spoofers.
2. **`HOMOGLYPH_SUSPICIOUS_RANGES`:** Cyrillic / Greek Unicode spoofing targeting brand domains (e.g., `microsоft.com` with Cyrillic 'о').
3. **`PII_HARVESTING_PATTERNS`:** Unsolicited pre-interview requests for SSN, passport, driver's license, or bank routing numbers.
4. **`ADVANCE_FEE_PATTERNS`:** Advance check fee scams, home office hardware purchases, and upfront background check charges.
5. **`UNREALISTIC_COMP_PATTERNS`:** Impossible compensation for entry-level tasks ($120/hr for data entry or typing).
6. **`HIGH_PRESSURE_PATTERNS`:** *"Start immediately within 2 hours"*, artificial urgency coercion.
7. **`PERSONAL_CONTACT_PATTERNS`:** Directing candidates away from corporate ATS systems to personal channels (`@telegram`, WhatsApp, Google Chat, free `@gmail.com` for Fortune 500 hiring).
8. **`RESHIPPING_MULE_PATTERNS`:** Package forwarding, parcel inspection, money transfer agent schemes.
9. **`MLM_CRYPTO_PATTERNS`:** Multi-level marketing recruitment, required crypto wallet creation, buy-in matrix schemes.
10. **`VAGUE_NO_WORK_PATTERNS`:** Nebulous job descriptions lacking specific deliverables or requirements.
11. **`SUSPICIOUS_URL_PATTERNS`:** Non-standard TLDs (`.xyz`, `.top`, `.tk`), IP address hostnames, or redirect chains.
12. **`TRUSTED_ATS_PLATFORMS`:** Tier-1 verified ATS domains granting positive trust bonuses (Greenhouse, Lever, Workday, Taleo, Ashby, SmartRecruiters, Recruitee, Workable).
13. **`NICHE_TRUSTED_BOARDS`:** Curated technical community boards (HackerNews, Himalayas, Simplify, Jobicy, BuiltIn).

---

## 👻 4. Ghost Job Heuristics & Zombie Postings

Many corporate postings are "ghost jobs"—roles with no actual hiring intent kept open for PR, investor signaling, or talent pooling.

### Ghost Detection Signals
- **Stale Active Lifespan:** Posting has remained continuously active on job boards for `> 90 days` without status transitions.
- **Repetitive Re-posting Cycles:** Role closes and immediately reopens every 7 or 14 days with identical text.
- **The Ambiguity Matrix:** Extremely generic job descriptions lacking specific team, project, or technical deliverables, coupled with wide compensation spreads (`$40k - $240k`).

---

## 🎨 5. UI Alert Hierarchy & Transparency (`src/app/globals.css`)

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

### Visual Styling Tokens (`globals.css`)
- **Verified Safe (`.shield-badge--green` / Score 75-100):** Clean slate/emerald badge indicating legitimate ATS or trusted board origin (`background: var(--green-soft); color: var(--green);`).
- **Caution / Unverified (`.shield-badge--amber` / Score 40-74):** Amber badge warning candidates to verify domain (`background: var(--amber-soft); color: var(--amber);`).
- **Threat Detected (`.shield-badge--red` / Score < 40):** Crimson badge indicating critical fraud pattern (`background: var(--red-soft); color: var(--red);`).
- **Card Dimming Invariant (`.shield-blocked-card`):**
  ```css
  .shield-blocked-card {
    opacity: .55;
    filter: grayscale(.35);
    transition: opacity .2s ease, filter .2s ease;
  }
  .shield-blocked-card:hover {
    opacity: .88;
    filter: grayscale(0);
  }
  ```
  *(RED jobs remain visible and dimmed so users are aware they are being actively protected, rather than suffering from mysterious missing records).*
- **Drawer Audit Panel (`.shield-panel`):**
  ```css
  .shield-panel { border: 1px solid var(--line); padding: 16px; margin-top: 4px; }
  .shield-panel--amber { border-color: var(--amber); background: var(--amber-soft); }
  .shield-panel--red { border-color: var(--red); background: var(--red-soft); }
  ```
