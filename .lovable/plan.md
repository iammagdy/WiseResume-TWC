

## Fix: Theme Preference Not Persisting Across App Restarts

### Problem
The theme (light/dark/system) is saved to `localStorage` correctly, but it's only *read and applied* when the `ThemeToggle` component mounts inside the Settings page. On app startup, no code runs to restore the saved theme, so the app always starts in dark mode. Visiting Settings triggers the `ThemeToggle` to mount, which reads `localStorage` and applies the theme -- explaining why it "fixes itself" when you open Settings.

### Solution
Apply the saved theme at two levels to eliminate any flash of wrong theme:

**1. `index.html` -- Inline blocking script (prevents flash)**
Add a tiny inline `<script>` in the `<head>` that runs before React loads. It reads `localStorage.getItem('theme')`, resolves "system" to the actual preference, and sets the correct class (`light` or `dark`) on `<html>`. This ensures the very first paint uses the correct theme.

Also update the inline loading spinner to use the correct background color based on the theme.

**2. `src/App.tsx` -- Early `useEffect` in `AppRoutes`**
Add a one-time `useEffect` at the top of `AppRoutes` that reads `localStorage.getItem('theme')` and applies the correct class to `document.documentElement`. This acts as a safety net for any edge cases where the inline script might not cover (e.g., dynamic theme changes from other tabs).

### Files to Change

| File | Change |
|------|--------|
| `index.html` | Add inline blocking script in `<head>` to apply saved theme before first paint |
| `src/App.tsx` | Add early theme restoration `useEffect` in `AppRoutes` component |

### Technical Details

**Inline script in `index.html` `<head>`:**
```javascript
(function() {
  var t = localStorage.getItem('theme') || 'dark';
  var resolved = t === 'system'
    ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : t;
  document.documentElement.classList.add(resolved);
})();
```

**useEffect in `AppRoutes`:**
```typescript
useEffect(() => {
  const saved = localStorage.getItem('theme') as 'light' | 'dark' | 'system' | null;
  const theme = saved || 'dark';
  const resolved = theme === 'system'
    ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : theme;
  const root = document.documentElement;
  root.classList.remove('light', 'dark');
  root.classList.add(resolved);
}, []);
```

This two-layer approach ensures zero flash of wrong theme on startup and works correctly for light, dark, and system modes.

