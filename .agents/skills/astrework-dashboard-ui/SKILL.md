---
name: astrework-dashboard-ui
description: >-
  Enterprise-grade workspace architecture, layout geometry (.ce-shell, .ce-rail, .ce-workspace, .ce-header),
  command palettes, slide-over drawers (.ce-drawer), shield badges, and keyboard navigation for the AstreWork Dashboard
  (src/app/(workspace)/dashboard/page.tsx). Use whenever modifying sidebar navigation, header mechanics, KPI cards, job detail drawers, or hotkeys.
---

# 🎛️ AstreWork Dashboard UI & Workspace Geometry Mastery

This skill defines the structural layout, interaction patterns, typography hierarchy, and state management for the core AstreWork candidate workspace (`src/app/(workspace)/dashboard/page.tsx` and associated workspace layouts).

---

## 🏛️ 1. Layout Geometry & CSS Grid Architecture (`globals.css`)

The AstreWork workspace uses a rigid, zero-jitter layout foundation designed to support heavy data interaction without layout shifts.

```
+-------------------------------------------------------------------------+
| .ce-rail (242px fixed) |  .ce-header (72px sticky glass)                |
|                        +------------------------------------------------+
|  • Brand Logo & Mark   |  .ce-workspace (Fluid: calc(100% - 242px))     |
|  • Navigation Links    |                                                |
|  • Context & Progress  |  +------------------+  +---------------------+ |
|  • Live System Dot     |  | .ce-main (1460px)|  | Slide-over JobDrawer| |
|                        |  | Job Stream Feed  |  | (.ce-drawer 540px)  | |
|                        |  | & KPI Summary    |  | Live Match & Audit  | |
|                        |  +------------------+  +---------------------+ |
+-------------------------------------------------------------------------+
```

### Core Workspace Tokens
- **Root Shell (`.ce-shell`):** `min-height: 100vh; display: flex; background: var(--canvas);`
- **Sidebar Rail (`.ce-rail`):** Fixed `242px` width on desktop (`position: fixed; inset: 0 auto 0 0; z-index: 20; width: 242px; border-right: 1px solid var(--line); background: var(--surface);`).
- **Main Workspace (`.ce-workspace`):** `width: calc(100% - 242px); margin-left: 242px; min-height: 100vh;`
- **Sticky Header (`.ce-header`):** Fixed `72px` height with `backdrop-filter: blur(16px); background: rgba(255,255,255,.94); border-bottom: 1px solid var(--line);`.
- **Command Trigger (`.ce-command`):** `max-width: 470px; background: var(--surface-muted);` featuring `<kbd>` hotkey hints.
- **Main Container (`.ce-main`):** `max-width: 1460px; margin: 0 auto; padding: 50px 48px 42px;`
- **Slide-Over Drawer Backdrop (`.ce-drawer-backdrop`):** `position: fixed; inset: 0; z-index: 50; backdrop-filter: blur(5px); background: rgba(15,23,42,.42);`
- **Slide-Over Drawer Panel (`.ce-drawer`):** `width: min(1120px, 100%); max-height: min(880px, calc(100dvh - 56px)); border-radius: 10px; box-shadow: 0 24px 72px rgba(21,35,56,.22);`
- **Cumulative Layout Shift (CLS) Constraint:** Hard limit `CLS < 0.02`. Height skeletons must always match exact component heights during network loading.

---

## 🏷️ 2. Component System & Data Density

AstreWork workspaces prioritize information hierarchy over decoration. Every pixel must communicate career intelligence.

### Match & Feed Score Taxonomy
Every job in the stream displays a formal evaluation state:
- **`BASE_MATCH`:** 0ms deterministic keyword and qualification score.
- **`FINAL_MATCH`:** LLM composite score evaluating architectural depth and experience fit.
- **`INELIGIBLE` (`.ce-chip-red`):** Fails mandatory hard constraint (years of experience, location restriction, minimum salary).
- **`SHIELD_BLOCKED`:** Intercepted by AstreShield as malicious, phishing, or ghost listing.

### Metadata Badge Hierarchy (`.ce-chip`)
Metadata chips must be instantly decipherable at a glance:
- **`.ce-chip`:** Standard metadata (Category, Experience level, Platform source).
- **`.ce-chip-green`:** Remote Worldwide / High affinity match.
- **`.ce-chip-blue`:** Early-bird posting (< 24h old) / Fresh ingestion.
- **`.ce-chip-amber`:** Caution / Salary undisclosed / Borderline trust score.
- **`.ce-chip-red`:** Hard ineligible / Flagged scam.

### AstreShield Trust Indicators
- **`.shield-badge--green`:** Verified legitimate ATS / trusted community source.
- **`.shield-badge--amber`:** Caution / unverified domain / borderline trust (40-74).
- **`.shield-badge--red`:** Critical fraud / advance fee scam / PII harvesting (< 40).
- **`.shield-blocked-card`:** Card dimming rule (`opacity: .55; filter: grayscale(.35);`). Postings are dimmed for candidate protection, **never silently wiped**.

---

## ⌨️ 3. Keyboard Navigation & Power-User Shortcuts

Engineers and high-performing remote professionals rely on keyboard-first ergonomics.

### The Hotkey Registry
| Shortcut | Action | Scope |
| :--- | :--- | :--- |
| `Cmd + K` / `Ctrl + K` | Open global Command Palette search | Global Workspace |
| `Alt + Shift + A` | Quick Apply / Auto-Tailor currently focused job | Dashboard / Drawer |
| `J` / `K` | Navigate next / previous job in feed | Job Stream |
| `Space` | Preview selected job in slide-over drawer | Job Stream |
| `Escape` | Close active slide-over drawer, modal, or palette | Global Workspace |
| `Cmd + Enter` | Confirm action or submit prompt | Dialogs / Forms |

### Implementation Guard
Always verify event source target before firing hotkeys:
```ts
if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) {
  return; // Prevent hijacking form inputs
}
```

---

## 📱 4. Responsive Viewport Mechanics (`globals.css`)

When viewports narrow, the dashboard gracefully adapts without breaking candidate workflow:

### `@media (max-width: 920px)`
- `.ce-shell` switches to `display: block`.
- `.ce-rail` moves to top (`position: relative; width: 100%; flex-direction: row; align-items: center;`).
- `.ce-nav-label`, `.ce-rail-context`, `.ce-rail-footer`, and `.ce-header-title` hide (`display: none`).
- `.ce-workspace` expands to `width: 100%; margin-left: 0;`.
- `.ce-main` padding adjusts to `38px 24px`.

### `@media (max-width: 620px)`
- `.ce-rail` padding drops to `12px 14px`.
- `.ce-header` height adjusts to `61px`.
- `.ce-command kbd` and `.ce-nav-badge` hide to preserve input width.
- `.ce-main` padding drops to `30px 14px`.
- `.ce-drawer-backdrop` aligns to bottom (`align-items: flex-end; padding: 0;`).
- `.ce-drawer` expands to `max-height: 92dvh; border-radius: 10px 10px 0 0;` (mobile sheet drawer).

---

## 🛡️ 5. State Persistence & Filter Consistency

- **URL Syncing:** All active filters (query, remote, salary, minScore, source) must be mirrored into the URL query parameters using `window.history.replaceState` or Next.js `useSearchParams`.
- **Search Latency:** Debounce search input queries by exactly `250ms` to prevent search stutter.
- **Empty States:** When 0 jobs match filters, never display an empty blank void. Provide an empathetic empty state with a 1-click `"Clear All Filters"` button and recommendations for loosening score thresholds.
