

## Slim Down Dashboard Header (Mobile)

### Changes

**1. `src/components/brand/AppLogo.tsx`** - Add `hideText` prop

- Add optional `hideText?: boolean` prop
- When `hideText` is true, skip rendering the "WiseResume" `h1` entirely, show only the icon
- Change the flex direction from `flex-col items-center` to just the icon when `hideText` is true

**2. `src/pages/DashboardPage.tsx`** - Simplify header

- Pass `hideText` to `AppLogo` on mobile: `<AppLogo size="sm" showTagline={false} hideText />`
- **Remove** the Explore button entirely from the header (lines 309-325)
- **Remove** the `<ThemeDropdown />` from the header (line 326)
- **Remove** the `Sparkles` import (no longer needed here)
- **Remove** the `ThemeDropdown` import
- Header becomes: `[AppIcon] ---- [Avatar]`
- Reduce header padding from `pt-4 pb-3` to `pt-3 pb-2` for additional space savings

**3. `src/pages/SettingsPage.tsx`** - Ensure theme toggle is accessible there

- The Settings page already has a theme/appearance section, so no changes needed -- the `ThemeDropdown` removal from the dashboard header is safe

**4. Landing page Explore access** - The Explore/landing page is already accessible via the Home tab in the bottom navigation bar (it navigates to `/`), so removing the Explore button from the dashboard header loses no functionality.

### Result

```text
Before (~56px):
[Icon+WiseResume]  [Explore] [Theme] [Avatar]

After (~40px):
[Icon]                              [Avatar]
```

Saves ~16px from reduced padding + removing the text, and declutters the header significantly on mobile.

### Files Modified
- `src/components/brand/AppLogo.tsx` -- add `hideText` prop
- `src/pages/DashboardPage.tsx` -- strip header to logo icon + avatar only
