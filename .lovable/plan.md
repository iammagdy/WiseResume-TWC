

## Analysis: Claimed Enhancements vs Actual State

After reviewing the database schema, RPC function, frontend code, and edge functions, here is a detailed gap analysis.

---

### 1. Download Resume Button -- NOT IMPLEMENTED

**Claimed**: A "Download Resume (PDF)" button on the public portfolio page.

**Actual**: The `PublicPortfolioPage.tsx` has no download button. The file shown in `current-code` context (from an earlier version) had it, but the current deployed code does not. The link `href="/api/resumes/{id}/pdf"` also wouldn't work -- there's no such API route in this project.

**Fix needed**:
- Add a download button to `PublicPortfolioPage.tsx`
- Generate the PDF client-side using the existing `pdfGenerator.ts` utility, or link to a proper endpoint
- The RPC needs to return the resume `id` field (currently it does NOT include `id` in the response)

---

### 2. Expanded Social Links (GitHub, Website, Twitter) -- NOT IMPLEMENTED

**Claimed**: GitHub, Website, and X (Twitter) URLs are saved and displayed.

**Actual**:
- **Database**: The `profiles` table has NO columns for `github_url`, `website_url`, or `twitter_url`
- **RPC**: `get_public_portfolio` does not return these fields
- **usePublicPortfolio.ts**: The `PublicProfile` interface does NOT include `githubUrl`, `websiteUrl`, or `twitterUrl`
- **PublicPortfolioPage.tsx**: Only renders LinkedIn link, no GitHub/Website/Twitter
- **ProfilePage.tsx**: No input fields for these URLs

**Fix needed**:
- Add `github_url`, `website_url`, `twitter_url` columns to `profiles` table
- Update the RPC to return them
- Add input fields in ProfilePage.tsx
- Update useProfile.ts Profile interface and mapping
- Update usePublicPortfolio.ts PublicProfile interface
- Render them in PublicPortfolioPage.tsx

---

### 3. Theme Customization -- NOT IMPLEMENTED

**Claimed**: Users can select a theme for their portfolio page.

**Actual**:
- **Database**: No `theme` column exists in `profiles` table
- **ProfilePage.tsx**: No theme selector for portfolio
- **PublicPortfolioPage.tsx**: No theme application logic
- **usePublicPortfolio.ts**: No `theme` field in PublicProfile

**Fix needed**:
- Add `theme` column to `profiles` table (text, nullable, default null)
- Add theme selector in ProfilePage portfolio section
- Update RPC to return theme
- Apply theme on PublicPortfolioPage

---

### 4. "Hire Me" CTA -- NOT IMPLEMENTED

**Claimed**: A "Hire Me" button with mailto link using contact email.

**Actual**:
- **Database**: No `contact_email` column in `profiles` table
- **PublicPortfolioPage.tsx**: No "Hire Me" button
- **ProfilePage.tsx**: No contact email input field

**Fix needed**:
- Add `contact_email` column to profiles
- Add input in ProfilePage
- Update RPC
- Add button in PublicPortfolioPage

---

### 5. View Tracking -- NOT IMPLEMENTED

**Claimed**: A `track-portfolio-view` edge function increments a `views` counter.

**Actual**:
- **Database**: No `views` column in `profiles` table
- **Edge Function**: `track-portfolio-view` directory does NOT exist (file not found)
- **PublicPortfolioPage.tsx**: No call to any view tracking function

**Fix needed**:
- Add `views` integer column (default 0) to profiles
- Create `track-portfolio-view` edge function with proper CORS and SQL increment
- Call it from PublicPortfolioPage on load

---

### 6. RPC Updates -- PARTIALLY DONE

The `get_public_portfolio` RPC does NOT return: `githubUrl`, `websiteUrl`, `twitterUrl`, `contactEmail`, `theme`, `views`, or `resume.id`. It only returns the fields that existed before the claimed enhancements.

---

## Implementation Plan

### Step 1: Database Migration
Add 5 new columns to `profiles` and update the RPC:
- `github_url TEXT`
- `website_url TEXT`
- `twitter_url TEXT`
- `contact_email TEXT`
- `portfolio_theme TEXT DEFAULT NULL`
- `views INTEGER DEFAULT 0`

Update `get_public_portfolio` to return all new fields plus `resume.id`.

### Step 2: Create `track-portfolio-view` Edge Function
- POST endpoint that increments `views` column using raw SQL increment (`views + 1`)
- Include proper CORS headers
- No auth required (public endpoint)

### Step 3: Update `useProfile.ts`
- Add all new fields to the Profile interface
- Update `fetchProfile` select query
- Update `updateMutation` mapping

### Step 4: Update `ProfilePage.tsx`
- Add input fields for GitHub URL, Website URL, X (Twitter) URL, Contact Email
- Add a portfolio theme selector (System/Light/Dark)
- Include new fields in `handleSavePortfolio`

### Step 5: Update `usePublicPortfolio.ts`
- Add `githubUrl`, `websiteUrl`, `twitterUrl`, `contactEmail`, `theme`, `views` to `PublicProfile`
- Add `id` to `PublicResume`
- Map all new fields in the fetch function

### Step 6: Update `PublicPortfolioPage.tsx`
- Add social links row (GitHub, Website, X) next to LinkedIn
- Add "Hire Me" mailto button when contactEmail exists
- Add "Download Resume" button (client-side PDF generation)
- Apply portfolio theme on mount
- Call `track-portfolio-view` on mount
- Clean up theme on unmount

### Technical Notes
- The view tracking edge function must use `SET views = views + 1` (not a string like the original broken attempt)
- The PDF download can use the existing `pdfGenerator.ts` but needs the full resume data from the RPC
- Portfolio theme should use `data-theme` attribute or class toggling, matching the existing ThemeDropdown pattern
- All new profile fields need to be included in the `EditProfileSheet.tsx` initial state sync
