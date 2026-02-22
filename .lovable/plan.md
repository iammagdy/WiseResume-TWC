

# Fix Theme Persistence - Always Respect User's Dark Mode Choice

## Problem

The app's dark/light theme randomly resets on refresh because theme state is managed independently in 4 different places, each reading localStorage and applying CSS classes on its own schedule. This creates race conditions where one component's effect can override another.

**Duplicated theme management today:**
1. `index.html` inline script (reads localStorage, adds class)
2. `App.tsx` useEffect (reads localStorage, removes + adds class)
3. `ThemeToggle.tsx` local useState + useEffect (reads localStorage, uses classList.replace)
4. `ThemeDropdown.tsx` local useState + useEffect (reads localStorage, uses classList.replace)

When these effects fire in different orders on refresh, the theme can flicker or land on the wrong value.

## Solution

Centralize theme state in the existing Zustand `settingsStore` (which already persists to localStorage) and have a **single** DOM synchronization effect in `App.tsx`. The toggle components become thin UI wrappers that just call `setTheme()` on the store.

## Changes

### 1. Add `theme` to settingsStore
**File:** `src/store/settingsStore.ts`
- Add `theme: 'light' | 'dark' | 'system'` to the store state (default: `'dark'`)
- Add `setTheme(theme)` setter
- The store already persists to localStorage via Zustand's `persist` middleware, so the value survives refreshes

### 2. Single DOM sync in App.tsx
**File:** `src/App.tsx`
- Replace the existing one-shot `useEffect` with a reactive effect that subscribes to `useSettingsStore(s => s.theme)`
- This effect resolves `'system'` to the OS preference, removes both classes, and adds the correct one
- Also listens for `prefers-color-scheme` changes when theme is `'system'`
- Remove the old standalone localStorage-based useEffect

### 3. Simplify ThemeToggle
**File:** `src/components/settings/ThemeToggle.tsx`
- Remove local `useState` for theme and the `useEffect` that manipulates DOM classes
- Read theme from `useSettingsStore(s => s.theme)` and write via `useSettingsStore(s => s.setTheme)`
- The component becomes a pure UI control -- no DOM side effects

### 4. Simplify ThemeDropdown
**File:** `src/components/settings/ThemeDropdown.tsx`
- Same change as ThemeToggle: replace local state with store access
- Remove the `useEffect` that manipulates classList

### 5. Update Sonner Toaster
**File:** `src/components/ui/sonner.tsx`
- Replace the localStorage + storage event listener with `useSettingsStore(s => s.theme)`
- No more manual polling of localStorage

### 6. Keep inline script as-is
**File:** `index.html`
- The inline script in index.html stays unchanged -- it prevents the initial white flash before React hydrates
- It reads from the Zustand persist key (`settings-storage`) or falls back to `'dark'`

## Why This Fixes It

- **Single source of truth:** Zustand store owns the theme value
- **Single DOM effect:** Only `App.tsx` touches `document.documentElement.classList`
- **No race conditions:** Zustand state is synchronous; the reactive effect fires once per change
- **Survives refresh:** Zustand persist middleware saves to localStorage automatically

