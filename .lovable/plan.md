
# Add Settings Tab to Bottom Navigation

## Overview

Add a fourth tab (Settings) to the bottom navigation bar and create a dedicated Settings page where users can manage their preferences and account details. This provides a centralized location for all user settings, following the native mobile app pattern.

---

## Current State

The `BottomTabBar` component already imports the `Settings` icon from lucide-react but doesn't use it. Currently there are 3 tabs:
- Home (Dashboard)
- Editor
- New (Upload)

---

## Implementation Strategy

1. Add a Settings tab to `BottomTabBar`
2. Create a new `SettingsPage` component
3. Add the route to `App.tsx`
4. Design a mobile-friendly settings interface with:
   - User profile section (email, avatar)
   - Theme preferences
   - Account actions (sign out, reset onboarding)

---

## File Changes

### 1. Update `src/components/layout/BottomTabBar.tsx`

Add Settings as the fourth tab:

```typescript
const tabs: TabItem[] = [
  { 
    path: '/dashboard', 
    icon: Home, 
    label: 'Home',
    matchPaths: ['/dashboard']
  },
  { 
    path: '/editor', 
    icon: FileText, 
    label: 'Editor',
    matchPaths: ['/editor', '/preview']
  },
  { 
    path: '/upload', 
    icon: Sparkles, 
    label: 'New',
    matchPaths: ['/upload']
  },
  { 
    path: '/settings',   // NEW
    icon: Settings, 
    label: 'Settings',
    matchPaths: ['/settings']
  },
];
```

### 2. Create `src/pages/SettingsPage.tsx`

A dedicated settings page with:

**Sections:**
- **Profile Card**: User email and avatar (from auth)
- **Appearance**: Theme toggle using the existing `ThemeToggle` component
- **Account**: Sign out button, reset onboarding option
- **About**: App version, help links

**Design:**
- Uses `MobileLayout` with `showBottomNav`
- Grouped settings with section headers
- Touch-friendly buttons and toggles
- Consistent with app's mobile-first design language

```text
Layout Preview:
+----------------------------------+
|         Settings                 |  <- Header
+----------------------------------+
|  [Avatar]  user@email.com        |  <- Profile card
+----------------------------------+
|  APPEARANCE                      |
|  [Light] [Dark] [System]         |  <- ThemeToggle
+----------------------------------+
|  ACCOUNT                         |
|  > Reset Onboarding              |
|  > Sign Out                      |
+----------------------------------+
|  ABOUT                           |
|  WiseResume v1.0                 |
+----------------------------------+
|  [Home] [Editor] [New] [Settings]|
+----------------------------------+
```

### 3. Update `src/App.tsx`

Add the settings route:

```typescript
import SettingsPage from "./pages/SettingsPage";

// In Routes:
<Route path="/settings" element={<SettingsPage />} />
```

### 4. Update `src/pages/DashboardPage.tsx`

Remove the Sign Out button from the header since it's now in Settings:
- Remove the `LogOut` import
- Remove the Sign Out button from the header
- Keep only the `ThemeDropdown` in the header (for quick access)

---

## SettingsPage Component Structure

```typescript
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, LogOut, RotateCcw, Info } from 'lucide-react';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { ThemeToggle } from '@/components/settings/ThemeToggle';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/useAuth';
import { haptics } from '@/lib/haptics';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function SettingsPage() {
  const navigate = useNavigate();
  const { user, loading, signOut } = useAuth();

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [loading, user, navigate]);

  const handleSignOut = async () => {
    haptics.medium();
    await signOut();
    navigate('/');
  };

  const handleResetOnboarding = async () => {
    if (user) {
      await supabase
        .from('profiles')
        .update({ onboarding_completed: false })
        .eq('user_id', user.id);
      haptics.success();
      toast.success('Onboarding reset. Refresh to see it again.');
    }
  };

  // Get user initials for avatar fallback
  const getInitials = () => {
    if (user?.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return 'U';
  };

  if (loading) {
    return <MobileLayout showBottomNav>Loading...</MobileLayout>;
  }

  return (
    <MobileLayout showBottomNav>
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="pt-safe pt-4 pb-3 px-4 border-b border-border">
          <h1 className="text-xl font-bold">Settings</h1>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
          {/* Profile Section */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border"
          >
            <Avatar className="h-14 w-14">
              <AvatarImage src={user?.user_metadata?.avatar_url} />
              <AvatarFallback className="bg-primary text-primary-foreground">
                {getInitials()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{user?.email}</p>
              <p className="text-sm text-muted-foreground">Account</p>
            </div>
          </motion.div>

          {/* Appearance Section */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
          >
            <h2 className="text-sm font-medium text-muted-foreground mb-3 px-1">
              APPEARANCE
            </h2>
            <div className="p-4 rounded-xl bg-card border border-border">
              <ThemeToggle className="w-full justify-center" />
            </div>
          </motion.div>

          {/* Account Section */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <h2 className="text-sm font-medium text-muted-foreground mb-3 px-1">
              ACCOUNT
            </h2>
            <div className="rounded-xl bg-card border border-border overflow-hidden">
              <Button
                variant="ghost"
                className="w-full justify-start h-12 px-4 rounded-none"
                onClick={handleResetOnboarding}
              >
                <RotateCcw className="w-4 h-4 mr-3" />
                Reset Onboarding
              </Button>
              <Separator />
              <Button
                variant="ghost"
                className="w-full justify-start h-12 px-4 rounded-none text-destructive hover:text-destructive"
                onClick={handleSignOut}
              >
                <LogOut className="w-4 h-4 mr-3" />
                Sign Out
              </Button>
            </div>
          </motion.div>

          {/* About Section */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <h2 className="text-sm font-medium text-muted-foreground mb-3 px-1">
              ABOUT
            </h2>
            <div className="p-4 rounded-xl bg-card border border-border">
              <div className="flex items-center gap-3">
                <Info className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  WiseResume v1.0.0
                </span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </MobileLayout>
  );
}
```

---

## Files Summary

| File | Change Type | Description |
|------|-------------|-------------|
| `src/components/layout/BottomTabBar.tsx` | UPDATE | Add Settings tab to navigation |
| `src/pages/SettingsPage.tsx` | NEW | Create settings page with profile, theme, and account sections |
| `src/App.tsx` | UPDATE | Add /settings route |
| `src/pages/DashboardPage.tsx` | UPDATE | Remove Sign Out button from header (moved to Settings) |

---

## User Experience

### Navigation
- 4 tabs: Home, Editor, New, Settings
- Settings icon appears as the rightmost tab
- Active state indicator works consistently with other tabs

### Settings Page Features
1. **Profile Card**: Shows user email with avatar (or initial fallback)
2. **Theme Toggle**: Full `ThemeToggle` component with Light/Dark/System options
3. **Reset Onboarding**: Allows users to replay the welcome carousel
4. **Sign Out**: Clear account action with destructive styling
5. **About**: App version information

### Animations
- Staggered entrance animations for each section
- Consistent with app's motion design language
- Haptic feedback on all interactive elements

---

## Design Considerations

### Why move Sign Out to Settings?
- Cleaner dashboard header
- Groups all account-related actions together
- Follows iOS/Android native app patterns
- Less visual clutter on main screen

### Keep ThemeDropdown in Dashboard header?
- Yes - provides quick access for frequent theme switchers
- Settings page has the full ThemeToggle for detailed selection
- Redundancy is acceptable for convenience
