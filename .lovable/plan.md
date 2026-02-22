
# Add Theme Toggle to Spinner Preview

## What
Add the existing `ThemeDropdown` component (a small icon button with a dropdown) to the `AuthCallbackPage` so you can toggle between light and dark mode while viewing the futuristic spinner.

## Change

### `src/pages/AuthCallbackPage.tsx`
- Import `ThemeDropdown` from `@/components/settings/ThemeDropdown`
- Wrap the return in a fragment containing:
  - A fixed-position `ThemeDropdown` button in the top-right corner (z-50, safe-area padded)
  - The existing `<PageLoadingSpinner />`

```tsx
return (
  <>
    <div className="fixed top-4 right-4 z-50">
      <ThemeDropdown />
    </div>
    <PageLoadingSpinner />
  </>
);
```

This uses the already-built `ThemeDropdown` component (sun/moon icon button with light/dark/system options) so no new components are needed. The toggle floats above the spinner for easy testing.
