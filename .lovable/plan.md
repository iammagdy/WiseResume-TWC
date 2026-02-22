
# Add Portfolio Editor Loading Skeleton

## Problem
The Portfolio Editor page renders immediately with empty/default state while profile data is fetching, causing a flash of empty content before the real data populates. There's no loading skeleton despite the page requiring async profile and resume data.

## Solution
Add a loading skeleton that matches the new tabbed layout structure (StatusBar, LivePreview, Tabs, SaveBar) and show it while profile data is being fetched.

## Changes

### 1. Add `PortfolioEditorSkeleton` to `src/components/layout/PageSkeletons.tsx`
- Add a new exported skeleton matching the portfolio editor layout:
  - Status bar placeholder (thin strip with badge + URL placeholders)
  - Live preview card placeholder (avatar + name + title)
  - Tab row placeholder (3 pill buttons)
  - Content area placeholder (3 input-like blocks)
  - Sticky save bar placeholder at the bottom

### 2. Modify `src/pages/PortfolioEditorPage.tsx`
- Destructure `loading` from `useProfile()` (it's already returned as `loading` from the hook)
- Import `PortfolioEditorSkeleton` from `PageSkeletons`
- Add early return: `if (loading) return <PortfolioEditorSkeleton />`
- Place this check after all hooks but before the main render

This ensures no blank/empty content flash while profile data loads, and the skeleton visually matches the final layout so the transition feels seamless.
