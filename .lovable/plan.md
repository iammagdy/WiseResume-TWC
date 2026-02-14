

## Resume Guides & Enhanced Sharing

Adds a static educational content hub and enhances the existing resume sharing system with feedback capabilities. Scoped to avoid over-engineering -- guides are static (no DB), and collaboration starts with comment-based feedback on shared resumes rather than full team workspaces.

---

### What Already Exists

- `contentLibrary.ts` -- 500+ resume phrases (action verbs, achievements, skills)
- `ContentLibrarySheet.tsx` -- Phrase browser with favorites and categories
- `ExamplesPage.tsx` -- Resume examples with industry/level filters
- `ShareSheet.tsx` + `SharePage.tsx` -- Resume sharing with token-based links and password protection
- `useResumeShares.ts` -- Share CRUD with `get_shared_resume` RPC
- `resume_shares` table -- Token, password, expiry, view count

---

### Part 1: Resume Guides Content Hub

A new `/guides` page with static educational articles organized by category. No database needed -- all content is bundled as static TypeScript data, keeping things fast and offline-friendly.

#### New Files

**1. `src/lib/guidesData.ts`** -- Static guide content (all articles)
- ~30 curated guides across 5 categories:
  - Resume Writing (10): ATS tips, power words, quantifying achievements, format comparison, common mistakes, career gaps, entry-level, executive, length guidelines, skills section
  - Cover Letters (5): Structure, opening paragraphs, closing examples, cold applications, referral letters
  - Interview Prep (5): STAR method, behavioral questions, salary negotiation, video interview tips, questions to ask
  - Career Advice (5): Job search strategies, networking, LinkedIn optimization, personal branding, remote work
  - Industry Insights (5): Tech, healthcare, finance, marketing, general career paths
- Each guide is a TypeScript object: `{ slug, title, category, readTimeMinutes, content (markdown string), tags }`
- Content is professional-quality markdown with headers, bullet points, and actionable tips
- Total bundle size ~50KB (acceptable for static content)

**2. `src/pages/GuidesPage.tsx`** -- Content hub listing page
- Header with back button and "Career Guides" title
- Search bar (filters guides by title/content/tags)
- Category filter chips (horizontal scroll): All, Resume, Cover Letter, Interview, Career, Industry
- Guide cards in vertical list:
  - Title (bold), category badge, read time badge ("5 min read")
  - First ~80 chars of content as preview
  - Bookmark icon (persisted via Zustand store)
- Bookmarks tab toggle (Browse / Saved)
- Empty state for no results

**3. `src/pages/GuidePage.tsx`** -- Individual guide reader
- Header with back button and guide title
- Reading progress bar at top (scroll-based)
- Markdown rendered content using `react-markdown` (already installed)
- Large readable text (text-base, leading-relaxed)
- "Was this helpful?" thumbs up/down at bottom (stored in local store)
- Related guides section (same category, different article)
- "Back to Guides" link at bottom
- Font size adjustment (small/medium/large toggle in header)

**4. `src/store/guidesStore.ts`** -- Zustand persisted store
- `bookmarkedSlugs: string[]` -- saved guides
- `readSlugs: string[]` -- guides user has scrolled >80%
- `helpfulSlugs: Record<string, boolean>` -- thumbs up/down feedback
- `fontSize: 'sm' | 'md' | 'lg'` -- reader preference

#### Files to Modify

- `src/App.tsx` -- Add 2 lazy routes: `/guides`, `/guides/:slug`
- `src/components/layout/AppShell.tsx` -- Add `/guides` to TAB_ROUTES
- `src/pages/DashboardPage.tsx` -- Add "Guides" action card with `BookOpen` icon (replace or add alongside existing Examples card)

---

### Part 2: Enhanced Resume Sharing with Feedback

Extends the existing token-based sharing system to allow viewers to leave comments/feedback on shared resumes. This is a lightweight collaboration layer -- no team workspaces, no real-time editing.

#### Database Changes

**New `share_comments` table:**
- `id` (uuid, PK)
- `share_id` (uuid, NOT NULL, references resume_shares.id)
- `author_name` (text, NOT NULL) -- viewer's name (no auth required)
- `section` (text, nullable) -- which resume section the comment targets (e.g., 'experience', 'summary')
- `content` (text, NOT NULL, max 1000 chars)
- `is_resolved` (boolean, default false)
- `created_at` (timestamptz)
- RLS: Public insert for active shares, owner can read/update/delete via share ownership

**New RPC function: `add_share_comment`** (SECURITY DEFINER)
- Validates share token is active and not expired
- Inserts comment linked to the share
- Returns the created comment
- Prevents abuse: rate limit of 10 comments per share per hour

**Modify `get_shared_resume` RPC:**
- Add optional `include_comments` parameter
- When true, includes comments array in the response

#### New Files

**5. `src/hooks/useShareComments.ts`** -- Comments data hook
- `useShareComments(shareId)` -- fetch comments for a share (owner only)
- `useAddShareComment()` -- mutation for viewers to add comments via RPC
- `useResolveComment()` -- mutation for owner to mark resolved

**6. `src/components/editor/ShareFeedbackSheet.tsx`** -- Owner's feedback viewer
- Bottom sheet showing all comments on a shared resume
- Filter: All / Unresolved / Resolved
- Each comment card: author name, section tag, content, timestamp
- "Resolve" button per comment
- Badge count of unresolved comments
- Accessible from ShareSheet when share has comments

**7. Public share page comment form** (added to `SharePage.tsx`)
- "Leave Feedback" expandable section at bottom of shared resume view
- Name input + comment textarea + optional section selector dropdown
- Submit button with loading state
- Success toast after submission
- Shows existing comments (read-only) below the form

#### Files to Modify

- `src/pages/SharePage.tsx` -- Add feedback form section and display existing comments
- `src/components/editor/ShareSheet.tsx` -- Add "View Feedback" button when share has comments, linking to ShareFeedbackSheet

---

### Technical Details

**No external APIs** -- guides are static content, comments use existing Supabase infrastructure.

**Database migration:**
```sql
CREATE TABLE public.share_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  share_id uuid NOT NULL REFERENCES public.resume_shares(id) ON DELETE CASCADE,
  author_name text NOT NULL,
  section text,
  content text NOT NULL,
  is_resolved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.share_comments ENABLE ROW LEVEL SECURITY;
-- Public can insert on active shares
-- Owner can read/update/delete via share ownership check
```

**RPC function** (`add_share_comment`): SECURITY DEFINER, validates token, inserts comment, returns result. No auth required (public viewers can comment).

**Mobile patterns:**
- Guide cards use `glass-surface` with 44px minimum tap targets
- Reader uses large text with adjustable font size
- Comment form uses `text-[16px]` inputs to prevent iOS zoom
- All new pages lazy-loaded via `lazyWithRetry`
- Guides store uses Zustand `persist` for offline bookmarks

**Performance:**
- Static guide content is tree-shaken per page (dynamic import by slug)
- No API calls for guides (instant load)
- Comments fetched only when share page loads
- Guides page is ~50KB total (acceptable)

**Bundle strategy for guides:**
- All guide content in a single `guidesData.ts` file
- Lazy-loaded with the GuidesPage route (not in main bundle)
- Markdown rendering uses already-installed `react-markdown`

#### Implementation Order

1. Static guide content data (`guidesData.ts`)
2. Guides Zustand store
3. GuidesPage (listing with search + filters)
4. GuidePage (reader with progress tracking)
5. Database migration (share_comments table + RPC)
6. useShareComments hook
7. SharePage comment form enhancement
8. ShareFeedbackSheet for owners
9. Route registration + Dashboard access point

