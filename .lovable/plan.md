

# Typography Standardization, Settings Polish, Auto-Save Indicator, and Share Feedback

## Issue 1: Typography Standardization

### Current State
The app already has a semantic typography system defined in `src/index.css` (`.text-h1` through `.text-tiny`), but it is inconsistently used. Most pages use raw Tailwind classes instead:
- **Settings**: `text-xl font-bold` for the page title, `text-xs font-semibold uppercase` for section headers
- **Activity**: `text-lg font-display font-semibold` for the page title, `text-sm font-semibold` for section headers
- **Editor**: `text-h3` for the resume name (correct usage), but raw classes elsewhere
- **Portfolio, Career, Upload, Preview**: mixed raw styles

### Plan

**1. Update the semantic typography system** in `src/index.css` to match the requested scale:
- `.text-page-title`: 20-22px (`text-xl`), `font-display font-bold`, line-height 1.3 -- for page-level headings
- `.text-section-header`: 16-18px (`text-base` to `text-lg`), `font-semibold`, line-height 1.3 -- for section group headings
- `.text-body`: keep existing 14-16px (`text-base`), line-height 1.5
- `.text-label`: 12-13px (`text-xs`), `font-medium`, `text-muted-foreground` -- for captions/labels
- Keep existing `.text-h1`, `.text-h2`, `.text-h3` intact for backward compatibility

**2. Apply these classes across pages** (search-and-replace raw classes):

| File | Change |
|---|---|
| `src/index.css` | Add `.text-page-title`, `.text-section-header`, `.text-label` utility classes |
| `src/pages/SettingsPage.tsx` | Replace `text-xl font-bold` with `text-page-title` for page title; standardize section header classes to `text-section-header` pattern |
| `src/pages/ApplicationsPage.tsx` | Replace `text-lg font-display font-semibold` with `text-page-title` |
| `src/pages/EditorPage.tsx` | Already uses `text-h3` for resume name -- keep. Standardize progress bar labels |
| `src/pages/PortfolioEditorPage.tsx` | Standardize page title to `text-page-title` |
| `src/pages/CareerPage.tsx` | Standardize title |
| `src/pages/UploadPage.tsx` | Standardize title |
| `src/pages/PreviewPage.tsx` | Standardize title |

No visual redesign -- only replacing raw Tailwind typography classes with semantic utility classes for consistency.

---

## Issue 2: Settings Page Visual Alignment

### Current State
The Settings page already uses `glass-elevated` cards with `rounded-2xl` and `SettingsRow` components that match the app's design system fairly well. The main gaps are:
- Section headers use `glass-surface-alt` on some sections but not others -- inconsistent
- The DeveloperCreditCard already has animations (3D tilt, holographic sweep) but no fade-in on mount from the Settings page side
- The "Shake to Report Bug" toggle uses the standard `SettingsRow` toggle which already uses the shared `Switch` component

### Plan

| File | Change |
|---|---|
| `src/pages/SettingsPage.tsx` | Remove inconsistent `glass-surface-alt` class from some section wrappers (apply it uniformly to all or none); wrap the `DeveloperCreditCard` Suspense block in a `motion.div` with fade-in-up entrance animation |

This is a minimal change since the Settings page already shares the same component library (`glass-elevated`, `SettingsRow`, `Switch`, `Separator`) as the rest of the app.

---

## Issue 3: Auto-Save Indicator in Editor

### Current State
The Editor **already has** an auto-save status indicator at lines 1050-1076 of `EditorPage.tsx`. It shows:
- "Offline" with CloudOff icon (warning color) when offline
- "Saving..." with pulsing Cloud icon when `isSaving` is true
- "Saved" with a green Check icon (with pop animation) for 2 seconds after save completes
- "Last saved . X ago" with a faded Cloud icon when idle

This already covers all requested states. The only improvements needed:
- Add an "Unsaved changes" state with an amber dot when the user has made changes that haven't been saved yet (between edits and the 3s debounce)
- Add fade transitions between states

### Plan

| File | Change |
|---|---|
| `src/pages/EditorPage.tsx` | Add `hasUnsavedChanges` derived state (compare current resume JSON to `lastSavedResumeRef`); add an amber "Unsaved" state to the save indicator; wrap the indicator in `AnimatePresence` + `motion.div` for smooth fade transitions between states |

---

## Issue 4: Share WiseResume Feedback

### Current State
The `handleShareApp` function (line 251-268 of SettingsPage) already handles:
- Web Share API when available: calls `navigator.share()` (native share sheet provides its own feedback)
- Fallback: copies to clipboard and shows `toast.success('Link copied to clipboard!')`
- Catch block for user cancellation: silently swallows

The toast system is already configured at `position="top-center"` with pill styling. The only missing case is if both `navigator.share` and `navigator.clipboard.writeText` fail.

### Plan

| File | Change |
|---|---|
| `src/pages/SettingsPage.tsx` | Add a better success toast after native share completes ("Shared successfully!"); add a fallback modal with a copyable link if both share and clipboard fail; add a celebratory toast message with emoji for the clipboard fallback case |

---

## Technical Notes
- All new animations use Framer Motion's `AnimatePresence` and `motion.div` with `useReducedMotion` checks
- No new routes, data models, or API calls
- No existing features are removed or altered
- Font family remains unchanged (Inter + Space Grotesk)

