

# Complete UI Redesign -- Premium Mobile Experience

## Problem
The current UI, despite recent improvements, still feels flat and generic. The editor is a plain form with basic tabs, the dashboard cards are monotonous, and there is no visual delight or spatial hierarchy that makes the app feel like a premium product.

## Design Philosophy
Transform WiseResume into a visually rich, spatially layered mobile app that feels like a native iOS/Android experience -- not a web form. Every screen should have clear visual hierarchy, purposeful motion, and moments of delight.

---

## Phase 1: Editor Page Complete Redesign

### 1.1 Replace Tab Bar with Stepper Nav
- Remove the horizontal scrolling `TabsList` with plain text tabs
- Replace with a **visual step indicator**: 5 numbered circles connected by a line, with filled/active/completed states
- Each step shows an icon, turns green with a checkmark when complete
- Active step has a glowing ring animation
- Tapping a step navigates to that section

### 1.2 Section Cards Instead of Bare Forms
- Wrap each section's content inside a styled card with:
  - A colored header bar with icon and section title
  - A subtle gradient accent on the left edge based on completion (green = done, amber = partial, gray = empty)
  - Collapse/expand animation when switching sections
- Add a "section tip" pill below the header (e.g., "Include 2-3 key achievements with metrics")

### 1.3 Enhanced Progress Area
- Replace the tiny dots + percentage with a **visual progress ring** (reuse the existing `ProgressRing` variant) centered prominently
- Show save status as an inline badge next to the ring instead of a separate row
- Add a subtle animated gradient bar at the very top of the editor (like a loading bar but for progress -- fills left to right as sections complete)

### 1.4 Floating AI Button Redesign
- Replace the collapsible AI Studio bar at the bottom with a **floating action button (FAB)** in the bottom-right corner
- The FAB is a gradient circle with the Sparkles icon and a pulsing glow
- Tapping the FAB opens the full AI Studio as a bottom sheet (reuse existing `AIAssistantBar` content)
- The main "Preview & Export" button stays full-width at the bottom but gets a frosted-glass background

### 1.5 Section Transition Animation
- When switching between sections, animate the content with a horizontal slide (slide left when going forward, right when going back)

---

## Phase 2: Dashboard Page Redesign

### 2.1 Hero Stats Card
- Replace the current flat stats row with a single **glass hero card** that has:
  - Greeting text with the user's first name
  - A large animated score ring showing the average health score
  - Stats displayed around the ring: total resumes, best score
  - A subtle animated gradient border on the card

### 2.2 Resume Cards Redesign
- Redesign `ResumeListCard` completely:
  - Make the score ring larger and more prominent (left side)
  - Add a gradient accent stripe on the left based on score
  - Show the template name as a small chip
  - Add a subtle animated shimmer on cards currently being scored
  - The AI nudge text gets its own styled row with a sparkle icon

### 2.3 Floating Create Button
- Replace the inline "New Resume" chip with a **floating action button** (bottom-right, above the tab bar)
- Gradient circle with Plus icon, with a shadow glow
- This is always visible regardless of scroll position

### 2.4 Search Bar Upgrade
- Make the search bar a styled pill with a frosted-glass background and a subtle inner glow on focus
- Add a filter chip next to it (e.g., "Sort: Recent")

---

## Phase 3: Bottom Tab Bar Premium Redesign

### 3.1 Frosted Glass Bar with Floating Pill Indicator
- The active tab gets a **floating pill background** that smoothly animates between tabs using `framer-motion` `layoutId`
- The pill has a gradient background matching the primary color
- Active icon turns white (on the pill), inactive icons stay muted
- Remove the dot indicator, the pill IS the indicator

### 3.2 Tab Labels Always Visible
- Keep labels always visible (current behavior is good)
- Active label becomes bold + white

---

## Phase 4: Form Field Upgrade

### 4.1 Enhanced Input Fields
- Add a subtle gradient left border on focused inputs
- Add a smooth label float animation (label moves up and shrinks when field has value or is focused)
- Add a green checkmark icon on the right when field validates successfully
- Error state gets a red shake animation

---

## Phase 5: Micro-Interactions and Polish

### 5.1 Page Transitions
- Upgrade `PageTransition` component with directional awareness:
  - Forward navigation: content slides in from right
  - Back navigation: content slides in from left
  - This uses `framer-motion` variants

### 5.2 Skeleton Shimmer Upgrade
- Add a diagonal sweep shimmer animation to all skeleton cards (already partially done)

### 5.3 Button Press Feedback
- All primary buttons get a brief scale-down + glow pulse on tap
- Destructive buttons get a brief red flash

---

## Technical Details

### Files to Create
| File | Purpose |
|------|---------|
| `src/components/editor/StepperNav.tsx` | Visual step indicator replacing tab list |
| `src/components/editor/SectionCard.tsx` | Styled wrapper for each editor section |
| `src/components/editor/FloatingAIButton.tsx` | Already exists -- will be repurposed/rewritten |
| `src/components/dashboard/FloatingCreateButton.tsx` | FAB for creating new resume |

### Files to Modify (Major)
| File | Change |
|------|--------|
| `src/pages/EditorPage.tsx` | Replace tabs with stepper, add section cards, floating AI button, slide transitions |
| `src/pages/DashboardPage.tsx` | Hero stats card, floating create button, search upgrade |
| `src/components/dashboard/DashboardStats.tsx` | Complete redesign into hero glass card with ring |
| `src/components/dashboard/ResumeListCard.tsx` | Visual redesign with larger score ring, shimmer |
| `src/components/dashboard/QuickActionChips.tsx` | Redesign into styled icon cards |
| `src/components/layout/BottomTabBar.tsx` | Floating pill indicator with layoutId |
| `src/components/ui/form-field.tsx` | Add gradient focus border, validation checkmark |
| `src/components/layout/PageTransition.tsx` | Add directional slide awareness |
| `src/index.css` | New shimmer, gradient border, float animations |

### Files to Modify (Minor)
| File | Change |
|------|--------|
| `src/components/editor/ContactSection.tsx` | Wrap in SectionCard |
| `src/components/editor/SummarySection.tsx` | Wrap in SectionCard |
| `src/components/editor/ExperienceSection.tsx` | Wrap in SectionCard |
| `src/components/editor/EducationSection.tsx` | Wrap in SectionCard |
| `src/components/editor/SkillsSection.tsx` | Wrap in SectionCard |
| `src/components/dashboard/EmptyState.tsx` | Visual refresh |

### Performance Safeguards
- All animations use `transform` and `opacity` only (GPU composited)
- `layoutId` animations use `framer-motion`'s FLIP technique (no layout thrashing)
- Section content uses `forceMount` with `hidden` attribute (already in place) to avoid remounting
- Shimmer uses CSS `@keyframes` (no JS)
- No new dependencies required

