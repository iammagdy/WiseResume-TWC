

## Resume Examples Library + PWA Assessment

### PWA Status: Already Complete

The PWA is fully implemented and requires no changes:
- `public/manifest.json` -- Full PWA manifest with icons, standalone display, portrait orientation
- `public/custom-sw.js` -- Workbox service worker with precaching, runtime caching (CacheFirst for fonts, NetworkFirst for API, NetworkOnly for edge functions)
- `src/components/pwa/InstallPrompt.tsx` -- Custom install banner with deferred prompt
- `src/hooks/useOfflineSync.ts` + `src/store/offlineSyncStore.ts` -- Offline change queue with auto-sync
- `src/components/layout/OfflineBanner.tsx` -- Online/offline status indicator
- `src/hooks/usePushNotifications.ts` -- Web Push with VAPID
- `src/components/BiometricLockScreen.tsx` -- Native biometric auth
- Haptic feedback throughout the app
- `vite-plugin-pwa` with `injectManifest` strategy configured

No PWA work is needed. This plan focuses entirely on the Resume Examples Library.

---

### Resume Examples Library

A new `/examples` page with pre-built resume samples organized by industry and experience level. Examples are static data (no database needed) that users can browse, preview, and use as starting points for their own resumes.

#### Data Architecture

**`src/lib/resumeExamples.ts`** -- Static data file containing 30-40 example resumes

Each example contains:
- `id` -- unique identifier
- `title` -- display name (e.g., "Senior Software Engineer")
- `industry` -- category tag (Technology, Healthcare, Finance, etc.)
- `experienceLevel` -- Entry Level, Mid-Level, Senior, Executive
- `description` -- one-line summary of the example
- `highlights` -- 2-3 key resume highlights (shown on cards)
- `atsScore` -- pre-computed ATS score
- `templateId` -- which template it uses
- `resumeData` -- full `ResumeData` object with realistic anonymized content

Industries covered (12 categories):
Technology, Marketing/Sales, Healthcare, Finance, Education, Creative/Design, Engineering, Customer Service, Management/Executive, HR/Recruiting, Legal, Hospitality

Experience levels: Entry Level, Mid-Level, Senior, Executive

This file will contain ~30 examples covering the most common industry + level combinations.

#### New Files

**1. `src/lib/resumeExamples.ts`** -- Example data (30+ entries)
- Static array of `ResumeExample` objects
- Each has a full `ResumeData` payload with realistic content
- Organized to cover all 12 industries and 4 experience levels
- Includes highlights, ATS scores, and template assignments

**2. `src/types/resumeExamples.ts`** -- Types
```
ResumeExample {
  id: string
  title: string
  industry: string
  experienceLevel: 'entry' | 'mid' | 'senior' | 'executive'
  description: string
  highlights: string[]
  atsScore: number
  templateId: string
  resumeData: ResumeData
}
```

**3. `src/pages/ExamplesPage.tsx`** -- Main gallery page
- Header with back button and title
- Two-row filter: industry chips (horizontal scroll) + experience level chips
- Vertical scrolling grid of example cards (1-col mobile, 2-col tablet)
- Cards show: title, industry badge, level badge, ATS score, 2-3 highlights, "View" button
- Lazy rendering (show 10, load more on scroll)
- Smooth fade-in animations per card

**4. `src/components/examples/ExampleCard.tsx`** -- Individual card
- Glass-elevated card with gradient accent
- Title, industry + level badges
- ATS score ring (reuse existing `ProgressRing` component)
- 2-3 highlight bullets
- "View Example" and "Use Template" buttons (44px touch targets)
- `active:scale-95` + haptic on tap

**5. `src/components/examples/ExampleDetailSheet.tsx`** -- Full preview bottom sheet (85% height)
- Scrollable read-only resume preview using `TemplateThumbnail`
- Bottom action bar (sticky):
  - "Use This Template" (primary) -- opens use-mode selector
  - "Get Ideas" -- opens phrases sheet
  - Close button
- ATS score badge at top

**6. `src/components/examples/UseTemplateSheet.tsx`** -- Bottom sheet with 3 options
- "Design Only" -- creates empty resume with the example's template
- "Design + Structure" -- creates resume with section headings but empty content
- "Use as Starting Point" -- copies the full example data, user edits it
- Each option is a large tappable card with icon + description
- On selection: creates new resume via `useResumeMutations().createResume`, navigates to `/editor`

**7. `src/components/examples/ExampleIdeasSheet.tsx`** -- Phrase picker
- Lists the example's best bullets and phrases grouped by section
- Each phrase has a "Copy" button that:
  - Copies to clipboard
  - Adds to Content Library recent items (via `useContentLibraryStore`)
  - Shows toast confirmation
- "Save to Library" option to add phrases to favorites

#### Files to Modify

**8. `src/App.tsx`** -- Add route
- Lazy import `ExamplesPage`
- Add `<Route path="/examples" ...>` inside `AppShell`

**9. `src/components/layout/AppShell.tsx`** -- Add `/examples` to `TAB_ROUTES`

**10. `src/pages/DashboardPage.tsx`** -- Add access point
- Add "Resume Examples" action card/chip that navigates to `/examples`
- Positioned alongside existing quick actions

#### Technical Details

**No database changes** -- all example data is static, bundled in the JS.

**Performance**:
- `resumeExamples.ts` is lazy-imported only when visiting `/examples` (code-split via `lazyWithRetry`)
- Example cards use intersection observer for staggered rendering
- `TemplateThumbnail` is already optimized for rendering previews

**Mobile patterns**:
- Filter chips: horizontal scroll with `-webkit-overflow-scrolling: touch`
- Cards: 44px touch targets, `active:scale-95`, haptic feedback
- Sheets: 85% height with drag handle, scrollable content
- Safe areas: `pt-safe` on header, `pb-safe` on bottom actions

**"Use Template" flow**:
1. User taps "Use This Template" on detail sheet
2. UseTemplateSheet opens with 3 options
3. On selection, `createResume()` is called with appropriate data
4. Navigates to `/editor` with the new resume loaded
5. Toast: "Resume created from example"

**"Get Ideas" flow**:
1. User taps "Get Ideas" on detail sheet
2. ExampleIdeasSheet opens showing categorized phrases
3. User taps "Copy" on a phrase -- clipboard + toast
4. User taps "Save" -- adds to `contentLibraryStore` favorites
5. Phrases are available later in the Content Library sheet

#### Implementation Order

1. Create types (`src/types/resumeExamples.ts`)
2. Create example data (`src/lib/resumeExamples.ts`) -- 30+ entries
3. Create `ExampleCard.tsx` component
4. Create `ExampleDetailSheet.tsx` with preview
5. Create `UseTemplateSheet.tsx` with 3 options
6. Create `ExampleIdeasSheet.tsx` with phrase picker
7. Create `ExamplesPage.tsx` with filters and grid
8. Update `App.tsx` with new route
9. Update `AppShell.tsx` with route in TAB_ROUTES
10. Add access point on DashboardPage
