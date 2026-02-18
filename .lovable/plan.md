
# Portfolio: Full Premium Redesign + Feature Expansion

## Discovery Answers Applied to Design Decisions

| Question | Answer | How it shapes the plan |
|---|---|---|
| Default vibe | **Creative / Modern** | Bolder hero, animated gradient, expressive type, richer card treatments |
| Audience | **Both equally** | CTA adapts: "Hire Me" for job seekers, "Work with Me" for freelancers; we don't gate anything |
| AI visibility | **On demand via hints** | AI buttons hidden behind empty-state cues, not always-visible sparkle buttons everywhere |
| Extra sections | **Case Studies + Services** | Two new portfolio-only sections stored in a new `portfolio_extras` DB column (JSONB) |

---

## What Gets Built: 5 Work Streams

### Stream 1 — Premium Public Portfolio Page (`PublicPortfolioPage.tsx`)

**Problems today:**
- Hero text hierarchy is weak — name and role are close in size
- About section uses plain `<p>` with no visual weight
- Section headers are `text-sm uppercase` — barely visible
- Cards in single-column have no visual breathing room
- Footer still links to `wiseresume.lovable.app` (Lovable brand exposed)
- Two-column layout has no visual differentiation between columns
- No sticky header with name + CTAs as user scrolls (visitor loses context)

**What changes:**

**Hero section — 6 upgrades:**
1. Name font size bumped to `text-5xl md:text-6xl` with `font-black` — truly dominant
2. Role/title gets a colored pill badge (not just colored text) with accent background
3. Tagline pulled from `availabilityHeadline` OR first 100 chars of bio — used as subline under the title
4. Avatar gets a soft animated glow ring (CSS `@keyframes` pulse, matching accent color)
5. "Open to Work" badge pulsing animation improved — larger and more prominent
6. CTAs reordered: primary = "Get in Touch" (mailto), secondary = "View Projects" (scroll to projects), tertiary = "Download PDF" (ghost outlined)

**Section headers — redesigned per style:**
- `minimal` / `glass-pro`: Accent-colored left accent bar + title in slightly larger weight, divider line extended to edge
- `bold-dark`: Gradient title with glow text shadow
- `classic-clean`: Black serif heading with faint underline

**Cards — improved across all themes:**
- Experience cards: company name gets a subtle logo placeholder circle; duration gets a timeline dot connector between cards
- Project cards: If a project has a `url`, the card title becomes a clickable link with arrow icon; tech tags are more pill-shaped
- Skills: rendered as a cloud with font-size proportional to count (if no count, uniform), up to 30 skills then "show more"

**New: Case Studies section** (rendered only if portfolio has case study data in `portfolio_extras.caseStudies`):
- Card with: headline, challenge paragraph, outcome paragraph, tech used, optional link
- Styled like Project cards but taller with a "Case Study" tag in the corner

**New: Services section** (rendered only if `portfolio_extras.services` exists):
- 2-column grid on mobile/desktop
- Each service: icon (mapped from category), title, description (max 80 chars), starting price or "Custom"

**Sticky mini-header on scroll:**
- Appears after scrolling past the hero (80px threshold, `IntersectionObserver`)
- Shows: small avatar + name + "Get in Touch" button
- Glass-blurred background, fades in with transition
- Does NOT show on print/PDF capture (hidden via `data-pdf-exclude`)

**Footer fix:** Replace `wiseresume.lovable.app` link with `window.location.origin` so it points to the real domain.

**Portfolio URL fix in ProfilePage.tsx:** The `handleShareProfile` and preview button at line 155 still hardcode `wiseresume.lovable.app/p/${username}`. Replace with `window.location.origin + '/p/' + username`.

---

### Stream 2 — Portfolio-Only Sections: Case Studies + Services

**New DB column:** Add `portfolio_extras` JSONB column to `profiles` table.

```sql
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS portfolio_extras jsonb DEFAULT '{}'::jsonb;
```

Structure:
```json
{
  "caseStudies": [
    { "id": "uuid", "title": "...", "challenge": "...", "outcome": "...", "technologies": ["..."], "url": "...", "linkedProjectId": "..." }
  ],
  "services": [
    { "id": "uuid", "title": "...", "description": "...", "category": "development|design|consulting|writing", "startingPrice": "..." }
  ]
}
```

**`useProfile.ts`:** Add `portfolioExtras` to Profile interface, SELECT, and updateMutation.

**`get_public_portfolio` RPC update:** Add `portfolio_extras` to the SELECT and include in the returned JSON as `portfolioExtras`.

**`usePublicPortfolio.ts`:** Add `caseStudies` and `services` arrays to `PublicResume` (or `PublicProfile`) interface.

---

### Stream 3 — Portfolio Editor UX: Case Studies + Services + AI Hints

**New collapsible cards in `PortfolioEditorPage.tsx`:**

**Case Studies card** (new, between Bio and Social Links):
- List of existing case studies with title + edit/delete actions
- "Add Case Study" button → opens an inline form (or bottom sheet on mobile):
  - Title, Challenge (textarea), Outcome (textarea), Technologies (comma-separated), URL, Link to resume project (optional select)
- **AI Generate button** (shown as a hint when Challenge or Outcome fields are empty):
  - Calls new `action: 'case-study'` on `generate-portfolio-bio` edge function
  - Generates Challenge + Outcome from the linked project's description
  - Shows preview → user confirms before applying
  - "Undo" revert (stores previous value in a `prevCaseStudy` ref)

**Services card** (new, after Case Studies):
- List of existing services with edit/delete
- "Add Service" button → inline form:
  - Category (select: Development, Design, Consulting, Writing, Other)
  - Title, Description (max 80 chars), Starting Price (optional)
- No AI action for services (they are user-defined)

**AI Hint pattern (on-demand as per user's answer):**
- When a bio/case study field is **empty**, show a faint placeholder chip: `✨ Generate with AI →` inline below the empty textarea
- When the field has content, the AI button disappears (no always-visible clutter)
- This is implemented by conditional rendering: `{!bio && <AIHintButton onClick={handleGenerateBio} />}`

---

### Stream 4 — Resume ↔ Portfolio Sync Mode

Add a `portfolio_sync_mode` field to the `portfolio_extras` column (or as a separate `portfolio_sync_mode` column in `profiles`):

Values: `'auto'` (default) | `'locked'`

**In the editor Identity card**, add a toggle labeled **"Auto-sync with resume"**:
- `auto` (default, ON): The portfolio always reads live resume data when visitors view it
- `locked` (toggle OFF): Shows a warning dialog: "This will take a snapshot of your current resume content. Future resume edits won't change your portfolio. Portfolio-only content (Case Studies, Services) is always editable." — then stores a `portfolio_snapshot` JSONB in the `portfolio_extras` column

**In `get_public_portfolio` RPC:** If `portfolio_sync_mode = 'locked'` and `portfolio_extras.portfolioSnapshot` is not null, return the snapshot data instead of reading from the `resumes` table.

**Safety:** Switching from `locked` back to `auto` shows a confirmation dialog: "Resume edits since the snapshot will now appear on your portfolio again." Snapshot is preserved in `portfolio_extras` so it can be restored.

---

### Stream 5 — Navigation + Portfolio Discovery

**Dashboard (`DashboardPage.tsx`)** — Add a "Portfolio Website" promo card at the top of the resume list (shown only if `!profile.portfolioEnabled || !profile.username`):
```
┌──────────────────────────────────────────┐
│ 🌐 Turn your resume into a website       │
│ Share a beautiful portfolio link with    │
│ anyone — recruiters, clients, or network │
│                         [Set Up →]       │
└──────────────────────────────────────────┘
```
Card dismissible per session. When portfolio is live, replace with a smaller status strip showing the URL and view count.

**BottomTabBar (`BottomTabBar.tsx`)** — The 5 tabs are currently: Home, Editor, Studio, Activity, Settings. Replace the 5th tab (Settings) with a **Portfolio** tab using the `Globe` icon. Settings becomes accessible from the Dashboard header avatar menu (it already is via the profile icon → settings path). This makes Portfolio a first-class destination.

Alternatively (safer, no tab re-shuffle): add a "Portfolio Website" entry as a quick-action chip on the Dashboard.

**ProfilePage.tsx** — Fix the hardcoded `wiseresume.lovable.app` URL at lines 52, 137, and 155 to use `window.location.origin`.

---

## Edge Function Changes

**`generate-portfolio-bio`** — Add new `action: 'case-study'` branch:

```typescript
if (action === 'case-study') {
  // Takes: projectName, projectDescription, projectTechnologies
  // Returns: { challenge: "...", outcome: "..." }
  // Prompt: generates a problem/solution case study from a project description
  // maxTokens: 400
}
```

No new edge function needed — extends the existing one.

---

## Files Changed (complete list)

| File | Change |
|---|---|
| `src/pages/PublicPortfolioPage.tsx` | Hero upgrade (size, glow, tagline, CTA order), sticky header, section header redesign, experience timeline dots, skill cloud, Case Studies section, Services section, footer URL fix |
| `src/pages/PortfolioEditorPage.tsx` | Case Studies card, Services card, AI hint pattern, sync mode toggle in Identity card, URL fix, portfolio extras state |
| `src/hooks/useProfile.ts` | Add `portfolioExtras`, `portfolioSyncMode` to Profile interface + SELECT + updateMutation |
| `src/hooks/usePublicPortfolio.ts` | Add `caseStudies`, `services`, `syncMode` to response types |
| `src/pages/ProfilePage.tsx` | Fix 3 hardcoded `wiseresume.lovable.app` URLs → `window.location.origin` |
| `src/pages/DashboardPage.tsx` | Add portfolio promo card / live status strip |
| `src/components/layout/BottomTabBar.tsx` | Add Portfolio tab OR add quick-action chip on dashboard |
| `supabase/functions/generate-portfolio-bio/index.ts` | Add `action: 'case-study'` branch |
| DB migration | Add `portfolio_extras jsonb`, `portfolio_sync_mode text` columns to `profiles` |

---

## What Is NOT Changed (safety guarantees)

- Public URL `/p/:username` — untouched. All existing shared links work
- All existing profile fields — no renames, no deletions, only additions
- The `get_public_portfolio` RPC logic for bio / experience / skills — additive only
- Resume editor, templates, PDF export, ATS scoring — completely untouched
- All AI edge functions for resume — not modified

---

## Implementation Sequence

1. DB migration (add `portfolio_extras`, `portfolio_sync_mode` columns)
2. Update `useProfile.ts` + `usePublicPortfolio.ts` to include new fields
3. Update `get_public_portfolio` RPC to return new fields
4. Extend `generate-portfolio-bio` edge function with `case-study` action
5. Redesign `PublicPortfolioPage.tsx` (premium layout, sticky header, new sections)
6. Update `PortfolioEditorPage.tsx` (case studies card, services card, sync toggle, AI hints)
7. Fix ProfilePage.tsx hardcoded URLs
8. Add Dashboard portfolio promo card
9. Add Portfolio to BottomTabBar or dashboard quick-actions
