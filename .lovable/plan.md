

# Portfolio Page Mobile UX Cleanup

## Overview

Restructure the Portfolio Editor page to reduce clutter, surface key information in a compact hero card, and hide empty sections. No backend or navigation changes.

## Changes (all in `src/pages/PortfolioEditorPage.tsx`)

### 1. Remove info banner
Remove the "New updates available" / tips banner entirely (lines 549-561). It adds noise and isn't tied to real in-page changes.

### 2. Build a Hero Card (replaces current "Portfolio Status" block)
Replace the existing Status block (lines 563-628) with a single compact "Portfolio Overview" hero card containing:
- **Status badge** (Live / Draft) — top-right
- **Public URL** with Copy button and QR Code button — single row
- **Compact stats row**: Views | Strength (e.g. "60% Good") | Highlighted skills count
- **Publish toggle** with label "Make portfolio public" and helper text "Anyone with your link can view your portfolio website."
- **Save button** stays at the bottom of this card

This absorbs the current separate Publish block (lines 1198-1227), moving the toggle and save into the hero.

### 3. Collapse analytics into the hero stats row
Remove the standalone "Visitors & Analytics" CollapsibleCard (lines 672-686). The view count is already in the hero. The full VisitorsPanel remains accessible via a "View details" link in the stats row that opens the section.

Remove the standalone "Portfolio Strength" CollapsibleCard (lines 688-713). Strength score is shown in the hero stats row. The missing tips remain visible when the user taps the strength stat (expand inline or show as a small list below the stats).

### 4. Rename "Skills Visibility" to "Skills on your portfolio"
Change title at line 720 from "Skills Visibility" to "Skills on your portfolio". In the collapsed hint (line 721-725), show only the strong count: e.g. "7 highlighted skills" — remove the dim skill count from the hint. Keep full detail inside the expanded section unchanged.

### 5. Conditionally render empty sections
For these CollapsibleCards, only render if there's at least one configured value:
- **Customization** (id="customization"): always show (it always has accent color set)
- **Availability** (id="availability"): show only if `openToWork || availabilityHeadline`
- **Identity** (id="identity"): always show (username is critical)
- **Social Links** (id="social"): show only if any of `githubUrl, websiteUrl, twitterUrl, contactEmail` has a value
- **Case Studies** (id="casestudies"): show only if `caseStudies.length > 0`
- **Services** (id="services"): show only if `services.length > 0`
- **SEO & Sharing** (id="seo"): show only if `metaTitle || metaDescription`

For hidden sections, add a single "Add more sections" button at the bottom that reveals all sections when tapped (toggle state). This ensures users can still access empty sections to fill them in.

### 6. Add "Edit" icon to Bio and Social Links headers
Pass an extra `action` prop to CollapsibleCard for "About Me Bio" and "Social Links" sections — a small pencil/edit icon aligned right in the header that scrolls to / opens the section (same as tapping the header). This is purely visual affordance — the click behavior is identical to the existing toggle.

### 7. Sync Mode description
Under the "Content Sync Mode" collapsed hint, when `syncMode === 'auto'`, show hint text: "Auto — resumes sync live". Inside the expanded section, the description already exists at line 1075.

### 8. Publish toggle UX refinement
Move the publish toggle from the bottom "Publish" block into the hero card. Use `Switch` component (already imported) with label "Make portfolio public" and helper "Anyone with your link can view your portfolio website." Remove the old Publish block at lines 1198-1227 since it's now in the hero.

---

## Detailed Hero Card Layout

```text
+------------------------------------------+
| Portfolio Overview          [Live badge]  |
|                                           |
| wiseresume.app/p/magdy  [Copy] [QR]      |
|                                           |
| 5 views  |  60% Good  |  7 skills        |
|                                           |
| [Switch] Make portfolio public            |
| Anyone with your link can view it.        |
|                                           |
| [====== Save Portfolio ======]            |
| [Unpublish] (if live)                     |
+------------------------------------------+
```

### 9. Strength tips — show below hero when strength < 100%
Below the hero card, if there are missing strength items, show a small collapsible "Improve your score" card with the top 3 tips. This replaces the old standalone Strength CollapsibleCard.

---

## Files Changed

| File | What |
|---|---|
| `src/pages/PortfolioEditorPage.tsx` | All changes above — restructure hero, conditional sections, rename skills, move publish toggle, remove redundant blocks |

No new files, no backend changes, no route changes.

## What Stays the Same
- All state variables, save logic, Supabase calls unchanged
- QR dialog, Career Card sheet, theme picker, section visibility toggles all preserved
- VisitorsPanel component kept but accessed via link instead of always-visible collapsible
- All form inputs and their handlers identical
- Bottom tab bar, navigation, auth — untouched

