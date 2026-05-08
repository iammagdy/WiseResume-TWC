import { useState, useEffect, useRef } from 'react';
import { databases, DATABASE_ID, Query } from '@/lib/appwrite';
import { COLLECTIONS } from '@/lib/appwrite-collections';

export function isActiveWithin24h(lastActiveAt: string | null): boolean {
  if (!lastActiveAt) return false;
  return Date.now() - new Date(lastActiveAt).getTime() < 24 * 60 * 60 * 1000;
}

/**
 * Polls `last_active_at` for a portfolio user (identified by `username`) every
 * 60s using recursive setTimeout so requests never overlap. Pauses when the
 * tab is hidden and emits a console warning on failure.
 *
 * Migrated from `supabase.rpc('get_portfolio_active_status')` to a direct
 * `databases.listDocuments` query on the `profiles` collection filtered by
 * `portfolio_username` (the slug used on public portfolio pages).
 */
export function useActiveStatus(username: string, initialLastActiveAt: string | null): string | null {
  const [lastActiveAt, setLastActiveAt] = useState(initialLastActiveAt);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isActiveRef = useRef(false);

  useEffect(() => {
    setLastActiveAt(initialLastActiveAt);
  }, [initialLastActiveAt]);

  useEffect(() => {
    const poll = async () => {
      try {
        const res = await databases.listDocuments(DATABASE_ID, COLLECTIONS.profiles, [
          Query.equal('portfolio_username', username.toLowerCase()),
          Query.select(['last_active_at']),
          Query.limit(1),
        ]);
        if (res.documents.length > 0) {
          const doc = res.documents[0] as unknown as { last_active_at?: string | null };
          if (doc.last_active_at) setLastActiveAt(doc.last_active_at);
        }
      } catch (err) {
        console.warn('[useActiveStatus] Poll failed:', err instanceof Error ? err.message : err);
      } finally {
        if (isActiveRef.current) {
          timeoutRef.current = setTimeout(poll, 60_000);
        }
      }
    };

    const startPolling = () => {
      if (timeoutRef.current) return;
      isActiveRef.current = true;
      timeoutRef.current = setTimeout(poll, 60_000);
    };

    const stopPolling = () => {
      isActiveRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        stopPolling();
      } else {
        startPolling();
      }
    };

    startPolling();
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [username]);

  return lastActiveAt;
}
