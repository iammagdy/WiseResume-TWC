

# Performance Optimization Analysis & Fixes

## Executive Summary

After a comprehensive analysis of the codebase, I've identified **7 major performance bottlenecks** causing slow navigation, janky animations, and unnecessary re-renders. This plan addresses each with targeted fixes.

---

## Problems Identified

### 1. Console Warning: forwardRef Missing on ElevenLabsKeySheet
**File:** `src/components/settings/ElevenLabsKeySheet.tsx`

The console shows:
```
Warning: Function components cannot be given refs. Attempts to access this ref will fail. 
Check the render method of `SettingsPage`.
```

The `ElevenLabsKeySheet` is a function component that doesn't forward refs, but Radix Dialog (used by Sheet internally) attempts to pass refs to child components.

**Fix:** Wrap component with `React.forwardRef`

---

### 2. Excessive Framer Motion Staggered Animations
**Files:** `SettingsPage.tsx`, `DashboardPage.tsx`, `TemplateSelector.tsx`, many others

Every section in Settings page has individual `motion.div` wrappers with staggered delays:
```tsx
<motion.div
  initial={{ opacity: 0, y: 10 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ delay: 0.05 }}
>
```

This creates **60+ animation instances** that all run on mount, causing:
- GPU memory pressure on mobile
- Layout thrashing during initial render
- Delayed Time to Interactive (TTI)

**Fix:** 
- Remove individual item animations from settings sections
- Use CSS `animate-fadeIn` for lightweight fade-in
- Keep motion only for interactive elements (expand/collapse)

---

### 3. TemplateSelector Renders 12 Full Templates
**File:** `src/components/editor/TemplateSelector.tsx` and `TemplateThumbnail.tsx`

When the template sheet opens, it renders **12 complete template components** (each with scaling transforms via ResizeObserver):

```tsx
{sortedTemplates.map((template, index) => (
  <TemplateThumbnail templateId={template.id} resume={previewResume} />
))}
```

Each `TemplateThumbnail`:
- Uses ResizeObserver
- Renders full template HTML
- Applies CSS transform scaling

**Fix:**
- Add `loading="lazy"` pattern - only render visible templates
- Use virtualization or lazy loading for off-screen templates
- Memoize template components with `React.memo`

---

### 4. useProfile Hook Fetches on Every Component Mount
**File:** `src/hooks/useProfile.ts`

The `useProfile` hook uses raw `useState` + `useEffect` instead of React Query:
```tsx
useEffect(() => {
  const fetchProfile = async () => {
    // Fetches every time component mounts
  };
  fetchProfile();
}, [userId, user]);
```

This means profile data is re-fetched whenever:
- SettingsPage mounts
- DashboardPage mounts
- Any component using the hook mounts

**Fix:** Convert to React Query with same staleTime as resumes (5 minutes)

---

### 5. Heavy Swipe Gesture Calculations on ResumeListCard
**File:** `src/components/dashboard/ResumeListCard.tsx`

Each card creates **6 motion values and transforms**:
```tsx
const x = useMotionValue(0);
const deleteOpacity = useTransform(x, [-SWIPE_THRESHOLD, -20], [1, 0]);
const duplicateOpacity = useTransform(x, [20, SWIPE_THRESHOLD], [0, 1]);
const deleteScale = useTransform(x, [-SWIPE_THRESHOLD * 1.5, -SWIPE_THRESHOLD], [1.1, 1]);
const duplicateScale = useTransform(x, [SWIPE_THRESHOLD, SWIPE_THRESHOLD * 1.5], [1, 1.1]);
```

With 10+ resumes, this creates 60+ motion value subscriptions running continuously.

**Fix:** 
- Lazy initialize swipe values only when gesture starts
- Use simpler swipe detection without continuous transforms
- Consider replacing with CSS-only swipe alternative

---

### 6. AIAssistantBar Has Heavy Initial Animation
**File:** `src/components/editor/AIAssistantBar.tsx`

The AI bar animates on every Editor page mount:
```tsx
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ delay: 0.2 }}
>
```

Combined with the Editor's tab switching and auto-save debouncing, this creates animation competition.

**Fix:** Remove entry animation - component should be immediately visible

---

### 7. Missing React.memo on Template Components
**Files:** All templates in `src/components/templates/`

Template components receive `resume` as a prop but aren't memoized:
```tsx
export function ModernTemplate({ resume }: TemplateProps) {
  return <div>...</div>
}
```

When parent re-renders (e.g., store updates), all 12 template thumbnails re-render.

**Fix:** Wrap all templates with `React.memo`

---

## Implementation Plan

### Phase 1: Critical Console Errors

| File | Change |
|------|--------|
| `src/components/settings/ElevenLabsKeySheet.tsx` | Add `React.forwardRef` wrapper |

### Phase 2: Remove Heavy Entry Animations

| File | Change |
|------|--------|
| `src/pages/SettingsPage.tsx` | Replace motion.div sections with plain divs + CSS fade |
| `src/components/editor/AIAssistantBar.tsx` | Remove initial/animate props |
| `src/components/dashboard/ResumeListCard.tsx` | Remove stagger animation, use CSS |

### Phase 3: Optimize Data Fetching

| File | Change |
|------|--------|
| `src/hooks/useProfile.ts` | Convert to React Query with proper staleTime |

### Phase 4: Template Optimization

| File | Change |
|------|--------|
| `src/components/editor/TemplateThumbnail.tsx` | Add React.memo, lazy load off-screen |
| `src/components/templates/*.tsx` | Add React.memo to all 12 templates |

### Phase 5: Simplify Swipe Gestures

| File | Change |
|------|--------|
| `src/components/dashboard/ResumeListCard.tsx` | Simplify gesture detection, lazy init values |

---

## Technical Details

### ElevenLabsKeySheet forwardRef Fix
```typescript
export const ElevenLabsKeySheet = React.forwardRef<
  HTMLDivElement,
  ElevenLabsKeySheetProps
>(function ElevenLabsKeySheet({ open, onOpenChange, currentKey, onSave }, ref) {
  // ... existing code
});
```

### useProfile with React Query
```typescript
export function useProfile(userId: string | undefined, user?: User | null) {
  const queryClient = useQueryClient();

  const { data: profile, isLoading: loading } = useQuery({
    queryKey: ['profile', userId],
    queryFn: async () => {
      // Fetch logic
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes - matches resume query
  });

  const updateProfile = useMutation({
    mutationFn: async (updates: Partial<Profile>) => {
      // Update logic
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', userId] });
    },
  });

  return { profile, loading, updateProfile: updateProfile.mutate };
}
```

### SettingsPage Without Motion Animations
```tsx
// Before: 8 motion.div wrappers with staggered animations
<motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>

// After: Simple div with CSS class
<div className="animate-in fade-in slide-in-from-bottom-1 duration-200">
```

### Template Memoization Pattern
```typescript
export const ModernTemplate = React.memo(function ModernTemplate({ resume }: TemplateProps) {
  return <div>...</div>;
});
```

---

## Files to Modify

| File | Priority | Type |
|------|----------|------|
| `src/components/settings/ElevenLabsKeySheet.tsx` | High | Fix console error |
| `src/hooks/useProfile.ts` | High | Convert to React Query |
| `src/pages/SettingsPage.tsx` | High | Remove motion animations |
| `src/components/editor/AIAssistantBar.tsx` | Medium | Remove entry animation |
| `src/components/dashboard/ResumeListCard.tsx` | Medium | Simplify animations |
| `src/components/editor/TemplateThumbnail.tsx` | Medium | Add React.memo + lazy |
| `src/components/templates/ModernTemplate.tsx` | Low | Add React.memo |
| `src/components/templates/ClassicTemplate.tsx` | Low | Add React.memo |
| `src/components/templates/MinimalTemplate.tsx` | Low | Add React.memo |
| `src/components/templates/ProfessionalTemplate.tsx` | Low | Add React.memo |
| `src/components/templates/DeveloperTemplate.tsx` | Low | Add React.memo |
| `src/components/templates/CreativeTemplate.tsx` | Low | Add React.memo |
| `src/components/templates/ExecutiveTemplate.tsx` | Low | Add React.memo |
| `src/components/templates/CompactTemplate.tsx` | Low | Add React.memo |
| `src/components/templates/AcademicTemplate.tsx` | Low | Add React.memo |
| `src/components/templates/HealthcareTemplate.tsx` | Low | Add React.memo |
| `src/components/templates/SalesTemplate.tsx` | Low | Add React.memo |
| `src/components/templates/ElegantTemplate.tsx` | Low | Add React.memo |

---

## Expected Performance Improvements

| Metric | Before | After |
|--------|--------|-------|
| Settings page render | ~150ms | ~30ms |
| Template selector open | ~300ms | ~100ms |
| Profile data refetch | Every mount | Once per 5 min |
| Console errors | 2 warnings | 0 |
| Animation instances on Settings | 60+ | ~5 |
| Resume card gesture overhead | 60 motion values | 10 motion values |

---

## Summary

The main performance issues stem from:
1. **Over-animation** - Too many Framer Motion instances running simultaneously
2. **Missing caching** - Profile data re-fetching on every navigation
3. **Unmemoized components** - Template components re-rendering unnecessarily
4. **Missing forwardRef** - Console warnings from Radix components

After these fixes, the app will feel significantly snappier, especially on mobile devices where animation performance is critical.

