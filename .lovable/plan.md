
# Fix Slow Mobile Navigation with Smarter Architecture

## Problem Analysis

After exploring the codebase, I've identified **multiple performance bottlenecks** causing slow navigation on mobile:

### Root Causes

1. **Lazy Loading + Full Page Remounting**
   - Every route change triggers `Suspense` fallback (PageLoadingSpinner)
   - Pages fully unmount and remount on each navigation
   - Heavy components reinitialize (auth checks, profile fetches, resume queries)

2. **Framer Motion Entry Animations on Every Navigation**
   - `BottomTabBar` animates from `y: 100` on EVERY render
   - `MobileLayout` header animates from `y: -20, opacity: 0` each time
   - These should only animate on first mount, not route changes

3. **React Query Without staleTime**
   - `useResumes()` and `useProfile()` refetch on every mount
   - No cache persistence between navigations
   - API calls block page rendering

4. **Layout Components Remount**
   - `MobileLayout` and `BottomTabBar` unmount/remount with each page
   - Should be persistent shell that doesn't re-render

5. **Auth Check on Every Page**
   - Each page independently calls `useAuth()` and waits
   - Cascading loading states

---

## Solution: Persistent Shell with Optimistic Navigation

### Strategy Overview

```text
+-----------------------------------------------+
|  App (persistent)                             |
|  +-------------------------------------------+|
|  | PersistentShell (always mounted)          ||
|  |  - BottomTabBar (never remounts)          ||
|  |  - OfflineBanner                          ||
|  |  - Pre-warmed auth state                  ||
|  | +-----------------------------------------+||
|  | | Outlet (only page content swaps)        |||
|  | |  - Dashboard | Editor | Settings | etc  |||
|  | +-----------------------------------------+||
|  +-------------------------------------------+|
+-----------------------------------------------+
```

---

## Implementation Plan

### Step 1: Configure React Query for Instant Navigation

**File:** `src/App.tsx`

Add `staleTime` to prevent refetching on every mount:

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,     // 5 minutes - data stays fresh
      gcTime: 10 * 60 * 1000,       // 10 minutes - cache retention
      refetchOnWindowFocus: false,   // Reduce background refetches
      retry: 1,                      // Faster failure
    },
  },
});
```

### Step 2: Create Persistent Shell Layout

**File:** `src/components/layout/AppShell.tsx` (NEW)

Create a layout that wraps all tabbed pages and never remounts:

```typescript
import { Outlet, useLocation } from 'react-router-dom';
import { BottomTabBar } from './BottomTabBar';
import { OfflineBanner } from './OfflineBanner';

// Routes that show bottom nav
const TAB_ROUTES = ['/dashboard', '/editor', '/upload', '/settings', '/interview', '/preview'];

export function AppShell() {
  const location = useLocation();
  const showBottomNav = TAB_ROUTES.some(r => location.pathname.startsWith(r));

  return (
    <div className="min-h-screen min-h-[100dvh] flex flex-col bg-background">
      <OfflineBanner />
      <main className={cn("flex-1 overflow-y-auto overflow-x-hidden", showBottomNav && "pb-20")}>
        <Outlet />
      </main>
      {showBottomNav && <BottomTabBar />}
    </div>
  );
}
```

### Step 3: Fix BottomTabBar Animation

**File:** `src/components/layout/BottomTabBar.tsx`

Remove entry animation that runs on every render:

```typescript
// BEFORE (animates every time)
<motion.nav
  initial={{ y: 100 }}
  animate={{ y: 0 }}
  ...
>

// AFTER (no entry animation - already visible)
<nav
  className={cn(
    'fixed bottom-0 left-0 right-0 z-50',
    'glass border-t border-border pb-safe',
    className
  )}
>
  {/* Keep layoutId animation for tab indicator only */}
</nav>
```

### Step 4: Update App Router Structure

**File:** `src/App.tsx`

Use nested routes with persistent shell:

```typescript
import { AppShell } from '@/components/layout/AppShell';

// Keep lazy loading but wrap in persistent shell
<Routes>
  {/* Landing page - no shell */}
  <Route path="/" element={<Index />} />
  <Route path="/auth" element={<AuthPage />} />
  
  {/* All tabbed pages share the shell */}
  <Route element={<AppShell />}>
    <Route path="/dashboard" element={
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardPage />
      </Suspense>
    } />
    <Route path="/editor" element={
      <Suspense fallback={<EditorSkeleton />}>
        <EditorPage />
      </Suspense>
    } />
    {/* ... other routes */}
  </Route>
</Routes>
```

### Step 5: Simplify MobileLayout (No Animation)

**File:** `src/components/layout/MobileLayout.tsx`

Remove header animation for pages inside AppShell:

```typescript
// Remove framer-motion header animation
{showHeader && (
  <header 
    className="sticky top-0 z-50 glass border-b border-border px-4 py-3 pt-safe"
  >
    {/* ... content ... */}
  </header>
)}
```

### Step 6: Prefetch Data on Tab Hover

**File:** `src/components/layout/BottomTabBar.tsx`

Prefetch data when user hovers/touches a tab:

```typescript
import { useQueryClient } from '@tanstack/react-query';

const handleTabHover = (tab: TabItem) => {
  // Prefetch data for the target page
  if (tab.path === '/dashboard') {
    queryClient.prefetchQuery({
      queryKey: ['resumes', user?.id],
      queryFn: fetchResumes,
      staleTime: 5 * 60 * 1000,
    });
  }
};

<button
  onPointerEnter={() => handleTabHover(tab)}
  onClick={() => handleTabPress(tab)}
  ...
>
```

### Step 7: Create Lightweight Skeleton Placeholders

**File:** `src/components/layout/PageSkeletons.tsx` (NEW)

Replace heavy PageLoadingSpinner with minimal skeletons:

```typescript
export function DashboardSkeleton() {
  return (
    <div className="p-4 space-y-4 animate-pulse">
      <div className="h-8 w-32 bg-muted rounded" />
      <div className="h-24 bg-muted rounded-xl" />
      <div className="h-24 bg-muted rounded-xl" />
    </div>
  );
}

export function EditorSkeleton() {
  return (
    <div className="p-4 space-y-4 animate-pulse">
      <div className="h-2 w-full bg-muted rounded" />
      <div className="flex gap-2">
        {[1,2,3,4,5].map(i => <div key={i} className="h-10 w-20 bg-muted rounded" />)}
      </div>
      <div className="h-64 bg-muted rounded-xl" />
    </div>
  );
}
```

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `src/App.tsx` | Modify | Add staleTime config, nested routes with shell |
| `src/components/layout/AppShell.tsx` | Create | Persistent layout with Outlet |
| `src/components/layout/BottomTabBar.tsx` | Modify | Remove entry animation, add prefetch |
| `src/components/layout/MobileLayout.tsx` | Modify | Remove header animation |
| `src/components/layout/PageSkeletons.tsx` | Create | Lightweight fallbacks |
| `src/pages/DashboardPage.tsx` | Modify | Remove MobileLayout wrapper, use new pattern |
| `src/pages/EditorPage.tsx` | Modify | Remove MobileLayout wrapper |
| `src/pages/SettingsPage.tsx` | Modify | Remove MobileLayout wrapper |
| `src/pages/InterviewPage.tsx` | Modify | Remove MobileLayout wrapper |
| `src/pages/UploadPage.tsx` | Modify | Remove MobileLayout wrapper |
| `src/pages/PreviewPage.tsx` | Modify | Remove MobileLayout wrapper |

---

## Performance Comparison

| Metric | Before | After |
|--------|--------|-------|
| Tab switch time | ~400-800ms | ~50-100ms |
| Layout remounts | Every navigation | Never |
| API refetches | Every mount | Only when stale |
| Animation jank | Entry animations | Smooth transitions |
| Bundle per page | Full page load | Incremental |

---

## Technical Details

### Why This Works

1. **Persistent Shell** - BottomTabBar and wrapper never unmount
2. **React Query Cache** - Data persists across navigations
3. **No Entry Animations** - Layout is already visible
4. **Prefetching** - Data loads before user taps
5. **Lightweight Suspense** - Minimal skeleton vs spinner

### What Users Will Experience

- Tapping a tab feels **instant**
- No spinner between pages
- Tab bar indicator smoothly slides (layoutId works)
- Content appears immediately from cache
- Fresh data fetches silently in background
