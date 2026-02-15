

## Feature: Dedicated AI Studio Tab

### Overview

Add a 5th "Studio" tab to the bottom navigation bar, create a new `/ai-studio` page that consolidates the Wise AI chat and all AI tools into a single dedicated screen, and remove the old AI Studio drawer from the Editor page.

### Changes

**File 1: `src/pages/AIStudioPage.tsx` (NEW)**

Create a new page with the following layout (top to bottom):

- **Header**: "AI Studio" title with animated gradient text, "Powered by WiseResume AI" subtitle with `AIEngineBadge`, and `AICreditsIndicator` showing remaining credits
- **Resume Context Bar**: If `currentResumeId` exists in store, show "Working on: [resume name]" pill; if not, show a "Select a Resume" prompt button that navigates to `/dashboard`
- **Wise AI Chat Section**: Embed the `AgenticChatSheet` content (not as a sheet -- extract the chat UI into a reusable component or render the chat inline). Show suggestion chips (same SUGGESTIONS array from AgenticChatSheet). Full-width chat input pinned at bottom of this section
- **Featured Tools** (2 full-width cards): "Smart Tailor" and "Job Match" -- clicking opens the corresponding sheet (TailorSheet, JobAnalysisSheet) which requires `currentResumeId`
- **More AI Tools Grid** (collapsible section, default expanded): 2-column grid on mobile, 3-column on tablet, 4-column on desktop. Cards for: Proofread, Ideas, Customize, Enhance, Interview, Career, Humanize, LinkedIn, 1-Page, Recruiter -- each opens the same sheets as in EditorPage
- **Pro Tip**: Static card with the job URL tip text
- All tool activations check for `currentResumeId` and show "Create a resume first" toast if missing
- Page wrapped in `ErrorBoundary`, uses `pb-20` for bottom nav clearance
- Uses `motion.div` fade-in animations on sections with staggered delays

The page reuses existing lazy-loaded sheet components (TailorSheet, JobAnalysisSheet, RecruiterSimSheet, AIDetectorSheet, LinkedInOptimizerSheet, OnePageWizardSheet, CareerPathSheet, ContentLibrarySheet, CustomizeSheet, ProofreadSheet, AgenticChatSheet). All sheets are opened via boolean state variables, same pattern as EditorPage.

**File 2: `src/components/layout/BottomTabBar.tsx` (EDIT)**

Add a 5th tab between Editor and Jobs:

```typescript
{
  path: '/ai-studio',
  icon: Sparkles,
  label: 'Studio',
  matchPaths: ['/ai-studio'],
  guarded: false, // accessible without a resume (page handles context)
}
```

Import `Sparkles` from lucide-react (already imported in other files). The Studio tab icon gets a special gradient/primary color treatment when active to make it visually distinctive.

**File 3: `src/App.tsx` (EDIT)**

Add lazy-loaded route for the new page:

```typescript
const AIStudioPage = lazyWithRetry(() => import("./pages/AIStudioPage"));
```

Add route inside `AppShell`:

```jsx
<Route path="/ai-studio" element={
  <Suspense fallback={<DashboardSkeleton />}>
    <AIStudioPage />
  </Suspense>
} />
```

**File 4: `src/components/layout/AppShell.tsx` (EDIT)**

Add `/ai-studio` to the `TAB_ROUTES` array so the bottom nav shows on this page.

**File 5: `src/pages/EditorPage.tsx` (EDIT)**

- Remove the `AIAssistantBar` from the bottom sticky section (lines 708-730)
- Remove the `AIHubSheet` import and usage if present
- Keep the top-right Wise AI button but change it to navigate to `/ai-studio` instead of opening `showChat`
- Keep `ProofreadButton` FAB (repositioned since AI bar is removed -- move to `bottom-24` to clear bottom nav)
- Keep all sheet components and their state -- they are still openable from the AI Studio page or via shortcuts
- Remove imports: `AIAssistantBar`

**File 6: `src/components/editor/AIAssistantBar.tsx` (KEEP)**

Keep the component file -- it will no longer be used in EditorPage but could be removed in a future cleanup. No changes needed.

### What Does NOT Change

- All AI tool sheet components (TailorSheet, JobAnalysisSheet, etc.) remain identical
- AgenticChatSheet component stays the same (opened as sheet from AI Studio page)
- AI credits system, provider management, Gemini/WiseResume AI integration
- Editor page form sections, auto-save, validation, keyboard shortcuts
- All other pages and navigation routes
- Resume CRUD operations, version history, ATS scoring
- Desktop layouts for non-affected pages

### Technical Notes

- The 5-tab layout fits comfortably on 320px+ screens (each tab ~64px wide minimum vs 320px/5 = 64px)
- Tab label "Studio" is short enough to avoid wrapping on small screens
- AI Studio page uses the same sheet-based architecture as EditorPage -- tools open as bottom sheets
- `currentResumeId` from Zustand store provides context awareness without prop drilling
- All tool sheets already handle their own data fetching from the resume store
- The `guarded: false` on the Studio tab means users can always navigate there; the page itself shows a "select resume" prompt if no resume is active
- Removing the AIAssistantBar from EditorPage frees ~60px of vertical space, improving the editing experience on mobile
- ProofreadButton position adjusted since the sticky AI bar is removed

### Responsive Design

- **Mobile (less than 768px)**: Single column layout, 2-column tool grid, chat input pinned at section bottom, suggestion chips wrap horizontally
- **Tablet (768-1024px)**: 3-column tool grid
- **Desktop (1024px+)**: 4-column tool grid, wider chat area
- All interactive elements maintain 44px minimum touch targets
- Page uses `pb-20` for bottom nav clearance and `pt-safe` for notch

