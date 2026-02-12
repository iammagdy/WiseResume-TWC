

## Spacing Standardization: 16px Edges, 24px Between Sections, 16px Inside Cards

### Overview

Audit and fix spacing across the app to follow a consistent system:
- **Screen edges**: 16px minimum (Tailwind `px-4`)
- **Between sections**: 24px (Tailwind `space-y-6` or `gap-6` or `mb-6`)
- **Inside cards**: 16px (Tailwind `p-4`)

### Current State Audit

**Already compliant (no changes needed):**
- Dashboard header: `px-4` -- correct (16px edge)
- Dashboard search: `px-4 pb-3` -- correct edge
- DashboardStats: `px-4 pt-4 pb-3` -- correct edge
- QuickActionChips: `px-4 pb-3` -- correct edge
- Settings page content: `px-4 py-4 space-y-6` -- correct (16px edge, 24px between sections)
- Settings cards: `p-4 rounded-2xl` -- correct (16px inside)
- SectionCard: `px-4 pt-4 pb-2` header, `px-4 pb-4` content -- correct
- ApplicationsPage content: `px-4 py-4 space-y-6` -- correct
- Editor content area: `px-4 py-4` -- correct
- Landing HeroSection: `px-4 sm:px-6` -- correct
- Landing BottomCTA: `px-4 sm:px-6` -- correct

**Non-compliant (needs fixing):**

| File | Current | Issue | Fix |
|------|---------|-------|-----|
| `DashboardStats.tsx` | Card uses `p-5` | 20px inside card, should be 16px | Change to `p-4` |
| `DashboardStats.tsx` | Stats grid `gap-5` | 20px gap, inconsistent | Change to `gap-4` |
| `DashboardStats.tsx` | Stats items `gap-2.5` | 10px, slightly inconsistent | Keep (tight pairing is intentional) |
| `EditorPage.tsx` | Section nav `pt-6 pb-2` | Top padding 24px is fine, bottom 8px OK |  Keep |
| `EditorPage.tsx` | Guest banner `px-4 py-2` | 8px vertical inside banner, too tight | Change to `py-3` |
| `EditorPage.tsx` | Progress area `px-4 py-3` | Correct | Keep |
| `ResumeListCard.tsx` | Card internal padding varies | Audit needed | Standardize to `p-4` |
| `DailyTipCard.tsx` | May have inconsistent padding | Audit needed | Standardize |
| `PreviewPage.tsx` | Bottom actions `p-3 sm:p-4` | 12px on mobile, should be 16px | Change to `p-4` |
| `InterviewPage.tsx` | Various spacing | Audit needed | Standardize |

### Changes

**1. `src/components/dashboard/DashboardStats.tsx`**
- Glass Hero Card: change `p-5` to `p-4` (20px to 16px inside card)
- Stats row beside ring: change `gap-5` to `gap-4`
- Section spacing `mb-4` is correct, keep

**2. `src/pages/EditorPage.tsx`**
- Guest banner: change `py-2` to `py-3` for more comfortable vertical padding
- Editor scroll container `space-y-0` is correct (SectionCard handles own spacing)

**3. `src/pages/PreviewPage.tsx`**
- Bottom action container: change `p-3 sm:p-4` to `p-4` (consistent 16px on all sizes)

**4. `src/components/dashboard/ResumeListCard.tsx`**
- Verify card internal padding is `p-4`; fix if using `p-3` or inconsistent values

**5. `src/components/dashboard/DailyTipCard.tsx`**
- Verify and standardize internal padding to `p-4`

**6. `src/pages/InterviewPage.tsx`**
- Audit screen edge padding (should be `px-4`) and section spacing (should use `space-y-6`)

**7. `src/components/editor/SectionCard.tsx`**
- Already uses `px-4 pt-4 pb-2` for header and `px-4 pb-4` for content -- compliant, no change

**8. `src/index.css`**
- Add spacing utility classes for documentation and reuse:
  - `.space-section` = `margin-bottom: 24px` (between sections)
  - `.p-card` = `padding: 16px` (inside cards)
  - `.px-edge` = `padding-left: 16px; padding-right: 16px` (screen edges)

### Technical Details

The spacing system maps to Tailwind's 4px base:
- 16px = `4` in Tailwind scale (`px-4`, `p-4`, `gap-4`)
- 24px = `6` in Tailwind scale (`space-y-6`, `gap-6`, `mb-6`)

Most of the app already follows `px-4` for edges and `space-y-6` for section gaps. The main fixes are:
1. DashboardStats hero card using `p-5` (20px) instead of `p-4` (16px)
2. PreviewPage bottom actions using `p-3` on mobile instead of `p-4`
3. Guest banner in editor being too tight vertically

### Files Modified
- `src/index.css` -- add spacing utility classes
- `src/components/dashboard/DashboardStats.tsx` -- fix card padding from p-5 to p-4
- `src/pages/EditorPage.tsx` -- fix guest banner padding
- `src/pages/PreviewPage.tsx` -- fix bottom action padding
- `src/components/dashboard/ResumeListCard.tsx` -- audit and fix card padding
- `src/components/dashboard/DailyTipCard.tsx` -- audit and fix card padding
- `src/pages/InterviewPage.tsx` -- audit and fix edge/section spacing

