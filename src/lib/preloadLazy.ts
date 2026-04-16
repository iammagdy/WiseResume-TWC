/**
 * preloadLazy — triggers a dynamic import early (on hover/focus) so that by
 * the time the user clicks the element the chunk is already in-flight or cached.
 *
 * Usage:
 *   onPointerEnter={preloadLazy(() => import('@/components/SomeComponent'))}
 *
 * Returns a stable event handler function that starts the import and ignores
 * any errors (the real import will run again when the lazy component mounts).
 */
export function preloadLazy(factory: () => Promise<unknown>): () => void {
  return () => {
    factory().catch(() => {});
  };
}
