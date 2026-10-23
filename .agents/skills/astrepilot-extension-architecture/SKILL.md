---
name: astrepilot-extension-architecture
description: >-
  System design, Manifest V3 architecture, background service workers, Shadow DOM injection,
  message dispatch bus (TOGGLE_HUD, SCAN_FIELDS, AUTOFILL), and XSS sanitization for the AstrePilot Chrome Extension (extension/).
  Use whenever modifying extension scripts, HUD components, ATS autofill strategies, or extension pairing tokens.
---

# 🛸 System Design & Architecture of AstrePilot: The Autonomous Career Copilot

This skill defines the technical architecture, Manifest V3 lifecycle, Shadow DOM security containment, field classification heuristics, message dispatch bus, and multi-ATS autofill automation for the AstrePilot browser extension (`extension/`).

---

## 🏛️ 1. Manifest V3 & Process Boundary Topology

AstrePilot operates across three isolated browser process boundaries:

```
+-----------------------------------------------------------------------+
| Browser Background Process                                            |
| [background.js] Service Worker                                        |
|  • HMAC-SHA256 Token Vault & 90-day Founder Auth                      |
|  • Offscreen document / cross-origin API bridge                       |
|  • Chrome storage sync (`chrome.storage.local`)                       |
+-----------------------------------^-----------------------------------+
                                    | chrome.runtime.sendMessage()
+-----------------------------------v-----------------------------------+
| Host Web Page (DOM)                                                   |
| [content.js] Field Scanner & Automation Engine                        |
|  • window.__ASTREPILOT_CLEANUP__ tear-down listener                   |
|  • mountPromise lock preventing race-condition double injection       |
|  • isFilling re-entrancy guard for runAutofill()                      |
|  • Synthesizes trusted user events (InputEvent, change, blur)         |
+-----------------------------------^-----------------------------------+
                                    | DOM Injection (Isolated)
+-----------------------------------v-----------------------------------+
| Isolated Shadow Root (#astrepilot-hud-host)                           |
| [hud-ui.js] Presentation Layer                                        |
|  • Encapsulated Shadow DOM Boundary (Zero CSS leakage to/from host)   |
|  • 6-Stage HUD State Machine                                          |
|  • Draggable Dock & AstreShield Warning Banner                        |
+-----------------------------------------------------------------------+
```

---

## 📡 2. Message Bus & Communication Protocol (`extension/content.js`)

Communication between popup, background worker, and injected content script uses a typed message bus:

| Action Identifier | Payload / Arguments | Purpose |
| :--- | :--- | :--- |
| `TOGGLE_HUD` | `{}` | Mounts or hides the floating HUD dock. Hotkey: `Alt+Shift+A`. |
| `SCAN_FIELDS` | `{}` | Scans active DOM form inputs and returns field count + classified types. |
| `AUTOFILL` | `{}` | Awaits `mountPromise` lock, fetches candidate profile, and triggers animated autofill. |
| `EXTRACT_PAGE` | `{}` | Extracts raw job description text from ATS containers for instant tailoring. |
| `CLICK_APPLY` | `{}` | Locates and activates multi-step navigation buttons (`"Next"`, `"Review"`, `"Submit"`). |

### Re-Entrancy & Clean-up Guards
To prevent duplicate DOM HUDs when hotkeys are rapidly pressed:
```js
if (window.__ASTREPILOT_CLEANUP__) {
  try { window.__ASTREPILOT_CLEANUP__(); } catch (e) {}
}
window.__ASTREPILOT_INJECTED__ = true;

// Await HUD initialization before triggering autofill
if (!activeHud) await toggleAstrePilotHUD();
else if (mountPromise) await mountPromise;
await runAutofill();
```

---

## 🔒 3. Security Containment & The Shadow DOM Invariant

ATS platforms (e.g. Workday, Lever) enforce aggressive styling rules and external scripts that can break third-party extensions.

### The Closed Shadow DOM Architecture
- The HUD is mounted to `document.body` under a detached host element `#astrepilot-hud-host`.
- Encapsulated with `hud.shadow.css` inside the shadow root.
- Host page styles CANNOT penetrate the Shadow root; extension styles CANNOT leak into the host page application.

### Mandatory `esc()` XSS Sanitization Rule
Never interpolate job titles, company names, or user data directly into `innerHTML` without passing through the canonical sanitizer:
```js
function esc(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
```

---

## 🎯 4. Multi-ATS Field Classification Engine

Different ATS providers use widely divergent DOM hierarchies, label associations, and ARIA attributes. AstrePilot uses a fuzzy heuristic classifier across 18 distinct field types:

### Field Classification Heuristics
```js
const TYPE_LABELS = {
  'firstname': 'First Name', 'lastname': 'Last Name', 'fullname': 'Full Name',
  'email': 'Email', 'phone': 'Phone', 'linkedin': 'LinkedIn', 'github': 'GitHub',
  'portfolio': 'Portfolio', 'resume': 'Resume/CV', 'coverletter': 'Cover Letter',
  'location': 'Location', 'visa': 'Visa/Sponsorship', 'salary': 'Expected Salary',
  'veteran': 'Veteran Status', 'disability': 'Disability Status',
  'race': 'Race/Ethnicity', 'gender': 'Gender', 'unknown': 'Custom Field'
};
```

### Form Autofill Synthetic Dispatch
Modern reactive frameworks (React, Vue, Angular) ignore simple `input.value = "text"`. To trigger internal state updates, AstrePilot dispatches a complete event suite:
```js
function setInputValue(input, val) {
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype, "value"
  ).set;
  nativeInputValueSetter.call(input, val);
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
  input.dispatchEvent(new Event('blur', { bubbles: true }));
}
```

---

## 🎛️ 5. The 6-Stage HUD State Machine

The floating heads-up display transitions through 6 formal states:
1. `IDLE`: Extension asleep; observing URL and DOM changes.
2. `DETECTING`: ATS form detected; analyzing inputs and querying AstreShield.
3. `MATCHED`: Form parsed; displays candidate profile affinity score and detected fields.
4. `AUTOFILLING`: Autonomous field insertion in progress; visual checkmarks appear next to completed inputs.
5. `REVIEW_REQUIRED`: Pauses for human confirmation on complex open-ended screening questions or salary inputs.
6. `SUBMITTED`: Candidate confirms submission; records application timestamp to workspace database.

---

## 🔑 6. Founder Auth & 90-Day Pairing Handshake

AstrePilot pairs with the main AstreWork workspace via a zero-password token handshake:
- **Handshake Flow:** On visiting `https://astrework.app/dashboard`, the content script reads an ephemeral pairing nonce.
- **Background Storage:** Nonce is exchanged for a 90-day HMAC-SHA256 session token stored in `chrome.storage.local`.
- **Encrypted Profile Sync:** Candidate resume data, preferences, and custom answers sync securely in the background without exposing plain-text credentials in logs.

---

## 🧩 7. Pillar A: Universal Combobox & Dropdown Engine (UCDE)

Handles complex, non-native custom dropdown widgets across 5 distinct UI design frameworks:
1. **NATIVE (`<select>`):** Direct option selection with full `change` and `input` events.
2. **REACT_SELECT:** Target `.select__control`, `.select__input`, and `.select__option`.
3. **RADIX / SHADCN:** Button with `role="combobox"`, `aria-haspopup="listbox"`, and portal popup querying.
4. **HEADLESS_UI:** Target `[id*="headlessui-combobox-input"]`.
5. **WORKDAY (`[data-automation-id="promptOption"]`):** Targets nested popover menus and prompt search inputs.
6. **WAI-ARIA KEYBOARD FALLBACK:** Key sequences (`ArrowDown`, character typing, `Enter`) to trigger reactive select handlers without hardcoded click coordinates.

---

## 📄 8. Pillar B: Zero-Click Synthetic Resume File Upload Engine

Bypasses the traditional drag-and-drop file friction by programmatically streaming and injecting candidate resumes directly into ATS file inputs:
1. **CORS/CSP Defense Streaming Bridge (`background.js`):** The service worker uses its elevated host permissions to stream candidate PDF binaries from `/api/resume/download/latest?token=...`, encodes the buffer into base64, and returns `{ success: true, base64, filename, mimeType, size }`.
2. **W3C DataTransfer Synthesis (`content.js`):** Converts base64 to typed `Uint8Array`, creates a W3C `Blob` & `File`, populates a standard `DataTransfer` object (`dt.items.add(file)`), and assigns `input.files = dt.files`.
3. **Dual Event Dispatching:** Dispatches `input` and `change` on the `<input type="file">`, and dispatches synthetic `DragEvent('drop', { dataTransfer: dt })` on enclosing dropzone wrappers (Ashby, Workday, Greenhouse).
4. **Hidden Input Visibility Immunity:** Calibrates scanner geometry so `opacity: 0` or 0-dimension file inputs are not discarded during scanning.
5. **Graceful Disk Fallback:** If synthetic injection fails or is blocked by extreme sandbox restrictions, automatically falls back to background disk download (`DOWNLOAD_RESUME`).

---

## 🪜 9. Pillar C: ATS Multi-Step Form State Machine & Navigational Memory

Handles multi-page / multi-section job applications (Workday, Ashby, SmartRecruiters, Greenhouse multi-part) across dynamic SPA step re-renders and full page reloads:
1. **Multi-Step Form Classifier (`classifyCurrentStep()`):** Scans DOM steppers (`[role="progressbar"]`, `.stepper`, `[class*="wizard"]`, `ol > li`), step indicators (`"Step 2 of 4"`), and contextual action buttons to determine:
   - `isMultiStep`: Whether this application is split across multiple steps.
   - `stepIndex`: Current 1-based step number.
   - `totalSteps`: Total steps identified (or null if indefinite).
   - `stepName`: Semantic step title (e.g., "Contact Information", "Experience", "Review & Submit").
   - `isFinalStep`: Whether the current step is the final review/submit screen.
2. **Button Disambiguation (`isNextStepButton()` vs `isSubmitApplicationButton()`):** Disambiguates forward navigation buttons ("Next", "Save & Continue", "Proceed") from irreversible submission triggers ("Submit Application", "Confirm & Apply", "Send Application"). Ensures the HUD never prompts "Mark as Submitted" while intermediate steps remain.
3. **Persistent Navigational Memory (`ap_nav_session` in `sessionStorage`):** Stores application progression state across SPA container swaps and hard reloads:
   - Tracks `activeFillId`, `applicationId`, `currentStepIndex`, `totalSteps`, and `stepHistory`.
   - Accumulates `cumulativeFieldsFilled` and `cumulativeFieldsTotal` across all visited steps.
   - Enforces the backend accounting invariant (`fieldsFilled <= fieldsTotal`) so the final `/api/autopilot/log` telemetry call never triggers HTTP 400.
4. **Reactive SPA `MutationObserver` Transition Watcher (`watchForStepTransition()`):** Replaces brittle fixed `setTimeout` sleeps with dynamic DOM mutation tracking:
   - Monitors container mutations after clicking "Next Step".
   - Uses a 300ms quiet debounce once new interactive form inputs (`input`, `select`, `textarea`, comboboxes) mount into the DOM.
   - Features a 4000ms safety timeout fallback.
5. **Dynamic HUD Step Progression UI:**
   - Visual step pill badge (`setStepBadge("Step 2/4: Experience")`).
   - `step-complete` state showing step statistics and transforming the primary action button to `"Continue to Next Step →"`.
   - `transitioning` state featuring an animated pulse spinner while the next step mounts.
   - Automatically auto-scans and re-primes autofill for the subsequent step once settled.

---

## 🧠 10. Pillar D: Smart Screening Q&A Memory Bank & Semantic Vault

Transforms AstrePilot from an ephemeral single-shot LLM generator into a learning, adaptive career copilot with candidate-scoped persistent memory:
1. **Persistent Vault Schema (`ScreeningQuestionVault`):** First-class Prisma model in `prisma/schema.prisma` connected to LibSQL distributed SQLite and Turso Cloud, storing `questionPattern`, `keywords` (token stems), `answerText`, `category` (`MOTIVATION`, `TECHNICAL`, `BEHAVIORAL`, `LOGISTICS`, `COMPENSATION`, `GENERAL`), `isFavorite`, and `timesUsed`.
2. **Fast Semantic Matching Engine (`src/lib/autopilot/qaVaultEngine.ts`):** Sub-5ms deterministic + fuzzy matching:
   - Strips grammatical noise and normalizes technical abbreviations (`react.js` $\rightarrow$ `react`, `ts` $\rightarrow$ `typescript`, `compensation` $\rightarrow$ `salary`).
   - Evaluates token coverage, Jaccard similarity, N-gram phrase containment, and category affinity.
   - Interpolates dynamic template slots (`{{COMPANY}}`, `{{ROLE}}`) to customize answers to the active employer and position on the fly.
3. **Pre-Seeded Ammunition (`src/lib/autopilot/qaVaultSeed.ts`):** Auto-seeds verified, Section 5 Title-Compliant answers for Roushan Kumar & Ayushi Raj (Distributed Harvesters, High-Concurrency LibSQL WAL, Caddy HTTP/3 Architecture, ATS Typography, Notice Period, Market Compensation).
4. **HUD Integration & 1-Click Save (`extension/hud-ui.js` & `extension/content.js`):**
   - Shows blue `Vault 94%` badge on matched screening questions instead of generic `AI` badge.
   - Real-time textarea input listeners update HUD preview as the user types.
   - `[💾 Save to Vault]` action button allows candidates to save custom or edited answers directly to their cloud database with 1 click.
5. **Workspace Management UI (`ScreeningVaultCard.tsx`):** High-density workspace dashboard in `/settings` for searching, filtering by category, toggling favorite priorities, reading expanded responses, and adding new Q&A ammunition.



