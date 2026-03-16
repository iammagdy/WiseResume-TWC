## 2025-03-16 - [Experience Section Renders]
**Learning:** `ExperienceSection` components re-render heavily on each keystroke when using `Textarea` or `Input` because `updateResume` changes global state. Components like `ExperienceTimeline` and `InlineAIButton` should be memoized properly to avoid expensive DOM re-renders inside lists.
**Action:** When a component maps over an array and renders child components with expensive layouts or calculations, wrap those children in `React.memo` and provide `useCallback` for event handlers.
