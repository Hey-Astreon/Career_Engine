---
name: astrepilot-and-tracker
description: >-
  Complete system design for the AstrePilot Chrome Extension (Manifest V3 background.js, content.js, closed Shadow DOM
  #astrepilot-hud-host, esc() XSS sanitization, UCDE combobox engine, zero-click synthetic resume upload, multi-step
  form state machine, Smart Q&A Semantic Vault) and the AstreWork Application Tracker Pipeline (2-stage submission
  confirmation, canonical URL deduplication, Days Silent Follow-up Studio, and 4-in-1 spreadsheet export engine)
  across extension/, src/lib/autopilot/, src/app/api/autopilot/, src/app/(workspace)/applications/, and src/lib/exportEngine.ts.
---

# 🛸 AstrePilot Browser Extension & Application Tracker Pipeline Mastery

This unified skill governs the end-to-end autonomous application execution and tracking lifecycle: the Manifest V3 Chrome Extension (`extension/`), the 4 Autofill Pillars (`src/lib/autopilot/`), the Autopilot Backend APIs (`src/app/api/autopilot/`), the Application Pipeline Workspace (`src/app/(workspace)/applications/`), and the 4-in-1 Universal Spreadsheet Export Engine (`src/lib/exportEngine.ts`).

---

## 🏛️ PART 1: ASTREPILOT MANIFEST V3 & SHADOW DOM ARCHITECTURE (`extension/`)

```
+-----------------------------------------------------------------------+
| [background.js] Service Worker                                        |
|  • 90-day HMAC-SHA256 Pairing Token Vault (`chrome.storage.local`)    |
|  • CORS/CSP-immune binary PDF streaming bridge (`/api/resume/...`)    |
+-----------------------------------^-----------------------------------+
                                    │ chrome.runtime.sendMessage()
+-----------------------------------v-----------------------------------+
| [content.js] Host Page Field Scanner & Multi-Realm Actuator           |
|  • window.__ASTREPILOT_CLEANUP__ & mountPromise race-condition locks  |
|  • Cross-realm `el.ownerDocument.defaultView` property setters        |
|  • Synced STANDALONE_PROFILES fallback (Style B titles, Patna, BCA)   |
+-----------------------------------^-----------------------------------+
                                    │ Closed/Isolated DOM Mount
+-----------------------------------v-----------------------------------+
| [#astrepilot-hud-host] Shadow Root (`hud-ui.js` & `hud.shadow.css`)   |
|  • Zero CSS leakage to/from host ATS page                             |
|  • 6-Stage HUD State Machine (`IDLE` -> `DETECTING` -> `MATCHED` ->   |
|    `AUTOFILLING` -> `REVIEW_REQUIRED` -> `SUBMITTED`)                 |
+-----------------------------------------------------------------------+
```

### Security & Location Parsing Invariants
1. **Mandatory `esc()` XSS Sanitization:** Never interpolate job titles, company names, or field labels into `innerHTML` without passing through `esc()`.
2. **Geographic Location Sanitization (`/api/autopilot/profile/route.ts`):** Always strip parenthetical availability tags (`profile.location.replace(/\s*\([^)]*\)/g, "").trim()`) before splitting `"Patna, Bihar, India (Open to Remote)"` by comma so `country` resolves cleanly to `"India"` for strict ATS country dropdowns.
3. **Packaging:** Whenever `extension/*` files change, run `node scripts/package-extension.js` to rebuild `public/downloads/astrepilot-extension.zip`.

---

## 🧩 PART 2: THE 4 AUTONOMOUS AUTOFILL PILLARS (`src/lib/autopilot/` & `extension/`)

### Pillar A: Universal Combobox & Dropdown Engine (UCDE)
Handles custom non-native select widgets across 6 patterns:
1. `NATIVE` (`<select>`), 2. `REACT_SELECT` (`.select__control`), 3. `RADIX / SHADCN` (`[role="combobox"]`), 4. `HEADLESS_UI` (`[id*="headlessui-combobox"]`), 5. `WORKDAY` (`[data-automation-id="promptOption"]`), and 6. `WAI-ARIA Keyboard Fallback` (`ArrowDown` $\rightarrow$ type $\rightarrow$ `Enter`).

#### UCDE Mandatory Invariants & Actuation Laws:
1. **The Anti-False-Positive Combobox Verification Law:** Never verify a combobox by checking `el.value` on its internal `<input class="select__input">`. The internal filter input is transient; React ignores raw DOM value mutations. A combobox is ONLY verified if a non-placeholder `.select__single-value` (or `[class*="singleValue"]`) element exists, has non-empty text, and does not match `PLACEHOLDER_REGEX`, OR a hidden form input with a valid committed option value exists. Never fall back to writing raw text to an input inside a combobox.
2. **Non-Destructive Semantic Matching Order:** Always attempt semantic matching (exact text, punctuation-stripped, and domain fallbacks like `Bachelor's` for BCA, `Computer Science` for BCA, `Summer 2027`, `None of the above`, `Asian` for race) on the **full initial option pool** before calling `typeSearchString`. Typing into an input filters the options down; if typing occurs before semantic fallback, the option list is destroyed, resulting in 0 options and total failure. If search typing is attempted and yields 0 options, the input must immediately be reset and cleared to restore the full pool.
3. **Hardware CDP Input Escalation:** When synthetic DOM events (`pointerdown`, `mousedown`, `click`) fail to commit an option in React 18/19 custom comboboxes, escalate to `cdpInput('CLICK', { x, y })` targeting the bounding box center of the option or control. CDP hardware events are injected directly at the browser engine level with `isTrusted: true`, preventing framework event-delegation bypasses.
4. **Dynamic Dependent Field State Machine (Pass 2):** Certain fields (such as `Please identify your race`) only mount into the DOM after a prerequisite field (such as `Are you Hispanic/Latino?`) is answered. Pass 2 must allow a DOM mutation quiet period (300–500ms), detect newly mounted comboboxes, and execute full verified actuation.
5. **EEOC Demographic Sovereignty Law:** Candidates from the Indian subcontinent (India, Patna, Bihar, etc.) are categorized strictly as **Asian**, NEVER **"American Indian or Alaskan Native"**. Disqualify all American Indian / Alaska Native options unconditionally.

### Pillar B: Zero-Click Synthetic Resume File Upload (`syntheticUploadEngine.ts`)
1. `background.js` streams the candidate's canonical PDF from `/api/resume/download/latest` as base64.
2. `content.js` reconstructs a W3C `File` inside a `DataTransfer` container (`dt.items.add(file)`), assigns `input.files = dt.files`, and dispatches `input`, `change`, and `DragEvent('drop')` events.
3. Falls back gracefully to background disk download if blocked by host sandbox rules.

### Pillar C: Multi-Step Form State Machine (`multiStepEngine.ts`)
1. **Step Classification (`classifyCurrentStep`):** Distinguishes intermediate forward buttons (`isNextStepButton`: `"Next"`, `"Continue"`) from final submission buttons (`isSubmitApplicationButton`: `"Submit Application"`, `"Confirm & Apply"`).
2. **Session Memory (`ap_nav_session` in `sessionStorage`):** Accumulates `cumulativeFieldsFilled` and `cumulativeFieldsTotal` across steps while enforcing `fieldsFilled <= fieldsTotal`.
3. **Reactive Transition Watcher (`watchForStepTransition`):** Uses a `MutationObserver` with a `300ms` quiet debounce (`4000ms` safety cap) to auto-rescan when the next SPA step mounts.

### Pillar D: Smart Screening Q&A Semantic Vault (`qaVaultEngine.ts` & `qaVaultSeed.ts`)
1. **`ScreeningQuestionVault` Model:** Stores candidate-scoped Q&A patterns across `MOTIVATION`, `TECHNICAL`, `BEHAVIORAL`, `LOGISTICS`, `COMPENSATION`, and `GENERAL` categories.
2. **Sub-5ms Matching:** Evaluates token coverage, Jaccard similarity, and N-gram containment, interpolating `{{COMPANY}}` and `{{ROLE}}` dynamically and surfacing a `[💾 Save to Vault]` button in the HUD and `ScreeningVaultCard.tsx` in `/settings`.

---

## 📋 PART 3: APPLICATION TRACKER PIPELINE & 4-IN-1 EXPORT ENGINE (`/applications` & `exportEngine.ts`)

### 1. The 2-Stage Submission Confirmation Invariant
Filling a form is never conflated with submitting an application:
- **Stage 1 (Autofill Draft):** `POST /api/autopilot/log` upserts an application record with `status = "APPLIED"` and `confirmed = false` (rendered with an amber `[⚡ AstrePilot (Pending Review)]` badge and `[✓ Confirm]` button).
- **Stage 2 (Human-in-the-Loop Confirmation):** Clicking `[🎉 Mark as Submitted]` in the HUD or `[✓ Confirm]` in `/applications` calls `POST /api/autopilot/confirm`, setting `confirmed = true`.

### 2. Canonical URL Deduplication (`normalizeApplicationUrl` in `src/lib/exportEngine.ts`)
- Scrubs ephemeral hash anchors and tracking query params (`utm_*`, `gh_src`, `gh_jid`, `lever-source`, `ref`, `fbclid`, `gclid`, `token`, `session_id`).
- Deduplicates against `(profileId, canonicalUrl)` and a 48-hour `(profileId, company, title)` window so re-running autofill updates telemetry instead of creating duplicate rows.

### 3. Days Silent Engine & Follow-up Studio
- Computes `daysSilent = Math.floor((Date.now() - new Date(app.appliedDate).getTime()) / 86400000)`.
- Applications with `status === "APPLIED" && daysSilent >= 5` surface an amber **Quiet Attention** alert and a 1-click **`[⚡ Nudge]`** button opening the 3-tone Follow-up Studio (`nudge`, `project_update`, `referral`).

### 4. The 4-in-1 Universal Spreadsheet Export Suite (`/api/applications/export`)
1. **Universal CSV (`.csv`):** Prepends UTF-8 BOM (`\uFEFF`) for Excel glyph fidelity and neutralizes spreadsheet formula injection (`=`, `+`, `-`, `@` prefixed with `'`).
2. **Pre-Styled Microsoft Excel XML 2003 (`.xls`):** Zero-dependency SpreadsheetML with `#0071E3` navy headers, zebra shading (`#F8FAFC`), `<ss:Comment>` notes, and clickable `<ss:HRef>` links.
3. **Semantic XML (`.xml`):** Typed ISO-8601 structured feed.
4. **1-Click Clipboard TSV:** Instant `Ctrl+V` paste into Google Sheets or Excel.

