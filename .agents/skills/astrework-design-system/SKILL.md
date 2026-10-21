---
name: astrework-design-system
description: >-
  Curated color tokens, dark mode protocols, typography scales, button hierarchies, and glassmorphism rules
  for AstreWork. Use whenever defining CSS variables, updating globals.css, building new components,
  styling badges or buttons, or auditing WCAG contrast ratios.
---

# 🎨 AstreWork Design System & Color Palette Mastery

This skill defines the visual language, curated color tokens, typography scales, and component styling laws across the entire AstreWork application (`src/app/globals.css`).

---

## 🎨 1. Core Color Tokens & Semantic Architecture

AstreWork avoids raw, uncalibrated primary colors (e.g., `#ff0000` or `#0000ff`). Every hex code is tuned for optical balance, readability, and a premium enterprise aesthetic.

### Light Mode Tokens (Primary Workspace)
```css
:root {
  /* Surfaces & Canvas */
  --canvas: #f7f9fc;               /* Off-white, soft background */
  --surface: #ffffff;              /* Crisp card/dialog background */
  --surface-subtle: #f1f5f9;       /* Secondary card backings */
  
  /* Ink & Typography */
  --ink: #142033;                  /* Deep navy charcoal for primary text */
  --ink-secondary: #475569;        /* Medium slate for body/descriptions */
  --ink-muted: #94a3b8;            /* Low-contrast captions and hints */
  
  /* Accents & Intent */
  --blue: #1d5fd1;                 /* Primary brand electric blue */
  --blue-hover: #174eb3;           /* Darkened primary on hover */
  --blue-subtle: rgba(29, 95, 209, 0.08); /* Selection / active tabs */
  
  --green: #13875c;                /* Verified legitimacy / high ATS match */
  --green-subtle: #e6f6ee;         /* Success pill backgrounds */
  
  --red: #bd3b3b;                  /* Threat blocked / critical scam flag */
  --red-subtle: #fce8e8;           /* Danger pill backgrounds */
  
  --amber: #a96500;                /* Caution / incomplete candidate profile */
  --amber-subtle: #fef5e7;         /* Warning pill backgrounds */
  
  /* Structural Borders & Shadows */
  --line: #e2e8f0;                 /* Subtle dividing border */
  --line-strong: #cbd5e1;          /* Active input/border state */
  --shadow: 0 18px 45px rgba(20, 32, 51, 0.06), 0 2px 6px rgba(20, 32, 51, 0.03);
  --shadow-elevated: 0 25px 60px rgba(20, 32, 51, 0.12), 0 4px 12px rgba(20, 32, 51, 0.05);
}
```

### Dark Mode Tokens (`[data-theme='dark']`)
```css
[data-theme='dark'] {
  --canvas: #0b0f19;               /* Deep void slate */
  --surface: #111827;              /* Midnight elevated panel */
  --surface-subtle: #1e293b;       /* Dark secondary backing */
  
  --ink: #f8fafc;                  /* Off-white readable text */
  --ink-secondary: #94a3b8;        /* Light muted slate */
  --ink-muted: #64748b;            /* Dark muted caption */
  
  --blue: #3b82f6;                 /* Lighter electric blue for dark contrast */
  --blue-hover: #60a5fa;
  --blue-subtle: rgba(59, 130, 246, 0.15);
  
  --green: #22c55e;                /* Bright emerald for dark backgrounds */
  --green-subtle: rgba(34, 197, 94, 0.15);
  
  --red: #f87171;                  /* Vibrant rose-red */
  --red-subtle: rgba(248, 113, 113, 0.15);
  
  --amber: #fbbf24;                /* Vivid amber */
  --amber-subtle: rgba(251, 191, 36, 0.15);
  
  --line: #1e293b;                 /* Dark borders */
  --line-strong: #334155;
  --shadow: 0 18px 45px rgba(0, 0, 0, 0.45);
}
```

---

## 🖋️ 2. Typography Hierarchy & Font Scales

Typography must convey authority, clarity, and precision.

### The Font Trio
1. **Primary UI (`--font-inter`):** Used for navigation, body text, form controls, and resume bodies.
2. **Headings (`Outfit` / `Inter Display`):** Clean, high-impact sans-serif with tight letter-spacing (`letter-spacing: -0.025em`) for landing page and section titles.
3. **Monospace (`JetBrains Mono` / `Courier New`):** Used for ATS match scores, token IDs, salary numbers, and technical tags.

### Modular Type Scale
| Level | Font Size | Line Height | Weight | Usage |
| :--- | :--- | :--- | :--- | :--- |
| `text-hero` | 44px (2.75rem) | 1.1 | 800 Bold | Landing page main headline |
| `text-h1` | 32px (2.00rem) | 1.2 | 700 Bold | Workspace section headings |
| `text-h2` | 24px (1.50rem) | 1.3 | 600 SemiBold | Modal & Drawer titles |
| `text-h3` | 18px (1.125rem) | 1.4 | 600 SemiBold | Card titles & Group headers |
| `text-body` | 14px (0.875rem) | 1.5 | 400 Regular | Standard UI text, descriptions |
| `text-small` | 12px (0.75rem) | 1.4 | 500 Medium | Badges, chips, table metadata |
| `text-micro` | 10px (0.625rem) | 1.2 | 600 SemiBold | Uppercase section markers |

---

## 🔘 3. Button & Interactive Component Hierarchy

Avoid arbitrary button styles. Every clickable element must belong to a formal tier.

### 1. Primary Button (`.ce-btn-primary`)
- **Visual:** Solid brand blue (`var(--blue)`) with white text and a subtle top-light edge highlight:
  ```css
  background: linear-gradient(180deg, #256be4 0%, #1d5fd1 100%);
  border: 1px solid #174eb3;
  color: #ffffff;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(29, 95, 209, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2);
  ```
- **Usage:** Main affirmative action (e.g., `"Download ATS Resume"`, `"Apply Now"`).

### 2. Secondary Button (`.ce-btn-secondary`)
- **Visual:** White surface with subtle gray border:
  ```css
  background: var(--surface);
  border: 1px solid var(--line);
  color: var(--ink);
  ```
- **Usage:** Filters, secondary actions, dismissals.

### 3. Ghost Button (`.ce-btn-ghost`)
- **Visual:** Transparent background; background transitions to `var(--surface-subtle)` on hover.
- **Usage:** Navigation links, icon buttons, command triggers.

### 4. Danger Button (`.ce-btn-danger`)
- **Visual:** `background: var(--red); color: #ffffff;`
- **Usage:** Irreversible actions (delete profile, purge history).

---

## 🧊 4. Glassmorphism & Blur Mechanics

To maintain high visual quality without causing performance degradations:
- **Maximum Blur:** Never exceed `backdrop-filter: blur(16px)` on high-frequency scrolling containers. Excessive blur drops mobile FPS below 30.
- **Border Pairing:** Glass surfaces MUST include a semi-transparent border:
  ```css
  background: rgba(255, 255, 255, 0.78);
  backdrop-filter: blur(14px);
  border: 1px solid rgba(255, 255, 255, 0.6);
  ```
  *(In dark mode, use `background: rgba(17, 24, 39, 0.75); border: 1px solid rgba(255, 255, 255, 0.08);`)*

---

## 🚫 5. Strictly Forbidden Anti-Patterns

1. **NO Pure Black (`#000000`):** Use `#0b0f19` or `#142033` instead. Pure black destroys depth perception and causes visual fatigue.
2. **NO Pure Red (`#ff0000`):** Use calibrated crimson `--red: #bd3b3b` or rose `#f87171`.
3. **NO Ad-hoc Padding/Margin:** All spacing must adhere to the 4px modular grid (`4px`, `8px`, `12px`, `16px`, `24px`, `32px`, `48px`).
4. **NO Low-Contrast Text:** Primary body text must guarantee a contrast ratio of at least 4.5:1 against its background; headings must exceed 7:1 (WCAG AAA).
