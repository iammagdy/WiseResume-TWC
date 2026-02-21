
# Page-Specific Skeletons Implementation

## Problem

Many routes use mismatched or generic skeleton fallbacks during lazy-load. For example, `/applications` uses `DashboardSkeleton` instead of the already-defined `ApplicationsSkeleton`, and `/ai-studio` uses `DashboardSkeleton` instead of `AIStudioSkeleton`. Several pages like Templates, Cover Letters, Notifications, and Portfolio Editor have no dedicated skeleton at all, leading to jarring layout shifts when loading.

## What Changes

### Part 1: Fix Mismatched Skeleton Assignments in App.tsx

Three page-specific skeletons already exist but are not wired up:

| Route | Current Fallback | Correct Fallback |
|-------|-----------------|-----------------|
| `/applications` | `DashboardSkeleton` | `ApplicationsSkeleton` |
| `/profile` | `SettingsSkeleton` | `ProfilePageSkeleton` |
| `/ai-studio` | `DashboardSkeleton` | `AIStudioSkeleton` |

### Part 2: Create 7 New Page-Specific Skeletons

Add to `src/components/layout/PageSkeletons.tsx`:

- **TemplatesPageSkeleton** -- back button + title header, filter chips row, 2-column grid of template thumbnail placeholders
- **CoverLettersSkeleton** -- back button + title + plus icon header, search bar, 3 card placeholders
- **ResignationLettersSkeleton** -- same structure as CoverLettersSkeleton (back + title + plus, search, 3 cards)
- **NotificationsSkeleton** -- back + title header, 4 filter tab pills, 4 notification row placeholders
- **PortfolioEditorSkeleton** -- back + title + publish button header, status toggle row, 3 collapsible section placeholders
- **OnboardingSkeleton** -- centered card with icon, title, subtitle, 3 option card placeholders, and a bottom button
- **GuidesExamplesSkeleton** -- back + title header, search bar, category chips, 3-4 card placeholders (shared for both Guides and Examples pages)

### Part 3: Wire New Skeletons in App.tsx

| Route | New Fallback |
|-------|-------------|
| `/templates` | `TemplatesPageSkeleton` |
| `/cover-letters` | `CoverLettersSkeleton` |
| `/resignation-letters` | `ResignationLettersSkeleton` |
| `/notifications` | `NotificationsSkeleton` |
| `/portfolio` | `PortfolioEditorSkeleton` |
| `/onboarding` | `OnboardingSkeleton` |
| `/examples` | `GuidesExamplesSkeleton` |
| `/guides` | `GuidesExamplesSkeleton` |

---

## Technical Details

### Files Modified

1. **`src/components/layout/PageSkeletons.tsx`** -- Add 7 new exported skeleton components (each ~20-30 lines of simple `animate-pulse` div structures matching each page's actual layout)

2. **`src/App.tsx`** -- Update import list to include `ApplicationsSkeleton`, `AIStudioSkeleton`, `ProfilePageSkeleton`, and the 7 new skeletons. Update 10 `<Route>` elements to use the correct fallback.

### No Other Files Changed

All skeletons are pure presentational components (no data fetching, no hooks). No new dependencies needed.

### Skeleton Design Principles

- Each skeleton mirrors the target page's header (back button position, title, action buttons)
- Uses `animate-pulse` with `bg-muted` blocks matching the page's content zones
- Respects `pt-safe` for pages with safe-area headers
- Matches `rounded-2xl`, `rounded-xl`, `rounded-full` patterns from the actual UI
- Mobile-first at 375px breakpoint per project guidelines
