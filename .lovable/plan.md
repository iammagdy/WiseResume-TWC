
# Add Dark/Light Theme Toggle to Dashboard Header

## Overview

Integrate a theme toggle into the dashboard header, allowing users to switch between light, dark, and system themes. The existing `ThemeToggle` component is already functional - we just need to create a compact header-friendly version and integrate it.

---

## Design Approach

The current `ThemeToggle` component is a segmented button bar that works well in settings pages but is too large for a header. We'll create a compact dropdown variant that:

1. Shows a single icon button (Sun/Moon based on current theme)
2. Opens a dropdown menu with all three options
3. Includes haptic feedback and smooth animations

---

## File Changes

### 1. Create Compact Theme Dropdown (`src/components/settings/ThemeDropdown.tsx`)

A header-friendly version that uses a dropdown menu:

```typescript
// Shows icon button that opens dropdown with Light/Dark/System options
// Uses current theme to determine which icon to show
// Includes haptic feedback on selection
```

**Component Features:**
- Single icon button (Sun for light, Moon for dark, Monitor for system)
- Dropdown with all three options and checkmarks for active
- Smooth icon rotation animation on theme change
- Uses existing localStorage persistence logic

### 2. Update Dashboard Header (`src/pages/DashboardPage.tsx`)

Add the theme toggle to the header, between the logo and Sign Out button:

```diff
<header className="pt-safe pt-4 pb-3 px-4 flex items-center justify-between border-b border-border">
  <AppLogo size="sm" />
+ <div className="flex items-center gap-2">
+   <ThemeDropdown />
    <Button variant="ghost" size="sm" onClick={handleSignOut}>
      <LogOut className="w-4 h-4 mr-2" />
      Sign Out
    </Button>
+ </div>
</header>
```

---

## ThemeDropdown Component Design

```text
┌──────────────────┐
│  [🌙] ▾         │  ← Icon button with dropdown indicator
└──────────────────┘
        │
        ▼
┌──────────────────┐
│ ☀️ Light      ✓ │  ← Dropdown menu
│ 🌙 Dark         │
│ 🖥️ System       │
└──────────────────┘
```

**Behavior:**
- Icon reflects current effective theme (not system preference)
- Checkmark shows which option is selected
- Haptic feedback on selection
- Dropdown closes after selection

---

## Technical Implementation

### ThemeDropdown.tsx

```typescript
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Moon, Sun, Monitor, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { haptics } from '@/lib/haptics';

type Theme = 'light' | 'dark' | 'system';

export function ThemeDropdown() {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === 'undefined') return 'dark';
    return (localStorage.getItem('theme') as Theme) || 'dark';
  });

  // Apply theme effect (same as ThemeToggle)
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark' : 'light';
      root.classList.remove('light', 'dark');
      root.classList.add(systemTheme);
    } else {
      root.classList.remove('light', 'dark');
      root.classList.add(theme);
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const handleChange = (newTheme: Theme) => {
    haptics.selection();
    setTheme(newTheme);
  };

  // Determine which icon to show based on effective theme
  const getEffectiveTheme = () => {
    if (theme === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return theme;
  };

  const ThemeIcon = getEffectiveTheme() === 'dark' ? Moon : Sun;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9">
          <ThemeIcon className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleChange('light')}>
          <Sun className="mr-2 h-4 w-4" />
          Light
          {theme === 'light' && <Check className="ml-auto h-4 w-4" />}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleChange('dark')}>
          <Moon className="mr-2 h-4 w-4" />
          Dark
          {theme === 'dark' && <Check className="ml-auto h-4 w-4" />}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleChange('system')}>
          <Monitor className="mr-2 h-4 w-4" />
          System
          {theme === 'system' && <Check className="ml-auto h-4 w-4" />}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

---

## Files Summary

| File | Change Type | Description |
|------|-------------|-------------|
| `src/components/settings/ThemeDropdown.tsx` | NEW | Compact dropdown theme toggle for headers |
| `src/pages/DashboardPage.tsx` | UPDATE | Add ThemeDropdown to header |

---

## User Experience

1. User sees a moon/sun icon in the dashboard header
2. Tapping opens a dropdown with Light, Dark, System options
3. Current selection shows a checkmark
4. Selecting an option immediately applies the theme with haptic feedback
5. Theme preference persists across sessions via localStorage

---

## Light Theme Preview

The light theme CSS variables are already defined in `index.css`:
- Clean white background with subtle gray accents
- Purple primary color (slightly muted for readability)
- Proper contrast ratios for accessibility
- Adapted gradient colors for light mode

---

## Future Enhancements (Not in Scope)

- Add theme toggle to EditorPage header for consistent access
- Animate the icon change (sun spinning to moon)
- Sync theme preference to user profile in database
