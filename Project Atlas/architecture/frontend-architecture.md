# Canonical Frontend Architecture

**Last Verified:** 2026-07-03  
**Status:** Canonical Architecture Specification  
**Location:** `Project Atlas/architecture/frontend-architecture.md`  

---

## Technical Stack

* **Core Framework:** React 18, TypeScript 5, Vite 6.
* **Hosting:** Vercel (`wiseresume.app`).
* **Routing:** React Router v6 (`BrowserRouter`).
* **State & Data Fetching:** TanStack Query (`@tanstack/react-query`), Zustand stores (`useAuthStore`, `useResumeStore`).
* **Styling:** Tailwind CSS v4, Radix UI primitives, shadcn/ui, Framer Motion (`[0.22, 1, 0.36, 1]` ease-out-quart curve).

---

## Key Design & Performance Standards

1. **Brand Colors:** WiseResume Primary `#9E1B22` (crimson), WiseHire Primary `#1D4ED8` (blue).
2. **Reduced Motion:** All animation loops must gate on Framer Motion's `useReducedMotion()`.
3. **Touch Targets:** 44px minimum height/width for interactive buttons.
4. **Focus Rings:** Visible focus ring on all focusable inputs (`focus-visible:ring-[#9E1B22]`).
