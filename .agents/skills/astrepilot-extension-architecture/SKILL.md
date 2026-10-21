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
