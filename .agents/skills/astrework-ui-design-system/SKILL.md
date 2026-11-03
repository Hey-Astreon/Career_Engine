---
name: astrework-ui-design-system
description: >-
  Complete frontend architecture, curated CSS design tokens (--canvas, --surface, --ink, --blue, --green, --red, --amber, --line),
  dark mode protocols, typography scales, button hierarchy, workspace dashboard layout (.ce-shell, .ce-rail, .ce-header, .ce-drawer),
  keyboard shortcuts (Cmd+K, Alt+Shift+A, J/K), and public landing page conversion & Framer Motion rules for AstreWork
  (src/app/globals.css, src/app/(workspace)/dashboard/page.tsx, src/app/(public)/page.tsx).
---

# 🎨 AstreWork UI Design System, Workspace Geometry & Landing Page Mastery

This unified skill governs all visual tokens, dark mode variables, typography hierarchies, interactive buttons, dashboard workspace geometry (`.ce-*`), keyboard navigation, and public landing page choreography across `src/app/globals.css`, `src/app/(workspace)/*`, and `src/app/(public)/page.tsx`.

---

## 🎨 PART 1: CORE COLOR TOKENS & TYPOGRAPHY (`src/app/globals.css`)

AstreWork avoids raw uncalibrated primary colors (`#000000`, `#ff0000`, `#0000ff`). Every token is calibrated for optical balance and $\ge 7:1$ WCAG AAA heading contrast.

### 1. Light Mode (`:root`) & Dark Mode (`[data-theme='dark']`) Tokens
```css
:root {
  --canvas: #f7f9fc;        --surface: #ffffff;       --surface-muted: #f1f5fa;
  --ink: #142033;           --ink-soft: #35435a;      --muted: #728096;
  --line: #e2e8f0;          --line-strong: #d3dce8;
  --blue: #1d5fd1;          --blue-soft: #eaf1ff;
  --green: #13875c;         --green-soft: #e9f8f1;
  --red: #bd3b3b;           --red-soft: #fff0f0;
  --amber: #a96500;         --amber-soft: #fff6e5;
  --shadow: 0 18px 45px rgba(26, 43, 70, 0.06);
}

[data-theme='dark'] {
  --canvas: #0b0f19;        --surface: #111827;       --surface-muted: #1e293b;
  --ink: #f8fafc;           --ink-soft: #94a3b8;      --muted: #64748b;
  --line: #1e293b;          --line-strong: #334155;
  --blue: #3b82f6;          --blue-soft: rgba(59, 130, 246, 0.15);
  --green: #22c55e;         --green-soft: rgba(34, 197, 94, 0.15);
  --red: #f87171;           --red-soft: rgba(248, 113, 113, 0.15);
  --amber: #fbbf24;         --amber-soft: rgba(251, 191, 36, 0.15);
  --shadow: 0 18px 45px rgba(0, 0, 0, 0.45);
}
```

### 2. The Font Trio & Modular Type Scale
- **Primary UI (`var(--font-inter)`):** Navigation, body copy, form controls, and A4 resume sheets.
- **Display Headings (`Outfit` / `Inter Display`):** Tight tracking (`letter-spacing: -.045em` to `-.075em`) for workspace and hero titles.
- **Monospace (`var(--font-mono)`):** ATS scores, salary bands, `.ce-chip` badges, and eyebrow labels (`font-size: 8px–9px; font-weight: 700; text-transform: uppercase; letter-spacing: .12em;`). Never exceed `9px` on uppercase tracking labels.

### 3. Button Hierarchy & Glassmorphism Limits
- **`.ce-button-primary`:** `background: var(--ink); color: #fff; border-radius: 6px; font-size: 11px; font-weight: 750; min-height: 36px;` (`hover: var(--blue)`).
- **`.ce-button-secondary`:** `border: 1px solid var(--line-strong); background: var(--surface); color: var(--ink);`.
- **`.ce-button-quiet`:** `background: transparent; color: var(--muted);` (`hover: var(--surface-muted)`).
- **Blur Ceiling:** Never exceed `backdrop-filter: blur(16px)` on sticky headers or `blur(5px)` on `.ce-drawer-backdrop` to maintain 60 FPS scrolling.

---

## 🎛️ PART 2: WORKSPACE DASHBOARD GEOMETRY & HOTKEYS (`src/app/(workspace)/`)

```
+-------------------------------------------------------------------------+
| .ce-rail (242px fixed) |  .ce-header (72px sticky glass)                |
|                        +------------------------------------------------+
|  • Brand Logo & Mark   |  .ce-workspace (Fluid: calc(100% - 242px))     |
|  • Navigation Links    |                                                |
|  • Candidate Switcher  |  +------------------+  +---------------------+ |
|  • Live System Dot     |  | .ce-main (1460px)|  | Slide-over JobDrawer| |
|                        |  | Job Stream Feed  |  | (.ce-drawer)        | |
|                        |  +------------------+  +---------------------+ |
+-------------------------------------------------------------------------+
```

### 1. Layout & Badge Invariants
- **CLS Hard Limit:** `CLS < 0.02`. Loading skeletons must match exact card heights.
- **Unified KPI Bar:** Use segmented continuous bars (`divide-x divide-[var(--line)] border border-[var(--line)] rounded-lg bg-[var(--surface)]`) instead of isolated rainbow-bordered cards.
- **Feed Evaluation & Shield Badges:**
  - `.ce-chip-green` (High match / Remote Worldwide), `.ce-chip-blue` (Fresh `< 24h`), `.ce-chip-amber` (Caution), `.ce-chip-red` (Ineligible / Scam).
  - `.shield-blocked-card`: Dimmed (`opacity: .55; filter: grayscale(.35);`), **never silently hidden**, so candidates see AstreShield actively protecting them.

### 2. Keyboard Navigation Registry
Always guard hotkeys with `if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) return;`:
- `Cmd + K` / `Ctrl + K`: Open global Command Palette search.
- `Alt + Shift + A`: Quick Apply / Auto-Tailor focused job or toggle AstrePilot HUD.
- `J` / `K`: Navigate next / previous job in stream.
- `Space`: Open selected job in `.ce-drawer`.
- `Escape`: Close active drawer, modal, or command palette.

### 3. Responsive Breakpoints
- **`@media (max-width: 920px)`:** `.ce-rail` collapses to top horizontal bar; `.ce-workspace` expands to `width: 100%; margin-left: 0;`.
- **`@media (max-width: 620px)`:** `.ce-drawer` transforms into a bottom mobile sheet (`max-height: 92dvh; border-radius: 10px 10px 0 0;`).

---

## 🚀 PART 3: PUBLIC LANDING PAGE & CONVERSION ARCHITECTURE (`src/app/(public)/page.tsx`)

### 1. Pain-First Conversion Flow
1. **Agony Anchor Headline:** Speaks directly to candidates tired of sending resumes into black-hole ATS filters.
2. **Autonomous Solution Sub-headline:** Highlights real-time remote harvesting, AstreShield scam interception, single-page A4 tailoring, and AstrePilot 1-click autofill.
3. **Live Public Proof (`/api/public/metrics`):** Served with `Cache-Control: public, s-maxage=300, stale-while-revalidate=600` for zero-flicker metrics without database hammering.

### 2. Framer Motion & Performance Discipline
- **Motion Presets:** Use `FADE_UP` (`duration: 0.55, ease: [0.16, 1, 0.3, 1]`) and `STAGGER_CONTAINER` (`staggerChildren: 0.08`), respecting `useReducedMotion()`.
- **Zero Heavy 3D/Canvas Bloat:** Keep the landing page free of unused canvas particle components or Three.js bundles to preserve sub-second First Contentful Paint (FCP) and `overflow-x: clip` across mobile viewports (`320px+`).

