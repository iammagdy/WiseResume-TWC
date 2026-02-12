

## Enhanced Dashboard Interactivity: Create Button, Tab Bar, and Empty State

### Overview

Three interconnected improvements to the dashboard experience: (1) enhanced create button with loading state, (2) smarter bottom tab bar with visual disabled/locked states and preventive toasts, (3) richer empty state with template previews and secondary actions.

---

### 1. Floating Create Button -- Loading Spinner and Enhanced Press Feedback

**File: `src/components/dashboard/FloatingCreateButton.tsx`**

- Change `whileTap` from `{ scale: 0.92 }` to `{ scale: 0.95 }` with spring transition (`type: 'spring', stiffness: 400, damping: 15`)
- Add dynamic `boxShadow` that increases on press using framer-motion's `whileTap` style: shadow grows from `0 6px 24px` to `0 8px 32px`
- Add `isLoading` prop (boolean) -- when true, replace the `Plus` icon with a small spinning `Loader2` icon from lucide-react (16x16, `animate-spin`)
- Disable the button while loading (`pointer-events-none opacity-90`)

**File: `src/pages/DashboardPage.tsx`**

- Add `isCreating` state that's set to `true` when the create button is clicked and `false` when the create dialog opens or navigation completes
- Pass `isLoading={isCreating}` to `FloatingCreateButton`
- Wrap `handleCreateNew` to set `isCreating = true` briefly before showing dialog (use a short timeout or set it in the click handler and reset in `onOpenChange`)

---

### 2. Bottom Tab Bar -- Disabled Editor, Locked Jobs, Preventive Toasts

**File: `src/components/layout/BottomTabBar.tsx`**

Current behavior: Editor tab checks `currentResumeId` and shows a generic toast. Jobs tab navigates freely.

Changes:
- Import `useAuth` to access `user` state
- Import `Lock` icon from lucide-react
- Add `useResumes` or check `currentResumeId` from the resume store (already imported) to determine if user has any resumes
- For the **Editor tab**: when `currentResumeId` is null, apply `opacity-50` to the entire tab button. Show toast: "Create a resume first to access the editor"
- For the **Jobs tab**: when `!user`, overlay a small `Lock` icon (12x12) positioned at the top-right of the tab icon area. On click when not signed in, show toast: "Sign in to track job applications" and prevent navigation
- Update `handleTabPress` logic:
  - Editor guard already exists, update toast message to be more descriptive
  - Add Jobs guard: `if (tab.path === '/applications' && !user) { toast.info('Sign in to track job applications'); return; }`
- Add `aria-disabled` attribute to disabled tabs for accessibility

---

### 3. Empty State -- Template Previews, Browse Button, Clickable Steps

**File: `src/components/dashboard/EmptyState.tsx`**

Current: Shows floating icon, "No Resumes Yet", 3 steps, and a single CTA button.

Changes:
- Add new props: `onBrowseTemplates: () => void` and `onStartOnboarding: () => void`
- **Template preview row**: Add a horizontal scrollable row of 3 mini template cards below the steps section
  - Templates: `modern`, `classic`, `minimal` (most popular/recognizable)
  - Each card: 100px wide, aspect-ratio 8.5/11, white background, rounded-xl, border, with a simplified placeholder visual (colored header bar + gray lines to simulate resume content -- NOT full TemplateThumbnail to avoid heavy lazy loading in empty state)
  - Template name below each card in `text-tiny` / `text-caption` style
  - On click: call `onCreateNew()` (or a new `onSelectTemplate(templateId)` callback)
  - Horizontal scroll with `overflow-x-auto scrollbar-hide snap-x` and `gap-3`
- **"Browse All Templates" button**: Add a `Button variant="outline"` below the main CTA with text "Browse All Templates" and an `ArrowRight` icon. Calls `onBrowseTemplates`
- **Clickable steps subtitle**: Make the "Get started in 3 simple steps" text a `button` element with `underline decoration-dashed` styling. On click, call `onStartOnboarding` to replay the onboarding tour
- Add staggered entrance animations for the template cards

**File: `src/pages/DashboardPage.tsx`**

- Pass new props to `EmptyState`:
  - `onBrowseTemplates`: opens the `CreateResumeDialog` (reuse `setShowCreateDialog(true)`)
  - `onStartOnboarding`: sets `showOnboarding = true` to replay the onboarding carousel
- Update `EmptyState` usage: `<EmptyState onCreateNew={handleCreateNew} onBrowseTemplates={() => setShowCreateDialog(true)} onStartOnboarding={() => setShowOnboarding(true)} />`

---

### Technical Details

**Template mini-previews**: Using simplified CSS-only placeholders (colored header strip + gray skeleton lines) instead of rendering actual `TemplateThumbnail` components. This avoids lazy-loading 3 full template components in an empty state, keeping the initial load fast.

**Loading state on create button**: The `isCreating` state is a brief UI indicator. It's set `true` on click and reset when `showCreateDialog` becomes true (via a `useEffect` watching `showCreateDialog`). This gives visual feedback during the short delay before the dialog lazy-loads.

**Tab bar guards**: The Editor tab uses the existing `currentResumeId` check (no resume loaded). The Jobs tab adds an auth check. Both show descriptive toasts and prevent navigation, eliminating the current pattern where users navigate and then get blocked.

**Haptic feedback**: All interactive elements already use haptics via the existing `haptics` utility. The tab bar uses `haptics.selection()` on press. The create button uses `haptics.medium()`. No changes needed -- haptic coverage is already comprehensive.

### Files Modified

- `src/components/dashboard/FloatingCreateButton.tsx` -- add loading spinner, enhanced press animation
- `src/components/layout/BottomTabBar.tsx` -- add disabled/locked states, descriptive toasts, Lock icon overlay
- `src/components/dashboard/EmptyState.tsx` -- add template previews, browse button, clickable steps
- `src/pages/DashboardPage.tsx` -- wire new props and loading state

