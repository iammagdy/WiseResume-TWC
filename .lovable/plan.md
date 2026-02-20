

# Design Panel Preview + Portfolio Dot Tooltip

## IMPROVEMENT 1: Show Real Resume Data in Design Panel Preview

The `CustomizeSheet` component currently hardcodes "John Doe", "Software Engineer", and skills. It needs to accept the current resume data and display the user's actual name, title, and skills.

### File: `src/components/editor/CustomizeSheet.tsx`

**Add a new optional prop** for resume data:

```tsx
interface CustomizeSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customization?: TemplateCustomization;
  onApply: (customization: TemplateCustomization) => void;
  resumeData?: { name: string; subtitle: string; skills: string[] };
}
```

**Replace the hardcoded preview content** (lines 72-93) with computed values:

- `name`: use `resumeData?.name || 'John Doe'`
- `subtitle`: use `resumeData?.subtitle || 'Software Engineer - San Francisco, CA'`
- `skills`: use `resumeData?.skills?.slice(0, 3)` or fall back to `['React', 'TypeScript', 'Node.js']`

No loading spinner needed -- the fallback is the existing placeholder.

### File: `src/pages/EditorPage.tsx` (line 1248)

**Compute preview data from the store** and pass it to `CustomizeSheet`:

```tsx
const designPreview = useMemo(() => {
  if (!currentResume) return undefined;
  const name = currentResume.contactInfo?.fullName || '';
  const latestJob = currentResume.experience?.[0];
  const subtitle = latestJob
    ? `${latestJob.position} - ${latestJob.company}`
    : currentResume.contactInfo?.location || '';
  const skills = currentResume.skills?.slice(0, 3) || [];
  return name ? { name, subtitle, skills } : undefined;
}, [currentResume]);
```

Then pass `resumeData={designPreview}` to `<CustomizeSheet>`.

---

## IMPROVEMENT 2: Add Tap Tooltip to Accent Color Dot on Customization Section

The "dot" on the Customization section header (line 789 of `PortfolioEditorPage.tsx`) is the accent color swatch preview -- a small colored circle showing the user's current accent color. It is not a warning. Users need a tooltip explaining this.

### File: `src/pages/PortfolioEditorPage.tsx` (line 789)

**Wrap the dot in a Popover** (tap-to-open, dismiss on outside tap -- mobile-friendly):

Replace:
```tsx
hint={<span className="inline-block w-4 h-4 rounded-full border border-border" style={{ background: portfolioAccentColor }} />}
```

With a Popover that wraps the dot:
```tsx
hint={
  <Popover>
    <PopoverTrigger asChild>
      <span
        className="inline-block w-4 h-4 rounded-full border border-border cursor-pointer"
        style={{ background: portfolioAccentColor }}
        onClick={(e) => e.stopPropagation()}
      />
    </PopoverTrigger>
    <PopoverContent side="top" className="w-auto px-3 py-1.5 text-xs">
      Your accent color
    </PopoverContent>
  </Popover>
}
```

The `onClick stopPropagation` prevents the tap from toggling the CollapsibleCard open/closed. The Popover uses Radix which auto-dismisses on outside tap -- perfect for mobile.

Import `Popover, PopoverTrigger, PopoverContent` from `@/components/ui/popover` (check if already imported).

---

## Summary

| File | Change |
|---|---|
| `src/components/editor/CustomizeSheet.tsx` | Add `resumeData` prop, use real name/subtitle/skills with fallback |
| `src/pages/EditorPage.tsx` | Compute `designPreview` from store, pass to `CustomizeSheet` |
| `src/pages/PortfolioEditorPage.tsx` | Wrap accent dot in `Popover` with "Your accent color" tooltip |

No backend, database, or dependency changes.
