

# UX Improvements for WiseResume

Here are actionable UX improvements organized by impact, based on the current state of the app.

---

## 1. Swipe Between "My CVs" and "Tailored" Tabs
**Problem**: Users must tap tab headers to switch. On mobile, swiping between tabs is a natural gesture that's currently missing.
**Fix**: Wrap `TabsContent` in a swipeable container (using `embla-carousel-react`, already installed) so users can swipe left/right between "My CVs" and "Tailored" tabs -- syncing the active tab state.

---

## 2. "Last Edited" Relative Time on Resume Cards
**Problem**: Resume cards show timestamps that may not be immediately meaningful.
**Fix**: Ensure cards show human-friendly relative times like "Edited 2 hours ago" or "Edited yesterday" using `date-fns/formatDistanceToNow` (already installed) and update it if stale.

---

## 3. Empty State for "Tailored" Tab -- Add a CTA Button
**Problem**: The Tailored tab empty state says "Open any CV and use Tailor for Job" but doesn't provide a direct action. Users have to navigate away manually.
**Fix**: Add a "Tailor a Resume" button that navigates to `/ai-studio?tool=tailor`, giving users a one-tap path.

---

## 4. Search Applies to Active Tab Only (Visual Clarity)
**Problem**: The search bar sits above the tabs, but users may not realize it filters the current tab's content. If they search while on "Tailored" and switch to "My CVs", they see unexpected results.
**Fix**: Move the search bar inside (or just below) the tabs area, and show a small label like "Searching in My CVs" to make it contextual.

---

## 5. Pull-to-Refresh Feedback Enhancement
**Problem**: Pull-to-refresh exists but there's no success confirmation afterward.
**Fix**: Show a brief toast or inline "Updated just now" timestamp after a successful refresh so users know their data is fresh.

---

## Technical Details

### File Changes

| File | Change |
|---|---|
| `DashboardPage.tsx` | Wrap tab contents in Embla carousel for swipe support; move search bar below tabs; add refresh confirmation toast |
| `ResumeListCard.tsx` | Verify relative time display uses `formatDistanceToNow` |
| Tailored tab empty state (in `DashboardPage.tsx`) | Add "Tailor a Resume" CTA button navigating to `/ai-studio?tool=tailor` |

### Dependencies
All required libraries are already installed: `embla-carousel-react`, `date-fns`, `sonner`.

