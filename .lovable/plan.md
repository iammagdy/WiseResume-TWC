

# Section Drag Handles + Enriched Activity Tab

## ISSUE 1: Visible Drag Handles on Section Item Cards

### Current State
The editor renders one section at a time via tabs. Within each section, individual item cards (experience entries, education rows, hobbies, languages, etc.) have reorder buttons:
- **Experience**: "Move Up" / "Move Down" buttons inside the expanded card, hidden on desktop (`sm:hidden`)
- **Hobbies, Languages, Awards, Certifications, Projects, Publications, Volunteering, References**: Small up/down arrow buttons in each item header row

There are NO visible drag handle icons anywhere -- the reorder controls are either small arrows or text buttons buried inside expanded content.

### Plan

**Create a reusable `DragHandle` component** (`src/components/editor/DragHandle.tsx`):
- Renders a `GripVertical` icon (from lucide-react -- a six-dot vertical grip)
- Muted color: `text-muted-foreground/40` idle, `text-muted-foreground/70` on hover/active
- Minimum 44x44px touch target (`min-w-[44px] min-h-[44px]`)
- Entrance animation: fade-in + slight slide-left via Framer Motion (`initial={{ opacity: 0, x: -8 }}`, `animate={{ opacity: 1, x: 0 }}`)
- Wraps the existing up/down logic: clicking/tapping the handle itself doesn't do anything new -- the handle is a VISUAL indicator only. The up/down arrow buttons remain the functional reorder controls
- `prefers-reduced-motion`: entrance shows instantly (no animation)

**Add `DragHandle` to all section item cards** -- placed at the far left of each item's header row:
- **ExperienceSection**: Add before the expand/collapse button in the item header (line ~200)
- **HobbiesSection**: Already has up/down arrows; add `DragHandle` icon to the left of the arrow buttons
- **LanguagesSection**: Same pattern
- **AwardsSection, CertificationsSection, ProjectsSection, PublicationsSection, VolunteeringSection, ReferencesSection**: Same pattern -- add the grip icon to each item row

**Drag-active visual feedback** (CSS in `src/index.css`):
- When any item card gains `active` state (being pressed/dragged on the handle area): `scale(1.02)` + elevated shadow
- On release: smooth spring transition back (`transition: transform 200ms cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 200ms ease`)

### Files Changed
| File | Change |
|---|---|
| `src/components/editor/DragHandle.tsx` | New component: visual grip icon with fade-in entrance |
| `src/components/editor/ExperienceSection.tsx` | Add `DragHandle` to each experience item header row |
| `src/components/editor/HobbiesSection.tsx` | Add `DragHandle` to each hobby item row |
| `src/components/editor/LanguagesSection.tsx` | Add `DragHandle` to each language item row |
| `src/components/editor/AwardsSection.tsx` | Add `DragHandle` to each award item row |
| `src/components/editor/CertificationsSection.tsx` | Add `DragHandle` to each cert item row |
| `src/components/editor/ProjectsSection.tsx` | Add `DragHandle` to each project item row |
| `src/components/editor/PublicationsSection.tsx` | Add `DragHandle` to each publication item row |
| `src/components/editor/VolunteeringSection.tsx` | Add `DragHandle` to each volunteering item row |
| `src/components/editor/ReferencesSection.tsx` | Add `DragHandle` to each reference item row |
| `src/components/editor/EducationSection.tsx` | Add `DragHandle` to each education item row |

---

## ISSUE 2: Enriched Activity Tab

### Current State
The Activity tab (`/applications`) renders:
- A tab bar (Applications / Jobs)
- StatusFilter
- `ActivityTimeline` -- fetches tailor_history, job_applications, cover_letters, resumes and shows them as timeline entries with staggered fade-in
- Application cards list
- `JobActivityStatsCard` (shows originals/tailored/applications/interviews/offers counts)

The ActivityTimeline empty state is a simple icon + text. No streak tracking, no resume completion score.

### Plan

**1. Activity Streak Tracker** -- new component `src/components/applications/ActivityStreak.tsx`:
- Query `resumes.created_at`, `tailor_history.created_at`, `job_applications.applied_at`, `cover_letters.created_at` for the last 30 days
- Group by date to find consecutive active days
- Display: a small card with a flame icon (from lucide-react: `Flame`) and "X day streak" text
- Show a row of the last 7 days as small dots/squares: filled = active, hollow = inactive (like a GitHub contribution mini-graph)
- Staggered entrance animation per dot (50ms delay each)
- If streak is 0: show "Start your streak today!" with a subtle CTA

**2. Resume Completion Score** -- new component `src/components/applications/ResumeCompletionCard.tsx`:
- Use the existing `calcOverallScore` from `src/lib/resumeCompletionRules.ts`
- Fetch the user's most recent resume from the store or DB
- Display a circular progress ring (reuse the existing `ProgressRing` from `src/components/editor/ProgressBar.tsx`) with the completion percentage
- Below: list sections with their status (complete/partial/empty) as small colored dots
- CTA: "Continue editing" button navigating to the editor
- Entrance animation: fade-in-up

**3. Improved Empty State** for `ActivityTimeline`:
- Replace the current minimal empty state with an engaging illustration-style layout:
  - A larger icon composition (e.g., `FileText` + `Briefcase` + `Scissors` arranged visually)
  - Motivational message: "Your career journey starts here"
  - Sub-text: "Create a resume, tailor it for jobs, and track your applications -- all in one place"
  - CTA button: "Start building your resume" navigating to `/` (dashboard) with primary styling, 44px min height
  - Entrance: fade-in + scale-in with Framer Motion

**4. Placement in ApplicationsPage** -- add above the existing ActivityTimeline section:
- `ActivityStreak` card -- inserted after the StatusFilter and before the "Recent Activity" heading
- `ResumeCompletionCard` -- inserted after the streak card
- Both wrapped in `motion.div` with staggered entrance (`delay: i * 0.1`)

### Files Changed
| File | Change |
|---|---|
| `src/components/applications/ActivityStreak.tsx` | New: streak tracker with 7-day dot grid and flame icon |
| `src/components/applications/ResumeCompletionCard.tsx` | New: completion ring + section status dots + CTA |
| `src/components/applications/ActivityTimeline.tsx` | Enhanced empty state with illustration, motivational copy, and CTA button |
| `src/pages/ApplicationsPage.tsx` | Insert ActivityStreak and ResumeCompletionCard above the timeline section |

---

## Global Notes
- All entrance animations use Framer Motion with `initial`/`animate` props
- All animations respect `prefers-reduced-motion` via Framer Motion's built-in `useReducedMotion` hook
- No existing features, routes, data models, or API calls are modified
- No new database tables or queries beyond what already exists (streak is computed from existing timestamp fields)
- All touch targets meet 44px minimum
- Mobile-first: full-width cards, min 14px font sizes, comfortable padding

