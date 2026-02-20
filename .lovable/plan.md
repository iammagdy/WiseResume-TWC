

# 2 UX Improvements: Template Layout + Referrer Suppression

## IMPROVEMENT 1: Single-Column Template Grid on Mobile

**Current state** (`src/components/editor/TemplateSelector.tsx`, line 87):
```
<div className="grid grid-cols-2 gap-4 pb-4">
```
This renders a 2-column grid at all screen sizes, making previews too small on mobile.

**Fix**: Change the grid class to be single-column by default, 2-column at `md` (768px+):

```
<div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4">
```

One line change. All badges, names, descriptions, selection behavior, and close button remain untouched.

### File: `src/components/editor/TemplateSelector.tsx` (line 87)
- Change `grid-cols-2` to `grid-cols-1 md:grid-cols-2`

---

## IMPROVEMENT 2: Suppress Internal Referrer URLs

**Current state** (`src/components/portfolio/VisitorsPanel.tsx`, lines 85-96):
The `parseReferrer` function parses raw referrer URLs. When the referrer contains `lovableproject.com` or `lovable.app` (internal staging/preview domains), it falls through to the `try` block and displays the raw hostname to users.

**Fix**: Add a check after the `null` guard to detect internal domains and treat them as "Direct" visits:

```tsx
if (/lovableproject\.com|lovable\.app|lovable\.dev/i.test(referrer)) {
  return { label: 'Direct', host: '', color: 'text-muted-foreground', dotColor: 'bg-muted-foreground' };
}
```

Insert this line at line 87, right after the `null` check and before the LinkedIn check. This only affects display -- raw data in the database is untouched.

### File: `src/components/portfolio/VisitorsPanel.tsx` (line 87)
- Add internal domain suppression before other referrer checks

---

## Summary

| File | Change |
|---|---|
| `src/components/editor/TemplateSelector.tsx` | Line 87: `grid-cols-2` to `grid-cols-1 md:grid-cols-2` |
| `src/components/portfolio/VisitorsPanel.tsx` | Line 87: Add internal domain check returning "Direct" |

No backend, routing, database, or dependency changes.

