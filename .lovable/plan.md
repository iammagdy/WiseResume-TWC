

# Fix 3 Interview Bugs: Markdown Rendering, Score Display, Voice Toggle Color

## Bug 1: Markdown Rendered as Raw Text in Summary

### Root Cause
In `InterviewSummary.tsx` line 72, the summary text is rendered as plain text inside a `<p>` tag with `whitespace-pre-wrap`. This displays raw markdown characters like `**bold**` and `- bullets` literally.

The same issue exists in `InterviewHistorySheet.tsx` lines 100-103 and 110-113 where strengths/improvements arrays are rendered as plain `<li>` elements (though these are already split into array items, so markdown within each item string would still show raw).

### Fix

**File: `src/components/interview/InterviewSummary.tsx`**
- Import `ReactMarkdown` (already installed, used elsewhere in the app)
- Replace the `<p>` tag on line 72 with a `<ReactMarkdown>` component
- Apply prose styles matching the dark theme: `prose prose-sm dark:prose-invert max-w-none`
- Add custom class overrides for the interview context:
  - Headings: `[&_h1]:text-base [&_h1]:font-semibold [&_h1]:text-primary [&_h1]:mb-1` (same for h2, h3, h4)
  - Paragraphs: `[&_p]:text-sm [&_p]:leading-relaxed [&_p]:text-foreground/80 [&_p]:mb-3`
  - Lists: `[&_ul]:ml-4 [&_ul]:list-disc [&_li]:text-sm [&_li]:text-foreground/80 [&_li]:mb-1`
  - Bold: `[&_strong]:text-foreground [&_strong]:font-semibold`
- Remove `whitespace-pre-wrap` which conflicts with markdown rendering

**File: `src/components/interview/InterviewHistorySheet.tsx`**
- Import `ReactMarkdown`
- For the strengths and improvements lists, wrap each string item in `<ReactMarkdown>` with compact prose styling so any inline markdown (bold, italic) within items renders correctly
- Use `[&_p]:inline` to prevent extra paragraph spacing within list items

---

## Bug 2: Score Display Inconsistency

### Root Cause
In `InterviewSummary.tsx` lines 35-36, the overall score is parsed from the summary text via regex: `summary.match(/Score:\s*(\d+)\/10/i)`. When the AI doesn't include the exact pattern "Score: X/10" in its response, `overallScore` is `null`, and the component falls back to showing an `<Award>` icon (line 59-61) instead of a score number.

This creates the inconsistency: sometimes a number circle, sometimes a medal icon.

### Fix

**File: `src/components/interview/InterviewSummary.tsx`**
- Make the score extraction more robust: try multiple regex patterns (`Score:\s*(\d+)`, `(\d+)\s*\/\s*10`, `(\d+)\s*out of\s*10`)
- If regex still fails, fall back to `avgScore` (computed from per-answer scores) as a secondary source
- Always render a score circle with the number -- never swap to an Award icon
- If no score is available at all, show a dash "---" inside the circle (muted color)
- Redesign the score circle for consistency:
  - Fixed size: `w-20 h-20` on mobile
  - Border: `border-2` with color based on score (green 8-10, yellow 5-7, red 0-4)
  - Score text: `text-2xl font-bold` with matching color
  - Below: "/ 10" label in `text-muted-foreground text-sm`
- Add scale-up entrance animation: `initial={{ scale: 0.75, opacity: 0 }}`, `animate={{ scale: 1, opacity: 1 }}` with 300ms ease-out
- Remove the pulsing glow background animation to keep focus on the number

---

## Bug 3: Teal/Cyan Color on AI Voice Toggle

### Root Cause
In `InterviewSetup.tsx` lines 183-207, the voice gender toggle uses `bg-primary/20 text-primary` for the active state. The `--primary` CSS variable in the "Vibrant Space" theme is correctly set to the brand red. However, the issue is the `shadow-[inset_0_0_20px_hsl(var(--primary)/0.1)]` and the button lacking `transition-colors duration-200`. The teal/cyan appearance could be caused by browser default focus ring styles not being overridden.

### Fix

**File: `src/components/interview/InterviewSetup.tsx`**
- Replace the active state styling on both voice buttons with explicit brand colors:
  - Active: `bg-primary text-primary-foreground font-semibold` (solid primary background, white text)
  - Inactive: `bg-transparent text-muted-foreground hover:text-foreground`
- Add `transition-colors duration-200 ease-in-out` to both buttons
- Add `focus:outline-none focus-visible:ring-2 focus-visible:ring-primary` to override any browser default focus rings
- Remove the `shadow-[inset_0_0_20px...]` which can look teal on some displays
- Ensure minimum 44px tap target with `min-h-[44px]`

---

## Files Changed Summary

| File | Bug | Change |
|---|---|---|
| `src/components/interview/InterviewSummary.tsx` | 1, 2 | Replace plain text with ReactMarkdown; make score always render as number circle with consistent styling and animation |
| `src/components/interview/InterviewHistorySheet.tsx` | 1 | Wrap strengths/improvements text in ReactMarkdown for inline formatting |
| `src/components/interview/InterviewSetup.tsx` | 3 | Fix voice toggle active state to use solid primary color, remove inset shadow, add focus ring override |

## Technical Notes
- `react-markdown` is already installed (v10.1.0) and used in `AgenticChatSheet.tsx` and `GuidePage.tsx`
- All animations use Framer Motion (already imported in all 3 files)
- `useReducedMotion` will be checked for the score circle entrance animation
- No changes to AI prompts, API calls, scoring logic, voice engine, or data models
- Minimum 14px font size maintained throughout
