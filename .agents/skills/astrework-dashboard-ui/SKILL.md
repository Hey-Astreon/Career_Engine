---
name: astrework-dashboard-ui
description: >-
  Enterprise-grade workspace architecture, layout geometry, command palettes, slide-over drawers,
  and keyboard navigation for the AstreWork Dashboard (src/app/(workspace)/dashboard/page.tsx).
  Use whenever modifying sidebar navigation, header mechanics, KPI cards, job detail drawers, or hotkeys.
---

# 🎛️ AstreWork Dashboard UI & Workspace Geometry Mastery

This skill defines the structural layout, interaction patterns, typography hierarchy, and state management for the core AstreWork candidate workspace (`src/app/(workspace)/dashboard/page.tsx` and associated workspace layouts).

---

## 🏛️ 1. Layout Geometry & CSS Grid Architecture

The AstreWork workspace uses a rigid, zero-jitter layout foundation designed to support heavy data interaction without layout shifts.

```
+-------------------------------------------------------------------------+
| .ce-rail (242px)   |  .ce-header (72px sticky glass)                    |
|                    +----------------------------------------------------+
|  • Brand Logo      |  .ce-workspace (Fluid auto-fill)                   |
|  • Nav Items       |                                                    |
|  • Storage Bar     |  +------------------+  +-------------------------+ |
|  • Shield Status   |  | .ce-filter-bar   |  | Slide-over JobDrawer    | |
|  • User Profile    |  | Sticky Toolbar   |  | (540px right panel)     | |
|                    |  +------------------+  |                         | |
|                    |  | Job Cards Stream |  | Live ATS match score    | |
|                    |  | & KPI Summary    |  | One-click tailoring     | |
|                    |  +------------------+  +-------------------------+ |
+-------------------------------------------------------------------------+
```

### Core Workspace Tokens
- **Sidebar Width (`.ce-rail`):** Fixed `242px` on desktop (`min-width: 242px; max-width: 242px; flex: 0 0 242px`).
- **Sticky Header Height (`.ce-header`):** Fixed `72px` with `backdrop-filter: blur(16px)` and border-bottom `1px solid var(--line)`.
- **Slide-Over Drawer (`.ce-drawer`):** Fixed `540px` on desktop with `transform: translateX(0)` slide transition (`cubic-bezier(0.16, 1, 0.3, 1)`).
- **Cumulative Layout Shift (CLS) Constraint:** Hard limit `CLS < 0.02`. Height skeletons must always match exact component heights during network loading.

---

## 🏷️ 2. Component System & Data Density

AstreWork workspaces prioritize information hierarchy over decoration. Every pixel must communicate career intelligence.

### KPI Stat Cards
- 4-column balanced grid:
  1. **Matched Roles:** Green badge showing high affinity (Score > 85%).
  2. **Active Pipelines:** In-flight applications with status tracker.
  3. **AstreShield Interceptions:** Red shield counter indicating intercepted ghost/scam listings.
  4. **Tailored Resumes:** Count of generated job-specific PDF/DOCX assets.
- **Visual Spec:** `background: var(--surface); border: 1px solid var(--line); border-radius: 12px; padding: 20px 24px; box-shadow: var(--shadow);`

### Metadata Badge Hierarchy (`.ce-chip`)
Metadata chips must be instantly decipherable at a glance:
- **Workplace Type:** Remote (`bg: emerald-50, text: emerald-700, border: emerald-200`) vs Hybrid (`bg: blue-50, text: blue-700`).
- **Salary Tier:** Pill format: `$140k - $180k USD` with gold coin icon.
- **AstreShield Status:** 
  - Verified Legitimate: Shield icon in slate (`#64748b`).
  - Flagged/Suspicious: Warning amber (`#d97706`).
  - Blocked Scam: Critical red (`#dc2626`).

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

## 📱 4. Responsive Viewport Mechanics

When viewports narrow, the dashboard gracefully adapts without breaking candidate workflow:

### 1460px (Compact Desktop)
- KPI cards scale font size from `28px` to `22px`.
- Job cards switch from 2-column grid to full-width horizontal cards.

### 920px (Tablet Landscape & Portrait)
- `.ce-rail` collapses from `242px` to an icon-only dock (`64px`) with tooltips on hover.
- Slide-over JobDrawer expands to overlay 85% of screen width with backdrop dimmer.

### 620px (Mobile Devices)
- `.ce-rail` hides entirely; converts to a fixed bottom navigation dock (Home, Jobs, Resumes, Profile).
- JobDrawer expands to full screen (`100vw`, `100vh`) with fixed swipe-down dismiss handle.
- Filter toolbar becomes a horizontal swipeable pill carousel.

---

## 🛡️ 5. State Persistence & Filter Consistency

- **URL Syncing:** All active filters (query, remote, salary, minScore, source) must be mirrored into the URL query parameters using `window.history.replaceState` or Next.js `useSearchParams`.
- **Search Latency:** Debounce search input queries by exactly `250ms` to prevent search stutter.
- **Empty States:** When 0 jobs match filters, never display an empty blank void. Provide an empathetic empty state with a 1-click `"Clear All Filters"` button and recommendations for loosening score thresholds.
