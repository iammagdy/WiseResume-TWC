

# UI/UX Audit: Issues and Improvements

## Critical Bug

### 1. Profile Page Crash (BLOCKER)
**File:** `src/pages/ProfilePage.tsx`, line 33

The Profile Page uses `require()` (CommonJS) to import a skeleton component, which crashes in Vite's ESM environment with "ReferenceError: require is not defined".

**Fix:** Replace `const { ProfilePageSkeleton } = require(...)` with a top-level ESM `import`.

---

## UI/UX Issues Found

### 2. "Install WiseResume" Banner Obscures Content
On every page, a persistent PWA install banner covers the bottom portion of the screen, hiding content and overlapping the bottom tab bar area. On the Dashboard, it hides resume cards. On the Editor, it hides the Download/Preview action bar.

**Fix:** Make the install banner dismissible with a clear close button and persist the dismissal in `localStorage`. Consider showing it only after the 2nd or 3rd session, or as a small inline card rather than a floating overlay.

### 3. Editor Still Has Too Much Chrome on Mobile
Despite the previous compaction work, the editor still stacks: Header (~56px) + Progress/save row (~28px) + Pill bar (~44px) + Editor/Preview/ATS tabs (~40px) + Bottom action bar (~48px) = ~216px of chrome. The form content starts below the fold and the "Contact Information" section header is barely visible. The Download/Preview bar is also obscured by the install banner.

**Fixes:**
- Hide the Editor/Preview/ATS tab bar on mobile when in editor mode (only show it when user explicitly wants to switch via a header toggle)
- Make the bottom Download/Preview bar collapsible or merge into the header as icon buttons
- Estimated savings: ~80px more editing space

### 4. Dashboard Information Overload
The Dashboard has too many competing elements on first load:
- Trust banner ("Your career data is encrypted...")
- "Suggested Next Step" card
- Greeting card
- Install banner (overlapping)
- Quick action chips
- Search bar + filters

**Fix:** Consolidate banners -- merge the trust banner content into the "Suggested Next Step" card or show it only on first visit. Remove the greeting card on small screens (the header already says "WiseResume") to surface resume content faster.

### 5. Truncated Resume Name in Editor Header
The resume title is truncated to "Magdy Sa..." with `max-w-[45vw]`. On small screens this makes it unreadable and wastes space since the ChevronDown icon implies a dropdown that doesn't exist (it navigates to dashboard).

**Fix:** Increase max-width to `max-w-[55vw]` and remove the misleading ChevronDown icon (or make it actually open a resume picker dropdown).

### 6. No Visible Form Fields on Editor Load
When the editor loads on mobile, the "Contact Information" title is visible but the actual input fields (Full Name, Email, etc.) are pushed below the fold.

**Fix:** Combine changes from items 3 above. Additionally, auto-scroll to the first input field on initial load.

### 7. AI Intro Tooltip Blocks First-Time Editing
The "Meet Your AI Assistant" modal takes over the entire screen when a user first opens the editor, forcing them to dismiss it before they can do anything. This is friction for new users who just want to edit.

**Fix:** Replace the full-screen modal with a small, non-blocking tooltip or banner at the bottom of the screen that auto-dismisses after 5 seconds.

---

## Summary

| # | Issue | Severity | File(s) | Effort |
|---|-------|----------|---------|--------|
| 1 | Profile page crash (`require`) | Critical | `ProfilePage.tsx` | 5 min |
| 2 | Install banner obscures content | High | Install prompt component | 30 min |
| 3 | Editor still has too much chrome | High | `EditorPage.tsx` | 1-2 hrs |
| 4 | Dashboard information overload | Medium | `DashboardPage.tsx` | 1 hr |
| 5 | Truncated resume name + misleading icon | Medium | `EditorPage.tsx` | 15 min |
| 6 | No visible form fields on editor load | Medium | `EditorPage.tsx` | Included in #3 |
| 7 | AI intro modal blocks editing | Low | `EditorPage.tsx` | 30 min |

No database changes needed. No new dependencies.

