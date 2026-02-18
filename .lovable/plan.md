
# Fix & Expand AI Features in "My Portfolio Website"

## Bug Confirmed: Bio AI Generate is Truncating

The `generate-portfolio-bio` edge function uses `maxTokens: 500`. The prompt itself consumes ~250 tokens, leaving only ~250 tokens for the bio output. A 120-word bio requires ~180–220 output tokens, so it cuts off mid-sentence. My live curl test confirmed: `"Hi there! I'm a senior software engineer with eight years of experience, and I"` — truncated.

**Fix**: Increase `maxTokens` from `500` → `1200` in the edge function. The prompt also instructs "under 120 words" so we won't waste tokens, but we give enough headroom for the model to complete its thought properly.

---

## Full AI Feature Gap Analysis

| Feature | Status | Why it matters |
|---|---|---|
| AI Generate Bio | Exists but truncates | Users see incomplete bio in their portfolio |
| AI Generate Meta Title | Missing | Users skip SEO — portfolio won't surface in Google |
| AI Generate Meta Description | Missing | Same as above |
| AI Generate Availability Headline | Missing | Hard to write a punchy "available from X" line |
| AI Portfolio Score / Completeness Tips | Missing | Users don't know what's weak before publishing |

---

## What Gets Built: 3 Additions + 1 Fix

### Fix 1 — Bio Truncation (1 file, edge function)

`supabase/functions/generate-portfolio-bio/index.ts`
- Change `maxTokens: 500` → `maxTokens: 1200`
- That's the only change needed here. No prompt changes needed.

### Addition 1 — AI Generate SEO (reuse same edge function with `action` param)

Extend `generate-portfolio-bio` to accept an `action` field in the request body:
- `action: 'bio'` (default, existing behaviour)
- `action: 'seo'` — returns `{ metaTitle, metaDescription }` optimized for Google indexing, generated from name + job title + summary + top 3 skills
- `action: 'availability'` — returns `{ headline }` — a short "Open to remote · Available June 2025" style line based on the user's career level, job title, and current experience

This keeps a single edge function and avoids deploying a new one.

In `PortfolioEditorPage.tsx`:
- Add a small `Sparkles` button next to the Meta Title field label that calls `action: 'seo'` and fills both title + description fields
- Add a small `Sparkles` button next to the Availability Headline field that calls `action: 'availability'`
- Both buttons show a `Loader2` spinner while loading
- Both show a success toast on completion

### Addition 2 — AI Portfolio Completeness Score (client-side, no new edge function)

A "Portfolio Strength" card at the top of `PortfolioEditorPage.tsx`, shown just below the status card. This is computed **entirely client-side** (no AI call, no credits) by checking:
- Has avatar (from profile)
- Has bio (≥50 chars)
- Has username set
- Has at least 1 social link
- Has availability headline
- Has meta title + description
- Source resume has experience (≥1 entry)
- Source resume has skills (≥3)
- Source resume has projects (≥1)
- Portfolio is enabled/live

Score: `filled_fields / 10 × 100`. Display as a colored progress bar (red < 40, amber 40–70, green > 70) with a list of the top 3 missing items as actionable tips.

This gives users instant feedback without consuming AI credits.

---

## Files Changed

| File | Change |
|---|---|
| `supabase/functions/generate-portfolio-bio/index.ts` | Fix truncation (`maxTokens: 1200`), add `action: 'seo'` and `action: 'availability'` branches |
| `src/pages/PortfolioEditorPage.tsx` | Add Portfolio Strength card; add AI sparkle buttons for SEO fields + availability headline field; new `handleGenerateSEO` and `handleGenerateAvailability` handlers |

No new edge functions. No DB changes. No new routes.

---

## UI Placement Details

### Portfolio Strength Card (after Status card, before Theme Gallery)

```
┌──────────────────────────────────────────┐
│ 💪 Portfolio Strength            72%     │
│ ████████████░░░░  Good                   │
│                                          │
│ Missing:                                 │
│ · Add a meta description for SEO         │
│ · Set an availability headline           │
│ · Add a photo to your profile            │
└──────────────────────────────────────────┘
```

### SEO Section (AI button inline with label)

```
Custom Page Title        [✨ AI Generate]
[____________________________]

Custom Meta Description  (filled alongside title)
[____________________________]
```

### Availability Headline (AI button inline with label)

```
Availability headline    [✨ AI Suggest]
[____________________________]
```

---

## What Is NOT Changed

- The `/p/:username` public URL — no risk to existing live portfolios
- The theme system, layout, accent color controls
- The bio section (beyond the truncation fix)
- Any DB schema
- Any other edge functions
