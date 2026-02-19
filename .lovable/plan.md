

# Fix Touch Scroll Issues Across All App Screens

## Problem

The AppShell provides the primary scroll container (`overflow-y-auto` on line 50). Several pages **also** add `overflow-y-auto` on their content divs, but their root container does **not** have `overflow-hidden`. This creates two competing scroll areas that fight for touch events on mobile, causing:

- Scroll getting "stuck" or unresponsive
- Unexpected bounce/rubber-banding between containers
- Content appearing un-scrollable even though it overflows

The fix is simple: add `overflow-hidden` to the root container of each affected page so the AppShell scroll is blocked and only the page's own scroll container handles touch events.

## Pages That Need Fixing (8 total)

| Page | Root Line | What Changes |
|---|---|---|
| **SettingsPage** | Line 309 | Add `overflow-hidden` to root `div` |
| **CoverLetterEditPage** | Line 139 | Add `overflow-hidden` to root `motion.div` |
| **CoverLetterNewPage** | Line 140 | Add `overflow-hidden` to root `motion.div` |
| **ResignationLetterEditPage** | Line 193 | Add `overflow-hidden` to root `motion.div` |
| **ResignationLetterNewPage** | Line 184 | Add `overflow-hidden` to root `motion.div` |
| **TemplatesPage** | Line 45 | Add `overflow-hidden` to root `div` |
| **GuidePage** | Line 57 | Add `overflow-hidden` to root `div` |
| **GuidesPage** | Line 44 | Add `overflow-hidden` to root `div` |

## Pages Already Correct (no changes needed)

- **DashboardPage** -- no inner `overflow-y-auto`, delegates to AppShell scroll
- **ApplicationsPage** -- uses PullToRefresh, no competing scroll
- **EditorPage** -- root has `overflow-hidden`
- **ProfilePage** -- root has `overflow-hidden`
- **PortfolioEditorPage** -- root has `overflow-hidden`
- **UploadPage** -- root has `overflow-hidden`
- **AIStudioPage** -- root IS the scroll container (no nesting conflict)
- **InterviewPage** -- multiple phases, each handled correctly

## What Changes Per File

Each fix is a single class addition. No logic, props, hooks, or Supabase calls change.

### SettingsPage.tsx
```
Before: <div className="flex-1 flex flex-col">
After:  <div className="flex-1 flex flex-col overflow-hidden">
```

### CoverLetterEditPage.tsx
```
Before: className="flex-1 flex flex-col min-h-0"
After:  className="flex-1 flex flex-col min-h-0 overflow-hidden"
```

### CoverLetterNewPage.tsx
```
Before: className="flex-1 flex flex-col min-h-0"
After:  className="flex-1 flex flex-col min-h-0 overflow-hidden"
```

### ResignationLetterEditPage.tsx
```
Before: className="flex-1 flex flex-col min-h-0"
After:  className="flex-1 flex flex-col min-h-0 overflow-hidden"
```

### ResignationLetterNewPage.tsx
```
Before: className="flex-1 flex flex-col min-h-0"
After:  className="flex-1 flex flex-col min-h-0 overflow-hidden"
```

### TemplatesPage.tsx
```
Before: className="flex-1 flex flex-col min-h-0"
After:  className="flex-1 flex flex-col min-h-0 overflow-hidden"
```

### GuidePage.tsx
```
Before: className="flex-1 flex flex-col min-h-0"
After:  className="flex-1 flex flex-col min-h-0 overflow-hidden"
```

### GuidesPage.tsx
```
Before: className="flex-1 flex flex-col min-h-0"
After:  className="flex-1 flex flex-col min-h-0 overflow-hidden"
```

## Why This Works

The AppShell layout is:

```text
[100dvh container, overflow-hidden]
  [DesktopNav (optional)]
  [main, flex-1, overflow-hidden, pb-20]
    [scroll div, overflow-y-auto]    <-- AppShell scroll container
      [AnimatePresence]
        [motion.div]
          [Page component]           <-- This is where pages render
  [BottomTabBar]
```

When a page has `overflow-hidden` on its root, its content cannot overflow into the AppShell scroll container. Instead, the page's inner `overflow-y-auto` div becomes the sole scroll target. This eliminates the double-scroll conflict on touch devices.

When a page does NOT have `overflow-hidden`, both the AppShell's scroll div and the page's inner scroll div compete for the same touch gestures, causing the scroll to feel broken or sticky.

## What Does NOT Change

- No authentication, routing, or Supabase logic modified
- No component props, hooks, or API contracts changed
- No new dependencies or features added
- All existing scroll behavior preserved -- just de-conflicted
- Sticky headers inside pages continue to work (they stick within the page's own scroll container)

## Verification

After changes, confirm on a small viewport (360x640):
- Settings page scrolls smoothly through all sections
- Cover Letter edit/new forms scroll with keyboard visible
- Resignation Letter edit/new forms scroll properly
- Templates grid scrolls past all items
- Guide content scrolls with progress bar updating
- Guides list scrolls through all categories

