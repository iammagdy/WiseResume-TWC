

## Cover Letter Builder + Document Management System

This plan adds two major features alongside the existing app without breaking anything. All new routes, components, and database changes are additive.

---

### Phase 1: Cover Letter Builder (New Pages + Enhanced Existing)

**New Routes (added to App.tsx and AppShell):**
- `/cover-letters` -- Cover letter dashboard with card list
- `/cover-letter/new` -- Full-screen mobile creation flow
- `/cover-letter/edit/:id` -- Mobile editor with bottom toolbar

**New Components:**

1. **`src/pages/CoverLettersPage.tsx`** -- Mobile dashboard
   - Sticky header with back button + "New" FAB
   - Search bar (collapsible)
   - Vertical card list showing saved cover letters
   - Each card: job title, company, tone badge, date, three-dot menu (bottom sheet)
   - Swipe left to delete (reuse pattern from ResumeListCard)
   - Pull-to-refresh
   - Empty state with illustration + CTA

2. **`src/pages/CoverLetterNewPage.tsx`** -- Creation flow
   - Full-screen mobile editor, no sidebars
   - Step-based flow: (1) Select resume + paste job description (2) Choose tone + template style (3) Generate + edit
   - Bottom sheet for template/tone selection
   - "Generate with AI" button calls existing `generate-cover-letter` edge function
   - Result appears in editable textarea with Read/Edit toggle
   - Bottom toolbar: Save, Copy, Export PDF, Regenerate

3. **`src/pages/CoverLetterEditPage.tsx`** -- Edit saved letter
   - Load letter by ID from database
   - Paper-like preview mode + editable mode toggle
   - Bottom toolbar: Save, Copy, Export PDF, Delete
   - "Tailor to Job" button -- paste new job description, AI regenerates
   - Auto-save on blur (debounced)

4. **`src/components/cover-letter/CoverLetterCard.tsx`** -- List card component
   - Glass card with job title, company, tone badge, timestamp
   - Three-dot menu opening bottom sheet (Edit, Duplicate, Download PDF, Delete)
   - Swipe-left delete with `touchAction: 'pan-y'`

5. **`src/components/cover-letter/CoverLetterTemplateSheet.tsx`** -- Bottom sheet
   - Template style selector (Professional, Creative, Simple)
   - Tone selector chips
   - Preview of selected style

**Reuse existing infrastructure:**
- `useCoverLetters` hook (already exists) for CRUD
- `generate-cover-letter` edge function (already deployed)
- `cover_letters` table (already exists with RLS)
- PDF export logic from existing CoverLetterPage

**Refactor existing `/cover-letter` route:**
- Redirect `/cover-letter` to `/cover-letters` (new dashboard)
- Remove old monolithic CoverLetterPage.tsx

---

### Phase 2: Document Management System

**New Components:**

1. **`src/pages/DocumentsPage.tsx`** -- Unified document dashboard
   - Replaces or sits alongside the existing dashboard
   - Sticky tabs: "All" | "Resumes" | "Cover Letters"
   - Vertical card grid (1 per row mobile, 2 on tablet)
   - Each card shows: document name, type badge (Resume/Cover Letter), ATS score (resumes only), last edited, three-dot menu
   - Tap card to navigate to editor
   - Swipe left to delete
   - Pull-to-refresh

2. **`src/components/documents/DocumentCard.tsx`** -- Unified card
   - Handles both resume and cover letter data
   - Type badge (Resume = blue, Cover Letter = purple)
   - Inline rename on tap of title
   - Three-dot menu -> bottom sheet: Duplicate, Rename, Download, Delete
   - Health score ring for resumes, tone badge for cover letters

3. **`src/components/documents/DocumentActionSheet.tsx`** -- Bottom sheet actions
   - Context-aware actions based on document type
   - Duplicate, Rename, Delete, Download PDF, Share (resumes only)

4. **Search and Sort:**
   - Search bar at top (filters both resumes and cover letters)
   - Sort dropdown: Recent, Name, Score
   - Filter chips: All, Resumes, Cover Letters

**Navigation Updates:**

- Add `/cover-letters` to BottomTabBar as part of the "Home" tab's quick actions
- Add document type filter to existing DashboardPage
- Add `/cover-letters`, `/cover-letter/new`, `/cover-letter/edit/:id` routes to App.tsx
- Keep `/cover-letter` route as redirect to `/cover-letters`

---

### Phase 3: Database Changes

No new tables needed -- the existing `cover_letters` table has all required columns. Only code-level changes.

Optional: Add a `template_style` column to `cover_letters` for cover letter template selection:

```sql
ALTER TABLE cover_letters ADD COLUMN IF NOT EXISTS template_style text DEFAULT 'professional';
```

---

### Technical Details

**New Files to Create:**
- `src/pages/CoverLettersPage.tsx`
- `src/pages/CoverLetterNewPage.tsx`
- `src/pages/CoverLetterEditPage.tsx`
- `src/components/cover-letter/CoverLetterCard.tsx`
- `src/components/cover-letter/CoverLetterTemplateSheet.tsx`
- `src/components/cover-letter/CoverLetterActionSheet.tsx`
- `src/components/documents/DocumentCard.tsx`
- `src/components/documents/DocumentActionSheet.tsx`

**Files to Modify:**
- `src/App.tsx` -- Add new lazy routes
- `src/components/layout/AppShell.tsx` -- Add new routes to TAB_ROUTES
- `src/components/layout/BottomTabBar.tsx` -- No change (cover letters accessible from Home quick actions)
- `src/pages/DashboardPage.tsx` -- Add "Cover Letters" quick action chip + document type filter tabs
- `src/hooks/useCoverLetters.ts` -- Add `duplicateCoverLetter` mutation

**Mobile-First Patterns Applied:**
- All touch targets 44px minimum
- `touchAction: 'pan-y'` on all interactive motion elements
- `pb-safe` for bottom safe areas
- 16px minimum font size on inputs
- Full-screen editors with no sidebars
- Bottom sheets instead of modals/dropdowns
- Swipe gestures for quick actions
- Pull-to-refresh on all list views
- Skeleton loading states matching final layout
- `active:scale-95` + haptics on all buttons

**Implementation Order:**
1. Database migration (add `template_style` column)
2. Cover Letter dashboard page (`/cover-letters`)
3. Cover Letter creation page (`/cover-letter/new`)
4. Cover Letter edit page (`/cover-letter/edit/:id`)
5. Update routing in App.tsx and AppShell
6. Add quick action to DashboardPage
7. Document management tabs on DashboardPage (All/Resumes/Cover Letters filter)
8. Test on 375px viewport

