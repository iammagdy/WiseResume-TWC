

# Add Profile Editing Feature

## Overview

Add the ability for users to edit their display name and avatar directly from the Settings page. The profile data will be stored in the existing `profiles` table which already has `full_name` and `avatar_url` columns.

---

## Design Approach

Create a bottom sheet that slides up when the user taps on their profile card in the Settings page. This follows the app's mobile-first design pattern and provides a focused editing experience.

**User Flow:**
1. User taps on profile card in Settings
2. Bottom sheet slides up with edit form
3. User can update display name and/or select a new avatar
4. Changes are saved to the database and immediately reflected in the UI

---

## Implementation Strategy

### Avatar Handling

For avatar management, we have two approaches:

**Option A: Avatar URL Input** (Simpler)
- User pastes a URL to their avatar image
- No storage bucket needed
- Works with any image URL (Gravatar, social media, etc.)

**Option B: Avatar Upload** (More Complete)
- Create a storage bucket for avatars
- User uploads image from device
- Image stored in backend storage
- Returns a public URL

**Recommendation:** Start with Option A (URL input) for simplicity, with the ability to add upload later. This avoids the need for storage bucket setup.

---

## Database

The `profiles` table already has the necessary columns:
- `full_name` (text, nullable)
- `avatar_url` (text, nullable)

No database changes required!

---

## File Changes

### 1. Create `src/components/settings/EditProfileSheet.tsx`

A bottom sheet component for editing profile details:

```typescript
interface EditProfileSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: {
    fullName: string | null;
    avatarUrl: string | null;
  };
  userId: string;
  onUpdate: (profile: { fullName: string | null; avatarUrl: string | null }) => void;
}
```

**Features:**
- Display name input field
- Avatar URL input field with preview
- Real-time avatar preview when URL changes
- Save and Cancel buttons
- Loading state during save
- Validation for image URLs

### 2. Create `src/hooks/useProfile.ts`

A custom hook for fetching and updating profile data:

```typescript
export function useProfile(userId: string | undefined) {
  // Fetch profile from database
  // Return profile data, loading state, and update function
}
```

**Features:**
- Fetches profile data for the current user
- Provides an `updateProfile` mutation function
- Handles optimistic updates
- Returns loading and error states

### 3. Update `src/pages/SettingsPage.tsx`

Integrate the profile editing feature:
- Import `EditProfileSheet` and `useProfile` hook
- Fetch profile data on mount
- Display `full_name` if available (instead of just email)
- Make the profile card tappable to open the edit sheet
- Show edit indicator (chevron or pencil icon)
- Refresh profile data after updates

---

## Component Design

### Profile Card (Updated)

```text
┌──────────────────────────────────────────┐
│  [Avatar]   John Doe                     │
│             john@email.com         [>]   │
│             Tap to edit profile          │
└──────────────────────────────────────────┘
```

### Edit Profile Sheet

```text
┌──────────────────────────────────────────┐
│            ━━━━                          │  <- Drag handle
│                                          │
│         [Avatar Preview]                 │
│              64x64                       │
│                                          │
│  Display Name                            │
│  ┌────────────────────────────────────┐  │
│  │ John Doe                           │  │
│  └────────────────────────────────────┘  │
│                                          │
│  Avatar URL (optional)                   │
│  ┌────────────────────────────────────┐  │
│  │ https://example.com/avatar.jpg     │  │
│  └────────────────────────────────────┘  │
│  Paste a link to your profile picture    │
│                                          │
│  ┌─────────────┐  ┌─────────────────────┐│
│  │   Cancel    │  │    Save Changes     ││
│  └─────────────┘  └─────────────────────┘│
└──────────────────────────────────────────┘
```

---

## Technical Implementation

### useProfile Hook

```typescript
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Profile {
  fullName: string | null;
  avatarUrl: string | null;
}

export function useProfile(userId: string | undefined) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const fetchProfile = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('user_id', userId)
        .single();

      if (data) {
        setProfile({
          fullName: data.full_name,
          avatarUrl: data.avatar_url,
        });
      }
      setLoading(false);
    };

    fetchProfile();
  }, [userId]);

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!userId) return;

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: updates.fullName,
        avatar_url: updates.avatarUrl,
      })
      .eq('user_id', userId);

    if (error) {
      toast.error('Failed to update profile');
      throw error;
    }

    setProfile((prev) => prev ? { ...prev, ...updates } : null);
    toast.success('Profile updated successfully');
  };

  return { profile, loading, updateProfile };
}
```

### EditProfileSheet Component

```typescript
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Camera } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { haptics } from '@/lib/haptics';

interface EditProfileSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: {
    fullName: string | null;
    avatarUrl: string | null;
  } | null;
  onSave: (data: { fullName: string | null; avatarUrl: string | null }) => Promise<void>;
}

export function EditProfileSheet({
  open,
  onOpenChange,
  profile,
  onSave,
}: EditProfileSheetProps) {
  const [fullName, setFullName] = useState(profile?.fullName || '');
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatarUrl || '');
  const [isSaving, setIsSaving] = useState(false);

  // Sync form state when profile changes
  useEffect(() => {
    if (profile) {
      setFullName(profile.fullName || '');
      setAvatarUrl(profile.avatarUrl || '');
    }
  }, [profile]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave({
        fullName: fullName.trim() || null,
        avatarUrl: avatarUrl.trim() || null,
      });
      haptics.success();
      onOpenChange(false);
    } catch (error) {
      haptics.error();
    } finally {
      setIsSaving(false);
    }
  };

  const getInitials = () => {
    if (fullName) {
      return fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return 'U';
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-auto max-h-[90vh]">
        <SheetHeader>
          <SheetTitle>Edit Profile</SheetTitle>
        </SheetHeader>

        <div className="space-y-6 py-6">
          {/* Avatar Preview */}
          <div className="flex justify-center">
            <div className="relative">
              <Avatar className="h-20 w-20">
                <AvatarImage src={avatarUrl || undefined} />
                <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-muted flex items-center justify-center border-2 border-background">
                <Camera className="w-3.5 h-3.5 text-muted-foreground" />
              </div>
            </div>
          </div>

          {/* Display Name */}
          <div className="space-y-2">
            <Label htmlFor="fullName">Display Name</Label>
            <Input
              id="fullName"
              placeholder="Enter your name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>

          {/* Avatar URL */}
          <div className="space-y-2">
            <Label htmlFor="avatarUrl">Avatar URL</Label>
            <Input
              id="avatarUrl"
              placeholder="https://example.com/avatar.jpg"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Paste a link to your profile picture (optional)
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 gradient-primary"
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
```

### Updated SettingsPage Integration

Key changes:
1. Import and use `useProfile` hook
2. Add state for edit sheet visibility
3. Make profile card tappable
4. Display full name when available
5. Show chevron icon to indicate tapability
6. Pass profile data and save handler to EditProfileSheet

---

## Files Summary

| File | Change Type | Description |
|------|-------------|-------------|
| `src/hooks/useProfile.ts` | NEW | Hook for fetching and updating profile data |
| `src/components/settings/EditProfileSheet.tsx` | NEW | Bottom sheet for editing profile |
| `src/pages/SettingsPage.tsx` | UPDATE | Integrate profile editing, make card tappable |

---

## User Experience

1. User navigates to Settings tab
2. Profile card shows current avatar and name (or email if no name set)
3. Chevron icon indicates the card is tappable
4. Tapping opens a smooth bottom sheet
5. User can:
   - Update their display name
   - Paste an avatar URL with live preview
6. Save button updates the database
7. Success toast confirms the change
8. Profile card immediately reflects the new data
9. Haptic feedback throughout for native feel

---

## Validation & Edge Cases

- Empty display name: Allowed (will fall back to email display)
- Invalid avatar URL: Shows fallback initials
- Network error: Toast error message, sheet stays open
- Long names: Truncated with ellipsis in display
- No profile record: Auto-created on signup via database trigger

---

## Future Enhancements (Not in Scope)

- Direct avatar upload to storage bucket
- Image cropping/resizing before upload
- Avatar selection from preset options
- Social media avatar import (Google, etc.)

