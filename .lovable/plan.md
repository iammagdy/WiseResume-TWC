

## Mobile QA Report -- WiseResume (360x640 viewport)

### Test Summary

Tested all core flows: Landing --> Dashboard --> Resume Detail --> Editor --> Preview --> AI Studio --> Applications --> Settings on a 360x640 mobile viewport with touch-only interactions.

**Overall verdict:** The app is in strong shape for mobile. Navigation, bottom sheets, scrolling, and touch interactions work well across most screens. Found 5 issues that need fixing, ranked by severity.

---

### Issue 1: AI Studio -- Sticky chat input covers content (HIGH)

**Screen:** AI Studio (`/ai-studio`)

**How to reproduce:** Navigate to AI Studio. The "A/B Compare" and "Job Match Analysis" featured tool cards, plus the "More AI Tools" section and Pro Tip, are partially or fully hidden behind the fixed chat input bar.

**Root cause:** The sticky chat input is positioned at `bottom-[68px]` (fixed), and the page has `pb-[140px]` for scroll clearance. However, the page content height plus AppShell's `pb-20` creates a situation where the featured tools below "Smart Tailor" are obscured on short viewports (640px). The `pb-[140px]` is on the page's own `overflow-y-auto` container, but AppShell's inner div is ALSO `overflow-y-auto`, creating competing scroll contexts where the inner one may not get enough height to scroll properly.

**Expected behavior:** All featured tools and the "More AI Tools" section should be scrollable above the sticky chat input.

**Fix:**
- In `src/pages/AIStudioPage.tsx` line 194: increase bottom padding from `pb-[140px]` to `pb-[180px]` on mobile to give more scroll room for the content to clear both the sticky input (68px position + ~56px height) and the bottom tab bar
- This is a 1-word CSS change

---

### Issue 2: AI Studio -- Sticky input overlaps "A/B Compare" card visually (MEDIUM)

**Screen:** AI Studio (`/ai-studio`)

**How to reproduce:** Scroll the AI Studio page. The fixed chat input at `bottom-[68px]` visually overlaps the bottom of the page content area, making the transition between scrollable content and the fixed input unclear.

**Expected behavior:** The sticky input should have a clear visual separation or the content should never render behind it.

**Fix:**
- The `pb-[180px]` fix from Issue 1 addresses this. Additionally, the sticky input already has `shadow-[0_-4px_12px_rgba(0,0,0,0.2)]` which provides some separation. No additional CSS needed beyond the padding increase.

---

### Issue 3: Filter chips below 44px touch target (LOW)

**Screen:** Dashboard (`/dashboard`) -- Resume filter area

**How to reproduce:** The category and score filter chips (Professional, Creative, Tech, Minimalist, <50, 50-79, 80+) have `min-h-[36px]`, which is 8px below the 44px touch target standard.

**Expected behavior:** All interactive elements should meet the 44px minimum touch target per project guidelines.

**Fix:**
- In `src/components/dashboard/ResumeFilters.tsx`: Change `min-h-[36px]` to `min-h-[44px]` on lines 64, 103, 124, and 145 (sort button, category chips, score chips, clear button)
- This is a find-and-replace of 4 occurrences

---

### Issue 4: Install PWA banner overlaps resume card content (LOW)

**Screen:** Dashboard (`/dashboard`)

**How to reproduce:** When the PWA install banner appears, it overlaps the resume cards behind it. The banner is at `bottom-[11.5rem]` (184px) and is opaque enough to hide content underneath.

**Expected behavior:** The banner should not obscure actionable content. This is by design (staggered positioning), but the card content behind it is partially unreadable.

**Fix:**
- This is a known design tradeoff documented in project memories. The banner can be dismissed and persists dismissal in localStorage. **No code change recommended** -- the existing behavior is intentional per `memory/ui/layout/floating-elements-staggering`.

---

### Issue 5: Sort button label hidden on 360px width (INFO)

**Screen:** Dashboard (`/dashboard`) -- Filter area

**How to reproduce:** The sort button uses `hidden xs:inline` for its label, so at 360px (which matches the `xs` breakpoint) the sort option label may or may not show depending on the exact breakpoint config.

**Expected behavior:** The icon-only sort button is acceptable UX since the ArrowUpDown icon is recognizable.

**Fix:** No change needed. The `xs:inline` pattern correctly hides text on the smallest screens while keeping the button functional.

---

### Screens Verified as Working

| Screen | Status | Notes |
|--------|--------|-------|
| Landing page (`/`) | OK | Hero, CTA, feature grid, scroll all render correctly at 360px |
| Dashboard (`/dashboard`) | OK | Cards, search, FAB, quick actions, pull-to-refresh all work |
| Resume Detail (`/resume/:id`) | OK | Edit/Preview/PDF tabs, ATS score, back navigation all functional |
| Editor (`/editor`) | OK | Section navigation, Editor/Preview tabs, stepper, contact form all render properly |
| Editor Preview tab | OK | Zoom controls, template preview, download button all accessible |
| Settings (`/settings`) | OK | Profile card, theme toggle, all rows scrollable and tappable |
| Applications (`/applications`) | OK | My Applications/Saved Jobs tabs, stats cards, empty state all render |
| Bottom Tab Bar | OK | All 5 tabs navigate correctly, active states render, haptics fire |
| Back navigation | OK | Hardware back button mapping works per BACK_ROUTES, no dead ends |

### Files to Modify

| File | Change | Lines |
|------|--------|-------|
| `src/pages/AIStudioPage.tsx` | Increase `pb-[140px]` to `pb-[180px]` | Line 194 |
| `src/components/dashboard/ResumeFilters.tsx` | Change `min-h-[36px]` to `min-h-[44px]` (4 occurrences) | Lines 64, 103, 124, 145 |

Total: 2 files, 5 line changes. Zero component renames, no route changes, no feature removals.

