
# Landing Page "See It in Action" + Changelog Polish

## What Already Exists (No Duplication)

After thorough exploration, here is what is already in place:

- **Changelog v2.1.0** — Already in `public/changelog.json` as `"latest": true` with 6 Portfolio bullet items. The app derives its version string dynamically from this file (in Settings, Bug Reports, Feature Requests) — so the version is already showing as `v2.1.0` everywhere.
- **"See It in Action" section** — Already exists in `src/pages/Index.tsx` (lines 350–413) with two animated cards: `EditorDemo` (AI Editor) and `PortfolioDemo` (Public Portfolio).

## What Actually Needs Fixing

### Problem 1 — Portfolio CTA button goes to wrong route
Line 406: `navigate(isAuthenticated ? '/profile' : '/auth')`

The `/profile` route is the user profile settings page, **not** the portfolio editor. The portfolio editor lives at `/portfolio`. This is a functional bug — authenticated users who click "Build Your Portfolio" end up on the wrong page.

**Fix:** Change destination to `/portfolio` for authenticated users.

### Problem 2 — Changelog is missing a "why this matters" intro summary
The v2.1.0 changelog has 6 bullet items but no parent summary/headline that wraps them with a user-centered narrative. The Settings page renders each entry's `title` + `description` individually, so the JSON schema supports adding a `summary` field and rendering it in the dialog.

**Fix:** Add a `summary` field to the v2.1.0 changelog entry with a professional 1–2 sentence overview. Update `SettingsPage.tsx` to render it when present.

### Problem 3 — "See It in Action" card visual polish
The two cards use `bg-card/50 border-border/30` which is flat and doesn't match the vibrant brand language. The section subtitle is generic. Cards could benefit from:
- Colored top accent borders matching each card's theme (primary red for Editor, emerald for Portfolio)
- A subtle gradient overlay at the bottom of each demo area
- The Portfolio card's "New in v2.1" badge should use a stronger glow to draw attention
- Section subtitle updated from "Two powerful tools built for your career" to something more compelling

## Exact File Changes

### File 1: `public/changelog.json`
Add `"summary"` field to the v2.1.0 entry — a single rich sentence explaining the user benefit. No other entries are touched.

```json
{
  "version": "v2.1.0",
  "date": "2026-02-18",
  "latest": true,
  "summary": "WiseResume now turns your resume into a full personal website — complete with themes, AI-written content, and a shareable link you can send to anyone.",
  "items": [...]
}
```

### File 2: `src/pages/SettingsPage.tsx`
In the changelog dialog render block (around lines 1037–1050), add a summary line rendered when `release.summary` exists:

```tsx
{release.summary && (
  <p className="text-xs text-muted-foreground mb-3 leading-relaxed">{release.summary}</p>
)}
```

### File 3: `src/pages/Index.tsx`
Three targeted changes:

**Change A — Fix Portfolio CTA route (line 406):**
```tsx
// Before:
navigate(isAuthenticated ? '/profile' : '/auth')
// After:
navigate(isAuthenticated ? '/portfolio' : '/auth')
```

**Change B — Improve section subtitle (line 359):**
```tsx
// Before:
"Two powerful tools built for your career"
// After:
"From AI resume writing to a shareable personal website — all in one place"
```

**Change C — Richer card styling:**
- AI Editor card: add `border-t-2 border-t-primary/40` for a colored top accent + update badge background to match
- Portfolio card: add `border-t-2 border-t-emerald-500/40` + give the "New in v2.1" badge a subtle `shadow-[0_0_12px_-2px_hsl(142_71%_45%/0.4)]` glow
- Both cards: add `hover:shadow-lg hover:border-primary/20` transition for interactive depth on desktop

## What Is NOT Changed
- All existing changelog entries (v2.0.0, v1.6.0, v1.5.0, v1.0.0) — untouched
- The `PortfolioDemo` and `EditorDemo` animation components — untouched
- Any routes, auth flows, or portfolio functionality
- Mobile layout — the grid is already `grid-cols-1 lg:grid-cols-2` which is correct
- The version string derivation — already reads from `changelog.json[0].version` dynamically, no hardcoded strings to update
- Desktop layout — untouched beyond card styling improvements

## Summary of Changes

| File | Change | Type |
|---|---|---|
| `public/changelog.json` | Add `summary` field to v2.1.0 entry | Content |
| `src/pages/SettingsPage.tsx` | Render `summary` in changelog dialog | UI |
| `src/pages/Index.tsx` | Fix Portfolio CTA `/profile` → `/portfolio` | Bug fix |
| `src/pages/Index.tsx` | Update section subtitle copy | Copy |
| `src/pages/Index.tsx` | Add colored top borders + hover glow to cards | Visual polish |
