
# Enable Bottom Tab Navigation for Native App-Like Navigation

## Overview

Integrate the existing `BottomTabBar` component into the app's main pages to provide persistent, thumb-friendly navigation between Home (Dashboard), Editor, and New (Upload) screens - creating a native mobile app experience.

---

## Current State

The `BottomTabBar` component already exists with:
- Three tabs: Home (dashboard), Editor, New (upload)
- Active state detection with path matching
- Haptic feedback on tab selection
- Animated indicator dot for active tab
- Safe area padding for notched devices

However, it's not currently integrated into any pages.

---

## Integration Strategy

The bottom tab bar should appear on these pages:
- `/dashboard` - Home tab active
- `/editor` - Editor tab active
- `/preview` - Editor tab active (part of editing flow)
- `/upload` - New tab active

Pages where it should NOT appear:
- `/` (Index) - Landing page for unauthenticated users
- `/auth` - Authentication page

---

## Implementation Approach

### Option A: Add to MobileLayout (Recommended)

Update `MobileLayout` to conditionally render `BottomTabBar` based on a prop. This centralizes the logic and ensures consistent padding.

```typescript
// MobileLayout.tsx
interface MobileLayoutProps {
  children: ReactNode;
  showBottomNav?: boolean;  // Already exists!
  // ...other props
}

// When showBottomNav is true:
// 1. Render BottomTabBar at the bottom
// 2. Add pb-20 padding to main content (already done!)
```

### Option B: Add to Individual Pages

Add `BottomTabBar` to each page component individually.

**Recommendation**: Option A is cleaner since `MobileLayout` already has `showBottomNav` prop and applies `pb-20` padding when true.

---

## File Changes

### 1. Update `src/components/layout/MobileLayout.tsx`

Import and render `BottomTabBar` when `showBottomNav` is true:

```typescript
import { BottomTabBar } from './BottomTabBar';

// In the component:
return (
  <div className="min-h-screen min-h-[100dvh] flex flex-col bg-background">
    <OfflineBanner />
    {showHeader && (/* header */)}
    <main className={`flex-1 overflow-y-auto ${showBottomNav ? 'pb-20' : 'pb-safe'}`}>
      {children}
    </main>
    {showBottomNav && <BottomTabBar />}  {/* Add this */}
  </div>
);
```

### 2. Update `src/pages/DashboardPage.tsx`

Enable bottom nav on the dashboard:

```diff
- <MobileLayout>
+ <MobileLayout showBottomNav>
```

### 3. Update `src/pages/EditorPage.tsx`

Enable bottom nav on the editor:

```diff
- <MobileLayout showHeader headerTitle="Edit Resume" onBack={handleBack}>
+ <MobileLayout showHeader headerTitle="Edit Resume" onBack={handleBack} showBottomNav>
```

The editor has a sticky bottom action bar that needs adjustment:
- Change from `sticky bottom-0` to account for tab bar height
- Use `bottom-[64px]` or similar offset

### 4. Update `src/pages/PreviewPage.tsx`

Enable bottom nav on the preview:

```diff
- <MobileLayout showHeader headerTitle="Preview" onBack={() => navigate('/editor')}>
+ <MobileLayout showHeader headerTitle="Preview" onBack={() => navigate('/editor')} showBottomNav>
```

Similar adjustment needed for the sticky bottom actions.

### 5. Update `src/pages/UploadPage.tsx`

Enable bottom nav on the upload page:

```diff
- <MobileLayout showHeader headerTitle="Upload Resume" onBack={() => navigate('/')}>
+ <MobileLayout showHeader headerTitle="Upload Resume" onBack={() => navigate('/')} showBottomNav>
```

---

## Layout Considerations

### Bottom Action Bars

The Editor and Preview pages have sticky bottom action bars. With the tab bar present, these need adjustments:

**Current Editor Page:**
```tsx
<motion.div className="sticky bottom-0 p-4 pb-safe glass ...">
  {/* Preview & Export button */}
</motion.div>
```

**Updated for Tab Bar:**
```tsx
<motion.div className="sticky bottom-20 p-4 glass ...">
  {/* No pb-safe needed since tab bar handles it */}
</motion.div>
```

The `bottom-20` (80px) accounts for the 64px tab bar + some margin.

### Content Padding

`MobileLayout` already handles this:
- When `showBottomNav` is true: `pb-20` padding on main content
- When false: `pb-safe` for device safe area only

---

## Visual Flow

```text
┌──────────────────────────────────┐
│         App Header               │
├──────────────────────────────────┤
│                                  │
│                                  │
│       Page Content               │
│                                  │
│                                  │
├──────────────────────────────────┤
│  [Action Bar if any]             │
├──────────────────────────────────┤
│  🏠 Home    📄 Editor   ✨ New   │
│            ●                     │  ← Active indicator
└──────────────────────────────────┘
```

---

## Navigation Tab Refinements

### Current Tabs
| Tab | Icon | Path | Match Paths |
|-----|------|------|-------------|
| Home | Home | /dashboard | /dashboard |
| Editor | FileText | /editor | /editor, /preview |
| New | Sparkles | /upload | /upload |

### Recommended Enhancement

The "New" tab currently navigates to `/upload`, but the dashboard already has a "New Resume" button that opens a dialog. Consider:

1. **Keep as-is**: Direct to upload page (simple)
2. **Open CreateResumeDialog**: Show the choice between upload/blank (more aligned with existing UX)

**Recommendation**: Keep as-is for v1 - the upload page provides a focused experience for adding new resumes.

---

## Files Summary

| File | Change Type | Description |
|------|-------------|-------------|
| `src/components/layout/MobileLayout.tsx` | UPDATE | Import and render BottomTabBar when showBottomNav=true |
| `src/pages/DashboardPage.tsx` | UPDATE | Add showBottomNav prop to MobileLayout |
| `src/pages/EditorPage.tsx` | UPDATE | Add showBottomNav prop, adjust bottom action bar |
| `src/pages/PreviewPage.tsx` | UPDATE | Add showBottomNav prop, adjust bottom action bar |
| `src/pages/UploadPage.tsx` | UPDATE | Add showBottomNav prop |

---

## User Experience

### Before
- Users navigate via back buttons and explicit navigation actions
- Moving between dashboard, editor, and upload requires multiple taps

### After
- Persistent bottom tab bar on main app screens
- Single-tap navigation to any primary section
- Active tab clearly indicated with primary color + animated dot
- Haptic feedback on tab selection
- Familiar pattern from native iOS/Android apps

---

## Edge Cases

### Editor Without Active Resume
- If user taps Editor tab but no resume is loaded, redirect to dashboard
- This is already handled by the EditorPage itself

### Keyboard Open
- Bottom tab bar remains visible but may be pushed up by keyboard
- Consider hiding during text input (future enhancement)

### Animations
- Tab bar animates in from bottom on mount
- Active indicator animates smoothly between tabs using Framer Motion's layoutId
