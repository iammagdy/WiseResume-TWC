## 2024-05-24 - [Dashboard Render Cascade]
**Learning:** The dashboard performs background polling to calculate ATS scores (`healthScores`) one resume at a time. By default, updating `healthScores` triggers a complete re-render of `DashboardPage`. If the child `ResumeListCard` instances receive unmemoized handler callbacks (like `onEdit`, `onDelete`), ALL cards re-render on every single background score update, resulting in O(N²) rendering.
**Action:** Always wrap event handler callbacks in `useCallback` when passing them to lists of `React.memo` wrapped components.
