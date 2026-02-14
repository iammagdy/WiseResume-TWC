

## Fix Editor Blank Screen + Performance Optimizations

### Priority 0: Fix Editor Blank Screen (Critical Bug)

**Root Cause:** `AppShell.tsx` uses `AnimatePresence mode="popLayout"` with `motion.div` to wrap page outlets. The `popLayout` mode triggers framer-motion's layout animation engine, which conflicts with the editor's deeply nested flex/overflow layout. This causes the editor content to render with zero visible height or get clipped entirely.

This is consistent with the project's known constraint: "The editor page avoids framer-motion layout props and AnimatePresence to prevent infinite loop crashes."

**Fix:** Replace the framer-motion `AnimatePresence` + `motion.div` in `AppShell.tsx` with a simple CSS fade transition. This eliminates the layout animation engine entirely while preserving a smooth page transition feel.

Changes to `src/components/layout/AppShell.tsx`:
- Remove `import { motion, AnimatePresence } from 'framer-motion'`
- Replace the `AnimatePresence`/`motion.div` wrapper with a plain `div` using a CSS `animate-fade-in` class keyed on `location.pathname`
- This is lighter, avoids the layout engine conflict, and reduces the framer-motion bundle impact on every page transition

**Secondary fix:** The editor also applies `pb-20` on its root div, while `AppShell` independently adds `pb-20` via the `showBottomNav` condition -- causing double bottom padding (160px total). Remove the redundant `pb-20` from the `AppShell` main element since pages that need it already handle their own spacing.

Wait -- actually the AppShell `pb-20` is intentional to reserve space for the bottom tab bar across all pages. The editor's own `pb-20` at line 389 is the duplicate. However, since changing the editor could break other things, the safer fix is to just ensure the CSS transition fix resolves the blank screen first.

---

### Part 1: Performance Optimizations

**1. Database Indexes (Migration)**

Add indexes on frequently queried columns to speed up list pages:
- `resumes(user_id)` and `resumes(user_id, updated_at DESC)`
- `job_applications(user_id)`
- `cover_letters(user_id)`
- `interview_sessions(user_id)`
- `resignation_letters(user_id)`
- `notifications(user_id, is_read)`
- `resume_shares(token)` where `is_active = true`

Non-destructive, no data changes.

**2. React.memo on List Components**

Wrap frequently re-rendered list item components in `React.memo`:
- `ResumeListCard` -- re-renders on every dashboard search keystroke
- `ActionCard` -- static props, never changes
- `SettingsRow` -- re-renders when sibling toggles change

**3. Debounced Search with useDeferredValue**

Add `useDeferredValue` to search inputs in:
- `DashboardPage` resume search
- `GuidesPage` guide search
- `ApplicationsPage` job search

Keeps the input responsive while deferring the expensive filter operation.

**4. Image Lazy Loading**

Add `loading="lazy"` to `<img>` tags in template thumbnails and avatars.

---

### Part 2: Quality of Life Features

**5. Keyboard Shortcuts (Editor)**

New file: `src/hooks/useEditorShortcuts.ts`
- `Ctrl/Cmd + S` -- Trigger immediate save
- `Ctrl/Cmd + P` -- Navigate to preview
- `Ctrl/Cmd + D` -- Open export/download sheet
- `Escape` -- Close any open sheet
- Single `useEffect` with `keydown` listener, only active in editor

**6. Skip-to-Content Link (Accessibility)**

Add a visually hidden, focus-visible skip link in `AppShell.tsx` for keyboard/screen reader users.

**7. "Unsaved Changes" Warning**

Add a `beforeunload` listener in `EditorPage.tsx` that warns when there are unsaved changes (compares current resume JSON to last saved snapshot).

**8. Save Status Indicator Enhancement**

Enhance the editor header indicator to show three clear states:
- "Saving..." with spinner (when saving)
- "Saved" with checkmark (after save, auto-hides after 2s)
- "Offline" with cloud-off icon (when offline)

**9. Global Command Palette (Cmd+K)**

New file: `src/components/layout/CommandPalette.tsx`
- Uses existing `cmdk` package (already installed)
- Trigger: `Cmd/Ctrl+K` anywhere
- Sections: Quick Actions, Recent Resumes, Navigation
- Added to `AppRoutes` in `App.tsx`

---

### Implementation Order

1. Fix AppShell CSS transition (fixes editor blank screen) -- highest priority
2. Database migration (indexes)
3. React.memo wrappers
4. useDeferredValue for search
5. Image lazy loading
6. Editor keyboard shortcuts
7. Skip-to-content link
8. Unsaved changes warning
9. Save status enhancement
10. Command Palette

