

## Dashboard Empty State Enhancement

### Overview
Comprehensive overhaul of the empty state experience on `/dashboard` when a user has zero resumes. This touches the `EmptyState` component, `DashboardStats` header, `DailyTipCard`, and adds new sub-components for quick actions and a tips carousel.

---

### File Changes

#### 1. `src/components/dashboard/DailyTipCard.tsx` -- "Daily Tip" label + pulse

- Change the collapsed button label from `"Tip"` to `"Daily Tip"` (line 124)
- Add a subtle pulse animation class to the collapsed button: `animate-pulse` on the lightbulb icon wrapper

#### 2. `src/components/dashboard/DashboardStats.tsx` -- Rotating subtitle + reduced spacing

- Add a rotating motivational subtitle array (e.g., "Let's create something amazing today!", "Your next opportunity starts here", "One great resume away from your dream job")
- Use `AnimatePresence` with a 4-second interval to cycle through them with a fade transition below the greeting line
- Subtitle only appears when `totalResumes === 0` (empty state context)
- Change container padding from `pt-4 pb-3` to `pt-3 pb-2` to tighten gap between greeting and empty state (64px to ~40px)

#### 3. `src/components/dashboard/EmptyState.tsx` -- Major polish

**Staggered entrance animations:**
- Wrap the entire component in a parent `motion.div` with `staggerChildren: 0.1`
- Each sub-section (icon, heading, steps, templates, CTAs) becomes a child `motion.div` with `variants` for `hidden`/`visible` (fade-in + slide-up)
- Respect `prefers-reduced-motion` via a `useReducedMotion` check from framer-motion

**Icon enhancements (lines 31-45):**
- Add a slow pulsing glow ring: second `absolute inset-0` div with `animate-pulse` and `bg-primary/15 blur-xl scale-150`

**Heading (line 47):**
- Change `text-xl` to `text-2xl` (plan says reduce from 3xl to 2xl, but it's currently xl -- bumping to 2xl gives more prominence)

**Steps with dotted connectors (lines 63-81):**
- Add a vertical dotted line between steps using a `relative` wrapper and an `absolute` pseudo-element (`border-l-2 border-dashed border-primary/20`) connecting each step icon to the next
- Implemented as an explicit `div` between step items (height 12px, centered under the icon column)

**Template previews (lines 83-122):**
- Increase card width from `w-[80px]` to `w-[96px]` (20% larger)
- Add "Popular" badge on the Modern template: small absolute-positioned `Badge` with `text-[8px]`
- Add hover/active state: `hover:scale-105 hover:shadow-xl transition-all duration-200`
- Increase gap from `gap-3` to `gap-4`

**CTA buttons (lines 124-145):**
- The "Create Your First Resume" button already has a Plus icon -- add a 3-pulse animation on mount using a custom motion animation (`animate={{ scale: [1, 1.03, 1] }}` with `transition={{ times: [0,0.5,1], duration: 0.6, repeat: 2 }}`)
- Add `LayoutGrid` icon to "Browse All Templates" button
- Ensure `gap-3` between buttons (add wrapper `div` with `flex flex-col gap-3 w-full max-w-xs`)

#### 4. `src/pages/DashboardPage.tsx` -- Quick Actions + Tips Carousel in empty state

**Quick Actions grid (lines 420-421):**
- When `resumes.length === 0`, render a 2x2 grid of quick action cards ABOVE the `EmptyState` component
- Reuse existing `ActionCard` component from `src/components/home/ActionCard.tsx`
- Actions: "New Resume" (FileText), "Import PDF" (Upload), "Browse Jobs" (Briefcase), "AI Writer" (Sparkles)
- Grid: `grid grid-cols-2 gap-3 px-6 mb-4`

**Tips Carousel (below CTAs inside EmptyState):**
- Add a new section at the bottom of EmptyState with an auto-cycling tips carousel (5s interval)
- 4 tips: "Keep your resume to 1-2 pages", "Use action verbs", "Tailor for each job", "Include quantifiable results"
- Each tip shows a Lightbulb icon + text in a glass-surface card
- Navigation dots below (small circles, active one uses `bg-primary`)
- Auto-pause cycling on hover/touch via `onMouseEnter`/`onMouseLeave`
- Uses `useState` for active index + `useEffect` interval

**Keyboard shortcuts:**
- Add a `useEffect` in DashboardPage listening for `keydown` events when empty state is showing:
  - `N` key -> `handleCreateNew()`
  - `I` key -> `navigate('/upload')`
- Only active when no input is focused

**ARIA labels:**
- Add `aria-label` to template preview buttons, quick action cards, and CTA buttons

---

### Layout (empty state, top to bottom)

```text
[Header bar with logo + profile avatar]
[Daily Tip banner / collapsed "Daily Tip" pill]
[Glass Hero Card: greeting + rotating subtitle]
[2x2 Quick Actions grid]
[Empty State Card]
  - Floating file icon with glow
  - "No Resumes Yet" (text-2xl)
  - Steps with dotted connectors
  - Template previews (larger, with "Popular" badge)
  - CTA buttons (pulsing primary + outlined templates)
  - Tips carousel with dots
```

### Technical Summary

| Area | Detail |
|------|--------|
| Files modified | `EmptyState.tsx`, `DashboardStats.tsx`, `DailyTipCard.tsx`, `DashboardPage.tsx` |
| New imports | `Briefcase`, `LayoutGrid` from lucide-react; `ActionCard` from home; `useReducedMotion` from framer-motion |
| New state | `activeTipIndex` in EmptyState; keyboard listener in DashboardPage |
| Accessibility | `aria-label` on interactive elements; `useReducedMotion` to skip animations; keyboard shortcuts (N, I) |
| Mobile | Templates shrink via responsive width; quick actions stay 2x2; full-width CTAs |
| Performance | Tips carousel uses simple `setInterval`; no new network requests; all client-side |

