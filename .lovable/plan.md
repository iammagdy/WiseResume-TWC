

## Redesign: Comprehensive AI Credit Usage Sheet

### Goal

Split the "Today's Activity" section into two clear areas:
1. **Credited Activity** -- actions that cost credits, with the cost shown (e.g., "-1 credit", "-2 credits")
2. **Background Activity** -- actions that ran automatically at no cost (e.g., dashboard ATS scoring)

### Current Problem

- After our previous fix, background scoring no longer logs entries at all (we skip `recordUsage` entirely when `background: true`)
- So there's no way to show background activity in the sheet
- Existing entries don't indicate whether they cost credits or not

### Approach

**1. Re-enable background logging with a flag** (`supabase/functions/score-resume/index.ts`)

- When `background: true`, still call `recordUsage` but pass `{ background: true }` in the metadata field
- This way background activity is tracked but clearly marked

**2. Update the shared `recordUsage` helper** (no changes needed -- it already accepts optional metadata)

**3. Redesign the CreditUsageSheet UI** (`src/components/ai/CreditUsageSheet.tsx`)

- Fetch today's logs including the `metadata` column
- Split entries into two lists:
  - **Credited**: entries where `metadata.background` is NOT true -- show cost from `AI_COST_MAP` (e.g., "Tailor" shows "-2 credits", "ATS Score" shows "-1 credit")
  - **Background**: entries where `metadata.background` IS true -- shown in a separate, more subtle section below
- Each credited entry row: `[Label]  [-N credit(s)]  [time]`
- Each background entry row: `[Label]  [Free]  [time]` in muted styling

### Technical Details

| File | Change |
|------|--------|
| `supabase/functions/score-resume/index.ts` | Line 125-128: change from skipping `recordUsage` to calling it with `{ background: true }` metadata |
| `src/components/ai/CreditUsageSheet.tsx` | Fetch `metadata` column; split activity into credited vs background sections; import `getAICost` to show cost badges per entry |

### UI Layout (inside the sheet)

```text
[Ring: 9 / 20 credits used today]
[Resets in Xh Ym]

--- CREDITED ACTIVITY ---
Tailor          -2 credits    2:30 PM
Enhance         -1 credit     1:45 PM
ATS Score       -1 credit     1:20 PM

--- BACKGROUND ACTIVITY ---
ATS Score       Free          12:05 PM
ATS Score       Free          12:04 PM
ATS Score       Free          12:03 PM

--- LIFETIME USAGE ---
[Total: 142 credits]
```

### Edge Function Deployment

The updated `score-resume` function will be redeployed automatically.

