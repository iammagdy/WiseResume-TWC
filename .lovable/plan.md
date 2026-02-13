

## Settings Page Visual Polish: Dividers, Spacing, and Alternating Backgrounds

### Overview
Refine the Settings page layout with subtler section dividers, consistent 32px vertical spacing, and alternating section tints to improve visual rhythm and scannability.

### Changes

#### 1. Replace Heavy Separators with Subtle Dividers (`src/pages/SettingsPage.tsx`)

The current `<Separator />` components between major sections are full-opacity `bg-border` lines. Replace all inter-section `<Separator />` dividers (lines 257, 281, 347, 389, 469, 498) with a styled variant:

```tsx
<Separator className="opacity-10" />
```

This keeps the 1px height but drops to 10% opacity for a much subtler visual break. The intra-card separators (`<Separator className="bg-border/30" />`) remain unchanged.

#### 2. Verify Vertical Spacing (already correct)

The container already uses `space-y-8` (32px) on line 210, which matches the requested 32px spacing. No change needed here.

#### 3. Add Alternating Section Backgrounds (`src/index.css` + `src/pages/SettingsPage.tsx`)

**New CSS utility** in `src/index.css`:
```css
.glass-surface-alt {
  background: hsl(var(--card) / 0.3);
  border-radius: 1rem;
  padding: 1rem;
  margin-left: -1rem;
  margin-right: -1rem;
  padding-left: 1rem;
  padding-right: 1rem;
}
```

Apply `glass-surface-alt` to alternating section wrappers (sections 2, 4, 6, 8) in `SettingsPage.tsx`. These are the even-numbered sections:

- Section 2 (Appearance) -- gets `glass-surface-alt`
- Section 3 (AI & Voice) -- no change
- Section 4 (Editor & Export) -- gets `glass-surface-alt`
- Section 5 (Notifications) -- no change
- Section 6 (Privacy & Security) -- gets `glass-surface-alt`
- Section 7 (Account) -- no change
- Section 8 (About & Help) -- gets `glass-surface-alt`

Each alternating section `<div>` wrapping the header + card gets the class added:
```tsx
<div className="glass-surface-alt">
  <h2>...</h2>
  <p>...</p>
  <div className="rounded-2xl glass-elevated ...">...</div>
</div>
```

### Summary of File Changes

| File | Change |
|------|--------|
| `src/pages/SettingsPage.tsx` | Replace 6 inter-section `<Separator />` with `<Separator className="opacity-10" />`; add `glass-surface-alt` class to alternating sections (2, 4, 6, 8) |
| `src/index.css` | Add `.glass-surface-alt` utility class |

