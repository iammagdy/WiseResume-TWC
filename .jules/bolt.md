## 2024-05-24 - [Dashboard Render Cascade]
**Learning:** The dashboard performs background polling to calculate ATS scores (`healthScores`) one resume at a time. By default, updating `healthScores` triggers a complete re-render of `DashboardPage`. If the child `ResumeListCard` instances receive unmemoized handler callbacks (like `onEdit`, `onDelete`), ALL cards re-render on every single background score update, resulting in O(N²) rendering.
**Action:** Always wrap event handler callbacks in `useCallback` when passing them to lists of `React.memo` wrapped components.

## 2024-05-25 - [O(N²) Nested Loop Array vs Set in organizeResumeHierarchy]
**Learning:** The dashboard calculates `resumeHierarchy` using `useMemo`. Inside `organizeResumeHierarchy`, the logic to check for orphaned tailored resumes looped over `tailoredByParent` (size N) and then searched `masterResumes` (size M) using `masterResumes.some()`, resulting in an O(N * M) performance bottleneck (O(N²) worst-case).
**Action:** When searching an array of objects for a matching ID within a loop, first precompute a `Set` of the target IDs outside the loop to turn the O(N) array lookup into an O(1) Set lookup.
