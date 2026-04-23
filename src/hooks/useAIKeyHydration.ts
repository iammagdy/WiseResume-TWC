/**
 * No-op stub.
 *
 * BYOK has been removed — every AI request now flows through the managed
 * 6-key flat pool on the server. The hook is kept only so existing
 * `useAIKeyHydration()` call sites (notably `AppInterior.tsx`) keep
 * compiling. Safe to delete every call site at your leisure.
 */
export function useAIKeyHydration(): void {
  // intentionally empty
}
