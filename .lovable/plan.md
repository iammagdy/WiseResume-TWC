

# Reorganize Portfolio Editor Sections

## Current Problem

The portfolio editor has **14 separate collapsible cards** plus the hero card, making it feel overwhelming. Many of these sections contain only 1-2 fields and could be logically grouped together.

**Current sections (in order):**
1. Hero Card (Portfolio Overview)
2. Strength Tips
3. Visitors & Analytics
4. Skills on your portfolio
5. Visual Theme
6. Customization (accent, font, layout)
7. Identity (username, source resume, page color mode)
8. About Me Bio
9. Social Links & Contact
10. Availability
11. Visible Sections
12. Content Sync Mode
13. Case Studies
14. Services & Offerings
15. SEO & Sharing

## Proposed New Structure (8 items, down from 15)

### Always visible:

| # | Section | Contents (merged from) |
|---|---------|----------------------|
| 1 | **Hero Card** (unchanged) | Overview, publish toggle, save, career card |
| 2 | **Profile** | Username + Source Resume (from Identity) + Bio with AI (from About Me Bio) + Social Links & Contact + Availability toggle & headline |
| 3 | **Appearance** | Theme picker (from Visual Theme) + Accent Color + Font + Layout + Page Color Mode (from Identity and Customization) |
| 4 | **Content & Visibility** | Section on/off toggles (from Visible Sections) + Sync Mode radio (from Content Sync Mode) |
| 5 | **Visitors & Analytics** | Unchanged |

### Behind "Add more sections" (conditional):

| # | Section | Status |
|---|---------|--------|
| 6 | **Case Studies** | Unchanged |
| 7 | **Services & Offerings** | Unchanged |
| 8 | **SEO & Sharing** | Unchanged |

### Removed entirely:

| Section | Reason |
|---------|--------|
| **Skills on your portfolio** | Read-only informational display; skills are managed in the Resume Editor. Adds clutter without providing an actionable setting. |
| **Strength Tips** | Fold the 3 tips inline into the hero card beneath the score, as small tappable hints. No need for a separate collapsible section. |

## Technical Changes

### File: `src/pages/PortfolioEditorPage.tsx`

**1. Move Strength Tips into the Hero Card**
- Remove the standalone `CollapsibleCard` for `strength-tips`
- Add the tip list (max 3) as small tappable rows directly below the stats row inside the hero card, visible only when score < 100%

**2. Remove "Skills on your portfolio" section**
- Delete the entire `CollapsibleCard` with `id="skill-cloud"` (lines 700-756)
- Remove related state: `showAllSkills` and `setShowAllSkills`
- Keep `skillScores`/`sortedSkillScores` computations since `strongSkillCount` is used in the hero stats row

**3. Create merged "Profile" section**
- New `CollapsibleCard` with `id="profile"` containing:
  - Username input + availability check (from Identity)
  - Source Resume selector (from Identity)
  - Bio textarea + AI generate button (from About Me Bio)
  - Social links inputs: GitHub, Website, Twitter, Contact Email (from Social Links)
  - "Open to Work" toggle + Availability headline + AI suggest (from Availability)
- Remove the individual `identity`, `bio`, `social`, and `availability` CollapsibleCards

**4. Create merged "Appearance" section**
- New `CollapsibleCard` with `id="appearance"` containing:
  - Theme picker (horizontal scroll, from Visual Theme)
  - Accent color presets + custom picker (from Customization)
  - Font style selector (from Customization)
  - Desktop layout selector (from Customization)
  - Page color mode dropdown (from Identity -- currently misplaced there)
- Remove the individual `theme` and `customization` CollapsibleCards

**5. Create merged "Content & Visibility" section**
- New `CollapsibleCard` with `id="content"` containing:
  - Section visibility toggles (from Visible Sections)
  - Sync mode radio buttons (from Content Sync Mode)
- Remove the individual `sections` and `sync` CollapsibleCards

**6. Update "Improve your score" tip deep-links**
- Tips that previously expanded `bio`, `social`, `availability`, `identity` sections should now expand `profile`
- Tips that previously expanded `theme`/`customization` should now expand `appearance`

**7. Update "Add more sections" conditional logic**
- Social Links and Availability are now always part of Profile (always visible)
- Only Case Studies, Services, and SEO remain behind the "Add more" toggle

## Result

- **Before**: 14 collapsible sections (overwhelming)
- **After**: 5 always-visible items + 3 conditional items (clean and organized)
- Users can find everything in logical groups without endless scrolling
- No functionality is removed (except the read-only skills display)

