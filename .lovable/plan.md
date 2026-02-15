

## Landing Page Audit and Optimization

### Current Page Structure (Index.tsx)

The landing page is a self-contained component with these sections in order:

1. **Hero** (lines 75-138) -- AppIcon, headline, CTA, trust badges
2. **Steps Row** (lines 141-167) -- Create / AI Polish / Export
3. **EditorDemo** (lines 170-173) -- Animated phone mockup showing AI bullet transformation
4. **Social Proof Bar** (lines 176-194) -- Rating, resumes count, "Free forever"
5. **Competitor Comparison** (lines 197-234) -- "Why WiseResume?" table (us vs. others)
6. **AI Bullet Transform** (lines 237-266) -- Static before/after card
7. **Features Grid** (lines 269-290) -- 6 feature cards
8. **Template Preview** (lines 293-327) -- 3 mini template thumbnails
9. **Bottom CTA** (lines 330-354) -- Repeated "Get Started Free"

### Issues Found

**1. Redundant Section: AI Bullet Transform (lines 237-266)**
The static "AI Bullet Transformation" card shows the exact same before/after content as the animated EditorDemo above it. The EditorDemo already demonstrates this interactively with typing animation, AI shimmer, and score ring. The static card adds no new information and lengthens the page unnecessarily.
- **Action**: Remove this section entirely.

**2. One-Sided Competitor Comparison**
The comparison table marks every row as a checkmark for WiseResume and an X for "Others". This looks untrustworthy -- no competitor has zero overlap. The first row ("Generic templates only") even implies *others* have templates but marks it X.
- **Action**: Remove this section. The Features Grid already communicates what WiseResume offers. Alternatively, replace with a shorter, more honest differentiator (but removal is simpler and cleaner).

**3. Template Preview is Minimal but Fine**
Only 3 thumbnail placeholders. The TemplateGallery component exists with 6 rich previews but is unused on this page.
- **Action**: Keep as-is. The lightweight thumbnails load fast and the "Browse All 12" link drives engagement without bloating the page.

**4. Unused Imports in Index.tsx**
`BarChart3` icon is imported but never used.
- **Action**: Remove unused import.

**5. Mobile Layout is Already Good**
- No horizontal overflow at 360px (verified: all sections use `px-4`, `max-w-md mx-auto`)
- Hero CTA is above the fold with proper sizing (h-14, text-lg)
- Features grid uses `grid-cols-1 xs:grid-cols-2` correctly
- Touch targets meet 44px minimum
- No fixes needed for mobile layout

### Resulting Page Flow (After Changes)

1. **Hero** -- Headline + primary CTA (above the fold)
2. **Steps Row** -- How it works in 3 steps
3. **EditorDemo** -- Interactive AI demo (the wow moment)
4. **Social Proof Bar** -- Trust signals
5. **Features Grid** -- What you get (6 cards)
6. **Template Preview** -- Visual proof of quality
7. **Bottom CTA** -- Final conversion push

This cuts 2 sections, shortening the page by ~30% while removing zero unique value. The conversion flow becomes: hook (hero) -> show (demo) -> prove (social proof) -> list (features) -> convert (bottom CTA).

### Technical Changes

| File | Change |
|------|--------|
| `src/pages/Index.tsx` | Remove the `competitors` array and the competitor comparison section (lines 26-34, 196-234). Remove the static AI Bullet Transform section (lines 236-266). Remove unused `BarChart3` import. |

No logic, routing, auth, or handler changes. All remaining sections keep their exact current code.

