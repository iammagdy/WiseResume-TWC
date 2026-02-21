

# Settings Page Improvements

## Issues Found

### 1. Performance: 1305-line monolith component
The entire settings page is a single 1305-line component with 12+ `useState` hooks for sheet/dialog state, multiple inline handlers, and helper components defined in the same file. This creates a large initial parse cost and makes maintenance difficult.

**Fix:** Extract each settings section into its own component file (e.g., `AppearanceSection`, `NotificationsSection`, `PrivacySection`, `AccountSection`, `AboutSection`). Each section manages only its own sheet state. The main `SettingsPage` becomes a thin orchestrator (~150 lines).

---

### 2. Performance: Developer entrance animation on every mount
Line 947-949: The `DeveloperCreditCard` has `motion.div` with `initial={{ opacity: 0, y: 20 }}` that animates every time the user visits settings. It's at the bottom of the page and the user won't see it until they scroll there.

**Fix:** Replace with `whileInView` + `viewport={{ once: true }}` so it only animates when scrolled into view, and only once.

---

### 3. Performance: Changelog fetches twice on mount
Lines 168-184: The changelog is fetched once on mount (line 169) AND again when the dialog opens (line 179). The initial fetch is only needed to get the version number.

**Fix:** Fetch once on mount. When the dialog opens, only re-fetch if the data is empty or stale (>5 minutes old). This eliminates a redundant network request.

---

### 4. UX: No search/jump-to-section
With 8 sections and growing, users must scroll through everything to find a specific setting. Power users who frequently toggle one setting waste time scrolling.

**Fix:** Add a sticky section index (horizontal scrollable chips) below the header showing section names (Appearance, AI, Editor, Notifications, Privacy, Account, About). Tapping a chip smooth-scrolls to that section using `scrollIntoView`. The active chip highlights based on scroll position using `IntersectionObserver`.

---

### 5. UX: Account stats card is too basic
The account stats card (lines 792-812) shows just 3 numbers in a flat grid. It doesn't feel special or reward loyalty.

**Fix:** Add a subtle accent-colored border to the stats card, show a "membership tier" label based on account age (e.g., "Early Adopter" for 6+ months, "Founding Member" for 12+), and animate the numbers with a count-up effect on first view (same pattern as portfolio HighlightsStrip).

---

### 6. UX: AI Credits row has no quick action
The `AICreditsRow` (lines 1285-1305) shows usage but offers no way to act on it. When credits are low, users have to figure out themselves that they should switch to a BYOK key.

**Fix:** When usage is above 80%, show a subtle "Switch to your own key for unlimited" link that opens the AI Settings sheet. Add a color transition to the progress bar (green -> amber -> red) based on usage percentage.

---

### 7. UX: Privacy section lacks a "privacy summary" status
Users toggle Local-Only and Analytics on/off but have no quick way to see their overall privacy posture at a glance.

**Fix:** Add a small privacy status badge next to the section header (e.g., "Strict" when local-only is on + analytics off, "Standard" otherwise). This gives users instant feedback without expanding the section.

---

### 8. Styling: Section headers lack visual anchoring
All section headers use the same `text-label uppercase tracking-wider` style. They're functional but don't create a strong visual hierarchy between sections.

**Fix:** Add a subtle left accent bar (2px wide, primary color, rounded) to each section header, similar to the classic-clean portfolio theme. This creates a consistent visual anchor point as users scroll.

---

## Proposed Changes

### File: `src/pages/SettingsPage.tsx`

**Add section index chips:**
- Below the header, add a horizontally scrollable row of section chips
- Each chip uses `document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' })`
- Track active section via `IntersectionObserver` on each `section-*` element
- Sticky below the header with `glass-header` backdrop blur

**Fix Developer card animation:**
- Line 947: Change `initial/animate` to `whileInView` with `viewport={{ once: true }}`

**Fix changelog double-fetch:**
- Remove the `useEffect` at lines 175-184
- In the existing mount fetch (lines 168-173), store a timestamp
- When dialog opens, only re-fetch if data is empty or >5 min old

**Enhance section headers:**
- Add a `<div className="w-1 h-5 rounded-full bg-primary/40 mr-1" />` before each section title icon

**Enhance AI Credits row:**
- Add color-coded progress bar: green (<60%), amber (60-80%), red (>80%)
- When >80%, show a subtle text link: "Get unlimited" that opens AI settings sheet
- Pass `setAISettingsOpen` to the `AICreditsRow` component

**Enhance Account stats:**
- Add count-up animation using `IntersectionObserver` (same pattern as portfolio)
- Calculate membership tier based on `user.created_at` age
- Add accent border to the stats card

**Add privacy status badge:**
- Next to "Privacy & Security" header, show a `Badge` that reads "Strict" or "Standard" based on `localOnlyMode` and `analyticsEnabled` values

---

## Summary

| # | Area | Issue | Fix |
|---|------|-------|-----|
| 1 | Architecture | 1305-line monolith | Extract sections into sub-components |
| 2 | Performance | Developer card animates every mount | Use whileInView once |
| 3 | Performance | Changelog fetches twice | Deduplicate with staleness check |
| 4 | UX | No section navigation | Add sticky section index chips |
| 5 | UX | Basic account stats | Count-up animation + membership tier |
| 6 | UX | AI credits row is passive | Color-coded bar + "Get unlimited" CTA |
| 7 | UX | No privacy summary | Badge showing "Strict" / "Standard" |
| 8 | Styling | Flat section headers | Left accent bar for visual anchoring |

All changes maintain existing functionality. Section extraction (item 1) is the highest-impact change for maintainability but also the most invasive -- it can be done incrementally, starting with the largest sections (Notifications, Privacy, Account).

