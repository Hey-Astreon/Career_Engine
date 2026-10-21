---
name: astrework-design-system
description: >-
  Curated CSS variables (--canvas, --surface, --surface-muted, --ink, --ink-soft, --muted, --line, --blue, --green, --red, --amber),
  dark mode protocols, typography scales, button hierarchies (.ce-button-primary, .ce-button-secondary, .ce-button-quiet),
  and glassmorphism rules for AstreWork (src/app/globals.css). Use whenever defining CSS variables, updating globals.css,
  building new components, styling badges or buttons, or auditing WCAG contrast ratios.
---

# 🎨 AstreWork Design System & Color Palette Mastery

This skill defines the visual language, curated color tokens, typography scales, and component styling laws across the entire AstreWork application (`src/app/globals.css`).

---

## 🎨 1. Core Color Tokens & Semantic Architecture (`src/app/globals.css`)

AstreWork avoids raw, uncalibrated primary colors (e.g., `#ff0000` or `#0000ff`). Every hex code is tuned for optical balance, readability, and a premium enterprise aesthetic.

### Light Mode Root Tokens (`:root`)
```css
:root {
  /* Surfaces & Canvas */
  --canvas: #f7f9fc;               /* Off-white, soft background */
  --surface: #ffffff;              /* Crisp card/dialog background */
  --surface-muted: #f1f5fa;        /* Secondary card and input backings */
  
  /* Ink & Typography */
  --ink: #142033;                  /* Deep navy charcoal for primary text */
  --ink-soft: #35435a;             /* Medium slate for body/descriptions */
  --muted: #728096;                /* Low-contrast captions and hints */
  
  /* Structural Borders & Line */
  --line: #e2e8f0;                 /* Subtle dividing border */
  --line-strong: #d3dce8;          /* Active input/border state */
  
  /* Accents & Intent */
  --blue: #1d5fd1;                 /* Primary brand electric blue */
  --blue-soft: #eaf1ff;            /* Blue tint for active navigation tabs */
  
  --green: #13875c;                /* Verified legitimacy / high ATS match */
  --green-soft: #e9f8f1;           /* Success pill backgrounds */
  
  --red: #bd3b3b;                  /* Threat blocked / critical scam flag */
  --red-soft: #fff0f0;             /* Danger pill backgrounds */
  
  --amber: #a96500;                /* Caution / incomplete candidate profile */
  --amber-soft: #fff6e5;           /* Warning pill backgrounds */
  
  /* Elevation Shadows */
  --shadow: 0 18px 45px rgba(26, 43, 70, 0.06);
}
```

### Dark Mode Tokens (`[data-theme='dark']`)
```css
[data-theme='dark'] {
  --canvas: #0b0f19;               /* Deep void slate */
  --surface: #111827;              /* Midnight elevated panel */
  --surface-muted: #1e293b;        /* Dark secondary backing */
  
  --ink: #f8fafc;                  /* Off-white readable text */
  --ink-soft: #94a3b8;             /* Light muted slate */
  --muted: #64748b;                /* Dark muted caption */
  
  --line: #1e293b;                 /* Dark borders */
  --line-strong: #334155;
  
  --blue: #3b82f6;                 /* Lighter electric blue for dark contrast */
  --blue-soft: rgba(59, 130, 246, 0.15);
  
  --green: #22c55e;                /* Bright emerald for dark backgrounds */
  --green-soft: rgba(34, 197, 94, 0.15);
  
  --red: #f87171;                  /* Vibrant rose-red */
  --red-soft: rgba(248, 113, 113, 0.15);
  
  --amber: #fbbf24;                /* Vivid amber */
  --amber-soft: rgba(251, 191, 36, 0.15);
  
  --shadow: 0 18px 45px rgba(0, 0, 0, 0.45);
}
```

---

## 🖋️ 2. Typography Hierarchy & Font Scales

Typography must convey authority, clarity, and precision.

### The Font Trio
1. **Primary UI (`var(--font-inter)`):** Used for navigation, body text, form controls, and resume bodies.
2. **Headings (`Outfit` / `Inter Display`):** Clean, high-impact sans-serif with tight letter-spacing (`letter-spacing: -.075em`) for landing page and section titles.
3. **Monospace (`var(--font-mono)`):** Used for ATS match scores, token IDs, salary numbers, chip badges, and technical tags (`letter-spacing: .08em; text-transform: uppercase;`).

### Modular Type Scale
| Level | Font Size | Line Height | Weight | Usage |
| :--- | :--- | :--- | :--- | :--- |
| `text-hero` | `clamp(2rem, 3.7vw, 3.55rem)` | 0.98 | 750 Bold | Main workspace page titles (`.ce-page-title`) |
| `text-eyebrow`| 9px | 1.0 | 700 Bold | Section eyebrow label (`.ce-page-eyebrow`, mono uppercase) |
| `text-h2` | 24px (1.50rem) | 1.3 | 600 SemiBold | Modal & Drawer titles |
| `text-h3` | 18px (1.125rem) | 1.4 | 600 SemiBold | Card titles & Group headers |
| `text-body` | 13px–14px | 1.65 | 400 Regular | Standard UI text, descriptions (`.ce-page-copy`) |
| `text-small` | 11px | 1.4 | 600 Medium | Buttons, command inputs, field inputs |
| `text-micro` | 7px–8px | 1.2 | 700 Bold | Chips, badges, mono metadata (`.ce-chip`, `.shield-badge`) |

---

## 🔘 3. Button & Interactive Component Hierarchy (`globals.css`)

Avoid arbitrary button styles. Every clickable element must belong to a formal tier.

### 1. Primary Action Button (`.ce-button-primary`)
- **Visual Spec:**
  ```css
  .ce-button-primary {
    border: 1px solid var(--ink);
    background: var(--ink);
    color: #fff;
    border-radius: 6px;
    font-size: 11px;
    font-weight: 750;
    min-height: 36px;
    padding: 0 13px;
  }
  .ce-button-primary:hover {
    background: var(--blue);
    border-color: var(--blue);
  }
  .ce-button-primary:active {
    transform: scale(.98);
  }
  ```
- **Usage:** Main affirmative action (e.g. `"Launch Free Workspace"`, `"Apply Now"`, `"Tailor Resume"`).

### 2. Secondary Button (`.ce-button-secondary`)
- **Visual Spec:**
  ```css
  .ce-button-secondary {
    border: 1px solid var(--line-strong);
    background: var(--surface);
    color: var(--ink);
    border-radius: 6px;
    font-size: 11px;
    font-weight: 750;
  }
  .ce-button-secondary:hover {
    border-color: var(--blue);
    color: var(--blue);
  }
  ```
- **Usage:** Filters, secondary actions, dismissals.

### 3. Quiet Button (`.ce-button-quiet`)
- **Visual Spec:**
  ```css
  .ce-button-quiet {
    border: 1px solid transparent;
    background: transparent;
    color: var(--muted);
  }
  .ce-button-quiet:hover {
    background: var(--surface-muted);
    color: var(--ink);
  }
  ```
- **Usage:** Icon buttons, command palette dismiss, pagination controls.

---

## 🧊 4. Glassmorphism & Blur Mechanics

To maintain high visual quality without causing performance degradations:
- **Maximum Blur:** Never exceed `backdrop-filter: blur(16px)` on high-frequency scrolling containers. Excessive blur drops mobile FPS below 30.
- **Sticky Header Glass:**
  ```css
  background: rgba(255, 255, 255, .94);
  backdrop-filter: blur(16px);
  border-bottom: 1px solid var(--line);
  ```
- **Drawer Backdrop:**
  ```css
  background: rgba(15, 23, 42, .42);
  backdrop-filter: blur(5px);
  ```

---

## 🚫 5. Strictly Forbidden Anti-Patterns

1. **NO Pure Black (`#000000`):** Use `#0b0f19` or `--ink: #142033` instead. Pure black destroys depth perception and causes visual fatigue.
2. **NO Pure Red (`#ff0000`):** Use calibrated crimson `--red: #bd3b3b` or rose `#f87171`.
3. **NO Ad-hoc Padding/Margin:** All spacing must adhere to the 4px modular grid (`4px`, `8px`, `12px`, `16px`, `24px`, `32px`, `48px`).
4. **NO Low-Contrast Text:** Primary body text must guarantee a contrast ratio of at least 4.5:1 against its background; headings must exceed 7:1 (WCAG AAA).
