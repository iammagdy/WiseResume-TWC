

## Standalone Portfolio Editor Page with Enhanced Features

### What Changes

Extract the entire "Public Portfolio" section from the Profile page into a dedicated `/portfolio` route, and enhance it with powerful new capabilities.

### Navigation Flow

From the Profile page, the "Public Portfolio" card becomes a navigation link to `/portfolio` instead of an inline form. The card shows the portfolio status (enabled/disabled, username, view count) as a summary.

### New Page: `/portfolio` (PortfolioEditorPage)

A full standalone page with a polished header and organized sections:

**Section 1: Portfolio Status Card**
- Live/Draft badge showing whether the portfolio is public
- View count stat (pulled from profile)
- "Preview Portfolio" button that opens the live URL in a new tab
- URL display with copy button

**Section 2: Identity**
- Username field with availability check (existing logic, moved here)
- Source Resume selector (existing, moved here)
- Portfolio Theme picker (existing, moved here)

**Section 3: About Me Bio**
- Bio textarea with AI Generate button (existing, moved here)
- Character counter

**Section 4: Social Links and Contact**
- GitHub, Website, X/Twitter URLs (existing, moved here)
- Contact Email for "Hire Me" button (existing, moved here)

**Section 5: NEW - Custom Sections Toggle**
Choose which resume sections appear on the public portfolio:
- Experience (on/off)
- Education (on/off)
- Skills (on/off)
- Projects (on/off)
- Certifications (on/off)
- Awards (on/off)
- Publications (on/off)
- Volunteering (on/off)

This gives users control over what visitors see without editing the resume itself. Stored as a JSON object in the `profiles` table (new `portfolio_sections` column).

**Section 6: NEW - SEO and Sharing**
- Custom meta title override (defaults to "Name -- Job Title")
- Custom meta description override (defaults to bio)
- OG Image preview note (future enhancement)

**Section 7: Publish Controls**
- "Make Portfolio Public" toggle (existing)
- Save button
- Danger zone: "Unpublish Portfolio" destructive action

### Files to Create/Change

| File | Change |
|------|--------|
| `src/pages/PortfolioEditorPage.tsx` | New standalone page with all portfolio editing features |
| `src/pages/ProfilePage.tsx` | Replace inline portfolio form with a summary card that navigates to `/portfolio` |
| `src/App.tsx` | Add `/portfolio` route (protected) |
| Database migration | Add `portfolio_sections` (jsonb) and `portfolio_meta_title` / `portfolio_meta_description` (text) columns to `profiles` |
| `src/hooks/usePublicPortfolio.ts` | Pass section visibility data through to the public page |
| `src/pages/PublicPortfolioPage.tsx` | Respect section visibility toggles; use custom SEO meta if set |

### Technical Details

**New database columns on `profiles`:**
```sql
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS portfolio_sections jsonb DEFAULT '{"experience":true,"education":true,"skills":true,"projects":true,"certifications":true,"awards":true,"publications":true,"volunteering":true}'::jsonb,
  ADD COLUMN IF NOT EXISTS portfolio_meta_title text,
  ADD COLUMN IF NOT EXISTS portfolio_meta_description text;
```

**Profile page portfolio card (replaces inline form):**
The card shows:
- Globe icon + "Public Portfolio" heading
- Status badge: "Live" (green) or "Draft" (muted)
- Username and view count if live
- Chevron right icon indicating navigation
- Tapping navigates to `/portfolio`

**PortfolioEditorPage structure:**
- Header with back button ("Portfolio Settings")
- Scrollable content with organized card sections
- Sticky bottom save button
- All existing portfolio logic (username check, bio generation, save) moves here

**Section visibility in PublicPortfolioPage:**
The `get_public_portfolio` RPC already returns profile data. The new `portfolio_sections` field will be passed through, and each section on the public page will check its visibility flag before rendering.

### Summary of Enhancements
1. Standalone dedicated page -- cleaner UX, room to grow
2. Section visibility toggles -- control what the public sees
3. Custom SEO meta -- better sharing on social media
4. Status dashboard -- view count, live/draft status at a glance
5. Organized card-based layout -- each concern in its own section
