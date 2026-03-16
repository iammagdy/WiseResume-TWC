## 2026-03-16 - Optimize Zustand useResumeStore re-renders
**Learning:** Destructuring entire state objects from Zustand stores (e.g. `const { currentResume } = useResumeStore()` vs `const currentResume = useResumeStore(s => s.currentResume)`) causes unnecessary re-renders when unrelated state changes. In this codebase, `useResumeStore` is used extensively and often destructured, leading to widespread performance degradation.
**Action:** When using Zustand, always use selector functions to extract only the required state slices, especially in frequently rendered components.
