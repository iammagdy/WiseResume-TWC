

# Fix Editor Page Freezing and Performance

## Problem Analysis

The editor page freezes on some devices due to excessive re-renders cascading through the component tree. Every keystroke triggers a chain reaction:

1. User types in an input field
2. `updateResume()` updates the Zustand store
3. EditorPage re-renders (subscribes to `currentResume`)
4. `saveToCloud` callback is recreated (depends on `currentResume`)
5. Auto-save effect fires, clearing and resetting timeouts
6. All child section components also re-render because they subscribe to the entire store without selectors

On slower devices, this cascade causes visible freezing, especially with complex resumes that have many experience entries.

## Root Causes

1. **Section components subscribe to entire store** -- `ContactSection`, `SummarySection`, `ExperienceSection`, `EducationSection`, and `SkillsSection` all call `useResumeStore()` without shallow selectors, causing them to re-render on ANY store change (even unrelated fields like `jobDescription` or `matchScore`)

2. **Auto-save recreates on every keystroke** -- `saveToCloud` depends on `currentResume`, so it's rebuilt every time the resume changes. The auto-save effect then fires, clearing and resetting timers unnecessarily

3. **`JSON.stringify` on every save check** -- The save function stringifies the entire resume object to compare against the last saved version, which is expensive for large resumes

4. **Unmemoized child components** -- `ProgressBar`, `SectionCard`, and `NextStepBanner` re-render on every parent render without memoization

5. **`useResumeNudges` recalculates on every render** -- Each section component creates its own instance of this hook, which depends on the full `resume` object reference (changes on every keystroke)

## Changes

### 1. `src/components/editor/ContactSection.tsx`
- Use `useShallow` selector to only subscribe to `currentResume.contactInfo` and `updateResume`
- Wrap component in `memo()`

### 2. `src/components/editor/SummarySection.tsx`
- Use `useShallow` selector to only subscribe to `currentResume.summary` and `updateResume`
- Wrap component in `memo()`

### 3. `src/components/editor/ExperienceSection.tsx`
- Use `useShallow` selector to only subscribe to `currentResume.experience` and `updateResume`
- Wrap component in `memo()`

### 4. `src/components/editor/EducationSection.tsx`
- Use `useShallow` selector to only subscribe to `currentResume.education` and `updateResume`
- Wrap component in `memo()`

### 5. `src/components/editor/SkillsSection.tsx`
- Use `useShallow` selector to only subscribe to `currentResume.skills`, `gapAnalysis`, `jobDescription`, and `updateResume`
- Wrap component in `memo()`

### 6. `src/pages/EditorPage.tsx`
- Decouple `saveToCloud` from `currentResume` by using a ref to track the latest resume value, preventing callback recreation on every keystroke
- Increase auto-save debounce from 2s to 3s to reduce save frequency
- Memoize the `steps` array passed to `StepperNav` to prevent unnecessary re-renders
- Stabilize the auto-save effect so it only resets the timer when the resume reference actually changes

### 7. `src/components/editor/ProgressBar.tsx`
- Wrap in `memo()` to prevent re-renders when props haven't changed

### 8. `src/components/editor/SectionCard.tsx`
- Wrap in `memo()` to prevent re-renders when props haven't changed

### 9. `src/components/editor/NextStepBanner.tsx`
- Wrap in `memo()` and use targeted settings store selectors instead of subscribing to the entire settings store

## Technical Details

### Store Selector Pattern (key optimization)

Before (causes re-render on ANY store change):
```typescript
const { currentResume, updateResume } = useResumeStore();
```

After (only re-renders when selected fields change):
```typescript
const contactInfo = useResumeStore(state => state.currentResume?.contactInfo);
const updateResume = useResumeStore(state => state.updateResume);
```

### Save Decouple Pattern (prevents callback churn)

Before:
```typescript
const saveToCloud = useCallback(async () => {
  const currentResumeJson = JSON.stringify(currentResume);
  // ...
}, [currentResume, ...]); // recreated every keystroke
```

After:
```typescript
const resumeRef = useRef(currentResume);
resumeRef.current = currentResume;

const saveToCloud = useCallback(async () => {
  const resume = resumeRef.current;
  if (!resume) return;
  const currentResumeJson = JSON.stringify(resume);
  // ...
}, [user, currentResumeId, updateResume]); // stable deps only
```

### Expected Impact

- Typing in any input field will only re-render the active section component instead of the entire editor tree
- Auto-save timer resets will be reduced from every keystroke to a single debounced cycle
- On low-end devices, this should eliminate the freezing during text input

