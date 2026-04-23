import { useMe } from './useMe';
import { useAuth } from './useAuth';

export interface SuspensionState {
  isSuspended: boolean;
  suspensionReason: string | null;
  isLoading: boolean;
}

/**
 * Derives suspension state from the shared `useMe` query — no additional
 * network calls. When `/api/data/me` returns a 403 with `{ suspended: true }`,
 * React Query stores the thrown ApiFetchError on the `useMe` query's `error`
 * property. We read that error here instead of making a duplicate request.
 */
export function useSuspensionCheck(): SuspensionState {
  const { user, isAuthenticated } = useAuth();
  const { isLoading, isError, error } = useMe();

  if (!user || !isAuthenticated) {
    return { isSuspended: false, suspensionReason: null, isLoading: false };
  }

  let isSuspended = false;
  let suspensionReason: string | null = null;

  if (isError && error) {
    const e = error as { status?: number; body?: unknown };
    if (e.status === 403) {
      const body = e.body;
      if (
        body &&
        typeof body === 'object' &&
        'suspended' in body &&
        (body as { suspended: unknown }).suspended === true
      ) {
        isSuspended = true;
        suspensionReason = (body as { reason?: string }).reason ?? null;
      }
    }
  }

  return { isSuspended, suspensionReason, isLoading };
}
