
# Complete Fix Plan: AI Studio UI, AI Features, and One-Page Wizard

## Issues Summary

### Issue 1: AI Studio Has No Exit Option on Mobile
**Root Cause:** The AIHubSheet and other bottom sheets use the Sheet component which **does** have a close button (`X` in top-right corner). However, looking at the user's report and the sheet component code, the close button is there BUT:
1. On 85vh height sheets, users may not see the close button if they scroll down
2. The close button may be positioned where the safe area or notch overlaps
3. Users may not realize they can tap the dark overlay to close

**Solution:** Add an explicit "Close" button at the bottom of AI sheets for better mobile UX, and ensure the header has proper padding for notched devices.

### Issue 2: All AI Features Failing with "Unauthorized"
**Root Cause:** 6 Edge Functions are using the non-existent `supabase.auth.getClaims(token)` method instead of `supabase.auth.getUser(token)`:

| Edge Function | Status |
|---------------|--------|
| `parse-resume` | Uses `getClaims` (BROKEN) |
| `parse-linkedin` | Uses `getClaims` (BROKEN) |
| `recruiter-simulation` | Uses `getClaims` (BROKEN) |
| `generate-headshot` | Uses `getClaims` (BROKEN) |
| `generate-cover-letter` | Uses `getClaims` (BROKEN) |
| `parse-job-url` | Uses `getClaims` (BROKEN) |
| `enhance-section` | Fixed in previous session |
| `analyze-resume` | Fixed in previous session |
| `tailor-resume` | Fixed in previous session |

### Issue 3: Move One-Page Wizard to Download/Preview Page
**Current Location:** In EditorPage's AI Studio bar
**New Location:** PreviewPage's ExportOptionsSheet

The user wants to download either a normal CV or a one-page condensed version from the same place.

---

## Implementation Plan

### Part A: Fix AI Studio UI - Add Explicit Close Button

**Files to modify:**
- `src/components/editor/AIHubSheet.tsx`
- `src/components/editor/AgenticChatSheet.tsx`
- Other sheets that may have this issue

**Changes:**
1. Add a footer section with an explicit "Close" button
2. Ensure proper `pt-safe` padding on headers for notched devices
3. Increase drag indicator visibility

### Part B: Fix All Remaining Edge Functions (6 functions)

**Pattern to apply to each function:**

Replace:
```typescript
const { data: claimsData, error: authError } = await supabaseClient.auth.getClaims(token);
if (authError || !claimsData?.claims) { ... }
const userId = claimsData.claims.sub;
```

With:
```typescript
const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
if (authError || !user) {
  console.error('Auth error:', authError);
  return new Response(
    JSON.stringify({ error: 'Unauthorized' }),
    { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
const userId = user.id;
```

**Files to fix:**
1. `supabase/functions/parse-resume/index.ts` (lines 213-222)
2. `supabase/functions/parse-linkedin/index.ts` (lines 57-65)
3. `supabase/functions/recruiter-simulation/index.ts` (lines 102-112)
4. `supabase/functions/generate-headshot/index.ts` (lines 33-42)
5. `supabase/functions/generate-cover-letter/index.ts` (lines 36-45)
6. `supabase/functions/parse-job-url/index.ts` (lines 156-165)

### Part C: Add One-Page Wizard to Preview/Export Page

**Files to modify:**
1. `src/pages/PreviewPage.tsx` - Add OnePageWizardSheet and integration
2. `src/components/editor/ExportOptionsSheet.tsx` - Add "One-Page" export option

**Changes:**
1. Import OnePageWizardSheet in PreviewPage
2. Add state for showing one-page wizard
3. Add a new export option card for "One-Page Resume"
4. Update the export flow to optionally apply one-page optimization before generating PDF

---

## Technical Details

### A. AI Studio UI Fix

The Sheet component already has a close button at line 77, but we'll add redundancy for better mobile UX:

```tsx
// In AIHubSheet.tsx - add footer before closing </SheetContent>
<div className="shrink-0 p-4 border-t border-border">
  <Button 
    variant="ghost" 
    className="w-full" 
    onClick={() => onOpenChange(false)}
  >
    Close
  </Button>
</div>
```

### B. Edge Function Auth Fix Pattern

Each function needs the same fix - replacing `getClaims` with `getUser`:

```typescript
// BEFORE (broken)
const { data: claimsData, error: authError } = await supabaseClient.auth.getClaims(token);
if (authError || !claimsData?.claims) {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), ...);
}
const userId = claimsData.claims.sub;

// AFTER (working)
const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
if (authError || !user) {
  console.error('Auth error:', authError);
  return new Response(JSON.stringify({ error: 'Unauthorized' }), ...);
}
const userId = user.id;
```

### C. One-Page Wizard in Export

Add to ExportOptionsSheet:

```tsx
// New export option
{
  id: 'one-page' as ExportType,
  label: 'One-Page Resume',
  description: 'AI-condensed to fit one page',
  icon: FileText,
  available: true,
}
```

---

## Files to Modify Summary

| File | Changes |
|------|---------|
| `src/components/editor/AIHubSheet.tsx` | Add close footer button |
| `src/components/editor/AgenticChatSheet.tsx` | Add close footer button |
| `supabase/functions/parse-resume/index.ts` | Fix `getClaims` → `getUser` |
| `supabase/functions/parse-linkedin/index.ts` | Fix `getClaims` → `getUser` |
| `supabase/functions/recruiter-simulation/index.ts` | Fix `getClaims` → `getUser` |
| `supabase/functions/generate-headshot/index.ts` | Fix `getClaims` → `getUser` |
| `supabase/functions/generate-cover-letter/index.ts` | Fix `getClaims` → `getUser` |
| `supabase/functions/parse-job-url/index.ts` | Fix `getClaims` → `getUser` |
| `src/pages/PreviewPage.tsx` | Add OnePageWizardSheet integration |
| `src/components/editor/ExportOptionsSheet.tsx` | Add one-page export option |
| `src/types/resume.ts` | Add 'one-page' to ExportType if needed |

---

## Testing Checklist

After implementation:
1. Open AI Studio on mobile - verify close button is visible and works
2. Import a CV using parse-resume - verify no "Unauthorized" error
3. Use Wise AI agentic chat - verify it responds correctly
4. Try AI Enhance on a section - verify enhancement works
5. Try Recruiter Simulation - verify it works
6. Go to Preview page - verify One-Page option appears in export sheet
7. Test One-Page export flow - verify it condenses and downloads correctly
