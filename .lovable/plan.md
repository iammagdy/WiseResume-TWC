

# UX Improvements: Skills Toggle + Score Tips Deep Links

## IMPROVEMENT 1: Skills "Show More/Less" — Lower Default from 20 to 7

**Current state** (lines 690-713): The skills list already has a working show/hide toggle with `showAllSkills` state, but the default collapsed view shows 20 items (`.slice(0, showAllSkills ? 999 : 20)`), which is too many on mobile. The toggle button only appears when there are more than 20 skills.

**Fix**: Change the default collapsed count from 20 to 7, and update the toggle threshold from 20 to 7.

### File: `src/pages/PortfolioEditorPage.tsx`

**Line 690** — Change slice limit:
```
sortedSkillScores.slice(0, showAllSkills ? 999 : 20)
```
becomes:
```
sortedSkillScores.slice(0, showAllSkills ? 999 : 7)
```

**Line 709** — Change threshold for showing the toggle button:
```
{sortedSkillScores.length > 20 && (
```
becomes:
```
{sortedSkillScores.length > 7 && (
```

No other changes needed -- the toggle button text and `showAllSkills` state already work correctly.

---

## IMPROVEMENT 2: Make "Improve Your Score" Tips Tappable with Deep Links

**Current state** (lines 637-643): Tips render as plain `<p>` tags with a dot bullet. Each tip has a `.tip` string property.

**Fix**: Replace the `<p>` with a `<button>` that, when tapped, opens the target CollapsibleCard section and scrolls to it. Map each tip string to a section ID:

| Tip text (partial match) | Target section ID | Action |
|---|---|---|
| "Write a bio" | `bio` | Open + scroll |
| "social link or contact email" | `social` | Open + scroll (also set `showAllSections=true` since social is conditional) |
| "availability headline" | `availability` | Open + scroll (also set `showAllSections=true` since availability is conditional) |
| "profile photo" | navigate to `/settings` | Router navigate |
| "portfolio username" | `identity` | Open + scroll |
| "custom page title" or "meta description" | `seo` (or equivalent section) | Open + scroll |
| "work experience" or "skills" | navigate to `/editor` | Router navigate |
| "Publish your portfolio" | Trigger save with `portfolioEnabled: true` or scroll to publish button |

### File: `src/pages/PortfolioEditorPage.tsx`

**Lines 637-643** — Replace the tip rendering block:

```tsx
<div className="space-y-1">
  {strengthMissing.map((m, i) => {
    const handleTipTap = () => {
      haptics.light();
      // Map tip to section
      const tip = m.tip.toLowerCase();
      if (tip.includes('bio')) {
        setOpenSections(prev => new Set(prev).add('bio'));
        setTimeout(() => document.getElementById('section-bio')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 150);
      } else if (tip.includes('social link') || tip.includes('contact email')) {
        setShowAllSections(true);
        setOpenSections(prev => new Set(prev).add('social'));
        setTimeout(() => document.getElementById('section-social')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 150);
      } else if (tip.includes('availability')) {
        setShowAllSections(true);
        setOpenSections(prev => new Set(prev).add('availability'));
        setTimeout(() => document.getElementById('section-availability')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 150);
      } else if (tip.includes('username')) {
        setOpenSections(prev => new Set(prev).add('identity'));
        setTimeout(() => document.getElementById('section-identity')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 150);
      } else if (tip.includes('page title') || tip.includes('meta description')) {
        setOpenSections(prev => new Set(prev).add('seo'));
        setTimeout(() => document.getElementById('section-seo')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 150);
      } else {
        navigate('/editor');
      }
    };
    return (
      <button key={i} onClick={handleTipTap} className="w-full flex items-center gap-1.5 text-xs text-muted-foreground py-1.5 rounded-lg hover:bg-muted/30 active:scale-[0.98] transition-all touch-manipulation text-left px-1">
        <span className="text-primary shrink-0">·</span>
        <span className="flex-1">{m.tip}</span>
        <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0" />
      </button>
    );
  })}
</div>
```

Additionally, each `CollapsibleCard` needs an `id` attribute on its wrapper div so `scrollIntoView` can target it. Add `id={`section-${id}`}` to the outer div in the `CollapsibleCard` component (line 154):

```tsx
<div id={`section-${id}`} className="glass-elevated rounded-2xl overflow-hidden">
```

---

## Summary

| File | Changes |
|---|---|
| `src/pages/PortfolioEditorPage.tsx` | Line 154: add `id` to CollapsibleCard wrapper |
| `src/pages/PortfolioEditorPage.tsx` | Line 690: change slice from 20 to 7 |
| `src/pages/PortfolioEditorPage.tsx` | Line 709: change threshold from 20 to 7 |
| `src/pages/PortfolioEditorPage.tsx` | Lines 637-643: replace tip `<p>` with tappable `<button>` rows with deep-link scroll logic |

No backend, routing, database, or dependency changes.

