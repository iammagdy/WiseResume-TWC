import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/safeClient';

export function isActiveWithin24h(lastActiveAt: string | null): boolean {
  if (!lastActiveAt) return false;
  return Date.now() - new Date(lastActiveAt).getTime() < 24 * 60 * 60 * 1000;
}

/**
 * Polls last_active_at every 60s using recursive setTimeout so requests never
 * overlap. Pauses when tab is hidden and emits a console warning on failure.
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
        const { data } = await supabase.rpc('get_portfolio_active_status', {
          p_username: username.toLowerCase(),
        });
        if (data) setLastActiveAt(data as string);
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
