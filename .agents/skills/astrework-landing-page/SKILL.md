---
name: astrework-landing-page
description: >-
  High-conversion landing page design, aesthetic visual excellence, glassmorphism, Framer Motion choreography,
  and dynamic metrics integration for AstreWork's public portal (src/app/(public)/page.tsx). Use whenever updating
  hero visuals, conversion copy, public API counters, interactive demos, or responsive layout viewports.
---

# 🚀 AstreWork Landing Page Engineering & Aesthetic Mastery

This skill defines the architectural, visual, and behavioral standards for the AstreWork public portal (`src/app/(public)/page.tsx`), engineered to deliver an immediate, high-converting "WOW" factor while upholding sub-second paint performance and flawless responsive fidelity.

---

## 🎯 1. Pain-First Conversion Architecture

AstreWork does not sell features; it solves the brutal reality of the modern remote job hunt.

### The Conversion Hierarchy
1. **The Agony Anchor (Hero Headline):**
   - *"Stop sending resumes into the void."*
   - Immediately resonates with candidates sending 500+ unreviewed applications to black-hole ATS filters.
2. **The Autonomous Solution (Sub-headline):**
   - An intelligent career copilot that scores real remote roles, detects ghost job listings with AstreShield, auto-tailors ATS-compliant resumes with mathematical precision, and executes verified submissions.
3. **Primary Direct CTA:**
   - Single-click action: `"Launch Free Workspace"` or `"Try Live ATS Builder"`.
   - Accompanied by trust micro-copy: *“No credit card required • Instant ATS score • 100% Privacy First”*.
4. **Live Public Proof (Real-time Metrics):**
   - Synchronized counter pill showing active verified jobs (`1,200+`), hours saved, and fraud jobs intercepted.

---

## 🌌 2. Visual Architecture: Idea1HeroVisual & DataDustBackground

The visual centerpiece blends state-of-the-art interactive canvas effects with minimal CPU/GPU overhead.

### Canvas Performance Laws
- **Dynamic Particle Budgeting:** Never exceed 45 floating data particles in `DataDustBackground`. Canvas resize events must be debounced with `requestAnimationFrame`.
- **Offscreen Disabling:** Particle physics must pause when the tab is blurred or the hero section scrolls out of the viewport (`IntersectionObserver`).
- **Gradient Glass Glows:** Use layered radial gradient backdrops with low alpha:
  ```css
  background: radial-gradient(circle at 50% 20%, rgba(29, 95, 209, 0.08) 0%, rgba(247, 249, 252, 0) 70%);
  ```
- **Layer Stacking:** Canvas background at `z-index: 0`, interactive glass cards at `z-index: 10`, dropdowns and modals at `z-index: 50`.

---

## 🎭 3. Framer Motion Motion Choreography

All transitions must feel natural, physical, and cohesive—never jittery or abrupt.

### Reusable Motion Presets
```tsx
export const FADE_UP = {
  hidden: { opacity: 0, y: 24 },
  visible: { 
    opacity: 1, 
    y: 0, 
    transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] } 
  }
};

export const STAGGER_CONTAINER = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 }
  }
};
```

### Micro-Interaction Principles
- **Button Hover Elevation:** `whileHover={{ y: -2, scale: 1.01 }}` paired with a glowing border shift.
- **Glass Card Hover:** Subtle border illumination (`rgba(29, 95, 209, 0.4)`) and shadow expansion (`0 20px 40px -15px rgba(20, 32, 51, 0.08)`).
- **Reduced Motion Support:** Always check `useReducedMotion()`. When active, swap position translations for simple opacity cross-fades.

---

## 📊 4. Dynamic Public Metrics (`/api/public/metrics`)

Static hardcoded numbers erode user trust. AstreWork pairs real database aggregates with an instant fallback.

### API Architecture & Zero-Flicker SWR
- **Endpoint:** `/api/public/metrics` returns:
  ```json
  {
    "activeJobs": 1420,
    "tailoredResumes": 3890,
    "scamAlertsPrevented": 426,
    "avgAtsScore": 94
  }
  ```
- **Caching Header:** `Cache-Control: public, s-maxage=300, stale-while-revalidate=600` to prevent database hammering on viral traffic spikes.
- **Animated Number Counter:** Use an ease-out numeric interpolator over 1.2 seconds when entering viewport to create dynamic momentum without layout thrash.

---

## 📱 5. Viewport Responsiveness & Layout Stability

The landing page must maintain razor-sharp elegance from 4K ultrawides down to 320px mobile devices.

### Breakpoint Matrix
- **1440px+ (Ultrawide/Desktop):** Split 2-column hero: 55% value proposition, 45% interactive live widget.
- **1024px to 1439px (Laptop/Tablet Landscape):** Consolidated hero with interactive widget tucked below headline with 85% scale.
- **768px to 1023px (Tablet Portrait):** Single column stack. Navigation collapses to a blur-backed glass drawer.
- **Mobile (<768px):** 
  - Padding reduced from `48px` to `16px`.
  - Badges stacked vertically or horizontally scrollable with `scroll-snap-type: x mandatory`.
  - Zero horizontal overflow (`overflow-x: clip` on root container).
  - Floating CTA bar docked to bottom viewport for mobile conversions.

---

## 🎨 6. Aesthetic Polish Checklist

Before shipping any updates to `src/app/(public)/page.tsx`:
1. [ ] Is the primary contrast ratio between `--ink` (`#142033`) and `--canvas` (`#f7f9fc`) at least 7:1?
2. [ ] Are all SVGs and decorative icons wrapped with `aria-hidden="true"`?
3. [ ] Does the interactive terminal/preview have realistic live remote jobs rather than placeholder `Lorem Ipsum`?
4. [ ] Are all CTA routes pointing to correct authentication or workspace links (`/dashboard`, `/resume-builder`)?
5. [ ] Is the page bundle free of heavy 3D libraries (Three.js/WebGL) to preserve sub-second First Contentful Paint (FCP)?
