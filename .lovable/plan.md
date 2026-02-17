

## Comprehensive UI/UX Improvements

### Overview

This plan addresses the key UI/UX friction points identified during the full-app analysis, while keeping the install banner as-is per your request.

---

### 1. Fix Editor Tab Dead-End in Bottom Navigation

**Problem:** Tapping the "Editor" tab when no resume is selected shows a toast and does nothing, creating a dead-end.

**Solution:** Instead of blocking navigation, navigate to the most recently edited resume's detail page. If no resumes exist, navigate to the dashboard with the create dialog auto-opened.

**File:** `src/components/layout/BottomTabBar.tsx`
- When `guarded && isEditorDisabled`:
  - Fetch the most recently edited resume ID from the store or navigate to `/dashboard?action=create`
  - Remove the confusing 50% opacity on the tab

---

### 2. Move "Edit" Button Above the Fold on Resume Detail Page

**Problem:** The primary "Edit" action on `/resume/:id` is buried below the template preview and ATS score -- users must scroll to find it.

**Solution:** Add a sticky compact action bar just below the header with Edit, Preview, and Download as primary inline buttons. Keep the full action grid below for secondary actions (Share, Duplicate, Delete).

**File:** `src/pages/ResumeDetailPage.tsx`
- Insert a sticky action row after the header (lines 157-174) with Edit, Preview, Download buttons
- Demote the existing 6-action grid into a "More actions" section lower on the page

---

### 3. Remove Back Arrow from Activity Page Header

**Problem:** The `/applications` page is a primary tab destination but has a back arrow in the header, suggesting it's a sub-page.

**Solution:** Replace the back arrow + "My Activity" header with a simpler title-only header consistent with the Dashboard page style (logo + title, no back arrow).

**File:** `src/pages/ApplicationsPage.tsx`
- Remove the `ArrowLeft` button from the header
- Style the header consistently with the Dashboard header pattern

---

### 4. Better Empty State for Activity Page

**Problem:** When there are 0 applications, the page shows stat cards with all zeros, which feels hollow.

**Solution:** Replace the zero-stats card with a motivating empty state illustration + CTA when there are no applications at all.

**File:** `src/pages/ApplicationsPage.tsx`
- Conditionally hide `JobActivityStatsCard` when total applications is 0
- Show a centered empty state with an icon, title ("Start tracking your applications"), subtitle, and "Add Application" + "Save a Job" action buttons

---

### 5. Desktop Layout Improvements

**Problem:** On 1920px screens, content stretches full-width with no max-width constraint, and the bottom tab bar looks out of place.

**Solution:** Add a `max-w-3xl mx-auto` container to key page content areas so cards don't stretch absurdly wide on desktop. Keep the bottom tab bar for now (replacing it with a sidebar is a larger redesign).

**Files:**
- `src/pages/DashboardPage.tsx` -- Wrap main content in `max-w-3xl mx-auto w-full`
- `src/pages/ApplicationsPage.tsx` -- Same container constraint
- `src/pages/ResumeDetailPage.tsx` -- Same container constraint
- `src/components/layout/BottomTabBar.tsx` -- Add `max-w-3xl mx-auto` to the inner flex container so tabs don't stretch edge-to-edge on wide screens

---

### 6. Landing Page Desktop Max-Width

**Problem:** Landing page renders as a narrow mobile column on desktop with no adaptation.

**Solution:** Add `max-w-4xl mx-auto` to the main content area and allow the feature grid to expand to 4 columns on xl screens.

**File:** `src/pages/Index.tsx`
- Wrap `<main>` content in a max-width container
- Update feature grid: `grid-cols-1 xs:grid-cols-2 lg:grid-cols-4`

---

### Summary Table

| Change | File(s) | Impact |
|--------|---------|--------|
| Fix Editor tab dead-end | `BottomTabBar.tsx` | Eliminates confusing dead-end navigation |
| Edit button above fold | `ResumeDetailPage.tsx` | Primary action instantly accessible |
| Remove back arrow from Activity | `ApplicationsPage.tsx` | Consistent primary-tab header styling |
| Better empty state for Activity | `ApplicationsPage.tsx` | Motivating first-use experience |
| Desktop max-width constraints | `DashboardPage.tsx`, `ApplicationsPage.tsx`, `ResumeDetailPage.tsx`, `BottomTabBar.tsx` | Cards stop stretching on wide screens |
| Landing page desktop layout | `Index.tsx` | Better use of screen real estate |

### What Stays Unchanged
- Install banner (kept as-is per your request)
- Bottom tab bar presence on desktop (kept; sidebar is a separate larger effort)
- All existing toast notification behavior (already redesigned)

