export function preloadLazy(importFn: () => Promise<unknown>): () => void {
  return () => {
    void importFn();
  };
}
